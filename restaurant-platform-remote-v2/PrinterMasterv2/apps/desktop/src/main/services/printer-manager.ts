import { EventEmitter } from 'events';
import log from 'electron-log';
import { Printer, PrinterTestResult, PrinterStatus } from '../../types';
import { QZTrayService } from './qz-tray-service';
import { APIService } from './api-service';

export class PrinterManager extends EventEmitter {
  private qzTrayService: QZTrayService;
  private apiService: APIService;
  private printers: Map<string, Printer> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private initialized = false;

  constructor(qzTrayService: QZTrayService, apiService: APIService) {
    super();
    this.qzTrayService = qzTrayService;
    this.apiService = apiService;
  }

  async initialize(): Promise<void> {
    try {
      log.info('Initializing PrinterManager...');
      
      // Start monitoring
      this.startMonitoring();
      
      this.initialized = true;
      log.info('PrinterManager initialized successfully');
    } catch (error) {
      log.error('Failed to initialize PrinterManager:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down PrinterManager...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.removeAllListeners();
    this.initialized = false;
  }

  async discoverPrinters(config?: {
    branchId?: string;
    companyId?: string;
    licenseKey?: string;
    autoRegister?: boolean;
  }): Promise<Printer[]> {
    try {
      log.info('Discovering printers via QZ Tray...');
      
      // Use QZ Tray to discover real printers
      const qzPrinters = await this.qzTrayService.getPrinters();
      const discoveredPrinters: Printer[] = [];
      
      for (const qzPrinter of qzPrinters) {
        try {
          // Get detailed printer information
          const printerDetails = await this.qzTrayService.getPrinterDetails(qzPrinter.name);
          
          // Extract network information if available
          const networkInfo = await this.extractNetworkInfo(qzPrinter.name);
          
          const printer: Printer = {
            id: `printer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            branchId: config?.branchId || 'unknown',
            companyId: config?.companyId || 'unknown',
            name: qzPrinter.name,
            printerId: qzPrinter.name,
            driverName: qzPrinter.driver || printerDetails.driver,
            connectionType: this.mapConnectionType(qzPrinter.connection || printerDetails.connection),
            ipAddress: networkInfo.ipAddress,
            port: networkInfo.port,
            macAddress: networkInfo.macAddress,
            status: 'online', // Assume discovered printers are online
            lastSeen: new Date().toISOString(),
            capabilities: this.mapCapabilities(qzPrinter.capabilities || printerDetails.capabilities),
            settings: this.getDefaultSettings(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          // Try to register with backend if auto-register is enabled
          if (config?.autoRegister !== false) {
            try {
              const registrationData = {
                name: printer.name,
                type: this.detectPrinterType(printer),
                connection: printer.connectionType.toLowerCase(),
                ip: printer.ipAddress,
                port: printer.port,
                manufacturer: this.extractManufacturer(printer.name),
                model: this.extractModel(printer.name),
                driver_name: printer.driverName,
                mac_address: printer.macAddress,
                status: printer.status,
                capabilities: printer.capabilities,
                settings: printer.settings,
                location: 'Auto-detected',
                assignedTo: 'all',
                isDefault: qzPrinter.default || false,
                companyId: config?.companyId,
                branchId: config?.branchId,
                licenseKey: config?.licenseKey,
                lastAutoDetection: new Date().toISOString(),
                isAutoDetected: true
              };

              const response = await this.apiService.registerPrinter(registrationData);
              if (response.success && response.data) {
                // Use the printer data from the backend (might have assigned IDs)
                Object.assign(printer, {
                  id: response.data.id || printer.id,
                  branchId: response.data.branchId || printer.branchId,
                  companyId: response.data.companyId || printer.companyId,
                });
                log.info(`Successfully registered printer ${printer.name} with backend`);
              }
            } catch (error) {
              log.warn(`Failed to register printer ${printer.name} with backend:`, error);
              // Continue with local printer data
            }
          }
          
          discoveredPrinters.push(printer);
          this.printers.set(printer.id, printer);
          
        } catch (error) {
          log.error(`Failed to process printer ${qzPrinter.name}:`, error);
          // Add basic printer info even if detailed processing fails
          const basicPrinter: Printer = {
            id: `printer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            branchId: config?.branchId || 'unknown',
            companyId: config?.companyId || 'unknown',
            name: qzPrinter.name,
            printerId: qzPrinter.name,
            connectionType: 'USB',
            status: 'unknown',
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          discoveredPrinters.push(basicPrinter);
          this.printers.set(basicPrinter.id, basicPrinter);
        }
      }
      
      log.info(`Discovered ${discoveredPrinters.length} printers via QZ Tray`);
      this.emit('printers-discovered', discoveredPrinters);
      
      return discoveredPrinters;
    } catch (error) {
      log.error('Failed to discover printers:', error);
      throw error;
    }
  }

  private mapConnectionType(connection?: string): 'USB' | 'Network' | 'Bluetooth' {
    if (!connection) return 'USB';
    
    const conn = connection.toLowerCase();
    if (conn.includes('network') || conn.includes('ethernet') || conn.includes('tcp')) return 'Network';
    if (conn.includes('bluetooth') || conn.includes('bt')) return 'Bluetooth';
    return 'USB';
  }

  private async extractNetworkInfo(printerName: string): Promise<{
    ipAddress?: string;
    port?: number;
    macAddress?: string;
  }> {
    try {
      // Try to extract IP address from printer name
      const ipMatch = printerName.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      const ipAddress = ipMatch ? ipMatch[1] : undefined;
      
      // Default port for network printers
      const port = ipAddress ? 9100 : undefined;
      
      // MAC address detection would require system network utilities
      // For now, we'll return undefined and let backend handle it
      
      return {
        ipAddress,
        port,
        macAddress: undefined
      };
    } catch (error) {
      log.debug(`Failed to extract network info for ${printerName}:`, error);
      return {};
    }
  }

  private mapCapabilities(qzCapabilities?: any): PrinterCapabilities | undefined {
    if (!qzCapabilities) return undefined;

    try {
      return {
        maxPaperWidth: this.extractPaperWidth(qzCapabilities),
        supportedResolutions: this.extractResolutions(qzCapabilities),
        colorSupport: this.detectColorSupport(qzCapabilities),
        cutter: this.detectCutterSupport(qzCapabilities),
        drawer: this.detectDrawerSupport(qzCapabilities),
        capabilities: this.extractCapabilityList(qzCapabilities)
      };
    } catch (error) {
      log.debug('Failed to map capabilities:', error);
      return undefined;
    }
  }

  private extractPaperWidth(capabilities: any): number {
    // Default to 80mm for receipt printers
    if (capabilities.media && capabilities.media.includes('80mm')) return 80;
    if (capabilities.media && capabilities.media.includes('58mm')) return 58;
    return 80; // Default
  }

  private extractResolutions(capabilities: any): number[] {
    if (capabilities.dpi) {
      if (typeof capabilities.dpi === 'string') {
        const match = capabilities.dpi.match(/(\d+)/);
        return match ? [parseInt(match[1])] : [203];
      }
    }
    return [203]; // Default DPI
  }

  private detectColorSupport(capabilities: any): boolean {
    return capabilities.color === true || 
           (capabilities.classes && capabilities.classes.includes('COLOR'));
  }

  private detectCutterSupport(capabilities: any): boolean {
    return capabilities.capabilities && 
           (capabilities.capabilities.includes('cut') || 
            capabilities.capabilities.includes('cutter'));
  }

  private detectDrawerSupport(capabilities: any): boolean {
    return capabilities.capabilities && 
           capabilities.capabilities.includes('drawer');
  }

  private extractCapabilityList(capabilities: any): string[] {
    const caps = ['text']; // All printers support text
    
    if (this.detectColorSupport(capabilities)) caps.push('color');
    if (this.detectCutterSupport(capabilities)) caps.push('cut');
    if (this.detectDrawerSupport(capabilities)) caps.push('drawer');
    
    // Common capabilities for receipt printers
    caps.push('barcode', 'qrcode');
    
    return caps;
  }

  private getDefaultSettings(): PrinterSettings {
    return {
      paperSize: '80mm',
      resolution: 203,
      encoding: 'UTF-8',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    };
  }

  private detectPrinterType(printer: Printer): string {
    const name = printer.name.toLowerCase();
    
    if (name.includes('receipt') || name.includes('tm-') || name.includes('tsp')) {
      return 'receipt';
    }
    if (name.includes('kitchen') || name.includes('kds')) {
      return 'kitchen';
    }
    if (name.includes('label')) {
      return 'label';
    }
    if (name.includes('barcode')) {
      return 'barcode';
    }
    
    // Default to thermal for most POS printers
    return 'thermal';
  }

  private extractManufacturer(printerName: string): string {
    const name = printerName.toLowerCase();
    
    if (name.includes('epson')) return 'Epson';
    if (name.includes('star')) return 'Star Micronics';
    if (name.includes('hp')) return 'HP';
    if (name.includes('canon')) return 'Canon';
    if (name.includes('brother')) return 'Brother';
    if (name.includes('zebra')) return 'Zebra';
    if (name.includes('citizen')) return 'Citizen';
    
    return 'Unknown';
  }

  private extractModel(printerName: string): string {
    // Extract model number/name from printer name
    const patterns = [
      /TM-(\w+)/i,       // Epson TM series
      /TSP(\w+)/i,       // Star TSP series
      /LP-(\w+)/i,       // Label printers
      /(\w+\d+\w*)/i     // Generic model pattern
    ];
    
    for (const pattern of patterns) {
      const match = printerName.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    
    return printerName; // Return full name if no pattern matches
  }

  async getPrinters(): Promise<Printer[]> {
    return Array.from(this.printers.values());
  }

  async getPrinterStatus(printerId: string): Promise<PrinterStatus> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }
    return printer.status;
  }

  async testPrinter(printerId: string): Promise<PrinterTestResult> {
    try {
      log.info('Testing printer:', printerId);
      
      const printer = this.printers.get(printerId);
      if (!printer) {
        throw new Error(`Printer ${printerId} not found`);
      }
      
      // Update status to testing
      printer.status = 'testing';
      this.printers.set(printerId, printer);
      this.emit('printer-status-changed', { printerId, status: 'testing' });
      
      // Call backend API to test printer
      const response = await this.apiService.testPrinter(printerId, 'status');
      
      let testResult: PrinterTestResult;
      if (response.success && response.data) {
        testResult = response.data;
      } else {
        // Fallback to QZ Tray test if backend fails
        testResult = await this.performLocalPrinterTest(printer);
      }
      
      // Update printer status based on test result
      printer.status = testResult.success ? 'online' : 'error';
      printer.lastSeen = new Date().toISOString();
      this.printers.set(printerId, printer);
      
      this.emit('printer-status-changed', { printerId, status: printer.status });
      this.emit('printer-test-completed', testResult);
      
      log.info(`Printer test completed:`, { printerId, success: testResult.success });
      
      return testResult;
    } catch (error) {
      log.error('Failed to test printer:', error);
      
      // Reset printer status
      const printer = this.printers.get(printerId);
      if (printer) {
        printer.status = 'error';
        this.printers.set(printerId, printer);
        this.emit('printer-status-changed', { printerId, status: 'error' });
      }
      
      throw error;
    }
  }

  private async performLocalPrinterTest(printer: Printer): Promise<PrinterTestResult> {
    try {
      // Use QZ Tray to test printer connectivity
      const testResult = await this.qzTrayService.testPrinter(printer.printerId);
      const isAvailable = testResult.success;
      
      return {
        id: `test-${Date.now()}`,
        printerId: printer.id,
        deviceId: 'device-1', // This should come from device info
        testType: 'connectivity',
        success: isAvailable,
        duration: 1000,
        createdAt: new Date().toISOString(),
        errorMessage: isAvailable ? undefined : 'Printer not accessible via QZ Tray',
      };
    } catch (error) {
      return {
        id: `test-${Date.now()}`,
        printerId: printer.id,
        deviceId: 'device-1',
        testType: 'connectivity',
        success: false,
        duration: 1000,
        createdAt: new Date().toISOString(),
        errorMessage: error.message || 'Test failed',
      };
    }
  }

  async testAllPrinters(): Promise<PrinterTestResult[]> {
    const printers = Array.from(this.printers.values());
    const results: PrinterTestResult[] = [];
    
    for (const printer of printers) {
      try {
        const result = await this.testPrinter(printer.id);
        results.push(result);
      } catch (error) {
        log.error(`Failed to test printer ${printer.id}:`, error);
      }
    }
    
    return results;
  }

  private startMonitoring(): void {
    // Monitor printer status every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.monitorPrinterStatus();
    }, 30000);
  }

  private async monitorPrinterStatus(): Promise<void> {
    try {
      const printers = Array.from(this.printers.values());
      
      for (const printer of printers) {
        try {
          // Check printer availability via QZ Tray
          const testResult = await this.qzTrayService.testPrinter(printer.printerId);
          const isAvailable = testResult.success;
          const now = new Date();
          
          if (isAvailable && printer.status === 'offline') {
            // Printer came back online
            printer.status = 'online';
            printer.lastSeen = now.toISOString();
            printer.updatedAt = now.toISOString();
            this.printers.set(printer.id, printer);
            
            this.emit('printer-status-changed', { 
              printerId: printer.id, 
              status: 'online' 
            });
            
            log.info(`Printer ${printer.name} came back online`);
          } else if (!isAvailable && printer.status === 'online') {
            // Printer went offline
            printer.status = 'offline';
            printer.updatedAt = now.toISOString();
            this.printers.set(printer.id, printer);
            
            this.emit('printer-status-changed', { 
              printerId: printer.id, 
              status: 'offline' 
            });
            
            log.warn(`Printer ${printer.name} went offline`);
          }
          
          // Update backend with status if connected
          try {
            await this.apiService.updatePrinterStatus(printer.id, printer.status);
          } catch (error) {
            log.debug(`Failed to sync printer status with backend:`, error);
          }
        } catch (error) {
          log.debug(`Failed to check printer ${printer.name} status:`, error);
        }
      }
    } catch (error) {
      log.error('Error during printer status monitoring:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getTotalCount(): number {
    return this.printers.size;
  }

  getOnlineCount(): number {
    return Array.from(this.printers.values()).filter(p => p.status === 'online').length;
  }

  getOfflineCount(): number {
    return Array.from(this.printers.values()).filter(p => p.status === 'offline').length;
  }

  getErrorCount(): number {
    return Array.from(this.printers.values()).filter(p => p.status === 'error').length;
  }
}