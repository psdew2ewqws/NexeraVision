/**
 * Channel Monitoring Service
 * Comprehensive monitoring and alerting for channel integrations
 * Tracks performance, health, errors, and provides insights
 */

const EventEmitter = require('events');
const channelAdapterFactory = require('../channel-adapters/channel-adapter-factory');

class ChannelMonitor extends EventEmitter {
  constructor(prisma) {
    super();
    this.prisma = prisma;

    // Monitoring state
    this.metrics = new Map(); // companyId:channelSlug -> metrics
    this.alerts = new Map(); // alertId -> alert
    this.healthChecks = new Map(); // companyId:channelSlug -> lastCheck

    // Configuration
    this.config = {
      healthCheckInterval: 60000, // 1 minute
      metricsRetentionDays: 30,
      alertThresholds: {
        errorRate: 0.1, // 10%
        responseTime: 5000, // 5 seconds
        consecutiveFailures: 5,
        syncFailureRate: 0.2 // 20%
      },
      alertCooldown: 300000, // 5 minutes
      batchSize: 100
    };

    // Metric definitions
    this.metricTypes = {
      SYNC_COUNT: 'sync_count',
      SYNC_SUCCESS: 'sync_success',
      SYNC_FAILURE: 'sync_failure',
      RESPONSE_TIME: 'response_time',
      ERROR_RATE: 'error_rate',
      AVAILABILITY: 'availability',
      ORDER_COUNT: 'order_count',
      WEBHOOK_COUNT: 'webhook_count'
    };

    // Start monitoring
    this._startHealthChecker();
    this._startMetricsCollector();
    this._startAlertProcessor();
  }

  // ================================
  // HEALTH MONITORING
  // ================================

  /**
   * Perform health check on all active adapters
   * @returns {Promise<Array>} - Array of health check results
   */
  async performHealthCheck() {
    const healthResults = [];
    const adapterHealth = channelAdapterFactory.getAllAdapterHealth();

    for (const health of adapterHealth) {
      const { companyId, channelSlug } = health;
      const key = `${companyId}:${channelSlug}`;

      try {
        // Test adapter connection
        const connectionTest = await channelAdapterFactory.testAdapterConnection(
          companyId,
          channelSlug
        );

        const healthStatus = {
          key,
          companyId,
          channelSlug,
          timestamp: new Date(),
          isHealthy: health.isHealthy && connectionTest.success,
          circuitState: health.circuitState,
          consecutiveErrors: health.consecutiveErrors,
          lastSuccessTime: health.lastSuccessTime,
          lastErrorTime: health.lastErrorTime,
          uptimePercentage: health.uptimePercentage,
          connectionTest: connectionTest.success,
          connectionMessage: connectionTest.message,
          rateLimitStatus: health.rateLimitStatus,
          supportedFeatures: health.supportedFeatures
        };

        healthResults.push(healthStatus);
        this.healthChecks.set(key, healthStatus);

        // Record health metric
        await this.recordMetric(companyId, channelSlug, this.metricTypes.AVAILABILITY, {
          value: healthStatus.isHealthy ? 1 : 0,
          metadata: {
            circuitState: health.circuitState,
            uptimePercentage: health.uptimePercentage
          }
        });

        // Check for alerts
        await this._checkHealthAlerts(healthStatus);

      } catch (error) {
        const errorStatus = {
          key,
          companyId,
          channelSlug,
          timestamp: new Date(),
          isHealthy: false,
          error: error.message,
          connectionTest: false
        };

        healthResults.push(errorStatus);
        this.healthChecks.set(key, errorStatus);

        console.error(`Health check failed for ${key}:`, error);
      }
    }

    this.emit('health_check_completed', healthResults);
    return healthResults;
  }

  /**
   * Get current health status for a specific channel
   * @param {string} companyId - Company ID
   * @param {string} channelSlug - Channel slug
   * @returns {Object|null} - Health status or null if not found
   */
  getChannelHealth(companyId, channelSlug) {
    const key = `${companyId}:${channelSlug}`;
    return this.healthChecks.get(key) || null;
  }

  /**
   * Get health status for all channels of a company
   * @param {string} companyId - Company ID
   * @returns {Array} - Array of health statuses
   */
  getCompanyHealth(companyId) {
    const results = [];
    for (const [key, health] of this.healthChecks) {
      if (health.companyId === companyId) {
        results.push(health);
      }
    }
    return results;
  }

  // ================================
  // METRICS RECORDING AND RETRIEVAL
  // ================================

  /**
   * Record a metric for monitoring
   * @param {string} companyId - Company ID
   * @param {string} channelSlug - Channel slug
   * @param {string} metricType - Type of metric
   * @param {Object} data - Metric data
   */
  async recordMetric(companyId, channelSlug, metricType, data) {
    try {
      const { value, metadata = {}, timestamp = new Date() } = data;

      // Store in database for persistence
      await this.prisma.$executeRaw`
        INSERT INTO channel_metrics (
          company_id, channel_slug, metric_type, value, metadata, timestamp
        ) VALUES (
          ${companyId}, ${channelSlug}, ${metricType}, ${value}, ${JSON.stringify(metadata)}, ${timestamp}
        )
      `;

      // Update in-memory metrics for quick access
      const key = `${companyId}:${channelSlug}`;
      if (!this.metrics.has(key)) {
        this.metrics.set(key, {
          companyId,
          channelSlug,
          metrics: new Map()
        });
      }

      const channelMetrics = this.metrics.get(key);
      if (!channelMetrics.metrics.has(metricType)) {
        channelMetrics.metrics.set(metricType, []);
      }

      const metricHistory = channelMetrics.metrics.get(metricType);
      metricHistory.push({ value, metadata, timestamp });

      // Keep only recent metrics in memory (last 1000 entries)
      if (metricHistory.length > 1000) {
        metricHistory.splice(0, metricHistory.length - 1000);
      }

      this.emit('metric_recorded', {
        companyId,
        channelSlug,
        metricType,
        value,
        metadata,
        timestamp
      });

    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  /**
   * Get metrics for a specific channel and time range
   * @param {string} companyId - Company ID
   * @param {string} channelSlug - Channel slug
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of metrics
   */
  async getMetrics(companyId, channelSlug, options = {}) {
    const {
      metricTypes = [],
      startDate,
      endDate,
      aggregation = 'raw', // 'raw', 'hourly', 'daily'
      limit = 1000
    } = options;

    try {
      let query = `
        SELECT metric_type, value, metadata, timestamp
        FROM channel_metrics
        WHERE company_id = $1 AND channel_slug = $2
      `;
      const params = [companyId, channelSlug];
      let paramIndex = 2;

      if (metricTypes.length > 0) {
        paramIndex++;
        query += ` AND metric_type = ANY($${paramIndex})`;
        params.push(metricTypes);
      }

      if (startDate) {
        paramIndex++;
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
      }

      if (endDate) {
        paramIndex++;
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(endDate);
      }

      if (aggregation === 'hourly') {
        query = `
          SELECT
            metric_type,
            DATE_TRUNC('hour', timestamp) as timestamp,
            AVG(value) as avg_value,
            MIN(value) as min_value,
            MAX(value) as max_value,
            COUNT(*) as count
          FROM (${query}) m
          GROUP BY metric_type, DATE_TRUNC('hour', timestamp)
          ORDER BY timestamp DESC
        `;
      } else if (aggregation === 'daily') {
        query = `
          SELECT
            metric_type,
            DATE_TRUNC('day', timestamp) as timestamp,
            AVG(value) as avg_value,
            MIN(value) as min_value,
            MAX(value) as max_value,
            COUNT(*) as count
          FROM (${query}) m
          GROUP BY metric_type, DATE_TRUNC('day', timestamp)
          ORDER BY timestamp DESC
        `;
      } else {
        query += ` ORDER BY timestamp DESC`;
      }

      if (limit) {
        paramIndex++;
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
      }

      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      return result;

    } catch (error) {
      console.error('Error querying metrics:', error);
      return [];
    }
  }

  /**
   * Get aggregated metrics summary
   * @param {string} companyId - Company ID
   * @param {string} channelSlug - Channel slug (optional)
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Metrics summary
   */
  async getMetricsSummary(companyId, channelSlug = null, options = {}) {
    const {
      period = '24h', // '1h', '24h', '7d', '30d'
      metricTypes = []
    } = options;

    const periodHours = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };

    const hours = periodHours[period] || 24;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      let query = `
        SELECT
          channel_slug,
          metric_type,
          COUNT(*) as total_count,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          SUM(CASE WHEN value > 0 THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN value = 0 THEN 1 ELSE 0 END) as failure_count
        FROM channel_metrics
        WHERE company_id = $1 AND timestamp >= $2
      `;
      const params = [companyId, startDate];
      let paramIndex = 2;

      if (channelSlug) {
        paramIndex++;
        query += ` AND channel_slug = $${paramIndex}`;
        params.push(channelSlug);
      }

      if (metricTypes.length > 0) {
        paramIndex++;
        query += ` AND metric_type = ANY($${paramIndex})`;
        params.push(metricTypes);
      }

      query += ` GROUP BY channel_slug, metric_type`;

      const result = await this.prisma.$queryRawUnsafe(query, ...params);

      // Process results into structured format
      const summary = {
        period,
        startDate,
        endDate: new Date(),
        channels: {}
      };

      for (const row of result) {
        if (!summary.channels[row.channel_slug]) {
          summary.channels[row.channel_slug] = {};
        }

        summary.channels[row.channel_slug][row.metric_type] = {
          totalCount: parseInt(row.total_count),
          avgValue: parseFloat(row.avg_value),
          minValue: parseFloat(row.min_value),
          maxValue: parseFloat(row.max_value),
          successCount: parseInt(row.success_count),
          failureCount: parseInt(row.failure_count),
          successRate: row.total_count > 0 ?
            parseFloat(row.success_count) / parseFloat(row.total_count) : 0
        };
      }

      return summary;

    } catch (error) {
      console.error('Error getting metrics summary:', error);
      return { period, startDate, endDate: new Date(), channels: {} };
    }
  }

  // ================================
  // ALERTING SYSTEM
  // ================================

  /**
   * Create a monitoring alert
   * @param {Object} alertConfig - Alert configuration
   * @returns {string} - Alert ID
   */
  createAlert(alertConfig) {
    const {
      name,
      companyId,
      channelSlug = null,
      condition,
      threshold,
      severity = 'warning', // 'info', 'warning', 'error', 'critical'
      enabled = true,
      cooldownMs = this.config.alertCooldown
    } = alertConfig;

    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert = {
      id: alertId,
      name,
      companyId,
      channelSlug,
      condition,
      threshold,
      severity,
      enabled,
      cooldownMs,
      createdAt: new Date(),
      lastTriggered: null,
      triggerCount: 0
    };

    this.alerts.set(alertId, alert);
    return alertId;
  }

  /**
   * Check and trigger alerts based on current metrics
   * @private
   */
  async _checkMetricAlerts() {
    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled) continue;

      // Check cooldown
      if (alert.lastTriggered &&
          (Date.now() - alert.lastTriggered.getTime()) < alert.cooldownMs) {
        continue;
      }

      try {
        const shouldTrigger = await this._evaluateAlertCondition(alert);

        if (shouldTrigger) {
          await this._triggerAlert(alert);
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alertId}:`, error);
      }
    }
  }

  async _evaluateAlertCondition(alert) {
    const { condition, threshold, companyId, channelSlug } = alert;

    switch (condition) {
      case 'error_rate_high':
        return await this._checkErrorRate(companyId, channelSlug, threshold);

      case 'response_time_high':
        return await this._checkResponseTime(companyId, channelSlug, threshold);

      case 'consecutive_failures':
        return await this._checkConsecutiveFailures(companyId, channelSlug, threshold);

      case 'sync_failure_rate_high':
        return await this._checkSyncFailureRate(companyId, channelSlug, threshold);

      case 'channel_down':
        return await this._checkChannelDown(companyId, channelSlug);

      default:
        return false;
    }
  }

  async _checkErrorRate(companyId, channelSlug, threshold) {
    const metrics = await this.getMetrics(companyId, channelSlug, {
      metricTypes: [this.metricTypes.ERROR_RATE],
      startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      limit: 100
    });

    if (metrics.length === 0) return false;

    const recentMetrics = metrics.slice(0, 10);
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

    return avgErrorRate > threshold;
  }

  async _checkResponseTime(companyId, channelSlug, threshold) {
    const metrics = await this.getMetrics(companyId, channelSlug, {
      metricTypes: [this.metricTypes.RESPONSE_TIME],
      startDate: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
      limit: 50
    });

    if (metrics.length === 0) return false;

    const recentMetrics = metrics.slice(0, 5);
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

    return avgResponseTime > threshold;
  }

  async _checkConsecutiveFailures(companyId, channelSlug, threshold) {
    const health = this.getChannelHealth(companyId, channelSlug);
    return health && health.consecutiveErrors >= threshold;
  }

  async _checkSyncFailureRate(companyId, channelSlug, threshold) {
    const summary = await this.getMetricsSummary(companyId, channelSlug, {
      period: '1h',
      metricTypes: [this.metricTypes.SYNC_SUCCESS, this.metricTypes.SYNC_FAILURE]
    });

    const channelSummary = summary.channels[channelSlug];
    if (!channelSummary) return false;

    const syncSuccess = channelSummary[this.metricTypes.SYNC_SUCCESS] || { totalCount: 0 };
    const syncFailure = channelSummary[this.metricTypes.SYNC_FAILURE] || { totalCount: 0 };

    const totalSyncs = syncSuccess.totalCount + syncFailure.totalCount;
    if (totalSyncs === 0) return false;

    const failureRate = syncFailure.totalCount / totalSyncs;
    return failureRate > threshold;
  }

  async _checkChannelDown(companyId, channelSlug) {
    const health = this.getChannelHealth(companyId, channelSlug);
    return health && !health.isHealthy;
  }

  async _triggerAlert(alert) {
    alert.lastTriggered = new Date();
    alert.triggerCount++;

    const alertEvent = {
      alertId: alert.id,
      name: alert.name,
      companyId: alert.companyId,
      channelSlug: alert.channelSlug,
      condition: alert.condition,
      threshold: alert.threshold,
      severity: alert.severity,
      triggeredAt: alert.lastTriggered,
      triggerCount: alert.triggerCount,
      metadata: {}
    };

    // Log to database
    try {
      await this.prisma.$executeRaw`
        INSERT INTO channel_alerts (
          alert_id, name, company_id, channel_slug, condition_type,
          threshold_value, severity, triggered_at, metadata
        ) VALUES (
          ${alert.id}, ${alert.name}, ${alert.companyId}, ${alert.channelSlug || null},
          ${alert.condition}, ${alert.threshold}, ${alert.severity},
          ${alert.lastTriggered}, ${JSON.stringify(alertEvent.metadata)}
        )
      `;
    } catch (error) {
      console.error('Error logging alert:', error);
    }

    this.emit('alert_triggered', alertEvent);
    console.warn(`Alert triggered: ${alert.name} (${alert.condition}) for ${alert.companyId}:${alert.channelSlug}`);
  }

  async _checkHealthAlerts(healthStatus) {
    const { companyId, channelSlug, isHealthy, consecutiveErrors } = healthStatus;

    // Check for health-related alerts
    for (const [alertId, alert] of this.alerts) {
      if (alert.companyId !== companyId) continue;
      if (alert.channelSlug && alert.channelSlug !== channelSlug) continue;

      if (alert.condition === 'channel_down' && !isHealthy) {
        await this._triggerAlert(alert);
      } else if (alert.condition === 'consecutive_failures' &&
                consecutiveErrors >= alert.threshold) {
        await this._triggerAlert(alert);
      }
    }
  }

  // ================================
  // BACKGROUND PROCESSES
  // ================================

  _startHealthChecker() {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Error in health checker:', error);
      }
    }, this.config.healthCheckInterval);

    // Initial health check
    setTimeout(() => this.performHealthCheck(), 5000);
  }

  _startMetricsCollector() {
    setInterval(async () => {
      try {
        await this._collectSystemMetrics();
        await this._cleanupOldMetrics();
      } catch (error) {
        console.error('Error in metrics collector:', error);
      }
    }, 60000); // Every minute
  }

  _startAlertProcessor() {
    setInterval(async () => {
      try {
        await this._checkMetricAlerts();
      } catch (error) {
        console.error('Error in alert processor:', error);
      }
    }, 30000); // Every 30 seconds
  }

  async _collectSystemMetrics() {
    // Collect system-wide metrics
    const stats = channelAdapterFactory.getStatistics();

    // Record adapter statistics
    for (const [channelSlug, count] of Object.entries(stats.adaptersByChannel)) {
      await this.recordMetric('system', channelSlug, 'adapter_count', {
        value: count,
        metadata: { timestamp: new Date() }
      });
    }
  }

  async _cleanupOldMetrics() {
    const cutoffDate = new Date(Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);

    try {
      await this.prisma.$executeRaw`
        DELETE FROM channel_metrics
        WHERE timestamp < ${cutoffDate}
      `;

      await this.prisma.$executeRaw`
        DELETE FROM channel_alerts
        WHERE triggered_at < ${cutoffDate}
      `;
    } catch (error) {
      console.error('Error cleaning up old metrics:', error);
    }
  }

  // ================================
  // PUBLIC API METHODS
  // ================================

  /**
   * Get monitoring dashboard data
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} - Dashboard data
   */
  async getDashboardData(companyId) {
    const [health, summary, recentAlerts] = await Promise.all([
      this.getCompanyHealth(companyId),
      this.getMetricsSummary(companyId, null, { period: '24h' }),
      this.getRecentAlerts(companyId, 24) // Last 24 hours
    ]);

    return {
      timestamp: new Date(),
      companyId,
      health,
      metrics: summary,
      alerts: recentAlerts,
      statistics: {
        totalChannels: health.length,
        healthyChannels: health.filter(h => h.isHealthy).length,
        unhealthyChannels: health.filter(h => !h.isHealthy).length,
        totalAlerts: recentAlerts.length,
        criticalAlerts: recentAlerts.filter(a => a.severity === 'critical').length
      }
    };
  }

  /**
   * Get recent alerts
   * @param {string} companyId - Company ID
   * @param {number} hours - Hours to look back
   * @returns {Promise<Array>} - Array of recent alerts
   */
  async getRecentAlerts(companyId, hours = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const alerts = await this.prisma.$queryRaw`
        SELECT * FROM channel_alerts
        WHERE company_id = ${companyId} AND triggered_at >= ${startDate}
        ORDER BY triggered_at DESC
        LIMIT 100
      `;

      return alerts;
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
      return [];
    }
  }

  /**
   * Shutdown monitoring service
   */
  async shutdown() {
    console.log('Shutting down channel monitor...');
    // Clear intervals would be handled by process termination
    this.removeAllListeners();
    console.log('Channel monitor shut down');
  }
}

module.exports = ChannelMonitor;