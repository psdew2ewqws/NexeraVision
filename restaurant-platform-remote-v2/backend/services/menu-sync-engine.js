/**
 * Menu Sync Engine
 * Enhanced menu synchronization service that builds upon the existing sync orchestrator
 * Provides comprehensive menu sync functionality with job tracking, real-time updates, and analytics
 */

const SyncOrchestrator = require('./sync-orchestrator');
const EventEmitter = require('events');
const channelAdapterFactory = require('./channel-adapters/channel-adapter-factory');

class MenuSyncEngine extends EventEmitter {
  constructor(prisma) {
    super();
    this.prisma = prisma;
    this.syncOrchestrator = new SyncOrchestrator(prisma);

    // Configuration
    this.config = {
      maxConcurrentSyncs: 5,
      defaultBatchSize: 50,
      defaultRetryAttempts: 3,
      defaultRetryDelay: 5000,
      jobCleanupDays: 30,
      analyticsRetentionDays: 90,
      healthCheckInterval: 60000,
      progressUpdateInterval: 5000
    };

    // Job management
    this.activeJobs = new Map(); // jobId -> jobDetails
    this.jobProgressTrackers = new Map(); // jobId -> progressTracker

    // Performance metrics
    this.metrics = {
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      avgExecutionTime: 0,
      totalItemsProcessed: 0,
      lastSyncTime: null
    };

    // Start background processes
    this._startJobMonitor();
    this._startAnalyticsCollector();
    this._startJobCleanup();

    // Forward events from sync orchestrator
    this.syncOrchestrator.on('sync.started', (data) => this.emit('sync.started', data));
    this.syncOrchestrator.on('sync.completed', (data) => this.emit('sync.completed', data));
    this.syncOrchestrator.on('sync.failed', (data) => this.emit('sync.failed', data));
  }

  // ================================
  // MAIN SYNC OPERATIONS
  // ================================

  /**
   * Start full menu sync
   * @param {string} assignmentId - Company channel assignment ID
   * @param {Object} options - Sync options
   * @returns {Promise<string>} - Job ID
   */
  async startFullMenuSync(assignmentId, options = {}) {
    const {
      platformMenuId = null,
      priority = 'normal',
      forceSync = false,
      batchSize = this.config.defaultBatchSize,
      userInitiated = true,
      triggeredBy = 'system'
    } = options;

    return this._createAndQueueJob({
      assignmentId,
      jobType: userInitiated ? 'manual' : 'automatic',
      syncType: 'full_menu',
      platformMenuId,
      priority,
      forceSync,
      batchSize,
      userInitiated,
      triggeredBy
    });
  }

  /**
   * Start prices only sync
   * @param {string} assignmentId - Company channel assignment ID
   * @param {Object} options - Sync options
   * @returns {Promise<string>} - Job ID
   */
  async startPricesOnlySync(assignmentId, options = {}) {
    const {
      platformMenuId = null,
      priority = 'high',
      triggeredBy = 'system'
    } = options;

    return this._createAndQueueJob({
      assignmentId,
      jobType: 'triggered',
      syncType: 'prices_only',
      platformMenuId,
      priority,
      forceSync: true,
      userInitiated: false,
      triggeredBy
    });
  }

  /**
   * Start availability only sync
   * @param {string} assignmentId - Company channel assignment ID
   * @param {Object} options - Sync options
   * @returns {Promise<string>} - Job ID
   */
  async startAvailabilityOnlySync(assignmentId, options = {}) {
    const {
      platformMenuId = null,
      priority = 'high',
      triggeredBy = 'system'
    } = options;

    return this._createAndQueueJob({
      assignmentId,
      jobType: 'triggered',
      syncType: 'availability_only',
      platformMenuId,
      priority,
      forceSync: true,
      userInitiated: false,
      triggeredBy
    });
  }

  /**
   * Start category-specific sync
   * @param {string} assignmentId - Company channel assignment ID
   * @param {string} categoryId - Category ID to sync
   * @param {Object} options - Sync options
   * @returns {Promise<string>} - Job ID
   */
  async startCategorySync(assignmentId, categoryId, options = {}) {
    const {
      priority = 'normal',
      triggeredBy = 'system'
    } = options;

    return this._createAndQueueJob({
      assignmentId,
      jobType: 'manual',
      syncType: 'category_sync',
      priority,
      forceSync: true,
      userInitiated: true,
      triggeredBy,
      requestPayload: { categoryId }
    });
  }

  /**
   * Schedule automatic sync
   * @param {string} assignmentId - Company channel assignment ID
   * @param {Object} schedule - Schedule configuration
   * @returns {Promise<Object>} - Schedule details
   */
  async scheduleAutoSync(assignmentId, schedule) {
    const {
      syncInterval = 15, // minutes
      syncType = 'full_menu',
      enabled = true,
      timeWindow = null // {start: "09:00", end: "23:00"}
    } = schedule;

    // Get or create sync configuration
    let config = await this.prisma.syncConfiguration.findUnique({
      where: { assignmentId }
    });

    if (!config) {
      const assignment = await this.prisma.companyChannelAssignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new Error('Channel assignment not found');
      }

      config = await this.prisma.syncConfiguration.create({
        data: {
          companyId: assignment.companyId,
          assignmentId,
          autoSyncEnabled: enabled,
          syncInterval,
          syncTimeWindow: timeWindow,
          fullSyncFrequency: syncType === 'full_menu' ? 'auto' : 'daily'
        }
      });
    } else {
      config = await this.prisma.syncConfiguration.update({
        where: { id: config.id },
        data: {
          autoSyncEnabled: enabled,
          syncInterval,
          syncTimeWindow: timeWindow,
          fullSyncFrequency: syncType === 'full_menu' ? 'auto' : 'daily'
        }
      });
    }

    // Schedule next sync
    if (enabled) {
      await this._scheduleNextSync(assignmentId, syncInterval);
    }

    return {
      configId: config.id,
      assignmentId,
      enabled,
      syncInterval,
      timeWindow,
      nextSyncAt: new Date(Date.now() + syncInterval * 60000)
    };
  }

  /**
   * Cancel scheduled sync
   * @param {string} assignmentId - Company channel assignment ID
   * @returns {Promise<boolean>} - Success status
   */
  async cancelScheduledSync(assignmentId) {
    await this.prisma.syncConfiguration.updateMany({
      where: { assignmentId },
      data: { autoSyncEnabled: false }
    });

    // Cancel any pending scheduled jobs
    await this.prisma.syncJobQueue.updateMany({
      where: {
        assignmentId,
        status: 'pending',
        jobType: 'scheduled'
      },
      data: { status: 'cancelled' }
    });

    return true;
  }

  /**
   * Get sync job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Job status and details
   */
  async getSyncJobStatus(jobId) {
    const job = await this.prisma.syncJobQueue.findUnique({
      where: { id: jobId },
      include: {
        assignment: {
          include: {
            channel: true
          }
        },
        items: {
          where: { status: { in: ['failed', 'completed'] } },
          take: 10,
          orderBy: { updatedAt: 'desc' }
        },
        logs: {
          take: 20,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!job) {
      throw new Error(`Sync job ${jobId} not found`);
    }

    // Get real-time progress if job is active
    let realTimeProgress = null;
    if (this.jobProgressTrackers.has(jobId)) {
      realTimeProgress = this.jobProgressTrackers.get(jobId);
    }

    return {
      jobId: job.id,
      status: job.status,
      syncType: job.syncType,
      priority: job.priority,
      progress: {
        percentage: realTimeProgress?.percentage || job.progressPercentage,
        totalItems: job.totalItems,
        processedItems: realTimeProgress?.processedItems || job.processedItems,
        successItems: job.successItems,
        failedItems: job.failedItems
      },
      timing: {
        scheduledAt: job.scheduledAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        executionTime: job.executionTime,
        avgItemProcessingTime: job.avgItemProcessingTime
      },
      channel: {
        id: job.assignment.channel.id,
        name: job.assignment.channel.name,
        type: job.assignment.channel.channelType
      },
      errors: {
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        errorMessage: job.errorMessage,
        recentFailedItems: job.items.filter(item => item.status === 'failed')
      },
      recentLogs: job.logs,
      userInitiated: job.userInitiated,
      triggeredBy: job.triggeredBy
    };
  }

  /**
   * Cancel sync job
   * @param {string} jobId - Job ID to cancel
   * @returns {Promise<boolean>} - Success status
   */
  async cancelSyncJob(jobId) {
    const job = await this.prisma.syncJobQueue.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return false;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return false; // Already finished
    }

    // Update job status
    await this.prisma.syncJobQueue.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user'
      }
    });

    // Log cancellation
    await this.prisma.syncJobLog.create({
      data: {
        syncJobId: jobId,
        level: 'info',
        message: 'Job cancelled by user',
        phase: 'cancellation'
      }
    });

    // Remove from active tracking
    this.activeJobs.delete(jobId);
    this.jobProgressTrackers.delete(jobId);

    this.emit('job.cancelled', { jobId });
    return true;
  }

  /**
   * Get sync analytics
   * @param {string} assignmentId - Company channel assignment ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} - Analytics data
   */
  async getSyncAnalytics(assignmentId, options = {}) {
    const {
      days = 7,
      includeItems = false,
      includeErrors = true
    } = options;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [jobs, analytics] = await Promise.all([
      this.prisma.syncJobQueue.findMany({
        where: {
          assignmentId,
          createdAt: { gte: startDate }
        },
        include: includeItems ? { items: true } : undefined,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.syncAnalytics.findMany({
        where: {
          assignmentId,
          periodStart: { gte: startDate }
        },
        orderBy: { periodStart: 'desc' }
      })
    ]);

    const summary = {
      totalJobs: jobs.length,
      successfulJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      totalItemsProcessed: jobs.reduce((sum, j) => sum + j.processedItems, 0),
      avgExecutionTime: this._calculateAverage(
        jobs.filter(j => j.executionTime).map(j => j.executionTime)
      ),
      successRate: jobs.length > 0 ?
        (jobs.filter(j => j.status === 'completed').length / jobs.length * 100) : 0
    };

    const errorAnalysis = includeErrors ? this._analyzeErrors(jobs) : null;

    return {
      summary,
      recentJobs: jobs.slice(0, 10),
      errorAnalysis,
      historicalAnalytics: analytics,
      period: {
        days,
        startDate,
        endDate: new Date()
      }
    };
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  async _createAndQueueJob(jobData) {
    const {
      assignmentId,
      jobType,
      syncType,
      platformMenuId = null,
      priority = 'normal',
      forceSync = false,
      batchSize = this.config.defaultBatchSize,
      userInitiated = false,
      triggeredBy = 'system',
      requestPayload = {}
    } = jobData;

    // Validate assignment
    const assignment = await this.prisma.companyChannelAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        channel: true,
        company: true
      }
    });

    if (!assignment) {
      throw new Error('Channel assignment not found');
    }

    if (!assignment.isEnabled || !assignment.syncEnabled) {
      throw new Error('Sync is disabled for this channel assignment');
    }

    // Create sync job
    const job = await this.prisma.syncJobQueue.create({
      data: {
        companyId: assignment.companyId,
        assignmentId,
        jobType,
        priority,
        syncType,
        platformMenuId,
        forceSync,
        batchSize,
        maxRetries: this.config.defaultRetryAttempts,
        retryDelay: this.config.defaultRetryDelay,
        requestPayload,
        userInitiated,
        triggeredBy
      }
    });

    // Log job creation
    await this.prisma.syncJobLog.create({
      data: {
        syncJobId: job.id,
        level: 'info',
        message: `Sync job created: ${syncType}`,
        phase: 'creation',
        details: {
          assignmentId,
          syncType,
          priority,
          userInitiated,
          triggeredBy
        }
      }
    });

    // Queue for execution
    await this._queueJobForExecution(job);

    this.emit('job.created', {
      jobId: job.id,
      assignmentId,
      syncType,
      priority
    });

    return job.id;
  }

  async _queueJobForExecution(job) {
    // Add to active jobs tracking
    this.activeJobs.set(job.id, {
      ...job,
      startTime: null,
      progressTracker: null
    });

    // Queue with sync orchestrator
    const syncRequest = {
      companyId: job.companyId,
      channelAssignmentId: job.assignmentId,
      platformMenuId: job.platformMenuId,
      syncType: this._mapJobSyncType(job.syncType),
      priority: job.priority,
      force: job.forceSync,
      metadata: {
        jobId: job.id,
        batchSize: job.batchSize,
        requestPayload: job.requestPayload
      }
    };

    try {
      await this.syncOrchestrator.queueSync(syncRequest);

      // Update job status
      await this.prisma.syncJobQueue.update({
        where: { id: job.id },
        data: { status: 'queued' }
      });

    } catch (error) {
      await this._handleJobError(job.id, error, 'queuing');
    }
  }

  _mapJobSyncType(jobSyncType) {
    const mappings = {
      'full_menu': 'menu_sync',
      'prices_only': 'product_sync',
      'availability_only': 'availability_sync',
      'category_sync': 'menu_sync'
    };
    return mappings[jobSyncType] || 'menu_sync';
  }

  async _handleJobError(jobId, error, phase) {
    const job = await this.prisma.syncJobQueue.findUnique({
      where: { id: jobId }
    });

    if (!job) return;

    const retryCount = job.retryCount + 1;
    const shouldRetry = retryCount <= job.maxRetries;

    if (shouldRetry) {
      // Schedule retry
      const retryDelay = job.retryDelay * Math.pow(2, retryCount - 1);

      await this.prisma.syncJobQueue.update({
        where: { id: jobId },
        data: {
          status: 'retrying',
          retryCount,
          errorMessage: error.message
        }
      });

      await this.prisma.syncJobLog.create({
        data: {
          syncJobId: jobId,
          level: 'warning',
          message: `Job failed, scheduling retry ${retryCount}/${job.maxRetries}`,
          phase,
          details: {
            error: error.message,
            retryDelay,
            nextRetryAt: new Date(Date.now() + retryDelay)
          }
        }
      });

      // Schedule retry
      setTimeout(() => {
        this._queueJobForExecution(job);
      }, retryDelay);

    } else {
      // Mark as failed
      await this.prisma.syncJobQueue.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message,
          retryCount
        }
      });

      await this.prisma.syncJobLog.create({
        data: {
          syncJobId: jobId,
          level: 'error',
          message: `Job failed after ${retryCount} attempts`,
          phase,
          details: {
            error: error.message,
            finalFailure: true
          }
        }
      });

      this.activeJobs.delete(jobId);
      this.jobProgressTrackers.delete(jobId);

      this.emit('job.failed', { jobId, error: error.message });
    }
  }

  async _scheduleNextSync(assignmentId, intervalMinutes) {
    const nextSyncTime = new Date(Date.now() + intervalMinutes * 60000);

    await this.prisma.syncJobQueue.create({
      data: {
        assignmentId,
        jobType: 'scheduled',
        syncType: 'full_menu',
        priority: 'normal',
        scheduledAt: nextSyncTime,
        status: 'pending',
        userInitiated: false,
        triggeredBy: 'scheduler'
      }
    });
  }

  _startJobMonitor() {
    setInterval(async () => {
      try {
        // Process scheduled jobs
        const scheduledJobs = await this.prisma.syncJobQueue.findMany({
          where: {
            status: 'pending',
            jobType: 'scheduled',
            scheduledAt: { lte: new Date() }
          }
        });

        for (const job of scheduledJobs) {
          await this._queueJobForExecution(job);
        }

        // Update progress for active jobs
        for (const [jobId, tracker] of this.jobProgressTrackers) {
          this.emit('job.progress', {
            jobId,
            ...tracker
          });
        }

      } catch (error) {
        console.error('Error in job monitor:', error);
      }
    }, this.config.progressUpdateInterval);
  }

  _startAnalyticsCollector() {
    setInterval(async () => {
      try {
        await this._collectAnalytics();
      } catch (error) {
        console.error('Error collecting analytics:', error);
      }
    }, 3600000); // Every hour
  }

  _startJobCleanup() {
    setInterval(async () => {
      try {
        const cutoffDate = new Date(Date.now() - this.config.jobCleanupDays * 24 * 60 * 60 * 1000);

        await this.prisma.syncJobQueue.deleteMany({
          where: {
            completedAt: { lt: cutoffDate },
            status: { in: ['completed', 'failed', 'cancelled'] }
          }
        });
      } catch (error) {
        console.error('Error in job cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  async _collectAnalytics() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const assignments = await this.prisma.companyChannelAssignment.findMany({
      where: { syncEnabled: true }
    });

    for (const assignment of assignments) {
      // Implementation for analytics collection
      // This would analyze jobs from the past period and create analytics records
    }
  }

  _analyzeErrors(jobs) {
    const errors = jobs
      .filter(j => j.errorMessage)
      .map(j => j.errorMessage);

    const errorCounts = {};
    errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      uniqueErrors: Object.keys(errorCounts).length,
      mostCommon: Object.entries(errorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([error, count]) => ({ error, count }))
    };
  }

  _calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  async shutdown() {
    console.log('Shutting down menu sync engine...');

    // Stop orchestrator
    await this.syncOrchestrator.shutdown();

    // Clear tracking
    this.activeJobs.clear();
    this.jobProgressTrackers.clear();

    console.log('Menu sync engine shut down');
  }
}

module.exports = MenuSyncEngine;