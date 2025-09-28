// ================================================
// Platform Menu Management Types & Interfaces
// Restaurant Platform v2 - API Architecture
// ================================================

export enum DeliveryPlatform {
  CALL_CENTER = 'call_center',
  TALABAT = 'talabat',
  CAREEM = 'careem',
  WEBSITE = 'website',
  CHATBOT = 'chatbot',
  ONLINE_ORDERING = 'online_ordering',
  IN_STORE_DISPLAY = 'in_store_display',
  KIOSK = 'kiosk',
  MOBILE_APP = 'mobile_app'
}

export enum MenuStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  SYNCING = 'syncing',
  SYNC_FAILED = 'sync_failed'
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

// ================================================
// CORE INTERFACES
// ================================================

export interface LocalizedContent {
  en: string;
  ar: string;
}

export interface PlatformMenuConfig {
  // Display Settings
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };

  // Layout Settings
  layout?: {
    columnsPerRow?: number;
    showPrices?: boolean;
    showImages?: boolean;
    showDescriptions?: boolean;
  };

  // Platform-Specific Features
  features?: {
    allowModifiers?: boolean;
    enablePromotions?: boolean;
    showNutritionalInfo?: boolean;
    enableReviews?: boolean;
  };

  // Sync Settings
  autoSync?: boolean;
  syncFrequency?: number; // minutes
  syncOnUpdate?: boolean;
}

export interface PricingConfig {
  type: 'fixed' | 'percentage' | 'dynamic';
  value: number;
  currency?: string;
  conditions?: {
    minQuantity?: number;
    timeOfDay?: string[];
    dayOfWeek?: number[];
  };
}

export interface AvailabilitySchedule {
  monday?: { start: string; end: string; available: boolean }[];
  tuesday?: { start: string; end: string; available: boolean }[];
  wednesday?: { start: string; end: string; available: boolean }[];
  thursday?: { start: string; end: string; available: boolean }[];
  friday?: { start: string; end: string; available: boolean }[];
  saturday?: { start: string; end: string; available: boolean }[];
  sunday?: { start: string; end: string; available: boolean }[];
}

// ================================================
// ENTITY INTERFACES
// ================================================

export interface PlatformMenu {
  id: string;
  companyId: string;
  branchId?: string;

  // Platform Configuration
  platform: DeliveryPlatform;
  name: LocalizedContent;
  description?: LocalizedContent;

  // Status & Visibility
  status: MenuStatus;
  isActive: boolean;
  priority: number;

  // Platform-Specific Settings
  platformConfig: PlatformMenuConfig;
  displayConfig: Record<string, any>;

  // Scheduling
  activeFrom?: Date;
  activeUntil?: Date;
  scheduleConfig?: AvailabilitySchedule;

  // Sync Management
  lastSyncedAt?: Date;
  syncStatus: SyncStatus;
  syncErrorMessage?: string;
  syncAttemptCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;

  // Relations
  items?: PlatformMenuItem[];
  categories?: PlatformMenuCategory[];
  syncHistory?: MenuSyncHistory[];
}

export interface PlatformMenuItem {
  id: string;
  platformMenuId: string;
  productId: string;

  // Display Configuration
  displayName?: LocalizedContent;
  displayDescription?: LocalizedContent;
  displayImage?: string;

  // Pricing Override
  platformPrice?: number;
  pricingConfig: PricingConfig[];

  // Availability
  isAvailable: boolean;
  availabilitySchedule?: AvailabilitySchedule;
  maxDailyQuantity?: number;
  currentQuantity: number;

  // Display & Ordering
  categoryOverride?: string;
  displayOrder: number;
  isFeatured: boolean;
  tags: string[];

  // Platform-Specific Data
  platformMetadata: Record<string, any>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;

  // Relations
  product?: any; // MenuProduct
  platformMenu?: PlatformMenu;
  categoryItems?: PlatformMenuCategoryItem[];
}

export interface PlatformMenuCategory {
  id: string;
  platformMenuId: string;

  // Category Information
  name: LocalizedContent;
  description?: LocalizedContent;
  image?: string;

  // Display Configuration
  displayOrder: number;
  isVisible: boolean;
  colorTheme?: string;
  icon?: string;

  // Platform-Specific Settings
  platformSpecificConfig: Record<string, any>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;

  // Relations
  items?: PlatformMenuCategoryItem[];
  platformMenu?: PlatformMenu;
}

export interface PlatformMenuCategoryItem {
  id: string;
  platformMenuCategoryId: string;
  platformMenuItemId: string;
  displayOrder: number;
  createdAt: Date;

  // Relations
  category?: PlatformMenuCategory;
  menuItem?: PlatformMenuItem;
}

export interface MenuSyncHistory {
  id: string;
  platformMenuId: string;

  // Sync Details
  syncType: 'manual' | 'scheduled' | 'webhook' | 'auto';
  syncStatus: SyncStatus;

  // Performance Metrics
  itemsSynced: number;
  syncDurationMs: number;
  apiCallsMade: number;

  // Error Handling
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  retryCount: number;

  // Metadata
  startedAt: Date;
  completedAt?: Date;
  initiatedBy?: string;

  // Relations
  platformMenu?: PlatformMenu;
}

// ================================================
// DTO INTERFACES
// ================================================

export interface CreatePlatformMenuDto {
  platform: DeliveryPlatform;
  name: LocalizedContent;
  description?: LocalizedContent;
  branchId?: string;

  status?: MenuStatus;
  isActive?: boolean;
  priority?: number;

  platformConfig?: PlatformMenuConfig;
  displayConfig?: Record<string, any>;

  activeFrom?: Date;
  activeUntil?: Date;
  scheduleConfig?: AvailabilitySchedule;
}

export interface UpdatePlatformMenuDto {
  name?: LocalizedContent;
  description?: LocalizedContent;

  status?: MenuStatus;
  isActive?: boolean;
  priority?: number;

  platformConfig?: PlatformMenuConfig;
  displayConfig?: Record<string, any>;

  activeFrom?: Date;
  activeUntil?: Date;
  scheduleConfig?: AvailabilitySchedule;
}

export interface CreatePlatformMenuItemDto {
  productId: string;

  displayName?: LocalizedContent;
  displayDescription?: LocalizedContent;
  displayImage?: string;

  platformPrice?: number;
  pricingConfig?: PricingConfig[];

  isAvailable?: boolean;
  availabilitySchedule?: AvailabilitySchedule;
  maxDailyQuantity?: number;

  categoryOverride?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  tags?: string[];

  platformMetadata?: Record<string, any>;
}

export interface UpdatePlatformMenuItemDto {
  displayName?: LocalizedContent;
  displayDescription?: LocalizedContent;
  displayImage?: string;

  platformPrice?: number;
  pricingConfig?: PricingConfig[];

  isAvailable?: boolean;
  availabilitySchedule?: AvailabilitySchedule;
  maxDailyQuantity?: number;
  currentQuantity?: number;

  categoryOverride?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  tags?: string[];

  platformMetadata?: Record<string, any>;
}

export interface PlatformMenuFiltersDto {
  search?: string;
  platform?: DeliveryPlatform[];
  status?: MenuStatus[];
  isActive?: boolean;
  branchId?: string;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'name' | 'platform' | 'status' | 'lastSynced' | 'createdAt';
  sortOrder?: 'asc' | 'desc';

  // Date Filters
  createdAfter?: Date;
  createdBefore?: Date;
  lastSyncedAfter?: Date;
  lastSyncedBefore?: Date;
}

export interface BulkMenuOperationDto {
  menuIds: string[];
  operation: 'activate' | 'deactivate' | 'sync' | 'delete' | 'duplicate';
  options?: {
    targetPlatform?: DeliveryPlatform; // for duplicate
    syncType?: 'force' | 'incremental'; // for sync
  };
}

export interface MenuSyncRequestDto {
  syncType?: 'manual' | 'force' | 'incremental';
  specificItems?: string[]; // Platform menu item IDs
  options?: {
    validateOnly?: boolean;
    dryRun?: boolean;
    notifyOnComplete?: boolean;
  };
}

// ================================================
// RESPONSE INTERFACES
// ================================================

export interface PlatformMenuResponse {
  id: string;
  platform: DeliveryPlatform;
  name: LocalizedContent;
  status: MenuStatus;
  isActive: boolean;
  itemCount: number;
  availableItems: number;
  lastSyncedAt?: Date;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformMenuDetailResponse extends PlatformMenuResponse {
  description?: LocalizedContent;
  branchId?: string;
  priority: number;
  platformConfig: PlatformMenuConfig;
  displayConfig: Record<string, any>;
  activeFrom?: Date;
  activeUntil?: Date;
  scheduleConfig?: AvailabilitySchedule;
  syncErrorMessage?: string;
  syncAttemptCount: number;

  items: PlatformMenuItem[];
  categories: PlatformMenuCategory[];
}

export interface MenuSyncResponse {
  syncId: string;
  status: SyncStatus;
  startedAt: Date;
  estimatedDuration?: number;
  itemsToSync: number;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface MenuSyncStatusResponse {
  syncId: string;
  status: SyncStatus;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  itemsSynced: number;
  errors: string[];
  warnings: string[];
  estimatedTimeRemaining?: number;
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
  filters?: Record<string, any>;
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