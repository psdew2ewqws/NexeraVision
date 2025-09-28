# Comprehensive Careem/Careem Express Integration Analysis

## Executive Summary

Based on comprehensive analysis of the Picolinate codebase (shawerma 3a saj restaurant), current restaurant platform architecture, and available Careem integration documentation, this report provides a detailed roadmap for implementing Careem/Careem Express integration.

**Key Findings:**
- ✅ Strong foundation exists in current platform architecture
- ✅ Picolinate provides proven integration patterns
- ⚠️ Limited public API documentation requires partner access
- 🔧 Significant database schema enhancements needed
- 📈 High business value with clear implementation path

---

## Part 1: Picolinate Codebase Analysis Results

### 1.1 Existing Careem Integration Patterns

#### Database Layer (PostgreSQL)
**Key Tables and Functions:**
```sql
-- Core Careem tracking table
careemlog (id, eventtype, eventid, createdat, branch_id, brand_id)

-- Careem-specific database functions
getcatalog_careem(_branchid uuid)
getbranchmenuforcareemjson(_branchid uuid)
getcategoriesforcareemdto(_menuid uuid)
getitemsforcareemdto(_categoryids uuid[], _branchid uuid)
getoptionsforcareemdto(_productids uuid[])
getoperationalhoursforbranch_careem(_branchid uuid)
getimagepath_careem(_image public.citext)

-- Order management
createcareemcustomeraddress() procedure
integrationcomapnystatuscareem(_id uuid)
```

#### Application Layer (PHP Laravel/Middleware)
**Core Integration File:** `/middleware/var/www/html/app/Http/Controllers/FoodAggregator/Careem.php`

**Key Implementation Details:**
```php
class Careem extends Controller {
    private $URL = "http://65.108.60.120:708/api/Menu/GetBranchMenuCareemmMap";

    // Menu synchronization endpoint
    public function getSimulateMenu(Request $request) {
        // Validates companyId and branchId
        // Calls internal API for menu mapping
        // Returns formatted menu data
    }
}
```

**Constants Configuration:**
```php
// Order source mapping
public const ISHBEK_ORDER_SOURCE = [
    "0c698066-ce70-483f-8da6-968465fd697a" => "careem"
];

// Order type mapping
public const ISHBEK_ORDER_TYPES = [
    "b8fe602c-9bf4-4c13-bcf1-4a84325992e2" => "careemnow"
];

// Foodics integration
public const FOODICS_ORDER_TYPE = [
    "careemnow" => 3,
    "careem" => 3,
];
```

**API Routes:**
```php
Route::prefix("/ishbek")->group(function ($app) {
    $app->get("/menu", [Careem::class, "getSimulateMenu"])
        ->name("careem.menu.semulate");
});
```

#### Key Integration Patterns Identified:
1. **Menu Mapping Architecture**: Specialized functions for converting internal menu structure to Careem format
2. **Order Type Management**: UUID-based order source identification system
3. **Multi-POS Integration**: Support for Foodics, Bonanza, OODO, and other POS systems
4. **Webhook Logging**: Comprehensive event tracking with `careemlog` table
5. **Address Management**: Customer address creation procedures
6. **Image Handling**: Careem-specific image path formatting

---

## Part 2: Careem API Documentation Analysis

### 2.1 Official Documentation Status
**Finding:** Official Careem Now API documentation is **not publicly accessible**

**Available Information Sources:**
1. **Careem Partner Portal** (`partner-portal.careem.com/oauth2/`)
2. **Third-party Integration Providers** (Restroworks, Foodics, GetOrder)
3. **Business Partnership Channels**

### 2.2 Integration Requirements (From Available Sources)

#### Authentication
- **Method**: OAuth2 with automatic token refresh
- **Access**: Partner-level credentials required
- **Portal**: Partner portal provides authentication management

#### Menu Management
- **Updates**: Ticket-based system via Partner Portal
- **Processing Time**: 7 working days for menu changes
- **Real-time**: Limited to availability updates only
- **Batch Operations**: Supported (up to 50 items per batch)

#### Order Processing
- **Flow**: Webhook-based order reception
- **Auto-acceptance**: Available for POS-integrated restaurants
- **Manual Processing**: Tablet-based for non-integrated partners

#### Geographic Coverage
- **UAE**: Dubai (primary market)
- **KSA**: Riyadh, Jeddah
- **Jordan**: Amman, Irbid

#### Rate Limits (Estimated)
- **API Calls**: ~150 requests/minute
- **Webhook Processing**: Real-time
- **Menu Updates**: Batch operations preferred

---

## Part 3: Connection Points and Integration Touchpoints

### 3.1 Current Platform Integration Points

#### Backend Architecture Analysis
**Existing Delivery Module:**
```typescript
// Current structure supports multi-provider integration
export interface DeliveryRequest {
  companyId: string;
  branchId: string;
  orderDetails: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    totalAmount: number;
  };
  preferredProvider?: string;  // "careem" can be added here
}

export interface DeliveryResponse {
  success: boolean;
  providerOrderId?: string;
  trackingNumber?: string;
  estimatedDeliveryTime?: Date;
  providerFee?: number;
  providerType: string;  // "careem" identification
}
```

#### Menu Management Integration Points
**Platform-Specific Pricing:**
```typescript
// Current availability DTO already supports Careem pricing
export class BranchAvailabilityDto {
  careem?: number;  // Careem-specific pricing
}
```

**Menu Platform Support:**
```typescript
// Existing platform management in menu controller
@Get('platforms')
async getPlatformsForMenu(@Request() req) {
  // Can be extended to include Careem platform
}
```

### 3.2 Required Integration Touchpoints

#### 1. Menu Synchronization
**Endpoint:** `/api/integrations/careem/menu/sync`
- **Method**: POST
- **Purpose**: Push menu updates to Careem
- **Frequency**: On-demand and scheduled

#### 2. Order Reception Webhook
**Endpoint:** `/api/webhooks/careem/orders`
- **Method**: POST
- **Purpose**: Receive orders from Careem
- **Security**: HMAC signature validation

#### 3. Order Status Updates
**Endpoint:** `/api/integrations/careem/orders/{orderId}/status`
- **Method**: PUT
- **Purpose**: Update order status to Careem
- **Triggers**: Order preparation, ready, dispatched

#### 4. Inventory Updates
**Endpoint:** `/api/integrations/careem/inventory`
- **Method**: POST
- **Purpose**: Real-time availability updates
- **Frequency**: Real-time on stock changes

#### 5. Authentication Management
**Endpoint:** `/api/integrations/careem/auth/refresh`
- **Method**: POST
- **Purpose**: OAuth2 token refresh
- **Automation**: Scheduled token renewal

---

## Part 4: Requirements Mapping Analysis

### 4.1 Database Schema Requirements

#### New Tables Required
```sql
-- Careem-specific configuration
CREATE TABLE careem_configurations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),
    client_id VARCHAR NOT NULL,
    client_secret VARCHAR NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    webhook_secret VARCHAR,
    store_id VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Careem order mapping
CREATE TABLE careem_orders (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_order_id VARCHAR REFERENCES orders(id),
    careem_order_id VARCHAR UNIQUE NOT NULL,
    careem_order_number VARCHAR,
    order_status VARCHAR DEFAULT 'pending',
    customer_details JSONB,
    delivery_details JSONB,
    pricing_details JSONB,
    webhook_events JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Menu sync tracking
CREATE TABLE careem_menu_sync (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),
    sync_type VARCHAR NOT NULL, -- 'full', 'partial', 'availability'
    sync_status VARCHAR DEFAULT 'pending',
    items_processed INTEGER DEFAULT 0,
    items_total INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

#### Enhanced Existing Tables
```sql
-- Add Careem platform support to product pricing
ALTER TABLE product_pricing
ADD COLUMN careem_price DECIMAL(10,2),
ADD COLUMN careem_discount_price DECIMAL(10,2);

-- Enhance delivery providers
INSERT INTO delivery_providers (name, type, api_base_url, supported_features)
VALUES ('careem', 'marketplace', 'https://partners-api.careem.com/v1',
        '["order_sync", "menu_sync", "status_updates", "inventory_sync"]');
```

### 4.2 API Endpoint Requirements

#### Core Integration Endpoints
```typescript
// 1. Configuration Management
POST   /api/integrations/careem/configure
GET    /api/integrations/careem/config
PUT    /api/integrations/careem/config
DELETE /api/integrations/careem/config

// 2. Menu Management
POST   /api/integrations/careem/menu/sync
GET    /api/integrations/careem/menu/status
POST   /api/integrations/careem/menu/items/batch
PUT    /api/integrations/careem/menu/availability

// 3. Order Management
POST   /api/webhooks/careem/orders          (webhook receiver)
PUT    /api/integrations/careem/orders/:id/status
GET    /api/integrations/careem/orders/:id
POST   /api/integrations/careem/orders/:id/cancel

// 4. Authentication & Health
POST   /api/integrations/careem/auth/token
GET    /api/integrations/careem/health
POST   /api/integrations/careem/test-connection
```

#### Data Transformation Requirements
```typescript
// Internal Menu → Careem Menu Format
interface CareemMenuItem {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  description: {
    en: string;
    ar: string;
  };
  price: number;
  currency: "AED" | "SAR" | "JOD";
  category_id: string;
  images: string[];
  is_available: boolean;
  options?: CareemMenuOption[];
  nutritional_info?: any;
  allergens?: string[];
}

// Careem Order → Internal Order Format
interface CareemOrderWebhook {
  order_id: string;
  order_number: string;
  status: "confirmed" | "preparing" | "ready" | "dispatched" | "delivered";
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery_address: {
    address: string;
    coordinates: { lat: number; lng: number; };
    instructions?: string;
  };
  items: CareemOrderItem[];
  totals: {
    subtotal: number;
    delivery_fee: number;
    service_fee: number;
    total: number;
  };
  payment_method: string;
  scheduled_time?: string;
}
```

### 4.3 Business Logic Requirements

#### Menu Synchronization Logic
```typescript
class CareemMenuSync {
  // 1. Data validation and transformation
  async validateMenuData(menuItems: MenuItem[]): Promise<ValidationResult>

  // 2. Batch processing for efficiency
  async syncMenuBatch(items: MenuItem[], batchSize: number = 50): Promise<SyncResult>

  // 3. Availability-only updates for performance
  async updateAvailability(itemIds: string[], available: boolean): Promise<void>

  // 4. Error handling and retry logic
  async handleSyncErrors(errors: SyncError[]): Promise<RetryResult>
}
```

#### Order Processing Workflow
```typescript
class CareemOrderProcessor {
  // 1. Webhook validation and parsing
  async validateWebhook(payload: any, signature: string): Promise<boolean>

  // 2. Order creation in local system
  async createLocalOrder(careemOrder: CareemOrderWebhook): Promise<Order>

  // 3. Status synchronization
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>

  // 4. Error handling and notification
  async handleOrderErrors(error: OrderError): Promise<void>
}
```

---

## Part 5: Integration Implementation Roadmap

### Phase 1: Foundation Setup (Week 1-2)
**Priority: HIGH**

#### Database Schema Implementation
```bash
# 1. Create migration files
npx prisma migrate dev --name add_careem_integration

# 2. Update Prisma schema
# Add Careem-specific models and relationships

# 3. Seed initial data
# Add Careem as delivery provider
# Create default configuration templates
```

#### Basic Authentication Module
```typescript
// File: src/modules/integrations/careem/careem-auth.service.ts
@Injectable()
export class CareemAuthService {
  async authenticateWithCareem(config: CareemConfig): Promise<AuthResult>
  async refreshToken(config: CareemConfig): Promise<AuthResult>
  async validateWebhookSignature(payload: any, signature: string): Promise<boolean>
}
```

### Phase 2: Core Integration (Week 3-4)
**Priority: HIGH**

#### Menu Synchronization Service
```typescript
// File: src/modules/integrations/careem/careem-menu.service.ts
@Injectable()
export class CareemMenuService {
  async syncFullMenu(companyId: string, branchId: string): Promise<SyncResult>
  async syncMenuUpdates(changes: MenuChange[]): Promise<SyncResult>
  async updateItemAvailability(itemId: string, available: boolean): Promise<void>
}
```

#### Order Processing Service
```typescript
// File: src/modules/integrations/careem/careem-order.service.ts
@Injectable()
export class CareemOrderService {
  async processIncomingOrder(webhook: CareemOrderWebhook): Promise<Order>
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>
  async cancelOrder(orderId: string, reason: string): Promise<void>
}
```

### Phase 3: Advanced Features (Week 5-6)
**Priority: MEDIUM**

#### Real-time Inventory Management
```typescript
// WebSocket integration for real-time updates
@Injectable()
export class CareemInventoryService {
  async updateInventoryRealTime(updates: InventoryUpdate[]): Promise<void>
  async handleStockOutEvents(itemIds: string[]): Promise<void>
  async batchInventorySync(): Promise<void>
}
```

#### Analytics and Monitoring
```typescript
@Injectable()
export class CareemAnalyticsService {
  async trackOrderMetrics(orderId: string): Promise<void>
  async generateSyncReports(): Promise<SyncReport[]>
  async monitorAPIHealth(): Promise<HealthStatus>
}
```

### Phase 4: Testing and Optimization (Week 7-8)
**Priority: HIGH**

#### Comprehensive Testing Suite
```typescript
// Integration tests
describe('Careem Integration', () => {
  test('Menu synchronization end-to-end')
  test('Order processing workflow')
  test('Webhook handling and validation')
  test('Error recovery and retry logic')
  test('Authentication token management')
})
```

#### Performance Optimization
- **Caching Strategy**: Menu data caching with Redis
- **Batch Processing**: Optimize API calls with batching
- **Rate Limiting**: Implement intelligent rate limiting
- **Error Recovery**: Circuit breaker pattern implementation

---

## Part 6: Technical Implementation Guide

### 6.1 Careem Integration Module Structure
```
src/modules/integrations/careem/
├── careem.module.ts
├── services/
│   ├── careem-auth.service.ts
│   ├── careem-menu.service.ts
│   ├── careem-order.service.ts
│   ├── careem-webhook.service.ts
│   └── careem-analytics.service.ts
├── controllers/
│   ├── careem-integration.controller.ts
│   └── careem-webhook.controller.ts
├── dto/
│   ├── careem-config.dto.ts
│   ├── careem-menu.dto.ts
│   ├── careem-order.dto.ts
│   └── careem-webhook.dto.ts
├── interfaces/
│   ├── careem-api.interface.ts
│   └── careem-types.interface.ts
├── guards/
│   └── careem-webhook.guard.ts
└── tests/
    ├── careem-integration.spec.ts
    └── careem-webhook.spec.ts
```

### 6.2 Configuration Management
```typescript
// Environment variables
CAREEM_API_BASE_URL=https://partners-api.careem.com/v1
CAREEM_WEBHOOK_BASE_URL=https://your-domain.com/api/webhooks/careem
CAREEM_DEFAULT_CURRENCY=AED
CAREEM_BATCH_SIZE=50
CAREEM_SYNC_INTERVAL=300000  // 5 minutes
CAREEM_TIMEOUT=30000
```

### 6.3 Webhook Security Implementation
```typescript
@Controller('webhooks/careem')
export class CareemWebhookController {
  @Post('orders')
  @UseGuards(CareemWebhookGuard)
  async handleOrderWebhook(
    @Body() payload: CareemOrderWebhook,
    @Headers('x-careem-signature') signature: string
  ) {
    // Signature validation in guard
    // Process order webhook
    return await this.careemOrderService.processIncomingOrder(payload);
  }
}
```

---

## Part 7: Business Impact Analysis

### 7.1 Benefits
**Revenue Growth:**
- Access to Careem's customer base in UAE, KSA, Jordan
- Increased order volume through marketplace exposure
- Dynamic pricing capabilities for platform optimization

**Operational Efficiency:**
- Automated order processing reduces manual work
- Real-time inventory sync prevents overselling
- Centralized menu management across platforms

**Market Expansion:**
- Entry into new geographical markets
- Brand exposure through Careem's marketing
- Customer data insights for business intelligence

### 7.2 Costs and Resources
**Development Investment:**
- **Phase 1**: ~40 hours (database + auth setup)
- **Phase 2**: ~60 hours (core integration)
- **Phase 3**: ~40 hours (advanced features)
- **Phase 4**: ~32 hours (testing + optimization)
- **Total**: ~172 hours (4-5 weeks development)

**Operational Costs:**
- Careem commission fees (typically 15-25%)
- Partner portal subscription (if applicable)
- Additional server resources for webhook processing
- Monitoring and maintenance overhead

### 7.3 Risk Assessment
**Technical Risks:**
- **API Changes**: Careem API modifications requiring updates
- **Rate Limiting**: Exceeding API limits during peak times
- **Data Sync Issues**: Menu/inventory synchronization failures

**Business Risks:**
- **Commission Impact**: Higher fees compared to direct orders
- **Platform Dependency**: Reliance on Careem's platform stability
- **Competition**: Increased competition within marketplace

**Mitigation Strategies:**
- Comprehensive error handling and retry logic
- Multi-provider fallback architecture
- Regular API health monitoring
- Gradual rollout with pilot branches

---

## Part 8: Recommendations and Next Steps

### 8.1 Immediate Actions Required
1. **Partner Application**: Contact Careem to become official integration partner
2. **API Access**: Request access to Careem Partner API documentation
3. **Test Environment**: Set up Careem sandbox/test environment
4. **Team Training**: Educate development team on Careem requirements

### 8.2 Implementation Strategy
**Recommended Approach: Incremental Rollout**
1. **Pilot Branch**: Start with single branch for testing
2. **Menu Sync Only**: Begin with read-only menu synchronization
3. **Order Processing**: Add order reception and processing
4. **Full Integration**: Deploy real-time inventory and analytics
5. **Scale Up**: Expand to additional branches after validation

### 8.3 Success Metrics
**Technical KPIs:**
- **Integration Uptime**: >99.5%
- **Menu Sync Success Rate**: >95%
- **Order Processing Time**: <30 seconds
- **API Error Rate**: <2%

**Business KPIs:**
- **Order Volume Increase**: Target +25% through Careem
- **Customer Acquisition**: New customer metrics
- **Revenue Growth**: Platform-specific revenue tracking
- **Customer Satisfaction**: Order fulfillment ratings

### 8.4 Long-term Roadmap
**Q1 2025**: Core integration deployment
**Q2 2025**: Advanced analytics and AI-driven pricing
**Q3 2025**: Multi-market expansion (UAE → KSA → Jordan)
**Q4 2025**: Full ecosystem integration with loyalty programs

---

## Conclusion

The analysis reveals a **strong technical foundation** in both Picolinate's proven integration patterns and the current restaurant platform's extensible architecture. The Careem integration represents a **high-value, medium-complexity** project with clear implementation pathways.

**Key Success Factors:**
1. **Proven Patterns**: Picolinate provides battle-tested integration architecture
2. **Solid Foundation**: Current platform supports multi-provider delivery integration
3. **Clear Requirements**: Well-defined data models and API requirements
4. **Business Value**: Significant revenue growth potential in key markets

**Critical Dependencies:**
1. **Partner Access**: Obtaining official Careem API documentation and credentials
2. **Testing Environment**: Sandbox access for development and testing
3. **Business Approval**: Careem partnership agreement and commercial terms

The integration is **technically feasible** with the current architecture and offers **significant business value** for market expansion and revenue growth. Implementation should proceed with the phased approach outlined in this analysis.

---

**Document Version**: 1.0
**Last Updated**: September 24, 2025
**Analysis Scope**: Complete integration requirements and implementation roadmap
**Status**: Ready for stakeholder review and implementation planning