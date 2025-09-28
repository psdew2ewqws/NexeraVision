// Common types used throughout the application
export interface AppConfig {
  licenseKey: string;
  branchId: string;
  branchName: string;
  companyId: string;
  companyName: string;
  apiBaseUrl: string;
  qzTrayUrl: string;
  autoStart: boolean;
  monitoringInterval: number;
  theme: 'light' | 'dark';
  language: string;
}

export interface License {
  licenseKey: string;
  branchId: string;
  companyId: string;
  status: 'active' | 'expired' | 'invalid';
  deviceLimit: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  companyId: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  status: 'active' | 'inactive';
  settings: BranchSettings;
  createdAt: string;
  updatedAt: string;
}

export interface BranchSettings {
  printerAutoDiscovery: boolean;
  statusMonitoringInterval: number;
  autoTestInterval: number;
  notifications: {
    email: boolean;
    desktop: boolean;
    sound: boolean;
  };
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
  status: PrinterStatus;
  lastSeen?: string;
  capabilities?: PrinterCapabilities;
  settings?: PrinterSettings;
  createdAt: string;
  updatedAt: string;
}

export type PrinterStatus = 'unknown' | 'online' | 'offline' | 'error' | 'testing' | 'busy';

export interface PrinterCapabilities {
  maxPaperWidth: number;
  supportedResolutions: number[];
  colorSupport: boolean;
  cutter: boolean;
  drawer: boolean;
  capabilities: string[];
}

export interface PrinterSettings {
  paperSize: string;
  resolution: number;
  encoding: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface Device {
  id: string;
  licenseKey: string;
  deviceId: string; // machine fingerprint
  hostname: string;
  platform: 'Windows' | 'macOS' | 'Linux';
  appVersion: string;
  qzVersion?: string;
  status: 'active' | 'inactive';
  lastHeartbeat?: string;
  metadata: DeviceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceMetadata {
  os: {
    platform: string;
    arch: string;
    release: string;
    version: string;
  };
  hardware: {
    cpu: string;
    memory: number;
    storage: number;
  };
  network: {
    hostname: string;
    interfaces: NetworkInterface[];
  };
}

export interface NetworkInterface {
  name: string;
  type: string;
  mac: string;
  ip4: string;
  ip6?: string;
}

export interface PrinterTestResult {
  id: string;
  printerId: string;
  deviceId: string;
  testType: 'status' | 'print_test' | 'alignment' | 'connectivity';
  success: boolean;
  duration: number; // milliseconds
  errorMessage?: string;
  testData?: any;
  createdAt: string;
}

export interface StatusLog {
  id: string;
  printerId: string;
  deviceId: string;
  status: PrinterStatus;
  errorMessage?: string;
  responseTime?: number; // milliseconds
  metadata?: any;
  createdAt: string;
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
    responseTime?: number;
  };
  api: {
    connected: boolean;
    responseTime?: number;
    lastSync?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: HealthCheck[];
  overall: {
    score: number;
    message: string;
  };
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number;
  message?: string;
  data?: any;
}

// QZ Tray related types
export interface QZTrayStatus {
  connected: boolean;
  version?: string;
  secure: boolean;
  readyState: number;
  url: string;
}

export interface QZPrinter {
  name: string;
  driver?: string;
  connection?: string;
  default?: boolean;
  capabilities?: QZCapabilities | string[];
  metadata?: {
    manufacturer?: string;
    model?: string;
    paperWidth?: number;
    connectionType?: string;
    lastSeen?: Date;
    status?: string;
  };
}

export interface QZCapabilities {
  classes: string[];
  name: string;
  description: string;
  driver: string;
  connection: string;
  orientation: string;
  dpi: string;
  media: string[];
  color: boolean;
  duplex: boolean;
  copies: number;
  collate: boolean;
}

export interface QZConfig {
  copies: number;
  jobName?: string;
  scaleContent?: boolean;
  rasterize?: boolean;
  interpolation?: string;
  encoding?: string;
  endOfDoc?: string;
  perPage?: boolean;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// IPC types
export interface IPCMessage<T = any> {
  channel: string;
  data?: T;
  requestId?: string;
  timestamp: number;
}

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
  timestamp: number;
}

// Store types
export interface AppStore {
  // License & Authentication
  license: License | null;
  branch: Branch | null;
  device: Device | null;
  isAuthenticated: boolean;
  
  // Configuration
  config: Partial<AppConfig>;
  
  // Printers
  printers: Printer[];
  selectedPrinter: Printer | null;
  
  // QZ Tray
  qzTrayStatus: QZTrayStatus;
  qzPrinters: QZPrinter[];
  
  // System
  systemMetrics: SystemMetrics | null;
  healthStatus: HealthStatus | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  data?: any;
}

// Event types
export type AppEvent = 
  | { type: 'license/validated'; payload: License }
  | { type: 'license/invalid'; payload: string }
  | { type: 'printer/discovered'; payload: Printer }
  | { type: 'printer/status-changed'; payload: { printerId: string; status: PrinterStatus } }
  | { type: 'printer/test-completed'; payload: PrinterTestResult }
  | { type: 'qz-tray/connected'; payload: QZTrayStatus }
  | { type: 'qz-tray/disconnected'; payload: string }
  | { type: 'system/metrics-updated'; payload: SystemMetrics }
  | { type: 'system/health-updated'; payload: HealthStatus }
  | { type: 'error'; payload: string };

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;