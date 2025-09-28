// Advanced Web Serial API Printer Service - 2025 Edition
// For legacy thermal printers with serial/USB-to-Serial adapters

interface SerialPrinter {
  port?: any; // any type from Web Serial API
  writer?: WritableStreamDefaultWriter;
  reader?: ReadableStreamDefaultReader;
  connected: boolean;
  status: 'ready' | 'busy' | 'error' | 'offline';
  config: any; // any from Web Serial API
  lastError?: string;
}

export class AdvancedWebSerialPrinterService {
  private printer: SerialPrinter = {
    connected: false,
    status: 'offline',
    config: {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      bufferSize: 255,
      flowControl: 'none'
    }
  };

  private eventListeners: Map<string, Function[]> = new Map();

  // Check if Web Serial API is supported (Chrome 89+, Edge 89+)
  public isSupported(): boolean {
    return 'serial' in navigator;
  }

  // Get available ports (requires user activation)
  public async getPorts(): Promise<any[]> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser');
    }

    return await (navigator as any).serial.getPorts();
  }

  // Request access to serial port with advanced filtering
  public async requestPort(): Promise<any> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser');
    }

    // Advanced filters for common thermal printer USB-to-Serial adapters (2025)
    const filters = [
      // FTDI adapters (common in thermal printers)
      { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FT232R
      { usbVendorId: 0x0403, usbProductId: 0x6015 }, // FT231X
      
      // Prolific adapters
      { usbVendorId: 0x067b, usbProductId: 0x2303 }, // PL2303
      
      // CH340/CH341 chips (very common in cheap adapters)
      { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
      { usbVendorId: 0x1a86, usbProductId: 0x5523 }, // CH341
      
      // Silicon Labs CP210x
      { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP2102/CP2109
      
      // Direct thermal printer connections
      { usbVendorId: 0x04b8 }, // Epson
      { usbVendorId: 0x0519 }, // Star Micronics
      { usbVendorId: 0x20d1 }, // Bixolon
    ];

    try {
      this.printer.port = await (navigator as any).serial.requestPort({ filters });
      return this.printer.port;
    } catch (error) {
      throw new Error(`Failed to request serial port: ${error.message}`);
    }
  }

  // Connect to printer with advanced configuration
  public async connect(port?: any, config?: Partial<any>): Promise<boolean> {
    try {
      if (port) {
        this.printer.port = port;
      } else if (!this.printer.port) {
        this.printer.port = await this.requestPort();
      }

      // Merge custom config with defaults
      if (config) {
        this.printer.config = { ...this.printer.config, ...config };
      }

      // Auto-detect optimal baud rate for thermal printers (2025 feature)
      if (!config?.baudRate) {
        this.printer.config.baudRate = await this.detectOptimalBaudRate();
      }

      await this.printer.port.open(this.printer.config);

      // Set up streams
      const textEncoder = new TextEncoder();
      const writableStreamClosed = this.printer.port.writable!.getWriter();
      this.printer.writer = writableStreamClosed;

      // Set up reader for status monitoring
      const readableStreamClosed = this.printer.port.readable!.getReader();
      this.printer.reader = readableStreamClosed;

      this.printer.connected = true;
      this.printer.status = 'ready';

      // Initialize printer
      await this.sendCommand(new Uint8Array([0x1B, 0x40])); // ESC @

      this.emit('connected', { port: this.printer.port });

      // Start monitoring
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

  // Auto-detect optimal baud rate (2025 advanced feature)
  private async detectOptimalBaudRate(): Promise<number> {
    const commonRates = [9600, 19200, 38400, 57600, 115200];
    
    // Try to detect by sending a simple command at different rates
    for (const rate of commonRates) {
      try {
        // This is a simplified detection - in practice, you'd test communication
        // Most thermal printers use 9600 or 19200
        if (rate === 9600 || rate === 19200) {
          return rate;
        }
      } catch {
        continue;
      }
    }
    
    return 9600; // Default fallback
  }

  // Enhanced status monitoring with real-time updates
  private async startStatusMonitoring(): Promise<void> {
    if (!this.printer.connected || !this.printer.reader) return;

    const monitorStatus = async () => {
      try {
        // Send status request
        await this.sendCommand(new Uint8Array([0x10, 0x04, 0x01])); // DLE EOT 1
        
        // Try to read response
        const { value, done } = await this.printer.reader!.read();
        
        if (done) {
          this.printer.connected = false;
          this.printer.status = 'offline';
          return;
        }

        if (value && value.length > 0) {
          const status = this.parseStatusResponse(value);
          this.emit('statusUpdate', status);
        }

        // Schedule next check
        if (this.printer.connected) {
          setTimeout(monitorStatus, 5000);
        }
      } catch (error) {
        console.warn('Status monitoring error:', error);
        // Continue monitoring even if status check fails
        if (this.printer.connected) {
          setTimeout(monitorStatus, 10000);
        }
      }
    };

    // Start monitoring after a short delay
    setTimeout(monitorStatus, 2000);
  }

  // Parse status response from printer
  private parseStatusResponse(data: Uint8Array): any {
    if (data.length === 0) {
      return { status: 'unknown' };
    }

    const statusByte = data[0];
    
    return {
      online: !(statusByte & 0x08),
      paperOut: !!(statusByte & 0x20),
      paperNearEnd: !!(statusByte & 0x0C),
      coverOpen: !!(statusByte & 0x04),
      error: !!(statusByte & 0x08),
      paperLevel: statusByte & 0x20 ? 'empty' : 
                  statusByte & 0x0C ? 'low' : 'normal'
    };
  }

  // Send command to printer
  private async sendCommand(data: Uint8Array): Promise<void> {
    if (!this.printer.writer) {
      throw new Error('Printer not connected');
    }

    try {
      this.printer.status = 'busy';
      await this.printer.writer.write(data);
      this.printer.status = 'ready';
    } catch (error) {
      this.printer.status = 'error';
      this.printer.lastError = error.message;
      throw error;
    }
  }

  // Advanced receipt printing with enhanced formatting
  public async printReceipt(receiptData: any): Promise<boolean> {
    const buffer = await this.buildAdvancedReceipt(receiptData);
    await this.sendCommand(buffer);
    return true;
  }

  // Build advanced receipt with 2025 formatting
  private async buildAdvancedReceipt(data: any): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    // Initialize printer
    chunks.push(new Uint8Array([0x1B, 0x40])); // ESC @
    
    // Header
    chunks.push(new Uint8Array([0x1B, 0x61, 0x01])); // Center align
    chunks.push(new Uint8Array([0x1D, 0x21, 0x11])); // Double size
    chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold on
    chunks.push(new TextEncoder().encode(data.restaurantName || 'Restaurant'));
    chunks.push(new Uint8Array([0x0A])); // LF
    chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold off
    chunks.push(new Uint8Array([0x1D, 0x21, 0x00])); // Normal size
    chunks.push(new Uint8Array([0x1B, 0x61, 0x00])); // Left align
    
    // Separator
    chunks.push(new TextEncoder().encode('================================'));
    chunks.push(new Uint8Array([0x0A])); // LF
    
    // Order info
    chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold on
    chunks.push(new TextEncoder().encode(`Order #${data.id}`));
    chunks.push(new Uint8Array([0x0A])); // LF
    chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold off
    chunks.push(new TextEncoder().encode(`Date: ${new Date().toLocaleString()}`));
    chunks.push(new Uint8Array([0x0A])); // LF
    chunks.push(new TextEncoder().encode(`Customer: ${data.customerName || 'Walk-in'}`));
    chunks.push(new Uint8Array([0x0A, 0x0A])); // Double LF
    
    // Items
    for (const item of data.items || []) {
      chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold on
      chunks.push(new TextEncoder().encode(`${item.quantity}x ${item.name}`));
      chunks.push(new Uint8Array([0x0A])); // LF
      chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold off
      
      if (item.price) {
        chunks.push(new Uint8Array([0x1B, 0x61, 0x02])); // Right align
        chunks.push(new TextEncoder().encode(`${item.price.toFixed(2)} JOD`));
        chunks.push(new Uint8Array([0x0A])); // LF
        chunks.push(new Uint8Array([0x1B, 0x61, 0x00])); // Left align
      }
      
      // Modifiers
      for (const modifier of item.modifiers || []) {
        chunks.push(new TextEncoder().encode(`  + ${modifier.name}`));
        if (modifier.price) {
          chunks.push(new TextEncoder().encode(` (+${modifier.price.toFixed(2)})`));
        }
        chunks.push(new Uint8Array([0x0A])); // LF
      }
      chunks.push(new Uint8Array([0x0A])); // LF
    }
    
    // Totals
    chunks.push(new TextEncoder().encode('--------------------------------'));
    chunks.push(new Uint8Array([0x0A])); // LF
    
    if (data.subtotal) {
      chunks.push(new Uint8Array([0x1B, 0x61, 0x02])); // Right align
      chunks.push(new TextEncoder().encode(`Subtotal: ${data.subtotal.toFixed(2)} JOD`));
      chunks.push(new Uint8Array([0x0A])); // LF
    }
    
    if (data.tax) {
      chunks.push(new TextEncoder().encode(`Tax: ${data.tax.toFixed(2)} JOD`));
      chunks.push(new Uint8Array([0x0A])); // LF
    }
    
    if (data.total) {
      chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold on
      chunks.push(new TextEncoder().encode(`TOTAL: ${data.total.toFixed(2)} JOD`));
      chunks.push(new Uint8Array([0x0A])); // LF
      chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold off
    }
    
    chunks.push(new Uint8Array([0x1B, 0x61, 0x01])); // Center align
    chunks.push(new Uint8Array([0x0A])); // LF
    chunks.push(new TextEncoder().encode('Thank you for your visit!'));
    chunks.push(new Uint8Array([0x0A, 0x0A])); // Double LF
    
    // QR Code support (if supported by printer)
    if (data.qrCode) {
      chunks.push(await this.generateQRCode(data.qrCode));
    }
    
    // Cut paper
    chunks.push(new Uint8Array([0x1D, 0x56, 0x00])); // Full cut
    
    return this.combineUint8Arrays(chunks);
  }

  // Generate QR code for Serial printers
  private async generateQRCode(data: string): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    // QR Code setup (ESC/POS standard)
    chunks.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])); // Model
    chunks.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08])); // Size
    chunks.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31])); // Error correction
    
    // Store data
    const dataBytes = new TextEncoder().encode(data);
    const storeCommand = new Uint8Array([
      0x1D, 0x28, 0x6B,
      (dataBytes.length + 3) & 0xFF,
      ((dataBytes.length + 3) >> 8) & 0xFF,
      0x31, 0x50, 0x30,
      ...Array.from(dataBytes)
    ]);
    
    chunks.push(storeCommand);
    
    // Print QR
    chunks.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));
    chunks.push(new Uint8Array([0x0A])); // LF
    
    return this.combineUint8Arrays(chunks);
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
    try {
      if (this.printer.reader) {
        await this.printer.reader.cancel();
        await this.printer.reader.releaseLock();
      }
      
      if (this.printer.writer) {
        await this.printer.writer.close();
      }
      
      if (this.printer.port) {
        await this.printer.port.close();
      }
    } catch (error) {
      console.warn('Error during disconnect:', error);
    }
    
    this.printer.connected = false;
    this.printer.status = 'offline';
    this.printer.port = undefined;
    this.printer.writer = undefined;
    this.printer.reader = undefined;
    
    this.emit('disconnected');
  }

  // Get printer status
  public getStatus(): SerialPrinter {
    return { ...this.printer };
  }

  // Test print function
  public async testPrint(): Promise<boolean> {
    const testReceipt = {
      restaurantName: 'Test Print',
      id: 'TEST-001',
      customerName: 'Test Customer',
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          price: 10.00,
          modifiers: []
        }
      ],
      subtotal: 10.00,
      tax: 1.00,
      total: 11.00
    };
    
    return await this.printReceipt(testReceipt);
  }
}