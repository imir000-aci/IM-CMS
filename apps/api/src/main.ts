import { buildApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { connectRedis, disconnectRedis } from './config/redis.js'
import { startRenditionWorker } from './workers/rendition.worker.js'
import { startPublishWorker } from './workers/publish.worker.js'

async function start() {
  const app = await buildApp()

  try {
    await connectDatabase()
    app.log.info('Database connected')

    await connectRedis()
    app.log.info('Redis connected')

    const renditionWorker = startRenditionWorker()
    const publishWorker = startPublishWorker()
    app.log.info('BullMQ workers started (rendition, publish)')

    await app.listen({ port: env.API_PORT, host: env.API_HOST })
    app.log.info(`API server listening on ${env.API_HOST}:${env.API_PORT}`)

    const shutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down gracefully`)
      await Promise.all([renditionWorker.close(), publishWorker.close()])
      await app.close()
      await disconnectDatabase()
      await disconnectRedis()
      process.exit(0)
    }

    process.on('SIGTERM', () => void shutdown('SIGTERM'))
    process.on('SIGINT', () => void shutdown('SIGINT'))
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void start()
