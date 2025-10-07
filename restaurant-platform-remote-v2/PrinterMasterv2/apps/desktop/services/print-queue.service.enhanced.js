const EventEmitter = require('events');

/**
 * Enhanced Print Queue Service with Comprehensive Logging and Monitoring
 *
 * Features:
 * - Trace-level logging for all operations
 * - Queue processor health monitoring
 * - Deadlock detection and recovery
 * - Performance metrics collection
 * - Job lifecycle tracking with timestamps
 * - Processor execution lock to prevent overlaps
 *
 * @author Performance Engineer (Enhanced 2025-10-07)
 */
class PrintQueueService extends EventEmitter {
  constructor() {
    super();

    // Core queue storage
    this.queues = new Map(); // Map of printerId -> queue[]
    this.activeJobs = new Map(); // Map of jobId -> job details

    // Processing control
    this.isProcessing = false;
    this.processorLock = false; // Prevents overlapping executions
    this.processorInterval = null; // Global reference to interval

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds

    // Health monitoring
    this.healthMetrics = {
      executionCycleCount: 0,
      lastExecutionTime: null,
      lastExecutionDuration: 0,
      totalJobsProcessed: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      processorStartTime: null,
      stuckJobDetections: 0,
      averageExecutionTime: 0,
      executionTimes: [] // Keep last 100 execution times
    };

    // Deadlock detection
    this.stuckJobThreshold = 30000; // 30 seconds
    this.deadlockCheckInterval = null;

    // Logger (will be set during initialization)
    this.logger = null;

    // PhysicalPrinterService cache
    this.printerServiceCache = null;
  }

  /**
   * Initialize print queue service with enhanced logging
   * @param {Object} logger - Logger instance (optional)
   */
  initialize(logger = null) {
    // Set up logger
    this.logger = logger || this.createDefaultLogger();

    this.logger.info('🚀 [INIT] Initializing Enhanced Print Queue Service...');
    this.logger.debug('[INIT] Configuration:', {
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      stuckJobThreshold: this.stuckJobThreshold
    });

    // Initialize health metrics
    this.healthMetrics.processorStartTime = new Date();

    // Start queue processor
    this.isProcessing = true;
    this.startQueueProcessor();

    // Start deadlock detection
    this.startDeadlockDetection();

    // Log initial statistics
    this.logQueueStatistics();

    this.logger.info('✅ [INIT] Enhanced Print Queue Service initialized successfully');
  }

  /**
   * Create default logger if none provided
   */
  createDefaultLogger() {
    return {
      trace: (msg, ctx) => console.log(`[TRACE] ${msg}`, ctx || ''),
      debug: (msg, ctx) => console.log(`[DEBUG] ${msg}`, ctx || ''),
      info: (msg, ctx) => console.log(`[INFO] ${msg}`, ctx || ''),
      warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx || ''),
      error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx || ''),
      logJobEvent: (jobId, type, status, msg, ctx) =>
        console.log(`[JOB-EVENT] ${jobId} ${type}/${status}: ${msg}`, ctx || '')
    };
  }

  /**
   * Add print job to queue with enhanced tracking
   * @param {Object} job - Print job object
   * @returns {string} Job ID
   */
  addJob(job) {
    const startTime = Date.now();
    const jobId = this.generateJobId();

    const printJob = {
      id: jobId,
      ...job,
      status: 'queued',
      createdAt: new Date(),
      queuedAt: new Date(),
      retries: 0,
      priority: job.priority || 5, // 1 = highest, 10 = lowest
      timestamps: {
        created: Date.now(),
        queued: Date.now(),
        started: null,
        completed: null,
        failed: null
      }
    };

    // Get or create queue for printer
    if (!this.queues.has(job.printerId)) {
      this.queues.set(job.printerId, []);
      this.logger.trace('[QUEUE-CREATE] Created new queue for printer', { printerId: job.printerId });
    }

    const queue = this.queues.get(job.printerId);

    // Insert job based on priority (higher priority = lower number)
    const insertIndex = queue.findIndex(existingJob => existingJob.priority > printJob.priority);
    if (insertIndex === -1) {
      queue.push(printJob);
    } else {
      queue.splice(insertIndex, 0, printJob);
    }

    this.logger.info(`📥 [JOB-ADDED] Job ${jobId} queued for printer ${job.printerId}`, {
      priority: printJob.priority,
      queueDepth: queue.length,
      queuePosition: insertIndex === -1 ? queue.length : insertIndex
    });

    this.logger.logJobEvent(jobId, job.type || 'unknown', 'queued',
      `Added to queue at position ${insertIndex === -1 ? queue.length : insertIndex}`, {
        printerId: job.printerId,
        priority: printJob.priority
      });

    this.emit('job-queued', printJob);

    // Log performance
    const addJobDuration = Date.now() - startTime;
    this.logger.trace('[PERFORMANCE] addJob() completed', { duration: addJobDuration, jobId });

    return jobId;
  }

  /**
   * Get job status with enhanced details
   * @param {string} jobId - Job ID
   * @returns {Object} Job status with metrics
   */
  getJobStatus(jobId) {
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      return {
        ...job,
        waitTime: job.timestamps.started ? job.timestamps.started - job.timestamps.queued : null,
        processingTime: job.timestamps.completed ? job.timestamps.completed - job.timestamps.started : null
      };
    }

    // Search in queues
    for (const [printerId, queue] of this.queues) {
      const job = queue.find(j => j.id === jobId);
      if (job) {
        return {
          ...job,
          queuePosition: queue.indexOf(job),
          queueDepth: queue.length
        };
      }
    }

    this.logger.warn('[JOB-STATUS] Job not found', { jobId });
    return {
      id: jobId,
      status: 'not_found',
      error: 'Job not found in queue or active jobs'
    };
  }

  /**
   * Get queue status for a printer with metrics
   * @param {string} printerId - Printer ID
   * @returns {Object} Enhanced queue status
   */
  getQueueStatus(printerId) {
    const queue = this.queues.get(printerId) || [];
    const activeJob = Array.from(this.activeJobs.values()).find(job => job.printerId === printerId);

    const status = {
      printerId,
      queueLength: queue.length,
      activeJob: activeJob || null,
      status: queue.length > 0 ? 'busy' : 'idle',
      paused: queue.paused || false,
      nextJobs: queue.slice(0, 3).map(job => ({
        id: job.id,
        type: job.type,
        priority: job.priority,
        createdAt: job.createdAt,
        waitTime: Date.now() - job.timestamps.queued
      })),
      metrics: {
        totalQueued: queue.length,
        averageWaitTime: this.calculateAverageWaitTime(queue),
        oldestJobAge: queue.length > 0 ? Date.now() - queue[0].timestamps.queued : 0
      }
    };

    this.logger.trace('[QUEUE-STATUS] Status retrieved', { printerId, status: status.status, queueLength: queue.length });
    return status;
  }

  /**
   * Get all queue statuses with comprehensive metrics
   * @returns {Array} All printer queue statuses
   */
  getAllQueueStatuses() {
    const statuses = [];

    // Get all known printers from queues and active jobs
    const allPrinterIds = new Set([
      ...this.queues.keys(),
      ...Array.from(this.activeJobs.values()).map(job => job.printerId)
    ]);

    for (const printerId of allPrinterIds) {
      statuses.push(this.getQueueStatus(printerId));
    }

    this.logger.trace('[QUEUE-STATUS-ALL] Retrieved statuses for all printers', {
      printerCount: statuses.length
    });

    return statuses;
  }

  /**
   * Calculate average wait time for jobs in queue
   */
  calculateAverageWaitTime(queue) {
    if (queue.length === 0) return 0;

    const now = Date.now();
    const totalWaitTime = queue.reduce((sum, job) => sum + (now - job.timestamps.queued), 0);
    return Math.round(totalWaitTime / queue.length);
  }

  /**
   * Cancel a job with enhanced logging
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} Success status
   */
  cancelJob(jobId) {
    this.logger.info(`❌ [JOB-CANCEL] Cancelling job ${jobId}`);

    // Check if job is currently active
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      job.timestamps.cancelled = Date.now();
      this.activeJobs.delete(jobId);

      this.logger.logJobEvent(jobId, job.type, 'cancelled', 'Job cancelled while active');
      this.emit('job-cancelled', job);
      return true;
    }

    // Search and remove from queues
    for (const [printerId, queue] of this.queues) {
      const jobIndex = queue.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        const job = queue.splice(jobIndex, 1)[0];
        job.status = 'cancelled';
        job.cancelledAt = new Date();
        job.timestamps.cancelled = Date.now();

        this.logger.logJobEvent(jobId, job.type, 'cancelled', 'Job cancelled while in queue', {
          printerId,
          queuePosition: jobIndex
        });
        this.emit('job-cancelled', job);
        return true;
      }
    }

    this.logger.warn('[JOB-CANCEL] Job not found for cancellation', { jobId });
    return false;
  }

  /**
   * Cancel all jobs for a printer
   * @param {string} printerId - Printer ID
   * @returns {number} Number of jobs cancelled
   */
  cancelPrinterJobs(printerId) {
    this.logger.info(`❌ [PRINTER-CANCEL] Cancelling all jobs for printer ${printerId}`);

    let cancelledCount = 0;

    // Cancel active job
    const activeJob = Array.from(this.activeJobs.values()).find(job => job.printerId === printerId);
    if (activeJob) {
      this.cancelJob(activeJob.id);
      cancelledCount++;
    }

    // Cancel queued jobs
    const queue = this.queues.get(printerId) || [];
    const jobIds = queue.map(job => job.id);

    for (const jobId of jobIds) {
      if (this.cancelJob(jobId)) {
        cancelledCount++;
      }
    }

    this.logger.info(`✅ [PRINTER-CANCEL] Cancelled ${cancelledCount} jobs for printer ${printerId}`);
    return cancelledCount;
  }

  /**
   * Pause queue processing for a printer
   * @param {string} printerId - Printer ID
   */
  pausePrinter(printerId) {
    this.logger.info(`⏸️ [PRINTER-PAUSE] Pausing printer ${printerId}`);

    const queue = this.queues.get(printerId);
    if (queue) {
      queue.paused = true;
      this.emit('printer-paused', { printerId });
      this.logger.trace('[PRINTER-PAUSE] Printer paused successfully', { printerId });
    } else {
      this.logger.warn('[PRINTER-PAUSE] Printer queue not found', { printerId });
    }
  }

  /**
   * Resume queue processing for a printer
   * @param {string} printerId - Printer ID
   */
  resumePrinter(printerId) {
    this.logger.info(`▶️ [PRINTER-RESUME] Resuming printer ${printerId}`);

    const queue = this.queues.get(printerId);
    if (queue) {
      queue.paused = false;
      this.emit('printer-resumed', { printerId });
      this.logger.trace('[PRINTER-RESUME] Printer resumed successfully', { printerId });
    } else {
      this.logger.warn('[PRINTER-RESUME] Printer queue not found', { printerId });
    }
  }

  /**
   * Clear all completed/failed jobs from queues
   */
  clearCompletedJobs() {
    this.logger.info('🧹 [CLEANUP] Clearing completed jobs...');

    let clearedCount = 0;

    // Clear completed jobs from active jobs
    for (const [jobId, job] of this.activeJobs) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        this.activeJobs.delete(jobId);
        clearedCount++;
        this.logger.trace('[CLEANUP] Cleared job', { jobId, status: job.status });
      }
    }

    this.logger.info(`✅ [CLEANUP] Cleared ${clearedCount} completed jobs`);
    this.emit('jobs-cleared', { count: clearedCount });
  }

  /**
   * Get comprehensive queue statistics
   * @returns {Object} Queue statistics with health metrics
   */
  getStatistics() {
    let totalQueued = 0;
    let totalActive = this.activeJobs.size;
    let totalPrinters = this.queues.size;

    for (const queue of this.queues.values()) {
      totalQueued += queue.length;
    }

    const uptime = this.healthMetrics.processorStartTime ?
      Date.now() - this.healthMetrics.processorStartTime.getTime() : 0;

    const stats = {
      totalPrinters,
      totalQueued,
      totalActive,
      totalJobs: totalQueued + totalActive,
      isProcessing: this.isProcessing,
      timestamp: new Date(),
      health: {
        ...this.healthMetrics,
        uptime,
        uptimeFormatted: this.formatUptime(uptime),
        processorHealthy: this.isProcessorHealthy(),
        lastExecutionAge: this.healthMetrics.lastExecutionTime ?
          Date.now() - this.healthMetrics.lastExecutionTime : null
      }
    };

    this.logger.trace('[STATISTICS] Retrieved queue statistics', stats);
    return stats;
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Check if processor is healthy
   */
  isProcessorHealthy() {
    if (!this.isProcessing) return false;
    if (!this.healthMetrics.lastExecutionTime) return true; // Just started

    const timeSinceLastExecution = Date.now() - this.healthMetrics.lastExecutionTime;
    return timeSinceLastExecution < 5000; // Should execute at least every 5 seconds
  }

  /**
   * Start the enhanced queue processor with comprehensive logging
   */
  startQueueProcessor() {
    this.logger.info('🔄 [PROCESSOR-START] Starting enhanced queue processor...');
    this.logger.debug('[PROCESSOR-START] Processor interval: 1000ms');

    // Clear any existing interval
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.logger.warn('[PROCESSOR-START] Cleared existing processor interval');
    }

    // Start processor with global interval reference
    this.processorInterval = setInterval(async () => {
      await this.executeProcessorCycle();
    }, 1000); // Process every second

    this.logger.info('✅ [PROCESSOR-START] Queue processor started successfully');
  }

  /**
   * Execute a single processor cycle with comprehensive logging
   */
  async executeProcessorCycle() {
    const cycleStartTime = Date.now();
    this.healthMetrics.executionCycleCount++;
    const cycleNumber = this.healthMetrics.executionCycleCount;

    this.logger.trace(`[PROCESSOR-CYCLE] Starting execution cycle #${cycleNumber}`);

    // Check if processor should stop
    if (!this.isProcessing) {
      this.logger.warn('[PROCESSOR-CYCLE] Processor stopped, clearing interval');
      clearInterval(this.processorInterval);
      return;
    }

    // Execution lock to prevent overlapping cycles
    if (this.processorLock) {
      this.logger.warn('[PROCESSOR-CYCLE] Previous cycle still running, skipping', {
        cycleNumber,
        lockDuration: Date.now() - this.healthMetrics.lastExecutionTime
      });
      return;
    }

    try {
      this.processorLock = true;
      this.healthMetrics.lastExecutionTime = Date.now();

      // Log queue state at cycle start
      this.logger.trace(`[PROCESSOR-CYCLE] Checking ${this.queues.size} printer queues`, {
        cycleNumber,
        totalQueues: this.queues.size,
        activeJobs: this.activeJobs.size
      });

      // Process next jobs from all queues
      await this.processNextJobs();

      // Update metrics
      const cycleDuration = Date.now() - cycleStartTime;
      this.healthMetrics.lastExecutionDuration = cycleDuration;

      // Track execution times for average calculation
      this.healthMetrics.executionTimes.push(cycleDuration);
      if (this.healthMetrics.executionTimes.length > 100) {
        this.healthMetrics.executionTimes.shift();
      }
      this.healthMetrics.averageExecutionTime = Math.round(
        this.healthMetrics.executionTimes.reduce((a, b) => a + b, 0) / this.healthMetrics.executionTimes.length
      );

      this.logger.trace(`[PROCESSOR-CYCLE] Completed execution cycle #${cycleNumber}`, {
        duration: cycleDuration,
        averageExecutionTime: this.healthMetrics.averageExecutionTime
      });

      // Warn if cycle is taking too long
      if (cycleDuration > 1000) {
        this.logger.warn('[PROCESSOR-CYCLE] Slow cycle detected', {
          cycleNumber,
          duration: cycleDuration,
          threshold: 1000
        });
      }

    } catch (error) {
      this.logger.error('[PROCESSOR-CYCLE] Cycle execution failed', {
        cycleNumber,
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.processorLock = false;
    }
  }

  /**
   * Process next jobs from all queues with enhanced logging
   */
  async processNextJobs() {
    const startTime = Date.now();
    let jobsProcessed = 0;

    for (const [printerId, queue] of this.queues) {
      this.logger.trace('[PROCESS-NEXT-JOBS] Checking printer queue', {
        printerId,
        queueDepth: queue.length,
        paused: queue.paused || false
      });

      // Skip paused printers
      if (queue.paused) {
        this.logger.trace('[PROCESS-NEXT-JOBS] Skipping paused printer', { printerId });
        continue;
      }

      // Skip if printer already has active job
      const hasActiveJob = Array.from(this.activeJobs.values()).some(job => job.printerId === printerId);
      if (hasActiveJob) {
        this.logger.trace('[PROCESS-NEXT-JOBS] Printer has active job, skipping', {
          printerId,
          activeJobCount: 1
        });
        continue;
      }

      // Get next job from queue
      const nextJob = queue.shift();
      if (!nextJob) {
        this.logger.trace('[PROCESS-NEXT-JOBS] No jobs in queue', { printerId });
        continue;
      }

      this.logger.info(`📤 [PROCESS-NEXT-JOBS] Picked job from queue`, {
        jobId: nextJob.id,
        printerId,
        type: nextJob.type,
        priority: nextJob.priority,
        queueWaitTime: Date.now() - nextJob.timestamps.queued
      });

      // Process the job
      await this.processJob(nextJob);
      jobsProcessed++;
    }

    const processDuration = Date.now() - startTime;
    if (jobsProcessed > 0) {
      this.logger.debug('[PROCESS-NEXT-JOBS] Batch processing completed', {
        jobsProcessed,
        duration: processDuration,
        averageTimePerJob: Math.round(processDuration / jobsProcessed)
      });
    }
  }

  /**
   * Process a single print job with comprehensive logging and metrics
   * @param {Object} job - Print job to process
   */
  async processJob(job) {
    const jobStartTime = Date.now();
    this.logger.info(`⚙️ [PROCESS-JOB] Processing job ${job.id}`, {
      type: job.type,
      printerId: job.printerId,
      priority: job.priority,
      retryCount: job.retries
    });

    // Mark job as active
    job.status = 'processing';
    job.startedAt = new Date();
    job.timestamps.started = Date.now();
    this.activeJobs.set(job.id, job);

    this.logger.logJobEvent(job.id, job.type, 'started', 'Job processing started', {
      printerId: job.printerId,
      queueWaitTime: job.timestamps.started - job.timestamps.queued
    });

    this.emit('job-started', job);

    try {
      // Get or create Physical Printer Service instance
      if (!this.printerServiceCache) {
        this.logger.trace('[PROCESS-JOB] Creating PhysicalPrinterService instance');
        const PhysicalPrinterService = require('./physical-printer.service');
        this.printerServiceCache = new PhysicalPrinterService();
      }

      const physicalPrinter = this.printerServiceCache;
      this.logger.trace('[PROCESS-JOB] Using cached PhysicalPrinterService instance');

      // Process the job based on type
      let result;
      const executionStartTime = Date.now();

      this.logger.trace('[PROCESS-JOB] Starting physical printer execution', {
        jobId: job.id,
        type: job.type
      });

      switch (job.type) {
        case 'test':
          result = await physicalPrinter.printTestPage(job.printerConfig, job.testData);
          break;
        case 'receipt':
        case 'kitchen_order':
        case 'label':
          result = await physicalPrinter.processPrintJob(job.printerConfig, job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const executionDuration = Date.now() - executionStartTime;
      this.logger.trace('[PROCESS-JOB] Physical printer execution completed', {
        jobId: job.id,
        duration: executionDuration
      });

      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.timestamps.completed = Date.now();
      job.result = result;
      job.processingTime = job.timestamps.completed - job.timestamps.started;
      job.totalTime = job.timestamps.completed - job.timestamps.created;

      this.healthMetrics.totalJobsCompleted++;
      this.healthMetrics.totalJobsProcessed++;

      this.logger.info(`✅ [PROCESS-JOB] Job ${job.id} completed successfully`, {
        processingTime: job.processingTime,
        totalTime: job.totalTime,
        executionDuration
      });

      this.logger.logJobEvent(job.id, job.type, 'completed', 'Job completed successfully', {
        processingTime: job.processingTime,
        totalTime: job.totalTime,
        success: true
      });

      this.emit('job-completed', job);

    } catch (error) {
      this.logger.error(`❌ [PROCESS-JOB] Job ${job.id} failed`, {
        error: error.message,
        stack: error.stack,
        retryCount: job.retries,
        maxRetries: this.maxRetries
      });

      job.retries++;
      job.lastError = error.message;
      job.lastAttemptAt = new Date();
      job.timestamps.lastAttempt = Date.now();

      // Retry logic
      if (job.retries < this.maxRetries) {
        job.status = 'queued';

        this.logger.warn(`🔄 [PROCESS-JOB] Job ${job.id} will be retried`, {
          retryAttempt: job.retries,
          maxRetries: this.maxRetries,
          retryDelay: this.retryDelay * job.retries
        });

        // Re-add to queue with delay (exponential backoff)
        setTimeout(() => {
          const queue = this.queues.get(job.printerId);
          if (queue) {
            queue.unshift(job); // Add to front of queue for retry
            this.logger.info(`🔄 [PROCESS-JOB] Job ${job.id} re-queued for retry`, {
              attempt: job.retries + 1,
              maxRetries: this.maxRetries
            });
            this.logger.logJobEvent(job.id, job.type, 'retry', `Retry attempt ${job.retries}`, {
              lastError: job.lastError
            });
            this.emit('job-retry', job);
          } else {
            this.logger.error('[PROCESS-JOB] Queue not found for retry', {
              jobId: job.id,
              printerId: job.printerId
            });
          }
        }, this.retryDelay * job.retries); // Exponential backoff

      } else {
        // Max retries reached, mark as failed
        job.status = 'failed';
        job.failedAt = new Date();
        job.timestamps.failed = Date.now();
        job.error = error.message;
        job.totalTime = job.timestamps.failed - job.timestamps.created;

        this.healthMetrics.totalJobsFailed++;
        this.healthMetrics.totalJobsProcessed++;

        this.logger.error(`💥 [PROCESS-JOB] Job ${job.id} failed permanently`, {
          retries: job.retries,
          lastError: job.lastError,
          totalTime: job.totalTime
        });

        this.logger.logJobEvent(job.id, job.type, 'failed', 'Job failed after max retries', {
          retries: job.retries,
          error: job.error,
          totalTime: job.totalTime
        });

        this.emit('job-failed', job);
      }
    } finally {
      // Remove from active jobs if not retrying
      if (job.status !== 'queued') {
        this.activeJobs.delete(job.id);
        this.logger.trace('[PROCESS-JOB] Removed job from active jobs', {
          jobId: job.id,
          finalStatus: job.status
        });
      }

      // Log performance
      const jobTotalDuration = Date.now() - jobStartTime;
      this.logger.debug('[PERFORMANCE] processJob() completed', {
        jobId: job.id,
        duration: jobTotalDuration,
        status: job.status
      });

      if (jobTotalDuration > 10000) {
        this.logger.warn('[PERFORMANCE] Slow job detected', {
          jobId: job.id,
          duration: jobTotalDuration,
          threshold: 10000
        });
      }
    }
  }

  /**
   * Start deadlock detection system
   */
  startDeadlockDetection() {
    this.logger.info('🔍 [DEADLOCK-DETECTION] Starting deadlock detection system...');
    this.logger.debug('[DEADLOCK-DETECTION] Stuck job threshold:', { threshold: this.stuckJobThreshold });

    // Clear any existing interval
    if (this.deadlockCheckInterval) {
      clearInterval(this.deadlockCheckInterval);
    }

    // Check for stuck jobs every 10 seconds
    this.deadlockCheckInterval = setInterval(() => {
      this.detectAndRecoverStuckJobs();
    }, 10000);

    this.logger.info('✅ [DEADLOCK-DETECTION] Deadlock detection system started');
  }

  /**
   * Detect and recover stuck jobs
   */
  detectAndRecoverStuckJobs() {
    const now = Date.now();
    const stuckJobs = [];

    this.logger.trace('[DEADLOCK-DETECTION] Checking for stuck jobs', {
      activeJobCount: this.activeJobs.size,
      threshold: this.stuckJobThreshold
    });

    // Check all active jobs
    for (const [jobId, job] of this.activeJobs) {
      const processingDuration = now - job.timestamps.started;

      if (processingDuration > this.stuckJobThreshold) {
        stuckJobs.push({
          jobId: job.id,
          printerId: job.printerId,
          type: job.type,
          status: job.status,
          processingDuration,
          stuckFor: this.formatUptime(processingDuration)
        });

        this.logger.warn('⚠️ [DEADLOCK-DETECTION] Stuck job detected', {
          jobId: job.id,
          printerId: job.printerId,
          status: job.status,
          processingDuration,
          threshold: this.stuckJobThreshold
        });
      }
    }

    if (stuckJobs.length > 0) {
      this.healthMetrics.stuckJobDetections++;

      this.logger.error('[DEADLOCK-DETECTION] Multiple stuck jobs detected', {
        count: stuckJobs.length,
        jobs: stuckJobs
      });

      // Attempt recovery for stuck jobs
      for (const stuckJob of stuckJobs) {
        this.recoverStuckJob(stuckJob.jobId);
      }
    } else {
      this.logger.trace('[DEADLOCK-DETECTION] No stuck jobs detected');
    }
  }

  /**
   * Attempt to recover a stuck job
   */
  recoverStuckJob(jobId) {
    this.logger.warn(`🔧 [DEADLOCK-RECOVERY] Attempting to recover stuck job ${jobId}`);

    const job = this.activeJobs.get(jobId);
    if (!job) {
      this.logger.error('[DEADLOCK-RECOVERY] Job not found in active jobs', { jobId });
      return;
    }

    // Mark job as failed
    job.status = 'failed';
    job.failedAt = new Date();
    job.timestamps.failed = Date.now();
    job.error = 'Job stuck in processing state - forced recovery';
    job.totalTime = job.timestamps.failed - job.timestamps.created;

    this.activeJobs.delete(jobId);
    this.healthMetrics.totalJobsFailed++;
    this.healthMetrics.totalJobsProcessed++;

    this.logger.info('[DEADLOCK-RECOVERY] Stuck job marked as failed and removed', {
      jobId,
      printerId: job.printerId,
      processingDuration: job.timestamps.failed - job.timestamps.started
    });

    this.logger.logJobEvent(jobId, job.type, 'failed', 'Job recovered from stuck state', {
      error: job.error,
      processingDuration: job.timestamps.failed - job.timestamps.started
    });

    this.emit('job-failed', job);
  }

  /**
   * Log comprehensive queue statistics
   */
  logQueueStatistics() {
    const stats = this.getStatistics();

    this.logger.info('📊 [QUEUE-STATISTICS] Current queue state:', {
      totalPrinters: stats.totalPrinters,
      totalQueued: stats.totalQueued,
      totalActive: stats.totalActive,
      totalJobs: stats.totalJobs,
      processorHealthy: stats.health.processorHealthy,
      uptime: stats.health.uptimeFormatted
    });

    this.logger.debug('[QUEUE-STATISTICS] Health metrics:', {
      executionCycles: stats.health.executionCycleCount,
      averageExecutionTime: stats.health.averageExecutionTime,
      totalJobsProcessed: stats.health.totalJobsProcessed,
      totalJobsCompleted: stats.health.totalJobsCompleted,
      totalJobsFailed: stats.health.totalJobsFailed,
      stuckJobDetections: stats.health.stuckJobDetections
    });
  }

  /**
   * Generate unique job ID
   * @returns {string} Unique job ID
   */
  generateJobId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `job_${timestamp}_${random}`;
  }

  /**
   * Stop the queue service
   */
  stop() {
    this.logger.info('🛑 [STOP] Stopping Enhanced Print Queue Service...');
    this.isProcessing = false;

    // Clear processor interval
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
      this.logger.debug('[STOP] Processor interval cleared');
    }

    // Clear deadlock detection interval
    if (this.deadlockCheckInterval) {
      clearInterval(this.deadlockCheckInterval);
      this.deadlockCheckInterval = null;
      this.logger.debug('[STOP] Deadlock detection interval cleared');
    }

    // Cancel all active jobs
    for (const job of this.activeJobs.values()) {
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      job.timestamps.cancelled = Date.now();
      this.logger.logJobEvent(job.id, job.type, 'cancelled', 'Service stopped');
      this.emit('job-cancelled', job);
    }

    this.activeJobs.clear();
    this.queues.clear();

    // Log final statistics
    this.logQueueStatistics();

    this.logger.info('✅ [STOP] Enhanced Print Queue Service stopped');
  }

  /**
   * Add test print job
   * @param {Object} printerConfig - Printer configuration
   * @param {Object} testData - Test data
   * @param {number} priority - Job priority (1-10, 1 = highest)
   * @returns {string} Job ID
   */
  addTestPrintJob(printerConfig, testData = {}, priority = 1) {
    return this.addJob({
      type: 'test',
      printerId: printerConfig.id || printerConfig.name,
      printerConfig,
      testData: {
        branchName: testData.branchName || 'Test Branch',
        companyName: testData.companyName || 'Restaurant Platform',
        ...testData
      },
      priority
    });
  }

  /**
   * Add receipt print job
   * @param {Object} printerConfig - Printer configuration
   * @param {Object} receiptData - Receipt data
   * @param {number} priority - Job priority
   * @returns {string} Job ID
   */
  addReceiptPrintJob(printerConfig, receiptData, priority = 3) {
    return this.addJob({
      type: 'receipt',
      printerId: printerConfig.id || printerConfig.name,
      printerConfig,
      receiptData,
      priority
    });
  }

  /**
   * Add kitchen order print job
   * @param {Object} printerConfig - Printer configuration
   * @param {Object} orderData - Kitchen order data
   * @param {number} priority - Job priority
   * @returns {string} Job ID
   */
  addKitchenOrderPrintJob(printerConfig, orderData, priority = 2) {
    return this.addJob({
      type: 'kitchen_order',
      printerId: printerConfig.id || printerConfig.name,
      printerConfig,
      orderData,
      priority
    });
  }
}

module.exports = PrintQueueService;
