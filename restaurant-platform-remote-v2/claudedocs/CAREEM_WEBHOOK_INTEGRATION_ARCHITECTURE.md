# Careem Webhook Integration - Architecture Analysis & Recommendations

**Date**: October 1, 2025
**Analyst**: System Architect
**Status**: Architecture Review Complete

---

## Executive Summary

The Careem webhook integration requires **architectural consolidation** to align with the existing integration domain structure. Current implementation has webhook processing split between:
- **Legacy Module**: `modules/delivery-webhooks/` (isolated implementation)
- **Integration Domain**: `domains/integration/` (comprehensive framework)

**Recommendation**: Migrate Careem webhook from legacy module into the integration domain for unified webhook processing, better error handling, and enterprise-grade retry mechanisms.

---

## Current State Analysis

### 1. Existing Implementation Structure

#### A. Legacy Webhook Module
**Location**: `/backend/src/modules/delivery-webhooks/`

```
modules/delivery-webhooks/
├── careem-webhook.controller.ts    # Direct database access
├── delivery-webhooks.module.ts     # Minimal module setup
└── [No service layer abstraction]
```

**Current Flow**:
```
Careem Provider → POST /api/v1/delivery/webhook/careem → CareemWebhookController
                                                         ├── Direct PrismaService calls
                                                         ├── Inline signature validation
                                                         ├── Inline payload transformation
                                                         └── Direct order creation
```

**Limitations**:
- ❌ No service layer abstraction (controller does everything)
- ❌ No event-driven architecture (no domain event emission)
- ❌ Limited retry mechanism (basic webhook logging only)
- ❌ No integration with existing webhook infrastructure
- ❌ Duplicate code patterns from integration domain
- ❌ Not aligned with DDD principles

#### B. Integration Domain (Existing Framework)
**Location**: `/backend/src/domains/integration/`

```
domains/integration/
├── webhooks/
│   ├── webhook.service.ts              # Webhook registration & management
│   ├── webhook-processor.service.ts    # Provider webhook processing
│   ├── webhook-validation.service.ts   # Signature validation
│   ├── webhook-retry.service.ts        # Retry mechanisms
│   └── webhook.controller.ts           # Generic webhook endpoint
├── services/
│   ├── integration-orders.service.ts   # Order processing (stub)
│   ├── integration-logs.service.ts     # Comprehensive logging
│   └── integration-monitoring.service.ts # Analytics & monitoring
├── guards/
│   └── api-key-auth.guard.ts          # API key authentication
└── integration.module.ts               # Domain module
```

**Capabilities**:
- ✅ Event-driven architecture (EventEmitter2)
- ✅ Provider-agnostic webhook processing
- ✅ Sophisticated retry mechanisms (exponential backoff)
- ✅ Comprehensive logging and monitoring
- ✅ Service layer abstraction
- ✅ Multi-provider support (Careem, Talabat, Deliveroo, Jahez, HungerStation)

### 2. Database Schema Analysis

The schema **fully supports** webhook operations with comprehensive models:

#### Webhook-Related Tables

**`WebhookLog`** (Comprehensive logging):
```prisma
model WebhookLog {
  id              String        @id @default(uuid())
  providerId      String
  branchId        String?
  companyId       String?

  // Webhook metadata
  webhookType     String        # 'order_created', 'status_update'
  externalOrderId String?
  internalOrderId String?

  // Request data
  endpoint        String
  method          String
  headers         Json?
  payload         Json
  signature       String?
  ipAddress       String?

  // Processing status
  status          WebhookStatus # received, pending, processing, completed, failed, retrying
  processedAt     DateTime?
  retryCount      Int           @default(0)
  maxRetries      Int           @default(10)
  nextRetryAt     DateTime?

  // Error tracking
  errorMessage    String?
  errorStack      String?
  response        Json?

  // Timestamps
  createdAt       DateTime      @default(now())

  // Relations
  provider        DeliveryProvider @relation(fields: [providerId])
  branch          Branch?          @relation(fields: [branchId])
  company         Company?         @relation(fields: [companyId])
}

enum WebhookStatus {
  received
  pending
  processing
  completed
  failed
  retrying
  ignored
}
```

**`DeliveryProvider`** (Provider management):
```prisma
model DeliveryProvider {
  id                  String  @id @default(uuid())
  code                String  @unique  # 'careem', 'talabat'
  name                String
  description         String?
  apiBaseUrl          String?
  webhookEndpoint     String?
  isActive            Boolean @default(false)
  supportsWebhooks    Boolean @default(true)
  supportsApi         Boolean @default(false)
  config              Json?   # API keys, secrets, URLs
  rateLimitPerMinute  Int     @default(100)

  // Relations
  branchConfigs       BranchDeliveryConfig[]
  webhookLogs         WebhookLog[]
  providerOrderLogs   ProviderOrderLog[]
}
```

**`ProviderOrderLog`** (Order tracking):
```prisma
model ProviderOrderLog {
  id                String       @id @default(uuid())
  orderId           String
  providerId        String
  branchId          String
  companyId         String

  // Provider order details
  externalOrderId   String
  providerStatus    String       # Provider's raw status
  mappedStatus      OrderStatus? # Our normalized status

  // Delivery details
  deliveryType      String?
  estimatedDelivery DateTime?
  actualDelivery    DateTime?

  // Captain/Driver details
  captainName       String?
  captainPhone      String?
  captainId         String?

  // Financial
  deliveryFee       Decimal?
  serviceFee        Decimal?
  totalAmount       Decimal?
  paymentMethod     String?
  isPrepaid         Boolean @default(false)

  // Raw data
  rawData           Json?

  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  order             Order            @relation(fields: [orderId])
  provider          DeliveryProvider @relation(fields: [providerId])
  branch            Branch           @relation(fields: [branchId])
  company           Company          @relation(fields: [companyId])
}
```

**`BranchDeliveryConfig`** (Branch-specific provider settings):
```prisma
model BranchDeliveryConfig {
  id                 String   @id @default(uuid())
  branchId           String
  providerId         String
  companyId          String

  // Provider-specific merchant configuration
  merchantId         String?
  storeId            String?
  apiKey             String?
  apiSecret          String?
  webhookSecret      String?

  // Integration settings
  isActive           Boolean @default(false)
  autoAcceptOrders   Boolean @default(false)
  autoPrintOnReceive Boolean @default(true)
  syncMenu           Boolean @default(false)
  settings           Json?

  // Metadata
  lastSyncAt         DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  branch             Branch           @relation(fields: [branchId])
  provider           DeliveryProvider @relation(fields: [providerId])
  company            Company          @relation(fields: [companyId])
}
```

**Schema Verdict**: ✅ **Fully supports all webhook operations** - No schema changes needed.

---

## Recommended Architecture

### 1. Unified Webhook Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CAREEM WEBHOOK INTEGRATION                        │
└─────────────────────────────────────────────────────────────────────────┘

[1] Careem Provider
      │
      │ POST /api/v1/integrations/webhooks/careem/{companyId}/{branchId}
      │ Headers: x-careem-signature
      │ Payload: { order details }
      ▼
[2] Integration Domain - Webhook Controller
      │
      ├─► Webhook Validation Service
      │   ├── Verify signature (HMAC-SHA256)
      │   ├── Validate payload structure
      │   └── Rate limiting check
      │
      ├─► Create WebhookLog (status: 'received')
      │
      ▼
[3] Webhook Processor Service
      │
      ├─► Route to provider handler: processCareemEvent()
      │   ├── Normalize payload → internal format
      │   ├── Extract order data
      │   └── Prepare domain event
      │
      ├─► Emit domain event: 'integration.order.created'
      │
      └─► Update WebhookLog (status: 'processing')
      │
      ▼
[4] Order Processing Service (Event Listener)
      │
      ├─► Find or create customer
      ├─► Validate branch & company access
      ├─► Create Order entity
      ├─► Create OrderItems
      ├─► Create ProviderOrderLog
      ├─► Calculate totals & taxes
      │
      ├─► Emit: 'order.created' → Print service
      │                        → Notification service
      │                        → Analytics service
      │
      └─► Update WebhookLog (status: 'completed')
      │
      ▼
[5] Response to Careem
      │
      └─► { success: true, orderId: "...", orderNumber: "..." }


[ERROR PATH]
      │
      ├─► Update WebhookLog (status: 'failed', errorMessage)
      │
      ├─► Webhook Retry Service
      │   ├── Queue for retry (exponential backoff)
      │   ├── Max retries: 10
      │   ├── Retry delays: 1s, 2s, 4s, 8s, 16s...
      │   └── Dead letter queue after max retries
      │
      └─► Alert monitoring service
```

### 2. Service Layer Architecture

#### A. Webhook Controller (Entry Point)
```typescript
// domains/integration/webhooks/webhook.controller.ts

@Controller('api/v1/integrations/webhooks')
export class WebhookController {

  @Post(':provider/:companyId/:branchId')
  async handleProviderWebhook(
    @Param('provider') provider: string,
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @Body() payload: any,
    @Headers() headers: any,
    @Ip() ipAddress: string,
  ) {
    // Validate provider is supported
    const supportedProviders = ['careem', 'talabat', 'deliveroo', 'jahez', 'hungerstation'];
    if (!supportedProviders.includes(provider.toLowerCase())) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    // Validate signature
    await this.webhookValidationService.validateSignature(
      provider,
      companyId,
      branchId,
      payload,
      headers,
    );

    // Process webhook
    const result = await this.webhookProcessorService.processWebhook({
      provider,
      clientId: branchId,
      companyId,
      eventType: payload.event_type || 'order.created',
      payload,
      headers,
    });

    return {
      success: result.success,
      message: 'Webhook received and processing',
      logId: result.logId,
    };
  }
}
```

#### B. Webhook Processor Service (Provider Routing)
```typescript
// domains/integration/webhooks/webhook-processor.service.ts

@Injectable()
export class WebhookProcessorService {

  async processWebhook(event: WebhookEvent): Promise<ProcessingResult> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    try {
      // Create webhook log
      const webhookLog = await this.createWebhookLog(event, correlationId);

      // Route to provider-specific handler
      await this.processProviderWebhook(event);

      // Emit domain event
      await this.eventEmitter.emitAsync(
        `webhook.${event.provider}.${event.eventType}`,
        { ...event, correlationId, logId: webhookLog.id }
      );

      // Update log to completed
      await this.updateWebhookLog(webhookLog.id, 'completed', Date.now() - startTime);

      return { success: true, logId: webhookLog.id, processingTime: Date.now() - startTime };

    } catch (error) {
      // Queue for retry
      await this.retryService.queueForRetry(event, error.message, 'high');
      throw error;
    }
  }

  private async processCareemEvent(event: WebhookEvent): Promise<void> {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'order.created':
        await this.handleNewOrder('careem', event);
        break;
      case 'order.updated':
        await this.handleOrderUpdate('careem', event);
        break;
      case 'order.cancelled':
        await this.handleOrderCancellation('careem', event);
        break;
      default:
        this.logger.warn(`Unhandled Careem event: ${eventType}`);
    }
  }

  private async handleNewOrder(provider: string, event: WebhookEvent): Promise<void> {
    const normalizedOrder = this.normalizeOrderData(provider, event.payload);

    await this.eventEmitter.emitAsync('integration.order.created', {
      provider,
      companyId: event.companyId,
      branchId: event.clientId,
      orderData: normalizedOrder,
      originalPayload: event.payload,
      correlationId: event.correlationId,
    });
  }
}
```

#### C. Integration Order Service (Order Creation)
```typescript
// domains/integration/services/integration-orders.service.ts

@Injectable()
export class IntegrationOrdersService {

  @OnEvent('integration.order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      // Find or create customer
      const customer = await this.findOrCreateCustomer({
        name: event.orderData.customerName,
        phone: event.orderData.customerPhone,
        email: event.orderData.customerEmail,
        companyId: event.companyId,
      });

      // Validate branch access
      const branch = await this.validateBranchAccess(event.branchId, event.companyId);

      // Get provider
      const provider = await this.getProvider(event.provider);

      // Create order
      const order = await this.prisma.order.create({
        data: {
          orderNumber: `${event.provider.toUpperCase()}-${Date.now()}`,
          branchId: event.branchId,
          customerId: customer.id,
          customerName: event.orderData.customerName,
          customerPhone: event.orderData.customerPhone,
          deliveryAddress: event.orderData.deliveryAddress,
          orderType: 'delivery',
          status: 'pending',
          subtotal: event.orderData.subtotal,
          deliveryFee: event.orderData.deliveryFee || 0,
          taxAmount: event.orderData.taxAmount || 0,
          totalAmount: event.orderData.totalAmount,
          paymentMethod: event.orderData.paymentMethod || 'cash',
          paymentStatus: 'pending',
          deliveryProviderId: provider.id,
        },
      });

      // Create order items
      for (const item of event.orderData.items) {
        await this.prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId || 'unknown',
            productName: { en: item.name },
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.total,
            modifiers: item.modifiers || [],
          },
        });
      }

      // Create provider order log
      await this.prisma.providerOrderLog.create({
        data: {
          orderId: order.id,
          providerId: provider.id,
          branchId: event.branchId,
          companyId: event.companyId,
          externalOrderId: event.orderData.externalOrderId,
          providerStatus: 'received',
          rawData: event.originalPayload,
        },
      });

      // Emit order created event for downstream systems
      await this.eventEmitter.emitAsync('order.created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        branchId: event.branchId,
        companyId: event.companyId,
        source: event.provider,
      });

      this.logger.log(`Successfully created order ${order.orderNumber} from ${event.provider}`);

    } catch (error) {
      this.logger.error(`Failed to create order from ${event.provider}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### 3. Error Handling & Retry Mechanism

```typescript
// domains/integration/webhooks/webhook-retry.service.ts

@Injectable()
export class WebhookRetryService {
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000];
  private readonly MAX_RETRIES = 10;

  async queueForRetry(
    webhookData: WebhookEvent,
    errorMessage: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<void> {
    const retryCount = webhookData.retryCount || 0;

    if (retryCount >= this.MAX_RETRIES) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(webhookData, errorMessage);
      return;
    }

    const nextRetryDelay = this.RETRY_DELAYS[retryCount] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

    // Update webhook log
    await this.prisma.webhookLog.update({
      where: { id: webhookData.logId },
      data: {
        status: 'retrying',
        retryCount: retryCount + 1,
        nextRetryAt,
        errorMessage,
      },
    });

    // Schedule retry (using queue or scheduler)
    await this.scheduleRetry(webhookData, nextRetryDelay);
  }

  private async scheduleRetry(webhookData: WebhookEvent, delayMs: number): Promise<void> {
    setTimeout(async () => {
      try {
        await this.webhookProcessorService.processWebhook({
          ...webhookData,
          retryCount: (webhookData.retryCount || 0) + 1,
        });
      } catch (error) {
        this.logger.error(`Retry failed for webhook ${webhookData.logId}: ${error.message}`);
      }
    }, delayMs);
  }
}
```

---

## Migration Plan

### Phase 1: Preparation (No Breaking Changes)
**Duration**: 1-2 days

1. **Create Careem Event Handlers in Integration Domain**
   - Add Careem-specific event handlers to `webhook-processor.service.ts`
   - Implement payload normalization for Careem format
   - Add Careem signature validation logic

2. **Implement Order Creation Service**
   - Complete the stub implementation in `integration-orders.service.ts`
   - Add event listener for `integration.order.created`
   - Implement customer creation logic
   - Implement order item creation logic

3. **Database Seeding**
   - Ensure `DeliveryProvider` table has Careem entry:
     ```sql
     INSERT INTO delivery_providers (id, code, name, is_active, supports_webhooks)
     VALUES (uuid_generate_v4(), 'careem', 'Careem Now', true, true);
     ```

### Phase 2: Dual Operation (Testing)
**Duration**: 1 week

1. **Add New Webhook Endpoint**
   - Keep old endpoint: `POST /api/v1/delivery/webhook/careem`
   - Add new endpoint: `POST /api/v1/integrations/webhooks/careem/{companyId}/{branchId}`

2. **Parallel Processing**
   - Configure Careem to send to NEW endpoint
   - Keep old controller active for fallback
   - Monitor both endpoints for differences

3. **Validation**
   - Compare WebhookLog entries from both endpoints
   - Verify order creation consistency
   - Check retry mechanisms

### Phase 3: Migration (Cutover)
**Duration**: 1 day

1. **Switch Careem Webhook URL**
   - Update Careem dashboard with new webhook URL
   - Monitor for successful webhook reception

2. **Deprecate Old Endpoint**
   - Mark old controller as `@Deprecated()`
   - Add warning logs for any requests to old endpoint
   - Keep active for 30 days as safety net

3. **Remove Legacy Module**
   - After 30 days of successful operation
   - Remove `modules/delivery-webhooks/` entirely
   - Clean up old imports from `app.module.ts`

### Phase 4: Enhancement
**Duration**: Ongoing

1. **Add Advanced Features**
   - Webhook retry dashboard
   - Real-time webhook status monitoring
   - Signature rotation mechanism
   - Rate limiting per provider

2. **Documentation**
   - Update Careem integration guide
   - Create webhook troubleshooting guide
   - Document signature validation process

---

## Data Flow Diagram (Text Format)

```
═══════════════════════════════════════════════════════════════════════════
                    CAREEM WEBHOOK DATA FLOW
═══════════════════════════════════════════════════════════════════════════

┌─────────────────┐
│  Careem API     │  Order created on Careem platform
└────────┬────────┘
         │
         │ POST /api/v1/integrations/webhooks/careem/{companyId}/{branchId}
         │ Headers: { x-careem-signature: "..." }
         │ Body: { order_id, customer, items, total, ... }
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK CONTROLLER LAYER                             │
│  - Endpoint routing                                                     │
│  - Provider validation                                                  │
│  - Request logging                                                      │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ├─────► [Webhook Validation Service]
         │       ├── Load BranchDeliveryConfig (webhookSecret)
         │       ├── Calculate HMAC-SHA256(payload, secret)
         │       └── Compare signatures (timing-safe)
         │
         ├─────► [Create WebhookLog Entry]
         │       └── status: 'received'
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  WEBHOOK PROCESSOR SERVICE                              │
│  - Provider-specific routing                                            │
│  - Payload normalization                                                │
│  - Event emission                                                       │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ├─────► processCareemEvent(event)
         │       ├── Route by event type (order.created, order.updated, etc.)
         │       ├── Normalize payload:
         │       │   {
         │       │     externalOrderId: payload.order_id,
         │       │     customerName: payload.customer.name,
         │       │     customerPhone: payload.customer.phone,
         │       │     items: payload.items.map(...),
         │       │     totalAmount: payload.total
         │       │   }
         │       └── Return normalized data
         │
         ├─────► Emit Domain Event
         │       └── eventEmitter.emitAsync('integration.order.created', {...})
         │
         ├─────► [Update WebhookLog]
         │       └── status: 'processing'
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               INTEGRATION ORDER SERVICE                                 │
│  - Event listener: @OnEvent('integration.order.created')                │
│  - Order creation orchestration                                         │
│  - Transaction management                                               │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ├─────► [Find or Create Customer]
         │       └── prisma.customer.upsert({ where: { phone }, data: {...} })
         │
         ├─────► [Validate Branch Access]
         │       └── Ensure branch belongs to company
         │
         ├─────► [Get Provider]
         │       └── prisma.deliveryProvider.findUnique({ where: { code: 'careem' } })
         │
         ├─────► [Create Order]
         │       └── prisma.order.create({
         │             orderNumber: 'CAREEM-...',
         │             branchId, customerId,
         │             status: 'pending',
         │             totalAmount, deliveryFee, ...
         │           })
         │
         ├─────► [Create Order Items]
         │       └── for each item: prisma.orderItem.create({
         │             orderId, productId, quantity, price, ...
         │           })
         │
         ├─────► [Create ProviderOrderLog]
         │       └── prisma.providerOrderLog.create({
         │             orderId, providerId, externalOrderId,
         │             providerStatus: 'received',
         │             rawData: originalPayload
         │           })
         │
         ├─────► [Update WebhookLog]
         │       └── status: 'completed', internalOrderId, processingTime
         │
         └─────► [Emit Downstream Events]
                 ├── eventEmitter.emit('order.created') → Print Service
                 ├── eventEmitter.emit('order.created') → Notification Service
                 └── eventEmitter.emit('order.created') → Analytics Service


         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  DOWNSTREAM SERVICES                                    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ├─────► [Print Service]
         │       └── Auto-print kitchen order (if autoPrintOnReceive = true)
         │
         ├─────► [Notification Service]
         │       └── Send notifications to branch staff
         │
         └─────► [Analytics Service]
                 └── Update delivery provider analytics


═══════════════════════════════════════════════════════════════════════════
                         ERROR HANDLING FLOW
═══════════════════════════════════════════════════════════════════════════

[Any Step Fails]
         │
         ├─────► [Update WebhookLog]
         │       └── status: 'failed', errorMessage, errorStack
         │
         ├─────► [Webhook Retry Service]
         │       ├── Check retry count < MAX_RETRIES (10)
         │       ├── Calculate next retry delay (exponential backoff)
         │       ├── Update: status: 'retrying', nextRetryAt
         │       └── Schedule retry with delay
         │
         └─────► [Dead Letter Queue] (if retries exhausted)
                 ├── Log critical alert
                 ├── Send notification to ops team
                 └── Store for manual review
```

---

## Integration Points with Existing Systems

### 1. Print Service Integration
```typescript
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  const branchConfig = await this.getBranchDeliveryConfig(event.branchId, event.providerId);

  if (branchConfig.autoPrintOnReceive) {
    await this.printService.printKitchenOrder({
      orderId: event.orderId,
      branchId: event.branchId,
      printerType: 'kitchen',
    });
  }
}
```

### 2. Notification Service Integration
```typescript
@OnEvent('order.created')
async notifyBranchStaff(event: OrderCreatedEvent) {
  // WebSocket notification to branch dashboard
  await this.websocketGateway.emit(`branch:${event.branchId}:new_order`, {
    orderNumber: event.orderNumber,
    provider: event.provider,
    totalAmount: event.totalAmount,
  });

  // SMS notification (optional)
  if (this.shouldSendSMS(event.branchId)) {
    await this.smsService.send({
      to: branchPhoneNumber,
      message: `New ${event.provider} order: ${event.orderNumber}`,
    });
  }
}
```

### 3. Analytics Service Integration
```typescript
@OnEvent('order.created')
async updateAnalytics(event: OrderCreatedEvent) {
  await this.prisma.deliveryProviderAnalytics.upsert({
    where: {
      companyId_providerType_date: {
        companyId: event.companyId,
        providerType: event.provider,
        date: new Date(),
      },
    },
    update: {
      totalOrders: { increment: 1 },
      totalRevenue: { increment: event.totalAmount },
    },
    create: {
      companyId: event.companyId,
      providerType: event.provider,
      date: new Date(),
      totalOrders: 1,
      totalRevenue: event.totalAmount,
    },
  });
}
```

---

## Security Considerations

### 1. Signature Validation
```typescript
async validateSignature(
  provider: string,
  companyId: string,
  branchId: string,
  payload: any,
  headers: any,
): Promise<void> {
  // Load webhook secret from BranchDeliveryConfig
  const config = await this.prisma.branchDeliveryConfig.findUnique({
    where: {
      branchId_providerId: { branchId, providerId: provider },
    },
  });

  if (!config || !config.webhookSecret) {
    throw new UnauthorizedException('Webhook secret not configured');
  }

  const signature = headers['x-careem-signature'] || headers['x-webhook-signature'];
  if (!signature) {
    throw new UnauthorizedException('Missing webhook signature');
  }

  // Calculate expected signature
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', config.webhookSecret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  // Timing-safe comparison
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
}
```

### 2. Rate Limiting
```typescript
@Injectable()
export class WebhookRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const provider = request.params.provider;
    const companyId = request.params.companyId;

    const config = await this.getProviderConfig(provider);
    const rateLimitKey = `webhook:${provider}:${companyId}`;

    const requestCount = await this.redis.incr(rateLimitKey);
    if (requestCount === 1) {
      await this.redis.expire(rateLimitKey, 60); // 1 minute window
    }

    if (requestCount > config.rateLimitPerMinute) {
      throw new ThrottlerException('Rate limit exceeded');
    }

    return true;
  }
}
```

### 3. IP Whitelisting (Optional)
```typescript
const CAREEM_IP_WHITELIST = [
  '52.36.12.34',   // Careem production IPs
  '52.36.56.78',
  '127.0.0.1',     // Local development
];

async validateIpAddress(ipAddress: string, provider: string): Promise<void> {
  const whitelist = this.getProviderIpWhitelist(provider);

  if (whitelist.length > 0 && !whitelist.includes(ipAddress)) {
    throw new ForbiddenException(`IP ${ipAddress} not whitelisted for ${provider}`);
  }
}
```

---

## Monitoring & Observability

### 1. Metrics to Track
```typescript
// Webhook processing metrics
webhook_received_total{provider="careem"}
webhook_processed_total{provider="careem", status="completed|failed"}
webhook_processing_duration_ms{provider="careem", percentile="p50|p95|p99"}
webhook_retry_count{provider="careem"}
webhook_signature_validation_failures{provider="careem"}

// Order creation metrics
orders_created_total{provider="careem", branch_id="..."}
order_creation_duration_ms{provider="careem"}
order_creation_failures{provider="careem", reason="..."}

// System health
webhook_queue_depth{provider="careem"}
webhook_dead_letter_queue_count{provider="careem"}
```

### 2. Logging Strategy
```typescript
// Structured logging with correlation IDs
this.logger.log({
  message: 'Processing Careem webhook',
  correlationId: event.correlationId,
  provider: 'careem',
  eventType: event.eventType,
  companyId: event.companyId,
  branchId: event.branchId,
  externalOrderId: event.payload.order_id,
  processingStartTime: new Date(),
});

// Error logging with full context
this.logger.error({
  message: 'Webhook processing failed',
  correlationId: event.correlationId,
  error: error.message,
  stack: error.stack,
  payload: event.payload, // Only in development
  retryCount: event.retryCount,
});
```

### 3. Alerting Rules
```yaml
alerts:
  - name: WebhookHighFailureRate
    condition: webhook_processed_total{status="failed"} / webhook_received_total > 0.05
    severity: warning
    message: "Careem webhook failure rate > 5%"

  - name: WebhookProcessingSlowdown
    condition: webhook_processing_duration_ms{percentile="p95"} > 5000
    severity: warning
    message: "Careem webhook p95 latency > 5s"

  - name: WebhookDeadLetterQueue
    condition: webhook_dead_letter_queue_count > 10
    severity: critical
    message: "Careem webhooks in dead letter queue"
```

---

## Testing Strategy

### 1. Unit Tests
```typescript
describe('WebhookProcessorService - Careem', () => {
  it('should normalize Careem payload correctly', () => {
    const careemPayload = {
      order_id: 'CAR-12345',
      customer: { name: 'John Doe', phone: '+971501234567' },
      items: [{ id: 'item-1', name: 'Burger', quantity: 2, price: 25.00 }],
      total: 50.00,
    };

    const normalized = service.normalizeOrderData('careem', careemPayload);

    expect(normalized.externalOrderId).toBe('CAR-12345');
    expect(normalized.customerName).toBe('John Doe');
    expect(normalized.items).toHaveLength(1);
  });

  it('should validate Careem signature correctly', async () => {
    const payload = { order_id: 'test' };
    const secret = 'test-secret';
    const signature = calculateHMAC(payload, secret);

    await expect(
      service.validateSignature('careem', companyId, branchId, payload, { 'x-careem-signature': signature })
    ).resolves.not.toThrow();
  });
});
```

### 2. Integration Tests
```typescript
describe('Careem Webhook Integration', () => {
  it('should create order from Careem webhook', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/webhooks/careem/company-123/branch-456')
      .set('x-careem-signature', validSignature)
      .send(mockCareemPayload)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify order was created
    const order = await prisma.order.findUnique({
      where: { orderNumber: response.body.orderNumber },
    });
    expect(order).toBeDefined();
    expect(order.deliveryProviderId).toBe(careemProviderId);
  });

  it('should retry failed webhook processing', async () => {
    // Simulate processing failure
    jest.spyOn(orderService, 'createOrder').mockRejectedValueOnce(new Error('DB error'));

    await service.processWebhook(event);

    // Verify retry was queued
    const log = await prisma.webhookLog.findFirst({
      where: { status: 'retrying' },
    });
    expect(log.retryCount).toBe(1);
    expect(log.nextRetryAt).toBeDefined();
  });
});
```

### 3. E2E Tests
```typescript
describe('Careem Webhook E2E', () => {
  it('should process webhook end-to-end', async () => {
    // Send webhook
    const response = await sendCareemWebhook(mockPayload);
    expect(response.status).toBe(200);

    // Wait for processing
    await waitFor(() => webhookProcessed(response.body.logId));

    // Verify order exists
    const order = await getOrder(response.body.orderNumber);
    expect(order.status).toBe('pending');

    // Verify print job created
    const printJob = await getPrintJob(order.id);
    expect(printJob).toBeDefined();

    // Verify analytics updated
    const analytics = await getAnalytics('careem', today);
    expect(analytics.totalOrders).toBeGreaterThan(0);
  });
});
```

---

## Performance Optimization

### 1. Database Query Optimization
```typescript
// Use select to reduce payload size
const config = await prisma.branchDeliveryConfig.findUnique({
  where: { branchId_providerId: { branchId, providerId } },
  select: {
    webhookSecret: true,
    isActive: true,
    autoAcceptOrders: true,
    autoPrintOnReceive: true,
  },
});

// Use batch queries
const [provider, customer, branch] = await Promise.all([
  prisma.deliveryProvider.findUnique({ where: { code: 'careem' } }),
  prisma.customer.findFirst({ where: { phone: customerPhone } }),
  prisma.branch.findUnique({ where: { id: branchId } }),
]);
```

### 2. Caching Strategy
```typescript
// Cache provider configuration (changes rarely)
@Injectable()
export class ProviderConfigCache {
  private cache = new Map<string, DeliveryProvider>();

  async getProvider(code: string): Promise<DeliveryProvider> {
    if (this.cache.has(code)) {
      return this.cache.get(code);
    }

    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { code },
    });

    this.cache.set(code, provider);
    return provider;
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async refreshCache() {
    this.cache.clear();
  }
}
```

### 3. Async Processing
```typescript
// Offload heavy processing to background jobs
@Injectable()
export class WebhookProcessor {
  async processWebhook(event: WebhookEvent): Promise<void> {
    // Quick synchronous validation
    await this.validateSignature(event);
    await this.createWebhookLog(event);

    // Offload to background queue
    await this.queueService.add('webhook-processing', {
      eventId: event.id,
      payload: event.payload,
    }, {
      priority: event.provider === 'careem' ? 1 : 2,
    });

    // Return immediately to Careem
    return { success: true, queued: true };
  }
}
```

---

## Recommended Next Steps

### Immediate Actions (Week 1)
1. ✅ Review this architecture document with team
2. ✅ Create migration ticket with phase breakdown
3. ✅ Set up development environment for integration domain testing
4. ✅ Create Careem payload test fixtures

### Short Term (Weeks 2-3)
1. Implement Careem event handlers in integration domain
2. Complete order creation service implementation
3. Add signature validation for Careem
4. Deploy to staging and configure dual endpoints

### Medium Term (Month 1)
1. Production deployment with dual operation
2. Monitor webhook processing for 2 weeks
3. Cutover to new endpoint
4. Deprecate old endpoint

### Long Term (Months 2-3)
1. Add other providers (Talabat, Deliveroo) to integration domain
2. Implement webhook retry dashboard
3. Add comprehensive monitoring and alerting
4. Documentation and runbook creation

---

## Conclusion

The recommended architecture provides:

✅ **Unified Webhook Processing**: Single integration domain for all delivery providers
✅ **Enterprise-Grade Error Handling**: Exponential backoff retry with dead letter queue
✅ **Event-Driven Architecture**: Decoupled services with domain events
✅ **Comprehensive Logging**: Full audit trail with correlation IDs
✅ **Security**: Signature validation, rate limiting, IP whitelisting
✅ **Observability**: Metrics, logging, alerting
✅ **Scalability**: Async processing, caching, optimized queries
✅ **Maintainability**: Service layer abstraction, DDD principles, clear separation of concerns

**Migration Risk**: **Low** - Dual operation period ensures zero downtime and easy rollback.

**Estimated Effort**: **2-3 weeks** for complete migration and stabilization.

**Business Impact**: **High** - Improved reliability, better error handling, foundation for multi-provider integrations.

---

**Document Version**: 1.0
**Last Updated**: October 1, 2025
**Approval Required**: Engineering Lead, Product Owner
