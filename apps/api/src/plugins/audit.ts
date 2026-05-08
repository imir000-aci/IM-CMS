import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../config/database.js'

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const RESOURCE_PATTERNS: Array<{ pattern: RegExp; resourceType: string }> = [
  { pattern: /\/api\/v1\/campaigns\/([^/]+)/, resourceType: 'campaign' },
  { pattern: /\/api\/v1\/components\/([^/]+)/, resourceType: 'master_component' },
  { pattern: /\/api\/v1\/component-instances\/([^/]+)/, resourceType: 'component_instance' },
  { pattern: /\/api\/v1\/content\/([^/]+)/, resourceType: 'content_object' },
  { pattern: /\/api\/v1\/experiences\/([^/]+)/, resourceType: 'experience' },
  { pattern: /\/api\/v1\/pages\/([^/]+)/, resourceType: 'page' },
  { pattern: /\/api\/v1\/assets\/([^/]+)/, resourceType: 'asset' },
  { pattern: /\/api\/v1\/users\/([^/]+)/, resourceType: 'user' },
]

function resolveResource(url: string): { resourceType: string; resourceId: string } | null {
  for (const { pattern, resourceType } of RESOURCE_PATTERNS) {
    const match = pattern.exec(url)
    if (match?.[1]) {
      return { resourceType, resourceId: match[1] }
    }
  }
  return null
}

function resolveAction(method: string, url: string): string {
  if (method === 'POST' && url.includes('/approve')) return 'approve'
  if (method === 'POST' && url.includes('/reject')) return 'reject'
  if (method === 'POST' && url.includes('/publish')) return 'publish'
  if (method === 'POST' && url.includes('/archive')) return 'archive'
  if (method === 'POST' && url.includes('/clone')) return 'clone'
  if (method === 'DELETE') return 'delete'
  if (method === 'PUT' || method === 'PATCH') return 'update'
  if (method === 'POST') return 'create'
  return method.toLowerCase()
}

const auditPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onResponse', async (request, reply) => {
    if (!AUDITED_METHODS.has(request.method)) return
    if (reply.statusCode >= 400) return

    const resource = resolveResource(request.url)
    if (!resource) return

    const user = request.user
    if (!user) return

    const action = `${resource.resourceType}.${resolveAction(request.method, request.url)}`

    try {
      await prisma.auditLog.create({
        data: {
          organizationId: user.org,
          userId: user.sub,
          action,
          resourceType: resource.resourceType,
          resourceId: resource.resourceId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      })
    } catch {
      // Audit failures must never break the request
    }
  })
}

export default fp(auditPlugin, { name: 'audit' })
