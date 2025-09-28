import { Injectable, Logger } from '@nestjs/common';
import { 
  DeliveryProviderInterface, 
  StandardOrderFormat, 
  ProviderConfig,
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderAuthenticationError
} from '../interfaces/delivery-provider.interface';
import { DeliveryProviderFactory } from '../factory/delivery-provider.factory';
import { ProviderSelectionEngine, SelectionCriteria, ProviderScore } from './provider-selection.engine';

// Failover configuration interfaces
export interface FailoverConfig {
  maxRetries: number; // Maximum retry attempts per provider
  retryDelayMs: number; // Base delay between retries
  retryBackoffMultiplier: number; // Exponential backoff multiplier
  circuitBreakerThreshold: number; // Failure threshold to open circuit
  circuitBreakerTimeoutMs: number; // Time to keep circuit open
  healthCheckIntervalMs: number; // Health check frequency
  enableCascadeFailover: boolean; // Enable cascading to next provider
  maxCascadeDepth: number; // Maximum provider cascade attempts
}

export interface RetryPolicy {
  retryableErrors: string[]; // Error types that can be retried
  nonRetryableErrors: string[]; // Error types that should not be retried
  customRetryLogic?: (error: any, attempt: number) => boolean;
}

export interface CircuitBreakerState {
  providerId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttemptTime: Date | null;
}

export interface FailoverAttempt {
  providerId: string;
  providerType: string;
  attempt: number;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
  responseTime?: number;
}

export interface FailoverResult {
  success: boolean;
  finalProvider?: ProviderScore;
  allAttempts: FailoverAttempt[];
  totalTime: number;
  failedProviders: string[];
  fallbackUsed: boolean;
  circuitBreakersTripped: string[];
  recommendedActions: string[];
}

export interface ProviderHealth {
  providerId: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  responseTime: number;
  consecutiveFailures: number;
  uptime: number; // 0-1 (percentage)
  errorRate: number; // 0-1 (percentage)
}

@Injectable()
export class FailoverEngine {
  private readonly logger = new Logger(FailoverEngine.name);
  
  // Circuit breaker states for each provider
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  
  // Health monitoring data
  private providerHealth = new Map<string, ProviderHealth>();
  
  // Configuration
  private readonly defaultConfig: FailoverConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    retryBackoffMultiplier: 2,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 60000, // 1 minute
    healthCheckIntervalMs: 30000, // 30 seconds
    enableCascadeFailover: true,
    maxCascadeDepth: 3
  };

  private readonly defaultRetryPolicy: RetryPolicy = {
    retryableErrors: [
      'TIMEOUT',
      'RATE_LIMIT',
      'NETWORK_ERROR',
      'TEMPORARY_ERROR',
      'SERVICE_UNAVAILABLE'
    ],
    nonRetryableErrors: [
      'AUTH_FAILED',
      'VALIDATION_ERROR',
      'INSUFFICIENT_FUNDS',
      'UNSUPPORTED_OPERATION'
    ]
  };

  constructor(
    private readonly providerFactory: DeliveryProviderFactory,
    private readonly selectionEngine: ProviderSelectionEngine
  ) {
    this.startHealthCheckMonitoring();
  }

  /**
   * Execute an operation with full failover support
   */
  async executeWithFailover<T>(
    operation: (provider: DeliveryProviderInterface, config: ProviderConfig) => Promise<T>,
    order: StandardOrderFormat,
    availableConfigs: ProviderConfig[],
    selectionCriteria: SelectionCriteria,
    failoverConfig: Partial<FailoverConfig> = {},
    retryPolicy: Partial<RetryPolicy> = {}
  ): Promise<{ result: T; failoverResult: FailoverResult }> {
    const config = { ...this.defaultConfig, ...failoverConfig };
    const policy = { ...this.defaultRetryPolicy, ...retryPolicy };
    const startTime = Date.now();

    this.logger.log(`Starting failover execution for order ${order.orderId} with ${availableConfigs.length} providers`);

    // Filter out providers with open circuit breakers
    const healthyConfigs = this.filterHealthyProviders(availableConfigs);
    
    if (healthyConfigs.length === 0) {
      this.logger.warn('No healthy providers available, attempting recovery');
      // Force circuit breaker recovery attempt
      await this.attemptCircuitBreakerRecovery();
      const recoveredConfigs = this.filterHealthyProviders(availableConfigs);
      
      if (recoveredConfigs.length === 0) {
        return {
          result: null,
          failoverResult: {
            success: false,
            allAttempts: [],
            totalTime: Date.now() - startTime,
            failedProviders: availableConfigs.map(c => c.providerId),
            fallbackUsed: false,
            circuitBreakersTripped: Array.from(this.circuitBreakers.keys()),
            recommendedActions: ['All providers unavailable - manual intervention required']
          }
        };
      }
    }

    // Get prioritized list of providers
    const selectionResult = await this.selectionEngine.selectProvider(
      order,
      healthyConfigs,
      selectionCriteria
    );

    if (!selectionResult.selectedProvider) {
      throw new Error('No suitable provider selected');
    }

    const allAttempts: FailoverAttempt[] = [];
    const failedProviders: string[] = [];
    const circuitBreakersTripped: string[] = [];

    // Primary provider attempt
    let result = await this.attemptProviderOperation(
      operation,
      selectionResult.selectedProvider,
      config,
      policy,
      allAttempts,
      1
    );

    if (result.success) {
      this.recordSuccess(selectionResult.selectedProvider.providerId);
      return {
        result: result.data,
        failoverResult: {
          success: true,
          finalProvider: selectionResult.selectedProvider,
          allAttempts,
          totalTime: Date.now() - startTime,
          failedProviders,
          fallbackUsed: false,
          circuitBreakersTripped,
          recommendedActions: []
        }
      };
    }

    failedProviders.push(selectionResult.selectedProvider.providerId);
    this.recordFailure(selectionResult.selectedProvider.providerId, result.error);

    // Cascade failover to alternative providers
    if (config.enableCascadeFailover && selectionResult.fallbackRecommendations.length > 0) {
      this.logger.log(`Primary provider failed, attempting cascade failover`);
      
      let cascadeDepth = 0;
      for (const fallbackProvider of selectionResult.fallbackRecommendations) {
        if (cascadeDepth >= config.maxCascadeDepth) break;
        
        // Check if provider is healthy
        if (!this.isProviderHealthy(fallbackProvider.providerId)) {
          circuitBreakersTripped.push(fallbackProvider.providerId);
          continue;
        }

        cascadeDepth++;
        this.logger.log(`Attempting cascade failover to ${fallbackProvider.providerType} (depth: ${cascadeDepth})`);

        result = await this.attemptProviderOperation(
          operation,
          fallbackProvider,
          config,
          policy,
          allAttempts,
          cascadeDepth
        );

        if (result.success) {
          this.recordSuccess(fallbackProvider.providerId);
          return {
            result: result.data,
            failoverResult: {
              success: true,
              finalProvider: fallbackProvider,
              allAttempts,
              totalTime: Date.now() - startTime,
              failedProviders,
              fallbackUsed: true,
              circuitBreakersTripped,
              recommendedActions: [`Successfully failed over to ${fallbackProvider.providerType}`]
            }
          };
        }

        failedProviders.push(fallbackProvider.providerId);
        this.recordFailure(fallbackProvider.providerId, result.error);
      }
    }

    // All providers failed
    const recommendedActions = this.generateRecoveryRecommendations(allAttempts, failedProviders);

    return {
      result: null,
      failoverResult: {
        success: false,
        allAttempts,
        totalTime: Date.now() - startTime,
        failedProviders,
        fallbackUsed: config.enableCascadeFailover,
        circuitBreakersTripped,
        recommendedActions
      }
    };
  }

  /**
   * Attempt operation with a specific provider including retries
   */
  private async attemptProviderOperation<T>(
    operation: (provider: DeliveryProviderInterface, config: ProviderConfig) => Promise<T>,
    providerScore: ProviderScore,
    config: FailoverConfig,
    policy: RetryPolicy,
    allAttempts: FailoverAttempt[],
    cascadeLevel: number
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const providerId = providerScore.providerId;
    const providerConfig = this.getProviderConfig(providerId);
    
    if (!providerConfig) {
      return { success: false, error: 'Provider configuration not found' };
    }

    let lastError: any = null;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      const attemptStart = Date.now();
      
      const failoverAttempt: FailoverAttempt = {
        providerId,
        providerType: providerScore.providerType,
        attempt: attempt + (cascadeLevel - 1) * config.maxRetries,
        startTime: new Date(attemptStart),
        success: false
      };

      try {
        this.logger.log(`Attempting ${providerScore.providerType} - attempt ${attempt}/${config.maxRetries}`);
        
        const provider = await this.providerFactory.createProvider(providerConfig);
        const result = await operation(provider, providerConfig);
        
        failoverAttempt.endTime = new Date();
        failoverAttempt.responseTime = Date.now() - attemptStart;
        failoverAttempt.success = true;
        
        allAttempts.push(failoverAttempt);
        
        this.logger.log(`${providerScore.providerType} succeeded on attempt ${attempt}`);
        return { success: true, data: result };

      } catch (error) {
        lastError = error;
        failoverAttempt.endTime = new Date();
        failoverAttempt.responseTime = Date.now() - attemptStart;
        failoverAttempt.error = error.message;
        
        allAttempts.push(failoverAttempt);
        
        this.logger.warn(`${providerScore.providerType} failed attempt ${attempt}: ${error.message}`);

        // Check if error is retryable
        if (!this.isRetryableError(error, policy) || attempt === config.maxRetries) {
          break;
        }

        // Calculate retry delay with exponential backoff
        const delay = config.retryDelayMs * Math.pow(config.retryBackoffMultiplier, attempt - 1);
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const totalDelay = delay + jitter;
        
        this.logger.log(`Retrying ${providerScore.providerType} in ${totalDelay}ms`);
        await this.sleep(totalDelay);
      }
    }

    return { success: false, error: lastError?.message || 'Unknown error' };
  }

  /**
   * Filter providers based on circuit breaker states and health
   */
  private filterHealthyProviders(configs: ProviderConfig[]): ProviderConfig[] {
    return configs.filter(config => this.isProviderHealthy(config.providerId));
  }

  /**
   * Check if provider is healthy (circuit breaker is closed)
   */
  private isProviderHealthy(providerId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (!circuitBreaker) return true;

    if (circuitBreaker.state === 'CLOSED') return true;
    
    if (circuitBreaker.state === 'OPEN') {
      // Check if enough time has passed to attempt half-open
      const now = Date.now();
      if (circuitBreaker.nextAttemptTime && now >= circuitBreaker.nextAttemptTime.getTime()) {
        circuitBreaker.state = 'HALF_OPEN';
        this.logger.log(`Circuit breaker for ${providerId} moved to HALF_OPEN state`);
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow limited requests
    return true;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(providerId: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerId) || this.createCircuitBreaker(providerId);
    
    circuitBreaker.lastSuccessTime = new Date();
    circuitBreaker.failureCount = 0;
    
    if (circuitBreaker.state !== 'CLOSED') {
      circuitBreaker.state = 'CLOSED';
      this.logger.log(`Circuit breaker for ${providerId} reset to CLOSED state`);
    }
    
    this.circuitBreakers.set(providerId, circuitBreaker);
    this.updateProviderHealth(providerId, true);
  }

  /**
   * Record failed operation
   */
  private recordFailure(providerId: string, error?: string): void {
    const circuitBreaker = this.circuitBreakers.get(providerId) || this.createCircuitBreaker(providerId);
    
    circuitBreaker.lastFailureTime = new Date();
    circuitBreaker.failureCount++;
    
    // Check if threshold reached
    if (circuitBreaker.failureCount >= this.defaultConfig.circuitBreakerThreshold) {
      if (circuitBreaker.state !== 'OPEN') {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.nextAttemptTime = new Date(Date.now() + this.defaultConfig.circuitBreakerTimeoutMs);
        
        this.logger.warn(`Circuit breaker for ${providerId} OPENED due to ${circuitBreaker.failureCount} failures`);
      }
    }
    
    this.circuitBreakers.set(providerId, circuitBreaker);
    this.updateProviderHealth(providerId, false, error);
  }

  /**
   * Create new circuit breaker state
   */
  private createCircuitBreaker(providerId: string): CircuitBreakerState {
    return {
      providerId,
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      nextAttemptTime: null
    };
  }

  /**
   * Update provider health metrics
   */
  private updateProviderHealth(providerId: string, success: boolean, error?: string): void {
    const health = this.providerHealth.get(providerId) || {
      providerId,
      isHealthy: true,
      lastHealthCheck: new Date(),
      responseTime: 0,
      consecutiveFailures: 0,
      uptime: 1.0,
      errorRate: 0.0
    };

    health.lastHealthCheck = new Date();
    
    if (success) {
      health.consecutiveFailures = 0;
      health.isHealthy = true;
    } else {
      health.consecutiveFailures++;
      health.isHealthy = health.consecutiveFailures < 3;
    }

    this.providerHealth.set(providerId, health);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any, policy: RetryPolicy): boolean {
    // Custom retry logic takes precedence
    if (policy.customRetryLogic) {
      return policy.customRetryLogic(error, 0);
    }

    const errorCode = error.code || error.name || 'UNKNOWN';

    // Check non-retryable errors first
    if (policy.nonRetryableErrors.includes(errorCode)) {
      return false;
    }

    // Check retryable errors
    if (policy.retryableErrors.includes(errorCode)) {
      return true;
    }

    // Default behavior for common error types
    if (error instanceof ProviderTimeoutError) return true;
    if (error instanceof ProviderRateLimitError) return true;
    if (error instanceof ProviderAuthenticationError) return false; // Auth errors need manual fix
    
    // Network/connection errors are generally retryable
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Attempt to recover circuit breakers in half-open state
   */
  private async attemptCircuitBreakerRecovery(): Promise<void> {
    for (const [providerId, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'OPEN') {
        const now = Date.now();
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime.getTime()) {
          breaker.state = 'HALF_OPEN';
          this.logger.log(`Attempting recovery for circuit breaker: ${providerId}`);
          
          try {
            const config = this.getProviderConfig(providerId);
            if (config) {
              const provider = await this.providerFactory.createProvider(config);
              const health = await provider.healthCheck();
              
              if (health.healthy) {
                this.recordSuccess(providerId);
              } else {
                this.recordFailure(providerId, 'Health check failed');
              }
            }
          } catch (error) {
            this.recordFailure(providerId, error.message);
          }
        }
      }
    }
  }

  /**
   * Start periodic health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.defaultConfig.healthCheckIntervalMs);
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.circuitBreakers.keys()).map(async (providerId) => {
      try {
        const config = this.getProviderConfig(providerId);
        if (!config) return;

        const provider = await this.providerFactory.createProvider(config);
        const startTime = Date.now();
        const health = await provider.healthCheck();
        const responseTime = Date.now() - startTime;

        const currentHealth = this.providerHealth.get(providerId);
        if (currentHealth) {
          currentHealth.lastHealthCheck = new Date();
          currentHealth.responseTime = responseTime;
          currentHealth.isHealthy = health.healthy;
          
          if (!health.healthy) {
            currentHealth.consecutiveFailures++;
          } else {
            currentHealth.consecutiveFailures = 0;
          }
        }

        this.logger.debug(`Health check for ${providerId}: ${health.healthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);

      } catch (error) {
        this.logger.warn(`Health check failed for ${providerId}: ${error.message}`);
        this.updateProviderHealth(providerId, false, error.message);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Generate recovery recommendations
   */
  private generateRecoveryRecommendations(attempts: FailoverAttempt[], failedProviders: string[]): string[] {
    const recommendations: string[] = [];

    // Analyze failure patterns
    const errorTypes = new Map<string, number>();
    attempts.forEach(attempt => {
      if (attempt.error) {
        const errorType = attempt.error.split(':')[0] || 'Unknown';
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      }
    });

    // Generate specific recommendations
    if (errorTypes.has('TIMEOUT')) {
      recommendations.push('Consider increasing timeout values or checking network connectivity');
    }

    if (errorTypes.has('RATE_LIMIT')) {
      recommendations.push('Implement request throttling or upgrade provider plan');
    }

    if (errorTypes.has('AUTH_FAILED')) {
      recommendations.push('Verify provider credentials and refresh authentication tokens');
    }

    if (failedProviders.length === attempts.length) {
      recommendations.push('All providers failed - check system-wide network connectivity');
      recommendations.push('Consider emergency fallback to local delivery or manual processing');
    }

    if (recommendations.length === 0) {
      recommendations.push('Review provider configurations and contact technical support');
    }

    return recommendations;
  }

  /**
   * Get provider configuration (placeholder - would integrate with actual config store)
   */
  private getProviderConfig(providerId: string): ProviderConfig | null {
    // This would typically fetch from database or configuration service
    // For now, return null to indicate configuration should be provided externally
    return null;
  }

  /**
   * Utility method for async sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get provider health status for monitoring
   */
  getProviderHealthStatus(): Map<string, ProviderHealth> {
    return new Map(this.providerHealth);
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(providerId: string): void {
    const breaker = this.circuitBreakers.get(providerId);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      breaker.nextAttemptTime = null;
      this.logger.log(`Manually reset circuit breaker for ${providerId}`);
    }
  }

  /**
   * Get failover statistics
   */
  getFailoverStatistics(): {
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
    healthyProviders: number;
    unhealthyProviders: number;
    averageResponseTime: number;
  } {
    const totalCircuitBreakers = this.circuitBreakers.size;
    const openCircuitBreakers = Array.from(this.circuitBreakers.values())
      .filter(cb => cb.state === 'OPEN').length;
    
    const healthyProviders = Array.from(this.providerHealth.values())
      .filter(h => h.isHealthy).length;
    const unhealthyProviders = this.providerHealth.size - healthyProviders;
    
    const totalResponseTime = Array.from(this.providerHealth.values())
      .reduce((sum, h) => sum + h.responseTime, 0);
    const averageResponseTime = this.providerHealth.size > 0 
      ? totalResponseTime / this.providerHealth.size : 0;

    return {
      totalCircuitBreakers,
      openCircuitBreakers,
      healthyProviders,
      unhealthyProviders,
      averageResponseTime
    };
  }
}