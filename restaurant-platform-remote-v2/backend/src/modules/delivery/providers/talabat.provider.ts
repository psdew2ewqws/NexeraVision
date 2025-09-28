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
  ProviderRateLimitError
} from '../interfaces/delivery-provider.interface';

/**
 * Talabat API Response Interfaces
 */
interface TalabatAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  brand_id: string;
}

interface TalabatOrderResponse {
  order_number: string;
  partner_order_id: string;
  status: string;
  estimated_delivery_time: string;
  delivery_fee: {
    amount: number;
    currency: string;
  };
  rider?: {
    name: string;
    phone: string;
    tracking_url: string;
  };
}

interface TalabatDeliveryZone {
  zone_id: string;
  zone_name: string;
  delivery_fee: number;
  minimum_order: number;
  estimated_delivery_time: number;
  is_active: boolean;
}

/**
 * Talabat Delivery Provider
 * Leading Gulf states delivery service
 * 
 * Coverage: UAE, Saudi Arabia, Kuwait, Bahrain, Oman, Qatar, Jordan, Egypt
 * 
 * Features:
 * - Multi-country coverage
 * - Express delivery
 * - Scheduled delivery
 * - Brand integration
 * - Multi-language support (Arabic/English)
 * - Local payment methods
 * - Restaurant partnership program
 */
export class TalabatProvider implements DeliveryProviderInterface {
  readonly providerName = 'Talabat';
  readonly providerType = 'talabat';
  readonly capabilities: ProviderCapabilities = {
    supportsBulkOrders: true,
    supportsScheduledDelivery: true,
    supportsRealTimeTracking: true,
    supportsDriverAssignment: true,
    supportsAddressValidation: true,
    supportsCancellation: true,
    supportsRefunds: true,
    maxOrderValue: 2000, // 2000 local currency
    maxDeliveryDistance: 25, // 25 km from branch
    operatingHours: {
      start: '06:00',
      end: '02:00' // Next day
    },
    supportedPaymentMethods: ['cash', 'card', 'wallet', 'online'],
    averageDeliveryTime: 40, // minutes
    serviceFeePercentage: 12 // 12% commission
  };

  private readonly logger = new Logger(TalabatProvider.name);
  private httpClient: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: Date;
  private brandId?: string;
  private countryCode?: string;

  constructor(private readonly config: ProviderConfig) {
    this.initializeHttpClient();
    this.extractConfiguration();
  }

  /**
   * Extract Talabat-specific configuration
   */
  private extractConfiguration(): void {
    const { brand_id, country_code } = this.config.credentials;
    this.brandId = brand_id;
    this.countryCode = country_code || 'AE'; // Default to UAE
  }

  /**
   * Initialize HTTP client with Talabat-specific configuration
   */
  private initializeHttpClient(): void {
    this.httpClient = axios.create({
      baseURL: this.config.apiConfig.baseUrl || 'https://api.talabat.com/v3',
      timeout: this.config.apiConfig.timeout || 45000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TalabatPartner/2.0',
        'X-Api-Version': '3.0',
        'Accept-Language': 'en-US,ar;q=0.9'
      }
    });

    // Request interceptor
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Add rate limiting headers
        config.headers['X-RateLimit-Client'] = this.config.companyId;
        
        if (this.accessToken && !this.isTokenExpired()) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        if (this.brandId) {
          config.headers['X-Brand-Id'] = this.brandId;
        }

        if (this.countryCode) {
          config.headers['X-Country-Code'] = this.countryCode;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        // Log rate limit headers
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining && parseInt(remaining) < 10) {
          this.logger.warn(`Talabat rate limit low: ${remaining} requests remaining`);
        }
        
        return response;
      },
      async (error) => {
        // Handle rate limiting
        if (error.response?.status === 429) {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          throw new ProviderRateLimitError(
            this.providerType,
            resetTime ? new Date(resetTime * 1000) : undefined
          );
        }

        // Handle token refresh
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            return this.httpClient.request(error.config);
          } catch (refreshError) {
            this.logger.error('Talabat token refresh failed:', refreshError.message);
            throw new ProviderAuthenticationError(this.providerType, 'Token refresh failed');
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with Talabat API
   */
  async authenticate(credentials: Record<string, any>): Promise<AuthResult> {
    try {
      const { client_id, client_secret, brand_id, country_code } = credentials;
      
      if (!client_id || !client_secret || !brand_id) {
        throw new ProviderValidationError(
          this.providerType,
          'Client ID, client secret, and brand ID are required'
        );
      }

      this.brandId = brand_id;
      this.countryCode = country_code || 'AE';

      const response: AxiosResponse<TalabatAuthResponse> = await this.httpClient.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id,
        client_secret,
        scope: 'orders:read orders:write delivery:read delivery:write',
        brand_id
      });

      const { access_token, refresh_token, expires_in, scope } = response.data;

      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));

      this.logger.log(`Talabat authentication successful for brand: ${brand_id}`);

      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: this.tokenExpiresAt,
        details: {
          providerType: this.providerType,
          brandId: brand_id,
          countryCode: this.countryCode,
          scope
        }
      };

    } catch (error) {
      this.logger.error('Talabat authentication failed:', error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          errorMessage: 'Invalid client credentials or brand ID'
        };
      }

      throw new ProviderAuthenticationError(this.providerType, error.message);
    }
  }

  /**
   * Create delivery order with Talabat
   */
  async createOrder(order: StandardOrderFormat): Promise<ProviderOrderResponse> {
    try {
      await this.ensureAuthenticated();

      // Validate order for Talabat requirements
      this.validateTalabatOrder(order);

      // Check delivery zone availability
      const deliveryZone = await this.getDeliveryZone(order.deliveryAddress);
      if (!deliveryZone.is_active) {
        return {
          success: false,
          status: 'failed',
          errorMessage: 'Delivery not available in this area',
          errorCode: 'AREA_NOT_SERVICEABLE'
        };
      }

      // Transform to Talabat format
      const talabatOrder = this.transformOrderToTalabatFormat(order, deliveryZone);

      const response: AxiosResponse<TalabatOrderResponse> = await this.httpClient.post(
        `/brands/${this.brandId}/orders`,
        talabatOrder
      );

      const talabatResponse = response.data;

      this.logger.log(`Talabat order created: ${talabatResponse.order_number}`);

      return {
        success: true,
        providerOrderId: talabatResponse.order_number,
        trackingNumber: talabatResponse.partner_order_id,
        estimatedDeliveryTime: new Date(talabatResponse.estimated_delivery_time),
        deliveryFee: talabatResponse.delivery_fee.amount,
        status: this.mapTalabatStatusToStandard(talabatResponse.status),
        trackingUrl: talabatResponse.rider?.tracking_url,
        webhookUrl: this.config.webhookConfig?.url,
        driverInfo: talabatResponse.rider ? {
          name: talabatResponse.rider.name,
          phone: talabatResponse.rider.phone
        } : undefined
      };

    } catch (error) {
      this.logger.error('Talabat order creation failed:', error.message);
      
      if (error.response?.status === 400) {
        return {
          success: false,
          status: 'failed',
          errorMessage: error.response.data.message || 'Invalid order data',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      if (error.response?.status === 403) {
        return {
          success: false,
          status: 'failed',
          errorMessage: 'Brand not authorized for this operation',
          errorCode: 'BRAND_UNAUTHORIZED'
        };
      }

      throw new ProviderError(
        `Talabat order creation failed: ${error.message}`,
        'ORDER_CREATION_FAILED',
        this.providerType,
        error,
        true
      );
    }
  }

  /**
   * Cancel order with Talabat
   */
  async cancelOrder(providerOrderId: string, reason?: string): Promise<CancelResponse> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.post(
        `/brands/${this.brandId}/orders/${providerOrderId}/cancel`,
        {
          reason_code: this.mapCancelReasonToTalabat(reason),
          reason_description: reason || 'Restaurant cancelled order',
          cancelled_by: 'restaurant'
        }
      );

      const cancelData = response.data;

      this.logger.log(`Talabat order cancelled: ${providerOrderId}`);

      return {
        success: true,
        cancelledAt: new Date(cancelData.cancelled_at),
        refundAmount: cancelData.refund_amount || 0,
        cancellationFee: cancelData.cancellation_fee || 0,
        reason
      };

    } catch (error) {
      this.logger.error(`Talabat cancellation failed: ${error.message}`);

      if (error.response?.status === 400) {
        return {
          success: false,
          errorMessage: error.response.data.message || 'Cannot cancel order in current state'
        };
      }

      throw new ProviderError(
        `Talabat cancellation failed: ${error.message}`,
        'CANCELLATION_FAILED',
        this.providerType,
        error,
        true
      );
    }
  }

  /**
   * Get order status from Talabat
   */
  async getOrderStatus(providerOrderId: string): Promise<OrderStatus> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.get(
        `/brands/${this.brandId}/orders/${providerOrderId}`
      );

      const orderData = response.data;

      return {
        orderId: orderData.partner_order_id || providerOrderId,
        providerOrderId,
        status: this.mapTalabatStatusToStandard(orderData.status),
        statusUpdatedAt: new Date(orderData.status_updated_at),
        estimatedDeliveryTime: orderData.estimated_delivery_time 
          ? new Date(orderData.estimated_delivery_time) 
          : undefined,
        actualDeliveryTime: orderData.delivered_at 
          ? new Date(orderData.delivered_at) 
          : undefined,
        driverLocation: orderData.rider?.location ? {
          latitude: orderData.rider.location.lat,
          longitude: orderData.rider.location.lng,
          lastUpdated: new Date(orderData.rider.location.updated_at)
        } : undefined,
        driverInfo: orderData.rider ? {
          name: orderData.rider.name,
          phone: orderData.rider.phone,
          rating: orderData.rider.rating,
          vehicleInfo: orderData.rider.vehicle_type
        } : undefined,
        trackingUrl: orderData.rider?.tracking_url,
        deliveryAttempts: orderData.delivery_attempts || 1,
        statusHistory: orderData.status_timeline?.map((status: any) => ({
          status: this.mapTalabatStatusToStandard(status.status),
          timestamp: new Date(status.timestamp),
          notes: status.notes
        })) || []
      };

    } catch (error) {
      this.logger.error(`Talabat get order status failed: ${error.message}`);
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
   * Calculate delivery fee with Talabat
   */
  async calculateDeliveryFee(request: DeliveryFeeRequest): Promise<DeliveryFeeResponse> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.post(
        `/brands/${this.brandId}/delivery-fee`,
        {
          pickup_location: this.formatLocationForTalabat(request.pickupAddress),
          delivery_location: this.formatLocationForTalabat(request.deliveryAddress),
          order_value: request.orderValue,
          weight: request.weight || 1,
          dimensions: request.dimensions,
          service_type: this.mapUrgencyToTalabatService(request.urgency),
          scheduled_at: request.scheduledTime?.toISOString(),
          country_code: this.countryCode
        }
      );

      const feeData = response.data;

      return {
        baseFee: feeData.base_fee,
        distanceFee: feeData.distance_fee,
        urgencyFee: feeData.service_fee || 0,
        serviceFee: feeData.platform_fee || 0,
        totalFee: feeData.total_delivery_fee,
        currency: feeData.currency || this.getLocalCurrency(),
        estimatedDeliveryTime: feeData.estimated_delivery_time_minutes,
        maxDeliveryDistance: feeData.max_delivery_distance_km || 25,
        availableServiceTypes: feeData.available_services || ['standard', 'express']
      };

    } catch (error) {
      this.logger.error(`Talabat fee calculation failed: ${error.message}`);
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
   * Validate address with Talabat
   */
  async validateAddress(address: Address): Promise<ValidationResult> {
    try {
      await this.ensureAuthenticated();

      const response = await this.httpClient.post(
        `/brands/${this.brandId}/validate-address`,
        {
          address: this.formatLocationForTalabat(address),
          country_code: this.countryCode
        }
      );

      const validation = response.data;

      return {
        isValid: validation.is_valid,
        normalizedAddress: validation.normalized_address ? 
          this.formatLocationFromTalabat(validation.normalized_address) : undefined,
        suggestions: validation.suggestions?.map(this.formatLocationFromTalabat.bind(this)),
        isServiceableArea: validation.is_serviceable,
        estimatedDeliveryTime: validation.delivery_zone?.estimated_delivery_time
      };

    } catch (error) {
      this.logger.error(`Talabat address validation failed: ${error.message}`);
      return {
        isValid: false,
        errorMessage: error.message,
        isServiceableArea: false
      };
    }
  }

  /**
   * Health check for Talabat service
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; details?: Record<string, any> }> {
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.get('/health', { 
        timeout: 10000,
        headers: {
          'X-Health-Check': 'true'
        }
      });
      
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.status === 200,
        responseTime,
        details: {
          status: response.data.status,
          region: this.countryCode,
          brandId: this.brandId,
          lastCheck: new Date().toISOString(),
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
          region: this.countryCode,
          lastCheck: new Date().toISOString()
        }
      };
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
    return !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt.getTime() - 120000; // 2 minutes buffer
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new ProviderAuthenticationError(this.providerType, 'No refresh token available');
    }

    const response: AxiosResponse<TalabatAuthResponse> = await this.httpClient.post('/oauth/refresh', {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      brand_id: this.brandId
    });

    const { access_token, refresh_token, expires_in } = response.data;

    this.accessToken = access_token;
    this.refreshToken = refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));
  }

  private validateTalabatOrder(order: StandardOrderFormat): void {
    if (!order.orderId) throw new ProviderValidationError(this.providerType, 'Order ID is required');
    if (!order.customer.phone) throw new ProviderValidationError(this.providerType, 'Customer phone is required');
    if (!order.deliveryAddress.street) throw new ProviderValidationError(this.providerType, 'Delivery address is required');
    if (order.items.length === 0) throw new ProviderValidationError(this.providerType, 'Order must have items');
    if (order.total <= 0) throw new ProviderValidationError(this.providerType, 'Order total must be positive');
    
    // Talabat-specific validations
    if (!this.brandId) throw new ProviderValidationError(this.providerType, 'Brand ID is required');
    if (order.total > this.capabilities.maxOrderValue) {
      throw new ProviderValidationError(this.providerType, `Order value exceeds maximum: ${this.capabilities.maxOrderValue}`);
    }
  }

  private async getDeliveryZone(address: Address): Promise<TalabatDeliveryZone> {
    const response = await this.httpClient.post(
      `/brands/${this.brandId}/delivery-zones/lookup`,
      {
        location: this.formatLocationForTalabat(address),
        country_code: this.countryCode
      }
    );

    return response.data.zone;
  }

  private transformOrderToTalabatFormat(order: StandardOrderFormat, zone: TalabatDeliveryZone): any {
    return {
      partner_order_id: order.orderId,
      brand_id: this.brandId,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        language: 'en' // Can be configured based on region
      },
      delivery_address: {
        ...this.formatLocationForTalabat(order.deliveryAddress),
        zone_id: zone.zone_id,
        instructions: order.specialInstructions
      },
      items: order.items.map(item => ({
        name: item.name,
        name_ar: item.nameAr, // Arabic name for Gulf markets
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        modifiers: item.modifiers?.map(mod => ({
          name: mod.name,
          price: mod.price
        })),
        special_instructions: item.instructions
      })),
      order_summary: {
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        tax_amount: order.taxes || 0,
        discount_amount: order.discount || 0,
        total_amount: order.total,
        currency: this.getLocalCurrency()
      },
      payment_method: this.mapPaymentMethodToTalabat(order.paymentMethod),
      delivery_options: {
        type: order.priority === 'express' ? 'express' : 'standard',
        scheduled_at: order.scheduledDeliveryTime?.toISOString(),
        estimated_preparation_time: order.estimatedPreparationTime
      },
      notifications: {
        webhook_url: this.config.webhookConfig?.url,
        send_sms: true,
        language: 'en'
      }
    };
  }

  private formatLocationForTalabat(address: Address): any {
    return {
      street_address: address.street,
      city: address.city,
      area: address.area,
      building: address.building,
      floor: address.floor,
      apartment: address.apartment,
      latitude: address.latitude,
      longitude: address.longitude,
      landmark: address.landmark,
      country_code: this.countryCode
    };
  }

  private formatLocationFromTalabat(talabatLocation: any): Address {
    return {
      street: talabatLocation.street_address,
      city: talabatLocation.city,
      area: talabatLocation.area,
      building: talabatLocation.building,
      floor: talabatLocation.floor,
      apartment: talabatLocation.apartment,
      latitude: talabatLocation.latitude,
      longitude: talabatLocation.longitude,
      landmark: talabatLocation.landmark
    };
  }

  private mapTalabatStatusToStandard(talabatStatus: string): "pending" | "cancelled" | "delivered" | "failed" | "confirmed" | "picked_up" | "in_transit" | "preparing" | "ready" {
    const statusMap: Record<string, string> = {
      'placed': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'picked_up': 'picked_up',
      'on_the_way': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return (statusMap[talabatStatus] || 'pending') as "pending" | "cancelled" | "delivered" | "failed" | "confirmed" | "picked_up" | "in_transit" | "preparing" | "ready";
  }

  private mapPaymentMethodToTalabat(paymentMethod: string): string {
    const methodMap: Record<string, string> = {
      'cash': 'cash_on_delivery',
      'card': 'credit_card',
      'wallet': 'digital_wallet',
      'online': 'online_payment'
    };

    return methodMap[paymentMethod] || 'cash_on_delivery';
  }

  private mapUrgencyToTalabatService(urgency: string): string {
    const urgencyMap: Record<string, string> = {
      'normal': 'standard',
      'urgent': 'express',
      'express': 'express',
      'scheduled': 'scheduled'
    };

    return urgencyMap[urgency] || 'standard';
  }

  private mapCancelReasonToTalabat(reason?: string): string {
    if (!reason) return 'restaurant_cancelled';
    
    const reasonMap: Record<string, string> = {
      'out_of_stock': 'item_unavailable',
      'kitchen_busy': 'restaurant_busy',
      'customer_request': 'customer_cancelled',
      'technical_issue': 'system_error'
    };

    return reasonMap[reason] || 'restaurant_cancelled';
  }

  private getLocalCurrency(): string {
    const currencyMap: Record<string, string> = {
      'AE': 'AED', // UAE
      'SA': 'SAR', // Saudi Arabia
      'KW': 'KWD', // Kuwait
      'BH': 'BHD', // Bahrain
      'OM': 'OMR', // Oman
      'QA': 'QAR', // Qatar
      'JO': 'JOD', // Jordan
      'EG': 'EGP'  // Egypt
    };

    return currencyMap[this.countryCode || 'AE'] || 'AED';
  }
}