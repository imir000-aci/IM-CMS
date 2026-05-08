import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './component-pool.service.js'
import {
  listPoolsJsonSchema,
  poolIdParamSchema,
  createPoolJsonSchema,
  updatePoolJsonSchema,
  addItemJsonSchema,
  removeItemParamSchema,
  reorderItemsJsonSchema,
} from './component-pool.schema.js'

const componentPoolRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('component:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('component:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('component:delete')] }

  fastify.get('/', { ...read, schema: listPoolsJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listComponentPools>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listComponentPools(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: poolIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getComponentPool(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createPoolJsonSchema }, async (
    req: FastifyRequest<{ Body: { name: string; description?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createComponentPool(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updatePoolJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateComponentPool(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: poolIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteComponentPool(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.post('/:id/items', { ...write, schema: addItemJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { componentInstanceId: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.addPoolItem(req.user.org, req.params.id, req.body.componentInstanceId),
    })
  })

  fastify.delete('/:id/items/:itemId', { ...del, schema: removeItemParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; itemId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.removePoolItem(req.user.org, req.params.id, req.params.itemId)
    await reply.status(204).send()
  })

  fastify.patch('/:id/items/reorder', { ...write, schema: reorderItemsJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { orderedItemIds: string[] } }>,
    reply: FastifyReply,
  ) => {
    await svc.reorderPoolItems(req.user.org, req.params.id, req.body.orderedItemIds)
    await reply.send({ data: null })
  })
}

export default componentPoolRoutes
