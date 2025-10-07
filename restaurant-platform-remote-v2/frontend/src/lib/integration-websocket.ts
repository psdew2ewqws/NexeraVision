import { io, Socket } from 'socket.io-client'

export interface WebSocketMessage {
  type: 'log' | 'metric' | 'webhook' | 'error'
  data: any
  timestamp: string
}

export class IntegrationWebSocket {
  private socket: Socket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(private url?: string) {}

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

      this.socket = io(wsUrl, {
        path: '/integration/socket.io',
        auth: {
          token: token || localStorage.getItem('token')
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      })

      this.socket.on('connect', () => {
        console.log('Integration WebSocket connected')
        this.reconnectAttempts = 0
        resolve()
      })

      this.socket.on('disconnect', (reason) => {
        console.log('Integration WebSocket disconnected:', reason)
        this.handleDisconnect()
      })

      this.socket.on('error', (error) => {
        console.error('Integration WebSocket error:', error)
        reject(error)
      })

      this.socket.on('connect_error', (error) => {
        console.error('Integration WebSocket connection error:', error)
        this.reconnectAttempts++

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'))
        }
      })

      // Listen for different message types
      this.socket.on('log', (data) => this.emit('log', data))
      this.socket.on('metric', (data) => this.emit('metric', data))
      this.socket.on('webhook', (data) => this.emit('webhook', data))
      this.socket.on('error', (data) => this.emit('error', data))
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback?: (data: any) => void): void {
    if (!callback) {
      this.listeners.delete(event)
      return
    }

    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  private handleDisconnect(): void {
    // Emit disconnect event to all listeners
    this.emit('disconnect', {})
  }

  // Subscribe to specific log streams
  subscribeLogs(filters?: { method?: string; endpoint?: string; status?: string }): void {
    if (this.socket) {
      this.socket.emit('subscribe:logs', filters)
    }
  }

  unsubscribeLogs(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe:logs')
    }
  }

  // Subscribe to metrics updates
  subscribeMetrics(): void {
    if (this.socket) {
      this.socket.emit('subscribe:metrics')
    }
  }

  unsubscribeMetrics(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe:metrics')
    }
  }

  // Subscribe to webhook deliveries
  subscribeWebhooks(webhookId?: string): void {
    if (this.socket) {
      this.socket.emit('subscribe:webhooks', { webhookId })
    }
  }

  unsubscribeWebhooks(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe:webhooks')
    }
  }

  // Subscribe to errors
  subscribeErrors(): void {
    if (this.socket) {
      this.socket.emit('subscribe:errors')
    }
  }

  unsubscribeErrors(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe:errors')
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// Singleton instance
let wsInstance: IntegrationWebSocket | null = null

export const getIntegrationWebSocket = (): IntegrationWebSocket => {
  if (!wsInstance) {
    wsInstance = new IntegrationWebSocket()
  }
  return wsInstance
}

// React Hook for using WebSocket
export const useIntegrationWebSocket = () => {
  const ws = getIntegrationWebSocket()

  return {
    connect: (token?: string) => ws.connect(token),
    disconnect: () => ws.disconnect(),
    on: (event: string, callback: (data: any) => void) => ws.on(event, callback),
    off: (event: string, callback?: (data: any) => void) => ws.off(event, callback),
    subscribeLogs: (filters?: any) => ws.subscribeLogs(filters),
    unsubscribeLogs: () => ws.unsubscribeLogs(),
    subscribeMetrics: () => ws.subscribeMetrics(),
    unsubscribeMetrics: () => ws.unsubscribeMetrics(),
    subscribeWebhooks: (webhookId?: string) => ws.subscribeWebhooks(webhookId),
    unsubscribeWebhooks: () => ws.unsubscribeWebhooks(),
    subscribeErrors: () => ws.subscribeErrors(),
    unsubscribeErrors: () => ws.unsubscribeErrors(),
    isConnected: () => ws.isConnected()
  }
}

export default IntegrationWebSocket
