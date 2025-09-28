// Monitoring types and interfaces

export interface WebhookEvent {
  id: string;
  timestamp: string;
  provider: string;
  type: string;
  status: 'success' | 'failure' | 'pending';
  responseTime?: number;
  payload?: any;
  error?: string;
}

export interface SystemMetrics {
  webhookCount: number;
  successRate: number;
  avgResponseTime: number;
  activeConnections: number;
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ProviderStatus {
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: string;
  responseTime: number;
  errorCount: number;
}

export interface AlertData {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  provider?: string;
  resolved: boolean;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTime: number;
  lastCheck: string;
  message?: string;
  details?: Record<string, any>;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  queueSize: number;
}

export interface DashboardFilters {
  provider?: string;
  status?: string;
  type?: string;
  timeRange?: string;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  lastError?: string;
}