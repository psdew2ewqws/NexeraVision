import axios, { AxiosError } from 'axios'
import type {
  DeliveryProvider,
  BranchDeliveryConfig,
  WebhookLog,
  ProviderOrder,
  DeliveryErrorLog,
  ProviderStats,
  OverallStats,
  WebhookFilters,
  OrderFilters,
  ErrorFilters,
  PaginatedResponse
} from '@/types/integration'
import { getApiUrl } from '../config/api.config'

const integrationApi = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const integrationServiceApi = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
integrationApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
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
integrationApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login for public endpoints
    const publicEndpoints = ['/integration/delivery/providers']
    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      error.config?.url?.includes(endpoint)
    )

    if (error.response?.status === 401 && !isPublicEndpoint) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Integration service interceptors
integrationServiceApi.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

integrationServiceApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('Integration Service Error:', error.response?.data || error.message)
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API Keys
export const apiKeys = {
  getAll: () => integrationApi.get('/integration/api-keys'),

  create: (data: { name: string; scopes: string[] }) =>
    integrationApi.post('/integration/api-keys', data),

  delete: (id: string) =>
    integrationApi.delete(`/integration/api-keys/${id}`),

  rotate: (id: string) =>
    integrationApi.post(`/integration/api-keys/${id}/rotate`),

  getStats: (id: string) =>
    integrationApi.get(`/integration/api-keys/${id}/stats`),
}

// Webhooks
export const webhooks = {
  getAll: () => integrationApi.get('/integration/webhooks'),

  create: (data: { url: string; events: string[]; secret?: string }) =>
    integrationApi.post('/integration/webhooks', data),

  update: (id: string, data: Partial<{ url: string; events: string[]; isActive: boolean }>) =>
    integrationApi.patch(`/integration/webhooks/${id}`, data),

  delete: (id: string) =>
    integrationApi.delete(`/integration/webhooks/${id}`),

  test: (id: string, event?: string) =>
    integrationApi.post(`/integration/webhooks/${id}/test`, { event }),

  getDeliveries: (id: string, params?: { page?: number; limit?: number; status?: string }) =>
    integrationApi.get(`/integration/webhooks/${id}/deliveries`, { params }),

  retryDelivery: (webhookId: string, deliveryId: string) =>
    integrationApi.post(`/integration/webhooks/${webhookId}/deliveries/${deliveryId}/retry`),
}

// Monitoring & Logs
export const monitoring = {
  getLogs: (params?: {
    page?: number
    limit?: number
    method?: string
    status?: string
    endpoint?: string
    startDate?: string
    endDate?: string
  }) => integrationApi.get('/integration/logs', { params }),

  getLogById: (id: string) =>
    integrationApi.get(`/integration/logs/${id}`),

  getMetrics: (params?: { period?: 'hour' | 'day' | 'week' | 'month' }) =>
    integrationApi.get('/integration/metrics', { params }),

  getPerformance: () =>
    integrationApi.get('/integration/performance'),

  getErrors: (params?: { page?: number; limit?: number }) =>
    integrationApi.get('/integration/errors', { params }),
}

// Statistics
export const statistics = {
  getDashboard: () =>
    integrationApi.get('/integration/stats/dashboard'),

  getUsage: (params?: { apiKeyId?: string; period?: string }) =>
    integrationApi.get('/integration/stats/usage', { params }),

  getTopEndpoints: (limit?: number) =>
    integrationApi.get('/integration/stats/top-endpoints', { params: { limit } }),
}

// Rate Limiting
export const rateLimit = {
  getCurrent: () =>
    integrationApi.get('/integration/rate-limit'),

  getHistory: () =>
    integrationApi.get('/integration/rate-limit/history'),
}

// Delivery Providers Management
export const deliveryProviders = {
  getAll: async (): Promise<DeliveryProvider[]> => {
    const { data } = await integrationApi.get('/integration/delivery/providers')
    return data
  },

  getById: async (id: string): Promise<DeliveryProvider> => {
    const { data } = await integrationApi.get(`/integration/delivery/providers/${id}`)
    return data
  },

  update: async (id: string, updates: Partial<DeliveryProvider>): Promise<DeliveryProvider> => {
    const { data } = await integrationApi.put(`/integration/delivery/providers/${id}`, updates)
    return data
  },

  toggle: async (id: string, isActive: boolean): Promise<DeliveryProvider> => {
    const { data } = await integrationApi.patch(`/integration/delivery/providers/${id}/toggle`, { isActive })
    return data
  },

  test: async (id: string): Promise<{ success: boolean; message: string; details?: any }> => {
    const { data } = await integrationApi.post(`/integration/delivery/providers/${id}/test`)
    return data
  },

  getStats: async (providerId: string, startDate?: string, endDate?: string): Promise<ProviderStats> => {
    const { data } = await integrationApi.get(`/integration/delivery/providers/${providerId}/stats`, {
      params: { startDate, endDate }
    })
    return data
  }
}

// Branch Configuration
export const branchConfig = {
  get: async (branchId: string, providerId: string): Promise<BranchDeliveryConfig | null> => {
    try {
      const { data } = await integrationApi.get(`/integration/branch-config/${branchId}/providers/${providerId}`)
      return data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  save: async (branchId: string, providerId: string, config: Partial<BranchDeliveryConfig>): Promise<BranchDeliveryConfig> => {
    const { data } = await integrationApi.post(`/integration/branch-config/${branchId}/providers/${providerId}`, config)
    return data
  },

  delete: async (branchId: string, providerId: string): Promise<void> => {
    await integrationApi.delete(`/integration/branch-config/${branchId}/providers/${providerId}`)
  }
}

// Webhook Logs (Enhanced)
export const webhookLogs = {
  getAll: async (filters: WebhookFilters): Promise<PaginatedResponse<WebhookLog>> => {
    const { data } = await integrationApi.get('/integration/delivery/webhooks/logs', { params: filters })
    return data
  },

  getById: async (id: string): Promise<WebhookLog> => {
    const { data} = await integrationApi.get(`/integration/delivery/webhooks/logs/${id}`)
    return data
  },

  retry: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await integrationApi.post(`/integration/delivery/webhooks/logs/${id}/retry`)
    return data
  },

  export: async (filters: WebhookFilters): Promise<Blob> => {
    const { data } = await integrationApi.get('/integration/delivery/webhooks/logs/export', {
      params: filters,
      responseType: 'blob'
    })
    return data
  }
}

// Provider Orders
export const providerOrders = {
  getAll: async (filters: OrderFilters): Promise<PaginatedResponse<ProviderOrder>> => {
    const { data } = await integrationServiceApi.get('/orders', { params: filters })
    return data
  },

  getById: async (id: string): Promise<ProviderOrder> => {
    const { data } = await integrationServiceApi.get(`/orders/${id}`)
    return data
  },

  retry: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await integrationServiceApi.post(`/orders/${id}/retry`)
    return data
  },

  sync: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await integrationServiceApi.post(`/orders/${id}/sync`)
    return data
  }
}

// Error Logs
export const errorLogs = {
  getAll: async (filters: ErrorFilters): Promise<PaginatedResponse<DeliveryErrorLog>> => {
    const { data } = await integrationServiceApi.get('/errors', { params: filters })
    return data
  },

  resolve: async (id: string, resolvedBy: string): Promise<DeliveryErrorLog> => {
    const { data } = await integrationServiceApi.patch(`/errors/${id}/resolve`, { resolvedBy })
    return data
  }
}

// Overall Statistics
export const integrationStats = {
  getOverall: async (startDate?: string, endDate?: string): Promise<OverallStats> => {
    const { data } = await integrationServiceApi.get('/stats', {
      params: { startDate, endDate }
    })
    return data
  }
}

export default integrationApi
