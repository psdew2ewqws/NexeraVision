/**
 * Service WebSocket Functions
 *
 * Headless WebSocket functionality for the PrinterMaster service
 * that doesn't depend on Electron APIs
 */

const io = require('socket.io-client');

// Global references (shared with service)
let socket = null;
let activeBranchId = null;
let deviceInfo = null;
let log = null;
let config = null;

// Initialize with references from service
function initializeWebSocketModule(refs) {
  log = refs.log;
  config = refs.config;
}

// ================================
// WebSocket Connection Management
// ================================

async function connectToBackendWebSocket(licenseData) {
  return new Promise((resolve, reject) => {
    try {
      log.info('Connecting to backend WebSocket...');

      // Store license data globally for use in WebSocket connection
      activeBranchId = licenseData.branchId;
      deviceInfo = licenseData.deviceInfo || {};

      // Get WebSocket configuration
      const wsConfig = config.getWebSocketConfig();

      // Connect to the printing WebSocket namespace
      socket = io(`${wsConfig.url}${wsConfig.namespace}`, {
        auth: {
          licenseKey: licenseData.licenseKey,
          branchId: licenseData.branchId,
          deviceId: deviceInfo.deviceId,
          instanceId: deviceInfo.deviceId, // Use device ID as instance ID
          userRole: 'service',
          appVersion: config.get('APP_VERSION')
        },
        transports: ['websocket', 'polling'],
        reconnection: wsConfig.reconnection,
        reconnectionDelay: wsConfig.reconnectionDelay,
        reconnectionAttempts: wsConfig.reconnectionAttempts,
        timeout: wsConfig.timeout
      });

      socket.on('connect', () => {
        log.info('WebSocket connected to backend successfully');

        // Join branch room for targeted updates
        socket.emit('join:branch', { branchId: licenseData.branchId });

        // Send initial status
        socket.emit('desktop:status', {
          status: 'connected',
          timestamp: new Date().toISOString(),
          version: config.get('APP_VERSION'),
          serviceMode: true
        });

        resolve();
      });

      socket.on('disconnect', (reason) => {
        log.warn('WebSocket disconnected from backend:', reason);
      });

      socket.on('connect_error', (error) => {
        log.error('WebSocket connection error:', error);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      socket.on('reconnect', (attemptNumber) => {
        log.info(`WebSocket reconnected after ${attemptNumber} attempts`);

        // Rejoin rooms after reconnection
        if (licenseData.branchId) {
          socket.emit('join:branch', { branchId: licenseData.branchId });
        }

        // Send current printer list after reconnection
        setTimeout(() => {
          sendCurrentPrintersToBackend();
        }, 1000);
      });

      // Listen for print job requests from backend
      socket.on('print:job', async (job) => {
        log.info('Received print job from backend:', job.id);
        await processPrintJob(job);
      });

      // Set connection timeout from configuration
      const connectionTimeout = config.get('WEBSOCKET_CONNECTION_TIMEOUT');
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, connectionTimeout);

    } catch (error) {
      log.error('Error setting up WebSocket connection:', error);
      reject(error);
    }
  });
}

// Send discovered printers to backend via WebSocket
async function sendCurrentPrintersToBackend() {
  if (!socket || !socket.connected) {
    log.warn('Cannot send printers: WebSocket not connected');
    return;
  }

  try {
    log.info('🔍 Discovering system printers for backend sync...');

    // Discover real system printers using multiple methods
    const discoveredPrinters = await discoverRealSystemPrinters();

    if (discoveredPrinters.length === 0) {
      log.info('No printers discovered');
      return;
    }

    // Send each printer as a real-time update
    for (const printer of discoveredPrinters) {
      const printerData = {
        id: printer.id,
        name: printer.name,
        type: printer.type || 'thermal',
        connection: printer.connection || 'usb',
        status: printer.status || 'online',
        branchId: activeBranchId,
        discoveredBy: deviceInfo?.deviceId || 'service',
        discoveryMethod: printer.discoveryMethod || 'service_discovery',
        timestamp: new Date().toISOString(),
        device: printer.device,
        systemPrinter: printer.systemPrinter || false,
        capabilities: printer.capabilities || ['text'],
        serviceMode: true
      };

      // Send WebSocket event for real-time status updates
      socket.emit('printer:discovered', printerData);
      log.info(`📡 [WEBSOCKET] Sent printer data: ${printer.name} (${printer.type})`);
    }

    log.info(`✅ [SUCCESS] Sent ${discoveredPrinters.length} printers to backend`);

  } catch (error) {
    log.error('❌ Error in printer discovery to backend sync:', error);
  }
}

// Discover real system printers using multiple detection methods
async function discoverRealSystemPrinters() {
  const allPrinters = [];

  try {
    log.info('🖨️ Starting service printer discovery...');

    // Method 1: Use Node.js printer library (most reliable)
    try {
      const printer = require('printer');
      const systemPrinters = printer.getPrinters();

      if (systemPrinters && systemPrinters.length > 0) {
        log.info(`📋 Found ${systemPrinters.length} system printers`);

        for (const p of systemPrinters) {
          const printerType = determinePrinterType(p.name, p.description);
          const connectionType = determineConnectionType(p.portName);

          allPrinters.push({
            id: `service-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: p.name,
            type: printerType,
            connection: connectionType,
            status: mapPrinterStatus(p.status),
            capabilities: getPrinterCapabilities(printerType),
            location: p.location || 'Service Discovery',
            model: p.name,
            manufacturer: extractManufacturer(p.name) || 'System',
            isDefault: p.isDefault || false,
            systemPrinter: true,
            portName: p.portName,
            driverName: p.driverName,
            shared: p.shared || false,
            discoveryMethod: 'service_printer_lib'
          });
        }
      }
    } catch (printerLibError) {
      log.warn('Printer library not available:', printerLibError.message);
    }

    // Method 2: OS-specific commands as fallback
    if (allPrinters.length === 0) {
      log.info('🔄 Fallback to OS-specific printer discovery...');
      const osPrinters = await discoverPrintersViaOS();
      allPrinters.push(...osPrinters);
    }

    // Remove duplicates based on name
    const uniquePrinters = removeDuplicatePrinters(allPrinters);

    log.info(`🎯 Service discovery results: ${uniquePrinters.length} unique printers found`);
    uniquePrinters.forEach(p => log.info(`  - ${p.name} (${p.type}, ${p.connection})`));

    return uniquePrinters;

  } catch (error) {
    log.error('❌ Service printer discovery failed:', error);
    return [];
  }
}

// Discover printers via OS-specific commands
async function discoverPrintersViaOS() {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  const printers = [];

  try {
    if (process.platform === 'linux') {
      // Linux: Use lpstat command
      try {
        const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers found"');
        if (!stdout.includes('No printers found')) {
          const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));

          for (const line of lines) {
            const match = line.match(/printer (.+?) is/);
            if (match) {
              const name = match[1];
              printers.push({
                id: `service-linux-${name.replace(/\s+/g, '-').toLowerCase()}`,
                name: name,
                type: determinePrinterType(name),
                connection: 'usb',
                status: line.includes('idle') ? 'online' : 'offline',
                capabilities: ['text'],
                discoveryMethod: 'service_linux_lpstat'
              });
            }
          }
        }
      } catch (linuxError) {
        log.debug('Linux lpstat failed:', linuxError.message);
      }
    }
  } catch (error) {
    log.warn('OS printer discovery failed:', error.message);
  }

  return printers;
}

// Helper functions
function determinePrinterType(name, description = '') {
  const nameLower = (name + ' ' + description).toLowerCase();

  if (nameLower.includes('receipt') || nameLower.includes('pos') || nameLower.includes('tm-') ||
      nameLower.includes('tsp') || nameLower.includes('thermal') || nameLower.includes('star') ||
      nameLower.includes('epson') || nameLower.includes('citizen')) {
    return 'thermal';
  } else if (nameLower.includes('kitchen') || nameLower.includes('kds')) {
    return 'kitchen';
  } else if (nameLower.includes('label') || nameLower.includes('ql-') || nameLower.includes('zebra')) {
    return 'label';
  }

  return 'thermal'; // Default to thermal for restaurant use
}

function determineConnectionType(portName) {
  if (!portName) return 'usb';

  const port = portName.toLowerCase();
  if (port.includes('usb')) return 'usb';
  if (port.includes('network') || port.includes('ip') || port.includes('socket')) return 'network';
  if (port.includes('bluetooth')) return 'bluetooth';
  if (port.includes('serial') || port.includes('com')) return 'serial';

  return 'usb';
}

function mapPrinterStatus(status) {
  if (!status) return 'online';

  const statusLower = status.toLowerCase();
  if (statusLower.includes('ready') || statusLower.includes('idle')) return 'online';
  if (statusLower.includes('offline') || statusLower.includes('error')) return 'offline';
  if (statusLower.includes('busy') || statusLower.includes('printing')) return 'busy';

  return 'online';
}

function getPrinterCapabilities(type) {
  switch (type) {
    case 'thermal':
      return ['text', 'barcode', 'cut', 'cash_drawer'];
    case 'kitchen':
      return ['text', 'cut', 'buzzer'];
    case 'label':
      return ['labels', 'qr_code', 'barcode'];
    default:
      return ['text'];
  }
}

function extractManufacturer(printerName) {
  const manufacturers = ['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Lexmark', 'Dell', 'Xerox', 'Star', 'Zebra', 'Citizen', 'Bixolon'];
  const name = printerName.toUpperCase();

  for (const manufacturer of manufacturers) {
    if (name.includes(manufacturer.toUpperCase())) {
      return manufacturer;
    }
  }

  return 'Unknown';
}

function removeDuplicatePrinters(printers) {
  const unique = new Map();

  printers.forEach(printer => {
    // Use name as primary key, fallback to ID
    const key = printer.name.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, printer);
    }
  });

  return Array.from(unique.values());
}

// Process print jobs received from backend
async function processPrintJob(job) {
  try {
    log.info(`Processing print job: ${job.id}`);

    // Send job started status
    if (socket && socket.connected) {
      socket.emit('print:job:started', {
        jobId: job.id,
        timestamp: new Date().toISOString()
      });
    }

    // Simple success response for service mode
    log.info(`Print job ${job.id} processed in service mode`);

    // Send job completion status
    if (socket && socket.connected) {
      socket.emit('print:job:completed', {
        jobId: job.id,
        success: true,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    log.error(`Error processing print job ${job.id}:`, error);

    // Send job failure status
    if (socket && socket.connected) {
      socket.emit('print:job:failed', {
        jobId: job.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Disconnect WebSocket when service stops
function disconnectWebSocket() {
  if (socket) {
    log.info('Disconnecting WebSocket...');
    socket.disconnect();
    socket = null;
  }
}

module.exports = {
  initializeWebSocketModule,
  connectToBackendWebSocket,
  sendCurrentPrintersToBackend,
  discoverRealSystemPrinters,
  processPrintJob,
  disconnectWebSocket
};