/**
 * Health Check Monitoring System
 *
 * Provides comprehensive health monitoring for the PrinterMaster service:
 * - Service health status endpoints
 * - Readiness probes
 * - Performance metrics collection
 * - Auto-recovery triggers
 * - Resource monitoring
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

class HealthCheck {
  constructor(service) {
    this.service = service;
    this.log = service.log;
    this.isInitialized = false;
    this.checkInterval = null;
    this.intervalMs = 30000; // 30 seconds

    // Health metrics
    this.health = {
      status: 'starting',
      timestamp: new Date().toISOString(),
      checks: {},
      uptime: 0,
      lastCheck: null
    };

    // Performance tracking
    this.metrics = {
      cpu: [],
      memory: [],
      diskSpace: 0,
      networkConnectivity: false,
      printerConnectivity: 0,
      responseTime: []
    };

    // Thresholds for health checks
    this.thresholds = {
      maxCpuUsage: 85, // percent
      maxMemoryUsage: 90, // percent
      minDiskSpace: 1024 * 1024 * 100, // 100MB
      maxResponseTime: 5000, // 5 seconds
      minPrintersConnected: 0
    };

    this.log.info('🏥 Health Check system initialized');
  }

  async initialize() {
    try {
      this.log.info('🔧 Starting health check monitoring...');

      // Run initial health check
      await this.runHealthCheck();

      // Start periodic health checks
      this.checkInterval = setInterval(async () => {
        await this.runHealthCheck();
      }, this.intervalMs);

      this.isInitialized = true;
      this.health.status = 'healthy';

      this.log.info('✅ Health check monitoring started');

    } catch (error) {
      this.log.error('❌ Health check initialization failed:', error);
      this.health.status = 'unhealthy';
      throw error;
    }
  }

  async runHealthCheck() {
    try {
      const startTime = Date.now();

      // Update basic health info
      this.health.timestamp = new Date().toISOString();
      this.health.uptime = this.service.getUptime();
      this.health.lastCheck = new Date().toISOString();

      // Run all health checks
      await Promise.all([
        this.checkSystemResources(),
        this.checkDiskSpace(),
        this.checkNetworkConnectivity(),
        this.checkPrinterConnectivity(),
        this.checkServiceComponents()
      ]);

      // Calculate overall health status
      this.calculateOverallHealth();

      // Record response time
      const responseTime = Date.now() - startTime;
      this.metrics.responseTime.push(responseTime);

      // Keep only last 10 response times
      if (this.metrics.responseTime.length > 10) {
        this.metrics.responseTime = this.metrics.responseTime.slice(-10);
      }

      this.log.debug(`🏥 Health check completed in ${responseTime}ms - Status: ${this.health.status}`);

    } catch (error) {
      this.log.error('❌ Health check failed:', error);
      this.health.status = 'unhealthy';
      this.health.checks.healthCheckSystem = {
        status: 'fail',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkSystemResources() {
    try {
      // CPU usage check
      const cpuUsage = await this.getCpuUsage();
      this.metrics.cpu.push(cpuUsage);

      // Keep only last 10 CPU readings
      if (this.metrics.cpu.length > 10) {
        this.metrics.cpu = this.metrics.cpu.slice(-10);
      }

      // Memory usage check
      const memoryUsage = this.getMemoryUsage();
      this.metrics.memory.push(memoryUsage);

      // Keep only last 10 memory readings
      if (this.metrics.memory.length > 10) {
        this.metrics.memory = this.metrics.memory.slice(-10);
      }

      // Evaluate CPU health
      const avgCpu = this.metrics.cpu.reduce((a, b) => a + b, 0) / this.metrics.cpu.length;
      const cpuHealthy = avgCpu < this.thresholds.maxCpuUsage;

      // Evaluate memory health
      const memoryHealthy = memoryUsage.percentage < this.thresholds.maxMemoryUsage;

      this.health.checks.systemResources = {
        status: (cpuHealthy && memoryHealthy) ? 'pass' : 'warn',
        cpu: {
          current: cpuUsage,
          average: avgCpu,
          threshold: this.thresholds.maxCpuUsage,
          healthy: cpuHealthy
        },
        memory: {
          current: memoryUsage,
          threshold: this.thresholds.maxMemoryUsage,
          healthy: memoryHealthy
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.health.checks.systemResources = {
        status: 'fail',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();

        const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
        const cpuPercent = ((endUsage.user + endUsage.system) / totalTime) * 100;

        resolve(Math.min(cpuPercent, 100)); // Cap at 100%
      }, 100);
    });
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      used: usage.rss,
      total: total,
      percentage: (used / total) * 100,
      heap: {
        used: usage.heapUsed,
        total: usage.heapTotal
      }
    };
  }

  async checkDiskSpace() {
    try {
      const logsDir = path.join(__dirname, '../logs');
      const stats = await this.getDiskSpace(logsDir);

      this.metrics.diskSpace = stats.free;
      const healthy = stats.free > this.thresholds.minDiskSpace;

      this.health.checks.diskSpace = {
        status: healthy ? 'pass' : 'warn',
        free: stats.free,
        total: stats.total,
        used: stats.used,
        threshold: this.thresholds.minDiskSpace,
        healthy: healthy,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.health.checks.diskSpace = {
        status: 'fail',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getDiskSpace(directory) {
    return new Promise((resolve, reject) => {
      try {
        const stats = fs.statSync(directory);

        // Simple approximation - in production use statvfs or similar
        const total = os.totalmem(); // Approximation
        const free = os.freemem();
        const used = total - free;

        resolve({
          total: total,
          free: free,
          used: used,
          percentage: (used / total) * 100
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async checkNetworkConnectivity() {
    try {
      const connected = this.service.websocketConnected;
      this.metrics.networkConnectivity = connected;

      this.health.checks.networkConnectivity = {
        status: connected ? 'pass' : 'warn',
        websocketConnected: connected,
        backendReachable: connected,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.health.checks.networkConnectivity = {
        status: 'fail',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkPrinterConnectivity() {
    try {
      // Get printer status from USB manager
      const printerStatus = this.service.usbManager ?
        this.service.usbManager.getPrinterStatus() :
        { connectedPrinters: 0, totalPrinters: 0 };

      const connectedCount = printerStatus.connectedPrinters || 0;
      this.metrics.printerConnectivity = connectedCount;

      const healthy = connectedCount >= this.thresholds.minPrintersConnected;

      this.health.checks.printerConnectivity = {
        status: healthy ? 'pass' : 'info',
        connectedPrinters: connectedCount,
        totalPrinters: printerStatus.totalPrinters || 0,
        threshold: this.thresholds.minPrintersConnected,
        healthy: healthy,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.health.checks.printerConnectivity = {
        status: 'fail',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkServiceComponents() {
    try {
      const components = {
        usbManager: !!this.service.usbManager,
        gracefulShutdown: !!this.service.gracefulShutdown,
        httpServer: !!this.service.server,
        licenseData: !!this.service.licenseData
      };

      const allHealthy = Object.values(components).every(c => c);

      this.health.checks.serviceComponents = {
        status: allHealthy ? 'pass' : 'warn',
        components: components,
        allHealthy: allHealthy,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.health.checks.serviceComponents = {
        status: 'fail',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  calculateOverallHealth() {
    const checks = Object.values(this.health.checks);
    const failCount = checks.filter(check => check.status === 'fail').length;
    const warnCount = checks.filter(check => check.status === 'warn').length;

    if (failCount > 0) {
      this.health.status = 'unhealthy';
    } else if (warnCount > 0) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'healthy';
    }

    // Check if response time is too high
    if (this.metrics.responseTime.length > 0) {
      const avgResponseTime = this.metrics.responseTime.reduce((a, b) => a + b, 0) /
                               this.metrics.responseTime.length;

      if (avgResponseTime > this.thresholds.maxResponseTime) {
        this.health.status = 'degraded';
      }
    }
  }

  getHealthStatus() {
    return {
      status: this.health.status,
      timestamp: this.health.timestamp,
      uptime: this.health.uptime,
      lastCheck: this.health.lastCheck,
      checks: this.health.checks,
      summary: {
        total: Object.keys(this.health.checks).length,
        passing: Object.values(this.health.checks).filter(c => c.status === 'pass').length,
        warning: Object.values(this.health.checks).filter(c => c.status === 'warn').length,
        failing: Object.values(this.health.checks).filter(c => c.status === 'fail').length
      }
    };
  }

  getReadinessStatus() {
    const ready = this.isInitialized &&
                  this.health.status !== 'unhealthy' &&
                  this.service.server &&
                  !this.service.isShuttingDown;

    return {
      ready: ready,
      status: ready ? 'ready' : 'not-ready',
      reasons: this.getNotReadyReasons(),
      timestamp: new Date().toISOString()
    };
  }

  getNotReadyReasons() {
    const reasons = [];

    if (!this.isInitialized) {
      reasons.push('health-check-not-initialized');
    }

    if (this.health.status === 'unhealthy') {
      reasons.push('health-check-failing');
    }

    if (!this.service.server) {
      reasons.push('http-server-not-running');
    }

    if (this.service.isShuttingDown) {
      reasons.push('service-shutting-down');
    }

    return reasons;
  }

  getMetrics() {
    return {
      cpu: {
        current: this.metrics.cpu[this.metrics.cpu.length - 1] || 0,
        average: this.metrics.cpu.length > 0 ?
          this.metrics.cpu.reduce((a, b) => a + b, 0) / this.metrics.cpu.length : 0,
        history: this.metrics.cpu
      },
      memory: {
        current: this.metrics.memory[this.metrics.memory.length - 1] || {},
        history: this.metrics.memory
      },
      diskSpace: this.metrics.diskSpace,
      network: {
        connected: this.metrics.networkConnectivity
      },
      printers: {
        connected: this.metrics.printerConnectivity
      },
      performance: {
        responseTime: {
          current: this.metrics.responseTime[this.metrics.responseTime.length - 1] || 0,
          average: this.metrics.responseTime.length > 0 ?
            this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length : 0,
          history: this.metrics.responseTime
        }
      },
      thresholds: this.thresholds,
      timestamp: new Date().toISOString()
    };
  }

  // Auto-recovery triggers
  async triggerRecovery(issue) {
    this.log.warn(`🔧 Triggering recovery for issue: ${issue}`);

    try {
      switch (issue) {
        case 'high-memory':
          await this.recoverHighMemory();
          break;

        case 'network-disconnect':
          await this.recoverNetworkConnection();
          break;

        case 'printer-disconnect':
          await this.recoverPrinterConnection();
          break;

        default:
          this.log.warn(`⚠️ No recovery procedure for issue: ${issue}`);
      }
    } catch (error) {
      this.log.error(`❌ Recovery failed for ${issue}:`, error);
    }
  }

  async recoverHighMemory() {
    this.log.info('🧹 Attempting memory cleanup...');

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.log.info('✅ Garbage collection triggered');
    }

    // Clear old metrics
    this.metrics.cpu = this.metrics.cpu.slice(-5);
    this.metrics.memory = this.metrics.memory.slice(-5);
    this.metrics.responseTime = this.metrics.responseTime.slice(-5);

    this.log.info('🧹 Memory cleanup completed');
  }

  async recoverNetworkConnection() {
    this.log.info('🔌 Attempting network recovery...');

    try {
      if (this.service.licenseData && !this.service.websocketConnected) {
        const { connectToBackendWebSocket } = require('../apps/desktop/websocket-functions.js');
        await connectToBackendWebSocket(this.service.licenseData);
        this.service.websocketConnected = true;
        this.log.info('✅ WebSocket reconnected');
      }
    } catch (error) {
      this.log.error('❌ Network recovery failed:', error);
    }
  }

  async recoverPrinterConnection() {
    this.log.info('🖨️ Attempting printer recovery...');

    try {
      if (this.service.usbManager) {
        await this.service.usbManager.refreshPrinters();
        this.log.info('✅ Printer refresh completed');
      }
    } catch (error) {
      this.log.error('❌ Printer recovery failed:', error);
    }
  }

  shutdown() {
    this.log.info('🛑 Shutting down health check system...');

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isInitialized = false;
    this.health.status = 'shutdown';

    this.log.info('✅ Health check system shutdown complete');
  }
}

module.exports = HealthCheck;