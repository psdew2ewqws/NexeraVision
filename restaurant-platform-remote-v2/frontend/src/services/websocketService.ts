import { useCallback, useRef, useEffect } from 'react'

// WebSocket message types
type MessageType =
  | 'order_update'
  | 'metrics_update'
  | 'integration_update'
  | 'provider_update'
  | 'system_alert'
  | 'connection_status'

interface WebSocketMessage {
  type: MessageType
  payload: any
  timestamp: number
  source: 'restaurant' | 'nexara'
}

interface WebSocketConnection {
  url: string
  socket: WebSocket | null
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectInterval: number
  isConnecting: boolean
  lastPing: number
}

interface WebSocketServiceOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnectionChange?: (connected: boolean, source: 'restaurant' | 'nexara') => void
  onError?: (error: Error, source: 'restaurant' | 'nexara') => void
  maxReconnectAttempts?: number
  reconnectInterval?: number
  pingInterval?: number
}

class WebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map()
  private options: WebSocketServiceOptions
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map()
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(options: WebSocketServiceOptions = {}) {
    this.options = {
      maxReconnectAttempts: 10,
      reconnectInterval: 5000,
      pingInterval: 30000,
      ...options
    }
  }

  // Connect to Restaurant Platform WebSocket
  connectToRestaurant(token: string): void {
    const url = `ws://localhost:3001/ws/dashboard?token=${token}`
    this.createConnection('restaurant', url)
  }

  // Connect to NEXARA Platform WebSocket
  connectToNexara(): void {
    const url = `ws://localhost:3002/ws/integration`
    this.createConnection('nexara', url)
  }

  // Create and manage WebSocket connection
  private createConnection(source: string, url: string): void {
    // Close existing connection if it exists
    this.disconnect(source)

    const connection: WebSocketConnection = {
      url,
      socket: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.options.maxReconnectAttempts || 10,
      reconnectInterval: this.options.reconnectInterval || 5000,
      isConnecting: false,
      lastPing: Date.now()
    }

    this.connections.set(source, connection)
    this.connect(source)
  }

  // Establish WebSocket connection
  private connect(source: string): void {
    const connection = this.connections.get(source)
    if (!connection || connection.isConnecting) return

    connection.isConnecting = true

    try {
      console.log(`[WebSocket] Connecting to ${source}: ${connection.url}`)

      const socket = new WebSocket(connection.url)
      connection.socket = socket

      socket.onopen = () => {
        console.log(`[WebSocket] Connected to ${source}`)
        connection.isConnecting = false
        connection.reconnectAttempts = 0

        // Start ping interval
        this.startPingInterval(source)

        // Notify connection change
        this.options.onConnectionChange?.(true, source as 'restaurant' | 'nexara')

        // Send initial subscription message
        this.sendSubscriptionMessage(source)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle ping/pong
          if (data.type === 'ping') {
            this.sendMessage(source, { type: 'pong', timestamp: Date.now() })
            return
          }

          if (data.type === 'pong') {
            connection.lastPing = Date.now()
            return
          }

          // Process regular messages
          const message: WebSocketMessage = {
            type: data.type,
            payload: data.payload || data,
            timestamp: data.timestamp || Date.now(),
            source: source as 'restaurant' | 'nexara'
          }

          this.options.onMessage?.(message)
        } catch (error) {
          console.error(`[WebSocket] Error parsing message from ${source}:`, error)
        }
      }

      socket.onclose = (event) => {
        console.log(`[WebSocket] Disconnected from ${source}:`, event.code, event.reason)
        connection.isConnecting = false
        connection.socket = null

        // Stop ping interval
        this.stopPingInterval(source)

        // Notify connection change
        this.options.onConnectionChange?.(false, source as 'restaurant' | 'nexara')

        // Attempt reconnection if not intentional
        if (event.code !== 1000 && connection.reconnectAttempts < connection.maxReconnectAttempts) {
          this.scheduleReconnect(source)
        }
      }

      socket.onerror = (error) => {
        console.error(`[WebSocket] Error from ${source}:`, error)
        connection.isConnecting = false

        const wsError = new Error(`WebSocket error from ${source}`)
        this.options.onError?.(wsError, source as 'restaurant' | 'nexara')
      }

    } catch (error) {
      console.error(`[WebSocket] Failed to create connection to ${source}:`, error)
      connection.isConnecting = false

      const wsError = error instanceof Error ? error : new Error(`Failed to connect to ${source}`)
      this.options.onError?.(wsError, source as 'restaurant' | 'nexara')
    }
  }

  // Send subscription message to establish what updates we want
  private sendSubscriptionMessage(source: string): void {
    const subscriptions = {
      restaurant: {
        type: 'subscribe',
        topics: ['orders', 'metrics', 'alerts', 'system_status']
      },
      nexara: {
        type: 'subscribe',
        topics: ['integration_status', 'provider_stats', 'webhooks', 'connections']
      }
    }

    const subscription = subscriptions[source as keyof typeof subscriptions]
    if (subscription) {
      this.sendMessage(source, subscription)
    }
  }

  // Send message to specific source
  sendMessage(source: string, message: any): boolean {
    const connection = this.connections.get(source)

    if (!connection?.socket || connection.socket.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocket] Cannot send message to ${source}: not connected`)
      return false
    }

    try {
      connection.socket.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error(`[WebSocket] Error sending message to ${source}:`, error)
      return false
    }
  }

  // Start ping interval to keep connection alive
  private startPingInterval(source: string): void {
    this.stopPingInterval(source)

    const interval = setInterval(() => {
      const connection = this.connections.get(source)
      if (!connection?.socket || connection.socket.readyState !== WebSocket.OPEN) {
        this.stopPingInterval(source)
        return
      }

      // Send ping
      this.sendMessage(source, { type: 'ping', timestamp: Date.now() })

      // Check if last pong was too long ago
      const timeSinceLastPong = Date.now() - connection.lastPing
      if (timeSinceLastPong > (this.options.pingInterval || 30000) * 2) {
        console.warn(`[WebSocket] No pong received from ${source}, reconnecting...`)
        this.connect(source)
      }
    }, this.options.pingInterval || 30000)

    this.pingIntervals.set(source, interval)
  }

  // Stop ping interval
  private stopPingInterval(source: string): void {
    const interval = this.pingIntervals.get(source)
    if (interval) {
      clearInterval(interval)
      this.pingIntervals.delete(source)
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect(source: string): void {
    const connection = this.connections.get(source)
    if (!connection) return

    // Clear existing timeout
    const existingTimeout = this.reconnectTimeouts.get(source)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    connection.reconnectAttempts++
    const delay = Math.min(
      connection.reconnectInterval * Math.pow(2, connection.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    console.log(`[WebSocket] Scheduling reconnect to ${source} in ${delay}ms (attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`)

    const timeout = setTimeout(() => {
      this.connect(source)
    }, delay)

    this.reconnectTimeouts.set(source, timeout)
  }

  // Disconnect from specific source
  disconnect(source: string): void {
    const connection = this.connections.get(source)
    if (!connection) return

    // Clear timeouts
    const reconnectTimeout = this.reconnectTimeouts.get(source)
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      this.reconnectTimeouts.delete(source)
    }

    // Stop ping interval
    this.stopPingInterval(source)

    // Close socket
    if (connection.socket) {
      connection.socket.close(1000, 'Intentional disconnect')
      connection.socket = null
    }

    this.connections.delete(source)
  }

  // Disconnect from all sources
  disconnectAll(): void {
    for (const source of this.connections.keys()) {
      this.disconnect(source)
    }
  }

  // Get connection status
  getConnectionStatus(source: string): boolean {
    const connection = this.connections.get(source)
    return connection?.socket?.readyState === WebSocket.OPEN || false
  }

  // Get all connection statuses
  getAllConnectionStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {}
    for (const [source] of this.connections) {
      statuses[source] = this.getConnectionStatus(source)
    }
    return statuses
  }

  // Force reconnect to specific source
  reconnect(source: string): void {
    const connection = this.connections.get(source)
    if (connection) {
      connection.reconnectAttempts = 0
      this.connect(source)
    }
  }

  // Force reconnect to all sources
  reconnectAll(): void {
    for (const source of this.connections.keys()) {
      this.reconnect(source)
    }
  }
}

// React hook to use WebSocket service
export const useWebSocketService = (options: WebSocketServiceOptions = {}) => {
  const serviceRef = useRef<WebSocketService | null>(null)

  // Initialize service
  useEffect(() => {
    serviceRef.current = new WebSocketService(options)

    return () => {
      serviceRef.current?.disconnectAll()
    }
  }, [])

  // Connect to restaurant platform
  const connectToRestaurant = useCallback((token: string) => {
    serviceRef.current?.connectToRestaurant(token)
  }, [])

  // Connect to NEXARA platform
  const connectToNexara = useCallback(() => {
    serviceRef.current?.connectToNexara()
  }, [])

  // Send message
  const sendMessage = useCallback((source: string, message: any) => {
    return serviceRef.current?.sendMessage(source, message) || false
  }, [])

  // Disconnect
  const disconnect = useCallback((source: string) => {
    serviceRef.current?.disconnect(source)
  }, [])

  // Get connection status
  const getConnectionStatus = useCallback((source: string) => {
    return serviceRef.current?.getConnectionStatus(source) || false
  }, [])

  // Reconnect
  const reconnect = useCallback((source: string) => {
    serviceRef.current?.reconnect(source)
  }, [])

  return {
    connectToRestaurant,
    connectToNexara,
    sendMessage,
    disconnect,
    getConnectionStatus,
    reconnect,
    service: serviceRef.current
  }
}

export default WebSocketService