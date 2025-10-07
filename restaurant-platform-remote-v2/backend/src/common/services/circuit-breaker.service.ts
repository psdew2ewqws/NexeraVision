import { Injectable, Logger } from '@nestjs/common';

/**
 * PHASE 18: Circuit Breaker Pattern for Connection Resilience
 *
 * Implements circuit breaker pattern to prevent cascading failures
 * when external services (PrinterMaster, Redis) become unavailable.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failed, requests fail fast without attempting
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms to wait before attempting half-open
  monitoringPeriod: number; // Time window for failure counting
}

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, {
    state: CircuitState;
    options: CircuitBreakerOptions;
    metrics: CircuitMetrics;
    stateChangedAt: number;
  }>();

  private readonly defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
  };

  /**
   * Register a new circuit breaker for a service
   */
  registerCircuit(name: string, options?: Partial<CircuitBreakerOptions>): void {
    const circuitOptions = { ...this.defaultOptions, ...options };

    this.circuits.set(name, {
      state: CircuitState.CLOSED,
      options: circuitOptions,
      metrics: {
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
      },
      stateChangedAt: Date.now(),
    });

    this.logger.log(`🔧 [CIRCUIT] Registered circuit breaker: ${name}`);
    this.logger.log(`📊 [CIRCUIT] Options: ${JSON.stringify(circuitOptions)}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) {
      throw new Error(`Circuit breaker not registered: ${circuitName}`);
    }

    // Check circuit state
    const currentState = this.getState(circuitName);

    if (currentState === CircuitState.OPEN) {
      this.logger.warn(`⛔ [CIRCUIT] ${circuitName} is OPEN - request rejected`);

      if (fallback) {
        this.logger.log(`🔄 [FALLBACK] Using fallback for ${circuitName}`);
        return await fallback();
      }

      throw new Error(`Circuit breaker is OPEN for ${circuitName}`);
    }

    // Execute the function
    try {
      const result = await fn();
      this.recordSuccess(circuitName);
      return result;
    } catch (error) {
      this.recordFailure(circuitName);

      if (fallback) {
        this.logger.log(`🔄 [FALLBACK] Using fallback for ${circuitName} after failure`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Get current state of circuit breaker
   */
  getState(circuitName: string): CircuitState {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) {
      throw new Error(`Circuit breaker not registered: ${circuitName}`);
    }

    const now = Date.now();

    // If OPEN, check if timeout period has passed
    if (circuit.state === CircuitState.OPEN) {
      const timeSinceStateChange = now - circuit.stateChangedAt;

      if (timeSinceStateChange >= circuit.options.timeout) {
        this.setState(circuitName, CircuitState.HALF_OPEN);
        this.logger.log(`🔓 [CIRCUIT] ${circuitName} entering HALF_OPEN state (timeout reached)`);
      }
    }

    return circuit.state;
  }

  /**
   * Record a successful execution
   */
  private recordSuccess(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) return;

    circuit.metrics.successes++;
    circuit.metrics.consecutiveSuccesses++;
    circuit.metrics.consecutiveFailures = 0;
    circuit.metrics.lastSuccessTime = Date.now();

    // If in HALF_OPEN state, check if we should close
    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.metrics.consecutiveSuccesses >= circuit.options.successThreshold) {
        this.setState(circuitName, CircuitState.CLOSED);
        this.logger.log(`✅ [CIRCUIT] ${circuitName} CLOSED - service recovered`);
        this.resetMetrics(circuitName);
      }
    }

    this.logger.debug(`✅ [CIRCUIT] ${circuitName} success recorded (consecutive: ${circuit.metrics.consecutiveSuccesses})`);
  }

  /**
   * Record a failed execution
   */
  private recordFailure(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) return;

    circuit.metrics.failures++;
    circuit.metrics.consecutiveFailures++;
    circuit.metrics.consecutiveSuccesses = 0;
    circuit.metrics.lastFailureTime = Date.now();

    this.logger.warn(`❌ [CIRCUIT] ${circuitName} failure recorded (consecutive: ${circuit.metrics.consecutiveFailures})`);

    // If CLOSED, check if we should open
    if (circuit.state === CircuitState.CLOSED) {
      if (circuit.metrics.consecutiveFailures >= circuit.options.failureThreshold) {
        this.setState(circuitName, CircuitState.OPEN);
        this.logger.error(`🚨 [CIRCUIT] ${circuitName} OPENED - failure threshold reached`);
      }
    }

    // If HALF_OPEN, immediately open on any failure
    if (circuit.state === CircuitState.HALF_OPEN) {
      this.setState(circuitName, CircuitState.OPEN);
      this.logger.error(`🚨 [CIRCUIT] ${circuitName} returned to OPEN - failed during recovery`);
    }
  }

  /**
   * Set circuit state
   */
  private setState(circuitName: string, newState: CircuitState): void {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) return;

    circuit.state = newState;
    circuit.stateChangedAt = Date.now();
  }

  /**
   * Reset circuit metrics
   */
  private resetMetrics(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) return;

    circuit.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
    };
  }

  /**
   * Get circuit metrics for monitoring
   */
  getMetrics(circuitName: string): CircuitMetrics & { state: CircuitState } | null {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) return null;

    return {
      ...circuit.metrics,
      state: circuit.state,
    };
  }

  /**
   * Get all circuits status
   */
  getAllCircuits(): Map<string, { state: CircuitState; metrics: CircuitMetrics }> {
    const status = new Map<string, { state: CircuitState; metrics: CircuitMetrics }>();

    for (const [name, circuit] of this.circuits.entries()) {
      status.set(name, {
        state: circuit.state,
        metrics: circuit.metrics,
      });
    }

    return status;
  }

  /**
   * Manually reset a circuit (for administrative control)
   */
  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);

    if (!circuit) {
      throw new Error(`Circuit breaker not registered: ${circuitName}`);
    }

    this.setState(circuitName, CircuitState.CLOSED);
    this.resetMetrics(circuitName);
    this.logger.log(`🔄 [CIRCUIT] ${circuitName} manually reset to CLOSED`);
  }
}
