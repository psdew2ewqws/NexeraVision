/**
 * Connection Pool Manager
 *
 * Manages reusable connections for:
 * - Database connections
 * - WebSocket connections
 * - HTTP client connections
 * - USB device connections
 */

const EventEmitter = require('events');

class ConnectionPool extends EventEmitter {
  constructor(service, options = {}) {
    super();
    this.service = service;
    this.log = service.log;

    // Configuration
    this.options = {
      minConnections: options.minConnections || 2,
      maxConnections: options.maxConnections || 10,
      connectionTimeout: options.connectionTimeout || 30000,
      idleTimeout: options.idleTimeout || 300000, // 5 minutes
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      healthCheckInterval: options.healthCheckInterval || 60000,
      ...options
    };

    // Pool state
    this.connections = new Map();
    this.available = [];
    this.busy = new Set();
    this.pendingRequests = [];
    this.isShuttingDown = false;

    // Metrics
    this.metrics = {
      totalCreated: 0,
      totalDestroyed: 0,
      totalAcquired: 0,
      totalReleased: 0,
      totalErrors: 0,
      currentSize: 0,
      peakSize: 0,
      waitingRequests: 0
    };

    // Health monitoring
    this.healthCheckTimer = null;

    this.log.info('🏊 Connection Pool initialized');
  }

  async initialize() {
    try {
      this.log.info('🚀 Initializing connection pool...');

      // Create minimum connections
      for (let i = 0; i < this.options.minConnections; i++) {
        const connection = await this.createConnection();
        this.available.push(connection);
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.log.info(`✅ Connection pool initialized with ${this.available.length} connections`);

    } catch (error) {
      this.log.error('❌ Connection pool initialization failed:', error);
      throw error;
    }
  }

  async acquire(timeout = this.options.connectionTimeout) {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    this.metrics.totalAcquired++;
    this.metrics.waitingRequests++;

    try {
      // Try to get available connection
      if (this.available.length > 0) {
        const connection = this.available.pop();

        if (await this.validateConnection(connection)) {
          this.busy.add(connection);
          this.metrics.waitingRequests--;
          return connection;
        } else {
          // Connection is invalid, destroy and create new one
          await this.destroyConnection(connection);
        }
      }

      // Create new connection if under limit
      if (this.connections.size < this.options.maxConnections) {
        const connection = await this.createConnection();
        this.busy.add(connection);
        this.metrics.waitingRequests--;
        return connection;
      }

      // Wait for available connection
      return await this.waitForConnection(timeout);

    } catch (error) {
      this.metrics.totalErrors++;
      this.metrics.waitingRequests--;
      this.log.error('❌ Failed to acquire connection:', error);
      throw error;
    }
  }

  async release(connection) {
    if (!this.connections.has(connection.id)) {
      this.log.warn('⚠️ Attempting to release unknown connection');
      return;
    }

    this.metrics.totalReleased++;
    this.busy.delete(connection);

    // Validate connection before returning to pool
    if (await this.validateConnection(connection)) {
      connection.lastUsed = Date.now();
      this.available.push(connection);

      // Process pending requests
      this.processPendingRequests();
    } else {
      // Connection is invalid, destroy it
      await this.destroyConnection(connection);
    }

    this.emit('connection-released', connection);
  }

  async createConnection() {
    try {
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const connection = {
        id: connectionId,
        created: Date.now(),
        lastUsed: Date.now(),
        useCount: 0,
        isHealthy: true,
        metadata: {}
      };

      // Initialize connection-specific resources here
      // This would be implemented based on connection type
      await this.initializeConnection(connection);

      this.connections.set(connectionId, connection);
      this.metrics.totalCreated++;
      this.metrics.currentSize = this.connections.size;
      this.metrics.peakSize = Math.max(this.metrics.peakSize, this.metrics.currentSize);

      this.log.debug(`🆕 Created connection: ${connectionId}`);
      this.emit('connection-created', connection);

      return connection;

    } catch (error) {
      this.metrics.totalErrors++;
      this.log.error('❌ Failed to create connection:', error);
      throw error;
    }
  }

  async destroyConnection(connection) {
    try {
      if (this.connections.has(connection.id)) {
        // Cleanup connection-specific resources
        await this.cleanupConnection(connection);

        this.connections.delete(connection.id);
        this.busy.delete(connection);

        // Remove from available if present
        const availableIndex = this.available.indexOf(connection);
        if (availableIndex !== -1) {
          this.available.splice(availableIndex, 1);
        }

        this.metrics.totalDestroyed++;
        this.metrics.currentSize = this.connections.size;

        this.log.debug(`🗑️ Destroyed connection: ${connection.id}`);
        this.emit('connection-destroyed', connection);
      }
    } catch (error) {
      this.log.error(`❌ Error destroying connection ${connection.id}:`, error);
    }
  }

  async validateConnection(connection) {
    try {
      // Check basic validity
      if (!connection || !connection.id || !this.connections.has(connection.id)) {
        return false;
      }

      // Check if connection is too old
      const maxAge = this.options.maxConnectionAge || 3600000; // 1 hour
      if (Date.now() - connection.created > maxAge) {
        return false;
      }

      // Check if connection has been idle too long
      if (Date.now() - connection.lastUsed > this.options.idleTimeout) {
        return false;
      }

      // Perform connection-specific health check
      return await this.healthCheckConnection(connection);

    } catch (error) {
      this.log.debug(`❌ Connection validation failed for ${connection.id}:`, error);
      return false;
    }
  }

  async waitForConnection(timeout) {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Connection acquisition timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.push({
        resolve: (connection) => {
          clearTimeout(timeoutHandle);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
        timestamp: Date.now()
      });
    });
  }

  processPendingRequests() {
    while (this.pendingRequests.length > 0 && this.available.length > 0) {
      const request = this.pendingRequests.shift();
      const connection = this.available.pop();

      this.busy.add(connection);
      this.metrics.waitingRequests--;
      request.resolve(connection);
    }
  }

  startHealthMonitoring() {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthMaintenance();
    }, this.options.healthCheckInterval);

    this.log.debug('❤️ Health monitoring started');
  }

  async performHealthMaintenance() {
    try {
      // Check all available connections
      const invalidConnections = [];

      for (let i = this.available.length - 1; i >= 0; i--) {
        const connection = this.available[i];

        if (!await this.validateConnection(connection)) {
          invalidConnections.push(connection);
          this.available.splice(i, 1);
        }
      }

      // Destroy invalid connections
      for (const connection of invalidConnections) {
        await this.destroyConnection(connection);
      }

      // Ensure minimum connections
      while (this.available.length < this.options.minConnections &&
             this.connections.size < this.options.maxConnections) {
        try {
          const connection = await this.createConnection();
          this.available.push(connection);
        } catch (error) {
          this.log.error('❌ Failed to create connection during maintenance:', error);
          break;
        }
      }

      this.log.debug(`🔧 Health maintenance completed: ${this.getStatus().summary}`);

    } catch (error) {
      this.log.error('❌ Health maintenance failed:', error);
    }
  }

  // Abstract methods to be implemented by specific connection types
  async initializeConnection(connection) {
    // Override in subclasses
    connection.metadata.initialized = true;
  }

  async cleanupConnection(connection) {
    // Override in subclasses
    connection.metadata.cleaned = true;
  }

  async healthCheckConnection(connection) {
    // Override in subclasses
    return connection.isHealthy;
  }

  getStatus() {
    return {
      state: {
        total: this.connections.size,
        available: this.available.length,
        busy: this.busy.size,
        pending: this.pendingRequests.length
      },
      metrics: this.metrics,
      summary: `${this.connections.size} total, ${this.available.length} available, ${this.busy.size} busy`,
      isHealthy: this.available.length >= this.options.minConnections,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    this.log.info('🛑 Shutting down connection pool...');
    this.isShuttingDown = true;

    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Reject pending requests
    for (const request of this.pendingRequests) {
      request.reject(new Error('Connection pool is shutting down'));
    }
    this.pendingRequests = [];

    // Wait for busy connections to be released (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.busy.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await this.delay(1000);
    }

    // Force close all connections
    for (const connection of this.connections.values()) {
      await this.destroyConnection(connection);
    }

    this.log.info('✅ Connection pool shutdown complete');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ConnectionPool;