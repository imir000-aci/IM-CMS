import Redis from 'ioredis'
import { env } from './env.js'

let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    })

    redisClient.on('error', (err) => {
      console.error('Redis error:', err)
    })
  }
  return redisClient
}

export async function connectRedis(): Promise<void> {
  await getRedis().connect()
}

export async function disconnectRedis(): Promise<void> {
  await getRedis().quit()
  redisClient = null
}
