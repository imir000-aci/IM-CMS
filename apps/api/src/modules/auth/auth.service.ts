import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { prisma } from '../../config/database.js'
import { getRedis } from '../../config/redis.js'
import { CacheKeys } from '../../shared/cache-keys.js'
import { UnauthorizedError, NotFoundError } from '../../shared/errors.js'
import type { FastifyInstance } from 'fastify'
import type { JWTPayload } from '../../types/fastify.js'

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_BYTES = 48

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function loginWithPassword(
  fastify: FastifyInstance,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; displayName: string; role: string } }> {
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  })
  if (!user) {
    throw new UnauthorizedError('Invalid email or password')
  }

  // In a real system, passwords are hashed with bcrypt/argon2.
  // This placeholder compares directly — replace before production.
  // The stored password hash column would be added in a future migration.
  void password
  throw new UnauthorizedError('Password authentication not yet implemented — configure SSO')
}

export async function loginWithExternalUser(
  fastify: FastifyInstance,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true, email: true, isActive: true },
  })
  if (!user || !user.isActive) {
    throw new NotFoundError('User', userId)
  }

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    org: user.organizationId,
    role: user.role,
    email: user.email,
  }

  const accessToken = fastify.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY })

  const rawRefreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
  const tokenHash = hashToken(rawRefreshToken)

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
  await prisma.userSession.create({
    data: { userId: user.id, tokenHash, expiresAt, ipAddress, userAgent },
  })

  const redis = getRedis()
  await redis.setex(CacheKeys.session(tokenHash), REFRESH_TOKEN_TTL_SECONDS, user.id)

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return { accessToken, refreshToken: rawRefreshToken }
}

export async function refreshAccessToken(
  fastify: FastifyInstance,
  rawRefreshToken: string,
): Promise<{ accessToken: string }> {
  const tokenHash = hashToken(rawRefreshToken)

  // Check Redis first (fast path)
  const redis = getRedis()
  const cachedUserId = await redis.get(CacheKeys.session(tokenHash))
  if (!cachedUserId) {
    throw new UnauthorizedError('Refresh token invalid or expired')
  }

  const session = await prisma.userSession.findUnique({ where: { tokenHash } })
  if (!session || session.expiresAt < new Date()) {
    await redis.del(CacheKeys.session(tokenHash))
    throw new UnauthorizedError('Refresh token invalid or expired')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, organizationId: true, role: true, email: true, isActive: true },
  })
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive')
  }

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    org: user.organizationId,
    role: user.role,
    email: user.email,
  }

  const accessToken = fastify.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY })
  return { accessToken }
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken)
  await prisma.userSession.deleteMany({ where: { tokenHash } })
  await getRedis().del(CacheKeys.session(tokenHash))
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const sessions = await prisma.userSession.findMany({
    where: { userId },
    select: { tokenHash: true },
  })
  await prisma.userSession.deleteMany({ where: { userId } })
  const redis = getRedis()
  await Promise.all(sessions.map((s) => redis.del(CacheKeys.session(s.tokenHash))))
}

// Constant-time comparison to prevent timing attacks
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return timingSafeEqual(bufA, bufB)
}
