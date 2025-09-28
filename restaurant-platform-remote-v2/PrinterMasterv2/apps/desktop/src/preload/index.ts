/**
 * RestaurantPrint Pro - Preload Script
 * Secure bridge between main and renderer processes
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererEvent } from 'electron/main';

// Define the API interface
export interface ElectronAPI {
  // License management
  validateLicense: (licenseKey: string) => Promise<any>;
  getLicenseInfo: () => Promise<any>;

  // Multi-tenant management
  multiTenant: {
    authenticate: (licenseKey: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getCurrentTenant: () => Promise<any>;
    fetchCompanies: () => Promise<any[]>;
    fetchBranches: (companyId: string) => Promise<any[]>;
    switchTenant: (companyId: string, branchId: string) => Promise<boolean>;
    logout: () => Promise<void>;
    onTenantAuthenticated: (callback: (data: any) => void) => () => void;
    onTenantSwitched: (callback: (data: any) => void) => () => void;
    onCompaniesLoaded: (callback: (companies: any[]) => void) => () => void;
    onBranchesLoaded: (callback: (branches: any[]) => void) => () => void;
  };

  // Printer management
  printer: {
    getDiscoveredPrinters: () => Promise<any[]>;
    startDiscovery: () => Promise<void>;
    testPrinter: (printerId: string) => Promise<any>;
    onPrinterDiscovered: (callback: (printer: any) => void) => () => void;
    onPrinterStatusChanged: (callback: (data: any) => void) => () => void;
  };
  
  // Legacy printer methods (for backward compatibility)
  discoverPrinters: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  testPrinter: (printerId: string, testType: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  getPrinters: () => Promise<{ success: boolean; data?: any[]; error?: string }>;

  // Configuration
  getConfig: () => Promise<{ success: boolean; data?: any; error?: string }>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean; error?: string }>;

  // Health monitoring
  getHealthStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;

  // Application control
  restartApp: () => Promise<void>;
  quitApp: () => Promise<void>;

  // Device info
  getDeviceInfo: () => Promise<{ deviceId: string; metadata: any }>;

  // Window management
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Updates
  checkForUpdates: () => Promise<any>;
  installUpdate: () => Promise<void>;

  // Navigation
  navigateToDashboard: () => Promise<{ success: boolean; error?: string }>;

  // System metrics
  getSystemMetrics: () => Promise<any>;

  // Event listeners
  onLicenseStatus: (callback: (event: IpcRendererEvent, data: any) => void) => () => void;
  onQzStatus: (callback: (event: IpcRendererEvent, data: any) => void) => () => void;
  onQzError: (callback: (event: IpcRendererEvent, error: any) => void) => () => void;
  onPrinterDiscovered: (callback: (event: IpcRendererEvent, printer: any) => void) => () => void;
  onPrinterStatusChanged: (callback: (event: IpcRendererEvent, data: any) => void) => () => void;
  onPrinterTestResult: (callback: (event: IpcRendererEvent, data: any) => void) => () => void;
  onApiStatus: (callback: (event: IpcRendererEvent, data: any) => void) => () => void;
  onApiError: (callback: (event: IpcRendererEvent, error: any) => void) => () => void;
  onHealthStatus: (callback: (event: IpcRendererEvent, health: any) => void) => () => void;

  // System info
  platform: string;
  version: string;
}

// Validate origin for security
const ALLOWED_ORIGINS = [
  'http://localhost:3002',
  'file://',
];

const isValidOrigin = (origin: string): boolean => {
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
};

// Define the electron API
const electronAPI: ElectronAPI = {
  // License management
  validateLicense: (licenseKey: string) => ipcRenderer.invoke('license:validate', licenseKey),
  getLicenseInfo: () => ipcRenderer.invoke('license:get'),

  // Multi-tenant management
  multiTenant: {
    authenticate: (licenseKey: string) => ipcRenderer.invoke('multi-tenant:authenticate', licenseKey),
    getCurrentTenant: () => ipcRenderer.invoke('multi-tenant:get-current'),
    fetchCompanies: () => ipcRenderer.invoke('multi-tenant:fetch-companies'),
    fetchBranches: (companyId: string) => ipcRenderer.invoke('multi-tenant:fetch-branches', companyId),
    switchTenant: (companyId: string, branchId: string) => 
      ipcRenderer.invoke('multi-tenant:switch-tenant', companyId, branchId),
    logout: () => ipcRenderer.invoke('multi-tenant:logout'),
    onTenantAuthenticated: (callback) => {
      const handler = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('multi-tenant:authenticated', handler);
      return () => ipcRenderer.removeListener('multi-tenant:authenticated', handler);
    },
    onTenantSwitched: (callback) => {
      const handler = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('multi-tenant:switched', handler);
      return () => ipcRenderer.removeListener('multi-tenant:switched', handler);
    },
    onCompaniesLoaded: (callback) => {
      const handler = (event: IpcRendererEvent, companies: any[]) => callback(companies);
      ipcRenderer.on('multi-tenant:companies-loaded', handler);
      return () => ipcRenderer.removeListener('multi-tenant:companies-loaded', handler);
    },
    onBranchesLoaded: (callback) => {
      const handler = (event: IpcRendererEvent, branches: any[]) => callback(branches);
      ipcRenderer.on('multi-tenant:branches-loaded', handler);
      return () => ipcRenderer.removeListener('multi-tenant:branches-loaded', handler);
    }
  },

  // Printer management
  printer: {
    getDiscoveredPrinters: () => ipcRenderer.invoke('printer:get-discovered'),
    startDiscovery: () => ipcRenderer.invoke('printer:start-discovery'),
    testPrinter: (printerId: string) => ipcRenderer.invoke('printer:test', printerId),
    onPrinterDiscovered: (callback) => {
      const handler = (event: IpcRendererEvent, printer: any) => callback(printer);
      ipcRenderer.on('printer:discovered', handler);
      return () => ipcRenderer.removeListener('printer:discovered', handler);
    },
    onPrinterStatusChanged: (callback) => {
      const handler = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('printer:status-changed', handler);
      return () => ipcRenderer.removeListener('printer:status-changed', handler);
    }
  },

  // Legacy printer methods (for backward compatibility)
  discoverPrinters: () => ipcRenderer.invoke('discoverPrinters'),
  testPrinter: (printerId: string, testType: string) =>
    ipcRenderer.invoke('testPrinter', printerId),
  getPrinters: () => ipcRenderer.invoke('printers:list'),

  // Configuration
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:update', { [key]: value }),

  // Health monitoring
  getHealthStatus: () => ipcRenderer.invoke('system:health'),

  // Application control
  restartApp: () => ipcRenderer.invoke('app:restart'),
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // Device info
  getDeviceInfo: () => ipcRenderer.invoke('system:metrics'),

  // Window management
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:close'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('app:version'),
  installUpdate: () => ipcRenderer.invoke('app:restart'),

  // Navigation
  navigateToDashboard: () => ipcRenderer.invoke('navigate:dashboard'),

  // System metrics
  getSystemMetrics: () => ipcRenderer.invoke('system:metrics'),

  // Event listeners with automatic cleanup
  onLicenseStatus: (callback) => {
    const handler = (event: IpcRendererEvent, data: any) => callback(event, data);
    ipcRenderer.on('license-status', handler);
    return () => ipcRenderer.removeListener('license-status', handler);
  },

  onQzStatus: (callback) => {
    const handler = (event: IpcRendererEvent, data: any) => callback(event, data);
    ipcRenderer.on('qz-status', handler);
    return () => ipcRenderer.removeListener('qz-status', handler);
  },

  onQzError: (callback) => {
    const handler = (event: IpcRendererEvent, error: any) => callback(event, error);
    ipcRenderer.on('qz-error', handler);
    return () => ipcRenderer.removeListener('qz-error', handler);
  },

  onPrinterDiscovered: (callback) => {
    const handler = (event: IpcRendererEvent, printer: any) => callback(event, printer);
    ipcRenderer.on('printer-discovered', handler);
    return () => ipcRenderer.removeListener('printer-discovered', handler);
  },

  onPrinterStatusChanged: (callback) => {
    const handler = (event: IpcRendererEvent, data: any) => callback(event, data);
    ipcRenderer.on('printer-status-changed', handler);
    return () => ipcRenderer.removeListener('printer-status-changed', handler);
  },

  onPrinterTestResult: (callback) => {
    const handler = (event: IpcRendererEvent, data: any) => callback(event, data);
    ipcRenderer.on('printer-test-result', handler);
    return () => ipcRenderer.removeListener('printer-test-result', handler);
  },

  onApiStatus: (callback) => {
    const handler = (event: IpcRendererEvent, data: any) => callback(event, data);
    ipcRenderer.on('api-status', handler);
    return () => ipcRenderer.removeListener('api-status', handler);
  },

  onApiError: (callback) => {
    const handler = (event: IpcRendererEvent, error: any) => callback(event, error);
    ipcRenderer.on('api-error', handler);
    return () => ipcRenderer.removeListener('api-error', handler);
  },

  onHealthStatus: (callback) => {
    const handler = (event: IpcRendererEvent, health: any) => callback(event, health);
    ipcRenderer.on('health-status', handler);
    return () => ipcRenderer.removeListener('health-status', handler);
  },

  // System info
  platform: process.platform,
  version: process.env.npm_package_version || '2.0.0',
};

// Security: Only expose API to allowed origins
if (typeof window !== 'undefined') {
  const currentOrigin = window.location.origin;
  
  if (isValidOrigin(currentOrigin)) {
    // Expose the API to the renderer process
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } else {
    console.error('Unauthorized origin attempting to access Electron API:', currentOrigin);
  }
}

// Additional security measures
window.addEventListener('DOMContentLoaded', () => {
  // Disable context menus in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  // Disable certain keyboard shortcuts in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('keydown', (e) => {
      // Disable F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Disable Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
      
      // Disable Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
      }
      
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
    });
  }
});

// Enhanced error handling
window.addEventListener('error', (event) => {
  console.error('Renderer error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// CSP reporting
document.addEventListener('securitypolicyviolation', (event) => {
  console.error('CSP Violation:', {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    originalPolicy: event.originalPolicy,
  });
});

export default electronAPI;