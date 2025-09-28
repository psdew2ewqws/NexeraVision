-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Critical Performance Indexes for Delivery System
CREATE INDEX IF NOT EXISTS "idx_company_provider_configs_active" ON "company_provider_configs" ("company_id", "is_active", "priority") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_company_provider_configs_provider_type" ON "company_provider_configs" ("provider_type", "is_active") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_branch_provider_mappings_active" ON "branch_provider_mappings" ("branch_id", "is_active", "priority") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_delivery_provider_orders_status" ON "delivery_provider_orders" ("company_id", "order_status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_delivery_provider_orders_provider" ON "delivery_provider_orders" ("delivery_provider_id", "order_status");

-- Add provider type constraint for data integrity
ALTER TABLE "company_provider_configs" 
ADD CONSTRAINT "valid_provider_type" 
CHECK ("provider_type" IN ('dhub', 'talabat', 'careem', 'careemexpress', 'jahez', 'deliveroo', 'yallow', 'jooddelivery', 'topdeliver', 'nashmi', 'tawasi', 'delivergy', 'utrac', 'local_delivery'));

-- Add delivery tracking enhancements
ALTER TABLE "delivery_provider_orders" 
ADD COLUMN IF NOT EXISTS "tracking_number" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "estimated_delivery_time" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "actual_delivery_time" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "delivery_attempts" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
ADD COLUMN IF NOT EXISTS "provider_fee_charged" DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS "webhook_retries" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_status_check" TIMESTAMP;

-- Create delivery error log table for monitoring
CREATE TABLE IF NOT EXISTS "delivery_error_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "error_type" TEXT NOT NULL CHECK ("error_type" IN ('connection', 'authentication', 'validation', 'business_logic', 'timeout', 'rate_limit')),
    "error_code" TEXT,
    "error_message" TEXT NOT NULL,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "retry_count" INTEGER DEFAULT 0,
    "resolved_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "delivery_error_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_error_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for error logs
CREATE INDEX IF NOT EXISTS "idx_delivery_error_logs_company" ON "delivery_error_logs" ("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_delivery_error_logs_provider" ON "delivery_error_logs" ("provider_type", "error_type", "created_at");
CREATE INDEX IF NOT EXISTS "idx_delivery_error_logs_unresolved" ON "delivery_error_logs" ("created_at") WHERE "resolved_at" IS NULL;

-- Create webhook delivery logs table
CREATE TABLE IF NOT EXISTS "webhook_delivery_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "webhook_type" TEXT NOT NULL,
    "order_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'processed', 'failed', 'retrying')),
    "processing_attempts" INTEGER DEFAULT 0,
    "processed_at" TIMESTAMP,
    "error_message" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "webhook_delivery_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "webhook_delivery_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for webhook logs
CREATE INDEX IF NOT EXISTS "idx_webhook_delivery_logs_company" ON "webhook_delivery_logs" ("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_webhook_delivery_logs_status" ON "webhook_delivery_logs" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_webhook_delivery_logs_provider" ON "webhook_delivery_logs" ("provider_type", "webhook_type", "created_at");

-- Create provider analytics table for real-time monitoring
CREATE TABLE IF NOT EXISTS "delivery_provider_analytics" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_orders" INTEGER DEFAULT 0,
    "successful_orders" INTEGER DEFAULT 0,
    "failed_orders" INTEGER DEFAULT 0,
    "cancelled_orders" INTEGER DEFAULT 0,
    "total_revenue" DECIMAL(10,2) DEFAULT 0,
    "total_delivery_fee" DECIMAL(10,2) DEFAULT 0,
    "average_delivery_time" INTEGER DEFAULT 0, -- in minutes
    "customer_ratings_sum" DECIMAL(10,2) DEFAULT 0,
    "customer_ratings_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "delivery_provider_analytics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_provider_analytics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "unique_company_provider_date" UNIQUE ("company_id", "provider_type", "date")
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS "idx_delivery_provider_analytics_company" ON "delivery_provider_analytics" ("company_id", "date");
CREATE INDEX IF NOT EXISTS "idx_delivery_provider_analytics_provider" ON "delivery_provider_analytics" ("provider_type", "date");

-- Add updated_at trigger for all new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_delivery_error_logs_updated_at BEFORE UPDATE ON "delivery_error_logs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_delivery_logs_updated_at BEFORE UPDATE ON "webhook_delivery_logs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_provider_analytics_updated_at BEFORE UPDATE ON "delivery_provider_analytics" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial analytics data for existing providers
INSERT INTO "delivery_provider_analytics" ("id", "company_id", "provider_type", "date")
SELECT 
    uuid_generate_v4(),
    c."id",
    cpc."provider_type",
    CURRENT_DATE
FROM "companies" c
CROSS JOIN "company_provider_configs" cpc
WHERE cpc."is_active" = true AND cpc."deleted_at" IS NULL
ON CONFLICT ("company_id", "provider_type", "date") DO NOTHING;