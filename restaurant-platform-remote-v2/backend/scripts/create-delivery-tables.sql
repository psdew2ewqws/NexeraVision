-- Set search path to public schema
SET search_path TO public;

-- Create DeliveryProvider table
CREATE TABLE IF NOT EXISTS delivery_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  api_base_url VARCHAR(255),
  webhook_endpoint VARCHAR(255),
  is_active BOOLEAN DEFAULT false NOT NULL,
  supports_webhooks BOOLEAN DEFAULT true NOT NULL,
  supports_api BOOLEAN DEFAULT false NOT NULL,
  config JSONB,
  rate_limit_per_minute INTEGER DEFAULT 100 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_providers_code_active ON delivery_providers(code, is_active);

-- Create Webhook Log table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  webhook_type VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) DEFAULT 'POST' NOT NULL,
  status VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  signature VARCHAR(255),
  ip_address VARCHAR(50),
  error_message TEXT,
  internal_order_id UUID,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);

-- Create Provider Order Log table
CREATE TABLE IF NOT EXISTS provider_order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  provider_order_id VARCHAR(255) NOT NULL,
  internal_order_id UUID,
  status VARCHAR(50) NOT NULL,
  order_data JSONB NOT NULL,
  sync_status VARCHAR(50),
  last_synced_at TIMESTAMP,
  error_count INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_order_logs_provider ON provider_order_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_order_logs_provider_order ON provider_order_logs(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_provider_order_logs_internal ON provider_order_logs(internal_order_id);

-- Create Delivery Error Log table
CREATE TABLE IF NOT EXISTS delivery_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  error_type VARCHAR(100) NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  severity VARCHAR(20) DEFAULT 'error' NOT NULL,
  is_resolved BOOLEAN DEFAULT false NOT NULL,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_error_logs_provider ON delivery_error_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_error_logs_type ON delivery_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_delivery_error_logs_resolved ON delivery_error_logs(is_resolved);

-- Create Branch Delivery Config table
CREATE TABLE IF NOT EXISTS branch_delivery_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  merchant_id VARCHAR(255),
  store_id VARCHAR(255),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  webhook_secret VARCHAR(255),
  is_active BOOLEAN DEFAULT false NOT NULL,
  auto_accept_orders BOOLEAN DEFAULT false NOT NULL,
  preparation_time INTEGER DEFAULT 30 NOT NULL,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(branch_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_delivery_configs_branch ON branch_delivery_configs(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_delivery_configs_provider ON branch_delivery_configs(provider_id);
CREATE INDEX IF NOT EXISTS idx_branch_delivery_configs_company ON branch_delivery_configs(company_id);

-- Insert default delivery providers
INSERT INTO delivery_providers (id, code, name, description, webhook_endpoint, is_active, supports_webhooks)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'careem', 'Careem Now', 'Careem food delivery platform', '/api/v1/delivery/webhook/careem', true, true),
  ('550e8400-e29b-41d4-a716-446655440002', 'talabat', 'Talabat', 'Talabat food delivery platform', '/api/v1/delivery/webhook/talabat', false, true),
  ('550e8400-e29b-41d4-a716-446655440003', 'ubereats', 'Uber Eats', 'Uber Eats food delivery platform', '/api/v1/delivery/webhook/ubereats', false, true),
  ('550e8400-e29b-41d4-a716-446655440004', 'zomato', 'Zomato', 'Zomato food delivery platform', '/api/v1/delivery/webhook/zomato', false, true),
  ('550e8400-e29b-41d4-a716-446655440005', 'deliveroo', 'Deliveroo', 'Deliveroo food delivery platform', '/api/v1/delivery/webhook/deliveroo', false, true)
ON CONFLICT (code) DO NOTHING;
