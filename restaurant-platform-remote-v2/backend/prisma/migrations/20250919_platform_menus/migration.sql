-- Platform-Specific Menu Management System Migration
-- Date: 2025-09-19
-- Purpose: Add platform-specific menu tables for next-level menu management

-- Platform-specific menus
CREATE TABLE platform_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  platform_type VARCHAR(50) NOT NULL,
  name JSONB NOT NULL, -- Multi-language support
  description JSONB,
  is_active BOOLEAN DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  sync_status VARCHAR(20) DEFAULT 'draft',
  last_synced_at TIMESTAMP,
  external_menu_id VARCHAR(255), -- Platform's internal menu ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  -- Constraints
  UNIQUE(company_id, platform_type, branch_id)
);

-- Platform-specific categories
CREATE TABLE platform_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
  name JSONB NOT NULL,
  description JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  parent_category_id UUID REFERENCES platform_menu_categories(id),
  image_url VARCHAR(500),
  external_category_id VARCHAR(255), -- Platform's internal category ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID
);

-- Platform menu items (junction table)
CREATE TABLE platform_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,
  platform_category_id UUID REFERENCES platform_menu_categories(id),
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  platform_specific_data JSONB NOT NULL DEFAULT '{}',
  availability_schedule JSONB,
  external_item_id VARCHAR(255), -- Platform's internal item ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  -- Constraints
  UNIQUE(platform_menu_id, product_id)
);

-- Sync operation logs
CREATE TABLE platform_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled', 'automatic'
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  items_processed INTEGER DEFAULT 0,
  items_total INTEGER DEFAULT 0,
  errors JSONB,
  performance_metrics JSONB,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  initiated_by UUID, -- User who initiated the sync

  -- Indexes for performance
  INDEX idx_platform_sync_logs_menu_id (platform_menu_id),
  INDEX idx_platform_sync_logs_status (status),
  INDEX idx_platform_sync_logs_started_at (started_at)
);

-- Menu templates for quick setup
CREATE TABLE menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL, -- 'qsr', 'fine_dining', 'coffee_shop', etc.
  is_public BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  -- Indexes
  INDEX idx_menu_templates_company_id (company_id),
  INDEX idx_menu_templates_template_type (template_type),
  INDEX idx_menu_templates_is_public (is_public)
);

-- Platform analytics and insights
CREATE TABLE platform_menu_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_menu_id UUID NOT NULL REFERENCES platform_menus(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One record per platform per day
  UNIQUE(platform_menu_id, date),
  INDEX idx_platform_menu_analytics_date (date)
);

-- Performance Indexes for fast queries
CREATE INDEX idx_platform_menus_company_id ON platform_menus(company_id);
CREATE INDEX idx_platform_menus_platform_type ON platform_menus(platform_type);
CREATE INDEX idx_platform_menus_sync_status ON platform_menus(sync_status);
CREATE INDEX idx_platform_menus_is_active ON platform_menus(is_active);

CREATE INDEX idx_platform_menu_categories_menu_id ON platform_menu_categories(platform_menu_id);
CREATE INDEX idx_platform_menu_categories_display_order ON platform_menu_categories(display_order);

CREATE INDEX idx_platform_menu_items_menu_id ON platform_menu_items(platform_menu_id);
CREATE INDEX idx_platform_menu_items_product_id ON platform_menu_items(product_id);
CREATE INDEX idx_platform_menu_items_category_id ON platform_menu_items(platform_category_id);
CREATE INDEX idx_platform_menu_items_display_order ON platform_menu_items(display_order);

-- Add comments for documentation
COMMENT ON TABLE platform_menus IS 'Platform-specific menu configurations for different delivery platforms';
COMMENT ON TABLE platform_menu_categories IS 'Categories within platform-specific menus';
COMMENT ON TABLE platform_menu_items IS 'Items within platform-specific menus, linked to master products';
COMMENT ON TABLE platform_sync_logs IS 'Sync operation history and logs';
COMMENT ON TABLE menu_templates IS 'Reusable menu templates for quick menu setup';
COMMENT ON TABLE platform_menu_analytics IS 'Daily analytics data for platform menu performance';