import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Types for dashboard metrics
interface RevenueDataPoint {
  time: string
  revenue: number
  orders: number
  hour?: number
  date?: string
}

interface OrderMetrics {
  todayOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  avgOrderValue: number
  ordersByHour: RevenueDataPoint[]
}

interface RevenueMetrics {
  todayRevenue: number
  yesterdayRevenue: number
  weekRevenue: number
  monthRevenue: number
  revenueTrend: string
  avgOrderTrend: string
  revenueByHour: RevenueDataPoint[]
}

interface PerformanceMetrics {
  avgPreparationTime: number
  avgDeliveryTime: number
  customerSatisfaction: number
  kitchenEfficiency: number
  peakHours: string[]
}

interface DashboardMetrics {
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  avgOrderValue: number
  revenueTrend: string
  avgOrderTrend: string
  revenueChart: RevenueDataPoint[]
  orderMetrics: OrderMetrics
  revenueMetrics: RevenueMetrics
  performanceMetrics: PerformanceMetrics
  lastUpdated: Date
}

interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  refreshInterval: number
  setRefreshInterval: (interval: number) => void
}

export const useDashboardMetrics = (): UseDashboardMetricsReturn => {
  const { token, user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds default
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // API endpoints
  const RESTAURANT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  // Fetch orders data
  const fetchOrdersData = async (): Promise<OrderMetrics> => {
    try {
      const response = await fetch(`${RESTAURANT_API_URL}/analytics/orders/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch orders data')
      }

      const data = await response.json()
      return {
        todayOrders: data.totalOrders || 0,
        pendingOrders: data.pendingOrders || 0,
        completedOrders: data.completedOrders || 0,
        cancelledOrders: data.cancelledOrders || 0,
        avgOrderValue: data.avgOrderValue || 0,
        ordersByHour: data.ordersByHour || []
      }
    } catch (error) {
      console.error('Error fetching orders data:', error)
      // Return mock data for development
      return {
        todayOrders: 147,
        pendingOrders: 12,
        completedOrders: 132,
        cancelledOrders: 3,
        avgOrderValue: 167.23,
        ordersByHour: generateMockHourlyData('orders')
      }
    }
  }

  // Fetch revenue data
  const fetchRevenueData = async (): Promise<RevenueMetrics> => {
    try {
      const response = await fetch(`${RESTAURANT_API_URL}/analytics/revenue/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch revenue data')
      }

      const data = await response.json()
      return {
        todayRevenue: data.todayRevenue || 0,
        yesterdayRevenue: data.yesterdayRevenue || 0,
        weekRevenue: data.weekRevenue || 0,
        monthRevenue: data.monthRevenue || 0,
        revenueTrend: data.revenueTrend || '+0%',
        avgOrderTrend: data.avgOrderTrend || '+0%',
        revenueByHour: data.revenueByHour || []
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      // Return mock data for development
      return {
        todayRevenue: 24567.89,
        yesterdayRevenue: 22456.32,
        weekRevenue: 156789.45,
        monthRevenue: 678901.23,
        revenueTrend: '+8.5%',
        avgOrderTrend: '+3.2%',
        revenueByHour: generateMockHourlyData('revenue')
      }
    }
  }

  // Fetch performance data
  const fetchPerformanceData = async (): Promise<PerformanceMetrics> => {
    try {
      const response = await fetch(`${RESTAURANT_API_URL}/analytics/performance/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch performance data')
      }

      const data = await response.json()
      return {
        avgPreparationTime: data.avgPreparationTime || 0,
        avgDeliveryTime: data.avgDeliveryTime || 0,
        customerSatisfaction: data.customerSatisfaction || 0,
        kitchenEfficiency: data.kitchenEfficiency || 0,
        peakHours: data.peakHours || []
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      // Return mock data for development
      return {
        avgPreparationTime: 18.5,
        avgDeliveryTime: 35.2,
        customerSatisfaction: 4.3,
        kitchenEfficiency: 89.2,
        peakHours: ['12:00-13:00', '19:00-21:00']
      }
    }
  }

  // Generate mock hourly data for development
  const generateMockHourlyData = (type: 'orders' | 'revenue'): RevenueDataPoint[] => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    return hours.map(hour => {
      const time = `${hour.toString().padStart(2, '0')}:00`
      let orders = 0
      let revenue = 0

      // Simulate realistic restaurant patterns
      if (hour >= 6 && hour <= 10) {
        // Breakfast
        orders = Math.floor(Math.random() * 8) + 2
        revenue = orders * (Math.random() * 15 + 8)
      } else if (hour >= 11 && hour <= 14) {
        // Lunch peak
        orders = Math.floor(Math.random() * 15) + 8
        revenue = orders * (Math.random() * 25 + 15)
      } else if (hour >= 17 && hour <= 21) {
        // Dinner peak
        orders = Math.floor(Math.random() * 20) + 10
        revenue = orders * (Math.random() * 30 + 20)
      } else if (hour >= 22 || hour <= 5) {
        // Late night/early morning
        orders = Math.floor(Math.random() * 3)
        revenue = orders * (Math.random() * 20 + 10)
      } else {
        // Off-peak
        orders = Math.floor(Math.random() * 5) + 1
        revenue = orders * (Math.random() * 20 + 10)
      }

      return {
        time,
        revenue: Math.round(revenue * 100) / 100,
        orders,
        hour
      }
    })
  }

  // Calculate combined metrics
  const calculateCombinedMetrics = (
    orderData: OrderMetrics,
    revenueData: RevenueMetrics,
    performanceData: PerformanceMetrics
  ): DashboardMetrics => {
    // Combine revenue and orders data for chart
    const revenueChart = revenueData.revenueByHour.length > 0
      ? revenueData.revenueByHour
      : orderData.ordersByHour.map(point => ({
          ...point,
          revenue: point.orders * orderData.avgOrderValue
        }))

    return {
      todayRevenue: revenueData.todayRevenue,
      todayOrders: orderData.todayOrders,
      pendingOrders: orderData.pendingOrders,
      avgOrderValue: orderData.avgOrderValue,
      revenueTrend: revenueData.revenueTrend,
      avgOrderTrend: revenueData.avgOrderTrend,
      revenueChart,
      orderMetrics: orderData,
      revenueMetrics: revenueData,
      performanceMetrics: performanceData,
      lastUpdated: new Date()
    }
  }

  // Main fetch function
  const fetchDashboardMetrics = useCallback(async () => {
    if (!token || !user) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all metrics in parallel
      const [orderData, revenueData, performanceData] = await Promise.all([
        fetchOrdersData(),
        fetchRevenueData(),
        fetchPerformanceData()
      ])

      // Combine all metrics
      const combinedMetrics = calculateCombinedMetrics(
        orderData,
        revenueData,
        performanceData
      )

      setMetrics(combinedMetrics)
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard metrics')

      // Fallback to mock data in case of error
      const mockMetrics = calculateCombinedMetrics(
        {
          todayOrders: 147,
          pendingOrders: 12,
          completedOrders: 132,
          cancelledOrders: 3,
          avgOrderValue: 167.23,
          ordersByHour: generateMockHourlyData('orders')
        },
        {
          todayRevenue: 24567.89,
          yesterdayRevenue: 22456.32,
          weekRevenue: 156789.45,
          monthRevenue: 678901.23,
          revenueTrend: '+8.5%',
          avgOrderTrend: '+3.2%',
          revenueByHour: generateMockHourlyData('revenue')
        },
        {
          avgPreparationTime: 18.5,
          avgDeliveryTime: 35.2,
          customerSatisfaction: 4.3,
          kitchenEfficiency: 89.2,
          peakHours: ['12:00-13:00', '19:00-21:00']
        }
      )

      setMetrics(mockMetrics)
    } finally {
      setLoading(false)
    }
  }, [token, user])

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const wsUrl = `ws://localhost:3001/ws/dashboard?token=${token}`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('Dashboard metrics WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'metrics_update') {
            setMetrics(prev => prev ? { ...prev, ...data.payload, lastUpdated: new Date() } : null)
          } else if (data.type === 'order_update') {
            // Update specific order metrics
            setMetrics(prev => {
              if (!prev) return null
              return {
                ...prev,
                todayOrders: data.payload.todayOrders || prev.todayOrders,
                pendingOrders: data.payload.pendingOrders || prev.pendingOrders,
                lastUpdated: new Date()
              }
            })
          } else if (data.type === 'revenue_update') {
            // Update specific revenue metrics
            setMetrics(prev => {
              if (!prev) return null
              return {
                ...prev,
                todayRevenue: data.payload.todayRevenue || prev.todayRevenue,
                avgOrderValue: data.payload.avgOrderValue || prev.avgOrderValue,
                lastUpdated: new Date()
              }
            })
          }
        } catch (error) {
          console.error('Error parsing dashboard WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        console.log('Dashboard metrics WebSocket disconnected')
        // Retry connection after 5 seconds
        setTimeout(connectWebSocket, 5000)
      }

      wsRef.current.onerror = (error) => {
        console.error('Dashboard metrics WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error connecting to dashboard WebSocket:', error)
    }
  }, [token])

  // Set up auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchDashboardMetrics, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refreshInterval, fetchDashboardMetrics])

  // Initialize data fetching
  useEffect(() => {
    if (token && user) {
      fetchDashboardMetrics()
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [token, user, fetchDashboardMetrics, connectWebSocket])

  return {
    metrics,
    loading,
    error,
    refetch: fetchDashboardMetrics,
    refreshInterval,
    setRefreshInterval
  }
}