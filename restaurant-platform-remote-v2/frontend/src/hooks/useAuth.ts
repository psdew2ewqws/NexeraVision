import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  company: { id: string; name: string }
  branch?: { id: string; name: string }
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Auto-logout after 2 hours of inactivity
  const IDLE_TIME = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

  const logout = useCallback(async (reason?: string) => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout API error:', error)
    }
    
    localStorage.removeItem('user')
    setUser(null)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    if (reason) {
      toast.error(reason)
    } else {
      toast.success('Logged out successfully')
    }
    
    router.push('/login')
  }, [router])

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (user) {
        logout('Session expired due to inactivity')
      }
    }, IDLE_TIME)
  }, [user, logout, IDLE_TIME])

  const login = useCallback((userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    resetIdleTimer()
  }, [resetIdleTimer])

  // Track user activity
  useEffect(() => {
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      if (user) {
        resetIdleTimer()
      }
    }

    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, { passive: true })
    })

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user, resetIdleTimer])

  // Initialize user on mount
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)
        resetIdleTimer()
      } catch (error) {
        console.error('Invalid user data in localStorage:', error)
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [resetIdleTimer])

  // Session validation on focus
  useEffect(() => {
    const handleFocus = async () => {
      if (user) {
        try {
          const response = await fetch('/api/auth/validate')
          if (!response.ok) {
            logout('Session expired')
          }
        } catch (error) {
          console.error('Session validation failed:', error)
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, logout])

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  }
}