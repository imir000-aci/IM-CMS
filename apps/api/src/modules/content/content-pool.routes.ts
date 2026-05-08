import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './content-pool.service.js'
import {
  listContentPoolsJsonSchema,
  contentPoolIdParamSchema,
  createContentPoolJsonSchema,
  updateContentPoolJsonSchema,
  addContentItemJsonSchema,
  removeContentItemParamSchema,
} from './content-pool.schema.js'

const contentPoolRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('content:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('content:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('content:delete')] }

  fastify.get('/', { ...read, schema: listContentPoolsJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listContentPools>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listContentPools(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: contentPoolIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getContentPool(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createContentPoolJsonSchema }, async (
    req: FastifyRequest<{ Body: { name: string; description?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createContentPool(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateContentPoolJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateContentPool(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: contentPoolIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteContentPool(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.post('/:id/items', { ...write, schema: addContentItemJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { contentObjectId: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.addContentPoolItem(req.user.org, req.params.id, req.body.contentObjectId),
    })
  })

  fastify.delete('/:id/items/:itemId', { ...del, schema: removeContentItemParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; itemId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.removeContentPoolItem(req.user.org, req.params.id, req.params.itemId)
    await reply.status(204).send()
  })
}

export default contentPoolRoutes
