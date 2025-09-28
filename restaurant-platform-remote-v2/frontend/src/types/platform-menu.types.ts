// ================================================
// Platform Menu Types
// Restaurant Platform v2 - Type Definitions
// ================================================

// ================================================
// ENUMS
// ================================================

export enum DeliveryPlatform {
  CAREEM = 'CAREEM',
  TALABAT = 'TALABAT',
  WEBSITE = 'WEBSITE',
  CALL_CENTER = 'CALL_CENTER',
  MOBILE_APP = 'MOBILE_APP',
  KIOSK = 'KIOSK',
  IN_STORE_DISPLAY = 'IN_STORE_DISPLAY',
  CHATBOT = 'CHATBOT',
  ONLINE_ORDERING = 'ONLINE_ORDERING'
}

export enum MenuStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// ================================================
// CORE INTERFACES
// ================================================

export interface PlatformMenu {
  id: string;
  platform: DeliveryPlatform;
  name: {
    en: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  status: MenuStatus;
  isActive: boolean;
  branchId?: string;
  priority: number;
  platformConfig: Record<string, any>;
  displayConfig: Record<string, any>;
  activeFrom?: Date;
  activeUntil?: Date;
  scheduleConfig?: Record<string, any>;
  lastSyncedAt?: Date;
  syncStatus?: SyncStatus;
  syncErrorMessage?: string;
  syncAttemptCount: number;
  itemCount: number;
  availableItems: number;
  createdAt: Date;
  updatedAt: Date;
  items?: PlatformMenuItem[];
  categories?: PlatformMenuCategory[];
}

export interface PlatformMenuItem {
  id: string;
  platformMenuId: string;
  productId: string;
  displayName?: {
    en?: string;
    ar?: string;
  };
  displayDescription?: {
    en?: string;
    ar?: string;
  };
  displayImage?: string;
  platformPrice?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  platformMetadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: {
      en: string;
      ar?: string;
    };
    basePrice: number;
    status: string;
    tags?: string[];
  };
}

export interface PlatformMenuCategory {
  id: string;
  platformMenuId: string;
  name: {
    en: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

export interface CreatePlatformMenuDto {
  platform: DeliveryPlatform;
  name: {
    en: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  branchId?: string;
  status?: MenuStatus;
  isActive?: boolean;
  priority?: number;
  platformConfig?: Record<string, any>;
  displayConfig?: Record<string, any>;
  activeFrom?: Date;
  activeUntil?: Date;
  scheduleConfig?: Record<string, any>;
}

export interface UpdatePlatformMenuDto extends Partial<CreatePlatformMenuDto> {}

export interface CreatePlatformMenuItemDto {
  productId: string;
  displayName?: {
    en?: string;
    ar?: string;
  };
  displayDescription?: {
    en?: string;
    ar?: string;
  };
  displayImage?: string;
  platformPrice?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  platformMetadata?: Record<string, any>;
}

export interface UpdatePlatformMenuItemDto extends Partial<CreatePlatformMenuItemDto> {}

export interface PlatformMenuFiltersDto {
  search?: string;
  platform?: DeliveryPlatform[];
  status?: MenuStatus[];
  isActive?: boolean;
  branchId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAfter?: Date;
  createdBefore?: Date;
  lastSyncedAfter?: Date;
  lastSyncedBefore?: Date;
}

export interface MenuSyncRequestDto {
  syncType?: 'manual' | 'scheduled' | 'webhook' | 'auto' | 'force' | 'incremental';
  specificItems?: string[];
  options?: {
    validateOnly?: boolean;
    dryRun?: boolean;
    notifyOnComplete?: boolean;
    batchSize?: number;
    parallelBatches?: number;
  };
}

export interface BulkMenuOperationDto {
  menuIds: string[];
  operation: 'activate' | 'deactivate' | 'sync' | 'delete';
  options?: Record<string, any>;
}

// ================================================
// RESPONSE TYPES
// ================================================

export interface PlatformMenuResponse {
  id: string;
  platform: DeliveryPlatform;
  name: {
    en: string;
    ar?: string;
  };
  status: MenuStatus;
  isActive: boolean;
  itemCount: number;
  availableItems: number;
  lastSyncedAt?: Date;
  syncStatus?: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformMenuDetailResponse extends PlatformMenu {}

export interface MenuSyncResponse {
  syncId: string;
  status: SyncStatus;
  startedAt: Date;
  estimatedDuration: number;
  itemsToSync: number;
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentOperation?: string;
  };
}

export interface MenuSyncStatusResponse {
  syncId: string;
  status: SyncStatus;
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentOperation?: string;
  };
  itemsSynced: number;
  errors: string[];
  warnings: string[];
  estimatedTimeRemaining: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: any;
}

export interface MenuAnalyticsResponse {
  totalMenus: number;
  activeMenus: number;
  platformBreakdown: Record<DeliveryPlatform, number>;
  syncStats: {
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
  };
  recentActivity: {
    menuId: string;
    platform: DeliveryPlatform;
    action: string;
    timestamp: Date;
  }[];
}

// ================================================
// MULTI-PLATFORM SYNC TYPES
// ================================================

export interface MultiPlatformSyncRequest {
  menuId: string;
  platforms: DeliveryPlatform[];
  syncType: 'manual' | 'scheduled' | 'auto';
  options?: {
    parallelProcessing?: boolean;
    maxConcurrency?: number;
    stopOnFirstError?: boolean;
    notifyOnComplete?: boolean;
  };
}

export interface MultiPlatformSyncResponse {
  multiSyncId: string;
  individualSyncs: {
    platform: DeliveryPlatform;
    syncId: string;
    status: SyncStatus;
  }[];
  overallStatus: SyncStatus;
  estimatedDuration: number;
  startedAt: Date;
}

export interface MultiPlatformSyncStatus {
  multiSyncId: string;
  overallStatus: SyncStatus;
  overallProgress: {
    completedPlatforms: number;
    totalPlatforms: number;
    percentage: number;
  };
  platformStatuses: {
    platform: string;
    syncId: string;
    status: SyncStatus;
    progress: {
      current: number;
      total: number;
      percentage: number;
      currentOperation?: string;
    };
    errors?: string[];
  }[];
  totalItemsSynced: number;
  totalErrors: number;
  estimatedTimeRemaining: number;
  startedAt: Date;
  completedAt?: Date;
}