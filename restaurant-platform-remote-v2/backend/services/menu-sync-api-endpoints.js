/**
 * Menu Sync API Endpoints
 * Comprehensive sync API endpoints to be integrated with temp-api-server.js
 * Provides full menu synchronization functionality with job tracking and real-time updates
 */

const MenuSyncEngine = require('./menu-sync-engine');
const channelAdapterFactory = require('./channel-adapters/channel-adapter-factory');

// Initialize Menu Sync Engine
let menuSyncEngine = null;

function initializeSyncEngine(prisma) {
  if (!menuSyncEngine) {
    menuSyncEngine = new MenuSyncEngine(prisma);
    console.log('🔄 Menu Sync Engine initialized');
  }
  return menuSyncEngine;
}

/**
 * Add these endpoints to your Express app
 * Usage: require('./services/menu-sync-api-endpoints')(app, prisma, validateToken);
 */
function addMenuSyncEndpoints(app, prisma, validateToken) {
  const syncEngine = initializeSyncEngine(prisma);

  // ================================
  // MANUAL SYNC ENDPOINTS
  // ================================

  /**
   * POST /api/sync/menu/:assignmentId/full
   * Start full menu sync
   */
  app.post('/api/sync/menu/:assignmentId/full', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const {
        platformMenuId = null,
        priority = 'normal',
        forceSync = false,
        batchSize = 50
      } = req.body;

      // Verify assignment belongs to user's company
      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null,
          isEnabled: true,
          syncEnabled: true
        },
        include: {
          channel: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found or sync disabled'
        });
      }

      const jobId = await syncEngine.startFullMenuSync(assignmentId, {
        platformMenuId,
        priority,
        forceSync,
        batchSize,
        userInitiated: true,
        triggeredBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Full menu sync started',
        jobId,
        channel: assignment.channel,
        estimatedDuration: '2-5 minutes'
      });

    } catch (error) {
      console.error('Error starting full menu sync:', error);
      res.status(500).json({
        error: 'Failed to start menu sync',
        details: error.message
      });
    }
  });

  /**
   * POST /api/sync/menu/:assignmentId/prices
   * Start prices only sync
   */
  app.post('/api/sync/menu/:assignmentId/prices', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { platformMenuId = null, priority = 'high' } = req.body;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null,
          syncEnabled: true
        },
        include: {
          channel: { select: { id: true, name: true, slug: true } }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found or sync disabled'
        });
      }

      const jobId = await syncEngine.startPricesOnlySync(assignmentId, {
        platformMenuId,
        priority,
        triggeredBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Prices sync started',
        jobId,
        channel: assignment.channel,
        estimatedDuration: '30-60 seconds'
      });

    } catch (error) {
      console.error('Error starting prices sync:', error);
      res.status(500).json({
        error: 'Failed to start prices sync',
        details: error.message
      });
    }
  });

  /**
   * POST /api/sync/menu/:assignmentId/availability
   * Start availability only sync
   */
  app.post('/api/sync/menu/:assignmentId/availability', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { platformMenuId = null, priority = 'high' } = req.body;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null,
          syncEnabled: true
        },
        include: {
          channel: { select: { id: true, name: true, slug: true } }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found or sync disabled'
        });
      }

      const jobId = await syncEngine.startAvailabilityOnlySync(assignmentId, {
        platformMenuId,
        priority,
        triggeredBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Availability sync started',
        jobId,
        channel: assignment.channel,
        estimatedDuration: '15-30 seconds'
      });

    } catch (error) {
      console.error('Error starting availability sync:', error);
      res.status(500).json({
        error: 'Failed to start availability sync',
        details: error.message
      });
    }
  });

  /**
   * POST /api/sync/menu/:assignmentId/category/:categoryId
   * Start category-specific sync
   */
  app.post('/api/sync/menu/:assignmentId/category/:categoryId', validateToken, async (req, res) => {
    try {
      const { assignmentId, categoryId } = req.params;
      const { priority = 'normal' } = req.body;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null,
          syncEnabled: true
        },
        include: {
          channel: { select: { id: true, name: true, slug: true } }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found or sync disabled'
        });
      }

      // Verify category exists
      const category = await prisma.menuCategory.findFirst({
        where: {
          id: categoryId,
          companyId: req.user.companyId,
          deletedAt: null
        }
      });

      if (!category) {
        return res.status(404).json({
          error: 'Category not found'
        });
      }

      const jobId = await syncEngine.startCategorySync(assignmentId, categoryId, {
        priority,
        triggeredBy: req.user.id
      });

      res.json({
        success: true,
        message: `Category "${category.name}" sync started`,
        jobId,
        channel: assignment.channel,
        category: { id: category.id, name: category.name },
        estimatedDuration: '1-2 minutes'
      });

    } catch (error) {
      console.error('Error starting category sync:', error);
      res.status(500).json({
        error: 'Failed to start category sync',
        details: error.message
      });
    }
  });

  // ================================
  // SYNC STATUS ENDPOINTS
  // ================================

  /**
   * GET /api/sync/status/:assignmentId
   * Get current sync status for assignment
   */
  app.get('/api/sync/status/:assignmentId', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null
        },
        include: {
          channel: {
            select: { id: true, name: true, slug: true, supportedFeatures: true }
          }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found'
        });
      }

      // Get recent sync jobs
      const recentJobs = await prisma.syncJobQueue.findMany({
        where: {
          assignmentId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          syncType: true,
          priority: true,
          startedAt: true,
          completedAt: true,
          progressPercentage: true,
          errorMessage: true,
          userInitiated: true
        }
      });

      // Get active job
      const activeJob = recentJobs.find(job =>
        ['pending', 'queued', 'running', 'retrying'].includes(job.status)
      );

      // Check adapter health
      const adapter = channelAdapterFactory.getAdapter(req.user.companyId, assignment.channel.slug);
      const adapterHealth = adapter ? adapter.getHealthStatus() : null;

      res.json({
        success: true,
        assignment: {
          id: assignment.id,
          channel: assignment.channel,
          syncEnabled: assignment.syncEnabled,
          lastSyncAt: assignment.lastSyncAt,
          syncStatus: assignment.syncStatus,
          autoSyncInterval: assignment.autoSyncInterval
        },
        activeJob,
        recentJobs,
        adapterHealth,
        supportedSyncTypes: ['full_menu', 'prices_only', 'availability_only', 'category_sync']
      });

    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({
        error: 'Failed to get sync status',
        details: error.message
      });
    }
  });

  /**
   * GET /api/sync/jobs/:assignmentId
   * Get sync job history
   */
  app.get('/api/sync/jobs/:assignmentId', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const {
        page = 1,
        limit = 20,
        status = null,
        syncType = null,
        days = 7
      } = req.query;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found'
        });
      }

      const where = {
        assignmentId,
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      };

      if (status) {
        where.status = status;
      }

      if (syncType) {
        where.syncType = syncType;
      }

      const [jobs, totalCount] = await Promise.all([
        prisma.syncJobQueue.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: parseInt(limit),
          include: {
            items: {
              where: { status: 'failed' },
              take: 5,
              select: {
                itemName: true,
                errorMessage: true,
                errorCode: true
              }
            },
            logs: {
              where: { level: 'error' },
              take: 3,
              orderBy: { timestamp: 'desc' },
              select: {
                message: true,
                details: true,
                timestamp: true
              }
            }
          }
        }),
        prisma.syncJobQueue.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          availableStatuses: ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'retrying'],
          availableSyncTypes: ['full_menu', 'prices_only', 'availability_only', 'category_sync']
        }
      });

    } catch (error) {
      console.error('Error getting sync jobs:', error);
      res.status(500).json({
        error: 'Failed to get sync jobs',
        details: error.message
      });
    }
  });

  /**
   * GET /api/sync/job/:jobId/progress
   * Get real-time job progress
   */
  app.get('/api/sync/job/:jobId/progress', validateToken, async (req, res) => {
    try {
      const { jobId } = req.params;

      const jobStatus = await syncEngine.getSyncJobStatus(jobId);

      // Verify job belongs to user's company
      if (jobStatus.channel && !await verifyJobBelongsToCompany(jobId, req.user.companyId)) {
        return res.status(404).json({
          error: 'Sync job not found'
        });
      }

      res.json({
        success: true,
        job: jobStatus
      });

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Sync job not found'
        });
      }

      console.error('Error getting job progress:', error);
      res.status(500).json({
        error: 'Failed to get job progress',
        details: error.message
      });
    }
  });

  /**
   * POST /api/sync/job/:jobId/cancel
   * Cancel running sync job
   */
  app.post('/api/sync/job/:jobId/cancel', validateToken, async (req, res) => {
    try {
      const { jobId } = req.params;

      // Verify job belongs to user's company
      if (!await verifyJobBelongsToCompany(jobId, req.user.companyId)) {
        return res.status(404).json({
          error: 'Sync job not found'
        });
      }

      const cancelled = await syncEngine.cancelSyncJob(jobId);

      if (!cancelled) {
        return res.status(400).json({
          error: 'Job cannot be cancelled (already completed or failed)'
        });
      }

      res.json({
        success: true,
        message: 'Sync job cancelled successfully',
        jobId
      });

    } catch (error) {
      console.error('Error cancelling sync job:', error);
      res.status(500).json({
        error: 'Failed to cancel sync job',
        details: error.message
      });
    }
  });

  // ================================
  // SYNC SCHEDULING ENDPOINTS
  // ================================

  /**
   * POST /api/sync/schedule/:assignmentId
   * Schedule automatic sync
   */
  app.post('/api/sync/schedule/:assignmentId', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const {
        syncInterval = 15,
        syncType = 'full_menu',
        enabled = true,
        timeWindow = null
      } = req.body;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found'
        });
      }

      const schedule = await syncEngine.scheduleAutoSync(assignmentId, {
        syncInterval,
        syncType,
        enabled,
        timeWindow
      });

      res.json({
        success: true,
        message: 'Automatic sync scheduled successfully',
        schedule
      });

    } catch (error) {
      console.error('Error scheduling sync:', error);
      res.status(500).json({
        error: 'Failed to schedule sync',
        details: error.message
      });
    }
  });

  /**
   * DELETE /api/sync/schedule/:assignmentId
   * Cancel scheduled sync
   */
  app.delete('/api/sync/schedule/:assignmentId', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found'
        });
      }

      const cancelled = await syncEngine.cancelScheduledSync(assignmentId);

      res.json({
        success: true,
        message: 'Scheduled sync cancelled successfully',
        cancelled
      });

    } catch (error) {
      console.error('Error cancelling scheduled sync:', error);
      res.status(500).json({
        error: 'Failed to cancel scheduled sync',
        details: error.message
      });
    }
  });

  // ================================
  // SYNC ANALYTICS ENDPOINTS
  // ================================

  /**
   * GET /api/sync/analytics/:assignmentId
   * Get sync performance analytics
   */
  app.get('/api/sync/analytics/:assignmentId', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const {
        days = 7,
        includeItems = false,
        includeErrors = true
      } = req.query;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null
        },
        include: {
          channel: { select: { id: true, name: true, slug: true } }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found'
        });
      }

      const analytics = await syncEngine.getSyncAnalytics(assignmentId, {
        days: parseInt(days),
        includeItems: includeItems === 'true',
        includeErrors: includeErrors === 'true'
      });

      res.json({
        success: true,
        assignment: {
          id: assignment.id,
          channel: assignment.channel
        },
        analytics
      });

    } catch (error) {
      console.error('Error getting sync analytics:', error);
      res.status(500).json({
        error: 'Failed to get sync analytics',
        details: error.message
      });
    }
  });

  // ================================
  // CHANNEL HEALTH ENDPOINTS
  // ================================

  /**
   * GET /api/sync/health
   * Get overall sync system health
   */
  app.get('/api/sync/health', validateToken, async (req, res) => {
    try {
      const companyAdapterHealth = channelAdapterFactory.getCompanyAdapterHealth(req.user.companyId);
      const syncMetrics = syncEngine.getMetrics();

      // Get company's active assignments
      const assignments = await prisma.companyChannelAssignment.findMany({
        where: {
          companyId: req.user.companyId,
          deletedAt: null,
          isEnabled: true
        },
        include: {
          channel: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      res.json({
        success: true,
        overall: {
          totalAssignments: assignments.length,
          healthyAdapters: companyAdapterHealth.filter(h => h.isHealthy).length,
          unhealthyAdapters: companyAdapterHealth.filter(h => !h.isHealthy).length
        },
        assignments: assignments.map(assignment => ({
          id: assignment.id,
          channel: assignment.channel,
          syncEnabled: assignment.syncEnabled,
          lastSyncAt: assignment.lastSyncAt,
          syncStatus: assignment.syncStatus,
          health: companyAdapterHealth.find(h => h.channelName === assignment.channel.name)
        })),
        syncMetrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting sync health:', error);
      res.status(500).json({
        error: 'Failed to get sync health',
        details: error.message
      });
    }
  });

  /**
   * POST /api/sync/test-connection/:assignmentId
   * Test connection to specific channel
   */
  app.post('/api/sync/test-connection/:assignmentId', validateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;

      const assignment = await prisma.companyChannelAssignment.findFirst({
        where: {
          id: assignmentId,
          companyId: req.user.companyId,
          deletedAt: null
        },
        include: {
          channel: { select: { id: true, name: true, slug: true } }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          error: 'Channel assignment not found'
        });
      }

      const connectionTest = await channelAdapterFactory.testAdapterConnection(
        req.user.companyId,
        assignment.channel.slug
      );

      res.json({
        success: true,
        assignment: {
          id: assignment.id,
          channel: assignment.channel
        },
        connectionTest
      });

    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({
        error: 'Failed to test connection',
        details: error.message
      });
    }
  });

  // ================================
  // HELPER FUNCTIONS
  // ================================

  async function verifyJobBelongsToCompany(jobId, companyId) {
    const job = await prisma.syncJobQueue.findFirst({
      where: {
        id: jobId,
        companyId
      }
    });
    return !!job;
  }
}

module.exports = addMenuSyncEndpoints;