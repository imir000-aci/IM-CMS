import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './seo.service.js'

const seoRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('page:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('page:write')] }

  // SEO Redirects
  fastify.get('/redirects', read, async (
    req: FastifyRequest<{ Querystring: { page?: number; pageSize?: number; search?: string; isActive?: boolean } }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listRedirects(req.user.org, req.query))
  })

  fastify.post('/redirects', write, async (
    req: FastifyRequest<{ Body: { fromPath: string; toPath: string; statusCode?: number } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createRedirect(req.user.org, req.body) })
  })

  fastify.patch('/redirects/:id', write, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { toPath?: string; statusCode?: number } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateRedirect(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/redirects/:id', write, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteRedirect(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  // Sitemap generation
  fastify.get('/sitemap.xml', async (
    req: FastifyRequest<{ Querystring: { channel?: string } }>,
    reply: FastifyReply,
  ) => {
    const xml = await svc.generateSitemap(req.user.org, req.query.channel)
    await reply.type('application/xml').send(xml)
  })
}

export default seoRoutes
