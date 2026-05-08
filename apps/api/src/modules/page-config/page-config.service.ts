import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'

const SLOT_CONFIG_INCLUDE = {
  experience: {
    select: { id: true, name: true, priority: true, componentInstanceId: true, contentObjectId: true },
  },
  componentInstance: { select: { id: true, name: true } },
  contentObject: { select: { id: true, name: true, type: true } },
  targetingRule: { select: { id: true, name: true, priority: true } },
} as const

const PAGE_CONFIG_INCLUDE = {
  page: { select: { id: true, name: true, slug: true } },
  campaign: { select: { id: true, name: true, status: true } },
  slotConfigs: {
    include: SLOT_CONFIG_INCLUDE,
    orderBy: { priority: 'desc' } as const,
  },
} as const

export async function listPageConfigs(orgId: string, params: { pageId?: string; campaignId?: string }) {
  const where: Prisma.PageConfigurationWhereInput = {
    page: { organizationId: orgId },
    ...(params.pageId ? { pageId: params.pageId } : {}),
    ...(params.campaignId !== undefined
      ? { campaignId: params.campaignId }
      : {}),
  }

  const configs = await prisma.pageConfiguration.findMany({
    where,
    include: PAGE_CONFIG_INCLUDE,
    orderBy: { priority: 'desc' },
  })

  return { data: configs }
}

export async function getPageConfig(orgId: string, id: string) {
  const config = await prisma.pageConfiguration.findFirst({
    where: { id, page: { organizationId: orgId } },
    include: PAGE_CONFIG_INCLUDE,
  })
  if (!config) throw new NotFoundError('PageConfiguration', id)
  return config
}

interface CreatePageConfigInput {
  pageId: string
  campaignId?: string
  priority?: number
}

export async function createPageConfig(orgId: string, input: CreatePageConfigInput) {
  const page = await prisma.page.findFirst({ where: { id: input.pageId, organizationId: orgId } })
  if (!page) throw new NotFoundError('Page', input.pageId)

  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: input.campaignId, organizationId: orgId } })
    if (!campaign) throw new NotFoundError('Campaign', input.campaignId)
  }

  return prisma.pageConfiguration.create({
    data: {
      pageId: input.pageId,
      campaignId: input.campaignId ?? null,
      priority: input.priority ?? 0,
    },
    include: PAGE_CONFIG_INCLUDE,
  })
}

export async function updatePageConfig(orgId: string, id: string, input: { priority: number }) {
  const existing = await prisma.pageConfiguration.findFirst({
    where: { id, page: { organizationId: orgId } },
  })
  if (!existing) throw new NotFoundError('PageConfiguration', id)

  return prisma.pageConfiguration.update({
    where: { id },
    data: { priority: input.priority },
    include: PAGE_CONFIG_INCLUDE,
  })
}

export async function deletePageConfig(orgId: string, id: string) {
  const existing = await prisma.pageConfiguration.findFirst({
    where: { id, page: { organizationId: orgId } },
  })
  if (!existing) throw new NotFoundError('PageConfiguration', id)
  await prisma.pageConfiguration.delete({ where: { id } })
}

interface CreateSlotConfigInput {
  slotId?: string
  subSlotId?: string
  priority: number
  experienceId?: string
  componentInstanceId?: string
  contentObjectId?: string
  targetingRuleId?: string
}

export async function createSlotConfig(orgId: string, pageConfigId: string, input: CreateSlotConfigInput) {
  const pageConfig = await prisma.pageConfiguration.findFirst({
    where: { id: pageConfigId, page: { organizationId: orgId } },
  })
  if (!pageConfig) throw new NotFoundError('PageConfiguration', pageConfigId)

  // Must target either a slot or subSlot, not both
  if (!input.slotId && !input.subSlotId) {
    throw new ValidationError('Either slotId or subSlotId must be provided', [])
  }
  // Must use either experience path or inline path
  const hasExperiencePath = !!input.experienceId
  const hasInlinePath = !!(input.componentInstanceId && input.contentObjectId)
  if (!hasExperiencePath && !hasInlinePath) {
    throw new ValidationError(
      'Either experienceId or (componentInstanceId + contentObjectId) must be provided',
      [],
    )
  }

  if (input.experienceId) {
    const exp = await prisma.experience.findFirst({ where: { id: input.experienceId, organizationId: orgId } })
    if (!exp) throw new NotFoundError('Experience', input.experienceId)
  }
  if (input.componentInstanceId) {
    const inst = await prisma.componentInstance.findFirst({ where: { id: input.componentInstanceId, organizationId: orgId } })
    if (!inst) throw new NotFoundError('ComponentInstance', input.componentInstanceId)
  }
  if (input.contentObjectId) {
    const cont = await prisma.contentObject.findFirst({ where: { id: input.contentObjectId, organizationId: orgId } })
    if (!cont) throw new NotFoundError('ContentObject', input.contentObjectId)
  }
  if (input.targetingRuleId) {
    const rule = await prisma.targetingRule.findFirst({ where: { id: input.targetingRuleId, organizationId: orgId } })
    if (!rule) throw new NotFoundError('TargetingRule', input.targetingRuleId)
  }

  return prisma.slotConfiguration.create({
    data: {
      pageConfigurationId: pageConfigId,
      slotId: input.slotId ?? null,
      subSlotId: input.subSlotId ?? null,
      priority: input.priority,
      experienceId: input.experienceId ?? null,
      componentInstanceId: input.componentInstanceId ?? null,
      contentObjectId: input.contentObjectId ?? null,
      targetingRuleId: input.targetingRuleId ?? null,
    },
    include: SLOT_CONFIG_INCLUDE,
  })
}

export async function deleteSlotConfig(orgId: string, pageConfigId: string, slotConfigId: string) {
  const pageConfig = await prisma.pageConfiguration.findFirst({
    where: { id: pageConfigId, page: { organizationId: orgId } },
  })
  if (!pageConfig) throw new NotFoundError('PageConfiguration', pageConfigId)

  const slotConfig = await prisma.slotConfiguration.findFirst({
    where: { id: slotConfigId, pageConfigurationId: pageConfigId },
  })
  if (!slotConfig) throw new NotFoundError('SlotConfiguration', slotConfigId)

  await prisma.slotConfiguration.delete({ where: { id: slotConfigId } })
}

export async function diffPageConfigs(orgId: string, fromId: string, toId: string) {
  const [fromConfig, toConfig] = await Promise.all([
    prisma.pageConfiguration.findFirst({
      where: { id: fromId, page: { organizationId: orgId } },
      include: { slotConfigs: { include: SLOT_CONFIG_INCLUDE } },
    }),
    prisma.pageConfiguration.findFirst({
      where: { id: toId, page: { organizationId: orgId } },
      include: { slotConfigs: { include: SLOT_CONFIG_INCLUDE } },
    }),
  ])

  if (!fromConfig) throw new NotFoundError('PageConfiguration', fromId)
  if (!toConfig) throw new NotFoundError('PageConfiguration', toId)

  const fromSlots = new Map(fromConfig.slotConfigs.map((sc) => [sc.slotId ?? sc.subSlotId, sc]))
  const toSlots = new Map(toConfig.slotConfigs.map((sc) => [sc.slotId ?? sc.subSlotId, sc]))

  const allKeys = new Set([...fromSlots.keys(), ...toSlots.keys()])
  const changes: Array<{ slotKey: string | null; type: 'added' | 'removed' | 'modified'; from?: unknown; to?: unknown }> = []

  for (const key of allKeys) {
    const fromSc = fromSlots.get(key)
    const toSc = toSlots.get(key)
    if (!fromSc) {
      changes.push({ slotKey: key, type: 'added', to: toSc })
    } else if (!toSc) {
      changes.push({ slotKey: key, type: 'removed', from: fromSc })
    } else if (JSON.stringify(fromSc) !== JSON.stringify(toSc)) {
      changes.push({ slotKey: key, type: 'modified', from: fromSc, to: toSc })
    }
  }

  return { fromId, toId, changes }
}
