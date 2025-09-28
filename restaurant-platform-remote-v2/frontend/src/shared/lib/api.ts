import axios from 'axios'
import toast from 'react-hot-toast'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage or cookies
    const token = localStorage.getItem('auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth token - let AuthContext handle the redirect
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')
      
      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        toast.error('Session expired. Please login again.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
      return Promise.reject(error)
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.response?.data?.error) {
      toast.error(error.response.data.error)
    } else if (error.message) {
      toast.error(error.message)
    }

    return Promise.reject(error)
  }
)

// API Methods
export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),
    
    register: (userData: {
      email: string
      password: string
      firstName: string
      lastName: string
      companyId: string
      branchId?: string
      role?: string
    }) => apiClient.post('/auth/register', userData),
    
    logout: () => apiClient.post('/auth/logout'),
    
    me: () => apiClient.get('/auth/me'),
    
    refresh: () => apiClient.post('/auth/refresh'),
  },

  // Companies
  companies: {
    getAll: () => apiClient.get('/companies'),
    
    getById: (id: string) => apiClient.get(`/companies/${id}`),
    
    getMy: () => apiClient.get('/companies/my'),
    
    getStatistics: (id: string) => apiClient.get(`/companies/${id}/statistics`),
    
    create: (data: any) => apiClient.post('/companies', data),
    
    update: (id: string, data: any) => apiClient.patch(`/companies/${id}`, data),
    
    delete: (id: string) => apiClient.delete(`/companies/${id}`),
  },

  // Branches
  branches: {
    getAll: () => apiClient.get('/branches'),
    
    getById: (id: string) => apiClient.get(`/branches/${id}`),
    
    create: (data: {
      name: string
      nameAr: string
      phone?: string
      email?: string
      address?: string
      city?: string
      country?: string
      latitude?: number
      longitude?: number
      openTime?: string
      closeTime?: string
      isActive?: boolean
      allowsOnlineOrders?: boolean
      allowsDelivery?: boolean
      allowsPickup?: boolean
      timezone?: string
    }) => apiClient.post('/branches', data),
    
    update: (id: string, data: any) => apiClient.patch(`/branches/${id}`, data),
    
    delete: (id: string) => apiClient.delete(`/branches/${id}`),
  },

  // Users
  users: {
    getAll: () => apiClient.get('/users'),
    
    getById: (id: string) => apiClient.get(`/users/${id}`),
    
    create: (data: any) => apiClient.post('/users', data),
    
    update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
    
    delete: (id: string) => apiClient.delete(`/users/${id}`),
  },
}

export default apiClient