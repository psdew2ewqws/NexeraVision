#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

// Import Talabat integration components
const TalabatWebhookReceiver = require('./src/webhooks/talabat.webhook');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  path: '/events/socket.io/',
});

const PORT = process.env.PORT || 3002;
const RESTAURANT_PLATFORM_URL = 'http://localhost:3001';

// Initialize Talabat webhook receiver
const talabatWebhook = new TalabatWebhookReceiver();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// WebSocket connection management
const connectedClients = new Map();

io.on('connection', (socket) => {
  connectedClients.set(socket.id, socket);
  console.log(`📱 Client connected: ${socket.id} (Total: ${connectedClients.size})`);

  socket.emit('connection-established', {
    clientId: socket.id,
    timestamp: new Date().toISOString(),
    service: 'NEXARA Integration Platform',
  });

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    console.log(`📱 Client disconnected: ${socket.id} (Total: ${connectedClients.size})`);
  });
});

// Helper functions
function broadcastEvent(eventType, data) {
  const payload = {
    eventType,
    data,
    timestamp: new Date().toISOString(),
    source: 'delivery-platform',
  };
  io.emit('delivery-event', payload);
  console.log(`📡 Broadcasted ${eventType} to ${connectedClients.size} clients`);
}

function notifyWebhookReceived(webhookData) {
  const payload = {
    type: 'webhook-received',
    data: webhookData,
    timestamp: new Date().toISOString(),
  };
  io.emit('webhook-notification', payload);
  console.log(`📨 Notified clients about webhook: ${webhookData.eventType || 'unknown'}`);
}

async function forwardToRestaurantPlatform(eventData, headers) {
  try {
    const forwardUrl = `${RESTAURANT_PLATFORM_URL}/api/v1/api/integration/webhook`;
    console.log(`🔄 Forwarding event to restaurant platform: ${forwardUrl}`);

    const response = await axios.post(forwardUrl, eventData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-From': 'NEXARA-Integration-Platform',
        'X-Original-Provider': eventData.provider || 'unknown',
        'X-Event-Type': eventData.eventType || 'unknown',
        ...(headers.authorization && { 'Authorization': headers.authorization }),
        ...(headers['x-api-key'] && { 'X-API-Key': headers['x-api-key'] }),
      },
      timeout: 10000,
    });

    console.log(`✅ Successfully forwarded to restaurant platform - Status: ${response.status}`);
    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    console.error(`❌ Failed to forward to restaurant platform: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 'unknown',
    };
  }
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized['x-api-key'];
  delete sanitized.cookie;
  return sanitized;
}

// NEXARA API Routes

// ========================================
// TALABAT INTEGRATION ENDPOINTS
// ========================================

// POST /api/webhooks/talabat - Main Talabat webhook receiver
app.post('/api/webhooks/talabat', async (req, res) => {
  console.log('📨 Talabat webhook received at /api/webhooks/talabat');
  await talabatWebhook.processWebhook(req, res);
});

// GET /api/webhooks/talabat/health - Talabat integration health check
app.get('/api/webhooks/talabat/health', (req, res) => {
  console.log('🏥 Talabat health check requested');
  const healthData = talabatWebhook.healthCheck();
  res.json(healthData);
});

// GET /api/webhooks/talabat/logs - Get Talabat webhook logs (for debugging)
app.get('/api/webhooks/talabat/logs', (req, res) => {
  console.log('📝 Talabat webhook logs requested');
  const limit = parseInt(req.query.limit) || 100;
  const logs = talabatWebhook.getWebhookLogs(limit);
  res.json({
    provider: 'talabat',
    logs,
    total: logs.length,
    timestamp: new Date().toISOString()
  });
});

// GET /api/webhooks/talabat/stats - Get Talabat webhook statistics
app.get('/api/webhooks/talabat/stats', (req, res) => {
  console.log('📊 Talabat webhook statistics requested');
  const stats = talabatWebhook.getWebhookStats();
  res.json({
    provider: 'talabat',
    statistics: stats,
    timestamp: new Date().toISOString()
  });
});

// POST /api/webhooks/talabat/test - Test endpoint for Talabat webhook processing
app.post('/api/webhooks/talabat/test', async (req, res) => {
  console.log('🧪 Talabat webhook test endpoint called');

  // Add test identifier to the payload
  const testPayload = {
    ...req.body,
    __test: true,
    __testId: `test_${Date.now()}`
  };

  // Create a mock request object
  const mockReq = {
    ...req,
    body: testPayload,
    get: (header) => req.get ? req.get(header) : req.headers[header.toLowerCase()] || 'unknown'
  };

  await talabatWebhook.processWebhook(mockReq, res);
});

// ========================================
// GENERAL WEBHOOK ENDPOINTS
// ========================================

// POST /api/webhooks/register - Restaurant platform registers here
app.post('/api/webhooks/register', (req, res) => {
  console.log('📝 Webhook registration request received');

  const { clientId, provider, url, events } = req.body;

  const webhookId = `webhook-${Date.now()}`;
  const secretKey = Buffer.from(`secret-${Date.now()}`).toString('base64');

  const response = {
    webhookId,
    url: `http://localhost:${PORT}/api/webhooks/${provider}/${clientId}`,
    secretKey,
    status: 'active',
    timestamp: new Date().toISOString(),
  };

  console.log(`✅ Webhook registered for ${provider} - ${clientId}`);
  res.json(response);
});

// POST /api/webhooks/event - Receives and forwards delivery platform events
app.post('/api/webhooks/event', async (req, res) => {
  try {
    const eventData = req.body;
    const headers = req.headers;

    console.log(`📨 Received delivery platform event: ${eventData.eventType || 'unknown'}`);

    // Log the incoming event
    const incomingEvent = {
      eventType: eventData.eventType,
      provider: eventData.provider || 'unknown',
      timestamp: new Date().toISOString(),
      payload: eventData,
      headers: sanitizeHeaders(headers),
    };

    // Broadcast to WebSocket clients
    notifyWebhookReceived(incomingEvent);

    // Forward to restaurant platform
    const forwardResponse = await forwardToRestaurantPlatform(eventData, headers);

    // Broadcast the forwarding result
    broadcastEvent(
      eventData.eventType || 'event_forwarded',
      {
        original: eventData,
        forwardResponse: forwardResponse.success,
        timestamp: new Date().toISOString(),
      }
    );

    console.log(`✅ Event forwarded to restaurant platform - Success: ${forwardResponse.success}`);

    res.json({
      status: 'received',
      forwarded: forwardResponse.success,
      timestamp: new Date().toISOString(),
      eventId: eventData.id || 'unknown',
    });

  } catch (error) {
    console.error(`❌ Error handling delivery event: ${error.message}`);

    // Still broadcast error to WebSocket clients
    broadcastEvent('event_error', {
      error: error.message,
      original: req.body,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/health - Health check endpoint
app.get('/api/health', async (req, res) => {
  console.log('🏥 Health check requested');

  const startTime = Date.now();

  // Check restaurant platform connectivity
  let restaurantPlatformStatus;
  try {
    const response = await axios.get(`${RESTAURANT_PLATFORM_URL}/api/health`, {
      timeout: 3000,
    });
    restaurantPlatformStatus = {
      status: 'healthy',
      url: RESTAURANT_PLATFORM_URL,
      responseTime: response.headers['x-response-time'] || 'unknown',
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`Restaurant platform health check failed: ${error.message}`);
    restaurantPlatformStatus = {
      status: 'unhealthy',
      url: RESTAURANT_PLATFORM_URL,
      error: error.message,
      lastChecked: new Date().toISOString(),
    };
  }

  const responseTime = Date.now() - startTime;

  const healthData = {
    status: restaurantPlatformStatus.status === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'NEXARA Integration Platform',
    port: PORT,
    uptime: process.uptime(),
    responseTime,
    dependencies: {
      restaurantPlatform: restaurantPlatformStatus,
    },
    endpoints: {
      '/api/webhooks/register': 'active',
      '/api/webhooks/event': 'active',
      '/api/health': 'active',
    },
    websocket: {
      namespace: '/events',
      status: 'active',
      connectedClients: connectedClients.size,
    },
    system: {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
      },
      nodejs: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  console.log(`🏥 Health check completed - Status: ${healthData.status}`);
  res.json(healthData);
});

// Additional webhook endpoints for testing
app.post('/api/webhooks/:provider/:clientId', async (req, res) => {
  const { provider, clientId } = req.params;
  const eventData = {
    ...(req.body || {}),
    provider,
    clientId,
    eventType: (req.body && req.body.eventType) || (req.body && req.body.event) || 'webhook_received',
  };

  console.log(`📨 Received ${provider} webhook for client ${clientId}`);

  // Forward to the main event handler
  try {
    const forwardResponse = await forwardToRestaurantPlatform(eventData, req.headers);

    broadcastEvent(`${provider}_webhook`, {
      provider,
      clientId,
      data: eventData,
      forwardResponse: forwardResponse.success,
      timestamp: new Date().toISOString(),
    });

    res.json({
      status: 'received',
      provider,
      clientId,
      forwarded: forwardResponse.success,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Error processing ${provider} webhook:`, error.message);
    res.status(500).json({
      status: 'error',
      provider,
      clientId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 NEXARA Integration Platform running on http://localhost:' + PORT);
  console.log('📚 API Documentation available at http://localhost:' + PORT + '/api/docs');
  console.log('🔗 Ready to forward events to restaurant platform at ' + RESTAURANT_PLATFORM_URL);
  console.log('🔌 WebSocket namespace: /events');
  console.log('');
  console.log('Available endpoints:');
  console.log('');
  console.log('🌟 Talabat Integration:');
  console.log('  POST /api/webhooks/talabat - Main Talabat webhook receiver');
  console.log('  GET  /api/webhooks/talabat/health - Talabat integration health');
  console.log('  GET  /api/webhooks/talabat/logs - Talabat webhook logs');
  console.log('  GET  /api/webhooks/talabat/stats - Talabat webhook statistics');
  console.log('  POST /api/webhooks/talabat/test - Test Talabat webhook processing');
  console.log('');
  console.log('🔗 General Endpoints:');
  console.log('  POST /api/webhooks/register - Restaurant platform registers here');
  console.log('  POST /api/webhooks/event - Receives and forwards delivery platform events');
  console.log('  GET  /api/health - Health check endpoint');
  console.log('  POST /api/webhooks/{provider}/{clientId} - Provider-specific webhooks');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});