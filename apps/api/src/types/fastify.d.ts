import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Role } from '@prisma/client'
import type { Permission } from '@im-cms/shared-types'

export interface JWTPayload {
  sub: string
  org: string
  role: Role
  email: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requirePermission: (permission: Permission) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    user: JWTPayload
  }
}
