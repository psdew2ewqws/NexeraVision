/**
 * Order Event Types for Real-time WebSocket Updates
 *
 * These events are emitted through the WebSocket gateway and EventEmitter2
 * to provide real-time updates to connected clients about order lifecycle changes.
 */

export enum OrderEvents {
  // Order Lifecycle Events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_PREPARING = 'order.preparing',
  ORDER_READY = 'order.ready',
  ORDER_PICKED_UP = 'order.picked_up',
  ORDER_IN_DELIVERY = 'order.in_delivery',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_FAILED = 'order.failed',

  // Payment Events
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_PROCESSING = 'payment.processing',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',

  // Provider-specific Events
  PROVIDER_ORDER_RECEIVED = 'provider.order.received',
  PROVIDER_ORDER_ACCEPTED = 'provider.order.accepted',
  PROVIDER_ORDER_REJECTED = 'provider.order.rejected',
  PROVIDER_ORDER_MODIFIED = 'provider.order.modified',

  // Real-time Updates
  ORDER_STATUS_CHANGED = 'order.status.changed',
  ORDER_LOCATION_UPDATED = 'order.location.updated',
  ORDER_ETA_UPDATED = 'order.eta.updated',

  // Analytics Events
  ANALYTICS_ORDER_VOLUME_UPDATED = 'analytics.order.volume.updated',
  ANALYTICS_REVENUE_UPDATED = 'analytics.revenue.updated',
  ANALYTICS_METRICS_REFRESHED = 'analytics.metrics.refreshed',

  // System Events
  WEBHOOK_RECEIVED = 'webhook.received',
  WEBHOOK_PROCESSED = 'webhook.processed',
  WEBHOOK_FAILED = 'webhook.failed',

  // Error Events
  ORDER_ERROR = 'order.error',
  SYSTEM_ERROR = 'system.error',
  INTEGRATION_ERROR = 'integration.error',
}

/**
 * Event Payload Interfaces
 */

export interface BaseOrderEvent {
  orderId: string;
  externalOrderId: string;
  provider: string;
  clientId: string;
  timestamp: Date;
  eventType: OrderEvents;
}

export interface OrderCreatedEvent extends BaseOrderEvent {
  eventType: OrderEvents.ORDER_CREATED;
  orderData: {
    customerName?: string;
    customerPhone?: string;
    totalAmount: number;
    currency: string;
    items: any[];
    deliveryAddress?: any;
  };
}

export interface OrderStatusChangedEvent extends BaseOrderEvent {
  eventType: OrderEvents.ORDER_STATUS_CHANGED;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  estimatedDeliveryTime?: Date;
}

export interface PaymentStatusChangedEvent extends BaseOrderEvent {
  eventType: OrderEvents.PAYMENT_COMPLETED | OrderEvents.PAYMENT_FAILED | OrderEvents.PAYMENT_REFUNDED;
  paymentData: {
    paymentMethod?: string;
    amount: number;
    currency: string;
    transactionId?: string;
    reason?: string;
  };
}

export interface OrderLocationUpdateEvent extends BaseOrderEvent {
  eventType: OrderEvents.ORDER_LOCATION_UPDATED;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  driverInfo?: {
    name: string;
    phone: string;
    vehicleInfo?: string;
  };
}

export interface OrderETAUpdateEvent extends BaseOrderEvent {
  eventType: OrderEvents.ORDER_ETA_UPDATED;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  delayReason?: string;
}

export interface AnalyticsEvent {
  eventType: OrderEvents.ANALYTICS_ORDER_VOLUME_UPDATED | OrderEvents.ANALYTICS_REVENUE_UPDATED | OrderEvents.ANALYTICS_METRICS_REFRESHED;
  provider?: string;
  clientId?: string;
  timestamp: Date;
  data: {
    metric: string;
    value: number;
    period: string;
    previousValue?: number;
    changePercentage?: number;
  };
}

export interface WebhookEvent {
  eventType: OrderEvents.WEBHOOK_RECEIVED | OrderEvents.WEBHOOK_PROCESSED | OrderEvents.WEBHOOK_FAILED;
  webhookId: string;
  provider: string;
  clientId: string;
  timestamp: Date;
  payload?: any;
  error?: string;
  processingTime?: number;
}

export interface SystemErrorEvent {
  eventType: OrderEvents.SYSTEM_ERROR | OrderEvents.INTEGRATION_ERROR | OrderEvents.ORDER_ERROR;
  timestamp: Date;
  error: {
    message: string;
    code?: string;
    stack?: string;
    context?: any;
  };
  orderId?: string;
  provider?: string;
  clientId?: string;
}

/**
 * WebSocket Room Types for Client Subscriptions
 */
export enum SocketRooms {
  // Global rooms
  ALL_ORDERS = 'orders:all',
  ALL_ANALYTICS = 'analytics:all',
  ALL_WEBHOOKS = 'webhooks:all',

  // Provider-specific rooms
  PROVIDER_ORDERS = 'orders:provider:',  // Append provider name
  PROVIDER_ANALYTICS = 'analytics:provider:',  // Append provider name

  // Client-specific rooms
  CLIENT_ORDERS = 'orders:client:',  // Append client ID
  CLIENT_ANALYTICS = 'analytics:client:',  // Append client ID

  // Order-specific rooms
  ORDER_UPDATES = 'order:',  // Append order ID

  // System rooms
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_ERRORS = 'system:errors',
}

/**
 * Event Priority Levels for Processing
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Event Configuration for Different Event Types
 */
export const EVENT_CONFIG = {
  [OrderEvents.ORDER_CREATED]: {
    priority: EventPriority.HIGH,
    rooms: [SocketRooms.ALL_ORDERS],
    persistToDb: true,
    notifyAnalytics: true,
  },
  [OrderEvents.ORDER_STATUS_CHANGED]: {
    priority: EventPriority.HIGH,
    rooms: [SocketRooms.ALL_ORDERS],
    persistToDb: true,
    notifyAnalytics: true,
  },
  [OrderEvents.ORDER_DELIVERED]: {
    priority: EventPriority.CRITICAL,
    rooms: [SocketRooms.ALL_ORDERS],
    persistToDb: true,
    notifyAnalytics: true,
  },
  [OrderEvents.PAYMENT_COMPLETED]: {
    priority: EventPriority.CRITICAL,
    rooms: [SocketRooms.ALL_ORDERS],
    persistToDb: true,
    notifyAnalytics: true,
  },
  [OrderEvents.ORDER_LOCATION_UPDATED]: {
    priority: EventPriority.NORMAL,
    rooms: [],  // Only to specific order room
    persistToDb: false,
    notifyAnalytics: false,
  },
  [OrderEvents.ANALYTICS_METRICS_REFRESHED]: {
    priority: EventPriority.LOW,
    rooms: [SocketRooms.ALL_ANALYTICS],
    persistToDb: false,
    notifyAnalytics: false,
  },
  [OrderEvents.SYSTEM_ERROR]: {
    priority: EventPriority.CRITICAL,
    rooms: [SocketRooms.SYSTEM_ERRORS],
    persistToDb: true,
    notifyAnalytics: false,
  },
} as const;

/**
 * Utility functions for event handling
 */
export class OrderEventUtils {
  /**
   * Get all rooms that should receive this event
   */
  static getRoomsForEvent(
    eventType: OrderEvents,
    data: { provider?: string; clientId?: string; orderId?: string }
  ): string[] {
    const baseRooms = EVENT_CONFIG[eventType]?.rooms || [];
    const rooms = [...baseRooms];

    // Add provider-specific rooms
    if (data.provider) {
      if (eventType.startsWith('order.')) {
        rooms.push(`${SocketRooms.PROVIDER_ORDERS}${data.provider}`);
      }
      if (eventType.startsWith('analytics.')) {
        rooms.push(`${SocketRooms.PROVIDER_ANALYTICS}${data.provider}`);
      }
    }

    // Add client-specific rooms
    if (data.clientId) {
      if (eventType.startsWith('order.')) {
        rooms.push(`${SocketRooms.CLIENT_ORDERS}${data.clientId}`);
      }
      if (eventType.startsWith('analytics.')) {
        rooms.push(`${SocketRooms.CLIENT_ANALYTICS}${data.clientId}`);
      }
    }

    // Add order-specific room
    if (data.orderId) {
      rooms.push(`${SocketRooms.ORDER_UPDATES}${data.orderId}`);
    }

    return rooms;
  }

  /**
   * Get event priority
   */
  static getEventPriority(eventType: OrderEvents): EventPriority {
    return EVENT_CONFIG[eventType]?.priority || EventPriority.NORMAL;
  }

  /**
   * Check if event should be persisted to database
   */
  static shouldPersistEvent(eventType: OrderEvents): boolean {
    return EVENT_CONFIG[eventType]?.persistToDb || false;
  }

  /**
   * Check if event should trigger analytics updates
   */
  static shouldNotifyAnalytics(eventType: OrderEvents): boolean {
    return EVENT_CONFIG[eventType]?.notifyAnalytics || false;
  }

  /**
   * Create room name for provider
   */
  static createProviderRoom(roomType: SocketRooms, provider: string): string {
    return `${roomType}${provider.toLowerCase()}`;
  }

  /**
   * Create room name for client
   */
  static createClientRoom(roomType: SocketRooms, clientId: string): string {
    return `${roomType}${clientId}`;
  }

  /**
   * Create room name for specific order
   */
  static createOrderRoom(orderId: string): string {
    return `${SocketRooms.ORDER_UPDATES}${orderId}`;
  }
}