-- Database Performance Optimization: Add Missing Critical Indexes
-- This script adds indexes to improve query performance across the restaurant platform
-- Execute this script with database admin privileges (without transaction block for CONCURRENTLY)

-- Enable timing for performance monitoring
\timing on

-- User Management & Authentication Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_status 
ON users (company_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users (role) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_branch_role 
ON users (branch_id, role) 
WHERE deleted_at IS NULL AND branch_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_logs_user_timestamp 
ON user_activity_logs (user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_active 
ON user_sessions (user_id, is_active) 
WHERE is_active = true;

-- Menu & Products Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_products_slug 
ON menu_products (slug) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_products_deleted_at 
ON menu_products (deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_products_status_priority 
ON menu_products (status, priority DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_categories_company_active 
ON menu_categories (company_id, is_active) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_modifiers_category_active 
ON modifiers (category_id, is_active) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_modifier_categories_company_active 
ON modifier_categories (company_id, is_active) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_modifier_categories_product 
ON product_modifier_categories (product_id, modifier_category_id);

-- Orders & Transactions Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_company_created 
ON orders (company_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_branch_status_created 
ON orders (branch_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created 
ON orders (status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id 
ON order_items (order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id 
ON order_items (product_id);

-- Branches & Companies Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_branches_company_active 
ON branches (company_id, is_active) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_branches_active 
ON branches (is_active) 
WHERE deleted_at IS NULL AND is_active = true;

-- Licenses & Billing Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_licenses_company_status 
ON licenses (company_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_licenses_expires_at 
ON licenses (expires_at) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_license_audit_logs_license_created 
ON license_audit_logs (license_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_license_invoices_license_status 
ON license_invoices (license_id, status);

-- Printing System Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_printers_company_active 
ON printers (company_id, is_active) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_print_jobs_printer_status_created 
ON print_jobs (printer_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_print_jobs_company_status 
ON print_jobs (company_id, status, created_at DESC);

-- Delivery System Indexes (enhance existing ones)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_zones_company_active 
ON delivery_zones (company_id, is_active) 
WHERE deleted_at IS NULL;

-- Price History for Analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_product_created 
ON price_history (product_id, created_at DESC);

-- Multi-column composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_role_status 
ON users (company_id, role, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_products_company_category_status 
ON menu_products (company_id, category_id, status) 
WHERE deleted_at IS NULL;

-- Update table statistics after index creation
ANALYZE users;
ANALYZE menu_products;
ANALYZE menu_categories;
ANALYZE modifiers;
ANALYZE modifier_categories;
ANALYZE orders;
ANALYZE order_items;
ANALYZE branches;
ANALYZE companies;
ANALYZE licenses;
ANALYZE printers;
ANALYZE print_jobs;
ANALYZE delivery_zones;
ANALYZE user_activity_logs;
ANALYZE user_sessions;
ANALYZE price_history;

-- Display index creation summary
SELECT 
    'Database optimization complete!' as status,
    COUNT(*) as total_indexes_created
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';