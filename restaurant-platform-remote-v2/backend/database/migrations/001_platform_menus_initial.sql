-- ================================================
-- Platform Menu System - Initial Migration
-- Restaurant Platform v2 - Database Migration
-- ================================================

-- Migration: 001_platform_menus_initial
-- Description: Create initial platform menu management tables
-- Target: PostgreSQL 14+
-- Performance: Optimized with strategic indexes

BEGIN;

-- ================================================
-- 1. CREATE ENUM TYPES
-- ================================================

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

CREATE TYPE menu_status AS ENUM (
  'draft',
  'active',
  'inactive',
  'scheduled',
  'syncing',
  'sync_failed'
);

CREATE TYPE sync_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partial'
);

-- ================================================
-- 2. CREATE CORE TABLES
-- ================================================

-- Platform-Specific Menus
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
  platform_config JSONB DEFAULT '{}',
  display_config JSONB DEFAULT '{}',

  -- Scheduling
  active_from TIMESTAMP,
  active_until TIMESTAMP,
  schedule_config JSONB,

  -- Sync Management
  last_synced_at TIMESTAMP,
  sync_status sync_status DEFAULT 'pending',
  sync_error_message TEXT,
  sync_attempt_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  -- Constraints
  CONSTRAINT unique_company_platform_branch UNIQUE(company_id, platform, branch_id) WHERE deleted_at IS NULL
);

-- Platform Menu Items
CREATE TABLE platform_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,

  -- Display Configuration
  display_name JSONB,
  display_description JSONB,
  display_image VARCHAR(500),

  -- Pricing Override
  platform_price DECIMAL(10,2),
  pricing_config JSONB DEFAULT '{}',

  -- Availability
  is_available BOOLEAN DEFAULT true,
  availability_schedule JSONB,
  max_daily_quantity INTEGER,
  current_quantity INTEGER DEFAULT 0,

  -- Display & Ordering
  category_override VARCHAR(200),
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',

  -- Platform-Specific Data
  platform_metadata JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  CONSTRAINT unique_platform_menu_product UNIQUE(platform_menu_id, product_id) WHERE deleted_at IS NULL
);

-- Platform Menu Categories
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
  color_theme VARCHAR(7),
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

-- Platform Menu Category Items
CREATE TABLE platform_menu_category_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_category_id UUID NOT NULL REFERENCES platform_menu_categories(id) ON DELETE CASCADE,
  platform_menu_item_id UUID NOT NULL REFERENCES platform_menu_items(id) ON DELETE CASCADE,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_category_item UNIQUE(platform_menu_category_id, platform_menu_item_id)
);

-- Menu Sync History
CREATE TABLE menu_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,

  -- Sync Details
  sync_type VARCHAR(50) NOT NULL,
  sync_status sync_status NOT NULL,

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
  initiated_by UUID
);

-- Platform Menu Templates
CREATE TABLE platform_menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Information
  name JSONB NOT NULL,
  description JSONB,
  template_type VARCHAR(50),

  -- Platform Configuration
  supported_platforms delivery_platform[] DEFAULT '{}',
  template_config JSONB NOT NULL,

  -- Usage & Analytics
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- ================================================
-- 3. CREATE PERFORMANCE INDEXES
-- ================================================

-- Core Query Optimization
CREATE INDEX idx_platform_menus_company_platform
  ON platform_menus(company_id, platform)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_platform_menus_active
  ON platform_menus(company_id, is_active, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_platform_menus_sync_status
  ON platform_menus(sync_status, last_synced_at);

CREATE INDEX idx_platform_menus_branch
  ON platform_menus(branch_id, platform)
  WHERE deleted_at IS NULL AND branch_id IS NOT NULL;

-- Menu Items Performance
CREATE INDEX idx_platform_menu_items_menu_available
  ON platform_menu_items(platform_menu_id, is_available)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_platform_menu_items_display_order
  ON platform_menu_items(platform_menu_id, display_order);

CREATE INDEX idx_platform_menu_items_featured
  ON platform_menu_items(platform_menu_id, is_featured)
  WHERE is_featured = true;

CREATE INDEX idx_platform_menu_items_product
  ON platform_menu_items(product_id)
  WHERE deleted_at IS NULL;

-- Category Organization
CREATE INDEX idx_platform_menu_categories_menu_order
  ON platform_menu_categories(platform_menu_id, display_order)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_platform_menu_category_items_order
  ON platform_menu_category_items(platform_menu_category_id, display_order);

-- Sync History Performance
CREATE INDEX idx_menu_sync_history_platform_status
  ON menu_sync_history(platform_menu_id, sync_status);

CREATE INDEX idx_menu_sync_history_time_range
  ON menu_sync_history(started_at DESC, platform_menu_id);

CREATE INDEX idx_menu_sync_history_user
  ON menu_sync_history(initiated_by, started_at DESC)
  WHERE initiated_by IS NOT NULL;

-- Search Optimization for JSONB fields
CREATE INDEX idx_platform_menus_name_gin
  ON platform_menus USING gin(name);

CREATE INDEX idx_platform_menu_items_name_gin
  ON platform_menu_items USING gin(display_name);

CREATE INDEX idx_platform_menu_items_metadata_gin
  ON platform_menu_items USING gin(platform_metadata);

CREATE INDEX idx_platform_menu_items_tags_gin
  ON platform_menu_items USING gin(tags);

-- Template Search
CREATE INDEX idx_platform_menu_templates_name_gin
  ON platform_menu_templates USING gin(name);

CREATE INDEX idx_platform_menu_templates_platforms
  ON platform_menu_templates USING gin(supported_platforms);

-- ================================================
-- 4. CREATE TRIGGERS
-- ================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_platform_menus_updated_at
  BEFORE UPDATE ON platform_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_menu_items_updated_at
  BEFORE UPDATE ON platform_menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_menu_categories_updated_at
  BEFORE UPDATE ON platform_menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_menu_templates_updated_at
  BEFORE UPDATE ON platform_menu_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sync attempt counter trigger
CREATE OR REPLACE FUNCTION increment_sync_attempt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sync_status = 'in_progress' AND OLD.sync_status != 'in_progress' THEN
        NEW.sync_attempt_count = COALESCE(OLD.sync_attempt_count, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_attempt_counter
  BEFORE UPDATE ON platform_menus
  FOR EACH ROW EXECUTE FUNCTION increment_sync_attempt();

-- ================================================
-- 5. CREATE OPTIMIZED VIEWS
-- ================================================

-- Platform menu overview for listing
CREATE VIEW platform_menu_overview AS
SELECT
  pm.id,
  pm.company_id,
  pm.branch_id,
  pm.platform,
  pm.name,
  pm.status,
  pm.is_active,
  pm.last_synced_at,
  pm.sync_status,
  pm.priority,
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

-- Recent sync activity view
CREATE VIEW recent_sync_activity AS
SELECT
  msh.*,
  pm.name as menu_name,
  pm.platform,
  pm.company_id,
  c.name as company_name
FROM menu_sync_history msh
JOIN platform_menus pm ON msh.platform_menu_id = pm.id
JOIN companies c ON pm.company_id = c.id
ORDER BY msh.started_at DESC;

-- ================================================
-- 6. INSERT DEFAULT DATA
-- ================================================

-- Insert default menu templates
INSERT INTO platform_menu_templates (name, description, template_type, supported_platforms, template_config, is_featured) VALUES
(
  '{"en": "Quick Service Template", "ar": "قالب الخدمة السريعة"}',
  '{"en": "Perfect for fast food and quick service restaurants", "ar": "مثالي للوجبات السريعة ومطاعم الخدمة السريعة"}',
  'quick_service',
  ARRAY['call_center', 'website', 'kiosk']::delivery_platform[],
  '{
    "categories": [
      {"name": {"en": "Burgers", "ar": "برجر"}, "order": 1},
      {"name": {"en": "Sides", "ar": "جوانب"}, "order": 2},
      {"name": {"en": "Drinks", "ar": "مشروبات"}, "order": 3}
    ],
    "display": {
      "showImages": true,
      "showPrices": true,
      "columnsPerRow": 3
    }
  }',
  true
),
(
  '{"en": "Fine Dining Template", "ar": "قالب الطعام الفاخر"}',
  '{"en": "Elegant template for upscale restaurants", "ar": "قالب أنيق للمطاعم الراقية"}',
  'fine_dining',
  ARRAY['website', 'mobile_app']::delivery_platform[],
  '{
    "categories": [
      {"name": {"en": "Appetizers", "ar": "مقبلات"}, "order": 1},
      {"name": {"en": "Main Courses", "ar": "الأطباق الرئيسية"}, "order": 2},
      {"name": {"en": "Desserts", "ar": "حلويات"}, "order": 3}
    ],
    "display": {
      "showImages": true,
      "showPrices": false,
      "showDescriptions": true,
      "columnsPerRow": 2
    }
  }',
  true
);

-- ================================================
-- 7. CREATE SECURITY POLICIES (RLS)
-- ================================================

-- Enable Row Level Security
ALTER TABLE platform_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_sync_history ENABLE ROW LEVEL SECURITY;

-- Platform menus policy - users can only access their company's data
CREATE POLICY platform_menus_company_policy ON platform_menus
  FOR ALL
  USING (
    company_id = current_setting('app.current_company_id', true)::UUID
    OR current_setting('app.current_user_role', true) = 'super_admin'
  );

-- Platform menu items policy
CREATE POLICY platform_menu_items_company_policy ON platform_menu_items
  FOR ALL
  USING (
    platform_menu_id IN (
      SELECT id FROM platform_menus
      WHERE company_id = current_setting('app.current_company_id', true)::UUID
        OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- Platform menu categories policy
CREATE POLICY platform_menu_categories_company_policy ON platform_menu_categories
  FOR ALL
  USING (
    platform_menu_id IN (
      SELECT id FROM platform_menus
      WHERE company_id = current_setting('app.current_company_id', true)::UUID
        OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- Sync history policy
CREATE POLICY menu_sync_history_company_policy ON menu_sync_history
  FOR ALL
  USING (
    platform_menu_id IN (
      SELECT id FROM platform_menus
      WHERE company_id = current_setting('app.current_company_id', true)::UUID
        OR current_setting('app.current_user_role', true) = 'super_admin'
    )
  );

-- ================================================
-- 8. GRANT PERMISSIONS
-- ================================================

-- Grant permissions to application role (assuming 'app_role' exists)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- ================================================
-- 9. MIGRATION VALIDATION
-- ================================================

-- Verify all tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'platform_menus',
        'platform_menu_items',
        'platform_menu_categories',
        'platform_menu_category_items',
        'menu_sync_history',
        'platform_menu_templates'
    );

    IF table_count != 6 THEN
        RAISE EXCEPTION 'Migration validation failed: Expected 6 tables, found %', table_count;
    END IF;

    RAISE NOTICE 'Migration validation passed: All 6 tables created successfully';
END $$;

-- Verify indexes were created
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_platform_%';

    IF index_count < 10 THEN
        RAISE EXCEPTION 'Migration validation failed: Expected at least 10 indexes, found %', index_count;
    END IF;

    RAISE NOTICE 'Migration validation passed: All performance indexes created successfully';
END $$;

COMMIT;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Log migration completion
INSERT INTO schema_migrations (version, migrated_at) VALUES ('001_platform_menus_initial', NOW())
ON CONFLICT (version) DO UPDATE SET migrated_at = NOW();

-- Display completion message
SELECT
  'Platform Menu Migration Completed Successfully' as status,
  NOW() as completed_at,
  '001_platform_menus_initial' as version;