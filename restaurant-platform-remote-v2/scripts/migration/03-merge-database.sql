-- Database Schema Merge Script
-- Merges integration-platform schema into restaurant-platform
-- Run with: psql -U postgres -d postgres -f 03-merge-database.sql

BEGIN TRANSACTION;

-- ==================== INTEGRATION TABLES ====================

-- 1. Webhook Configuration Table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(30) NOT NULL,
  branch_id VARCHAR(30),
  provider VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  api_key TEXT,
  token TEXT,
  events JSONB DEFAULT '[]'::jsonb,
  headers JSONB,
  is_active BOOLEAN DEFAULT true,
  retry_config JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_webhook_company FOREIGN KEY (company_id)
    REFERENCES "Company"(id) ON DELETE CASCADE,
  CONSTRAINT fk_webhook_branch FOREIGN KEY (branch_id)
    REFERENCES "Branch"(id) ON DELETE SET NULL
);

-- 2. Webhook Logs Table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  config_id VARCHAR(30),
  client_id VARCHAR(255),
  provider VARCHAR(50),
  event_type VARCHAR(100),
  payload JSONB,
  headers JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  response_time INTEGER,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_webhook_log_config FOREIGN KEY (config_id)
    REFERENCES webhook_configs(id) ON DELETE CASCADE
);

-- 3. Retry Queue Table
CREATE TABLE IF NOT EXISTS retry_queue (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  webhook_log_id VARCHAR(30),
  config_id VARCHAR(30),
  provider VARCHAR(50),
  event_type VARCHAR(100),
  payload JSONB,
  headers JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) DEFAULT 'PENDING',
  error TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_retry_config FOREIGN KEY (config_id)
    REFERENCES webhook_configs(id) ON DELETE CASCADE
);

-- 4. Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50),
  client_id VARCHAR(255) UNIQUE,
  client_secret TEXT,
  api_key TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  base_url TEXT,
  webhook_url TEXT,
  status VARCHAR(30) DEFAULT 'INACTIVE',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  settings JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_integration_company FOREIGN KEY (company_id)
    REFERENCES "Company"(id) ON DELETE CASCADE
);

-- 5. Integration Logs Table
CREATE TABLE IF NOT EXISTS integration_logs (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  integration_id VARCHAR(30),
  action VARCHAR(100),
  status VARCHAR(50),
  request JSONB,
  response JSONB,
  error TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_integration_log FOREIGN KEY (integration_id)
    REFERENCES integrations(id) ON DELETE CASCADE
);

-- 6. Webhook Metrics Table
CREATE TABLE IF NOT EXISTS webhook_metrics (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider VARCHAR(50),
  date DATE,
  hour INTEGER CHECK (hour >= 0 AND hour <= 23),
  total_requests INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_response_time NUMERIC(10,2) DEFAULT 0,
  min_response_time INTEGER,
  max_response_time INTEGER,
  retry_count INTEGER DEFAULT 0,
  unique_clients INTEGER DEFAULT 0,

  UNIQUE(provider, date, hour)
);

-- 7. System Health Table
CREATE TABLE IF NOT EXISTS system_health (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service VARCHAR(100),
  status VARCHAR(20),
  latency INTEGER,
  error_rate NUMERIC(5,2),
  last_check_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,

  UNIQUE(service)
);

-- 8. API Keys Table for Developer Portal
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix VARCHAR(10),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(30),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_api_key_company FOREIGN KEY (company_id)
    REFERENCES "Company"(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_key_creator FOREIGN KEY (created_by)
    REFERENCES "User"(id) ON DELETE SET NULL
);

-- ==================== MODIFY EXISTING TABLES ====================

-- Add integration fields to Order table
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS integration_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS integration_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS state_machine JSONB,
  ADD COLUMN IF NOT EXISTS webhook_event_id VARCHAR(30),
  ADD CONSTRAINT fk_order_integration FOREIGN KEY (integration_id)
    REFERENCES integrations(id) ON DELETE SET NULL;

-- Add webhook tracking to DeliveryProviderOrder
ALTER TABLE "DeliveryProviderOrder"
  ADD COLUMN IF NOT EXISTS webhook_log_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS webhook_status VARCHAR(20),
  ADD CONSTRAINT fk_delivery_webhook FOREIGN KEY (webhook_log_id)
    REFERENCES webhook_logs(id) ON DELETE SET NULL;

-- ==================== CREATE INDEXES ====================

-- Webhook indexes
CREATE INDEX idx_webhook_configs_company ON webhook_configs(company_id);
CREATE INDEX idx_webhook_configs_provider ON webhook_configs(provider);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(is_active);

CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);

-- Retry queue indexes
CREATE INDEX idx_retry_queue_status ON retry_queue(status, next_retry_at);
CREATE INDEX idx_retry_queue_provider ON retry_queue(provider);
CREATE INDEX idx_retry_queue_priority ON retry_queue(priority DESC);

-- Integration indexes
CREATE INDEX idx_integrations_company ON integrations(company_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_status ON integrations(status);

CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_action ON integration_logs(action);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at DESC);

-- Metrics indexes
CREATE INDEX idx_webhook_metrics_provider_date ON webhook_metrics(provider, date);

-- API keys indexes
CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Order integration indexes
CREATE INDEX idx_orders_external_id ON "Order"(external_order_id);
CREATE INDEX idx_orders_provider ON "Order"(integration_provider);

-- ==================== CREATE FUNCTIONS ====================

-- Function to update webhook metrics
CREATE OR REPLACE FUNCTION update_webhook_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webhook_metrics (
    provider,
    date,
    hour,
    total_requests,
    success_count,
    failure_count
  )
  VALUES (
    NEW.provider,
    DATE(NEW.created_at),
    EXTRACT(HOUR FROM NEW.created_at),
    1,
    CASE WHEN NEW.status = 'SUCCESS' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'FAILED' THEN 1 ELSE 0 END
  )
  ON CONFLICT (provider, date, hour) DO UPDATE SET
    total_requests = webhook_metrics.total_requests + 1,
    success_count = webhook_metrics.success_count +
      CASE WHEN NEW.status = 'SUCCESS' THEN 1 ELSE 0 END,
    failure_count = webhook_metrics.failure_count +
      CASE WHEN NEW.status = 'FAILED' THEN 1 ELSE 0 END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for webhook metrics
CREATE TRIGGER webhook_metrics_trigger
AFTER INSERT OR UPDATE ON webhook_logs
FOR EACH ROW
EXECUTE FUNCTION update_webhook_metrics();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON webhook_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== MIGRATE EXISTING DATA ====================

-- Migrate existing delivery provider configs to new integration table
INSERT INTO integrations (
  company_id,
  name,
  provider,
  client_id,
  api_key,
  base_url,
  webhook_url,
  status,
  settings,
  created_at
)
SELECT
  company_id,
  CONCAT(provider_type, ' Integration'),
  provider_type,
  CONCAT('legacy_', id),
  api_key,
  api_endpoint,
  webhook_url,
  CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END,
  jsonb_build_object(
    'branch_code', branch_code,
    'menu_id', menu_id,
    'legacy_id', id
  ),
  created_at
FROM "CompanyProviderConfig"
ON CONFLICT (client_id) DO NOTHING;

-- Create webhook configs from existing provider configs
INSERT INTO webhook_configs (
  company_id,
  provider,
  url,
  api_key,
  events,
  is_active,
  created_at
)
SELECT
  company_id,
  provider_type,
  webhook_url,
  webhook_secret,
  '["order.created", "order.updated", "order.cancelled", "order.delivered"]'::jsonb,
  is_active,
  created_at
FROM "CompanyProviderConfig"
WHERE webhook_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- ==================== GRANT PERMISSIONS ====================

-- Grant permissions for application user (adjust as needed)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

COMMIT;

-- ==================== VERIFICATION QUERIES ====================

-- Run these to verify migration success
SELECT 'Integration Tables Created:' as status,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'webhook_configs', 'webhook_logs', 'retry_queue',
  'integrations', 'integration_logs', 'webhook_metrics',
  'system_health', 'api_keys'
);

SELECT 'Order Table Modified:' as status,
  COUNT(*) as columns_added
FROM information_schema.columns
WHERE table_name = 'Order'
AND column_name IN (
  'external_order_id', 'integration_provider',
  'integration_id', 'state_machine', 'webhook_event_id'
);

SELECT 'Data Migration Summary:' as status,
  (SELECT COUNT(*) FROM integrations) as integrations,
  (SELECT COUNT(*) FROM webhook_configs) as webhook_configs;