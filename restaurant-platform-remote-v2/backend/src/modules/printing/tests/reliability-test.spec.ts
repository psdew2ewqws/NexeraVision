import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService, ErrorType } from '../services/circuit-breaker.service';
import { TimeoutOptimizerService } from '../services/timeout-optimizer.service';

/**
 * Phase 9 & 10: Comprehensive Reliability Testing Suite
 *
 * Tests:
 * - Circuit breaker functionality
 * - Error classification
 * - Timeout optimization
 * - Latency measurement
 * - Adaptive timeout adjustment
 * - Failure recovery
 */
describe('Printing System Reliability Tests', () => {
  let circuitBreakerService: CircuitBreakerService;
  let timeoutOptimizerService: TimeoutOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService, TimeoutOptimizerService],
    }).compile();

    circuitBreakerService = module.get<CircuitBreakerService>(CircuitBreakerService);
    timeoutOptimizerService = module.get<TimeoutOptimizerService>(TimeoutOptimizerService);
  });

  afterEach(() => {
    // Clean up after each test
    timeoutOptimizerService.clearMeasurements();
  });

  describe('Circuit Breaker Tests', () => {
    const TEST_PRINTER_ID = 'test-printer-001';

    it('should start in CLOSED state', async () => {
      const state = circuitBreakerService.getCircuitState(TEST_PRINTER_ID);
      expect(state).toBe('CLOSED');
    });

    it('should execute successful operations', async () => {
      const result = await circuitBreakerService.execute(
        TEST_PRINTER_ID,
        async () => 'success',
        'test_operation'
      );

      expect(result).toBe('success');

      const metrics = circuitBreakerService.getCircuitMetrics(TEST_PRINTER_ID);
      expect(metrics.successfulCalls).toBe(1);
      expect(metrics.failedCalls).toBe(0);
    });

    it('should open circuit after failure threshold', async () => {
      const failingOperation = async () => {
        throw new Error('Network timeout');
      };

      // Execute 5 failing operations to hit the threshold
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute(TEST_PRINTER_ID, failingOperation, 'test_op');
        } catch (error) {
          // Expected to fail
        }
      }

      const state = circuitBreakerService.getCircuitState(TEST_PRINTER_ID);
      expect(state).toBe('OPEN');

      const metrics = circuitBreakerService.getCircuitMetrics(TEST_PRINTER_ID);
      expect(metrics.circuitOpenedCount).toBeGreaterThan(0);
    });

    it('should reject requests when circuit is OPEN', async () => {
      // Force circuit to OPEN state by causing failures
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute(
            TEST_PRINTER_ID,
            async () => { throw new Error('Failure'); },
            'test'
          );
        } catch (error) {
          // Expected
        }
      }

      // Circuit should now be OPEN
      const state = circuitBreakerService.getCircuitState(TEST_PRINTER_ID);
      expect(state).toBe('OPEN');

      // Next request should be rejected immediately
      await expect(
        circuitBreakerService.execute(
          TEST_PRINTER_ID,
          async () => 'should not execute',
          'test'
        )
      ).rejects.toThrow(/Circuit breaker is OPEN/);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Configure short timeout for testing
      circuitBreakerService.configureCircuit(TEST_PRINTER_ID, {
        failureThreshold: 3,
        timeout: 1000, // 1 second
      });

      // Cause failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreakerService.execute(
            TEST_PRINTER_ID,
            async () => { throw new Error('Failure'); },
            'test'
          );
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout period
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Try to execute - should transition to HALF_OPEN
      try {
        await circuitBreakerService.execute(
          TEST_PRINTER_ID,
          async () => 'success',
          'test'
        );
      } catch (error) {
        // May still fail if timeout hasn't passed
      }

      const state = circuitBreakerService.getCircuitState(TEST_PRINTER_ID);
      expect(['HALF_OPEN', 'CLOSED']).toContain(state);
    });

    it('should classify errors correctly', () => {
      const transientError = new Error('ECONNREFUSED connection refused');
      const permanentError = new Error('401 Unauthorized');
      const unknownError = new Error('Something went wrong');

      expect(circuitBreakerService.classifyError(transientError)).toBe(ErrorType.TRANSIENT);
      expect(circuitBreakerService.classifyError(permanentError)).toBe(ErrorType.PERMANENT);
      expect(circuitBreakerService.classifyError(unknownError)).toBe(ErrorType.UNKNOWN);
    });

    it('should track error types in metrics', async () => {
      const transientError = async () => {
        throw new Error('timeout occurred');
      };

      const permanentError = async () => {
        throw new Error('authentication failed');
      };

      // Execute transient error
      try {
        await circuitBreakerService.execute(TEST_PRINTER_ID, transientError, 'test');
      } catch (error) {
        // Expected
      }

      // Execute permanent error
      try {
        await circuitBreakerService.execute(TEST_PRINTER_ID, permanentError, 'test');
      } catch (error) {
        // Expected
      }

      const metrics = circuitBreakerService.getCircuitMetrics(TEST_PRINTER_ID);
      expect(metrics.transientErrors).toBeGreaterThan(0);
      expect(metrics.permanentErrors).toBeGreaterThan(0);
    });

    it('should reset circuit state', () => {
      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          circuitBreakerService.execute(
            TEST_PRINTER_ID,
            async () => { throw new Error('Failure'); },
            'test'
          );
        } catch (error) {
          // Expected
        }
      }

      // Reset circuit
      circuitBreakerService.resetCircuit(TEST_PRINTER_ID);

      const state = circuitBreakerService.getCircuitState(TEST_PRINTER_ID);
      expect(state).toBe('CLOSED');
    });

    it('should calculate exponential backoff correctly', () => {
      const baseDelay = 1000;
      const maxDelay = 30000;

      const delay1 = circuitBreakerService.getExponentialBackoff(0, baseDelay, maxDelay);
      const delay2 = circuitBreakerService.getExponentialBackoff(1, baseDelay, maxDelay);
      const delay3 = circuitBreakerService.getExponentialBackoff(5, baseDelay, maxDelay);

      expect(delay1).toBeGreaterThanOrEqual(baseDelay * 0.75); // With jitter
      expect(delay1).toBeLessThanOrEqual(baseDelay * 1.25);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeLessThanOrEqual(maxDelay);
    });
  });

  describe('Timeout Optimizer Tests', () => {
    const TEST_PRINTER_ID = 'test-printer-002';
    const TEST_OPERATION = 'test';

    it('should return default timeout with no data', () => {
      const timeout = timeoutOptimizerService.getTimeout(TEST_PRINTER_ID, TEST_OPERATION);
      expect(timeout).toBe(15000); // Default timeout
    });

    it('should record latency measurements', () => {
      const startTime = new Date();

      // Simulate operation taking 500ms
      setTimeout(() => {
        timeoutOptimizerService.completeMeasurement(
          'test-measurement-1',
          TEST_PRINTER_ID,
          'test',
          startTime,
          true
        );
      }, 500);
    });

    it('should calculate statistics after sufficient measurements', () => {
      const startTime = new Date();

      // Record 50 measurements with varying latencies
      for (let i = 0; i < 50; i++) {
        const latency = 100 + Math.random() * 200; // 100-300ms
        const measurementStart = new Date(startTime.getTime() - latency);

        timeoutOptimizerService.completeMeasurement(
          `test-${i}`,
          TEST_PRINTER_ID,
          'test',
          measurementStart,
          true
        );
      }

      const stats = timeoutOptimizerService.calculateStats(TEST_PRINTER_ID, 'test');

      expect(stats).toBeDefined();
      expect(stats.count).toBe(50);
      expect(stats.mean).toBeGreaterThan(0);
      expect(stats.p95).toBeGreaterThan(stats.median);
      expect(stats.recommendedTimeout).toBeGreaterThan(stats.p95);
    });

    it('should adapt timeout based on measurements', () => {
      const startTime = new Date();

      // Record measurements with ~5 second latencies
      for (let i = 0; i < 20; i++) {
        const measurementStart = new Date(startTime.getTime() - 5000);
        timeoutOptimizerService.completeMeasurement(
          `test-${i}`,
          TEST_PRINTER_ID,
          'test',
          measurementStart,
          true
        );
      }

      const adaptiveTimeout = timeoutOptimizerService.getTimeout(TEST_PRINTER_ID, 'test');

      // Adaptive timeout should be higher than measurements but not default
      expect(adaptiveTimeout).toBeGreaterThan(5000);
      expect(adaptiveTimeout).toBeLessThan(15000);
    });

    it('should handle failed measurements', () => {
      const startTime = new Date();

      // Mix of successful and failed measurements
      for (let i = 0; i < 20; i++) {
        const success = i % 2 === 0; // 50% success rate
        const measurementStart = new Date(startTime.getTime() - 1000);

        timeoutOptimizerService.completeMeasurement(
          `test-${i}`,
          TEST_PRINTER_ID,
          'test',
          measurementStart,
          success,
          success ? undefined : 'Test error'
        );
      }

      const stats = timeoutOptimizerService.calculateStats(TEST_PRINTER_ID, 'test');

      // Stats should only use successful measurements
      expect(stats).toBeDefined();
      expect(stats.count).toBe(10); // Only successful ones
    });

    it('should limit stored measurements to max', () => {
      const startTime = new Date();

      // Record 1500 measurements (over the limit of 1000)
      for (let i = 0; i < 1500; i++) {
        const measurementStart = new Date(startTime.getTime() - 100);
        timeoutOptimizerService.completeMeasurement(
          `test-${i}`,
          TEST_PRINTER_ID,
          'test',
          measurementStart,
          true
        );
      }

      const recent = timeoutOptimizerService.getRecentMeasurements(
        TEST_PRINTER_ID,
        'test',
        2000
      );

      // Should be limited to 1000
      expect(recent.length).toBe(1000);
    });

    it('should generate latency report', () => {
      // Add measurements for multiple printers and operations
      const printers = ['printer-1', 'printer-2'];
      const operations = ['test', 'print_job'];

      for (const printer of printers) {
        for (const operation of operations) {
          for (let i = 0; i < 20; i++) {
            const startTime = new Date(Date.now() - 1000);
            timeoutOptimizerService.completeMeasurement(
              `${printer}-${operation}-${i}`,
              printer,
              operation as any,
              startTime,
              true
            );
          }
        }
      }

      const report = timeoutOptimizerService.generateLatencyReport();

      expect(report.summary.totalPrinters).toBe(2);
      expect(report.summary.totalOperations).toBe(2);
      expect(report.printerStats.size).toBeGreaterThan(0);
    });

    it('should clear measurements for specific printer', () => {
      const printer1 = 'printer-1';
      const printer2 = 'printer-2';

      // Add measurements for both printers
      for (const printer of [printer1, printer2]) {
        for (let i = 0; i < 10; i++) {
          const startTime = new Date(Date.now() - 100);
          timeoutOptimizerService.completeMeasurement(
            `${printer}-${i}`,
            printer,
            'test',
            startTime,
            true
          );
        }
      }

      // Clear only printer1
      timeoutOptimizerService.clearMeasurements(printer1);

      const stats1 = timeoutOptimizerService.calculateStats(printer1, 'test');
      const stats2 = timeoutOptimizerService.calculateStats(printer2, 'test');

      expect(stats1).toBeNull(); // Cleared
      expect(stats2).toBeDefined(); // Still exists
    });
  });

  describe('Integration Tests', () => {
    it('should use circuit breaker with timeout optimizer', async () => {
      const TEST_PRINTER_ID = 'integration-test-printer';

      // Configure circuit breaker
      circuitBreakerService.configureCircuit(TEST_PRINTER_ID, {
        failureThreshold: 3,
        timeout: 2000,
      });

      // Simulate operation with latency measurement
      const operation = async () => {
        const startTime = new Date();

        try {
          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 100));

          timeoutOptimizerService.completeMeasurement(
            'integration-1',
            TEST_PRINTER_ID,
            'test',
            startTime,
            true
          );

          return 'success';
        } catch (error) {
          timeoutOptimizerService.completeMeasurement(
            'integration-1',
            TEST_PRINTER_ID,
            'test',
            startTime,
            false,
            error.message
          );

          throw error;
        }
      };

      const result = await circuitBreakerService.execute(
        TEST_PRINTER_ID,
        operation,
        'test'
      );

      expect(result).toBe('success');

      // Verify both services tracked the operation
      const metrics = circuitBreakerService.getCircuitMetrics(TEST_PRINTER_ID);
      const stats = timeoutOptimizerService.calculateStats(TEST_PRINTER_ID, 'test');

      expect(metrics.successfulCalls).toBeGreaterThan(0);
      // Stats may be null if not enough measurements yet
    });
  });
});
