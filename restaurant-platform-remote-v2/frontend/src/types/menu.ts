// Menu System Types - Enterprise Grade
export interface MenuCategory {
  id: string;
  companyId: string;
  name: {
    en?: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  image?: string;
  displayNumber: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuProduct {
  id: string;
  companyId: string;
  categoryId?: string;
  name: {
    en?: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  image?: string;
  slug?: string;
  basePrice: number;
  pricing: {
    default?: number;
    uber_eats?: number;
    doordash?: number;
    website?: number;
    [key: string]: number | undefined;
  };
  cost: number;
  status: number; // 1=active, 0=inactive
  priority: number;
  preparationTime: number;
  tags: string[];
  category?: MenuCategory;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Modifier {
  id: string;
  modifierCategoryId: string;
  companyId: string;
  name: {
    en?: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  basePrice: number;
  pricing: {
    default?: number;
    uber_eats?: number;
    doordash?: number;
    website?: number;
    talabat?: number;
    careem?: number;
    call_center?: number;
    [key: string]: number | undefined;
  };
  cost: number;
  status: number;
  displayNumber: number;
  categoryName?: any; // For availability display
}

export interface ModifierCategory {
  id: string;
  companyId: string;
  name: {
    en?: string;
    ar?: string;
  };
  description?: {
    en?: string;
    ar?: string;
  };
  displayNumber: number;
  image?: string;
  modifiers: Modifier[];
}

// Promotion Types with Correct Business Logic (Markup not Discount)
export interface Promotion {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  promotionType: 'selective_product' | 'category' | 'all_menu';
  startDate: string;
  endDate: string;
  isActive: boolean;
  autoRevert: boolean;
  platforms: string[];
  minProfitMargin: number;
}

export interface PromotionProduct {
  id: string;
  promotionId: string;
  productId: string;
  baseDiscountType: 'percentage' | 'fixed';
  baseDiscountValue: number;
  product: MenuProduct;
}

export interface PromotionModifierMarkup {
  id: string;
  promotionId: string;
  productId: string;
  modifierId: string;
  markupPercentage: number; // +25% markup to compensate for discounts
  originalPrice: number;
  markedUpPrice: number;
  profitMargin?: number;
  businessReason?: string;
}

// API Response Types
export interface MenuProductsResponse {
  products: MenuProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
  status?: number;
  tags?: string[];
}

// UI State Types
export interface ProductGridState {
  products: MenuProduct[];
  loading: boolean;
  error?: string;
  filters: ProductFilters;
  selectedProducts: string[];
}

// Performance Monitoring
export interface PerformanceMetrics {
  productsLoaded: number;
  renderTime: number;
  memoryUsage: number;
  scrollPerformance: number;
  cacheHitRate: number;
}

// ========================
// AVAILABILITY SYSTEM TYPES
// ========================

export enum ConnectedType {
  PRODUCT = 'product',
  MODIFIER = 'modifier',
  CATEGORY = 'category'
}

export enum AvailabilityChangeType {
  STATUS_CHANGE = 'status_change',
  STOCK_UPDATE = 'stock_update',
  PRICE_CHANGE = 'price_change',
  SCHEDULE_UPDATE = 'schedule_update',
  BULK_OPERATION = 'bulk_operation',
  TEMPLATE_APPLIED = 'template_applied'
}

export enum AlertType {
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  PRICING_SYNC_FAILED = 'pricing_sync_failed',
  SCHEDULE_CONFLICT = 'schedule_conflict',
  INVENTORY_MISMATCH = 'inventory_mismatch',
  PLATFORM_SYNC_ERROR = 'platform_sync_error'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TemplateType {
  SEASONAL = 'seasonal',
  HOLIDAY = 'holiday',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SPECIAL_EVENT = 'special_event'
}

// Platform-specific pricing
export interface PlatformPricing {
  talabat?: number;
  careem?: number;
  website?: number;
  call_center?: number;
  uber_eats?: number;
  deliveroo?: number;
  [key: string]: number | undefined;
}

// Branch availability for products and modifiers
export interface BranchAvailability {
  id: string;
  connectedId: string;
  connectedType: ConnectedType;
  branchId: string;
  companyId: string;
  isInStock: boolean;
  isActive: boolean;
  stockLevel?: number;
  lowStockThreshold?: number;
  prices: PlatformPricing;
  taxes?: Record<string, any>;
  availableFrom?: string; // "06:00"
  availableTo?: string;   // "23:30"
  availableDays: string[]; // ["monday", "tuesday", ...]
  lastStockUpdate?: string;
  notes?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Relations
  branch?: {
    id: string;
    name: string;
    nameAr: string;
    isActive: boolean;
  };
  connectedItem?: MenuProduct | Modifier; // The actual product/modifier
}

// Availability filters
export interface AvailabilityFilters {
  search?: string;
  branchId?: string;
  branchIds?: string[];
  connectedType?: ConnectedType;
  categoryId?: string;
  isInStock?: boolean;
  isActive?: boolean;
  hasLowStock?: boolean;
  minStockLevel?: number;
  maxStockLevel?: number;
  platforms?: string[];
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  sortBy?: 'name' | 'stock_level' | 'priority' | 'updated_at' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  companyId?: string;
}

// Quick filter presets
export interface QuickFilters {
  outOfStock?: boolean;
  lowStock?: boolean;
  inactive?: boolean;
  noPricing?: boolean;
  scheduledUnavailable?: boolean;
  preset?: 'all' | 'available' | 'issues' | 'review_needed';
}

// Availability response with pagination
export interface AvailabilityResponse {
  items: BranchAvailability[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

// Availability templates for bulk operations
export interface AvailabilityTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  templateType: TemplateType;
  configuration: TemplateConfiguration;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  recurringPattern?: Record<string, any>;
  lastAppliedAt?: string;
  appliedCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TemplateConfiguration {
  isInStock?: boolean;
  isActive?: boolean;
  stockLevel?: number;
  lowStockThreshold?: number;
  prices?: PlatformPricing;
  taxes?: Record<string, any>;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  priority?: number;
  recurringPattern?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    interval?: number;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    endDate?: string;
  };
}

// Availability alerts
export interface AvailabilityAlert {
  id: string;
  companyId: string;
  branchId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  connectedId?: string;
  connectedType?: ConnectedType;
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  channels: string[];
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  branch?: {
    id: string;
    name: string;
    nameAr: string;
  };
}

// Alert statistics
export interface AlertStats {
  totals: {
    total: number;
    unread: number;
    unresolved: number;
    critical: number;
  };
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

// Bulk operations
export interface BulkAvailabilityUpdate {
  availabilityIds: string[];
  isInStock?: boolean;
  isActive?: boolean;
  stockLevel?: number;
  prices?: PlatformPricing;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  priority?: number;
  changeReason?: string;
}

export interface BulkCreateAvailability {
  connectedIds: string[];
  connectedType: ConnectedType;
  branchIds: string[];
  isInStock?: boolean;
  isActive?: boolean;
  stockLevel?: number;
  prices?: PlatformPricing;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  notes?: string;
}

// UI State for availability management
export interface AvailabilityGridState {
  items: BranchAvailability[];
  loading: boolean;
  error?: string;
  filters: AvailabilityFilters;
  selectedItems: string[];
  quickStats: {
    totalItems: number;
    activeItems: number;
    outOfStockItems: number;
    lowStockItems: number;
    availabilityRate: number;
  };
}

// Branch selection state
export interface BranchSelectionState {
  selectedBranches: string[];
  allBranches: Array<{
    id: string;
    name: string;
    nameAr: string;
    isActive: boolean;
    itemCount?: number;
  }>;
  comparisonMode: boolean;
  bulkActionMode: boolean;
}

// Analytics for availability
export interface AvailabilityAnalytics {
  overview: {
    totalItems: number;
    activeItems: number;
    outOfStockItems: number;
    lowStockItems: number;
    availabilityRate: number;
  };
  branchAnalytics?: {
    branchId: string;
    totalItems: number;
    activeItems: number;
    inStockItems: number;
    outOfStockItems: number;
    lowStockItems: number;
    platformCoverage: {
      talabat: number;
      careem: number;
      website: number;
      call_center: number;
      [key: string]: number;
    };
  };
}

// Extended menu types with availability
export interface MenuProductWithAvailability extends MenuProduct {
  availability?: BranchAvailability[];
  currentBranchAvailability?: BranchAvailability;
  availabilityStats?: {
    totalBranches: number;
    availableBranches: number;
    inStockBranches: number;
  };
}

export interface ModifierWithAvailability extends Modifier {
  availability?: BranchAvailability[];
  currentBranchAvailability?: BranchAvailability;
  availabilityStats?: {
    totalBranches: number;
    availableBranches: number;
    inStockBranches: number;
  };
}