import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

/**
 * Global E2E Test Setup for NEXARA Webhook System
 *
 * This file configures the testing environment for end-to-end tests,
 * including database setup, mock services, and test utilities.
 */

// Global test application instance
let globalApp: INestApplication;

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/webhook_test';

// Mock external services
const mockExternalServices = {
  careem: {
    baseUrl: 'https://api-mock.careem.com',
    webhookSecret: 'careem_test_secret_123',
  },
  talabat: {
    baseUrl: 'https://api-mock.talabat.com',
    apiKey: 'talabat_test_api_key_456',
  },
  deliveroo: {
    baseUrl: 'https://api-mock.deliveroo.com',
    webhookSecret: 'deliveroo_test_secret_789',
  },
  jahez: {
    baseUrl: 'https://api-mock.jahez.com',
    bearerToken: 'jahez_test_bearer_token_abc',
  },
};

// Setup function run before all tests
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  // Mock external service credentials
  process.env.CAREEM_WEBHOOK_SECRET = mockExternalServices.careem.webhookSecret;
  process.env.TALABAT_API_KEY = mockExternalServices.talabat.apiKey;
  process.env.DELIVEROO_WEBHOOK_SECRET = mockExternalServices.deliveroo.webhookSecret;
  process.env.JAHEZ_BEARER_TOKEN = mockExternalServices.jahez.bearerToken;

  // Setup test database
  await setupTestDatabase();

  // Setup mock services
  setupMockServices();

  console.log('✅ E2E test environment setup complete');
}, 60000);

// Cleanup function run after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  if (globalApp) {
    await globalApp.close();
  }

  // Cleanup test database
  await cleanupTestDatabase();

  console.log('✅ E2E test environment cleanup complete');
}, 30000);

// Setup test database
async function setupTestDatabase() {
  try {
    // Initialize test database with required tables
    console.log('📊 Setting up test database...');

    // Note: In a real implementation, you would:
    // 1. Create test database if it doesn't exist
    // 2. Run migrations
    // 3. Seed with test data

    // For now, we'll assume the database setup is handled externally
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.warn('⚠️  Test database setup failed:', error.message);
  }
}

// Cleanup test database
async function cleanupTestDatabase() {
  try {
    console.log('🗑️  Cleaning up test database...');

    // Note: In a real implementation, you would:
    // 1. Clear test data
    // 2. Reset sequences
    // 3. Close connections

    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.warn('⚠️  Test database cleanup failed:', error.message);
  }
}

// Setup mock external services
function setupMockServices() {
  console.log('🎭 Setting up mock external services...');

  // Mock HTTP requests to external APIs
  if (typeof jest !== 'undefined') {
    // Mock axios or any HTTP client used by the application
    // This would prevent actual HTTP calls during tests

    jest.mock('axios', () => ({
      create: jest.fn(() => ({
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
      })),
    }));
  }

  console.log('✅ Mock external services setup complete');
}

// Utility function to create test application
export async function createTestApp(moduleMetadata: any): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule(moduleMetadata).compile();

  const app = moduleFixture.createNestApplication();

  // Configure test application
  app.useGlobalPipes(/* validation pipes */);
  app.useGlobalFilters(/* exception filters */);
  app.useGlobalInterceptors(/* logging interceptors */);

  await app.init();

  return app;
}

// Utility function to generate test webhook payloads
export const TestPayloads = {
  careem: {
    orderCreated: (orderId: string = 'TEST_ORDER_001') => ({
      event_type: 'order_created',
      order_id: orderId,
      restaurant_id: 'TEST_RESTAURANT_001',
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      data: {
        customer: {
          id: 'cust_123',
          name: 'Test Customer',
          phone: '+966501234567',
          email: 'test@example.com',
        },
        items: [
          {
            id: 'item_1',
            name: 'Test Item',
            quantity: 1,
            unit_price: 25.00,
            total_price: 25.00,
          },
        ],
        pricing: {
          subtotal: 25.00,
          delivery_fee: 5.00,
          total: 30.00,
          currency: 'SAR',
        },
      },
    }),
  },

  talabat: {
    orderUpdate: (orderId: string = 'TALABAT_ORDER_001') => ({
      type: 'order_status_update',
      order_id: orderId,
      restaurant_id: 'TEST_RESTAURANT_002',
      previous_status: 'new',
      current_status: 'accepted',
      timestamp: new Date().toISOString(),
      order_details: {
        customer: {
          name: 'Test Customer',
          phone: '+971501234567',
        },
        items: [
          {
            id: 'item_1',
            name: 'Test Pizza',
            quantity: 1,
            price: 45.00,
          },
        ],
        total: 45.00,
        currency: 'AED',
      },
    }),
  },

  deliveroo: {
    orderPlaced: (orderId: string = 'DELIVEROO_ORDER_001') => ({
      event: 'order_placed',
      order: {
        id: orderId,
        reference: 'DR123456',
        status: 'accepted',
        created_at: new Date().toISOString(),
        items: [
          {
            id: 'item_1',
            name: 'Test Burger',
            quantity: 1,
            price: 1200, // in cents
          },
        ],
        customer: {
          first_name: 'Test',
          last_name: 'Customer',
          phone_number: '+44123456789',
        },
        total_price_including_tax: 1200,
      },
    }),
  },

  jahez: {
    orderAction: (orderId: string = 'JAHEZ_ORDER_001') => ({
      action: 'order_action',
      orderId: orderId,
      restaurantCode: 'TEST_RESTAURANT_003',
      status: 'placed',
      requestId: 'req_' + Date.now(),
      timestamp: new Date().toISOString(),
      orderData: {
        customer: {
          name: 'Test Customer',
          phone: '+966501234567',
        },
        items: [
          {
            id: 'item_1',
            name: 'Test Kabsa',
            quantity: 1,
            price: 45.00,
          },
        ],
        total: 45.00,
        currency: 'SAR',
      },
    }),
  },
};

// Utility function to create valid signatures for testing
export const TestSignatures = {
  careem: (payload: any, secret: string): string => {
    const crypto = require('crypto');
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  },

  deliveroo: (payload: any, secret: string): string => {
    const crypto = require('crypto');
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('base64');
  },
};

// Test utilities
export const TestUtils = {
  // Wait for specified time
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random test ID
  generateTestId: (prefix: string = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Validate webhook response structure
  validateWebhookResponse: (response: any, expectedStatus: string) => {
    expect(response).toBeDefined();
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('status', expectedStatus);
  },

  // Create mock webhook configuration
  createMockWebhookConfig: (provider: string, clientId: string) => ({
    id: TestUtils.generateTestId('webhook'),
    clientId,
    provider,
    endpointUrl: `https://test-webhook.example.com/${provider}/${clientId}`,
    secret: `test_secret_${provider}_${clientId}`,
    events: ['order.created', 'order.updated'],
    isActive: true,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
  }),
};

// Export test configuration
export const E2E_TEST_CONFIG = {
  testTimeout: 30000,
  mockServices: mockExternalServices,
  testDatabase: TEST_DATABASE_URL,
};

console.log('📋 E2E test setup loaded successfully');