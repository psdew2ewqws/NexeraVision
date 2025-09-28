export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  lastCheck: Date;
  uptime: number;
  checkDuration?: number;
  error?: string;
  checks: HealthCheckResult[];
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: string;
  metrics?: Record<string, any>;
  timestamp: Date;
}

export interface MonitoringMetrics {
  timestamp: Date;
  system: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    uptime: number;
  };
  delivery: {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    averageDeliveryTime: number;
    orderRate: number;
    errorRate: number;
  };
  providers: ProviderMetrics[];
}

export interface ProviderMetrics {
  name: string;
  successRate: number;
  averageResponseTime: number;
  totalOrders: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface PerformanceThreshold {
  responseTime: {
    warning: number;
    critical: number;
  };
  throughput: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  cpu: {
    warning: number;
    critical: number;
  };
}

export interface Alert {
  id?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  details?: any;
  environment?: string;
  hostname?: string;
  processId?: number;
  uptime?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  WARNING = 'warning',
  INFO = 'info'
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'sms' | 'pagerduty' | 'teams' | 'webhook';
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  severityFilter: AlertSeverity[];
}

export interface AlertRule {
  name: string;
  condition: (alert: Alert) => boolean;
  channels: string[];
  suppressionTime?: number;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface TimeSeriesData {
  metricName: string;
  dataPoints: MetricDataPoint[];
  lastUpdated: Date;
  aggregations: {
    avg: number;
    min: number;
    max: number;
    sum: number;
    count: number;
  };
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'status' | 'table' | 'gauge';
  title: string;
  size: 'small' | 'medium' | 'large';
  config: {
    metricName?: string;
    timeRange?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    threshold?: number;
    unit?: string;
    decimals?: number;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
}

export interface AlertingConfiguration {
  channels: AlertChannel[];
  rules: AlertRule[];
  globalSettings: {
    defaultSuppressionTime: number;
    maxAlertsPerHour: number;
    escalationEnabled: boolean;
    escalationDelay: number;
  };
}

export interface MonitoringConfiguration {
  healthChecks: {
    interval: number;
    timeout: number;
    retryAttempts: number;
  };
  metrics: {
    collectionInterval: number;
    retentionPeriod: number;
    maxDataPoints: number;
  };
  thresholds: PerformanceThreshold;
  alerting: AlertingConfiguration;
}

export interface SystemStatusSummary {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  components: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    providers: 'healthy' | 'degraded' | 'unhealthy';
    memory: 'healthy' | 'degraded' | 'unhealthy';
    cpu: 'healthy' | 'degraded' | 'unhealthy';
    external: 'healthy' | 'degraded' | 'unhealthy';
  };
  uptime: number;
  lastCheck: Date;
  activeAlerts: number;
  pendingIssues: string[];
}

export interface PerformanceSummary {
  ordersPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  cacheHitRate: number;
}

export interface ProviderHealthSummary {
  providerId: string;
  providerType: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastCheck: Date;
  responseTime: number;
  successRate: number;
  activeOrders: number;
  errorCount: number;
  region?: string;
}

export interface TrendAnalysis {
  metric: string;
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  prediction?: {
    nextValue: number;
    confidence: number;
    timeframe: string;
  };
}

export interface CapacityReport {
  currentLoad: number;
  maxCapacity: number;
  utilizationPercentage: number;
  bottlenecks: string[];
  recommendations: string[];
  scalingMetrics: {
    cpu: number;
    memory: number;
    network: number;
    database: number;
  };
}

export interface IncidentReport {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: 'open' | 'investigating' | 'resolved';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  affectedServices: string[];
  impactedUsers?: number;
  rootCause?: string;
  resolution?: string;
  timeline: {
    timestamp: Date;
    event: string;
    details?: string;
  }[];
  metrics: {
    mttr: number; // Mean Time To Recovery
    mtbf: number; // Mean Time Between Failures
    availability: number;
  };
}

export interface SLAMetrics {
  availability: {
    current: number;
    target: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    target: number;
  };
  errorRate: {
    current: number;
    target: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
  throughput: {
    current: number;
    target: number;
    peak: number;
  };
}