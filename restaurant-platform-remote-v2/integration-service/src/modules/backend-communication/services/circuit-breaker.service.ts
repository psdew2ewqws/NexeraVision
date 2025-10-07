import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit Breaker Service
 * Implements the circuit breaker pattern to prevent cascading failures
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private nextAttemptTime: Date | null = null;

  // Configuration
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(private configService: ConfigService) {
    const circuitConfig = this.configService.get('app.circuitBreaker');
    this.threshold = circuitConfig.errorThresholdPercentage;
    this.timeout = circuitConfig.timeout;
    this.resetTimeout = circuitConfig.resetTimeout;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      return this.handleOpenState();
    }

    try {
      // Execute the function with timeout
      const result = await this.executeWithTimeout(fn);

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure();

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Circuit breaker timeout after ${this.timeout}ms`));
      }, this.timeout);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle open state
   */
  private async handleOpenState(): Promise<any> {
    const now = new Date();

    // Check if we should transition to half-open
    if (this.nextAttemptTime && now >= this.nextAttemptTime) {
      this.logger.log('Circuit breaker transitioning to HALF_OPEN state');
      this.state = CircuitState.HALF_OPEN;
      return null; // Allow one attempt
    }

    // Circuit is still open
    const waitTime = this.nextAttemptTime
      ? Math.ceil((this.nextAttemptTime.getTime() - now.getTime()) / 1000)
      : 0;

    throw new Error(
      `Circuit breaker is open. Service unavailable. Next attempt in ${waitTime} seconds.`,
    );
  }

  /**
   * Record successful execution
   */
  private onSuccess() {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker transitioning to CLOSED state');
      this.state = CircuitState.CLOSED;
      this.reset();
    }
  }

  /**
   * Record failed execution
   */
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker transitioning back to OPEN state');
      this.openCircuit();
      return;
    }

    // Calculate failure rate
    const totalCalls = this.failureCount + this.successCount;
    const failureRate = totalCalls > 0 ? (this.failureCount / totalCalls) * 100 : 0;

    // Check if we should open the circuit
    if (failureRate >= this.threshold && this.failureCount >= 3) {
      this.logger.warn(`Circuit breaker opening: failure rate ${failureRate}% exceeds threshold ${this.threshold}%`);
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit() {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.resetTimeout);
    this.logger.error(`Circuit breaker is now OPEN. Next attempt at ${this.nextAttemptTime.toISOString()}`);
  }

  /**
   * Reset circuit breaker state
   */
  private reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    const totalCalls = this.failureCount + this.successCount;
    const failureRate = totalCalls > 0 ? (this.failureCount / totalCalls) * 100 : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: `${failureRate.toFixed(2)}%`,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Manual circuit reset (for testing/admin purposes)
   */
  manualReset() {
    this.logger.warn('Circuit breaker manually reset');
    this.state = CircuitState.CLOSED;
    this.reset();
  }
}