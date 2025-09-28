/**
 * Sync WebSocket Manager
 * Provides real-time sync status updates via WebSocket connections
 * Manages room-based subscriptions for company-specific sync events
 */

const { Server } = require('socket.io');

class SyncWebSocketManager {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"]
      },
      path: '/socket.io'
    });

    this.connectedClients = new Map(); // socketId -> clientInfo
    this.companyRooms = new Map(); // companyId -> Set of socketIds
    this.syncSubscriptions = new Map(); // syncJobId -> Set of socketIds

    this.setupEventHandlers();
    console.log('🔌 Sync WebSocket Manager initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });

      // Handle sync room subscriptions
      socket.on('subscribe-sync', (data) => {
        this.handleSyncSubscription(socket, data);
      });

      socket.on('unsubscribe-sync', (data) => {
        this.handleSyncUnsubscription(socket, data);
      });

      // Handle company-wide sync events
      socket.on('subscribe-company-sync', (data) => {
        this.handleCompanySyncSubscription(socket, data);
      });

      socket.on('unsubscribe-company-sync', () => {
        this.handleCompanySyncUnsubscription(socket);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle sync status requests
      socket.on('request-sync-status', (data) => {
        this.handleSyncStatusRequest(socket, data);
      });

      // Heartbeat for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  // ================================
  // AUTHENTICATION AND ROOM MANAGEMENT
  // ================================

  handleAuthentication(socket, data) {
    const { userId, companyId, token } = data;

    // Here you would validate the token
    // For now, we'll assume it's valid if all fields are present
    if (!userId || !companyId || !token) {
      socket.emit('auth-error', { error: 'Invalid authentication data' });
      return;
    }

    // Store client information
    this.connectedClients.set(socket.id, {
      userId,
      companyId,
      token,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Add to company room
    const companyRoom = `company-${companyId}`;
    socket.join(companyRoom);

    // Update company rooms tracking
    if (!this.companyRooms.has(companyId)) {
      this.companyRooms.set(companyId, new Set());
    }
    this.companyRooms.get(companyId).add(socket.id);

    socket.emit('authenticated', {
      message: 'Authentication successful',
      companyRoom
    });

    console.log(`✅ Client authenticated: ${socket.id} (Company: ${companyId})`);
  }

  handleSyncSubscription(socket, data) {
    const { assignmentId, jobId } = data;

    if (!this.isAuthenticated(socket)) {
      socket.emit('subscription-error', { error: 'Not authenticated' });
      return;
    }

    const clientInfo = this.connectedClients.get(socket.id);

    // Join sync-specific room
    if (assignmentId) {
      const assignmentRoom = `sync-assignment-${assignmentId}`;
      socket.join(assignmentRoom);
    }

    if (jobId) {
      const jobRoom = `sync-job-${jobId}`;
      socket.join(jobRoom);

      // Track job subscriptions
      if (!this.syncSubscriptions.has(jobId)) {
        this.syncSubscriptions.set(jobId, new Set());
      }
      this.syncSubscriptions.get(jobId).add(socket.id);
    }

    socket.emit('sync-subscribed', {
      assignmentId,
      jobId,
      message: 'Successfully subscribed to sync updates'
    });
  }

  handleSyncUnsubscription(socket, data) {
    const { assignmentId, jobId } = data;

    if (assignmentId) {
      const assignmentRoom = `sync-assignment-${assignmentId}`;
      socket.leave(assignmentRoom);
    }

    if (jobId) {
      const jobRoom = `sync-job-${jobId}`;
      socket.leave(jobRoom);

      // Remove from job subscriptions
      if (this.syncSubscriptions.has(jobId)) {
        this.syncSubscriptions.get(jobId).delete(socket.id);
        if (this.syncSubscriptions.get(jobId).size === 0) {
          this.syncSubscriptions.delete(jobId);
        }
      }
    }

    socket.emit('sync-unsubscribed', {
      assignmentId,
      jobId,
      message: 'Successfully unsubscribed from sync updates'
    });
  }

  handleCompanySyncSubscription(socket, data) {
    if (!this.isAuthenticated(socket)) {
      socket.emit('subscription-error', { error: 'Not authenticated' });
      return;
    }

    const clientInfo = this.connectedClients.get(socket.id);
    const companyRoom = `company-sync-${clientInfo.companyId}`;

    socket.join(companyRoom);

    socket.emit('company-sync-subscribed', {
      companyId: clientInfo.companyId,
      message: 'Successfully subscribed to company sync updates'
    });
  }

  handleCompanySyncUnsubscription(socket) {
    if (!this.isAuthenticated(socket)) {
      return;
    }

    const clientInfo = this.connectedClients.get(socket.id);
    const companyRoom = `company-sync-${clientInfo.companyId}`;

    socket.leave(companyRoom);

    socket.emit('company-sync-unsubscribed', {
      message: 'Successfully unsubscribed from company sync updates'
    });
  }

  handleDisconnection(socket) {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      // Remove from company rooms tracking
      const companyRoom = this.companyRooms.get(clientInfo.companyId);
      if (companyRoom) {
        companyRoom.delete(socket.id);
        if (companyRoom.size === 0) {
          this.companyRooms.delete(clientInfo.companyId);
        }
      }

      // Remove from sync subscriptions
      for (const [jobId, subscribers] of this.syncSubscriptions.entries()) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.syncSubscriptions.delete(jobId);
        }
      }

      // Remove client info
      this.connectedClients.delete(socket.id);
    }
  }

  handleSyncStatusRequest(socket, data) {
    if (!this.isAuthenticated(socket)) {
      socket.emit('sync-status-error', { error: 'Not authenticated' });
      return;
    }

    const { assignmentId, jobId } = data;

    // This would typically fetch real status from the sync engine
    // For now, we'll emit a placeholder response
    socket.emit('sync-status-response', {
      assignmentId,
      jobId,
      status: 'Status would be fetched from sync engine',
      timestamp: new Date().toISOString()
    });
  }

  // ================================
  // EVENT EMISSION METHODS
  // ================================

  /**
   * Emit sync job started event
   */
  emitSyncStarted(data) {
    const { jobId, assignmentId, companyId, syncType, channel } = data;

    // Emit to job-specific room
    this.io.to(`sync-job-${jobId}`).emit('sync.started', {
      jobId,
      assignmentId,
      syncType,
      channel,
      timestamp: new Date().toISOString(),
      status: 'started'
    });

    // Emit to assignment-specific room
    this.io.to(`sync-assignment-${assignmentId}`).emit('assignment.sync.started', {
      jobId,
      assignmentId,
      syncType,
      channel,
      timestamp: new Date().toISOString()
    });

    // Emit to company-wide room
    this.io.to(`company-sync-${companyId}`).emit('company.sync.started', {
      jobId,
      assignmentId,
      syncType,
      channel,
      timestamp: new Date().toISOString()
    });

    console.log(`📡 Emitted sync started: ${jobId} (${syncType})`);
  }

  /**
   * Emit sync job progress update
   */
  emitSyncProgress(data) {
    const { jobId, assignmentId, companyId, progress, channel } = data;

    // Emit to job-specific room
    this.io.to(`sync-job-${jobId}`).emit('sync.progress', {
      jobId,
      assignmentId,
      progress: {
        percentage: progress.percentage,
        processedItems: progress.processedItems,
        totalItems: progress.totalItems,
        currentPhase: progress.currentPhase,
        estimatedTimeRemaining: progress.estimatedTimeRemaining
      },
      channel,
      timestamp: new Date().toISOString(),
      status: 'in_progress'
    });

    // Emit to assignment-specific room
    this.io.to(`sync-assignment-${assignmentId}`).emit('assignment.sync.progress', {
      jobId,
      progress: progress.percentage,
      timestamp: new Date().toISOString()
    });

    console.log(`📊 Emitted sync progress: ${jobId} (${progress.percentage}%)`);
  }

  /**
   * Emit sync job completed event
   */
  emitSyncCompleted(data) {
    const { jobId, assignmentId, companyId, result, channel, duration } = data;

    // Emit to job-specific room
    this.io.to(`sync-job-${jobId}`).emit('sync.completed', {
      jobId,
      assignmentId,
      result,
      channel,
      duration,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });

    // Emit to assignment-specific room
    this.io.to(`sync-assignment-${assignmentId}`).emit('assignment.sync.completed', {
      jobId,
      assignmentId,
      result,
      channel,
      duration,
      timestamp: new Date().toISOString()
    });

    // Emit to company-wide room
    this.io.to(`company-sync-${companyId}`).emit('company.sync.completed', {
      jobId,
      assignmentId,
      result,
      channel,
      duration,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Emitted sync completed: ${jobId} (${result.success ? 'success' : 'failed'})`);
  }

  /**
   * Emit sync job failed event
   */
  emitSyncFailed(data) {
    const { jobId, assignmentId, companyId, error, channel, retryCount } = data;

    // Emit to job-specific room
    this.io.to(`sync-job-${jobId}`).emit('sync.failed', {
      jobId,
      assignmentId,
      error: {
        message: error.message,
        code: error.code,
        details: error.details
      },
      channel,
      retryCount,
      timestamp: new Date().toISOString(),
      status: 'failed'
    });

    // Emit to assignment-specific room
    this.io.to(`sync-assignment-${assignmentId}`).emit('assignment.sync.failed', {
      jobId,
      assignmentId,
      error: error.message,
      retryCount,
      timestamp: new Date().toISOString()
    });

    // Emit to company-wide room
    this.io.to(`company-sync-${companyId}`).emit('company.sync.failed', {
      jobId,
      assignmentId,
      error: error.message,
      channel,
      timestamp: new Date().toISOString()
    });

    console.log(`❌ Emitted sync failed: ${jobId} (${error.message})`);
  }

  /**
   * Emit sync job cancelled event
   */
  emitSyncCancelled(data) {
    const { jobId, assignmentId, companyId, reason, channel } = data;

    // Emit to job-specific room
    this.io.to(`sync-job-${jobId}`).emit('sync.cancelled', {
      jobId,
      assignmentId,
      reason,
      channel,
      timestamp: new Date().toISOString(),
      status: 'cancelled'
    });

    // Emit to assignment-specific room
    this.io.to(`sync-assignment-${assignmentId}`).emit('assignment.sync.cancelled', {
      jobId,
      assignmentId,
      reason,
      timestamp: new Date().toISOString()
    });

    console.log(`🚫 Emitted sync cancelled: ${jobId}`);
  }

  /**
   * Emit adapter health status change
   */
  emitAdapterHealthChange(data) {
    const { companyId, channelSlug, health, previousHealth } = data;

    this.io.to(`company-sync-${companyId}`).emit('adapter.health.changed', {
      channelSlug,
      health,
      previousHealth,
      timestamp: new Date().toISOString()
    });

    console.log(`🏥 Emitted adapter health change: ${channelSlug} (healthy: ${health.isHealthy})`);
  }

  // ================================
  // UTILITY METHODS
  // ================================

  isAuthenticated(socket) {
    return this.connectedClients.has(socket.id);
  }

  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      companiesConnected: this.companyRooms.size,
      activeSyncSubscriptions: this.syncSubscriptions.size,
      timestamp: new Date().toISOString()
    };
  }

  getCompanyConnections(companyId) {
    const companyRoom = this.companyRooms.get(companyId);
    return companyRoom ? companyRoom.size : 0;
  }

  /**
   * Send message to all clients of a specific company
   */
  sendToCompany(companyId, event, data) {
    this.io.to(`company-${companyId}`).emit(event, data);
  }

  /**
   * Send message to specific sync job subscribers
   */
  sendToSyncJob(jobId, event, data) {
    this.io.to(`sync-job-${jobId}`).emit(event, data);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down WebSocket manager...');

    // Notify all connected clients
    this.io.emit('server.shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.io.close();

    // Clear all tracking
    this.connectedClients.clear();
    this.companyRooms.clear();
    this.syncSubscriptions.clear();

    console.log('🔌 WebSocket manager shut down');
  }
}

module.exports = SyncWebSocketManager;