import { prisma } from '../../config/database.js'
import { NotFoundError, ConflictError } from '../../shared/errors.js'

const LOCALE_SELECT = {
  id: true,
  code: true,
  name: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
} as const

export async function listLocales(orgId: string) {
  return prisma.locale.findMany({
    where: { organizationId: orgId },
    select: LOCALE_SELECT,
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
  })
}

export async function getLocale(orgId: string, code: string) {
  const locale = await prisma.locale.findFirst({ where: { organizationId: orgId, code }, select: LOCALE_SELECT })
  if (!locale) throw new NotFoundError('Locale', code)
  return locale
}

export async function createLocale(orgId: string, input: { code: string; name: string; isDefault?: boolean }) {
  const existing = await prisma.locale.findFirst({ where: { organizationId: orgId, code: input.code } })
  if (existing) throw new ConflictError(`Locale '${input.code}' already exists`)

  // If setting as default, unset previous default
  if (input.isDefault) {
    await prisma.locale.updateMany({ where: { organizationId: orgId, isDefault: true }, data: { isDefault: false } })
  }

  return prisma.locale.create({
    data: { organizationId: orgId, code: input.code, name: input.name, isDefault: input.isDefault ?? false },
    select: LOCALE_SELECT,
  })
}

export async function updateLocale(orgId: string, code: string, input: { name?: string; isDefault?: boolean; isActive?: boolean }) {
  const existing = await prisma.locale.findFirst({ where: { organizationId: orgId, code } })
  if (!existing) throw new NotFoundError('Locale', code)

  if (input.isDefault) {
    await prisma.locale.updateMany({ where: { organizationId: orgId, isDefault: true }, data: { isDefault: false } })
  }

  return prisma.locale.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: LOCALE_SELECT,
  })
}

export async function deleteLocale(orgId: string, code: string) {
  const locale = await prisma.locale.findFirst({ where: { organizationId: orgId, code } })
  if (!locale) throw new NotFoundError('Locale', code)
  if (locale.isDefault) throw new ConflictError('Cannot delete the default locale')
  await prisma.locale.update({ where: { id: locale.id }, data: { isActive: false } })
}
