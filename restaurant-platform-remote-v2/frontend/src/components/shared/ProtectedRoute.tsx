import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requireAuth?: boolean
}

const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
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

    // Check auth state immediately after hydration
    if (requireAuth && !isAuthenticated) {
      console.log('ProtectedRoute: User not authenticated, redirecting to login')
      router.push('/login')
      return
    }

    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      console.log('ProtectedRoute: User role not allowed, redirecting to dashboard')
      router.push('/dashboard')
      return
    }
  }, [user, isAuthenticated, isHydrated, requireAuth, allowedRoles, router])

  // Show loading spinner during auth check or hydration
  if (!isHydrated) {
    return <LoadingSpinner message="Initializing..." />
  }
  
  if (requireAuth && isLoading) {
    return <LoadingSpinner message="Authenticating..." />
  }

  // Don't render if user should be redirected
  if (requireAuth && !isAuthenticated) {
    return <LoadingSpinner message="Redirecting to login..." />
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <LoadingSpinner message="Redirecting..." />
  }

  return <>{children}</>
}

export default ProtectedRoute