# Database Schema and Relationships Documentation

## Database Architecture Overview

The Delivery Integration Platform uses PostgreSQL as its primary database with a sophisticated multi-tenant schema design. The database implements row-level security (RLS) for tenant isolation while maintaining performance through strategic indexing and optimized relationships.

## Database Design Philosophy

### Multi-Tenant Architecture Principles
1. **Single Database, Logical Isolation**: All tenants share the same database with company-based data partitioning
2. **Row-Level Security**: Automatic data filtering based on company context
3. **Shared Schema**: Efficient resource utilization with consistent data structures
4. **Scalable Design**: Horizontal partitioning ready for future scaling needs

### Database Specifications
- **Engine**: PostgreSQL 14+
- **Character Set**: UTF-8 (multi-language support)
- **Timezone**: UTC (all timestamps stored in UTC)
- **Backup Strategy**: Daily full backups with point-in-time recovery
- **Connection Pooling**: PgBouncer with 100 connections per pool

## Core Database Schema

### Entity Relationship Overview
```
                    Company (Tenant Root)
                         │
        ┌───────────────────────────────────┬─────────────────┐
        │                                   │                 │
     Users                          IntegrationConfigs    Other Entities
        │                                   │                 │
    ┌───┴───┐                              │           ┌─────┴─────┐
    │ RBAC  │                              │           │  Orders   │
    │ Auth  │                              │           │   Menu    │
    └───────┘                              │           │ Webhooks  │
                                           │           └───────────┘
                                           │
                                 ┌─────────┴─────────┐
                                 │   DeliveryOrders  │
                                 │   MenuMappings    │
                                 │   WebhookLogs     │
                                 └───────────────────┘
```

### Database Statistics
- **Total Tables**: 89+
- **Core Business Entities**: 15
- **Supporting Tables**: 74+
- **Indexes**: 150+
- **Constraints**: 200+
- **Triggers**: 25+

## Core Entity Detailed Analysis

### 1. Company Entity (Multi-Tenant Root)
```sql
CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255),
  phone               VARCHAR(50),
  address             TEXT,
  business_type       VARCHAR(100),
  is_active           BOOLEAN DEFAULT true,
  domain              VARCHAR(100) UNIQUE, -- For subdomain-based access
  settings            JSONB DEFAULT '{}',  -- Company-specific configurations
  subscription_status VARCHAR(50) DEFAULT 'active',
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL -- Soft deletion
);

-- Indexes for performance
CREATE INDEX idx_companies_active ON companies (is_active);
CREATE INDEX idx_companies_domain ON companies (domain);
CREATE INDEX idx_companies_subscription ON companies (subscription_status);
```

**Relationships**:
- **One-to-Many**: Users, IntegrationConfigs, DeliveryOrders, MenuMappings
- **Cascade Rules**: ON DELETE CASCADE for all dependent entities
- **Business Rules**: Must have at least one active admin user

### 2. Users Entity (Authentication & Authorization)
```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL, -- Bcrypt hashed
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  role       user_role DEFAULT 'USER',
  is_active  BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,

  -- Multi-tenant foreign key
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP NULL
);

-- User roles enum
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'USER'
);

-- Performance indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_company ON users (company_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (is_active);
```

**Security Features**:
- **Password Security**: Bcrypt hashing with salt rounds
- **Role-Based Access**: Hierarchical role system
- **Company Isolation**: Automatic filtering by company_id
- **Audit Trail**: Created by and modification tracking

### 3. IntegrationConfig Entity (Platform Connections)
```sql
CREATE TABLE integration_configs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform           delivery_platform NOT NULL,
  is_enabled         BOOLEAN DEFAULT false,

  -- Authentication credentials (encrypted)
  api_key            TEXT, -- Encrypted
  api_secret         TEXT, -- Encrypted
  webhook_url        VARCHAR(500),
  webhook_secret     TEXT, -- Encrypted
  merchant_id        VARCHAR(100),
  store_id          VARCHAR(100),

  -- Platform-specific configuration
  configuration      JSONB DEFAULT '{}',

  -- Sync tracking
  last_sync_at       TIMESTAMP,
  sync_status        sync_status_enum DEFAULT 'pending',

  -- Multi-tenant isolation
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Audit
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

-- Delivery platforms enum
CREATE TYPE delivery_platform AS ENUM (
  'CAREEM',
  'TALABAT',
  'DHUB',
  'HUNGERSTATION',
  'NASHMI',
  'TOP_DELIVERY',
  'JOOD_DELIVERY',
  'YALLOW',
  'TAWASI'
);

-- Sync status tracking
CREATE TYPE sync_status_enum AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled'
);

-- Unique constraint: one config per platform per company
ALTER TABLE integration_configs
ADD CONSTRAINT uk_company_platform UNIQUE (company_id, platform);

-- Indexes
CREATE INDEX idx_integration_company ON integration_configs (company_id);
CREATE INDEX idx_integration_platform ON integration_configs (platform);
CREATE INDEX idx_integration_enabled ON integration_configs (is_enabled);
CREATE INDEX idx_integration_sync_status ON integration_configs (sync_status);
```

### 4. DeliveryOrder Entity (Unified Order Management)
```sql
CREATE TABLE delivery_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform identification
  platform              delivery_platform NOT NULL,
  platform_order_id     VARCHAR(100) NOT NULL, -- External platform order ID
  order_number          VARCHAR(100) NOT NULL, -- Display order number

  -- Order status and lifecycle
  status                order_status DEFAULT 'PENDING',

  -- Financial information
  total_amount          DECIMAL(10, 2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'SAR',
  commission_rate       DECIMAL(5, 2), -- Platform commission percentage
  commission_amount     DECIMAL(10, 2),

  -- Customer information
  customer_name         VARCHAR(200),
  customer_phone        VARCHAR(20),
  customer_email        VARCHAR(255),

  -- Delivery details
  delivery_address      TEXT,
  delivery_notes        TEXT,
  scheduled_delivery_at TIMESTAMP,

  -- Order content (JSONB for flexibility)
  order_items           JSONB NOT NULL, -- Array of order items with details
  platform_data         JSONB,          -- Raw platform-specific data

  -- Order lifecycle timestamps
  accepted_at           TIMESTAMP,
  rejected_at           TIMESTAMP,
  completed_at          TIMESTAMP,
  cancelled_at          TIMESTAMP,

  -- Multi-tenant relationships
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_config_id UUID NOT NULL REFERENCES integration_configs(id),

  -- Audit
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- Order status enum
CREATE TYPE order_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'IN_PREPARATION',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
);

-- Unique constraint: prevent duplicate orders from same platform
ALTER TABLE delivery_orders
ADD CONSTRAINT uk_platform_order UNIQUE (platform, platform_order_id, company_id);

-- Performance indexes
CREATE INDEX idx_orders_company ON delivery_orders (company_id);
CREATE INDEX idx_orders_platform ON delivery_orders (platform);
CREATE INDEX idx_orders_status ON delivery_orders (status);
CREATE INDEX idx_orders_created_at ON delivery_orders (created_at);
CREATE INDEX idx_orders_platform_order_id ON delivery_orders (platform_order_id);

-- Composite indexes for common queries
CREATE INDEX idx_orders_company_status_created ON delivery_orders (company_id, status, created_at);
CREATE INDEX idx_orders_company_platform_created ON delivery_orders (company_id, platform, created_at);

-- JSONB indexes for order items
CREATE INDEX idx_orders_items_gin ON delivery_orders USING GIN (order_items);
```

### 5. MenuMapping Entity (Cross-Platform Product Sync)
```sql
CREATE TABLE menu_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product identification
  local_product_id    VARCHAR(100) NOT NULL, -- Internal product identifier
  platform_product_id VARCHAR(100) NOT NULL, -- External platform product ID
  product_name        VARCHAR(300) NOT NULL,
  product_description TEXT,

  -- Pricing and availability
  product_price       DECIMAL(10, 2) NOT NULL,
  is_available        BOOLEAN DEFAULT true,
  availability_schedule JSONB, -- Time-based availability rules

  -- Platform-specific data
  platform            delivery_platform NOT NULL,
  platform_data       JSONB, -- Platform-specific product data

  -- Sync tracking
  last_sync_at        TIMESTAMP,
  sync_status         sync_status_enum DEFAULT 'pending',
  sync_errors         TEXT[],

  -- Multi-tenant relationships
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_config_id UUID NOT NULL REFERENCES integration_configs(id),

  -- Audit
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one mapping per product per platform per company
ALTER TABLE menu_mappings
ADD CONSTRAINT uk_company_platform_product UNIQUE (company_id, platform, local_product_id);

-- Indexes
CREATE INDEX idx_menu_mappings_company ON menu_mappings (company_id);
CREATE INDEX idx_menu_mappings_platform ON menu_mappings (platform);
CREATE INDEX idx_menu_mappings_local_product ON menu_mappings (local_product_id);
CREATE INDEX idx_menu_mappings_available ON menu_mappings (is_available);
CREATE INDEX idx_menu_mappings_sync_status ON menu_mappings (sync_status);
```

### 6. WebhookLog Entity (Integration Activity Audit)
```sql
CREATE TABLE webhook_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook identification
  platform      delivery_platform NOT NULL,
  event_type    VARCHAR(100) NOT NULL,

  -- Request data
  payload       JSONB NOT NULL,          -- Webhook payload
  headers       JSONB,                   -- Request headers
  signature     VARCHAR(500),            -- Webhook signature
  ip_address    INET,                    -- Source IP address

  -- Processing results
  response      JSONB,                   -- Processing response
  status_code   INTEGER,                 -- HTTP response status
  is_processed  BOOLEAN DEFAULT false,
  error_message TEXT,

  -- Retry logic
  retry_count   INTEGER DEFAULT 0,
  max_retries   INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,

  -- Multi-tenant isolation
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Timestamps
  created_at    TIMESTAMP DEFAULT NOW(),
  processed_at  TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_webhook_logs_company ON webhook_logs (company_id);
CREATE INDEX idx_webhook_logs_platform ON webhook_logs (platform);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs (is_processed);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs (created_at);
CREATE INDEX idx_webhook_logs_retry ON webhook_logs (next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Event type index for filtering
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs (event_type);

-- JSONB indexes for payload searching
CREATE INDEX idx_webhook_logs_payload_gin ON webhook_logs USING GIN (payload);
```

## Advanced Feature Schemas

### 7. Loyalty Program System (EliCash-style)
```sql
-- Loyalty programs configuration
CREATE TABLE loyalty_programs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(200) NOT NULL,
  description            TEXT,
  program_type           loyalty_program_type DEFAULT 'POINTS_BASED',
  is_active              BOOLEAN DEFAULT true,

  -- Points configuration
  points_per_sar         DECIMAL(10, 4) DEFAULT 1.0000, -- Points earned per SAR spent
  min_redemption_points  INTEGER DEFAULT 100,
  max_redemption_percentage DECIMAL(5, 2) DEFAULT 50.00, -- Max % of order paid with points

  -- Program rules
  expiration_days        INTEGER, -- Points expiration (NULL = no expiration)
  tier_bonus_multiplier  DECIMAL(3, 2) DEFAULT 1.00,
  referral_bonus         INTEGER DEFAULT 0,

  -- Multi-tenant
  company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Audit
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

-- Loyalty program types
CREATE TYPE loyalty_program_type AS ENUM (
  'POINTS_BASED',
  'TIER_BASED',
  'CASHBACK',
  'HYBRID'
);

-- Customer loyalty tracking
CREATE TABLE customer_loyalty (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer identification
  customer_phone       VARCHAR(20) NOT NULL, -- Primary identifier
  customer_email       VARCHAR(255),
  customer_name        VARCHAR(200),

  -- Loyalty metrics
  current_points       INTEGER DEFAULT 0,
  total_points_earned  INTEGER DEFAULT 0,
  total_points_redeemed INTEGER DEFAULT 0,
  total_spent          DECIMAL(10, 2) DEFAULT 0,
  order_count          INTEGER DEFAULT 0,

  -- Status and engagement
  is_active            BOOLEAN DEFAULT true,
  joined_at            TIMESTAMP DEFAULT NOW(),
  last_order_at        TIMESTAMP,

  -- Relationships
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  loyalty_program_id   UUID NOT NULL REFERENCES loyalty_programs(id),
  loyalty_tier_id      UUID REFERENCES loyalty_tiers(id),

  -- Audit
  updated_at           TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one loyalty record per customer per company
ALTER TABLE customer_loyalty
ADD CONSTRAINT uk_customer_company UNIQUE (company_id, customer_phone);
```

### 8. AI and Automation Features
```sql
-- AI Chatbot sessions
CREATE TABLE ai_chatbot_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      VARCHAR(100) UNIQUE NOT NULL,

  -- Customer info
  customer_phone  VARCHAR(20),
  platform        delivery_platform,
  channel         chat_channel NOT NULL,

  -- Session state
  is_active       BOOLEAN DEFAULT true,
  started_at      TIMESTAMP DEFAULT NOW(),
  ended_at        TIMESTAMP,
  messages_count  INTEGER DEFAULT 0,

  -- AI analysis
  intent          VARCHAR(100),       -- Last detected intent
  confidence      DECIMAL(5, 4),      -- Confidence score
  context         JSONB DEFAULT '{}', -- Session context variables

  -- Multi-tenant
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- Chat channels enum
CREATE TYPE chat_channel AS ENUM (
  'WHATSAPP',
  'TELEGRAM',
  'WEB_WIDGET',
  'FACEBOOK',
  'INSTAGRAM'
);

-- WhatsApp integration
CREATE TABLE whatsapp_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Message details
  recipient_phone       VARCHAR(20) NOT NULL,
  message_content       TEXT NOT NULL,
  message_type          whatsapp_message_type NOT NULL,

  -- Template information
  template_id           UUID REFERENCES whatsapp_templates(id),

  -- Status tracking
  status                whatsapp_message_status DEFAULT 'PENDING',
  whatsapp_message_id   VARCHAR(100), -- WhatsApp API message ID
  error_code            VARCHAR(50),
  error_message         TEXT,

  -- Timestamps
  sent_at               TIMESTAMP,
  delivered_at          TIMESTAMP,
  read_at               TIMESTAMP,

  -- Multi-tenant
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Audit
  created_at            TIMESTAMP DEFAULT NOW()
);

-- WhatsApp message types
CREATE TYPE whatsapp_message_type AS ENUM (
  'TEMPLATE',
  'TEXT',
  'MEDIA',
  'INTERACTIVE',
  'LOCATION'
);

CREATE TYPE whatsapp_message_status AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);
```

## Analytics and Reporting Schema

### 9. Integration Analytics
```sql
CREATE TABLE integration_analytics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metric identification
  platform         delivery_platform NOT NULL,
  metric_name      VARCHAR(100) NOT NULL, -- 'api_response_time', 'order_sync_success_rate', etc.
  metric_value     DECIMAL(15, 4) NOT NULL,
  metric_unit      VARCHAR(20) NOT NULL,   -- 'ms', '%', 'count', etc.
  aggregation_type aggregation_type NOT NULL,

  -- Time dimension
  period_start     TIMESTAMP NOT NULL,
  period_end       TIMESTAMP NOT NULL,
  recorded_at      TIMESTAMP DEFAULT NOW(),

  -- Context
  tags             JSONB DEFAULT '{}',     -- Additional context tags

  -- Multi-tenant
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- Aggregation types
CREATE TYPE aggregation_type AS ENUM (
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'COUNT',
  'MEDIAN',
  'P95',
  'P99'
);

-- Time-series index for analytics queries
CREATE INDEX idx_analytics_platform_metric_time ON integration_analytics (platform, metric_name, period_start);
CREATE INDEX idx_analytics_company_time ON integration_analytics (company_id, period_start);
```

## Row-Level Security (RLS) Implementation

### Multi-Tenant Security Policies
```sql
-- Enable RLS on all multi-tenant tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy for company data isolation
CREATE POLICY company_isolation ON delivery_orders
  FOR ALL TO application_role
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- Policy for super admin access (bypass tenant isolation)
CREATE POLICY super_admin_access ON delivery_orders
  FOR ALL TO super_admin_role
  USING (true);

-- User-specific policies
CREATE POLICY user_company_access ON users
  FOR ALL TO application_role
  USING (
    company_id = current_setting('app.current_company_id')::uuid
    OR
    current_setting('app.user_role') = 'SUPER_ADMIN'
  );
```

## Database Triggers and Automation

### Audit Trail Triggers
```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = NOW();
  END IF;

  -- Log to audit table
  INSERT INTO audit_logs (
    table_name,
    operation,
    old_values,
    new_values,
    user_id,
    company_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    current_setting('app.user_id', true)::uuid,
    current_setting('app.current_company_id', true)::uuid,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_companies_trigger
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_integration_configs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### Data Validation Triggers
```sql
-- Validate integration config before insert/update
CREATE OR REPLACE FUNCTION validate_integration_config()
RETURNS trigger AS $$
BEGIN
  -- Validate required fields based on platform
  CASE NEW.platform
    WHEN 'CAREEM' THEN
      IF NEW.api_key IS NULL OR NEW.api_secret IS NULL THEN
        RAISE EXCEPTION 'Careem integration requires api_key and api_secret';
      END IF;
    WHEN 'TALABAT' THEN
      IF NEW.api_key IS NULL OR NEW.merchant_id IS NULL THEN
        RAISE EXCEPTION 'Talabat integration requires api_key and merchant_id';
      END IF;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_integration_config_trigger
  BEFORE INSERT OR UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION validate_integration_config();
```

## Database Performance Optimization

### Strategic Indexing Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_orders_company_status_created
ON delivery_orders (company_id, status, created_at);

CREATE INDEX CONCURRENTLY idx_orders_platform_created_desc
ON delivery_orders (platform, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_active_integrations
ON integration_configs (company_id, platform)
WHERE is_enabled = true;

-- JSONB GIN indexes for flexible queries
CREATE INDEX CONCURRENTLY idx_orders_items_gin
ON delivery_orders USING GIN (order_items);

CREATE INDEX CONCURRENTLY idx_webhook_payload_gin
ON webhook_logs USING GIN (payload);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_orders_customer_search
ON delivery_orders USING GIN (to_tsvector('english', customer_name || ' ' || customer_phone));
```

### Query Optimization Views
```sql
-- Performance view for order analytics
CREATE VIEW v_order_analytics AS
SELECT
  company_id,
  platform,
  DATE_TRUNC('day', created_at) as order_date,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value,
  COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_count
FROM delivery_orders
WHERE deleted_at IS NULL
GROUP BY company_id, platform, DATE_TRUNC('day', created_at);

-- Integration health view
CREATE VIEW v_integration_health AS
SELECT
  ic.company_id,
  ic.platform,
  ic.is_enabled,
  ic.last_sync_at,
  COUNT(do.id) as total_orders,
  COUNT(CASE WHEN do.status = 'DELIVERED' THEN 1 END) as delivered_orders,
  COALESCE(AVG(ia.metric_value), 0) as avg_response_time
FROM integration_configs ic
LEFT JOIN delivery_orders do ON ic.id = do.integration_config_id
LEFT JOIN integration_analytics ia ON ic.platform = ia.platform
  AND ia.metric_name = 'api_response_time'
  AND ia.recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY ic.company_id, ic.platform, ic.is_enabled, ic.last_sync_at;
```

## Database Maintenance and Monitoring

### Automated Maintenance Tasks
```sql
-- Partition large tables by date
CREATE TABLE delivery_orders_2025_09 PARTITION OF delivery_orders
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Automated cleanup of old webhook logs
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_processed = true;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job
SELECT cron.schedule('cleanup-webhook-logs', '0 2 * * *', 'SELECT cleanup_old_webhook_logs();');
```

### Database Statistics and Monitoring
```sql
-- Table size monitoring
CREATE VIEW v_table_sizes AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Index usage statistics
CREATE VIEW v_index_usage AS
SELECT
  t.tablename,
  indexname,
  c.reltuples AS num_rows,
  pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))) AS table_size,
  pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.indexrelname))) AS index_size,
  CASE WHEN x.is_unique = 1 THEN 'Y' ELSE 'N' END AS UNIQUE,
  s.idx_scan as number_of_scans,
  s.idx_tup_read as tuples_read,
  s.idx_tup_fetch as tuples_fetched
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
LEFT OUTER JOIN (
  SELECT indrelid,
         MAX(CAST(indisunique AS integer)) as is_unique
  FROM pg_index
  GROUP BY indrelid
) x ON c.oid = x.indrelid
LEFT OUTER JOIN pg_stat_user_indexes s ON s.relname = t.tablename
WHERE t.schemaname='public';
```

## Data Migration and Versioning

### Schema Migration Strategy
```sql
-- Migration tracking table
CREATE TABLE schema_migrations (
  version VARCHAR(20) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- Example migration: Add new column
ALTER TABLE integration_configs
ADD COLUMN rate_limit_per_minute INTEGER DEFAULT 1000;

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('2025_09_25_001', 'Add rate limiting to integration configs');
```

### Data Seeding for Development
```sql
-- Insert sample company
INSERT INTO companies (id, name, email, business_type)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Sample Restaurant',
  'admin@sample-restaurant.com',
  'restaurant'
);

-- Insert sample user
INSERT INTO users (email, password, first_name, last_name, role, company_id)
VALUES (
  'admin@sample-restaurant.com',
  '$2b$10$example_hash', -- Bcrypt hash of 'password123'
  'Admin',
  'User',
  'COMPANY_ADMIN',
  '123e4567-e89b-12d3-a456-426614174000'
);
```

## Backup and Disaster Recovery

### Backup Strategy
```bash
# Daily full backup
pg_dump -h localhost -U postgres -d integration_platform > backup_$(date +%Y%m%d).sql

# Point-in-time recovery setup
archive_mode = on
archive_command = 'cp %p /backup/archive/%f'
wal_level = replica
```

### Disaster Recovery Procedures
1. **Regular Backups**: Daily full backups with 30-day retention
2. **Point-in-Time Recovery**: WAL archiving for PITR capability
3. **Replication**: Streaming replication to standby server
4. **Testing**: Monthly disaster recovery testing

## Performance Benchmarks

### Expected Performance Metrics
- **Order Insert**: <10ms average
- **Order Query (with filters)**: <50ms average
- **Menu Sync Operation**: <200ms per item
- **Webhook Processing**: <100ms average
- **Analytics Queries**: <500ms average

### Database Sizing Estimates
- **Small Restaurant (1K orders/month)**: 500MB/year
- **Medium Restaurant (10K orders/month)**: 5GB/year
- **Large Restaurant (100K orders/month)**: 50GB/year
- **Platform (1000 restaurants)**: 10TB total capacity

---

**Document Version**: 1.0
**Last Updated**: September 25, 2025
**Database Version**: PostgreSQL 14+
**Schema Version**: v1.0.0