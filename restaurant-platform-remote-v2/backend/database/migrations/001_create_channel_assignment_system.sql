-- ================================================================
-- CHANNEL ASSIGNMENT SYSTEM - COMPREHENSIVE DATABASE SCHEMA
-- Based on Picolinate patterns and current system analysis
-- ================================================================

BEGIN;

-- ================================
-- 1. DELIVERY CHANNELS TABLE
-- Core channel definitions (Talabat, Careem, etc.)
-- ================================
CREATE TABLE IF NOT EXISTS delivery_channels (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL, -- 'Talabat', 'Careem', 'Deliveroo', etc.
    slug TEXT NOT NULL UNIQUE, -- 'talabat', 'careem', 'deliveroo'
    channel_type TEXT NOT NULL, -- 'delivery', 'pickup', 'dine_in', 'third_party'
    provider_name TEXT NOT NULL, -- Technical provider name
    api_base_url TEXT, -- Base API URL for integration
    webhook_url TEXT, -- Webhook endpoint for status updates
    auth_type TEXT, -- 'oauth2', 'api_key', 'bearer_token'
    is_active BOOLEAN DEFAULT true,
    is_system_default BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}', -- Channel-specific configuration
    supported_features JSONB DEFAULT '[]', -- ['menu_sync', 'order_sync', 'status_updates']
    rate_limits JSONB DEFAULT '{}', -- API rate limiting configuration
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3) WITHOUT TIME ZONE,
    created_by TEXT,
    updated_by TEXT
);

-- ================================
-- 2. COMPANY CHANNEL ASSIGNMENTS
-- Company-level channel configurations and credentials
-- ================================
CREATE TABLE IF NOT EXISTS company_channel_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority channels sync first
    credentials JSONB DEFAULT '{}', -- Encrypted credentials for the channel
    channel_settings JSONB DEFAULT '{}', -- Company-specific channel settings
    sync_enabled BOOLEAN DEFAULT true,
    auto_sync_interval INTEGER DEFAULT 15, -- Minutes between auto-syncs
    last_sync_at TIMESTAMP(3) WITHOUT TIME ZONE,
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
    sync_error_message TEXT,
    sync_retry_count INTEGER DEFAULT 0,
    max_retry_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3) WITHOUT TIME ZONE,
    created_by TEXT,
    updated_by TEXT,

    CONSTRAINT company_channel_assignments_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT company_channel_assignments_channel_id_fkey
        FOREIGN KEY (channel_id) REFERENCES delivery_channels(id),
    CONSTRAINT company_channel_assignments_unique
        UNIQUE (company_id, channel_id) DEFERRABLE INITIALLY DEFERRED
);

-- ================================
-- 3. PLATFORM MENU CHANNEL ASSIGNMENTS
-- Each platform menu assigned to ONE delivery channel
-- ================================
CREATE TABLE IF NOT EXISTS platform_menu_channel_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    platform_menu_id TEXT NOT NULL,
    company_channel_assignment_id TEXT NOT NULL,
    branch_id TEXT, -- Optional: branch-specific assignments
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,
    menu_external_id TEXT, -- External menu ID in the channel
    last_menu_sync_at TIMESTAMP(3) WITHOUT TIME ZONE,
    menu_sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
    menu_sync_error TEXT,
    channel_specific_settings JSONB DEFAULT '{}', -- Menu-specific channel settings
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3) WITHOUT TIME ZONE,
    created_by TEXT,
    updated_by TEXT,

    CONSTRAINT platform_menu_channel_assignments_platform_menu_id_fkey
        FOREIGN KEY (platform_menu_id) REFERENCES platform_menus(id),
    CONSTRAINT platform_menu_channel_assignments_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id),
    CONSTRAINT platform_menu_channel_assignments_branch_id_fkey
        FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT platform_menu_channel_assignments_unique
        UNIQUE (platform_menu_id, company_channel_assignment_id) DEFERRABLE INITIALLY DEFERRED
);

-- ================================
-- 4. CHANNEL SYNC LOGS
-- Comprehensive sync operation tracking
-- ================================
CREATE TABLE IF NOT EXISTS channel_sync_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_channel_assignment_id TEXT,
    platform_menu_channel_assignment_id TEXT,
    sync_type TEXT NOT NULL, -- 'menu_sync', 'product_sync', 'status_sync', 'order_sync'
    sync_direction TEXT NOT NULL, -- 'push', 'pull', 'bidirectional'
    sync_status TEXT NOT NULL, -- 'started', 'in_progress', 'completed', 'failed', 'partial'
    started_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(3) WITHOUT TIME ZONE,
    duration_ms INTEGER, -- Sync duration in milliseconds
    records_processed INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    request_payload JSONB DEFAULT '{}',
    response_payload JSONB DEFAULT '{}',
    external_sync_id TEXT, -- External system's sync identifier
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_sync_logs_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id),
    CONSTRAINT channel_sync_logs_platform_menu_channel_id_fkey
        FOREIGN KEY (platform_menu_channel_assignment_id) REFERENCES platform_menu_channel_assignments(id)
);

-- ================================
-- 5. CHANNEL PRODUCT MAPPINGS
-- Track product mappings between internal and external systems
-- ================================
CREATE TABLE IF NOT EXISTS channel_product_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    platform_menu_item_id TEXT NOT NULL,
    company_channel_assignment_id TEXT NOT NULL,
    external_product_id TEXT NOT NULL, -- External system's product ID
    external_sku TEXT, -- External SKU if different
    mapping_status TEXT DEFAULT 'active', -- 'active', 'disabled', 'error'
    sync_enabled BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP(3) WITHOUT TIME ZONE,
    sync_status TEXT DEFAULT 'pending',
    sync_error TEXT,
    external_data JSONB DEFAULT '{}', -- Channel-specific product data
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3) WITHOUT TIME ZONE,

    CONSTRAINT channel_product_mappings_platform_menu_item_id_fkey
        FOREIGN KEY (platform_menu_item_id) REFERENCES platform_menu_items(id),
    CONSTRAINT channel_product_mappings_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id),
    CONSTRAINT channel_product_mappings_unique
        UNIQUE (platform_menu_item_id, company_channel_assignment_id, external_product_id)
);

-- ================================
-- 6. CHANNEL WEBHOOKS
-- Webhook management for real-time updates
-- ================================
CREATE TABLE IF NOT EXISTS channel_webhooks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_channel_assignment_id TEXT NOT NULL,
    webhook_type TEXT NOT NULL, -- 'order_update', 'menu_update', 'status_change'
    webhook_url TEXT NOT NULL,
    secret_token TEXT, -- For webhook verification
    is_active BOOLEAN DEFAULT true,
    retry_config JSONB DEFAULT '{"max_attempts": 3, "backoff_multiplier": 2}',
    last_triggered_at TIMESTAMP(3) WITHOUT TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3) WITHOUT TIME ZONE,

    CONSTRAINT channel_webhooks_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id)
);

-- ================================
-- 7. CHANNEL SYNC SCHEDULES
-- Automated sync scheduling and configuration
-- ================================
CREATE TABLE IF NOT EXISTS channel_sync_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_channel_assignment_id TEXT NOT NULL,
    sync_type TEXT NOT NULL, -- 'menu_sync', 'product_sync', 'order_sync'
    schedule_cron TEXT NOT NULL, -- Cron expression for scheduling
    is_enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    last_run_at TIMESTAMP(3) WITHOUT TIME ZONE,
    next_run_at TIMESTAMP(3) WITHOUT TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_duration_ms INTEGER DEFAULT 0,
    sync_config JSONB DEFAULT '{}', -- Schedule-specific sync configuration
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3) WITHOUT TIME ZONE,

    CONSTRAINT channel_sync_schedules_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Delivery channels indexes
CREATE INDEX IF NOT EXISTS idx_delivery_channels_slug ON delivery_channels(slug);
CREATE INDEX IF NOT EXISTS idx_delivery_channels_type ON delivery_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_delivery_channels_active ON delivery_channels(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_delivery_channels_deleted ON delivery_channels(deleted_at) WHERE deleted_at IS NULL;

-- Company channel assignments indexes
CREATE INDEX IF NOT EXISTS idx_company_channel_assignments_company_id ON company_channel_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_company_channel_assignments_channel_id ON company_channel_assignments(channel_id);
CREATE INDEX IF NOT EXISTS idx_company_channel_assignments_enabled ON company_channel_assignments(company_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_company_channel_assignments_sync_status ON company_channel_assignments(sync_status);
CREATE INDEX IF NOT EXISTS idx_company_channel_assignments_last_sync ON company_channel_assignments(last_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_channel_assignments_deleted ON company_channel_assignments(deleted_at) WHERE deleted_at IS NULL;

-- Platform menu channel assignments indexes
CREATE INDEX IF NOT EXISTS idx_platform_menu_channel_assignments_platform_menu_id ON platform_menu_channel_assignments(platform_menu_id);
CREATE INDEX IF NOT EXISTS idx_platform_menu_channel_assignments_company_channel_id ON platform_menu_channel_assignments(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_platform_menu_channel_assignments_branch_id ON platform_menu_channel_assignments(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_menu_channel_assignments_active ON platform_menu_channel_assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_menu_channel_assignments_sync_status ON platform_menu_channel_assignments(menu_sync_status);
CREATE INDEX IF NOT EXISTS idx_platform_menu_channel_assignments_deleted ON platform_menu_channel_assignments(deleted_at) WHERE deleted_at IS NULL;

-- Channel sync logs indexes
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_company_channel_id ON channel_sync_logs(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_platform_menu_channel_id ON channel_sync_logs(platform_menu_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_sync_type ON channel_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_sync_status ON channel_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_started_at ON channel_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_completed_at ON channel_sync_logs(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Channel product mappings indexes
CREATE INDEX IF NOT EXISTS idx_channel_product_mappings_platform_menu_item_id ON channel_product_mappings(platform_menu_item_id);
CREATE INDEX IF NOT EXISTS idx_channel_product_mappings_company_channel_id ON channel_product_mappings(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_product_mappings_external_product_id ON channel_product_mappings(external_product_id);
CREATE INDEX IF NOT EXISTS idx_channel_product_mappings_sync_status ON channel_product_mappings(sync_status);
CREATE INDEX IF NOT EXISTS idx_channel_product_mappings_deleted ON channel_product_mappings(deleted_at) WHERE deleted_at IS NULL;

-- Channel webhooks indexes
CREATE INDEX IF NOT EXISTS idx_channel_webhooks_company_channel_id ON channel_webhooks(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_webhooks_type ON channel_webhooks(webhook_type);
CREATE INDEX IF NOT EXISTS idx_channel_webhooks_active ON channel_webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_channel_webhooks_deleted ON channel_webhooks(deleted_at) WHERE deleted_at IS NULL;

-- Channel sync schedules indexes
CREATE INDEX IF NOT EXISTS idx_channel_sync_schedules_company_channel_id ON channel_sync_schedules(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_schedules_enabled ON channel_sync_schedules(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_channel_sync_schedules_next_run ON channel_sync_schedules(next_run_at ASC) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_channel_sync_schedules_deleted ON channel_sync_schedules(deleted_at) WHERE deleted_at IS NULL;

-- ================================
-- INSERT DEFAULT DELIVERY CHANNELS
-- ================================
INSERT INTO delivery_channels (
    name, slug, channel_type, provider_name,
    is_active, is_system_default, configuration, supported_features
) VALUES
(
    'Talabat', 'talabat', 'delivery', 'Talabat Technologies',
    true, false,
    '{"api_version": "v2", "rate_limit": 100, "timeout": 30000}',
    '["menu_sync", "order_sync", "status_updates", "real_time_tracking"]'
),
(
    'Careem Now', 'careem', 'delivery', 'Careem Inc.',
    true, false,
    '{"api_version": "v1", "rate_limit": 150, "timeout": 25000}',
    '["menu_sync", "order_sync", "status_updates", "inventory_sync"]'
),
(
    'Deliveroo', 'deliveroo', 'delivery', 'Deliveroo',
    true, false,
    '{"api_version": "v1", "rate_limit": 200, "timeout": 20000}',
    '["menu_sync", "order_sync", "status_updates"]'
),
(
    'Website', 'website', 'direct', 'Internal Platform',
    true, true,
    '{"direct_integration": true, "real_time": true}',
    '["menu_sync", "order_sync", "status_updates", "real_time_updates", "inventory_sync"]'
),
(
    'Call Center', 'call_center', 'direct', 'Internal Platform',
    true, true,
    '{"direct_integration": true, "real_time": true}',
    '["menu_sync", "order_sync", "status_updates", "real_time_updates"]'
),
(
    'Dine In', 'dine_in', 'dine_in', 'Internal Platform',
    true, true,
    '{"direct_integration": true, "real_time": true}',
    '["menu_sync", "order_sync", "status_updates", "real_time_updates"]'
);

-- Insert default system configuration
INSERT INTO delivery_channels (
    name, slug, channel_type, provider_name,
    is_active, is_system_default, configuration, supported_features
) VALUES (
    'Custom Channel', 'custom', 'custom', 'Custom Integration',
    true, false,
    '{"configurable": true, "api_version": "flexible"}',
    '["menu_sync", "configurable_features"]'
);

COMMIT;

-- ================================
-- VERIFICATION QUERIES
-- ================================
SELECT 'CHANNEL ASSIGNMENT SYSTEM CREATED SUCCESSFULLY' as status;
SELECT 'Delivery Channels:', COUNT(*) FROM delivery_channels;
SELECT 'Tables Created:', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%channel%';