import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './experimentation.service.js'

const experimentationRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate, fastify.requirePermission('experience:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('experience:write')] }

  fastify.get('/', auth, async (
    req: FastifyRequest<{ Querystring: { page?: number; pageSize?: number; experimentKey?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listMappings(req.user.org, req.query))
  })

  fastify.get('/:id', auth, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getMapping(req.user.org, req.params.id) })
  })

  fastify.post('/', write, async (
    req: FastifyRequest<{ Body: { experimentKey: string; variantKey: string; experienceId: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createMapping(req.user.org, req.body) })
  })

  fastify.delete('/:id', write, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteMapping(req.user.org, req.params.id)
    await reply.status(204).send()
  })
}

export default experimentationRoutes
