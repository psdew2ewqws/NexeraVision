# Database Schema Documentation

## 🗄️ Schema Overview

The Restaurant Platform uses PostgreSQL with a sophisticated schema designed for multi-tenancy, scalability, and data integrity. The schema supports 50+ tables with advanced indexing strategies for optimal performance.

## 🏢 Core Entity Relationships

```
Companies (Tenant Root)
├── Branches (1:N)
├── Users (1:N)
├── Licenses (1:N)
├── MenuCategories (1:N)
├── MenuProducts (1:N)
├── PromotionCampaigns (1:N)
├── Orders (1:N)
├── Printers (1:N)
├── BranchAvailability (1:N)
└── Analytics (1:N)

MenuProducts
├── ProductImages (1:N)
├── ProductModifierCategories (M:N)
├── PromotionMenuItems (1:N)
└── OrderItems (1:N)

PromotionCampaigns
├── PromotionCodes (1:N)
├── PromotionTargets (1:N)
├── PromotionUsage (1:N)
├── PromotionAnalytics (1:N)
└── PromotionVariants (1:N)

DeliveryProviders (Global/Tenant)
├── CompanyProviderConfigs (1:N)
├── BranchProviderMappings (1:N)
├── DeliveryProviderOrders (1:N)
└── DeliveryProviderAnalytics (1:N)
```

## 📊 Key Tables Analysis

### Multi-Tenant Foundation

#### Companies Table
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    business_type VARCHAR DEFAULT 'restaurant',
    status company_status DEFAULT 'trial',
    subscription_expires_at TIMESTAMP,
    timezone VARCHAR DEFAULT 'Asia/Amman',
    default_currency VARCHAR(3) DEFAULT 'JOD',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Performance indexes
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_subscription ON companies(subscription_expires_at);
CREATE INDEX idx_companies_business_type ON companies(business_type, status);
```

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID NULL REFERENCES branches(id),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role user_role NOT NULL,
    status user_status DEFAULT 'active',
    language VARCHAR(2) DEFAULT 'en',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-tenant security indexes
CREATE INDEX idx_users_company_role ON users(company_id, role);
CREATE INDEX idx_users_company_status ON users(company_id, status);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_security ON users(failed_login_attempts, locked_until);
```

### Menu Management Schema

#### MenuProducts Table
```sql
CREATE TABLE menu_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID NULL REFERENCES menu_categories(id),
    name JSONB NOT NULL, -- Multi-language: {"en": "Pizza", "ar": "بيتزا"}
    description JSONB NULL,
    base_price DECIMAL(10,2) NOT NULL,
    pricing JSONB DEFAULT '{}', -- Platform-specific pricing
    preparation_time INTEGER DEFAULT 15,
    priority INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for menu operations
CREATE INDEX idx_menu_products_company_status ON menu_products(company_id, status);
CREATE INDEX idx_menu_products_category_priority ON menu_products(company_id, category_id, priority);
CREATE INDEX idx_menu_products_created ON menu_products(company_id, created_at);

-- Full-text search on multilingual names
CREATE INDEX idx_menu_products_name_search ON menu_products USING gin(name);
```

#### ProductImages Table
```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NULL REFERENCES menu_products(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    mime_type VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Image optimization indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_created ON product_images(created_at);
```

### Promotion System Schema

#### PromotionCampaigns Table
```sql
CREATE TABLE promotion_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name JSONB DEFAULT '{}', -- Multi-language names
    description JSONB DEFAULT '{}',
    slug VARCHAR UNIQUE NOT NULL,
    type promotion_campaign_type NOT NULL,
    status promotion_status DEFAULT 'draft',
    priority INTEGER DEFAULT 999,
    
    -- Time restrictions
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    days_of_week INTEGER[] DEFAULT '{}',
    time_ranges JSONB DEFAULT '[]',
    
    -- Usage limits
    total_usage_limit INTEGER NULL,
    per_customer_limit INTEGER DEFAULT 1,
    current_usage_count INTEGER DEFAULT 0,
    
    -- Discount configuration
    discount_value DECIMAL(10,2) NULL,
    max_discount_amount DECIMAL(10,2) NULL,
    minimum_order_amount DECIMAL(10,2) NULL,
    
    -- Platform targeting
    target_platforms TEXT[] DEFAULT '{}',
    target_customer_segments TEXT[] DEFAULT '{}',
    
    -- Analytics
    total_revenue_impact DECIMAL(15,2) DEFAULT 0,
    total_orders_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Promotion lookup indexes
CREATE INDEX idx_promotion_campaigns_company_status ON promotion_campaigns(company_id, status, priority);
CREATE INDEX idx_promotion_campaigns_time ON promotion_campaigns(company_id, starts_at, ends_at);
CREATE INDEX idx_promotion_campaigns_active ON promotion_campaigns(status, starts_at, ends_at);
```

#### PromotionUsage Table
```sql
CREATE TABLE promotion_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
    code_id UUID NULL REFERENCES promotion_codes(id) ON DELETE SET NULL,
    customer_id VARCHAR NULL,
    customer_email VARCHAR NULL,
    customer_phone VARCHAR NULL,
    order_id VARCHAR NULL,
    usage_date TIMESTAMP DEFAULT NOW(),
    discount_applied DECIMAL(10,2) NOT NULL,
    order_total DECIMAL(10,2) NULL,
    platform_used VARCHAR NULL,
    branch_id UUID NULL,
    metadata JSONB DEFAULT '{}'
);

-- Analytics indexes
CREATE INDEX idx_promotion_usage_campaign ON promotion_usage(campaign_id, usage_date);
CREATE INDEX idx_promotion_usage_customer ON promotion_usage(customer_id, campaign_id);
CREATE INDEX idx_promotion_usage_analytics ON promotion_usage(platform_used, usage_date);
```

### Delivery Integration Schema

#### DeliveryProviders Table
```sql
CREATE TABLE delivery_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL, -- 'talabat', 'careem', 'dhub'
    display_name JSONB NOT NULL, -- Multi-language display names
    api_base_url VARCHAR NULL,
    api_key VARCHAR NULL, -- Encrypted
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    supported_areas TEXT[] DEFAULT '{}',
    avg_delivery_time INTEGER DEFAULT 30,
    base_fee DECIMAL(8,2) DEFAULT 0.00,
    fee_per_km DECIMAL(8,2) DEFAULT 0.50,
    max_distance DECIMAL(8,2) DEFAULT 15.00,
    
    -- Multi-tenant support
    company_id UUID NULL REFERENCES companies(id),
    
    webhook_url VARCHAR NULL,
    configuration JSONB NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Provider selection indexes
CREATE INDEX idx_delivery_providers_active_priority ON delivery_providers(is_active, priority);
CREATE INDEX idx_delivery_providers_company ON delivery_providers(company_id, is_active);
```

#### DeliveryProviderOrders Table
```sql
CREATE TABLE delivery_provider_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    delivery_provider_id UUID NOT NULL REFERENCES delivery_providers(id),
    provider_order_id VARCHAR NOT NULL, -- External provider ID
    order_number VARCHAR NOT NULL,
    order_status VARCHAR DEFAULT 'created',
    order_details JSONB NOT NULL,
    customer_details JSONB NULL,
    delivery_address JSONB NULL,
    webhook_data JSONB NULL,
    
    -- Tracking fields
    tracking_number VARCHAR NULL,
    estimated_delivery_time TIMESTAMP NULL,
    actual_delivery_time TIMESTAMP NULL,
    delivery_attempts INTEGER DEFAULT 1,
    provider_fee_charged DECIMAL(8,2) NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order tracking indexes
CREATE INDEX idx_delivery_provider_orders_company_status ON delivery_provider_orders(company_id, order_status, created_at);
CREATE INDEX idx_delivery_provider_orders_provider ON delivery_provider_orders(delivery_provider_id, provider_order_id);
CREATE INDEX idx_delivery_provider_orders_number ON delivery_provider_orders(order_number);
```

### Availability Management Schema

#### BranchAvailability Table
```sql
CREATE TABLE branch_availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connected_id UUID NOT NULL, -- Product or modifier ID
    connected_type connected_type NOT NULL, -- 'product' or 'modifier'
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Availability status
    is_in_stock BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    stock_level INTEGER NULL,
    low_stock_threshold INTEGER NULL,
    
    -- Platform-specific pricing
    prices JSONB DEFAULT '{}', -- {"talabat": 10.50, "careem": 11.00}
    taxes JSONB DEFAULT '{}',
    
    -- Time-based availability
    available_from VARCHAR NULL, -- "06:00"
    available_to VARCHAR NULL,   -- "23:30"
    available_days TEXT[] DEFAULT '{}',
    
    priority INTEGER DEFAULT 0,
    last_stock_update TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- High-performance availability indexes
CREATE INDEX idx_branch_availability_branch_type ON branch_availabilities(branch_id, connected_type, is_active);
CREATE INDEX idx_branch_availability_company_stock ON branch_availabilities(company_id, connected_type, is_in_stock);
CREATE INDEX idx_branch_availability_connected ON branch_availabilities(connected_id, connected_type, branch_id);
```

## 🚀 Performance Optimization

### Indexing Strategy

#### Multi-Tenant Indexes
Every tenant-specific table has compound indexes starting with `company_id`:
```sql
-- Ensures tenant isolation and fast queries
CREATE INDEX idx_table_company_filter ON table_name(company_id, status, created_at);
```

#### Search Optimization
```sql
-- Full-text search on multilingual content
CREATE INDEX idx_products_search ON menu_products USING gin(
  (name || ' ' || description)
);

-- Location-based searches
CREATE INDEX idx_locations_geography ON global_locations USING gist(
  ll_to_earth(latitude::float8, longitude::float8)
);
```

#### Analytics Indexes
```sql
-- Time-series analytics
CREATE INDEX idx_analytics_time_series ON table_name(company_id, date, platform);
CREATE INDEX idx_usage_analytics ON promotion_usage(campaign_id, usage_date, platform_used);
```

### Query Optimization

#### Efficient Pagination
```sql
-- Use cursor-based pagination for large datasets
SELECT * FROM menu_products 
WHERE company_id = $1 AND created_at < $2 
ORDER BY created_at DESC 
LIMIT 20;
```

#### Aggregation Optimization
```sql
-- Materialized views for complex analytics
CREATE MATERIALIZED VIEW daily_promotion_analytics AS
SELECT 
  campaign_id,
  date(usage_date) as date,
  count(*) as usage_count,
  sum(discount_applied) as total_discount,
  sum(order_total) as total_revenue
FROM promotion_usage
GROUP BY campaign_id, date(usage_date);

-- Refresh strategy
CREATE UNIQUE INDEX ON daily_promotion_analytics(campaign_id, date);
```

## 🔒 Data Security

### Row-Level Security (RLS)
```sql
-- Enable RLS for tenant isolation
ALTER TABLE menu_products ENABLE ROW LEVEL SECURITY;

-- Policy for company isolation
CREATE POLICY company_isolation ON menu_products
FOR ALL
TO application_role
USING (company_id = current_setting('app.current_company_id')::uuid);
```

### Encryption at Rest
- **Sensitive fields**: API keys, passwords, personal data
- **Implementation**: PostgreSQL pgcrypto extension
- **Key management**: External key management service

### Audit Trail
```sql
-- Comprehensive audit logging
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB NULL,
    new_values JSONB NULL,
    user_id UUID NULL,
    company_id UUID NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## 📈 Scaling Considerations

### Horizontal Partitioning
```sql
-- Partition large tables by company_id
CREATE TABLE promotion_usage_partitioned (
    LIKE promotion_usage INCLUDING ALL
) PARTITION BY HASH (company_id);

-- Create partitions
CREATE TABLE promotion_usage_p0 PARTITION OF promotion_usage_partitioned
FOR VALUES WITH (modulus 4, remainder 0);
```

### Read Replicas
- **Master**: Write operations
- **Replica**: Read operations, reporting, analytics
- **Connection pooling**: PgBouncer for connection efficiency

### Caching Strategy
```sql
-- Frequently accessed data candidates
SELECT 
  schemaname, tablename, 
  n_tup_ins + n_tup_upd + n_tup_del as write_activity,
  seq_scan + idx_scan as read_activity
FROM pg_stat_user_tables 
ORDER BY read_activity DESC;
```

## 🔧 Maintenance

### Regular Maintenance Tasks
```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes periodically
REINDEX INDEX CONCURRENTLY idx_name;

-- Clean up old data
DELETE FROM user_activity_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Monitoring Queries
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 AND schemaname = 'public';

-- Monitor query performance
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;
```

---

**Database Version:** PostgreSQL 14+  
**Total Tables:** 50+  
**Schema Version:** 2.0.0  
**Last Updated:** $(date +%Y-%m-%d)