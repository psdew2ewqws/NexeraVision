export interface Address {
  street: string;
  city: string;
  area: string;
  building?: string;
  floor?: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  instructions?: string;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  nameAr?: string;
  quantity: number;
  price: number;
  modifiers?: {
    id: string;
    name: string;
    price: number;
  }[];
  instructions?: string;
}

export interface StandardOrderFormat {
  orderId: string;
  branchId: string;
  companyId: string;
  customer: Customer;
  deliveryAddress: Address;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  taxes?: number;
  discount?: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'online';
  scheduledDeliveryTime?: Date;
  priority: 'normal' | 'urgent' | 'express';
  specialInstructions?: string;
  estimatedPreparationTime: number; // in minutes
}

export interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface ProviderOrderResponse {
  success: boolean;
  providerOrderId?: string;
  trackingNumber?: string;
  estimatedDeliveryTime?: Date;
  deliveryFee?: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  errorMessage?: string;
  errorCode?: string;
  webhookUrl?: string;
  trackingUrl?: string;
  driverInfo?: {
    name: string;
    phone: string;
    vehicleType?: string;
    plateNumber?: string;
    photo?: string;
  };
}

export interface CancelResponse {
  success: boolean;
  cancelledAt?: Date;
  refundAmount?: number;
  cancellationFee?: number;
  reason?: string;
  errorMessage?: string;
}

export interface OrderStatus {
  orderId: string;
  providerOrderId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  statusUpdatedAt: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  driverLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  driverInfo?: {
    name: string;
    phone: string;
    rating?: number;
    vehicleInfo?: string;
  };
  trackingUrl?: string;
  deliveryAttempts?: number;
  statusHistory: {
    status: string;
    timestamp: Date;
    notes?: string;
  }[];
}

export interface DeliveryFeeRequest {
  pickupAddress: Address;
  deliveryAddress: Address;
  orderValue: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  urgency: 'normal' | 'express' | 'scheduled';
  scheduledTime?: Date;
}

export interface DeliveryFeeResponse {
  baseFee: number;
  distanceFee: number;
  urgencyFee?: number;
  serviceFee?: number;
  totalFee: number;
  currency: string;
  estimatedDeliveryTime: number; // in minutes
  maxDeliveryDistance?: number; // in km
  availableServiceTypes: string[];
}

export interface ValidationResult {
  isValid: boolean;
  normalizedAddress?: Address;
  suggestions?: Address[];
  errorMessage?: string;
  isServiceableArea: boolean;
  estimatedDeliveryTime?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  vehicleType: string;
  plateNumber?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  isAvailable: boolean;
  estimatedArrivalTime?: number; // in minutes
}

export interface Location {
  latitude: number;
  longitude: number;
  radius?: number; // search radius in km
}

export interface TimeEstimateRequest {
  pickupAddress: Address;
  deliveryAddress: Address;
  orderPreparationTime: number; // in minutes
  priority: 'normal' | 'urgent' | 'express';
  scheduledTime?: Date;
}

export interface TimeEstimate {
  pickupTime: number; // in minutes from now
  deliveryTime: number; // in minutes from pickup
  totalTime: number; // total time from order to delivery
  factors: {
    distance: number;
    traffic: 'light' | 'moderate' | 'heavy';
    weather: 'clear' | 'rainy' | 'stormy';
    driverAvailability: 'high' | 'medium' | 'low';
  };
}

export interface WebhookPayload {
  providerOrderId: string;
  internalOrderId?: string;
  eventType: 'order_confirmed' | 'order_cancelled' | 'driver_assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  timestamp: Date;
  status: string;
  data: Record<string, any>;
  signature?: string;
}

export interface ProviderCapabilities {
  supportsBulkOrders: boolean;
  supportsScheduledDelivery: boolean;
  supportsRealTimeTracking: boolean;
  supportsDriverAssignment: boolean;
  supportsAddressValidation: boolean;
  supportsCancellation: boolean;
  supportsRefunds: boolean;
  maxOrderValue?: number;
  maxDeliveryDistance?: number; // in km
  operatingHours: {
    start: string; // HH:mm format
    end: string;
  };
  supportedPaymentMethods: ('cash' | 'card' | 'wallet' | 'online')[];
  averageDeliveryTime: number; // in minutes
  serviceFeePercentage?: number;
}

/**
 * Universal Delivery Provider Interface
 * All delivery providers must implement this interface to ensure consistency
 */
export interface DeliveryProviderInterface {
  // Provider identification
  readonly providerName: string;
  readonly providerType: string;
  readonly capabilities: ProviderCapabilities;

  // Required core methods
  authenticate(credentials: Record<string, any>): Promise<AuthResult>;
  createOrder(order: StandardOrderFormat): Promise<ProviderOrderResponse>;
  cancelOrder(providerOrderId: string, reason?: string): Promise<CancelResponse>;
  getOrderStatus(providerOrderId: string): Promise<OrderStatus>;
  calculateDeliveryFee(request: DeliveryFeeRequest): Promise<DeliveryFeeResponse>;

  // Optional enhanced methods
  validateAddress?(address: Address): Promise<ValidationResult>;
  getAvailableDrivers?(location: Location, radius?: number): Promise<Driver[]>;
  estimateDeliveryTime?(request: TimeEstimateRequest): Promise<TimeEstimate>;
  
  // Bulk operations (for high-volume restaurants)
  createBulkOrders?(orders: StandardOrderFormat[]): Promise<ProviderOrderResponse[]>;
  getBulkOrderStatus?(providerOrderIds: string[]): Promise<OrderStatus[]>;
  
  // Real-time features
  subscribeToOrderUpdates?(providerOrderId: string, callbackUrl: string): Promise<{ success: boolean }>;
  unsubscribeFromOrderUpdates?(providerOrderId: string): Promise<{ success: boolean }>;
  
  // Webhook handling
  validateWebhookSignature?(payload: string, signature: string, secret: string): boolean;
  processWebhook?(payload: WebhookPayload): Promise<{ processed: boolean; action?: string }>;
  
  // Health check and diagnostics
  healthCheck(): Promise<{ healthy: boolean; responseTime: number; details?: Record<string, any> }>;
  getProviderMetrics?(): Promise<{
    totalOrders: number;
    successRate: number;
    averageResponseTime: number;
    currentLoad: number;
  }>;
}

/**
 * Provider Configuration Interface
 */
export interface ProviderConfig {
  providerId: string;
  providerType: string;
  companyId: string;
  branchIds?: string[];
  isActive: boolean;
  priority: number;
  
  // API Configuration
  apiConfig: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // Authentication
  credentials: Record<string, any>;
  
  // Business Rules
  businessRules: {
    maxOrderValue?: number;
    minOrderValue?: number;
    maxDeliveryDistance?: number;
    serviceFee: number;
    markupPercentage?: number;
    operatingHours?: {
      start: string;
      end: string;
    };
  };
  
  // Webhook Configuration
  webhookConfig?: {
    url: string;
    secret: string;
    events: string[];
  };
}

/**
 * Provider Error Types
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public providerType: string,
    public originalError?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(providerType: string, message: string = 'Authentication failed') {
    super(message, 'AUTH_FAILED', providerType, null, true);
    this.name = 'ProviderAuthenticationError';
  }
}

export class ProviderValidationError extends ProviderError {
  constructor(providerType: string, message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', providerType);
    this.name = 'ProviderValidationError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(providerType: string, resetTime?: Date) {
    super('Rate limit exceeded', 'RATE_LIMIT', providerType, null, true);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(providerType: string, timeout: number) {
    super(`Request timeout after ${timeout}ms`, 'TIMEOUT', providerType, null, true);
    this.name = 'ProviderTimeoutError';
  }
}