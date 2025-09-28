import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Types for integration data
interface IntegrationService {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'error' | 'offline'
  uptime: number
  latency: number
  lastCheck: Date
  endpoint: string
  errorMessage?: string
  version?: string
}

interface DeliveryProvider {
  id: string
  name: string
  displayName: string
  status: 'active' | 'inactive' | 'maintenance' | 'error'
  todayOrders: number
  todayRevenue: number
  avgDeliveryTime: number
  successRate: number
  lastOrderTime: Date | null
  webhookStatus: 'healthy' | 'error' | 'disabled'
  errorCount: number
  responseTime: number
  trend: {
    orders: 'up' | 'down' | 'stable'
    revenue: 'up' | 'down' | 'stable'
    deliveryTime: 'up' | 'down' | 'stable'
  }
}

interface IntegrationStatus {
  healthScore: number
  services: IntegrationService[]
  nexaraConnection: {
    status: 'connected' | 'disconnected' | 'connecting'
    port: number
    lastSync: Date
    webhook_status: 'active' | 'inactive'
  }
  restaurantBackend: {
    status: 'connected' | 'disconnected' | 'connecting'
    port: number
    lastSync: Date
  }
}

interface ProviderStats {
  activeCount: number
  totalOrders: number
  totalRevenue: number
  avgResponseTime: number
  providers: DeliveryProvider[]
}

interface UseIntegrationDataReturn {
  integrationStatus: IntegrationStatus | null
  providerStats: ProviderStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  connectToNexara: () => Promise<void>
  disconnectFromNexara: () => Promise<void>
  testWebhooks: () => Promise<boolean>
}

export const useIntegrationData = (): UseIntegrationDataReturn => {
  const { token } = useAuth()
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // API endpoints
  const RESTAURANT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
  const NEXARA_API_URL = process.env.NEXT_PUBLIC_NEXARA_API_URL || 'http://localhost:3002/api'

  // Fetch integration status from Restaurant Platform
  const fetchRestaurantIntegrationStatus = async (): Promise<Partial<IntegrationStatus>> => {
    try {
      const response = await fetch(`${RESTAURANT_API_URL}/integrations/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch restaurant integration status')
      }

      const data = await response.json()
      return {
        restaurantBackend: {
          status: 'connected',
          port: 3001,
          lastSync: new Date()
        },
        services: data.services || []
      }
    } catch (error) {
      console.error('Error fetching restaurant integration status:', error)
      return {
        restaurantBackend: {
          status: 'disconnected',
          port: 3001,
          lastSync: new Date()
        },
        services: []
      }
    }
  }

  // Fetch integration status from NEXARA
  const fetchNexaraIntegrationStatus = async (): Promise<Partial<IntegrationStatus>> => {
    try {
      const response = await fetch(`${NEXARA_API_URL}/health`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to connect to NEXARA')
      }

      const data = await response.json()
      return {
        nexaraConnection: {
          status: 'connected',
          port: 3002,
          lastSync: new Date(),
          webhook_status: data.webhookStatus || 'active'
        }
      }
    } catch (error) {
      console.error('Error fetching NEXARA integration status:', error)
      return {
        nexaraConnection: {
          status: 'disconnected',
          port: 3002,
          lastSync: new Date(),
          webhook_status: 'inactive'
        }
      }
    }
  }

  // Fetch provider statistics
  const fetchProviderStats = async (): Promise<ProviderStats> => {
    try {
      // Try to fetch from both platforms and merge
      const [restaurantProviders, nexaraProviders] = await Promise.allSettled([
        fetch(`${RESTAURANT_API_URL}/delivery/providers/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.ok ? res.json() : { providers: [] }),
        fetch(`${NEXARA_API_URL}/providers/stats`, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => res.ok ? res.json() : { providers: [] })
      ])

      // Merge provider data from both sources
      const allProviders: DeliveryProvider[] = []

      // Add restaurant platform providers
      if (restaurantProviders.status === 'fulfilled') {
        allProviders.push(...(restaurantProviders.value.providers || []))
      }

      // Add NEXARA providers (avoid duplicates)
      if (nexaraProviders.status === 'fulfilled') {
        const nexaraProvidersList = nexaraProviders.value.providers || []
        nexaraProvidersList.forEach((provider: any) => {
          const existingProvider = allProviders.find(p => p.id === provider.id || p.name === provider.name)
          if (!existingProvider) {
            allProviders.push(provider)
          } else {
            // Merge data from NEXARA into existing provider
            Object.assign(existingProvider, {
              ...provider,
              todayOrders: existingProvider.todayOrders + (provider.todayOrders || 0),
              todayRevenue: existingProvider.todayRevenue + (provider.todayRevenue || 0)
            })
          }
        })
      }

      // Calculate aggregate stats
      const activeCount = allProviders.filter(p => p.status === 'active').length
      const totalOrders = allProviders.reduce((sum, p) => sum + p.todayOrders, 0)
      const totalRevenue = allProviders.reduce((sum, p) => sum + p.todayRevenue, 0)
      const avgResponseTime = allProviders.length > 0
        ? allProviders.reduce((sum, p) => sum + p.responseTime, 0) / allProviders.length
        : 0

      return {
        activeCount,
        totalOrders,
        totalRevenue,
        avgResponseTime,
        providers: allProviders
      }
    } catch (error) {
      console.error('Error fetching provider stats:', error)
      // Return mock data for development
      return {
        activeCount: 3,
        totalOrders: 45,
        totalRevenue: 1250.00,
        avgResponseTime: 150,
        providers: [
          {
            id: 'careem',
            name: 'careem',
            displayName: 'Careem Now',
            status: 'active',
            todayOrders: 15,
            todayRevenue: 450.00,
            avgDeliveryTime: 35,
            successRate: 96.5,
            lastOrderTime: new Date(Date.now() - 300000),
            webhookStatus: 'healthy',
            errorCount: 0,
            responseTime: 120,
            trend: { orders: 'up', revenue: 'up', deliveryTime: 'stable' }
          },
          {
            id: 'talabat',
            name: 'talabat',
            displayName: 'Talabat',
            status: 'active',
            todayOrders: 20,
            todayRevenue: 580.00,
            avgDeliveryTime: 32,
            successRate: 98.2,
            lastOrderTime: new Date(Date.now() - 180000),
            webhookStatus: 'healthy',
            errorCount: 1,
            responseTime: 95,
            trend: { orders: 'up', revenue: 'up', deliveryTime: 'down' }
          },
          {
            id: 'deliveroo',
            name: 'deliveroo',
            displayName: 'Deliveroo',
            status: 'maintenance',
            todayOrders: 10,
            todayRevenue: 220.00,
            avgDeliveryTime: 40,
            successRate: 94.1,
            lastOrderTime: new Date(Date.now() - 600000),
            webhookStatus: 'error',
            errorCount: 3,
            responseTime: 250,
            trend: { orders: 'down', revenue: 'down', deliveryTime: 'up' }
          }
        ]
      }
    }
  }

  // Calculate health score
  const calculateHealthScore = (
    restaurantData: Partial<IntegrationStatus>,
    nexaraData: Partial<IntegrationStatus>
  ): number => {
    let score = 0
    let maxScore = 0

    // Restaurant backend connection (30 points)
    maxScore += 30
    if (restaurantData.restaurantBackend?.status === 'connected') {
      score += 30
    } else if (restaurantData.restaurantBackend?.status === 'connecting') {
      score += 15
    }

    // NEXARA connection (30 points)
    maxScore += 30
    if (nexaraData.nexaraConnection?.status === 'connected') {
      score += 30
    } else if (nexaraData.nexaraConnection?.status === 'connecting') {
      score += 15
    }

    // Webhook status (20 points)
    maxScore += 20
    if (nexaraData.nexaraConnection?.webhook_status === 'active') {
      score += 20
    }

    // Services health (20 points)
    maxScore += 20
    const services = restaurantData.services || []
    if (services.length > 0) {
      const healthyServices = services.filter(s => s.status === 'healthy').length
      score += (healthyServices / services.length) * 20
    } else {
      score += 10 // Default if no services
    }

    return Math.round((score / maxScore) * 100)
  }

  // Main fetch function
  const fetchIntegrationData = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      // Fetch data from both platforms
      const [restaurantData, nexaraData, providerData] = await Promise.all([
        fetchRestaurantIntegrationStatus(),
        fetchNexaraIntegrationStatus(),
        fetchProviderStats()
      ])

      // Combine integration status
      const combinedStatus: IntegrationStatus = {
        healthScore: calculateHealthScore(restaurantData, nexaraData),
        services: restaurantData.services || [],
        nexaraConnection: nexaraData.nexaraConnection || {
          status: 'disconnected',
          port: 3002,
          lastSync: new Date(),
          webhook_status: 'inactive'
        },
        restaurantBackend: restaurantData.restaurantBackend || {
          status: 'disconnected',
          port: 3001,
          lastSync: new Date()
        }
      }

      setIntegrationStatus(combinedStatus)
      setProviderStats(providerData)
    } catch (err) {
      console.error('Error fetching integration data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch integration data')
    } finally {
      setLoading(false)
    }
  }, [token])

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const wsUrl = `ws://localhost:3002/ws/integration`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('Integration WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'integration_status_update') {
            setIntegrationStatus(prev => prev ? { ...prev, ...data.payload } : null)
          } else if (data.type === 'provider_stats_update') {
            setProviderStats(prev => prev ? { ...prev, ...data.payload } : null)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        console.log('Integration WebSocket disconnected')
        // Retry connection after 5 seconds
        retryTimeoutRef.current = setTimeout(connectWebSocket, 5000)
      }

      wsRef.current.onerror = (error) => {
        console.error('Integration WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error connecting to integration WebSocket:', error)
    }
  }, [])

  // Connect to NEXARA
  const connectToNexara = useCallback(async () => {
    try {
      const response = await fetch(`${NEXARA_API_URL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantApiUrl: RESTAURANT_API_URL,
          authToken: token
        })
      })

      if (!response.ok) {
        throw new Error('Failed to connect to NEXARA')
      }

      await fetchIntegrationData()
    } catch (error) {
      console.error('Error connecting to NEXARA:', error)
      throw error
    }
  }, [token, fetchIntegrationData])

  // Disconnect from NEXARA
  const disconnectFromNexara = useCallback(async () => {
    try {
      await fetch(`${NEXARA_API_URL}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await fetchIntegrationData()
    } catch (error) {
      console.error('Error disconnecting from NEXARA:', error)
      throw error
    }
  }, [fetchIntegrationData])

  // Test webhook connectivity
  const testWebhooks = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${NEXARA_API_URL}/webhooks/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('Error testing webhooks:', error)
      return false
    }
  }, [])

  // Initialize data fetching
  useEffect(() => {
    if (token) {
      fetchIntegrationData()
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [token, fetchIntegrationData, connectWebSocket])

  return {
    integrationStatus,
    providerStats,
    loading,
    error,
    refetch: fetchIntegrationData,
    connectToNexara,
    disconnectFromNexara,
    testWebhooks
  }
}