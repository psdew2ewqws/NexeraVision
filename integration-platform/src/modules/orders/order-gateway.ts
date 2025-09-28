import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  Injectable,
  Logger,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  OrderEvents,
  SocketRooms,
  OrderEventUtils,
  BaseOrderEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  PaymentStatusChangedEvent,
  OrderLocationUpdateEvent,
  AnalyticsEvent,
  WebhookEvent,
  SystemErrorEvent,
  EventPriority,
} from './order-events.enum';

interface AuthenticatedSocket extends Socket {
  user?: {
    clientId: string;
    provider?: string;
    permissions?: string[];
  };
  lastPing?: Date;
  isAlive?: boolean;
}

interface ClientSubscription {
  clientId: string;
  socket: AuthenticatedSocket;
  rooms: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
  provider?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/orders',
  transports: ['websocket'],
})
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderGateway.name);
  private connectedClients = new Map<string, ClientSubscription>();
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    errors: 0,
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Order WebSocket Gateway initialized');

    // Set up periodic cleanup and health checks
    this.setupPeriodicTasks();
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided. Socket: ${client.id}`);
        client.disconnect();
        return;
      }

      const user = await this.validateToken(token);
      if (!user) {
        this.logger.warn(`Connection rejected: Invalid token. Socket: ${client.id}`);
        client.disconnect();
        return;
      }

      client.user = user;
      client.isAlive = true;
      client.lastPing = new Date();

      const subscription: ClientSubscription = {
        clientId: user.clientId,
        socket: client,
        rooms: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        provider: user.provider,
      };

      this.connectedClients.set(client.id, subscription);
      this.connectionMetrics.totalConnections++;
      this.connectionMetrics.activeConnections++;

      // Auto-subscribe to default rooms based on user permissions
      await this.autoSubscribeToRooms(client, user);

      this.logger.log(
        `Client connected: ${user.clientId} (Socket: ${client.id}, Provider: ${user.provider || 'N/A'})`
      );

      // Send connection confirmation
      client.emit('connected', {
        clientId: user.clientId,
        timestamp: new Date(),
        availableRooms: this.getAvailableRooms(user),
      });

      // Emit connection event for analytics
      this.eventEmitter.emit('client.connected', {
        clientId: user.clientId,
        provider: user.provider,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      this.connectionMetrics.errors++;
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const subscription = this.connectedClients.get(client.id);

    if (subscription) {
      this.connectedClients.delete(client.id);
      this.connectionMetrics.activeConnections--;

      this.logger.log(
        `Client disconnected: ${subscription.clientId} (Socket: ${client.id})`
      );

      // Emit disconnection event for analytics
      this.eventEmitter.emit('client.disconnected', {
        clientId: subscription.clientId,
        provider: subscription.provider,
        connectedDuration: Date.now() - subscription.connectedAt.getTime(),
        timestamp: new Date(),
      });
    }
  }

  /**
   * Subscribe to specific rooms
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { rooms: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const subscription = this.connectedClients.get(client.id);
      if (!subscription) {
        throw new Error('Client not found');
      }

      const allowedRooms = this.getAvailableRooms(client.user!);
      const validRooms = data.rooms.filter(room => allowedRooms.includes(room));

      for (const room of validRooms) {
        await client.join(room);
        subscription.rooms.add(room);
        this.logger.debug(`Client ${subscription.clientId} subscribed to room: ${room}`);
      }

      subscription.lastActivity = new Date();
      this.connectionMetrics.totalMessages++;

      client.emit('subscribed', {
        rooms: validRooms,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Subscription error: ${error.message}`, error.stack);
      this.connectionMetrics.errors++;
      client.emit('error', { message: 'Subscription failed', error: error.message });
    }
  }

  /**
   * Unsubscribe from specific rooms
   */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @MessageBody() data: { rooms: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const subscription = this.connectedClients.get(client.id);
      if (!subscription) {
        throw new Error('Client not found');
      }

      for (const room of data.rooms) {
        await client.leave(room);
        subscription.rooms.delete(room);
        this.logger.debug(`Client ${subscription.clientId} unsubscribed from room: ${room}`);
      }

      subscription.lastActivity = new Date();
      this.connectionMetrics.totalMessages++;

      client.emit('unsubscribed', {
        rooms: data.rooms,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Unsubscription error: ${error.message}`, error.stack);
      this.connectionMetrics.errors++;
      client.emit('error', { message: 'Unsubscription failed', error: error.message });
    }
  }

  /**
   * Handle ping/pong for connection health
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    const subscription = this.connectedClients.get(client.id);
    if (subscription) {
      client.isAlive = true;
      client.lastPing = new Date();
      subscription.lastActivity = new Date();
      client.emit('pong', { timestamp: new Date() });
    }
  }

  /**
   * Get connection status and metrics
   */
  @SubscribeMessage('status')
  handleStatus(@ConnectedSocket() client: AuthenticatedSocket) {
    const subscription = this.connectedClients.get(client.id);
    if (subscription) {
      client.emit('status', {
        clientId: subscription.clientId,
        connectedAt: subscription.connectedAt,
        rooms: Array.from(subscription.rooms),
        provider: subscription.provider,
        serverMetrics: {
          activeConnections: this.connectionMetrics.activeConnections,
          totalMessages: this.connectionMetrics.totalMessages,
        },
        timestamp: new Date(),
      });
    }
  }

  // =========================
  // ORDER EVENT HANDLERS
  // =========================

  @OnEvent(OrderEvents.ORDER_CREATED)
  handleOrderCreated(event: OrderCreatedEvent) {
    this.broadcastOrderEvent(event);
    this.logger.debug(`Order created event broadcasted: ${event.orderId}`);
  }

  @OnEvent(OrderEvents.ORDER_STATUS_CHANGED)
  handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    this.broadcastOrderEvent(event);
    this.logger.debug(`Order status changed: ${event.orderId} (${event.oldStatus} → ${event.newStatus})`);
  }

  @OnEvent(OrderEvents.PAYMENT_COMPLETED)
  @OnEvent(OrderEvents.PAYMENT_FAILED)
  @OnEvent(OrderEvents.PAYMENT_REFUNDED)
  handlePaymentStatusChanged(event: PaymentStatusChangedEvent) {
    this.broadcastOrderEvent(event);
    this.logger.debug(`Payment status event: ${event.orderId} - ${event.eventType}`);
  }

  @OnEvent(OrderEvents.ORDER_LOCATION_UPDATED)
  handleOrderLocationUpdated(event: OrderLocationUpdateEvent) {
    // Only broadcast to specific order room for privacy
    const orderRoom = OrderEventUtils.createOrderRoom(event.orderId);
    this.server.to(orderRoom).emit('order_location_updated', event);
    this.logger.debug(`Location updated for order: ${event.orderId}`);
  }

  @OnEvent(OrderEvents.ORDER_ETA_UPDATED)
  handleOrderETAUpdated(event: any) {
    const rooms = OrderEventUtils.getRoomsForEvent(event.eventType, {
      provider: event.provider,
      clientId: event.clientId,
      orderId: event.orderId,
    });

    rooms.forEach(room => {
      this.server.to(room).emit('order_eta_updated', event);
    });

    this.logger.debug(`ETA updated for order: ${event.orderId}`);
  }

  // =========================
  // ANALYTICS EVENT HANDLERS
  // =========================

  @OnEvent(OrderEvents.ANALYTICS_ORDER_VOLUME_UPDATED)
  @OnEvent(OrderEvents.ANALYTICS_REVENUE_UPDATED)
  @OnEvent(OrderEvents.ANALYTICS_METRICS_REFRESHED)
  handleAnalyticsEvent(event: AnalyticsEvent) {
    const rooms = [SocketRooms.ALL_ANALYTICS];

    if (event.provider) {
      rooms.push(OrderEventUtils.createProviderRoom(SocketRooms.PROVIDER_ANALYTICS, event.provider));
    }

    if (event.clientId) {
      rooms.push(OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ANALYTICS, event.clientId));
    }

    rooms.forEach(room => {
      this.server.to(room).emit('analytics_updated', event);
    });

    this.logger.debug(`Analytics event broadcasted: ${event.eventType}`);
  }

  // =========================
  // WEBHOOK EVENT HANDLERS
  // =========================

  @OnEvent(OrderEvents.WEBHOOK_RECEIVED)
  @OnEvent(OrderEvents.WEBHOOK_PROCESSED)
  @OnEvent(OrderEvents.WEBHOOK_FAILED)
  handleWebhookEvent(event: WebhookEvent) {
    this.server.to(SocketRooms.ALL_WEBHOOKS).emit('webhook_event', event);

    if (event.provider) {
      const providerRoom = `webhooks:provider:${event.provider.toLowerCase()}`;
      this.server.to(providerRoom).emit('webhook_event', event);
    }

    this.logger.debug(`Webhook event broadcasted: ${event.eventType} - ${event.webhookId}`);
  }

  // =========================
  // SYSTEM EVENT HANDLERS
  // =========================

  @OnEvent(OrderEvents.SYSTEM_ERROR)
  @OnEvent(OrderEvents.INTEGRATION_ERROR)
  @OnEvent(OrderEvents.ORDER_ERROR)
  handleSystemError(event: SystemErrorEvent) {
    this.server.to(SocketRooms.SYSTEM_ERRORS).emit('system_error', event);

    // Also notify affected client if available
    if (event.clientId) {
      const clientRoom = OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ORDERS, event.clientId);
      this.server.to(clientRoom).emit('system_error', event);
    }

    this.logger.error(`System error event broadcasted: ${event.error.message}`);
  }

  // =========================
  // UTILITY METHODS
  // =========================

  /**
   * Broadcast order events to appropriate rooms
   */
  private broadcastOrderEvent(event: BaseOrderEvent) {
    const rooms = OrderEventUtils.getRoomsForEvent(event.eventType, {
      provider: event.provider,
      clientId: event.clientId,
      orderId: event.orderId,
    });

    const eventName = event.eventType.replace('.', '_');

    rooms.forEach(room => {
      this.server.to(room).emit(eventName, event);
    });

    this.connectionMetrics.totalMessages++;
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractTokenFromSocket(socket: Socket): string | null {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  socket.handshake.query?.token;

    return typeof token === 'string' ? token : null;
  }

  /**
   * Validate JWT token and return user data
   */
  private async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Auto-subscribe clients to appropriate rooms based on permissions
   */
  private async autoSubscribeToRooms(client: AuthenticatedSocket, user: any) {
    const defaultRooms = [SocketRooms.ALL_ORDERS];

    // Add provider-specific rooms
    if (user.provider) {
      defaultRooms.push(
        OrderEventUtils.createProviderRoom(SocketRooms.PROVIDER_ORDERS, user.provider),
        OrderEventUtils.createProviderRoom(SocketRooms.PROVIDER_ANALYTICS, user.provider)
      );
    }

    // Add client-specific rooms
    defaultRooms.push(
      OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ORDERS, user.clientId),
      OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ANALYTICS, user.clientId)
    );

    const subscription = this.connectedClients.get(client.id);
    if (subscription) {
      for (const room of defaultRooms) {
        await client.join(room);
        subscription.rooms.add(room);
      }
    }
  }

  /**
   * Get available rooms for a user based on permissions
   */
  private getAvailableRooms(user: any): string[] {
    const rooms = [
      SocketRooms.ALL_ORDERS,
      SocketRooms.ALL_ANALYTICS,
      OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ORDERS, user.clientId),
      OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ANALYTICS, user.clientId),
    ];

    if (user.provider) {
      rooms.push(
        OrderEventUtils.createProviderRoom(SocketRooms.PROVIDER_ORDERS, user.provider),
        OrderEventUtils.createProviderRoom(SocketRooms.PROVIDER_ANALYTICS, user.provider)
      );
    }

    // Add system rooms for admin users
    if (user.permissions?.includes('admin')) {
      rooms.push(SocketRooms.SYSTEM_HEALTH, SocketRooms.SYSTEM_ERRORS, SocketRooms.ALL_WEBHOOKS);
    }

    return rooms;
  }

  /**
   * Setup periodic tasks for maintenance
   */
  private setupPeriodicTasks() {
    // Cleanup dead connections every 30 seconds
    setInterval(() => {
      this.cleanupDeadConnections();
    }, 30000);

    // Emit health metrics every minute
    setInterval(() => {
      this.emitHealthMetrics();
    }, 60000);
  }

  /**
   * Cleanup connections that haven't responded to ping
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private cleanupDeadConnections() {
    const now = new Date();
    const timeout = 60000; // 60 seconds timeout

    for (const [socketId, subscription] of this.connectedClients.entries()) {
      const lastPing = subscription.socket.lastPing || subscription.connectedAt;

      if (now.getTime() - lastPing.getTime() > timeout) {
        this.logger.warn(`Cleaning up dead connection: ${subscription.clientId} (${socketId})`);
        subscription.socket.disconnect();
        this.connectedClients.delete(socketId);
        this.connectionMetrics.activeConnections--;
      }
    }
  }

  /**
   * Emit health metrics to system health room
   */
  @Cron(CronExpression.EVERY_MINUTE)
  private emitHealthMetrics() {
    const healthData = {
      timestamp: new Date(),
      metrics: {
        ...this.connectionMetrics,
        connectedClients: Array.from(this.connectedClients.values()).map(sub => ({
          clientId: sub.clientId,
          provider: sub.provider,
          connectedAt: sub.connectedAt,
          roomCount: sub.rooms.size,
        })),
      },
    };

    this.server.to(SocketRooms.SYSTEM_HEALTH).emit('health_metrics', healthData);
  }

  /**
   * Public method to emit custom events (for use by other services)
   */
  public emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
    this.connectionMetrics.totalMessages++;
  }

  /**
   * Public method to emit to specific client
   */
  public emitToClient(clientId: string, event: string, data: any) {
    const clientRoom = OrderEventUtils.createClientRoom(SocketRooms.CLIENT_ORDERS, clientId);
    this.server.to(clientRoom).emit(event, data);
    this.connectionMetrics.totalMessages++;
  }

  /**
   * Get current connection metrics
   */
  public getMetrics() {
    return {
      ...this.connectionMetrics,
      clientDetails: Array.from(this.connectedClients.values()).map(sub => ({
        clientId: sub.clientId,
        provider: sub.provider,
        connectedAt: sub.connectedAt,
        lastActivity: sub.lastActivity,
        roomCount: sub.rooms.size,
        rooms: Array.from(sub.rooms),
      })),
    };
  }
}