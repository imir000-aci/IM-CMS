import type { FastifyPluginAsync } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './component-instance.service.js'
import {
  listInstancesJsonSchema,
  instanceIdParamSchema,
  createInstanceJsonSchema,
  updateInstanceJsonSchema,
} from './component-instance.schema.js'

const componentInstanceRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('component:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('component:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('component:delete')] }

  fastify.get('/', { ...read, schema: listInstancesJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listInstances>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listInstances(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: instanceIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getInstance(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createInstanceJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createInstance>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createInstance(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateInstanceJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updateInstance>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateInstance(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: instanceIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteInstance(req.user.org, req.params.id)
    await reply.status(204).send()
  })
}

export default componentInstanceRoutes
