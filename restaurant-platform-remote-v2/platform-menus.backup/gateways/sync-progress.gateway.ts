// ================================================
// Sync Progress WebSocket Gateway
// Restaurant Platform v2 - Real-time Sync Progress Updates
// ================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { MenuSyncEngineService } from '../services/menu-sync-engine.service';
import { MultiPlatformSyncService } from '../services/multi-platform-sync.service';

// ================================================
// WEBSOCKET MESSAGE INTERFACES
// ================================================

interface SyncSubscription {
  userId: string;
  companyId: string;
  syncId?: string;
  multiSyncId?: string;
  menuId?: string;
}

interface ProgressUpdate {
  type: 'sync-progress' | 'multi-sync-progress' | 'sync-completed' | 'sync-failed';
  syncId?: string;
  multiSyncId?: string;
  data: any;
  timestamp: Date;
}

// ================================================
// SYNC PROGRESS WEBSOCKET GATEWAY
// ================================================

@WebSocketGateway({
  namespace: '/sync-progress',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling']
})
@UseGuards(JwtAuthGuard)
export class SyncProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncProgressGateway.name);
  private readonly connectedUsers = new Map<string, SyncSubscription>();
  private readonly syncSubscriptions = new Map<string, Set<string>>(); // syncId -> Set of socketIds
  private readonly multiSyncSubscriptions = new Map<string, Set<string>>(); // multiSyncId -> Set of socketIds

  constructor(
    private readonly syncEngine: MenuSyncEngineService,
    private readonly multiPlatformSync: MultiPlatformSyncService
  ) {}

  // ================================================
  // CONNECTION MANAGEMENT
  // ================================================

  async handleConnection(client: Socket) {
    try {
      // Extract user info from JWT token
      const user = (client as any).user;
      if (!user) {
        this.logger.warn(`WebSocket connection rejected: No user info`);
        client.disconnect(true);
        return;
      }

      // Store user connection
      this.connectedUsers.set(client.id, {
        userId: user.id,
        companyId: user.companyId
      });

      this.logger.log(`User ${user.id} connected to sync progress WebSocket`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to sync progress updates',
        userId: user.id,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`WebSocket connection error:`, error);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);

    if (userInfo) {
      // Clean up subscriptions
      this.cleanupSubscriptions(client.id);
      this.connectedUsers.delete(client.id);

      this.logger.log(`User ${userInfo.userId} disconnected from sync progress WebSocket`);
    }
  }

  // ================================================
  // SUBSCRIPTION MANAGEMENT
  // ================================================

  /**
   * Subscribe to single sync progress updates
   */
  @SubscribeMessage('subscribe-sync')
  async handleSyncSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { syncId: string; menuId?: string }
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      if (!userInfo) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate sync exists and user has access
      const syncStatus = await this.syncEngine.getSyncStatus(data.syncId);
      if (!syncStatus) {
        client.emit('error', { message: 'Sync not found' });
        return;
      }

      // Add to subscription
      if (!this.syncSubscriptions.has(data.syncId)) {
        this.syncSubscriptions.set(data.syncId, new Set());
      }
      this.syncSubscriptions.get(data.syncId)!.add(client.id);

      // Update user subscription info
      const subscription = this.connectedUsers.get(client.id)!;
      subscription.syncId = data.syncId;
      subscription.menuId = data.menuId;

      this.logger.debug(`User ${userInfo.userId} subscribed to sync ${data.syncId}`);

      // Send current status immediately
      client.emit('sync-status', {
        syncId: data.syncId,
        status: syncStatus,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`Error subscribing to sync ${data.syncId}:`, error);
      client.emit('error', { message: 'Failed to subscribe to sync updates' });
    }
  }

  /**
   * Subscribe to multi-platform sync progress updates
   */
  @SubscribeMessage('subscribe-multi-sync')
  async handleMultiSyncSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { multiSyncId: string; menuId?: string }
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      if (!userInfo) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Validate multi-sync exists and user has access
      const multiSyncStatus = await this.multiPlatformSync.getMultiSyncStatus(data.multiSyncId);
      if (!multiSyncStatus) {
        client.emit('error', { message: 'Multi-platform sync not found' });
        return;
      }

      // Add to subscription
      if (!this.multiSyncSubscriptions.has(data.multiSyncId)) {
        this.multiSyncSubscriptions.set(data.multiSyncId, new Set());
      }
      this.multiSyncSubscriptions.get(data.multiSyncId)!.add(client.id);

      // Update user subscription info
      const subscription = this.connectedUsers.get(client.id)!;
      subscription.multiSyncId = data.multiSyncId;
      subscription.menuId = data.menuId;

      this.logger.debug(`User ${userInfo.userId} subscribed to multi-sync ${data.multiSyncId}`);

      // Send current status immediately
      client.emit('multi-sync-status', {
        multiSyncId: data.multiSyncId,
        status: multiSyncStatus,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`Error subscribing to multi-sync ${data.multiSyncId}:`, error);
      client.emit('error', { message: 'Failed to subscribe to multi-sync updates' });
    }
  }

  /**
   * Unsubscribe from sync updates
   */
  @SubscribeMessage('unsubscribe-sync')
  handleSyncUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { syncId: string }
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) return;

    // Remove from sync subscription
    if (this.syncSubscriptions.has(data.syncId)) {
      this.syncSubscriptions.get(data.syncId)!.delete(client.id);

      if (this.syncSubscriptions.get(data.syncId)!.size === 0) {
        this.syncSubscriptions.delete(data.syncId);
      }
    }

    // Clear user subscription info
    const subscription = this.connectedUsers.get(client.id)!;
    if (subscription.syncId === data.syncId) {
      subscription.syncId = undefined;
    }

    this.logger.debug(`User ${userInfo.userId} unsubscribed from sync ${data.syncId}`);
  }

  /**
   * Unsubscribe from multi-sync updates
   */
  @SubscribeMessage('unsubscribe-multi-sync')
  handleMultiSyncUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { multiSyncId: string }
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (!userInfo) return;

    // Remove from multi-sync subscription
    if (this.multiSyncSubscriptions.has(data.multiSyncId)) {
      this.multiSyncSubscriptions.get(data.multiSyncId)!.delete(client.id);

      if (this.multiSyncSubscriptions.get(data.multiSyncId)!.size === 0) {
        this.multiSyncSubscriptions.delete(data.multiSyncId);
      }
    }

    // Clear user subscription info
    const subscription = this.connectedUsers.get(client.id)!;
    if (subscription.multiSyncId === data.multiSyncId) {
      subscription.multiSyncId = undefined;
    }

    this.logger.debug(`User ${userInfo.userId} unsubscribed from multi-sync ${data.multiSyncId}`);
  }

  // ================================================
  // EVENT LISTENERS (from Sync Engines)
  // ================================================

  /**
   * Handle single sync progress updates
   */
  @OnEvent('sync.progress')
  handleSyncProgress(event: { syncId: string; progress: any }) {
    const subscribers = this.syncSubscriptions.get(event.syncId);
    if (!subscribers || subscribers.size === 0) return;

    const update: ProgressUpdate = {
      type: 'sync-progress',
      syncId: event.syncId,
      data: event.progress,
      timestamp: new Date()
    };

    this.broadcastToSubscribers(subscribers, 'sync-progress', update);
    this.logger.debug(`Broadcasted sync progress for ${event.syncId} to ${subscribers.size} subscribers`);
  }

  /**
   * Handle single sync completion
   */
  @OnEvent('sync.completed')
  handleSyncCompleted(event: { syncId: string; menuId: string; metrics: any }) {
    const subscribers = this.syncSubscriptions.get(event.syncId);
    if (!subscribers || subscribers.size === 0) return;

    const update: ProgressUpdate = {
      type: 'sync-completed',
      syncId: event.syncId,
      data: {
        menuId: event.menuId,
        metrics: event.metrics,
        message: 'Sync completed successfully'
      },
      timestamp: new Date()
    };

    this.broadcastToSubscribers(subscribers, 'sync-completed', update);
    this.logger.log(`Broadcasted sync completion for ${event.syncId} to ${subscribers.size} subscribers`);

    // Clean up subscriptions for completed sync
    this.syncSubscriptions.delete(event.syncId);
  }

  /**
   * Handle single sync failure
   */
  @OnEvent('sync.failed')
  handleSyncFailed(event: { syncId: string; menuId: string; error: string }) {
    const subscribers = this.syncSubscriptions.get(event.syncId);
    if (!subscribers || subscribers.size === 0) return;

    const update: ProgressUpdate = {
      type: 'sync-failed',
      syncId: event.syncId,
      data: {
        menuId: event.menuId,
        error: event.error,
        message: 'Sync failed'
      },
      timestamp: new Date()
    };

    this.broadcastToSubscribers(subscribers, 'sync-failed', update);
    this.logger.log(`Broadcasted sync failure for ${event.syncId} to ${subscribers.size} subscribers`);

    // Clean up subscriptions for failed sync
    this.syncSubscriptions.delete(event.syncId);
  }

  /**
   * Handle multi-platform sync progress updates
   */
  @OnEvent('multi-sync.progress')
  handleMultiSyncProgress(event: { multiSyncId: string; status: any }) {
    const subscribers = this.multiSyncSubscriptions.get(event.multiSyncId);
    if (!subscribers || subscribers.size === 0) return;

    const update: ProgressUpdate = {
      type: 'multi-sync-progress',
      multiSyncId: event.multiSyncId,
      data: event.status,
      timestamp: new Date()
    };

    this.broadcastToSubscribers(subscribers, 'multi-sync-progress', update);
    this.logger.debug(`Broadcasted multi-sync progress for ${event.multiSyncId} to ${subscribers.size} subscribers`);
  }

  /**
   * Handle multi-platform sync completion
   */
  @OnEvent('multi-sync.completed')
  handleMultiSyncCompleted(event: { multiSyncId: string; menuId: string; overallStatus: string; totalItemsSynced: number }) {
    const subscribers = this.multiSyncSubscriptions.get(event.multiSyncId);
    if (!subscribers || subscribers.size === 0) return;

    const update: ProgressUpdate = {
      type: 'sync-completed',
      multiSyncId: event.multiSyncId,
      data: {
        menuId: event.menuId,
        overallStatus: event.overallStatus,
        totalItemsSynced: event.totalItemsSynced,
        message: event.overallStatus === 'completed' ? 'Multi-platform sync completed' : 'Multi-platform sync failed'
      },
      timestamp: new Date()
    };

    this.broadcastToSubscribers(subscribers, 'multi-sync-completed', update);
    this.logger.log(`Broadcasted multi-sync completion for ${event.multiSyncId} to ${subscribers.size} subscribers`);

    // Clean up subscriptions for completed multi-sync
    this.multiSyncSubscriptions.delete(event.multiSyncId);
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  private broadcastToSubscribers(subscribers: Set<string>, event: string, data: any) {
    subscribers.forEach(socketId => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      } else {
        // Clean up disconnected socket
        subscribers.delete(socketId);
      }
    });
  }

  private cleanupSubscriptions(socketId: string) {
    // Remove from all sync subscriptions
    this.syncSubscriptions.forEach((subscribers, syncId) => {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.syncSubscriptions.delete(syncId);
      }
    });

    // Remove from all multi-sync subscriptions
    this.multiSyncSubscriptions.forEach((subscribers, multiSyncId) => {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.multiSyncSubscriptions.delete(multiSyncId);
      }
    });
  }

  /**
   * Manual method to send progress updates (for testing)
   */
  async sendManualUpdate(syncId: string, progress: any) {
    const subscribers = this.syncSubscriptions.get(syncId);
    if (subscribers && subscribers.size > 0) {
      const update: ProgressUpdate = {
        type: 'sync-progress',
        syncId,
        data: progress,
        timestamp: new Date()
      };

      this.broadcastToSubscribers(subscribers, 'sync-progress', update);
    }
  }

  /**
   * Get connection statistics for monitoring
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      syncSubscriptions: this.syncSubscriptions.size,
      multiSyncSubscriptions: this.multiSyncSubscriptions.size,
      timestamp: new Date()
    };
  }
}