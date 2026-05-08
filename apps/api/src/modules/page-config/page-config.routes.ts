import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './page-config.service.js'
import {
  listPageConfigsJsonSchema,
  pageConfigIdParamSchema,
  createPageConfigJsonSchema,
  updatePageConfigJsonSchema,
  createSlotConfigJsonSchema,
  slotConfigIdParamSchema,
  diffQuerySchema,
} from './page-config.schema.js'

const pageConfigRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('page:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('page:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('page:write')] }

  fastify.get('/', { ...read, schema: listPageConfigsJsonSchema }, async (
    req: FastifyRequest<{ Querystring: { pageId?: string; campaignId?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listPageConfigs(req.user.org, req.query))
  })

  fastify.get('/diff', { ...read, schema: diffQuerySchema }, async (
    req: FastifyRequest<{ Querystring: { from: string; to: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.diffPageConfigs(req.user.org, req.query.from, req.query.to) })
  })

  fastify.get('/:id', { ...read, schema: pageConfigIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getPageConfig(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createPageConfigJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createPageConfig>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createPageConfig(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updatePageConfigJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { priority: number } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updatePageConfig(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: pageConfigIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deletePageConfig(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  // Slot configurations
  fastify.post('/:id/slot-configs', { ...write, schema: createSlotConfigJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.createSlotConfig>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.createSlotConfig(req.user.org, req.params.id, req.body),
    })
  })

  fastify.delete('/:id/slot-configs/:slotConfigId', { ...del, schema: slotConfigIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; slotConfigId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteSlotConfig(req.user.org, req.params.id, req.params.slotConfigId)
    await reply.status(204).send()
  })
}

export default pageConfigRoutes
