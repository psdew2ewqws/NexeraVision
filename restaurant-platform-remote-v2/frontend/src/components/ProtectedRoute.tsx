import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requireAuth?: boolean
}

const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => {
  console.log('ProtectedRoute: Showing loading spinner -', message);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
        <p className="text-xs text-gray-400 mt-2">
          If this persists, try refreshing the page
        </p>
      </div>
    </div>
  );
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}) => {
  const { user, isLoading, isAuthenticated, isHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('ProtectedRoute: Auth state change', {
      isHydrated,
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userRole: user?.role,
      requireAuth,
      allowedRoles
    });

    // Don't check auth until hydration is complete
    if (!isHydrated) {
      console.log('ProtectedRoute: Waiting for hydration...');
      return;
    }

    // Add a small delay to prevent race conditions during navigation
    const timeoutId = setTimeout(() => {
      if (requireAuth && !isAuthenticated) {
        console.log('ProtectedRoute: Redirecting to login - not authenticated');
        router.push('/login')
        return
      }

      if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        console.log('ProtectedRoute: Redirecting to dashboard - insufficient role');
        router.push('/dashboard')
        return
      }

      console.log('ProtectedRoute: Auth checks passed - rendering content');
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [user, isAuthenticated, isHydrated, requireAuth, allowedRoles, router])

  // Show loading spinner during auth check or hydration
  if (!isHydrated) {
    return <LoadingSpinner message="Initializing authentication..." />
  }

  if (requireAuth && isLoading) {
    return <LoadingSpinner message="Checking authentication..." />
  }

  // Don't render if user should be redirected
  if (requireAuth && !isAuthenticated) {
    return <LoadingSpinner message="Redirecting to login..." />
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <LoadingSpinner message="Checking permissions..." />
  }

  return <>{children}</>
}

export default ProtectedRoute