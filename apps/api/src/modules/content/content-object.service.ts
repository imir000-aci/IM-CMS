import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const CONTENT_SELECT = {
  id: true,
  name: true,
  type: true,
  fields: true,
  tags: true,
  isActive: true,
  currentVersion: true,
  createdAt: true,
  updatedAt: true,
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  type?: string
  tags?: string
  isActive?: boolean
}

export async function listContentObjects(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const tagList = params.tags ? params.tags.split(',').map((t) => t.trim()) : undefined

  const where: Prisma.ContentObjectWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.type ? { type: params.type as Prisma.EnumContentObjectTypeFilter['equals'] } : {}),
    ...(tagList?.length ? { tags: { hasSome: tagList } } : {}),
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.contentObject.findMany({
      where,
      select: CONTENT_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.contentObject.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getContentObject(orgId: string, id: string) {
  const obj = await prisma.contentObject.findFirst({
    where: { id, organizationId: orgId },
    select: CONTENT_SELECT,
  })
  if (!obj) throw new NotFoundError('ContentObject', id)
  return obj
}

interface CreateInput {
  name: string
  type: string
  fields?: Record<string, unknown>
  tags?: string[]
}

export async function createContentObject(orgId: string, input: CreateInput) {
  return prisma.$transaction(async (tx) => {
    const obj = await tx.contentObject.create({
      data: {
        organizationId: orgId,
        name: input.name,
        type: input.type as Prisma.ContentObjectCreateInput['type'],
        fields: (input.fields ?? {}) as Prisma.InputJsonValue,
        tags: input.tags ?? [],
        currentVersion: 1,
      },
      select: CONTENT_SELECT,
    })

    await tx.contentObjectVersion.create({
      data: {
        contentObjectId: obj.id,
        version: 1,
        fields: (input.fields ?? {}) as Prisma.InputJsonValue,
      },
    })

    return obj
  })
}

interface UpdateInput {
  name?: string
  fields?: Record<string, unknown>
  tags?: string[]
}

export async function updateContentObject(orgId: string, id: string, input: UpdateInput, userId: string) {
  const existing = await prisma.contentObject.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('ContentObject', id)

  const fieldsChanged = input.fields !== undefined

  return prisma.$transaction(async (tx) => {
    const nextVersion = fieldsChanged ? existing.currentVersion + 1 : existing.currentVersion

    const obj = await tx.contentObject.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.fields !== undefined ? { fields: input.fields as Prisma.InputJsonValue } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(fieldsChanged ? { currentVersion: nextVersion } : {}),
      },
      select: CONTENT_SELECT,
    })

    if (fieldsChanged) {
      await tx.contentObjectVersion.create({
        data: {
          contentObjectId: id,
          version: nextVersion,
          fields: input.fields as Prisma.InputJsonValue,
          createdById: userId,
        },
      })
    }

    return obj
  })
}

export async function deleteContentObject(orgId: string, id: string) {
  const existing = await prisma.contentObject.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('ContentObject', id)
  await prisma.contentObject.update({ where: { id }, data: { isActive: false } })
}

export async function getContentObjectVersions(orgId: string, id: string) {
  const obj = await prisma.contentObject.findFirst({ where: { id, organizationId: orgId } })
  if (!obj) throw new NotFoundError('ContentObject', id)

  return prisma.contentObjectVersion.findMany({
    where: { contentObjectId: id },
    orderBy: { version: 'desc' },
    include: { createdBy: { select: { id: true, displayName: true } } },
  })
}

export async function restoreContentVersion(orgId: string, id: string, version: number, userId: string) {
  const obj = await prisma.contentObject.findFirst({ where: { id, organizationId: orgId } })
  if (!obj) throw new NotFoundError('ContentObject', id)

  const versionRecord = await prisma.contentObjectVersion.findFirst({
    where: { contentObjectId: id, version },
  })
  if (!versionRecord) throw new NotFoundError('ContentObjectVersion', `${id}@v${version}`)

  return updateContentObject(orgId, id, { fields: versionRecord.fields as Record<string, unknown> }, userId)
}

export async function upsertLocale(
  orgId: string,
  id: string,
  locale: string,
  input: { fields: Record<string, unknown>; translationStatus?: string },
) {
  const obj = await prisma.contentObject.findFirst({ where: { id, organizationId: orgId } })
  if (!obj) throw new NotFoundError('ContentObject', id)

  return prisma.contentObjectLocale.upsert({
    where: { contentObjectId_locale: { contentObjectId: id, locale } },
    create: {
      contentObjectId: id,
      locale,
      fields: input.fields as Prisma.InputJsonValue,
      translationStatus: (input.translationStatus ?? 'PENDING') as Prisma.ContentObjectLocaleCreateInput['translationStatus'],
    },
    update: {
      fields: input.fields as Prisma.InputJsonValue,
      ...(input.translationStatus
        ? { translationStatus: input.translationStatus as Prisma.ContentObjectLocaleCreateInput['translationStatus'] }
        : {}),
    },
  })
}

export async function getLocale(orgId: string, id: string, locale: string) {
  const obj = await prisma.contentObject.findFirst({ where: { id, organizationId: orgId } })
  if (!obj) throw new NotFoundError('ContentObject', id)

  const localeRecord = await prisma.contentObjectLocale.findUnique({
    where: { contentObjectId_locale: { contentObjectId: id, locale } },
  })
  if (!localeRecord) throw new NotFoundError('ContentObjectLocale', `${id}/${locale}`)
  return localeRecord
}
