export interface DeliveryProvider {
  id: string
  name: string
  slug: string
  isActive: boolean
  config: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface BranchDeliveryConfig {
  id: string
  branchId: string
  providerId: string
  providerName: string
  isActive: boolean
  config: {
    webhookSecret?: string
    autoPrint?: boolean
    autoAccept?: boolean
    locationId?: string
    menuId?: string
  }
  createdAt: string
  updatedAt: string
}

export interface WebhookLog {
  id: string
  providerId: string
  providerName: string
  eventType: string
  payload: Record<string, any>
  status: 'success' | 'failed' | 'retrying'
  statusCode: number
  responseTime: number
  signatureValid: boolean
  retryCount: number
  errorMessage?: string
  createdAt: string
  processedAt?: string
}

export interface ProviderOrder {
  id: string
  providerId: string
  providerName: string
  externalOrderId: string
  internalOrderId?: string
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'failed'
  orderData: Record<string, any>
  syncStatus: 'synced' | 'sync_failed' | 'pending_sync'
  syncError?: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryErrorLog {
  id: string
  providerId: string
  providerName: string
  errorType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  errorMessage: string
  stackTrace?: string
  context: Record<string, any>
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
}

export interface ProviderStats {
  providerId: string
  providerName: string
  totalOrders: number
  successfulOrders: number
  failedOrders: number
  successRate: number
  avgResponseTime: number
  totalRevenue: number
  lastOrderAt?: string
  webhooksReceived: number
  webhookErrors: number
}

export interface OverallStats {
  totalProviders: number
  activeProviders: number
  totalOrders: number
  todayOrders: number
  weekOrders: number
  monthOrders: number
  overallSuccessRate: number
  avgResponseTime: number
  totalRevenue: number
  activeWebhooks: number
  totalErrors: number
  unresolvedErrors: number
}

export interface WebhookFilters {
  providerId?: string
  status?: 'success' | 'failed' | 'retrying'
  startDate?: string
  endDate?: string
  eventType?: string
  page?: number
  limit?: number
}

export interface OrderFilters {
  providerId?: string
  status?: string
  syncStatus?: '' | 'synced' | 'sync_failed' | 'pending_sync'
  startDate?: string
  endDate?: string
  searchTerm?: string
  page?: number
  limit?: number
}

export interface ErrorFilters {
  providerId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  isResolved?: boolean
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
