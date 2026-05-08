import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import { getRedis } from '../config/redis.js'

interface PresenceUser {
  userId: string
  displayName: string
  email: string
  joinedAt: string
}

type WSMessage =
  | { type: 'presence.join'; payload: { campaignId: string } }
  | { type: 'presence.leave'; payload: { campaignId: string } }
  | { type: 'ping' }

const PRESENCE_KEY = (campaignId: string) => `pres:campaign:${campaignId}`
const PRESENCE_TTL = 60 // seconds; clients must ping within this window

// Map of campaignId → Set of WebSocket connections
const roomConnections = new Map<string, Set<WebSocket>>()

function broadcast(campaignId: string, message: unknown, exclude?: WebSocket) {
  const room = roomConnections.get(campaignId)
  if (!room) return
  const payload = JSON.stringify(message)
  for (const ws of room) {
    if (ws !== exclude && ws.readyState === 1 /* OPEN */) {
      ws.send(payload)
    }
  }
}

async function joinRoom(campaignId: string, ws: WebSocket, user: PresenceUser) {
  const redis = getRedis()
  const key = PRESENCE_KEY(campaignId)

  await redis.hset(key, user.userId, JSON.stringify(user))
  await redis.expire(key, PRESENCE_TTL)

  if (!roomConnections.has(campaignId)) roomConnections.set(campaignId, new Set())
  roomConnections.get(campaignId)!.add(ws)

  // Send current presence to the joining user
  const raw = await redis.hgetall(key)
  const users = Object.values(raw).map((v) => JSON.parse(v) as PresenceUser)
  ws.send(JSON.stringify({ type: 'presence.snapshot', payload: { campaignId, users } }))

  // Notify others
  broadcast(campaignId, { type: 'presence.join', payload: { campaignId, user } }, ws)

  // Pub/Sub for multi-instance broadcast
  const pub = getRedis()
  await pub.publish(`pres:${campaignId}`, JSON.stringify({ type: 'presence.join', user }))
}

async function leaveRoom(campaignId: string, ws: WebSocket, userId: string) {
  const redis = getRedis()
  const key = PRESENCE_KEY(campaignId)

  await redis.hdel(key, userId)

  const room = roomConnections.get(campaignId)
  if (room) {
    room.delete(ws)
    if (room.size === 0) roomConnections.delete(campaignId)
  }

  broadcast(campaignId, { type: 'presence.leave', payload: { campaignId, userId } })

  const pub = getRedis()
  await pub.publish(`pres:${campaignId}`, JSON.stringify({ type: 'presence.leave', userId }))
}

export function registerPresenceHandler(fastify: FastifyInstance) {
  fastify.get('/ws/presence', { websocket: true }, (socket, req) => {
    if (!req.user) {
      socket.close(4001, 'Unauthorized')
      return
    }

    const user: PresenceUser = {
      userId: req.user.sub,
      displayName: (req.user as unknown as { displayName?: string }).displayName ?? req.user.email,
      email: req.user.email,
      joinedAt: new Date().toISOString(),
    }

    let currentCampaignId: string | null = null

    // Refresh presence TTL periodically
    const heartbeat = setInterval(() => {
      if (currentCampaignId) {
        void getRedis().expire(PRESENCE_KEY(currentCampaignId), PRESENCE_TTL)
      }
    }, 20_000)

    socket.on('message', (raw) => {
      let msg: WSMessage
      try {
        msg = JSON.parse(raw.toString()) as WSMessage
      } catch {
        return
      }

      if (msg.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }))
        return
      }

      if (msg.type === 'presence.join') {
        const { campaignId } = msg.payload
        if (currentCampaignId && currentCampaignId !== campaignId) {
          void leaveRoom(currentCampaignId, socket, user.userId)
        }
        currentCampaignId = campaignId
        void joinRoom(campaignId, socket, user)
      }

      if (msg.type === 'presence.leave') {
        if (currentCampaignId) {
          void leaveRoom(currentCampaignId, socket, user.userId)
          currentCampaignId = null
        }
      }
    })

    socket.on('close', () => {
      clearInterval(heartbeat)
      if (currentCampaignId) {
        void leaveRoom(currentCampaignId, socket, user.userId)
      }
    })

    socket.on('error', () => {
      clearInterval(heartbeat)
      if (currentCampaignId) {
        void leaveRoom(currentCampaignId, socket, user.userId)
      }
    })
  })
}
