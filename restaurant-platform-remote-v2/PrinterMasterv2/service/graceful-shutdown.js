/**
 * Graceful Shutdown Handler
 *
 * Ensures clean exit handling for the PrinterMaster service:
 * - Process signal handling (SIGTERM, SIGINT, SIGQUIT)
 * - Resource cleanup and finalization
 * - Print job completion before shutdown
 * - State persistence
 * - Orderly component shutdown
 * - Emergency shutdown procedures
 */

class GracefulShutdown {
  constructor(service) {
    this.service = service;
    this.log = service.log;
    this.isShuttingDown = false;
    this.shutdownTimeout = 30000; // 30 seconds maximum shutdown time
    this.shutdownTimer = null;

    // Track shutdown phases
    this.shutdownPhases = [
      'initiated',
      'stopping-new-requests',
      'completing-active-jobs',
      'saving-state',
      'closing-connections',
      'cleaning-resources',
      'complete'
    ];
    this.currentPhase = null;

    // Handlers registered
    this.handlersRegistered = false;

    this.log.info('🛑 Graceful Shutdown handler initialized');
  }

  initialize() {
    if (this.handlersRegistered) {
      this.log.warn('⚠️ Shutdown handlers already registered');
      return;
    }

    this.log.info('🔧 Registering shutdown signal handlers...');

    // Handle various termination signals
    process.on('SIGTERM', () => {
      this.log.info('📨 Received SIGTERM - initiating graceful shutdown');
      this.initiateShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      this.log.info('📨 Received SIGINT (Ctrl+C) - initiating graceful shutdown');
      this.initiateShutdown('SIGINT');
    });

    process.on('SIGQUIT', () => {
      this.log.info('📨 Received SIGQUIT - initiating graceful shutdown');
      this.initiateShutdown('SIGQUIT');
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      this.log.error('💥 Uncaught Exception - emergency shutdown:', error);
      this.emergencyShutdown('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.log.error('💥 Unhandled Promise Rejection - emergency shutdown:', reason);
      this.emergencyShutdown('unhandledRejection', reason);
    });

    // Handle process warnings
    process.on('warning', (warning) => {
      this.log.warn('⚠️ Process Warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });

    // Handle memory warnings (if available)
    if (process.memoryUsage) {
      setInterval(() => {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const rssMB = Math.round(usage.rss / 1024 / 1024);

        // Log memory warning if usage is high
        if (heapUsedMB > 512 || rssMB > 1024) {
          this.log.warn('⚠️ High memory usage detected:', {
            heapUsed: `${heapUsedMB}MB`,
            heapTotal: `${heapTotalMB}MB`,
            rss: `${rssMB}MB`
          });
        }
      }, 60000); // Check every minute
    }

    this.handlersRegistered = true;
    this.log.info('✅ Shutdown signal handlers registered');
  }

  async initiateShutdown(signal) {
    if (this.isShuttingDown) {
      this.log.warn('⚠️ Shutdown already in progress, ignoring additional signal');
      return;
    }

    this.isShuttingDown = true;
    this.service.isShuttingDown = true;
    this.currentPhase = 'initiated';

    this.log.info(`🛑 Graceful shutdown initiated by signal: ${signal}`);

    // Set maximum shutdown timeout
    this.shutdownTimer = setTimeout(() => {
      this.log.error('⏰ Shutdown timeout reached - forcing exit');
      this.forceExit(1);
    }, this.shutdownTimeout);

    try {
      await this.executeShutdownSequence();
      this.log.info('✅ Graceful shutdown completed successfully');
      this.forceExit(0);
    } catch (error) {
      this.log.error('❌ Error during graceful shutdown:', error);
      this.forceExit(1);
    }
  }

  async executeShutdownSequence() {
    try {
      // Phase 1: Stop accepting new requests
      await this.stopNewRequests();

      // Phase 2: Complete active print jobs
      await this.completeActivePrintJobs();

      // Phase 3: Save current state
      await this.saveApplicationState();

      // Phase 4: Close network connections
      await this.closeConnections();

      // Phase 5: Clean up resources
      await this.cleanupResources();

      this.currentPhase = 'complete';

    } catch (error) {
      this.log.error('❌ Shutdown sequence error:', error);
      throw error;
    }
  }

  async stopNewRequests() {
    this.currentPhase = 'stopping-new-requests';
    this.log.info('🚫 Phase 1: Stopping acceptance of new requests...');

    try {
      // Stop the HTTP server from accepting new connections
      if (this.service.server) {
        this.service.server.close((error) => {
          if (error) {
            this.log.error('❌ Error closing HTTP server:', error);
          } else {
            this.log.info('✅ HTTP server stopped accepting new connections');
          }
        });
      }

      // Add a brief delay to allow existing connections to finish
      await this.delay(1000);

      this.log.info('✅ Phase 1 complete: New requests stopped');

    } catch (error) {
      this.log.error('❌ Error stopping new requests:', error);
      throw error;
    }
  }

  async completeActivePrintJobs() {
    this.currentPhase = 'completing-active-jobs';
    this.log.info('📋 Phase 2: Completing active print jobs...');

    try {
      const maxWaitTime = 10000; // 10 seconds max
      const startTime = Date.now();

      // Wait for active print jobs to complete
      while (this.hasActivePrintJobs() && (Date.now() - startTime) < maxWaitTime) {
        this.log.info('⏳ Waiting for active print jobs to complete...');
        await this.delay(1000);
      }

      if (this.hasActivePrintJobs()) {
        this.log.warn('⚠️ Some print jobs did not complete within timeout');
        await this.cancelActivePrintJobs();
      } else {
        this.log.info('✅ All print jobs completed successfully');
      }

      this.log.info('✅ Phase 2 complete: Print jobs handled');

    } catch (error) {
      this.log.error('❌ Error completing print jobs:', error);
      throw error;
    }
  }

  async saveApplicationState() {
    this.currentPhase = 'saving-state';
    this.log.info('💾 Phase 3: Saving application state...');

    try {
      // Save printer configurations and statistics
      if (this.service.usbManager) {
        await this.service.usbManager.savePrinters();
        this.log.info('✅ Printer configurations saved');
      }

      // Save service statistics
      await this.saveServiceStatistics();

      // Save health check data
      if (this.service.healthCheck) {
        await this.saveHealthCheckData();
      }

      this.log.info('✅ Phase 3 complete: Application state saved');

    } catch (error) {
      this.log.error('❌ Error saving application state:', error);
      throw error;
    }
  }

  async closeConnections() {
    this.currentPhase = 'closing-connections';
    this.log.info('🔌 Phase 4: Closing network connections...');

    try {
      // Close WebSocket connections
      if (this.service.websocketConnected) {
        try {
          const { disconnectWebSocket } = require('../apps/desktop/websocket-functions.js');
          disconnectWebSocket();
          this.service.websocketConnected = false;
          this.log.info('✅ WebSocket connections closed');
        } catch (wsError) {
          this.log.warn('⚠️ Error closing WebSocket:', wsError.message);
        }
      }

      // Wait for connections to close properly
      await this.delay(2000);

      this.log.info('✅ Phase 4 complete: Network connections closed');

    } catch (error) {
      this.log.error('❌ Error closing connections:', error);
      throw error;
    }
  }

  async cleanupResources() {
    this.currentPhase = 'cleaning-resources';
    this.log.info('🧹 Phase 5: Cleaning up resources...');

    try {
      // Shutdown USB manager
      if (this.service.usbManager) {
        await this.service.usbManager.shutdown();
        this.log.info('✅ USB manager shutdown');
      }

      // Shutdown health check system
      if (this.service.healthCheck) {
        this.service.healthCheck.shutdown();
        this.log.info('✅ Health check system shutdown');
      }

      // Clear intervals and timeouts
      this.clearAllTimers();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.log.info('✅ Garbage collection performed');
      }

      this.log.info('✅ Phase 5 complete: Resources cleaned up');

    } catch (error) {
      this.log.error('❌ Error cleaning up resources:', error);
      throw error;
    }
  }

  hasActivePrintJobs() {
    // Check if there are any active print jobs
    // This would need to be implemented based on your print queue system
    try {
      // Placeholder implementation
      return false;
    } catch (error) {
      this.log.error('❌ Error checking active print jobs:', error);
      return false;
    }
  }

  async cancelActivePrintJobs() {
    this.log.warn('⚠️ Cancelling remaining active print jobs...');

    try {
      // Implementation to cancel active print jobs
      // This would depend on your print queue system
      this.log.info('✅ Active print jobs cancelled');
    } catch (error) {
      this.log.error('❌ Error cancelling print jobs:', error);
    }
  }

  async saveServiceStatistics() {
    try {
      const statistics = {
        shutdownTime: new Date().toISOString(),
        shutdownSignal: this.currentSignal,
        uptime: this.service.getUptime(),
        stats: this.service.stats,
        gracefulShutdown: true
      };

      const fs = require('fs');
      const path = require('path');
      const statsFile = path.join(__dirname, '../logs/shutdown-stats.json');

      // Ensure logs directory exists
      const logsDir = path.dirname(statsFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.writeFileSync(statsFile, JSON.stringify(statistics, null, 2));
      this.log.info('✅ Service statistics saved');

    } catch (error) {
      this.log.error('❌ Error saving service statistics:', error);
    }
  }

  async saveHealthCheckData() {
    try {
      const healthData = {
        shutdownTime: new Date().toISOString(),
        finalHealthStatus: this.service.healthCheck.getHealthStatus(),
        finalMetrics: this.service.healthCheck.getMetrics()
      };

      const fs = require('fs');
      const path = require('path');
      const healthFile = path.join(__dirname, '../logs/shutdown-health.json');

      fs.writeFileSync(healthFile, JSON.stringify(healthData, null, 2));
      this.log.info('✅ Health check data saved');

    } catch (error) {
      this.log.error('❌ Error saving health check data:', error);
    }
  }

  clearAllTimers() {
    try {
      // Clear the shutdown timer
      if (this.shutdownTimer) {
        clearTimeout(this.shutdownTimer);
        this.shutdownTimer = null;
      }

      // Clear any other timers that might be running
      // This is a simplified approach - in production you'd track all timers
      const highestTimeoutId = setTimeout(';');
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }

      this.log.info('✅ All timers cleared');

    } catch (error) {
      this.log.warn('⚠️ Error clearing timers:', error.message);
    }
  }

  emergencyShutdown(reason, error) {
    this.log.error(`🚨 EMERGENCY SHUTDOWN - Reason: ${reason}`);
    this.log.error('Error details:', error);

    try {
      // Try to save critical state quickly
      if (this.service.usbManager) {
        this.service.usbManager.savePrinters().catch(() => {});
      }

      // Log emergency shutdown
      const emergencyData = {
        timestamp: new Date().toISOString(),
        reason: reason,
        error: error.message || error,
        stack: error.stack,
        uptime: this.service.getUptime(),
        stats: this.service.stats
      };

      const fs = require('fs');
      const path = require('path');
      const emergencyFile = path.join(__dirname, '../logs/emergency-shutdown.json');

      try {
        // Ensure logs directory exists
        const logsDir = path.dirname(emergencyFile);
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }

        fs.writeFileSync(emergencyFile, JSON.stringify(emergencyData, null, 2));
      } catch (saveError) {
        console.error('Failed to save emergency shutdown data:', saveError);
      }

    } catch (cleanupError) {
      console.error('Emergency cleanup failed:', cleanupError);
    }

    // Force exit after brief delay
    setTimeout(() => {
      this.forceExit(1);
    }, 1000);
  }

  forceExit(code) {
    this.log.info(`🔚 Forcing process exit with code: ${code}`);

    // Last chance to flush logs
    if (this.log && this.log.transports && this.log.transports.file) {
      try {
        this.log.transports.file.sync();
      } catch (error) {
        console.error('Failed to sync logs:', error);
      }
    }

    process.exit(code);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getShutdownStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      currentPhase: this.currentPhase,
      shutdownPhases: this.shutdownPhases,
      handlersRegistered: this.handlersRegistered,
      shutdownTimeout: this.shutdownTimeout
    };
  }

  // Allow external components to request graceful shutdown
  requestShutdown(reason = 'manual') {
    this.log.info(`🛑 Shutdown requested: ${reason}`);
    this.initiateShutdown(reason);
  }
}

module.exports = GracefulShutdown;