import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/env.js'
import { resolvePage } from './services/resolver.service.js'
import type { VisitorContext } from '@im-cms/shared-types'

export async function buildDeliveryApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
  })

  await app.register(cors, { origin: true })
  await app.register(helmet)
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // GET /v1/delivery/pages/:channelSlug/:pageSlug
  app.get<{
    Params: { channelSlug: string; pageSlug: string }
    Querystring: { locale?: string; preview?: string }
    Headers: { 'x-visitor-context'?: string }
  }>(
    '/v1/delivery/pages/:channelSlug/:pageSlug',
    async (request, reply) => {
      const { channelSlug, pageSlug } = request.params
      const locale = request.query.locale ?? 'en'
      const bypassCache = request.query.preview === 'true'

      // Visitor context can be passed as a JSON header from edge/CDN
      let ctx: VisitorContext = {}
      const ctxHeader = request.headers['x-visitor-context']
      if (ctxHeader) {
        try {
          ctx = JSON.parse(Buffer.from(ctxHeader, 'base64').toString()) as VisitorContext
        } catch {
          // ignore malformed context
        }
      }

      const page = await resolvePage(channelSlug, pageSlug, ctx, locale, bypassCache)
      if (!page) {
        return reply.status(404).send({ error: 'Page not found' })
      }

      reply.header('X-Cache-Status', bypassCache ? 'BYPASS' : 'HIT')
      return reply.send({ data: page })
    },
  )

  // GET /v1/delivery/pages/:channelSlug/:pageSlug/slots/:slotId
  app.get<{
    Params: { channelSlug: string; pageSlug: string; slotId: string }
    Querystring: { locale?: string }
    Headers: { 'x-visitor-context'?: string }
  }>(
    '/v1/delivery/pages/:channelSlug/:pageSlug/slots/:slotId',
    async (request, reply) => {
      const { channelSlug, pageSlug, slotId } = request.params
      const locale = request.query.locale ?? 'en'

      let ctx: VisitorContext = {}
      const ctxHeader = request.headers['x-visitor-context']
      if (ctxHeader) {
        try {
          ctx = JSON.parse(Buffer.from(ctxHeader, 'base64').toString()) as VisitorContext
        } catch {
          // ignore malformed context
        }
      }

      const page = await resolvePage(channelSlug, pageSlug, ctx, locale)
      if (!page) {
        return reply.status(404).send({ error: 'Page not found' })
      }

      const slot = page.slots.find((s) => s.slotId === slotId)
      if (!slot) {
        return reply.status(404).send({ error: 'Slot not found or has no active content' })
      }

      return reply.send({ data: slot })
    },
  )

  return app
}
