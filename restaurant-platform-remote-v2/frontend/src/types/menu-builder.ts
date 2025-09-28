// Advanced Menu Builder Type Definitions
export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  isActive: boolean;
}

export interface MenuTemplate {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  categories: string[];
  previewImage?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformMenu {
  id: string;
  platformId: string;
  templateId?: string;
  name: string;
  description: string;
  categories: MenuCategory[];
  products: MenuProduct[];
  isActive: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'draft';
  lastSyncAt?: Date;
  metadata: {
    totalProducts: number;
    activeProducts: number;
    categoryCount: number;
    estimatedRevenue: number;
  };
}

export interface MenuBuilderState {
  selectedPlatform?: Platform;
  currentMenu?: PlatformMenu;
  availableProducts: MenuProduct[];
  selectedProducts: string[];
  draggedItem?: MenuProduct;
  previewMode: boolean;
  syncInProgress: boolean;
}

export interface MenuSyncEvent {
  type: 'sync_start' | 'sync_progress' | 'sync_complete' | 'sync_error';
  platformId: string;
  menuId: string;
  progress?: number;
  data?: any;
  error?: string;
}

export interface MenuAnalytics {
  platformId: string;
  menuId: string;
  metrics: {
    views: number;
    orders: number;
    revenue: number;
    topProducts: Array<{
      productId: string;
      name: string;
      orderCount: number;
      revenue: number;
    }>;
    categoryPerformance: Array<{
      categoryId: string;
      name: string;
      productCount: number;
      orderCount: number;
      conversionRate: number;
    }>;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

// Platform-specific configurations
export const PLATFORMS: Record<string, Platform> = {
  call_center: {
    id: 'call_center',
    name: 'Call Center',
    icon: 'PhoneIcon',
    color: 'blue',
    description: 'Optimized for phone orders with quick search and favorites',
    isActive: true
  },
  talabat: {
    id: 'talabat',
    name: 'Talabat',
    icon: 'TruckIcon',
    color: 'orange',
    description: 'Delivery platform integration with Talabat-specific formatting',
    isActive: true
  },
  careem: {
    id: 'careem',
    name: 'Careem Now',
    icon: 'ShoppingBagIcon',
    color: 'green',
    description: 'Careem Now delivery platform with real-time sync',
    isActive: true
  },
  website: {
    id: 'website',
    name: 'Website',
    icon: 'GlobeAltIcon',
    color: 'purple',
    description: 'Public website menu with SEO optimization',
    isActive: true
  },
  pos: {
    id: 'pos',
    name: 'POS System',
    icon: 'ComputerDesktopIcon',
    color: 'gray',
    description: 'Point-of-sale system integration',
    isActive: true
  }
};

export interface MenuBuilderSettings {
  defaultPlatform: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  enableAnalytics: boolean;
  templateLibraryEnabled: boolean;
  dragDropEnabled: boolean;
}