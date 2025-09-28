import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import {
  DeliveryProviderInterface,
  ProviderConfig,
  StandardOrderFormat,
  AuthResult,
  ProviderOrderResponse,
  CancelResponse,
  OrderStatus,
  DeliveryFeeRequest,
  DeliveryFeeResponse,
  ValidationResult,
  TimeEstimateRequest,
  TimeEstimate,
  WebhookPayload,
  ProviderCapabilities,
  Address,
  ProviderError,
  ProviderAuthenticationError,
  ProviderValidationError,
  ProviderTimeoutError
} from '../interfaces/delivery-provider.interface';

/**
 * DHUB API Response Interfaces
 */
interface DHUBAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface DHUBOrderResponse {
  order_id: string;
  tracking_number: string;
  status: string;
  estimated_delivery_time: string;
  delivery_fee: number;
  driver?: {
    name: string;
    phone: string;
    vehicle_type: string;
    plate_number: string;
  };
}

interface DHUBLocationValidation {
  is_valid: boolean;
  normalized_address?: any;
  suggestions?: any[];
  is_serviceable: boolean;
  zone_info?: {
    zone_name: string;
    delivery_time: number;
    base_fee: number;
  };
}

/**
 * DHUB Delivery Provider
 * Jordan's leading delivery service with comprehensive coverage
 * 
 * Features:
 * - Complete Jordan coverage (Amman, Irbid, Zarqa, Aqaba, etc.)
 * - Real-time GPS tracking
 * - Express delivery (1-2 hours)
 * - Scheduled delivery
 * - Cash on delivery
 * - Multi-payment options
 */
export class DHUBProvider implements DeliveryProviderInterface {
  readonly providerName = 'DHUB';
  readonly providerType = 'dhub';
  readonly capabilities: ProviderCapabilities = {
    supportsBulkOrders: true,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: true,
    maxOrderValue: 1000, // 1000 JOD
    maxDeliveryDistance: 50, // 50 km from branch
    operatingHours: {
      start: '08:00',
      end: '23:00'
    },
    supportedPaymentMethods: ['cash', 'card', 'wallet', 'online'],
    averageDeliveryTime: 35, // minutes
    serviceFeePercentage: 8 // 8% service fee
  };

  private readonly logger = new Logger(DHUBProvider.name);
  private httpClient: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: Date;

  constructor(private readonly config: ProviderConfig) {
    this.initializeHttpClient();
  }

  /**
   * Initialize HTTP client with DHUB-specific configuration
   */
  private initializeHttpClient(): void {
    this.httpClient = axios.create({
      baseURL: this.config.apiConfig.baseUrl || 'https://api.dhub.jo/v2',
      timeout: this.config.apiConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'RestaurantPlatform/1.0'
      }
    });

    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.accessToken && !this.isTokenExpired()) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry original request
            return this.httpClient.request(error.config);
          } catch (refreshError) {
            this.logger.error('Failed to refresh DHUB token:', refreshError.message);
            throw new ProviderAuthenticationError(this.providerType, 'Token refresh failed');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with DHUB API
   */
  async authenticate(credentials: Record<string, any>): Promise<AuthResult> {
    try {
      const { api_key, secret_key } = credentials;
      
      if (!api_key || !secret_key) {
        throw new ProviderValidationError(
          this.providerType, 
          'API key and secret key are required'
        );
      }

      const response: AxiosResponse<DHUBAuthResponse> = await this.httpClient.post('/auth/token', {
        grant_type: 'client_credentials',
        client_id: api_key,
        client_secret: secret_key,
        scope: 'delivery:create delivery:read delivery:cancel'
      });

      const { access_token, refresh_token, expires_in } = response.data;

      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));

      this.logger.log('DHUB authentication successful');

      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: this.tokenExpiresAt,
        details: {
          providerType: this.providerType,
          scope: 'delivery:create delivery:read delivery:cancel'
        }
      };

    } catch (error) {
      this.logger.error('DHUB authentication failed:', error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          errorMessage: 'Invalid API credentials'
        };
      }

      throw new ProviderAuthenticationError(this.providerType, error.message);
    }
  }

  /**
   * Create delivery order with DHUB
   */
  async createOrder(order: StandardOrderFormat): Promise<ProviderOrderResponse> {
    try {
      await this.ensureAuthenticated();

      // Validate order data
      this.validateOrder(order);

      // Transform to DHUB format
      const dhubOrder = this.transformOrderToDHUBFormat(order);

      const response: AxiosResponse<DHUBOrderResponse> = await this.httpClient.post(
        '/orders',
        dhubOrder
      );

      const dhubResponse = response.data;

      this.logger.log(`DHUB order created successfully: ${dhubResponse.order_id}`);

      return {
        success: true,
        providerOrderId: dhubResponse.order_id,
        trackingNumber: dhubResponse.tracking_number,
        estimatedDeliveryTime: new Date(dhubResponse.estimated_delivery_time),
        deliveryFee: dhubResponse.delivery_fee,
        status: this.mapDHUBStatusToStandard(dhubResponse.status),
        trackingUrl: `https://track.dhub.jo/${dhubResponse.tracking_number}`,
        webhookUrl: this.config.webhookConfig?.url,
        driverInfo: dhubResponse.driver ? {
          name: dhubResponse.driver.name,
          phone: dhubResponse.driver.phone,
          vehicleType: dhubResponse.driver.vehicle_type,
          plateNumber: dhubResponse.driver.plate_number
        } : undefined
      };

    } catch (error) {
      this.logger.error('DHUB order creation failed:', error.message);
      
      if (error.response?.status === 400) {
        return {
          success: false,
          status: 'failed',
          errorMessage: error.response.data.message || 'Invalid order data',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      if (error.response?.status === 422) {
        return {
          success: false,
          status: 'failed',
          errorMessage: 'Address not serviceable or invalid',
          errorCode: 'ADDRESS_ERROR'
        };
      }

      throw new ProviderError(
        `DHUB order creation failed: ${error.message}`,
        'ORDER_CREATION_FAILED',
        this.providerType,
        error,
        true
      );
    }
  }

  /**
   * Cancel order with DHUB
   */
  async cancelOrder(providerOrderId: string, reason?: string): Promise<CancelResponse> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.put(`/orders/${providerOrderId}/cancel`, {
        reason: reason || 'Order cancelled by restaurant',
        cancelled_by: 'restaurant'
      });

      const cancelData = response.data;

      this.logger.log(`DHUB order cancelled: ${providerOrderId}`);

      return {
        success: true,
        cancelledAt: new Date(cancelData.cancelled_at),
        refundAmount: cancelData.refund_amount || 0,
        cancellationFee: cancelData.cancellation_fee || 0,
        reason: reason
      };

    } catch (error) {
      this.logger.error(`DHUB order cancellation failed: ${error.message}`);

      if (error.response?.status === 400) {
        return {
          success: false,
          errorMessage: error.response.data.message || 'Cannot cancel order'
        };
      }

      throw new ProviderError(
        `DHUB order cancellation failed: ${error.message}`,
        'CANCELLATION_FAILED',
        this.providerType,
        error,
        true
      );
    }
  }

  /**
   * Get order status from DHUB
   */
  async getOrderStatus(providerOrderId: string): Promise<OrderStatus> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.get(`/orders/${providerOrderId}`);
      const orderData = response.data;

      return {
        orderId: orderData.internal_order_id || providerOrderId,
        providerOrderId,
        status: this.mapDHUBStatusToStandard(orderData.status),
        statusUpdatedAt: new Date(orderData.status_updated_at),
        estimatedDeliveryTime: orderData.estimated_delivery_time 
          ? new Date(orderData.estimated_delivery_time) 
          : undefined,
        actualDeliveryTime: orderData.actual_delivery_time 
          ? new Date(orderData.actual_delivery_time) 
          : undefined,
        driverLocation: orderData.driver?.location ? {
          latitude: orderData.driver.location.lat,
          longitude: orderData.driver.location.lng,
          lastUpdated: new Date(orderData.driver.location.updated_at)
        } : undefined,
        driverInfo: orderData.driver ? {
          name: orderData.driver.name,
          phone: orderData.driver.phone,
          rating: orderData.driver.rating,
          vehicleInfo: `${orderData.driver.vehicle_type} - ${orderData.driver.plate_number}`
        } : undefined,
        trackingUrl: `https://track.dhub.jo/${orderData.tracking_number}`,
        deliveryAttempts: orderData.delivery_attempts || 1,
        statusHistory: orderData.status_history?.map((status: any) => ({
          status: this.mapDHUBStatusToStandard(status.status),
          timestamp: new Date(status.timestamp),
          notes: status.notes
        })) || []
      };

    } catch (error) {
      this.logger.error(`DHUB get order status failed: ${error.message}`);
      throw new ProviderError(
        `Failed to get order status: ${error.message}`,
        'STATUS_FETCH_FAILED',
        this.providerType,
        error,
        true
      );
    }
  }

  /**
   * Calculate delivery fee with DHUB
   */
  async calculateDeliveryFee(request: DeliveryFeeRequest): Promise<DeliveryFeeResponse> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.post('/calculate-fee', {
        pickup_address: this.formatAddressForDHUB(request.pickupAddress),
        delivery_address: this.formatAddressForDHUB(request.deliveryAddress),
        order_value: request.orderValue,
        weight: request.weight || 1,
        dimensions: request.dimensions,
        priority: request.urgency,
        scheduled_time: request.scheduledTime?.toISOString()
      });

      const feeData = response.data;

      return {
        baseFee: feeData.base_fee,
        distanceFee: feeData.distance_fee,
        urgencyFee: feeData.urgency_fee || 0,
        serviceFee: feeData.service_fee || 0,
        totalFee: feeData.total_fee,
        currency: 'JOD',
        estimatedDeliveryTime: feeData.estimated_delivery_time,
        maxDeliveryDistance: feeData.max_delivery_distance || 50,
        availableServiceTypes: feeData.available_services || ['standard', 'express']
      };

    } catch (error) {
      this.logger.error(`DHUB fee calculation failed: ${error.message}`);
      throw new ProviderError(
        `Fee calculation failed: ${error.message}`,
        'FEE_CALCULATION_FAILED',
        this.providerType,
        error,
        true
      );
    }
  }

  /**
   * Validate address with DHUB
   */
  async validateAddress(address: Address): Promise<ValidationResult> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.post('/validate-address', {
        address: this.formatAddressForDHUB(address)
      });

      const validationData: DHUBLocationValidation = response.data;

      return {
        isValid: validationData.is_valid,
        normalizedAddress: validationData.normalized_address ? 
          this.formatAddressFromDHUB(validationData.normalized_address) : undefined,
        suggestions: validationData.suggestions?.map(this.formatAddressFromDHUB),
        isServiceableArea: validationData.is_serviceable,
        estimatedDeliveryTime: validationData.zone_info?.delivery_time
      };

    } catch (error) {
      this.logger.error(`DHUB address validation failed: ${error.message}`);
      return {
        isValid: false,
        errorMessage: error.message,
        isServiceableArea: false
      };
    }
  }

  /**
   * Estimate delivery time
   */
  async estimateDeliveryTime(request: TimeEstimateRequest): Promise<TimeEstimate> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.post('/estimate-time', {
        pickup_address: this.formatAddressForDHUB(request.pickupAddress),
        delivery_address: this.formatAddressForDHUB(request.deliveryAddress),
        preparation_time: request.orderPreparationTime,
        priority: request.priority,
        scheduled_time: request.scheduledTime?.toISOString()
      });

      const estimate = response.data;

      return {
        pickupTime: estimate.pickup_time,
        deliveryTime: estimate.delivery_time,
        totalTime: estimate.total_time,
        factors: {
          distance: estimate.factors.distance,
          traffic: estimate.factors.traffic,
          weather: estimate.factors.weather,
          driverAvailability: estimate.factors.driver_availability
        }
      };

    } catch (error) {
      this.logger.error(`DHUB time estimation failed: ${error.message}`);
      
      // Return fallback estimate
      return {
        pickupTime: request.orderPreparationTime + 10,
        deliveryTime: 25,
        totalTime: request.orderPreparationTime + 35,
        factors: {
          distance: 5,
          traffic: 'moderate',
          weather: 'clear',
          driverAvailability: 'medium'
        }
      };
    }
  }

  /**
   * Health check for DHUB service
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; details?: Record<string, any> }> {
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.status === 200,
        responseTime,
        details: {
          status: response.data.status,
          version: response.data.version,
          region: 'Jordan',
          lastCheck: new Date().toISOString()
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        details: {
          error: error.message,
          lastCheck: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
        
      return crypto.timingSafeEqual(
        Buffer.from(signature.replace('sha256=', '')),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error('DHUB webhook signature validation failed:', error.message);
      return false;
    }
  }

  // Private helper methods

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || this.isTokenExpired()) {
      const authResult = await this.authenticate(this.config.credentials);
      if (!authResult.success) {
        throw new ProviderAuthenticationError(this.providerType, authResult.errorMessage);
      }
    }
  }

  private isTokenExpired(): boolean {
    return !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt.getTime() - 60000; // 1 minute buffer
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new ProviderAuthenticationError(this.providerType, 'No refresh token available');
    }

    const response: AxiosResponse<DHUBAuthResponse> = await this.httpClient.post('/auth/refresh', {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken
    });

    const { access_token, refresh_token, expires_in } = response.data;

    this.accessToken = access_token;
    this.refreshToken = refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));
  }

  private validateOrder(order: StandardOrderFormat): void {
    if (!order.orderId) throw new ProviderValidationError(this.providerType, 'Order ID is required');
    if (!order.customer.phone) throw new ProviderValidationError(this.providerType, 'Customer phone is required');
    if (!order.deliveryAddress.street) throw new ProviderValidationError(this.providerType, 'Delivery address is required');
    if (order.items.length === 0) throw new ProviderValidationError(this.providerType, 'Order must have at least one item');
    if (order.total <= 0) throw new ProviderValidationError(this.providerType, 'Order total must be greater than 0');
  }

  private transformOrderToDHUBFormat(order: StandardOrderFormat): any {
    return {
      reference_id: order.orderId,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        alternate_phone: order.customer.alternatePhone
      },
      pickup_address: {
        name: 'Restaurant Branch',
        phone: '+962771234567', // Branch phone from config
        street: 'Branch Street', // From branch data
        city: 'Amman',
        area: 'Downtown'
      },
      delivery_address: this.formatAddressForDHUB(order.deliveryAddress),
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: item.modifiers?.map(mod => ({
          name: mod.name,
          price: mod.price
        })),
        instructions: item.instructions
      })),
      pricing: {
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        taxes: order.taxes || 0,
        discount: order.discount || 0,
        total: order.total
      },
      payment: {
        method: order.paymentMethod,
        amount: order.total
      },
      delivery_options: {
        priority: order.priority,
        scheduled_time: order.scheduledDeliveryTime?.toISOString(),
        special_instructions: order.specialInstructions,
        estimated_preparation_time: order.estimatedPreparationTime
      },
      notifications: {
        webhook_url: this.config.webhookConfig?.url,
        sms_updates: true,
        call_updates: true
      }
    };
  }

  private formatAddressForDHUB(address: Address): any {
    return {
      name: address.street,
      phone: '', // Will be filled from customer data
      street: address.street,
      city: address.city,
      area: address.area,
      building: address.building,
      floor: address.floor,
      apartment: address.apartment,
      latitude: address.latitude,
      longitude: address.longitude,
      landmark: address.landmark,
      instructions: address.instructions
    };
  }

  private formatAddressFromDHUB(dhubAddress: any): Address {
    return {
      street: dhubAddress.street,
      city: dhubAddress.city,
      area: dhubAddress.area,
      building: dhubAddress.building,
      floor: dhubAddress.floor,
      apartment: dhubAddress.apartment,
      latitude: dhubAddress.latitude,
      longitude: dhubAddress.longitude,
      landmark: dhubAddress.landmark,
      instructions: dhubAddress.instructions
    };
  }

  private mapDHUBStatusToStandard(dhubStatus: string): "pending" | "cancelled" | "delivered" | "failed" | "confirmed" | "picked_up" | "in_transit" | "preparing" | "ready" {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready_for_pickup': 'ready',
      'driver_assigned': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return (statusMap[dhubStatus] || 'pending') as "pending" | "cancelled" | "delivered" | "failed" | "confirmed" | "picked_up" | "in_transit" | "preparing" | "ready";
  }
}