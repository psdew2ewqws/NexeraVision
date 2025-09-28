// ================================================
// Retry Mechanism Service
// Handles Retry Logic, Rate Limiting, and Error Recovery
// ================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

// Types
import { RetryStrategy, SyncQueueItem, PlatformCapabilities } from '../types/sync.types';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableStatuses: string[];
  retryableErrors: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipOnSuccess: boolean;
  resetOnSuccess: boolean;
}

@Injectable()
export class RetryMechanismService {
  private readonly logger = new Logger(RetryMechanismService.name);
  private readonly retryQueue = new Map<string, SyncQueueItem>();
  private readonly rateLimiters = new Map<string, any>();
  private readonly activeRetries = new Set<string>();

  // Default retry configurations by platform
  private readonly defaultRetryConfigs: Record<string, RetryConfig> = {
    careem: {
      maxRetries: 3,
      baseDelay: 5000, // 5 seconds
      maxDelay: 300000, // 5 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryableStatuses: ['timeout', 'server_error', 'rate_limit', 'network_error'],
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']
    },
    talabat: {
      maxRetries: 3,
      baseDelay: 3000, // 3 seconds
      maxDelay: 180000, // 3 minutes
      backoffMultiplier: 2.5,
      jitterFactor: 0.15,
      retryableStatuses: ['timeout', 'server_error', 'rate_limit', 'network_error'],
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']
    },
    deliveroo: {
      maxRetries: 4,
      baseDelay: 4000, // 4 seconds
      maxDelay: 240000, // 4 minutes
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      retryableStatuses: ['timeout', 'server_error', 'rate_limit', 'network_error'],
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']
    }
  };

  // Rate limiting configurations by platform
  private readonly rateLimitConfigs: Record<string, RateLimitConfig> = {
    careem: {
      windowMs: 60000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      skipOnSuccess: true,
      resetOnSuccess: false
    },
    talabat: {
      windowMs: 60000, // 1 minute
      maxRequests: 40, // 40 requests per minute
      skipOnSuccess: true,
      resetOnSuccess: false
    },
    deliveroo: {
      windowMs: 60000, // 1 minute
      maxRequests: 50, // 50 requests per minute
      skipOnSuccess: true,
      resetOnSuccess: false
    }
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.initializeRateLimiters();
  }

  // ================================================
  // RETRY LOGIC
  // ================================================

  /**
   * Determine if an error is retryable
   */
  isRetryableError(platformType: string, error: any): boolean {
    const config = this.getRetryConfig(platformType);

    // Check by error code
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check by error message
    if (error.message) {
      return config.retryableErrors.some(retryableError =>
        error.message.toLowerCase().includes(retryableError.toLowerCase())
      );
    }

    // Check by HTTP status
    if (error.response?.status) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408; // Server errors, rate limit, timeout
    }

    // Check by custom status
    if (error.status && config.retryableStatuses.includes(error.status)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for next retry attempt
   */
  calculateRetryDelay(platformType: string, attempt: number): number {
    const config = this.getRetryConfig(platformType);

    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * (Math.random() - 0.5);

    return Math.max(1000, exponentialDelay + jitter); // Minimum 1 second
  }

  /**
   * Check if sync can be retried
   */
  async canRetry(syncId: string, platformType: string): Promise<boolean> {
    const syncLog = await this.prisma.platformSyncLog.findUnique({
      where: { id: syncId }
    });

    if (!syncLog) {
      return false;
    }

    const config = this.getRetryConfig(platformType);

    // Check retry count
    if (syncLog.retryCount >= config.maxRetries) {
      return false;
    }

    // Check if already being retried
    if (this.activeRetries.has(syncId)) {
      return false;
    }

    // Check if error is retryable
    if (syncLog.errorMessage) {
      const error = { message: syncLog.errorMessage };
      return this.isRetryableError(platformType, error);
    }

    return syncLog.status === 'failed';
  }

  /**
   * Schedule sync for retry
   */
  async scheduleRetry(syncId: string, platformType: string, delay?: number): Promise<boolean> {
    try {
      const syncLog = await this.prisma.platformSyncLog.findUnique({
        where: { id: syncId }
      });

      if (!syncLog || !(await this.canRetry(syncId, platformType))) {
        return false;
      }

      const retryDelay = delay || this.calculateRetryDelay(platformType, syncLog.retryCount);
      const scheduledAt = new Date(Date.now() + retryDelay);

      // Add to retry queue
      const queueItem: SyncQueueItem = {
        syncId,
        platformType,
        platformMenuId: syncLog.platformMenuId,
        priority: this.calculateRetryPriority(syncLog.retryCount),
        scheduledAt,
        retryCount: syncLog.retryCount,
        configuration: syncLog.configuration as any,
        userId: syncLog.userId,
        companyId: syncLog.companyId
      };

      this.retryQueue.set(syncId, queueItem);

      // Update sync log
      await this.prisma.platformSyncLog.update({
        where: { id: syncId },
        data: {
          status: 'scheduled_retry',
          nextRetryAt: scheduledAt,
          retryCount: syncLog.retryCount + 1
        }
      });

      this.logger.log(`Scheduled retry for sync ${syncId} in ${retryDelay}ms`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to schedule retry for sync ${syncId}:`, error);
      return false;
    }
  }

  /**
   * Process retry queue (called by cron job)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processRetryQueue(): Promise<void> {
    const now = new Date();
    const readyItems: SyncQueueItem[] = [];

    // Find items ready for retry
    this.retryQueue.forEach((item, syncId) => {
      if (item.scheduledAt <= now && !this.activeRetries.has(syncId)) {
        readyItems.push(item);
      }
    });

    // Sort by priority (higher priority first)
    readyItems.sort((a, b) => b.priority - a.priority);

    // Process retries (max 5 concurrent)
    const maxConcurrentRetries = 5;
    const toProcess = readyItems.slice(0, maxConcurrentRetries);

    for (const item of toProcess) {
      this.executeRetry(item).catch(error => {
        this.logger.error(`Retry execution failed for ${item.syncId}:`, error);
      });
    }
  }

  /**
   * Execute a retry
   */
  private async executeRetry(item: SyncQueueItem): Promise<void> {
    this.activeRetries.add(item.syncId);
    this.retryQueue.delete(item.syncId);

    try {
      this.logger.log(`Executing retry for sync ${item.syncId} (attempt ${item.retryCount})`);

      // Emit retry started event
      this.eventEmitter.emit('sync.retry-started', {
        syncId: item.syncId,
        attempt: item.retryCount,
        platformType: item.platformType
      });

      // Check rate limits before proceeding
      if (!(await this.checkRateLimit(item.platformType))) {
        // Reschedule if rate limited
        await this.scheduleRetry(item.syncId, item.platformType, 60000); // 1 minute delay
        return;
      }

      // Update sync status
      await this.prisma.platformSyncLog.update({
        where: { id: item.syncId },
        data: {
          status: 'retrying',
          retryStartedAt: new Date()
        }
      });

      // Emit retry initiated event for the platform sync service to pick up
      this.eventEmitter.emit('sync.retry-initiated', {
        syncId: item.syncId,
        platformType: item.platformType,
        platformMenuId: item.platformMenuId,
        configuration: item.configuration,
        userId: item.userId,
        companyId: item.companyId,
        retryCount: item.retryCount
      });

    } catch (error) {
      this.logger.error(`Retry execution failed for ${item.syncId}:`, error);

      // Update sync status to failed
      await this.prisma.platformSyncLog.update({
        where: { id: item.syncId },
        data: {
          status: 'failed',
          errorMessage: `Retry failed: ${error.message}`
        }
      });
    } finally {
      this.activeRetries.delete(item.syncId);
    }
  }

  // ================================================
  // RATE LIMITING
  // ================================================

  /**
   * Initialize rate limiters for all platforms
   */
  private initializeRateLimiters(): void {
    Object.keys(this.rateLimitConfigs).forEach(platformType => {
      this.rateLimiters.set(platformType, {
        requests: [],
        blocked: false,
        blockedUntil: null
      });
    });
  }

  /**
   * Check if platform is within rate limits
   */
  async checkRateLimit(platformType: string): Promise<boolean> {
    const config = this.rateLimitConfigs[platformType];
    if (!config) {
      return true; // No rate limiting configured
    }

    const limiter = this.rateLimiters.get(platformType);
    if (!limiter) {
      return true;
    }

    const now = Date.now();

    // Check if currently blocked
    if (limiter.blocked && limiter.blockedUntil && now < limiter.blockedUntil) {
      this.logger.warn(`Rate limit exceeded for ${platformType}. Blocked until ${new Date(limiter.blockedUntil)}`);
      return false;
    }

    // Clear old requests outside the window
    limiter.requests = limiter.requests.filter((timestamp: number) =>
      now - timestamp < config.windowMs
    );

    // Check if we can make a new request
    if (limiter.requests.length >= config.maxRequests) {
      // Block for the remainder of the window
      const oldestRequest = Math.min(...limiter.requests);
      limiter.blocked = true;
      limiter.blockedUntil = oldestRequest + config.windowMs;

      this.logger.warn(`Rate limit exceeded for ${platformType}. Blocking until ${new Date(limiter.blockedUntil)}`);
      return false;
    }

    // Record this request
    limiter.requests.push(now);
    limiter.blocked = false;
    limiter.blockedUntil = null;

    return true;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(platformType: string): any {
    const config = this.rateLimitConfigs[platformType];
    const limiter = this.rateLimiters.get(platformType);

    if (!config || !limiter) {
      return null;
    }

    const now = Date.now();
    const recentRequests = limiter.requests.filter((timestamp: number) =>
      now - timestamp < config.windowMs
    );

    return {
      platformType,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      currentRequests: recentRequests.length,
      remainingRequests: Math.max(0, config.maxRequests - recentRequests.length),
      blocked: limiter.blocked,
      blockedUntil: limiter.blockedUntil ? new Date(limiter.blockedUntil) : null,
      resetAt: recentRequests.length > 0
        ? new Date(Math.min(...recentRequests) + config.windowMs)
        : new Date()
    };
  }

  // ================================================
  // CIRCUIT BREAKER PATTERN
  // ================================================

  private circuitBreakers = new Map<string, any>();

  /**
   * Initialize circuit breaker for platform
   */
  private initializeCircuitBreaker(platformType: string): void {
    this.circuitBreakers.set(platformType, {
      state: 'closed', // closed, open, half-open
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
      nextAttemptTime: null,
      config: {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        successThreshold: 3
      }
    });
  }

  /**
   * Check if circuit breaker allows request
   */
  async checkCircuitBreaker(platformType: string): Promise<boolean> {
    if (!this.circuitBreakers.has(platformType)) {
      this.initializeCircuitBreaker(platformType);
    }

    const breaker = this.circuitBreakers.get(platformType);
    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open':
        if (now >= breaker.nextAttemptTime) {
          breaker.state = 'half-open';
          breaker.successCount = 0;
          this.logger.log(`Circuit breaker for ${platformType} moved to half-open state`);
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record success for circuit breaker
   */
  recordSuccess(platformType: string): void {
    const breaker = this.circuitBreakers.get(platformType);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.successCount++;
      if (breaker.successCount >= breaker.config.successThreshold) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        this.logger.log(`Circuit breaker for ${platformType} closed after successful recovery`);
      }
    } else {
      breaker.failureCount = 0;
    }
  }

  /**
   * Record failure for circuit breaker
   */
  recordFailure(platformType: string): void {
    const breaker = this.circuitBreakers.get(platformType);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.state === 'half-open') {
      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + breaker.config.recoveryTimeout;
      this.logger.warn(`Circuit breaker for ${platformType} opened after failure during half-open state`);
    } else if (breaker.failureCount >= breaker.config.failureThreshold) {
      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + breaker.config.recoveryTimeout;
      this.logger.warn(`Circuit breaker for ${platformType} opened after ${breaker.failureCount} failures`);
    }
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private getRetryConfig(platformType: string): RetryConfig {
    return this.defaultRetryConfigs[platformType] || this.defaultRetryConfigs.careem;
  }

  private calculateRetryPriority(retryCount: number): number {
    // Lower retry counts get higher priority
    return Math.max(1, 10 - retryCount);
  }

  /**
   * Get retry queue statistics
   */
  getRetryQueueStats(): any {
    const now = new Date();
    const queueItems = Array.from(this.retryQueue.values());

    return {
      totalItems: queueItems.length,
      readyItems: queueItems.filter(item => item.scheduledAt <= now).length,
      scheduledItems: queueItems.filter(item => item.scheduledAt > now).length,
      activeRetries: this.activeRetries.size,
      platformBreakdown: this.getQueuePlatformBreakdown(queueItems)
    };
  }

  private getQueuePlatformBreakdown(items: SyncQueueItem[]): any {
    const breakdown: any = {};
    items.forEach(item => {
      if (!breakdown[item.platformType]) {
        breakdown[item.platformType] = 0;
      }
      breakdown[item.platformType]++;
    });
    return breakdown;
  }

  /**
   * Clear retry queue for specific sync
   */
  clearRetryQueue(syncId: string): boolean {
    return this.retryQueue.delete(syncId);
  }

  /**
   * Get health status of retry system
   */
  getHealthStatus(): any {
    const queueStats = this.getRetryQueueStats();
    const rateLimitStatuses = {};
    const circuitBreakerStatuses = {};

    // Get rate limit statuses
    Object.keys(this.rateLimitConfigs).forEach(platformType => {
      rateLimitStatuses[platformType] = this.getRateLimitStatus(platformType);
    });

    // Get circuit breaker statuses
    this.circuitBreakers.forEach((breaker, platformType) => {
      circuitBreakerStatuses[platformType] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        nextAttemptTime: breaker.nextAttemptTime ? new Date(breaker.nextAttemptTime) : null
      };
    });

    return {
      retryQueue: queueStats,
      rateLimits: rateLimitStatuses,
      circuitBreakers: circuitBreakerStatuses,
      timestamp: new Date()
    };
  }
}