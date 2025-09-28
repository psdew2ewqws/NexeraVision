import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../src/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requireAuth?: boolean
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}) => {
  const { user, isLoading, isAuthenticated, isHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't check auth until hydration is complete
    if (!isHydrated) return

    // Add a small delay to prevent race conditions during navigation
    const timeoutId = setTimeout(() => {
      if (requireAuth && !isAuthenticated) {
        router.push('/login')
        return
      }

      if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        router.push('/dashboard')
        return
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [user, isAuthenticated, isHydrated, requireAuth, allowedRoles, router])

  // Show loading spinner during auth check or hydration
  if (!isHydrated || (requireAuth && isLoading)) {
    return <LoadingSpinner />
  }

  // Don't render if user should be redirected
  if (requireAuth && !isAuthenticated) {
    return <LoadingSpinner />
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <LoadingSpinner />
  }

  return <>{children}</>
}

export default ProtectedRoute