import type { Prisma } from '@prisma/client'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { prisma } from '../../../config/database.js'
import { NotFoundError, ValidationError } from '../../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../../shared/pagination.js'
import type { AttributeDefinition } from '@im-cms/shared-types'

const ajv = new Ajv({ allErrors: true, coerceTypes: false })
addFormats(ajv)

const INSTANCE_SELECT = {
  id: true,
  name: true,
  masterComponentId: true,
  prefilledAttributes: true,
  tags: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  masterComponent: { select: { name: true, slug: true, attributeSchema: true } },
} as const

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  masterComponentId?: string
  tags?: string
  poolId?: string
  isActive?: boolean
}

export async function listInstances(orgId: string, params: ListParams) {
  const pagination = parsePagination(params)
  const tagList = params.tags ? params.tags.split(',').map((t) => t.trim()) : undefined

  const where: Prisma.ComponentInstanceWhereInput = {
    organizationId: orgId,
    isActive: params.isActive ?? true,
    ...(params.masterComponentId ? { masterComponentId: params.masterComponentId } : {}),
    ...(tagList?.length ? { tags: { hasSome: tagList } } : {}),
    ...(params.poolId
      ? { poolItems: { some: { componentPoolId: params.poolId } } }
      : {}),
    ...(params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.componentInstance.findMany({
      where,
      select: INSTANCE_SELECT,
      orderBy: { name: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.componentInstance.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getInstance(orgId: string, id: string) {
  const instance = await prisma.componentInstance.findFirst({
    where: { id, organizationId: orgId },
    select: INSTANCE_SELECT,
  })
  if (!instance) throw new NotFoundError('ComponentInstance', id)
  return instance
}

function validateAgainstSchema(attributes: Record<string, unknown>, schema: AttributeDefinition[]) {
  const errors: string[] = []
  for (const attr of schema) {
    const value = attributes[attr.name]
    if (attr.required && !attr.isAuthorFillable) {
      // Locked required fields MUST be prefilled
      if (value === undefined || value === null) {
        errors.push(`Required attribute '${attr.name}' must be prefilled`)
      }
    }
    if (value !== undefined && value !== null && attr.validationRules) {
      const rules = attr.validationRules
      if (typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`'${attr.name}' is too short (min ${rules.minLength})`)
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`'${attr.name}' is too long (max ${rules.maxLength})`)
        }
        if (rules.regex && !new RegExp(rules.regex).test(value)) {
          errors.push(`'${attr.name}' does not match pattern '${rules.regex}'`)
        }
        if (rules.allowedValues?.length && !rules.allowedValues.includes(value)) {
          errors.push(`'${attr.name}' must be one of: ${rules.allowedValues.join(', ')}`)
        }
      }
    }
  }
  return errors
}

interface CreateInstanceInput {
  masterComponentId: string
  name: string
  prefilledAttributes?: Record<string, unknown>
  tags?: string[]
}

export async function createInstance(orgId: string, input: CreateInstanceInput) {
  const master = await prisma.masterComponent.findFirst({
    where: { id: input.masterComponentId, organizationId: orgId, isActive: true },
  })
  if (!master) throw new NotFoundError('MasterComponent', input.masterComponentId)

  const attrs = input.prefilledAttributes ?? {}
  const schema = master.attributeSchema as AttributeDefinition[]
  const errs = validateAgainstSchema(attrs, schema)
  if (errs.length > 0) throw new ValidationError('Invalid attribute values', errs)

  return prisma.componentInstance.create({
    data: {
      organizationId: orgId,
      masterComponentId: input.masterComponentId,
      name: input.name,
      prefilledAttributes: attrs as Prisma.InputJsonValue,
      tags: input.tags ?? [],
    },
    select: INSTANCE_SELECT,
  })
}

interface UpdateInstanceInput {
  name?: string
  prefilledAttributes?: Record<string, unknown>
  tags?: string[]
}

export async function updateInstance(orgId: string, id: string, input: UpdateInstanceInput) {
  const existing = await prisma.componentInstance.findFirst({
    where: { id, organizationId: orgId },
    include: { masterComponent: { select: { attributeSchema: true } } },
  })
  if (!existing) throw new NotFoundError('ComponentInstance', id)

  if (input.prefilledAttributes) {
    const schema = existing.masterComponent.attributeSchema as AttributeDefinition[]
    const errs = validateAgainstSchema(input.prefilledAttributes, schema)
    if (errs.length > 0) throw new ValidationError('Invalid attribute values', errs)
  }

  return prisma.componentInstance.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.prefilledAttributes !== undefined
        ? { prefilledAttributes: input.prefilledAttributes as Prisma.InputJsonValue }
        : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    },
    select: INSTANCE_SELECT,
  })
}

export async function deleteInstance(orgId: string, id: string) {
  const existing = await prisma.componentInstance.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) throw new NotFoundError('ComponentInstance', id)
  await prisma.componentInstance.update({ where: { id }, data: { isActive: false } })
}
