import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, Counter, Gauge, Histogram } from 'prom-client';

/**
 * Prometheus Metrics Service
 * Provides custom application metrics for monitoring and observability
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
  // WebSocket Metrics
  public readonly websocketConnections: Gauge;
  public readonly websocketMessages: Counter;
  public readonly websocketErrors: Counter;

  // Print System Metrics
  public readonly printTestRequests: Counter;
  public readonly printTestDuration: Histogram;
  public readonly printTestSuccessRate: Gauge;
  public readonly printJobsTotal: Counter;
  public readonly printJobsSuccess: Counter;
  public readonly printJobsFailed: Counter;

  // Correlation ID Metrics
  public readonly correlationIdGenerated: Counter;
  public readonly correlationIdCacheHits: Counter;
  public readonly correlationIdCacheMisses: Counter;
  public readonly correlationIdSuccessRate: Gauge;

  // Health Monitoring Metrics
  public readonly healthMonitoringQuality: Gauge;
  public readonly connectionQualityDistribution: Gauge;
  public readonly healthCheckDuration: Histogram;

  // Desktop App Metrics
  public readonly desktopAppConnections: Gauge;
  public readonly desktopAppHeartbeats: Counter;
  public readonly desktopAppConnectionQuality: Gauge;

  // Rate Limiting Metrics
  public readonly rateLimitTriggered: Counter;
  public readonly rateLimitActiveClients: Gauge;

  // Security Metrics
  public readonly authFailures: Counter;
  public readonly corsViolations: Counter;
  public readonly securityEvents: Counter;

  // Performance Metrics
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestErrors: Counter;

  constructor() {
    // WebSocket Metrics
    this.websocketConnections = new Gauge({
      name: 'websocket_connections_total',
      help: 'Total number of active WebSocket connections',
      labelNames: ['branch', 'type'],
    });

    this.websocketMessages = new Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages sent',
      labelNames: ['type', 'event'],
    });

    this.websocketErrors = new Counter({
      name: 'websocket_errors_total',
      help: 'Total number of WebSocket errors',
      labelNames: ['type', 'error'],
    });

    // Print System Metrics
    this.printTestRequests = new Counter({
      name: 'print_test_requests_total',
      help: 'Total number of print test requests',
      labelNames: ['printer', 'branch', 'status'],
    });

    this.printTestDuration = new Histogram({
      name: 'print_test_duration_seconds',
      help: 'Duration of print test operations',
      labelNames: ['printer', 'branch'],
      buckets: [0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 10],
    });

    this.printTestSuccessRate = new Gauge({
      name: 'print_test_success_rate',
      help: 'Print test success rate percentage',
      labelNames: ['printer', 'branch'],
    });

    this.printJobsTotal = new Counter({
      name: 'print_jobs_total',
      help: 'Total number of print jobs',
      labelNames: ['printer', 'branch', 'template'],
    });

    this.printJobsSuccess = new Counter({
      name: 'print_jobs_success_total',
      help: 'Total number of successful print jobs',
      labelNames: ['printer', 'branch'],
    });

    this.printJobsFailed = new Counter({
      name: 'print_jobs_failed_total',
      help: 'Total number of failed print jobs',
      labelNames: ['printer', 'branch', 'reason'],
    });

    // Correlation ID Metrics
    this.correlationIdGenerated = new Counter({
      name: 'correlation_id_generated_total',
      help: 'Total number of correlation IDs generated',
    });

    this.correlationIdCacheHits = new Counter({
      name: 'correlation_id_cache_hits_total',
      help: 'Total number of correlation ID cache hits',
    });

    this.correlationIdCacheMisses = new Counter({
      name: 'correlation_id_cache_misses_total',
      help: 'Total number of correlation ID cache misses',
    });

    this.correlationIdSuccessRate = new Gauge({
      name: 'correlation_id_success_rate',
      help: 'Correlation ID tracking success rate percentage',
    });

    // Health Monitoring Metrics
    this.healthMonitoringQuality = new Gauge({
      name: 'health_monitoring_quality_score',
      help: 'Health monitoring quality score (0-100)',
      labelNames: ['branch', 'printer'],
    });

    this.connectionQualityDistribution = new Gauge({
      name: 'connection_quality_distribution',
      help: 'Distribution of connection quality levels',
      labelNames: ['quality'],
    });

    this.healthCheckDuration = new Histogram({
      name: 'health_check_duration_seconds',
      help: 'Duration of health check operations',
      labelNames: ['endpoint'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
    });

    // Desktop App Metrics
    this.desktopAppConnections = new Gauge({
      name: 'desktop_app_connections_total',
      help: 'Total number of active Desktop App connections',
      labelNames: ['branch', 'version'],
    });

    this.desktopAppHeartbeats = new Counter({
      name: 'desktop_app_heartbeats_total',
      help: 'Total number of Desktop App heartbeats received',
      labelNames: ['branch'],
    });

    this.desktopAppConnectionQuality = new Gauge({
      name: 'desktop_app_connection_quality',
      help: 'Desktop App connection quality score (0-100)',
      labelNames: ['branch'],
    });

    // Rate Limiting Metrics
    this.rateLimitTriggered = new Counter({
      name: 'rate_limit_triggered_total',
      help: 'Total number of rate limit triggers',
      labelNames: ['client', 'endpoint'],
    });

    this.rateLimitActiveClients = new Gauge({
      name: 'rate_limit_active_clients',
      help: 'Number of clients currently rate limited',
    });

    // Security Metrics
    this.authFailures = new Counter({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason', 'endpoint'],
    });

    this.corsViolations = new Counter({
      name: 'cors_violations_total',
      help: 'Total number of CORS policy violations',
      labelNames: ['origin'],
    });

    this.securityEvents = new Counter({
      name: 'security_events_total',
      help: 'Total number of security events',
      labelNames: ['type', 'severity'],
    });

    // Performance Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error'],
    });
  }

  async onModuleInit() {
    // Initialize default metrics (CPU, memory, etc.)
    register.setDefaultLabels({
      app: 'restaurant-platform',
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics() {
    register.clear();
  }

  /**
   * Record WebSocket connection
   */
  recordWebSocketConnection(branch: string, type: string, connected: boolean) {
    if (connected) {
      this.websocketConnections.inc({ branch, type });
    } else {
      this.websocketConnections.dec({ branch, type });
    }
  }

  /**
   * Record print test
   */
  recordPrintTest(
    printer: string,
    branch: string,
    duration: number,
    success: boolean,
  ) {
    this.printTestRequests.inc({
      printer,
      branch,
      status: success ? 'success' : 'failed',
    });
    this.printTestDuration.observe({ printer, branch }, duration);
  }

  /**
   * Record correlation ID operation
   */
  recordCorrelationId(operation: 'generated' | 'hit' | 'miss') {
    switch (operation) {
      case 'generated':
        this.correlationIdGenerated.inc();
        break;
      case 'hit':
        this.correlationIdCacheHits.inc();
        break;
      case 'miss':
        this.correlationIdCacheMisses.inc();
        break;
    }
  }

  /**
   * Update health monitoring quality
   */
  updateHealthQuality(branch: string, printer: string, score: number) {
    this.healthMonitoringQuality.set({ branch, printer }, score);
  }

  /**
   * Record Desktop App connection
   */
  recordDesktopAppConnection(
    branch: string,
    version: string,
    connected: boolean,
  ) {
    if (connected) {
      this.desktopAppConnections.inc({ branch, version });
    } else {
      this.desktopAppConnections.dec({ branch, version });
    }
  }

  /**
   * Record rate limit trigger
   */
  recordRateLimit(client: string, endpoint: string) {
    this.rateLimitTriggered.inc({ client, endpoint });
  }

  /**
   * Record security event
   */
  recordSecurityEvent(type: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    this.securityEvents.inc({ type, severity });
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
  ) {
    this.httpRequestDuration.observe(
      { method, route, status: status.toString() },
      duration,
    );
    this.httpRequestsTotal.inc({
      method,
      route,
      status: status.toString(),
    });
  }
}
