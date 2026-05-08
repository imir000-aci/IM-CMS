import type { FastifyPluginAsync } from 'fastify'
import { handleRefresh, handleLogout, handleMe } from './auth.controller.js'
import { refreshJsonSchema } from './auth.schema.js'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/refresh
  fastify.post(
    '/refresh',
    { schema: refreshJsonSchema },
    handleRefresh.bind(fastify),
  )

  // POST /api/v1/auth/logout
  fastify.post(
    '/logout',
    { schema: refreshJsonSchema },
    handleLogout,
  )

  // GET /api/v1/auth/me  (requires auth)
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    handleMe,
  )

  // SSO routes scaffold — full implementation in Sprint 2
  fastify.get('/saml/init', async (_req, reply) => {
    await reply.status(501).send({ error: 'SAML SSO not yet configured' })
  })

  fastify.post('/saml/callback', async (_req, reply) => {
    await reply.status(501).send({ error: 'SAML SSO not yet configured' })
  })

  fastify.get('/oauth/:provider', async (_req, reply) => {
    await reply.status(501).send({ error: 'OAuth not yet configured' })
  })

  fastify.get('/oauth/:provider/callback', async (_req, reply) => {
    await reply.status(501).send({ error: 'OAuth not yet configured' })
  })
}

export default authRoutes
