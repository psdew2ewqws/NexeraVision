// Advanced Webany Thermal Printer Service - 2025 Edition
// Inspired by cutting-edge GitHub solutions for direct browser printing

interface WebanyPrinter {
  device?: any;
  interface?: any;
  endpoint?: any;
  connected: boolean;
  status: 'ready' | 'busy' | 'error' | 'offline';
  lastError?: string;
}

export class AdvancedWebanyPrinterService {
  private printer: WebanyPrinter = { connected: false, status: 'offline' };
  private eventListeners: Map<string, Function[]> = new Map();

  // ESC/POS Command Constants (Enhanced for 2025)
  private readonly commands = {
    INIT: new Uint8Array([0x1B, 0x40]),
    CUT: new Uint8Array([0x1D, 0x56, 0x00]),
    PARTIAL_CUT: new Uint8Array([0x1D, 0x56, 0x01]),
    DRAWER: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]),
    
    // Text formatting
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
    UNDERLINE_ON: new Uint8Array([0x1B, 0x2D, 0x01]),
    UNDERLINE_OFF: new Uint8Array([0x1B, 0x2D, 0x00]),
    
    // Size
    SIZE_NORMAL: new Uint8Array([0x1D, 0x21, 0x00]),
    SIZE_DOUBLE: new Uint8Array([0x1D, 0x21, 0x11]),
    SIZE_WIDE: new Uint8Array([0x1D, 0x21, 0x10]),
    SIZE_TALL: new Uint8Array([0x1D, 0x21, 0x01]),
    
    // Alignment
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
    
    // Line feed
    LF: new Uint8Array([0x0A]),
    FF: new Uint8Array([0x0C]),
    
    // Advanced 2025 features
    QR_MODEL: new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    QR_SIZE: new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08]), // Size 8 for 2025
    QR_ERROR: new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]),
    
    // Status queries
    PRINTER_STATUS: new Uint8Array([0x10, 0x04, 0x01]),
    PAPER_STATUS: new Uint8Array([0x10, 0x04, 0x04]),
  };

  // Check if Webany is supported (2025 browser compatibility)
  public isSupported(): boolean {
    return 'usb' in navigator && 'requestDevice' in (navigator as any).usb;
  }

  // Connect to printer with advanced device filtering
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Webany is not supported in this browser');
    }

    try {
      // Advanced filter for 2025 thermal printers
      const filters = [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0519 }, // Star Micronics  
        { vendorId: 0x20d1 }, // Bixolon
        { vendorId: 0x0416 }, // Citizen
        { vendorId: 0x0fe6 }, // ICS Advent (Ithaca)
        { vendorId: 0x154f }, // HPRT
        { vendorId: 0x1659 }, // Prolific (common any-to-Serial)
        { vendorId: 0x1a86 }, // QinHeng Electronics (CH340 chips)
        { classCode: 7 },     // Printer class
        { classCode: 3 }      // HID class (some thermal printers)
      ];

      this.printer.device = await (navigator as any).usb.requestDevice({ filters });
      
      await this.printer.device.open();
      
      // Enhanced interface claiming for 2025
      if (this.printer.device.configuration === null) {
        await this.printer.device.selectConfiguration(1);
      }

      // Find the best interface (usually interface 0 for thermal printers)
      this.printer.interface = this.printer.device.configuration?.interfaces.find(
        iface => iface.alternates[0].interfaceClass === 7 || // Printer class
                 iface.alternates[0].interfaceClass === 3    // HID class
      ) || this.printer.device.configuration?.interfaces[0];

      if (!this.printer.interface) {
        throw new Error('No suitable interface found');
      }

      await this.printer.device.claimInterface(this.printer.interface.interfaceNumber);

      // Find OUT endpoint
      this.printer.endpoint = this.printer.interface.alternates[0].endpoints.find(
        ep => ep.direction === 'out' && ep.type === 'bulk'
      );

      if (!this.printer.endpoint) {
        throw new Error('No OUT endpoint found');
      }

      this.printer.connected = true;
      this.printer.status = 'ready';
      
      // Initialize printer with advanced settings
      await this.sendRawData(this.commands.INIT);
      
      this.emit('connected', { device: this.printer.device });
      
      // Start status monitoring
      this.startStatusMonitoring();
      
      return true;
    } catch (error) {
      this.printer.connected = false;
      this.printer.status = 'error';
      this.printer.lastError = error.message;
      this.emit('error', error);
      throw error;
    }
  }

  // Advanced status monitoring with real-time updates
  private async startStatusMonitoring(): Promise<void> {
    if (!this.printer.connected) return;

    const checkStatus = async () => {
      try {
        const status = await this.queryPrinterStatus();
        this.emit('statusUpdate', status);
        
        // Schedule next check
        if (this.printer.connected) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        }
      } catch (error) {
        console.warn('Status check failed:', error);
        // Continue monitoring even if status check fails
        if (this.printer.connected) {
          setTimeout(checkStatus, 10000); // Retry in 10 seconds
        }
      }
    };

    // Start monitoring
    setTimeout(checkStatus, 1000);
  }

  // Query printer status (2025 enhanced)
  private async queryPrinterStatus(): Promise<any> {
    if (!this.printer.device || !this.printer.endpoint) {
      throw new Error('Printer not connected');
    }

    try {
      // Send status query
      await this.sendRawData(this.commands.PRINTER_STATUS);
      
      // Try to read response (not all printers support this)
      const inEndpoint = this.printer.interface?.alternates[0].endpoints.find(
        ep => ep.direction === 'in'
      );

      if (inEndpoint) {
        const result = await this.printer.device.transferIn(inEndpoint.endpointNumber, 64);
        return this.parseStatusResponse(result.data);
      }

      return { status: 'online', paperLevel: 'unknown' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Parse status response
  private parseStatusResponse(data?: DataView): any {
    if (!data || data.byteLength === 0) {
      return { status: 'online', paperLevel: 'unknown' };
    }

    const statusByte = data.getUint8(0);
    
    return {
      status: statusByte & 0x08 ? 'error' : 'online',
      paperOut: !!(statusByte & 0x20),
      paperNearEnd: !!(statusByte & 0x60),
      coverOpen: !!(statusByte & 0x04),
      cutterError: !!(statusByte & 0x08),
      paperLevel: statusByte & 0x20 ? 'empty' : 
                  statusByte & 0x60 ? 'low' : 'normal'
    };
  }

  // Send raw data to printer
  private async sendRawData(data: Uint8Array): Promise<void> {
    if (!this.printer.device || !this.printer.endpoint) {
      throw new Error('Printer not connected');
    }

    try {
      this.printer.status = 'busy';
      await this.printer.device.transferOut(this.printer.endpoint.endpointNumber, data);
      this.printer.status = 'ready';
    } catch (error) {
      this.printer.status = 'error';
      this.printer.lastError = error.message;
      throw error;
    }
  }

  // Advanced receipt printing with React component support
  public async printReceipt(receiptData: any): Promise<boolean> {
    const buffer = await this.buildAdvancedReceipt(receiptData);
    await this.sendRawData(buffer);
    return true;
  }

  // Build advanced receipt with 2025 features
  private async buildAdvancedReceipt(data: any): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    // Initialize
    chunks.push(this.commands.INIT);
    
    // Header with logo support
    if (data.logo) {
      chunks.push(await this.processImage(data.logo));
    }
    
    chunks.push(this.commands.ALIGN_CENTER);
    chunks.push(this.commands.SIZE_DOUBLE);
    chunks.push(this.commands.BOLD_ON);
    chunks.push(this.textToBytes(data.restaurantName || 'Restaurant'));
    chunks.push(this.commands.LF);
    chunks.push(this.commands.BOLD_OFF);
    chunks.push(this.commands.SIZE_NORMAL);
    chunks.push(this.commands.ALIGN_LEFT);
    
    // Order details
    chunks.push(this.textToBytes('================================'));
    chunks.push(this.commands.LF);
    chunks.push(this.commands.BOLD_ON);
    chunks.push(this.textToBytes(`Order #${data.id}`));
    chunks.push(this.commands.LF);
    chunks.push(this.commands.BOLD_OFF);
    chunks.push(this.textToBytes(`Date: ${new Date().toLocaleString()}`));
    chunks.push(this.commands.LF);
    chunks.push(this.textToBytes(`Customer: ${data.customerName || 'Walk-in'}`));
    chunks.push(this.commands.LF);
    chunks.push(this.textToBytes('--------------------------------'));
    chunks.push(this.commands.LF);
    
    // Items with enhanced formatting
    for (const item of data.items || []) {
      chunks.push(this.commands.BOLD_ON);
      chunks.push(this.textToBytes(`${item.quantity}x ${item.name}`));
      chunks.push(this.commands.LF);
      chunks.push(this.commands.BOLD_OFF);
      
      if (item.price) {
        chunks.push(this.commands.ALIGN_RIGHT);
        chunks.push(this.textToBytes(`${item.price.toFixed(2)} JOD`));
        chunks.push(this.commands.LF);
        chunks.push(this.commands.ALIGN_LEFT);
      }
      
      // Modifiers
      for (const modifier of item.modifiers || []) {
        chunks.push(this.textToBytes(`  + ${modifier.name}`));
        if (modifier.price) {
          chunks.push(this.textToBytes(` (+${modifier.price.toFixed(2)})`));
        }
        chunks.push(this.commands.LF);
      }
      chunks.push(this.commands.LF);
    }
    
    // Totals
    chunks.push(this.textToBytes('--------------------------------'));
    chunks.push(this.commands.LF);
    
    if (data.subtotal) {
      chunks.push(this.commands.ALIGN_RIGHT);
      chunks.push(this.textToBytes(`Subtotal: ${data.subtotal.toFixed(2)} JOD`));
      chunks.push(this.commands.LF);
    }
    
    if (data.tax) {
      chunks.push(this.textToBytes(`Tax: ${data.tax.toFixed(2)} JOD`));
      chunks.push(this.commands.LF);
    }
    
    if (data.total) {
      chunks.push(this.commands.BOLD_ON);
      chunks.push(this.commands.SIZE_WIDE);
      chunks.push(this.textToBytes(`TOTAL: ${data.total.toFixed(2)} JOD`));
      chunks.push(this.commands.LF);
      chunks.push(this.commands.BOLD_OFF);
      chunks.push(this.commands.SIZE_NORMAL);
    }
    
    chunks.push(this.commands.ALIGN_CENTER);
    chunks.push(this.commands.LF);
    chunks.push(this.textToBytes('Thank you for your visit!'));
    chunks.push(this.commands.LF);
    
    // QR Code for digital receipt (2025 feature)
    if (data.qrCode) {
      chunks.push(this.commands.LF);
      chunks.push(await this.generateQRCode(data.qrCode));
      chunks.push(this.commands.LF);
    }
    
    chunks.push(this.commands.LF);
    chunks.push(this.commands.CUT);
    
    return this.combineUint8Arrays(chunks);
  }

  // Generate QR code (enhanced for 2025)
  private async generateQRCode(data: string): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    chunks.push(this.commands.QR_MODEL);
    chunks.push(this.commands.QR_SIZE);
    chunks.push(this.commands.QR_ERROR);
    
    // Store QR data
    const dataBytes = new TextEncoder().encode(data);
    const storeCommand = new Uint8Array([
      0x1D, 0x28, 0x6B,
      (dataBytes.length + 3) & 0xFF,
      ((dataBytes.length + 3) >> 8) & 0xFF,
      0x31, 0x50, 0x30,
      ...dataBytes
    ]);
    
    chunks.push(storeCommand);
    
    // Print QR code
    chunks.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));
    
    return this.combineUint8Arrays(chunks);
  }

  // Process image for printing (placeholder for 2025 image processing)
  private async processImage(imageData: string | ArrayBuffer): Promise<Uint8Array> {
    // Advanced image processing would go here
    // For now, return empty array
    return new Uint8Array(0);
  }

  // Convert text to bytes
  private textToBytes(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }

  // Combine multiple Uint8Arrays
  private combineUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    
    return result;
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Disconnect
  public async disconnect(): Promise<void> {
    if (this.printer.device && this.printer.connected) {
      try {
        await this.printer.device.close();
      } catch (error) {
        console.warn('Error closing device:', error);
      }
    }
    
    this.printer.connected = false;
    this.printer.status = 'offline';
    this.printer.device = undefined;
    this.printer.interface = undefined;
    this.printer.endpoint = undefined;
    
    this.emit('disconnected');
  }

  // Get printer status
  public getStatus(): WebanyPrinter {
    return { ...this.printer };
  }
}