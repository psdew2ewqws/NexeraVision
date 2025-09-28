import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized for real-time updates');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`📱 Client connected: ${client.id} (Total: ${this.connectedClients.size})`);

    // Send welcome message
    client.emit('connection-established', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
      service: 'NEXARA Integration Platform',
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`📱 Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  // Broadcast delivery platform events to all connected clients
  broadcastDeliveryEvent(eventType: string, data: any) {
    const payload = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      source: 'delivery-platform',
    };

    this.server.emit('delivery-event', payload);
    this.logger.log(`📡 Broadcasted ${eventType} to ${this.connectedClients.size} clients`);
  }

  // Send event to specific restaurant platform
  sendToRestaurant(restaurantId: string, eventType: string, data: any) {
    const payload = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      restaurantId,
    };

    this.server.to(`restaurant-${restaurantId}`).emit('restaurant-event', payload);
    this.logger.log(`🏪 Sent ${eventType} to restaurant ${restaurantId}`);
  }

  // Send notification about webhook events
  notifyWebhookReceived(webhookData: any) {
    const payload = {
      type: 'webhook-received',
      data: webhookData,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('webhook-notification', payload);
    this.logger.log(`📨 Notified clients about webhook: ${webhookData.eventType || 'unknown'}`);
  }

  // Get connection stats
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      connectedClients: Array.from(this.connectedClients.keys()),
    };
  }
}