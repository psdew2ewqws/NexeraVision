export enum SupportedProvider {
  CAREEM = 'careem',
  TALABAT = 'talabat',
  DELIVEROO = 'deliveroo',
  JAHEZ = 'jahez',
  UBER_EATS = 'uber_eats',
  FOODPANDA = 'foodpanda',
  POS_SYSTEM = 'pos_system',
}

export enum WebhookEventType {
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_PREPARED = 'order.prepared',
  ORDER_PICKED_UP = 'order.picked_up',

  // Menu events
  MENU_UPDATED = 'menu.updated',
  ITEM_AVAILABILITY_CHANGED = 'item.availability_changed',

  // System events
  CONNECTION_TEST = 'connection.test',
  SYSTEM_ALERT = 'system.alert',

  // Provider specific events
  CAREEM_ORDER_NOTIFICATION = 'careem.order_notification',
  TALABAT_STATUS_UPDATE = 'talabat.status_update',
  DELIVEROO_ORDER_EVENT = 'deliveroo.order_event',
  JAHEZ_ORDER_ACTION = 'jahez.order_action',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
}

export interface WebhookHeader {
  name: string;
  value: string;
}

export interface WebhookRetryConfig {
  maxRetries: number;
  exponentialBackoff: boolean;
  initialDelay: number;
  maxDelay: number;
}

export interface WebhookConfig {
  id: string;
  clientId: string;
  provider: SupportedProvider;
  url: string;
  events: WebhookEventType[];
  headers?: WebhookHeader[];
  retryConfig?: WebhookRetryConfig;
  description?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  timeoutMs: number;
  enableSignatureValidation: boolean;
  secretKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterWebhookDto {
  clientId: string;
  provider: SupportedProvider;
  url: string;
  events: WebhookEventType[];
  headers?: WebhookHeader[];
  retryConfig?: WebhookRetryConfig;
  description?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
  timeoutMs?: number;
  enableSignatureValidation?: boolean;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  provider: SupportedProvider;
  clientId: string;
  eventType: WebhookEventType;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  httpStatus?: number;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    payload: any;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  error?: string;
  responseTime: number;
  retryCount: number;
  nextRetryAt?: string;
  createdAt: string;
  processedAt?: string;
}

export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalEvents: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  byProvider: Record<SupportedProvider, {
    total: number;
    active: number;
    successRate: number;
    avgResponseTime: number;
  }>;
  recentEvents: {
    timestamp: string;
    count: number;
    successCount: number;
    errorCount: number;
  }[];
  topErrors: {
    error: string;
    count: number;
  }[];
}

export interface WebhookHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  endpoints: Record<string, 'active' | 'inactive' | 'error'>;
}

export interface WebhookFilters {
  provider?: SupportedProvider;
  clientId?: string;
  status?: 'success' | 'failed' | 'pending' | 'retrying';
  eventType?: WebhookEventType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface WebhookTestPayload {
  provider: SupportedProvider;
  clientId: string;
  eventType: WebhookEventType;
  customPayload?: any;
}

export interface RetryQueueItem {
  id: string;
  webhookId: string;
  provider: SupportedProvider;
  clientId: string;
  eventType: WebhookEventType;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  status: 'pending' | 'processing' | 'failed' | 'abandoned';
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookMetrics {
  period: '1h' | '24h' | '7d' | '30d';
  data: {
    timestamp: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  }[];
}

// Provider-specific configuration types
export interface CareemWebhookMetadata {
  careemStoreId?: string;
  branchId?: string;
  autoAcceptOrders?: boolean;
  sendOrderConfirmation?: boolean;
  defaultPrepTime?: number;
  notifyOnNewOrder?: boolean;
  notifyOnCancellation?: boolean;
  notifyOnStatusUpdate?: boolean;
  careemApiKey?: string;
  careemMerchantId?: string;
  errorWebhookUrl?: string;
  retryFailedOrders?: boolean;
  enableTestMode?: boolean;
}

export interface TalabatWebhookMetadata {
  talabatRegion?: string;
  talabatRestaurantId?: string;
  talabatBranchCode?: string;
  internalBranchId?: string;
  autoConfirmOrders?: boolean;
  requireOrderAcknowledgment?: boolean;
  orderPrepTime?: number;
  acknowledgmentTimeout?: number;
  enableMenuSync?: boolean;
  syncItemAvailability?: boolean;
  syncPricing?: boolean;
  menuSyncInterval?: string;
  talabatApiKey?: string;
  talabatWebhookSecret?: string;
  validateTalabatSignature?: boolean;
  enableDeliveryTracking?: boolean;
  sendDeliveryUpdates?: boolean;
  trackDriverLocation?: boolean;
  minimumOrderValue?: number;
  maximumOrderValue?: number;
  rejectOrdersOutsideHours?: boolean;
  enableSandboxMode?: boolean;
  logAllRequests?: boolean;
}

export interface DeliverooWebhookMetadata {
  deliverooMarket?: string;
  kitchenType?: string;
  deliverooRestaurantId?: string;
  deliverooSiteId?: string;
  autoAcceptOrders?: boolean;
  enableOrderBatching?: boolean;
  preparationTime?: number;
  pickupTime?: number;
  maxAcceptanceTime?: number;
  enableRealTimeMenu?: boolean;
  syncItemAvailability?: boolean;
  enableModifierSync?: boolean;
  enablePriceSync?: boolean;
  menuUpdateEndpoint?: string;
  deliverooApiKey?: string;
  webhookSigningSecret?: string;
  clientId?: string;
  clientSecret?: string;
  enableSignatureValidation?: boolean;
  notifyOnNewOrder?: boolean;
  notifyOnOrderCancellation?: boolean;
  notifyOnDeliveryUpdate?: boolean;
  notifyOnMenuErrors?: boolean;
  notificationEmail?: string;
  riderAssignmentMode?: string;
  deliveryRadius?: number;
  enablePreOrders?: boolean;
  enableTableService?: boolean;
  enableCollectionOrders?: boolean;
  errorCallbackUrl?: string;
  enableDetailedLogging?: boolean;
  monitoringNotes?: string;
  enableSandboxMode?: boolean;
}

export interface JahezWebhookMetadata {
  jahezCity?: string;
  businessType?: string;
  jahezRestaurantId?: string;
  commercialRegisterNumber?: string;
  restaurantNameArabic?: string;
  restaurantNameEnglish?: string;
  addressArabic?: string;
  enableArabicSupport?: boolean;
  autoConfirmOrders?: boolean;
  enableOrderScheduling?: boolean;
  preparationTime?: number;
  minimumOrderValue?: number;
  deliveryFee?: number;
  respectPrayerTimes?: boolean;
  pauseOrdersDuringPrayer?: boolean;
  enableRamadanHours?: boolean;
  jahezApiKey?: string;
  jahezWebhookSecret?: string;
  acceptCash?: boolean;
  acceptMada?: boolean;
  acceptVisa?: boolean;
  acceptSTCPay?: boolean;
  acceptApplePay?: boolean;
  acceptTamara?: boolean;
  isHalalCertified?: boolean;
  hasFoodSafetyLicense?: boolean;
  hasHealthPermit?: boolean;
  halalCertificateNumber?: string;
  enableSMSNotifications?: boolean;
  enableWhatsAppNotifications?: boolean;
  sendArabicMessages?: boolean;
  contactPhone?: string;
  deliveryRadius?: number;
  estimatedDeliveryTime?: number;
  offerExpressDelivery?: boolean;
  enableTestMode?: boolean;
  enableDebugLogging?: boolean;
}

// Form configuration types
export interface WebhookConfigurationForm {
  provider: SupportedProvider;
  url: string;
  events: WebhookEventType[];
  description?: string;
  isActive: boolean;
  timeoutMs: number;
  enableSignatureValidation: boolean;
  secretKey: string;
  retryConfig?: WebhookRetryConfig;
  headers?: WebhookHeader[];
  metadata?: CareemWebhookMetadata | TalabatWebhookMetadata | DeliverooWebhookMetadata | JahezWebhookMetadata;
}

// Test result types
export interface WebhookTestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  response?: any;
  error?: string;
  timestamp: string;
  webhookId: string;
  eventType: WebhookEventType;
}

// Event category types for UI organization
export interface WebhookEventCategory {
  name: string;
  description: string;
  events: WebhookEventType[];
  color: string;
  icon: string;
}

// Secret strength validation
export type SecretStrength = 'weak' | 'medium' | 'strong';

export interface SecretValidation {
  strength: SecretStrength;
  score: number;
  feedback: string[];
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}