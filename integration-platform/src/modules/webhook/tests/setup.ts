import { WebhookTestUtils } from './test-utils';

// Global test setup for webhook tests
beforeAll(async () => {
  // Validate test environment
  if (!WebhookTestUtils.validateTestEnvironment()) {
    console.error('Test environment validation failed');
    process.exit(1);
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-webhook-tests';
  process.env.WEBHOOK_BASE_URL = 'http://localhost:3001';

  // Suppress console logs during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }

  // Increase timeout for async operations
  jest.setTimeout(60000);
});

afterAll(async () => {
  // Cleanup any global test resources
  await WebhookTestUtils.delay(100);
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock timers for consistent testing
jest.useFakeTimers({
  advanceTimers: true,
  doNotFake: ['nextTick', 'setImmediate'],
});

// Global test utilities
global.WebhookTestUtils = WebhookTestUtils;