export interface ElectronAPI {
  // License management
  validateLicense: (licenseKey: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  getLicenseInfo: () => Promise<any>;

  // Printer management
  discoverPrinters: () => Promise<any>;
  testPrinter: (printerId: string) => Promise<any>;
  getPrinters: () => Promise<any>;

  // Configuration
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<any>;

  // Health monitoring
  getHealthStatus: () => Promise<any>;

  // Application control
  restartApp: () => Promise<void>;
  quitApp: () => Promise<void>;

  // Device info
  getDeviceInfo: () => Promise<any>;

  // Window management
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Updates
  checkForUpdates: () => Promise<any>;
  installUpdate: () => Promise<void>;

  // Event listeners
  onLicenseStatus: (callback: (event: any, data: any) => void) => () => void;
  onPrinterDiscovered: (callback: (event: any, printer: any) => void) => () => void;
  onPrinterStatusChanged: (callback: (event: any, data: any) => void) => () => void;

  // System info
  platform: string;
  version: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}