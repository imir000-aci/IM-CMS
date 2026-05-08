import { buildApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { connectRedis, disconnectRedis } from './config/redis.js'

async function start() {
  const app = await buildApp()

  try {
    await connectDatabase()
    app.log.info('Database connected')

    await connectRedis()
    app.log.info('Redis connected')

    await app.listen({ port: env.API_PORT, host: env.API_HOST })
    app.log.info(`API server listening on ${env.API_HOST}:${env.API_PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`)
    await app.close()
    await disconnectDatabase()
    await disconnectRedis()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

void start()
