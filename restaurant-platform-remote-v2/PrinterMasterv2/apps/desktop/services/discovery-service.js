/**
 * PrinterMaster Background Discovery Service
 * Phase 3: Continuous Automatic Background Printer Discovery
 *
 * Features:
 * - Continuous background discovery every 30 seconds
 * - Multiple detection methods (System, USB, Network, Bluetooth)
 * - Smart duplicate prevention and state change detection
 * - Real-time WebSocket updates to backend and frontend
 * - Robust error handling and recovery
 */

const EventEmitter = require('events');

class DiscoveryService extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration with defaults
    this.config = {
      enabled: true,
      interval: options.interval || 30000, // 30 seconds
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      enableUSB: options.enableUSB !== false,
      enableSystem: options.enableSystem !== false,
      enableNetwork: options.enableNetwork !== false,
      enableBluetooth: options.enableBluetooth !== false,
      networkScanRange: options.networkScanRange || '192.168.1.0/24',
      networkScanPorts: options.networkScanPorts || [9100, 515, 631],
      ...options
    };

    // State management
    this.isRunning = false;
    this.intervalId = null;
    this.lastDiscovery = null;
    this.printerCache = new Map();
    this.retryCount = 0;

    // Dependencies (injected)
    this.log = null;
    this.printerDetector = null;
    this.websocketEmitter = null;

    // Statistics
    this.stats = {
      totalDiscoveries: 0,
      printersFound: 0,
      printersLost: 0,
      errors: 0,
      lastRun: null,
      averageDiscoveryTime: 0,
      totalDiscoveryTime: 0
    };

    this.log?.info('🔍 [DISCOVERY-SERVICE] Initialized with config:', this.config);
  }

  /**
   * Initialize the discovery service with dependencies
   */
  initialize(dependencies) {
    this.log = dependencies.log;
    this.printerDetector = dependencies.printerDetector;
    this.websocketEmitter = dependencies.websocketEmitter;

    if (!this.log || !this.printerDetector) {
      throw new Error('Discovery service requires log and printerDetector dependencies');
    }

    this.log.info('✅ [DISCOVERY-SERVICE] Initialized with dependencies');
    this.emit('initialized');
  }

  /**
   * Start continuous background discovery
   */
  start() {
    if (this.isRunning) {
      this.log?.warn('⚠️ [DISCOVERY-SERVICE] Already running, ignoring start request');
      return;
    }

    if (!this.config.enabled) {
      this.log?.info('📴 [DISCOVERY-SERVICE] Disabled in configuration, not starting');
      return;
    }

    this.log?.info(`🚀 [DISCOVERY-SERVICE] Starting continuous discovery (interval: ${this.config.interval}ms)`);
    this.isRunning = true;

    // Initial discovery immediately
    this.performDiscovery()
      .then(() => {
        this.log?.info('✅ [DISCOVERY-SERVICE] Initial discovery completed');
      })
      .catch(error => {
        this.log?.error('❌ [DISCOVERY-SERVICE] Initial discovery failed:', error);
      });

    // Set up recurring discovery
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.performDiscovery()
          .catch(error => {
            this.log?.error('❌ [DISCOVERY-SERVICE] Scheduled discovery failed:', error);
            this.stats.errors++;
            this.emit('discovery-error', { error, timestamp: new Date() });
          });
      }
    }, this.config.interval);

    this.emit('started');
    this.log?.info('🎯 [DISCOVERY-SERVICE] Background discovery service started successfully');
  }

  /**
   * Stop continuous background discovery
   */
  stop() {
    if (!this.isRunning) {
      this.log?.warn('⚠️ [DISCOVERY-SERVICE] Not running, ignoring stop request');
      return;
    }

    this.log?.info('🛑 [DISCOVERY-SERVICE] Stopping background discovery service');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.emit('stopped');
    this.log?.info('✅ [DISCOVERY-SERVICE] Background discovery service stopped');
  }

  /**
   * Perform a single discovery cycle
   */
  async performDiscovery() {
    if (!this.isRunning) {
      return; // Service stopped during execution
    }

    const startTime = Date.now();
    this.log?.debug('🔍 [DISCOVERY-SERVICE] Starting discovery cycle...');

    try {
      // Get current printers from detector
      const discoveredPrinters = await this.printerDetector.findPrinters({
        enableUSB: this.config.enableUSB,
        enableSystem: this.config.enableSystem,
        enableNetwork: this.config.enableNetwork,
        enableBluetooth: this.config.enableBluetooth,
        networkScanRange: this.config.networkScanRange,
        networkScanPorts: this.config.networkScanPorts
      });

      // Process discovery results
      const results = this.processDiscoveryResults(discoveredPrinters);

      // Update statistics
      const discoveryTime = Date.now() - startTime;
      this.stats.totalDiscoveries++;
      this.stats.lastRun = new Date();
      this.stats.totalDiscoveryTime += discoveryTime;
      this.stats.averageDiscoveryTime = this.stats.totalDiscoveryTime / this.stats.totalDiscoveries;

      // Reset retry count on success
      this.retryCount = 0;

      // Emit results
      this.emit('discovery-completed', {
        discovered: results.newPrinters,
        updated: results.updatedPrinters,
        lost: results.lostPrinters,
        total: discoveredPrinters.length,
        duration: discoveryTime,
        timestamp: new Date()
      });

      // Send to backend if websocket available
      if (this.websocketEmitter && results.hasChanges) {
        this.sendDiscoveryUpdates(results);
      }

      this.log?.info(`✅ [DISCOVERY-SERVICE] Discovery completed: ${results.newPrinters.length} new, ${results.updatedPrinters.length} updated, ${results.lostPrinters.length} lost (${discoveryTime}ms)`);

    } catch (error) {
      this.log?.error('❌ [DISCOVERY-SERVICE] Discovery cycle failed:', error);
      this.stats.errors++;
      this.retryCount++;

      // Handle retries
      if (this.retryCount < this.config.maxRetries) {
        this.log?.info(`🔄 [DISCOVERY-SERVICE] Retrying in ${this.config.retryDelay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);
        setTimeout(() => {
          if (this.isRunning) {
            this.performDiscovery();
          }
        }, this.config.retryDelay);
      }

      throw error; // Re-throw for interval handler
    }
  }

  /**
   * Process discovery results and detect changes
   */
  processDiscoveryResults(discoveredPrinters) {
    const results = {
      newPrinters: [],
      updatedPrinters: [],
      lostPrinters: [],
      hasChanges: false
    };

    // Create current printer map
    const currentPrinters = new Map();
    discoveredPrinters.forEach(printer => {
      currentPrinters.set(printer.id, printer);
    });

    // Find new and updated printers
    for (const [printerId, printer] of currentPrinters) {
      if (this.printerCache.has(printerId)) {
        // Check if printer has changed
        const cachedPrinter = this.printerCache.get(printerId);
        if (this.hasStatusChanged(cachedPrinter, printer)) {
          results.updatedPrinters.push({
            previous: cachedPrinter,
            current: printer,
            changes: this.getStatusChanges(cachedPrinter, printer)
          });
          results.hasChanges = true;
          this.log?.info(`🔄 [DISCOVERY-SERVICE] Printer updated: ${printer.name} - ${printer.status}`);
        }
      } else {
        // New printer discovered
        results.newPrinters.push(printer);
        results.hasChanges = true;
        this.stats.printersFound++;
        this.log?.info(`🆕 [DISCOVERY-SERVICE] New printer discovered: ${printer.name} (${printer.type}, ${printer.connection})`);
      }
    }

    // Find lost printers
    for (const [printerId, cachedPrinter] of this.printerCache) {
      if (!currentPrinters.has(printerId)) {
        results.lostPrinters.push(cachedPrinter);
        results.hasChanges = true;
        this.stats.printersLost++;
        this.log?.info(`📵 [DISCOVERY-SERVICE] Printer lost: ${cachedPrinter.name}`);
      }
    }

    // Update cache
    this.printerCache.clear();
    currentPrinters.forEach((printer, id) => {
      this.printerCache.set(id, { ...printer, lastSeen: new Date() });
    });

    this.lastDiscovery = new Date();
    return results;
  }

  /**
   * Check if printer status has changed
   */
  hasStatusChanged(previous, current) {
    const significantFields = ['status', 'ip', 'port', 'connection', 'capabilities'];

    return significantFields.some(field => {
      const prevValue = previous[field];
      const currValue = current[field];

      // Handle array comparison for capabilities
      if (field === 'capabilities' && Array.isArray(prevValue) && Array.isArray(currValue)) {
        return JSON.stringify(prevValue.sort()) !== JSON.stringify(currValue.sort());
      }

      return prevValue !== currValue;
    });
  }

  /**
   * Get detailed status changes
   */
  getStatusChanges(previous, current) {
    const changes = {};
    const fields = ['status', 'ip', 'port', 'connection', 'capabilities'];

    fields.forEach(field => {
      if (previous[field] !== current[field]) {
        changes[field] = {
          from: previous[field],
          to: current[field]
        };
      }
    });

    return changes;
  }

  /**
   * Send discovery updates via WebSocket
   */
  sendDiscoveryUpdates(results) {
    try {
      // Send new printers
      results.newPrinters.forEach(printer => {
        this.websocketEmitter.emit('printer:discovered', {
          ...printer,
          timestamp: new Date().toISOString(),
          discoveryMethod: 'background_service'
        });
      });

      // Send updated printers
      results.updatedPrinters.forEach(update => {
        this.websocketEmitter.emit('printer:status-changed', {
          printer: update.current,
          previous: update.previous,
          changes: update.changes,
          timestamp: new Date().toISOString()
        });
      });

      // Send lost printers
      results.lostPrinters.forEach(printer => {
        this.websocketEmitter.emit('printer:lost', {
          ...printer,
          timestamp: new Date().toISOString()
        });
      });

      // Send discovery summary
      this.websocketEmitter.emit('discovery:summary', {
        newCount: results.newPrinters.length,
        updatedCount: results.updatedPrinters.length,
        lostCount: results.lostPrinters.length,
        totalCached: this.printerCache.size,
        timestamp: new Date().toISOString(),
        stats: this.getStatistics()
      });

      this.log?.debug('📡 [DISCOVERY-SERVICE] Discovery updates sent via WebSocket');

    } catch (error) {
      this.log?.error('❌ [DISCOVERY-SERVICE] Failed to send WebSocket updates:', error);
    }
  }

  /**
   * Get current cached printers
   */
  getCachedPrinters() {
    return Array.from(this.printerCache.values());
  }

  /**
   * Get printer by ID from cache
   */
  getPrinter(printerId) {
    return this.printerCache.get(printerId) || null;
  }

  /**
   * Force immediate discovery
   */
  async forceDiscovery() {
    this.log?.info('🔄 [DISCOVERY-SERVICE] Force discovery requested');
    return await this.performDiscovery();
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };
    this.log?.info('⚙️ [DISCOVERY-SERVICE] Configuration updated:', newConfig);

    if (wasRunning && this.config.enabled) {
      this.start();
    }

    this.emit('config-updated', this.config);
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      cachedPrinters: this.printerCache.size,
      config: {
        enabled: this.config.enabled,
        interval: this.config.interval,
        enableUSB: this.config.enableUSB,
        enableSystem: this.config.enableSystem,
        enableNetwork: this.config.enableNetwork,
        enableBluetooth: this.config.enableBluetooth
      },
      uptime: this.stats.lastRun ? Date.now() - this.stats.lastRun.getTime() : 0
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: this.config.enabled,
      lastDiscovery: this.lastDiscovery,
      cachedPrinters: this.printerCache.size,
      retryCount: this.retryCount,
      stats: this.getStatistics()
    };
  }

  /**
   * Clear printer cache
   */
  clearCache() {
    this.log?.info('🗑️ [DISCOVERY-SERVICE] Clearing printer cache');
    this.printerCache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Health check
   */
  isHealthy() {
    const now = Date.now();
    const maxAge = this.config.interval * 3; // Allow 3 missed cycles

    return {
      healthy: this.isRunning && (!this.lastDiscovery || (now - this.lastDiscovery.getTime()) < maxAge),
      isRunning: this.isRunning,
      lastDiscovery: this.lastDiscovery,
      timeSinceLastDiscovery: this.lastDiscovery ? now - this.lastDiscovery.getTime() : null,
      retryCount: this.retryCount,
      errorRate: this.stats.totalDiscoveries > 0 ? (this.stats.errors / this.stats.totalDiscoveries) : 0
    };
  }
}

module.exports = DiscoveryService;