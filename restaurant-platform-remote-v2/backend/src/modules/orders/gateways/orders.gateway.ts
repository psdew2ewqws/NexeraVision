import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OrderStatus } from '../dto';

interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    companyId: string;
    role: string;
    branchId?: string;
  };
}

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  afterInit(server: Server) {
    this.logger.log('Orders WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Join company-specific room for multi-tenancy
    if (client.user?.companyId) {
      client.join(`company:${client.user.companyId}`);
      this.logger.log(`Client ${client.id} joined company room: ${client.user.companyId}`);
    }

    // Join branch-specific room if user has branch access
    if (client.user?.branchId) {
      client.join(`branch:${client.user.branchId}`);
      this.logger.log(`Client ${client.id} joined branch room: ${client.user.branchId}`);
    }

    // Send connection confirmation
    client.emit('connected', {
      message: 'Successfully connected to orders updates',
      rooms: [`company:${client.user?.companyId}`, `branch:${client.user?.branchId}`].filter(Boolean),
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBranch')
  @UseGuards(JwtAuthGuard)
  handleJoinBranch(
    @MessageBody() branchId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Validate user has access to this branch
    if (client.user.role !== 'super_admin' && client.user.branchId !== branchId) {
      client.emit('error', { message: 'Access denied to this branch' });
      return;
    }

    client.join(`branch:${branchId}`);
    this.logger.log(`Client ${client.id} joined branch room: ${branchId}`);
    
    client.emit('joinedBranch', { branchId });
  }

  @SubscribeMessage('leaveBranch')
  handleLeaveBranch(
    @MessageBody() branchId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`branch:${branchId}`);
    this.logger.log(`Client ${client.id} left branch room: ${branchId}`);
    
    client.emit('leftBranch', { branchId });
  }

  @SubscribeMessage('requestLiveOrders')
  @UseGuards(JwtAuthGuard)
  handleRequestLiveOrders(
    @MessageBody() data: { branchId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // This would typically fetch and send current live orders
    // For now, we'll emit a placeholder response
    client.emit('liveOrders', {
      branchId: data.branchId,
      orders: [], // Would be populated with actual live orders
      timestamp: new Date().toISOString(),
    });
  }

  // Methods to broadcast order updates

  /**
   * Broadcast new order to relevant clients
   */
  broadcastNewOrder(order: any) {
    const companyRoom = `company:${order.branch.companyId}`;
    const branchRoom = `branch:${order.branchId}`;

    this.server.to(companyRoom).emit('newOrder', {
      type: 'NEW_ORDER',
      data: order,
      timestamp: new Date().toISOString(),
    });

    this.server.to(branchRoom).emit('newOrder', {
      type: 'NEW_ORDER',
      data: order,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted new order ${order.orderNumber} to company ${order.branch.companyId} and branch ${order.branchId}`);
  }

  /**
   * Broadcast order status update
   */
  broadcastOrderStatusUpdate(order: any, previousStatus: string) {
    const companyRoom = `company:${order.branch.companyId}`;
    const branchRoom = `branch:${order.branchId}`;

    const updateData = {
      type: 'ORDER_STATUS_UPDATE',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        previousStatus,
        newStatus: order.status,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        driverInfo: order.driverInfo,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.to(companyRoom).emit('orderStatusUpdate', updateData);
    this.server.to(branchRoom).emit('orderStatusUpdate', updateData);

    this.logger.log(`Broadcasted status update for order ${order.orderNumber}: ${previousStatus} -> ${order.status}`);
  }

  /**
   * Broadcast order cancellation
   */
  broadcastOrderCancellation(order: any, reason: string) {
    const companyRoom = `company:${order.branch.companyId}`;
    const branchRoom = `branch:${order.branchId}`;

    const cancellationData = {
      type: 'ORDER_CANCELLED',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        reason,
        cancelledAt: order.cancelledAt,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.to(companyRoom).emit('orderCancelled', cancellationData);
    this.server.to(branchRoom).emit('orderCancelled', cancellationData);

    this.logger.log(`Broadcasted cancellation for order ${order.orderNumber}: ${reason}`);
  }

  /**
   * Broadcast driver updates
   */
  broadcastDriverUpdate(order: any, driverInfo: any) {
    const companyRoom = `company:${order.branch.companyId}`;
    const branchRoom = `branch:${order.branchId}`;

    const driverUpdateData = {
      type: 'DRIVER_UPDATE',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        driverInfo,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.to(companyRoom).emit('driverUpdate', driverUpdateData);
    this.server.to(branchRoom).emit('driverUpdate', driverUpdateData);

    this.logger.log(`Broadcasted driver update for order ${order.orderNumber}`);
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: any) {
    this.server.emit('notification', {
      userId,
      ...notification,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Sent notification to user ${userId}: ${notification.message}`);
  }

  /**
   * Broadcast general system announcement
   */
  broadcastSystemAnnouncement(companyId: string, announcement: any) {
    const companyRoom = `company:${companyId}`;

    this.server.to(companyRoom).emit('systemAnnouncement', {
      type: 'SYSTEM_ANNOUNCEMENT',
      data: announcement,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted system announcement to company ${companyId}`);
  }
}