import 'reflect-metadata';
import { config } from 'dotenv';

// Load environment variables for integration tests
config({ path: '.env.test' });

// Global integration test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'integration_test';
  
  // Set timezone for consistent testing
  process.env.TZ = 'UTC';
  
  // Increase timeout for integration tests
  jest.setTimeout(60000);
  
  // Mock console methods to reduce noise but keep errors
  const originalConsole = { ...console };
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: originalConsole.warn,
    error: originalConsole.error,
    debug: jest.fn()
  };
  
  // Global test database setup (if needed)
  await setupIntegrationTestDatabase();
  
  console.info('Integration test environment initialized');
}, 30000);

afterAll(async () => {
  // Cleanup after all tests
  await cleanupIntegrationTestDatabase();
  jest.restoreAllMocks();
  console.info('Integration test cleanup completed');
}, 30000);

// Enhanced global test utilities for integration tests
global.createIntegrationTestConfig = (providerType: string, overrides = {}) => {
  const baseConfigs = {
    dhub: {
      providerId: `dhub-integration-${Date.now()}`,
      providerType: 'dhub',
      companyId: 'integration-test-company',
      isActive: true,
      priority: 1,
      apiConfig: {
        baseUrl: process.env.DHUB_TEST_BASE_URL || 'https://api.dhub.jo',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        username: process.env.DHUB_TEST_USERNAME || 'test_user',
        password: process.env.DHUB_TEST_PASSWORD || 'test_pass',
        merchantId: process.env.DHUB_TEST_MERCHANT_ID || 'TEST_MERCHANT'
      },
      businessRules: {
        serviceFee: 2.5,
        minimumOrderValue: 5.0,
        maximumOrderValue: 200.0,
        coverageRadius: 15,
        operatingHours: { start: '08:00', end: '23:00' }
      }
    },
    talabat: {
      providerId: `talabat-integration-${Date.now()}`,
      providerType: 'talabat',
      companyId: 'integration-test-company',
      isActive: true,
      priority: 2,
      apiConfig: {
        baseUrl: process.env.TALABAT_TEST_BASE_URL || 'https://api.talabat.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        apiKey: process.env.TALABAT_TEST_API_KEY || 'test_api_key',
        restaurantId: process.env.TALABAT_TEST_RESTAURANT_ID || 'TEST_RESTAURANT',
        region: 'gulf'
      },
      businessRules: {
        serviceFee: 1.5,
        minimumOrderValue: 15.0,
        maximumOrderValue: 500.0,
        coverageRadius: 20,
        operatingHours: { start: '09:00', end: '02:00' }
      }
    },
    careem: {
      providerId: `careem-integration-${Date.now()}`,
      providerType: 'careem',
      companyId: 'integration-test-company',
      isActive: true,
      priority: 3,
      apiConfig: {
        baseUrl: process.env.CAREEM_TEST_BASE_URL || 'https://api.careem.com',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      credentials: {
        clientId: process.env.CAREEM_TEST_CLIENT_ID || 'test_client',
        clientSecret: process.env.CAREEM_TEST_CLIENT_SECRET || 'test_secret',
        merchantId: process.env.CAREEM_TEST_MERCHANT_ID || 'TEST_MERCHANT'
      },
      businessRules: {
        serviceFee: 3.0,
        minimumOrderValue: 20.0,
        maximumOrderValue: 1000.0,
        coverageRadius: 25,
        operatingHours: { start: '06:00', end: '03:00' }
      }
    }
  };

  return {
    ...baseConfigs[providerType],
    ...overrides
  };
};

global.createIntegrationTestOrder = (overrides = {}) => {
  return {
    orderId: `INTEGRATION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    branchId: 'INTEGRATION-BRANCH-001',
    companyId: 'integration-test-company',
    customer: {
      name: 'Test Customer Integration',
      phone: '+962791234567',
      email: 'integration.test@example.com'
    },
    deliveryAddress: {
      street: 'Test Integration Street 123',
      city: 'Amman',
      area: 'Test Area',
      latitude: 31.9454,
      longitude: 35.9284,
      instructions: 'Integration test delivery'
    },
    items: [
      {
        id: 'INTEGRATION-ITEM-001',
        name: 'Test Integration Item',
        quantity: 1,
        price: 25.00
      }
    ],
    subtotal: 25.00,
    deliveryFee: 3.50,
    tax: 0.0,
    discount: 0.0,
    total: 28.50,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 20,
    ...overrides
  };
};

// Database setup and cleanup for integration tests
async function setupIntegrationTestDatabase() {
  if (process.env.SKIP_DB_SETUP === 'true') {
    return;
  }
  
  try {
    // Setup test database if needed
    // This would typically involve:
    // 1. Creating test database schema
    // 2. Running migrations
    // 3. Seeding test data
    console.info('Setting up integration test database...');
    
    // Example setup (adjust based on your database setup)
    // await createTestDatabaseSchema();
    // await runTestMigrations();
    // await seedTestData();
    
  } catch (error) {
    console.error('Failed to setup integration test database:', error);
    throw error;
  }
}

async function cleanupIntegrationTestDatabase() {
  if (process.env.SKIP_DB_CLEANUP === 'true') {
    return;
  }
  
  try {
    console.info('Cleaning up integration test database...');
    
    // Cleanup test data
    // await cleanupTestData();
    
  } catch (error) {
    console.error('Failed to cleanup integration test database:', error);
  }
}

// Integration test helpers
global.waitForCondition = async (conditionFn: () => boolean | Promise<boolean>, timeout = 30000, interval = 1000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await conditionFn();
      if (result) {
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

global.retryUntilSuccess = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
};

// Mock response helpers for integration tests
global.createMockSuccessResponse = (data: any, statusCode = 200) => {
  return {
    status: statusCode,
    data: data,
    headers: {
      'content-type': 'application/json',
      'x-response-time': Math.floor(Math.random() * 200) + 50 + 'ms'
    }
  };
};

global.createMockErrorResponse = (errorType: string, message: string, statusCode = 400) => {
  return {
    status: statusCode,
    data: {
      error: errorType,
      message: message,
      timestamp: new Date().toISOString(),
      request_id: Math.random().toString(36).substr(2, 9)
    }
  };
};

// Performance measurement helpers
global.measureExecutionTime = async <T>(operation: () => Promise<T>): Promise<{ result: T; executionTime: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  
  return {
    result,
    executionTime: endTime - startTime
  };
};

// Network simulation helpers
global.simulateNetworkDelay = (min = 100, max = 500) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Extend Jest expect with custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveValidOrderId(received: string) {
    const pass = /^[A-Z]+-[A-Z0-9]+-\d+$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid order ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid order ID format`,
        pass: false,
      };
    }
  }
});

// Type declarations for global helpers
declare global {
  function createIntegrationTestConfig(providerType: string, overrides?: any): any;
  function createIntegrationTestOrder(overrides?: any): any;
  function waitForCondition(conditionFn: () => boolean | Promise<boolean>, timeout?: number, interval?: number): Promise<boolean>;
  function retryUntilSuccess<T>(operation: () => Promise<T>, maxRetries?: number, delay?: number): Promise<T>;
  function createMockSuccessResponse(data: any, statusCode?: number): any;
  function createMockErrorResponse(errorType: string, message: string, statusCode?: number): any;
  function measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; executionTime: number }>;
  function simulateNetworkDelay(min?: number, max?: number): Promise<void>;
  
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidOrderId(): R;
    }
  }
}