import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * Backend Client Service
 * Handles communication with the main backend service
 */
@Injectable()
export class BackendClientService {
  private readonly logger = new Logger(BackendClientService.name);
  private readonly backendUrl: string;
  private readonly apiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private circuitBreaker: CircuitBreakerService,
  ) {
    this.backendUrl = this.configService.get('app.backend.url');
    this.apiKey = this.configService.get('app.backend.apiKey');
  }

  /**
   * Create order in main backend
   */
  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const endpoint = `${this.backendUrl}/api/v1/orders/delivery`;

    try {
      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(async () => {
        const response = await firstValueFrom(
          this.httpService.post(endpoint, orderData, {
            headers: {
              'Content-Type': 'application/json',
              'X-AUTH': this.apiKey,
              'X-Service': 'integration-service',
            },
          }),
        );

        return response.data;
      });

      if (!result) {
        // Circuit breaker is in HALF_OPEN state, retry
        return await this.createOrderWithRetry(orderData);
      }

      this.logger.log(`Order created successfully in backend: ${result.id}`);

      return {
        success: true,
        orderId: result.id,
      };
    } catch (error) {
      return this.handleBackendError(error);
    }
  }

  /**
   * Update order status in main backend
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    metadata?: any,
  ): Promise<{ success: boolean; error?: string }> {
    const endpoint = `${this.backendUrl}/api/v1/orders/${orderId}/status`;

    try {
      await this.circuitBreaker.execute(async () => {
        const response = await firstValueFrom(
          this.httpService.patch(
            endpoint,
            {
              status,
              metadata,
              updatedAt: new Date().toISOString(),
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-AUTH': this.apiKey,
                'X-Service': 'integration-service',
              },
            },
          ),
        );

        return response.data;
      });

      this.logger.log(`Order ${orderId} status updated to ${status}`);

      return { success: true };
    } catch (error) {
      return this.handleBackendError(error);
    }
  }

  /**
   * Get order from main backend
   */
  async getOrder(orderId: string): Promise<any> {
    const endpoint = `${this.backendUrl}/api/v1/orders/${orderId}`;

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const response = await firstValueFrom(
          this.httpService.get(endpoint, {
            headers: {
              'X-AUTH': this.apiKey,
              'X-Service': 'integration-service',
            },
          }),
        );

        return response.data;
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for backend service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    const endpoint = `${this.backendUrl}/api/v1/health`;
    const startTime = Date.now();

    try {
      await firstValueFrom(
        this.httpService.get(endpoint, {
          timeout: 3000,
        }),
      );

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Create order with retry logic
   */
  private async createOrderWithRetry(orderData: any, attempt = 1): Promise<any> {
    const maxRetries = 3;
    const baseDelay = 1000;

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.backendUrl}/api/v1/orders/delivery`, orderData, {
          headers: {
            'Content-Type': 'application/json',
            'X-AUTH': this.apiKey,
            'X-Service': 'integration-service',
            'X-Retry-Attempt': attempt.toString(),
          },
        }),
      );

      return {
        success: true,
        orderId: response.data.id,
      };
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Retrying order creation, attempt ${attempt + 1} after ${delay}ms`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.createOrderWithRetry(orderData, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Handle backend errors
   */
  private handleBackendError(error: any): { success: boolean; error: string } {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      this.logger.error(`Backend error (${status}): ${message}`);

      // Determine if error is retryable
      if (status && status >= 500) {
        return {
          success: false,
          error: `Backend service error: ${message}`,
        };
      }

      if (status === 400) {
        return {
          success: false,
          error: `Invalid order data: ${message}`,
        };
      }

      if (status === 401 || status === 403) {
        return {
          success: false,
          error: 'Authentication failed with backend service',
        };
      }
    }

    // Circuit breaker or network errors
    if (error.message && error.message.includes('Circuit breaker')) {
      return {
        success: false,
        error: 'Backend service temporarily unavailable',
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error communicating with backend',
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitStatus() {
    return this.circuitBreaker.getStats();
  }
}