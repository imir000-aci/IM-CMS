import { PrismaClient } from '@prisma/client'
import { evaluate } from '@im-cms/rule-engine'
import type { VisitorContext, ResolvedPage, ResolvedSlot } from '@im-cms/shared-types'
import { getCached, setCached } from './cache.service.js'
import { env } from '../config/env.js'

const prisma = new PrismaClient({
  log: ['error'],
  datasources: { db: { url: process.env['DATABASE_URL'] } },
})

const DEL_PAGE_KEY = (slug: string, locale: string) => `del:page:${slug}:${locale}`

export async function resolvePage(
  channelSlug: string,
  pageSlug: string,
  ctx: VisitorContext,
  locale = 'en',
  bypassCache = false,
): Promise<ResolvedPage | null> {
  const cacheKey = DEL_PAGE_KEY(`${channelSlug}:${pageSlug}`, locale)

  if (!bypassCache) {
    const cached = await getCached<ResolvedPage>(cacheKey)
    if (cached) return cached
  }

  // Load page + full slot tree + all active page configurations
  const page = await prisma.page.findFirst({
    where: {
      slug: pageSlug,
      isPublished: true,
      channel: { slug: channelSlug },
    },
    include: {
      zones: {
        include: {
          slots: {
            include: { subSlots: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      configurations: {
        where: {
          OR: [
            { campaignId: null },
            {
              campaign: {
                status: 'PRODUCTION',
                startDate: { lte: new Date() },
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              },
            },
          ],
        },
        orderBy: { priority: 'desc' },
        include: {
          slotConfigs: {
            include: {
              experience: {
                include: {
                  componentInstance: true,
                  contentObject: true,
                  targetingRules: {
                    include: { targetingRule: true },
                  },
                },
              },
              componentInstance: true,
              contentObject: true,
              targetingRule: true,
            },
            orderBy: { priority: 'desc' },
          },
        },
      },
    },
  })

  if (!page) return null

  // Collect all slot IDs in the page
  const allSlots = page.zones.flatMap((z) => z.slots)
  const resolvedSlots: ResolvedSlot[] = []

  for (const slot of allSlots) {
    const resolved = resolveSlotFromConfigs(slot.id, page.configurations, ctx, locale)
    if (resolved) {
      resolvedSlots.push({ ...resolved, slotId: slot.id })
    }
  }

  const result: ResolvedPage = {
    pageId: page.id,
    slug: page.slug,
    locale,
    metaTitle: page.metaTitle ?? undefined,
    metaDescription: page.metaDescription ?? undefined,
    ogTags: page.ogTags as Record<string, string> | undefined,
    slots: resolvedSlots,
  }

  await setCached(cacheKey, result, env.DELIVERY_CACHE_TTL_SECONDS)
  return result
}

type SlotConfigRow = {
  slotId: string | null
  subSlotId: string | null
  priority: number
  experience: ExperienceRow | null
  componentInstance: ComponentInstanceRow | null
  contentObject: ContentObjectRow | null
  targetingRule: TargetingRuleRow | null
}

type ExperienceRow = {
  id: string
  componentInstanceId: string | null
  contentObjectId: string | null
  targetingRules: Array<{ targetingRule: TargetingRuleRow }>
  componentInstance: ComponentInstanceRow | null
  contentObject: ContentObjectRow | null
}

type ComponentInstanceRow = {
  id: string
  masterComponent?: { slug: string } | null
  prefilledAttributes: unknown
}

type ContentObjectRow = {
  id: string
  fields: unknown
}

type TargetingRuleRow = {
  id: string
  conditionTree: unknown
  priority: number
  isActive: boolean
}

function resolveSlotFromConfigs(
  slotId: string,
  configurations: Array<{ slotConfigs: SlotConfigRow[] }>,
  ctx: VisitorContext,
  _locale: string,
): Omit<ResolvedSlot, 'slotId'> | null {
  // Iterate configurations in priority order (already sorted desc)
  for (const config of configurations) {
    const candidates = config.slotConfigs.filter((sc) => sc.slotId === slotId)
    if (!candidates.length) continue

    // Sort candidates by priority desc
    const sorted = [...candidates].sort((a, b) => b.priority - a.priority)

    for (const candidate of sorted) {
      const resolved = evaluateCandidate(candidate, ctx)
      if (resolved) return resolved
    }
  }

  return null
}

function evaluateCandidate(
  candidate: SlotConfigRow,
  ctx: VisitorContext,
): Omit<ResolvedSlot, 'slotId'> | null {
  // Path 1: via Experience
  if (candidate.experience) {
    return resolveExperience(candidate.experience, ctx)
  }

  // Path 2: inline (componentInstance + contentObject + optional targetingRule)
  if (candidate.componentInstance && candidate.contentObject) {
    if (candidate.targetingRule && candidate.targetingRule.isActive) {
      const matches = evaluate(
        candidate.targetingRule.conditionTree as Parameters<typeof evaluate>[0],
        ctx,
      )
      if (!matches) return null
    }

    return buildResolvedSlot(
      candidate.componentInstance,
      candidate.contentObject,
      candidate.targetingRule?.id,
    )
  }

  return null
}

function resolveExperience(
  experience: ExperienceRow,
  ctx: VisitorContext,
): Omit<ResolvedSlot, 'slotId'> | null {
  // Evaluate all targeting rules — all must match (AND semantics for experience rules)
  for (const { targetingRule } of experience.targetingRules) {
    if (!targetingRule.isActive) continue
    const matches = evaluate(
      targetingRule.conditionTree as Parameters<typeof evaluate>[0],
      ctx,
    )
    if (!matches) return null
  }

  const component = experience.componentInstance
  const content = experience.contentObject
  if (!component || !content) return null

  return buildResolvedSlot(component, content, experience.id)
}

function buildResolvedSlot(
  component: ComponentInstanceRow,
  content: ContentObjectRow,
  referenceId: string | undefined,
): Omit<ResolvedSlot, 'slotId'> {
  return {
    experienceId: referenceId ?? '',
    componentInstanceId: component.id,
    contentObjectId: content.id,
    componentSlug: (component.masterComponent as { slug?: string } | null)?.slug ?? '',
    prefilledAttributes: component.prefilledAttributes as Record<string, unknown>,
    contentFields: content.fields as Record<string, unknown>,
    locale: 'en',
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
