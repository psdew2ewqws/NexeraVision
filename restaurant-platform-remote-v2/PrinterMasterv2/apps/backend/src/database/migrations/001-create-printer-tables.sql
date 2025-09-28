-- PrinterMasterv2 Database Schema
-- Migration 001: Create printer management tables
-- Target Database: PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- License Management Table
CREATE TABLE printer_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    branch_id UUID NOT NULL,
    company_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
    device_limit INTEGER DEFAULT 1 CHECK (device_limit > 0),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints (assuming branches and companies tables exist)
    CONSTRAINT fk_printer_licenses_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_printer_licenses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Device Registration Table
CREATE TABLE printer_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) UNIQUE NOT NULL, -- Machine fingerprint
    hostname VARCHAR(255),
    platform VARCHAR(50) CHECK (platform IN ('Windows', 'macOS', 'Linux')),
    app_version VARCHAR(50) NOT NULL,
    qz_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_printer_devices_license FOREIGN KEY (license_key) REFERENCES printer_licenses(license_key) ON DELETE CASCADE
);

-- Printer Registry Table
CREATE TABLE printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    printer_id VARCHAR(255) NOT NULL, -- QZ Tray printer ID
    driver_name VARCHAR(255),
    connection_type VARCHAR(50) NOT NULL CHECK (connection_type IN ('USB', 'Network', 'Bluetooth')),
    ip_address INET,
    port INTEGER CHECK (port > 0 AND port <= 65535),
    mac_address VARCHAR(17) CHECK (mac_address ~ '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'),
    status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'error', 'testing', 'unknown')),
    last_seen TIMESTAMP WITH TIME ZONE,
    capabilities JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_printers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_printers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT uk_printers_branch_printer_id UNIQUE(branch_id, printer_id)
);

-- Printer Status Logs Table
CREATE TABLE printer_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_id UUID NOT NULL,
    device_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    response_time INTEGER CHECK (response_time >= 0), -- milliseconds
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_status_logs_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_logs_device FOREIGN KEY (device_id) REFERENCES printer_devices(id) ON DELETE CASCADE
);

-- Printer Test Results Table
CREATE TABLE printer_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_id UUID NOT NULL,
    device_id UUID NOT NULL,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('status', 'print_test', 'alignment', 'connectivity')),
    success BOOLEAN NOT NULL,
    duration INTEGER CHECK (duration >= 0), -- milliseconds
    error_message TEXT,
    test_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_test_results_printer FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_results_device FOREIGN KEY (device_id) REFERENCES printer_devices(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX idx_printer_licenses_key ON printer_licenses(license_key);
CREATE INDEX idx_printer_licenses_branch_status ON printer_licenses(branch_id, status);
CREATE INDEX idx_printer_licenses_company_status ON printer_licenses(company_id, status);
CREATE INDEX idx_printer_licenses_expires ON printer_licenses(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_printer_devices_license_status ON printer_devices(license_key, status);
CREATE INDEX idx_printer_devices_device_id ON printer_devices(device_id);
CREATE INDEX idx_printer_devices_heartbeat ON printer_devices(last_heartbeat DESC) WHERE status = 'active';
CREATE INDEX idx_printer_devices_platform ON printer_devices(platform, status);

CREATE INDEX idx_printers_branch_status ON printers(branch_id, status);
CREATE INDEX idx_printers_company_status ON printers(company_id, status);
CREATE INDEX idx_printers_printer_id ON printers(printer_id);
CREATE INDEX idx_printers_connection_type ON printers(connection_type, status);
CREATE INDEX idx_printers_last_seen ON printers(last_seen DESC) WHERE status IN ('online', 'offline');
CREATE INDEX idx_printers_ip_address ON printers(ip_address) WHERE ip_address IS NOT NULL;

CREATE INDEX idx_status_logs_printer_time ON printer_status_logs(printer_id, created_at DESC);
CREATE INDEX idx_status_logs_device_time ON printer_status_logs(device_id, created_at DESC);
CREATE INDEX idx_status_logs_status_time ON printer_status_logs(status, created_at DESC);
CREATE INDEX idx_status_logs_created_at ON printer_status_logs(created_at DESC);

CREATE INDEX idx_test_results_printer_type ON printer_test_results(printer_id, test_type, created_at DESC);
CREATE INDEX idx_test_results_device_type ON printer_test_results(device_id, test_type, created_at DESC);
CREATE INDEX idx_test_results_success_time ON printer_test_results(success, created_at DESC);
CREATE INDEX idx_test_results_created_at ON printer_test_results(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_printers_branch_connection_status ON printers(branch_id, connection_type, status);
CREATE INDEX idx_devices_license_platform_status ON printer_devices(license_key, platform, status);
CREATE INDEX idx_status_logs_printer_status_time ON printer_status_logs(printer_id, status, created_at DESC);

-- Partial indexes for active records
CREATE INDEX idx_printers_active_last_seen ON printers(last_seen DESC) 
    WHERE status IN ('online', 'offline') AND last_seen > NOW() - INTERVAL '1 day';
CREATE INDEX idx_devices_active_heartbeat ON printer_devices(last_heartbeat DESC) 
    WHERE status = 'active' AND last_heartbeat > NOW() - INTERVAL '1 hour';

-- GIN indexes for JSONB columns
CREATE INDEX idx_printers_capabilities_gin ON printers USING GIN(capabilities);
CREATE INDEX idx_printers_settings_gin ON printers USING GIN(settings);
CREATE INDEX idx_devices_metadata_gin ON printer_devices USING GIN(metadata);
CREATE INDEX idx_status_logs_metadata_gin ON printer_status_logs USING GIN(metadata);
CREATE INDEX idx_test_results_data_gin ON printer_test_results USING GIN(test_data);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_printer_licenses_updated_at 
    BEFORE UPDATE ON printer_licenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printer_devices_updated_at 
    BEFORE UPDATE ON printer_devices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printers_updated_at 
    BEFORE UPDATE ON printers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data retention and cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_status_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM printer_status_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_test_results(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM printer_test_results 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Statistics and monitoring views
CREATE VIEW printer_statistics AS
SELECT 
    p.company_id,
    p.branch_id,
    COUNT(*) as total_printers,
    COUNT(*) FILTER (WHERE p.status = 'online') as online_printers,
    COUNT(*) FILTER (WHERE p.status = 'offline') as offline_printers,
    COUNT(*) FILTER (WHERE p.status = 'error') as error_printers,
    COUNT(*) FILTER (WHERE p.last_seen > NOW() - INTERVAL '1 hour') as recently_seen,
    AVG(EXTRACT(EPOCH FROM (NOW() - p.last_seen))) as avg_last_seen_seconds
FROM printers p
GROUP BY p.company_id, p.branch_id;

CREATE VIEW device_statistics AS
SELECT 
    d.license_key,
    COUNT(*) as total_devices,
    COUNT(*) FILTER (WHERE d.status = 'active') as active_devices,
    COUNT(*) FILTER (WHERE d.last_heartbeat > NOW() - INTERVAL '5 minutes') as online_devices,
    AVG(EXTRACT(EPOCH FROM (NOW() - d.last_heartbeat))) as avg_heartbeat_age_seconds,
    array_agg(DISTINCT d.platform) as platforms
FROM printer_devices d
GROUP BY d.license_key;

CREATE VIEW printer_health_summary AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.last_seen,
    CASE 
        WHEN p.last_seen > NOW() - INTERVAL '5 minutes' THEN 'healthy'
        WHEN p.last_seen > NOW() - INTERVAL '1 hour' THEN 'warning'
        ELSE 'critical'
    END as health_status,
    (
        SELECT COUNT(*) 
        FROM printer_test_results ptr 
        WHERE ptr.printer_id = p.id 
        AND ptr.created_at > NOW() - INTERVAL '24 hours'
        AND ptr.success = false
    ) as failed_tests_24h,
    (
        SELECT AVG(response_time)
        FROM printer_status_logs psl 
        WHERE psl.printer_id = p.id 
        AND psl.created_at > NOW() - INTERVAL '1 hour'
        AND psl.response_time IS NOT NULL
    ) as avg_response_time_1h
FROM printers p;

-- Security: Row Level Security (RLS) policies
ALTER TABLE printer_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (to be customized based on authentication system)
-- Example policy for company isolation
CREATE POLICY printer_licenses_company_isolation ON printer_licenses
    FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY printers_company_isolation ON printers
    FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

-- Initial data seeding (for development/testing)
-- INSERT INTO printer_licenses (license_key, branch_id, company_id, device_limit) 
-- VALUES 
--     ('DEV-LICENSE-123456789012345', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5),
--     ('TEST-LICENSE-987654321098765', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 3);

-- Add comments for documentation
COMMENT ON TABLE printer_licenses IS 'License keys for printer management system access';
COMMENT ON TABLE printer_devices IS 'Registered devices running PrinterMaster application';
COMMENT ON TABLE printers IS 'Discovered and registered printers in the system';
COMMENT ON TABLE printer_status_logs IS 'Historical status updates from printers';
COMMENT ON TABLE printer_test_results IS 'Results from printer testing operations';

COMMENT ON COLUMN printer_licenses.license_key IS 'Unique license key for device authentication';
COMMENT ON COLUMN printer_devices.device_id IS 'Unique machine fingerprint for device identification';
COMMENT ON COLUMN printers.printer_id IS 'QZ Tray printer identifier';
COMMENT ON COLUMN printers.capabilities IS 'JSON object containing printer capabilities';
COMMENT ON COLUMN printers.settings IS 'JSON object containing printer-specific settings';

-- Grant permissions (to be customized based on application users)
-- GRANT SELECT, INSERT, UPDATE ON printer_licenses TO printer_app_user;
-- GRANT SELECT, INSERT, UPDATE ON printer_devices TO printer_app_user;
-- GRANT ALL ON printers TO printer_app_user;
-- GRANT ALL ON printer_status_logs TO printer_app_user;
-- GRANT ALL ON printer_test_results TO printer_app_user;