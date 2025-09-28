/**
 * Error Handler Utility for Talabat Integration
 * Provides standardized error handling and recovery mechanisms
 */

const Logger = require('./logger');

class ErrorHandler {
  constructor(context = 'ErrorHandler') {
    this.logger = new Logger(context);
    this.errorCounts = new Map();
    this.circuitBreaker = new Map();
  }

  /**
   * Handle webhook processing errors
   */
  handleWebhookError(error, webhookData, provider = 'unknown') {
    const errorId = `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorInfo = {
      errorId,
      provider,
      type: 'webhook_processing',
      message: error.message,
      stack: error.stack,
      webhookData: this.sanitizeWebhookData(webhookData),
      timestamp: new Date().toISOString(),
      severity: this.classifyErrorSeverity(error)
    };

    // Increment error count for this provider
    this.incrementErrorCount(provider);

    // Log the error
    this.logger.error(`Webhook processing failed for ${provider}`, error, {
      errorId,
      provider,
      severity: errorInfo.severity
    });

    // Check if circuit breaker should be triggered
    this.checkCircuitBreaker(provider);

    return errorInfo;
  }

  /**
   * Handle transformation errors
   */
  handleTransformationError(error, originalData, provider = 'unknown') {
    const errorId = `transform_${provider}_${Date.now()}`;

    const errorInfo = {
      errorId,
      provider,
      type: 'transformation',
      message: error.message,
      stack: error.stack,
      originalDataKeys: Object.keys(originalData || {}),
      timestamp: new Date().toISOString(),
      severity: this.classifyErrorSeverity(error)
    };

    this.logger.error(`Transformation failed for ${provider}`, error, {
      errorId,
      provider,
      dataKeys: errorInfo.originalDataKeys
    });

    return errorInfo;
  }

  /**
   * Handle forwarding errors
   */
  handleForwardingError(error, transformedData, targetUrl, provider = 'unknown') {
    const errorId = `forward_${provider}_${Date.now()}`;

    const errorInfo = {
      errorId,
      provider,
      type: 'forwarding',
      message: error.message,
      stack: error.stack,
      targetUrl,
      httpStatus: error.response?.status || 'unknown',
      httpData: error.response?.data || null,
      timestamp: new Date().toISOString(),
      severity: this.classifyForwardingErrorSeverity(error)
    };

    this.logger.error(`Forwarding failed for ${provider}`, error, {
      errorId,
      provider,
      targetUrl,
      httpStatus: errorInfo.httpStatus
    });

    return errorInfo;
  }

  /**
   * Classify error severity
   */
  classifyErrorSeverity(error) {
    // Critical errors that require immediate attention
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('timeout') ||
        error.message.includes('network')) {
      return 'critical';
    }

    // High severity - data integrity issues
    if (error.message.includes('validation') ||
        error.message.includes('required field') ||
        error.message.includes('invalid format')) {
      return 'high';
    }

    // Medium severity - recoverable errors
    if (error.message.includes('parsing') ||
        error.message.includes('transformation')) {
      return 'medium';
    }

    // Low severity - minor issues
    return 'low';
  }

  /**
   * Classify forwarding error severity based on HTTP status
   */
  classifyForwardingErrorSeverity(error) {
    const status = error.response?.status;

    if (!status || status >= 500) {
      return 'critical'; // Server errors
    }

    if (status === 404 || status === 403) {
      return 'high'; // Configuration issues
    }

    if (status >= 400) {
      return 'medium'; // Client errors
    }

    return 'low';
  }

  /**
   * Increment error count for provider
   */
  incrementErrorCount(provider) {
    const current = this.errorCounts.get(provider) || 0;
    this.errorCounts.set(provider, current + 1);
  }

  /**
   * Check if circuit breaker should be triggered
   */
  checkCircuitBreaker(provider) {
    const errorCount = this.errorCounts.get(provider) || 0;
    const threshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 10;

    if (errorCount >= threshold) {
      const breakerInfo = {
        provider,
        errorCount,
        threshold,
        triggeredAt: new Date().toISOString(),
        status: 'open'
      };

      this.circuitBreaker.set(provider, breakerInfo);

      this.logger.error(`Circuit breaker triggered for ${provider}`, null, {
        provider,
        errorCount,
        threshold
      });

      // Auto-reset after 5 minutes
      setTimeout(() => {
        this.resetCircuitBreaker(provider);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Reset circuit breaker for provider
   */
  resetCircuitBreaker(provider) {
    this.circuitBreaker.delete(provider);
    this.errorCounts.set(provider, 0);

    this.logger.info(`Circuit breaker reset for ${provider}`, {
      provider,
      status: 'reset'
    });
  }

  /**
   * Check if provider is circuit broken
   */
  isCircuitBroken(provider) {
    return this.circuitBreaker.has(provider);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(provider) {
    return this.circuitBreaker.get(provider) || { status: 'closed' };
  }

  /**
   * Sanitize webhook data for logging (remove sensitive info)
   */
  sanitizeWebhookData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'authorization',
      'creditCard', 'cvv', 'ssn', 'phoneNumber', 'email'
    ];

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Create retry strategy for failed operations
   */
  createRetryStrategy(operation, maxRetries = 3, baseDelay = 1000) {
    return async (...args) => {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation(...args);
        } catch (error) {
          lastError = error;

          if (attempt === maxRetries) {
            break;
          }

          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff

          this.logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, {
            operation: operation.name,
            attempt,
            maxRetries,
            delay,
            error: error.message
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {};

    for (const [provider, count] of this.errorCounts.entries()) {
      stats[provider] = {
        errorCount: count,
        circuitBreakerStatus: this.getCircuitBreakerStatus(provider)
      };
    }

    return {
      providers: stats,
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      circuitBreakersOpen: this.circuitBreaker.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for error handler
   */
  healthCheck() {
    const stats = this.getErrorStats();
    const isHealthy = stats.circuitBreakersOpen === 0 && stats.totalErrors < 100;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      errorStats: stats,
      circuitBreakers: Array.from(this.circuitBreaker.keys()),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ErrorHandler;