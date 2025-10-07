-- Menu Synchronization System Migration
-- Created: 2025-10-02
-- Description: Creates tables for multi-platform menu management and synchronization

-- Main menus table
CREATE TABLE IF NOT EXISTS menus (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3),
    created_by TEXT,
    updated_by TEXT
);

-- Indexes for menus
CREATE INDEX IF NOT EXISTS idx_menus_company_id ON menus(company_id);
CREATE INDEX IF NOT EXISTS idx_menus_company_id_is_active ON menus(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menus_created_at ON menus(created_at);

-- Menu-Branch junction table
CREATE TABLE IF NOT EXISTS menu_branches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    UNIQUE(menu_id, branch_id)
);

-- Indexes for menu_branches
CREATE INDEX IF NOT EXISTS idx_menu_branches_menu_id ON menu_branches(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_branches_branch_id ON menu_branches(branch_id);

-- Menu-Channel configuration table
CREATE TABLE IF NOT EXISTS menu_channels (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    channel_code VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    UNIQUE(menu_id, channel_code)
);

-- Indexes for menu_channels
CREATE INDEX IF NOT EXISTS idx_menu_channels_menu_id ON menu_channels(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_channels_channel_code ON menu_channels(channel_code);

-- Menu-Product mapping table
CREATE TABLE IF NOT EXISTS menu_product_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    UNIQUE(menu_id, product_id)
);

-- Indexes for menu_product_mappings
CREATE INDEX IF NOT EXISTS idx_menu_product_mappings_menu_id ON menu_product_mappings(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_product_mappings_product_id ON menu_product_mappings(product_id);

-- Menu sync status tracking table
CREATE TABLE IF NOT EXISTS menu_sync_statuses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    channel_code VARCHAR(50) NOT NULL,
    is_synced BOOLEAN NOT NULL DEFAULT false,
    last_sync_at TIMESTAMP(3),
    sync_status VARCHAR(50),
    sync_error TEXT,
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    UNIQUE(menu_id, channel_code)
);

-- Indexes for menu_sync_statuses
CREATE INDEX IF NOT EXISTS idx_menu_sync_statuses_menu_id ON menu_sync_statuses(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_sync_statuses_channel_code_is_synced ON menu_sync_statuses(channel_code, is_synced);
CREATE INDEX IF NOT EXISTS idx_menu_sync_statuses_last_sync_at ON menu_sync_statuses(last_sync_at);

-- Update trigger for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_sync_statuses_updated_at BEFORE UPDATE ON menu_sync_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
