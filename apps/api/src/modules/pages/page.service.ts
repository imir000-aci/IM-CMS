import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const PAGE_SELECT = {
  id: true,
  name: true,
  slug: true,
  channelId: true,
  templateId: true,
  metaTitle: true,
  metaDescription: true,
  ogTags: true,
  isPublished: true,
  isActive: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  channel: { select: { name: true, slug: true } },
  template: { select: { name: true } },
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  channelId?: string
  templateId?: string
  isPublished?: boolean
  isActive?: boolean
}

export async function listPages(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.PageWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.channelId ? { channelId: params.channelId } : {}),
    ...(params.templateId ? { templateId: params.templateId } : {}),
    ...(params.isPublished !== undefined ? { isPublished: params.isPublished } : {}),
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.page.findMany({
      where,
      select: PAGE_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.page.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getPage(orgId: string, id: string) {
  const page = await prisma.page.findFirst({
    where: { id, organizationId: orgId },
    include: {
      channel: { select: { name: true, slug: true, defaultLocale: true } },
      template: { select: { name: true } },
      zones: {
        orderBy: { order: 'asc' },
        include: {
          slots: {
            orderBy: { order: 'asc' },
            include: {
              subSlots: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
    },
  })
  if (!page) throw new NotFoundError('Page', id)
  return page
}

interface CreatePageInput {
  name: string
  slug: string
  channelId: string
  templateId?: string
  metaTitle?: string
  metaDescription?: string
  ogTags?: Record<string, unknown>
}

export async function createPage(orgId: string, input: CreatePageInput) {
  const channel = await prisma.channel.findFirst({
    where: { id: input.channelId, organizationId: orgId, isActive: true },
  })
  if (!channel) throw new NotFoundError('Channel', input.channelId)

  const existing = await prisma.page.findFirst({
    where: { organizationId: orgId, channelId: input.channelId, slug: input.slug },
  })
  if (existing) throw new ConflictError(`Page slug '${input.slug}' already exists in this channel`)

  return prisma.page.create({
    data: {
      organizationId: orgId,
      channelId: input.channelId,
      templateId: input.templateId,
      name: input.name,
      slug: input.slug,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      ogTags: (input.ogTags ?? {}) as Prisma.InputJsonValue,
    },
    select: PAGE_SELECT,
  })
}

interface UpdatePageInput {
  name?: string
  slug?: string
  metaTitle?: string
  metaDescription?: string
  ogTags?: Record<string, unknown>
}

export async function updatePage(orgId: string, id: string, input: UpdatePageInput) {
  const existing = await prisma.page.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Page', id)

  if (input.slug && input.slug !== existing.slug) {
    const slugConflict = await prisma.page.findFirst({
      where: { organizationId: orgId, channelId: existing.channelId, slug: input.slug, id: { not: id } },
    })
    if (slugConflict) throw new ConflictError(`Page slug '${input.slug}' already exists in this channel`)
  }

  return prisma.page.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
      ...(input.ogTags !== undefined ? { ogTags: input.ogTags as Prisma.InputJsonValue } : {}),
    },
    select: PAGE_SELECT,
  })
}

export async function deletePage(orgId: string, id: string) {
  const existing = await prisma.page.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Page', id)
  await prisma.page.update({ where: { id }, data: { isActive: false } })
}

export async function publishPage(orgId: string, id: string) {
  const existing = await prisma.page.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Page', id)
  return prisma.page.update({
    where: { id },
    data: { isPublished: true, publishedAt: new Date() },
    select: PAGE_SELECT,
  })
}

// Zone management

export async function createZone(
  orgId: string,
  pageId: string,
  input: { name: string; order?: number; layoutConfig?: Record<string, unknown> },
) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const maxOrder = await prisma.zone.aggregate({ where: { pageId }, _max: { order: true } })
  const order = input.order ?? (maxOrder._max.order ?? -1) + 1

  return prisma.zone.create({
    data: {
      pageId,
      name: input.name,
      order,
      layoutConfig: (input.layoutConfig ?? {}) as Prisma.InputJsonValue,
    },
  })
}

export async function updateZone(
  orgId: string,
  pageId: string,
  zoneId: string,
  input: { name?: string; order?: number; layoutConfig?: Record<string, unknown> },
) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  return prisma.zone.update({
    where: { id: zoneId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.layoutConfig !== undefined ? { layoutConfig: input.layoutConfig as Prisma.InputJsonValue } : {}),
    },
  })
}

export async function deleteZone(orgId: string, pageId: string, zoneId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  await prisma.zone.delete({ where: { id: zoneId } })
}

// Slot management

export async function createSlot(
  orgId: string,
  pageId: string,
  zoneId: string,
  input: { name: string; order?: number; allowedComponentTypes?: string[] },
) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  const maxOrder = await prisma.slot.aggregate({ where: { zoneId }, _max: { order: true } })
  const order = input.order ?? (maxOrder._max.order ?? -1) + 1

  return prisma.slot.create({
    data: {
      zoneId,
      name: input.name,
      order,
      allowedComponentTypes: input.allowedComponentTypes ?? [],
    },
  })
}

export async function updateSlot(
  orgId: string,
  pageId: string,
  zoneId: string,
  slotId: string,
  input: { name?: string; order?: number; allowedComponentTypes?: string[] },
) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  const slot = await prisma.slot.findFirst({ where: { id: slotId, zoneId } })
  if (!slot) throw new NotFoundError('Slot', slotId)

  return prisma.slot.update({
    where: { id: slotId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.allowedComponentTypes !== undefined ? { allowedComponentTypes: input.allowedComponentTypes } : {}),
    },
  })
}

export async function deleteSlot(orgId: string, pageId: string, zoneId: string, slotId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  const slot = await prisma.slot.findFirst({ where: { id: slotId, zoneId } })
  if (!slot) throw new NotFoundError('Slot', slotId)

  await prisma.slot.delete({ where: { id: slotId } })
}

// SubSlot management

export async function createSubSlot(
  orgId: string,
  pageId: string,
  zoneId: string,
  slotId: string,
  input: { name: string; order?: number },
) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  const slot = await prisma.slot.findFirst({ where: { id: slotId, zoneId } })
  if (!slot) throw new NotFoundError('Slot', slotId)

  const maxOrder = await prisma.subSlot.aggregate({ where: { slotId }, _max: { order: true } })
  const order = input.order ?? (maxOrder._max.order ?? -1) + 1

  return prisma.subSlot.create({ data: { slotId, name: input.name, order } })
}

export async function deleteSubSlot(
  orgId: string,
  pageId: string,
  zoneId: string,
  slotId: string,
  subSlotId: string,
) {
  const page = await prisma.page.findFirst({ where: { id: pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', pageId)

  const zone = await prisma.zone.findFirst({ where: { id: zoneId, pageId } })
  if (!zone) throw new NotFoundError('Zone', zoneId)

  const slot = await prisma.slot.findFirst({ where: { id: slotId, zoneId } })
  if (!slot) throw new NotFoundError('Slot', slotId)

  const subSlot = await prisma.subSlot.findFirst({ where: { id: subSlotId, slotId } })
  if (!subSlot) throw new NotFoundError('SubSlot', subSlotId)

  await prisma.subSlot.delete({ where: { id: subSlotId } })
}
