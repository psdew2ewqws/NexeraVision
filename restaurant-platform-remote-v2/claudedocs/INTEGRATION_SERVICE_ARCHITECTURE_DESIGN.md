# Integration Service Architecture Design
**Production-Grade Standalone Webhook Hub for Restaurant Platform v2**

---

## Executive Summary

This document outlines the architecture for a standalone integration service that acts as a dedicated webhook hub for external delivery providers (Careem, Talabat, etc.). The service receives webhooks, validates signatures, transforms provider-specific formats to unified internal format, and forwards processed orders to the main Restaurant Platform backend.

**Key Characteristics:**
- **Standalone Microservice**: Independent deployment lifecycle
- **High Availability**: Fault-tolerant with retry mechanisms
- **Security-First**: Multi-layer validation and authentication
- **Scalable**: Horizontal scaling capability
- **Observable**: Comprehensive logging and monitoring

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Service Components](#service-components)
3. [Security Layer](#security-layer)
4. [Provider Adapters](#provider-adapters)
5. [Communication Patterns](#communication-patterns)
6. [Database Interaction](#database-interaction)
7. [Deployment Configuration](#deployment-configuration)
8. [API Specifications](#api-specifications)
9. [Monitoring & Logging](#monitoring--logging)
10. [Scalability Considerations](#scalability-considerations)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        External Delivery Providers                       │
│              (Careem, Talabat, Uber Eats, Deliveroo, etc.)              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ Webhooks (HTTPS)
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     INTEGRATION SERVICE (Port 3002)                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                      Webhook Receiver Layer                          │ │
│ │  • Rate Limiting • IP Whitelisting • Request Validation              │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                    Signature Validation Layer                        │ │
│ │  • HMAC-SHA256 • Provider-specific validation • Secret management   │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                  Provider Adapter Factory                            │ │
│ │  • Careem Adapter • Talabat Adapter • Generic Adapter               │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │              Order Transformation Pipeline                           │ │
│ │  • Parse webhook • Map to internal format • Validate data            │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                Backend Communication Layer                           │ │
│ │  • HTTP Client • Retry Logic • Circuit Breaker                       │ │
│ └───────────────────────────┬─────────────────────────────────────────┘ │
│                             ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                    Webhook Logging Service                           │ │
│ │  • Database persistence • Retry queue • Error tracking               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTP (3001)
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Restaurant Platform Backend (Port 3001)                    │
│  • Order Processing • Printing • WebSocket • Business Logic             │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database (postgres)                        │
│  • Shared schema • Multi-tenant data • Webhook logs                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Isolation Strategy

**Integration Service is SEPARATE from Main Backend:**
- **Different Port**: 3002 (Integration Service) vs 3001 (Main Backend)
- **Independent Deployment**: Can be deployed/scaled separately
- **Dedicated Process**: Own Node.js process with separate lifecycle
- **Shared Database**: Uses same PostgreSQL instance but with clear boundaries
- **Focused Responsibility**: Only webhook reception and transformation

**Benefits:**
- **Performance Isolation**: Heavy webhook load doesn't affect main API
- **Security Isolation**: Webhook endpoints separate from user-facing APIs
- **Deployment Flexibility**: Update integration logic without touching main app
- **Scaling Independence**: Scale webhook handler separately from backend

---

## 2. Service Components

### 2.1 Core Service Components

#### **2.1.1 Webhook Receiver Module**
```typescript
// Location: /integration-service/src/modules/webhook-receiver/

@Module({
  imports: [
    RateLimiterModule,
    IpWhitelistModule,
    RequestValidationModule,
  ],
  controllers: [
    WebhookReceiverController,
  ],
  providers: [
    WebhookReceiverService,
    RequestSanitizerService,
  ],
})
export class WebhookReceiverModule {}
```

**Responsibilities:**
- Accept incoming webhook HTTP requests
- Apply rate limiting per provider
- Validate IP addresses against whitelist
- Sanitize request payloads
- Extract headers and metadata

**Configuration:**
```typescript
{
  rateLimit: {
    careem: 1000, // requests per minute
    talabat: 500,
    default: 100,
  },
  ipWhitelist: {
    careem: ['34.204.192.0/20', '18.214.0.0/16'],
    talabat: ['185.34.128.0/22'],
  },
  requestTimeout: 30000, // 30 seconds
  maxPayloadSize: '5mb',
}
```

---

#### **2.1.2 Signature Validation Service**
```typescript
// Location: /integration-service/src/modules/signature-validation/

@Injectable()
export class SignatureValidationService {
  /**
   * Validate webhook signature using provider-specific algorithm
   */
  async validateSignature(
    provider: string,
    payload: any,
    signature: string,
    secret: string,
  ): Promise<ValidationResult> {
    const adapter = this.adapterFactory.getAdapter(provider);

    try {
      const isValid = await adapter.validateSignature(
        payload,
        signature,
        secret,
      );

      return {
        isValid,
        provider,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Signature validation failed', {
        provider,
        error: error.message,
      });

      return {
        isValid: false,
        provider,
        error: error.message,
      };
    }
  }
}
```

**Security Features:**
- HMAC-SHA256 signature validation
- Timing-safe comparison to prevent timing attacks
- Secret rotation support
- Configurable signature header names per provider
- Signature expiry validation (replay attack prevention)

---

#### **2.1.3 Provider Adapter System**

**Interface Definition:**
```typescript
// Location: /integration-service/src/interfaces/provider-adapter.interface.ts

export interface IProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;

  // Signature validation
  validateSignature(
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean>;

  // Webhook parsing
  parseWebhook(payload: any): Promise<WebhookPayload>;

  // Order transformation
  mapToInternalOrder(webhookData: WebhookPayload): Promise<ProcessedOrder>;

  // Status mapping
  mapStatus(providerStatus: string): OrderStatus;

  // Configuration validation
  validateConfig(config: ProviderConfig): boolean;

  // Response formatting
  formatSuccessResponse(data?: any): any;
  formatErrorResponse(error: Error): any;
}
```

**Adapter Factory:**
```typescript
@Injectable()
export class ProviderAdapterFactory {
  private readonly adapters = new Map<string, IProviderAdapter>();

  constructor(
    @Inject(CAREEM_ADAPTER) careemAdapter: IProviderAdapter,
    @Inject(TALABAT_ADAPTER) talabatAdapter: IProviderAdapter,
  ) {
    this.registerAdapter(careemAdapter);
    this.registerAdapter(talabatAdapter);
  }

  getAdapter(providerId: string): IProviderAdapter {
    const adapter = this.adapters.get(providerId.toLowerCase());

    if (!adapter) {
      throw new ProviderNotSupportedException(providerId);
    }

    return adapter;
  }

  isProviderSupported(providerId: string): boolean {
    return this.adapters.has(providerId.toLowerCase());
  }
}
```

---

#### **2.1.4 Order Transformation Pipeline**
```typescript
// Location: /integration-service/src/modules/transformation/

@Injectable()
export class OrderTransformationService {
  constructor(
    private readonly adapterFactory: ProviderAdapterFactory,
    private readonly validationService: OrderValidationService,
  ) {}

  /**
   * Transform provider webhook to internal order format
   */
  async transformOrder(
    provider: string,
    webhookPayload: any,
  ): Promise<TransformedOrder> {
    // Step 1: Get provider adapter
    const adapter = this.adapterFactory.getAdapter(provider);

    // Step 2: Parse webhook to standard format
    const webhookData = await adapter.parseWebhook(webhookPayload);

    // Step 3: Map to internal order format
    const processedOrder = await adapter.mapToInternalOrder(webhookData);

    // Step 4: Validate transformed order
    const validation = await this.validationService.validate(processedOrder);

    if (!validation.isValid) {
      throw new OrderValidationException(validation.errors);
    }

    // Step 5: Enrich with additional data
    const enrichedOrder = await this.enrichOrder(processedOrder);

    return {
      originalWebhook: webhookData,
      transformedOrder: enrichedOrder,
      metadata: {
        provider,
        transformedAt: new Date(),
        version: '1.0.0',
      },
    };
  }
}
```

---

#### **2.1.5 Backend Communication Layer**
```typescript
// Location: /integration-service/src/modules/backend-client/

@Injectable()
export class BackendCommunicationService {
  private readonly backendUrl: string;
  private readonly httpClient: HttpService;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.backendUrl = configService.get('BACKEND_URL') || 'http://localhost:3001';

    // Circuit breaker configuration
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      halfOpenRequests: 3,
    });
  }

  /**
   * Forward transformed order to main backend
   */
  async forwardOrder(
    transformedOrder: TransformedOrder,
    retryAttempt: number = 0,
  ): Promise<BackendResponse> {
    const maxRetries = 3;

    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        throw new CircuitBreakerOpenException();
      }

      // Make request to backend
      const response = await this.httpClient.post(
        `${this.backendUrl}/api/integration/orders`,
        transformedOrder,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Integration-Service': 'true',
            'X-Service-Token': this.configService.get('SERVICE_TOKEN'),
          },
          timeout: 10000, // 10 seconds
        },
      );

      // Record success
      this.circuitBreaker.recordSuccess();

      return {
        success: true,
        orderId: response.data.orderId,
        status: response.data.status,
      };

    } catch (error) {
      // Record failure
      this.circuitBreaker.recordFailure();

      // Retry logic
      if (retryAttempt < maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateRetryDelay(retryAttempt);

        this.logger.warn(`Retrying backend request after ${delay}ms`, {
          attempt: retryAttempt + 1,
          maxRetries,
          error: error.message,
        });

        await this.sleep(delay);
        return this.forwardOrder(transformedOrder, retryAttempt + 1);
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  }
}
```

---

#### **2.1.6 Retry Queue System**
```typescript
// Location: /integration-service/src/modules/retry-queue/

@Injectable()
export class RetryQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly backendClient: BackendCommunicationService,
  ) {}

  /**
   * Add failed webhook to retry queue
   */
  async addToRetryQueue(
    webhookLogId: string,
    error: Error,
  ): Promise<void> {
    const nextRetryAt = this.calculateNextRetryTime(1);

    await this.prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        status: WebhookStatus.retrying,
        retryCount: { increment: 1 },
        nextRetryAt,
        errorMessage: error.message,
        errorStack: error.stack,
      },
    });
  }

  /**
   * Process retry queue (scheduled job)
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async processRetryQueue(): Promise<void> {
    const webhooksToRetry = await this.prisma.webhookLog.findMany({
      where: {
        status: WebhookStatus.retrying,
        retryCount: { lt: 10 },
        nextRetryAt: { lte: new Date() },
      },
      include: {
        provider: true,
      },
      take: 50, // Process 50 at a time
    });

    for (const webhook of webhooksToRetry) {
      try {
        await this.retryWebhook(webhook);
      } catch (error) {
        this.logger.error(`Failed to retry webhook ${webhook.id}`, error);
      }
    }
  }

  /**
   * Calculate exponential backoff for retry
   */
  private calculateNextRetryTime(retryCount: number): Date {
    const delays = [
      1 * 60 * 1000,    // 1 minute
      5 * 60 * 1000,    // 5 minutes
      15 * 60 * 1000,   // 15 minutes
      30 * 60 * 1000,   // 30 minutes
      60 * 60 * 1000,   // 1 hour
      2 * 60 * 60 * 1000,  // 2 hours
      6 * 60 * 60 * 1000,  // 6 hours
      12 * 60 * 60 * 1000, // 12 hours
      24 * 60 * 60 * 1000, // 24 hours
    ];

    const delay = delays[Math.min(retryCount - 1, delays.length - 1)];
    return new Date(Date.now() + delay);
  }
}
```

---

#### **2.1.7 Error Handling Service**
```typescript
// Location: /integration-service/src/modules/error-handling/

@Injectable()
export class ErrorHandlingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Handle webhook processing error
   */
  async handleWebhookError(
    webhookLogId: string,
    provider: string,
    error: Error,
    context: ErrorContext,
  ): Promise<void> {
    // Determine error type
    const errorType = this.classifyError(error);

    // Log error to database
    await this.logError(webhookLogId, provider, error, errorType, context);

    // Decide action based on error type
    switch (errorType) {
      case ErrorType.VALIDATION:
        // Validation errors should not be retried
        await this.markAsFailed(webhookLogId, error);
        await this.notifyTeam(provider, error, context);
        break;

      case ErrorType.TEMPORARY:
        // Temporary errors should be retried
        await this.addToRetryQueue(webhookLogId, error);
        break;

      case ErrorType.CONFIGURATION:
        // Configuration errors need immediate attention
        await this.markAsFailed(webhookLogId, error);
        await this.alertOnCall(provider, error, context);
        break;

      default:
        // Unknown errors - retry with caution
        await this.addToRetryQueue(webhookLogId, error);
        break;
    }
  }

  /**
   * Classify error for appropriate handling
   */
  private classifyError(error: Error): ErrorType {
    if (error instanceof BadRequestException) {
      return ErrorType.VALIDATION;
    }

    if (error instanceof UnauthorizedException) {
      return ErrorType.AUTHENTICATION;
    }

    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT')) {
      return ErrorType.TEMPORARY;
    }

    if (error.message.includes('config') ||
        error.message.includes('secret')) {
      return ErrorType.CONFIGURATION;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Log error to database
   */
  private async logError(
    webhookLogId: string,
    provider: string,
    error: Error,
    errorType: ErrorType,
    context: ErrorContext,
  ): Promise<void> {
    const deliveryProvider = await this.prisma.deliveryProvider.findUnique({
      where: { code: provider },
    });

    await this.prisma.deliveryErrorLog.create({
      data: {
        providerId: deliveryProvider.id,
        webhookLogId,
        errorType: errorType.toLowerCase(),
        errorMessage: error.message,
        errorStack: error.stack,
        context: context as any,
        requestData: context.requestData,
        responseData: context.responseData,
      },
    });
  }
}
```

---

## 3. Security Layer

### 3.1 Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                   │
│  • IP Whitelisting • DDoS Protection • Rate Limiting        │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Authentication                                      │
│  • API Key Validation • Service Token • Webhook Signatures  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Request Validation                                  │
│  • Payload Sanitization • Schema Validation • Size Limits   │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Data Security                                       │
│  • Encryption at Rest • Secrets Management • Audit Logging  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 IP Whitelisting Implementation

```typescript
// Location: /integration-service/src/guards/ip-whitelist.guard.ts

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = this.extractClientIp(request);
    const provider = request.params.provider;

    // Get whitelist for provider
    const whitelist = this.getProviderWhitelist(provider);

    // Check if IP is whitelisted
    const isWhitelisted = this.isIpWhitelisted(clientIp, whitelist);

    if (!isWhitelisted) {
      this.logger.warn(`Blocked request from non-whitelisted IP`, {
        provider,
        clientIp,
        endpoint: request.url,
      });

      throw new ForbiddenException('IP address not whitelisted');
    }

    return true;
  }

  /**
   * Extract client IP from request (considering proxies)
   */
  private extractClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.socket.remoteAddress ||
      ''
    ).split(',')[0].trim();
  }

  /**
   * Check if IP is in whitelist (supports CIDR notation)
   */
  private isIpWhitelisted(ip: string, whitelist: string[]): boolean {
    for (const range of whitelist) {
      if (this.ipMatchesCIDR(ip, range)) {
        return true;
      }
    }
    return false;
  }
}
```

### 3.3 Rate Limiting Configuration

```typescript
// Location: /integration-service/src/config/rate-limit.config.ts

export const rateLimitConfig = {
  careem: {
    points: 1000, // Number of requests
    duration: 60,  // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes on exceed
  },
  talabat: {
    points: 500,
    duration: 60,
    blockDuration: 300,
  },
  default: {
    points: 100,
    duration: 60,
    blockDuration: 600,
  },
};
```

### 3.4 Request Sanitization

```typescript
// Location: /integration-service/src/services/request-sanitizer.service.ts

@Injectable()
export class RequestSanitizerService {
  /**
   * Sanitize incoming webhook payload
   */
  sanitize(payload: any): any {
    // Remove potentially dangerous fields
    const sanitized = { ...payload };

    // Remove script tags from string fields
    this.sanitizeStrings(sanitized);

    // Validate field types
    this.validateTypes(sanitized);

    // Remove null bytes
    this.removeNullBytes(sanitized);

    return sanitized;
  }

  private sanitizeStrings(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = this.sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeStrings(obj[key]);
      }
    }
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}
```

---

## 4. Provider Adapters

### 4.1 Careem Adapter (Priority Implementation)

**Based on existing `/backend/src/modules/delivery-integration/adapters/careem.adapter.ts`**

**Key Features:**
- HMAC-SHA256 signature validation
- Careem-specific status mapping
- Order item transformation with modifiers
- Captain/driver information extraction
- Address formatting for Jordan

**Webhook Endpoint:**
```
POST /api/webhooks/careem
Headers:
  - x-careem-signature: HMAC-SHA256 signature
  - x-merchant-id: Merchant identifier
```

**Sample Webhook Payload:**
```json
{
  "id": "CR123456789",
  "status": "created",
  "order_number": "ORD-001",
  "created_at": "2025-10-01T12:00:00Z",
  "customer": {
    "name": "Ahmed Ali",
    "phone_number": "+962791234567",
    "email": "ahmed@example.com",
    "address": {
      "street": "King Abdullah Street",
      "area": "Abdoun",
      "city": "Amman",
      "latitude": 31.9539,
      "longitude": 35.9106
    }
  },
  "items": [
    {
      "id": "item-001",
      "name": "Chicken Burger",
      "name_ar": "برجر دجاج",
      "quantity": 2,
      "item_price": 5.5,
      "total_price": 11.0,
      "groups": [
        {
          "name": "Add-ons",
          "options": [
            {
              "id": "opt-001",
              "name": "Extra Cheese",
              "price": 0.5,
              "quantity": 1
            }
          ]
        }
      ]
    }
  ],
  "price": {
    "subtotal": 11.0,
    "delivery_fee": 2.0,
    "service_fee": 1.0,
    "tax_amount": 2.24,
    "total_taxable_price": 16.24
  },
  "delivery_type": "careem",
  "merchant_pay_type": "cash"
}
```

### 4.2 Talabat Adapter

**Implementation Status:** Basic structure exists, needs production completion

**Key Features:**
- OAuth token-based authentication
- Talabat-specific webhook format
- Menu synchronization support
- Real-time order status updates

**Webhook Endpoint:**
```
POST /api/webhooks/talabat
Headers:
  - x-talabat-signature: Request signature
  - Authorization: Bearer <token>
```

### 4.3 Generic Adapter Interface

**For future providers (Uber Eats, Deliveroo, etc.):**

```typescript
export abstract class BaseProviderAdapter implements IProviderAdapter {
  abstract readonly providerId: string;
  abstract readonly providerName: string;

  // Common implementations
  protected logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  // Template methods for common operations
  protected async logWebhookReceived(payload: any): Promise<void> {
    this.logger.log(`Webhook received from ${this.providerName}`, {
      provider: this.providerId,
      orderId: this.extractOrderId(payload),
    });
  }

  // Abstract methods to be implemented by specific adapters
  abstract validateSignature(
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean>;

  abstract parseWebhook(payload: any): Promise<WebhookPayload>;

  abstract mapToInternalOrder(
    webhookData: WebhookPayload,
  ): Promise<ProcessedOrder>;
}
```

---

## 5. Communication Patterns

### 5.1 Webhook → Integration Service → Backend Flow

```sequence
Careem → Integration Service: POST /api/webhooks/careem
Integration Service → Integration Service: Validate Signature
Integration Service → Integration Service: Transform Order
Integration Service → Database: Save WebhookLog (processing)
Integration Service → Main Backend: POST /api/integration/orders
Main Backend → Database: Create Order
Main Backend → PrintingService: Queue Print Job
Main Backend → Integration Service: 200 OK {orderId}
Integration Service → Database: Update WebhookLog (completed)
Integration Service → Careem: 200 OK {success: true}
```

### 5.2 Error Flow with Retry

```sequence
Careem → Integration Service: POST /api/webhooks/careem
Integration Service → Main Backend: POST /api/integration/orders
Main Backend → Integration Service: 500 Error (Backend down)
Integration Service → Database: WebhookLog (failed, retryCount: 1)
Integration Service → Careem: 200 OK (accepted for retry)

--- 1 minute later ---

RetryWorker → Database: Find webhooks to retry
RetryWorker → Main Backend: POST /api/integration/orders
Main Backend → Database: Create Order
Main Backend → RetryWorker: 200 OK
RetryWorker → Database: Update WebhookLog (completed)
```

### 5.3 Circuit Breaker Pattern

```typescript
// When backend is down
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: Date | null = null;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitBreakerOpenException();
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

---

## 6. Database Interaction

### 6.1 Database Connection

**Shared PostgreSQL Database:**
```typescript
// Location: /integration-service/src/config/database.config.ts

export const databaseConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  database: 'postgres', // MUST use this database name
  username: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD, // E$$athecode006

  // Connection pooling
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },

  // Use existing schema from main backend
  schema: 'public',
};
```

### 6.2 Database Models Used

**Integration Service ONLY writes to these tables:**
- `webhook_logs` - Log all incoming webhooks
- `delivery_error_logs` - Track integration errors
- `provider_order_logs` - Track order status from providers

**Integration Service READS from:**
- `delivery_providers` - Provider configuration
- `branch_delivery_configs` - Branch-specific settings
- `orders` - Check for duplicate orders

**Integration Service NEVER directly creates:**
- `orders` - Created by main backend
- `order_items` - Created by main backend
- `print_jobs` - Created by main backend

### 6.3 Webhook Log Schema Usage

```typescript
// Example: Creating webhook log entry
await prisma.webhookLog.create({
  data: {
    providerId: provider.id,
    branchId: branchConfig.branchId,
    companyId: branchConfig.companyId,
    webhookType: 'order_created',
    externalOrderId: 'CR123456789',
    endpoint: '/api/webhooks/careem',
    method: 'POST',
    headers: request.headers,
    payload: request.body,
    signature: request.headers['x-careem-signature'],
    status: WebhookStatus.processing,
    receivedAt: new Date(),
  },
});

// Update when processed successfully
await prisma.webhookLog.update({
  where: { id: webhookLogId },
  data: {
    status: WebhookStatus.completed,
    processedAt: new Date(),
    internalOrderId: createdOrderId,
    response: { success: true, orderId: createdOrderId },
  },
});
```

---

## 7. Deployment Configuration

### 7.1 Directory Structure

```
/home/admin/restaurant-platform-remote-v2/
├── backend/                    # Main backend (Port 3001)
├── frontend/                   # Next.js frontend (Port 3000)
├── integration-service/        # NEW: Integration Service (Port 3002)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   ├── webhook-receiver/
│   │   │   ├── signature-validation/
│   │   │   ├── adapters/
│   │   │   │   ├── careem.adapter.ts
│   │   │   │   ├── talabat.adapter.ts
│   │   │   │   └── adapter.factory.ts
│   │   │   ├── transformation/
│   │   │   ├── backend-client/
│   │   │   ├── retry-queue/
│   │   │   └── error-handling/
│   │   ├── guards/
│   │   │   ├── ip-whitelist.guard.ts
│   │   │   ├── rate-limit.guard.ts
│   │   │   └── webhook-auth.guard.ts
│   │   ├── config/
│   │   └── interfaces/
│   ├── prisma/
│   │   └── schema.prisma (symlink to ../backend/prisma/schema.prisma)
│   ├── .env
│   ├── .env.production
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── Dockerfile
├── docker-compose.yml          # Updated with integration-service
└── docs/
```

### 7.2 Environment Variables

**Integration Service `.env` file:**
```bash
# Service Configuration
NODE_ENV=production
PORT=3002
SERVICE_NAME=integration-service

# Backend Communication
BACKEND_URL=http://localhost:3001
SERVICE_TOKEN=<secure-random-token-for-service-to-service-auth>

# Database (Shared with main backend)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=admin
DATABASE_PASSWORD=E$$athecode006

# Careem Configuration
CAREEM_ENABLED=true
CAREEM_WEBHOOK_SECRET=<careem-webhook-secret>
CAREEM_IP_WHITELIST=34.204.192.0/20,18.214.0.0/16

# Talabat Configuration
TALABAT_ENABLED=true
TALABAT_WEBHOOK_SECRET=<talabat-webhook-secret>
TALABAT_IP_WHITELIST=185.34.128.0/22

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CAREEM=1000
RATE_LIMIT_TALABAT=500
RATE_LIMIT_DEFAULT=100

# Retry Configuration
RETRY_ENABLED=true
RETRY_MAX_ATTEMPTS=10
RETRY_WORKER_INTERVAL=5m

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_ENABLED=true
```

### 7.3 Docker Configuration

**Dockerfile for Integration Service:**
```dockerfile
# Location: /integration-service/Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/main.js"]
```

**Updated docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: E$$athecode006
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://admin:E$$athecode006@postgres:5432/postgres
      PORT: 3001
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  integration-service:
    build:
      context: ./integration-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
      - "9090:9090"  # Metrics port
    environment:
      DATABASE_URL: postgresql://admin:E$$athecode006@postgres:5432/postgres
      BACKEND_URL: http://backend:3001
      PORT: 3002
    depends_on:
      postgres:
        condition: service_healthy
      backend:
        condition: service_started
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### 7.4 PM2 Configuration (Alternative to Docker)

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'integration-service',
      script: 'dist/main.js',
      cwd: '/home/admin/restaurant-platform-remote-v2/integration-service',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      max_memory_restart: '500M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'backend',
      script: 'dist/main.js',
      cwd: '/home/admin/restaurant-platform-remote-v2/backend',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
```

---

## 8. API Specifications

### 8.1 Webhook Endpoints

#### **POST /api/webhooks/:provider**
Receive webhook from delivery provider.

**Parameters:**
- `provider` (path): Provider identifier (careem, talabat, etc.)

**Headers:**
- `x-webhook-signature`: Webhook signature for validation
- `x-merchant-id`: Merchant identifier (optional)
- `x-auth`: API key for authentication (optional)

**Request Body:**
Provider-specific webhook payload

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "requestId": "req-123",
    "orderId": "ord-456",
    "status": "created"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Invalid webhook payload structure"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Webhook signature validation failed"
  }
}
```

---

#### **GET /api/webhooks/health/:provider**
Health check endpoint for specific provider integration.

**Parameters:**
- `provider` (path): Provider identifier

**Response (200 OK):**
```json
{
  "status": "healthy",
  "provider": "careem",
  "timestamp": "2025-10-01T12:00:00Z",
  "endpoint": "/api/webhooks/careem",
  "configuration": {
    "signatureValidation": true,
    "rateLimiting": true,
    "ipWhitelisting": true
  }
}
```

---

### 8.2 Internal Service Endpoints

#### **POST /api/integration/orders** (Main Backend)
Endpoint called by integration service to create orders.

**Headers:**
- `X-Integration-Service`: "true"
- `X-Service-Token`: Service authentication token

**Request Body:**
```json
{
  "originalWebhook": {
    "providerId": "careem",
    "webhookType": "order_created",
    "orderId": "CR123456789",
    "timestamp": "2025-10-01T12:00:00Z"
  },
  "transformedOrder": {
    "orderNumber": "CAREEM-123456789",
    "branchId": "branch-uuid",
    "companyId": "company-uuid",
    "customerName": "Ahmed Ali",
    "customerPhone": "+962791234567",
    "orderType": "delivery",
    "status": "pending",
    "items": [...],
    "pricing": {...}
  },
  "metadata": {
    "provider": "careem",
    "transformedAt": "2025-10-01T12:00:01Z",
    "version": "1.0.0"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "internal-order-uuid",
  "status": "pending",
  "printJobQueued": true
}
```

---

### 8.3 Monitoring Endpoints

#### **GET /health**
Service health check.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "integration-service",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "backendConnection": "healthy",
    "retryQueue": "healthy"
  }
}
```

---

#### **GET /metrics**
Prometheus-compatible metrics endpoint.

**Response (200 OK):**
```
# HELP webhooks_received_total Total webhooks received by provider
# TYPE webhooks_received_total counter
webhooks_received_total{provider="careem"} 1234
webhooks_received_total{provider="talabat"} 567

# HELP webhooks_processed_total Total webhooks successfully processed
# TYPE webhooks_processed_total counter
webhooks_processed_total{provider="careem",status="success"} 1200
webhooks_processed_total{provider="careem",status="failed"} 34

# HELP webhook_processing_duration_seconds Webhook processing duration
# TYPE webhook_processing_duration_seconds histogram
webhook_processing_duration_seconds_bucket{provider="careem",le="0.1"} 800
webhook_processing_duration_seconds_bucket{provider="careem",le="0.5"} 1150
webhook_processing_duration_seconds_bucket{provider="careem",le="1.0"} 1200
webhook_processing_duration_seconds_sum{provider="careem"} 450.5
webhook_processing_duration_seconds_count{provider="careem"} 1200
```

---

## 9. Monitoring & Logging

### 9.1 Structured Logging

```typescript
// Location: /integration-service/src/config/logger.config.ts

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),
  ],
});
```

**Log Entry Structure:**
```json
{
  "timestamp": "2025-10-01T12:00:00.123Z",
  "level": "info",
  "context": "WebhookProcessingService",
  "message": "Webhook processed successfully",
  "requestId": "req-123",
  "provider": "careem",
  "orderId": "CR123456789",
  "processingTime": 145,
  "metadata": {
    "branchId": "branch-uuid",
    "companyId": "company-uuid"
  }
}
```

### 9.2 Metrics Collection

**Key Metrics to Track:**
- **Webhook Volume**: Requests per provider per minute
- **Processing Time**: Latency percentiles (p50, p95, p99)
- **Success Rate**: Percentage of successfully processed webhooks
- **Error Rate**: Percentage of failed webhooks by error type
- **Retry Queue Size**: Number of webhooks awaiting retry
- **Backend Communication**: Success rate, response time
- **Circuit Breaker State**: Open/closed status

**Prometheus Integration:**
```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly webhooksReceived: Counter;
  private readonly webhooksProcessed: Counter;
  private readonly processingDuration: Histogram;

  constructor() {
    this.webhooksReceived = new Counter({
      name: 'webhooks_received_total',
      help: 'Total webhooks received by provider',
      labelNames: ['provider'],
    });

    this.webhooksProcessed = new Counter({
      name: 'webhooks_processed_total',
      help: 'Total webhooks processed',
      labelNames: ['provider', 'status'],
    });

    this.processingDuration = new Histogram({
      name: 'webhook_processing_duration_seconds',
      help: 'Webhook processing duration',
      labelNames: ['provider'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });
  }

  recordWebhookReceived(provider: string): void {
    this.webhooksReceived.inc({ provider });
  }

  recordWebhookProcessed(
    provider: string,
    success: boolean,
    duration: number,
  ): void {
    this.webhooksProcessed.inc({
      provider,
      status: success ? 'success' : 'failed',
    });

    this.processingDuration.observe({ provider }, duration / 1000);
  }
}
```

### 9.3 Alerting Rules

**Critical Alerts:**
- Webhook processing error rate > 10% for 5 minutes
- Circuit breaker open for > 2 minutes
- Retry queue size > 1000
- Database connection failures
- Backend unreachable for > 1 minute

**Warning Alerts:**
- Webhook processing latency p95 > 2 seconds
- Retry queue size > 500
- Signature validation failure rate > 5%

---

## 10. Scalability Considerations

### 10.1 Horizontal Scaling

**Load Balancer Configuration:**
```nginx
# Nginx configuration for integration service
upstream integration_service {
    least_conn;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
    server 127.0.0.1:3005;
}

server {
    listen 443 ssl;
    server_name integration.restaurant-platform.com;

    ssl_certificate /etc/ssl/certs/integration.crt;
    ssl_certificate_key /etc/ssl/private/integration.key;

    location /api/webhooks/ {
        proxy_pass http://integration_service;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;

        # Increase timeout for webhook processing
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }
}
```

### 10.2 Database Connection Pooling

```typescript
// Optimized for multiple service instances
export const databasePoolConfig = {
  min: 2,
  max: 10, // Per service instance
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,

  // Statement timeout to prevent long-running queries
  statement_timeout: 10000,

  // Connection reaping
  reapIntervalMillis: 1000,
};
```

### 10.3 Caching Strategy

**Redis Integration for Rate Limiting:**
```typescript
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        db: 0,
      },
    }),
  ],
})
export class IntegrationServiceModule {}
```

**Use Cases:**
- Rate limiting counters (per provider)
- Circuit breaker state (shared across instances)
- Provider configuration cache
- Duplicate order detection cache (5-minute TTL)

### 10.4 Message Queue (Future Enhancement)

**For high-volume scenarios:**
```typescript
// RabbitMQ or AWS SQS integration
@Injectable()
export class QueueService {
  async enqueueWebhook(webhook: WebhookPayload): Promise<void> {
    await this.queue.add('process-webhook', webhook, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  @Process('process-webhook')
  async processWebhook(job: Job<WebhookPayload>): Promise<void> {
    await this.webhookProcessingService.processWebhook(
      job.data.providerId,
      job.data.rawPayload,
      job.data.context,
    );
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- ✅ Setup project structure
- ✅ Implement basic webhook receiver
- ✅ Signature validation service
- ✅ Database connection
- ✅ Basic logging

### Phase 2: Careem Integration (Week 3)
- ✅ Careem adapter implementation
- ✅ Order transformation pipeline
- ✅ Backend communication layer
- ✅ Error handling

### Phase 3: Reliability (Week 4)
- ✅ Retry queue system
- ✅ Circuit breaker implementation
- ✅ Rate limiting
- ✅ IP whitelisting

### Phase 4: Monitoring (Week 5)
- ✅ Metrics collection
- ✅ Structured logging
- ✅ Health checks
- ✅ Alerting rules

### Phase 5: Additional Providers (Week 6+)
- ⏳ Talabat adapter completion
- ⏳ Generic adapter framework
- ⏳ Provider onboarding documentation

---

## Security Checklist

- ✅ HMAC signature validation for all providers
- ✅ IP whitelisting with CIDR support
- ✅ Rate limiting per provider
- ✅ Request payload sanitization
- ✅ Service-to-service authentication tokens
- ✅ Secrets management (environment variables, not hardcoded)
- ✅ HTTPS enforcement in production
- ✅ Database credentials encryption
- ✅ Audit logging for all webhook events
- ✅ DDoS protection (rate limiting + IP whitelisting)

---

## Testing Strategy

### Unit Tests
- Provider adapter logic
- Signature validation
- Order transformation
- Error classification

### Integration Tests
- Webhook endpoint flow
- Database interactions
- Backend communication
- Retry queue processing

### Load Tests
- 1000 webhooks/minute sustained
- Spike handling (10x normal load)
- Database connection pool under load
- Rate limiter effectiveness

### Security Tests
- Invalid signature rejection
- Non-whitelisted IP blocking
- Payload injection attempts
- Replay attack prevention

---

## Conclusion

This architecture provides a production-ready, standalone integration service that:

1. **Separates Concerns**: Webhook processing isolated from main business logic
2. **Ensures Reliability**: Retry mechanisms and circuit breakers prevent data loss
3. **Maintains Security**: Multi-layer validation and authentication
4. **Enables Scalability**: Horizontal scaling with load balancing
5. **Provides Observability**: Comprehensive logging and metrics
6. **Supports Growth**: Easy addition of new delivery providers

**Next Steps:**
1. Review this design with the development team
2. Setup integration-service directory structure
3. Migrate existing delivery-integration module logic
4. Implement Careem adapter (priority #1)
5. Deploy to staging environment for testing
6. Configure production monitoring and alerting

---

*Document Version: 1.0*
*Last Updated: October 1, 2025*
*Author: Backend Architect (Claude Code)*
