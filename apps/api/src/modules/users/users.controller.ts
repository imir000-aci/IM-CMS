import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Role } from '@prisma/client'
import * as usersService from './users.service.js'

type ListQuery = { page?: number; pageSize?: number; role?: string; search?: string; isActive?: boolean }
type IdParam = { id: string }
type CreateBody = { email: string; displayName: string; role: Role; password?: string }
type UpdateBody = { displayName?: string; role?: Role; avatarUrl?: string }

export async function listUsers(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply,
) {
  const result = await usersService.listUsers(request.user.org, request.query)
  await reply.send(result)
}

export async function getUser(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply,
) {
  const user = await usersService.getUserById(request.user.org, request.params.id)
  await reply.send({ data: user })
}

export async function createUser(
  request: FastifyRequest<{ Body: CreateBody }>,
  reply: FastifyReply,
) {
  const user = await usersService.createUser(request.user.org, request.body)
  await reply.status(201).send({ data: user })
}

export async function updateUser(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateBody }>,
  reply: FastifyReply,
) {
  const user = await usersService.updateUser(
    request.user.org,
    request.params.id,
    request.body,
    request.user.role,
  )
  await reply.send({ data: user })
}

export async function deactivateUser(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply,
) {
  await usersService.deactivateUser(request.user.org, request.params.id, request.user.sub)
  await reply.status(204).send()
}
