import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const CHANNEL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  defaultLocale: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { pages: true } },
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export async function listChannels(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.ChannelWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.channel.findMany({
      where,
      select: CHANNEL_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.channel.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getChannel(orgId: string, id: string) {
  const channel = await prisma.channel.findFirst({
    where: { id, organizationId: orgId },
    select: CHANNEL_SELECT,
  })
  if (!channel) throw new NotFoundError('Channel', id)
  return channel
}

interface CreateChannelInput {
  name: string
  slug: string
  description?: string
  defaultLocale?: string
}

export async function createChannel(orgId: string, input: CreateChannelInput) {
  const slug = input.slug.toLowerCase()
  const existing = await prisma.channel.findFirst({ where: { organizationId: orgId, slug } })
  if (existing) throw new ConflictError(`Channel slug '${slug}' already exists`)

  return prisma.channel.create({
    data: {
      organizationId: orgId,
      name: input.name,
      slug,
      description: input.description,
      defaultLocale: input.defaultLocale ?? 'en',
    },
    select: CHANNEL_SELECT,
  })
}

interface UpdateChannelInput {
  name?: string
  description?: string
  defaultLocale?: string
}

export async function updateChannel(orgId: string, id: string, input: UpdateChannelInput) {
  const existing = await prisma.channel.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Channel', id)

  return prisma.channel.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale } : {}),
    },
    select: CHANNEL_SELECT,
  })
}

export async function deleteChannel(orgId: string, id: string) {
  const existing = await prisma.channel.findFirst({
    where: { id, organizationId: orgId },
    include: { _count: { select: { pages: { where: { isActive: true } } } } },
  })
  if (!existing) throw new NotFoundError('Channel', id)
  if (existing._count.pages > 0) {
    throw new ConflictError('Cannot delete channel with active pages. Deactivate pages first.')
  }
  await prisma.channel.update({ where: { id }, data: { isActive: false } })
}
