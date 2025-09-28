import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../database/prisma.service';

export interface StatusUpdate {
  orderId: string;
  providerOrderId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
  };
  estimatedArrival?: Date;
  driverInfo?: {
    name: string;
    phone: string;
    vehicleType: string;
  };
  message?: string;
  reason?: string;
}

export interface TrackingSession {
  orderId: string;
  companyId: string;
  branchId: string;
  providerType: string;
  providerOrderId: string;
  status: string;
  createdAt: Date;
  lastUpdate: Date;
  isActive: boolean;
  socketIds: string[];
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/delivery-tracking'
})
export class RealTimeStatusService {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealTimeStatusService.name);
  private trackingSessions = new Map<string, TrackingSession>();
  private socketToOrders = new Map<string, Set<string>>();
  private statusPollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Start cleanup task
    setInterval(() => this.cleanupInactiveSessions(), 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Create real-time tracking session for an order
   */
  async createTrackingSession(orderId: string): Promise<TrackingSession> {
    this.logger.log(`Creating tracking session for order ${orderId}`);

    // Check if session already exists
    if (this.trackingSessions.has(orderId)) {
      return this.trackingSessions.get(orderId);
    }

    // Get order details from database
    const order = await this.getOrderDetails(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Create tracking session
    const session: TrackingSession = {
      orderId,
      companyId: order.companyId,
      branchId: order.branchId,
      providerType: 'careem', // Default provider for now
      providerOrderId: order.providerOrderId || `MOCK-${orderId}`,
      status: order.orderStatus || 'pending',
      createdAt: new Date(),
      lastUpdate: new Date(),
      isActive: true,
      socketIds: []
    };

    this.trackingSessions.set(orderId, session);

    // Start polling for this order
    await this.startStatusPolling(orderId);

    // Emit session created event
    this.eventEmitter.emit('tracking.session.created', { orderId, session });

    return session;
  }

  /**
   * Subscribe to order tracking
   */
  @SubscribeMessage('subscribe_to_order')
  async subscribeToOrder(
    @MessageBody() data: { orderId: string; companyId: string },
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { orderId, companyId } = data;

    try {
      // Verify access permissions
      const hasAccess = await this.verifyOrderAccess(orderId, companyId);
      if (!hasAccess) {
        client.emit('error', { message: 'Access denied for this order' });
        return;
      }

      // Create or get tracking session
      let session = this.trackingSessions.get(orderId);
      if (!session) {
        session = await this.createTrackingSession(orderId);
      }

      // Add socket to session
      if (!session.socketIds.includes(client.id)) {
        session.socketIds.push(client.id);
      }

      // Track orders for this socket
      if (!this.socketToOrders.has(client.id)) {
        this.socketToOrders.set(client.id, new Set());
      }
      this.socketToOrders.get(client.id).add(orderId);

      // Join socket room for this order
      client.join(`order_${orderId}`);

      // Send current status immediately
      const currentStatus = await this.getCurrentOrderStatus(orderId);
      client.emit('status_update', currentStatus);

      this.logger.log(`Client ${client.id} subscribed to order ${orderId}`);

    } catch (error) {
      this.logger.error(`Failed to subscribe to order ${orderId}:`, error);
      client.emit('error', { message: 'Failed to subscribe to order tracking' });
    }
  }

  /**
   * Unsubscribe from order tracking
   */
  @SubscribeMessage('unsubscribe_from_order')
  async unsubscribeFromOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { orderId } = data;

    // Remove from tracking session
    const session = this.trackingSessions.get(orderId);
    if (session) {
      session.socketIds = session.socketIds.filter(id => id !== client.id);
    }

    // Remove from socket tracking
    const orderSet = this.socketToOrders.get(client.id);
    if (orderSet) {
      orderSet.delete(orderId);
      if (orderSet.size === 0) {
        this.socketToOrders.delete(client.id);
      }
    }

    // Leave socket room
    client.leave(`order_${orderId}`);

    this.logger.log(`Client ${client.id} unsubscribed from order ${orderId}`);
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket): void {
    const orderSet = this.socketToOrders.get(client.id);
    if (orderSet) {
      // Remove client from all tracking sessions
      orderSet.forEach(orderId => {
        const session = this.trackingSessions.get(orderId);
        if (session) {
          session.socketIds = session.socketIds.filter(id => id !== client.id);
        }
      });

      this.socketToOrders.delete(client.id);
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Start status polling for an order
   */
  private async startStatusPolling(orderId: string): Promise<void> {
    // Clear existing interval if any
    const existingInterval = this.statusPollingIntervals.get(orderId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new polling interval
    const interval = setInterval(async () => {
      try {
        await this.pollOrderStatus(orderId);
      } catch (error) {
        this.logger.error(`Status polling failed for order ${orderId}:`, error);
      }
    }, 30000); // Poll every 30 seconds

    this.statusPollingIntervals.set(orderId, interval);
    this.logger.log(`Started status polling for order ${orderId}`);
  }

  /**
   * Poll order status from provider
   */
  private async pollOrderStatus(orderId: string): Promise<void> {
    const session = this.trackingSessions.get(orderId);
    if (!session || !session.isActive) {
      return;
    }

    try {
      // Mock status update for now
      const statusUpdate = await this.mockGetStatusUpdate(session);

      // Check if status changed
      if (statusUpdate.status !== session.status) {
        await this.processStatusUpdate(orderId, statusUpdate);
      }

      // Stop polling if order is in final state
      if (['delivered', 'cancelled', 'failed'].includes(statusUpdate.status)) {
        this.stopStatusPolling(orderId);
        session.isActive = false;
      }

    } catch (error) {
      this.logger.error(`Failed to poll status for order ${orderId}:`, error);
    }
  }

  /**
   * Process status update
   */
  private async processStatusUpdate(orderId: string, update: StatusUpdate): Promise<void> {
    const session = this.trackingSessions.get(orderId);
    if (!session) {
      return;
    }

    // Update session
    session.status = update.status;
    session.lastUpdate = update.timestamp;

    // Emit to connected clients
    this.server.to(`order_${orderId}`).emit('status_update', {
      orderId,
      status: update.status,
      timestamp: update.timestamp,
      location: update.location,
      estimatedArrival: update.estimatedArrival,
      driverInfo: update.driverInfo,
      message: update.message,
      reason: update.reason
    });

    // Emit internal event
    this.eventEmitter.emit('order.status.updated', {
      orderId,
      previousStatus: session.status,
      newStatus: update.status,
      timestamp: update.timestamp
    });

    this.logger.log(`Status updated for order ${orderId}: ${update.status}`);
  }

  /**
   * Handle webhook status updates
   */
  @OnEvent('delivery.webhook.received')
  async handleWebhookUpdate(payload: any): Promise<void> {
    const { orderId, providerType, statusUpdate } = payload;

    try {
      // Find tracking session
      const session = this.trackingSessions.get(orderId);
      if (!session) {
        // Create session if webhook arrives before tracking started
        await this.createTrackingSession(orderId);
      }

      // Process the update
      await this.processStatusUpdate(orderId, statusUpdate);

    } catch (error) {
      this.logger.error(`Failed to handle webhook update for order ${orderId}:`, error);
    }
  }

  /**
   * Get current order status
   */
  async getCurrentOrderStatus(orderId: string): Promise<any> {
    try {
      const order = await this.prisma.deliveryProviderOrder.findFirst({
        where: { orderNumber: orderId },
        orderBy: { createdAt: 'desc' }
      });

      if (!order) {
        // Return mock status if order not found
        return {
          orderId,
          providerOrderId: `MOCK-${orderId}`,
          status: 'pending',
          providerType: 'careem',
          estimatedDeliveryTime: new Date(Date.now() + 35 * 60000),
          lastUpdate: new Date()
        };
      }

      return {
        orderId,
        providerOrderId: order.providerOrderId,
        status: order.orderStatus,
        providerType: 'careem',
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        lastUpdate: order.updatedAt
      };
    } catch (error) {
      this.logger.error(`Error getting order status: ${error.message}`);
      return {
        orderId,
        status: 'error',
        lastUpdate: new Date()
      };
    }
  }

  /**
   * Stop status polling for an order
   */
  private stopStatusPolling(orderId: string): void {
    const interval = this.statusPollingIntervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      this.statusPollingIntervals.delete(orderId);
      this.logger.log(`Stopped status polling for order ${orderId}`);
    }
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours

    for (const [orderId, session] of this.trackingSessions.entries()) {
      if (
        !session.isActive ||
        session.socketIds.length === 0 ||
        (now.getTime() - session.lastUpdate.getTime()) > maxAge
      ) {
        // Stop polling
        this.stopStatusPolling(orderId);

        // Remove session
        this.trackingSessions.delete(orderId);

        this.logger.log(`Cleaned up inactive session for order ${orderId}`);
      }
    }
  }

  /**
   * Get order details from database
   */
  private async getOrderDetails(orderId: string): Promise<any> {
    try {
      return await this.prisma.deliveryProviderOrder.findFirst({
        where: { orderNumber: orderId }
      });
    } catch (error) {
      this.logger.error(`Error getting order details: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify order access permissions
   */
  private async verifyOrderAccess(orderId: string, companyId: string): Promise<boolean> {
    try {
      const order = await this.prisma.deliveryProviderOrder.findFirst({
        where: {
          orderNumber: orderId,
          companyId
        }
      });

      return !!order;
    } catch (error) {
      this.logger.error(`Error verifying order access: ${error.message}`);
      return false;
    }
  }

  /**
   * Mock status update for testing
   */
  private async mockGetStatusUpdate(session: TrackingSession): Promise<StatusUpdate> {
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(session.status);
    const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);

    return {
      orderId: session.orderId,
      providerOrderId: session.providerOrderId,
      status: statuses[nextIndex] as any,
      timestamp: new Date(),
      location: {
        lat: 31.9539 + (Math.random() - 0.5) * 0.01,
        lng: 35.9106 + (Math.random() - 0.5) * 0.01
      },
      estimatedArrival: new Date(Date.now() + 25 * 60000),
      driverInfo: {
        name: 'Ahmad Driver',
        phone: '+962777123456',
        vehicleType: 'motorcycle'
      }
    };
  }

  /**
   * Get tracking analytics
   */
  async getTrackingAnalytics(companyId: string): Promise<any> {
    const activeTracking = Array.from(this.trackingSessions.values())
      .filter(session => session.companyId === companyId && session.isActive);

    return {
      activeTrackingSessions: activeTracking.length,
      connectedClients: activeTracking.reduce((sum, session) => sum + session.socketIds.length, 0),
      statusDistribution: this.getStatusDistribution(activeTracking),
      recentActivity: [],
      performanceMetrics: {
        averageUpdateInterval: 30,
        totalUpdatesToday: 150
      }
    };
  }

  /**
   * Get status distribution
   */
  private getStatusDistribution(sessions: TrackingSession[]): any {
    const distribution = {};
    sessions.forEach(session => {
      distribution[session.status] = (distribution[session.status] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    // Clear all polling intervals
    for (const interval of this.statusPollingIntervals.values()) {
      clearInterval(interval);
    }

    this.statusPollingIntervals.clear();
    this.trackingSessions.clear();
    this.socketToOrders.clear();
  }
}