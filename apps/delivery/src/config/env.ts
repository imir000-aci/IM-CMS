import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DELIVERY_PORT: z.coerce.number().default(3001),
  DELIVERY_HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  DELIVERY_CACHE_TTL_SECONDS: z.coerce.number().default(30),
  DELIVERY_LRU_MAX_ENTRIES: z.coerce.number().default(1000),
  DELIVERY_LRU_TTL_SECONDS: z.coerce.number().default(5),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
