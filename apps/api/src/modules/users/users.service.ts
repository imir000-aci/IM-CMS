import type { Role, Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { hashPassword } from '../auth/auth.service.js'
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors.js'
import { toPrismaSkipTake, toPaginatedResponse, parsePagination } from '../../shared/pagination.js'

interface ListUsersParams {
  page?: number
  pageSize?: number
  role?: string
  search?: string
  isActive?: boolean
}

export async function listUsers(organizationId: string, params: ListUsersParams) {
  const pagination = parsePagination(params)
  const where: Prisma.UserWhereInput = {
    organizationId,
    ...(params.role ? { role: params.role as Role } : {}),
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    ...(params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' } },
            { displayName: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      ...toPrismaSkipTake(pagination),
    }),
    prisma.user.count({ where }),
  ])

  return toPaginatedResponse(users, total, pagination)
}

export async function getUserById(organizationId: string, id: string) {
  const user = await prisma.user.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) throw new NotFoundError('User', id)
  return user
}

interface CreateUserInput {
  email: string
  displayName: string
  role: Role
  password?: string
}

export async function createUser(organizationId: string, input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { organizationId_email: { organizationId, email: input.email } },
  })
  if (existing) {
    throw new ConflictError(`User with email '${input.email}' already exists`)
  }

  const passwordHash = input.password ? await hashPassword(input.password) : null

  return prisma.user.create({
    data: {
      organizationId,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })
}

interface UpdateUserInput {
  displayName?: string
  role?: Role
  avatarUrl?: string
}

export async function updateUser(
  organizationId: string,
  id: string,
  input: UpdateUserInput,
  requestingUserRole: Role,
) {
  const user = await prisma.user.findFirst({ where: { id, organizationId } })
  if (!user) throw new NotFoundError('User', id)

  // Non-admins cannot change roles
  if (input.role && requestingUserRole !== 'PLATFORM_ADMIN') {
    throw new ForbiddenError('Only Platform Admins can change user roles')
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  })
}

export async function deactivateUser(organizationId: string, id: string, requestingUserId: string) {
  if (id === requestingUserId) {
    throw new ForbiddenError('Cannot deactivate your own account')
  }
  const user = await prisma.user.findFirst({ where: { id, organizationId } })
  if (!user) throw new NotFoundError('User', id)

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  })
}
