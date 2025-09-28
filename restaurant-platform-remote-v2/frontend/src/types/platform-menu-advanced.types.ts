// Advanced Platform Menu Types
// Complete type definitions for platform-specific menu management

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
// PLATFORM-SPECIFIC CONFIGURATIONS
// ================================================

export interface TalabatMenuConfig {
  restaurantId: string;
  menuId?: string;
  currency: string;
  taxRate: number;
  deliveryZones: string[];
  operatingHours: {
    [day: string]: { open: string; close: string; available: boolean };
  };
  specialOffers: {
    enabled: boolean;
    types: ('discount' | 'buy_one_get_one' | 'free_delivery')[];
  };
  menuDisplay: {
    showNutrition: boolean;
    showCalories: boolean;
    showAllergens: boolean;
    groupByCategory: boolean;
  };
}

export interface CareemMenuConfig {
  storeId: string;
  menuId?: string;
  currency: string;
  serviceArea: {
    city: string;
    zones: string[];
    maxDeliveryRadius: number;
  };
  deliverySettings: {
    estimatedDeliveryTime: number;
    minOrderValue: number;
    deliveryFee: number;
    freeDeliveryThreshold?: number;
  };
  operationalHours: {
    [day: string]: { open: string; close: string; isOpen: boolean };
  };
  promotions: {
    enabled: boolean;
    types: ('percentage' | 'fixed_amount' | 'buy_x_get_y')[];
    autoApply: boolean;
  };
  display: {
    showPreparationTime: boolean;
    showIngredients: boolean;
    showNutritionalFacts: boolean;
    enableItemCustomization: boolean;
  };
}

export interface CallCenterMenuConfig {
  branchId: string;
  phoneNumbers: string[];
  operatorSettings: {
    maxSimultaneousOrders: number;
    averageCallDuration: number;
    preferredLanguage: 'en' | 'ar' | 'both';
  };
  quickOrderCodes: {
    enabled: boolean;
    codeLength: number;
    includeCategory: boolean;
  };
  promotions: {
    phoneExclusive: boolean;
    timeBasedOffers: boolean;
    repeatCustomerDiscounts: boolean;
  };
  customerManagement: {
    enableCustomerDatabase: boolean;
    saveOrderHistory: boolean;
    suggestPreviousOrders: boolean;
  };
  orderProcessing: {
    confirmationRequired: boolean;
    readBackOrder: boolean;
    estimatedDeliveryTime: number;
    acceptCashOnDelivery: boolean;
    acceptCardPayments: boolean;
  };
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
  platformConfig: {
    talabat?: TalabatMenuConfig;
    careem?: CareemMenuConfig;
    call_center?: CallCenterMenuConfig;
    [key: string]: any;
  };
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
  platformMetadata: {
    talabat?: {
      quickCode?: string;
      talabatId?: string;
      allergens?: string[];
      nutritionalInfo?: any;
    };
    careem?: {
      careemId?: string;
      ingredients?: string[];
      dietaryInfo?: string[];
      isSpicy?: boolean;
    };
    call_center?: {
      quickCode?: string;
      phoneDescription?: string;
      allergenWarnings?: string[];
      alternatives?: string[];
    };
    [key: string]: any;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;

  // Relations
  product?: MenuProduct;
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
  platformSpecificConfig: {
    talabat?: {
      talabatCategoryId?: string;
      showNutrition?: boolean;
    };
    careem?: {
      careemCategoryId?: string;
      availabilitySchedule?: any;
    };
    call_center?: {
      quickAccessCode?: string;
      phoneDescription?: string;
    };
    [key: string]: any;
  };

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
  platform: DeliveryPlatform;

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
// REQUEST/RESPONSE INTERFACES
// ================================================

export interface PlatformTransformationRequest {
  platformMenuId: string;
  targetPlatforms: DeliveryPlatform[];
  configs: {
    talabat?: TalabatMenuConfig;
    careem?: CareemMenuConfig;
    call_center?: CallCenterMenuConfig;
  };
  options?: {
    skipValidation?: boolean;
    dryRun?: boolean;
    parallel?: boolean;
    stopOnFirstError?: boolean;
  };
}

export interface PlatformTransformationResult {
  success: boolean;
  results: {
    platform: DeliveryPlatform;
    success: boolean;
    message?: string;
    errors?: string[];
    warnings?: string[];
    processingTime?: number;
    itemsProcessed?: number;
  }[];
  totalProcessingTime: number;
  overallStatus: 'completed' | 'partial' | 'failed';
  summary: {
    successful: number;
    failed: number;
    warnings: number;
  };
}

export interface PlatformMenuTemplate {
  id: string;
  name: string;
  description: string;
  platforms: DeliveryPlatform[];
  category: 'fast_food' | 'fine_dining' | 'cafe' | 'delivery_only' | 'custom';
  configs: {
    talabat?: Partial<TalabatMenuConfig>;
    careem?: Partial<CareemMenuConfig>;
    call_center?: Partial<CallCenterMenuConfig>;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    isPublic: boolean;
    tags: string[];
  };
  preview?: {
    imageUrl?: string;
    description?: string;
    features?: string[];
    estimatedSetupTime?: number;
  };
}

export interface MenuProduct {
  id: string;
  name: LocalizedContent;
  description?: LocalizedContent;
  basePrice: number;
  categoryId: string;
  isAvailable: boolean;
  preparationTime?: number;
  images?: string[];
  tags?: string[];
  nutritionalInfo?: any;
  allergens?: string[];
  modifiers?: any[];
}

// ================================================
// UI STATE INTERFACES
// ================================================

export interface MenuBuilderState {
  selectedPlatform?: DeliveryPlatform;
  currentMenu?: PlatformMenu;
  availableProducts: MenuProduct[];
  selectedProducts: string[];
  previewMode: boolean;
  syncInProgress: boolean;
  validationErrors?: string[];
  lastSyncStatus?: SyncStatus;
}

export interface PlatformConfigurationState {
  platform: DeliveryPlatform;
  config: TalabatMenuConfig | CareemMenuConfig | CallCenterMenuConfig;
  isValid: boolean;
  errors: string[];
  isDirty: boolean;
  lastSaved?: Date;
}

// ================================================
// API RESPONSE INTERFACES
// ================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
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
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

// ================================================
// UTILITY TYPES
// ================================================

export type PlatformSpecificConfig<T extends DeliveryPlatform> = 
  T extends 'talabat' ? TalabatMenuConfig :
  T extends 'careem' ? CareemMenuConfig :
  T extends 'call_center' ? CallCenterMenuConfig :
  Record<string, any>;

export type SyncProgress = {
  platform: DeliveryPlatform;
  status: SyncStatus;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  estimatedTimeRemaining?: number;
  errors: string[];
  warnings: string[];
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkedFields: string[];
};

// ================================================
// CONSTANTS
// ================================================

export const PLATFORM_COLORS = {
  [DeliveryPlatform.TALABAT]: 'orange',
  [DeliveryPlatform.CAREEM]: 'green',
  [DeliveryPlatform.CALL_CENTER]: 'blue',
  [DeliveryPlatform.WEBSITE]: 'purple',
  [DeliveryPlatform.MOBILE_APP]: 'indigo',
  [DeliveryPlatform.KIOSK]: 'gray',
  [DeliveryPlatform.CHATBOT]: 'pink',
  [DeliveryPlatform.ONLINE_ORDERING]: 'teal',
  [DeliveryPlatform.IN_STORE_DISPLAY]: 'cyan'
} as const;

export const PLATFORM_ICONS = {
  [DeliveryPlatform.TALABAT]: 'TruckIcon',
  [DeliveryPlatform.CAREEM]: 'ShoppingBagIcon',
  [DeliveryPlatform.CALL_CENTER]: 'PhoneIcon',
  [DeliveryPlatform.WEBSITE]: 'GlobeAltIcon',
  [DeliveryPlatform.MOBILE_APP]: 'ComputerDesktopIcon',
  [DeliveryPlatform.KIOSK]: 'ComputerDesktopIcon',
  [DeliveryPlatform.CHATBOT]: 'ChatBubbleLeftRightIcon',
  [DeliveryPlatform.ONLINE_ORDERING]: 'ShoppingCartIcon',
  [DeliveryPlatform.IN_STORE_DISPLAY]: 'TvIcon'
} as const;

export const SYNC_STATUS_COLORS = {
  [SyncStatus.PENDING]: 'yellow',
  [SyncStatus.IN_PROGRESS]: 'blue',
  [SyncStatus.COMPLETED]: 'green',
  [SyncStatus.FAILED]: 'red',
  [SyncStatus.PARTIAL]: 'orange'
} as const;

export const MENU_STATUS_COLORS = {
  [MenuStatus.DRAFT]: 'gray',
  [MenuStatus.ACTIVE]: 'green',
  [MenuStatus.INACTIVE]: 'red',
  [MenuStatus.SCHEDULED]: 'blue',
  [MenuStatus.SYNCING]: 'yellow',
  [MenuStatus.SYNC_FAILED]: 'red'
} as const;