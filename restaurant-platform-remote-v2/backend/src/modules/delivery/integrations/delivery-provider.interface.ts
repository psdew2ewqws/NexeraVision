export interface DeliveryProviderConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  webhookUrl?: string;
  sandboxMode?: boolean;
  additionalHeaders?: Record<string, string>;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface DeliveryRequest {
  orderId: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
    contactName: string;
    contactPhone: string;
    instructions?: string;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address: string;
    contactName: string;
    contactPhone: string;
    instructions?: string;
  };
  orderDetails: {
    totalAmount: number;
    currency: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    specialInstructions?: string;
    preparationTime?: number;
  };
  scheduledTime?: Date;
  priority?: 'standard' | 'urgent';
}

export interface DeliveryResponse {
  success: boolean;
  providerOrderId: string;
  trackingUrl?: string;
  estimatedDeliveryTime?: number;
  deliveryFee: number;
  status: 'pending' | 'accepted' | 'rejected' | 'in_transit' | 'delivered' | 'cancelled';
  driverInfo?: {
    name: string;
    phone: string;
    vehicleType: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  error?: string;
}

export interface DeliveryStatusUpdate {
  orderId: string;
  providerOrderId: string;
  status: 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
  };
  estimatedArrival?: Date;
  driverInfo?: {
    name: string;
    phone: string;
    vehicleType: string;
  };
  reason?: string; // for cancellations or failures
}

export abstract class DeliveryProviderService {
  protected config: DeliveryProviderConfig;
  protected providerName: string;

  constructor(config: DeliveryProviderConfig, providerName: string) {
    this.config = config;
    this.providerName = providerName;
  }

  // Abstract methods that each provider must implement
  abstract createDeliveryOrder(request: DeliveryRequest): Promise<DeliveryResponse>;
  abstract cancelDeliveryOrder(orderId: string, providerOrderId: string): Promise<boolean>;
  abstract getDeliveryStatus(providerOrderId: string): Promise<DeliveryStatusUpdate>;
  abstract calculateDeliveryFee(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number): Promise<number>;
  abstract validateWebhook(payload: any, signature?: string): boolean;
  abstract processWebhookUpdate(payload: any): DeliveryStatusUpdate;

  // Common utility methods
  protected async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...this.config.additionalHeaders
    };

    const requestConfig: any = {
      method,
      headers,
      timeout: this.config.timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      requestConfig.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[${this.providerName}] API Request failed:`, error);
      throw error;
    }
  }

  protected calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}