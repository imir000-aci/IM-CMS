import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { refreshAccessToken, logout } from './auth.service.js'
import { prisma } from '../../config/database.js'

export async function handleRefresh(
  this: FastifyInstance,
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { accessToken } = await refreshAccessToken(this, request.body.refreshToken)
  await reply.send({ accessToken })
}

export async function handleLogout(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply,
): Promise<void> {
  await logout(request.body.refreshToken)
  await reply.status(204).send()
}

export async function handleMe(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      organizationId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })
  await reply.send({ data: user })
}
