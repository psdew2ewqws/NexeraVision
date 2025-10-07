import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { buildApiUrl } from '../config/api.config'

// Types for dashboard data matching backend response
export interface DashboardOverview {
  totalOrders: number
  totalRevenue: number
  activeProducts: number
  activeBranches: number
  averageOrderValue: number
}

export interface RecentOrder {
  id: string
  orderNumber: string
  customer: {
    name: string
    phone?: string
  }
  total: number
  status: string
  branch: string
  timestamp: Date
}

export interface DashboardData {
  overview: DashboardOverview
  recentOrders: RecentOrder[]
  topProducts?: any[]
  ordersByStatus?: any
  revenueByDay?: any[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
}

export interface HealthData {
  system: {
    status: string
    uptime: number
    memory: any
    cpu: any
  }
  database: {
    status: string
    responseTime: number
  }
  api: {
    status: string
    responseTime: number
    requestsPerMinute: number
  }
  timestamp: string
}

export interface UseDashboardAnalyticsReturn {
  dashboardData: DashboardData | null
  healthData: HealthData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useDashboardAnalytics = (): UseDashboardAnalyticsReturn => {
  const { token, user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef<boolean>(false)

  const fetchDashboardData = useCallback(async () => {
    if (!token || !user) {
      setLoading(false)
      return
    }

    // Prevent concurrent requests
    if (isFetchingRef.current) {
      console.log('Skipping concurrent dashboard fetch')
      return
    }

    isFetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Fetch dashboard analytics from backend
      const dashboardUrl = buildApiUrl('/analytics/dashboard')
      const healthUrl = buildApiUrl('/analytics/health')

      const [dashboardResponse, healthResponse] = await Promise.all([
        fetch(dashboardUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(healthUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => null), // Health is optional, don't fail if it errors
      ])

      if (!dashboardResponse.ok) {
        const errorData = await dashboardResponse.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch dashboard data: ${dashboardResponse.status}`)
      }

      const dashboardResult = await dashboardResponse.json()

      // Backend returns { success: true, message: string, data: {...} }
      if (dashboardResult.success && dashboardResult.data) {
        setDashboardData(dashboardResult.data)
      } else {
        throw new Error('Invalid dashboard data format')
      }

      // Process health data if available
      if (healthResponse && healthResponse.ok) {
        const healthResult = await healthResponse.json()
        if (healthResult.success && healthResult.data) {
          setHealthData(healthResult.data)
        }
      }

      setError(null)
    } catch (err: any) {
      console.error('Error fetching dashboard analytics:', err)
      setError(err.message || 'Failed to load dashboard data')

      // Set fallback empty data structure to prevent UI crashes
      setDashboardData({
        overview: {
          totalOrders: 0,
          totalRevenue: 0,
          activeProducts: 0,
          activeBranches: 0,
          averageOrderValue: 0,
        },
        recentOrders: [],
      })
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [token, user])

  // Initial fetch on mount
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Auto-refresh every 60 seconds (reduced from 30s to prevent rate limiting)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return {
    dashboardData,
    healthData,
    loading,
    error,
    refetch: fetchDashboardData,
  }
}
