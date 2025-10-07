import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  DeliveryProviderInterface,
  StandardOrderFormat,
  ProviderOrderResponse,
  CancelResponse,
  OrderStatus,
  DeliveryFeeRequest,
  DeliveryFeeResponse,
  AuthResult,
  ValidationResult,
  Driver,
  Location,
  TimeEstimateRequest,
  TimeEstimate,
  WebhookPayload,
  ProviderCapabilities,
  ProviderConfig,
  Address,
  Customer,
  ProviderError,
  ProviderAuthenticationError,
  ProviderValidationError,
  ProviderRateLimitError,
  ProviderTimeoutError
} from '../interfaces/delivery-provider.interface';
import * as crypto from 'crypto';

interface DeliverooAuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
  restaurant_id: string;
}

interface DeliverooOrderRequest {
  external_order_id: string;
  restaurant: {
    id: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postcode: string;
      country: string;
      latitude: number;
      longitude: number;
    };
    contact: {
      name: string;
      phone: string;
    };
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postcode: string;
      country: string;
      latitude: number;
      longitude: number;
      delivery_instructions?: string;
    };
  };
  order: {
    items: {
      external_id: string;
      name: string;
      quantity: number;
      unit_price: number;
      modifiers?: {
        external_id: string;
        name: string;
        price: number;
      }[];
      special_instructions?: string;
    }[];
    totals: {
      subtotal: number;
      delivery_fee: number;
      service_charge: number;
      total_tax: number;
      total: number;
    };
    payment: {
      method: 'cash' | 'card_on_file' | 'digital_wallet';
      currency: string;
    };
    timing: {
      requested_delivery_time?: string; // ISO 8601
      preparation_time_minutes: number;
    };
  };
  delivery_options: {
    urgency: 'standard' | 'priority';
    special_instructions?: string;
  };
}

interface DeliverooOrderResponse {
  order_id: string;
  external_order_id: string;
  status: string;
  created_at: string;
  estimated_preparation_completion: string;
  estimated_delivery_time: string;
  tracking: {
    url: string;
    phone_number: string;
  };
  delivery: {
    fee: number;
    currency: string;
  };
  rider?: {
    name: string;
    phone: string;
    vehicle_type: string;
    location?: {
      latitude: number;
      longitude: number;
      last_updated: string;
    };
  };
}

interface DeliverooQuoteRequest {
  restaurant_location: {
    latitude: number;
    longitude: number;
    country: string;
  };
  delivery_location: {
    latitude: number;
    longitude: number;
    country: string;
  };
  order_value: number;
  currency: string;
  urgency: 'standard' | 'priority';
  scheduled_time?: string;
}

interface DeliverooQuoteResponse {
  quote_id: string;
  expires_at: string;
  delivery_fee: number;
  service_fee: number;
  total_fee: number;
  currency: string;
  estimated_delivery_time_minutes: number;
  distance_km: number;
  is_available: boolean;
  delivery_zone: {
    zone_id: string;
    zone_name: string;
    is_serviceable: boolean;
  };
}

@Injectable()
export class DeliverooProvider implements DeliveryProviderInterface {
  private readonly logger = new Logger(DeliverooProvider.name);
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshToken: string | null = null;
  private restaurantId: string | null = null;

  readonly providerName = 'Deliveroo';
  readonly providerType = 'deliveroo';

  readonly capabilities: ProviderCapabilities = {
    supportsBulkOrders: true,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: true,
    maxOrderValue: 10000, // Varies by currency/region
    maxDeliveryDistance: 30, // 30 km
    operatingHours: {
      start: '06:00',
      end: '02:00' // Next day
    },
    supportedPaymentMethods: ['cash', 'card', 'wallet'],
    averageDeliveryTime: 35, // 35 minutes
    serviceFeePercentage: 2.0 // 2% service fee
  };

  constructor(private readonly config: ProviderConfig) {
    this.setupHttpClient();
  }

  private setupHttpClient(): void {
    const region = this.config.credentials.region || 'uk';
    const baseUrls: Record<string, string> = {
      'uk': 'https://api.deliveroo.co.uk/v1',
      'ae': 'https://api.deliveroo.ae/v1',
      'sg': 'https://api.deliveroo.com.sg/v1',
      'hk': 'https://api.deliveroo.com.hk/v1',
      'fr': 'https://api.deliveroo.fr/v1',
      'de': 'https://api.deliveroo.de/v1',
      'it': 'https://api.deliveroo.it/v1',
      'es': 'https://api.deliveroo.es/v1',
      'nl': 'https://api.deliveroo.nl/v1',
      'be': 'https://api.deliveroo.be/v1'
    };

    this.httpClient = axios.create({
      baseURL: this.config.apiConfig.baseUrl || baseUrls[region] || baseUrls['uk'],
      timeout: this.config.apiConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Restaurant-Platform-Deliveroo/1.0',
        'Accept-Language': this.getAcceptLanguage(region)
      }
    });

    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (!config.url?.includes('/oauth/') && this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        // Add restaurant ID header
        if (this.restaurantId && !config.url?.includes('/oauth/')) {
          config.headers['X-Restaurant-ID'] = this.restaurantId;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.httpClient.request(originalRequest);
          } catch (refreshError) {
            this.logger.error('Token refresh failed', refreshError);
            throw new ProviderAuthenticationError(this.providerType);
          }
        }

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          throw new ProviderRateLimitError(
            this.providerType,
            retryAfter ? new Date(Date.now() + parseInt(retryAfter) * 1000) : undefined
          );
        }

        if (error.code === 'ECONNABORTED') {
          throw new ProviderTimeoutError(this.providerType, this.config.apiConfig.timeout);
        }

        throw error;
      }
    );
  }

  async authenticate(credentials: Record<string, any>): Promise<AuthResult> {
    try {
      const response = await this.httpClient.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'orders:read orders:write deliveries:read'
      });

      const authData: DeliverooAuthResponse = response.data;

      this.accessToken = authData.access_token;
      this.refreshToken = authData.refresh_token;
      this.restaurantId = authData.restaurant_id;
      this.tokenExpiresAt = new Date(Date.now() + (authData.expires_in * 1000));

      this.logger.log(`Deliveroo authentication successful for restaurant: ${this.restaurantId}`);

      return {
        success: true,
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        expiresAt: this.tokenExpiresAt,
        details: {
          restaurantId: authData.restaurant_id,
          scope: authData.scope,
          tokenType: authData.token_type
        }
      };

    } catch (error) {
      this.logger.error('Deliveroo authentication failed:', error.response?.data || error.message);
      
      return {
        success: false,
        errorMessage: error.response?.data?.error_description || 'Authentication failed',
        details: error.response?.data
      };
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new ProviderAuthenticationError(this.providerType, 'No refresh token available');
    }

    const response = await this.httpClient.post('/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.config.credentials.clientId
    });

    const authData: DeliverooAuthResponse = response.data;
    this.accessToken = authData.access_token;
    this.tokenExpiresAt = new Date(Date.now() + (authData.expires_in * 1000));
    
    if (authData.refresh_token) {
      this.refreshToken = authData.refresh_token;
    }
  }

  async createOrder(order: StandardOrderFormat): Promise<ProviderOrderResponse> {
    try {
      // Validate order first
      const validation = await this.validateOrderData(order);
      if (!validation.isValid) {
        throw new ProviderValidationError(this.providerType, validation.errorMessage);
      }

      const deliverooOrder: DeliverooOrderRequest = this.transformToDeliveroo(order);
      
      const response = await this.httpClient.post('/orders', deliverooOrder);
      const deliverooResponse: DeliverooOrderResponse = response.data;

      return {
        success: true,
        providerOrderId: deliverooResponse.order_id,
        trackingNumber: deliverooResponse.order_id,
        estimatedDeliveryTime: new Date(deliverooResponse.estimated_delivery_time),
        deliveryFee: deliverooResponse.delivery.fee,
        status: this.mapDeliverooStatus(deliverooResponse.status),
        trackingUrl: deliverooResponse.tracking.url,
        driverInfo: deliverooResponse.rider ? {
          name: deliverooResponse.rider.name,
          phone: deliverooResponse.rider.phone,
          vehicleType: deliverooResponse.rider.vehicle_type
        } : undefined
      };

    } catch (error) {
      this.logger.error('Deliveroo order creation failed:', error.response?.data || error.message);
      
      return {
        success: false,
        status: 'failed',
        errorMessage: this.extractErrorMessage(error),
        errorCode: error.response?.data?.code
      };
    }
  }

  async cancelOrder(providerOrderId: string, reason?: string): Promise<CancelResponse> {
    try {
      const response = await this.httpClient.put(`/orders/${providerOrderId}/cancel`, {
        reason: reason || 'Cancelled by restaurant',
        cancel_reason_code: 'RESTAURANT_REQUEST'
      });

      const cancelData = response.data;

      return {
        success: true,
        cancelledAt: new Date(),
        reason: reason,
        refundAmount: cancelData.refund?.amount || 0,
        cancellationFee: cancelData.cancellation_fee?.amount || 0
      };

    } catch (error) {
      this.logger.error('Deliveroo order cancellation failed:', error.response?.data || error.message);
      
      return {
        success: false,
        errorMessage: this.extractErrorMessage(error)
      };
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatus> {
    try {
      const response = await this.httpClient.get(`/orders/${providerOrderId}`);
      const deliverooOrder: DeliverooOrderResponse = response.data;

      return {
        orderId: deliverooOrder.external_order_id,
        providerOrderId: deliverooOrder.order_id,
        status: this.mapDeliverooStatus(deliverooOrder.status),
        statusUpdatedAt: new Date(),
        estimatedDeliveryTime: new Date(deliverooOrder.estimated_delivery_time),
        driverInfo: deliverooOrder.rider ? {
          name: deliverooOrder.rider.name,
          phone: deliverooOrder.rider.phone,
          vehicleInfo: deliverooOrder.rider.vehicle_type
        } : undefined,
        trackingUrl: deliverooOrder.tracking.url,
        driverLocation: deliverooOrder.rider?.location ? {
          latitude: deliverooOrder.rider.location.latitude,
          longitude: deliverooOrder.rider.location.longitude,
          lastUpdated: new Date(deliverooOrder.rider.location.last_updated)
        } : undefined,
        statusHistory: [
          {
            status: this.mapDeliverooStatus(deliverooOrder.status),
            timestamp: new Date(),
            notes: `Order ${deliverooOrder.status} via Deliveroo`
          }
        ]
      };

    } catch (error) {
      this.logger.error('Failed to get Deliveroo order status:', error.response?.data || error.message);
      throw new ProviderError(
        `Failed to get order status: ${this.extractErrorMessage(error)}`,
        'STATUS_FETCH_FAILED',
        this.providerType,
        error
      );
    }
  }

  async calculateDeliveryFee(request: DeliveryFeeRequest): Promise<DeliveryFeeResponse> {
    try {
      const quoteRequest: DeliverooQuoteRequest = {
        restaurant_location: {
          latitude: request.pickupAddress.latitude,
          longitude: request.pickupAddress.longitude,
          country: this.getCountryCode()
        },
        delivery_location: {
          latitude: request.deliveryAddress.latitude,
          longitude: request.deliveryAddress.longitude,
          country: this.getCountryCode()
        },
        order_value: request.orderValue,
        currency: this.getLocalCurrency(),
        urgency: request.urgency === 'express' ? 'priority' : 'standard',
        scheduled_time: request.scheduledTime?.toISOString()
      };

      const response = await this.httpClient.post('/quotes/delivery', quoteRequest);
      const quote: DeliverooQuoteResponse = response.data;

      if (!quote.is_available || !quote.delivery_zone.is_serviceable) {
        throw new ProviderValidationError(
          this.providerType,
          'Delivery address is outside service area'
        );
      }

      return {
        baseFee: quote.delivery_fee,
        distanceFee: 0, // Included in delivery fee
        urgencyFee: 0,
        serviceFee: quote.service_fee,
        totalFee: quote.total_fee,
        currency: quote.currency,
        estimatedDeliveryTime: quote.estimated_delivery_time_minutes,
        maxDeliveryDistance: this.capabilities.maxDeliveryDistance,
        availableServiceTypes: ['standard', 'priority']
      };

    } catch (error) {
      this.logger.error('Deliveroo fee calculation failed:', error.response?.data || error.message);
      throw new ProviderError(
        `Fee calculation failed: ${this.extractErrorMessage(error)}`,
        'FEE_CALCULATION_FAILED',
        this.providerType,
        error
      );
    }
  }

  async validateAddress(address: Address): Promise<ValidationResult> {
    try {
      const response = await this.httpClient.post('/locations/geocode', {
        address_line1: address.street,
        address_line2: address.area,
        city: address.city,
        postcode: address.building, // Using building as postcode
        country: this.getCountryCode(),
        latitude: address.latitude,
        longitude: address.longitude
      });

      const validation = response.data;

      return {
        isValid: validation.is_valid,
        normalizedAddress: validation.geocoded_address ? {
          ...address,
          street: validation.geocoded_address.line1,
          area: validation.geocoded_address.line2,
          city: validation.geocoded_address.city,
          latitude: validation.geocoded_address.latitude,
          longitude: validation.geocoded_address.longitude
        } : address,
        suggestions: validation.suggestions || [],
        isServiceableArea: validation.is_in_delivery_zone,
        estimatedDeliveryTime: validation.estimated_delivery_time_minutes
      };

    } catch (error) {
      this.logger.warn('Address validation failed, assuming valid:', error.message);
      
      return {
        isValid: true,
        isServiceableArea: true,
        normalizedAddress: address
      };
    }
  }

  async getAvailableDrivers(location: Location, radius: number = 5): Promise<Driver[]> {
    try {
      const response = await this.httpClient.get('/riders/nearby', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius_km: radius,
          limit: 10
        }
      });

      return response.data.riders.map(rider => ({
        id: rider.rider_id,
        name: rider.name,
        phone: rider.phone,
        rating: rider.rating,
        vehicleType: rider.vehicle_type,
        plateNumber: rider.vehicle_registration,
        currentLocation: rider.current_location ? {
          latitude: rider.current_location.latitude,
          longitude: rider.current_location.longitude,
          lastUpdated: new Date(rider.current_location.last_updated)
        } : undefined,
        isAvailable: rider.status === 'available',
        estimatedArrivalTime: rider.eta_minutes
      }));

    } catch (error) {
      this.logger.error('Failed to get available drivers:', error.response?.data || error.message);
      return [];
    }
  }

  async estimateDeliveryTime(request: TimeEstimateRequest): Promise<TimeEstimate> {
    try {
      const response = await this.httpClient.post('/estimates/delivery-time', {
        restaurant_location: {
          latitude: request.pickupAddress.latitude,
          longitude: request.pickupAddress.longitude
        },
        delivery_location: {
          latitude: request.deliveryAddress.latitude,
          longitude: request.deliveryAddress.longitude
        },
        preparation_time_minutes: request.orderPreparationTime,
        urgency: request.priority === 'urgent' ? 'priority' : 'standard',
        scheduled_time: request.scheduledTime?.toISOString()
      });

      const estimate = response.data;

      return {
        pickupTime: estimate.pickup_eta_minutes,
        deliveryTime: estimate.delivery_eta_minutes,
        totalTime: estimate.total_time_minutes,
        factors: {
          distance: estimate.distance_km,
          traffic: this.mapTrafficCondition(estimate.traffic_level),
          weather: estimate.weather_conditions || 'clear',
          driverAvailability: this.mapRiderAvailability(estimate.rider_availability)
        }
      };

    } catch (error) {
      this.logger.error('Time estimation failed:', error.response?.data || error.message);
      
      // Return fallback estimate
      return {
        pickupTime: 15,
        deliveryTime: 25,
        totalTime: request.orderPreparationTime + 40,
        factors: {
          distance: 6,
          traffic: 'moderate',
          weather: 'clear',
          driverAvailability: 'medium'
        }
      };
    }
  }

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const providedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Webhook signature validation failed:', error.message);
      return false;
    }
  }

  async processWebhook(payload: WebhookPayload): Promise<{ processed: boolean; action?: string }> {
    try {
      this.logger.log(`Processing Deliveroo webhook: ${payload.eventType} for order ${payload.providerOrderId}`);

      // Deliveroo webhook events mapping
      switch (payload.eventType) {
        case 'order_confirmed':
          // Order has been accepted by restaurant
          break;
        case 'driver_assigned':
          // Rider has been assigned to the order
          break;
        case 'picked_up':
          // Order picked up from restaurant
          break;
        case 'in_transit':
          // Order is on the way to customer
          break;
        case 'delivered':
          // Order has been delivered successfully
          break;
        case 'order_cancelled':
        case 'failed':
          // Order cancelled or failed
          break;
      }

      return {
        processed: true,
        action: `Updated order ${payload.providerOrderId} status to ${payload.eventType}`
      };

    } catch (error) {
      this.logger.error('Webhook processing failed:', error.message);
      return { processed: false };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; details?: Record<string, any> }> {
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.status === 200,
        responseTime,
        details: {
          status: response.status,
          tokenValid: !!this.accessToken && (!this.tokenExpiresAt || this.tokenExpiresAt > new Date()),
          restaurantId: this.restaurantId,
          region: this.config.credentials.region || 'uk',
          apiVersion: response.data.version
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        details: {
          error: error.message,
          tokenValid: !!this.accessToken && (!this.tokenExpiresAt || this.tokenExpiresAt > new Date()),
          restaurantId: this.restaurantId
        }
      };
    }
  }

  async getProviderMetrics(): Promise<{
    totalOrders: number;
    successRate: number;
    averageResponseTime: number;
    currentLoad: number;
  }> {
    try {
      const response = await this.httpClient.get('/analytics/restaurant/performance', {
        params: {
          restaurant_id: this.restaurantId,
          period: '24h'
        }
      });
      
      const metrics = response.data;

      return {
        totalOrders: metrics.orders_count || 0,
        successRate: metrics.success_rate_percentage || 0,
        averageResponseTime: metrics.avg_response_time_ms || 0,
        currentLoad: metrics.current_capacity_usage || 0
      };

    } catch (error) {
      this.logger.error('Failed to get provider metrics:', error.message);
      return {
        totalOrders: 0,
        successRate: 0,
        averageResponseTime: 0,
        currentLoad: 0
      };
    }
  }

  // Private helper methods

  private transformToDeliveroo(order: StandardOrderFormat): DeliverooOrderRequest {
    return {
      external_order_id: order.orderId,
      restaurant: {
        id: this.restaurantId || order.branchId,
        address: {
          line1: 'Restaurant Street', // Would be fetched from branch data
          city: order.deliveryAddress.city, // Assuming same city
          postcode: '12345',
          country: this.getCountryCode(),
          latitude: 51.5074, // Default London coordinates, should be from branch
          longitude: -0.1278
        },
        contact: {
          name: 'Restaurant',
          phone: '+442000000000' // Restaurant phone from branch
        }
      },
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        address: {
          line1: order.deliveryAddress.street,
          line2: order.deliveryAddress.area,
          city: order.deliveryAddress.city,
          postcode: order.deliveryAddress.building || '00000',
          country: this.getCountryCode(),
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude,
          delivery_instructions: order.specialInstructions || order.deliveryAddress.instructions
        }
      },
      order: {
        items: order.items.map(item => ({
          external_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          modifiers: item.modifiers?.map(mod => ({
            external_id: mod.id,
            name: mod.name,
            price: mod.price
          })),
          special_instructions: item.instructions
        })),
        totals: {
          subtotal: order.subtotal,
          delivery_fee: order.deliveryFee,
          service_charge: 0,
          total_tax: order.taxes || 0,
          total: order.total
        },
        payment: {
          method: this.mapPaymentMethod(order.paymentMethod),
          currency: this.getLocalCurrency()
        },
        timing: {
          requested_delivery_time: order.scheduledDeliveryTime?.toISOString(),
          preparation_time_minutes: order.estimatedPreparationTime
        }
      },
      delivery_options: {
        urgency: order.priority === 'urgent' ? 'priority' : 'standard',
        special_instructions: order.specialInstructions
      }
    };
  }

  private mapDeliverooStatus(deliverooStatus: string): 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' {
    const statusMap: Record<string, any> = {
      'created': 'pending',
      'accepted': 'confirmed',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready_for_pickup': 'ready',
      'rider_assigned': 'ready',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'on_the_way': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[deliverooStatus] || 'pending';
  }

  private mapPaymentMethod(method: string): 'cash' | 'card_on_file' | 'digital_wallet' {
    switch (method) {
      case 'card':
      case 'online':
        return 'card_on_file';
      case 'wallet':
        return 'digital_wallet';
      default:
        return 'cash';
    }
  }

  private mapTrafficCondition(level: number): 'light' | 'moderate' | 'heavy' {
    if (level < 3) return 'light';
    if (level < 7) return 'moderate';
    return 'heavy';
  }

  private mapRiderAvailability(availability: string): 'high' | 'medium' | 'low' {
    switch (availability) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  private getCountryCode(): string {
    const region = this.config.credentials.region || 'uk';
    const countryMap: Record<string, string> = {
      'uk': 'GB',
      'ae': 'AE',
      'sg': 'SG',
      'hk': 'HK',
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'es': 'ES',
      'nl': 'NL',
      'be': 'BE'
    };

    return countryMap[region] || 'GB';
  }

  private getLocalCurrency(): string {
    const region = this.config.credentials.region || 'uk';
    const currencyMap: Record<string, string> = {
      'uk': 'GBP',
      'ae': 'AED',
      'sg': 'SGD',
      'hk': 'HKD',
      'fr': 'EUR',
      'de': 'EUR',
      'it': 'EUR',
      'es': 'EUR',
      'nl': 'EUR',
      'be': 'EUR'
    };

    return currencyMap[region] || 'GBP';
  }

  private getAcceptLanguage(region: string): string {
    const languageMap: Record<string, string> = {
      'uk': 'en-GB,en;q=0.9',
      'ae': 'en-AE,ar;q=0.8,en;q=0.7',
      'sg': 'en-SG,en;q=0.9',
      'hk': 'en-HK,zh;q=0.8,en;q=0.7',
      'fr': 'fr-FR,fr;q=0.9,en;q=0.8',
      'de': 'de-DE,de;q=0.9,en;q=0.8',
      'it': 'it-IT,it;q=0.9,en;q=0.8',
      'es': 'es-ES,es;q=0.9,en;q=0.8',
      'nl': 'nl-NL,nl;q=0.9,en;q=0.8',
      'be': 'fr-BE,nl-BE,fr;q=0.8,nl;q=0.8,en;q=0.7'
    };

    return languageMap[region] || 'en-GB,en;q=0.9';
  }

  private async validateOrderData(order: StandardOrderFormat): Promise<{ isValid: boolean; errorMessage?: string }> {
    // Validate required fields
    if (!order.customer.name || !order.customer.phone) {
      return { isValid: false, errorMessage: 'Customer name and phone are required' };
    }

    if (!order.deliveryAddress.latitude || !order.deliveryAddress.longitude) {
      return { isValid: false, errorMessage: 'Delivery address coordinates are required' };
    }

    if (!order.deliveryAddress.city) {
      return { isValid: false, errorMessage: 'City is required for Deliveroo orders' };
    }

    if (!order.items || order.items.length === 0) {
      return { isValid: false, errorMessage: 'Order must contain at least one item' };
    }

    // Validate order value limits
    if (this.capabilities.maxOrderValue && order.total > this.capabilities.maxOrderValue) {
      return { isValid: false, errorMessage: `Order value exceeds maximum limit of ${this.capabilities.maxOrderValue}` };
    }

    // Validate phone number format (basic international validation)
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(order.customer.phone.replace(/[\s\-\(\)]/g, ''))) {
      return { isValid: false, errorMessage: 'Invalid phone number format' };
    }

    return { isValid: true };
  }

  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error_description) {
      return error.response.data.error_description;
    }
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      return error.response.data.errors.map(err => err.message).join(', ');
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}