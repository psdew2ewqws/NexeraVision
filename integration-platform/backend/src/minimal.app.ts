import { Module, Controller, Post, Body, Get, Param, Query, Put, Delete, Patch } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import { Server } from 'socket.io';

// Mock Auth Controller
@Controller('auth')
class AuthController {
  @Post('login')
  login(@Body() body: any) {
    // Mock authentication - accepts any of these test credentials
    const validUsers = [
      { email: 'admin@integration.com', password: 'Admin123!', role: 'super_admin', name: 'Admin User' },
      { email: 'manager@integration.com', password: 'Manager123!', role: 'manager', name: 'Integration Manager' },
      { email: 'developer@integration.com', password: 'Dev123!', role: 'developer', name: 'Developer' },
      { email: 'viewer@integration.com', password: 'View123!', role: 'viewer', name: 'Viewer' }
    ];

    const user = validUsers.find(u => u.email === body.email && u.password === body.password);

    if (user) {
      return {
        success: true,
        access_token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    }

    return {
      success: false,
      message: 'Invalid credentials'
    };
  }

  @Get('profile')
  getProfile() {
    return {
      id: 'user-001',
      email: 'admin@integration.com',
      name: 'Admin User',
      role: 'super_admin'
    };
  }
}

// Mock Webhooks Controller
@Controller('webhooks')
class WebhooksController {
  private generateMockWebhooks() {
    return [
      {
        id: 'wh_careem_001',
        name: 'Careem Order Events',
        provider: 'careem',
        url: 'https://api.restaurant-platform.com/webhooks/careem',
        events: ['order.created', 'order.updated', 'order.cancelled'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        successRate: 98.7,
        totalEvents: 12453,
        failedEvents: 162,
        avgResponseTime: 87,
        createdAt: '2024-12-01T00:00:00Z',
        headers: {
          'Authorization': 'Bearer careem_webhook_token',
          'Content-Type': 'application/json'
        }
      },
      {
        id: 'wh_talabat_001',
        name: 'Talabat Integration Webhook',
        provider: 'talabat',
        url: 'https://api.restaurant-platform.com/webhooks/talabat',
        events: ['order.received', 'order.accepted', 'order.ready', 'order.delivered'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
        successRate: 99.2,
        totalEvents: 8932,
        failedEvents: 71,
        avgResponseTime: 52,
        createdAt: '2024-12-01T00:00:00Z',
        headers: {
          'X-Talabat-Signature': 'talabat_signature_key',
          'Content-Type': 'application/json'
        }
      },
      {
        id: 'wh_deliveroo_001',
        name: 'Deliveroo Order Sync',
        provider: 'deliveroo',
        url: 'https://api.restaurant-platform.com/webhooks/deliveroo',
        events: ['order.placed', 'order.confirmed', 'order.dispatched'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 minutes ago
        successRate: 97.5,
        totalEvents: 6721,
        failedEvents: 168,
        avgResponseTime: 134,
        createdAt: '2024-12-01T00:00:00Z',
        headers: {
          'Authorization': 'Bearer deliveroo_api_key',
          'Content-Type': 'application/json'
        }
      },
      {
        id: 'wh_jahez_001',
        name: 'Jahez Platform Integration',
        provider: 'jahez',
        url: 'https://api.restaurant-platform.com/webhooks/jahez',
        events: ['order.new', 'order.modified', 'order.completed'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 minutes ago
        successRate: 96.8,
        totalEvents: 4567,
        failedEvents: 146,
        avgResponseTime: 94,
        createdAt: '2024-12-01T00:00:00Z',
        headers: {
          'X-Jahez-Token': 'jahez_webhook_token',
          'Content-Type': 'application/json'
        }
      },
      {
        id: 'wh_internal_001',
        name: 'Internal System Events',
        provider: 'internal',
        url: 'https://api.restaurant-platform.com/webhooks/internal',
        events: ['menu.updated', 'branch.status', 'printer.health'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 1000 * 60 * 1).toISOString(), // 1 minute ago
        successRate: 99.9,
        totalEvents: 15234,
        failedEvents: 15,
        avgResponseTime: 23,
        createdAt: '2024-12-01T00:00:00Z',
        headers: {
          'Authorization': 'Bearer internal_token',
          'Content-Type': 'application/json'
        }
      }
    ];
  }

  @Get()
  getWebhooks(@Query('provider') provider?: string, @Query('status') status?: string) {
    let webhooks = this.generateMockWebhooks();

    if (provider) {
      webhooks = webhooks.filter(wh => wh.provider === provider);
    }

    if (status) {
      webhooks = webhooks.filter(wh => wh.status === status);
    }

    return {
      success: true,
      data: webhooks,
      meta: {
        total: webhooks.length,
        active: webhooks.filter(wh => wh.status === 'active').length,
        inactive: webhooks.filter(wh => wh.status === 'inactive').length
      }
    };
  }

  @Get('stats')
  getWebhookStats() {
    return {
      success: true,
      data: {
        overview: {
          totalWebhooks: 5,
          activeWebhooks: 5,
          inactiveWebhooks: 0,
          totalEvents: 47907,
          successfulEvents: 46345,
          failedEvents: 562,
          overallSuccessRate: 96.7
        },
        byProvider: {
          careem: {
            webhooks: 1,
            events: 12453,
            successRate: 98.7,
            avgResponseTime: 87,
            status: 'operational'
          },
          talabat: {
            webhooks: 1,
            events: 8932,
            successRate: 99.2,
            avgResponseTime: 52,
            status: 'operational'
          },
          deliveroo: {
            webhooks: 1,
            events: 6721,
            successRate: 97.5,
            avgResponseTime: 134,
            status: 'operational'
          },
          jahez: {
            webhooks: 1,
            events: 4567,
            successRate: 96.8,
            avgResponseTime: 94,
            status: 'operational'
          },
          internal: {
            webhooks: 1,
            events: 15234,
            successRate: 99.9,
            avgResponseTime: 23,
            status: 'operational'
          }
        },
        recentActivity: [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
            webhook: 'Internal System Events',
            event: 'menu.updated',
            status: 'success',
            responseTime: 18
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            webhook: 'Talabat Integration Webhook',
            event: 'order.received',
            status: 'success',
            responseTime: 45
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            webhook: 'Careem Order Events',
            event: 'order.created',
            status: 'success',
            responseTime: 92
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
            webhook: 'Deliveroo Order Sync',
            event: 'order.placed',
            status: 'success',
            responseTime: 156
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            webhook: 'Jahez Platform Integration',
            event: 'order.new',
            status: 'success',
            responseTime: 78
          }
        ]
      }
    };
  }

  @Get('health')
  getWebhookHealth() {
    return {
      success: true,
      data: {
        status: 'operational',
        timestamp: new Date().toISOString(),
        systemHealth: {
          webhookService: 'operational',
          eventProcessor: 'operational',
          retryQueue: 'operational',
          rateLimit: 'operational'
        },
        providers: {
          careem: {
            status: 'operational',
            lastCheck: new Date(Date.now() - 1000 * 30).toISOString(), // 30 seconds ago
            responseTime: 87,
            uptime: '99.8%'
          },
          talabat: {
            status: 'operational',
            lastCheck: new Date(Date.now() - 1000 * 45).toISOString(), // 45 seconds ago
            responseTime: 52,
            uptime: '99.9%'
          },
          deliveroo: {
            status: 'operational',
            lastCheck: new Date(Date.now() - 1000 * 60).toISOString(), // 1 minute ago
            responseTime: 134,
            uptime: '99.2%'
          },
          jahez: {
            status: 'operational',
            lastCheck: new Date(Date.now() - 1000 * 90).toISOString(), // 1.5 minutes ago
            responseTime: 94,
            uptime: '99.5%'
          },
          internal: {
            status: 'operational',
            lastCheck: new Date(Date.now() - 1000 * 15).toISOString(), // 15 seconds ago
            responseTime: 23,
            uptime: '99.9%'
          }
        },
        metrics: {
          avgResponseTime: 78,
          totalRequests: 47907,
          successfulRequests: 46345,
          failedRequests: 562,
          requestsPerMinute: 145
        }
      }
    };
  }

  @Get('metrics')
  getWebhookMetrics(@Query('timeframe') timeframe = '24h') {
    const now = new Date();
    const getTimeframeHours = (tf: string) => {
      switch (tf) {
        case '1h': return 1;
        case '6h': return 6;
        case '24h': return 24;
        case '7d': return 24 * 7;
        default: return 24;
      }
    };

    const hours = getTimeframeHours(timeframe);
    const dataPoints = Math.min(hours, 24); // Max 24 data points for chart

    const generateMetricData = () => {
      const data = [];
      for (let i = dataPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * (hours / dataPoints) * 60 * 60 * 1000));
        data.push({
          timestamp: timestamp.toISOString(),
          requests: Math.floor(Math.random() * 50) + 120, // 120-170 requests
          successRate: Math.random() * 5 + 95, // 95-100% success rate
          avgResponseTime: Math.floor(Math.random() * 80) + 40, // 40-120ms
          errors: Math.floor(Math.random() * 3) // 0-2 errors
        });
      }
      return data;
    };

    return {
      success: true,
      data: {
        timeframe,
        dataPoints: dataPoints,
        metrics: generateMetricData(),
        summary: {
          totalRequests: 3456,
          avgSuccessRate: 97.8,
          avgResponseTime: 78,
          totalErrors: 24,
          peakRequestsPerHour: 167,
          uptimePercentage: 99.6
        },
        byProvider: {
          careem: {
            requests: 876,
            successRate: 98.7,
            avgResponseTime: 87,
            errors: 11
          },
          talabat: {
            requests: 654,
            successRate: 99.2,
            avgResponseTime: 52,
            errors: 5
          },
          deliveroo: {
            requests: 543,
            successRate: 97.5,
            avgResponseTime: 134,
            errors: 14
          },
          jahez: {
            requests: 432,
            successRate: 96.8,
            avgResponseTime: 94,
            errors: 14
          },
          internal: {
            requests: 951,
            successRate: 99.9,
            avgResponseTime: 23,
            errors: 1
          }
        }
      }
    };
  }

  @Post('test')
  testWebhook(@Body() body: { webhookId?: string, event?: string }) {
    const { webhookId, event = 'test.ping' } = body;

    // Simulate webhook test with realistic response times
    const responseTime = Math.floor(Math.random() * 100) + 50; // 50-150ms

    return {
      success: true,
      data: {
        testId: 'test_' + Date.now(),
        webhookId: webhookId || 'wh_test_001',
        event,
        status: 'success',
        responseTime,
        timestamp: new Date().toISOString(),
        payload: {
          event,
          data: {
            orderId: 'ORD_' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            status: 'created',
            amount: 25.50,
            currency: 'JOD'
          },
          metadata: {
            source: 'webhook_test',
            version: '1.0'
          }
        },
        response: {
          statusCode: 200,
          body: { received: true, processed: true },
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req_' + Math.random().toString(36).substr(2, 12)
          }
        }
      }
    };
  }

  @Get(':id')
  getWebhookById(@Param('id') id: string) {
    const webhooks = this.generateMockWebhooks();
    const webhook = webhooks.find(wh => wh.id === id);

    if (!webhook) {
      return {
        success: false,
        error: 'Webhook not found'
      };
    }

    return {
      success: true,
      data: {
        ...webhook,
        recentEvents: [
          {
            id: 'evt_001',
            event: webhook.events[0],
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            status: 'success',
            responseTime: webhook.avgResponseTime,
            payload: { orderId: 'ORD_12345', status: 'created' }
          },
          {
            id: 'evt_002',
            event: webhook.events[1] || webhook.events[0],
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            status: 'success',
            responseTime: webhook.avgResponseTime + 10,
            payload: { orderId: 'ORD_12344', status: 'updated' }
          },
          {
            id: 'evt_003',
            event: webhook.events[2] || webhook.events[0],
            timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            status: 'success',
            responseTime: webhook.avgResponseTime - 5,
            payload: { orderId: 'ORD_12343', status: 'completed' }
          }
        ]
      }
    };
  }
}

// Mock Integrations Controller
@Controller('integrations')
class IntegrationsController {
  private integrations = [
    {
      id: '1',
      name: 'Careem',
      description: 'Leading ride-hailing and delivery platform',
      icon: '🚗',
      status: 'connected',
      features: ['order_sync', 'menu_sync', 'webhooks'],
      lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      metrics: { orders: 1250, revenue: '$45,230', success_rate: '99.2%' },
      config: { apiKey: 'careem_test_key', merchantId: 'MERCHANT_001', autoSync: true }
    },
    {
      id: '2',
      name: 'Talabat',
      description: 'Food delivery and q-commerce platform',
      icon: '🍔',
      status: 'connected',
      features: ['order_sync', 'menu_sync', 'analytics'],
      lastSync: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      metrics: { orders: 890, revenue: '$32,100', success_rate: '98.5%' },
      config: { apiKey: 'talabat_test_key', storeId: 'STORE_002', autoSync: true }
    },
    {
      id: '3',
      name: 'Deliveroo',
      description: 'Premium food delivery service',
      icon: '🏍️',
      status: 'disconnected',
      features: ['order_sync', 'menu_sync'],
      lastSync: null,
      metrics: { orders: 0, revenue: '$0', success_rate: '0%' },
      config: { apiKey: '', merchantId: '', autoSync: false }
    },
    {
      id: '4',
      name: 'Jahez',
      description: 'Saudi food delivery platform',
      icon: '📱',
      status: 'connected',
      features: ['order_sync', 'webhooks'],
      lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      metrics: { orders: 456, revenue: '$18,900', success_rate: '97.8%' },
      config: { apiKey: 'jahez_test_key', branchId: 'BRANCH_003', autoSync: true }
    },
    {
      id: '5',
      name: 'HungerStation',
      description: 'Food ordering and delivery marketplace',
      icon: '🍕',
      status: 'pending',
      features: ['order_sync'],
      lastSync: null,
      metrics: { orders: 0, revenue: '$0', success_rate: '0%' },
      config: { apiKey: '', restaurantId: '', autoSync: false }
    }
  ];

  @Get()
  getIntegrations() {
    return {
      success: true,
      data: this.integrations,
      meta: {
        total: this.integrations.length,
        connected: this.integrations.filter(i => i.status === 'connected').length,
        disconnected: this.integrations.filter(i => i.status === 'disconnected').length,
        pending: this.integrations.filter(i => i.status === 'pending').length
      }
    };
  }

  @Post()
  createIntegration(@Body() data: any) {
    const newIntegration = {
      id: String(this.integrations.length + 1),
      ...data,
      status: 'pending',
      lastSync: null,
      metrics: { orders: 0, revenue: '$0', success_rate: '0%' }
    };
    this.integrations.push(newIntegration);
    return { success: true, data: newIntegration };
  }

  @Put(':id')
  updateIntegration(@Param('id') id: string, @Body() data: any) {
    const index = this.integrations.findIndex(i => i.id === id);
    if (index !== -1) {
      this.integrations[index] = { ...this.integrations[index], ...data };
      return { success: true, data: this.integrations[index] };
    }
    return { success: false, message: 'Integration not found' };
  }

  @Delete(':id')
  deleteIntegration(@Param('id') id: string) {
    const index = this.integrations.findIndex(i => i.id === id);
    if (index !== -1) {
      const deleted = this.integrations.splice(index, 1);
      return { success: true, data: deleted[0] };
    }
    return { success: false, message: 'Integration not found' };
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string) {
    const integration = this.integrations.find(i => i.id === id);
    if (integration) {
      integration.status = integration.status === 'connected' ? 'disconnected' : 'connected';
      integration.lastSync = integration.status === 'connected' ? new Date().toISOString() : null;
      return { success: true, data: integration };
    }
    return { success: false, message: 'Integration not found' };
  }

  @Post(':id/test')
  testIntegration(@Param('id') id: string) {
    const integration = this.integrations.find(i => i.id === id);
    if (integration) {
      // Simulate test delay
      const testResult = {
        success: Math.random() > 0.2, // 80% success rate
        message: Math.random() > 0.2 ? 'Connection test successful' : 'Connection failed',
        latency: Math.floor(Math.random() * 200) + 50,
        timestamp: new Date().toISOString()
      };
      return { success: true, data: testResult };
    }
    return { success: false, message: 'Integration not found' };
  }

  @Post(':id/sync')
  syncIntegration(@Param('id') id: string) {
    const integration = this.integrations.find(i => i.id === id);
    if (integration) {
      integration.lastSync = new Date().toISOString();
      // Update metrics with random values
      integration.metrics = {
        orders: Math.floor(Math.random() * 1000) + 100,
        revenue: `$${(Math.floor(Math.random() * 50000) + 10000).toLocaleString()}`,
        success_rate: `${(Math.random() * 10 + 90).toFixed(1)}%`
      };
      return { success: true, data: integration, message: 'Sync completed successfully' };
    }
    return { success: false, message: 'Integration not found' };
  }
}

// Mock Health Controller
@Controller('health')
class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'operational',
        webhooks: 'operational',
        integrations: 'operational',
        authentication: 'operational'
      },
      uptime: '99.9%',
      version: '2.1.0',
      environment: 'production'
    };
  }
}

@Module({
  controllers: [AuthController, HealthController, WebhooksController, IntegrationsController]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
  });

  // Use compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  const server = await app.listen(port);

  // Add WebSocket support for real-time webhook events
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3002'],
      credentials: true,
    },
  });

  // Mock real-time webhook events
  const simulateWebhookEvents = () => {
    const providers = ['careem', 'talabat', 'deliveroo', 'jahez', 'internal'];
    const events = ['order.created', 'order.updated', 'order.completed', 'menu.updated', 'printer.health'];

    setInterval(() => {
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const event = events[Math.floor(Math.random() * events.length)];

      const webhookEvent = {
        id: 'evt_' + Date.now(),
        provider,
        event,
        timestamp: new Date().toISOString(),
        status: 'success',
        responseTime: Math.floor(Math.random() * 100) + 30,
        payload: {
          orderId: 'ORD_' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          status: 'created',
          amount: Math.floor(Math.random() * 50) + 10,
          currency: 'JOD'
        }
      };

      io.emit('webhook_event', webhookEvent);
    }, 10000 + Math.random() * 20000); // Every 10-30 seconds
  };

  io.on('connection', (socket) => {
    console.log('Client connected to WebSocket');

    socket.on('disconnect', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Start webhook event simulation
  simulateWebhookEvents();

  console.log(`🚀 Integration Platform Backend is running on: http://localhost:${port}`);
  console.log(`📚 API available at: http://localhost:${port}/api/v1`);
  console.log(`🔗 WebSocket available for real-time events`);
}

bootstrap();