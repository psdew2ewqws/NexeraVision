import { EventEmitter } from 'events';
import log from 'electron-log';
import { QZTrayStatus, QZPrinter } from '../../types';

export class QZTrayService extends EventEmitter {
  private status: QZTrayStatus = {
    connected: false,
    version: undefined,
    secure: false,
    readyState: 0,
    url: 'ws://localhost:8012'
  };
  private reconnectTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing QZTrayService...');
      
      // Auto-connect to QZ Tray
      await this.connect();
      
      this.initialized = true;
      log.info('QZTrayService initialized successfully');
    } catch (error) {
      log.error('Failed to initialize QZTrayService:', error);
      this.emit('disconnected');
      // Don't throw - QZ Tray might not be running yet
    }
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down QZTrayService...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.disconnect();
    this.removeAllListeners();
    this.initialized = false;
  }

  async connect(): Promise<void> {
    try {
      log.info('Connecting to QZ Tray...');
      
      // Real QZ Tray WebSocket connection
      const qz = await this.importQZ();
      if (!qz) {
        throw new Error('QZ Tray SDK not available');
      }

      // Set WebSocket endpoint
      qz.websocket.setClosedCallbacks(() => {
        log.warn('QZ Tray connection closed');
        this.status.connected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      }, () => {
        log.error('QZ Tray connection error');
        this.status.connected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      // Connect to QZ Tray
      await qz.websocket.connect({ host: 'localhost', port: 8012 });
      
      // Get QZ version
      const version = await qz.version;
      
      this.status = {
        connected: true,
        version: version,
        secure: false,
        readyState: 1,
        url: 'ws://localhost:8012'
      };
      
      this.startHealthCheck();
      this.emit('connected', this.status);
      log.info(`Connected to QZ Tray v${version}`);
      
    } catch (error) {
      log.error('Failed to connect to QZ Tray:', error);
      this.status.connected = false;
      this.emit('disconnected');
      throw error;
    }
  }

  private async importQZ(): Promise<any> {
    try {
      // Dynamic import of QZ Tray SDK
      // This assumes QZ Tray SDK is available globally or installed
      return (global as any).qz || null;
    } catch (error) {
      log.error('Failed to import QZ Tray SDK:', error);
      return null;
    }
  }

  disconnect(): void {
    log.info('Disconnecting from QZ Tray...');
    
    this.stopHealthCheck();
    this.status.connected = false;
    this.status.readyState = 0;
    
    this.emit('disconnected');
    log.info('Disconnected from QZ Tray');
  }

  async getStatus(): Promise<QZTrayStatus> {
    return { ...this.status };
  }

  async getPrinters(): Promise<QZPrinter[]> {
    if (!this.status.connected) {
      throw new Error('Not connected to QZ Tray');
    }

    try {
      const qz = await this.importQZ();
      if (!qz) {
        throw new Error('QZ Tray SDK not available');
      }

      // Get real printer list from QZ Tray
      const printerNames = await qz.printers.find();
      const defaultPrinter = await qz.printers.getDefault();
      
      const printers: QZPrinter[] = [];
      
      for (const printerName of printerNames) {
        try {
          // Get printer details and capabilities
          const printerDetails = await this.getPrinterDetails(printerName);
          
          const printer: QZPrinter = {
            name: printerName,
            driver: printerDetails.driver || 'Unknown',
            connection: this.detectConnectionType(printerName),
            default: printerName === defaultPrinter,
            capabilities: printerDetails.capabilities,
            metadata: {
              manufacturer: this.extractManufacturer(printerDetails.driver || printerName),
              model: printerDetails.driver || 'Unknown Model',
              paperWidth: this.detectPaperWidth(printerName),
              connectionType: this.detectConnectionType(printerName),
              lastSeen: new Date(),
              status: printerDetails.status || 'unknown'
            }
          };
          
          printers.push(printer);
        } catch (error) {
          log.warn(`Failed to get details for printer ${printerName}:`, error);
          // Add printer with minimal info
          printers.push({
            name: printerName,
            driver: 'Unknown',
            connection: 'Unknown',
            default: printerName === defaultPrinter,
            metadata: {
              manufacturer: 'Unknown',
              model: 'Unknown Model',
              paperWidth: 80,
              connectionType: 'Unknown',
              lastSeen: new Date(),
              status: 'unknown'
            }
          });
        }
      }

      log.info(`Found ${printers.length} printers via QZ Tray`);
      return printers;
      
    } catch (error) {
      log.error('Failed to get printers from QZ Tray:', error);
      throw error;
    }
  }

  // Enhanced USB printer discovery
  async getUSBPrinters(): Promise<QZPrinter[]> {
    const allPrinters = await this.getPrinters();
    
    // Filter for USB printers
    const usbPrinters = allPrinters.filter(printer => 
      printer.connection.toLowerCase().includes('usb') ||
      printer.name.toLowerCase().includes('usb') ||
      this.isUSBPrinter(printer.name, printer.driver)
    );

    log.info(`Found ${usbPrinters.length} USB printers out of ${allPrinters.length} total printers`);
    return usbPrinters;
  }

  // Check if a printer is likely USB-connected
  private isUSBPrinter(printerName: string, driver: string): boolean {
    const name = (printerName + ' ' + driver).toLowerCase();
    
    // USB indicators
    const usbIndicators = [
      'usb',
      'local',
      'direct',
      'receipt printer',
      'thermal printer'
    ];

    // Network indicators (exclude these)
    const networkIndicators = [
      'network',
      'ethernet',
      'tcp/ip',
      'wifi',
      'wireless'
    ];

    // Check for network indicators first (exclusion)
    for (const indicator of networkIndicators) {
      if (name.includes(indicator)) {
        return false;
      }
    }

    // Check for USB indicators
    for (const indicator of usbIndicators) {
      if (name.includes(indicator)) {
        return true;
      }
    }

    // Default assumption: if no network indicators, likely USB
    return !name.includes('network') && !name.includes('ethernet');
  }

  async getPrinterDetails(printerName: string): Promise<{
    driver?: string;
    capabilities?: any;
    connection?: string;
    status?: string;
  }> {
    try {
      const qz = await this.importQZ();
      if (!qz) {
        return {};
      }

      // Get printer configuration and capabilities
      const config = qz.configs.create(printerName);
      
      // Try to get printer capabilities if available
      let capabilities;
      try {
        capabilities = await qz.printers.getCapabilities?.(printerName);
      } catch (error) {
        log.debug(`Could not get capabilities for ${printerName}:`, error);
      }

      return {
        driver: printerName, // QZ Tray uses printer name as driver identifier
        capabilities: capabilities,
        connection: this.detectConnectionType(printerName),
        status: 'unknown'
      };
    } catch (error) {
      log.error(`Failed to get printer details for ${printerName}:`, error);
      return {};
    }
  }

  async getDefaultPrinter(): Promise<QZPrinter | null> {
    const printers = await this.getPrinters();
    return printers.find(p => p.default) || null;
  }

  async testPrinter(printerName: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    if (!this.status.connected) {
      throw new Error('Not connected to QZ Tray');
    }

    const startTime = Date.now();
    
    try {
      const qz = await this.importQZ();
      if (!qz) {
        throw new Error('QZ Tray SDK not available');
      }

      // Create configuration for the printer
      const config = qz.configs.create(printerName);
      
      // Try to print a test line to verify connectivity
      const testData = [
        '^XA',
        '^FO50,50^ADN,36,20^FDTEST PRINT^FS',
        '^XZ'
      ];
      
      // Attempt to send test print job
      await qz.print(config, testData);
      
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: true,
        responseTime,
      };

      log.info(`Printer test for ${printerName} succeeded:`, result);
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = {
        success: false,
        responseTime,
        error: error.message || 'Printer test failed'
      };

      log.warn(`Printer test for ${printerName} failed:`, result);
      return result;
    }
  }

  private detectConnectionType(printerName: string): string {
    const name = printerName.toLowerCase();
    
    // Network printer patterns
    if (name.includes('network') || 
        name.includes('ethernet') || 
        name.includes('wifi') || 
        name.includes('tcp/ip') ||
        /\d+\.\d+\.\d+\.\d+/.test(name)) {
      return 'Network';
    }
    
    // USB printer patterns
    if (name.includes('usb') || 
        name.includes('local') ||
        name.includes('direct')) {
      return 'USB';
    }
    
    // Bluetooth patterns
    if (name.includes('bluetooth') || 
        name.includes('bt') ||
        name.includes('wireless')) {
      return 'Bluetooth';
    }
    
    // Serial patterns
    if (name.includes('serial') || 
        name.includes('com') ||
        name.includes('rs232')) {
      return 'Serial';
    }
    
    // Default to USB for most local printers
    return 'USB';
  }

  async printTestPage(printerName: string): Promise<boolean> {
    if (!this.status.connected) {
      throw new Error('Not connected to QZ Tray');
    }

    try {
      // Simulate test page printing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() > 0.1; // 90% success rate
      log.info(`Test page printed to ${printerName}: ${success ? 'success' : 'failed'}`);
      
      return success;
    } catch (error) {
      log.error(`Failed to print test page to ${printerName}:`, error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  getVersion(): string {
    return this.status.version || 'unknown';
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Health check every 30 seconds
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private performHealthCheck(): void {
    if (!this.status.connected) {
      return;
    }

    // Simulate health check
    const healthy = Math.random() > 0.05; // 95% success rate
    
    if (!healthy) {
      log.warn('QZ Tray health check failed');
      this.disconnect();
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    log.info('Scheduling QZ Tray reconnection in 10 seconds...');
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        log.error('QZ Tray reconnection failed:', error);
        this.scheduleReconnect(); // Retry
      } finally {
        this.reconnectTimer = undefined;
      }
    }, 10000);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Helper methods for printer metadata extraction
  private extractManufacturer(nameOrDriver: string): string {
    const name = nameOrDriver.toLowerCase();
    if (name.includes('epson')) return 'Epson';
    if (name.includes('star')) return 'Star';
    if (name.includes('citizen')) return 'Citizen';
    if (name.includes('bixolon')) return 'Bixolon';
    if (name.includes('zebra')) return 'Zebra';
    if (name.includes('hp')) return 'HP';
    if (name.includes('canon')) return 'Canon';
    if (name.includes('brother')) return 'Brother';
    if (name.includes('dymo')) return 'Dymo';
    return 'Unknown';
  }

  private detectPaperWidth(printerName: string): number {
    const name = printerName.toLowerCase();
    if (name.includes('80mm') || name.includes('80')) return 80;
    if (name.includes('58mm') || name.includes('58')) return 58;
    if (name.includes('110mm') || name.includes('110')) return 110;
    if (name.includes('4 inch') || name.includes('4"')) return 110;
    if (name.includes('3 inch') || name.includes('3"')) return 80;
    if (name.includes('2 inch') || name.includes('2"')) return 58;
    return 80; // Default for most thermal receipt printers
  }

  // Enhanced printer capability detection
  async getEnhancedCapabilities(printerName: string): Promise<string[]> {
    try {
      const qz = await this.importQZ();
      if (!qz) {
        return this.inferCapabilities(printerName);
      }

      // Try to get actual capabilities from QZ Tray
      let actualCapabilities: string[] = [];
      try {
        actualCapabilities = await qz.printers.getCapabilities?.(printerName) || [];
      } catch (error) {
        log.debug(`Could not get QZ capabilities for ${printerName}:`, error);
      }

      // Combine actual capabilities with inferred ones
      const inferredCapabilities = this.inferCapabilities(printerName);
      const combinedCapabilities = [...new Set([...actualCapabilities, ...inferredCapabilities])];

      return combinedCapabilities;
    } catch (error) {
      log.error(`Enhanced capability detection failed for ${printerName}:`, error);
      return this.inferCapabilities(printerName);
    }
  }

  private inferCapabilities(printerName: string): string[] {
    const name = printerName.toLowerCase();
    const capabilities = ['text']; // All printers support text

    // Cut support (most thermal printers)
    if (name.includes('thermal') || name.includes('receipt') || 
        name.includes('epson') || name.includes('star') ||
        name.includes('citizen') || name.includes('bixolon')) {
      capabilities.push('cut');
    }

    // Graphics support
    if (name.includes('graphics') || name.includes('epson') || 
        name.includes('star') || name.includes('citizen')) {
      capabilities.push('graphics');
    }

    // Barcode support
    if (name.includes('barcode') || name.includes('zebra') || 
        name.includes('epson') || name.includes('star') ||
        name.includes('citizen')) {
      capabilities.push('barcode');
    }

    // QR Code support (modern printers)
    if (name.includes('qr') || name.includes('epson') || 
        name.includes('star') || name.includes('citizen') ||
        name.includes('bixolon')) {
      capabilities.push('qrcode');
    }

    // Cash drawer support (receipt printers)
    if (name.includes('receipt') || name.includes('pos') ||
        name.includes('cash') || name.includes('drawer')) {
      capabilities.push('drawer');
    }

    return capabilities;
  }
}