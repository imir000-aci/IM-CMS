import type { Prisma } from '@prisma/client'
import { evaluate } from '@im-cms/rule-engine'
import type { ConditionTree, VisitorContext } from '@im-cms/shared-types'
import { prisma } from '../../config/database.js'
import { NotFoundError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const RULE_SELECT = {
  id: true,
  name: true,
  description: true,
  scope: true,
  conditionTree: true,
  priority: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  scope?: string
  isActive?: boolean
}

export async function listTargetingRules(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const where: Prisma.TargetingRuleWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.scope ? { scope: params.scope as Prisma.EnumRuleScopeFilter['equals'] } : {}),
    ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.targetingRule.findMany({
      where,
      select: RULE_SELECT,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      ...toPrismaSkipTake(pagination),
    }),
    prisma.targetingRule.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getTargetingRule(orgId: string, id: string) {
  const rule = await prisma.targetingRule.findFirst({
    where: { id, organizationId: orgId },
    select: RULE_SELECT,
  })
  if (!rule) throw new NotFoundError('TargetingRule', id)
  return rule
}

interface CreateInput {
  name: string
  description?: string
  scope?: string
  conditionTree: ConditionTree
  priority?: number
}

export async function createTargetingRule(orgId: string, input: CreateInput) {
  return prisma.targetingRule.create({
    data: {
      organizationId: orgId,
      name: input.name,
      description: input.description,
      scope: (input.scope ?? 'GLOBAL') as Prisma.TargetingRuleCreateInput['scope'],
      conditionTree: input.conditionTree as Prisma.InputJsonValue,
      priority: input.priority ?? 0,
    },
    select: RULE_SELECT,
  })
}

interface UpdateInput {
  name?: string
  description?: string
  conditionTree?: ConditionTree
  priority?: number
  isActive?: boolean
}

export async function updateTargetingRule(orgId: string, id: string, input: UpdateInput) {
  const existing = await prisma.targetingRule.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('TargetingRule', id)

  return prisma.targetingRule.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.conditionTree !== undefined
        ? { conditionTree: input.conditionTree as Prisma.InputJsonValue }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: RULE_SELECT,
  })
}

export async function deleteTargetingRule(orgId: string, id: string) {
  const existing = await prisma.targetingRule.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('TargetingRule', id)
  await prisma.targetingRule.update({ where: { id }, data: { isActive: false } })
}

export async function simulateTargetingRule(orgId: string, id: string, context: VisitorContext) {
  const rule = await prisma.targetingRule.findFirst({ where: { id, organizationId: orgId } })
  if (!rule) throw new NotFoundError('TargetingRule', id)

  const conditionTree = rule.conditionTree as ConditionTree
  let matched = false
  let error: string | undefined

  try {
    matched = evaluate(conditionTree, context)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return { ruleId: id, matched, context, error }
}
