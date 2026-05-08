import { useAuthStore } from './auth-store'

type WSMessage = {
  type: string
  payload: unknown
}

type MessageHandler = (payload: unknown) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private url: string | null = null

  connect(campaignId: string): void {
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const wsUrl = `ws://${window.location.host}/api/v1/ws/campaigns/${campaignId}?token=${token}`
    this.url = wsUrl

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMessage
        const typeHandlers = this.handlers.get(msg.type)
        typeHandlers?.forEach((h) => h(msg.payload))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect(): void {
    if (!this.url) return
    setTimeout(() => {
      if (this.url) {
        const ws = new WebSocket(this.url)
        this.ws = ws
      }
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  disconnect(): void {
    this.url = null
    this.ws?.close()
    this.ws = null
  }
}

export const wsClient = new WebSocketClient()
