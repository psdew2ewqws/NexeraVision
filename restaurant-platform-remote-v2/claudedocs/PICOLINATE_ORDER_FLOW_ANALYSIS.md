# Picolinate Order Flow Analysis

**Analyzed by:** Root Cause Analyst
**Date:** 2025-10-01
**Purpose:** Reverse engineer Picolinate's order receiving and processing mechanisms for Restaurant Platform v2 implementation

---

## Executive Summary

Picolinate implements a **webhook-based order reception architecture** with sophisticated multi-provider integration. The system receives orders from 8+ delivery providers (Talabat, Careem, Yallow, Nashmi, Dhub, Top, Jood, Tawasi) through webhooks, transforms them into a unified internal format, processes business logic, and triggers automated printing.

**Key Findings:**
- **Reception Method:** WEBHOOKS (primary), no polling detected
- **Architecture:** Microservices (OrderingS, Services, Integration Middleware, Menu Integration)
- **Databases:** Dual database strategy (postgres: 72 tables, delivery_integration_platform: 9 tables)
- **Error Handling:** Robust retry mechanism with audit trails
- **Printing:** Automated print job queue system

---

## System Architecture

### Service Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Delivery Providers                       │
│  Talabat │ Careem │ Yallow │ Nashmi │ Dhub │ Top │ Jood   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS Webhooks
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Integration Middleware (Laravel)                     │
│         https://integration.ishbek.com                      │
│  - Webhook receiver & validator                             │
│  - Provider-specific format transformation                  │
│  - Branch-based routing                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ Internal API (XAUTH)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            OrderingS Service (ASP.NET Core)                 │
│            OrderingAPI.dll                                  │
│  - Order validation & processing                            │
│  - Business rules engine                                    │
│  - Provider order management                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────────┐        ┌─────────────────────┐
│ Services         │        │  Database Layer     │
│ (Company Mgmt)   │◄──────►│  - postgres (72)    │
│ CompanyMgmt.dll  │        │  - delivery_int (9) │
└────────┬─────────┘        └─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Printer Service                  │
│  - Auto/Manual print modes              │
│  - Print job queue                      │
│  - Template rendering                   │
└─────────────────────────────────────────┘
```

### Database Architecture

**Primary Database: `postgres` (72 tables)**

Key order-related tables:
- `orders` - Main order records (30 columns)
- `order_items` - Line items with modifiers
- `careem_orders` - Careem-specific data
- `careem_webhook_events` - Webhook audit trail
- `delivery_provider_orders` - Provider order tracking
- `delivery_error_logs` - Error tracking
- `provider_order_logs` - Communication audit
- `print_jobs` - Print queue
- `printers` - Registered printers
- `print_templates` - Receipt templates

**Integration Database: `delivery_integration_platform` (9 tables)**
- `delivery_orders` - Integration layer orders (21 columns)
- `webhook_logs` - All webhook events (13 columns)
- `integration_configs` - Provider configurations
- `menu_mappings` - Product mappings
- `sync_status` - Synchronization state

---

## Order Flow: Complete Pipeline

### Phase 1: Order Reception (Webhook-Based)

**Webhook Endpoint Pattern:**
```
https://integration.ishbek.com/{Provider}/webhook
├── /Talabat/webhook
├── /CareemNow/Api/webhook
├── /Yallow/Api/webhook
├── /Nashmi/Nashmi/webhook
├── /Dhub/webhook
├── /TopDelivery/Api/webhook
├── /JoodDelivery/Api/webhook
└── /Tawasi/Api/webhook
```

**Reception Flow:**
1. Customer places order on delivery platform
2. Provider sends HTTPS POST webhook to integration endpoint
3. Integration Middleware (Laravel) receives webhook
4. Webhook immediately persisted to `webhook_logs` table:
   ```sql
   INSERT INTO webhook_logs (
     platform,      -- TALABAT | CAREEM | YALLOW | etc.
     eventType,     -- order.created | order.updated | order.cancelled
     payload,       -- JSONB: raw provider data
     headers,       -- JSONB: HTTP headers including signature
     isProcessed,   -- false (initially)
     retryCount,    -- 0
     createdAt      -- current timestamp
   )
   ```
5. Signature/authentication validated (e.g., Careem signature field)

**Security:**
- XAUTH Token: `gRR5Hgh37gNxGwh7ObQ51plUW` (internal service auth)
- JWT Bearer tokens for API authentication
- Webhook signature verification (provider-specific)

---

### Phase 2: Order Transformation

**Provider Format → Internal Format Mapping**

**Input (webhook_logs.payload):**
```json
{
  "platform": "TALABAT",
  "platformOrderId": "TLB-12345",
  "orderNumber": "ORD-789",
  "customer": {
    "name": "John Doe",
    "phone": "+962791234567",
    "email": "john@example.com"
  },
  "deliveryAddress": {
    "address": "123 Main St, Amman",
    "lat": 31.9539,
    "lng": 35.9106
  },
  "items": [
    {
      "productId": "PROD-001",
      "name": "Burger",
      "quantity": 2,
      "price": 5.00,
      "modifiers": [...]
    }
  ],
  "totalAmount": 12.50,
  "deliveryFee": 1.50,
  "scheduledDeliveryAt": "2025-10-01T14:00:00Z"
}
```

**Transformation Logic:**
1. **Platform Detection:** Extract `platform` field from payload
2. **Branch Identification:**
   - Match `deliveryAddress.lat/lng` to `delivery_zones`
   - Lookup `branch_id` from `branches` table
   - Validate branch is active and accepting orders
3. **Customer Normalization:**
   - Phone number formatting (standardize to E.164)
   - Email validation
   - Customer lookup/creation in system
4. **Product Mapping:**
   - Map `platformOrderId` to internal product IDs via `menu_mappings`
   - Handle provider-specific product variations
   - Process modifiers through `modifier_categories`
5. **Pricing Calculation:**
   - Extract subtotal from items
   - Apply tax from `taxes` and `taxable_products` tables
   - Validate delivery_fee matches expected zone pricing
   - Calculate final `total_amount`
6. **Delivery Provider Lookup:**
   - Match platform to `delivery_providers` table
   - Get `delivery_provider_id` for tracking

**Output (delivery_orders table):**
```sql
INSERT INTO delivery_orders (
  platform,              -- TALABAT
  platformOrderId,       -- TLB-12345
  orderNumber,           -- Internal: ORD-20251001-001
  status,                -- PENDING
  totalAmount,           -- 12.50
  currency,              -- JOD
  customerName,          -- John Doe
  customerPhone,         -- +962791234567
  deliveryAddress,       -- 123 Main St, Amman
  orderItems,            -- JSONB array
  platformData,          -- JSONB: original payload preserved
  scheduledDeliveryAt,   -- 2025-10-01T14:00:00Z
  companyId,             -- Company UUID
  integrationConfigId    -- Integration config UUID
)
```

---

### Phase 3: Order Validation & Processing

**Validation Rules (OrderingS Service):**

1. **Branch Validation:**
   ```
   - Branch exists and is active
   - Branch accepts delivery orders
   - Branch is within operating hours
   - Branch has capacity for new orders
   ```

2. **Delivery Zone Validation:**
   ```
   - Address coordinates within branch delivery zones
   - Delivery zone is active
   - Zone delivery fee matches provider fee
   ```

3. **Product Availability:**
   ```
   - All products exist in menu_products
   - Products are currently available (not out of stock)
   - Modifiers are valid for selected products
   - Pricing matches current menu prices
   ```

4. **Customer Validation:**
   ```
   - Phone number is valid and not blacklisted
   - Customer is not blocked (check blocked_customers)
   - Address is deliverable
   ```

5. **Financial Validation:**
   ```
   - Subtotal calculation correct
   - Tax calculation matches tax rules
   - Delivery fee within acceptable range
   - Total amount matches sum of components
   ```

**Processing Steps:**

1. **Create Main Order Record:**
   ```sql
   INSERT INTO orders (
     id,                      -- UUID
     order_number,            -- Sequential: ORD-20251001-001
     branch_id,               -- From zone lookup
     delivery_zone_id,        -- Matched zone
     delivery_provider_id,    -- Provider UUID
     customer_name,           -- Normalized
     customer_phone,          -- E.164 format
     customer_email,          -- Validated
     delivery_address,        -- Full address string
     delivery_lat,            -- Decimal coordinates
     delivery_lng,            -- Decimal coordinates
     order_type,              -- DELIVERY
     status,                  -- PENDING
     subtotal,                -- Pre-tax amount
     delivery_fee,            -- Zone fee
     tax_amount,              -- Calculated tax
     total_amount,            -- Final amount
     payment_method,          -- CASH | CARD | ONLINE
     payment_status,          -- PENDING
     estimated_delivery_time, -- From provider
     provider_order_id,       -- Platform order ID
     provider_tracking_url,   -- Tracking link
     driver_info,             -- JSONB: driver details
     notes,                   -- Customer notes
     created_at,              -- Current timestamp
     updated_at               -- Current timestamp
   )
   ```

2. **Create Order Items:**
   ```sql
   INSERT INTO order_items (
     order_id,
     product_id,
     product_name,
     quantity,
     unit_price,
     modifiers,     -- JSONB: selected modifiers
     total_price,
     notes
   )
   ```

3. **Update Provider Order Tracking:**
   ```sql
   INSERT INTO delivery_provider_orders (
     order_id,
     provider_id,
     provider_order_id,
     provider_status,
     last_sync_at
   )
   ```

4. **Create Analytics Record:**
   ```sql
   INSERT INTO delivery_provider_analytics (
     provider_id,
     branch_id,
     order_count,
     total_revenue,
     date
   )
   ```

---

### Phase 4: Order Acceptance/Rejection

**Restaurant Notification:**
- Real-time notification sent to restaurant dashboard (likely WebSocket)
- Mobile app push notification (if configured)
- Optional SMS/WhatsApp notification to branch manager

**Acceptance Flow:**
```
1. Restaurant accepts order
2. Status: PENDING → ACCEPTED
3. Update orders table:
   UPDATE orders
   SET status = 'ACCEPTED',
       updated_at = NOW()
   WHERE id = :order_id

4. Notify provider via callback:
   POST https://integration.ishbek.com/Talabat/AcceptOrder
   Headers: XAUTH: gRR5Hgh37gNxGwh7ObQ51plUW
   Body: {
     "orderId": "TLB-12345",
     "branchId": "branch-uuid",
     "acceptedAt": "2025-10-01T13:05:00Z",
     "estimatedPreparationTime": 20
   }

5. Trigger printing (see Phase 5)
```

**Rejection Flow:**
```
1. Restaurant rejects order
2. Status: PENDING → REJECTED
3. Update orders table:
   UPDATE orders
   SET status = 'REJECTED',
       cancelled_at = NOW(),
       cancellation_reason = :reason
   WHERE id = :order_id

4. Notify provider:
   POST https://integration.ishbek.com/Talabat/RejectOrder
   Body: {
     "orderId": "TLB-12345",
     "reason": "Out of stock",
     "rejectedAt": "2025-10-01T13:05:00Z"
   }

5. Log rejection in provider_order_logs
```

**Provider Callback Endpoints:**
- **Talabat:** `AcceptOrder`, `MarkOrderAsPrepared`
- **Careem:** `UpdateOrderStatus`, `MarkCareemFoodAsReady`
- **Careem Express:** `checkOrderEstimations`, `cancelOrder`
- **Nashmi:** `createOrder`, `orderCancellation`
- **Dhub:** `createTask`, `checkMerchantTask`
- **Top/Jood:** `createOrder`, `checkOrderStatus`, `cancelOrder`

---

### Phase 5: Automated Printing

**Print Service Configuration:**
```json
{
  "PrinterService": {
    "URL": "api/Printer/",
    "CreateAutoPrinter": "AutoPrint",
    "CreateManualPrinter": "ManualPrint",
    "UpdatePrintingOrder": "UpdatePrintingOrder"
  },
  "CompanyService": {
    "CreateOrderPrint": "Printer/CreateOrderPrint"
  }
}
```

**Printing Flow:**

1. **Trigger on Acceptance:**
   ```
   When order status → ACCEPTED:
   POST /api/Printer/CreateOrderPrint
   Body: {
     "orderId": "order-uuid",
     "branchId": "branch-uuid",
     "printMode": "AUTO"
   }
   ```

2. **Create Print Job:**
   ```sql
   INSERT INTO print_jobs (
     id,
     order_id,
     printer_id,           -- From printer_configurations
     template_id,          -- From print_templates
     status,               -- QUEUED
     priority,             -- 1-10 (orders: high priority)
     print_data,           -- JSONB: formatted order data
     retry_count,          -- 0
     created_at
   )
   ```

3. **Print Job Processing:**
   ```
   Printer Agent (local software):
   ├── Polls: GET /api/Printer/GetPendingJobs?printerId=:id
   │   OR
   ├── WebSocket: wss://printer.ishbek.com/jobs
   │
   ├── Receives job with template + data
   ├── Renders template with order details:
   │   - Order number
   │   - Customer info
   │   - Items with modifiers
   │   - Pricing breakdown
   │   - Delivery address
   │   - Preparation instructions
   │
   ├── Sends to ESC/POS printer
   └── Updates job status
   ```

4. **Print Job Completion:**
   ```sql
   UPDATE print_jobs
   SET status = 'COMPLETED',
       completed_at = NOW(),
       updated_at = NOW()
   WHERE id = :job_id

   -- Call callback
   POST /api/Printer/UpdatePrintingOrder
   Body: {
     "jobId": "job-uuid",
     "status": "COMPLETED",
     "completedAt": "2025-10-01T13:06:00Z"
   }
   ```

5. **Print Failure Handling:**
   ```sql
   -- On printer error
   UPDATE print_jobs
   SET status = 'FAILED',
       retry_count = retry_count + 1,
       error_message = :error,
       next_retry_at = NOW() + INTERVAL '5 minutes'
   WHERE id = :job_id

   -- Manual print option available if auto-print fails
   POST /api/Printer/ManualPrint
   ```

**Printer Database Schema:**
- `printers` - Registered ESC/POS printers per branch
- `printer_configurations` - Settings (paper size, encoding, etc.)
- `printer_sessions` - Active printer connections
- `print_templates` - Receipt layouts (header, body, footer)
- `print_jobs` - Job queue with status tracking
- `printer_licenses` - License management
- `printer_discovery_events` - Auto-discovery logs

**Physical Files:**
- `/services/app/wwwroot/print/Release/printerLog.txt` - Printer agent logs
- `/services/app/wwwroot/print/Release/successJobs.txt` - Successful prints

---

### Phase 6: Order Fulfillment

**Status Progression:**
```
PENDING → ACCEPTED → PREPARING → READY →
OUT_FOR_DELIVERY → DELIVERED
```

**Status Updates:**

1. **PREPARING (Kitchen):**
   ```sql
   UPDATE orders
   SET status = 'PREPARING',
       updated_at = NOW()
   WHERE id = :order_id
   ```

2. **READY (For Pickup):**
   ```sql
   UPDATE orders
   SET status = 'READY',
       updated_at = NOW()
   WHERE id = :order_id

   -- Notify provider
   POST https://integration.ishbek.com/Careem/MarkFoodAsReady
   Body: {
     "orderId": "CAREEM-12345",
     "readyAt": "2025-10-01T13:25:00Z"
   }
   ```

3. **OUT_FOR_DELIVERY (Driver Assigned):**
   ```sql
   -- Provider webhook received
   UPDATE orders
   SET status = 'OUT_FOR_DELIVERY',
       driver_info = :driver_data,  -- JSONB: {name, phone, vehicle}
       updated_at = NOW()
   WHERE provider_order_id = :provider_order_id
   ```

4. **DELIVERED:**
   ```sql
   UPDATE orders
   SET status = 'DELIVERED',
       actual_delivery_time = :delivered_at,
       delivered_at = :delivered_at,
       payment_status = 'COMPLETED',
       updated_at = NOW()
   WHERE id = :order_id

   -- Update analytics
   UPDATE delivery_provider_analytics
   SET successful_deliveries = successful_deliveries + 1
   ```

---

## Error Handling & Retry Mechanisms

### Webhook Processing Errors

**Error Storage:**
```sql
-- When webhook processing fails
UPDATE webhook_logs
SET isProcessed = false,
    errorMessage = :error,
    retryCount = retryCount + 1,
    statusCode = :status_code,
    response = :response_data
WHERE id = :webhook_id
```

**Retry Strategy:**
```
Retry Schedule:
├── Attempt 1: Immediate
├── Attempt 2: After 30 seconds
├── Attempt 3: After 2 minutes
├── Attempt 4: After 10 minutes
├── Attempt 5: After 30 minutes
└── Attempt 6+: After 1 hour (max 10 attempts)

After max retries:
└── Move to dead letter queue
    └── Manual review required
```

**Background Worker:**
```csharp
// Pseudocode based on architecture
BackgroundService.ProcessFailedWebhooks()
{
  while (true)
  {
    // Get failed webhooks ready for retry
    var failedWebhooks = await db.webhook_logs
      .Where(w => !w.isProcessed &&
                   w.retryCount < MAX_RETRIES &&
                   w.createdAt > NOW() - INTERVAL '24 hours')
      .OrderBy(w => w.createdAt)
      .Take(100)
      .ToListAsync();

    foreach (var webhook in failedWebhooks)
    {
      try
      {
        await ProcessWebhook(webhook);
        webhook.isProcessed = true;
        webhook.processedAt = DateTime.UtcNow;
      }
      catch (Exception ex)
      {
        webhook.retryCount++;
        webhook.errorMessage = ex.Message;
        await LogError(webhook, ex);
      }

      await db.SaveChangesAsync();
    }

    await Task.Delay(TimeSpan.FromSeconds(30));
  }
}
```

### Provider Communication Errors

**Delivery Error Logging:**
```sql
-- When provider API call fails
INSERT INTO delivery_error_logs (
  provider_id,
  order_id,
  error_type,          -- WEBHOOK_FAILED | API_CALL_FAILED | TIMEOUT
  error_message,
  request_payload,
  response_payload,
  http_status_code,
  retry_count,
  created_at
)
```

**Provider Order Audit Trail:**
```sql
-- Log all provider interactions
INSERT INTO provider_order_logs (
  order_id,
  provider_id,
  action,              -- ACCEPT | REJECT | STATUS_UPDATE | CANCEL
  request_data,        -- JSONB
  response_data,       -- JSONB
  status_code,
  duration_ms,
  created_at
)
```

### Error Notification

**Alert Triggers:**
```
High Priority Alerts:
├── Webhook processing failure rate > 5%
├── Individual webhook retry count > 3
├── Print job failure rate > 10%
├── Provider API timeout > 5 seconds
└── Order acceptance rate < 85%

Notification Channels:
├── System dashboard alert
├── Email to branch manager
├── SMS to operations team
└── Slack/Teams integration (if configured)
```

---

## Data Validation Rules

### Customer Data Validation

```typescript
// Phone Number Validation
validatePhone(phone: string): boolean {
  // E.164 format: +[country][number]
  const phoneRegex = /^\+\d{10,15}$/;

  if (!phoneRegex.test(phone)) {
    throw new ValidationError("Invalid phone format");
  }

  // Check blacklist
  const isBlacklisted = await checkBlacklist(phone);
  if (isBlacklisted) {
    throw new ValidationError("Customer is blacklisted");
  }

  return true;
}

// Email Validation
validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Address Validation
validateAddress(lat: number, lng: number, branchId: string): boolean {
  // Check if coordinates within delivery zones
  const zones = await getDeliveryZones(branchId);

  for (const zone of zones) {
    if (isPointInPolygon(lat, lng, zone.polygon)) {
      return true;
    }
  }

  throw new ValidationError("Address outside delivery zones");
}
```

### Product Validation

```typescript
// Product Availability
validateProducts(items: OrderItem[]): boolean {
  for (const item of items) {
    // Check product exists
    const product = await db.menu_products
      .where({ id: item.productId, isActive: true })
      .first();

    if (!product) {
      throw new ValidationError(`Product ${item.productId} not found`);
    }

    // Check stock (if tracked)
    if (product.trackStock && product.stock < item.quantity) {
      throw new ValidationError(`Insufficient stock for ${product.name}`);
    }

    // Validate modifiers
    for (const modifier of item.modifiers) {
      const validModifier = await db.modifiers
        .where({
          id: modifier.id,
          isActive: true
        })
        .join('product_modifier_categories', ...)
        .where({ productId: item.productId })
        .first();

      if (!validModifier) {
        throw new ValidationError(`Invalid modifier ${modifier.id}`);
      }
    }
  }

  return true;
}
```

### Financial Validation

```typescript
// Price Validation
validatePricing(order: Order): boolean {
  // Validate subtotal
  const calculatedSubtotal = order.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const modifierTotal = item.modifiers.reduce(
      (mSum, m) => mSum + m.price, 0
    );
    return sum + itemTotal + modifierTotal;
  }, 0);

  if (Math.abs(calculatedSubtotal - order.subtotal) > 0.01) {
    throw new ValidationError("Subtotal mismatch");
  }

  // Validate tax
  const taxRate = await getTaxRate(order.branchId);
  const calculatedTax = calculatedSubtotal * taxRate;

  if (Math.abs(calculatedTax - order.taxAmount) > 0.01) {
    throw new ValidationError("Tax calculation error");
  }

  // Validate delivery fee
  const expectedFee = await getDeliveryFee(
    order.branchId,
    order.deliveryZoneId
  );

  if (Math.abs(expectedFee - order.deliveryFee) > 0.01) {
    throw new ValidationError("Delivery fee mismatch");
  }

  // Validate total
  const calculatedTotal = calculatedSubtotal +
                          order.taxAmount +
                          order.deliveryFee;

  if (Math.abs(calculatedTotal - order.totalAmount) > 0.01) {
    throw new ValidationError("Total amount mismatch");
  }

  return true;
}
```

---

## Implementation Recommendations for Restaurant Platform v2

### 1. Webhook Infrastructure

**Recommendation:** Implement webhook-first architecture with polling as fallback

```typescript
// Webhook endpoint structure
POST /api/webhooks/:provider
├── /api/webhooks/talabat
├── /api/webhooks/careem
├── /api/webhooks/yallow
└── etc.

// Webhook processing flow
class WebhookController {
  async handleWebhook(provider: string, payload: any, headers: any) {
    // 1. Immediately persist webhook
    const webhookLog = await this.webhookService.logWebhook({
      provider,
      eventType: payload.eventType,
      payload,
      headers,
      receivedAt: new Date()
    });

    // 2. Validate signature
    const isValid = await this.validateSignature(
      provider,
      payload,
      headers
    );

    if (!isValid) {
      return { status: 401, message: "Invalid signature" };
    }

    // 3. Process asynchronously (return 200 immediately)
    this.queue.add('process-webhook', { webhookLogId: webhookLog.id });

    return { status: 200, message: "Webhook received" };
  }
}
```

**Database Schema:**
```prisma
model WebhookLog {
  id           String   @id @default(uuid())
  provider     Platform
  eventType    String
  payload      Json
  headers      Json
  isProcessed  Boolean  @default(false)
  errorMessage String?
  retryCount   Int      @default(0)
  statusCode   Int?
  response     Json?
  processedAt  DateTime?
  createdAt    DateTime @default(now())
  companyId    String

  @@index([provider, isProcessed])
  @@index([createdAt])
}
```

### 2. Order Transformation Layer

**Recommendation:** Create provider-specific adapters with unified interface

```typescript
// Provider adapter interface
interface IProviderAdapter {
  validateWebhook(payload: any, signature: string): Promise<boolean>;
  transformOrder(payload: any): Promise<UnifiedOrder>;
  notifyAcceptance(orderId: string): Promise<void>;
  notifyRejection(orderId: string, reason: string): Promise<void>;
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}

// Unified order format
interface UnifiedOrder {
  providerOrderId: string;
  provider: Platform;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  deliveryAddress: {
    address: string;
    lat: number;
    lng: number;
    instructions?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    modifiers: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  pricing: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
  scheduledAt?: Date;
  rawData: any; // Preserve original payload
}

// Example adapter implementation
class TalabatAdapter implements IProviderAdapter {
  async transformOrder(payload: any): Promise<UnifiedOrder> {
    return {
      providerOrderId: payload.order_id,
      provider: 'TALABAT',
      customer: {
        name: payload.customer.name,
        phone: this.normalizePhone(payload.customer.phone),
        email: payload.customer.email
      },
      deliveryAddress: {
        address: payload.delivery.address,
        lat: payload.delivery.latitude,
        lng: payload.delivery.longitude,
        instructions: payload.delivery.notes
      },
      items: payload.items.map(item => ({
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        modifiers: item.options?.map(opt => ({
          id: opt.id,
          name: opt.name,
          price: opt.price
        })) || []
      })),
      pricing: {
        subtotal: payload.pricing.subtotal,
        tax: payload.pricing.tax,
        deliveryFee: payload.pricing.delivery_fee,
        total: payload.pricing.total
      },
      scheduledAt: payload.scheduled_at ?
        new Date(payload.scheduled_at) : undefined,
      rawData: payload
    };
  }
}
```

### 3. Validation Pipeline

**Recommendation:** Implement layered validation with clear error messages

```typescript
class OrderValidationPipeline {
  private validators: OrderValidator[] = [
    new CustomerValidator(),
    new AddressValidator(),
    new ProductValidator(),
    new PricingValidator(),
    new BranchValidator()
  ];

  async validate(order: UnifiedOrder, context: ValidationContext) {
    const errors: ValidationError[] = [];

    for (const validator of this.validators) {
      try {
        await validator.validate(order, context);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);

          // Continue or stop based on error severity
          if (error.severity === 'CRITICAL') {
            throw new OrderValidationFailedException(errors);
          }
        } else {
          throw error;
        }
      }
    }

    if (errors.length > 0) {
      throw new OrderValidationFailedException(errors);
    }

    return true;
  }
}
```

### 4. Error Handling & Retry

**Recommendation:** Implement exponential backoff with dead letter queue

```typescript
// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 10,
  delays: [
    0,           // Immediate
    30 * 1000,   // 30 seconds
    2 * 60000,   // 2 minutes
    10 * 60000,  // 10 minutes
    30 * 60000,  // 30 minutes
    60 * 60000,  // 1 hour
    2 * 3600000, // 2 hours
    4 * 3600000, // 4 hours
    8 * 3600000, // 8 hours
    24 * 3600000 // 24 hours
  ],
  deadLetterQueueAfter: 10
};

// Background worker
class WebhookRetryWorker {
  async processFailedWebhooks() {
    const failedWebhooks = await this.db.webhookLog.findMany({
      where: {
        isProcessed: false,
        retryCount: { lt: RETRY_CONFIG.maxAttempts },
        createdAt: { gt: new Date(Date.now() - 24 * 3600000) }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    for (const webhook of failedWebhooks) {
      const delay = RETRY_CONFIG.delays[webhook.retryCount];
      const shouldRetry = Date.now() - webhook.createdAt.getTime() > delay;

      if (shouldRetry) {
        try {
          await this.processWebhook(webhook);

          await this.db.webhookLog.update({
            where: { id: webhook.id },
            data: {
              isProcessed: true,
              processedAt: new Date()
            }
          });
        } catch (error) {
          await this.db.webhookLog.update({
            where: { id: webhook.id },
            data: {
              retryCount: { increment: 1 },
              errorMessage: error.message
            }
          });

          // Move to dead letter queue if max retries exceeded
          if (webhook.retryCount + 1 >= RETRY_CONFIG.maxAttempts) {
            await this.moveToDeadLetterQueue(webhook);
          }
        }
      }
    }
  }
}
```

### 5. Printing Integration

**Recommendation:** Implement job queue with local printer agent

```typescript
// Print service
class PrintService {
  async createPrintJob(order: Order, mode: 'AUTO' | 'MANUAL') {
    const printer = await this.getPrinterForBranch(order.branchId);
    const template = await this.getTemplateForOrderType(order.type);

    const printJob = await this.db.printJob.create({
      data: {
        orderId: order.id,
        printerId: printer.id,
        templateId: template.id,
        status: 'QUEUED',
        priority: mode === 'AUTO' ? 10 : 5,
        printData: this.formatOrderForPrint(order, template),
        retryCount: 0
      }
    });

    // Notify printer agent via WebSocket
    await this.notifyPrinterAgent(printer.id, printJob.id);

    return printJob;
  }
}

// Printer agent (local software)
class PrinterAgent {
  async connectToPrintService() {
    const ws = new WebSocket(`wss://api.yourplatform.com/printer/${this.printerId}`);

    ws.on('message', async (data) => {
      const job = JSON.parse(data);
      await this.processPrintJob(job);
    });

    // Also poll for jobs (fallback)
    setInterval(() => this.pollForJobs(), 30000);
  }

  async processPrintJob(job: PrintJob) {
    try {
      await this.renderAndPrint(job.printData, job.templateId);

      await this.apiClient.updatePrintJob(job.id, {
        status: 'COMPLETED',
        completedAt: new Date()
      });
    } catch (error) {
      await this.apiClient.updatePrintJob(job.id, {
        status: 'FAILED',
        errorMessage: error.message,
        retryCount: job.retryCount + 1
      });
    }
  }
}
```

### 6. Real-time Status Updates

**Recommendation:** Use WebSocket for real-time order updates

```typescript
// WebSocket server
class OrderWebSocketServer {
  private connections: Map<string, Set<WebSocket>> = new Map();

  // Subscribe branch to order updates
  subscribeBranch(branchId: string, ws: WebSocket) {
    if (!this.connections.has(branchId)) {
      this.connections.set(branchId, new Set());
    }
    this.connections.get(branchId).add(ws);
  }

  // Broadcast order update to branch
  async broadcastOrderUpdate(branchId: string, order: Order) {
    const connections = this.connections.get(branchId);

    if (connections) {
      const message = JSON.stringify({
        type: 'ORDER_UPDATE',
        order: this.serializeOrder(order)
      });

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }
}
```

### 7. Database Schema Recommendations

```prisma
// Core order model
model Order {
  id                     String    @id @default(uuid())
  orderNumber            String    @unique
  branchId               String
  deliveryZoneId         String?
  deliveryProviderId     String?

  // Customer info
  customerName           String
  customerPhone          String
  customerEmail          String?

  // Delivery info
  deliveryAddress        String
  deliveryLat            Decimal
  deliveryLng            Decimal
  deliveryInstructions   String?

  // Order details
  orderType              OrderType
  status                 OrderStatus

  // Pricing
  subtotal               Decimal
  deliveryFee            Decimal
  taxAmount              Decimal
  totalAmount            Decimal

  // Payment
  paymentMethod          PaymentMethod
  paymentStatus          PaymentStatus

  // Timing
  estimatedDeliveryTime  DateTime?
  actualDeliveryTime     DateTime?
  scheduledAt            DateTime?

  // Provider info
  providerOrderId        String?
  providerTrackingUrl    String?
  driverInfo             Json?

  // Metadata
  notes                  String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  deliveredAt            DateTime?
  cancelledAt            DateTime?
  cancellationReason     String?

  // Relations
  branch                 Branch    @relation(fields: [branchId])
  deliveryZone           DeliveryZone? @relation(fields: [deliveryZoneId])
  deliveryProvider       DeliveryProvider? @relation(fields: [deliveryProviderId])
  items                  OrderItem[]
  printJobs              PrintJob[]
  statusHistory          OrderStatusHistory[]

  @@index([branchId, status])
  @@index([providerOrderId])
  @@index([createdAt])
}

// Order items
model OrderItem {
  id            String   @id @default(uuid())
  orderId       String
  productId     String
  productName   String
  quantity      Int
  unitPrice     Decimal
  modifiers     Json?
  totalPrice    Decimal
  notes         String?

  order         Order    @relation(fields: [orderId])
  product       Product  @relation(fields: [productId])

  @@index([orderId])
}

// Webhook logging
model WebhookLog {
  id            String    @id @default(uuid())
  provider      Platform
  eventType     String
  payload       Json
  headers       Json
  isProcessed   Boolean   @default(false)
  errorMessage  String?
  retryCount    Int       @default(0)
  statusCode    Int?
  response      Json?
  processedAt   DateTime?
  createdAt     DateTime  @default(now())
  companyId     String

  @@index([provider, isProcessed])
  @@index([createdAt])
}

// Print jobs
model PrintJob {
  id            String      @id @default(uuid())
  orderId       String
  printerId     String
  templateId    String
  status        PrintStatus
  priority      Int
  printData     Json
  retryCount    Int         @default(0)
  errorMessage  String?
  completedAt   DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  order         Order       @relation(fields: [orderId])
  printer       Printer     @relation(fields: [printerId])
  template      PrintTemplate @relation(fields: [templateId])

  @@index([printerId, status])
  @@index([status, priority])
}

// Enums
enum Platform {
  TALABAT
  CAREEM
  YALLOW
  NASHMI
  DHUB
  TOP
  JOOD
  TAWASI
}

enum OrderStatus {
  PENDING
  ACCEPTED
  REJECTED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
}

enum OrderType {
  DELIVERY
  PICKUP
  DINE_IN
}

enum PaymentMethod {
  CASH
  CARD
  ONLINE
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PrintStatus {
  QUEUED
  PRINTING
  COMPLETED
  FAILED
}
```

---

## Performance Considerations

### 1. Database Optimization

```sql
-- Critical indexes for order queries
CREATE INDEX idx_orders_branch_status ON orders(branch_id, status);
CREATE INDEX idx_orders_provider ON orders(provider_order_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_webhook_logs_processing ON webhook_logs(provider, is_processed, created_at);

-- Partitioning for large tables (if needed)
CREATE TABLE orders_2025_10 PARTITION OF orders
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### 2. Caching Strategy

```typescript
// Cache frequently accessed data
class OrderCacheService {
  async getBranchConfig(branchId: string) {
    const cacheKey = `branch:${branchId}:config`;

    let config = await this.redis.get(cacheKey);
    if (!config) {
      config = await this.db.branch.findUnique({
        where: { id: branchId },
        include: {
          deliveryZones: true,
          printers: true
        }
      });

      await this.redis.setex(cacheKey, 3600, JSON.stringify(config));
    }

    return JSON.parse(config);
  }
}
```

### 3. Queue Management

```typescript
// Use Bull for job queues
import Bull from 'bull';

const webhookQueue = new Bull('webhooks', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

webhookQueue.process('process-webhook', 10, async (job) => {
  return await processWebhook(job.data.webhookLogId);
});
```

---

## Security Considerations

### 1. Webhook Validation

```typescript
// Validate webhook signatures
class WebhookValidator {
  async validateTalabatWebhook(payload: any, signature: string): Promise<boolean> {
    const secret = process.env.TALABAT_WEBHOOK_SECRET;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }

  async validateCareemWebhook(payload: any, signature: string): Promise<boolean> {
    // Careem-specific validation logic
    // ...
  }
}
```

### 2. Rate Limiting

```typescript
// Protect webhook endpoints
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many webhook requests'
});

app.post('/api/webhooks/:provider', webhookLimiter, webhookController.handle);
```

### 3. Data Sanitization

```typescript
// Sanitize customer input
class DataSanitizer {
  sanitizeCustomerData(data: any) {
    return {
      name: this.sanitizeString(data.name),
      phone: this.sanitizePhone(data.phone),
      email: this.sanitizeEmail(data.email),
      address: this.sanitizeString(data.address),
      notes: this.sanitizeString(data.notes, 500) // max length
    };
  }

  private sanitizeString(str: string, maxLength = 255): string {
    return str
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, ''); // Remove HTML tags
  }
}
```

---

## Monitoring & Analytics

### 1. Key Metrics to Track

```typescript
// Metrics service
class OrderMetricsService {
  async trackOrderMetrics(order: Order) {
    // Order volume
    await this.incrementCounter('orders.received', {
      provider: order.deliveryProvider,
      branch: order.branchId
    });

    // Acceptance rate
    if (order.status === 'ACCEPTED') {
      await this.incrementCounter('orders.accepted');
    } else if (order.status === 'REJECTED') {
      await this.incrementCounter('orders.rejected');
    }

    // Processing time
    const processingTime = order.updatedAt.getTime() - order.createdAt.getTime();
    await this.recordHistogram('orders.processing_time', processingTime);

    // Revenue
    if (order.status === 'DELIVERED') {
      await this.recordGauge('revenue.total', order.totalAmount);
    }
  }
}
```

### 2. Alert Configuration

```yaml
alerts:
  - name: high_webhook_failure_rate
    condition: webhook_failure_rate > 0.05
    window: 5m
    notify: [slack, email]

  - name: slow_order_processing
    condition: p95_processing_time > 30s
    window: 10m
    notify: [slack]

  - name: print_job_failures
    condition: print_failure_rate > 0.1
    window: 5m
    notify: [email]
```

---

## Conclusion

Picolinate's order flow demonstrates a robust, webhook-based architecture with:

**Strengths:**
- Webhook-first approach for real-time order reception
- Comprehensive error handling with retry mechanisms
- Automated printing system with fallback options
- Extensive audit trails and logging
- Multi-provider support with unified internal format

**Areas for Improvement in v2:**
- Add GraphQL subscriptions for real-time updates
- Implement circuit breakers for provider API calls
- Add more sophisticated fraud detection
- Enhance analytics and reporting capabilities
- Implement A/B testing framework for acceptance flows

**Critical Success Factors:**
1. Webhook reliability (99.9%+ uptime)
2. Fast processing (<30s from receipt to acceptance)
3. Printing reliability (99%+ success rate)
4. Provider API resilience (circuit breakers, timeouts)
5. Clear error messages for debugging

This analysis provides a solid foundation for implementing a production-ready order management system in Restaurant Platform v2.
