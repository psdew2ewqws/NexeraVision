/**
 * TypeScript Type Definitions for PrinterMaster Service
 *
 * Provides comprehensive type safety for:
 * - Service configurations
 * - API endpoints
 * - Health check responses
 * - Error handling
 * - Printer management
 */

export interface ServiceConfiguration {
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  environment: 'development' | 'staging' | 'production';
  maxMemoryRestart?: string;
  healthCheckInterval: number;
  usbMonitoringInterval: number;
  printerDiscoveryInterval: number;
}

export interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'starting' | 'shutdown';
  timestamp: string;
  uptime: number;
  lastCheck: string;
  checks: Record<string, HealthCheckResult>;
  summary: HealthCheckSummary;
}

export interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail' | 'info';
  timestamp: string;
  error?: string;
  [key: string]: any;
}

export interface HealthCheckSummary {
  total: number;
  passing: number;
  warning: number;
  failing: number;
}

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'thermal' | 'generic' | 'network';
  connection: 'usb' | 'network' | 'bluetooth';
  status: 'connected' | 'disconnected' | 'error';
  vendorId?: number;
  productId?: number;
  manufacturer?: string;
  model?: string;
  capabilities: PrinterCapability[];
  devicePath?: string;
  lastSeen: string;
  discoveryMethod: string;
  metadata?: Record<string, any>;
}

export type PrinterCapability = 'text' | 'barcode' | 'cut' | 'cash_drawer' | 'graphics' | 'receipt';

export interface PrintJob {
  id?: string;
  printerId?: string;
  printerName?: string;
  content?: string;
  data?: any;
  type?: 'receipt' | 'label' | 'report' | 'test';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  correlationId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ServiceStats {
  startTime: Date;
  requestCount: number;
  printJobCount: number;
  errorCount: number;
  lastError: string | null;
  restartCount: number;
  uptime: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  timeout?: number;
}

export interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  nextAttempt: number;
  lastFailureTime: number | null;
  metrics: CircuitBreakerMetrics;
  isOpen: boolean;
  isHalfOpen: boolean;
  isClosed: boolean;
}

export interface CircuitBreakerMetrics {
  totalCalls: number;
  totalFailures: number;
  totalTimeouts: number;
  totalSuccesses: number;
  stateChanges: number;
  lastStateChange: string | null;
}

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  maxConnectionAge?: number;
}

export interface ConnectionPoolStatus {
  state: {
    total: number;
    available: number;
    busy: number;
    pending: number;
  };
  metrics: ConnectionPoolMetrics;
  summary: string;
  isHealthy: boolean;
  timestamp: string;
}

export interface ConnectionPoolMetrics {
  totalCreated: number;
  totalDestroyed: number;
  totalAcquired: number;
  totalReleased: number;
  totalErrors: number;
  currentSize: number;
  peakSize: number;
  waitingRequests: number;
}

export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimiterStatus {
  stats: RateLimiterStats;
  activeClients: number;
  configuration: {
    windowMs: number;
    maxRequests: number;
  };
  topClients: RateLimiterClient[];
  timestamp: string;
}

export interface RateLimiterStats {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  resetTime: number;
}

export interface RateLimiterClient {
  key: string;
  requests: number;
  firstRequest: number;
  resetTime: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId?: string;
  timestamp: string;
  count?: number;
}

export interface ServiceMetrics {
  service: {
    name: string;
    version: string;
    pid: number;
    uptime: number;
    restartCount: number;
    startTime: Date;
  };
  performance: {
    requestCount: number;
    printJobCount: number;
    errorCount: number;
    requestsPerMinute: number;
    successRate: number;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  connectivity: {
    websocketConnected: boolean;
    licenseValid: boolean;
    backendConnected: boolean;
  };
  health: HealthCheckStatus;
  timestamp: string;
}

export type ErrorCategory = 'recoverable' | 'fatal' | 'network' | 'hardware';

export interface EnhancedError extends Error {
  category?: ErrorCategory;
  correlationId?: string;
  context?: string;
  recoverable?: boolean;
  timestamp?: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  correlationId?: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface USBPrinterManagerStatus {
  connectedPrinters: number;
  totalPrinters: number;
  connected: PrinterDevice[];
  disconnected: PrinterDevice[];
  stats: USBPrinterStats;
  isMonitoring: boolean;
  lastScan: string;
  timestamp: string;
}

export interface USBPrinterStats {
  totalConnections: number;
  totalDisconnections: number;
  reconnectionAttempts: number;
  successfulReconnections: number;
  failedConnections: number;
  lastScan: string | null;
  scanCount: number;
}

export interface GracefulShutdownStatus {
  isShuttingDown: boolean;
  currentPhase: string | null;
  shutdownPhases: string[];
  handlersRegistered: boolean;
  shutdownTimeout: number;
}

export interface ServiceInfo {
  name: string;
  version: string;
  pid: number;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  stats: ServiceStats;
  websocketConnected: boolean;
  licenseValid: boolean;
  circuitBreakerStatus?: CircuitBreakerStatus;
  connectionPoolStatus?: ConnectionPoolStatus;
}

// Utility types for enhanced type safety
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event types for enhanced event handling
export interface ServiceEvent {
  type: string;
  timestamp: string;
  correlationId?: string;
  data?: any;
}

export interface PrinterEvent extends ServiceEvent {
  type: 'printer-connected' | 'printer-disconnected' | 'printer-error' | 'print-job-completed';
  printer: PrinterDevice;
}

export interface HealthEvent extends ServiceEvent {
  type: 'health-status-changed' | 'health-check-failed' | 'recovery-triggered';
  healthStatus: HealthCheckStatus;
}

export interface ErrorEvent extends ServiceEvent {
  type: 'error-occurred' | 'recovery-attempted' | 'recovery-succeeded' | 'recovery-failed';
  error: EnhancedError;
  category: ErrorCategory;
}