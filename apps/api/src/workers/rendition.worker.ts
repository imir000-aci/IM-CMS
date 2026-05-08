import { Queue, Worker } from 'bullmq'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import sharp from 'sharp'
import { getRedis } from '../config/redis.js'
import { s3Client, S3_BUCKET, getCdnUrl } from '../config/s3.js'
import { prisma } from '../config/database.js'

const QUEUE_NAME = 'renditions'

export const renditionQueue = new Queue(QUEUE_NAME, {
  connection: getRedis(),
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
})

interface RenditionJobData {
  assetId: string
  s3Key: string
  orgId: string
}

const RENDITION_CONFIGS = [
  { name: 'thumbnail', width: 200, height: 200, format: 'webp' as const },
  { name: 'medium', width: 800, height: 600, format: 'webp' as const },
  { name: 'large', width: 1920, height: 1080, format: 'webp' as const },
] as const

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export function startRenditionWorker() {
  return new Worker<RenditionJobData>(
    QUEUE_NAME,
    async (job) => {
      const { assetId, s3Key, orgId } = job.data

      // Fetch original from S3
      const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key })
      const s3Obj = await s3Client.send(getCmd)
      if (!s3Obj.Body) throw new Error(`No body for S3 key ${s3Key}`)
      const originalBuffer = await streamToBuffer(s3Obj.Body as Readable)

      for (const config of RENDITION_CONFIGS) {
        const renditionKey = `renditions/${orgId}/${assetId}/${config.name}.${config.format}`

        const buffer = await sharp(originalBuffer)
          .resize(config.width, config.height, { fit: 'inside', withoutEnlargement: true })
          .toFormat(config.format, { quality: 85 })
          .toBuffer()

        const putCmd = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: renditionKey,
          Body: buffer,
          ContentType: `image/${config.format}`,
        })
        await s3Client.send(putCmd)

        const meta = await sharp(buffer).metadata()

        await prisma.assetRendition.upsert({
          where: { assetId_name: { assetId, name: config.name } },
          create: {
            assetId,
            name: config.name,
            s3Key: renditionKey,
            cdnUrl: getCdnUrl(renditionKey),
            width: meta.width ?? config.width,
            height: meta.height ?? config.height,
            format: config.format,
            sizeBytes: buffer.length,
          },
          update: {
            s3Key: renditionKey,
            cdnUrl: getCdnUrl(renditionKey),
            width: meta.width ?? config.width,
            height: meta.height ?? config.height,
            sizeBytes: buffer.length,
          },
        })
      }
    },
    { connection: getRedis(), concurrency: 4 },
  )
}
