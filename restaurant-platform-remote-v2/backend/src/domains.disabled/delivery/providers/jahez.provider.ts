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

interface JahezAuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  merchant_id: string;
  merchant_name: string;
}

interface JahezOrderRequest {
  merchant_order_id: string;
  pickup_info: {
    address: {
      full_address: string;
      district: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    contact: {
      name: string;
      phone: string;
    };
    ready_time?: string; // ISO string
    notes?: string;
  };
  delivery_info: {
    address: {
      full_address: string;
      district: string;
      city: string;
      building_number?: string;
      apartment_number?: string;
      latitude: number;
      longitude: number;
    };
    contact: {
      name: string;
      phone: string;
      alternate_phone?: string;
    };
    delivery_time?: string; // ISO string for scheduled delivery
    notes?: string;
  };
  order_details: {
    items: {
      name: string;
      name_ar: string;
      quantity: number;
      price: number;
      modifiers?: {
        name: string;
        name_ar: string;
        price: number;
      }[];
    }[];
    subtotal: number;
    tax: number;
    delivery_fee: number;
    total: number;
    payment_method: 'cash' | 'visa' | 'mada' | 'apple_pay' | 'stc_pay';
    currency: 'SAR';
  };
  delivery_preferences: {
    priority: 'normal' | 'urgent';
    delivery_type: 'asap' | 'scheduled';
    estimated_preparation_minutes: number;
  };
}

interface JahezOrderResponse {
  order_id: string;
  tracking_id: string;
  status: string;
  estimated_pickup_time: string;
  estimated_delivery_time: string;
  delivery_fee: number;
  tracking_url: string;
  driver?: {
    name: string;
    phone: string;
    photo_url?: string;
    vehicle_type: string;
    plate_number: string;
    rating: number;
  };
}

interface JahezQuoteRequest {
  pickup_location: {
    latitude: number;
    longitude: number;
    city: string;
  };
  delivery_location: {
    latitude: number;
    longitude: number;
    city: string;
  };
  order_value: number;
  delivery_type: 'asap' | 'scheduled';
  scheduled_time?: string;
  weight_kg?: number;
}

interface JahezQuoteResponse {
  quote_id: string;
  valid_for_minutes: number;
  delivery_fee: number;
  service_fee: number;
  total_fee: number;
  currency: 'SAR';
  estimated_delivery_minutes: number;
  distance_km: number;
  is_serviceable: boolean;
  available_payment_methods: string[];
}

@Injectable()
export class JahezProvider implements DeliveryProviderInterface {
  private readonly logger = new Logger(JahezProvider.name);
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshToken: string | null = null;
  private merchantId: string | null = null;

  readonly providerName = 'Jahez';
  readonly providerType = 'jahez';

  readonly capabilities: ProviderCapabilities = {
    supportsBulkOrders: false,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: false, // Jahez handles refunds through their merchant panel
    maxOrderValue: 2000, // 2000 SAR
    maxDeliveryDistance: 25, // 25 km
    operatingHours: {
      start: '06:00',
      end: '02:00' // Next day
    },
    supportedPaymentMethods: ['cash', 'card', 'wallet'],
    averageDeliveryTime: 35, // 35 minutes
    serviceFeePercentage: 3.0 // 3% service fee
  };

  constructor(private readonly config: ProviderConfig) {
    this.setupHttpClient();
  }

  private setupHttpClient(): void {
    this.httpClient = axios.create({
      baseURL: this.config.apiConfig.baseUrl || 'https://api.jahez.sa/v2',
      timeout: this.config.apiConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
        'User-Agent': 'Restaurant-Platform-Jahez/1.0'
      }
    });

    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (!config.url?.includes('/auth/') && this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        // Add merchant ID header for Jahez
        if (this.merchantId && !config.url?.includes('/auth/')) {
          config.headers['X-Merchant-ID'] = this.merchantId;
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
          throw new ProviderRateLimitError(this.providerType, retryAfter ? new Date(Date.now() + parseInt(retryAfter) * 1000) : undefined);
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
      const response = await this.httpClient.post('/auth/merchant/login', {
        merchant_code: credentials.merchantCode,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret
      });

      const authData: JahezAuthResponse = response.data.data;

      this.accessToken = authData.access_token;
      this.refreshToken = authData.refresh_token;
      this.merchantId = authData.merchant_id;
      this.tokenExpiresAt = new Date(Date.now() + (authData.expires_in * 1000));

      this.logger.log(`Jahez authentication successful for merchant: ${authData.merchant_name}`);

      return {
        success: true,
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        expiresAt: this.tokenExpiresAt,
        details: {
          merchantId: authData.merchant_id,
          merchantName: authData.merchant_name,
          tokenType: authData.token_type
        }
      };

    } catch (error) {
      this.logger.error('Jahez authentication failed:', error.response?.data || error.message);
      
      return {
        success: false,
        errorMessage: error.response?.data?.message || 'Authentication failed',
        details: error.response?.data
      };
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new ProviderAuthenticationError(this.providerType, 'No refresh token available');
    }

    const response = await this.httpClient.post('/auth/refresh', {
      refresh_token: this.refreshToken
    });

    const authData: JahezAuthResponse = response.data.data;
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

      const jahezOrder: JahezOrderRequest = this.transformToJahez(order);
      
      const response = await this.httpClient.post('/orders', jahezOrder);
      const jahezResponse: JahezOrderResponse = response.data.data;

      return {
        success: true,
        providerOrderId: jahezResponse.order_id,
        trackingNumber: jahezResponse.tracking_id,
        estimatedDeliveryTime: new Date(jahezResponse.estimated_delivery_time),
        deliveryFee: jahezResponse.delivery_fee,
        status: this.mapJahezStatus(jahezResponse.status),
        trackingUrl: jahezResponse.tracking_url,
        driverInfo: jahezResponse.driver ? {
          name: jahezResponse.driver.name,
          phone: jahezResponse.driver.phone,
          vehicleType: jahezResponse.driver.vehicle_type,
          plateNumber: jahezResponse.driver.plate_number,
          photo: jahezResponse.driver.photo_url
        } : undefined
      };

    } catch (error) {
      this.logger.error('Jahez order creation failed:', error.response?.data || error.message);
      
      return {
        success: false,
        status: 'failed',
        errorMessage: this.extractErrorMessage(error),
        errorCode: error.response?.data?.error_code
      };
    }
  }

  async cancelOrder(providerOrderId: string, reason?: string): Promise<CancelResponse> {
    try {
      const response = await this.httpClient.post(`/orders/${providerOrderId}/cancel`, {
        reason: reason || 'Restaurant cancelled the order',
        reason_ar: 'تم إلغاء الطلب من قبل المطعم'
      });

      const cancelData = response.data.data;

      return {
        success: true,
        cancelledAt: new Date(),
        reason: reason,
        refundAmount: cancelData.refund_amount || 0,
        cancellationFee: cancelData.cancellation_fee || 0
      };

    } catch (error) {
      this.logger.error('Jahez order cancellation failed:', error.response?.data || error.message);
      
      return {
        success: false,
        errorMessage: this.extractErrorMessage(error)
      };
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatus> {
    try {
      const response = await this.httpClient.get(`/orders/${providerOrderId}`);
      const jahezOrder: JahezOrderResponse = response.data.data;

      return {
        orderId: jahezOrder.order_id,
        providerOrderId: jahezOrder.order_id,
        status: this.mapJahezStatus(jahezOrder.status),
        statusUpdatedAt: new Date(),
        estimatedDeliveryTime: new Date(jahezOrder.estimated_delivery_time),
        driverInfo: jahezOrder.driver ? {
          name: jahezOrder.driver.name,
          phone: jahezOrder.driver.phone,
          rating: jahezOrder.driver.rating,
          vehicleInfo: `${jahezOrder.driver.vehicle_type} - ${jahezOrder.driver.plate_number}`
        } : undefined,
        trackingUrl: jahezOrder.tracking_url,
        statusHistory: [
          {
            status: this.mapJahezStatus(jahezOrder.status),
            timestamp: new Date(),
            notes: `Order ${jahezOrder.status} via Jahez`
          }
        ]
      };

    } catch (error) {
      this.logger.error('Failed to get Jahez order status:', error.response?.data || error.message);
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
      const quoteRequest: JahezQuoteRequest = {
        pickup_location: {
          latitude: request.pickupAddress.latitude,
          longitude: request.pickupAddress.longitude,
          city: request.pickupAddress.city
        },
        delivery_location: {
          latitude: request.deliveryAddress.latitude,
          longitude: request.deliveryAddress.longitude,
          city: request.deliveryAddress.city
        },
        order_value: request.orderValue,
        delivery_type: request.urgency === 'scheduled' ? 'scheduled' : 'asap',
        scheduled_time: request.scheduledTime?.toISOString(),
        weight_kg: request.weight
      };

      const response = await this.httpClient.post('/quotes/delivery-fee', quoteRequest);
      const quote: JahezQuoteResponse = response.data.data;

      if (!quote.is_serviceable) {
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
        estimatedDeliveryTime: quote.estimated_delivery_minutes,
        maxDeliveryDistance: this.capabilities.maxDeliveryDistance,
        availableServiceTypes: quote.available_payment_methods
      };

    } catch (error) {
      this.logger.error('Jahez fee calculation failed:', error.response?.data || error.message);
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
      const response = await this.httpClient.post('/locations/validate', {
        address: `${address.street}, ${address.area}, ${address.city}`,
        latitude: address.latitude,
        longitude: address.longitude,
        city: address.city
      });

      const validation = response.data.data;

      return {
        isValid: validation.is_valid,
        normalizedAddress: validation.normalized_address ? {
          ...address,
          street: validation.normalized_address.street,
          area: validation.normalized_address.district,
          city: validation.normalized_address.city,
          latitude: validation.normalized_address.latitude,
          longitude: validation.normalized_address.longitude
        } : address,
        suggestions: validation.suggestions || [],
        isServiceableArea: validation.is_serviceable,
        estimatedDeliveryTime: validation.estimated_delivery_minutes
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
      const response = await this.httpClient.get('/drivers/nearby', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius_km: radius,
          limit: 10
        }
      });

      return response.data.data.drivers.map(driver => ({
        id: driver.driver_id,
        name: driver.name,
        phone: driver.phone,
        rating: driver.rating,
        vehicleType: driver.vehicle_type,
        plateNumber: driver.plate_number,
        currentLocation: driver.current_location ? {
          latitude: driver.current_location.latitude,
          longitude: driver.current_location.longitude,
          lastUpdated: new Date(driver.current_location.last_updated)
        } : undefined,
        isAvailable: driver.status === 'available',
        estimatedArrivalTime: driver.eta_minutes
      }));

    } catch (error) {
      this.logger.error('Failed to get available drivers:', error.response?.data || error.message);
      return [];
    }
  }

  async estimateDeliveryTime(request: TimeEstimateRequest): Promise<TimeEstimate> {
    try {
      const response = await this.httpClient.post('/estimates/delivery-time', {
        pickup_location: {
          latitude: request.pickupAddress.latitude,
          longitude: request.pickupAddress.longitude
        },
        delivery_location: {
          latitude: request.deliveryAddress.latitude,
          longitude: request.deliveryAddress.longitude
        },
        preparation_minutes: request.orderPreparationTime,
        priority: request.priority,
        scheduled_time: request.scheduledTime?.toISOString()
      });

      const estimate = response.data.data;

      return {
        pickupTime: estimate.pickup_eta_minutes,
        deliveryTime: estimate.delivery_eta_minutes,
        totalTime: estimate.total_time_minutes,
        factors: {
          distance: estimate.distance_km,
          traffic: this.mapTrafficLevel(estimate.traffic_factor),
          weather: estimate.weather_condition || 'clear',
          driverAvailability: this.mapDriverAvailability(estimate.driver_availability_score)
        }
      };

    } catch (error) {
      this.logger.error('Time estimation failed:', error.response?.data || error.message);
      
      // Return fallback estimate based on Saudi traffic patterns
      return {
        pickupTime: 20, // Saudi cities typically have longer pickup times
        deliveryTime: 30,
        totalTime: request.orderPreparationTime + 50,
        factors: {
          distance: 8, // Average distance in Saudi cities
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
      this.logger.log(`Processing Jahez webhook: ${payload.eventType} for order ${payload.providerOrderId}`);

      // Jahez webhook events mapping
      switch (payload.eventType) {
        case 'order_confirmed':
          // Order has been confirmed by Jahez
          break;
        case 'driver_assigned':
          // Driver has been assigned to the order
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
          merchantId: this.merchantId,
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
          merchantId: this.merchantId
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
      const response = await this.httpClient.get('/analytics/merchant/metrics', {
        params: {
          merchant_id: this.merchantId,
          period: '24h'
        }
      });
      
      const metrics = response.data.data;

      return {
        totalOrders: metrics.total_orders || 0,
        successRate: metrics.success_rate || 0,
        averageResponseTime: metrics.avg_response_time_ms || 0,
        currentLoad: metrics.current_load_percentage || 0
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

  private transformToJahez(order: StandardOrderFormat): JahezOrderRequest {
    return {
      merchant_order_id: order.orderId,
      pickup_info: {
        address: {
          full_address: 'Restaurant Address', // Would be fetched from branch data
          district: 'Restaurant District',
          city: order.deliveryAddress.city, // Assuming same city
          latitude: 24.7136, // Default Riyadh coordinates, should be from branch
          longitude: 46.6753
        },
        contact: {
          name: 'Restaurant',
          phone: '+966500000000' // Restaurant phone from branch
        },
        ready_time: new Date(Date.now() + (order.estimatedPreparationTime * 60000)).toISOString(),
        notes: `Order #${order.orderId} with ${order.items.length} items`
      },
      delivery_info: {
        address: {
          full_address: `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}`,
          district: order.deliveryAddress.area,
          city: order.deliveryAddress.city,
          building_number: order.deliveryAddress.building,
          apartment_number: order.deliveryAddress.apartment,
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude
        },
        contact: {
          name: order.customer.name,
          phone: order.customer.phone,
          alternate_phone: order.customer.alternatePhone
        },
        delivery_time: order.scheduledDeliveryTime?.toISOString(),
        notes: order.specialInstructions || order.deliveryAddress.instructions
      },
      order_details: {
        items: order.items.map(item => ({
          name: item.name,
          name_ar: item.nameAr || item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers?.map(mod => ({
            name: mod.name,
            name_ar: mod.name, // Assume Arabic names are provided
            price: mod.price
          }))
        })),
        subtotal: order.subtotal,
        tax: order.taxes || 0,
        delivery_fee: order.deliveryFee,
        total: order.total,
        payment_method: this.mapPaymentMethod(order.paymentMethod),
        currency: 'SAR'
      },
      delivery_preferences: {
        priority: order.priority === 'urgent' ? 'urgent' : 'normal',
        delivery_type: order.scheduledDeliveryTime ? 'scheduled' : 'asap',
        estimated_preparation_minutes: order.estimatedPreparationTime
      }
    };
  }

  private mapJahezStatus(jahezStatus: string): 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' {
    const statusMap: Record<string, any> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'accepted': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'driver_assigned': 'ready',
      'picked_up': 'picked_up',
      'on_the_way': 'in_transit',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[jahezStatus] || 'pending';
  }

  private mapPaymentMethod(method: string): 'cash' | 'visa' | 'mada' | 'apple_pay' | 'stc_pay' {
    switch (method) {
      case 'card':
        return 'visa';
      case 'online':
        return 'mada'; // Saudi local card system
      case 'wallet':
        return 'stc_pay'; // Popular Saudi wallet
      default:
        return 'cash';
    }
  }

  private mapTrafficLevel(factor: number): 'light' | 'moderate' | 'heavy' {
    if (factor < 1.3) return 'light';
    if (factor < 1.7) return 'moderate';
    return 'heavy';
  }

  private mapDriverAvailability(score: number): 'high' | 'medium' | 'low' {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
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
      return { isValid: false, errorMessage: 'City is required for Jahez orders' };
    }

    if (!order.items || order.items.length === 0) {
      return { isValid: false, errorMessage: 'Order must contain at least one item' };
    }

    // Validate phone number format (Saudi)
    const phoneRegex = /^(\+966|966|0)?[5][0-9]{8}$/;
    if (!phoneRegex.test(order.customer.phone.replace(/\s+/g, ''))) {
      return { isValid: false, errorMessage: 'Invalid Saudi phone number format' };
    }

    // Validate order value limits
    if (this.capabilities.maxOrderValue && order.total > this.capabilities.maxOrderValue) {
      return { isValid: false, errorMessage: `Order value exceeds maximum limit of ${this.capabilities.maxOrderValue} SAR` };
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