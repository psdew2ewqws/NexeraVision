-- ================================================================
-- MONITORING AND METRICS TABLES
-- Additional tables for comprehensive monitoring and alerting
-- ================================================================

BEGIN;

-- ================================
-- 1. CHANNEL METRICS TABLE
-- Store time-series metrics for monitoring and analysis
-- ================================
CREATE TABLE IF NOT EXISTS channel_metrics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT NOT NULL,
    channel_slug TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- 'sync_count', 'error_rate', 'response_time', etc.
    value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}', -- Additional metric context
    timestamp TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_metrics_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ================================
-- 2. CHANNEL ALERTS TABLE
-- Store triggered alerts and notifications
-- ================================
CREATE TABLE IF NOT EXISTS channel_alerts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    alert_id TEXT NOT NULL, -- Alert configuration ID
    name TEXT NOT NULL,
    company_id TEXT NOT NULL,
    channel_slug TEXT, -- NULL for company-wide alerts
    condition_type TEXT NOT NULL, -- 'error_rate_high', 'channel_down', etc.
    threshold_value NUMERIC,
    severity TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
    triggered_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP(3) WITHOUT TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_alerts_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ================================
-- 3. CHANNEL PERFORMANCE LOGS
-- Detailed performance tracking for API calls and operations
-- ================================
CREATE TABLE IF NOT EXISTS channel_performance_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_channel_assignment_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'menu_push', 'order_fetch', 'status_update', etc.
    operation_id TEXT, -- External operation identifier
    started_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(3) WITHOUT TIME ZONE,
    duration_ms INTEGER,
    status TEXT NOT NULL, -- 'success', 'failure', 'timeout', 'cancelled'
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,
    request_metadata JSONB DEFAULT '{}',
    response_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_performance_logs_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id)
);

-- ================================
-- 4. CHANNEL AUDIT LOGS
-- Comprehensive audit trail for all channel operations
-- ================================
CREATE TABLE IF NOT EXISTS channel_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT NOT NULL,
    channel_id TEXT,
    user_id TEXT, -- User who performed the action
    action_type TEXT NOT NULL, -- 'create_assignment', 'sync_menu', 'update_config', etc.
    resource_type TEXT NOT NULL, -- 'channel_assignment', 'menu', 'order', etc.
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_audit_logs_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT channel_audit_logs_channel_id_fkey
        FOREIGN KEY (channel_id) REFERENCES delivery_channels(id)
);

-- ================================
-- 5. CHANNEL RATE LIMITS
-- Track and manage API rate limiting across channels
-- ================================
CREATE TABLE IF NOT EXISTS channel_rate_limits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_channel_assignment_id TEXT NOT NULL,
    time_window_start TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_window_duration_ms INTEGER DEFAULT 60000, -- 1 minute default
    request_count INTEGER DEFAULT 0,
    max_requests INTEGER DEFAULT 100,
    burst_count INTEGER DEFAULT 0,
    max_burst INTEGER DEFAULT 10,
    throttled_requests INTEGER DEFAULT 0,
    last_request_at TIMESTAMP(3) WITHOUT TIME ZONE,
    reset_at TIMESTAMP(3) WITHOUT TIME ZONE,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_rate_limits_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id),
    CONSTRAINT channel_rate_limits_unique
        UNIQUE (company_channel_assignment_id, time_window_start)
);

-- ================================
-- 6. CHANNEL CONFIGURATION HISTORY
-- Track configuration changes for auditing and rollback
-- ================================
CREATE TABLE IF NOT EXISTS channel_configuration_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_channel_assignment_id TEXT NOT NULL,
    configuration_type TEXT NOT NULL, -- 'credentials', 'settings', 'features', etc.
    old_configuration JSONB,
    new_configuration JSONB NOT NULL,
    change_reason TEXT,
    changed_by TEXT, -- User ID who made the change
    change_timestamp TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_rollback BOOLEAN DEFAULT false,
    rollback_target_id TEXT, -- Reference to configuration being rolled back to
    validation_status TEXT DEFAULT 'pending', -- 'pending', 'valid', 'invalid'
    validation_message TEXT,
    created_at TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT channel_config_history_company_channel_id_fkey
        FOREIGN KEY (company_channel_assignment_id) REFERENCES company_channel_assignments(id)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Channel metrics indexes
CREATE INDEX IF NOT EXISTS idx_channel_metrics_company_id ON channel_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_channel_slug ON channel_metrics(channel_slug);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_metric_type ON channel_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_timestamp ON channel_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_company_channel_type ON channel_metrics(company_id, channel_slug, metric_type);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_time_range ON channel_metrics(timestamp DESC, metric_type);

-- Channel alerts indexes
CREATE INDEX IF NOT EXISTS idx_channel_alerts_company_id ON channel_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_alerts_channel_slug ON channel_alerts(channel_slug) WHERE channel_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_alerts_severity ON channel_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_channel_alerts_triggered_at ON channel_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_alerts_unresolved ON channel_alerts(triggered_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_channel_alerts_alert_id ON channel_alerts(alert_id);

-- Channel performance logs indexes
CREATE INDEX IF NOT EXISTS idx_channel_performance_logs_company_channel_id ON channel_performance_logs(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_performance_logs_operation_type ON channel_performance_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_channel_performance_logs_status ON channel_performance_logs(status);
CREATE INDEX IF NOT EXISTS idx_channel_performance_logs_started_at ON channel_performance_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_performance_logs_duration ON channel_performance_logs(duration_ms DESC) WHERE duration_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_performance_logs_recent ON channel_performance_logs(started_at DESC, status);

-- Channel audit logs indexes
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_company_id ON channel_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_user_id ON channel_audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_action_type ON channel_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_resource_type ON channel_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_timestamp ON channel_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_resource ON channel_audit_logs(resource_type, resource_id) WHERE resource_id IS NOT NULL;

-- Channel rate limits indexes
CREATE INDEX IF NOT EXISTS idx_channel_rate_limits_company_channel_id ON channel_rate_limits(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_rate_limits_time_window ON channel_rate_limits(time_window_start DESC);
CREATE INDEX IF NOT EXISTS idx_channel_rate_limits_reset_at ON channel_rate_limits(reset_at) WHERE reset_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_rate_limits_active ON channel_rate_limits(company_channel_assignment_id, time_window_start DESC);

-- Channel configuration history indexes
CREATE INDEX IF NOT EXISTS idx_channel_config_history_company_channel_id ON channel_configuration_history(company_channel_assignment_id);
CREATE INDEX IF NOT EXISTS idx_channel_config_history_config_type ON channel_configuration_history(configuration_type);
CREATE INDEX IF NOT EXISTS idx_channel_config_history_changed_by ON channel_configuration_history(changed_by) WHERE changed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_config_history_timestamp ON channel_configuration_history(change_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_channel_config_history_rollback ON channel_configuration_history(rollback_target_id) WHERE rollback_target_id IS NOT NULL;

-- ================================
-- PARTITIONING FOR LARGE TABLES (PostgreSQL 10+)
-- ================================

-- Partition channel_metrics by month for better performance
CREATE TABLE IF NOT EXISTS channel_metrics_template (LIKE channel_metrics INCLUDING ALL);

-- Create initial partitions for current and next month
DO $$
DECLARE
    current_month TEXT;
    next_month TEXT;
BEGIN
    current_month := TO_CHAR(CURRENT_DATE, 'YYYY_MM');
    next_month := TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY_MM');

    -- Create partitions if they don't exist
    BEGIN
        EXECUTE format('CREATE TABLE IF NOT EXISTS channel_metrics_%s PARTITION OF channel_metrics
                       FOR VALUES FROM (%L) TO (%L)',
                      current_month,
                      DATE_TRUNC('month', CURRENT_DATE),
                      DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));

        EXECUTE format('CREATE TABLE IF NOT EXISTS channel_metrics_%s PARTITION OF channel_metrics
                       FOR VALUES FROM (%L) TO (%L)',
                      next_month,
                      DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'),
                      DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months'));
    EXCEPTION WHEN OTHERS THEN
        -- Ignore partition errors if table is not partitioned
        NULL;
    END;
END $$;

-- ================================
-- MONITORING FUNCTIONS
-- ================================

-- Function to get channel health summary
CREATE OR REPLACE FUNCTION get_channel_health_summary(p_company_id TEXT, p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    channel_slug TEXT,
    total_operations INTEGER,
    successful_operations INTEGER,
    failed_operations INTEGER,
    success_rate NUMERIC,
    avg_response_time NUMERIC,
    last_success_time TIMESTAMP,
    is_healthy BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.channel_slug,
        COUNT(*)::INTEGER as total_operations,
        SUM(CASE WHEN cm.metric_type = 'sync_success' THEN cm.value ELSE 0 END)::INTEGER as successful_operations,
        SUM(CASE WHEN cm.metric_type = 'sync_failure' THEN cm.value ELSE 0 END)::INTEGER as failed_operations,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND(SUM(CASE WHEN cm.metric_type = 'sync_success' THEN cm.value ELSE 0 END) / COUNT(*) * 100, 2)
            ELSE 0
        END as success_rate,
        ROUND(AVG(CASE WHEN cm.metric_type = 'response_time' THEN cm.value ELSE NULL END), 2) as avg_response_time,
        MAX(CASE WHEN cm.metric_type = 'sync_success' AND cm.value > 0 THEN cm.timestamp ELSE NULL END) as last_success_time,
        (CASE
            WHEN COUNT(*) > 0 THEN
                SUM(CASE WHEN cm.metric_type = 'sync_success' THEN cm.value ELSE 0 END) / COUNT(*) > 0.8
            ELSE false
        END) as is_healthy
    FROM channel_metrics cm
    WHERE cm.company_id = p_company_id
      AND cm.timestamp >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
    GROUP BY cm.channel_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - (p_retention_days || ' days')::INTERVAL;

    -- Clean up old metrics
    DELETE FROM channel_metrics WHERE timestamp < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Clean up old alerts
    DELETE FROM channel_alerts WHERE triggered_at < cutoff_date AND resolved_at IS NOT NULL;

    -- Clean up old performance logs
    DELETE FROM channel_performance_logs WHERE started_at < cutoff_date;

    -- Clean up old audit logs (keep longer retention)
    DELETE FROM channel_audit_logs WHERE timestamp < cutoff_date - INTERVAL '90 days';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ================================
-- VERIFICATION QUERIES
-- ================================
SELECT 'MONITORING SYSTEM CREATED SUCCESSFULLY' as status;
SELECT 'Monitoring Tables:', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'channel_%' AND table_name ~ '(metrics|alerts|performance|audit|rate_limits|configuration)';
SELECT 'Monitoring Indexes:', COUNT(*) FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'channel_%' AND tablename ~ '(metrics|alerts|performance|audit|rate_limits|configuration)';