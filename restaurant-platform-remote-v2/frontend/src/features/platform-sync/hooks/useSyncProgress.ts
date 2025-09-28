// ================================================
// Sync Progress WebSocket Hook
// Restaurant Platform v2 - Real-time Progress Updates
// ================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../contexts/AuthContext';
import { SyncStatus } from '../../../types/platform-menu.types';

// ================================================
// INTERFACES
// ================================================

export interface MultiPlatformSyncStatus {
  multiSyncId: string;
  overallStatus: SyncStatus;
  overallProgress: {
    completedPlatforms: number;
    totalPlatforms: number;
    percentage: number;
  };
  platformStatuses: {
    platform: string;
    syncId: string;
    status: SyncStatus;
    progress: {
      current: number;
      total: number;
      percentage: number;
      currentOperation?: string;
    };
    errors?: string[];
  }[];
  totalItemsSynced: number;
  totalErrors: number;
  estimatedTimeRemaining: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface ProgressUpdate {
  type: 'sync-progress' | 'multi-sync-progress' | 'sync-completed' | 'sync-failed';
  syncId?: string;
  multiSyncId?: string;
  data: any;
  timestamp: Date;
}

// ================================================
// SYNC PROGRESS HOOK
// ================================================

export const useSyncProgress = () => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<MultiPlatformSyncStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) return;

    const connectSocket = () => {
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
        path: '/sync-progress',
        transports: ['websocket', 'polling'],
        auth: {
          token: `Bearer ${token}`
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('Connected to sync progress WebSocket');
        setIsConnected(true);
        setConnectionError(null);

        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from sync progress WebSocket:', reason);
        setIsConnected(false);
        setSyncStatus(null);
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);

        // Attempt reconnection after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          newSocket.connect();
        }, 5000);
      });

      // Progress update events
      newSocket.on('sync-progress', (update: ProgressUpdate) => {
        console.log('Received sync progress update:', update);
        // Handle individual sync progress if needed
      });

      newSocket.on('multi-sync-progress', (update: ProgressUpdate) => {
        console.log('Received multi-sync progress update:', update);
        if (update.data) {
          setSyncStatus(update.data);
        }
      });

      newSocket.on('sync-completed', (update: ProgressUpdate) => {
        console.log('Sync completed:', update);
        if (update.data) {
          setSyncStatus(prev => prev ? {
            ...prev,
            overallStatus: SyncStatus.COMPLETED,
            completedAt: new Date()
          } : null);
        }
      });

      newSocket.on('multi-sync-completed', (update: ProgressUpdate) => {
        console.log('Multi-sync completed:', update);
        if (update.data) {
          setSyncStatus(prev => prev ? {
            ...prev,
            overallStatus: update.data.overallStatus === 'completed'
              ? SyncStatus.COMPLETED
              : SyncStatus.FAILED,
            completedAt: new Date()
          } : null);
        }
      });

      newSocket.on('sync-failed', (update: ProgressUpdate) => {
        console.log('Sync failed:', update);
        if (update.data) {
          setSyncStatus(prev => prev ? {
            ...prev,
            overallStatus: SyncStatus.FAILED,
            completedAt: new Date()
          } : null);
        }
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
        setConnectionError(error.message || 'WebSocket error');
      });

      setSocket(newSocket);
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, token]);

  // Subscribe to sync progress
  const subscribeToSync = useCallback((multiSyncId: string, menuId?: string) => {
    if (!socket || !isConnected) {
      console.warn('Cannot subscribe: socket not connected');
      return;
    }

    console.log(`Subscribing to multi-sync: ${multiSyncId}`);
    socket.emit('subscribe-multi-sync', { multiSyncId, menuId });
  }, [socket, isConnected]);

  // Unsubscribe from sync progress
  const unsubscribeFromSync = useCallback((multiSyncId: string) => {
    if (!socket) return;

    console.log(`Unsubscribing from multi-sync: ${multiSyncId}`);
    socket.emit('unsubscribe-multi-sync', { multiSyncId });
    setSyncStatus(null);
  }, [socket]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (socket) {
      socket.connect();
    }
  }, [socket]);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      isConnected,
      connectionError,
      hasActiveSubscription: syncStatus !== null,
      activeSyncId: syncStatus?.multiSyncId,
      socketId: socket?.id
    };
  }, [isConnected, connectionError, syncStatus, socket]);

  return {
    // Connection state
    isConnected,
    connectionError,
    socket,

    // Sync status
    syncStatus,

    // Actions
    subscribeToSync,
    unsubscribeFromSync,
    reconnect,

    // Utilities
    getConnectionStats,

    // Computed properties
    isActiveSyncCompleted: syncStatus &&
      (syncStatus.overallStatus === SyncStatus.COMPLETED ||
       syncStatus.overallStatus === SyncStatus.FAILED),

    currentSyncProgress: syncStatus?.overallProgress.percentage || 0,

    platformCount: syncStatus?.overallProgress.totalPlatforms || 0,

    completedPlatforms: syncStatus?.overallProgress.completedPlatforms || 0,

    hasErrors: (syncStatus?.totalErrors || 0) > 0,

    estimatedTimeRemaining: syncStatus?.estimatedTimeRemaining || 0
  };
};