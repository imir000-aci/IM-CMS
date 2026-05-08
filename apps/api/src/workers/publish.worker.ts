import { Queue, Worker } from 'bullmq'
import { getRedis } from '../config/redis.js'
import { prisma } from '../config/database.js'

const QUEUE_NAME = 'publish'

export const publishQueue = new Queue(QUEUE_NAME, {
  connection: getRedis(),
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
})

interface PublishJobData {
  type: 'page' | 'campaign'
  pageId?: string
  campaignId?: string
  orgId: string
}

// Invalidate delivery cache keys for a page across all active locales
async function invalidatePageCache(pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { channel: { select: { slug: true, defaultLocale: true } } },
  })
  if (!page || !page.channel) return

  const redis = getRedis()
  const pattern = `del:page:${page.channel.slug}:${page.slug}:*`

  // Scan and delete matching keys
  let cursor = '0'
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = nextCursor
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } while (cursor !== '0')

  // Also invalidate slot-level keys
  const slots = await prisma.slot.findMany({
    where: { zone: { pageId } },
    select: { id: true },
  })
  const slotKeys = slots.map((s) => `del:slot:${s.id}:*`)
  for (const slotPattern of slotKeys) {
    let slotCursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(slotCursor, 'MATCH', slotPattern, 'COUNT', 100)
      slotCursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (slotCursor !== '0')
  }
}

async function invalidateCampaignCache(campaignId: string) {
  // Find all pages associated with this campaign's page configurations
  const pageConfigs = await prisma.pageConfiguration.findMany({
    where: { campaignId },
    select: { pageId: true },
  })

  await Promise.all(pageConfigs.map((pc) => invalidatePageCache(pc.pageId)))
}

export function startPublishWorker() {
  return new Worker<PublishJobData>(
    QUEUE_NAME,
    async (job) => {
      const { type, pageId, campaignId } = job.data

      if (type === 'page' && pageId) {
        await invalidatePageCache(pageId)
      } else if (type === 'campaign' && campaignId) {
        await invalidateCampaignCache(campaignId)
      }
    },
    { connection: getRedis(), concurrency: 10 },
  )
}
