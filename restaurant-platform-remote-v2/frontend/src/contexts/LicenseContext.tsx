import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface LicenseData {
  license_id: string | null
  company_id: string
  type: 'trial' | 'active' | 'premium'
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  days_remaining: number
  expires_at: string | null
  is_expired: boolean
  is_near_expiry: boolean
  is_critical: boolean
  features: string[]
  warning_level: 'active' | 'notice' | 'warning' | 'critical' | 'expired'
}

interface LicenseNotification {
  id: string
  type: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  created_at: string
  metadata?: Record<string, any>
}

interface LicenseContextType {
  license: LicenseData | null
  notifications: LicenseNotification[]
  isLoading: boolean
  refreshLicense: () => Promise<void>
  checkFeatureAccess: (feature: string) => Promise<boolean>
  trackFeatureUsage: (feature: string, metadata?: Record<string, any>) => Promise<void>
  dismissNotification: (id: string) => Promise<void>
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined)

export const useLicense = () => {
  const context = useContext(LicenseContext)
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider')
  }
  return context
}

interface LicenseProviderProps {
  children: React.ReactNode
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const [license, setLicense] = useState<LicenseData | null>(null)
  const [notifications, setNotifications] = useState<LicenseNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, token, isAuthenticated } = useAuth()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  const fetchLicense = useCallback(async () => {
    try {
      // Try demo endpoint first (for development/testing)
      const demoResponse = await fetch(`${API_BASE_URL}/licenses/demo/my-company`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (demoResponse.ok) {
        const result = await demoResponse.json()
        setLicense(result.data)
        setIsLoading(false)
        return
      }

      // Fall back to authenticated endpoint if demo fails
      if (!isAuthenticated || !token || !user?.companyId) {
        setLicense(null)
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/licenses/my-company`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setLicense(result.data)
      } else {
        console.error('Failed to fetch license:', response.statusText)
        setLicense(null)
      }
    } catch (error) {
      console.error('Error fetching license:', error)
      setLicense(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, token, user?.companyId, API_BASE_URL])

  const fetchNotifications = useCallback(async () => {
    try {
      // Try demo endpoint first (for development/testing)
      const demoResponse = await fetch(`${API_BASE_URL}/licenses/demo/notifications/my-company`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (demoResponse.ok) {
        const result = await demoResponse.json()
        setNotifications(result.data || [])
        return
      }

      // Fall back to authenticated endpoint
      if (!isAuthenticated || !token) return

      const response = await fetch(`${API_BASE_URL}/licenses/notifications/my-company`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setNotifications(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [isAuthenticated, token, API_BASE_URL])

  const refreshLicense = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([fetchLicense(), fetchNotifications()])
  }, [fetchLicense, fetchNotifications])

  const checkFeatureAccess = useCallback(async (feature: string): Promise<boolean> => {
    try {
      // Try demo endpoint first (for development/testing)
      const demoResponse = await fetch(`${API_BASE_URL}/licenses/demo/feature-access/${feature}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (demoResponse.ok) {
        const result = await demoResponse.json()
        return result.data?.hasAccess || false
      }

      // Fall back to authenticated endpoint
      if (!isAuthenticated || !token) return false

      const response = await fetch(`${API_BASE_URL}/licenses/feature-access/${feature}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        return result.data?.hasAccess || false
      }
    } catch (error) {
      console.error('Error checking feature access:', error)
    }
    return false
  }, [isAuthenticated, token, API_BASE_URL])

  const trackFeatureUsage = useCallback(async (feature: string, metadata?: Record<string, any>) => {
    try {
      // Try demo endpoint first (for development/testing)
      const demoResponse = await fetch(`${API_BASE_URL}/licenses/demo/track-usage/${feature}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata || {})
      })

      if (demoResponse.ok) return

      // Fall back to authenticated endpoint
      if (!isAuthenticated || !token) return

      await fetch(`${API_BASE_URL}/licenses/track-usage/${feature}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata || {})
      })
    } catch (error) {
      console.error('Error tracking feature usage:', error)
    }
  }, [isAuthenticated, token, API_BASE_URL])

  const dismissNotification = useCallback(async (id: string) => {
    try {
      // Try demo endpoint first (for development/testing)
      const demoResponse = await fetch(`${API_BASE_URL}/licenses/demo/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (demoResponse.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(n => n.id !== id))
        return
      }

      // Fall back to authenticated endpoint
      if (!isAuthenticated || !token) return

      await fetch(`${API_BASE_URL}/licenses/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }, [isAuthenticated, token, API_BASE_URL])


  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.companyId) {
      refreshLicense()
    }
  }, [isAuthenticated, user?.companyId, refreshLicense])

  // Periodic refresh every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      fetchLicense()
      fetchNotifications()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [isAuthenticated, fetchLicense, fetchNotifications])

  const value: LicenseContextType = {
    license,
    notifications,
    isLoading,
    refreshLicense,
    checkFeatureAccess,
    trackFeatureUsage,
    dismissNotification
  }

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  )
}