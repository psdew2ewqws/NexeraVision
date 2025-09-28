#!/usr/bin/env node

/**
 * PrinterMaster Persistent Background Service
 *
 * This is the main entry point for the headless background service.
 * It runs independently of the Electron GUI and provides:
 * - HTTP API endpoints for printing operations
 * - Health check endpoints
 * - USB printer hot-plug monitoring
 * - WebSocket connections to backend
 * - Auto-restart capabilities
 * - Enterprise-grade logging and monitoring
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Core service modules
const CircuitBreaker = require('./circuit-breaker');
const ConnectionPool = require('./connection-pool');
const RateLimiter = require('./rate-limiter');
const HealthCheck = require('./health-check');
const USBPrinterManager = require('./usb-printer-manager');
const GracefulShutdown = require('./graceful-shutdown');

// Service-specific configuration (headless mode)
const config = require('./config-service.js');
const {
  initializeWebSocketModule,
  connectToBackendWebSocket,
  sendCurrentPrintersToBackend,
  discoverRealSystemPrinters
} = require('./websocket-service.js');

class PrinterMasterService {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = process.env.PRINTER_SERVICE_PORT || 8182;
    this.isShuttingDown = false;
    this.healthCheck = null;
    this.usbManager = null;
    this.gracefulShutdown = null;
    this.websocketConnected = false;
    this.licenseData = null;
    this.circuitBreaker = null;
    this.connectionPool = null;
    this.rateLimiter = null;
    this.correlationId = this.generateCorrelationId();

    // Service statistics
    this.stats = {
      startTime: new Date(),
      requestCount: 0,
      printJobCount: 0,
      errorCount: 0,
      lastError: null,
      restartCount: parseInt(process.env.PM2_RESTART_COUNT || '0'),
      uptime: 0
    };

    // Error handling enhancement
    this.errorCategories = {
      RECOVERABLE: 'recoverable',
      FATAL: 'fatal',
      NETWORK: 'network',
      HARDWARE: 'hardware'
    };

    // Setup logging
    this.setupLogging();

    // Initialize service
    this.initialize();
  }

  setupLogging() {
    // Use electron-log for consistency but configure for headless mode
    const log = require('electron-log');

    // Configure logging for service mode
    log.transports.file.level = process.env.LOG_LEVEL || 'info';
    log.transports.console.level = process.env.LOG_LEVEL || 'info';
    log.transports.file.fileName = 'printermaster-service.log';
    log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Set custom log file path
    log.transports.file.file = path.join(logsDir, 'printermaster-service.log');

    this.log = log;
    this.log.info('🚀 PrinterMaster Service logging initialized');
  }

  async initialize() {
    try {
      this.log.info('🔧 Initializing PrinterMaster Background Service...');

      // Setup Express middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Initialize health check system
      this.healthCheck = new HealthCheck(this);
      await this.healthCheck.initialize();

      // Initialize USB printer manager
      this.usbManager = new USBPrinterManager(this);
      await this.usbManager.initialize();

      // Initialize graceful shutdown handler
      this.gracefulShutdown = new GracefulShutdown(this);
      this.gracefulShutdown.initialize();

      // Initialize WebSocket module with service context
      initializeWebSocketModule({
        log: this.log,
        mainWindow: null, // No GUI in service mode
        config: config
      });

      // Load license and connect to backend
      await this.loadLicenseAndConnect();

      // Start the HTTP server
      await this.startServer();

      this.log.info('✅ PrinterMaster Background Service fully initialized');

    } catch (error) {
      this.log.error('❌ Service initialization failed:', error);
      this.stats.errorCount++;
      this.stats.lastError = error.message;
      process.exit(1);
    }
  }

  setupMiddleware() {
    // CORS for web interface access
    this.app.use(cors({
      origin: [
        'http://localhost:3002',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ],
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging and statistics
    this.app.use((req, res, next) => {
      this.stats.requestCount++;
      this.log.debug(`📥 ${req.method} ${req.path} from ${req.ip}`);
      next();
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      this.stats.errorCount++;
      this.stats.lastError = err.message;
      this.log.error('🚨 Request error:', err);
      res.status(500).json({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupRoutes() {
    // Health check endpoints (critical for monitoring)
    this.app.get('/health', (req, res) => {
      const health = this.healthCheck.getHealthStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    this.app.get('/ready', (req, res) => {
      const ready = this.healthCheck.getReadinessStatus();
      res.status(ready.ready ? 200 : 503).json(ready);
    });

    this.app.get('/metrics', (req, res) => {
      const metrics = this.getServiceMetrics();
      res.json(metrics);
    });

    // Printer management endpoints
    this.app.get('/printers', async (req, res) => {
      try {
        const printers = await this.discoverPrinters();
        res.json({
          success: true,
          data: printers,
          count: printers.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.log.error('❌ Printer discovery failed:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.get('/printers/status', (req, res) => {
      const status = this.usbManager.getPrinterStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    });

    this.app.post('/printers/:printerId/test', async (req, res) => {
      try {
        const { printerId } = req.params;
        const result = await this.testPrinter(printerId);
        this.stats.printJobCount++;

        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.log.error(`❌ Printer test failed for ${req.params.printerId}:`, error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.post('/print', async (req, res) => {
      try {
        const printJob = req.body;
        const result = await this.processPrintJob(printJob);
        this.stats.printJobCount++;

        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.log.error('❌ Print job failed:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Service management endpoints
    this.app.get('/service/info', (req, res) => {
      res.json({
        success: true,
        data: {
          name: 'PrinterMaster Background Service',
          version: process.env.npm_package_version || '2.0.0',
          pid: process.pid,
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: this.getUptime(),
          stats: this.stats,
          websocketConnected: this.websocketConnected,
          licenseValid: !!this.licenseData
        },
        timestamp: new Date().toISOString()
      });
    });

    this.app.post('/service/restart', (req, res) => {
      this.log.info('🔄 Service restart requested via API');
      res.json({
        success: true,
        message: 'Service restart initiated',
        timestamp: new Date().toISOString()
      });

      // Graceful restart with 1 second delay
      setTimeout(() => {
        process.exit(0); // PM2 will restart automatically
      }, 1000);
    });

    this.app.get('/service/logs', (req, res) => {
      try {
        const logFile = path.join(__dirname, '../logs/printermaster-service.log');
        const lines = parseInt(req.query.lines) || 100;

        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const logLines = content.split('\n').slice(-lines);

          res.json({
            success: true,
            data: {
              lines: logLines,
              file: logFile,
              totalLines: content.split('\n').length
            },
            timestamp: new Date().toISOString()
          });
        } else {
          res.json({
            success: true,
            data: {
              lines: ['Log file not found'],
              file: logFile
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'PrinterMaster Background Service',
        version: process.env.npm_package_version || '2.0.0',
        endpoints: {
          health: '/health',
          ready: '/ready',
          metrics: '/metrics',
          printers: '/printers',
          printerStatus: '/printers/status',
          testPrinter: '/printers/:printerId/test',
          print: '/print',
          serviceInfo: '/service/info',
          serviceLogs: '/service/logs'
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  async loadLicenseAndConnect() {
    try {
      this.log.info('📋 Loading license data for service mode...');

      // Try to load stored license from Electron app location
      const licenseData = await this.loadStoredLicense();

      if (licenseData) {
        this.licenseData = licenseData;
        this.log.info('✅ License loaded successfully');

        // Connect to backend WebSocket
        try {
          await connectToBackendWebSocket(licenseData);
          this.websocketConnected = true;
          this.log.info('🔌 WebSocket connected to backend');

          // Start periodic printer discovery
          this.startPrinterDiscovery();

        } catch (wsError) {
          this.log.warn('⚠️ WebSocket connection failed:', wsError.message);
          // Service can still operate without WebSocket
        }
      } else {
        this.log.warn('⚠️ No license found - service running in limited mode');
      }
    } catch (error) {
      this.log.error('❌ License loading failed:', error);
      // Service can still provide basic functionality
    }
  }

  async loadStoredLicense() {
    try {
      const os = require('os');
      const path = require('path');

      // Try multiple possible locations for license file
      const possiblePaths = [
        path.join(os.homedir(), '.printermaster', 'licenses', 'current.license'),
        path.join(__dirname, '../licenses/current.license'),
        path.join(process.cwd(), 'licenses/current.license')
      ];

      for (const licensePath of possiblePaths) {
        if (fs.existsSync(licensePath)) {
          const licenseData = fs.readFileSync(licensePath);

          // Try to decrypt/decode the license
          try {
            // Simple base64 decoding as fallback
            const licenseString = Buffer.from(licenseData.toString(), 'base64').toString();
            const license = JSON.parse(licenseString);
            this.log.info(`📄 License loaded from: ${licensePath}`);
            return license;
          } catch (decodeError) {
            // Try direct JSON parsing
            try {
              const license = JSON.parse(licenseData.toString());
              this.log.info(`📄 License loaded from: ${licensePath}`);
              return license;
            } catch (jsonError) {
              this.log.warn(`⚠️ Failed to parse license from ${licensePath}`);
            }
          }
        }
      }

      return null;
    } catch (error) {
      this.log.error('❌ License loading error:', error);
      return null;
    }
  }

  startPrinterDiscovery() {
    const discoveryInterval = 30000; // 30 seconds

    this.log.info(`🔍 Starting periodic printer discovery (${discoveryInterval}ms interval)`);

    // Initial discovery
    setTimeout(() => {
      this.sendPrintersToBackend();
    }, 2000);

    // Periodic discovery
    setInterval(() => {
      this.sendPrintersToBackend();
    }, discoveryInterval);
  }

  async sendPrintersToBackend() {
    try {
      if (this.websocketConnected) {
        await sendCurrentPrintersToBackend();
        this.log.debug('📡 Printer data sent to backend');
      }
    } catch (error) {
      this.log.error('❌ Failed to send printers to backend:', error);
    }
  }

  async discoverPrinters() {
    try {
      return await discoverRealSystemPrinters();
    } catch (error) {
      this.log.error('❌ Printer discovery failed:', error);
      return [];
    }
  }

  async testPrinter(printerId) {
    try {
      this.log.info(`🖨️ Testing printer: ${printerId}`);

      // Import test function from main app
      const { testPrinter } = require('../apps/desktop/main.js');
      const result = await testPrinter(printerId);

      this.log.info(`✅ Printer test completed: ${printerId}`);
      return result;
    } catch (error) {
      this.log.error(`❌ Printer test failed: ${printerId}`, error);
      throw error;
    }
  }

  async processPrintJob(printJob) {
    try {
      this.log.info(`📋 Processing print job: ${printJob.id || 'unknown'}`);

      // Find the target printer
      const printersResult = await this.discoverPrinters();
      const printers = printersResult.data || printersResult || [];
      const targetPrinter = printers.find(p =>
        p.id === printJob.printerId ||
        p.name === printJob.printerName ||
        p.name === printJob.printer
      );

      if (!targetPrinter) {
        throw new Error(`Printer not found: ${printJob.printerId || printJob.printerName || printJob.printer}`);
      }

      this.log.info(`🖨️ Printing to: ${targetPrinter.name}`);

      const printText = printJob.text || `Test Print Job: ${printJob.id || 'unknown'}`;

      try {
        // Check if this is a Ricoh network printer that needs special handling
        const isRicohPrinter = targetPrinter.name && targetPrinter.name.toLowerCase().includes('ricoh');

        if (isRicohPrinter) {
          // Try direct TCP socket printing for Ricoh network printers (bypasses CUPS and PostScript issues)
          try {
            const net = require('net');

            this.log.info(`🌐 Attempting direct socket printing to Ricoh: ${targetPrinter.name}`);

            // Try to extract IP from printer connection string or use known IP
            const ricohIP = '192.168.1.50'; // Known Ricoh printer IP
            const ricohPort = 9100; // Standard raw printing port

            return new Promise((resolve, reject) => {
              const client = new net.Socket();
              const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Socket timeout - falling back to lp command'));
              }, 5000);

              client.connect(ricohPort, ricohIP, () => {
                clearTimeout(timeout);
                this.log.info(`🔌 Connected to Ricoh printer via socket: ${ricohIP}:${ricohPort}`);

                // Send raw text data directly to printer
                const printData = `${printText}\n\f`; // Add form feed to eject page
                client.write(printData);

                // Wait a moment then close connection
                setTimeout(() => {
                  client.end();
                  resolve({
                    success: true,
                    printerId: targetPrinter.id,
                    printerName: targetPrinter.name,
                    jobId: `socket-${Date.now()}`,
                    command: `Direct TCP Socket to ${ricohIP}:${ricohPort}`,
                    output: `Print data sent directly via socket to Ricoh printer`
                  });
                }, 1000);
              });

              client.on('error', (err) => {
                clearTimeout(timeout);
                this.log.warn(`⚠️ Socket connection failed: ${err.message}`);
                reject(new Error(`Socket failed: ${err.message}`));
              });
            });

          } catch (socketError) {
            this.log.warn(`⚠️ Direct socket printing failed, falling back to lp: ${socketError.message}`);
            // Fall through to use lp command as backup
          }
        }

        // Fallback or standard printing using lp command
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        // Use raw mode for thermal printers, formatted mode for others
        const isThermalprintJob = targetPrinter.type === 'thermal';
        const lpCommand = isThermalprintJob
          ? `echo "${printText}" | lp -d "${targetPrinter.name}" -o raw -o job-sheets=none`
          : `echo "${printText}" | lp -d "${targetPrinter.name}" -o media=A4 -o job-sheets=none`;

        this.log.info(`🖨️ Using lp command: ${lpCommand}`);
        const { stdout, stderr } = await execPromise(lpCommand);

        if (stderr && !stderr.includes('request id')) {
          throw new Error(`Print command failed: ${stderr}`);
        }

        this.log.info(`✅ Print job sent successfully: ${stdout || 'Job queued'}`);

        return {
          success: true,
          printerId: targetPrinter.id,
          printerName: targetPrinter.name,
          jobId: printJob.id,
          command: lpCommand,
          output: stdout
        };

      } catch (execError) {
        this.log.error(`❌ Print execution failed:`, execError);
        throw execError;
      }

    } catch (error) {
      this.log.error('❌ Print job failed:', error);
      throw error;
    }
  }

  getServiceMetrics() {
    this.stats.uptime = this.getUptime();

    return {
      service: {
        name: 'PrinterMaster Background Service',
        version: process.env.npm_package_version || '2.0.0',
        pid: process.pid,
        uptime: this.stats.uptime,
        restartCount: this.stats.restartCount,
        startTime: this.stats.startTime
      },
      performance: {
        requestCount: this.stats.requestCount,
        printJobCount: this.stats.printJobCount,
        errorCount: this.stats.errorCount,
        requestsPerMinute: this.stats.requestCount / (this.stats.uptime / 60000),
        successRate: ((this.stats.requestCount - this.stats.errorCount) / this.stats.requestCount * 100) || 100
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      connectivity: {
        websocketConnected: this.websocketConnected,
        licenseValid: !!this.licenseData,
        backendConnected: this.websocketConnected
      },
      health: this.healthCheck ? this.healthCheck.getHealthStatus() : { status: 'unknown' },
      timestamp: new Date().toISOString()
    };
  }

  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    // Network-related errors
    if (message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('timeout') ||
        message.includes('network')) {
      return this.errorCategories.NETWORK;
    }

    // Hardware-related errors
    if (message.includes('usb') ||
        message.includes('printer') ||
        message.includes('device')) {
      return this.errorCategories.HARDWARE;
    }

    // Fatal system errors
    if (message.includes('out of memory') ||
        message.includes('permission denied') ||
        message.includes('eacces')) {
      return this.errorCategories.FATAL;
    }

    // Default to recoverable
    return this.errorCategories.RECOVERABLE;
  }

  validatePrintJobInput(printJob) {
    if (!printJob) {
      throw new Error('Print job data is required');
    }

    if (typeof printJob !== 'object') {
      throw new Error('Print job must be an object');
    }

    if (!printJob.printerId && !printJob.printerName) {
      throw new Error('Print job must specify printerId or printerName');
    }

    if (!printJob.content && !printJob.data) {
      throw new Error('Print job must contain content or data');
    }

    // Sanitize input
    if (printJob.content && typeof printJob.content === 'string') {
      if (printJob.content.length > 1000000) { // 1MB limit
        throw new Error('Print job content too large (max 1MB)');
      }
    }

    return true;
  }

  generateCorrelationId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getUptime() {
    return Date.now() - this.stats.startTime.getTime();
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app);

      this.server.listen(this.port, '0.0.0.0', () => {
        this.log.info(`🌐 PrinterMaster Service listening on port ${this.port}`);
        this.log.info(`📍 Health check: http://localhost:${this.port}/health`);
        this.log.info(`📊 Metrics: http://localhost:${this.port}/metrics`);
        this.log.info(`🖨️ Printers: http://localhost:${this.port}/printers`);
        resolve();
      });

      this.server.on('error', (error) => {
        this.log.error('❌ Server startup error:', error);
        reject(error);
      });
    });
  }

  async shutdown() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.log.info('🛑 Shutting down PrinterMaster Service...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            this.log.info('✅ HTTP server closed');
            resolve();
          });
        });
      }

      // Shutdown service components
      if (this.usbManager) {
        await this.usbManager.shutdown();
      }

      if (this.healthCheck) {
        this.healthCheck.shutdown();
      }

      this.log.info('✅ PrinterMaster Service shutdown complete');

    } catch (error) {
      this.log.error('❌ Shutdown error:', error);
    }
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new PrinterMasterService();

  // Handle process signals
  process.on('SIGTERM', async () => {
    console.log('📨 Received SIGTERM, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📨 Received SIGINT, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    service.log && service.log.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    service.log && service.log.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
  });
}

module.exports = PrinterMasterService;