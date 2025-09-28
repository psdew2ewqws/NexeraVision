/**
 * Sync Orchestrator Service
 * Manages synchronization operations between internal systems and delivery channels
 * Handles queuing, error handling, retry logic, and monitoring
 */

const channelAdapterFactory = require('./channel-adapters/channel-adapter-factory');
const EventEmitter = require('events');

class SyncOrchestrator extends EventEmitter {
  constructor(prisma) {
    super();
    this.prisma = prisma;

    // Sync queues and state
    this.syncQueues = new Map(); // companyId -> queue
    this.activeSyncs = new Map(); // syncId -> syncOperation
    this.syncHistory = new Map(); // companyId -> recentSyncs[]

    // Configuration
    this.config = {
      maxConcurrentSyncs: 5,
      maxRetryAttempts: 3,
      retryDelayMs: 5000,
      batchSize: 50,
      healthCheckInterval: 60000, // 1 minute
      historyRetentionDays: 7,
      deadLetterQueueSize: 100
    };

    // Metrics
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      retriedSyncs: 0,
      averageExecutionTime: 0,
      lastSyncTime: null,
      syncsByChannel: {},
      syncsByType: {}
    };

    // Start background processes
    this._startHealthChecker();
    this._startMetricsCollector();
  }

  // ================================
  // MAIN SYNC OPERATIONS
  // ================================

  /**
   * Queue a sync operation
   * @param {Object} syncRequest - Sync request configuration
   * @returns {Promise<string>} - Sync ID
   */
  async queueSync(syncRequest) {
    const {
      companyId,
      channelAssignmentId,
      platformMenuId,
      syncType,
      priority = 'normal',
      force = false,
      metadata = {}
    } = syncRequest;

    // Validate request
    await this._validateSyncRequest(syncRequest);

    // Create sync record
    const syncId = await this._createSyncRecord(syncRequest);

    // Add to queue
    const queue = this._getOrCreateQueue(companyId);
    const syncOperation = {
      syncId,
      companyId,
      channelAssignmentId,
      platformMenuId,
      syncType,
      priority,
      force,
      metadata,
      createdAt: new Date(),
      attempts: 0,
      status: 'queued'
    };

    queue.push(syncOperation);
    this._sortQueue(queue);

    console.log(`Queued sync operation: ${syncId} (${syncType}) for company ${companyId}`);
    this.emit('sync.queued', syncOperation);

    // Process queue
    this._processQueue(companyId);

    return syncId;
  }

  /**
   * Execute sync operation immediately
   * @param {Object} syncRequest - Sync request configuration
   * @returns {Promise<Object>} - Sync result
   */
  async executeSync(syncRequest) {
    const syncId = await this.queueSync({
      ...syncRequest,
      priority: 'immediate'
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, 300000); // 5 minutes

      this.once(`sync.completed.${syncId}`, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      this.once(`sync.failed.${syncId}`, (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message || 'Sync failed'));
      });
    });
  }

  /**
   * Batch sync multiple platform menus to channels
   * @param {string} companyId - Company ID
   * @param {Array} assignments - Array of platform menu channel assignments
   * @param {string} syncType - Type of sync operation
   * @returns {Promise<Array>} - Array of sync results
   */
  async batchSync(companyId, assignments, syncType = 'menu_sync') {
    const syncRequests = assignments.map(assignment => ({
      companyId,
      channelAssignmentId: assignment.companyChannelAssignmentId,
      platformMenuId: assignment.platformMenuId,
      syncType,
      priority: 'batch',
      metadata: {
        batchId: `batch-${Date.now()}`,
        totalItems: assignments.length
      }
    }));

    const syncIds = await Promise.all(
      syncRequests.map(request => this.queueSync(request))
    );

    console.log(`Queued batch sync: ${syncIds.length} operations for company ${companyId}`);

    return syncIds;
  }

  /**
   * Get sync status
   * @param {string} syncId - Sync ID
   * @returns {Promise<Object>} - Sync status and details
   */
  async getSyncStatus(syncId) {
    // Check active syncs first
    if (this.activeSyncs.has(syncId)) {
      return this.activeSyncs.get(syncId);
    }

    // Query database for completed syncs
    const syncLog = await this.prisma.channelSyncLog.findUnique({
      where: { id: syncId },
      include: {
        companyChannelAssignment: {
          include: {
            channel: true
          }
        },
        platformMenuChannelAssignment: {
          include: {
            platformMenu: true
          }
        }
      }
    });

    if (!syncLog) {
      throw new Error(`Sync ${syncId} not found`);
    }

    return {
      syncId: syncLog.id,
      syncType: syncLog.syncType,
      syncStatus: syncLog.syncStatus,
      startedAt: syncLog.startedAt,
      completedAt: syncLog.completedAt,
      duration: syncLog.durationMs,
      recordsProcessed: syncLog.recordsProcessed,
      recordsSuccess: syncLog.recordsSuccess,
      recordsFailed: syncLog.recordsFailed,
      errorMessage: syncLog.errorMessage,
      retryCount: syncLog.retryCount,
      channel: syncLog.companyChannelAssignment?.channel?.name,
      platformMenu: syncLog.platformMenuChannelAssignment?.platformMenu?.name
    };
  }

  /**
   * Cancel sync operation
   * @param {string} syncId - Sync ID to cancel
   * @returns {Promise<boolean>} - true if cancelled successfully
   */
  async cancelSync(syncId) {
    // Check if sync is active
    if (this.activeSyncs.has(syncId)) {
      const syncOp = this.activeSyncs.get(syncId);
      syncOp.status = 'cancelled';
      this.activeSyncs.delete(syncId);

      await this._updateSyncRecord(syncId, {
        syncStatus: 'cancelled',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user'
      });

      this.emit('sync.cancelled', { syncId });
      return true;
    }

    // Check queues
    for (const [companyId, queue] of this.syncQueues) {
      const index = queue.findIndex(op => op.syncId === syncId);
      if (index >= 0) {
        queue.splice(index, 1);

        await this._updateSyncRecord(syncId, {
          syncStatus: 'cancelled',
          completedAt: new Date(),
          errorMessage: 'Cancelled before execution'
        });

        this.emit('sync.cancelled', { syncId });
        return true;
      }
    }

    return false;
  }

  /**
   * Get company sync queue status
   * @param {string} companyId - Company ID
   * @returns {Object} - Queue status information
   */
  getQueueStatus(companyId) {
    const queue = this.syncQueues.get(companyId) || [];
    const activeSyncs = Array.from(this.activeSyncs.values())
      .filter(sync => sync.companyId === companyId);

    return {
      companyId,
      queuedOperations: queue.length,
      activeOperations: activeSyncs.length,
      totalOperations: queue.length + activeSyncs.length,
      queue: queue.map(op => ({
        syncId: op.syncId,
        syncType: op.syncType,
        priority: op.priority,
        createdAt: op.createdAt,
        attempts: op.attempts
      })),
      active: activeSyncs.map(sync => ({
        syncId: sync.syncId,
        syncType: sync.syncType,
        startedAt: sync.startedAt,
        status: sync.status
      }))
    };
  }

  /**
   * Get overall sync metrics
   * @returns {Object} - Sync metrics and statistics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeQueues: this.syncQueues.size,
      totalQueuedItems: Array.from(this.syncQueues.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      activeSyncs: this.activeSyncs.size,
      adapterHealth: channelAdapterFactory.getAllAdapterHealth()
    };
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  async _validateSyncRequest(syncRequest) {
    const { companyId, channelAssignmentId, syncType } = syncRequest;

    if (!companyId || !channelAssignmentId || !syncType) {
      throw new Error('Missing required sync parameters');
    }

    // Validate channel assignment exists
    const assignment = await this.prisma.companyChannelAssignment.findFirst({
      where: {
        id: channelAssignmentId,
        companyId,
        deletedAt: null
      },
      include: {
        channel: true
      }
    });

    if (!assignment) {
      throw new Error('Channel assignment not found');
    }

    if (!assignment.isEnabled || !assignment.syncEnabled) {
      throw new Error('Sync is disabled for this channel assignment');
    }

    const validSyncTypes = ['menu_sync', 'product_sync', 'availability_sync', 'order_sync'];
    if (!validSyncTypes.includes(syncType)) {
      throw new Error(`Invalid sync type: ${syncType}`);
    }

    return assignment;
  }

  async _createSyncRecord(syncRequest) {
    const {
      companyId,
      channelAssignmentId,
      platformMenuId,
      syncType,
      metadata
    } = syncRequest;

    const syncLog = await this.prisma.channelSyncLog.create({
      data: {
        companyChannelAssignmentId: channelAssignmentId,
        platformMenuChannelAssignmentId: platformMenuId || null,
        syncType,
        syncDirection: 'push',
        syncStatus: 'queued',
        startedAt: new Date(),
        recordsProcessed: 0,
        recordsSuccess: 0,
        recordsFailed: 0,
        retryCount: 0,
        requestPayload: metadata || {}
      }
    });

    return syncLog.id;
  }

  async _updateSyncRecord(syncId, updates) {
    await this.prisma.channelSyncLog.update({
      where: { id: syncId },
      data: updates
    });
  }

  _getOrCreateQueue(companyId) {
    if (!this.syncQueues.has(companyId)) {
      this.syncQueues.set(companyId, []);
    }
    return this.syncQueues.get(companyId);
  }

  _sortQueue(queue) {
    const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3, batch: 4 };
    queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.createdAt - b.createdAt;
    });
  }

  async _processQueue(companyId) {
    const queue = this._getOrCreateQueue(companyId);
    const activeCount = Array.from(this.activeSyncs.values())
      .filter(sync => sync.companyId === companyId).length;

    if (activeCount >= this.config.maxConcurrentSyncs || queue.length === 0) {
      return;
    }

    const syncOperation = queue.shift();
    if (!syncOperation) {
      return;
    }

    this.activeSyncs.set(syncOperation.syncId, {
      ...syncOperation,
      status: 'active',
      startedAt: new Date()
    });

    try {
      await this._executeSyncOperation(syncOperation);
    } catch (error) {
      console.error(`Error executing sync ${syncOperation.syncId}:`, error);
    }

    // Process next item in queue
    setTimeout(() => this._processQueue(companyId), 100);
  }

  async _executeSyncOperation(syncOperation) {
    const { syncId, companyId, channelAssignmentId, syncType } = syncOperation;

    try {
      // Update sync status
      await this._updateSyncRecord(syncId, {
        syncStatus: 'in_progress',
        startedAt: new Date()
      });

      this.emit('sync.started', syncOperation);

      // Get channel assignment with all necessary data
      const assignment = await this.prisma.companyChannelAssignment.findFirst({
        where: { id: channelAssignmentId },
        include: {
          channel: true,
          platformMenuChannelAssignments: {
            where: { deletedAt: null },
            include: {
              platformMenu: {
                include: {
                  items: {
                    where: { deletedAt: null },
                    include: {
                      product: {
                        include: {
                          category: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!assignment) {
        throw new Error('Channel assignment not found');
      }

      // Create or get adapter
      const adapter = await channelAdapterFactory.createAdapter({
        channel: assignment.channel,
        companyChannelAssignment: assignment
      });

      // Execute sync based on type
      let result;
      switch (syncType) {
        case 'menu_sync':
          result = await this._executeMenuSync(adapter, assignment, syncOperation);
          break;

        case 'availability_sync':
          result = await this._executeAvailabilitySync(adapter, assignment, syncOperation);
          break;

        case 'product_sync':
          result = await this._executeProductSync(adapter, assignment, syncOperation);
          break;

        default:
          throw new Error(`Unsupported sync type: ${syncType}`);
      }

      // Update sync record with success
      await this._updateSyncRecord(syncId, {
        syncStatus: 'completed',
        completedAt: new Date(),
        durationMs: Date.now() - syncOperation.startedAt.getTime(),
        recordsProcessed: result.recordsProcessed || 0,
        recordsSuccess: result.recordsSuccess || 0,
        recordsFailed: result.recordsFailed || 0,
        responsePayload: result
      });

      this.activeSyncs.delete(syncId);
      this.emit('sync.completed', { syncId, result });
      this.emit(`sync.completed.${syncId}`, result);

      // Update metrics
      this.metrics.totalSyncs++;
      this.metrics.successfulSyncs++;
      this.metrics.lastSyncTime = new Date();

    } catch (error) {
      await this._handleSyncError(syncOperation, error);
    }
  }

  async _executeMenuSync(adapter, assignment, syncOperation) {
    const platformMenus = assignment.platformMenuChannelAssignments;

    if (platformMenus.length === 0) {
      throw new Error('No platform menus assigned to this channel');
    }

    const results = [];
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const platformMenuAssignment of platformMenus) {
      const menuData = this._transformMenuForSync(platformMenuAssignment.platformMenu);

      try {
        const result = await adapter.pushMenu(menuData);
        results.push(result);

        if (result.success) {
          totalSuccess++;
          // Update external menu ID if provided
          if (result.externalMenuId) {
            await this.prisma.platformMenuChannelAssignment.update({
              where: { id: platformMenuAssignment.id },
              data: {
                menuExternalId: result.externalMenuId,
                lastMenuSyncAt: new Date(),
                menuSyncStatus: 'success'
              }
            });
          }
        } else {
          totalFailed++;
        }
        totalProcessed++;
      } catch (error) {
        totalFailed++;
        totalProcessed++;
        results.push({
          success: false,
          error: error.message,
          platformMenuId: platformMenuAssignment.platformMenuId
        });
      }
    }

    return {
      success: totalFailed === 0,
      recordsProcessed: totalProcessed,
      recordsSuccess: totalSuccess,
      recordsFailed: totalFailed,
      results
    };
  }

  async _executeAvailabilitySync(adapter, assignment, syncOperation) {
    // Get availability updates from platform menus
    const availabilityUpdates = [];

    for (const platformMenuAssignment of assignment.platformMenuChannelAssignments) {
      const items = platformMenuAssignment.platformMenu.items;

      for (const item of items) {
        if (item.product) {
          availabilityUpdates.push({
            productId: item.product.id,
            externalProductId: item.externalId || item.product.id,
            isAvailable: item.isAvailable && item.product.status === 1,
            quantity: item.isAvailable ? 999 : 0
          });
        }
      }
    }

    if (availabilityUpdates.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsSuccess: 0,
        recordsFailed: 0,
        message: 'No items to sync'
      };
    }

    const result = await adapter.syncAvailability(availabilityUpdates);

    return {
      success: result.success,
      recordsProcessed: availabilityUpdates.length,
      recordsSuccess: result.synced.length,
      recordsFailed: result.failed.length,
      syncedItems: result.synced,
      failedItems: result.failed
    };
  }

  async _executeProductSync(adapter, assignment, syncOperation) {
    const items = [];

    for (const platformMenuAssignment of assignment.platformMenuChannelAssignments) {
      items.push(...platformMenuAssignment.platformMenu.items);
    }

    if (items.length === 0) {
      return {
        success: true,
        recordsProcessed: 0,
        recordsSuccess: 0,
        recordsFailed: 0,
        message: 'No items to sync'
      };
    }

    const result = await adapter.updateMenuItems(items);

    return {
      success: result.success,
      recordsProcessed: items.length,
      recordsSuccess: result.updated.length,
      recordsFailed: result.failed.length,
      updatedItems: result.updated,
      failedItems: result.failed
    };
  }

  async _handleSyncError(syncOperation, error) {
    const { syncId } = syncOperation;

    syncOperation.attempts++;

    if (syncOperation.attempts < this.config.maxRetryAttempts) {
      // Retry logic
      const delay = this.config.retryDelayMs * Math.pow(2, syncOperation.attempts - 1);

      console.log(`Retrying sync ${syncId} in ${delay}ms (attempt ${syncOperation.attempts})`);

      setTimeout(() => {
        const queue = this._getOrCreateQueue(syncOperation.companyId);
        queue.unshift(syncOperation); // Add to front of queue
        this._processQueue(syncOperation.companyId);
      }, delay);

      this.metrics.retriedSyncs++;
    } else {
      // Mark as failed
      await this._updateSyncRecord(syncId, {
        syncStatus: 'failed',
        completedAt: new Date(),
        durationMs: Date.now() - syncOperation.startedAt.getTime(),
        errorMessage: error.message,
        retryCount: syncOperation.attempts
      });

      this.activeSyncs.delete(syncId);
      this.emit('sync.failed', { syncId, error });
      this.emit(`sync.failed.${syncId}`, error);

      this.metrics.failedSyncs++;
    }
  }

  _transformMenuForSync(platformMenu) {
    return {
      id: platformMenu.id,
      name: platformMenu.name,
      description: platformMenu.description,
      categories: this._groupItemsByCategory(platformMenu.items)
    };
  }

  _groupItemsByCategory(items) {
    const categoriesMap = new Map();

    for (const item of items) {
      if (!item.product || !item.product.category) continue;

      const category = item.product.category;
      const categoryId = category.id;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: category.name,
          description: category.description,
          displayNumber: category.displayNumber,
          isActive: category.isActive,
          items: []
        });
      }

      categoriesMap.get(categoryId).items.push({
        id: item.productId,
        externalId: item.externalId,
        name: item.product.name,
        description: item.product.description,
        price: item.product.basePrice,
        isAvailable: item.isAvailable,
        preparationTime: item.product.preparationTime,
        tags: item.product.tags,
        categoryId: categoryId
      });
    }

    return Array.from(categoriesMap.values());
  }

  _startHealthChecker() {
    setInterval(async () => {
      try {
        await channelAdapterFactory.cleanupUnhealthyAdapters();
      } catch (error) {
        console.error('Error in health checker:', error);
      }
    }, this.config.healthCheckInterval);
  }

  _startMetricsCollector() {
    setInterval(() => {
      // Update average execution time
      // Clean up old history
      // Update channel/type metrics
    }, 60000);
  }

  async shutdown() {
    console.log('Shutting down sync orchestrator...');

    // Cancel all active syncs
    for (const syncId of this.activeSyncs.keys()) {
      await this.cancelSync(syncId);
    }

    // Clear queues
    this.syncQueues.clear();

    console.log('Sync orchestrator shut down');
  }
}

module.exports = SyncOrchestrator;