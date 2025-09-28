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

interface CareemAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface CareemOrderRequest {
  pickup: {
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    contact: {
      name: string;
      phone_number: string;
    };
    instructions?: string;
  };
  dropoff: {
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    contact: {
      name: string;
      phone_number: string;
    };
    instructions?: string;
  };
  package_details: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    fragile: boolean;
    description: string;
  };
  delivery_options: {
    service_type: 'now' | 'scheduled' | 'express';
    scheduled_time?: string;
    delivery_instructions?: string;
  };
  payment: {
    method: 'cash' | 'credit' | 'wallet';
    amount: number;
    currency: string;
  };
  metadata: {
    order_id: string;
    restaurant_id: string;
    customer_notes?: string;
  };
}

interface CareemOrderResponse {
  delivery_id: string;
  status: string;
  estimated_pickup_time: string;
  estimated_delivery_time: string;
  fee: {
    amount: number;
    currency: string;
    breakdown: {
      base_fee: number;
      distance_fee: number;
      time_fee: number;
      service_fee: number;
    };
  };
  tracking: {
    url: string;
    phone: string;
  };
  captain?: {
    name: string;
    phone: string;
    vehicle: {
      type: string;
      plate_number: string;
      color: string;
    };
    photo?: string;
    rating: number;
  };
}

interface CareemQuoteRequest {
  pickup: {
    latitude: number;
    longitude: number;
  };
  dropoff: {
    latitude: number;
    longitude: number;
  };
  service_type: 'now' | 'express' | 'scheduled';
  scheduled_time?: string;
  package_weight?: number;
}

interface CareemQuoteResponse {
  quote_id: string;
  valid_until: string;
  fee: {
    amount: number;
    currency: string;
    breakdown: {
      base_fee: number;
      distance_fee: number;
      time_fee: number;
      service_fee: number;
      surge_multiplier?: number;
    };
  };
  estimated_times: {
    pickup_eta: number; // minutes
    delivery_eta: number; // minutes
    total_time: number; // minutes
  };
  service_area: boolean;
}

@Injectable()
export class CareemProvider implements DeliveryProviderInterface {
  private readonly logger = new Logger(CareemProvider.name);
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshToken: string | null = null;

  readonly providerName = 'Careem';
  readonly providerType = 'careem';

  readonly capabilities: ProviderCapabilities = {
    supportsBulkOrders: true,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: true,
    maxOrderValue: 5000, // AED/SAR
    maxDeliveryDistance: 40, // 40 km
    operatingHours: {
      start: '06:00',
      end: '02:00' // Next day
    },
    supportedPaymentMethods: ['cash', 'card', 'wallet'],
    averageDeliveryTime: 30, // 30 minutes
    serviceFeePercentage: 2.5 // 2.5%
  };

  constructor(private readonly config: ProviderConfig) {
    this.setupHttpClient();
  }

  private setupHttpClient(): void {
    this.httpClient = axios.create({
      baseURL: this.config.apiConfig.baseUrl || 'https://api.careem.com/v1',
      timeout: this.config.apiConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Restaurant-Platform/1.0'
      }
    });

    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (!config.url?.includes('/auth/') && this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        // Add partner headers for Careem
        if (this.config.credentials.partnerId) {
          config.headers['X-Partner-ID'] = this.config.credentials.partnerId;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
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
            throw new ProviderAuthenticationError(this.providerType, 'Authentication failed');
          }
        }

        if (error.response?.status === 429) {
          throw new ProviderRateLimitError(this.providerType);
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
      const response = await this.httpClient.post('/auth/token', {
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'delivery:read delivery:write'
      });

      const authData: CareemAuthResponse = response.data;

      this.accessToken = authData.access_token;
      this.refreshToken = authData.refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (authData.expires_in * 1000));

      this.logger.log(`Careem authentication successful, token expires at: ${this.tokenExpiresAt}`);

      return {
        success: true,
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        expiresAt: this.tokenExpiresAt,
        details: {
          tokenType: authData.token_type,
          scope: authData.scope
        }
      };

    } catch (error) {
      this.logger.error('Careem authentication failed:', error.response?.data || error.message);
      
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

    const response = await this.httpClient.post('/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.config.credentials.clientId
    });

    const authData: CareemAuthResponse = response.data;
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

      const careemOrder: CareemOrderRequest = this.transformToCareem(order);
      
      const response = await this.httpClient.post('/deliveries', careemOrder);
      const careemResponse: CareemOrderResponse = response.data;

      return {
        success: true,
        providerOrderId: careemResponse.delivery_id,
        trackingNumber: careemResponse.delivery_id,
        estimatedDeliveryTime: new Date(careemResponse.estimated_delivery_time),
        deliveryFee: careemResponse.fee.amount,
        status: this.mapCareemStatus(careemResponse.status),
        trackingUrl: careemResponse.tracking.url,
        driverInfo: careemResponse.captain ? {
          name: careemResponse.captain.name,
          phone: careemResponse.captain.phone,
          vehicleType: careemResponse.captain.vehicle.type,
          plateNumber: careemResponse.captain.vehicle.plate_number
        } : undefined
      };

    } catch (error) {
      this.logger.error('Careem order creation failed:', error.response?.data || error.message);
      
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
      const response = await this.httpClient.patch(`/deliveries/${providerOrderId}/cancel`, {
        reason: reason || 'Restaurant requested cancellation'
      });

      return {
        success: true,
        cancelledAt: new Date(),
        reason: reason,
        refundAmount: response.data.refund?.amount || 0,
        cancellationFee: response.data.cancellation_fee?.amount || 0
      };

    } catch (error) {
      this.logger.error('Careem order cancellation failed:', error.response?.data || error.message);
      
      return {
        success: false,
        errorMessage: this.extractErrorMessage(error)
      };
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatus> {
    try {
      const response = await this.httpClient.get(`/deliveries/${providerOrderId}`);
      const careemOrder: CareemOrderResponse = response.data;

      return {
        orderId: careemOrder.delivery_id,
        providerOrderId: careemOrder.delivery_id,
        status: this.mapCareemStatus(careemOrder.status),
        statusUpdatedAt: new Date(),
        estimatedDeliveryTime: new Date(careemOrder.estimated_delivery_time),
        driverInfo: careemOrder.captain ? {
          name: careemOrder.captain.name,
          phone: careemOrder.captain.phone,
          rating: careemOrder.captain.rating,
          vehicleInfo: `${careemOrder.captain.vehicle.type} - ${careemOrder.captain.vehicle.plate_number}`
        } : undefined,
        trackingUrl: careemOrder.tracking.url,
        statusHistory: [
          {
            status: this.mapCareemStatus(careemOrder.status),
            timestamp: new Date(),
            notes: `Order ${careemOrder.status} via Careem`
          }
        ]
      };

    } catch (error) {
      this.logger.error('Failed to get Careem order status:', error.response?.data || error.message);
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
      const quoteRequest: CareemQuoteRequest = {
        pickup: {
          latitude: request.pickupAddress.latitude,
          longitude: request.pickupAddress.longitude
        },
        dropoff: {
          latitude: request.deliveryAddress.latitude,
          longitude: request.deliveryAddress.longitude
        },
        service_type: this.mapUrgencyToServiceType(request.urgency),
        scheduled_time: request.scheduledTime?.toISOString(),
        package_weight: request.weight
      };

      const response = await this.httpClient.post('/quotes', quoteRequest);
      const quote: CareemQuoteResponse = response.data;

      if (!quote.service_area) {
        throw new ProviderValidationError(
          this.providerType,
          'Delivery address is outside service area'
        );
      }

      return {
        baseFee: quote.fee.breakdown.base_fee,
        distanceFee: quote.fee.breakdown.distance_fee,
        urgencyFee: quote.fee.breakdown.time_fee,
        serviceFee: quote.fee.breakdown.service_fee,
        totalFee: quote.fee.amount,
        currency: quote.fee.currency,
        estimatedDeliveryTime: quote.estimated_times.total_time,
        maxDeliveryDistance: this.capabilities.maxDeliveryDistance,
        availableServiceTypes: ['now', 'express', 'scheduled']
      };

    } catch (error) {
      this.logger.error('Careem fee calculation failed:', error.response?.data || error.message);
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
      // Use Careem's address validation endpoint
      const response = await this.httpClient.post('/locations/validate', {
        address: `${address.street}, ${address.area}, ${address.city}`,
        latitude: address.latitude,
        longitude: address.longitude
      });

      const validation = response.data;

      return {
        isValid: validation.valid,
        normalizedAddress: validation.normalized_address ? {
          ...address,
          street: validation.normalized_address.street,
          area: validation.normalized_address.area,
          city: validation.normalized_address.city,
          latitude: validation.normalized_address.latitude,
          longitude: validation.normalized_address.longitude
        } : address,
        suggestions: validation.suggestions || [],
        isServiceableArea: validation.serviceable,
        estimatedDeliveryTime: validation.estimated_delivery_time
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
      const response = await this.httpClient.get('/captains/nearby', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: radius * 1000, // Convert km to meters
          limit: 10
        }
      });

      return response.data.captains.map(captain => ({
        id: captain.id,
        name: captain.name,
        phone: captain.phone,
        rating: captain.rating,
        vehicleType: captain.vehicle.type,
        plateNumber: captain.vehicle.plate_number,
        currentLocation: captain.location ? {
          latitude: captain.location.latitude,
          longitude: captain.location.longitude,
          lastUpdated: new Date(captain.location.last_updated)
        } : undefined,
        isAvailable: captain.status === 'available',
        estimatedArrivalTime: captain.eta
      }));

    } catch (error) {
      this.logger.error('Failed to get available drivers:', error.response?.data || error.message);
      return [];
    }
  }

  async estimateDeliveryTime(request: TimeEstimateRequest): Promise<TimeEstimate> {
    try {
      const response = await this.httpClient.post('/estimates/time', {
        pickup: {
          latitude: request.pickupAddress.latitude,
          longitude: request.pickupAddress.longitude
        },
        dropoff: {
          latitude: request.deliveryAddress.latitude,
          longitude: request.deliveryAddress.longitude
        },
        preparation_time: request.orderPreparationTime,
        service_type: this.mapPriorityToServiceType(request.priority),
        scheduled_time: request.scheduledTime?.toISOString()
      });

      const estimate = response.data;

      return {
        pickupTime: estimate.pickup_eta,
        deliveryTime: estimate.delivery_eta,
        totalTime: estimate.total_time,
        factors: {
          distance: estimate.distance_km,
          traffic: this.mapTrafficLevel(estimate.traffic_factor),
          weather: estimate.weather_factor || 'clear',
          driverAvailability: this.mapDriverAvailability(estimate.captain_availability)
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
          distance: 5,
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
      this.logger.log(`Processing Careem webhook: ${payload.eventType} for order ${payload.providerOrderId}`);

      // Process different webhook events
      switch (payload.eventType) {
        case 'order_confirmed':
          // Update order status to confirmed
          break;
        case 'driver_assigned':
          // Update with driver information
          break;
        case 'picked_up':
          // Order has been picked up by driver
          break;
        case 'in_transit':
          // Order is on the way
          break;
        case 'delivered':
          // Order has been delivered
          break;
        case 'order_cancelled':
        case 'failed':
          // Handle cancellation/failure
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
          tokenValid: !!this.accessToken && (!this.tokenExpiresAt || this.tokenExpiresAt > new Date())
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
      const response = await this.httpClient.get('/analytics/metrics');
      const metrics = response.data;

      return {
        totalOrders: metrics.total_orders || 0,
        successRate: metrics.success_rate || 0,
        averageResponseTime: metrics.avg_response_time || 0,
        currentLoad: metrics.current_load || 0
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

  private transformToCareem(order: StandardOrderFormat): CareemOrderRequest {
    return {
      pickup: {
        location: {
          latitude: order.deliveryAddress.latitude || 0, // Restaurant location would be fetched from branch
          longitude: order.deliveryAddress.longitude || 0,
          address: `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}`
        },
        contact: {
          name: 'Restaurant',
          phone_number: '+962700000000' // Restaurant phone from branch
        },
        instructions: `Order #${order.orderId} - ${order.items.length} items`
      },
      dropoff: {
        location: {
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude,
          address: `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}`
        },
        contact: {
          name: order.customer.name,
          phone_number: order.customer.phone
        },
        instructions: order.specialInstructions || order.deliveryAddress.instructions
      },
      package_details: {
        fragile: false,
        description: `Food order with ${order.items.length} items`,
        weight: 2 // Estimated weight in kg
      },
      delivery_options: {
        service_type: this.mapPriorityToServiceType(order.priority),
        scheduled_time: order.scheduledDeliveryTime?.toISOString(),
        delivery_instructions: order.specialInstructions
      },
      payment: {
        method: this.mapPaymentMethod(order.paymentMethod),
        amount: order.total,
        currency: this.getLocalCurrency()
      },
      metadata: {
        order_id: order.orderId,
        restaurant_id: order.branchId,
        customer_notes: order.specialInstructions
      }
    };
  }

  private mapCareemStatus(careemStatus: string): 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' {
    const statusMap: Record<string, any> = {
      'processing': 'pending',
      'confirmed': 'confirmed',
      'captain_assigned': 'confirmed',
      'captain_arriving': 'ready',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[careemStatus] || 'pending';
  }

  private mapUrgencyToServiceType(urgency: string): 'now' | 'express' | 'scheduled' {
    switch (urgency) {
      case 'express':
        return 'express';
      case 'scheduled':
        return 'scheduled';
      default:
        return 'now';
    }
  }

  private mapPriorityToServiceType(priority: string): 'now' | 'express' | 'scheduled' {
    switch (priority) {
      case 'urgent':
      case 'express':
        return 'express';
      default:
        return 'now';
    }
  }

  private mapPaymentMethod(method: string): 'cash' | 'credit' | 'wallet' {
    switch (method) {
      case 'card':
      case 'online':
        return 'credit';
      case 'wallet':
        return 'wallet';
      default:
        return 'cash';
    }
  }

  private mapTrafficLevel(factor: number): 'light' | 'moderate' | 'heavy' {
    if (factor < 1.2) return 'light';
    if (factor < 1.5) return 'moderate';
    return 'heavy';
  }

  private mapDriverAvailability(availability: number): 'high' | 'medium' | 'low' {
    if (availability > 0.8) return 'high';
    if (availability > 0.4) return 'medium';
    return 'low';
  }

  private getLocalCurrency(): string {
    // Determine currency based on region/config
    const currencyMap: Record<string, string> = {
      'AE': 'AED', // UAE
      'SA': 'SAR', // Saudi Arabia
      'KW': 'KWD', // Kuwait
      'QA': 'QAR', // Qatar
      'BH': 'BHD', // Bahrain
      'OM': 'OMR', // Oman
      'JO': 'JOD', // Jordan
      'EG': 'EGP', // Egypt
      'PK': 'PKR'  // Pakistan
    };

    const region = this.config.credentials.region || 'AE';
    return currencyMap[region] || 'AED';
  }

  private async validateOrderData(order: StandardOrderFormat): Promise<{ isValid: boolean; errorMessage?: string }> {
    // Validate required fields
    if (!order.customer.name || !order.customer.phone) {
      return { isValid: false, errorMessage: 'Customer name and phone are required' };
    }

    if (!order.deliveryAddress.latitude || !order.deliveryAddress.longitude) {
      return { isValid: false, errorMessage: 'Delivery address coordinates are required' };
    }

    if (!order.items || order.items.length === 0) {
      return { isValid: false, errorMessage: 'Order must contain at least one item' };
    }

    // Validate order value limits
    if (this.capabilities.maxOrderValue && order.total > this.capabilities.maxOrderValue) {
      return { isValid: false, errorMessage: `Order value exceeds maximum limit of ${this.capabilities.maxOrderValue}` };
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
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}