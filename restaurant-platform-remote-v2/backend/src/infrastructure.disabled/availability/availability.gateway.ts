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
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
}

interface AvailabilityUpdate {
  id: string;
  companyId: string;
  branchId: string;
  connectedId: string;
  connectedType: 'product' | 'modifier' | 'category';
  isActive?: boolean;
  isInStock?: boolean;
  stockLevel?: number;
  prices?: Record<string, number>;
  notes?: string;
  updatedBy: string;
  updatedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },
  namespace: '/availability',
})
export class AvailabilityGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AvailabilityGateway');

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('Availability WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract token from query or auth header
      const token = client.handshake.auth.token || client.handshake.query.token;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.user = {
        id: payload.sub,
        companyId: payload.companyId,
        role: payload.role,
      };

      // Join company-specific room for multi-tenancy
      const companyRoom = `company:${client.user.companyId}`;
      client.join(companyRoom);

      this.logger.log(
        `Client ${client.id} connected (User: ${client.user.id}, Company: ${client.user.companyId}, Role: ${client.user.role})`
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to availability updates',
        companyId: client.user.companyId,
        userId: client.user.id,
      });

    } catch (error) {
      this.logger.warn(`Client ${client.id} rejected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('joinBranch')
  async handleJoinBranch(
    @MessageBody() data: { branchId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const branchRoom = `branch:${data.branchId}`;
    client.join(branchRoom);
    
    this.logger.log(`User ${client.user.id} joined branch room: ${branchRoom}`);
    client.emit('joinedBranch', { branchId: data.branchId });
  }

  @SubscribeMessage('leaveBranch')
  async handleLeaveBranch(
    @MessageBody() data: { branchId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const branchRoom = `branch:${data.branchId}`;
    client.leave(branchRoom);
    
    this.logger.log(`User ${client.user.id} left branch room: ${branchRoom}`);
    client.emit('leftBranch', { branchId: data.branchId });
  }

  // Broadcast availability update to all clients in the same company
  async broadcastAvailabilityUpdate(update: AvailabilityUpdate) {
    const companyRoom = `company:${update.companyId}`;
    const branchRoom = `branch:${update.branchId}`;
    
    const updateData = {
      type: 'availability_update',
      data: update,
      timestamp: new Date().toISOString(),
    };

    // Send to company room (all users in the company)
    this.server.to(companyRoom).emit('availabilityUpdate', updateData);
    
    // Send to specific branch room (users watching this branch)
    this.server.to(branchRoom).emit('branchUpdate', updateData);

    this.logger.log(
      `Broadcasted availability update for ${update.connectedType}:${update.connectedId} in branch:${update.branchId}`
    );
  }

  // Broadcast bulk availability updates
  async broadcastBulkAvailabilityUpdate(updates: AvailabilityUpdate[]) {
    const companiesAffected = new Set(updates.map(u => u.companyId));
    const branchesAffected = new Set(updates.map(u => u.branchId));

    const bulkUpdateData = {
      type: 'bulk_availability_update',
      data: updates,
      count: updates.length,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all affected companies
    for (const companyId of companiesAffected) {
      this.server.to(`company:${companyId}`).emit('bulkAvailabilityUpdate', bulkUpdateData);
    }

    // Broadcast to all affected branches
    for (const branchId of branchesAffected) {
      this.server.to(`branch:${branchId}`).emit('bulkBranchUpdate', bulkUpdateData);
    }

    this.logger.log(`Broadcasted bulk availability update (${updates.length} items)`);
  }

  // Broadcast stock alerts (legacy method - keeping for compatibility)
  async broadcastStockAlert(alert: {
    id: string;
    companyId: string;
    branchId: string;
    connectedId: string;
    connectedType: string;
    alertType: 'out_of_stock' | 'low_stock' | 'overstocked';
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    currentStock?: number;
    threshold?: number;
  }) {
    const companyRoom = `company:${alert.companyId}`;
    const branchRoom = `branch:${alert.branchId}`;

    const alertData = {
      type: 'stock_alert',
      data: alert,
      timestamp: new Date().toISOString(),
    };

    this.server.to(companyRoom).emit('stockAlert', alertData);
    this.server.to(branchRoom).emit('branchAlert', alertData);

    this.logger.log(
      `Broadcasted ${alert.alertType} alert for ${alert.connectedType}:${alert.connectedId} (Priority: ${alert.priority})`
    );
  }

  // Broadcast comprehensive alerts with full data
  async broadcastAlert(alert: any) {
    const companyRoom = `company:${alert.companyId}`;
    const branchRoom = alert.branchId ? `branch:${alert.branchId}` : null;

    const alertData = {
      type: 'availability_alert',
      data: {
        id: alert.id,
        alertType: alert.alertType,
        severity: alert.priority,
        title: alert.title,
        message: alert.message,
        companyId: alert.companyId,
        branchId: alert.branchId,
        connectedId: alert.connectedId,
        connectedType: alert.connectedType,
        currentStock: alert.currentStock,
        threshold: alert.threshold,
        branch: alert.branch,
        createdAt: alert.createdAt,
        isRead: false,
        isResolved: false
      },
      timestamp: new Date().toISOString(),
    };

    // Send to company room (all users in the company)
    this.server.to(companyRoom).emit('newAlert', alertData);
    
    // Send to specific branch room if branch is specified
    if (branchRoom) {
      this.server.to(branchRoom).emit('branchAlert', alertData);
    }

    // Send high priority alerts with special notification
    if (alert.priority === 'critical' || alert.priority === 'high') {
      this.server.to(companyRoom).emit('urgentAlert', alertData);
    }

    this.logger.log(
      `Broadcasted alert: ${alert.title} (${alert.alertType}, Priority: ${alert.priority})`
    );
  }

  // Broadcast alert status updates (read, resolved)
  async broadcastAlertUpdate(alertUpdate: {
    id: string;
    companyId: string;
    branchId?: string;
    isRead?: boolean;
    isResolved?: boolean;
    resolvedBy?: string;
    resolutionNotes?: string;
  }) {
    const companyRoom = `company:${alertUpdate.companyId}`;
    const branchRoom = alertUpdate.branchId ? `branch:${alertUpdate.branchId}` : null;

    const updateData = {
      type: 'alert_update',
      data: alertUpdate,
      timestamp: new Date().toISOString(),
    };

    this.server.to(companyRoom).emit('alertUpdate', updateData);
    
    if (branchRoom) {
      this.server.to(branchRoom).emit('branchAlertUpdate', updateData);
    }

    this.logger.log(
      `Broadcasted alert update for alert ${alertUpdate.id} (resolved: ${alertUpdate.isResolved}, read: ${alertUpdate.isRead})`
    );
  }

  // Get connected clients count for monitoring
  async getConnectedClientsCount(): Promise<{
    total: number;
    byCompany: Record<string, number>;
    byBranch: Record<string, number>;
  }> {
    const sockets = await this.server.fetchSockets();
    const byCompany: Record<string, number> = {};
    const byBranch: Record<string, number> = {};

    for (const socket of sockets) {
      const authSocket = socket as unknown as AuthenticatedSocket;
      if (authSocket.user?.companyId) {
        byCompany[authSocket.user.companyId] = (byCompany[authSocket.user.companyId] || 0) + 1;
      }
      
      // Count branch rooms
      for (const room of socket.rooms) {
        if (room.startsWith('branch:')) {
          const branchId = room.replace('branch:', '');
          byBranch[branchId] = (byBranch[branchId] || 0) + 1;
        }
      }
    }

    return {
      total: sockets.length,
      byCompany,
      byBranch,
    };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', { 
      timestamp: new Date().toISOString(),
      user: client.user?.id,
      company: client.user?.companyId 
    });
  }
}