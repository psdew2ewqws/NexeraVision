const EventEmitter = require('events');

class PrintQueueService extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map(); // Map of printerId -> queue
    this.activeJobs = new Map(); // Map of jobId -> job details
    this.isProcessing = false;
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Initialize print queue service
   */
  initialize() {
    console.log('🚀 [PRINT-QUEUE] Initializing Print Queue Service...');
    this.isProcessing = true;
    this.startQueueProcessor();
    console.log('✅ [PRINT-QUEUE] Print Queue Service initialized');
  }

  /**
   * Add print job to queue
   * @param {Object} job - Print job object
   * @returns {string} Job ID
   */
  addJob(job) {
    const jobId = this.generateJobId();
    const printJob = {
      id: jobId,
      ...job,
      status: 'queued',
      createdAt: new Date(),
      retries: 0,
      priority: job.priority || 5 // 1 = highest, 10 = lowest
    };

    // Get or create queue for printer
    if (!this.queues.has(job.printerId)) {
      this.queues.set(job.printerId, []);
    }

    const queue = this.queues.get(job.printerId);

    // Insert job based on priority (higher priority = lower number)
    const insertIndex = queue.findIndex(existingJob => existingJob.priority > printJob.priority);
    if (insertIndex === -1) {
      queue.push(printJob);
    } else {
      queue.splice(insertIndex, 0, printJob);
    }

    console.log(`📥 [PRINT-QUEUE] Job ${jobId} queued for printer ${job.printerId} (priority: ${printJob.priority})`);
    this.emit('job-queued', printJob);

    return jobId;
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object} Job status
   */
  getJobStatus(jobId) {
    if (this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId);
    }

    // Search in queues
    for (const [printerId, queue] of this.queues) {
      const job = queue.find(j => j.id === jobId);
      if (job) {
        return job;
      }
    }

    return {
      id: jobId,
      status: 'not_found',
      error: 'Job not found'
    };
  }

  /**
   * Get queue status for a printer
   * @param {string} printerId - Printer ID
   * @returns {Object} Queue status
   */
  getQueueStatus(printerId) {
    const queue = this.queues.get(printerId) || [];
    const activeJob = Array.from(this.activeJobs.values()).find(job => job.printerId === printerId);

    return {
      printerId,
      queueLength: queue.length,
      activeJob: activeJob || null,
      status: queue.length > 0 ? 'busy' : 'idle',
      nextJobs: queue.slice(0, 3).map(job => ({
        id: job.id,
        type: job.type,
        priority: job.priority,
        createdAt: job.createdAt
      }))
    };
  }

  /**
   * Get all queue statuses
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

    return statuses;
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} Success status
   */
  cancelJob(jobId) {
    console.log(`❌ [PRINT-QUEUE] Cancelling job ${jobId}`);

    // Check if job is currently active
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      this.activeJobs.delete(jobId);
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
        this.emit('job-cancelled', job);
        return true;
      }
    }

    return false;
  }

  /**
   * Cancel all jobs for a printer
   * @param {string} printerId - Printer ID
   * @returns {number} Number of jobs cancelled
   */
  cancelPrinterJobs(printerId) {
    console.log(`❌ [PRINT-QUEUE] Cancelling all jobs for printer ${printerId}`);

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

    return cancelledCount;
  }

  /**
   * Pause queue processing for a printer
   * @param {string} printerId - Printer ID
   */
  pausePrinter(printerId) {
    console.log(`⏸️ [PRINT-QUEUE] Pausing printer ${printerId}`);

    const queue = this.queues.get(printerId);
    if (queue) {
      queue.paused = true;
      this.emit('printer-paused', { printerId });
    }
  }

  /**
   * Resume queue processing for a printer
   * @param {string} printerId - Printer ID
   */
  resumePrinter(printerId) {
    console.log(`▶️ [PRINT-QUEUE] Resuming printer ${printerId}`);

    const queue = this.queues.get(printerId);
    if (queue) {
      queue.paused = false;
      this.emit('printer-resumed', { printerId });
    }
  }

  /**
   * Clear all completed/failed jobs from queues
   */
  clearCompletedJobs() {
    console.log('🧹 [PRINT-QUEUE] Clearing completed jobs...');

    let clearedCount = 0;

    // Clear completed jobs from active jobs
    for (const [jobId, job] of this.activeJobs) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        this.activeJobs.delete(jobId);
        clearedCount++;
      }
    }

    console.log(`✅ [PRINT-QUEUE] Cleared ${clearedCount} completed jobs`);
    this.emit('jobs-cleared', { count: clearedCount });
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStatistics() {
    let totalQueued = 0;
    let totalActive = this.activeJobs.size;
    let totalPrinters = this.queues.size;

    for (const queue of this.queues.values()) {
      totalQueued += queue.length;
    }

    return {
      totalPrinters,
      totalQueued,
      totalActive,
      totalJobs: totalQueued + totalActive,
      isProcessing: this.isProcessing,
      timestamp: new Date()
    };
  }

  /**
   * Start the queue processor
   */
  startQueueProcessor() {
    console.log('🔄 [PRINT-QUEUE] Starting queue processor...');

    const processInterval = setInterval(async () => {
      if (!this.isProcessing) {
        clearInterval(processInterval);
        return;
      }

      await this.processNextJobs();
    }, 1000); // Process every second
  }

  /**
   * Process next jobs from all queues
   */
  async processNextJobs() {
    for (const [printerId, queue] of this.queues) {
      // Skip paused printers
      if (queue.paused) {
        continue;
      }

      // Skip if printer already has active job
      const hasActiveJob = Array.from(this.activeJobs.values()).some(job => job.printerId === printerId);
      if (hasActiveJob) {
        continue;
      }

      // Get next job from queue
      const nextJob = queue.shift();
      if (!nextJob) {
        continue;
      }

      // Process the job
      await this.processJob(nextJob);
    }
  }

  /**
   * Process a single print job
   * @param {Object} job - Print job to process
   */
  async processJob(job) {
    console.log(`⚙️ [PRINT-QUEUE] Processing job ${job.id} (${job.type})`);

    // Mark job as active
    job.status = 'processing';
    job.startedAt = new Date();
    this.activeJobs.set(job.id, job);

    this.emit('job-started', job);

    try {
      // Get the physical printer service (Enhanced with TypeScript-style error handling)
      const PhysicalPrinterService = require('./physical-printer.service');
      const physicalPrinter = new PhysicalPrinterService();

      // Process the job based on type
      let result;
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

      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      job.processingTime = job.completedAt - job.startedAt;

      console.log(`✅ [PRINT-QUEUE] Job ${job.id} completed successfully (${job.processingTime}ms)`);
      this.emit('job-completed', job);

    } catch (error) {
      console.error(`❌ [PRINT-QUEUE] Job ${job.id} failed:`, error);

      job.retries++;
      job.lastError = error.message;
      job.lastAttemptAt = new Date();

      // Retry logic
      if (job.retries < this.maxRetries) {
        job.status = 'queued';

        // Re-add to queue with delay
        setTimeout(() => {
          const queue = this.queues.get(job.printerId);
          if (queue) {
            queue.unshift(job); // Add to front of queue for retry
            console.log(`🔄 [PRINT-QUEUE] Job ${job.id} queued for retry (attempt ${job.retries + 1})`);
            this.emit('job-retry', job);
          }
        }, this.retryDelay * job.retries); // Exponential backoff

      } else {
        // Max retries reached, mark as failed
        job.status = 'failed';
        job.failedAt = new Date();
        job.error = error.message;

        console.error(`💥 [PRINT-QUEUE] Job ${job.id} failed permanently after ${job.retries} retries`);
        this.emit('job-failed', job);
      }
    } finally {
      // Remove from active jobs if not retrying
      if (job.status !== 'queued') {
        this.activeJobs.delete(job.id);
      }
    }
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
    console.log('🛑 [PRINT-QUEUE] Stopping Print Queue Service...');
    this.isProcessing = false;

    // Cancel all active jobs
    for (const job of this.activeJobs.values()) {
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      this.emit('job-cancelled', job);
    }

    this.activeJobs.clear();
    this.queues.clear();

    console.log('✅ [PRINT-QUEUE] Print Queue Service stopped');
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