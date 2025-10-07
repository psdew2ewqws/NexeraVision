# Delivery Provider Integration Quick Reference

**Date**: October 1, 2025
**Purpose**: Fast lookup guide for implementing each delivery provider

---

## Provider Configuration Matrix

| Provider | Auth Type | Token Expires | Menu Format | Order Format | Status |
|----------|-----------|---------------|-------------|--------------|--------|
| **Deliveroo** | OAuth 2.0 | 3600s | Custom JSON | Webhook | ✅ Complete in Picolinate |
| **Jahez** | API Key + Secret | Unknown | Categories + Products | Webhook | ✅ Complete in Picolinate |
| **Careem** | TBD | TBD | Via .NET API | TBD | ❌ Incomplete |
| **Talabat** | TBD | TBD | TBD | TBD | ⚠️ Not analyzed |
| **Uber Eats** | TBD | TBD | TBD | TBD | ⚠️ Not found |
| **Zomato** | TBD | TBD | TBD | TBD | ⚠️ Not found |

---

## Deliveroo Integration Details

### Configuration Required
```typescript
interface DeliverooConfig {
  clientId: string;              // OAuth client ID
  clientSecret: string;          // OAuth client secret
  clientEncoding: string;        // Base64(clientId:clientSecret)
  oAuthHost: string;             // Auth server URL
  apiHost: string;               // API base URL
  webhookSecret: string;         // For webhook validation
  brandId: string;               // Deliveroo brand ID
}
```

### Environment URLs
```
Sandbox:
  OAuth: https://auth-sandbox.developers.deliveroo.com
  API:   https://api-sandbox.developers.deliveroo.com

Production:
  OAuth: https://auth.developers.deliveroo.com
  API:   https://api.developers.deliveroo.com
```

### Authentication Flow
```typescript
// 1. Request token
POST https://auth-sandbox.developers.deliveroo.com/oauth2/token
Headers:
  authorization: Basic {base64(clientId:clientSecret)}
  content-type: application/x-www-form-urlencoded
Body:
  grant_type=client_credentials

Response:
{
  "access_token": "token_here",
  "token_type": "Bearer",
  "expires_in": 3600
}

// 2. Use token (valid for 1 hour)
Headers:
  Authorization: Bearer {access_token}
```

### Menu Synchronization

**Endpoint**: `PUT /menu/v1/brands/{brandId}/menus/{menuId}`

**Menu Structure**:
```json
{
  "name": "Main Menu",
  "site_ids": ["site-123", "site-456"],
  "menu": {
    "categories": [
      {
        "id": "cat-uuid",
        "name": {"ar": "مشروبات", "en": "Beverages"},
        "description": {"ar": "...", "en": "..."},
        "item_ids": ["item-uuid-1", "item-uuid-2"]
      }
    ],
    "items": [
      {
        "id": "item-uuid",
        "name": {"ar": "قهوة", "en": "Coffee"},
        "description": {"ar": "...", "en": "..."},
        "price_info": {
          "price": 550  // CENTS! (5.50 * 100)
        },
        "image": {"url": "https://..."},
        "modifier_ids": ["mod-uuid"],
        "is_eligible_as_replacement": true,
        "is_eligible_for_substitution": true,
        "is_returnable": false,
        "contains_alcohol": false,
        "plu": "JOD",
        "tax_rate": "0",
        "type": "ITEM"
      }
    ],
    "modifiers": [
      {
        "id": "mod-uuid",
        "name": {"ar": "الحجم", "en": "Size"},
        "description": {"ar": "...", "en": "..."},
        "min_selection": 1,
        "max_selection": 1,
        "item_ids": ["choice-uuid"]
      }
    ],
    "mealtimes": [
      {
        "id": "mealtime-uuid",
        "name": {"ar": "...", "en": "..."},
        "image": {"url": "..."},
        "schedule": [
          {
            "day_of_week": 0,  // 0=Monday, 6=Sunday
            "time_periods": [
              {"start": "09:00", "end": "22:00"}
            ]
          }
        ],
        "category_ids": ["cat-uuid"]
      }
    ]
  }
}
```

**Critical Notes**:
- ✅ Prices in **CENTS** (multiply by 100)
- ✅ Must use **PUT** method (not POST)
- ✅ Generate new UUID for each menu sync
- ✅ Two-level modifiers: modifiers → items (choices)

### Webhook Events

**Order New**:
```json
{
  "event": "order.new",
  "occurred_at": "2025-10-01T10:30:00Z",
  "body": {
    "order": {
      "id": "order-id",
      "location_id": "site-id",
      "status": "placed",
      "asap": true,
      "prepare_for": "2025-10-01T10:45:00Z",
      "customer": {...},
      "items": [...],
      "total": {...}
    }
  }
}
```

**Response Required**:
```json
{
  "occurred_at": "2025-10-01T10:30:00Z",
  "status": "succeeded",
  "start_preparing_at": "2025-10-01T10:35:00Z"
}
```

**Order Status Update**:
```json
{
  "event": "order.status_update",
  "occurred_at": "2025-10-01T10:40:00Z",
  "body": {
    "order": {
      "id": "order-id",
      "status": "confirmed"
    }
  }
}
```

### Status Flow

```
placed → accepted → confirmed → in_kitchen →
ready_for_collection_soon → ready_for_collection → collected
```

**Status Update Endpoints**:
```typescript
// Accept/Reject order
PATCH /order/v1/orders/{orderId}
{
  "status": "accepted",
  "occurred_at": "2025-10-01T10:30:00Z",
  "confirm_at": "2025-10-01T10:45:00Z"  // For confirmed status
}

// Update preparation stage
POST /order/v1/orders/{orderId}/prep_stage
{
  "status": "in_kitchen",
  "occurred_at": "2025-10-01T10:35:00Z"
}

// Sync status (for non-placed orders)
POST /order/v1/orders/{orderId}/sync_status
{
  "status": "succeeded",
  "occurred_at": "2025-10-01T10:30:00Z"
}
```

### Webhook Validation
```typescript
// Headers to validate
const sequenceGuid = headers['x-deliveroo-sequence-guid'];
const hmacSha256 = headers['x-deliveroo-hmac-sha256'];

// Compute signature
const computed = crypto
  .createHmac('sha256', webhookSecret)
  .update(sequenceGuid)
  .digest('hex');

// Validate
const isValid = crypto.timingSafeEqual(
  Buffer.from(computed),
  Buffer.from(hmacSha256)
);
```

---

## Jahez Integration Details

### Configuration Required
```typescript
interface JahezConfig {
  apiKey: string;        // x-api-key header
  secret: string;        // For token generation
  apiHost: string;       // API base URL
  token?: string;        // Cached access token
}
```

### Environment URLs
```
Staging:  https://integration-api-staging.jahez.net
Production: (TBD - not documented in Picolinate)
```

### Authentication Flow
```typescript
// 1. Request token
POST https://integration-api-staging.jahez.net/token
Headers:
  x-api-key: {apiKey}
  Content-Type: application/json
Body:
{
  "secret": "{secret}"
}

Response:
{
  "token": "access_token_here",
  "success": true
}

// 2. Use token (no expiration documented)
Headers:
  x-api-key: {apiKey}
  Authorization: Bearer {token}
```

### Menu Synchronization

**Two-Step Process**:

**Step 1: Upload Categories**
```typescript
POST /categories/categories_upload
Headers:
  x-api-key: {apiKey}
  Authorization: Bearer {token}
Body:
{
  "categories": [
    {
      "category_id": "cat-uuid",
      "name": {"ar": "مشروبات", "en": "Beverages"},
      "index": 1,
      "exclude_branches": []  // Branch UUIDs to exclude
    }
  ]
}
```

**Step 2: Upload Products**
```typescript
POST /products/products_upload
Headers:
  x-api-key: {apiKey}
  Authorization: Bearer {token}
Body:
{
  "products": [
    {
      "product_id": "prod-uuid",
      "product_price": 5.50,  // DECIMAL (not cents)
      "category_id": "cat-uuid",
      "name": {"ar": "قهوة", "en": "Coffee"},
      "description": {"ar": "...", "en": "..."},
      "image_path": "https://...",
      "index": 1,
      "calories": 100,
      "is_visible": true,
      "exclude_branches": [],
      "modifiers": [
        {
          "id": "mod-uuid",
          "is_multiple": false,
          "is_radio": true,
          "max_option": 1,
          "min_option": 1,
          "name": {"ar": "الحجم", "en": "Size"},
          "options": [
            {
              "id": "opt-uuid",
              "nameAr": "كبير",
              "nameEn": "Large",
              "price": 2.00,
              "calories": 50
            }
          ]
        }
      ],
      "availability": {
        "saturday": {
          "is_visible": true,
          "times": [
            {"start": "00:00", "end": "23:59"}
          ]
        },
        "sunday": {...},
        "monday": {...},
        "tuesday": {...},
        "wednesday": {...},
        "thursday": {...},
        "friday": {...}
      }
    }
  ]
}
```

**Critical Notes**:
- ✅ Prices in **DECIMAL** (not cents like Deliveroo)
- ✅ Categories uploaded **separately** from products
- ✅ Branch exclusion via `exclude_branches` array
- ✅ Full week availability required for each product
- ✅ Nested modifiers structure (options inside modifiers)

### Order Processing

**Incoming Order Webhook**:
```json
{
  "jahez_id": "jahez-order-123",
  "branch_id": "branch-uuid",
  "payment_method": "cash",
  "notes": "No onions",
  "final_price": 25.50,
  "offer": {
    "amount": 2.00
  },
  "products": [
    {
      "product_id": "prod-uuid",
      "quantity": 2,
      "original_price": 10.00,
      "final_price": 20.00,
      "notes": "",
      "modifiers": [
        {
          "modifier_id": "mod-uuid",
          "options": [
            {
              "id": "opt-uuid",
              "quantity": 1,
              "final_price": 2.00
            }
          ]
        }
      ]
    }
  ]
}
```

**Response Required**: HTTP 200 immediately
```json
{
  "message": "order created"
}
```

**Status Update Webhook** (from Jahez):
```json
{
  "jahezOrderId": "jahez-order-123",
  "status": "C"  // A=Accepted, R=Rejected, C=Cancelled
}
```

**Status Update to Jahez** (from restaurant):
```typescript
POST /webhooks/status_update
Headers:
  x-api-key: {apiKey}
  Authorization: Bearer {token}
Body:
{
  "jahezOrderId": "jahez-order-123",
  "status": "A"  // A=Accepted, R=Rejected
}
```

**Status Codes**:
- `A` - Accepted
- `R` - Rejected
- `C` - Cancelled

---

## Careem Integration (Incomplete in Picolinate)

### What Exists
- Menu retrieval via internal .NET API
- Basic validation for company/branch IDs

### What's Missing
- Order webhook handling
- Menu upload to Careem
- Status synchronization
- Complete authentication flow

### Implementation Approach
⚠️ **Do NOT use Picolinate as reference**
- Build from Careem's official API documentation
- Follow same patterns as Deliveroo/Jahez
- Implement complete OAuth or API key flow
- Add proper webhook handling

---

## Common Patterns Across Providers

### 1. Entity ID Mapping

All providers need bidirectional ID mapping:

```typescript
interface ProviderEntityMapping {
  internalBranchId: string;        // Our UUID
  externalBranchId: string;        // Provider's ID (site_id, branch_id, etc.)
  internalProductId: string;
  externalProductId: string;
  // Same for categories, modifiers, orders
}
```

### 2. Order Processing Flow

```
Webhook Received
    ↓
Validate Signature
    ↓
Log Webhook
    ↓
Respond Immediately (HTTP 200)
    ↓
Queue for Processing
    ↓
[Async] Map External IDs to Internal IDs
    ↓
[Async] Create Internal Order
    ↓
[Async] Send Status Update to Provider
```

### 3. Menu Sync Flow

```
Trigger Sync (Manual/Scheduled)
    ↓
Fetch Current Menu (Internal Format)
    ↓
Transform to Provider Format
    ↓
Map Entity IDs
    ↓
Upload to Provider API
    ↓
Log Sync Result
    ↓
Update Last Sync Timestamp
```

### 4. Token Management

```typescript
async getAccessToken(providerId: string): Promise<string> {
  // 1. Check cache
  const cached = await cache.get(`token:${providerId}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // 2. Get encrypted credentials
  const credentials = await credentialService.getDecrypted(providerId);

  // 3. Request new token
  const token = await requestNewToken(credentials);

  // 4. Cache with expiration
  await cache.set(`token:${providerId}`, {
    token: token.access_token,
    expiresAt: Date.now() + (token.expires_in * 1000)
  });

  return token.access_token;
}
```

---

## Database Mappings Required

### Branch to Provider Site Mapping
```sql
-- Map our branches to provider site IDs
INSERT INTO provider_entity_mapping (
  provider_id,
  internal_entity_id,    -- Our branch UUID
  internal_entity_type,  -- 'Branch'
  external_entity_id     -- Provider's site_id/branch_id
) VALUES (
  'deliveroo-provider-id',
  'our-branch-uuid',
  'Branch',
  'deliveroo-site-123'
);
```

### Order ID Mapping
```sql
-- Track external orders
INSERT INTO food_aggregator_orders (
  provider_id,
  external_order_id,     -- Deliveroo/Jahez order ID
  internal_order_id,     -- Our order UUID (after creation)
  order_details,         -- Complete order payload
  status,
  company_id,
  branch_id
) VALUES (...);
```

---

## Testing Checklist

### Deliveroo Testing
- [ ] OAuth token generation
- [ ] Token caching and expiration
- [ ] Menu upload (categories, items, modifiers)
- [ ] Price conversion (to cents)
- [ ] Webhook signature validation
- [ ] Order new webhook
- [ ] Status update webhooks
- [ ] Order acceptance/rejection
- [ ] Kitchen status updates

### Jahez Testing
- [ ] API key + secret authentication
- [ ] Token generation
- [ ] Category upload
- [ ] Product upload (with modifiers)
- [ ] Branch exclusion logic
- [ ] Availability scheduling
- [ ] Order webhook processing
- [ ] Status update to Jahez
- [ ] Cancellation handling

---

## Error Handling Requirements

### API Call Failures
```typescript
// Retry with exponential backoff
const maxRetries = 3;
const baseDelay = 1000; // 1 second

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.statusCode >= 400 && error.statusCode < 500) {
      // Client error - don't retry
      throw error;
    }

    if (attempt === maxRetries) {
      throw error;
    }

    // Exponential backoff: 1s, 2s, 4s
    await delay(baseDelay * Math.pow(2, attempt - 1));
  }
}
```

### Webhook Processing Failures
```typescript
// Always respond 200, queue for retry
@Post('webhook/:provider')
async handleWebhook(@Body() payload: any) {
  try {
    // Validate signature
    this.validateSignature(payload);

    // Queue for processing
    await this.queue.add('process-webhook', {
      payload,
      attempts: 0,
      maxAttempts: 5
    });

    return { received: true };
  } catch (error) {
    // Log error but still return 200
    this.logger.error('Webhook validation failed', error);
    return { received: true, error: 'validation_failed' };
  }
}
```

---

## Monitoring Requirements

### Metrics to Track
- Token generation success/failure rate
- Menu sync success/failure rate
- Order webhook processing time
- Order creation success rate
- Status update success rate
- API response times per provider
- Webhook signature validation failures

### Alerts to Configure
- Token generation failures (> 5% failure rate)
- Menu sync failures (> 1% failure rate)
- Order processing delays (> 30 seconds)
- Webhook signature failures (> 10 per hour)
- Provider API downtime
- Rate limit violations

---

## Quick Troubleshooting

### Issue: Deliveroo "Invalid signature"
✅ **Check**:
- Webhook secret matches provider configuration
- Using correct header: `x-deliveroo-hmac-sha256`
- Hashing the `x-deliveroo-sequence-guid` (not full payload)
- Using SHA256 HMAC

### Issue: Jahez "Unauthorized"
✅ **Check**:
- Both `x-api-key` and `Authorization: Bearer` headers present
- Token not expired (no expiration in API docs, but regenerate if fails)
- API key matches provider configuration

### Issue: Menu sync succeeds but items not visible
✅ **Check**:
- Product `is_visible` = true
- Product not in `exclude_branches` for target branch
- Category contains product `item_ids`
- Availability schedule covers current time
- Branch properly mapped to provider site_id

### Issue: Orders not creating in system
✅ **Check**:
- Webhook signature validation passing
- External IDs mapped to internal IDs
- Branch ID in webhook payload exists in mapping
- Queue processing orders (check queue status)
- Database transactions not failing

---

## Priority Implementation Order

1. **Week 1**: Deliveroo (most complete reference)
   - OAuth authentication
   - Token management
   - Menu upload
   - Webhook handling

2. **Week 2**: Jahez
   - API key authentication
   - Two-step menu upload
   - Order processing
   - Status updates

3. **Week 3**: Talabat (if documentation available)
   - Research API documentation
   - Implement based on available docs
   - Cannot rely on Picolinate

4. **Week 4**: Careem
   - Research official API documentation
   - Full implementation (not from Picolinate)
   - Complete testing

---

*Quick Reference compiled: October 1, 2025*
*Based on Picolinate analysis and best practices*
*For detailed analysis: PICOLINATE_INTEGRATION_ARCHITECTURE_ANALYSIS.md*
