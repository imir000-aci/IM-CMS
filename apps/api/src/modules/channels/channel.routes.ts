import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './channel.service.js'
import {
  listChannelsJsonSchema,
  channelIdParamSchema,
  createChannelJsonSchema,
  updateChannelJsonSchema,
} from './channel.schema.js'

const channelRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('page:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('page:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('page:delete')] }

  fastify.get('/', { ...read, schema: listChannelsJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listChannels>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listChannels(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: channelIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getChannel(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createChannelJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createChannel>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createChannel(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateChannelJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updateChannel>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateChannel(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: channelIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteChannel(req.user.org, req.params.id)
    await reply.status(204).send()
  })
}

export default channelRoutes
