import type { Prisma } from '@prisma/client'
import { prisma } from '../../../config/database.js'
import { NotFoundError, ConflictError, UnprocessableError } from '../../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../../shared/pagination.js'

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  isActive?: boolean
}

const COMPONENT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  thumbnailUrl: true,
  attributeSchema: true,
  bentoConfig: true,
  isActive: true,
  isDeprecated: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { versions: true, instances: true } },
} as const

export async function listMasterComponents(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.MasterComponentWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.category ? { category: params.category } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { slug: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.masterComponent.findMany({
      where,
      select: COMPONENT_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.masterComponent.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getMasterComponent(orgId: string, id: string) {
  const component = await prisma.masterComponent.findFirst({
    where: { id, organizationId: orgId },
    select: COMPONENT_SELECT,
  })
  if (!component) throw new NotFoundError('MasterComponent', id)
  return component
}

interface CreateInput {
  name: string
  slug: string
  description?: string
  category?: string
  thumbnailUrl?: string
  attributeSchema: unknown
  bentoConfig?: unknown
}

export async function createMasterComponent(orgId: string, input: CreateInput, createdById: string) {
  const existing = await prisma.masterComponent.findUnique({
    where: { organizationId_slug: { organizationId: orgId, slug: input.slug } },
  })
  if (existing) {
    throw new ConflictError(`Component with slug '${input.slug}' already exists`)
  }

  return prisma.$transaction(async (tx) => {
    const component = await tx.masterComponent.create({
      data: {
        organizationId: orgId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
        thumbnailUrl: input.thumbnailUrl,
        attributeSchema: input.attributeSchema as Prisma.InputJsonValue,
        bentoConfig: input.bentoConfig as Prisma.InputJsonValue | undefined,
      },
      select: COMPONENT_SELECT,
    })

    await tx.masterComponentVersion.create({
      data: {
        masterComponentId: component.id,
        version: 1,
        attributeSchema: input.attributeSchema as Prisma.InputJsonValue,
        bentoConfig: input.bentoConfig as Prisma.InputJsonValue | undefined,
        changelog: 'Initial version',
        createdById,
      },
    })

    return component
  })
}

interface UpdateInput {
  name?: string
  description?: string
  category?: string
  thumbnailUrl?: string
  attributeSchema?: unknown
  bentoConfig?: unknown
  changelog?: string
}

export async function updateMasterComponent(
  orgId: string,
  id: string,
  input: UpdateInput,
  updatedById: string,
) {
  const existing = await prisma.masterComponent.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('MasterComponent', id)

  const schemaChanged =
    input.attributeSchema !== undefined || input.bentoConfig !== undefined

  return prisma.$transaction(async (tx) => {
    const component = await tx.masterComponent.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.attributeSchema !== undefined
          ? { attributeSchema: input.attributeSchema as Prisma.InputJsonValue }
          : {}),
        ...(input.bentoConfig !== undefined
          ? { bentoConfig: input.bentoConfig as Prisma.InputJsonValue }
          : {}),
      },
      select: COMPONENT_SELECT,
    })

    if (schemaChanged) {
      const latest = await tx.masterComponentVersion.findFirst({
        where: { masterComponentId: id },
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const nextVersion = (latest?.version ?? 0) + 1

      await tx.masterComponentVersion.create({
        data: {
          masterComponentId: id,
          version: nextVersion,
          attributeSchema: (input.attributeSchema ??
            existing.attributeSchema) as Prisma.InputJsonValue,
          bentoConfig: (input.bentoConfig ?? existing.bentoConfig) as
            | Prisma.InputJsonValue
            | undefined,
          changelog: input.changelog ?? `Version ${nextVersion}`,
          createdById: updatedById,
        },
      })
    }

    return component
  })
}

export async function deleteMasterComponent(orgId: string, id: string) {
  const existing = await prisma.masterComponent.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('MasterComponent', id)

  const instanceCount = await prisma.componentInstance.count({
    where: { masterComponentId: id, isActive: true },
  })
  if (instanceCount > 0) {
    throw new UnprocessableError(
      `Cannot delete component: ${instanceCount} active instance(s) exist. Deprecate it instead.`,
    )
  }

  await prisma.masterComponent.update({ where: { id }, data: { isActive: false } })
}

export async function deprecateMasterComponent(orgId: string, id: string) {
  const existing = await prisma.masterComponent.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('MasterComponent', id)
  return prisma.masterComponent.update({
    where: { id },
    data: { isDeprecated: true, deprecatedAt: new Date() },
    select: { id: true, isDeprecated: true, deprecatedAt: true },
  })
}

export async function getMasterComponentVersions(orgId: string, id: string) {
  const component = await prisma.masterComponent.findFirst({ where: { id, organizationId: orgId } })
  if (!component) throw new NotFoundError('MasterComponent', id)

  return prisma.masterComponentVersion.findMany({
    where: { masterComponentId: id },
    orderBy: { version: 'desc' },
  })
}

export async function restoreVersion(
  orgId: string,
  id: string,
  version: number,
  restoredById: string,
) {
  const component = await prisma.masterComponent.findFirst({ where: { id, organizationId: orgId } })
  if (!component) throw new NotFoundError('MasterComponent', id)

  const targetVersion = await prisma.masterComponentVersion.findUnique({
    where: { masterComponentId_version: { masterComponentId: id, version } },
  })
  if (!targetVersion) throw new NotFoundError('ComponentVersion', `${id}@v${version}`)

  return updateMasterComponent(
    orgId,
    id,
    {
      attributeSchema: targetVersion.attributeSchema,
      bentoConfig: targetVersion.bentoConfig ?? undefined,
      changelog: `Restored from v${version}`,
    },
    restoredById,
  )
}

export async function listCategories(orgId: string) {
  const components = await prisma.masterComponent.findMany({
    where: { organizationId: orgId, isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
  return components.map((c) => c.category).filter(Boolean)
}
