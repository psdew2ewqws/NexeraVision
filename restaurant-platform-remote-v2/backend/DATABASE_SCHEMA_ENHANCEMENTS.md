# Database Schema Enhancements - Picolinate Patterns Implementation

## Overview

Based on analysis of the Picolinate architecture, this document outlines the database schema enhancements implemented for the restaurant platform to improve platform synchronization, delivery provider management, and multi-tenant capabilities.

## New Models Added

### 1. MenuIntegrationSync
**Purpose**: Track platform sync status between menus and delivery platforms
**Table**: `menu_integration_sync`

```sql
-- Tracks sync status for menu items across different platforms
CREATE TABLE menu_integration_sync (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform_menu_id VARCHAR NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
    platform_type VARCHAR NOT NULL, -- careem, talabat, etc.
    branch_id VARCHAR REFERENCES branches(id) ON DELETE CASCADE,
    is_sync BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR DEFAULT 'pending', -- pending, syncing, completed, failed
    sync_progress DECIMAL DEFAULT 0, -- 0-100%
    items_synced INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    platform_specific_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_by VARCHAR,
    updated_by VARCHAR,
    deleted_by VARCHAR
);
```

**Key Features**:
- Multi-tenant isolation via `company_id`
- Branch-specific sync tracking
- Progress monitoring (0-100%)
- Error handling with retry logic
- Platform-specific configuration storage
- Soft deletion support

### 2. BranchDeliveryProvider
**Purpose**: Junction table connecting branches to delivery providers with priority and configuration
**Table**: `branch_delivery_providers`

```sql
-- Connects branches to delivery providers with priority and distance settings
CREATE TABLE branch_delivery_providers (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    delivery_provider_id VARCHAR NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1, -- 1 = highest priority
    max_distance DECIMAL(8,2) DEFAULT 15.00, -- km
    is_active BOOLEAN DEFAULT true,
    min_order_value DECIMAL(10,2),
    max_order_value DECIMAL(10,2),
    base_fee DECIMAL(8,2) DEFAULT 0.00,
    fee_per_km DECIMAL(8,2) DEFAULT 0.50,
    estimated_delivery_time INTEGER DEFAULT 30, -- minutes
    supported_payment_methods TEXT[] DEFAULT '{}',
    operating_hours JSONB, -- branch-specific hours for this provider
    delivery_zones JSONB, -- specific zones served
    provider_configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_by VARCHAR,
    updated_by VARCHAR,
    deleted_by VARCHAR,
    UNIQUE(branch_id, delivery_provider_id)
);
```

**Key Features**:
- Priority-based provider selection
- Distance and order value limits
- Branch-specific delivery configurations
- Operating hours per provider per branch
- Delivery zone management
- Comprehensive pricing configuration

### 3. BranchPlatformMenu
**Purpose**: Assign menus to specific branches with customizations per platform
**Table**: `branch_platform_menus`

```sql
-- Assigns platform menus to branches with branch-specific customizations
CREATE TABLE branch_platform_menus (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    platform_menu_id VARCHAR NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
    platform_type VARCHAR NOT NULL, -- careem, talabat, website, etc.
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- display priority
    customizations JSONB DEFAULT '{}', -- branch-specific menu customizations
    price_overrides JSONB DEFAULT '{}', -- branch-specific pricing
    availability_overrides JSONB DEFAULT '{}', -- branch-specific availability
    display_config JSONB DEFAULT '{}', -- branch-specific display settings
    last_assigned_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_by VARCHAR,
    updated_by VARCHAR,
    deleted_by VARCHAR,
    UNIQUE(branch_id, platform_menu_id, platform_type)
);
```

**Key Features**:
- Branch-specific menu assignments
- Platform-specific customizations
- Price and availability overrides
- Display configuration management
- Multi-platform support per branch

### 4. PlatformIntegrationLog
**Purpose**: Comprehensive logging for all platform integration activities
**Table**: `platform_integration_logs`

```sql
-- Comprehensive logging for platform integration activities
CREATE TABLE platform_integration_logs (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR REFERENCES branches(id) ON DELETE CASCADE,
    platform_type VARCHAR NOT NULL,
    sync_type VARCHAR NOT NULL, -- menu, products, categories, availability, prices
    sync_status VARCHAR NOT NULL, -- initiated, in_progress, completed, failed
    entity_type VARCHAR, -- product, category, modifier
    entity_id VARCHAR,
    external_id VARCHAR, -- platform-specific entity ID
    request_payload JSONB,
    response_payload JSONB,
    error_code VARCHAR,
    error_message TEXT,
    processing_time_ms INTEGER,
    retry_attempt INTEGER DEFAULT 0,
    correlation_id VARCHAR, -- to group related sync operations
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Features**:
- Comprehensive audit trail
- Performance monitoring
- Error tracking with payloads
- Correlation ID for grouped operations
- Multi-entity type support

## Enhanced Existing Models

### 1. MenuCategory
**Added Fields**:
- `deleted_by VARCHAR` - Track who performed soft deletion
- Index on `deleted_at` for performance

### 2. DeliveryProvider
**Added Fields**:
- `deleted_at TIMESTAMP` - Soft deletion timestamp
- `created_by VARCHAR` - Track creator
- `updated_by VARCHAR` - Track last updater
- `deleted_by VARCHAR` - Track who performed soft deletion
- Index on `deleted_at` for performance

### 3. Relations Added
**Company Model**:
- `menuIntegrationSyncs MenuIntegrationSync[]`
- `branchDeliveryProviders BranchDeliveryProvider[]`
- `branchPlatformMenus BranchPlatformMenu[]`
- `platformIntegrationLogs PlatformIntegrationLog[]`

**Branch Model**:
- `menuIntegrationSyncs MenuIntegrationSync[]`
- `branchDeliveryProviders BranchDeliveryProvider[]`
- `branchPlatformMenus BranchPlatformMenu[]`
- `platformIntegrationLogs PlatformIntegrationLog[]`

**PlatformMenu Model**:
- `integrationSyncs MenuIntegrationSync[]`
- `branchMenus BranchPlatformMenu[]`

**DeliveryProvider Model**:
- `branchProviders BranchDeliveryProvider[]`

## Database Indexes

All new models include comprehensive indexing for optimal performance:

### MenuIntegrationSync Indexes
```sql
CREATE INDEX "menu_integration_sync_company_id_idx" ON "menu_integration_sync"("company_id");
CREATE INDEX "menu_integration_sync_platform_type_idx" ON "menu_integration_sync"("platform_type");
CREATE INDEX "menu_integration_sync_sync_status_idx" ON "menu_integration_sync"("sync_status");
CREATE INDEX "menu_integration_sync_last_sync_at_idx" ON "menu_integration_sync"("last_sync_at");
CREATE INDEX "menu_integration_sync_is_sync_idx" ON "menu_integration_sync"("is_sync");
CREATE INDEX "menu_integration_sync_branch_id_idx" ON "menu_integration_sync"("branch_id");
CREATE INDEX "menu_integration_sync_deleted_at_idx" ON "menu_integration_sync"("deleted_at");
```

### BranchDeliveryProvider Indexes
```sql
CREATE INDEX "branch_delivery_providers_company_id_idx" ON "branch_delivery_providers"("company_id");
CREATE INDEX "branch_delivery_providers_branch_id_idx" ON "branch_delivery_providers"("branch_id");
CREATE INDEX "branch_delivery_providers_delivery_provider_id_idx" ON "branch_delivery_providers"("delivery_provider_id");
CREATE INDEX "branch_delivery_providers_priority_idx" ON "branch_delivery_providers"("priority");
CREATE INDEX "branch_delivery_providers_is_active_idx" ON "branch_delivery_providers"("is_active");
CREATE INDEX "branch_delivery_providers_deleted_at_idx" ON "branch_delivery_providers"("deleted_at");
```

### BranchPlatformMenu Indexes
```sql
CREATE INDEX "branch_platform_menus_company_id_idx" ON "branch_platform_menus"("company_id");
CREATE INDEX "branch_platform_menus_branch_id_idx" ON "branch_platform_menus"("branch_id");
CREATE INDEX "branch_platform_menus_platform_menu_id_idx" ON "branch_platform_menus"("platform_menu_id");
CREATE INDEX "branch_platform_menus_platform_type_idx" ON "branch_platform_menus"("platform_type");
CREATE INDEX "branch_platform_menus_is_active_idx" ON "branch_platform_menus"("is_active");
CREATE INDEX "branch_platform_menus_priority_idx" ON "branch_platform_menus"("priority");
CREATE INDEX "branch_platform_menus_deleted_at_idx" ON "branch_platform_menus"("deleted_at");
```

### PlatformIntegrationLog Indexes
```sql
CREATE INDEX "platform_integration_logs_company_id_idx" ON "platform_integration_logs"("company_id");
CREATE INDEX "platform_integration_logs_branch_id_idx" ON "platform_integration_logs"("branch_id");
CREATE INDEX "platform_integration_logs_platform_type_idx" ON "platform_integration_logs"("platform_type");
CREATE INDEX "platform_integration_logs_sync_type_idx" ON "platform_integration_logs"("sync_type");
CREATE INDEX "platform_integration_logs_sync_status_idx" ON "platform_integration_logs"("sync_status");
CREATE INDEX "platform_integration_logs_correlation_id_idx" ON "platform_integration_logs"("correlation_id");
CREATE INDEX "platform_integration_logs_created_at_idx" ON "platform_integration_logs"("created_at");
CREATE INDEX "platform_integration_logs_entity_type_entity_id_idx" ON "platform_integration_logs"("entity_type", "entity_id");
```

## Unique Constraints

### MenuIntegrationSync
```sql
CONSTRAINT "unique_platform_menu_sync" UNIQUE ("platform_menu_id", "platform_type", "branch_id")
```

### BranchDeliveryProvider
```sql
CONSTRAINT "unique_branch_delivery_provider" UNIQUE ("branch_id", "delivery_provider_id")
```

### BranchPlatformMenu
```sql
CONSTRAINT "unique_branch_platform_menu" UNIQUE ("branch_id", "platform_menu_id", "platform_type")
```

## Multi-Tenancy Enforcement

All new models enforce multi-tenancy through:
1. **Company ID Foreign Keys**: Every model includes `company_id` with CASCADE delete
2. **Automatic Filtering**: All queries should filter by `company_id`
3. **Row-Level Security**: Can be implemented for additional security
4. **Audit Trails**: Track who created, updated, and deleted records

## Migration Status

✅ **Schema Generated**: Prisma client successfully generated
✅ **Database Updated**: Schema pushed to PostgreSQL database
✅ **Tables Created**: All new tables created with proper structure
✅ **Indexes Applied**: Performance indexes created
✅ **Relations Established**: Foreign key relationships configured
✅ **Soft Deletion**: Enhanced models with proper soft deletion support

## Usage Examples

### 1. Track Menu Sync for Careem
```typescript
await prisma.menuIntegrationSync.create({
  data: {
    companyId: 'company-uuid',
    platformMenuId: 'platform-menu-uuid',
    platformType: 'careem',
    branchId: 'branch-uuid',
    syncStatus: 'pending',
    totalItems: 150,
    createdBy: 'user-uuid'
  }
});
```

### 2. Configure Branch Delivery Provider Priority
```typescript
await prisma.branchDeliveryProvider.create({
  data: {
    companyId: 'company-uuid',
    branchId: 'branch-uuid',
    deliveryProviderId: 'careem-provider-uuid',
    priority: 1, // Highest priority
    maxDistance: 15.00,
    baseFee: 2.50,
    feePerKm: 0.75,
    estimatedDeliveryTime: 30,
    isActive: true
  }
});
```

### 3. Assign Menu to Branch with Customizations
```typescript
await prisma.branchPlatformMenu.create({
  data: {
    companyId: 'company-uuid',
    branchId: 'branch-uuid',
    platformMenuId: 'menu-uuid',
    platformType: 'talabat',
    priceOverrides: {
      'item-1': { price: 15.50 },
      'item-2': { price: 8.75 }
    },
    availabilityOverrides: {
      'item-3': { available: false, reason: 'Out of stock' }
    },
    isActive: true
  }
});
```

## Benefits Achieved

1. **Enhanced Platform Sync Tracking**: Real-time monitoring of sync status across all platforms
2. **Flexible Delivery Provider Management**: Priority-based routing with branch-specific configurations
3. **Granular Menu Control**: Branch and platform-specific menu customizations
4. **Comprehensive Audit Trails**: Full logging of all integration activities
5. **Improved Performance**: Strategic indexing for fast queries
6. **Data Integrity**: Proper foreign key relationships and constraints
7. **Soft Deletion Support**: Audit trail preservation with logical deletion
8. **Multi-Tenant Security**: Proper data isolation per company

## Next Steps

1. **Backend Service Implementation**: Create services to utilize these new models
2. **API Endpoints**: Develop REST APIs for managing sync operations
3. **Real-time Updates**: Implement WebSocket updates for sync progress
4. **Dashboard Integration**: Add monitoring dashboards for platform sync status
5. **Performance Monitoring**: Set up alerts for sync failures and performance issues

---

*This schema enhancement provides a solid foundation for enterprise-grade multi-platform restaurant management with robust sync capabilities and audit trails.*