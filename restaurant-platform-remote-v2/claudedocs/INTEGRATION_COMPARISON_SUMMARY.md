# Integration Architecture Comparison: Picolinate vs restaurant-platform-remote-v2

**Date**: October 1, 2025
**Purpose**: Quick reference guide comparing delivery provider integration approaches

---

## Quick Comparison Matrix

| Aspect | Picolinate (Legacy) | restaurant-platform-remote-v2 (Current) |
|--------|---------------------|------------------------------------------|
| **Language** | PHP (Laravel) | TypeScript (NestJS) |
| **Database** | PostgreSQL | PostgreSQL (Prisma ORM) |
| **Architecture** | Monolithic middleware | Modular microservices |
| **Providers** | Deliveroo, Jahez, Careem (partial) | DHUB, Careem, Talabat, Jahez, Deliveroo |
| **Credential Storage** | ❌ Plain JSONB + Files | ⚠️ Needs implementation |
| **Webhook Security** | ❌ Completely disabled | ⚠️ Needs implementation |
| **Menu Sync** | ✅ Implemented for 2 providers | ❌ Not implemented |
| **Order Processing** | ✅ Async webhook handling | ⚠️ Partial implementation |
| **Type Safety** | ❌ No types | ✅ Full TypeScript |
| **Testing** | ❌ Not evident | ✅ Test infrastructure exists |
| **Logging** | ✅ Comprehensive | ⚠️ Basic implementation |

---

## Database Schema Comparison

### Picolinate Tables (Proven Effective)

```
food_aggrigators              → Provider registry
food_aggrigator_linkers       → Company-provider relationships
food_aggrigator_data          → Entity ID mapping (polymorphic)
food_aggregators_orders       → Order tracking
food_aggregator_sync_logs     → Menu sync history
incoming_api_log              → Webhook logging
outgoing_api_log              → API call logging
```

### Current Platform Tables (Existing)

```
DeliveryProvider              → Basic provider info
DeliveryOrder                 → Order management
(Integration tables missing)  → Need implementation
```

### Required Additions to Current Platform

Based on Picolinate analysis, add:
- `ProviderConfiguration`: Encrypted credentials storage
- `ProviderEntityMapping`: Branch/company to provider ID mapping
- `MenuSyncLog`: Sync history and debugging
- `WebhookLog`: Incoming webhook audit trail
- `ProviderOrderMapping`: External ↔ internal order ID mapping

---

## Provider-Specific Implementation Details

### Deliveroo

**Picolinate Implementation** (Most Complete):
```
Authentication: OAuth 2.0 Client Credentials
Token Storage: File-based (security issue)
Token Expiration: Properly handled
Menu Upload: PUT to /menu/v1/brands/{id}/menus/{menuId}
Price Format: Cents (multiply by 100)
Webhook Events: order.new, order.status_update, order.failed
Order Status Flow: placed → accepted → confirmed → in_kitchen →
                   ready_for_collection → collected
```

**Recommended for Current Platform**:
```typescript
interface DeliverooConfig {
  clientId: string;
  clientSecret: string;
  oAuthHost: string;
  apiHost: string;
  webhookSecret: string;
}

// Token caching in database with expiration
// Proper webhook signature validation
// Menu transformation service
```

### Jahez

**Picolinate Implementation**:
```
Authentication: API Key + Secret → Token
Token Storage: Database JSONB (unencrypted issue)
Token Expiration: Not handled
Menu Upload: Separate endpoints for categories and products
Special Features: Branch exclusion logic, full week availability
Webhook: Order creation and status updates
```

**Recommended for Current Platform**:
```typescript
interface JahezConfig {
  apiKey: string;
  secret: string;
  apiHost: string;
}

// Token with expiration handling
// Encrypted credential storage
// Two-stage menu upload (categories, then products)
```

### Careem

**Picolinate Implementation**: ❌ INCOMPLETE
- Only menu retrieval via .NET API
- No order handling
- No webhook processing

**Recommended for Current Platform**:
- Build from scratch using Careem API documentation
- Don't reference Picolinate implementation

---

## Menu Synchronization Patterns

### Data Transformation Flow

```
Internal Format (Ishbek/restaurant-platform-remote-v2)
    ↓ [Transformation Service]
Provider-Specific Format (Deliveroo/Jahez/etc.)
    ↓ [API Upload]
Provider Menu System
```

### Common Transformation Requirements

1. **Category Mapping**
   - ID preservation
   - Multi-language names
   - Display order/index
   - Branch availability

2. **Product Transformation**
   - Category assignment
   - Price conversion (some providers use cents)
   - Image URL handling
   - Visibility/availability status

3. **Modifier Hierarchy**
   - Two-level structure: Questions (groups) → Answers (options)
   - Min/max selection counts
   - Control type mapping (radio/checkbox)
   - Price handling per option

4. **Branch Availability**
   - Branch inclusion/exclusion lists
   - Time-based availability (day/hour)
   - Global vs branch-specific products

### Picolinate Transformation Example

```php
// Internal: question → group (2-level modifier)
foreach ($questions as $question) {
    $modifiers[] = [
        "id" => $question['id'],
        "name" => $question['name'],
        "min_selection" => $question['minimumcount'],
        "max_selection" => $question['maximumcount'],
        "options" => $this->getOptions($question['id'], $answers)
    ];
}
```

**Lesson**: Need flexible transformer system that can handle provider-specific formats

---

## Webhook Handling Patterns

### Picolinate Approach (Pattern Good, Security Bad)

```php
// PATTERN: Immediate acknowledgment + async processing
public function setOrder(Request $request) {
    // 1. Log immediately
    IncomingApiLog::create([...]);

    // 2. Parse webhook
    $event = $request->get('event');
    $orderId = $request->get('body.order.id');

    // 3. Respond quickly
    return response()->json(['status' => 'succeeded'], 200);

    // 4. Process asynchronously (after response sent)
    // This happens in background or separate process
}
```

**Good Pattern**: Fast webhook response + async processing
**Bad Implementation**: No signature validation, security disabled

### Recommended for Current Platform

```typescript
@Controller('webhooks')
export class WebhookController {
  @Post(':provider/order')
  async handleOrderWebhook(
    @Param('provider') provider: string,
    @Headers() headers: any,
    @Body() payload: any
  ) {
    // 1. Validate signature FIRST
    await this.webhookValidator.validate(provider, headers, payload);

    // 2. Log webhook
    await this.webhookLogger.log(provider, payload);

    // 3. Queue for processing
    await this.orderQueue.add({
      provider,
      event: payload.event,
      orderId: payload.orderId,
      data: payload
    });

    // 4. Respond immediately
    return { received: true, status: 'processing' };
  }

  // Separate async processor
  @OnQueueActive()
  async processOrderWebhook(job: Job) {
    // Process order creation/update
    // Transform to internal format
    // Store in database
    // Trigger business logic
  }
}
```

---

## Security Comparison

### Picolinate Security Failures ❌

1. **Credential Storage**
   ```php
   // NEVER DO THIS
   $credentials = [
       'api_key' => 'secret123',
       'client_secret' => 'verysecret'
   ];
   DB::table('food_aggrigators')->insert([
       'credintial' => json_encode($credentials)  // Plain text!
   ]);
   ```

2. **Webhook Validation**
   ```php
   // SECURITY DISABLED!
   public function handle(Request $request, Closure $next) {
       // All validation code commented out
       return $next($request);  // Accept everything!
   }
   ```

3. **Token Storage**
   ```php
   // INSECURE FILE STORAGE
   file_put_contents(
       storage_path('app/credintals/provider.json'),
       json_encode(['access_token' => $token])
   );
   ```

### Recommended Security for Current Platform ✅

1. **Encrypted Credential Storage**
   ```typescript
   // Use Prisma with encrypted columns or external vault
   import { createCipheriv, createDecipheriv } from 'crypto';

   @Injectable()
   export class CredentialService {
     private readonly algorithm = 'aes-256-gcm';

     encrypt(data: string): { encrypted: string; iv: string; tag: string } {
       const iv = randomBytes(16);
       const cipher = createCipheriv(this.algorithm, this.key, iv);
       const encrypted = Buffer.concat([
         cipher.update(data, 'utf8'),
         cipher.final()
       ]);
       return {
         encrypted: encrypted.toString('hex'),
         iv: iv.toString('hex'),
         tag: cipher.getAuthTag().toString('hex')
       };
     }
   }
   ```

2. **Webhook Signature Validation**
   ```typescript
   @Injectable()
   export class WebhookValidationService {
     validateDeliveroo(signature: string, payload: string, secret: string): boolean {
       const computed = crypto
         .createHmac('sha256', secret)
         .update(payload)
         .digest('hex');

       return crypto.timingSafeEqual(
         Buffer.from(signature),
         Buffer.from(computed)
       );
     }

     validateJahez(signature: string, payload: string, secret: string): boolean {
       // Jahez-specific validation
     }
   }
   ```

3. **Secure Token Management**
   ```typescript
   @Injectable()
   export class TokenService {
     async getToken(providerId: string): Promise<string> {
       // Check cache first
       const cached = await this.cache.get(`token:${providerId}`);
       if (cached && cached.expiresAt > Date.now()) {
         return cached.token;
       }

       // Fetch new token
       const credentials = await this.credentialService.getDecrypted(providerId);
       const token = await this.fetchNewToken(credentials);

       // Cache with expiration
       await this.cache.set(`token:${providerId}`, {
         token,
         expiresAt: Date.now() + token.expiresIn * 1000
       });

       return token;
     }
   }
   ```

---

## Operational Patterns

### Logging Strategy

**Picolinate**: Write everything to database
```php
// Every API call writes to DB
OutgoingApiLog::create([...]);  // Performance impact
IncomingApiLog::create([...]);
```

**Recommended**: Selective logging with log levels
```typescript
// Critical: Always log to database
await this.logger.logCritical('webhook_received', { providerId, orderId });

// Debug: Log to files only
this.logger.debug('menu_transformation', { productCount });

// Performance: Use async logging
await this.queue.add('log', { level: 'info', data });
```

### Error Handling

**Picolinate**: Basic try-catch, limited retry
```php
try {
    $response = $this->process(...);
} catch (Exception $e) {
    return $this->sendError($e->getMessage());
}
```

**Recommended**: Comprehensive error handling
```typescript
async createOrder(order: Order): Promise<ExternalOrder> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.executeOrderCreation(order);
    } catch (error) {
      lastError = error;

      // Don't retry 4xx errors
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw new OrderCreationFailedError(
    `Failed after ${maxRetries} attempts`,
    { lastError, order }
  );
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (2 weeks)
- [ ] Design secure credential storage
- [ ] Implement provider configuration system
- [ ] Build webhook validation framework
- [ ] Create base provider interface

### Phase 2: Menu Synchronization (2 weeks)
- [ ] Menu transformation service
- [ ] Provider-specific transformers (Deliveroo, Jahez)
- [ ] Sync logging system
- [ ] Admin UI for menu sync

### Phase 3: Order Integration (2 weeks)
- [ ] Webhook processing pipeline
- [ ] Order synchronization
- [ ] Status mapping system
- [ ] Order ID mapping

### Phase 4: Provider Implementation (3 weeks)
- [ ] Deliveroo complete integration
- [ ] Jahez complete integration
- [ ] Talabat integration
- [ ] Testing and validation

### Phase 5: Operations (1 week)
- [ ] Monitoring dashboard
- [ ] Health checks
- [ ] Analytics
- [ ] Documentation

---

## Key Decisions Required

### 1. Credential Storage
**Options**:
- A. Prisma encrypted columns (easiest)
- B. HashiCorp Vault (most secure)
- C. AWS Secrets Manager (cloud-native)

**Recommendation**: Start with A, migrate to B/C for production

### 2. Webhook Processing
**Options**:
- A. Synchronous (simple but slow)
- B. Queue-based (scalable)
- C. Event-driven (most flexible)

**Recommendation**: B (queue-based with BullMQ)

### 3. Menu Sync Strategy
**Options**:
- A. On-demand sync only
- B. Scheduled automatic sync
- C. Webhook-triggered sync

**Recommendation**: A + B (manual + scheduled)

### 4. Order ID Mapping
**Options**:
- A. Separate mapping table
- B. Embedded in order table
- C. Both (redundant)

**Recommendation**: A (clean separation, easier debugging)

---

## Success Metrics

### Performance
- Webhook response time: < 200ms
- Menu sync completion: < 30 seconds
- Token refresh success rate: > 99.9%
- API call success rate: > 99%

### Security
- Zero unencrypted credentials
- 100% webhook signature validation
- No hardcoded secrets
- Audit trail for all credential access

### Reliability
- Order sync success rate: > 99.5%
- Menu sync success rate: > 99%
- Zero data loss on failures
- Automatic retry success rate: > 95%

---

## Critical Don'ts from Picolinate

❌ **NEVER**:
1. Store credentials in plain text
2. Disable security for "debugging"
3. Hardcode API URLs or secrets
4. Use file-based state management
5. Skip webhook signature validation
6. Leave incomplete implementations
7. Assume tokens never expire
8. Write every API call to database
9. Use localhost URLs in production code
10. Comment out security code

---

## Quick Reference: Provider Endpoints

### Deliveroo
```
OAuth: https://auth-sandbox.developers.deliveroo.com/oauth2/token
Menu:  https://api-sandbox.developers.deliveroo.com/menu/v1/brands/{id}/menus/{menuId}
Order: https://api-sandbox.developers.deliveroo.com/order/v1/orders/{orderId}
```

### Jahez
```
Auth:       https://integration-api-staging.jahez.net/token
Categories: https://integration-api-staging.jahez.net/categories/categories_upload
Products:   https://integration-api-staging.jahez.net/products/products_upload
Webhook:    https://integration-api-staging.jahez.net/webhooks/status_update
```

---

## Conclusion

Picolinate provides valuable patterns for:
- Multi-tenant provider configuration
- Menu transformation logic
- Asynchronous webhook processing
- Comprehensive logging

But requires complete security redesign:
- Encrypted credential storage
- Proper webhook validation
- Secure token management
- No hardcoded secrets

The restaurant-platform-remote-v2 platform has superior architecture (TypeScript, NestJS, Prisma) and can implement these patterns correctly from the start.

---

*Quick reference completed: October 1, 2025*
*For detailed analysis, see: PICOLINATE_INTEGRATION_ARCHITECTURE_ANALYSIS.md*
