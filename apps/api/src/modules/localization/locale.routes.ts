import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './locale.service.js'

const localeRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('content:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('user:manage')] }

  fastify.get('/', read, async (req: FastifyRequest, reply: FastifyReply) => {
    await reply.send({ data: await svc.listLocales(req.user.org) })
  })

  fastify.get('/:code', read, async (
    req: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getLocale(req.user.org, req.params.code) })
  })

  fastify.post('/', write, async (
    req: FastifyRequest<{ Body: { code: string; name: string; isDefault?: boolean } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createLocale(req.user.org, req.body) })
  })

  fastify.patch('/:code', write, async (
    req: FastifyRequest<{ Params: { code: string }; Body: { name?: string; isDefault?: boolean; isActive?: boolean } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateLocale(req.user.org, req.params.code, req.body) })
  })

  fastify.delete('/:code', write, async (
    req: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteLocale(req.user.org, req.params.code)
    await reply.status(204).send()
  })
}

export default localeRoutes
