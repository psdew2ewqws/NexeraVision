/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides fault tolerance for external dependencies:
 * - Prevents cascade failures
 * - Automatic recovery attempts
 * - Configurable failure thresholds
 * - Exponential backoff strategies
 */

class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.log = service.log;

    // Configuration
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 30000,
      monitoringPeriod: options.monitoringPeriod || 10000,
      halfOpenMaxCalls: options.halfOpenMaxCalls || 3,
      ...options
    };

    // State management
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;

    // Metrics
    this.metrics = {
      totalCalls: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalSuccesses: 0,
      stateChanges: 0,
      lastStateChange: null
    };

    this.log.info(`🔒 Circuit Breaker initialized for ${service.serviceName || 'service'}`);
  }

  async execute(operation, operationName = 'operation') {
    this.metrics.totalCalls++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker is OPEN for ${operationName}`);
        error.circuitBreakerState = this.state;
        throw error;
      }

      // Transition to HALF_OPEN
      this.changeState('HALF_OPEN');
    }

    if (this.state === 'HALF_OPEN' && this.successCount >= this.options.halfOpenMaxCalls) {
      const error = new Error(`Circuit breaker HALF_OPEN limit reached for ${operationName}`);
      error.circuitBreakerState = this.state;
      throw error;
    }

    try {
      const result = await this.executeWithTimeout(operation, operationName);
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(error, operationName);
      throw error;
    }
  }

  async executeWithTimeout(operation, operationName) {
    const timeout = this.options.timeout || 30000;

    return Promise.race([
      operation(),
      new Promise((_, reject) => {
        setTimeout(() => {
          this.metrics.totalTimeouts++;
          reject(new Error(`${operationName} timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  onSuccess(operationName) {
    this.failureCount = 0;
    this.successCount++;
    this.metrics.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.options.halfOpenMaxCalls) {
        this.changeState('CLOSED');
      }
    }

    this.log.debug(`🟢 Circuit Breaker success: ${operationName}`);
  }

  onFailure(error, operationName) {
    this.failureCount++;
    this.metrics.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.changeState('OPEN');
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.changeState('OPEN');
    }

    this.log.warn(`🔴 Circuit Breaker failure: ${operationName}`, {
      error: error.message,
      failureCount: this.failureCount,
      state: this.state
    });
  }

  changeState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.metrics.stateChanges++;
    this.metrics.lastStateChange = new Date().toISOString();

    switch (newState) {
      case 'OPEN':
        this.nextAttempt = Date.now() + this.options.recoveryTimeout;
        this.successCount = 0;
        break;
      case 'HALF_OPEN':
        this.successCount = 0;
        break;
      case 'CLOSED':
        this.failureCount = 0;
        this.successCount = 0;
        break;
    }

    this.log.info(`🔄 Circuit Breaker state change: ${oldState} → ${newState}`);
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      metrics: this.metrics,
      options: this.options,
      isOpen: this.state === 'OPEN',
      isHalfOpen: this.state === 'HALF_OPEN',
      isClosed: this.state === 'CLOSED'
    };
  }

  reset() {
    this.changeState('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.log.info('🔄 Circuit Breaker reset to CLOSED state');
  }
}

module.exports = CircuitBreaker;