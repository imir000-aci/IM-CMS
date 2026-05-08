import type { FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './master-component.service.js'

type ListQuery = { page?: number; pageSize?: number; search?: string; category?: string; isActive?: boolean }
type IdParam = { id: string }
type VersionParam = { id: string; version: number }
type CreateBody = { name: string; slug: string; description?: string; category?: string; thumbnailUrl?: string; attributeSchema: unknown; bentoConfig?: unknown }
type UpdateBody = { name?: string; description?: string; category?: string; thumbnailUrl?: string; attributeSchema?: unknown; bentoConfig?: unknown; changelog?: string }

export const list = async (req: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) => {
  await reply.send(await svc.listMasterComponents(req.user.org, req.query))
}

export const get = async (req: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
  await reply.send({ data: await svc.getMasterComponent(req.user.org, req.params.id) })
}

export const create = async (req: FastifyRequest<{ Body: CreateBody }>, reply: FastifyReply) => {
  const component = await svc.createMasterComponent(req.user.org, req.body, req.user.sub)
  await reply.status(201).send({ data: component })
}

export const update = async (req: FastifyRequest<{ Params: IdParam; Body: UpdateBody }>, reply: FastifyReply) => {
  const component = await svc.updateMasterComponent(req.user.org, req.params.id, req.body, req.user.sub)
  await reply.send({ data: component })
}

export const remove = async (req: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
  await svc.deleteMasterComponent(req.user.org, req.params.id)
  await reply.status(204).send()
}

export const deprecate = async (req: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
  await reply.send({ data: await svc.deprecateMasterComponent(req.user.org, req.params.id) })
}

export const getVersions = async (req: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
  await reply.send({ data: await svc.getMasterComponentVersions(req.user.org, req.params.id) })
}

export const restoreVersion = async (req: FastifyRequest<{ Params: VersionParam }>, reply: FastifyReply) => {
  const component = await svc.restoreVersion(req.user.org, req.params.id, req.params.version, req.user.sub)
  await reply.send({ data: component })
}

export const getCategories = async (req: FastifyRequest, reply: FastifyReply) => {
  await reply.send({ data: await svc.listCategories(req.user.org) })
}
