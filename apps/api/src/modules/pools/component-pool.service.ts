import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError, ValidationError } from '../../shared/errors.js'
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

export async function listComponentPools(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.ComponentPoolWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.componentPool.findMany({
      where,
      select: POOL_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.componentPool.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getComponentPool(orgId: string, id: string) {
  const pool = await prisma.componentPool.findFirst({
    where: { id, organizationId: orgId },
    include: {
      poolItems: {
        orderBy: { order: 'asc' },
        include: {
          componentInstance: {
            select: {
              id: true,
              name: true,
              isActive: true,
              masterComponent: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  })
  if (!pool) throw new NotFoundError('ComponentPool', id)
  return pool
}

export async function createComponentPool(orgId: string, input: { name: string; description?: string }) {
  return prisma.componentPool.create({
    data: {
      organizationId: orgId,
      name: input.name,
      description: input.description,
    },
    select: POOL_SELECT,
  })
}

export async function updateComponentPool(
  orgId: string,
  id: string,
  input: { name?: string; description?: string },
) {
  const existing = await prisma.componentPool.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('ComponentPool', id)

  return prisma.componentPool.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    select: POOL_SELECT,
  })
}

export async function deleteComponentPool(orgId: string, id: string) {
  const existing = await prisma.componentPool.findFirst({
    where: { id, organizationId: orgId },
    include: { _count: { select: { poolItems: true } } },
  })
  if (!existing) throw new NotFoundError('ComponentPool', id)
  await prisma.componentPool.update({ where: { id }, data: { isActive: false } })
}

export async function addPoolItem(orgId: string, poolId: string, componentInstanceId: string) {
  const pool = await prisma.componentPool.findFirst({ where: { id: poolId, organizationId: orgId } })
  if (!pool) throw new NotFoundError('ComponentPool', poolId)

  const instance = await prisma.componentInstance.findFirst({
    where: { id: componentInstanceId, organizationId: orgId, isActive: true },
  })
  if (!instance) throw new NotFoundError('ComponentInstance', componentInstanceId)

  const duplicate = await prisma.componentPoolItem.findFirst({
    where: { componentPoolId: poolId, componentInstanceId },
  })
  if (duplicate) throw new ConflictError('ComponentInstance is already in this pool')

  const maxOrderResult = await prisma.componentPoolItem.aggregate({
    where: { componentPoolId: poolId },
    _max: { order: true },
  })
  const nextOrder = (maxOrderResult._max.order ?? -1) + 1

  return prisma.componentPoolItem.create({
    data: { componentPoolId: poolId, componentInstanceId, order: nextOrder },
    include: {
      componentInstance: {
        select: {
          id: true,
          name: true,
          masterComponent: { select: { name: true, slug: true } },
        },
      },
    },
  })
}

export async function removePoolItem(orgId: string, poolId: string, itemId: string) {
  const pool = await prisma.componentPool.findFirst({ where: { id: poolId, organizationId: orgId } })
  if (!pool) throw new NotFoundError('ComponentPool', poolId)

  const item = await prisma.componentPoolItem.findFirst({ where: { id: itemId, componentPoolId: poolId } })
  if (!item) throw new NotFoundError('ComponentPoolItem', itemId)

  await prisma.componentPoolItem.delete({ where: { id: itemId } })
}

export async function reorderPoolItems(orgId: string, poolId: string, orderedItemIds: string[]) {
  const pool = await prisma.componentPool.findFirst({ where: { id: poolId, organizationId: orgId } })
  if (!pool) throw new NotFoundError('ComponentPool', poolId)

  const existingItems = await prisma.componentPoolItem.findMany({
    where: { componentPoolId: poolId },
    select: { id: true },
  })
  const existingIds = new Set(existingItems.map((i) => i.id))
  const invalid = orderedItemIds.filter((id) => !existingIds.has(id))
  if (invalid.length > 0) throw new ValidationError('Invalid item IDs', invalid)
  if (orderedItemIds.length !== existingItems.length) {
    throw new ValidationError('orderedItemIds must contain all pool item IDs', [])
  }

  await prisma.$transaction(
    orderedItemIds.map((id, index) =>
      prisma.componentPoolItem.update({ where: { id }, data: { order: index } }),
    ),
  )
}
