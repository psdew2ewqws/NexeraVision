-- ================================================
-- Platform-Specific Menu Management Schema
-- Restaurant Platform v2 - Backend Architecture
-- ================================================

-- 1. Delivery Platform Types
CREATE TYPE delivery_platform AS ENUM (
  'call_center',
  'talabat',
  'careem',
  'website',
  'chatbot',
  'online_ordering',
  'in_store_display',
  'kiosk',
  'mobile_app'
);

-- 2. Menu Status Types
CREATE TYPE menu_status AS ENUM (
  'draft',
  'active',
  'inactive',
  'scheduled',
  'syncing',
  'sync_failed'
);

-- 3. Platform-Specific Menus
-- Main menu container for platform-specific configurations
CREATE TABLE platform_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  -- Platform Configuration
  platform delivery_platform NOT NULL,
  name JSONB NOT NULL, -- {"en": "Careem Menu", "ar": "قائمة كريم"}
  description JSONB,

  -- Menu Status & Visibility
  status menu_status DEFAULT 'draft',
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,

  -- Platform-Specific Settings
  platform_config JSONB DEFAULT '{}', -- Platform-specific configurations
  display_config JSONB DEFAULT '{}',  -- Display customizations

  -- Scheduling
  active_from TIMESTAMP,
  active_until TIMESTAMP,
  schedule_config JSONB, -- Recurring schedule patterns

  -- Sync Management
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending',
  sync_error_message TEXT,
  sync_attempt_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  -- Performance Indexes
  CONSTRAINT unique_company_platform_branch UNIQUE(company_id, platform, branch_id) WHERE deleted_at IS NULL
);

-- 4. Platform Menu Items
-- Links products to platform menus with customizations
CREATE TABLE platform_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,

  -- Display Configuration
  display_name JSONB, -- Override product name for this platform
  display_description JSONB, -- Platform-specific description
  display_image VARCHAR(500), -- Platform-specific image

  -- Pricing Override
  platform_price DECIMAL(10,2), -- Override base price
  pricing_config JSONB DEFAULT '{}', -- Complex pricing rules

  -- Availability
  is_available BOOLEAN DEFAULT true,
  availability_schedule JSONB, -- Time-based availability
  max_daily_quantity INTEGER,
  current_quantity INTEGER DEFAULT 0,

  -- Display & Ordering
  category_override VARCHAR(200), -- Platform-specific category
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]', -- Platform-specific tags

  -- Platform-Specific Data
  platform_metadata JSONB DEFAULT '{}', -- Platform-specific fields

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  CONSTRAINT unique_platform_menu_product UNIQUE(platform_menu_id, product_id) WHERE deleted_at IS NULL
);

-- 5. Platform Menu Categories
-- Platform-specific category organization
CREATE TABLE platform_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,

  -- Category Information
  name JSONB NOT NULL,
  description JSONB,
  image VARCHAR(500),

  -- Display Configuration
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  color_theme VARCHAR(7), -- Hex color code
  icon VARCHAR(100),

  -- Platform-Specific Settings
  platform_specific_config JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID
);

-- 6. Platform Menu Category Items
-- Links menu items to platform categories
CREATE TABLE platform_menu_category_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_category_id UUID NOT NULL REFERENCES platform_menu_categories(id) ON DELETE CASCADE,
  platform_menu_item_id UUID NOT NULL REFERENCES platform_menu_items(id) ON DELETE CASCADE,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_category_item UNIQUE(platform_menu_category_id, platform_menu_item_id)
);

-- 7. Menu Sync History
-- Track sync operations for audit and debugging
CREATE TABLE menu_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,

  -- Sync Details
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'webhook'
  sync_status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'

  -- Performance Metrics
  items_synced INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  api_calls_made INTEGER DEFAULT 0,

  -- Error Handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  initiated_by UUID -- User who triggered sync
);

-- 8. Platform Templates
-- Pre-configured menu templates for quick setup
CREATE TABLE platform_menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Information
  name JSONB NOT NULL,
  description JSONB,
  template_type VARCHAR(50), -- 'quick_service', 'fine_dining', 'coffee_shop'

  -- Platform Configuration
  supported_platforms delivery_platform[] DEFAULT '{}',
  template_config JSONB NOT NULL, -- Complete menu structure

  -- Usage & Analytics
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- ================================================
-- HIGH-PERFORMANCE INDEXES
-- ================================================

-- Core Query Optimization
CREATE INDEX idx_platform_menus_company_platform ON platform_menus(company_id, platform) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_menus_active ON platform_menus(company_id, is_active, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_menus_sync_status ON platform_menus(sync_status, last_synced_at);

-- Menu Items Performance
CREATE INDEX idx_platform_menu_items_menu_available ON platform_menu_items(platform_menu_id, is_available) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_menu_items_display_order ON platform_menu_items(platform_menu_id, display_order);
CREATE INDEX idx_platform_menu_items_featured ON platform_menu_items(platform_menu_id, is_featured) WHERE is_featured = true;

-- Category Organization
CREATE INDEX idx_platform_menu_categories_menu_order ON platform_menu_categories(platform_menu_id, display_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_menu_category_items_order ON platform_menu_category_items(platform_menu_category_id, display_order);

-- Sync History Performance
CREATE INDEX idx_menu_sync_history_platform_status ON menu_sync_history(platform_menu_id, sync_status);
CREATE INDEX idx_menu_sync_history_time_range ON menu_sync_history(started_at DESC, platform_menu_id);

-- Search Optimization for JSONB fields
CREATE INDEX idx_platform_menus_name_gin ON platform_menus USING gin(name);
CREATE INDEX idx_platform_menu_items_name_gin ON platform_menu_items USING gin(display_name);
CREATE INDEX idx_platform_menu_items_metadata_gin ON platform_menu_items USING gin(platform_metadata);

-- ================================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- ================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_platform_menus_updated_at BEFORE UPDATE ON platform_menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_menu_items_updated_at BEFORE UPDATE ON platform_menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_menu_categories_updated_at BEFORE UPDATE ON platform_menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- PERFORMANCE VIEWS
-- ================================================

-- Optimized view for menu listing
CREATE VIEW platform_menu_overview AS
SELECT
  pm.id,
  pm.company_id,
  pm.platform,
  pm.name,
  pm.status,
  pm.is_active,
  pm.last_synced_at,
  COUNT(pmi.id) as item_count,
  COUNT(CASE WHEN pmi.is_available = true THEN 1 END) as available_items,
  pm.created_at,
  pm.updated_at
FROM platform_menus pm
LEFT JOIN platform_menu_items pmi ON pm.id = pmi.platform_menu_id AND pmi.deleted_at IS NULL
WHERE pm.deleted_at IS NULL
GROUP BY pm.id;

-- Menu items with product details
CREATE VIEW platform_menu_items_detailed AS
SELECT
  pmi.*,
  mp.name as product_name,
  mp.base_price as product_base_price,
  mp.status as product_status,
  mp.tags as product_tags,
  mc.name as original_category_name
FROM platform_menu_items pmi
JOIN menu_products mp ON pmi.product_id = mp.id
LEFT JOIN menu_categories mc ON mp.category_id = mc.id
WHERE pmi.deleted_at IS NULL AND mp.deleted_at IS NULL;