import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/env.js'
import authPlugin from './plugins/auth.js'
import rbacPlugin from './plugins/rbac.js'
import auditPlugin from './plugins/audit.js'
import multipartPlugin from './plugins/multipart.js'
import websocketPlugin from './plugins/websocket.js'
import { AppError } from './shared/errors.js'
import authRoutes from './modules/auth/auth.routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        allErrors: true,
      },
    },
  })

  // Security & cross-cutting plugins
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    redis: undefined, // set Redis instance here in production for distributed limiting
  })
  await app.register(multipartPlugin)
  await app.register(websocketPlugin)

  // Custom plugins (order matters: auth before rbac before audit)
  await app.register(authPlugin)
  await app.register(rbacPlugin)
  await app.register(auditPlugin)

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.details !== undefined ? { details: error.details } : {}),
      })
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: 'Request validation failed',
        statusCode: 400,
        details: error.validation,
      })
    }

    app.log.error(error)
    return reply.status(500).send({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
    })
  })

  // Health check (no auth required)
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // API routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' })

  // Placeholder registrations for modules built in subsequent sprints
  // Each sprint adds the corresponding import and registration here:
  // await app.register(userRoutes, { prefix: '/api/v1/users' })
  // await app.register(componentRoutes, { prefix: '/api/v1/components' })
  // await app.register(componentInstanceRoutes, { prefix: '/api/v1/component-instances' })
  // await app.register(componentPoolRoutes, { prefix: '/api/v1/component-pools' })
  // await app.register(contentRoutes, { prefix: '/api/v1/content' })
  // await app.register(contentPoolRoutes, { prefix: '/api/v1/content-pools' })
  // await app.register(channelRoutes, { prefix: '/api/v1/channels' })
  // await app.register(pageRoutes, { prefix: '/api/v1/pages' })
  // await app.register(assetRoutes, { prefix: '/api/v1/assets' })
  // await app.register(targetingRoutes, { prefix: '/api/v1/targeting-rules' })
  // await app.register(experienceRoutes, { prefix: '/api/v1/experiences' })
  // await app.register(pageConfigRoutes, { prefix: '/api/v1/page-configurations' })
  // await app.register(campaignRoutes, { prefix: '/api/v1/campaigns' })
  // await app.register(localeRoutes, { prefix: '/api/v1/locales' })
  // await app.register(seoRoutes, { prefix: '/api/v1/seo' })

  return app
}
