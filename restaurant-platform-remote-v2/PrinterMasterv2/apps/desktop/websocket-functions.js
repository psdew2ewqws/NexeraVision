const io = require('socket.io-client');

// Service imports
const PrintQueueService = require('./services/print-queue.service');
const PrinterDetectorService = require('./services/printer-detector');
const PhysicalPrinterService = require('./services/physical-printer.service');
const PrinterStatusMonitorService = require('./services/printer-status-monitor.service');
const PrintLoggerService = require('./services/print-logger.service');

// Global references (shared with main.js)
let socket = null;
let activeBranchId = null;
let deviceInfo = null;
let log = null;
let mainWindow = null;
let config = null;

// Global services
let printQueueService = null;
let statusMonitorService = null;
let loggerService = null;

// Initialize with references from main process
async function initializeWebSocketModule(refs) {
  log = refs.log;
  mainWindow = refs.mainWindow;
  config = refs.config;

  try {
    // Initialize enhanced logger service
    loggerService = new PrintLoggerService();
    await loggerService.initialize('DEBUG'); // Set to DEBUG for development
    log = loggerService.createComponentLogger('WEBSOCKET');

    log.info('🚀 [INIT] Initializing enhanced WebSocket module with comprehensive services');

    // Initialize status monitor service
    statusMonitorService = new PrinterStatusMonitorService();
    statusMonitorService.initialize(loggerService.createComponentLogger('STATUS-MONITOR'));

    // Initialize print queue service if not already done
    if (!printQueueService) {
      printQueueService = new PrintQueueService();
      printQueueService.initialize(loggerService.createComponentLogger('PRINT-QUEUE'));
    }

    // Set up inter-service communication
    setupServiceIntegration();

    log.info('✅ [INIT] All printing services initialized successfully');

  } catch (error) {
    console.error('❌ [INIT] Failed to initialize services:', error);
    // Fallback to basic console logging
    log = console;
  }
}

/**
 * Set up integration between services
 */
function setupServiceIntegration() {
  if (!printQueueService || !statusMonitorService) return;

  // Forward print queue events to status monitor
  printQueueService.on('job-queued', (job) => {
    log.logJobEvent(job.id, job.type, 'queued', `Job queued for ${job.printerName}`);
  });

  printQueueService.on('job-started', (job) => {
    log.logJobEvent(job.id, job.type, 'started', `Job started on ${job.printerName}`);
  });

  printQueueService.on('job-completed', (job) => {
    const responseTime = job.processingTime || (job.completedAt - job.startedAt);
    statusMonitorService.recordSuccessfulJob(job.printerId, responseTime);
    log.logJobEvent(job.id, job.type, 'completed', `Job completed successfully`, { responseTime });
  });

  printQueueService.on('job-failed', (job) => {
    const error = new Error(job.lastError || 'Print job failed');
    statusMonitorService.recordFailedJob(job.printerId, error);
    log.logJobEvent(job.id, job.type, 'failed', `Job failed: ${job.lastError}`);
  });

  // Forward status monitor events
  statusMonitorService.on('printer-registered', (printer) => {
    log.logPrinterEvent('registered', printer.id, `Printer registered for monitoring: ${printer.name}`);
  });

  statusMonitorService.on('status-updated', (printer) => {
    log.logPrinterEvent('status-updated', printer.id, `Status updated: ${printer.status}`, {
      healthScore: printer.healthScore,
      isOnline: printer.isOnline
    });
  });

  log.info('🔗 [INIT] Service integration configured');
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
          userRole: 'desktop_app',
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
          version: config.get('APP_VERSION')
        });
        
        resolve();
      });
      
      socket.on('disconnect', (reason) => {
        log.warn('WebSocket disconnected from backend:', reason);
        
        // Notify UI about disconnection
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('websocket-status', { connected: false, reason });
        }
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
      
      // Start periodic printer discovery after successful connection
      const discoveryInterval = config.get('PRINTER_DISCOVERY_INTERVAL');
      setInterval(() => {
        sendCurrentPrintersToBackend();
      }, discoveryInterval);
      
      // Send initial printer discovery after 2 seconds
      setTimeout(() => {
        sendCurrentPrintersToBackend();
      }, 2000);
      
      // Listen for print job requests from backend
      socket.on('print:job', async (job) => {
        log.info('Received print job from backend:', job.id);
        await processPrintJob(job);
      });
      
      // Listen for printer test requests
      socket.on('printer:test', async (data) => {
        log.info('🖨️ [PRINT-TEST] Received printer test request:', data.printerId);

        // Immediate acknowledgment
        socket.emit('printer:test:ack', {
          printerId: data.printerId,
          message: 'Test request received, processing...',
          timestamp: new Date().toISOString()
        });

        try {
          const result = await handlePhysicalPrinterTest(data);

          // Send successful result
          socket.emit('printer:test:result', {
            printerId: data.printerId,
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            result: result,
            processingTime: result.processingTime || 0
          });

          log.info(`✅ [PRINT-TEST] Test completed successfully for: ${data.printerId}`);

        } catch (error) {
          log.error('❌ [PRINT-TEST] Printer test failed:', error);

          // Send detailed error information
          socket.emit('printer:test:result', {
            printerId: data.printerId,
            success: false,
            error: error.message,
            errorType: error.name || 'PrintError',
            errorDetails: {
              printerName: data.printerName,
              printerType: data.type,
              connection: data.connection,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            timestamp: new Date().toISOString(),
            suggestions: [
              'Check if printer is connected and powered on',
              'Verify printer drivers are installed',
              'Ensure no other applications are using the printer'
            ]
          });
        }
      });

      // Listen for physical print job requests
      socket.on('print:physical', async (printJob) => {
        log.info('🖨️ [PRINT-PHYSICAL] Received physical print job:', printJob.id);
        try {
          const result = await handlePhysicalPrintJob(printJob);
          socket.emit('print:physical:result', {
            jobId: printJob.id,
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            result: result
          });
        } catch (error) {
          log.error('❌ [PRINT-PHYSICAL] Physical print job failed:', error);
          socket.emit('print:physical:result', {
            jobId: printJob.id,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Listen for raw print commands (ESC/POS, etc.)
      socket.on('print:raw', async (rawPrintData) => {
        log.info('🔧 [PRINT-RAW] Received raw print command for:', rawPrintData.printerName);
        try {
          const result = await handleRawPrint(rawPrintData);
          socket.emit('print:raw:result', {
            printerName: rawPrintData.printerName,
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            result: result
          });
        } catch (error) {
          log.error('❌ [PRINT-RAW] Raw print failed:', error);
          socket.emit('print:raw:result', {
            printerName: rawPrintData.printerName,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Listen for print queue status requests
      socket.on('print:queue:status', (data) => {
        try {
          const status = getPrintQueueStatus(data.printerId);
          socket.emit('print:queue:status:result', {
            printerId: data.printerId,
            status: status,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          log.error('❌ [PRINT-QUEUE] Queue status request failed:', error);
          socket.emit('print:queue:status:result', {
            printerId: data.printerId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Phase 3: Enhanced Discovery WebSocket Events

      // Listen for discovery service control commands
      socket.on('discovery:control', (command) => {
        log.info(`🎛️ [DISCOVERY-CONTROL] Received command: ${command.action}`);
        try {
          handleDiscoveryCommand(command);
        } catch (error) {
          log.error('❌ [DISCOVERY-CONTROL] Command failed:', error);
          socket.emit('discovery:control:error', {
            command: command.action,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Listen for discovery status requests
      socket.on('discovery:status', () => {
        try {
          const status = getDiscoveryServiceStatus();
          socket.emit('discovery:status:result', {
            ...status,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          log.error('❌ [DISCOVERY-STATUS] Status request failed:', error);
          socket.emit('discovery:status:result', {
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Listen for cached printer requests
      socket.on('discovery:get-cached-printers', () => {
        try {
          const printers = getCachedPrinters();
          socket.emit('discovery:cached-printers', {
            printers,
            count: printers.length,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          log.error('❌ [DISCOVERY-CACHE] Cached printer request failed:', error);
          socket.emit('discovery:cached-printers', {
            printers: [],
            count: 0,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Listen for force discovery requests
      socket.on('discovery:force', async () => {
        log.info('🔄 [DISCOVERY-FORCE] Force discovery requested via WebSocket');
        try {
          const result = await forceDiscoveryNow();
          socket.emit('discovery:force:result', {
            success: true,
            ...result,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          log.error('❌ [DISCOVERY-FORCE] Force discovery failed:', error);
          socket.emit('discovery:force:result', {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Listen for discovery configuration updates
      socket.on('discovery:config:update', (newConfig) => {
        log.info('⚙️ [DISCOVERY-CONFIG] Configuration update requested:', newConfig);
        try {
          updateDiscoveryConfiguration(newConfig);
          socket.emit('discovery:config:updated', {
            success: true,
            config: newConfig,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          log.error('❌ [DISCOVERY-CONFIG] Configuration update failed:', error);
          socket.emit('discovery:config:updated', {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
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

// Send discovered printers to backend via WebSocket AND API registration
async function sendCurrentPrintersToBackend() {
  if (!socket || !socket.connected) {
    log.warn('Cannot send printers: WebSocket not connected');
    return;
  }

  try {
    log.info('🔍 Discovering real system printers...');

    // Discover real system printers using multiple methods
    const discoveredPrinters = await discoverRealSystemPrinters();

    if (discoveredPrinters.length === 0) {
      log.info('No real printers discovered');
      return;
    }

    // PHASE 1: DIRECT BACKEND REGISTRATION - CRITICAL BRIDGE
    // Direct registration with backend API without the sync service
    log.info(`🚀 [DIRECT-SYNC] Starting direct backend registration for ${discoveredPrinters.length} printers`);

    try {
      // Transform discovered printers for the backend API
      const printersForAPI = discoveredPrinters.map(printer => ({
        name: printer.name,
        type: mapPrinterTypeForAPI(printer.type || 'thermal'),
        connection: mapConnectionTypeForAPI(printer.connection || 'usb'),
        status: printer.status === 'online' ? 'online' : 'offline',
        ip: extractIPAddress(printer),
        port: extractPort(printer),
        manufacturer: printer.manufacturer || extractManufacturer(printer.name),
        model: printer.model || printer.name,
        location: printer.device || 'Desktop Discovery',
        paperWidth: 80, // Default for thermal printers
        assignedTo: mapAssignedTo(printer.type || 'thermal'),
        isDefault: printer.isDefault || false,
        capabilities: printer.capabilities || getDefaultCapabilities(printer.type || 'thermal'),
        branchId: activeBranchId,
        discoveryMethod: printer.discoveryMethod,
        discoveredBy: printer.discoveredBy || deviceInfo?.deviceId || 'desktop_app',
        systemPrinter: printer.systemPrinter || false
      }));

      // Direct API call to backend for bulk registration
      const axios = require('axios');
      const apiUrl = config.get('API_BASE_URL') || 'http://localhost:3001';

      log.info(`📥 [DIRECT-SYNC] Sending ${printersForAPI.length} printers to backend API: ${apiUrl}/api/v1/printing/printers/bulk`);

      const response = await axios.post(`${apiUrl}/api/v1/printing/printers/bulk`, {
        printers: printersForAPI,
        branchId: activeBranchId
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 || response.status === 201) {
        const results = response.data.results || [];
        let successCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;

        results.forEach((result, index) => {
          const printer = discoveredPrinters[index];
          if (!printer) return;

          if (result.success) {
            successCount++;
            log.info(`✅ [DIRECT-SYNC] Printer registered: ${printer.name} -> ID: ${result.id}`);

            // Notify frontend via WebSocket that printer is now available
            socket.emit('printer:sync:success', {
              printer: printer,
              backendId: result.id,
              timestamp: new Date().toISOString()
            });
          } else if (result.duplicate) {
            duplicateCount++;
            log.info(`📋 [DIRECT-SYNC] Printer already exists: ${printer.name}`);
          } else {
            failedCount++;
            log.error(`❌ [DIRECT-SYNC] Printer registration failed: ${printer.name} - ${result.error}`);
          }
        });

        log.info(`🎉 [DIRECT-SYNC] Bulk registration completed: ${successCount} success, ${failedCount} failed, ${duplicateCount} duplicates`);

        // Broadcast completion to frontend
        socket.emit('printer:sync:batch-completed', {
          results: {
            success: successCount,
            failed: failedCount,
            duplicates: duplicateCount,
            total: printersForAPI.length
          },
          timestamp: new Date().toISOString()
        });

      } else {
        throw new Error(`API request failed with status: ${response.status}`);
      }

    } catch (directSyncError) {
      log.error(`❌ [DIRECT-SYNC] Direct registration failed:`, directSyncError);

      // Emit sync error to frontend
      socket.emit('printer:sync:error', {
        error: directSyncError.message,
        printers: discoveredPrinters.length,
        timestamp: new Date().toISOString()
      });

      // Continue with WebSocket events as fallback
      log.info(`🔄 [FALLBACK] Continuing with WebSocket-only mode due to direct sync error`);
    }

    // PHASE 2: Continue with WebSocket discovery events (for real-time updates)
    for (const printer of discoveredPrinters) {
      const printerData = {
        id: printer.id,
        name: printer.name,
        type: printer.type || 'thermal',
        connection: printer.connection || 'usb',
        status: printer.status || 'online',
        branchId: activeBranchId,
        discoveredBy: deviceInfo?.deviceId || 'desktop_app',
        discoveryMethod: printer.discoveryMethod || 'system_printer',
        timestamp: new Date().toISOString(),
        device: printer.device,
        systemPrinter: printer.systemPrinter || false,
        capabilities: printer.capabilities || ['text']
      };

      // Send WebSocket event for real-time status updates
      socket.emit('printer:discovered', printerData);
      log.info(`📡 [WEBSOCKET] Sent real-time printer event: ${printer.name} (${printer.type})`);
    }

    log.info(`✅ [SUCCESS] Direct backend registration completed for ${discoveredPrinters.length} printers`);
    log.info(`🌟 [SUCCESS] Printers will now appear in web interface at http://localhost:3002/settings/printing`);

  } catch (error) {
    log.error('❌ Error in auto-discovery to backend sync:', error);
  }
}

// Discover real system printers using multiple detection methods
async function discoverRealSystemPrinters() {
  const allPrinters = [];
  
  try {
    log.info('🖨️ Starting comprehensive printer discovery...');
    
    // Method 1: Use Node.js printer library (most reliable)
    try {
      const printer = require('printer');
      const systemPrinters = printer.getPrinters();
      
      if (systemPrinters && systemPrinters.length > 0) {
        log.info(`📋 Found ${systemPrinters.length} system printers via Node.js printer library`);
        
        for (const p of systemPrinters) {
          const printerType = determinePrinterType(p.name, p.description);
          const connectionType = determineConnectionType(p.portName);
          const networkInfo = extractNetworkInfo(p.portName);

          const printerConfig = {
            id: `system-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: p.name,
            type: printerType,
            connection: connectionType,
            status: mapPrinterStatus(p.status),
            capabilities: getPrinterCapabilities(printerType),
            location: p.location || 'System Printer',
            model: p.name,
            manufacturer: extractManufacturer(p.name) || 'System',
            isDefault: p.isDefault || false,
            systemPrinter: true,
            portName: p.portName,
            driverName: p.driverName,
            shared: p.shared || false,
            discoveryMethod: 'system_printer',
            ...networkInfo // Add IP, port, and network protocol if available
          };

          allPrinters.push(printerConfig);

          // Register with status monitor for health tracking
          if (statusMonitorService) {
            statusMonitorService.registerPrinter(printerConfig);
          }
        }
      }
    } catch (printerLibError) {
      log.warn('Node.js printer library not available:', printerLibError.message);
    }
    
    // Method 2: OS-specific commands as fallback
    if (allPrinters.length === 0) {
      log.info('🔄 Fallback to OS-specific printer discovery...');
      const osPrinters = await discoverPrintersViaOS();
      allPrinters.push(...osPrinters);
    }
    
    // Method 3: USB/Serial port detection for direct connected printers
    try {
      const usbPrinters = await discoverUSBPrinters();
      allPrinters.push(...usbPrinters);
    } catch (usbError) {
      log.debug('USB printer discovery failed:', usbError.message);
    }
    
    // Remove duplicates based on name
    const uniquePrinters = removeDuplicatePrinters(allPrinters);
    
    log.info(`🎯 Final discovery results: ${uniquePrinters.length} unique printers found`);
    uniquePrinters.forEach(p => log.info(`  - ${p.name} (${p.type}, ${p.connection})`));
    
    return uniquePrinters;
    
  } catch (error) {
    log.error('❌ Printer discovery failed:', error);
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
    if (process.platform === 'win32') {
      // Windows: Use wmic command
      const { stdout } = await execAsync('wmic printer get Name,Local,PortName,Default /format:csv');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
      
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 4) {
          const name = parts[2]?.trim();
          const portName = parts[3]?.trim();
          const isDefault = parts[0] === 'TRUE';
          
          if (name) {
            printers.push({
              id: `os-win-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name: name,
              type: determinePrinterType(name),
              connection: determineConnectionType(portName),
              status: 'online',
              capabilities: ['text'],
              isDefault: isDefault,
              portName: portName,
              discoveryMethod: 'windows_wmic'
            });
          }
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS: Use lpstat and system_profiler
      try {
        const { stdout } = await execAsync('lpstat -p');
        const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));
        
        for (const line of lines) {
          const match = line.match(/printer (.+?) is/);
          if (match) {
            const name = match[1];
            printers.push({
              id: `os-mac-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name: name,
              type: determinePrinterType(name),
              connection: determineConnectionType(name),
              status: line.includes('idle') ? 'online' : 'offline',
              capabilities: ['text'],
              discoveryMethod: 'macos_lpstat'
            });
          }
        }
      } catch (macError) {
        log.debug('macOS lpstat failed:', macError.message);
      }
    } else {
      // Linux: Use lpstat and lsusb
      try {
        const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers found"');
        if (!stdout.includes('No printers found')) {
          const lines = stdout.split('\n').filter(line => line.trim().startsWith('printer'));

          // Get printer URIs to determine proper connection types
          let uriInfo = {};
          try {
            const { stdout: uriOutput } = await execAsync('lpstat -v 2>/dev/null || echo ""');
            const uriLines = uriOutput.split('\n').filter(line => line.trim().startsWith('device for'));
            for (const uriLine of uriLines) {
              const uriMatch = uriLine.match(/device for (.+?):\s*(.+)/);
              if (uriMatch) {
                uriInfo[uriMatch[1]] = uriMatch[2];
              }
            }
          } catch (uriError) {
            log.debug('Failed to get printer URIs:', uriError.message);
          }

          for (const line of lines) {
            const match = line.match(/printer (.+?) is/);
            if (match) {
              const name = match[1];
              const uri = uriInfo[name] || '';
              printers.push({
                id: `os-linux-${name.replace(/\s+/g, '-').toLowerCase()}`,
                name: name,
                type: determinePrinterType(name),
                connection: determineConnectionType(uri || name),
                status: line.includes('idle') ? 'online' : 'offline',
                capabilities: ['text'],
                uri: uri,
                discoveryMethod: 'linux_lpstat'
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

// Discover USB printers directly
async function discoverUSBPrinters() {
  const usbPrinters = [];
  
  try {
    // Try to use escpos-usb for direct USB detection
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
        type: 'thermal',
        connection: 'usb',
        status: 'online',
        capabilities: ['text', 'barcode', 'cut'],
        manufacturer: manufacturer,
        model: product,
        usbVendorId: vendorId,
        usbProductId: productId,
        device: device,
        discoveryMethod: 'usb_detection'
      });
    }
    
    log.info(`🔌 Found ${usbPrinters.length} USB printers`);
  } catch (usbError) {
    log.debug('USB printer discovery via escpos-usb failed:', usbError.message);
  }
  
  return usbPrinters;
}

// Helper functions
function determinePrinterType(name, description = '') {
  const nameLower = (name + ' ' + description).toLowerCase();

  // Network printers (multifunction, office printers)
  if (nameLower.includes('ricoh') || nameLower.includes('canon') || nameLower.includes('hp') ||
      nameLower.includes('xerox') || nameLower.includes('konica') || nameLower.includes('sharp') ||
      nameLower.includes('multifunction') || nameLower.includes('mfp') || nameLower.includes('mp-c')) {
    return 'network';
  }

  // Thermal/POS printers
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
  if (!portName) return 'local';

  const port = portName.toLowerCase();

  // Network/TCP connection indicators
  if (port.includes('socket://') || port.includes('ipp://') || port.includes('http://') ||
      port.includes('https://') || port.includes('network') || port.includes('tcp') ||
      /\d+\.\d+\.\d+\.\d+/.test(port) || port.includes(':9100') || port.includes(':631')) {
    return 'network';
  }

  // USB connection indicators
  if (port.includes('usb') || port.includes('lp0') || port.includes('lp1')) return 'usb';

  // Bluetooth connection indicators
  if (port.includes('bluetooth') || port.includes('rfcomm')) return 'bluetooth';

  // Serial connection indicators
  if (port.includes('serial') || port.includes('com') || port.includes('tty')) return 'serial';

  return 'local';
}

function extractNetworkInfo(portName) {
  if (!portName) return {};

  const port = portName.toLowerCase();

  // Extract IP address and port from various URI formats
  // Examples: socket://192.168.1.50:9100, ipp://printer.local:631, http://192.168.1.50
  const ipRegex = /(\d+\.\d+\.\d+\.\d+)/;
  const portRegex = /:(\d+)/;
  const protocolRegex = /^(\w+):\/\//;

  const ipMatch = port.match(ipRegex);
  const portMatch = port.match(portRegex);
  const protocolMatch = port.match(protocolRegex);

  const networkInfo = {};

  if (ipMatch) {
    networkInfo.ip = ipMatch[1];
  }

  if (portMatch) {
    networkInfo.port = parseInt(portMatch[1], 10);
  } else if (port.includes('socket://') && !portMatch) {
    // Default socket port
    networkInfo.port = 9100;
  }

  if (protocolMatch) {
    networkInfo.protocol = protocolMatch[1];
  }

  // Special case for Ricoh printers
  if (port.includes('ricoh') || port.includes('192.168.1.50')) {
    networkInfo.ip = networkInfo.ip || '192.168.1.50';
    networkInfo.port = networkInfo.port || 9100;
    networkInfo.protocol = networkInfo.protocol || 'socket';
  }

  return networkInfo;
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

// Helper functions for API transformation
function mapPrinterTypeForAPI(type) {
  const typeMap = {
    'thermal': 'thermal',
    'receipt': 'thermal',
    'kitchen': 'kitchen',
    'label': 'label',
    'laser': 'laser',
    'inkjet': 'inkjet'
  };
  return typeMap[type.toLowerCase()] || 'thermal';
}

function mapConnectionTypeForAPI(connection) {
  const connectionMap = {
    'usb': 'usb',
    'network': 'network',
    'ethernet': 'network',
    'wifi': 'network',
    'bluetooth': 'bluetooth',
    'serial': 'usb'
  };
  return connectionMap[connection.toLowerCase()] || 'usb';
}

function extractIPAddress(printer) {
  // Try to extract IP from port name or device info
  if (printer.portName && printer.portName.includes('IP_')) {
    const match = printer.portName.match(/IP_(\d+\.\d+\.\d+\.\d+)/);
    if (match) return match[1];
  }
  return '127.0.0.1'; // Default fallback
}

function extractPort(printer) {
  if (printer.connection && printer.connection.toLowerCase().includes('network')) {
    return 9100; // Default network printer port
  }
  return 8182; // Default local service port
}

function mapAssignedTo(type) {
  const assignmentMap = {
    'thermal': 'cashier',
    'receipt': 'cashier',
    'kitchen': 'kitchen',
    'label': 'cashier'
  };
  return assignmentMap[type.toLowerCase()] || 'kitchen';
}

function getDefaultCapabilities(type) {
  const capabilityMap = {
    'thermal': ['text', 'cut', 'cash_drawer'],
    'receipt': ['text', 'cut', 'cash_drawer'],
    'kitchen': ['text', 'cut', 'buzzer'],
    'label': ['labels', 'qr_code', 'barcode']
  };
  return capabilityMap[type.toLowerCase()] || ['text'];
}

// Process print jobs received from backend
async function processPrintJob(job) {
  try {
    log.info(`Processing print job: ${job.id}`);
    
    // Find the target printer
    const printers = await discoverPrinters();
    const targetPrinter = printers.find(p => p.id === job.printerId || p.name === job.printerName);
    
    if (!targetPrinter) {
      throw new Error(`Printer not found: ${job.printerId || job.printerName}`);
    }
    
    // Send job started status
    if (socket && socket.connected) {
      socket.emit('print:job:started', {
        jobId: job.id,
        printerId: targetPrinter.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Process the print job based on printer type
    let success = false;
    if (isReceiptPrinter(targetPrinter)) {
      success = await testReceiptPrinter(targetPrinter);
    } else if (targetPrinter.connection === 'USB' && targetPrinter.device) {
      success = await testUSBPrinter(targetPrinter);
    } else if (targetPrinter.connection === 'network' || targetPrinter.type === 'network' || (targetPrinter.uri && targetPrinter.uri.includes('socket://'))) {
      success = await testNetworkPrinter(targetPrinter);
    } else if (targetPrinter.systemPrinter) {
      success = await testSystemPrinter(targetPrinter);
    } else {
      success = await testGenericPrinter(targetPrinter);
    }
    
    // Send job completion status
    if (socket && socket.connected) {
      socket.emit('print:job:completed', {
        jobId: job.id,
        printerId: targetPrinter.id,
        success: success,
        timestamp: new Date().toISOString()
      });
    }
    
    log.info(`Print job ${job.id} completed with success: ${success}`);
    
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

// ================================
// Physical Printing Handlers
// ================================

// Initialize print queue service globally
// Note: printQueueService is already declared at the top of the file

function initializePrintQueue() {
  if (!printQueueService) {
    const PrintQueueService = require('./services/print-queue.service');
    printQueueService = new PrintQueueService();
    printQueueService.initialize();

    // Listen to print queue events
    printQueueService.on('job-started', (job) => {
      log.info(`📋 [QUEUE] Job ${job.id} started`);
      if (socket && socket.connected) {
        socket.emit('print:queue:job-started', job);
      }
    });

    printQueueService.on('job-completed', (job) => {
      log.info(`✅ [QUEUE] Job ${job.id} completed`);
      if (socket && socket.connected) {
        socket.emit('print:queue:job-completed', job);
      }
    });

    printQueueService.on('job-failed', (job) => {
      log.error(`❌ [QUEUE] Job ${job.id} failed`);
      if (socket && socket.connected) {
        socket.emit('print:queue:job-failed', job);
      }
    });

    log.info('✅ [PRINT-QUEUE] Print queue service initialized');
  }
  return printQueueService;
}

/**
 * Handle physical printer test
 */
async function handlePhysicalPrinterTest(data) {
  const startTime = Date.now();

  try {
    log.info(`🖨️ [PHYSICAL-TEST] Testing printer: ${data.printerName} (ID: ${data.printerId})`);

    // Initialize print queue if needed
    const queue = initializePrintQueue();

    // Find the printer configuration
    const discoveredPrinters = await discoverRealSystemPrinters();
    let printerConfig = discoveredPrinters.find(p =>
      p.id === data.printerId || p.name === data.printerName
    );

    if (!printerConfig) {
      // Create a basic config from the data if printer not found in discovery
      printerConfig = {
        id: data.printerId || data.printerName,
        name: data.printerName || data.printerId,
        type: data.type || 'thermal',
        connection: data.connection || 'usb',
        ip: data.ip,
        port: data.port,
        capabilities: data.capabilities || ['text'],
        systemPrinter: true
      };

      log.info(`⚠️ [PHYSICAL-TEST] Printer not found in discovery, using provided config: ${printerConfig.name}`);
    }

    // Enhanced test data
    const testData = {
      branchName: data.branchName || 'Test Branch',
      companyName: data.companyName || 'Restaurant Platform',
      testType: 'dashboard_test',
      requestTime: new Date().toISOString(),
      printerInfo: {
        name: printerConfig.name,
        type: printerConfig.type,
        connection: printerConfig.connection
      }
    };

    // Add test job to queue with high priority
    const jobId = queue.addTestPrintJob(printerConfig, testData, 1);

    log.info(`📥 [PHYSICAL-TEST] Test job ${jobId} queued for printer ${printerConfig.name}`);

    // Wait for job completion (with shorter timeout for better UX)
    const result = await waitForJobCompletion(queue, jobId, 20000); // 20 seconds

    const processingTime = Date.now() - startTime;

    if (result.success) {
      log.info(`✅ [PHYSICAL-TEST] Test successful for ${printerConfig.name} in ${processingTime}ms`);

      return {
        success: true,
        message: `Physical printer test successful - ${printerConfig.name}`,
        jobId: jobId,
        printerId: printerConfig.id,
        printerName: printerConfig.name,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        details: {
          printerType: printerConfig.type,
          connection: printerConfig.connection,
          queuePosition: 'Priority (Test)',
          testData: testData
        }
      };
    } else {
      log.warn(`⚠️ [PHYSICAL-TEST] Test failed for ${printerConfig.name}: ${result.message}`);

      return {
        success: false,
        message: result.message || 'Physical printer test failed',
        error: result.error || 'Unknown error',
        jobId: jobId,
        printerId: printerConfig.id,
        printerName: printerConfig.name,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Check printer power and connection',
          'Verify printer drivers are installed',
          'Make sure printer is not used by another application',
          `Connection type: ${printerConfig.connection}`,
          `Printer type: ${printerConfig.type}`
        ]
      };
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error(`❌ [PHYSICAL-TEST] Test failed after ${processingTime}ms:`, error);

    throw new Error(`Physical printer test failed: ${error.message}`);
  }
}

/**
 * Handle physical print job
 */
async function handlePhysicalPrintJob(printJob) {
  try {
    log.info(`📋 [PHYSICAL-JOB] Processing job: ${printJob.id} (${printJob.type})`);

    // Initialize print queue if needed
    const queue = initializePrintQueue();

    // Find the printer configuration
    const discoveredPrinters = await discoverRealSystemPrinters();
    let printerConfig = discoveredPrinters.find(p =>
      p.id === printJob.printerId || p.name === printJob.printerName
    );

    if (!printerConfig) {
      throw new Error(`Printer not found: ${printJob.printerId || printJob.printerName}`);
    }

    // Add job to queue based on type
    let jobId;
    switch (printJob.type) {
      case 'receipt':
        jobId = queue.addReceiptPrintJob(printerConfig, printJob.receiptData, printJob.priority || 3);
        break;
      case 'kitchen_order':
        jobId = queue.addKitchenOrderPrintJob(printerConfig, printJob.orderData, printJob.priority || 2);
        break;
      case 'test':
        jobId = queue.addTestPrintJob(printerConfig, printJob.testData, printJob.priority || 1);
        break;
      default:
        throw new Error(`Unsupported job type: ${printJob.type}`);
    }

    log.info(`📥 [PHYSICAL-JOB] Job ${jobId} queued for printer ${printerConfig.name}`);

    // Wait for job completion (with timeout)
    const result = await waitForJobCompletion(queue, jobId, 60000);

    return {
      success: result.success,
      message: result.message || 'Physical print job completed',
      jobId: jobId,
      originalJobId: printJob.id,
      printerId: printerConfig.id,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    log.error(`❌ [PHYSICAL-JOB] Job failed:`, error);
    throw error;
  }
}

/**
 * Handle raw print command
 */
async function handleRawPrint(rawPrintData) {
  try {
    log.info(`🔧 [RAW-PRINT] Processing raw print for: ${rawPrintData.printerName}`);

    // Get Physical Printer Service
    const PhysicalPrinterService = require('./services/physical-printer.service');
    const physicalPrinter = new PhysicalPrinterService();

    // Find the printer configuration
    const discoveredPrinters = await discoverRealSystemPrinters();
    let printerConfig = discoveredPrinters.find(p =>
      p.name === rawPrintData.printerName
    );

    if (!printerConfig) {
      throw new Error(`Printer not found: ${rawPrintData.printerName}`);
    }

    // Create a simple test job with the raw data
    const testData = {
      title: rawPrintData.title || 'RAW PRINT',
      content: rawPrintData.data || 'Raw print test',
      timestamp: new Date().toISOString()
    };

    // Execute the print directly
    const result = await physicalPrinter.printTestPage(printerConfig, testData);

    log.info(`✅ [RAW-PRINT] Raw print completed for ${rawPrintData.printerName}`);

    return {
      success: result.success,
      message: result.message || 'Raw print completed',
      printerName: rawPrintData.printerName,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    log.error(`❌ [RAW-PRINT] Raw print failed:`, error);
    throw error;
  }
}

/**
 * Get print queue status
 */
function getPrintQueueStatus(printerId) {
  const queue = initializePrintQueue();

  if (printerId) {
    return queue.getQueueStatus(printerId);
  } else {
    return {
      allQueues: queue.getAllQueueStatuses(),
      statistics: queue.getStatistics()
    };
  }
}

/**
 * Wait for job completion with timeout
 */
async function waitForJobCompletion(queue, jobId, timeout = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkJob = () => {
      const job = queue.getJobStatus(jobId);

      if (job.status === 'completed') {
        resolve({
          success: true,
          message: 'Print job completed successfully',
          job: job
        });
        return;
      } else if (job.status === 'failed') {
        resolve({
          success: false,
          message: job.error || 'Print job failed',
          job: job
        });
        return;
      } else if (Date.now() - startTime > timeout) {
        resolve({
          success: false,
          message: 'Print job timeout',
          job: job
        });
        return;
      }

      // Check again in 500ms
      setTimeout(checkJob, 500);
    };

    checkJob();
  });
}

// Disconnect WebSocket when app closes
function disconnectWebSocket() {
  if (socket) {
    log.info('Disconnecting WebSocket...');
    socket.disconnect();
    socket = null;
  }

  // Stop print queue service
  if (printQueueService) {
    printQueueService.stop();
    printQueueService = null;
  }
}

// ================================
// Phase 3: Discovery Service Helper Functions
// ================================

/**
 * Handle discovery control commands from WebSocket
 */
function handleDiscoveryCommand(command) {
  // Note: discoveryService is available globally from main.js
  const { app } = require('electron');
  const mainProcess = app;

  switch (command.action) {
    case 'start':
      if (global.discoveryService) {
        global.discoveryService.start();
        log.info('✅ [DISCOVERY-CONTROL] Discovery service started via WebSocket');
      } else {
        throw new Error('Discovery service not available');
      }
      break;

    case 'stop':
      if (global.discoveryService) {
        global.discoveryService.stop();
        log.info('🛑 [DISCOVERY-CONTROL] Discovery service stopped via WebSocket');
      } else {
        throw new Error('Discovery service not available');
      }
      break;

    case 'clear-cache':
      if (global.discoveryService) {
        global.discoveryService.clearCache();
        log.info('🗑️ [DISCOVERY-CONTROL] Printer cache cleared via WebSocket');
      } else {
        throw new Error('Discovery service not available');
      }
      break;

    default:
      throw new Error(`Unknown discovery command: ${command.action}`);
  }
}

/**
 * Get discovery service status
 */
function getDiscoveryServiceStatus() {
  if (global.discoveryService) {
    return global.discoveryService.getStatus();
  } else {
    return {
      available: false,
      isRunning: false,
      error: 'Discovery service not initialized'
    };
  }
}

/**
 * Get cached printers from discovery service
 */
function getCachedPrinters() {
  if (global.discoveryService) {
    return global.discoveryService.getCachedPrinters();
  } else {
    return [];
  }
}

/**
 * Force discovery now
 */
async function forceDiscoveryNow() {
  if (global.discoveryService) {
    await global.discoveryService.forceDiscovery();
    const printers = global.discoveryService.getCachedPrinters();
    return {
      discovered: printers.length,
      printers: printers,
      message: 'Force discovery completed successfully'
    };
  } else {
    throw new Error('Discovery service not available');
  }
}

/**
 * Update discovery configuration
 */
function updateDiscoveryConfiguration(newConfig) {
  if (global.discoveryService) {
    global.discoveryService.updateConfiguration(newConfig);
    log.info('⚙️ [DISCOVERY-CONFIG] Configuration updated:', newConfig);
  } else {
    throw new Error('Discovery service not available');
  }
}

/**
 * Enhanced printer discovery with real-time WebSocket updates
 * This replaces the previous sendCurrentPrintersToBackend function
 */
async function sendCurrentPrintersToBackendEnhanced() {
  if (!socket || !socket.connected) {
    log.warn('Cannot send printers: WebSocket not connected');
    return;
  }

  try {
    log.info('🔍 [ENHANCED-DISCOVERY] Starting real-time discovery with WebSocket updates...');

    // Get current printers from the discovery service cache
    const cachedPrinters = getCachedPrinters();

    if (cachedPrinters.length === 0) {
      log.info('⚠️ [ENHANCED-DISCOVERY] No cached printers available, triggering discovery...');
      // Force a discovery if cache is empty
      await forceDiscoveryNow();
    }

    const currentPrinters = getCachedPrinters();

    // Send each printer as a real-time update
    for (const printer of currentPrinters) {
      const printerData = {
        id: printer.id,
        name: printer.name,
        type: printer.type || 'thermal',
        connection: printer.connection || 'usb',
        status: printer.status || 'online',
        branchId: activeBranchId,
        discoveredBy: deviceInfo?.deviceId || 'desktop_app',
        discoveryMethod: printer.discoveryMethod || 'background_service',
        timestamp: new Date().toISOString(),
        capabilities: printer.capabilities || ['text'],
        manufacturer: printer.manufacturer,
        model: printer.model,
        lastSeen: printer.lastSeen,
        enhanced: true
      };

      // Send WebSocket event for real-time status updates
      socket.emit('printer:discovered:enhanced', printerData);
      log.info(`📡 [ENHANCED-DISCOVERY] Sent enhanced printer data: ${printer.name} (${printer.type})`);
    }

    // Send discovery summary
    socket.emit('discovery:enhanced-summary', {
      totalPrinters: currentPrinters.length,
      discoveryService: getDiscoveryServiceStatus(),
      timestamp: new Date().toISOString(),
      branchId: activeBranchId,
      deviceId: deviceInfo?.deviceId
    });

    log.info(`✅ [ENHANCED-DISCOVERY] Enhanced discovery completed - ${currentPrinters.length} printers sent with real-time updates`);

  } catch (error) {
    log.error('❌ [ENHANCED-DISCOVERY] Enhanced discovery failed:', error);

    // Fallback to original discovery method
    try {
      log.info('🔄 [ENHANCED-DISCOVERY] Falling back to original discovery method...');
      await sendCurrentPrintersToBackend();
    } catch (fallbackError) {
      log.error('❌ [ENHANCED-DISCOVERY] Fallback discovery also failed:', fallbackError);
    }
  }
}

// Make discovery service globally accessible for WebSocket handlers
if (typeof global !== 'undefined') {
  // This will be set by main.js when the discovery service is initialized
  global.discoveryService = null;
}

module.exports = {
  initializeWebSocketModule,
  connectToBackendWebSocket,
  sendCurrentPrintersToBackend,
  sendCurrentPrintersToBackendEnhanced,
  processPrintJob,
  disconnectWebSocket,
  discoverRealSystemPrinters,
  discoverPrintersViaOS,
  discoverUSBPrinters,
  // Phase 3 exports
  handleDiscoveryCommand,
  getDiscoveryServiceStatus,
  getCachedPrinters,
  forceDiscoveryNow,
  updateDiscoveryConfiguration
};