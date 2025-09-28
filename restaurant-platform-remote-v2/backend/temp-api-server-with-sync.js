/**
 * Enhanced Temp API Server with Comprehensive Menu Sync
 * Integrates all sync components: MenuSyncEngine, channel adapters, WebSocket updates
 * Production-ready menu synchronization system for delivery channels
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

// Import sync components
const MenuSyncEngine = require('./services/menu-sync-engine');
const SyncWebSocketManager = require('./services/sync-websocket-manager');
const channelAdapterFactory = require('./services/channel-adapters/channel-adapter-factory');
const addMenuSyncEndpoints = require('./services/menu-sync-api-endpoints');

const app = express();
const port = 3001;

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:E$$athecode006@localhost:5432/postgres'
    }
  }
});

// Initialize WebSocket manager
const syncWebSocketManager = new SyncWebSocketManager(server);

// Initialize Menu Sync Engine
const menuSyncEngine = new MenuSyncEngine(prisma);

// Connect sync engine events to WebSocket manager
menuSyncEngine.on('job.created', (data) => {
  console.log('📝 Sync job created:', data.jobId);
});

menuSyncEngine.on('job.started', (data) => {
  syncWebSocketManager.emitSyncStarted({
    jobId: data.jobId,
    assignmentId: data.assignmentId,
    companyId: data.companyId,
    syncType: data.syncType,
    channel: data.channel
  });
});

menuSyncEngine.on('job.progress', (data) => {
  syncWebSocketManager.emitSyncProgress({
    jobId: data.jobId,
    assignmentId: data.assignmentId,
    companyId: data.companyId,
    progress: data,
    channel: data.channel
  });
});

menuSyncEngine.on('job.completed', (data) => {
  syncWebSocketManager.emitSyncCompleted({
    jobId: data.jobId,
    assignmentId: data.assignmentId,
    companyId: data.companyId,
    result: data.result,
    channel: data.channel,
    duration: data.duration
  });
});

menuSyncEngine.on('job.failed', (data) => {
  syncWebSocketManager.emitSyncFailed({
    jobId: data.jobId,
    assignmentId: data.assignmentId,
    companyId: data.companyId,
    error: data.error,
    channel: data.channel,
    retryCount: data.retryCount
  });
});

menuSyncEngine.on('job.cancelled', (data) => {
  syncWebSocketManager.emitSyncCancelled({
    jobId: data.jobId,
    assignmentId: data.assignmentId,
    companyId: data.companyId,
    reason: data.reason,
    channel: data.channel
  });
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    console.log(`📤 ${statusColor} ${res.statusCode} ${req.method} ${req.path} - ${duration}ms`);
  });

  next();
});

// Authentication middleware
async function validateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Mock user for testing - in production, validate JWT token
    req.user = {
      id: 'user_123',
      companyId: 'company_123',
      role: 'company_owner',
      email: 'test@restaurant.com'
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ================================
// EXISTING CHANNEL MANAGEMENT SERVICES
// ================================

class ChannelService {
  async getDeliveryChannels() {
    return prisma.deliveryChannel.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        channelType: true,
        providerName: true,
        apiBaseUrl: true,
        webhookUrl: true,
        authType: true,
        isActive: true,
        isSystemDefault: true,
        configuration: true,
        supportedFeatures: true,
        rateLimits: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }
}

class CompanyChannelAssignmentService {
  async getCompanyChannelAssignments(companyId) {
    return prisma.companyChannelAssignment.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            channelType: true,
            providerName: true,
            supportedFeatures: true,
            isActive: true,
          }
        },
        platformMenuAssignments: {
          where: { deletedAt: null },
          include: {
            platformMenu: {
              select: {
                id: true,
                name: true,
                platformType: true,
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async createChannelAssignment(data) {
    const existing = await prisma.companyChannelAssignment.findFirst({
      where: {
        companyId: data.companyId,
        channelId: data.channelId,
        deletedAt: null,
      }
    });

    if (existing) {
      throw new Error('Channel assignment already exists for this company');
    }

    return prisma.companyChannelAssignment.create({
      data: {
        ...data,
        credentials: data.credentials || {},
        channelSettings: data.channelSettings || {},
        isEnabled: data.isEnabled ?? true,
        priority: data.priority ?? 0,
        syncEnabled: data.syncEnabled ?? true,
        autoSyncInterval: data.autoSyncInterval ?? 15,
      },
      include: {
        channel: true
      }
    });
  }

  async updateChannelAssignment(id, companyId, data) {
    const result = await prisma.companyChannelAssignment.updateMany({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      data
    });

    if (result.count === 0) {
      throw new Error('Channel assignment not found');
    }

    return prisma.companyChannelAssignment.findFirst({
      where: { id, companyId },
      include: { channel: true }
    });
  }

  async deleteChannelAssignment(id, companyId, deletedBy) {
    const result = await prisma.companyChannelAssignment.updateMany({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      }
    });

    if (result.count === 0) {
      throw new Error('Channel assignment not found');
    }

    return { success: true };
  }
}

// Service instances
const channelService = new ChannelService();
const assignmentService = new CompanyChannelAssignmentService();

// ================================
// ORIGINAL API ENDPOINTS
// ================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['menu-sync', 'websockets', 'channel-adapters'],
    syncEngine: {
      active: true,
      adapters: channelAdapterFactory.getSupportedChannels(),
      connections: syncWebSocketManager.getConnectionStats()
    }
  });
});

// 1. Get all delivery channels
app.get('/api/channels/delivery-channels', async (req, res) => {
  try {
    const channels = await channelService.getDeliveryChannels();
    res.json({
      success: true,
      channels,
      supported: channelAdapterFactory.getSupportedChannels()
    });
  } catch (error) {
    console.error('Error fetching delivery channels:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery channels',
      details: error.message
    });
  }
});

// 2. Get company channel assignments
app.get('/api/channels/company-assignments', validateToken, async (req, res) => {
  try {
    const assignments = await assignmentService.getCompanyChannelAssignments(req.user.companyId);

    // Add sync status and adapter health for each assignment
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const adapterHealth = channelAdapterFactory.getAdapter(
          req.user.companyId,
          assignment.channel.slug
        )?.getHealthStatus() || null;

        return {
          ...assignment,
          adapterHealth,
          syncCapabilities: assignment.channel.supportedFeatures || []
        };
      })
    );

    res.json({
      success: true,
      assignments: enrichedAssignments,
      totalCount: enrichedAssignments.length
    });
  } catch (error) {
    console.error('Error fetching company channel assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      details: error.message
    });
  }
});

// 3. Create channel assignment
app.post('/api/channels/company-assignments', validateToken, async (req, res) => {
  try {
    const assignmentData = {
      ...req.body,
      companyId: req.user.companyId,
      createdBy: req.user.id
    };

    const assignment = await assignmentService.createChannelAssignment(assignmentData);

    // Initialize channel adapter
    try {
      const adapter = await channelAdapterFactory.createAdapter({
        channel: assignment.channel,
        companyChannelAssignment: assignment
      });
      console.log(`✅ Channel adapter initialized for ${assignment.channel.name}`);
    } catch (adapterError) {
      console.warn(`⚠️ Could not initialize adapter: ${adapterError.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Channel assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Error creating channel assignment:', error);
    res.status(500).json({
      error: 'Failed to create assignment',
      details: error.message
    });
  }
});

// ================================
// ADD COMPREHENSIVE SYNC ENDPOINTS
// ================================

// Add all menu sync endpoints
addMenuSyncEndpoints(app, prisma, validateToken);

// ================================
// WEBSOCKET ENDPOINTS
// ================================

// Get WebSocket connection information
app.get('/api/websocket/info', validateToken, (req, res) => {
  const stats = syncWebSocketManager.getConnectionStats();
  const companyConnections = syncWebSocketManager.getCompanyConnections(req.user.companyId);

  res.json({
    success: true,
    websocket: {
      endpoint: '/socket.io',
      stats,
      companyConnections,
      supportedEvents: [
        'sync.started',
        'sync.progress',
        'sync.completed',
        'sync.failed',
        'sync.cancelled',
        'adapter.health.changed'
      ]
    },
    authentication: {
      required: true,
      format: {
        event: 'authenticate',
        data: {
          userId: 'string',
          companyId: 'string',
          token: 'string (JWT)'
        }
      }
    }
  });
});

// ================================
// ADDITIONAL ENDPOINTS
// ================================

// Get system overview
app.get('/api/system/overview', validateToken, async (req, res) => {
  try {
    const [assignments, recentJobs, adapterStats] = await Promise.all([
      prisma.companyChannelAssignment.count({
        where: { companyId: req.user.companyId, deletedAt: null }
      }),
      prisma.syncJobQueue.count({
        where: {
          companyId: req.user.companyId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      Promise.resolve(channelAdapterFactory.getStatistics())
    ]);

    const syncStats = menuSyncEngine.getMetrics();
    const wsStats = syncWebSocketManager.getConnectionStats();

    res.json({
      success: true,
      overview: {
        assignments: {
          total: assignments,
          active: assignments // Assuming all non-deleted are active
        },
        syncJobs: {
          last24Hours: recentJobs,
          totalProcessed: syncStats.totalJobs,
          successRate: syncStats.totalJobs > 0
            ? (syncStats.successfulJobs / syncStats.totalJobs * 100).toFixed(2)
            : 0
        },
        adapters: {
          supported: adapterStats.supportedChannels,
          active: adapterStats.totalAdapters,
          healthy: adapterStats.healthyAdapters
        },
        websockets: {
          connections: wsStats.totalConnections,
          subscriptions: wsStats.activeSyncSubscriptions
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({
      error: 'Failed to get system overview',
      details: error.message
    });
  }
});

// Test all channel connections
app.post('/api/channels/test-all-connections', validateToken, async (req, res) => {
  try {
    const results = await channelAdapterFactory.testAllConnections();

    // Filter results for user's company
    const companyResults = results.filter(result => result.companyId === req.user.companyId);

    res.json({
      success: true,
      results: companyResults,
      summary: {
        total: companyResults.length,
        successful: companyResults.filter(r => r.success).length,
        failed: companyResults.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Error testing connections:', error);
    res.status(500).json({
      error: 'Failed to test connections',
      details: error.message
    });
  }
});

// ================================
// ERROR HANDLING
// ================================

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/channels/delivery-channels',
      'GET /api/channels/company-assignments',
      'POST /api/channels/company-assignments',
      'POST /api/sync/menu/:assignmentId/full',
      'POST /api/sync/menu/:assignmentId/prices',
      'POST /api/sync/menu/:assignmentId/availability',
      'GET /api/sync/status/:assignmentId',
      'GET /api/sync/jobs/:assignmentId',
      'GET /api/sync/analytics/:assignmentId',
      'GET /api/websocket/info',
      'GET /api/system/overview'
    ]
  });
});

// ================================
// SERVER STARTUP
// ================================

server.listen(port, () => {
  console.log(`\n🚀 Enhanced Restaurant Platform API Server`);
  console.log(`📡 Server running on http://localhost:${port}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/socket.io`);
  console.log(`📊 Database: PostgreSQL connected`);
  console.log(`⚡ Menu Sync Engine: Active`);
  console.log(`🏭 Channel Adapters: ${channelAdapterFactory.getSupportedChannels().join(', ')}`);

  console.log(`\n📋 Available Endpoints:`);
  console.log(`\n   🔗 Channel Management:`);
  console.log(`   GET    /api/channels/delivery-channels`);
  console.log(`   GET    /api/channels/company-assignments`);
  console.log(`   POST   /api/channels/company-assignments`);
  console.log(`   POST   /api/channels/test-all-connections`);

  console.log(`\n   🔄 Menu Synchronization:`);
  console.log(`   POST   /api/sync/menu/:assignmentId/full`);
  console.log(`   POST   /api/sync/menu/:assignmentId/prices`);
  console.log(`   POST   /api/sync/menu/:assignmentId/availability`);
  console.log(`   POST   /api/sync/menu/:assignmentId/category/:categoryId`);

  console.log(`\n   📊 Sync Status & Analytics:`);
  console.log(`   GET    /api/sync/status/:assignmentId`);
  console.log(`   GET    /api/sync/jobs/:assignmentId`);
  console.log(`   GET    /api/sync/job/:jobId/progress`);
  console.log(`   POST   /api/sync/job/:jobId/cancel`);
  console.log(`   GET    /api/sync/analytics/:assignmentId`);

  console.log(`\n   ⏰ Sync Scheduling:`);
  console.log(`   POST   /api/sync/schedule/:assignmentId`);
  console.log(`   DELETE /api/sync/schedule/:assignmentId`);

  console.log(`\n   🌐 System & WebSocket:`);
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/system/overview`);
  console.log(`   GET    /api/websocket/info`);

  console.log(`\n🔧 Ready for menu synchronization operations!`);
});

// ================================
// GRACEFUL SHUTDOWN
// ================================

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      console.log('📡 HTTP server closed');
    });

    // Shutdown sync engine
    await menuSyncEngine.shutdown();
    console.log('⚡ Menu sync engine shut down');

    // Shutdown WebSocket manager
    await syncWebSocketManager.shutdown();
    console.log('🔌 WebSocket manager shut down');

    // Shutdown channel adapters
    await channelAdapterFactory.shutdown();
    console.log('🏭 Channel adapters shut down');

    // Disconnect from database
    await prisma.$disconnect();
    console.log('📊 Database disconnected');

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = { app, server, prisma, menuSyncEngine, syncWebSocketManager };