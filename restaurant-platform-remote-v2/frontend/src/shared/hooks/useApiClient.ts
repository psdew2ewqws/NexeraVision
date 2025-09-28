import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

interface ApiOptions extends RequestInit {
  skipAuth?: boolean
}

export const useApiClient = () => {
  const { token, logout, isHydrated } = useAuth()
  const router = useRouter()

  const apiCall = useCallback(async (url: string, options: ApiOptions = {}) => {
    console.log('🚀 useApiClient.apiCall called with URL:', url);
    console.log('🔧 useApiClient.apiCall options:', options);
    
    const { skipAuth = false, ...requestOptions } = options

    // Base configuration
    const config: RequestInit = {
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...requestOptions.headers,
      },
    }

    // Add authentication if not skipped
    if (!skipAuth) {
      // Get token from context or fallback to localStorage
      const authToken = token || localStorage.getItem('auth-token')
      console.log('🔑 Auth token found:', authToken ? 'Yes' : 'No');
      if (authToken) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${authToken}`,
        }
      }
    }

    console.log('📋 Final request config:', config);

    try {
      console.log('🌐 Making fetch request to:', url);
      const response = await fetch(url, config)

      // Handle unauthorized responses
      if (response.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        return null
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      // Handle responses with no content (like DELETE requests)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null
      }

      // Return JSON data for responses that have content
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      
      // Return null for non-JSON responses
      return null
    } catch (error: any) {
      console.error('API call failed:', error)
      
      // Don't show toast for network errors during logout
      if (!error.message.includes('Failed to fetch')) {
        toast.error(error.message || 'API request failed')
      }
      
      throw error
    }
  }, [token, logout])

  return { apiCall }
}

export default useApiClient