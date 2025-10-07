/**
 * Unit Tests: Correlation ID System
 * Tests correlation ID generation, uniqueness, and format validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrintingWebSocketGateway } from '../../gateways/printing-websocket.gateway';
import { PrismaService } from '../../../database/prisma.service';

describe('Correlation ID System - Unit Tests', () => {
  let gateway: PrintingWebSocketGateway;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintingWebSocketGateway,
        {
          provide: PrismaService,
          useValue: {
            printer: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            branch: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    gateway = module.get<PrintingWebSocketGateway>(PrintingWebSocketGateway);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const type = 'printer_test';
      const ids = new Set<string>();

      // Generate 1000 correlation IDs
      for (let i = 0; i < 1000; i++) {
        const correlationId = (gateway as any).generateCorrelationId(type);
        ids.add(correlationId);
      }

      // All IDs should be unique
      expect(ids.size).toBe(1000);
    });

    it('should include type prefix in correlation ID', () => {
      const type = 'printer_test';
      const correlationId = (gateway as any).generateCorrelationId(type);

      expect(correlationId).toMatch(/^printer_test_/);
    });

    it('should include timestamp in correlation ID', () => {
      const type = 'print_job';
      const beforeTimestamp = Date.now();
      const correlationId = (gateway as any).generateCorrelationId(type);
      const afterTimestamp = Date.now();

      // Extract timestamp from correlation ID
      const parts = correlationId.split('_');
      const timestamp = parseInt(parts[2], 10);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should include counter in correlation ID', () => {
      const type = 'test';
      const id1 = (gateway as any).generateCorrelationId(type);
      const id2 = (gateway as any).generateCorrelationId(type);

      // Extract counters
      const counter1 = parseInt(id1.split('_')[3], 10);
      const counter2 = parseInt(id2.split('_')[3], 10);

      // Counter should increment
      expect(counter2).toBeGreaterThan(counter1);
    });

    it('should include random suffix in correlation ID', () => {
      const type = 'test';
      const correlationId = (gateway as any).generateCorrelationId(type);

      // Should have 5 parts: type, timestamp, counter, random
      const parts = correlationId.split('_');
      expect(parts.length).toBe(4);

      // Random suffix should be alphanumeric
      const randomSuffix = parts[3];
      expect(randomSuffix).toMatch(/^[a-z0-9]+$/);
    });

    it('should reset counter at 1 million', () => {
      // Set counter to near overflow
      (gateway as any).requestCounter = 999999;

      const id1 = (gateway as any).generateCorrelationId('test');
      const id2 = (gateway as any).generateCorrelationId('test');

      // Counter should wrap around
      expect((gateway as any).requestCounter).toBeLessThan(10);
    });

    it('should handle different request types', () => {
      const types = ['printer_test', 'print_job', 'status_request', 'discovery'];

      types.forEach(type => {
        const correlationId = (gateway as any).generateCorrelationId(type);
        expect(correlationId).toMatch(new RegExp(`^${type}_`));
      });
    });
  });

  describe('Pending Request Registry', () => {
    beforeEach(() => {
      // Clear pending requests before each test
      (gateway as any).pendingRequests.clear();
    });

    it('should register pending request successfully', () => {
      const correlationId = 'test_123_456_abc';
      const type = 'printer_test';
      const timeoutMs = 5000;
      const resolve = jest.fn();
      const reject = jest.fn();

      (gateway as any).registerPendingRequest(
        correlationId,
        type,
        timeoutMs,
        resolve,
        reject
      );

      const pending = (gateway as any).pendingRequests.get(correlationId);
      expect(pending).toBeDefined();
      expect(pending.type).toBe(type);
      expect(pending.resolve).toBe(resolve);
      expect(pending.reject).toBe(reject);
      expect(pending.timeout).toBeDefined();
      expect(pending.timestamp).toBeInstanceOf(Date);
    });

    it('should resolve pending request successfully', () => {
      const correlationId = 'test_123_456_abc';
      const resolve = jest.fn();
      const reject = jest.fn();
      const response = { success: true, data: 'test' };

      (gateway as any).registerPendingRequest(
        correlationId,
        'test',
        5000,
        resolve,
        reject
      );

      const resolved = (gateway as any).resolvePendingRequest(correlationId, response);

      expect(resolved).toBe(true);
      expect(resolve).toHaveBeenCalledWith(response);
      expect(reject).not.toHaveBeenCalled();

      // Should be removed from pending requests
      const pending = (gateway as any).pendingRequests.get(correlationId);
      expect(pending).toBeUndefined();
    });

    it('should return false for non-existent correlation ID', () => {
      const correlationId = 'non_existent_id';
      const response = { success: true };

      const resolved = (gateway as any).resolvePendingRequest(correlationId, response);

      expect(resolved).toBe(false);
    });

    it('should timeout pending request after specified duration', (done) => {
      const correlationId = 'test_timeout_123';
      const resolve = jest.fn();
      const reject = jest.fn();
      const timeoutMs = 100; // 100ms for test

      (gateway as any).registerPendingRequest(
        correlationId,
        'test',
        timeoutMs,
        resolve,
        reject
      );

      setTimeout(() => {
        expect(reject).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Request timeout after ${timeoutMs}ms`
          })
        );

        // Should be removed from pending requests
        const pending = (gateway as any).pendingRequests.get(correlationId);
        expect(pending).toBeUndefined();

        done();
      }, timeoutMs + 50);
    });

    it('should cleanup stale pending requests', () => {
      jest.useFakeTimers();

      // Create some stale requests (older than 60 seconds)
      const staleTime = new Date(Date.now() - 61000);

      for (let i = 0; i < 5; i++) {
        const pending = {
          resolve: jest.fn(),
          reject: jest.fn(),
          timeout: setTimeout(() => {}, 5000),
          type: 'test',
          timestamp: staleTime
        };
        (gateway as any).pendingRequests.set(`stale_${i}`, pending);
      }

      // Create some fresh requests
      for (let i = 0; i < 3; i++) {
        const pending = {
          resolve: jest.fn(),
          reject: jest.fn(),
          timeout: setTimeout(() => {}, 5000),
          type: 'test',
          timestamp: new Date()
        };
        (gateway as any).pendingRequests.set(`fresh_${i}`, pending);
      }

      expect((gateway as any).pendingRequests.size).toBe(8);

      // Run cleanup
      (gateway as any).cleanupStalePendingRequests();

      // Only fresh requests should remain
      expect((gateway as any).pendingRequests.size).toBe(3);

      jest.useRealTimers();
    });

    it('should clear timeout when resolving request', () => {
      const correlationId = 'test_123';
      const resolve = jest.fn();
      const reject = jest.fn();

      (gateway as any).registerPendingRequest(
        correlationId,
        'test',
        5000,
        resolve,
        reject
      );

      const pending = (gateway as any).pendingRequests.get(correlationId);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      (gateway as any).resolvePendingRequest(correlationId, { success: true });

      expect(clearTimeoutSpy).toHaveBeenCalledWith(pending.timeout);
    });

    it('should handle multiple pending requests simultaneously', () => {
      const requests = [];

      for (let i = 0; i < 10; i++) {
        const correlationId = `test_${i}`;
        const resolve = jest.fn();
        const reject = jest.fn();

        (gateway as any).registerPendingRequest(
          correlationId,
          'test',
          5000,
          resolve,
          reject
        );

        requests.push({ correlationId, resolve, reject });
      }

      expect((gateway as any).pendingRequests.size).toBe(10);

      // Resolve even-numbered requests
      for (let i = 0; i < 10; i += 2) {
        (gateway as any).resolvePendingRequest(`test_${i}`, { success: true });
      }

      expect((gateway as any).pendingRequests.size).toBe(5);
    });
  });

  describe('Correlation ID Format Validation', () => {
    it('should generate correlation IDs with consistent format', () => {
      const correlationId = (gateway as any).generateCorrelationId('printer_test');

      // Format: type_timestamp_counter_random
      const pattern = /^[a-z_]+_\d+_\d+_[a-z0-9]+$/;
      expect(correlationId).toMatch(pattern);
    });

    it('should generate correlation IDs under 100 characters', () => {
      const types = [
        'printer_test',
        'print_job',
        'status_request',
        'discovery_scan',
        'health_check'
      ];

      types.forEach(type => {
        const correlationId = (gateway as any).generateCorrelationId(type);
        expect(correlationId.length).toBeLessThan(100);
      });
    });
  });

  describe('Thread Safety and Concurrency', () => {
    it('should handle concurrent correlation ID generation', async () => {
      const promises = [];
      const ids = new Set<string>();

      // Generate 100 IDs concurrently
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve((gateway as any).generateCorrelationId('concurrent_test'))
            .then(id => ids.add(id))
        );
      }

      await Promise.all(promises);

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should handle concurrent request registration', () => {
      const requests = [];

      for (let i = 0; i < 50; i++) {
        const correlationId = `concurrent_${i}`;
        const resolve = jest.fn();
        const reject = jest.fn();

        (gateway as any).registerPendingRequest(
          correlationId,
          'test',
          5000,
          resolve,
          reject
        );

        requests.push(correlationId);
      }

      expect((gateway as any).pendingRequests.size).toBe(50);

      // All should be retrievable
      requests.forEach(correlationId => {
        const pending = (gateway as any).pendingRequests.get(correlationId);
        expect(pending).toBeDefined();
      });
    });
  });

  afterEach(() => {
    // Cleanup: clear all pending requests and timers
    for (const [id, pending] of (gateway as any).pendingRequests.entries()) {
      clearTimeout(pending.timeout);
    }
    (gateway as any).pendingRequests.clear();
  });
});
