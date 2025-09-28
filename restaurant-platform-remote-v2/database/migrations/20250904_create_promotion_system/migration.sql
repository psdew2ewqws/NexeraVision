-- Enterprise Promotion System - Multi-Platform Restaurant Integration
-- Based on Picolinate research + latest GitHub patterns 2024

-- Core promotion campaigns table
CREATE TABLE "promotion_campaigns" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" JSONB NOT NULL DEFAULT '{}', -- Multi-language support {"en": "Name", "ar": "اسم"}
  "description" JSONB DEFAULT '{}', -- Multi-language descriptions
  "slug" TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  "type" TEXT NOT NULL CHECK ("type" IN (
    'percentage_discount', 'fixed_discount', 'buy_x_get_y', 
    'free_shipping', 'minimum_order', 'loyalty_points',
    'first_time_customer', 'happy_hour', 'bulk_discount',
    'combo_deal', 'platform_exclusive'
  )),
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN (
    'draft', 'active', 'paused', 'expired', 'archived'
  )),
  "priority" INTEGER NOT NULL DEFAULT 999, -- 1 = highest priority
  "is_public" BOOLEAN NOT NULL DEFAULT true, -- Public vs private promotions
  "is_stackable" BOOLEAN NOT NULL DEFAULT false, -- Can combine with other promos
  
  -- Time restrictions
  "starts_at" TIMESTAMP WITH TIME ZONE,
  "ends_at" TIMESTAMP WITH TIME ZONE,
  "days_of_week" INTEGER[] DEFAULT '{}', -- 1=Monday, 7=Sunday
  "time_ranges" JSONB DEFAULT '[]', -- [{"start": "09:00", "end": "17:00"}]
  
  -- Usage limits
  "total_usage_limit" INTEGER, -- Total uses across all customers
  "per_customer_limit" INTEGER DEFAULT 1, -- Uses per customer
  "current_usage_count" INTEGER NOT NULL DEFAULT 0,
  
  -- Discount configuration
  "discount_value" DECIMAL(10,2), -- Percentage or fixed amount
  "max_discount_amount" DECIMAL(10,2), -- Cap for percentage discounts
  "minimum_order_amount" DECIMAL(10,2), -- Minimum order requirement
  "minimum_items_count" INTEGER DEFAULT 1,
  
  -- Buy X Get Y configuration
  "buy_quantity" INTEGER, -- Items to buy
  "get_quantity" INTEGER, -- Items to get free
  "get_discount_percentage" DECIMAL(5,2), -- Discount on "get" items
  
  -- Platform targeting
  "target_platforms" TEXT[] DEFAULT '{}', -- ['talabat', 'careem', 'website', 'call_center']
  "target_customer_segments" TEXT[] DEFAULT '{}', -- ['new', 'vip', 'regular']
  
  -- Analytics and tracking
  "total_revenue_impact" DECIMAL(15,2) DEFAULT 0,
  "total_orders_count" INTEGER DEFAULT 0,
  "total_customers_reached" INTEGER DEFAULT 0,
  
  -- Metadata
  "created_by" UUID REFERENCES "users"("id"),
  "updated_by" UUID REFERENCES "users"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

-- Promo codes for campaigns
CREATE TABLE "promotion_codes" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "campaign_id" UUID NOT NULL REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL, -- The actual promo code
  "is_single_use" BOOLEAN NOT NULL DEFAULT false,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE("campaign_id", "code")
);

-- Polymorphic promotion targets (products, categories, branches, customers)
CREATE TABLE "promotion_targets" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "campaign_id" UUID NOT NULL REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE,
  "target_type" TEXT NOT NULL, -- 'product', 'category', 'branch', 'customer', 'modifier'
  "target_id" UUID NOT NULL, -- Reference to the actual entity
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer usage tracking
CREATE TABLE "promotion_usage" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "campaign_id" UUID NOT NULL REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE,
  "code_id" UUID REFERENCES "promotion_codes"("id") ON DELETE CASCADE,
  "customer_id" UUID, -- Can be null for guest orders
  "customer_email" TEXT, -- Track by email if no account
  "customer_phone" TEXT, -- Track by phone for call center orders
  "order_id" UUID, -- Reference to order if available
  "usage_date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "discount_applied" DECIMAL(10,2) NOT NULL,
  "order_total" DECIMAL(10,2),
  "platform_used" TEXT, -- 'talabat', 'careem', 'website', 'call_center'
  "branch_id" UUID REFERENCES "branches"("id"),
  
  -- Analytics data
  "metadata" JSONB DEFAULT '{}' -- Store additional tracking info
);

-- Platform-specific promotion configurations
CREATE TABLE "promotion_platform_configs" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "campaign_id" UUID NOT NULL REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE,
  "platform" TEXT NOT NULL, -- 'talabat', 'careem', 'website', 'call_center'
  "platform_specific_id" TEXT, -- External platform promotion ID
  "custom_settings" JSONB DEFAULT '{}', -- Platform-specific configurations
  "is_synced" BOOLEAN DEFAULT false, -- Sync status with external platform
  "last_synced_at" TIMESTAMP WITH TIME ZONE,
  "sync_error" TEXT, -- Last sync error if any
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE("campaign_id", "platform")
);

-- Promotion performance analytics
CREATE TABLE "promotion_analytics" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "campaign_id" UUID NOT NULL REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "platform" TEXT NOT NULL,
  
  -- Usage metrics
  "total_uses" INTEGER DEFAULT 0,
  "unique_customers" INTEGER DEFAULT 0,
  "new_customers" INTEGER DEFAULT 0,
  "returning_customers" INTEGER DEFAULT 0,
  
  -- Financial metrics
  "gross_revenue" DECIMAL(15,2) DEFAULT 0,
  "total_discount_given" DECIMAL(15,2) DEFAULT 0,
  "average_order_value" DECIMAL(10,2) DEFAULT 0,
  "total_orders" INTEGER DEFAULT 0,
  
  -- Conversion metrics
  "impression_count" INTEGER DEFAULT 0, -- Views of promotion
  "click_count" INTEGER DEFAULT 0, -- Clicks/attempts to use
  "conversion_rate" DECIMAL(5,2) DEFAULT 0, -- Success rate
  
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE("campaign_id", "date", "platform")
);

-- Promotion templates for quick creation
CREATE TABLE "promotion_templates" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "template_data" JSONB NOT NULL, -- Store promotion configuration as template
  "category" TEXT DEFAULT 'custom', -- 'seasonal', 'loyalty', 'acquisition', 'retention'
  "is_global" BOOLEAN DEFAULT false, -- Available to all companies
  "usage_count" INTEGER DEFAULT 0,
  "created_by" UUID REFERENCES "users"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing for promotions
CREATE TABLE "promotion_variants" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "campaign_id" UUID NOT NULL REFERENCES "promotion_campaigns"("id") ON DELETE CASCADE,
  "variant_name" TEXT NOT NULL, -- 'A', 'B', 'Control'
  "traffic_percentage" INTEGER NOT NULL DEFAULT 50, -- % of traffic to this variant
  "configuration_override" JSONB DEFAULT '{}', -- Override campaign settings
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX "idx_promotion_campaigns_company" ON "promotion_campaigns"("company_id");
CREATE INDEX "idx_promotion_campaigns_status" ON "promotion_campaigns"("status");
CREATE INDEX "idx_promotion_campaigns_dates" ON "promotion_campaigns"("starts_at", "ends_at");
CREATE INDEX "idx_promotion_campaigns_type" ON "promotion_campaigns"("type");
CREATE INDEX "idx_promotion_campaigns_priority" ON "promotion_campaigns"("priority");

CREATE INDEX "idx_promotion_codes_campaign" ON "promotion_codes"("campaign_id");
CREATE INDEX "idx_promotion_codes_code" ON "promotion_codes"("code");
CREATE INDEX "idx_promotion_codes_active" ON "promotion_codes"("is_active");

CREATE INDEX "idx_promotion_targets_campaign" ON "promotion_targets"("campaign_id");
CREATE INDEX "idx_promotion_targets_type_id" ON "promotion_targets"("target_type", "target_id");

CREATE INDEX "idx_promotion_usage_campaign" ON "promotion_usage"("campaign_id");
CREATE INDEX "idx_promotion_usage_customer" ON "promotion_usage"("customer_id");
CREATE INDEX "idx_promotion_usage_date" ON "promotion_usage"("usage_date");
CREATE INDEX "idx_promotion_usage_platform" ON "promotion_usage"("platform_used");

CREATE INDEX "idx_promotion_analytics_campaign_date" ON "promotion_analytics"("campaign_id", "date");
CREATE INDEX "idx_promotion_analytics_platform" ON "promotion_analytics"("platform");

-- Add promotion reference to existing orders table (if needed)
-- ALTER TABLE "orders" ADD COLUMN "promotion_campaign_id" UUID REFERENCES "promotion_campaigns"("id");
-- ALTER TABLE "orders" ADD COLUMN "promotion_code_used" TEXT;
-- ALTER TABLE "orders" ADD COLUMN "promotion_discount_amount" DECIMAL(10,2) DEFAULT 0;
-- CREATE INDEX "idx_orders_promotion" ON "orders"("promotion_campaign_id");