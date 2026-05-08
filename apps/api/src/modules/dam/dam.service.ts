import { randomUUID } from 'crypto'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { s3Client, S3_BUCKET, getCdnUrl } from '../../config/s3.js'
import { NotFoundError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'
import { renditionQueue } from '../../workers/rendition.worker.js'

const ASSET_SELECT = {
  id: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  s3Key: true,
  cdnUrl: true,
  altText: true,
  title: true,
  uploadStatus: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  renditions: {
    select: { id: true, name: true, width: true, height: true, format: true, cdnUrl: true },
  },
} as const

const PRESIGNED_URL_EXPIRES = 900 // 15 minutes

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  mimeType?: string
  isActive?: boolean
}

export async function listAssets(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.AssetWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    uploadStatus: 'COMPLETED',
    ...(params.mimeType ? { mimeType: { startsWith: params.mimeType } } : {}),
    ...(params.search
      ? {
          OR: [
            { filename: { contains: params.search, mode: 'insensitive' } },
            { title: { contains: params.search, mode: 'insensitive' } },
            { altText: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: ASSET_SELECT,
      orderBy: { createdAt: 'desc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.asset.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getAsset(orgId: string, id: string) {
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId: orgId },
    select: ASSET_SELECT,
  })
  if (!asset) throw new NotFoundError('Asset', id)
  return asset
}

interface RequestUploadInput {
  filename: string
  mimeType: string
  sizeBytes: number
  altText?: string
  title?: string
}

export async function requestUploadUrl(orgId: string, userId: string, input: RequestUploadInput) {
  const ext = input.filename.split('.').pop() ?? 'bin'
  const s3Key = `uploads/${orgId}/${randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ContentType: input.mimeType,
    ContentLength: input.sizeBytes,
    Metadata: { orgId, userId },
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRES })

  const asset = await prisma.asset.create({
    data: {
      organizationId: orgId,
      uploadedById: userId,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      s3Key,
      cdnUrl: getCdnUrl(s3Key),
      altText: input.altText,
      title: input.title ?? input.filename,
      uploadStatus: 'PENDING',
    },
    select: { id: true, s3Key: true, cdnUrl: true },
  })

  return { assetId: asset.id, uploadUrl, s3Key: asset.s3Key, cdnUrl: asset.cdnUrl }
}

export async function confirmUpload(
  orgId: string,
  id: string,
  input: { altText?: string; title?: string },
) {
  const asset = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
  if (!asset) throw new NotFoundError('Asset', id)

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      uploadStatus: 'COMPLETED',
      ...(input.altText !== undefined ? { altText: input.altText } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
    },
    select: ASSET_SELECT,
  })

  // Enqueue rendition generation for images
  if (asset.mimeType.startsWith('image/')) {
    await renditionQueue.add('generate-renditions', { assetId: id, s3Key: asset.s3Key, orgId })
  }

  return updated
}

export async function updateAsset(
  orgId: string,
  id: string,
  input: { altText?: string; title?: string },
) {
  const asset = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
  if (!asset) throw new NotFoundError('Asset', id)

  return prisma.asset.update({
    where: { id },
    data: {
      ...(input.altText !== undefined ? { altText: input.altText } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
    },
    select: ASSET_SELECT,
  })
}

export async function deleteAsset(orgId: string, id: string) {
  const asset = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
  if (!asset) throw new NotFoundError('Asset', id)

  await prisma.asset.update({ where: { id }, data: { isActive: false } })
}

export async function getAssetDownloadUrl(orgId: string, id: string) {
  const asset = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
  if (!asset) throw new NotFoundError('Asset', id)

  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: asset.s3Key })
  const url = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRES })
  return { url, expiresIn: PRESIGNED_URL_EXPIRES }
}
