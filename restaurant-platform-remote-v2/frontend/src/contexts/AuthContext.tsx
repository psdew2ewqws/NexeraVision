import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  role: string
  companyId: string
  branchId?: string
  company?: any
  branch?: any
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isHydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  // Hydrate authentication state from localStorage
  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        // Small delay to ensure localStorage is available
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const storedToken = localStorage.getItem('auth-token')
        const storedUser = localStorage.getItem('user')
        
        console.log('AuthContext: Hydrating auth state', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          tokenPreview: storedToken?.substring(0, 20) + '...',
        })

        if (storedToken && storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            setToken(storedToken)
            setUser(userData)
            console.log('AuthContext: Successfully restored auth state for user:', userData.email)
          } catch (error) {
            console.error('AuthContext: Error parsing stored user data:', error)
            // Clear invalid data
            localStorage.removeItem('auth-token')
            localStorage.removeItem('user')
            setToken(null)
            setUser(null)
          }
        } else {
          console.log('AuthContext: No stored auth data found')
        }
      } catch (error) {
        console.error('AuthContext: Error hydrating auth state:', error)
      } finally {
        setIsLoading(false)
        setIsHydrated(true)
        console.log('AuthContext: Hydration complete')
      }
    }

    hydrateAuth()
  }, [])

  // Listen for localStorage changes (when API interceptor clears tokens)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedToken = localStorage.getItem('auth-token')
      const storedUser = localStorage.getItem('user')

      console.log('AuthContext: Storage change detected', {
        hasToken: !!storedToken,
        hasUser: !!storedUser
      });

      if (!storedToken || !storedUser) {
        console.log('AuthContext: Clearing auth state due to missing storage');
        setToken(null)
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      console.log('AuthContext: Attempting login with API URL:', apiUrl)
      
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailOrUsername: email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      const data = await response.json()
      
      // Store auth data
      localStorage.setItem('auth-token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      setToken(data.accessToken)
      setUser(data.user)
      setIsHydrated(true) // Ensure hydration is complete after login
      
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setIsHydrated(true)
    router.push('/login')
    toast.success('Logged out successfully')
  }, [router])

  const isAuthenticated = !!user && !!token

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isHydrated,
    login,
    logout,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}