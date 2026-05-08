import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const POOL_SELECT = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { poolItems: true } },
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export async function listContentPools(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.ContentPoolWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.contentPool.findMany({
      where,
      select: POOL_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.contentPool.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getContentPool(orgId: string, id: string) {
  const pool = await prisma.contentPool.findFirst({
    where: { id, organizationId: orgId },
    include: {
      poolItems: {
        orderBy: { order: 'asc' },
        include: {
          contentObject: {
            select: { id: true, name: true, type: true, isActive: true },
          },
        },
      },
    },
  })
  if (!pool) throw new NotFoundError('ContentPool', id)
  return pool
}

export async function createContentPool(orgId: string, input: { name: string; description?: string }) {
  return prisma.contentPool.create({
    data: { organizationId: orgId, name: input.name, description: input.description },
    select: POOL_SELECT,
  })
}

export async function updateContentPool(
  orgId: string,
  id: string,
  input: { name?: string; description?: string },
) {
  const existing = await prisma.contentPool.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('ContentPool', id)

  return prisma.contentPool.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    select: POOL_SELECT,
  })
}

export async function deleteContentPool(orgId: string, id: string) {
  const existing = await prisma.contentPool.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('ContentPool', id)
  await prisma.contentPool.update({ where: { id }, data: { isActive: false } })
}

export async function addContentPoolItem(orgId: string, poolId: string, contentObjectId: string) {
  const pool = await prisma.contentPool.findFirst({ where: { id: poolId, organizationId: orgId } })
  if (!pool) throw new NotFoundError('ContentPool', poolId)

  const obj = await prisma.contentObject.findFirst({
    where: { id: contentObjectId, organizationId: orgId, isActive: true },
  })
  if (!obj) throw new NotFoundError('ContentObject', contentObjectId)

  const duplicate = await prisma.contentPoolItem.findFirst({
    where: { contentPoolId: poolId, contentObjectId },
  })
  if (duplicate) throw new ConflictError('ContentObject is already in this pool')

  const maxOrderResult = await prisma.contentPoolItem.aggregate({
    where: { contentPoolId: poolId },
    _max: { order: true },
  })
  const nextOrder = (maxOrderResult._max.order ?? -1) + 1

  return prisma.contentPoolItem.create({
    data: { contentPoolId: poolId, contentObjectId, order: nextOrder },
    include: {
      contentObject: { select: { id: true, name: true, type: true } },
    },
  })
}

export async function removeContentPoolItem(orgId: string, poolId: string, itemId: string) {
  const pool = await prisma.contentPool.findFirst({ where: { id: poolId, organizationId: orgId } })
  if (!pool) throw new NotFoundError('ContentPool', poolId)

  const item = await prisma.contentPoolItem.findFirst({ where: { id: itemId, contentPoolId: poolId } })
  if (!item) throw new NotFoundError('ContentPoolItem', itemId)

  await prisma.contentPoolItem.delete({ where: { id: itemId } })
}
