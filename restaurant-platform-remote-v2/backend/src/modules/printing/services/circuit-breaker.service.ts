import { Injectable, Logger } from '@nestjs/common';

/**
 * Circuit Breaker States
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are immediately rejected
 * - HALF_OPEN: Testing if service has recovered
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Error Classification
 * - TRANSIENT: Temporary error that may succeed on retry (network timeout, temporary unavailability)
 * - PERMANENT: Error that won't be fixed by retry (invalid configuration, authentication failure)
 * - UNKNOWN: Unclassified error
 */
export enum ErrorType {
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
  UNKNOWN = 'UNKNOWN',
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes in HALF_OPEN before closing circuit
  timeout: number; // Time to wait before trying again in OPEN state (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
}

interface CircuitMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  transientErrors: number;
  permanentErrors: number;
  circuitOpenedCount: number;
  lastStateChange: Date;
  currentState: CircuitState;
}

/**
 * Circuit Breaker Service for Print Job Reliability
 *
 * Implements circuit breaker pattern to prevent cascading failures
 * and provide graceful degradation when PrinterMaster is unavailable
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  // Circuit breakers per printer
  private circuits: Map<string, {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: Date | null;
    lastSuccessTime: Date | null;
    nextAttemptTime: Date | null;
    config: CircuitBreakerConfig;
    metrics: CircuitMetrics;
  }> = new Map();

  // Default configuration
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Open circuit after 5 consecutive failures
    successThreshold: 2, // Close circuit after 2 consecutive successes in HALF_OPEN
    timeout: 30000, // Wait 30 seconds before trying again
    monitoringPeriod: 60000, // Monitor failures over 60 seconds
  };

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(
    printerId: string,
    operation: () => Promise<T>,
    operationName: string = 'print'
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(printerId);

    // Check if circuit is OPEN
    if (circuit.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuit)) {
        this.logger.log(`[CB-${printerId}] Attempting reset from OPEN to HALF_OPEN for ${operationName}`);
        circuit.state = CircuitState.HALF_OPEN;
        circuit.metrics.lastStateChange = new Date();
      } else {
        const waitTime = circuit.nextAttemptTime
          ? Math.ceil((circuit.nextAttemptTime.getTime() - Date.now()) / 1000)
          : circuit.config.timeout / 1000;

        this.logger.warn(`[CB-${printerId}] Circuit is OPEN, rejecting ${operationName} (retry in ${waitTime}s)`);

        throw new Error(
          `Circuit breaker is OPEN for printer ${printerId}. ` +
          `Service temporarily unavailable. Please try again in ${waitTime} seconds.`
        );
      }
    }

    // Execute operation
    try {
      const result = await operation();
      this.onSuccess(printerId, operationName);
      return result;
    } catch (error) {
      this.onFailure(printerId, error, operationName);
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  private onSuccess(printerId: string, operationName: string): void {
    const circuit = this.getOrCreateCircuit(printerId);
    circuit.successCount++;
    circuit.lastSuccessTime = new Date();
    circuit.metrics.successfulCalls++;
    circuit.metrics.totalCalls++;

    // Clear failure count on success
    circuit.failureCount = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.successCount >= circuit.config.successThreshold) {
        this.logger.log(`[CB-${printerId}] Closing circuit after ${circuit.successCount} successful ${operationName}s`);
        circuit.state = CircuitState.CLOSED;
        circuit.successCount = 0;
        circuit.failureCount = 0;
        circuit.nextAttemptTime = null;
        circuit.metrics.lastStateChange = new Date();
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Already closed, just update metrics
      this.logger.debug(`[CB-${printerId}] ${operationName} successful in CLOSED state`);
    }
  }

  /**
   * Record failed operation
   */
  private onFailure(printerId: string, error: any, operationName: string): void {
    const circuit = this.getOrCreateCircuit(printerId);
    const errorType = this.classifyError(error);

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();
    circuit.metrics.failedCalls++;
    circuit.metrics.totalCalls++;

    // Update error type metrics
    if (errorType === ErrorType.TRANSIENT) {
      circuit.metrics.transientErrors++;
    } else if (errorType === ErrorType.PERMANENT) {
      circuit.metrics.permanentErrors++;
    }

    this.logger.warn(
      `[CB-${printerId}] ${operationName} failed (${errorType}): ${error.message} ` +
      `[Failures: ${circuit.failureCount}/${circuit.config.failureThreshold}]`
    );

    // Clear success count on failure
    circuit.successCount = 0;

    // Check if we should open the circuit
    if (circuit.state === CircuitState.HALF_OPEN) {
      // Immediately open on any failure in HALF_OPEN
      this.openCircuit(circuit, printerId, operationName);
    } else if (circuit.state === CircuitState.CLOSED) {
      // Check failure threshold in CLOSED state
      const recentFailures = this.getRecentFailures(circuit);

      if (recentFailures >= circuit.config.failureThreshold) {
        this.openCircuit(circuit, printerId, operationName);
      }
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(circuit: any, printerId: string, operationName: string): void {
    circuit.state = CircuitState.OPEN;
    circuit.nextAttemptTime = new Date(Date.now() + circuit.config.timeout);
    circuit.metrics.circuitOpenedCount++;
    circuit.metrics.lastStateChange = new Date();

    this.logger.error(
      `[CB-${printerId}] Circuit OPENED after ${circuit.failureCount} failures in ${operationName}. ` +
      `Will retry at ${circuit.nextAttemptTime.toISOString()}`
    );
  }

  /**
   * Check if we should attempt to reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(circuit: any): boolean {
    if (!circuit.nextAttemptTime) return false;
    return Date.now() >= circuit.nextAttemptTime.getTime();
  }

  /**
   * Get recent failures within monitoring period
   */
  private getRecentFailures(circuit: any): number {
    if (!circuit.lastFailureTime) return 0;

    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime.getTime();

    // If last failure was within monitoring period, return current count
    if (timeSinceLastFailure <= circuit.config.monitoringPeriod) {
      return circuit.failureCount;
    }

    // Reset failure count if outside monitoring period
    circuit.failureCount = 0;
    return 0;
  }

  /**
   * Classify error as transient or permanent
   */
  classifyError(error: any): ErrorType {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    // Transient errors (can be retried)
    const transientPatterns = [
      'timeout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'network',
      'socket hang up',
      'enotfound',
      'ehostunreach',
      'enetunreach',
      'temporary',
      'unavailable',
      'service busy',
      'too many requests',
      '503',
      '504',
      '429',
    ];

    // Permanent errors (won't be fixed by retry)
    const permanentPatterns = [
      'authentication',
      'unauthorized',
      'forbidden',
      'not found',
      'invalid',
      'bad request',
      'malformed',
      '400',
      '401',
      '403',
      '404',
      'permission denied',
      'access denied',
    ];

    // Check for transient errors
    if (transientPatterns.some(pattern =>
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    )) {
      return ErrorType.TRANSIENT;
    }

    // Check for permanent errors
    if (permanentPatterns.some(pattern =>
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    )) {
      return ErrorType.PERMANENT;
    }

    // Default to unknown
    return ErrorType.UNKNOWN;
  }

  /**
   * Get or create circuit for printer
   */
  private getOrCreateCircuit(printerId: string) {
    if (!this.circuits.has(printerId)) {
      this.circuits.set(printerId, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        nextAttemptTime: null,
        config: { ...this.defaultConfig },
        metrics: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          transientErrors: 0,
          permanentErrors: 0,
          circuitOpenedCount: 0,
          lastStateChange: new Date(),
          currentState: CircuitState.CLOSED,
        },
      });

      this.logger.log(`[CB-${printerId}] Circuit breaker initialized`);
    }

    const circuit = this.circuits.get(printerId)!;
    circuit.metrics.currentState = circuit.state;
    return circuit;
  }

  /**
   * Get circuit state for a printer
   */
  getCircuitState(printerId: string): CircuitState {
    const circuit = this.circuits.get(printerId);
    return circuit?.state || CircuitState.CLOSED;
  }

  /**
   * Get circuit metrics for a printer
   */
  getCircuitMetrics(printerId: string): CircuitMetrics | null {
    const circuit = this.circuits.get(printerId);
    return circuit ? { ...circuit.metrics } : null;
  }

  /**
   * Get all circuit metrics
   */
  getAllCircuitMetrics(): Map<string, CircuitMetrics> {
    const allMetrics = new Map<string, CircuitMetrics>();

    for (const [printerId, circuit] of this.circuits.entries()) {
      allMetrics.set(printerId, { ...circuit.metrics });
    }

    return allMetrics;
  }

  /**
   * Reset circuit breaker for a printer
   */
  resetCircuit(printerId: string): void {
    const circuit = this.circuits.get(printerId);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.nextAttemptTime = null;
      circuit.metrics.lastStateChange = new Date();
      this.logger.log(`[CB-${printerId}] Circuit manually reset to CLOSED`);
    }
  }

  /**
   * Configure circuit breaker for specific printer
   */
  configureCircuit(printerId: string, config: Partial<CircuitBreakerConfig>): void {
    const circuit = this.getOrCreateCircuit(printerId);
    circuit.config = { ...circuit.config, ...config };
    this.logger.log(`[CB-${printerId}] Circuit configuration updated:`, circuit.config);
  }

  /**
   * Get exponential backoff delay for retries
   */
  getExponentialBackoff(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }
}
