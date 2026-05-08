import { LRUCache } from 'lru-cache'
import Redis from 'ioredis'
import { env } from '../config/env.js'

// L1: in-process LRU for the hottest pages
const lruCache = new LRUCache<string, string>({
  max: env.DELIVERY_LRU_MAX_ENTRIES,
  ttl: env.DELIVERY_LRU_TTL_SECONDS * 1000,
})

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })
  }
  return redis
}

export async function getCached<T>(key: string): Promise<T | null> {
  // L1 check
  const l1 = lruCache.get(key)
  if (l1 !== undefined) {
    return JSON.parse(l1) as T
  }

  // L2 check
  try {
    const l2 = await getRedis().get(key)
    if (l2 !== null) {
      lruCache.set(key, l2)
      return JSON.parse(l2) as T
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  return null
}

export async function setCached(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value)
  lruCache.set(key, serialized)
  try {
    const ttl = ttlSeconds ?? env.DELIVERY_CACHE_TTL_SECONDS
    await getRedis().setex(key, ttl, serialized)
  } catch {
    // Redis unavailable — L1 still works
  }
}

export async function invalidateCached(pattern: string): Promise<void> {
  lruCache.clear()
  try {
    const keys = await getRedis().keys(pattern)
    if (keys.length > 0) {
      await getRedis().del(...keys)
    }
  } catch {
    // Redis unavailable
  }
}

export async function connectDeliveryRedis(): Promise<void> {
  await getRedis().connect()
}

export async function disconnectDeliveryRedis(): Promise<void> {
  await redis?.quit()
  redis = null
}
