import 'reflect-metadata';

// Global test setup for delivery module
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console.log in tests to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  
  // Set default timezone for consistent date testing
  process.env.TZ = 'UTC';
});

afterAll(() => {
  // Restore console.log
  jest.restoreAllMocks();
});

// Global test utilities
global.createMockConfig = (overrides = {}) => {
  return {
    providerId: 'test-provider',
    providerType: 'test',
    companyId: 'test-company',
    isActive: true,
    priority: 1,
    apiConfig: {
      baseUrl: 'https://api.test.com',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    credentials: {
      apiKey: 'test-key'
    },
    businessRules: {
      serviceFee: 2.5
    },
    ...overrides
  };
};

global.createMockOrder = (overrides = {}) => {
  return {
    orderId: 'test-order-123',
    branchId: 'test-branch',
    companyId: 'test-company',
    customer: {
      name: 'Test Customer',
      phone: '+1234567890',
      email: 'test@example.com'
    },
    deliveryAddress: {
      street: '123 Test St',
      city: 'Test City',
      area: 'Test Area',
      latitude: 40.7128,
      longitude: -74.0060
    },
    items: [
      {
        id: 'item-1',
        name: 'Test Item',
        quantity: 1,
        price: 15.00
      }
    ],
    subtotal: 15.00,
    deliveryFee: 3.00,
    total: 18.00,
    paymentMethod: 'cash',
    priority: 'normal',
    estimatedPreparationTime: 15,
    ...overrides
  };
};

// Mock timers helper
global.advanceTimersByTime = (ms) => {
  jest.advanceTimersByTime(ms);
};

// Async test helper
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Error assertion helper
global.expectToThrow = async (fn, errorType) => {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  if (errorType) {
    expect(error).toBeInstanceOf(errorType);
  }
};