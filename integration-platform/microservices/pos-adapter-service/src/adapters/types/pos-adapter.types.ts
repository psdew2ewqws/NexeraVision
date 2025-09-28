export interface ConnectionConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  baseUrl?: string;
  storeId?: string;
  branchId?: string;
  tenantId?: string;
  username?: string;
  password?: string;
  applicationId?: string;
  environment?: 'production' | 'sandbox' | 'development';
  webhookSecret?: string;
  additionalConfig?: Record<string, any>;
}

export interface PosMenuItem {
  id: string;
  externalId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isAvailable: boolean;
  modifiers?: MenuModifier[];
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
  metadata?: Record<string, any>;
}

export interface MenuModifier {
  id: string;
  name: string;
  price: number;
  isRequired: boolean;
  options?: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface NutritionalInfo {
  calories?: number;
  fat?: number;
  saturatedFat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  protein?: number;
  sodium?: number;
}

export interface MenuSyncResult {
  success: boolean;
  itemsCount: number;
  items: PosMenuItem[];
  error?: string;
  lastSyncAt: Date;
  metadata?: Record<string, any>;
}

export interface PosOrder {
  id: string;
  externalId: string;
  orderNumber: string;
  status: string;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentStatus?: string;
  paymentMethod?: string;
  deliveryInfo: DeliveryInfo;
  orderedAt: Date;
  metadata?: Record<string, any>;
}

export interface CustomerInfo {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: OrderModifier[];
  instructions?: string;
}

export interface OrderModifier {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface DeliveryInfo {
  type?: string; // 'dine_in', 'takeaway', 'delivery'
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
  estimatedTime?: Date;
}

export interface OrderSyncResult {
  success: boolean;
  ordersCount: number;
  orders: PosOrder[];
  error?: string;
  lastSyncAt: Date;
  metadata?: Record<string, any>;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
  isAvailable: boolean;
  cost?: number;
  lastUpdated?: Date;
}

export interface PosWebhookEvent {
  type: 'order.created' | 'order.updated' | 'menu.updated' | 'inventory.updated';
  timestamp: Date;
  data: any;
  source: string;
}

export interface PosConnectionStatus {
  isConnected: boolean;
  lastCheck: Date;
  error?: string;
  metadata?: {
    version?: string;
    features?: string[];
    limits?: Record<string, any>;
  };
}

export interface SyncConfiguration {
  autoSync: boolean;
  syncInterval: number; // minutes
  syncTypes: ('menu' | 'orders' | 'inventory')[];
  batchSize: number;
  retryAttempts: number;
  webhookEnabled: boolean;
  filters?: {
    dateRange?: {
      from?: Date;
      to?: Date;
    };
    categories?: string[];
    status?: string[];
    branches?: string[];
  };
}

export interface AdapterCapabilities {
  supportsMenuSync: boolean;
  supportsOrderSync: boolean;
  supportsInventorySync: boolean;
  supportsOrderCreation: boolean;
  supportsWebhooks: boolean;
  supportsRealTime: boolean;
  supportsBulkOperations: boolean;
  maxBatchSize?: number;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

export interface AdapterError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

export interface SyncMetrics {
  syncId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  itemsProcessed: number;
  itemsTotal: number;
  errors: AdapterError[];
  performance: {
    averageResponseTime: number;
    throughput: number; // items per minute
  };
}