import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const EXPERIENCE_SELECT = {
  id: true,
  name: true,
  componentInstanceId: true,
  contentObjectId: true,
  abTestKey: true,
  priority: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  componentInstance: { select: { name: true, masterComponent: { select: { name: true, slug: true } } } },
  contentObject: { select: { name: true, type: true } },
  targetingRules: {
    include: {
      targetingRule: { select: { id: true, name: true, scope: true, priority: true, isActive: true } },
    },
    orderBy: { targetingRule: { priority: 'desc' } },
  },
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  campaignId?: string
  isActive?: boolean
}

export async function listExperiences(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.ExperienceWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.campaignId
      ? { campaigns: { some: { campaignId: params.campaignId } } }
      : {}),
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.experience.findMany({
      where,
      select: EXPERIENCE_SELECT,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      ...toPrismaSkipTake(pagination),
    }),
    prisma.experience.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getExperience(orgId: string, id: string) {
  const exp = await prisma.experience.findFirst({
    where: { id, organizationId: orgId },
    include: {
      componentInstance: {
        select: { name: true, prefilledAttributes: true, masterComponent: { select: { name: true, slug: true, attributeSchema: true } } },
      },
      contentObject: { select: { name: true, type: true, fields: true } },
      targetingRules: {
        include: { targetingRule: { select: { id: true, name: true, scope: true, conditionTree: true, priority: true, isActive: true } } },
        orderBy: { targetingRule: { priority: 'desc' } },
      },
    },
  })
  if (!exp) throw new NotFoundError('Experience', id)
  return exp
}

interface CreateInput {
  name: string
  componentInstanceId: string
  contentObjectId: string
  abTestKey?: string
  priority?: number
  startDate?: string
  endDate?: string
}

export async function createExperience(orgId: string, input: CreateInput) {
  const instance = await prisma.componentInstance.findFirst({
    where: { id: input.componentInstanceId, organizationId: orgId, isActive: true },
  })
  if (!instance) throw new NotFoundError('ComponentInstance', input.componentInstanceId)

  const content = await prisma.contentObject.findFirst({
    where: { id: input.contentObjectId, organizationId: orgId, isActive: true },
  })
  if (!content) throw new NotFoundError('ContentObject', input.contentObjectId)

  return prisma.experience.create({
    data: {
      organizationId: orgId,
      name: input.name,
      componentInstanceId: input.componentInstanceId,
      contentObjectId: input.contentObjectId,
      abTestKey: input.abTestKey,
      priority: input.priority ?? 0,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
    select: EXPERIENCE_SELECT,
  })
}

interface UpdateInput {
  name?: string
  componentInstanceId?: string
  contentObjectId?: string
  abTestKey?: string
  priority?: number
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export async function updateExperience(orgId: string, id: string, input: UpdateInput) {
  const existing = await prisma.experience.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Experience', id)

  if (input.componentInstanceId) {
    const instance = await prisma.componentInstance.findFirst({
      where: { id: input.componentInstanceId, organizationId: orgId, isActive: true },
    })
    if (!instance) throw new NotFoundError('ComponentInstance', input.componentInstanceId)
  }
  if (input.contentObjectId) {
    const content = await prisma.contentObject.findFirst({
      where: { id: input.contentObjectId, organizationId: orgId, isActive: true },
    })
    if (!content) throw new NotFoundError('ContentObject', input.contentObjectId)
  }

  return prisma.experience.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.componentInstanceId !== undefined ? { componentInstanceId: input.componentInstanceId } : {}),
      ...(input.contentObjectId !== undefined ? { contentObjectId: input.contentObjectId } : {}),
      ...(input.abTestKey !== undefined ? { abTestKey: input.abTestKey } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate !== undefined ? { endDate: new Date(input.endDate) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: EXPERIENCE_SELECT,
  })
}

export async function deleteExperience(orgId: string, id: string) {
  const existing = await prisma.experience.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('Experience', id)
  await prisma.experience.update({ where: { id }, data: { isActive: false } })
}

export async function attachTargetingRule(orgId: string, experienceId: string, targetingRuleId: string) {
  const exp = await prisma.experience.findFirst({ where: { id: experienceId, organizationId: orgId } })
  if (!exp) throw new NotFoundError('Experience', experienceId)

  const rule = await prisma.targetingRule.findFirst({
    where: { id: targetingRuleId, organizationId: orgId, isActive: true },
  })
  if (!rule) throw new NotFoundError('TargetingRule', targetingRuleId)

  const existing = await prisma.experienceTargetingRule.findFirst({
    where: { experienceId, targetingRuleId },
  })
  if (existing) throw new ConflictError('TargetingRule is already attached to this experience')

  await prisma.experienceTargetingRule.create({ data: { experienceId, targetingRuleId } })
}

export async function detachTargetingRule(orgId: string, experienceId: string, targetingRuleId: string) {
  const exp = await prisma.experience.findFirst({ where: { id: experienceId, organizationId: orgId } })
  if (!exp) throw new NotFoundError('Experience', experienceId)

  const existing = await prisma.experienceTargetingRule.findFirst({
    where: { experienceId, targetingRuleId },
  })
  if (!existing) throw new NotFoundError('ExperienceTargetingRule', targetingRuleId)

  await prisma.experienceTargetingRule.delete({
    where: { experienceId_targetingRuleId: { experienceId, targetingRuleId } },
  })
}
