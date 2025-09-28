/**
 * PrinterMaster Printer Detector
 * Phase 3: Enhanced Printer Detection Capabilities
 *
 * Features:
 * - System printer enumeration (Windows/Linux/Mac)
 * - USB printer discovery via escpos-usb
 * - Network printer scanning (IP ranges and common ports)
 * - Bluetooth printer discovery (if available)
 * - ESC/POS thermal printer detection
 * - Printer capability detection
 */

const EventEmitter = require('events');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const dgram = require('dgram');

const execAsync = promisify(exec);

class PrinterDetector extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      timeout: options.timeout || 5000,
      networkTimeout: options.networkTimeout || 2000,
      bluetoothTimeout: options.bluetoothTimeout || 10000,
      maxConcurrentScans: options.maxConcurrentScans || 10,
      ...options
    };

    // Dependency injection
    this.log = null;
  }

  /**
   * Initialize with dependencies
   */
  initialize(dependencies) {
    this.log = dependencies.log;
    this.log?.info('🔍 [PRINTER-DETECTOR] Initialized');
  }

  /**
   * Find all available printers using multiple detection methods
   */
  async findPrinters(options = {}) {
    const startTime = Date.now();
    this.log?.info('🚀 [PRINTER-DETECTOR] Starting comprehensive printer detection...');

    const allPrinters = [];
    const detectionPromises = [];

    // System printer discovery
    if (options.enableSystem !== false) {
      detectionPromises.push(
        this.discoverSystemPrinters()
          .then(printers => {
            this.log?.info(`📋 [SYSTEM] Found ${printers.length} system printers`);
            allPrinters.push(...printers);
          })
          .catch(error => {
            this.log?.error('❌ [SYSTEM] System printer discovery failed:', error.message);
          })
      );
    }

    // USB printer discovery
    if (options.enableUSB !== false) {
      detectionPromises.push(
        this.discoverUSBPrinters()
          .then(printers => {
            this.log?.info(`🔌 [USB] Found ${printers.length} USB printers`);
            allPrinters.push(...printers);
          })
          .catch(error => {
            this.log?.error('❌ [USB] USB printer discovery failed:', error.message);
          })
      );
    }

    // Network printer discovery
    if (options.enableNetwork !== false) {
      detectionPromises.push(
        this.discoverNetworkPrinters(options.networkScanRange, options.networkScanPorts)
          .then(printers => {
            this.log?.info(`🌐 [NETWORK] Found ${printers.length} network printers`);
            allPrinters.push(...printers);
          })
          .catch(error => {
            this.log?.error('❌ [NETWORK] Network printer discovery failed:', error.message);
          })
      );
    }

    // Bluetooth printer discovery
    if (options.enableBluetooth !== false) {
      detectionPromises.push(
        this.discoverBluetoothPrinters()
          .then(printers => {
            this.log?.info(`📶 [BLUETOOTH] Found ${printers.length} bluetooth printers`);
            allPrinters.push(...printers);
          })
          .catch(error => {
            this.log?.debug('⚠️ [BLUETOOTH] Bluetooth printer discovery failed:', error.message);
          })
      );
    }

    // Wait for all discovery methods to complete
    await Promise.allSettled(detectionPromises);

    // Remove duplicates and enhance printer information
    const uniquePrinters = this.removeDuplicates(allPrinters);
    const enhancedPrinters = await this.enhancePrinterInfo(uniquePrinters);

    const discoveryTime = Date.now() - startTime;
    this.log?.info(`✅ [PRINTER-DETECTOR] Detection completed: ${enhancedPrinters.length} unique printers found in ${discoveryTime}ms`);

    // Emit discovery event
    this.emit('discovery-completed', {
      printers: enhancedPrinters,
      duration: discoveryTime,
      methods: {
        system: options.enableSystem !== false,
        usb: options.enableUSB !== false,
        network: options.enableNetwork !== false,
        bluetooth: options.enableBluetooth !== false
      }
    });

    return enhancedPrinters;
  }

  /**
   * Discover system printers using OS-specific methods
   */
  async discoverSystemPrinters() {
    const printers = [];

    try {
      // Try Node.js printer library first
      try {
        const printer = require('printer');
        const systemPrinters = printer.getPrinters();

        for (const p of systemPrinters) {
          printers.push({
            id: `system-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: p.name,
            type: this.determinePrinterType(p.name, p.description),
            connection: this.determineConnectionType(p.portName),
            status: this.mapPrinterStatus(p.status),
            capabilities: this.getPrinterCapabilities(p.name),
            location: p.location || 'System Printer',
            model: p.name,
            manufacturer: this.extractManufacturer(p.name),
            isDefault: p.isDefault || false,
            systemPrinter: true,
            portName: p.portName,
            driverName: p.driverName,
            shared: p.shared || false,
            discoveryMethod: 'nodejs_printer_lib'
          });
        }

        this.log?.debug(`📋 [SYSTEM] Node.js printer library found ${printers.length} printers`);
        return printers;

      } catch (printerLibError) {
        this.log?.debug('📋 [SYSTEM] Node.js printer library not available, trying OS commands');
      }

      // Fallback to OS-specific commands
      const osPrinters = await this.discoverSystemPrintersOS();
      printers.push(...osPrinters);

    } catch (error) {
      this.log?.error('❌ [SYSTEM] System printer discovery failed:', error);
    }

    return printers;
  }

  /**
   * Discover system printers using OS commands
   */
  async discoverSystemPrintersOS() {
    const printers = [];

    try {
      if (process.platform === 'win32') {
        // Windows: Use wmic command
        const { stdout } = await execAsync('wmic printer get Name,Local,PortName,Default,Status /format:csv', { timeout: this.config.timeout });
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 5) {
            const name = parts[2]?.trim();
            const portName = parts[3]?.trim();
            const isDefault = parts[1] === 'TRUE';
            const status = parts[4]?.trim() || 'unknown';

            if (name) {
              printers.push({
                id: `system-win-${name.replace(/\s+/g, '-').toLowerCase()}`,
                name,
                type: this.determinePrinterType(name),
                connection: this.determineConnectionType(portName),
                status: this.mapWindowsStatus(status),
                capabilities: this.getPrinterCapabilities(name),
                isDefault,
                portName,
                discoveryMethod: 'windows_wmic'
              });
            }
          }
        }

      } else if (process.platform === 'darwin') {
        // macOS: Use lpstat and system_profiler
        const { stdout } = await execAsync('lpstat -p', { timeout: this.config.timeout });
        const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));

        for (const line of lines) {
          const match = line.match(/printer (.+?) is/);
          if (match) {
            const name = match[1];
            printers.push({
              id: `system-mac-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name,
              type: this.determinePrinterType(name),
              connection: 'system',
              status: line.includes('idle') ? 'online' : 'offline',
              capabilities: this.getPrinterCapabilities(name),
              discoveryMethod: 'macos_lpstat'
            });
          }
        }

      } else {
        // Linux: Use lpstat and lsusb
        const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers found"', { timeout: this.config.timeout });

        if (!stdout.includes('No printers found')) {
          const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));

          for (const line of lines) {
            const match = line.match(/printer (.+?) is/);
            if (match) {
              const name = match[1];
              printers.push({
                id: `system-linux-${name.replace(/\s+/g, '-').toLowerCase()}`,
                name,
                type: this.determinePrinterType(name),
                connection: 'system',
                status: line.includes('idle') ? 'online' : 'offline',
                capabilities: this.getPrinterCapabilities(name),
                discoveryMethod: 'linux_lpstat'
              });
            }
          }
        }
      }

    } catch (error) {
      this.log?.error('❌ [SYSTEM-OS] OS command discovery failed:', error.message);
    }

    return printers;
  }

  /**
   * Discover USB printers using escpos-usb
   */
  async discoverUSBPrinters() {
    const usbPrinters = [];

    try {
      // Try escpos-usb library
      const escpos = require('escpos-usb');
      const devices = escpos.USB.findPrinter();

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const vendorId = device.deviceDescriptor?.idVendor;
        const productId = device.deviceDescriptor?.idProduct;
        const manufacturer = device.deviceDescriptor?.iManufacturer || 'Unknown';
        const product = device.deviceDescriptor?.iProduct || `USB Printer ${i + 1}`;

        usbPrinters.push({
          id: `usb-${vendorId}-${productId}-${i}`,
          name: product,
          type: this.determinePrinterType(product),
          connection: 'usb',
          status: 'online',
          capabilities: this.getPrinterCapabilities(product),
          manufacturer,
          model: product,
          usbVendorId: vendorId,
          usbProductId: productId,
          device,
          discoveryMethod: 'escpos_usb'
        });
      }

    } catch (error) {
      this.log?.debug('🔌 [USB] escpos-usb not available:', error.message);

      // Fallback: try to detect USB printers via system commands
      try {
        const usbSystemPrinters = await this.discoverUSBPrintersSystem();
        usbPrinters.push(...usbSystemPrinters);
      } catch (systemError) {
        this.log?.debug('🔌 [USB] System USB detection also failed:', systemError.message);
      }
    }

    return usbPrinters;
  }

  /**
   * Discover USB printers using system commands
   */
  async discoverUSBPrintersSystem() {
    const usbPrinters = [];

    try {
      if (process.platform === 'linux') {
        // Linux: Use lsusb to find USB printers
        const { stdout } = await execAsync('lsusb | grep -i "printer\\|thermal\\|pos\\|receipt"', { timeout: this.config.timeout });
        const lines = stdout.split('\n').filter(line => line.trim());

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4}) (.+)/);
          if (match) {
            const [, bus, device, vendorId, productId, description] = match;
            usbPrinters.push({
              id: `usb-system-${bus}-${device}`,
              name: description.trim(),
              type: this.determinePrinterType(description),
              connection: 'usb',
              status: 'online',
              capabilities: this.getPrinterCapabilities(description),
              manufacturer: this.extractManufacturer(description),
              model: description.trim(),
              usbVendorId: parseInt(vendorId, 16),
              usbProductId: parseInt(productId, 16),
              bus: parseInt(bus),
              device: parseInt(device),
              discoveryMethod: 'linux_lsusb'
            });
          }
        }
      } else if (process.platform === 'darwin') {
        // macOS: Use system_profiler
        const { stdout } = await execAsync('system_profiler SPUSBDataType | grep -A 5 -i "printer\\|thermal"', { timeout: this.config.timeout });
        // Parse macOS USB output (simplified for now)
        this.log?.debug('📋 [USB-MAC] macOS USB printer detection needs implementation');
      }

    } catch (error) {
      this.log?.debug('🔌 [USB-SYSTEM] System USB command failed:', error.message);
    }

    return usbPrinters;
  }

  /**
   * Discover network printers by scanning IP ranges
   */
  async discoverNetworkPrinters(scanRange = '192.168.1.0/24', ports = [9100, 515, 631]) {
    const networkPrinters = [];

    try {
      this.log?.debug(`🌐 [NETWORK] Scanning ${scanRange} on ports ${ports.join(', ')}`);

      // Parse IP range
      const ips = this.parseIPRange(scanRange);
      const scanPromises = [];

      // Limit concurrent scans
      const semaphore = new Array(this.config.maxConcurrentScans).fill(null);
      let scanIndex = 0;

      const scanIP = async (ip) => {
        for (const port of ports) {
          try {
            const isOpen = await this.testTCPConnection(ip, port, this.config.networkTimeout);
            if (isOpen) {
              // Try to identify printer type
              const printerInfo = await this.identifyNetworkPrinter(ip, port);
              networkPrinters.push({
                id: `network-${ip}-${port}`,
                name: printerInfo.name || `Network Printer (${ip}:${port})`,
                type: printerInfo.type || 'network',
                connection: 'network',
                status: 'online',
                capabilities: printerInfo.capabilities || ['text'],
                ip: ip,
                port: port,
                manufacturer: printerInfo.manufacturer || 'Unknown',
                model: printerInfo.model || `Network Printer`,
                discoveryMethod: 'network_scan'
              });
            }
          } catch (error) {
            // Ignore individual scan failures
          }
        }
      };

      // Create scan promises with concurrency control
      for (const ip of ips.slice(0, 254)) { // Limit to reasonable range
        scanPromises.push(
          new Promise(async (resolve) => {
            await scanIP(ip);
            resolve();
          })
        );

        // Batch scan to avoid overwhelming the network
        if (scanPromises.length >= this.config.maxConcurrentScans) {
          await Promise.allSettled(scanPromises.splice(0, this.config.maxConcurrentScans));
        }
      }

      // Process remaining scans
      if (scanPromises.length > 0) {
        await Promise.allSettled(scanPromises);
      }

    } catch (error) {
      this.log?.error('❌ [NETWORK] Network printer discovery failed:', error.message);
    }

    return networkPrinters;
  }

  /**
   * Discover Bluetooth printers
   */
  async discoverBluetoothPrinters() {
    const bluetoothPrinters = [];

    try {
      // Try different Bluetooth discovery methods based on platform
      if (process.platform === 'linux') {
        // Linux: Use bluetoothctl or hcitool
        try {
          const { stdout } = await execAsync('bluetoothctl devices | grep -i "printer\\|pos\\|thermal"', {
            timeout: this.config.bluetoothTimeout
          });

          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const match = line.match(/Device ([0-9A-F:]{17}) (.+)/);
            if (match) {
              const [, address, name] = match;
              bluetoothPrinters.push({
                id: `bluetooth-${address.replace(/:/g, '-')}`,
                name: name.trim(),
                type: this.determinePrinterType(name),
                connection: 'bluetooth',
                status: 'online',
                capabilities: this.getPrinterCapabilities(name),
                bluetoothAddress: address,
                discoveryMethod: 'linux_bluetoothctl'
              });
            }
          }
        } catch (linuxError) {
          this.log?.debug('📶 [BLUETOOTH] Linux bluetoothctl failed:', linuxError.message);
        }

      } else if (process.platform === 'win32') {
        // Windows: Use PowerShell to list Bluetooth devices
        try {
          const { stdout } = await execAsync(
            'powershell "Get-PnpDevice | Where-Object {$_.Class -eq \\"Bluetooth\\" -and $_.FriendlyName -like \\"*printer*\\"} | Select-Object FriendlyName,InstanceId"',
            { timeout: this.config.bluetoothTimeout }
          );

          // Parse PowerShell output (simplified)
          if (stdout.includes('FriendlyName')) {
            this.log?.debug('📶 [BLUETOOTH] Windows Bluetooth printer detection needs parsing implementation');
          }
        } catch (winError) {
          this.log?.debug('📶 [BLUETOOTH] Windows PowerShell failed:', winError.message);
        }

      } else if (process.platform === 'darwin') {
        // macOS: Use system_profiler
        try {
          const { stdout } = await execAsync('system_profiler SPBluetoothDataType | grep -i printer', {
            timeout: this.config.bluetoothTimeout
          });

          if (stdout.trim()) {
            this.log?.debug('📶 [BLUETOOTH] macOS Bluetooth printer detection needs implementation');
          }
        } catch (macError) {
          this.log?.debug('📶 [BLUETOOTH] macOS system_profiler failed:', macError.message);
        }
      }

    } catch (error) {
      this.log?.debug('❌ [BLUETOOTH] Bluetooth discovery failed:', error.message);
    }

    return bluetoothPrinters;
  }

  /**
   * Test TCP connection to check if port is open
   */
  async testTCPConnection(host, port, timeout) {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);

      socket.connect(port, host, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /**
   * Identify network printer by probing
   */
  async identifyNetworkPrinter(ip, port) {
    try {
      // Basic printer identification
      const info = {
        name: null,
        type: 'network',
        manufacturer: 'Unknown',
        model: 'Network Printer',
        capabilities: ['text']
      };

      // Try to identify by port
      if (port === 9100) {
        info.type = 'thermal';
        info.capabilities = ['text', 'barcode', 'cut'];
      } else if (port === 631) {
        info.type = 'standard';
        info.capabilities = ['text', 'graphics'];
      } else if (port === 515) {
        info.type = 'standard';
        info.capabilities = ['text'];
      }

      return info;

    } catch (error) {
      return {
        type: 'network',
        capabilities: ['text']
      };
    }
  }

  /**
   * Parse IP range (e.g., "192.168.1.0/24")
   */
  parseIPRange(range) {
    const ips = [];

    try {
      if (range.includes('/')) {
        const [baseIP, maskBits] = range.split('/');
        const [a, b, c, d] = baseIP.split('.').map(Number);
        const mask = parseInt(maskBits);

        if (mask === 24) {
          // Class C subnet
          for (let i = 1; i <= 254; i++) {
            ips.push(`${a}.${b}.${c}.${i}`);
          }
        } else {
          // For other subnets, just scan the base IP
          ips.push(baseIP);
        }
      } else {
        // Single IP
        ips.push(range);
      }
    } catch (error) {
      this.log?.error('❌ [NETWORK] Failed to parse IP range:', error.message);
    }

    return ips;
  }

  /**
   * Remove duplicate printers
   */
  removeDuplicates(printers) {
    const unique = new Map();

    printers.forEach(printer => {
      // Create unique key based on name, IP, or USB identifiers
      let key = printer.name.toLowerCase();

      if (printer.ip) {
        key = `${printer.ip}:${printer.port}`;
      } else if (printer.usbVendorId && printer.usbProductId) {
        key = `usb-${printer.usbVendorId}-${printer.usbProductId}`;
      }

      if (!unique.has(key) || printer.discoveryMethod === 'nodejs_printer_lib') {
        // Prefer Node.js printer library results
        unique.set(key, printer);
      }
    });

    return Array.from(unique.values());
  }

  /**
   * Enhance printer information with additional details
   */
  async enhancePrinterInfo(printers) {
    return printers.map(printer => ({
      ...printer,
      id: printer.id || this.generatePrinterId(printer),
      lastSeen: new Date(),
      discoveredAt: new Date(),
      enhanced: true
    }));
  }

  /**
   * Generate unique printer ID
   */
  generatePrinterId(printer) {
    if (printer.ip) {
      return `network-${printer.ip}-${printer.port}`;
    } else if (printer.usbVendorId) {
      return `usb-${printer.usbVendorId}-${printer.usbProductId}`;
    } else {
      return `system-${printer.name.replace(/\s+/g, '-').toLowerCase()}`;
    }
  }

  /**
   * Determine printer type from name/description
   */
  determinePrinterType(name, description = '') {
    const text = (name + ' ' + description).toLowerCase();

    if (text.includes('receipt') || text.includes('pos') || text.includes('tm-') ||
        text.includes('tsp') || text.includes('thermal') || text.includes('star') ||
        text.includes('epson') || text.includes('citizen') || text.includes('bixolon')) {
      return 'thermal';
    } else if (text.includes('kitchen') || text.includes('kds')) {
      return 'kitchen';
    } else if (text.includes('label') || text.includes('ql-') || text.includes('zebra')) {
      return 'label';
    }

    return 'standard';
  }

  /**
   * Determine connection type from port name
   */
  determineConnectionType(portName) {
    if (!portName) return 'system';

    const port = portName.toLowerCase();
    if (port.includes('usb')) return 'usb';
    if (port.includes('network') || port.includes('ip') || port.includes('socket')) return 'network';
    if (port.includes('bluetooth')) return 'bluetooth';
    if (port.includes('serial') || port.includes('com')) return 'serial';

    return 'system';
  }

  /**
   * Map printer status
   */
  mapPrinterStatus(status) {
    if (!status) return 'online';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('ready') || statusLower.includes('idle')) return 'online';
    if (statusLower.includes('offline') || statusLower.includes('error')) return 'offline';
    if (statusLower.includes('busy') || statusLower.includes('printing')) return 'busy';

    return 'online';
  }

  /**
   * Map Windows-specific status
   */
  mapWindowsStatus(status) {
    if (!status || status === 'unknown') return 'online';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('ok') || statusLower.includes('ready')) return 'online';
    if (statusLower.includes('offline') || statusLower.includes('error')) return 'offline';
    if (statusLower.includes('busy') || statusLower.includes('printing')) return 'busy';

    return 'online';
  }

  /**
   * Get printer capabilities based on type
   */
  getPrinterCapabilities(nameOrType) {
    const text = nameOrType.toLowerCase();

    if (text.includes('receipt') || text.includes('pos') || text.includes('thermal')) {
      return ['text', 'barcode', 'cut', 'cash_drawer'];
    } else if (text.includes('kitchen')) {
      return ['text', 'cut', 'buzzer'];
    } else if (text.includes('label')) {
      return ['labels', 'qr_code', 'barcode'];
    }

    return ['text'];
  }

  /**
   * Extract manufacturer from printer name
   */
  extractManufacturer(name) {
    if (!name) return 'Unknown';

    const manufacturers = [
      'HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Lexmark',
      'Dell', 'Xerox', 'Star', 'Zebra', 'Citizen', 'Bixolon',
      'Seiko', 'TSC', 'Godex', 'Datamax', 'Intermec', 'Honeywell'
    ];

    const nameUpper = name.toUpperCase();

    for (const manufacturer of manufacturers) {
      if (nameUpper.includes(manufacturer.toUpperCase())) {
        return manufacturer;
      }
    }

    return 'Unknown';
  }
}

module.exports = PrinterDetector;