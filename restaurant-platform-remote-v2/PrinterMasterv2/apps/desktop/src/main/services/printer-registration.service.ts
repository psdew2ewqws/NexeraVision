import { EventEmitter } from 'events';
import log from 'electron-log';
import { QZTrayService } from './qz-tray-service';
import { APIService } from './api-service';
import os from 'os';

export interface RegistrationResult {
  success: boolean;
  registered: Array<{
    id: string;
    name: string;
    type: string;
    connection: string;
    status: string;
  }>;
  updated: Array<{
    id: string;
    name: string;
    type: string;
    connection: string;
    status: string;
  }>;
  errors?: Array<{
    printer: string;
    error: string;
  }>;
  summary: {
    discovered: number;
    registered: number;
    updated: number;
    failed: number;
  };
}

export class PrinterRegistrationService extends EventEmitter {
  private branchId?: string;
  private deviceId: string;
  private autoRegistrationEnabled = true;
  private registrationTimer?: NodeJS.Timeout;
  private lastRegistration?: Date;

  constructor(
    private qzTrayService: QZTrayService,
    private apiService: APIService
  ) {
    super();
    this.deviceId = this.generateDeviceId();
    log.info('[PRINTER-REGISTRATION] Service initialized');
  }

  async initialize(branchId: string): Promise<void> {
    this.branchId = branchId;
    log.info(`[PRINTER-REGISTRATION] Initialized for branch: ${branchId}`);
    
    // Start automatic registration process
    if (this.autoRegistrationEnabled) {
      await this.startAutoRegistration();
    }
  }

  async shutdown(): Promise<void> {
    log.info('[PRINTER-REGISTRATION] Shutting down...');
    
    if (this.registrationTimer) {
      clearInterval(this.registrationTimer);
    }
    
    this.removeAllListeners();
  }

  async performRegistration(force: boolean = false): Promise<RegistrationResult> {
    if (!this.branchId) {
      throw new Error('Branch ID not configured');
    }

    if (!this.qzTrayService.isConnected()) {
      throw new Error('QZ Tray not connected');
    }

    try {
      log.info('[PRINTER-REGISTRATION] Starting printer discovery and registration...');

      // Discover printers via QZ Tray
      const discoveredPrinters = await this.qzTrayService.getPrinters();
      log.info(`[PRINTER-REGISTRATION] Discovered ${discoveredPrinters.length} printers via QZ Tray`);

      if (discoveredPrinters.length === 0) {
        return {
          success: true,
          registered: [],
          updated: [],
          summary: {
            discovered: 0,
            registered: 0,
            updated: 0,
            failed: 0
          }
        };
      }

      // Prepare registration data
      const registrationData = {
        branchId: this.branchId,
        deviceId: this.deviceId,
        printers: discoveredPrinters.map(printer => ({
          name: printer.name,
          driver: printer.driver,
          connection: printer.connection,
          default: printer.default,
          capabilities: printer.capabilities,
          status: 'online'
        })),
        deviceInfo: {
          hostname: os.hostname(),
          platform: os.platform(),
          version: process.env.APP_VERSION || '1.0.0'
        }
      };

      // Send registration to backend
      const result = await this.apiService.autoRegisterPrinters(registrationData);
      
      if (result.success && result.data) {
        this.lastRegistration = new Date();
        this.emit('registration-complete', result.data);
        log.info(`[PRINTER-REGISTRATION] Registration completed: ${result.data.summary.registered} registered, ${result.data.summary.updated} updated`);
        
        return {
          success: true,
          registered: result.data.registered || [],
          updated: result.data.updated || [],
          errors: result.data.errors,
          summary: result.data.summary
        };
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error) {
      log.error('[PRINTER-REGISTRATION] Registration failed:', error);
      this.emit('registration-error', error);
      throw error;
    }
  }

  async startAutoRegistration(): Promise<void> {
    log.info('[PRINTER-REGISTRATION] Starting automatic registration timer...');
    
    // Initial registration
    try {
      await this.performRegistration(false);
    } catch (error) {
      log.warn('[PRINTER-REGISTRATION] Initial registration failed:', error.message);
    }

    // Set up periodic registration (every 5 minutes)
    this.registrationTimer = setInterval(async () => {
      try {
        await this.performRegistration(false);
      } catch (error) {
        log.warn('[PRINTER-REGISTRATION] Periodic registration failed:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  stopAutoRegistration(): void {
    log.info('[PRINTER-REGISTRATION] Stopping automatic registration...');
    
    if (this.registrationTimer) {
      clearInterval(this.registrationTimer);
      this.registrationTimer = undefined;
    }
  }

  setAutoRegistrationEnabled(enabled: boolean): void {
    this.autoRegistrationEnabled = enabled;
    
    if (enabled && !this.registrationTimer && this.branchId) {
      this.startAutoRegistration();
    } else if (!enabled && this.registrationTimer) {
      this.stopAutoRegistration();
    }
  }

  isAutoRegistrationEnabled(): boolean {
    return this.autoRegistrationEnabled;
  }

  getLastRegistration(): Date | undefined {
    return this.lastRegistration;
  }

  getBranchId(): string | undefined {
    return this.branchId;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  private generateDeviceId(): string {
    // Generate a unique device ID based on hostname and MAC address
    const hostname = os.hostname();
    const networkInterfaces = os.networkInterfaces();
    let macAddress = 'unknown';

    // Find first non-internal network interface with MAC address
    for (const [interfaceName, addresses] of Object.entries(networkInterfaces)) {
      if (addresses) {
        for (const addr of addresses) {
          if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
            macAddress = addr.mac;
            break;
          }
        }
        if (macAddress !== 'unknown') break;
      }
    }

    // Create device ID from hostname and MAC
    const deviceId = `${hostname}-${macAddress}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    log.info(`[PRINTER-REGISTRATION] Generated device ID: ${deviceId}`);
    return deviceId;
  }

  // Enhanced USB printer enumeration
  async discoverUSBPrinters(): Promise<Array<{
    name: string;
    driver: string;
    connection: 'USB';
    default: boolean;
    capabilities?: string[];
    metadata?: {
      manufacturer?: string;
      model?: string;
      paperWidth?: number;
      connectionType: 'USB';
    };
  }>> {
    if (!this.qzTrayService.isConnected()) {
      throw new Error('QZ Tray not connected');
    }

    try {
      log.info('[PRINTER-REGISTRATION] Discovering USB printers...');
      
      const allPrinters = await this.qzTrayService.getPrinters();
      
      // Filter for USB printers and enhance with metadata
      const usbPrinters = allPrinters
        .filter(printer => printer.connection.toLowerCase().includes('usb'))
        .map(printer => ({
          name: printer.name,
          driver: printer.driver,
          connection: 'USB' as const,
          default: printer.default,
          capabilities: printer.capabilities || ['text', 'cut'],
          metadata: {
            manufacturer: this.extractManufacturer(printer.driver),
            model: printer.driver,
            paperWidth: this.detectPaperWidth(printer.name),
            connectionType: 'USB' as const
          }
        }));

      log.info(`[PRINTER-REGISTRATION] Found ${usbPrinters.length} USB printers`);
      return usbPrinters;
    } catch (error) {
      log.error('[PRINTER-REGISTRATION] USB printer discovery failed:', error);
      throw error;
    }
  }

  // Printer capability detection and storage
  async detectAndStorePrinterCapabilities(printerName: string): Promise<{
    capabilities: string[];
    metadata: {
      paperWidth: number;
      supportsCut: boolean;
      supportsGraphics: boolean;
      supportsBarcode: boolean;
      supportsQRCode: boolean;
    };
  }> {
    try {
      log.info(`[PRINTER-REGISTRATION] Detecting capabilities for: ${printerName}`);

      // Get detailed printer information from QZ Tray
      const printerDetails = await this.qzTrayService.getPrinterDetails(printerName);
      
      // Detect capabilities based on printer name and driver
      const capabilities = this.inferCapabilities(printerName, printerDetails.driver);
      
      const metadata = {
        paperWidth: this.detectPaperWidth(printerName),
        supportsCut: capabilities.includes('cut'),
        supportsGraphics: capabilities.includes('graphics'),
        supportsBarcode: capabilities.includes('barcode'),
        supportsQRCode: capabilities.includes('qrcode')
      };

      log.info(`[PRINTER-REGISTRATION] Detected capabilities for ${printerName}:`, { capabilities, metadata });
      return { capabilities, metadata };
    } catch (error) {
      log.error(`[PRINTER-REGISTRATION] Capability detection failed for ${printerName}:`, error);
      
      // Return default capabilities
      return {
        capabilities: ['text', 'cut'],
        metadata: {
          paperWidth: 80,
          supportsCut: true,
          supportsGraphics: false,
          supportsBarcode: false,
          supportsQRCode: false
        }
      };
    }
  }

  private extractManufacturer(driver: string): string {
    const name = driver.toLowerCase();
    if (name.includes('epson')) return 'Epson';
    if (name.includes('star')) return 'Star';
    if (name.includes('citizen')) return 'Citizen';
    if (name.includes('bixolon')) return 'Bixolon';
    if (name.includes('zebra')) return 'Zebra';
    if (name.includes('hp')) return 'HP';
    if (name.includes('canon')) return 'Canon';
    return 'Unknown';
  }

  private detectPaperWidth(printerName: string): number {
    const name = printerName.toLowerCase();
    if (name.includes('80mm') || name.includes('80')) return 80;
    if (name.includes('58mm') || name.includes('58')) return 58;
    if (name.includes('110mm') || name.includes('110')) return 110;
    return 80; // Default
  }

  private inferCapabilities(printerName: string, driver?: string): string[] {
    const name = (printerName + ' ' + (driver || '')).toLowerCase();
    const capabilities = ['text']; // All printers support text

    // Cut support (most thermal printers)
    if (name.includes('thermal') || name.includes('receipt') || name.includes('epson') || name.includes('star')) {
      capabilities.push('cut');
    }

    // Graphics support
    if (name.includes('graphics') || name.includes('epson') || name.includes('star')) {
      capabilities.push('graphics');
    }

    // Barcode support
    if (name.includes('barcode') || name.includes('zebra') || name.includes('epson') || name.includes('star')) {
      capabilities.push('barcode');
    }

    // QR Code support (modern printers)
    if (name.includes('qr') || name.includes('epson') || name.includes('star') || name.includes('citizen')) {
      capabilities.push('qrcode');
    }

    return capabilities;
  }
}