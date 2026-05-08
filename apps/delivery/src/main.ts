import { buildDeliveryApp } from './app.js'
import { env } from './config/env.js'
import { connectDeliveryRedis, disconnectDeliveryRedis } from './services/cache.service.js'
import { disconnectPrisma } from './services/resolver.service.js'

async function start() {
  const app = await buildDeliveryApp()

  try {
    await connectDeliveryRedis()
    app.log.info('Redis connected')

    await app.listen({ port: env.DELIVERY_PORT, host: env.DELIVERY_HOST })
    app.log.info(`Delivery API listening on ${env.DELIVERY_HOST}:${env.DELIVERY_PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`)
    await app.close()
    await disconnectDeliveryRedis()
    await disconnectPrisma()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

void start()
