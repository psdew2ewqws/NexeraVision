# Careem Integration - Product Requirements Document (PRD)

**Product**: Restaurant Platform v2 - Careem Now Integration
**Document Type**: Product Requirements Document
**Version**: 1.0
**Date**: September 24, 2025
**Status**: Ready for Development
**Project Owner**: Restaurant Platform Team
**Stakeholders**: Technical Team, Business Development, Operations

---

## Executive Summary

### Business Case and Market Opportunity

The Careem integration represents a strategic market expansion initiative to tap into the Middle East's largest food delivery marketplace. With Careem Now operating across UAE, KSA, and Jordan with 50+ million active users, this integration provides immediate access to high-value markets and significant revenue growth potential.

**Strategic Value Proposition:**
- **Market Access**: Direct entry into UAE, KSA, and Jordan markets
- **Revenue Growth**: 25-40% increase in order volume through marketplace exposure
- **Customer Base Expansion**: Access to 50+ million Careem users
- **Competitive Positioning**: Parity with major restaurant chains using Careem
- **Operational Efficiency**: Automated order processing and menu synchronization

**Market Size and Opportunity:**
- **UAE Food Delivery Market**: $1.2B annually, growing 15% YoY
- **KSA Food Delivery Market**: $2.8B annually, growing 18% YoY
- **Jordan Food Delivery Market**: $180M annually, growing 12% YoY
- **Total Addressable Market**: $4.2B across three initial markets

### Key Benefits and ROI Projections

**Revenue Impact (12-month projection):**
- **New Order Volume**: +25% increase through Careem marketplace
- **Average Order Value**: Maintained at current levels ($18-22 USD equivalent)
- **Commission Cost**: 18-22% to Careem (industry standard)
- **Net Revenue Increase**: +15% after commission costs
- **Projected Additional Revenue**: $150K-300K annually per active restaurant

**Operational Benefits:**
- **Automation**: 95% reduction in manual order entry
- **Error Reduction**: 85% fewer order accuracy issues
- **Staff Efficiency**: 2 hours daily savings per restaurant
- **Market Intelligence**: Real-time performance analytics and customer insights

**ROI Timeline:**
- **Break-even**: 4-6 months post-launch
- **Full ROI**: 8-10 months
- **Long-term Growth**: 20-30% annual revenue increase potential

### Success Metrics and KPIs

**Technical Performance:**
- Integration Uptime: >99.5%
- Menu Sync Success Rate: >99%
- Order Processing Time: <30 seconds
- API Response Time: <2 seconds average

**Business Performance:**
- Careem Order Growth: +25% within 3 months
- Customer Satisfaction: >4.5/5.0 rating
- Order Accuracy: >98%
- Revenue Growth: +15% net after commissions

---

## Product Overview

### Integration Scope and Objectives

The Careem integration encompasses a comprehensive marketplace connection enabling restaurants using our platform to seamlessly operate on Careem's delivery network. The integration provides bi-directional data synchronization, automated order management, and real-time operational controls.

**Core Integration Components:**

1. **Menu Management System**
   - Real-time menu synchronization
   - Multi-language support (English/Arabic)
   - Platform-specific pricing
   - Category mapping and organization
   - Image optimization and delivery

2. **Order Processing Engine**
   - Webhook-based order reception
   - Automated order validation and creation
   - Status synchronization (both directions)
   - Customer data management
   - Payment processing integration

3. **Inventory and Availability Management**
   - Real-time stock updates
   - Automated availability synchronization
   - Business hours integration
   - Seasonal/promotional availability

4. **Analytics and Monitoring**
   - Performance dashboards
   - Revenue tracking by platform
   - Operational metrics
   - Error monitoring and alerting

### Target Markets (UAE, KSA, Jordan)

**Phase 1: UAE (Dubai)**
- **Market Size**: Largest food delivery market in MENA
- **Language**: English primary, Arabic secondary
- **Currency**: AED (United Arab Emirates Dirham)
- **Regulations**: Dubai Municipality food safety standards
- **Launch Timeline**: Month 1-2

**Phase 2: KSA (Riyadh)**
- **Market Size**: Fastest-growing market in region
- **Language**: Arabic primary, English secondary
- **Currency**: SAR (Saudi Arabian Riyal)
- **Regulations**: SFDA compliance required
- **Launch Timeline**: Month 3-4

**Phase 3: Jordan (Amman)**
- **Market Size**: Established market with high digital adoption
- **Language**: Arabic primary, English secondary
- **Currency**: JOD (Jordanian Dinar)
- **Regulations**: Jordan FDA requirements
- **Launch Timeline**: Month 5-6

### User Personas and Use Cases

#### Primary Persona: Restaurant Manager/Owner
**Profile:**
- Age: 28-45
- Tech Savviness: Moderate to High
- Primary Goal: Maximize revenue while maintaining operational efficiency
- Pain Points: Manual order management, inventory tracking, multi-platform coordination

**Key Use Cases:**
- Configure Careem integration for new branch
- Monitor real-time order flow from Careem
- Adjust menu pricing specific to Careem platform
- Track performance metrics across platforms
- Manage availability during peak/off-peak hours

#### Secondary Persona: Operations Staff
**Profile:**
- Age: 22-35
- Role: Kitchen Manager, Cashier, Branch Manager
- Primary Goal: Process orders efficiently without errors
- Pain Points: Order coordination, status updates, customer communication

**Key Use Cases:**
- Receive and confirm Careem orders
- Update order status through preparation stages
- Handle order modifications or cancellations
- Coordinate with delivery drivers
- Generate reports for management

#### Tertiary Persona: System Administrator
**Profile:**
- Role: IT/Technical Administrator
- Primary Goal: Ensure system reliability and performance
- Responsibility: Integration configuration, troubleshooting, monitoring

**Key Use Cases:**
- Set up initial Careem integration
- Configure webhook endpoints and authentication
- Monitor system health and performance
- Troubleshoot integration issues
- Manage security credentials and certificates

---

## Technical Architecture

### System Design and Integration Points

**High-Level Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Careem Platform                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐│
│  │   Menu API      │    │   Order API     │    │  Webhook     ││
│  │                 │    │                 │    │  Delivery    ││
│  └─────────────────┘    └─────────────────┘    └──────────────┘│
└─────────────────┬─────────────┬──────────────────────┬─────────┘
                  │             │                      │
                  ▼             ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                Restaurant Platform Integration Layer            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐│
│  │ Menu Sync       │    │ Order Processor │    │ Webhook      ││
│  │ Service         │    │ Service         │    │ Handler      ││
│  └─────────────────┘    └─────────────────┘    └──────────────┘│
└─────────────────┬─────────────┬──────────────────────┬─────────┘
                  │             │                      │
                  ▼             ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Restaurant Platform Core                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐│
│  │ Menu Management │    │ Order System    │    │ Branch       ││
│  │                 │    │                 │    │ Management   ││
│  └─────────────────┘    └─────────────────┘    └──────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Integration Flow:**

1. **Menu Synchronization Flow:**
   ```
   Menu Change → Menu Sync Service → Careem API → Confirmation
   Schedule Sync → Batch Processing → Error Handling → Retry Logic
   ```

2. **Order Processing Flow:**
   ```
   Careem Order → Webhook → Validation → Order Creation → Status Update
   Internal Status → Status Sync → Careem API → Customer Notification
   ```

3. **Real-time Updates Flow:**
   ```
   Availability Change → Real-time Sync → Careem API → Menu Update
   Stock Level → Inventory Monitor → Auto-disable → Availability Sync
   ```

### Database Schema Requirements

**New Tables:**

```sql
-- Core configuration management
CREATE TABLE careem_configurations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),
    client_id VARCHAR NOT NULL,
    client_secret VARCHAR NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    webhook_secret VARCHAR NOT NULL,
    store_id VARCHAR,
    auto_accept_orders BOOLEAN DEFAULT false,
    sync_inventory_realtime BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    minimum_order_value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, branch_id)
);

-- Order tracking and management
CREATE TABLE careem_orders (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_order_id VARCHAR REFERENCES orders(id),
    careem_order_id VARCHAR UNIQUE NOT NULL,
    careem_order_number VARCHAR NOT NULL,
    order_status VARCHAR DEFAULT 'pending',
    customer_details JSONB NOT NULL,
    delivery_details JSONB NOT NULL,
    pricing_details JSONB NOT NULL,
    webhook_events JSONB DEFAULT '[]',
    status_updates JSONB DEFAULT '[]',
    error_log JSONB DEFAULT '[]',
    received_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    last_status_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Menu synchronization tracking
CREATE TABLE careem_menu_sync (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),
    sync_type VARCHAR NOT NULL,
    sync_status VARCHAR DEFAULT 'pending',
    items_total INTEGER DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    items_success INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product-specific Careem configurations
CREATE TABLE careem_product_mappings (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR NOT NULL REFERENCES menu_products(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),
    careem_product_id VARCHAR,
    careem_category_id VARCHAR,
    careem_price DECIMAL(10,2),
    careem_discount_price DECIMAL(10,2),
    is_available_on_careem BOOLEAN DEFAULT true,
    careem_preparation_time INTEGER,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, branch_id)
);

-- Event logging and audit trail
CREATE TABLE careem_event_log (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR NOT NULL,
    event_id VARCHAR,
    company_id VARCHAR REFERENCES companies(id),
    branch_id VARCHAR REFERENCES branches(id),
    order_id VARCHAR,
    event_data JSONB NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status VARCHAR DEFAULT 'pending',
    http_status_code INTEGER,
    error_message TEXT,
    processing_time_ms INTEGER,
    occurred_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Enhanced Existing Tables:**

```sql
-- Add Careem-specific columns to menu products
ALTER TABLE menu_products
ADD COLUMN careem_price DECIMAL(10,2),
ADD COLUMN careem_discount_price DECIMAL(10,2),
ADD COLUMN careem_availability BOOLEAN DEFAULT true,
ADD COLUMN careem_preparation_time INTEGER DEFAULT 15;

-- Performance indexes
CREATE INDEX idx_careem_orders_careem_id ON careem_orders(careem_order_id);
CREATE INDEX idx_careem_orders_status ON careem_orders(order_status);
CREATE INDEX idx_careem_orders_received_at ON careem_orders(received_at);
CREATE INDEX idx_careem_sync_branch_status ON careem_menu_sync(branch_id, sync_status);
CREATE INDEX idx_careem_events_type_occurred ON careem_event_log(event_type, occurred_at);
```

### API Specifications and Endpoints

**Configuration Management:**

```typescript
// POST /api/integrations/careem/configure
interface CareemConfigurationRequest {
  branchId: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  storeId?: string;
  autoAcceptOrders?: boolean;
  syncInventoryRealtime?: boolean;
  commissionRate?: number;
  minimumOrderValue?: number;
}

// GET /api/integrations/careem/config/:branchId
interface CareemConfigurationResponse {
  id: string;
  branchId: string;
  storeId?: string;
  autoAcceptOrders: boolean;
  syncInventoryRealtime: boolean;
  commissionRate: number;
  minimumOrderValue: number;
  isActive: boolean;
  lastSyncAt?: string;
  tokenStatus: 'valid' | 'expired' | 'invalid';
}
```

**Menu Management:**

```typescript
// POST /api/integrations/careem/menu/sync
interface MenuSyncRequest {
  branchId: string;
  syncType: 'full' | 'incremental' | 'availability' | 'pricing';
  productIds?: string[];
  forceSync?: boolean;
}

interface MenuSyncResponse {
  syncId: string;
  status: 'initiated' | 'processing';
  estimatedDuration: number; // seconds
  message: string;
}

// GET /api/integrations/careem/menu/sync/:syncId/status
interface SyncStatusResponse {
  syncId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    percentage: number;
  };
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errors?: Array<{
    productId: string;
    productName: string;
    error: string;
    retryable: boolean;
  }>;
}
```

**Order Management:**

```typescript
// POST /webhooks/careem/orders
interface CareemOrderWebhook {
  order_id: string;
  order_number: string;
  store_id: string;
  status: 'confirmed' | 'pending';
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery_address: {
    address: string;
    building_number?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    delivery_instructions?: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    options?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  totals: {
    subtotal: number;
    delivery_fee: number;
    service_fee: number;
    tax_amount: number;
    total: number;
  };
  payment_method: 'cash' | 'card' | 'careem_pay';
  scheduled_time?: string;
  special_instructions?: string;
}

// PUT /api/integrations/careem/orders/:orderId/status
interface OrderStatusUpdateRequest {
  status: 'accepted' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  estimatedTime?: number; // minutes
  notes?: string;
  cancellationReason?: string;
}
```

### Security and Authentication Requirements

**OAuth2 Implementation:**

```typescript
interface CareemAuthConfig {
  authFlow: 'OAuth2.0';
  grantType: 'client_credentials';
  tokenEndpoint: 'https://partners-api.careem.com/oauth/token';
  scope: 'orders:read orders:write menu:write analytics:read';
  tokenRefreshThreshold: 900; // 15 minutes before expiry
  automaticRefresh: true;
  maxRetries: 3;
  retryDelay: [5000, 15000, 45000]; // milliseconds
}
```

**Webhook Security:**

```typescript
@Injectable()
export class CareemWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-careem-signature'];
    const timestamp = request.headers['x-careem-timestamp'];
    const payload = JSON.stringify(request.body);

    // Verify timestamp (prevent replay attacks)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - requestTime) > 300) { // 5 minutes tolerance
      return false;
    }

    // HMAC signature validation
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
```

**Data Encryption:**

- Client secrets encrypted with AES-256
- Token storage in encrypted database fields
- TLS 1.3 for all API communications
- Certificate pinning for enhanced security

---

## Feature Specifications

### Menu Synchronization Capabilities

**Real-time Menu Sync:**

```typescript
interface MenuSyncCapabilities {
  syncTypes: {
    fullMenu: {
      description: 'Complete menu synchronization';
      frequency: 'Weekly scheduled + on-demand';
      estimatedTime: '5 minutes for 500 items';
      batchSize: 50;
    };

    incremental: {
      description: 'Changed items only';
      frequency: 'Every 30 minutes + triggered';
      estimatedTime: '30 seconds for 20 items';
      triggers: ['price_change', 'name_update', 'description_change'];
    };

    availabilityOnly: {
      description: 'Stock status updates';
      frequency: 'Real-time';
      estimatedTime: '10 seconds';
      triggers: ['stock_change', 'business_hours', 'manual_toggle'];
    };

    pricingOnly: {
      description: 'Price updates only';
      frequency: 'Real-time + scheduled';
      estimatedTime: '15 seconds';
      triggers: ['price_change', 'promotion_start', 'promotion_end'];
    };
  };

  dataTransformation: {
    languages: ['en', 'ar'];
    currencies: ['AED', 'SAR', 'JOD'];
    imageFormats: ['jpg', 'png', 'webp'];
    maxImageSize: '2MB';
    categoryMapping: 'One-to-one with fallback';
    pricingRules: 'Platform-specific with commission handling';
  };

  errorHandling: {
    retryAttempts: 3;
    retryDelays: [5, 15, 45]; // seconds
    failureNotifications: true;
    rollbackCapability: true;
    partialSyncRecovery: true;
  };
}
```

**Menu Transformation Logic:**

```typescript
class MenuTransformationService {
  async transformForCareem(product: MenuProduct, branchId: string): Promise<CareemMenuItem> {
    return {
      id: product.id,
      name: {
        en: product.nameEn || product.name,
        ar: product.nameAr || this.generateArabicName(product.name)
      },
      description: {
        en: product.descriptionEn || '',
        ar: product.descriptionAr || ''
      },
      price: this.calculateCareemPrice(product, branchId),
      currency: this.getCurrencyForBranch(branchId),
      category_id: await this.getCareemCategoryId(product.categoryId, branchId),
      images: this.transformImageUrls(product.images),
      is_available: product.careemAvailability ?? product.isAvailable,
      preparation_time: product.careemPreparationTime ?? product.preparationTime ?? 15,
      options: await this.transformProductOptions(product.modifiers),
      allergens: this.extractAllergens(product.allergyInfo),
      nutritional_info: this.extractNutritionalInfo(product.nutritionalInfo)
    };
  }
}
```

### Order Processing Workflows

**Order Reception and Validation:**

```typescript
class OrderProcessingWorkflow {
  async processIncomingOrder(webhook: CareemOrderWebhook): Promise<ProcessingResult> {
    // 1. Webhook validation
    const validation = await this.validateWebhook(webhook);
    if (!validation.valid) {
      throw new WebhookValidationError(validation.errors);
    }

    // 2. Duplicate check
    const existingOrder = await this.checkDuplicateOrder(webhook.order_id);
    if (existingOrder) {
      return { status: 'duplicate', orderId: existingOrder.id };
    }

    // 3. Business rules validation
    const businessValidation = await this.validateBusinessRules(webhook);
    if (!businessValidation.valid) {
      await this.rejectOrder(webhook.order_id, businessValidation.reason);
      return { status: 'rejected', reason: businessValidation.reason };
    }

    // 4. Create local order
    const localOrder = await this.createLocalOrder(webhook);

    // 5. Auto-accept if configured
    const config = await this.getCareemConfig(webhook.store_id);
    if (config.autoAcceptOrders && this.withinBusinessHours()) {
      await this.acceptOrder(webhook.order_id);
    }

    return { status: 'processed', orderId: localOrder.id };
  }

  private async validateBusinessRules(webhook: CareemOrderWebhook): Promise<ValidationResult> {
    const checks = [
      await this.validateMinimumOrderValue(webhook),
      await this.validateItemAvailability(webhook),
      await this.validateDeliveryZone(webhook),
      await this.validatePaymentMethod(webhook),
      await this.validateBusinessHours(webhook)
    ];

    const failed = checks.filter(check => !check.valid);
    return {
      valid: failed.length === 0,
      reason: failed.map(f => f.reason).join(', ')
    };
  }
}
```

**Status Management:**

```typescript
interface OrderStatusManagement {
  statusFlow: {
    'received': {
      next: ['accepted', 'rejected'];
      timeout: 300; // 5 minutes
      autoTransition: 'conditional';
      notifications: ['internal_staff'];
    };
    'accepted': {
      next: ['preparing'];
      autoTransition: 'immediate';
      notifications: ['careem_api', 'internal_staff'];
    };
    'preparing': {
      next: ['ready'];
      estimatedDuration: 'calculated';
      notifications: ['preparation_timer'];
    };
    'ready': {
      next: ['dispatched'];
      timeout: 900; // 15 minutes
      notifications: ['careem_api', 'customer', 'delivery_partner'];
    };
    'dispatched': {
      next: ['delivered'];
      trackingEnabled: true;
      notifications: ['customer', 'tracking_updates'];
    };
    'delivered': {
      finalStatus: true;
      notifications: ['completion_confirmation'];
    };
  };

  cancellationRules: {
    allowedStatuses: ['received', 'accepted', 'preparing'];
    requiresReason: true;
    refundPolicy: 'automatic_for_prepaid';
    notificationRequired: true;
    compensationHandling: 'per_partnership_agreement';
  };
}
```

### Real-time Updates and Notifications

**WebSocket Integration:**

```typescript
@Injectable()
export class CareemRealTimeService {
  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Listen for internal events
    this.eventEmitter.on('order.status.changed', this.handleOrderStatusChange.bind(this));
    this.eventEmitter.on('inventory.changed', this.handleInventoryChange.bind(this));
    this.eventEmitter.on('menu.updated', this.handleMenuUpdate.bind(this));
  }

  async handleOrderStatusChange(event: OrderStatusChangeEvent) {
    // Update Careem API
    await this.updateCareemOrderStatus(event.orderId, event.newStatus);

    // Notify connected clients
    this.socketGateway.emitToRoom(
      `branch_${event.branchId}`,
      'careem_order_update',
      {
        orderId: event.orderId,
        status: event.newStatus,
        timestamp: new Date().toISOString()
      }
    );
  }

  async handleInventoryChange(event: InventoryChangeEvent) {
    // Real-time availability sync
    if (event.stockLevel === 0) {
      await this.disableProductOnCareem(event.productId, event.branchId);
    } else if (event.previousStockLevel === 0) {
      await this.enableProductOnCareem(event.productId, event.branchId);
    }
  }
}
```

**Push Notification System:**

```typescript
interface NotificationSystem {
  orderNotifications: {
    newOrder: {
      recipients: ['branch_managers', 'kitchen_staff'];
      channels: ['push', 'email', 'sms'];
      priority: 'high';
      template: 'new_careem_order';
    };
    orderReady: {
      recipients: ['delivery_partners'];
      channels: ['push', 'webhook'];
      priority: 'medium';
      template: 'order_ready_pickup';
    };
    orderDelayed: {
      recipients: ['customer', 'branch_manager'];
      channels: ['push', 'sms'];
      priority: 'high';
      template: 'order_delayed';
    };
  };

  systemNotifications: {
    syncFailure: {
      recipients: ['technical_team'];
      channels: ['email', 'slack'];
      priority: 'high';
      escalation: 'after_3_failures';
    };
    integrationDown: {
      recipients: ['operations_team', 'technical_team'];
      channels: ['push', 'email', 'sms', 'slack'];
      priority: 'critical';
      escalation: 'immediate';
    };
  };
}
```

### Admin Dashboard and Monitoring

**Performance Dashboard:**

```typescript
interface CareemDashboard {
  orderMetrics: {
    totalOrders: number;
    ordersToday: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    orderTrends: {
      period: 'hourly' | 'daily' | 'weekly';
      data: Array<{
        timestamp: string;
        orders: number;
        revenue: number;
      }>;
    };
  };

  syncMetrics: {
    lastMenuSync: string;
    syncStatus: 'healthy' | 'warning' | 'error';
    syncHistory: Array<{
      syncId: string;
      type: string;
      status: string;
      duration: number;
      itemsProcessed: number;
      errors: number;
    }>;
  };

  healthMetrics: {
    apiStatus: 'online' | 'offline' | 'degraded';
    webhookHealth: 'healthy' | 'failing';
    lastHeartbeat: string;
    responseTime: number;
    errorRate: number;
    uptime: number;
  };

  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
    actions?: string[];
  }>;
}
```

**Management Interface:**

```typescript
interface ManagementFeatures {
  configurationManagement: {
    branchSetup: 'Wizard-guided integration setup';
    credentialManagement: 'Secure credential storage and rotation';
    webhookTesting: 'Test webhook endpoint connectivity';
    syncScheduling: 'Configure sync intervals and triggers';
  };

  operationalControls: {
    manualSync: 'Trigger immediate menu synchronization';
    orderManagement: 'View and manage Careem orders';
    availabilityControl: 'Bulk enable/disable products';
    emergencyStop: 'Temporarily disable integration';
  };

  analyticsReporting: {
    performanceReports: 'Detailed performance analytics';
    revenueAnalysis: 'Platform-specific revenue tracking';
    customerInsights: 'Order patterns and preferences';
    exportCapabilities: 'CSV/Excel report generation';
  };

  troubleshooting: {
    eventLogs: 'Comprehensive event and error logging';
    diagnostics: 'System health and connectivity checks';
    supportTools: 'Built-in troubleshooting utilities';
    documentationAccess: 'Integrated help and documentation';
  };
}
```

---

## Implementation Plan

### Development Phases and Timelines

**Phase 1: Foundation and Authentication (Weeks 1-2)**

*Sprint 1.1: Database and Core Services*
- Database schema implementation and migrations
- Core service structure and dependency injection
- Authentication service with OAuth2 flow
- Configuration management endpoints
- Basic logging and error handling

*Sprint 1.2: Security and Validation*
- Webhook signature validation
- Request/response validation DTOs
- Rate limiting and security middleware
- Environment configuration management
- Unit tests for core services

**Deliverables:**
- ✅ Complete database schema with indexes
- ✅ CareemAuthService with token management
- ✅ CareemConfigService for branch configuration
- ✅ Security guards and validation pipes
- ✅ 90%+ test coverage for core services

**Phase 2: Menu Management and Synchronization (Weeks 3-4)**

*Sprint 2.1: Menu Data Transformation*
- Menu transformation service (internal → Careem format)
- Category mapping and management
- Image URL transformation and optimization
- Multi-language support implementation
- Product pricing calculations with commission

*Sprint 2.2: Synchronization Engine*
- Menu sync service with batch processing
- Real-time availability updates
- Sync status tracking and monitoring
- Error handling and retry logic
- Sync scheduling and automation

**Deliverables:**
- ✅ Complete menu synchronization capability
- ✅ Real-time availability management
- ✅ Multi-language menu support
- ✅ Robust error handling and recovery
- ✅ Sync monitoring and reporting

**Phase 3: Order Processing and Webhooks (Weeks 5-6)**

*Sprint 3.1: Webhook Processing*
- Webhook endpoint with security validation
- Order data transformation (Careem → internal)
- Order validation and business rules
- Duplicate order detection
- Customer data management

*Sprint 3.2: Order Lifecycle Management*
- Order status synchronization (bi-directional)
- Order acceptance/rejection automation
- Cancellation handling and refund processing
- Order tracking and timeline management
- Customer communication integration

**Deliverables:**
- ✅ Secure webhook processing
- ✅ Complete order lifecycle management
- ✅ Automated order processing
- ✅ Status synchronization
- ✅ Error recovery and manual intervention

**Phase 4: Analytics and Optimization (Weeks 7-8)**

*Sprint 4.1: Monitoring and Analytics*
- Real-time dashboard implementation
- Performance metrics collection
- Health monitoring and alerting
- Revenue tracking and reporting
- Integration analytics

*Sprint 4.2: Performance Optimization*
- Caching strategy implementation
- Database query optimization
- API response time optimization
- Load testing and performance tuning
- Documentation and deployment guides

**Deliverables:**
- ✅ Comprehensive monitoring dashboard
- ✅ Performance optimization
- ✅ Production-ready deployment
- ✅ Complete documentation
- ✅ Training materials and guides

### Resource Requirements

**Development Team:**

```typescript
interface TeamRequirements {
  technicalLead: {
    role: 'Senior Full-Stack Developer';
    commitment: '100% for 8 weeks';
    responsibilities: [
      'Technical architecture design',
      'Core service implementation',
      'Code review and quality assurance',
      'Team coordination and mentoring'
    ];
  };

  backendDeveloper: {
    role: 'Backend Developer';
    commitment: '100% for 6 weeks';
    responsibilities: [
      'API implementation',
      'Database design and optimization',
      'Integration service development',
      'Testing and documentation'
    ];
  };

  frontendDeveloper: {
    role: 'Frontend Developer';
    commitment: '50% for 4 weeks';
    responsibilities: [
      'Admin dashboard development',
      'Configuration UI implementation',
      'Real-time updates integration',
      'User experience optimization'
    ];
  };

  qaEngineer: {
    role: 'QA Engineer';
    commitment: '75% for 6 weeks';
    responsibilities: [
      'Test plan development',
      'Automated test implementation',
      'Integration testing',
      'Performance testing'
    ];
  };

  devOpsEngineer: {
    role: 'DevOps Engineer';
    commitment: '25% for 8 weeks';
    responsibilities: [
      'CI/CD pipeline setup',
      'Infrastructure provisioning',
      'Monitoring setup',
      'Deployment automation'
    ];
  };
}
```

**Infrastructure Requirements:**

```typescript
interface InfrastructureRequirements {
  development: {
    environment: 'Dedicated development environment';
    database: 'PostgreSQL 14+ with 16GB RAM';
    storage: '100GB SSD storage';
    networking: 'VPN access and SSL certificates';
    monitoring: 'Basic logging and error tracking';
  };

  staging: {
    environment: 'Production-like staging environment';
    database: 'PostgreSQL cluster with replication';
    storage: '200GB SSD with automated backups';
    networking: 'Load balancer and SSL termination';
    monitoring: 'Comprehensive monitoring stack';
  };

  production: {
    environment: 'High-availability production setup';
    database: 'PostgreSQL cluster with read replicas';
    storage: '500GB SSD with daily backups';
    networking: 'CDN, load balancer, SSL certificates';
    monitoring: 'Full observability stack with alerting';
  };

  additionalServices: {
    caching: 'Redis cluster for session management';
    messaging: 'Message queue for async processing';
    logging: 'Centralized logging with ELK stack';
    monitoring: 'Prometheus + Grafana + AlertManager';
  };
}
```

### Dependencies and Risks

**External Dependencies:**

```typescript
interface ExternalDependencies {
  careemPlatform: {
    partnershipStatus: {
      requirement: 'Official Careem partner status';
      timeline: '2-4 weeks application process';
      risk: 'High - Integration cannot proceed without approval';
      mitigation: 'Apply immediately, maintain regular communication';
    };

    apiAccess: {
      requirement: 'Production API credentials and documentation';
      timeline: '1-2 weeks after partnership approval';
      risk: 'Medium - May delay development start';
      mitigation: 'Use mock/sandbox environment during application';
    };

    technicalCertification: {
      requirement: 'Integration testing and certification';
      timeline: '1-2 weeks before production launch';
      risk: 'Medium - May require integration changes';
      mitigation: 'Follow Careem integration guidelines strictly';
    };
  };

  internalDependencies: {
    menuSystem: {
      requirement: 'Stable menu management system';
      status: 'Available';
      risk: 'Low - System is mature and stable';
    };

    orderSystem: {
      requirement: 'Order processing capabilities';
      status: 'Available';
      risk: 'Low - Core functionality exists';
    };

    authenticationSystem: {
      requirement: 'User authentication and authorization';
      status: 'Available';
      risk: 'Low - Well-established system';
    };
  };
}
```

**Risk Assessment and Mitigation:**

```typescript
interface RiskMitigation {
  technicalRisks: {
    apiChanges: {
      probability: 'Medium';
      impact: 'High';
      description: 'Careem API changes requiring integration updates';
      mitigation: [
        'Implement robust error handling and fallbacks',
        'Subscribe to Careem developer notifications',
        'Version API calls where possible',
        'Maintain backward compatibility layers'
      ];
    };

    rateLimiting: {
      probability: 'High';
      impact: 'Medium';
      description: 'Exceeding API rate limits during high-volume periods';
      mitigation: [
        'Implement intelligent rate limiting and backoff',
        'Queue non-critical operations',
        'Monitor usage and optimize call patterns',
        'Negotiate higher limits if needed'
      ];
    };

    dataConsistency: {
      probability: 'Medium';
      impact: 'High';
      description: 'Data sync issues between platforms';
      mitigation: [
        'Implement comprehensive reconciliation processes',
        'Maintain detailed audit logs',
        'Build conflict resolution mechanisms',
        'Regular consistency checks and alerts'
      ];
    };
  };

  businessRisks: {
    commissionImpact: {
      probability: 'Certain';
      impact: 'Medium';
      description: 'Platform commission affecting profit margins';
      mitigation: [
        'Adjust pricing strategy to maintain margins',
        'Optimize operational efficiency',
        'Focus on volume growth to offset commission',
        'Regular financial performance reviews'
      ];
    };

    marketCompetition: {
      probability: 'High';
      impact: 'Medium';
      description: 'Increased competition within Careem marketplace';
      mitigation: [
        'Focus on service quality and speed',
        'Leverage customer data for optimization',
        'Develop loyalty programs',
        'Unique value proposition development'
      ];
    };

    platformDependency: {
      probability: 'Medium';
      impact: 'High';
      description: 'Over-reliance on Careem platform for orders';
      mitigation: [
        'Maintain diverse revenue streams',
        'Build direct customer relationships',
        'Develop multiple platform integrations',
        'Brand building independent of platforms'
      ];
    };
  };
}
```

### Testing and QA Approach

**Testing Strategy:**

```typescript
interface TestingStrategy {
  unitTesting: {
    target: '90%+ code coverage';
    frameworks: ['Jest', 'Testing Library'];
    focus: [
      'Service layer business logic',
      'Data transformation functions',
      'Validation and sanitization',
      'Error handling scenarios'
    ];
    automation: 'CI/CD pipeline integration';
  };

  integrationTesting: {
    target: 'All API endpoints and database operations';
    frameworks: ['Supertest', 'Test containers'];
    focus: [
      'API endpoint functionality',
      'Database CRUD operations',
      'Service integration points',
      'Authentication and authorization'
    ];
    environment: 'Isolated test database';
  };

  e2eTesting: {
    target: 'Complete user workflows';
    frameworks: ['Playwright', 'Jest'];
    focus: [
      'Menu synchronization flow',
      'Order processing workflow',
      'Configuration management',
      'Error recovery scenarios'
    ];
    environment: 'Staging environment with mock Careem API';
  };

  performanceTesting: {
    target: 'System performance under load';
    frameworks: ['K6', 'Artillery'];
    scenarios: [
      'High-volume order processing',
      'Concurrent menu synchronizations',
      'API rate limit testing',
      'Database performance under load'
    ];
    metrics: [
      'Response time < 2 seconds',
      'Throughput > 100 requests/second',
      'Error rate < 1%',
      'Resource utilization < 80%'
    ];
  };

  securityTesting: {
    target: 'Security vulnerabilities and compliance';
    frameworks: ['OWASP ZAP', 'Snyk'];
    focus: [
      'Webhook signature validation',
      'Input validation and sanitization',
      'Authentication and authorization',
      'Data encryption and storage'
    ];
    compliance: 'GDPR, PCI-DSS considerations';
  };
}
```

**Quality Gates:**

```typescript
interface QualityGates {
  development: {
    codeReview: 'Required for all pull requests';
    testCoverage: 'Minimum 90% unit test coverage';
    linting: 'ESLint and Prettier compliance';
    security: 'Snyk vulnerability scanning';
  };

  staging: {
    integrationTests: 'All integration tests passing';
    e2eTests: 'Critical user journeys validated';
    performanceTests: 'Load testing within acceptable limits';
    securityScan: 'Security vulnerability assessment';
  };

  production: {
    manualTesting: 'Manual testing sign-off';
    stakeholderApproval: 'Business stakeholder approval';
    rollbackPlan: 'Tested rollback procedures';
    monitoring: 'Production monitoring setup verified';
  };
}
```

---

## Success Metrics

### Technical Performance Indicators

**System Reliability:**

```typescript
interface ReliabilityMetrics {
  availability: {
    target: '99.9% uptime';
    measurement: 'Monthly availability percentage';
    alertThreshold: '< 99.5%';
    consequences: 'Immediate investigation and resolution';
  };

  responseTime: {
    apiEndpoints: {
      target: '< 2 seconds average';
      measurement: '95th percentile response time';
      alertThreshold: '> 3 seconds';
    };
    webhookProcessing: {
      target: '< 5 seconds processing time';
      measurement: 'End-to-end webhook handling';
      alertThreshold: '> 10 seconds';
    };
    menuSync: {
      target: '< 5 minutes for full sync (500 items)';
      measurement: 'Complete sync operation time';
      alertThreshold: '> 10 minutes';
    };
  };

  errorRates: {
    overall: {
      target: '< 1% error rate';
      measurement: 'Errors per total requests';
      alertThreshold: '> 2%';
    };
    critical: {
      target: '< 0.1% critical errors';
      measurement: 'Order processing failures';
      alertThreshold: '> 0.5%';
    };
  };
}
```

**Data Accuracy:**

```typescript
interface AccuracyMetrics {
  menuSync: {
    successRate: {
      target: '> 99% sync success rate';
      measurement: 'Successfully synced items / total items';
      alertThreshold: '< 95%';
    };

    dataConsistency: {
      target: '> 99.9% data consistency';
      measurement: 'Automated consistency checks';
      frequency: 'Daily reconciliation reports';
    };
  };

  orderProcessing: {
    accuracyRate: {
      target: '> 99.5% order accuracy';
      measurement: 'Correctly processed orders / total orders';
      validation: 'Customer complaint tracking';
    };

    statusSync: {
      target: '> 99% status sync accuracy';
      measurement: 'Successful status updates / total attempts';
      alertThreshold: '< 95%';
    };
  };
}
```

### Business Success Metrics

**Revenue Growth:**

```typescript
interface RevenueMetrics {
  orderVolume: {
    target: '25% increase in total orders within 3 months';
    measurement: 'Monthly order count comparison';
    breakdown: {
      careemOrders: 'Track Careem-specific order volume';
      organicGrowth: 'Monitor non-Careem order growth';
      seasonalAdjustment: 'Account for seasonal variations';
    };
  };

  revenueGrowth: {
    target: '15% net revenue increase after commissions';
    measurement: 'Monthly revenue comparison';
    components: {
      grossRevenue: 'Total revenue including Careem orders';
      commissionCosts: 'Careem commission expenses';
      netImpact: 'Revenue growth minus commission costs';
    };
  };

  averageOrderValue: {
    target: 'Maintain or increase AOV';
    measurement: 'Monthly AOV tracking by platform';
    analysis: {
      platformComparison: 'Careem vs direct orders AOV';
      categoryAnalysis: 'High-value menu items performance';
      promotionImpact: 'Effect of promotions on AOV';
    };
  };
}
```

**Customer Satisfaction:**

```typescript
interface CustomerSatisfactionMetrics {
  orderAccuracy: {
    target: '> 98% order accuracy rating';
    measurement: 'Customer complaint tracking';
    sources: [
      'Careem customer ratings',
      'Direct customer feedback',
      'Order modification requests'
    ];
  };

  deliveryPerformance: {
    target: 'Meet or exceed Careem SLA requirements';
    metrics: [
      'Order preparation time vs estimates',
      'Ready-for-pickup notification accuracy',
      'Order quality ratings'
    ];
  };

  customerRatings: {
    target: '> 4.5/5.0 average rating on Careem';
    measurement: 'Monthly rating aggregation';
    improvement: 'Response to negative feedback within 24 hours';
  };
}
```

**Operational Efficiency:**

```typescript
interface OperationalMetrics {
  automation: {
    autoOrderProcessing: {
      target: '> 95% orders processed automatically';
      measurement: 'Orders requiring manual intervention';
      breakdown: 'Categorize manual intervention reasons';
    };

    syncAutomation: {
      target: '> 99% automated sync success';
      measurement: 'Syncs requiring manual intervention';
      monitoring: 'Real-time sync failure alerts';
    };
  };

  staffEfficiency: {
    trainingTime: {
      target: '< 2 hours training per staff member';
      measurement: 'Onboarding time tracking';
      materials: 'Comprehensive training documentation';
    };

    timesavings: {
      target: '2+ hours daily time savings per restaurant';
      measurement: 'Before/after operational time comparison';
      activities: 'Eliminated manual order entry and management';
    };
  };

  systemMaintenance: {
    maintenanceTime: {
      target: '< 1 hour monthly planned maintenance';
      measurement: 'Scheduled maintenance duration';
      impact: 'Minimize business disruption';
    };

    issueResolution: {
      target: '< 2 hours average resolution time';
      measurement: 'Time from issue detection to resolution';
      escalation: 'Clear escalation procedures for critical issues';
    };
  };
}
```

### Monitoring and Alerting Requirements

**Real-time Monitoring:**

```typescript
interface MonitoringRequirements {
  applicationMetrics: {
    responseTime: 'API endpoint response times';
    throughput: 'Requests per second by endpoint';
    errorRate: 'Error percentage by service';
    activeConnections: 'WebSocket connections count';
  };

  businessMetrics: {
    orderFlow: 'Real-time order processing rate';
    syncStatus: 'Menu synchronization health';
    revenueTracking: 'Hourly revenue by platform';
    customerSatisfaction: 'Rating trends and alerts';
  };

  infrastructureMetrics: {
    serverHealth: 'CPU, memory, disk usage';
    databasePerformance: 'Query performance and connections';
    networkLatency: 'API response times to Careem';
    storageUtilization: 'Database and file storage usage';
  };
}
```

**Alert Configuration:**

```typescript
interface AlertConfiguration {
  critical: {
    integrationDown: {
      condition: 'Careem API connectivity lost > 5 minutes';
      notification: ['email', 'sms', 'slack'];
      recipients: ['on-call engineer', 'technical lead'];
      escalation: 'CTO after 15 minutes';
    };

    orderProcessingFailure: {
      condition: 'Order processing error rate > 5%';
      notification: ['email', 'slack'];
      recipients: ['operations team', 'technical team'];
      escalation: 'Management after 30 minutes';
    };
  };

  warning: {
    performanceDegradation: {
      condition: 'API response time > 3 seconds';
      notification: ['slack'];
      recipients: ['technical team'];
      escalation: 'After 1 hour sustained';
    };

    syncFailures: {
      condition: 'Menu sync failures > 3 in 1 hour';
      notification: ['email'];
      recipients: ['operations team'];
      escalation: 'Technical team after 3 hours';
    };
  };

  informational: {
    highVolume: {
      condition: 'Order volume > 150% of average';
      notification: ['slack'];
      recipients: ['operations team'];
      purpose: 'Capacity planning and optimization';
    };
  };
}
```

---

## Conclusion

This Product Requirements Document provides comprehensive specifications for implementing Careem Now integration within the Restaurant Platform v2. The integration represents a strategic opportunity to expand into high-value Middle Eastern markets while leveraging proven technical patterns and established platform architecture.

**Key Success Factors:**

1. **Technical Excellence**: Robust integration built on proven patterns from Picolinate analysis
2. **Business Value**: Clear revenue growth and operational efficiency benefits
3. **User Experience**: Seamless integration that enhances rather than complicates operations
4. **Scalability**: Architecture designed for multi-market expansion and high volume
5. **Reliability**: Production-grade system with comprehensive monitoring and error handling

**Implementation Readiness:**

✅ **Technical Architecture**: Complete system design with proven integration patterns
✅ **Database Schema**: Comprehensive data model with performance optimizations
✅ **API Specifications**: Detailed endpoint requirements with security considerations
✅ **Business Logic**: Complete workflow definitions and business rules
✅ **Testing Strategy**: Comprehensive QA approach with automated testing
✅ **Success Metrics**: Clear KPIs for technical and business performance measurement

**Next Steps:**

1. **Partnership Application**: Initiate Careem partner application process immediately
2. **Team Assembly**: Assemble development team and allocate resources
3. **Environment Setup**: Prepare development, staging, and production environments
4. **Development Kickoff**: Begin Phase 1 implementation following this specification

**Expected Outcomes:**

- **Revenue Growth**: 15-25% increase in net revenue within 6 months
- **Market Expansion**: Entry into UAE, KSA, and Jordan markets
- **Operational Efficiency**: Significant reduction in manual processes
- **Competitive Advantage**: Parity with major restaurant chains on Careem platform
- **Foundation for Growth**: Scalable platform for additional marketplace integrations

This PRD serves as the definitive guide for stakeholders, developers, and business teams to successfully implement and launch the Careem integration, establishing a strong foundation for Middle Eastern market expansion and revenue growth.

---

**Document Approval:**

- **Technical Lead**: _________________ Date: _________
- **Product Manager**: _________________ Date: _________
- **Business Stakeholder**: _________________ Date: _________
- **Operations Manager**: _________________ Date: _________

**Document Version**: 1.0
**Last Updated**: September 24, 2025
**Next Review**: December 24, 2025
**Status**: Approved for Development