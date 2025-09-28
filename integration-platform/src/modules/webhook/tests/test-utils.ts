import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../shared/services/prisma.service';
import { WebhookService } from '../webhook.service';
import { WebhookValidationService } from '../webhook-validation.service';
import { WebhookRetryService } from '../webhook-retry.service';
import { EventProvider, EventType, OrderStatus } from '../dto/webhook-event.dto';
import * as crypto from 'crypto';

/**
 * Test utilities for webhook testing
 */
export class WebhookTestUtils {
  /**
   * Create a test module with mocked dependencies
   */
  static async createTestingModule(): Promise<TestingModule> {
    const module = await Test.createTestingModule({
      providers: [
        WebhookService,
        WebhookValidationService,
        WebhookRetryService,
        {
          provide: PrismaService,
          useValue: {
            webhookRetryQueue: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
            webhookLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    return module;
  }

  /**
   * Create a NestJS application instance for integration tests
   */
  static async createTestApp(module: TestingModule): Promise<INestApplication> {
    const app = module.createNestApplication();
    await app.init();
    return app;
  }

  /**
   * Generate a valid HMAC signature for testing
   */
  static generateHmacSignature(payload: string, secret: string, algorithm = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(payload).digest('hex');
  }

  /**
   * Generate a valid base64 HMAC signature for testing
   */
  static generateHmacSignatureBase64(payload: string, secret: string, algorithm = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(payload).digest('base64');
  }

  /**
   * Create a delay for testing async operations
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a random client ID for testing
   */
  static generateClientId(): string {
    return `test-client-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate a random event ID for testing
   */
  static generateEventId(): string {
    return `evt-${Math.random().toString(36).substring(7)}-${Date.now()}`;
  }

  /**
   * Create mock headers for webhook requests
   */
  static createMockHeaders(provider: EventProvider, clientId: string, signature?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': `${provider}-webhook/1.0`,
      'x-forwarded-for': '127.0.0.1',
    };

    switch (provider) {
      case EventProvider.CAREEM:
        if (signature) headers['x-careem-signature'] = signature;
        break;
      case EventProvider.TALABAT:
        headers['x-talabat-api-key'] = `talabat_api_key_${clientId}`;
        break;
      case EventProvider.DELIVEROO:
        if (signature) headers['x-deliveroo-hmac-sha256'] = signature;
        break;
      case EventProvider.JAHEZ:
        headers['authorization'] = `Bearer jahez_bearer_token_${clientId}`;
        break;
    }

    return headers;
  }

  /**
   * Validate webhook response structure
   */
  static validateWebhookResponse(response: any): boolean {
    return (
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      typeof response.eventId === 'string' &&
      typeof response.message === 'string' &&
      typeof response.processedAt === 'string'
    );
  }

  /**
   * Create a mock Express request object
   */
  static createMockRequest(body: any, headers: Record<string, string> = {}, rawBody?: Buffer) {
    return {
      body,
      headers,
      rawBody: rawBody || Buffer.from(JSON.stringify(body)),
      ip: '127.0.0.1',
      method: 'POST',
      url: '/webhooks/test',
      params: {},
      query: {},
    };
  }

  /**
   * Create a mock Express response object
   */
  static createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      locals: {},
    };
    return res;
  }

  /**
   * Validate that all required environment variables are set for testing
   */
  static validateTestEnvironment(): boolean {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
    ];

    return requiredEnvVars.every(envVar => process.env[envVar]);
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(prismaService: PrismaService, clientId?: string): Promise<void> {
    try {
      // Clean webhook retry queue
      await prismaService.webhookRetryQueue.deleteMany({
        where: clientId ? { payload: { path: ['companyId'], equals: clientId } } : {},
      });

      // Clean webhook logs
      await prismaService.webhookLog.deleteMany({
        where: clientId ? { clientId } : {},
      });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  }

  /**
   * Create a rate limiter mock for testing
   */
  static createRateLimiterMock() {
    return {
      limit: jest.fn().mockResolvedValue(true),
      reset: jest.fn().mockResolvedValue(true),
      increment: jest.fn().mockResolvedValue(1),
      decrement: jest.fn().mockResolvedValue(0),
    };
  }

  /**
   * Assert that an error was logged correctly
   */
  static assertErrorLogged(loggerMock: any, expectedMessage: string): void {
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining(expectedMessage),
      expect.any(String)
    );
  }

  /**
   * Assert that a warning was logged correctly
   */
  static assertWarningLogged(loggerMock: any, expectedMessage: string): void {
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining(expectedMessage)
    );
  }

  /**
   * Assert that info was logged correctly
   */
  static assertInfoLogged(loggerMock: any, expectedMessage: string): void {
    expect(loggerMock.log).toHaveBeenCalledWith(
      expect.stringContaining(expectedMessage)
    );
  }

  /**
   * Create a performance timer for measuring execution time
   */
  static createPerformanceTimer() {
    const start = process.hrtime.bigint();
    return {
      stop: () => {
        const end = process.hrtime.bigint();
        return Number(end - start) / 1000000; // Convert to milliseconds
      }
    };
  }

  /**
   * Simulate network delays for testing
   */
  static async simulateNetworkDelay(minMs = 50, maxMs = 200): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await this.delay(delay);
  }

  /**
   * Create a mock webhook processor for testing
   */
  static createMockWebhookProcessor() {
    return {
      processWebhook: jest.fn(),
      validateWebhook: jest.fn(),
      logWebhookEvent: jest.fn(),
      retryFailedWebhook: jest.fn(),
    };
  }

  /**
   * Generate test webhook headers with proper timestamps
   */
  static generateTimestampedHeaders(provider: EventProvider): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const headers: Record<string, string> = {
      'x-timestamp': timestamp,
      'x-request-id': this.generateEventId(),
    };

    switch (provider) {
      case EventProvider.CAREEM:
        headers['x-careem-timestamp'] = timestamp;
        break;
      case EventProvider.TALABAT:
        headers['x-talabat-timestamp'] = timestamp;
        break;
      case EventProvider.DELIVEROO:
        headers['x-deliveroo-timestamp'] = timestamp;
        break;
      case EventProvider.JAHEZ:
        headers['x-jahez-timestamp'] = timestamp;
        break;
    }

    return headers;
  }

  /**
   * Validate webhook event structure
   */
  static validateWebhookEvent(event: any, provider: EventProvider): boolean {
    return (
      event &&
      typeof event.eventId === 'string' &&
      typeof event.eventType === 'string' &&
      event.provider === provider &&
      typeof event.clientId === 'string' &&
      typeof event.timestamp === 'string' &&
      typeof event.data === 'object'
    );
  }

  /**
   * Create mock axios instance for HTTP testing
   */
  static createMockAxios() {
    return {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      head: jest.fn(),
      options: jest.fn(),
    };
  }

  /**
   * Generate test configuration for different scenarios
   */
  static getTestConfig(scenario: 'success' | 'failure' | 'timeout' | 'ratelimit') {
    switch (scenario) {
      case 'success':
        return {
          timeout: 5000,
          retries: 3,
          rateLimitEnabled: false,
          validationEnabled: true,
        };
      case 'failure':
        return {
          timeout: 1000,
          retries: 1,
          rateLimitEnabled: false,
          validationEnabled: true,
        };
      case 'timeout':
        return {
          timeout: 100,
          retries: 0,
          rateLimitEnabled: false,
          validationEnabled: false,
        };
      case 'ratelimit':
        return {
          timeout: 5000,
          retries: 3,
          rateLimitEnabled: true,
          maxRequestsPerMinute: 1,
          validationEnabled: true,
        };
      default:
        return {};
    }
  }
}