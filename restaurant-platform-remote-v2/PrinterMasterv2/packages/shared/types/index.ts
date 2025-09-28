// PrinterMasterv2 - Shared Types
// Enterprise-grade type definitions for printer management system

export interface PrinterLicense {
  id: string;
  licenseKey: string;
  branchId: string;
  companyId: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  deviceLimit: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Printer {
  id: string;
  branchId: string;
  companyId: string;
  name: string;
  printerId: string; // QZ Tray printer ID
  driverName?: string;
  connectionType: 'USB' | 'Network' | 'Bluetooth';
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  status: 'online' | 'offline' | 'error' | 'testing' | 'unknown';
  lastSeen?: Date;
  capabilities?: PrinterCapabilities;
  settings?: PrinterSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterDevice {
  id: string;
  licenseKey: string;
  deviceId: string; // Machine fingerprint
  hostname?: string;
  platform: 'Windows' | 'macOS' | 'Linux';
  appVersion: string;
  qzVersion?: string;
  status: 'active' | 'inactive' | 'maintenance';
  lastHeartbeat?: Date;
  metadata?: DeviceMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterStatusLog {
  id: string;
  printerId: string;
  deviceId: string;
  status: string;
  errorMessage?: string;
  responseTime?: number; // milliseconds
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PrinterTestResult {
  id: string;
  printerId: string;
  deviceId: string;
  testType: 'status' | 'print_test' | 'alignment' | 'connectivity';
  success: boolean;
  duration?: number; // milliseconds
  errorMessage?: string;
  testData?: Record<string, any>;
  createdAt: Date;
}

export interface PrinterCapabilities {
  maxWidth?: number;
  maxHeight?: number;
  dpi?: number;
  colorSupport?: boolean;
  paperSizes?: string[];
  features?: string[];
}

export interface PrinterSettings {
  density?: number;
  speed?: number;
  paperSize?: string;
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface DeviceMetadata {
  os?: string;
  arch?: string;
  totalMemory?: number;
  cpuCount?: number;
  networkInterfaces?: NetworkInterface[];
  qzTrayInstalled?: boolean;
  installedPrinters?: string[];
}

export interface NetworkInterface {
  name: string;
  address: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
}

// API Request/Response Types
export interface LicenseValidationRequest {
  licenseKey: string;
  deviceId: string;
  deviceInfo: {
    hostname: string;
    platform: string;
    appVersion: string;
    qzVersion?: string;
  };
}

export interface LicenseValidationResponse {
  valid: boolean;
  branchId?: string;
  companyId?: string;
  expiresAt?: Date;
  deviceLimit?: number;
  currentDevices?: number;
  token?: string;
  error?: string;
}

export interface RegisterPrinterRequest {
  name: string;
  printerId: string;
  driverName?: string;
  connectionType: 'USB' | 'Network' | 'Bluetooth';
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  capabilities?: PrinterCapabilities;
}

export interface RegisterPrinterResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface UpdatePrinterStatusRequest {
  status: 'online' | 'offline' | 'error' | 'testing';
  errorMessage?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface HeartbeatRequest {
  timestamp: Date;
  metadata?: DeviceMetadata;
}

export interface TestPrinterRequest {
  testType: 'status' | 'print_test' | 'alignment' | 'connectivity';
  testData?: Record<string, any>;
}

export interface TestPrinterResponse {
  success: boolean;
  duration?: number;
  errorMessage?: string;
  testData?: Record<string, any>;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface PrinterStatusChangedEvent extends WebSocketEvent {
  type: 'printer:status:changed';
  data: {
    printerId: string;
    status: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  };
}

export interface PrinterDiscoveredEvent extends WebSocketEvent {
  type: 'printer:discovered';
  data: {
    printer: Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>;
    device: {
      deviceId: string;
      hostname: string;
    };
  };
}

export interface DeviceHeartbeatEvent extends WebSocketEvent {
  type: 'device:heartbeat';
  data: {
    deviceId: string;
    timestamp: Date;
    metadata?: DeviceMetadata;
  };
}

// System Health and Monitoring
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  printers: {
    total: number;
    online: number;
    offline: number;
    errors: number;
  };
  qzTray: {
    connected: boolean;
    version?: string;
  };
}

// Configuration Types
export interface AppConfiguration {
  apiUrl: string;
  wsUrl: string;
  refreshInterval: number; // seconds
  heartbeatInterval: number; // seconds
  autoStart: boolean;
  minimizeToTray: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogFiles: number;
  maxLogSize: number; // bytes
}

export interface QZTrayConfiguration {
  host: string;
  port: number;
  secure: boolean;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationError extends ApiError {
  field: string;
  value: any;
  constraint: string;
}

// License Types
export interface LicenseInfo {
  key: string;
  branchId: string;
  companyId: string;
  branchName: string;
  companyName: string;
  expiresAt?: Date;
  deviceLimit: number;
  features: string[];
}

// UI State Types
export interface AppState {
  license: LicenseInfo | null;
  printers: Printer[];
  deviceStatus: {
    qzTrayConnected: boolean;
    apiConnected: boolean;
    lastHeartbeat?: Date;
  };
  configuration: AppConfiguration;
  loading: boolean;
  error: string | null;
}

export interface PrinterState {
  id: string;
  status: 'online' | 'offline' | 'error' | 'testing' | 'unknown';
  lastSeen?: Date;
  testing: boolean;
  testResults: PrinterTestResult[];
  error?: string;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Filtering
export interface PrinterFilters {
  status?: string[];
  connectionType?: string[];
  branchId?: string;
  companyId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}