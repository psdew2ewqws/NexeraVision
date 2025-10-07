/**
 * Provider Adapter Interface
 * Defines the contract for all delivery provider adapters
 */
export interface IProviderAdapter {
  /**
   * Provider name identifier
   */
  readonly providerName: string;

  /**
   * Extract order data from provider-specific webhook payload
   */
  extractOrder(payload: any): Promise<ProviderOrder>;

  /**
   * Map provider status to internal status
   */
  mapOrderStatus(providerStatus: string): OrderStatus;

  /**
   * Extract customer information from payload
   */
  extractCustomer(payload: any): CustomerInfo;

  /**
   * Extract delivery information from payload
   */
  extractDeliveryInfo(payload: any): DeliveryInfo;

  /**
   * Validate provider payload structure
   */
  validatePayload(payload: any): boolean;

  /**
   * Format response for provider acknowledgment
   */
  formatResponse(success: boolean, orderId?: string, error?: string): any;
}

/**
 * Unified order structure from providers
 */
export interface ProviderOrder {
  externalOrderId: string;
  branchId: string;
  customer: CustomerInfo;
  items: OrderItem[];
  delivery: DeliveryInfo;
  payment: PaymentInfo;
  totals: OrderTotals;
  notes?: string;
  scheduledAt?: Date;
  metadata: Record<string, any>;
}

/**
 * Customer information
 */
export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: Address;
}

/**
 * Address structure
 */
export interface Address {
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  city: string;
  area?: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Order item structure
 */
export interface OrderItem {
  externalId: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: ItemModifier[];
  notes?: string;
}

/**
 * Item modifier structure
 */
export interface ItemModifier {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Delivery information
 */
export interface DeliveryInfo {
  type: 'delivery' | 'pickup';
  address?: Address;
  fee: number;
  estimatedTime?: number; // in minutes
  driver?: {
    name?: string;
    phone?: string;
  };
}

/**
 * Payment information
 */
export interface PaymentInfo {
  method: 'cash' | 'card' | 'online';
  status: 'pending' | 'paid' | 'failed';
  transactionId?: string;
  amount: number;
}

/**
 * Order totals breakdown
 */
export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
}

/**
 * Internal order status enum
 */
export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}