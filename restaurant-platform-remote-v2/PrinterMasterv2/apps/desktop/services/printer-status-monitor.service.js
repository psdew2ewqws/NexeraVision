const { EventEmitter } = require('events');

/**
 * Printer Status Monitor Service
 * Monitors printer health, connectivity, and performance
 */
class PrinterStatusMonitorService extends EventEmitter {
  constructor() {
    super();
    this.printers = new Map(); // Map of printerId -> printer status
    this.healthChecks = new Map(); // Map of printerId -> last health check
    this.monitoringInterval = null;
    this.isRunning = false;
    this.log = console;
  }

  /**
   * Initialize the status monitor
   */
  initialize(logger = null) {
    this.log = logger || console;
    this.isRunning = true;

    // Start monitoring every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    this.log.info('🔍 [STATUS-MONITOR] Printer status monitoring service initialized');
  }

  /**
   * Stop the status monitor
   */
  stop() {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.log.info('🛑 [STATUS-MONITOR] Printer status monitoring service stopped');
  }

  /**
   * Register a printer for monitoring
   */
  registerPrinter(printerConfig) {
    const printerId = printerConfig.id || printerConfig.name;

    const printerStatus = {
      id: printerId,
      name: printerConfig.name,
      type: printerConfig.type,
      connection: printerConfig.connection,
      status: 'unknown',
      lastSeen: new Date(),
      isOnline: false,
      healthScore: 0,
      errorCount: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageResponseTime: 0,
      lastError: null,
      capabilities: printerConfig.capabilities || [],
      config: printerConfig
    };

    this.printers.set(printerId, printerStatus);
    this.healthChecks.set(printerId, {
      lastCheck: null,
      nextCheck: new Date(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    });

    this.log.info(`📋 [STATUS-MONITOR] Registered printer for monitoring: ${printerConfig.name}`);
    this.emit('printer-registered', printerStatus);

    return printerStatus;
  }

  /**
   * Unregister a printer from monitoring
   */
  unregisterPrinter(printerId) {
    const printer = this.printers.get(printerId);
    if (printer) {
      this.printers.delete(printerId);
      this.healthChecks.delete(printerId);
      this.log.info(`❌ [STATUS-MONITOR] Unregistered printer: ${printer.name}`);
      this.emit('printer-unregistered', printer);
    }
  }

  /**
   * Update printer status
   */
  updatePrinterStatus(printerId, statusUpdate) {
    const printer = this.printers.get(printerId);
    if (!printer) {
      this.log.warn(`⚠️ [STATUS-MONITOR] Attempted to update unknown printer: ${printerId}`);
      return;
    }

    // Update printer status
    Object.assign(printer, statusUpdate, {
      lastSeen: new Date()
    });

    // Update health score based on recent activity
    this.calculateHealthScore(printer);

    this.log.debug(`📊 [STATUS-MONITOR] Updated status for ${printer.name}: ${printer.status}`);
    this.emit('status-updated', printer);
  }

  /**
   * Record a successful print job
   */
  recordSuccessfulJob(printerId, responseTime = 0) {
    const printer = this.printers.get(printerId);
    if (!printer) return;

    printer.successfulJobs++;
    printer.lastSeen = new Date();
    printer.status = 'online';
    printer.isOnline = true;
    printer.errorCount = Math.max(0, printer.errorCount - 1); // Reduce error count on success

    // Update average response time
    if (responseTime > 0) {
      const totalJobs = printer.successfulJobs + printer.failedJobs;
      printer.averageResponseTime = ((printer.averageResponseTime * (totalJobs - 1)) + responseTime) / totalJobs;
    }

    // Update health check
    const healthCheck = this.healthChecks.get(printerId);
    if (healthCheck) {
      healthCheck.consecutiveSuccesses++;
      healthCheck.consecutiveFailures = 0;
    }

    this.calculateHealthScore(printer);
    this.emit('job-success', { printerId, printer, responseTime });
  }

  /**
   * Record a failed print job
   */
  recordFailedJob(printerId, error) {
    const printer = this.printers.get(printerId);
    if (!printer) return;

    printer.failedJobs++;
    printer.errorCount++;
    printer.lastError = {
      message: error.message || 'Unknown error',
      timestamp: new Date(),
      type: error.name || 'PrintError'
    };

    // Update health check
    const healthCheck = this.healthChecks.get(printerId);
    if (healthCheck) {
      healthCheck.consecutiveFailures++;
      healthCheck.consecutiveSuccesses = 0;

      // Mark as offline after 3 consecutive failures
      if (healthCheck.consecutiveFailures >= 3) {
        printer.status = 'offline';
        printer.isOnline = false;
      }
    }

    this.calculateHealthScore(printer);
    this.emit('job-failure', { printerId, printer, error });
  }

  /**
   * Perform health checks on all registered printers
   */
  async performHealthChecks() {
    if (!this.isRunning) return;

    const now = new Date();

    for (const [printerId, printer] of this.printers) {
      const healthCheck = this.healthChecks.get(printerId);

      // Skip if next check time hasn't arrived
      if (healthCheck.nextCheck > now) continue;

      try {
        await this.performSingleHealthCheck(printerId);
        healthCheck.lastCheck = now;
        healthCheck.nextCheck = new Date(now.getTime() + 60000); // Next check in 1 minute

      } catch (error) {
        this.log.error(`❌ [STATUS-MONITOR] Health check failed for ${printer.name}:`, error);
        this.recordFailedJob(printerId, error);
      }
    }
  }

  /**
   * Perform health check on a single printer
   */
  async performSingleHealthCheck(printerId) {
    const printer = this.printers.get(printerId);
    if (!printer) return;

    const startTime = Date.now();

    try {
      // Basic connectivity check based on connection type
      let isHealthy = false;

      switch (printer.connection) {
        case 'usb':
          isHealthy = await this.checkUSBPrinterHealth(printer);
          break;
        case 'network':
          isHealthy = await this.checkNetworkPrinterHealth(printer);
          break;
        case 'bluetooth':
          isHealthy = await this.checkBluetoothPrinterHealth(printer);
          break;
        default:
          isHealthy = await this.checkGenericPrinterHealth(printer);
      }

      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        this.updatePrinterStatus(printerId, {
          status: 'online',
          isOnline: true
        });
        this.recordSuccessfulJob(printerId, responseTime);
      } else {
        throw new Error('Health check failed - printer not responding');
      }

    } catch (error) {
      this.updatePrinterStatus(printerId, {
        status: 'error',
        isOnline: false
      });
      this.recordFailedJob(printerId, error);
    }
  }

  /**
   * Check USB printer health
   */
  async checkUSBPrinterHealth(printer) {
    // For USB printers, check if the device is still connected
    // This is a simplified check - in reality, you'd query USB devices
    return true; // Assume healthy for now
  }

  /**
   * Check network printer health
   */
  async checkNetworkPrinterHealth(printer) {
    const net = require('net');

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);

      socket.connect(printer.config.port || 9100, printer.config.ip, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Check Bluetooth printer health
   */
  async checkBluetoothPrinterHealth(printer) {
    // Simplified Bluetooth check
    return true; // Assume healthy for now
  }

  /**
   * Check generic printer health
   */
  async checkGenericPrinterHealth(printer) {
    // Generic health check
    return true; // Assume healthy for now
  }

  /**
   * Calculate health score (0-100)
   */
  calculateHealthScore(printer) {
    let score = 100;

    // Reduce score based on error count
    score -= Math.min(printer.errorCount * 5, 50);

    // Factor in success rate
    const totalJobs = printer.successfulJobs + printer.failedJobs;
    if (totalJobs > 0) {
      const successRate = (printer.successfulJobs / totalJobs) * 100;
      score = (score + successRate) / 2;
    }

    // Factor in recent failures
    const healthCheck = this.healthChecks.get(printer.id);
    if (healthCheck) {
      if (healthCheck.consecutiveFailures > 0) {
        score -= healthCheck.consecutiveFailures * 10;
      }
      if (healthCheck.consecutiveSuccesses > 3) {
        score += 10; // Bonus for consistent success
      }
    }

    // Factor in response time (penalize slow printers)
    if (printer.averageResponseTime > 10000) { // More than 10 seconds
      score -= 20;
    }

    printer.healthScore = Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get printer status
   */
  getPrinterStatus(printerId) {
    const printer = this.printers.get(printerId);
    const healthCheck = this.healthChecks.get(printerId);

    if (!printer) {
      return {
        error: 'Printer not found',
        printerId
      };
    }

    return {
      ...printer,
      healthCheck: healthCheck ? {
        lastCheck: healthCheck.lastCheck,
        nextCheck: healthCheck.nextCheck,
        consecutiveFailures: healthCheck.consecutiveFailures,
        consecutiveSuccesses: healthCheck.consecutiveSuccesses
      } : null
    };
  }

  /**
   * Get all printer statuses
   */
  getAllPrinterStatuses() {
    const statuses = [];

    for (const printerId of this.printers.keys()) {
      statuses.push(this.getPrinterStatus(printerId));
    }

    return statuses;
  }

  /**
   * Get system statistics
   */
  getSystemStatistics() {
    let totalPrinters = 0;
    let onlinePrinters = 0;
    let totalJobs = 0;
    let successfulJobs = 0;
    let failedJobs = 0;
    let totalResponseTime = 0;
    let healthyPrinters = 0;

    for (const printer of this.printers.values()) {
      totalPrinters++;
      if (printer.isOnline) onlinePrinters++;
      if (printer.healthScore >= 70) healthyPrinters++;

      totalJobs += printer.successfulJobs + printer.failedJobs;
      successfulJobs += printer.successfulJobs;
      failedJobs += printer.failedJobs;
      totalResponseTime += printer.averageResponseTime;
    }

    const avgResponseTime = totalPrinters > 0 ? totalResponseTime / totalPrinters : 0;
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

    return {
      totalPrinters,
      onlinePrinters,
      offlinePrinters: totalPrinters - onlinePrinters,
      healthyPrinters,
      unhealthyPrinters: totalPrinters - healthyPrinters,
      totalJobs,
      successfulJobs,
      failedJobs,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime),
      systemHealth: healthyPrinters > 0 ? Math.round((healthyPrinters / totalPrinters) * 100) : 0,
      timestamp: new Date()
    };
  }

  /**
   * Get printers that need attention
   */
  getPrintersNeedingAttention() {
    const problemPrinters = [];

    for (const printer of this.printers.values()) {
      const issues = [];

      if (!printer.isOnline) {
        issues.push('offline');
      }

      if (printer.healthScore < 50) {
        issues.push('poor_health');
      }

      if (printer.errorCount > 5) {
        issues.push('high_error_rate');
      }

      if (printer.averageResponseTime > 15000) {
        issues.push('slow_response');
      }

      const healthCheck = this.healthChecks.get(printer.id);
      if (healthCheck && healthCheck.consecutiveFailures >= 2) {
        issues.push('consecutive_failures');
      }

      if (issues.length > 0) {
        problemPrinters.push({
          ...printer,
          issues,
          priority: issues.includes('offline') ? 'high' :
                   issues.includes('poor_health') ? 'medium' : 'low'
        });
      }
    }

    return problemPrinters.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = PrinterStatusMonitorService;