// ================================================
// Platform Sync Types
// TypeScript Interfaces for Sync Operations
// ================================================

export interface PlatformSyncRequest {
  platformMenuId: string;
  platformType: string;
  configuration: any;
  userId: string;
  companyId: string;
  forceSync?: boolean;
  itemIds?: string[];
}

export interface BatchSyncRequest {
  platformMenuId: string;
  platforms: Array<{
    platformType: string;
    configuration: any;
    priority?: number;
  }>;
  userId: string;
  companyId: string;
  executionMode?: 'parallel' | 'sequence';
  failFast?: boolean;
}

export interface RetryRequest {
  syncIds: string[];
  companyId: string;
  userId: string;
  forceRetry?: boolean;
  resetRetryCount?: boolean;
  updatedConfiguration?: any;
}

export interface SyncConfiguration {
  platformType: string;
  configuration: any;
  autoSyncEnabled?: boolean;
  syncSchedule?: string;
  webhookUrl?: string;
  lastUpdated?: Date;
}

export interface SyncStatus {
  syncId: string;
  platformType: string;
  platformMenuId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed?: number;
  error?: string;
  retryCount?: number;
  platformMenu?: {
    id: string;
    name: any;
    platformType: string;
  };
}

export interface BatchSyncStatus {
  batchId: string;
  platformMenuId: string;
  platforms: string[];
  overallStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  startedAt: Date;
  completedAt?: Date;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  inProgressOperations: number;
  operations: Array<{
    syncId: string;
    platformType: string;
    status: string;
    progress: number;
    error?: string;
  }>;
}

export interface SyncHistory {
  syncId: string;
  platformType: string;
  platformMenuId: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed?: number;
  error?: string;
  retryCount: number;
  userId: string;
  platformMenu?: {
    id: string;
    name: any;
    platformType: string;
  };
}

export interface SyncAnalytics {
  period: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  avgDuration: number;
  platformBreakdown: {
    [platformType: string]: {
      [status: string]: number;
    };
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  healthScore: number;
  activeSyncs: number;
  failedSyncsLast24h: number;
  recentSyncCount: number;
  avgResponseTime: number;
  platformStatus: {
    [platformType: string]: {
      total: number;
      successful: number;
      successRate: number;
      status: 'healthy' | 'degraded' | 'inactive';
    };
  };
}

export interface SyncProgressEvent {
  syncId: string;
  status: string;
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
  itemsProcessed?: number;
  totalItems?: number;
  platformType?: string;
  error?: string;
  externalId?: string;
}

export interface BatchSyncProgressEvent {
  batchId: string;
  overallProgress: number;
  completedOperations: number;
  totalOperations: number;
  currentOperation?: {
    syncId: string;
    platformType: string;
    progress: number;
  };
  failedOperations: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations?: string[];
}

export interface SyncResult {
  success: boolean;
  syncId?: string;
  platformType?: string;
  message?: string;
  errors?: string[];
  warnings?: string[];
  duration?: number;
  itemsProcessed?: number;
  externalId?: string;
  retryable?: boolean;
}

export interface MenuItemSyncStatus {
  itemId: string;
  productId: string;
  platformType: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'excluded';
  lastSyncedAt?: Date;
  syncError?: string;
  externalId?: string;
  platformPrice?: number;
  isAvailable: boolean;
}

export interface PlatformCapabilities {
  platformType: string;
  supportedFeatures: {
    modifiers: boolean;
    images: boolean;
    descriptions: boolean;
    nutritionalInfo: boolean;
    allergens: boolean;
    scheduling: boolean;
    promotions: boolean;
    customization: boolean;
  };
  limitations: {
    maxItemsPerCategory?: number;
    maxCategories?: number;
    maxImageSize?: number;
    maxDescriptionLength?: number;
    supportedImageFormats?: string[];
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface SyncMetrics {
  platformType: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  rateLimit: {
    current: number;
    limit: number;
    resetTime: Date;
  };
  lastSuccessfulSync?: Date;
  lastFailedSync?: Date;
  consecutiveFailures: number;
}

export interface RetryStrategy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
  maxRetryDelay: number; // milliseconds
  retryableErrors: string[];
}

export interface SyncQueueItem {
  syncId: string;
  platformType: string;
  platformMenuId: string;
  priority: number;
  scheduledAt: Date;
  retryCount: number;
  configuration: any;
  userId: string;
  companyId: string;
}

export interface WebhookEvent {
  platformType: string;
  eventType: 'sync_completed' | 'sync_failed' | 'menu_updated' | 'status_changed';
  syncId?: string;
  externalId?: string;
  status?: string;
  message?: string;
  timestamp: Date;
  data: any;
}

export interface ConflictResolution {
  conflictType: 'price_mismatch' | 'availability_mismatch' | 'content_mismatch' | 'missing_item';
  itemId: string;
  platformType: string;
  localValue: any;
  platformValue: any;
  resolution: 'use_local' | 'use_platform' | 'manual_review' | 'skip_item';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SyncSchedule {
  id: string;
  platformMenuId: string;
  platformType: string;
  cronExpression: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  consecutiveFailures: number;
  maxFailures: number;
  configuration: any;
}

export interface PlatformIntegrationConfig {
  platformType: string;
  apiUrl: string;
  apiKey: string;
  secretKey?: string;
  timeout: number;
  retryStrategy: RetryStrategy;
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  webhookConfig?: {
    enabled: boolean;
    url: string;
    secret: string;
    events: string[];
  };
}

// ================================================
// PLATFORM-SPECIFIC TYPES
// ================================================

export interface CareemSyncData {
  storeId: string;
  menuId?: string;
  menu: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    isActive: boolean;
    lastUpdated: string;
  };
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    displayOrder: number;
    products: any[];
  }>;
  settings: {
    autoAcceptOrders: boolean;
    orderProcessingTime: number;
    maxOrdersPerHour: number;
    enablePromotions: boolean;
  };
}

export interface TalabatSyncData {
  restaurant_id: string;
  menu: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    tax_rate: number;
    categories: any[];
  };
  settings: {
    auto_accept_orders: boolean;
    preparation_time: number;
    max_orders_per_hour: number;
  };
}

export interface DeliverooSyncData {
  restaurant_id: string;
  menu: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    categories: any[];
  };
  configuration: {
    delivery_time: number;
    minimum_order: number;
    delivery_fee: number;
  };
}