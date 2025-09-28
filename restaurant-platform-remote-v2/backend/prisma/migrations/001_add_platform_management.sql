-- Migration: Add Platform Management System
-- This migration adds the comprehensive platform management system

-- Create platforms table
CREATE TABLE IF NOT EXISTS "platforms" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "display_name" JSONB NOT NULL DEFAULT '{}',
    "platform_type" VARCHAR(50) NOT NULL DEFAULT 'internal',
    "status" INTEGER NOT NULL DEFAULT 1,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "api_config" JSONB DEFAULT '{}',
    "is_system_default" BOOLEAN DEFAULT FALSE,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),

    CONSTRAINT "platforms_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
    CONSTRAINT "platforms_name_company_unique" UNIQUE("company_id", "name")
);

-- Create indexes for platforms
CREATE INDEX IF NOT EXISTS "idx_platforms_company_id" ON "platforms"("company_id");
CREATE INDEX IF NOT EXISTS "idx_platforms_type" ON "platforms"("platform_type");
CREATE INDEX IF NOT EXISTS "idx_platforms_status" ON "platforms"("status");
CREATE INDEX IF NOT EXISTS "idx_platforms_sort" ON "platforms"("sort_order");

-- Create product_platform_assignments table
CREATE TABLE IF NOT EXISTS "product_platform_assignments" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" VARCHAR(36) NOT NULL,
    "platform_id" VARCHAR(36) NOT NULL,
    "company_id" VARCHAR(36) NOT NULL,

    -- Platform-specific product data
    "platform_product_id" VARCHAR(255),
    "platform_name" JSONB,
    "platform_description" JSONB,
    "platform_price" DECIMAL(10,2),
    "platform_image_url" VARCHAR(500),

    -- Availability and scheduling
    "is_available" BOOLEAN DEFAULT TRUE,
    "available_from" TIME,
    "available_to" TIME,
    "available_days" INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],

    -- Platform-specific configuration
    "platform_config" JSONB DEFAULT '{}',
    "sync_status" VARCHAR(50) DEFAULT 'pending',
    "last_synced_at" TIMESTAMP WITH TIME ZONE,
    "sync_error_message" TEXT,

    -- Audit fields
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),

    CONSTRAINT "ppa_product_fkey" FOREIGN KEY ("product_id") REFERENCES "menu_products"("id") ON DELETE CASCADE,
    CONSTRAINT "ppa_platform_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE,
    CONSTRAINT "ppa_company_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
    CONSTRAINT "ppa_product_platform_unique" UNIQUE("product_id", "platform_id")
);

-- Create indexes for product_platform_assignments
CREATE INDEX IF NOT EXISTS "idx_ppa_company" ON "product_platform_assignments"("company_id");
CREATE INDEX IF NOT EXISTS "idx_ppa_product" ON "product_platform_assignments"("product_id");
CREATE INDEX IF NOT EXISTS "idx_ppa_platform" ON "product_platform_assignments"("platform_id");
CREATE INDEX IF NOT EXISTS "idx_ppa_sync_status" ON "product_platform_assignments"("sync_status");
CREATE INDEX IF NOT EXISTS "idx_ppa_available" ON "product_platform_assignments"("is_available");

-- Create platform_categories table
CREATE TABLE IF NOT EXISTS "platform_categories" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "platform_id" VARCHAR(36) NOT NULL,
    "category_id" VARCHAR(36) NOT NULL,
    "company_id" VARCHAR(36) NOT NULL,

    -- Platform-specific category data
    "platform_category_id" VARCHAR(255),
    "platform_name" JSONB,
    "is_visible" BOOLEAN DEFAULT TRUE,
    "sort_order" INTEGER DEFAULT 0,

    -- Sync tracking
    "sync_status" VARCHAR(50) DEFAULT 'pending',
    "last_synced_at" TIMESTAMP WITH TIME ZONE,

    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT "pc_platform_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE,
    CONSTRAINT "pc_category_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE CASCADE,
    CONSTRAINT "pc_company_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
    CONSTRAINT "pc_platform_category_unique" UNIQUE("platform_id", "category_id")
);

-- Create indexes for platform_categories
CREATE INDEX IF NOT EXISTS "idx_pc_company" ON "platform_categories"("company_id");
CREATE INDEX IF NOT EXISTS "idx_pc_platform" ON "platform_categories"("platform_id");
CREATE INDEX IF NOT EXISTS "idx_pc_category" ON "platform_categories"("category_id");
CREATE INDEX IF NOT EXISTS "idx_pc_sync_status" ON "platform_categories"("sync_status");

-- Create platform_analytics table
CREATE TABLE IF NOT EXISTS "platform_analytics" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "platform_id" VARCHAR(36) NOT NULL,
    "company_id" VARCHAR(36) NOT NULL,
    "date" DATE NOT NULL,

    -- Key metrics
    "total_products" INTEGER DEFAULT 0,
    "active_products" INTEGER DEFAULT 0,
    "orders_count" INTEGER DEFAULT 0,
    "revenue" DECIMAL(12,2) DEFAULT 0,
    "sync_success_rate" DECIMAL(5,2) DEFAULT 0,

    -- Performance metrics
    "avg_sync_time_ms" INTEGER DEFAULT 0,
    "failed_syncs" INTEGER DEFAULT 0,
    "manual_interventions" INTEGER DEFAULT 0,

    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT "pa_platform_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE,
    CONSTRAINT "pa_company_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
    CONSTRAINT "pa_platform_date_unique" UNIQUE("platform_id", "date")
);

-- Create indexes for platform_analytics
CREATE INDEX IF NOT EXISTS "idx_pa_company_date" ON "platform_analytics"("company_id", "date");
CREATE INDEX IF NOT EXISTS "idx_pa_platform_date" ON "platform_analytics"("platform_id", "date");
CREATE INDEX IF NOT EXISTS "idx_pa_date" ON "platform_analytics"("date");

-- Create platform_audit_log table
CREATE TABLE IF NOT EXISTS "platform_audit_log" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "platform_id" VARCHAR(36),
    "product_id" VARCHAR(36),
    "company_id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),

    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(36),

    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB DEFAULT '{}',

    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT "pal_platform_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE SET NULL,
    CONSTRAINT "pal_product_fkey" FOREIGN KEY ("product_id") REFERENCES "menu_products"("id") ON DELETE SET NULL,
    CONSTRAINT "pal_company_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
    CONSTRAINT "pal_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create indexes for platform_audit_log
CREATE INDEX IF NOT EXISTS "idx_pal_company" ON "platform_audit_log"("company_id");
CREATE INDEX IF NOT EXISTS "idx_pal_action" ON "platform_audit_log"("action");
CREATE INDEX IF NOT EXISTS "idx_pal_date" ON "platform_audit_log"("created_at");
CREATE INDEX IF NOT EXISTS "idx_pal_user" ON "platform_audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_pal_platform" ON "platform_audit_log"("platform_id");

-- Add platform support to existing menu_products table
ALTER TABLE "menu_products"
ADD COLUMN IF NOT EXISTS "default_platforms" VARCHAR(36)[] DEFAULT ARRAY[]::VARCHAR(36)[],
ADD COLUMN IF NOT EXISTS "platform_sync_enabled" BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "platform_sync_config" JSONB DEFAULT '{}';

-- Create index for menu_products platforms
CREATE INDEX IF NOT EXISTS "idx_menu_products_platforms" ON "menu_products" USING GIN("default_platforms");

-- Add platform tracking to orders table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "source_platform_id" VARCHAR(36),
        ADD COLUMN IF NOT EXISTS "platform_order_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "platform_metadata" JSONB DEFAULT '{}';

        -- Add foreign key constraint
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                      WHERE constraint_name = 'orders_platform_fkey') THEN
            ALTER TABLE "orders"
            ADD CONSTRAINT "orders_platform_fkey"
            FOREIGN KEY ("source_platform_id") REFERENCES "platforms"("id");
        END IF;

        -- Create index
        CREATE INDEX IF NOT EXISTS "idx_orders_platform" ON "orders"("source_platform_id");
    END IF;
END $$;

-- Insert default platforms for existing companies
INSERT INTO "platforms" ("company_id", "name", "display_name", "platform_type", "is_system_default", "sort_order", "status")
SELECT
    c."id" as "company_id",
    'Internal Menu' as "name",
    '{"en": "Internal Menu", "ar": "القائمة الداخلية"}' as "display_name",
    'internal' as "platform_type",
    true as "is_system_default",
    0 as "sort_order",
    1 as "status"
FROM "companies" c
WHERE NOT EXISTS (
    SELECT 1 FROM "platforms" p
    WHERE p."company_id" = c."id"
    AND p."platform_type" = 'internal'
    AND p."is_system_default" = true
);

-- Insert delivery platform for companies that have delivery integrations
INSERT INTO "platforms" ("company_id", "name", "display_name", "platform_type", "sort_order", "status")
SELECT DISTINCT
    c."id" as "company_id",
    'Delivery Platforms' as "name",
    '{"en": "Delivery Platforms", "ar": "منصات التوصيل"}' as "display_name",
    'delivery' as "platform_type",
    1 as "sort_order",
    1 as "status"
FROM "companies" c
WHERE EXISTS (
    SELECT 1 FROM "delivery_providers" dp
    WHERE dp."company_id" = c."id"
    AND dp."status" = 1
)
AND NOT EXISTS (
    SELECT 1 FROM "platforms" p
    WHERE p."company_id" = c."id"
    AND p."platform_type" = 'delivery'
);

COMMENT ON TABLE "platforms" IS 'Core platform definitions for multi-channel restaurant management';
COMMENT ON TABLE "product_platform_assignments" IS 'Product assignments to specific platforms with platform-specific configurations';
COMMENT ON TABLE "platform_categories" IS 'Category assignments and configurations for platforms';
COMMENT ON TABLE "platform_analytics" IS 'Daily analytics and performance metrics for platforms';
COMMENT ON TABLE "platform_audit_log" IS 'Comprehensive audit trail for all platform operations';