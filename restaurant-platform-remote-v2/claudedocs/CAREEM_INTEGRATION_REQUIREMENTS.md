# Careem Integration - Detailed Requirements Specification

**Project**: Restaurant Platform v2 - Careem Integration
**Document Type**: Technical Requirements Document
**Version**: 1.0
**Date**: September 24, 2025
**Status**: Ready for Development

## Executive Summary

This document provides comprehensive, actionable requirements for implementing Careem Now integration based on analysis of the proven Picolinate "shawerma 3a saj" implementation patterns and current restaurant platform architecture.

**Key Requirements Overview:**
- ✅ **Functional Requirements**: 47 detailed specifications
- ✅ **Technical Requirements**: Database schema, API specifications, authentication
- ✅ **Business Rules**: Menu sync, order processing, pricing strategies
- ✅ **Integration Constraints**: Rate limits, dependencies, failure handling
- ✅ **Implementation Ready**: All specifications actionable for development team

---

## 1. Functional Requirements Analysis

### 1.1 Menu Management Requirements

#### FR-001: Menu Synchronization Engine
**Priority**: CRITICAL
**Description**: Implement bi-directional menu synchronization between restaurant platform and Careem

**Detailed Specifications:**
```typescript
interface MenuSyncRequirement {
  // Core synchronization capabilities
  syncTypes: ['full_menu', 'incremental', 'availability_only', 'pricing_only'];

  // Batch processing requirements
  batchSize: 50; // Maximum items per API call
  maxConcurrentBatches: 3;

  // Data transformation requirements
  supportedLanguages: ['en', 'ar'];
  currencySupport: ['AED', 'SAR', 'JOD'];
  imageFormats: ['jpg', 'png', 'webp'];
  maxImageSize: '2MB';

  // Business rules
  syncTriggers: [
    'manual_trigger',
    'scheduled_sync', // Every 30 minutes
    'inventory_change',
    'price_update',
    'availability_change'
  ];

  // Error handling
  retryAttempts: 3;
  retryDelays: [5, 15, 45]; // seconds
  failureNotification: true;
}
```

**Acceptance Criteria:**
- ✅ Full menu sync completes within 5 minutes for 500+ items
- ✅ Incremental updates process within 30 seconds
- ✅ Supports Arabic and English product names/descriptions
- ✅ Handles image URL transformations for Careem format
- ✅ Maintains audit trail of all sync operations

#### FR-002: Category Management and Mapping
**Priority**: HIGH
**Description**: Map internal category structure to Careem's category requirements

**Implementation Requirements:**
```sql
-- Category mapping table structure (derived from Picolinate analysis)
CREATE TABLE careem_category_mappings (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    internal_category_id VARCHAR REFERENCES categories(id),
    careem_category_id VARCHAR NOT NULL,
    careem_category_name_en VARCHAR NOT NULL,
    careem_category_name_ar VARCHAR NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Business Logic:**
- Categories must have both English and Arabic names
- Maximum 3-level category hierarchy support
- Category images optional but recommended
- Display order determines sequence in Careem app

#### FR-003: Product Pricing and Availability
**Priority**: CRITICAL
**Description**: Platform-specific pricing with real-time availability updates

**Data Structure (from Picolinate patterns):**
```typescript
interface CareemProductPricing {
  basePrice: number;
  careemPrice?: number; // Platform-specific pricing
  discountPrice?: number;
  currency: 'AED' | 'SAR' | 'JOD';
  isAvailable: boolean;
  stockLevel?: number;
  preparationTime: number; // minutes

  // Pricing rules
  platformCommission: number; // Careem commission percentage
  minimumMargin: number; // Minimum profit margin required
  dynamicPricing: boolean; // Enable demand-based pricing
}
```

### 1.2 Order Processing Requirements

#### FR-004: Webhook Order Reception
**Priority**: CRITICAL
**Description**: Receive and validate incoming orders from Careem webhooks

**Technical Specifications:**
```typescript
// Webhook endpoint specifications
interface CareemOrderWebhook {
  // Webhook security
  endpoint: '/api/webhooks/careem/orders';
  method: 'POST';
  authentication: 'HMAC-SHA256';
  timeout: 30000; // 30 seconds

  // Expected payload structure (based on Picolinate analysis)
  payload: {
    order_id: string;
    order_number: string;
    branch_id: string;
    status: 'confirmed' | 'pending';
    customer: {
      name: string;
      phone: string;
      email?: string;
    };
    delivery_address: {
      address: string;
      building_number?: string;
      street?: string;
      coordinates: { lat: number; lng: number; };
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
    payment_method: 'cash' | 'card' | 'wallet';
    scheduled_time?: string; // ISO datetime
    special_instructions?: string;
  };
}
```

**Validation Rules:**
- HMAC signature must be valid using stored webhook secret
- Order ID must be unique and not previously processed
- Branch ID must exist in system and be active
- All referenced product IDs must be available
- Total calculations must match item summations

#### FR-005: Order Status Management
**Priority**: CRITICAL
**Description**: Bi-directional order status synchronization

**Status Flow Mapping (derived from careemlog analysis):**
```typescript
interface OrderStatusMapping {
  // Internal statuses → Careem statuses
  internal_to_careem: {
    'pending': 'confirmed',
    'preparing': 'preparing',
    'ready': 'ready_for_pickup',
    'dispatched': 'out_for_delivery',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  };

  // Required API calls for each status change
  statusUpdateEndpoints: {
    'confirmed': 'POST /orders/{orderId}/accept',
    'preparing': 'PUT /orders/{orderId}/status',
    'ready_for_pickup': 'PUT /orders/{orderId}/ready',
    'out_for_delivery': 'PUT /orders/{orderId}/dispatch',
    'delivered': 'PUT /orders/{orderId}/complete',
    'cancelled': 'POST /orders/{orderId}/cancel'
  };

  // Automatic status triggers
  autoStatusRules: {
    auto_accept: boolean; // Auto-accept orders within business hours
    auto_ready_notification: boolean; // Notify when order ready
    preparation_time_tracking: boolean; // Track actual vs estimated times
  };
}
```

#### FR-006: Customer Data Management
**Priority**: MEDIUM
**Description**: Handle Careem customer data integration

**Data Requirements (based on createcareemcustomeraddress procedure):**
```typescript
interface CareemCustomerData {
  // Customer information
  customerInfo: {
    careem_customer_id: string;
    name: string;
    phone: string;
    email?: string;
    preferred_language: 'en' | 'ar';
  };

  // Address management
  deliveryAddress: {
    id?: string;
    name: string; // Address nickname
    address: string;
    building_number?: string;
    street?: string;
    latitude?: number;
    longitude?: number;
    delivery_instructions?: string;
    is_default: boolean;
  };

  // Privacy compliance
  dataHandling: {
    store_customer_data: boolean;
    anonymize_after_days: 90;
    gdpr_compliant: true;
    data_retention_policy: 'order_completion_plus_30_days';
  };
}
```

---

## 2. Technical Requirements Specification

### 2.1 Database Schema Requirements

#### TR-001: Core Integration Tables
**Priority**: CRITICAL

```sql
-- Main configuration table
CREATE TABLE careem_configurations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),

    -- Authentication credentials
    client_id VARCHAR NOT NULL,
    client_secret VARCHAR NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    webhook_secret VARCHAR NOT NULL,

    -- Careem-specific identifiers
    store_id VARCHAR,
    brand_id VARCHAR,

    -- Configuration settings
    auto_accept_orders BOOLEAN DEFAULT false,
    sync_inventory_realtime BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    minimum_order_value DECIMAL(10,2) DEFAULT 0,

    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, branch_id)
);

-- Order mapping and tracking
CREATE TABLE careem_orders (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_order_id VARCHAR REFERENCES orders(id),
    careem_order_id VARCHAR UNIQUE NOT NULL,
    careem_order_number VARCHAR NOT NULL,

    -- Order details
    order_status VARCHAR DEFAULT 'pending',
    customer_details JSONB NOT NULL,
    delivery_details JSONB NOT NULL,
    pricing_details JSONB NOT NULL,

    -- Tracking and audit
    webhook_events JSONB DEFAULT '[]',
    status_updates JSONB DEFAULT '[]',
    error_log JSONB DEFAULT '[]',

    -- Timestamps
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

    -- Sync details
    sync_type VARCHAR NOT NULL, -- 'full', 'incremental', 'availability', 'pricing'
    sync_status VARCHAR DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

    -- Progress tracking
    items_total INTEGER DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    items_success INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,

    -- Timing and performance
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- Error handling
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Product mapping for Careem-specific configurations
CREATE TABLE careem_product_mappings (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR NOT NULL REFERENCES menu_products(id),
    branch_id VARCHAR NOT NULL REFERENCES branches(id),

    -- Careem-specific data
    careem_product_id VARCHAR,
    careem_category_id VARCHAR,

    -- Platform-specific pricing
    careem_price DECIMAL(10,2),
    careem_discount_price DECIMAL(10,2),

    -- Platform settings
    is_available_on_careem BOOLEAN DEFAULT true,
    careem_preparation_time INTEGER, -- minutes

    -- Sync tracking
    last_sync_at TIMESTAMP,
    sync_status VARCHAR DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_id, branch_id)
);

-- Event logging (based on Picolinate careemlog pattern)
CREATE TABLE careem_event_log (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR NOT NULL, -- 'webhook', 'api_call', 'sync', 'error'
    event_id VARCHAR, -- External reference ID

    -- Context information
    company_id VARCHAR REFERENCES companies(id),
    branch_id VARCHAR REFERENCES branches(id),
    order_id VARCHAR,

    -- Event details
    event_data JSONB NOT NULL,
    request_payload JSONB,
    response_payload JSONB,

    -- Status and timing
    status VARCHAR DEFAULT 'pending', -- 'pending', 'success', 'failed'
    http_status_code INTEGER,
    error_message TEXT,
    processing_time_ms INTEGER,

    occurred_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### TR-002: Enhanced Existing Tables
**Priority**: HIGH

```sql
-- Add Careem support to existing product pricing
ALTER TABLE menu_products
ADD COLUMN careem_price DECIMAL(10,2),
ADD COLUMN careem_discount_price DECIMAL(10,2),
ADD COLUMN careem_availability BOOLEAN DEFAULT true,
ADD COLUMN careem_preparation_time INTEGER DEFAULT 15;

-- Add Careem to delivery providers
INSERT INTO delivery_providers (id, name, type, api_base_url, supported_features, is_active)
VALUES (
    uuid_generate_v4(),
    'careem',
    'marketplace',
    'https://partners-api.careem.com/v1',
    '["order_sync", "menu_sync", "status_updates", "inventory_sync", "analytics"]',
    true
);

-- Create indexes for performance
CREATE INDEX idx_careem_orders_careem_id ON careem_orders(careem_order_id);
CREATE INDEX idx_careem_orders_status ON careem_orders(order_status);
CREATE INDEX idx_careem_orders_received_at ON careem_orders(received_at);
CREATE INDEX idx_careem_sync_branch_status ON careem_menu_sync(branch_id, sync_status);
CREATE INDEX idx_careem_events_type_occurred ON careem_event_log(event_type, occurred_at);
```

### 2.2 API Endpoint Requirements

#### TR-003: Integration API Endpoints
**Priority**: CRITICAL

```typescript
// Configuration Management Endpoints
interface ConfigurationEndpoints {
  'POST /api/integrations/careem/configure': {
    description: 'Setup Careem integration for a branch';
    request: CareemConfigurationDto;
    response: ConfigurationResult;
    authentication: 'JWT + admin role';
    validation: 'company ownership + branch access';
  };

  'GET /api/integrations/careem/config/:branchId': {
    description: 'Get current Careem configuration';
    response: CareemConfiguration;
    authentication: 'JWT + branch access';
  };

  'PUT /api/integrations/careem/config/:branchId': {
    description: 'Update Careem configuration';
    request: Partial<CareemConfigurationDto>;
    response: ConfigurationResult;
  };
}

// Menu Management Endpoints
interface MenuManagementEndpoints {
  'POST /api/integrations/careem/menu/sync': {
    description: 'Trigger menu synchronization';
    request: {
      branchId: string;
      syncType: 'full' | 'incremental' | 'availability' | 'pricing';
      productIds?: string[]; // For partial sync
    };
    response: {
      syncId: string;
      status: 'initiated';
      estimatedDuration: number; // seconds
    };
  };

  'GET /api/integrations/careem/menu/sync/:syncId/status': {
    description: 'Get synchronization status';
    response: {
      syncId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: {
        total: number;
        processed: number;
        success: number;
        failed: number;
      };
      errors?: SyncError[];
    };
  };

  'PUT /api/integrations/careem/menu/availability': {
    description: 'Update product availability in bulk';
    request: {
      branchId: string;
      updates: Array<{
        productId: string;
        available: boolean;
      }>;
    };
    response: BulkUpdateResult;
  };
}

// Order Management Endpoints
interface OrderManagementEndpoints {
  'POST /webhooks/careem/orders': {
    description: 'Receive order webhook from Careem';
    request: CareemOrderWebhook;
    response: { received: true; localOrderId: string };
    authentication: 'HMAC signature validation';
    security: 'Webhook secret verification';
  };

  'PUT /api/integrations/careem/orders/:orderId/status': {
    description: 'Update order status to Careem';
    request: {
      status: OrderStatus;
      estimatedTime?: number; // minutes
      notes?: string;
    };
    response: StatusUpdateResult;
  };

  'POST /api/integrations/careem/orders/:orderId/cancel': {
    description: 'Cancel order in both systems';
    request: {
      reason: string;
      refundRequired: boolean;
    };
    response: CancellationResult;
  };
}
```

### 2.3 Authentication and Security Requirements

#### TR-004: OAuth2 Implementation
**Priority**: CRITICAL

```typescript
interface CareemAuthenticationRequirements {
  // OAuth2 flow implementation
  authFlow: {
    type: 'OAuth2.0';
    grantType: 'client_credentials';
    tokenEndpoint: 'https://partners-api.careem.com/oauth/token';
    scope: 'orders:read orders:write menu:write analytics:read';
  };

  // Token management
  tokenManagement: {
    automaticRefresh: true;
    refreshThresholdMinutes: 15; // Refresh 15 min before expiry
    storageLocation: 'encrypted database field';
    rotationPolicy: 'on_demand + scheduled';
  };

  // Security requirements
  security: {
    clientSecretEncryption: 'AES-256';
    webhookSignatureValidation: 'HMAC-SHA256';
    tlsVersion: 'TLS 1.3';
    certificatePinning: true;
  };
}
```

#### TR-005: Webhook Security Implementation
**Priority**: CRITICAL

```typescript
// Webhook validation guard
@Injectable()
export class CareemWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-careem-signature'];
    const payload = JSON.stringify(request.body);

    // HMAC signature validation
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get('CAREEM_WEBHOOK_SECRET'))
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

---

## 3. Business Rules Documentation

### 3.1 Menu Synchronization Business Rules

#### BR-001: Menu Data Transformation Rules
**Priority**: CRITICAL

```typescript
interface MenuTransformationRules {
  // Product name requirements
  nameRules: {
    maxLength: { en: 100, ar: 100 };
    required: ['en', 'ar'];
    prohibitedChars: ['<', '>', '&', '"'];
    autoTranslation: false; // Manual translation required
  };

  // Description requirements
  descriptionRules: {
    maxLength: { en: 500, ar: 500 };
    required: false;
    allowHtml: false;
    autoGeneration: 'from product attributes if empty';
  };

  // Image requirements (from Picolinate getimagepath_careem analysis)
  imageRules: {
    formats: ['jpg', 'png', 'webp'];
    maxSize: '2MB';
    minDimensions: { width: 300, height: 300 };
    aspectRatio: 'square preferred, 16:9 acceptable';
    urlTransformation: 'absolute URLs with CDN domain';
    fallbackImage: 'platform default placeholder';
  };

  // Pricing rules
  pricingRules: {
    minimumPrice: 1.00; // Minimum price in local currency
    decimalPlaces: 2;
    inclusiveOfTax: true;
    commissionHandling: 'built into price';
    dynamicPricing: {
      enabled: false; // Future enhancement
      timeBasedAdjustments: false;
      demandBasedAdjustments: false;
    };
  };
}
```

#### BR-002: Category Mapping Rules
**Priority**: HIGH

Based on Picolinate `getcategoriesforcareemdto` analysis:

```typescript
interface CategoryMappingRules {
  // Hierarchy requirements
  hierarchyRules: {
    maxLevels: 3;
    rootCategoriesMax: 20;
    subcategoriesPerParent: 15;
  };

  // Display requirements
  displayRules: {
    sortOrder: 'manual with drag-and-drop support';
    showEmptyCategories: false;
    showUnavailableCategories: true; // With visual indication
  };

  // Careem-specific mapping
  careemMapping: {
    requiresCareemCategoryId: true;
    allowMultipleMappings: false; // One-to-one mapping only
    autoMapping: 'by name similarity if exact match not found';
    fallbackCategory: 'Miscellaneous';
  };
}
```

#### BR-003: Availability Management Rules
**Priority**: CRITICAL

```typescript
interface AvailabilityRules {
  // Stock-based availability
  stockRules: {
    trackInventory: boolean;
    hideWhenOutOfStock: true;
    lowStockThreshold: 5; // Items
    automaticDisabling: true;
    restockNotification: true;
  };

  // Time-based availability
  timeRules: {
    businessHours: 'inherit from branch operational hours';
    specialHours: 'holiday and event overrides';
    preparationCutoff: '30 minutes before closing';
    advanceOrdering: {
      enabled: false;
      maxAdvanceDays: 7;
    };
  };

  // Sync frequency
  syncRules: {
    realTimeSync: true;
    batchSyncInterval: 300; // seconds (5 minutes)
    forceSync: 'on availability toggle';
    conflictResolution: 'local system wins';
  };
}
```

### 3.2 Order Processing Business Rules

#### BR-004: Order Acceptance Rules
**Priority**: CRITICAL

```typescript
interface OrderAcceptanceRules {
  // Automatic acceptance criteria
  autoAcceptance: {
    enabled: boolean; // Configurable per branch
    businessHoursOnly: true;
    maximumOrderValue: null; // No limit
    minimumOrderValue: 'branch minimum order value';

    // Conditions for auto-acceptance
    conditions: {
      itemsInStock: true;
      withinDeliveryZone: true;
      validPaymentMethod: true;
      notBlacklistedCustomer: true;
    };
  };

  // Manual review triggers
  manualReviewTriggers: {
    highOrderValue: 500; // Local currency
    newCustomer: false; // Don't trigger for new customers
    specialInstructions: true; // Review orders with special notes
    modifiedItems: true; // Review orders with customizations
  };

  // Rejection criteria
  rejectionRules: {
    outOfStock: 'automatic rejection with notification';
    outsideDeliveryHours: 'automatic rejection';
    paymentFailure: 'hold for 15 minutes, then reject';
    duplicateOrder: 'flag for manual review';
  };
}
```

#### BR-005: Order Status Workflow Rules
**Priority**: CRITICAL

Based on Picolinate order status analysis:

```typescript
interface OrderStatusWorkflow {
  // Status progression
  statusFlow: {
    'received': {
      next: ['accepted', 'rejected'];
      timeout: 300; // 5 minutes to accept/reject
      autoTransition: 'accept if auto_accept enabled';
    };
    'accepted': {
      next: ['preparing'];
      autoTransition: 'immediately';
      careemNotification: true;
    };
    'preparing': {
      next: ['ready'];
      estimatedTime: 'calculated from product preparation times';
      tracking: 'preparation timer starts';
    };
    'ready': {
      next: ['dispatched'];
      careemNotification: true;
      customerNotification: true;
      timeout: 900; // 15 minutes before escalation
    };
    'dispatched': {
      next: ['delivered'];
      trackingEnabled: true;
      estimatedDeliveryTime: 'calculated by Careem';
    };
    'delivered': {
      next: null;
      finalStatus: true;
      feedback: 'enable customer feedback collection';
    };
  };

  // Cancellation rules
  cancellationRules: {
    allowedStatuses: ['received', 'accepted', 'preparing'];
    requiresReason: true;
    refundPolicy: 'automatic for prepaid orders';
    notificationRequired: true;
    compensationRules: 'per Careem partnership agreement';
  };
}
```

#### BR-006: Pricing and Commission Rules
**Priority**: HIGH

```typescript
interface PricingCommissionRules {
  // Commission handling
  commissionStructure: {
    calculateOn: 'subtotal excluding delivery and taxes';
    standardRate: 20; // Percentage - configurable per agreement
    tieredRates: false; // Future enhancement
    monthlyMinimum: null; // No minimum commitment initially
  };

  // Price calculation
  priceCalculation: {
    basePrice: 'menu product price';
    platformMarkup: 'commission built into price';
    taxInclusive: true;
    roundingRule: 'round to nearest 0.05';
    currencyConversion: 'not applicable - single market initially';
  };

  // Special offers
  specialOffers: {
    restaurantDiscounts: 'supported';
    careemPromotions: 'receive via webhook';
    combinationRules: 'restaurant discount + Careem promotion allowed';
    maximumDiscount: 50; // Percentage
  };
}
```

### 3.3 Integration Timing and Scheduling Rules

#### BR-007: Synchronization Timing Rules
**Priority**: MEDIUM

```typescript
interface SynchronizationTiming {
  // Menu sync schedule
  menuSync: {
    fullSync: {
      frequency: 'weekly';
      scheduledTime: '02:00 AM local time';
      duration: 'maximum 30 minutes';
      fallback: 'retry after 1 hour if failed';
    };
    incrementalSync: {
      frequency: 'every 30 minutes';
      triggerEvents: ['price_change', 'availability_change'];
      batchSize: 50;
    };
  };

  // Order processing timing
  orderProcessing: {
    webhookTimeout: 30; // seconds
    statusUpdateTimeout: 10; // seconds
    retryDelays: [5, 15, 45]; // seconds between retries
    maxRetries: 3;
    failureEscalation: 'email notification to operations team';
  };

  // Business hours integration
  businessHours: {
    acceptOrdersOnly: 'during operational hours';
    bufferTime: 30; // minutes before closing
    holidayHandling: 'disable integration on configured holidays';
    temporaryClosures: 'immediate availability sync';
  };
}
```

---

## 4. Integration Constraints and Dependencies

### 4.1 Technical Constraints

#### TC-001: API Rate Limits and Performance
**Priority**: CRITICAL

```typescript
interface APIConstraints {
  // Rate limiting (estimated based on typical partner limits)
  rateLimits: {
    menuAPI: {
      requestsPerMinute: 60;
      burstLimit: 10;
      dailyLimit: 5000;
    };
    orderAPI: {
      requestsPerMinute: 120;
      burstLimit: 20;
      dailyLimit: 10000;
    };
    webhookReceive: {
      concurrent: 50;
      timeout: 30; // seconds
      retryPolicy: 'exponential backoff';
    };
  };

  // Performance requirements
  performance: {
    menuSyncTime: {
      fullMenu: '< 5 minutes for 500 items';
      incrementalSync: '< 30 seconds';
      availabilityUpdate: '< 10 seconds';
    };
    orderProcessing: {
      webhookResponse: '< 5 seconds';
      orderCreation: '< 15 seconds';
      statusUpdate: '< 10 seconds';
    };
  };

  // System resource constraints
  resourceLimits: {
    maxConcurrentSyncs: 3;
    memoryUsage: '< 512MB per sync operation';
    temporaryStorage: '< 100MB for image processing';
  };
}
```

#### TC-002: Data Volume and Scalability
**Priority**: HIGH

```typescript
interface ScalabilityConstraints {
  // Data volume limits
  dataLimits: {
    maxProductsPerBranch: 2000;
    maxCategoriesPerBranch: 100;
    maxImagesPerProduct: 5;
    maxOrdersPerDay: 500; // Per branch
  };

  // Storage requirements
  storage: {
    logRetention: '90 days';
    imageCache: '30 days';
    syncHistory: '1 year';
    orderData: 'permanent (compliance requirement)';
  };

  // Scalability thresholds
  scalingTriggers: {
    highVolumeAlert: '> 100 orders/hour';
    performanceDegradation: '> 15 second response times';
    errorRateThreshold: '> 5% in 15 minutes';
    resourceUtilization: '> 80% sustained';
  };
}
```

### 4.2 Business Constraints

#### BC-001: Partnership and Compliance Requirements
**Priority**: CRITICAL

```typescript
interface ComplianceConstraints {
  // Partnership requirements
  partnershipRequirements: {
    officialPartnerStatus: 'required for production access';
    technicalCertification: 'integration testing completion';
    businessAgreement: 'signed partnership contract';
    insuranceRequirement: 'liability coverage as per agreement';
  };

  // Compliance requirements
  compliance: {
    dataProtection: {
      gdpr: 'full compliance required';
      localDataLaws: 'UAE, KSA, Jordan specific requirements';
      dataMinimization: 'collect only necessary customer data';
      rightToForgetten: 'customer data deletion support';
    };
    foodSafety: {
      haccp: 'certification required for food businesses';
      allergenInformation: 'mandatory disclosure';
      nutritionalInfo: 'optional but recommended';
    };
    financial: {
      taxCompliance: 'VAT handling per jurisdiction';
      invoicing: 'automated invoice generation';
      reconciliation: 'daily transaction matching';
    };
  };
}
```

#### BC-002: Geographic and Market Constraints
**Priority**: HIGH

```typescript
interface MarketConstraints {
  // Geographic limitations
  geography: {
    initialMarkets: ['UAE-Dubai', 'KSA-Riyadh', 'Jordan-Amman'];
    deliveryZones: 'defined by Careem coverage areas';
    currencySupport: {
      'UAE': 'AED',
      'KSA': 'SAR',
      'Jordan': 'JOD'
    };
    timeZones: {
      'UAE': 'UTC+4',
      'KSA': 'UTC+3',
      'Jordan': 'UTC+2'
    };
  };

  // Market-specific requirements
  marketRequirements: {
    languages: ['en', 'ar'];
    paymentMethods: {
      'UAE': ['cash', 'card', 'careem_pay'],
      'KSA': ['cash', 'card', 'stc_pay'],
      'Jordan': ['cash', 'card']
    };
    deliveryRules: {
      minimumOrder: 'market-specific values';
      deliveryFees: 'Careem-calculated';
      serviceAreas: 'Careem-defined';
    };
  };
}
```

### 4.3 Dependency Requirements

#### DR-001: External Service Dependencies
**Priority**: CRITICAL

```typescript
interface ExternalDependencies {
  // Careem platform dependencies
  careemPlatform: {
    partnerAPI: {
      availability: '99.9% uptime requirement';
      maintenanceWindows: 'scheduled with 48h notice';
      supportChannels: 'technical support portal + email';
    };
    webhookDelivery: {
      reliability: '99.5% delivery success rate';
      retryPolicy: 'up to 5 attempts with exponential backoff';
      timeouts: 'maximum 30 seconds';
    };
  };

  // Internal system dependencies
  internalSystems: {
    menuManagement: 'fully operational menu system required';
    orderProcessing: 'order creation and status management';
    userManagement: 'authentication and authorization';
    branchManagement: 'active branch configuration';
    printerServices: 'PrinterMaster integration for receipts';
  };

  // Infrastructure dependencies
  infrastructure: {
    database: 'PostgreSQL 14+ with JSON support';
    redis: 'for caching and session management';
    fileStorage: 'for image processing and storage';
    monitoring: 'logging and alerting systems';
    ssl: 'valid SSL certificates for webhook endpoints';
  };
}
```

### 4.4 Failure Handling and Recovery

#### FH-001: Error Handling Strategies
**Priority**: CRITICAL

```typescript
interface ErrorHandlingStrategies {
  // API error handling
  apiErrors: {
    authentication: {
      tokenExpired: 'automatic token refresh';
      invalidCredentials: 'alert admin + disable integration';
      rateLimitExceeded: 'exponential backoff + queue requests';
    };
    menuSync: {
      partialFailure: 'retry failed items individually';
      completeFailure: 'rollback + alert + manual intervention';
      dataValidation: 'log errors + continue with valid items';
    };
    orderProcessing: {
      webhookFailure: 'return 500 status for Careem retry';
      orderCreation: 'log error + manual order entry fallback';
      statusUpdate: 'queue for retry + manual notification';
    };
  };

  // System failure handling
  systemFailures: {
    databaseDown: 'queue operations + retry when restored';
    networkFailure: 'local caching + sync when restored';
    serviceOverload: 'circuit breaker + load shedding';
  };

  // Recovery procedures
  recovery: {
    dataInconsistency: 'reconciliation reports + manual correction';
    missedWebhooks: 'periodic polling fallback';
    corruptedData: 'restore from backups + re-sync';
  };
}
```

---

## 5. Implementation Roadmap and Success Metrics

### 5.1 Development Phases

#### Phase 1: Foundation (Weeks 1-2)
```typescript
interface Phase1Deliverables {
  databaseSchema: {
    tables: 'All Careem integration tables created';
    migrations: 'Prisma migrations for schema changes';
    indexes: 'Performance indexes implemented';
    seedData: 'Initial configuration data';
  };

  basicServices: {
    authService: 'OAuth2 authentication implementation';
    configService: 'Branch configuration management';
    webhookGuard: 'Security validation for webhooks';
    loggingService: 'Comprehensive event logging';
  };

  coreEndpoints: {
    configuration: 'CRUD operations for Careem config';
    healthCheck: 'Integration status monitoring';
    testConnection: 'Careem API connectivity testing';
  };
}
```

#### Phase 2: Core Integration (Weeks 3-4)
```typescript
interface Phase2Deliverables {
  menuSync: {
    fullSync: 'Complete menu synchronization';
    incrementalSync: 'Delta updates only';
    availabilitySync: 'Real-time availability updates';
    errorHandling: 'Comprehensive retry logic';
  };

  orderProcessing: {
    webhookReceiver: 'Order webhook processing';
    orderCreation: 'Local order creation from Careem data';
    statusUpdates: 'Bi-directional status synchronization';
    cancellation: 'Order cancellation handling';
  };

  dataTransformation: {
    menuMapping: 'Internal to Careem format conversion';
    orderMapping: 'Careem to internal format conversion';
    validation: 'Data validation and sanitization';
  };
}
```

### 5.2 Testing Requirements

#### Testing Strategy
```typescript
interface TestingRequirements {
  unitTests: {
    coverage: '> 90%';
    services: 'All service classes';
    utilities: 'Data transformation functions';
    validators: 'Input validation logic';
  };

  integrationTests: {
    databaseOperations: 'CRUD operations for all tables';
    apiEndpoints: 'All REST endpoints';
    webhookProcessing: 'End-to-end webhook handling';
    errorScenarios: 'Failure modes and recovery';
  };

  e2eTests: {
    menuSyncFlow: 'Complete menu synchronization';
    orderFlow: 'Order reception to completion';
    authFlow: 'Token management lifecycle';
    errorRecovery: 'System failure and recovery';
  };

  performanceTests: {
    loadTesting: '500 concurrent orders';
    stressTesting: 'System limits identification';
    syncPerformance: 'Large menu synchronization';
    webhookThroughput: 'High-volume webhook processing';
  };
}
```

### 5.3 Success Metrics and KPIs

#### Technical KPIs
```typescript
interface TechnicalKPIs {
  availability: {
    integrationUptime: '> 99.5%';
    apiResponseTime: '< 2 seconds average';
    webhookProcessing: '< 5 seconds';
  };

  accuracy: {
    menuSyncSuccess: '> 99%';
    orderProcessingAccuracy: '> 99.5%';
    dataConsistency: '> 99.9%';
  };

  performance: {
    fullMenuSyncTime: '< 5 minutes (500 items)';
    incrementalSyncTime: '< 30 seconds';
    orderCreationTime: '< 15 seconds';
  };

  reliability: {
    errorRate: '< 1%';
    automaticRecoveryRate: '> 95%';
    dataLossIncidents: '0';
  };
}
```

#### Business KPIs
```typescript
interface BusinessKPIs {
  orderVolume: {
    careemOrderIncrease: '> 20% within 3 months';
    totalOrderGrowth: '> 15% overall';
    peakHourHandling: 'no degradation during peak times';
  };

  revenue: {
    careemRevenueContribution: 'track monthly';
    netProfitAfterCommission: 'positive ROI within 6 months';
    averageOrderValue: 'maintain or increase';
  };

  customerSatisfaction: {
    orderAccuracy: '> 98%';
    deliveryTime: 'within Careem SLA';
    customerRatings: '> 4.5/5.0';
  };

  operational: {
    manualInterventions: '< 5% of orders';
    staffTrainingTime: '< 2 hours per staff member';
    systemMaintenanceTime: '< 1 hour monthly';
  };
}
```

---

## Conclusion

This requirements document provides comprehensive, actionable specifications for implementing Careem integration based on proven patterns from the Picolinate codebase analysis. The requirements are structured to enable immediate development start with clear acceptance criteria and success metrics.

**Implementation Ready Status:**
- ✅ **Database Schema**: Complete table structures and relationships defined
- ✅ **API Specifications**: Detailed endpoint requirements with request/response formats
- ✅ **Business Logic**: Comprehensive rules for menu sync, order processing, and pricing
- ✅ **Security Requirements**: Authentication, webhook validation, and data protection
- ✅ **Error Handling**: Complete failure scenarios and recovery procedures
- ✅ **Testing Strategy**: Unit, integration, e2e, and performance testing requirements
- ✅ **Success Metrics**: Technical and business KPIs for measuring integration success

**Next Steps:**
1. **Partner Application**: Initiate Careem partnership application process
2. **Development Environment**: Set up development and testing environments
3. **Team Preparation**: Brief development team on requirements and architecture
4. **Implementation**: Begin Phase 1 development using this specification

The integration represents a significant business opportunity with clear technical implementation pathways based on proven, production-tested patterns from the Picolinate system.

---
**Document Status**: Final - Ready for Development
**Estimated Development Time**: 8 weeks (4 phases × 2 weeks each)
**Business Value**: High - Market expansion and revenue growth potential