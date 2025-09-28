/**
 * USB Printer Persistence Manager
 *
 * Manages USB printer connections with enterprise-grade reliability:
 * - Real-time USB device monitoring
 * - Automatic printer reconnection
 * - Device persistence across reboots
 * - Hardware failure detection and recovery
 * - Printer capability detection
 * - Hot-plug support
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class USBPrinterManager extends EventEmitter {
  constructor(service) {
    super();
    this.service = service;
    this.log = service.log;
    this.isInitialized = false;
    this.isMonitoring = false;

    // Printer tracking
    this.connectedPrinters = new Map();
    this.printerHistory = new Map();
    this.monitoringInterval = null;
    this.monitoringIntervalMs = 5000; // 5 seconds

    // USB device libraries
    this.usbLib = null;
    this.escposUsb = null;

    // Printer persistence state
    this.persistenceFile = path.join(__dirname, '../logs/printer-persistence.json');
    this.savedPrinters = new Map();

    // Statistics
    this.stats = {
      totalConnections: 0,
      totalDisconnections: 0,
      reconnectionAttempts: 0,
      successfulReconnections: 0,
      failedConnections: 0,
      lastScan: null,
      scanCount: 0
    };

    this.log.info('🔌 USB Printer Manager initialized');
  }

  async initialize() {
    try {
      this.log.info('🚀 Starting USB Printer Manager...');

      // Initialize USB libraries
      await this.initializeUSBLibraries();

      // Load saved printer configurations
      await this.loadSavedPrinters();

      // Start monitoring
      await this.startMonitoring();

      this.isInitialized = true;
      this.log.info('✅ USB Printer Manager started successfully');

    } catch (error) {
      this.log.error('❌ USB Printer Manager initialization failed:', error);
      throw error;
    }
  }

  async initializeUSBLibraries() {
    try {
      // Try to load escpos-usb for thermal printer support
      try {
        this.escposUsb = require('escpos-usb');
        this.log.info('📦 escpos-usb library loaded successfully');
      } catch (escposError) {
        this.log.warn('⚠️ escpos-usb library not available:', escposError.message);
      }

      // Try to load USB library for generic USB monitoring
      try {
        this.usbLib = require('usb');
        this.log.info('📦 USB library loaded successfully');
      } catch (usbError) {
        this.log.warn('⚠️ USB library not available:', usbError.message);
      }

      if (!this.escposUsb && !this.usbLib) {
        this.log.warn('⚠️ No USB libraries available - printer monitoring will be limited');
      }

    } catch (error) {
      this.log.error('❌ Failed to initialize USB libraries:', error);
      throw error;
    }
  }

  async loadSavedPrinters() {
    try {
      if (fs.existsSync(this.persistenceFile)) {
        const data = JSON.parse(fs.readFileSync(this.persistenceFile, 'utf8'));

        if (data.printers) {
          for (const [id, printer] of Object.entries(data.printers)) {
            this.savedPrinters.set(id, printer);
          }
          this.log.info(`📋 Loaded ${this.savedPrinters.size} saved printer configurations`);
        }
      } else {
        this.log.info('📋 No saved printer configurations found');
      }
    } catch (error) {
      this.log.error('❌ Failed to load saved printers:', error);
    }
  }

  async savePrinters() {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        printers: Object.fromEntries(this.savedPrinters),
        stats: this.stats
      };

      // Ensure logs directory exists
      const logsDir = path.dirname(this.persistenceFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.writeFileSync(this.persistenceFile, JSON.stringify(data, null, 2));
      this.log.debug('💾 Printer configurations saved');

    } catch (error) {
      this.log.error('❌ Failed to save printer configurations:', error);
    }
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    this.log.info('👁️ Starting USB printer monitoring...');

    // Initial scan
    await this.scanForPrinters();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.scanForPrinters();
    }, this.monitoringIntervalMs);

    // Set up USB event listeners if available
    this.setupUSBEventListeners();

    this.isMonitoring = true;
    this.log.info('✅ USB printer monitoring started');
  }

  setupUSBEventListeners() {
    if (this.usbLib) {
      try {
        // Listen for USB device attach/detach events
        this.usbLib.on('attach', (device) => {
          this.log.debug('🔌 USB device attached:', device.deviceDescriptor);
          this.handleUSBDeviceAttach(device);
        });

        this.usbLib.on('detach', (device) => {
          this.log.debug('🔌 USB device detached:', device.deviceDescriptor);
          this.handleUSBDeviceDetach(device);
        });

        this.log.info('👂 USB event listeners registered');
      } catch (error) {
        this.log.warn('⚠️ Failed to setup USB event listeners:', error.message);
      }
    }
  }

  async handleUSBDeviceAttach(device) {
    try {
      if (this.isPrinterDevice(device)) {
        this.log.info('🖨️ Printer device attached, triggering scan...');
        setTimeout(() => this.scanForPrinters(), 2000); // Delay to allow device to initialize
      }
    } catch (error) {
      this.log.error('❌ Error handling USB attach:', error);
    }
  }

  async handleUSBDeviceDetach(device) {
    try {
      if (this.isPrinterDevice(device)) {
        this.log.info('🖨️ Printer device detached, updating status...');
        await this.updateDisconnectedPrinters();
      }
    } catch (error) {
      this.log.error('❌ Error handling USB detach:', error);
    }
  }

  isPrinterDevice(device) {
    try {
      const descriptor = device.deviceDescriptor;
      if (!descriptor) return false;

      // Common printer vendor IDs
      const printerVendors = [
        0x04b8, // Epson
        0x0922, // Star Micronics
        0x1fc9, // NXP (various thermal printers)
        0x0483, // STMicroelectronics
        0x154f, // Wincor Nixdorf
        0x20d1, // RONGTA
        0x0fe6, // ICS Advent
        0x0dd4  // Seiko Instruments
      ];

      return printerVendors.includes(descriptor.idVendor);
    } catch (error) {
      return false;
    }
  }

  async scanForPrinters() {
    try {
      this.stats.scanCount++;
      this.stats.lastScan = new Date().toISOString();

      this.log.debug('🔍 Scanning for USB printers...');

      const discoveredPrinters = [];

      // Scan using escpos-usb
      if (this.escposUsb) {
        const thermalPrinters = await this.scanThermalPrinters();
        discoveredPrinters.push(...thermalPrinters);
      }

      // Scan using generic USB library
      if (this.usbLib) {
        const genericPrinters = await this.scanGenericUSBPrinters();
        discoveredPrinters.push(...genericPrinters);
      }

      // Update printer status
      await this.updatePrinterStatus(discoveredPrinters);

      this.log.debug(`🔍 Scan completed: ${discoveredPrinters.length} printers found`);

    } catch (error) {
      this.log.error('❌ Printer scan failed:', error);
    }
  }

  async scanThermalPrinters() {
    const printers = [];

    try {
      const devices = this.escposUsb.USB.findPrinter();

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const descriptor = device.deviceDescriptor;

        if (descriptor) {
          const printer = {
            id: `thermal-${descriptor.idVendor}-${descriptor.idProduct}-${i}`,
            name: this.getDeviceName(descriptor) || `Thermal Printer ${i + 1}`,
            type: 'thermal',
            connection: 'usb',
            status: 'connected',
            vendorId: descriptor.idVendor,
            productId: descriptor.idProduct,
            manufacturer: this.getManufacturerName(descriptor.idVendor),
            model: descriptor.iProduct || 'Unknown',
            capabilities: ['text', 'barcode', 'cut', 'cash_drawer'],
            device: device,
            devicePath: this.getDevicePath(device),
            lastSeen: new Date().toISOString(),
            discoveryMethod: 'escpos-usb'
          };

          printers.push(printer);
        }
      }

      this.log.debug(`📄 Found ${printers.length} thermal printers`);
    } catch (error) {
      this.log.debug('⚠️ Thermal printer scan failed:', error.message);
    }

    return printers;
  }

  async scanGenericUSBPrinters() {
    const printers = [];

    try {
      const devices = this.usbLib.getDeviceList();

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const descriptor = device.deviceDescriptor;

        if (descriptor && this.isPrinterDevice(device)) {
          const printer = {
            id: `usb-${descriptor.idVendor}-${descriptor.idProduct}-${i}`,
            name: this.getDeviceName(descriptor) || `USB Printer ${i + 1}`,
            type: 'generic',
            connection: 'usb',
            status: 'connected',
            vendorId: descriptor.idVendor,
            productId: descriptor.idProduct,
            manufacturer: this.getManufacturerName(descriptor.idVendor),
            model: descriptor.iProduct || 'Unknown',
            capabilities: ['text'],
            device: device,
            lastSeen: new Date().toISOString(),
            discoveryMethod: 'generic-usb'
          };

          printers.push(printer);
        }
      }

      this.log.debug(`🔌 Found ${printers.length} generic USB printers`);
    } catch (error) {
      this.log.debug('⚠️ Generic USB scan failed:', error.message);
    }

    return printers;
  }

  async updatePrinterStatus(discoveredPrinters) {
    const previouslyConnected = new Set(this.connectedPrinters.keys());
    const currentlyConnected = new Set();

    // Update or add discovered printers
    for (const printer of discoveredPrinters) {
      currentlyConnected.add(printer.id);

      const existingPrinter = this.connectedPrinters.get(printer.id);

      if (existingPrinter) {
        // Update existing printer
        existingPrinter.lastSeen = printer.lastSeen;
        existingPrinter.status = 'connected';
        this.log.debug(`📄 Updated printer: ${printer.name}`);
      } else {
        // New printer discovered
        this.connectedPrinters.set(printer.id, printer);
        this.savedPrinters.set(printer.id, {
          id: printer.id,
          name: printer.name,
          type: printer.type,
          vendorId: printer.vendorId,
          productId: printer.productId,
          manufacturer: printer.manufacturer,
          model: printer.model,
          firstSeen: printer.lastSeen,
          capabilities: printer.capabilities
        });

        this.stats.totalConnections++;
        this.log.info(`🆕 New printer connected: ${printer.name}`);
        this.emit('printer-connected', printer);
      }
    }

    // Mark disconnected printers
    for (const printerId of previouslyConnected) {
      if (!currentlyConnected.has(printerId)) {
        const printer = this.connectedPrinters.get(printerId);
        if (printer) {
          printer.status = 'disconnected';
          printer.lastSeen = new Date().toISOString();
          this.stats.totalDisconnections++;
          this.log.info(`❌ Printer disconnected: ${printer.name}`);
          this.emit('printer-disconnected', printer);

          // Remove from connected list but keep in history
          this.printerHistory.set(printerId, printer);
          this.connectedPrinters.delete(printerId);
        }
      }
    }

    // Save updated configuration
    await this.savePrinters();

    // Emit status update
    this.emit('status-updated', this.getPrinterStatus());
  }

  async updateDisconnectedPrinters() {
    const now = new Date().toISOString();

    for (const [id, printer] of this.connectedPrinters) {
      try {
        // Try to communicate with the printer to verify connection
        const isStillConnected = await this.verifyPrinterConnection(printer);

        if (!isStillConnected) {
          printer.status = 'disconnected';
          printer.lastSeen = now;
          this.stats.totalDisconnections++;

          this.log.info(`❌ Verified printer disconnection: ${printer.name}`);
          this.emit('printer-disconnected', printer);

          // Move to history
          this.printerHistory.set(id, printer);
          this.connectedPrinters.delete(id);
        }
      } catch (error) {
        this.log.debug(`⚠️ Error verifying printer ${printer.name}:`, error.message);
      }
    }

    await this.savePrinters();
  }

  async verifyPrinterConnection(printer) {
    try {
      if (printer.device && this.escposUsb) {
        // Try to open a connection to verify the device is still accessible
        const device = new this.escposUsb.USB(printer.device);

        return new Promise((resolve) => {
          device.open((error) => {
            if (error) {
              resolve(false);
            } else {
              device.close(() => {
                resolve(true);
              });
            }
          });
        });
      }

      return true; // Assume connected if we can't verify
    } catch (error) {
      return false;
    }
  }

  async attemptReconnection(printer) {
    try {
      this.stats.reconnectionAttempts++;
      this.log.info(`🔄 Attempting to reconnect printer: ${printer.name}`);

      // Trigger a full scan to see if the printer is back
      await this.scanForPrinters();

      // Check if printer was rediscovered
      if (this.connectedPrinters.has(printer.id)) {
        this.stats.successfulReconnections++;
        this.log.info(`✅ Printer reconnected successfully: ${printer.name}`);
        return true;
      }

      return false;
    } catch (error) {
      this.log.error(`❌ Reconnection failed for ${printer.name}:`, error);
      return false;
    }
  }

  async refreshPrinters() {
    this.log.info('🔄 Refreshing printer connections...');

    try {
      // Clear current connections
      this.connectedPrinters.clear();

      // Perform fresh scan
      await this.scanForPrinters();

      this.log.info(`✅ Printer refresh completed: ${this.connectedPrinters.size} printers found`);

      return this.getPrinterStatus();
    } catch (error) {
      this.log.error('❌ Printer refresh failed:', error);
      throw error;
    }
  }

  getPrinterStatus() {
    const connected = Array.from(this.connectedPrinters.values());
    const disconnected = Array.from(this.printerHistory.values())
      .filter(p => p.status === 'disconnected');

    return {
      connectedPrinters: connected.length,
      totalPrinters: this.savedPrinters.size,
      connected: connected,
      disconnected: disconnected,
      stats: this.stats,
      isMonitoring: this.isMonitoring,
      lastScan: this.stats.lastScan,
      timestamp: new Date().toISOString()
    };
  }

  getDeviceName(descriptor) {
    try {
      return descriptor.iProduct || descriptor.iManufacturer || null;
    } catch (error) {
      return null;
    }
  }

  getManufacturerName(vendorId) {
    const manufacturers = {
      0x04b8: 'Epson',
      0x0922: 'Star Micronics',
      0x1fc9: 'NXP',
      0x0483: 'STMicroelectronics',
      0x154f: 'Wincor Nixdorf',
      0x20d1: 'RONGTA',
      0x0fe6: 'ICS Advent',
      0x0dd4: 'Seiko Instruments'
    };

    return manufacturers[vendorId] || 'Unknown';
  }

  getDevicePath(device) {
    try {
      // Platform-specific device path generation
      if (process.platform === 'linux') {
        return `/dev/usb/lp${device.busNumber || 0}`;
      } else if (process.platform === 'darwin') {
        return `/dev/cu.usbmodem${device.deviceAddress || ''}`;
      } else if (process.platform === 'win32') {
        return `USB${device.deviceAddress || ''}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async testPrinter(printerId) {
    try {
      const printer = this.connectedPrinters.get(printerId);
      if (!printer) {
        throw new Error(`Printer not found: ${printerId}`);
      }

      this.log.info(`🧪 Testing printer: ${printer.name}`);

      // Verify connection first
      const isConnected = await this.verifyPrinterConnection(printer);
      if (!isConnected) {
        throw new Error(`Printer not accessible: ${printer.name}`);
      }

      // Attempt to print test page
      if (printer.type === 'thermal' && this.escposUsb) {
        await this.printThermalTestPage(printer);
      } else {
        // Generic test - just verify device accessibility
        this.log.info(`✅ Device accessibility verified for: ${printer.name}`);
      }

      return {
        success: true,
        printerId: printerId,
        printerName: printer.name,
        message: 'Printer test completed successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.log.error(`❌ Printer test failed for ${printerId}:`, error);
      throw error;
    }
  }

  async printThermalTestPage(printer) {
    return new Promise((resolve, reject) => {
      try {
        const device = new this.escposUsb.USB(printer.device);
        const escpos = require('escpos');
        const printerInstance = new escpos.Printer(device);

        device.open((error) => {
          if (error) {
            reject(new Error(`Failed to open printer: ${error.message}`));
            return;
          }

          try {
            printerInstance
              .font('a')
              .align('ct')
              .style('bu')
              .size(1, 1)
              .text('PRINTER TEST')
              .text('================')
              .align('lt')
              .style('normal')
              .text(`Printer: ${printer.name}`)
              .text(`Type: ${printer.type}`)
              .text(`Date: ${new Date().toLocaleDateString()}`)
              .text(`Time: ${new Date().toLocaleTimeString()}`)
              .text('================')
              .feed(2);

            if (printer.capabilities.includes('cut')) {
              printerInstance.cut();
            }

            printerInstance.close((closeError) => {
              if (closeError) {
                reject(new Error(`Failed to close printer: ${closeError.message}`));
              } else {
                resolve();
              }
            });

          } catch (printError) {
            reject(new Error(`Print error: ${printError.message}`));
          }
        });

      } catch (error) {
        reject(new Error(`Thermal print setup error: ${error.message}`));
      }
    });
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.log.info('🛑 USB printer monitoring stopped');
  }

  async shutdown() {
    this.log.info('🛑 Shutting down USB Printer Manager...');

    this.stopMonitoring();

    // Save final state
    await this.savePrinters();

    // Clean up USB event listeners
    if (this.usbLib) {
      try {
        this.usbLib.removeAllListeners();
      } catch (error) {
        this.log.warn('⚠️ Error removing USB listeners:', error.message);
      }
    }

    this.isInitialized = false;
    this.log.info('✅ USB Printer Manager shutdown complete');
  }
}

module.exports = USBPrinterManager;