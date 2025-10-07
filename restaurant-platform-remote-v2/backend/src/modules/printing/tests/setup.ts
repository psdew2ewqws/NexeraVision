/**
 * Jest Setup File for Printing Module Tests
 * Global test setup and teardown
 */

// Increase test timeout for WebSocket tests
jest.setTimeout(15000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:E$$athecode006@localhost:5432/postgres';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';

// Global test utilities
global.wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Console error suppression for expected test errors
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress expected error messages during tests
  console.error = jest.fn((message, ...args) => {
    // Only suppress specific expected errors
    const suppressedPatterns = [
      /Connection error/,
      /Invalid token/,
      /License key/,
      /Rate limit/
    ];

    const shouldSuppress = suppressedPatterns.some(pattern =>
      pattern.test(String(message))
    );

    if (!shouldSuppress) {
      originalError(message, ...args);
    }
  });

  console.warn = jest.fn((message, ...args) => {
    // Suppress specific warnings during tests
    const suppressedPatterns = [
      /Pending request/,
      /Stale/,
      /Rate limit/
    ];

    const shouldSuppress = suppressedPatterns.some(pattern =>
      pattern.test(String(message))
    );

    if (!shouldSuppress) {
      originalWarn(message, ...args);
    }
  });
});

afterAll(() => {
  // Restore original console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Global cleanup for WebSocket connections
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();

  // Clear all mocks
  jest.clearAllMocks();
});

// Custom matchers
expect.extend({
  toBeValidCorrelationId(received: string) {
    const pattern = /^[a-z_]+_\d+_[a-z0-9]+$/;
    const pass = pattern.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid correlation ID`
          : `Expected ${received} to be a valid correlation ID (format: type_timestamp_random)`
    };
  },

  toHaveHealthMetricsStructure(received: any) {
    const requiredFields = [
      'uptime',
      'reconnectionCount',
      'averageLatency',
      'packetLossRate',
      'connectionQuality',
      'deviceId',
      'branchId',
      'timestamp'
    ];

    const missingFields = requiredFields.filter(field => !received.hasOwnProperty(field));
    const pass = missingFields.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? 'Health metrics has all required fields'
          : `Health metrics missing fields: ${missingFields.join(', ')}`
    };
  }
});

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCorrelationId(): R;
      toHaveHealthMetricsStructure(): R;
    }
  }

  function wait(ms: number): Promise<void>;
}

export {};
