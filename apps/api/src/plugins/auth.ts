import fp from 'fastify-plugin'
import jwtPlugin from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import type { JWTPayload } from '../types/fastify.js'
import { env } from '../config/env.js'

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwtPlugin, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  })

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify<JWTPayload>()
      } catch {
        await reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
      }
    },
  )
}

export default fp(authPlugin, { name: 'auth' })
