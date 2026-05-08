import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './content-object.service.js'
import {
  listContentJsonSchema,
  contentIdParamSchema,
  createContentJsonSchema,
  updateContentJsonSchema,
  localeParamSchema,
  upsertLocaleJsonSchema,
} from './content-object.schema.js'

const contentObjectRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('content:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('content:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('content:delete')] }

  fastify.get('/', { ...read, schema: listContentJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listContentObjects>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listContentObjects(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: contentIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getContentObject(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createContentJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createContentObject>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createContentObject(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateContentJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updateContentObject>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.updateContentObject(req.user.org, req.params.id, req.body, req.user.sub),
    })
  })

  fastify.delete('/:id', { ...del, schema: contentIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteContentObject(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.get('/:id/versions', { ...read, schema: contentIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getContentObjectVersions(req.user.org, req.params.id) })
  })

  fastify.post('/:id/versions/:version/restore', { ...write }, async (
    req: FastifyRequest<{ Params: { id: string; version: string } }>,
    reply: FastifyReply,
  ) => {
    const version = parseInt(req.params.version, 10)
    await reply.send({
      data: await svc.restoreContentVersion(req.user.org, req.params.id, version, req.user.sub),
    })
  })

  fastify.get('/:id/locales/:locale', { ...read, schema: localeParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; locale: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getLocale(req.user.org, req.params.id, req.params.locale) })
  })

  fastify.put('/:id/locales/:locale', { ...write, schema: upsertLocaleJsonSchema }, async (
    req: FastifyRequest<{
      Params: { id: string; locale: string }
      Body: { fields: Record<string, unknown>; translationStatus?: string }
    }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.upsertLocale(req.user.org, req.params.id, req.params.locale, req.body),
    })
  })
}

export default contentObjectRoutes
