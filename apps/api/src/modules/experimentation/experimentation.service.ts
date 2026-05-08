import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'
import { parsePagination, toPrismaSkipTake, toPaginatedResponse } from '../../shared/pagination.js'

const MAPPING_SELECT = {
  id: true,
  experimentKey: true,
  variantKey: true,
  experienceId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  experience: { select: { id: true, name: true } },
} as const

export async function listMappings(orgId: string, params: { page?: number; pageSize?: number; experimentKey?: string }) {
  const pagination = parsePagination(params)
  const where = {
    organizationId: orgId,
    ...(params.experimentKey ? { experimentKey: params.experimentKey } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.experimentMapping.findMany({
      where,
      select: MAPPING_SELECT,
      orderBy: { experimentKey: 'asc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.experimentMapping.count({ where }),
  ])

  return toPaginatedResponse(items, total, pagination)
}

export async function getMapping(orgId: string, id: string) {
  const mapping = await prisma.experimentMapping.findFirst({
    where: { id, organizationId: orgId },
    select: MAPPING_SELECT,
  })
  if (!mapping) throw new NotFoundError('ExperimentMapping', id)
  return mapping
}

export async function createMapping(
  orgId: string,
  input: { experimentKey: string; variantKey: string; experienceId: string },
) {
  const exp = await prisma.experience.findFirst({ where: { id: input.experienceId, organizationId: orgId } })
  if (!exp) throw new NotFoundError('Experience', input.experienceId)

  const existing = await prisma.experimentMapping.findFirst({
    where: { organizationId: orgId, experimentKey: input.experimentKey, variantKey: input.variantKey },
  })
  if (existing) throw new ConflictError(`Mapping for ${input.experimentKey}/${input.variantKey} already exists`)

  return prisma.experimentMapping.create({
    data: { organizationId: orgId, ...input },
    select: MAPPING_SELECT,
  })
}

export async function deleteMapping(orgId: string, id: string) {
  const mapping = await prisma.experimentMapping.findFirst({ where: { id, organizationId: orgId } })
  if (!mapping) throw new NotFoundError('ExperimentMapping', id)
  await prisma.experimentMapping.update({ where: { id }, data: { isActive: false } })
}
