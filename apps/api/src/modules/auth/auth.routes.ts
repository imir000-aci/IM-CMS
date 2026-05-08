import type { FastifyPluginAsync } from 'fastify'
import {
  handleLogin,
  handleRefresh,
  handleLogout,
  handleMe,
} from './auth.controller.js'
import { loginJsonSchema, refreshJsonSchema } from './auth.schema.js'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/login
  fastify.post(
    '/login',
    { schema: loginJsonSchema },
    handleLogin.bind(fastify),
  )

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

  // GET /api/v1/auth/me (requires auth)
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    handleMe,
  )

  // SSO routes — SAML 2.0
  fastify.get('/saml/init', async (_req, reply) => {
    await reply.status(501).send({ error: 'SAML SSO not configured', message: 'Set SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT in environment' })
  })

  fastify.post('/saml/callback', async (_req, reply) => {
    await reply.status(501).send({ error: 'SAML SSO not configured' })
  })

  // SSO routes — OAuth2/OIDC
  fastify.get('/oauth/:provider', async (_req, reply) => {
    await reply.status(501).send({ error: 'OAuth not configured', message: 'Set OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_DISCOVERY_URL in environment' })
  })

  fastify.get('/oauth/:provider/callback', async (_req, reply) => {
    await reply.status(501).send({ error: 'OAuth not configured' })
  })
}

export default authRoutes
