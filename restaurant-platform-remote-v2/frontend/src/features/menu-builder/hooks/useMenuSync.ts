// Real-time Menu Sync Hook with WebSocket Integration
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { MenuSyncEvent, Platform, PlatformMenu } from '../../../types/menu-builder';
import toast from 'react-hot-toast';

interface SyncState {
  isConnected: boolean;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime?: Date;
  pendingChanges: number;
  error?: string;
}

interface QueuedChange {
  id: string;
  type: 'menu_update' | 'product_add' | 'product_remove' | 'category_add' | 'category_remove';
  platformId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface UseMenuSyncOptions {
  platformId?: string;
  autoReconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableOfflineQueue?: boolean;
}

export const useMenuSync = (options: UseMenuSyncOptions = {}) => {
  const {
    platformId,
    autoReconnect = true,
    maxRetries = 3,
    retryDelay = 5000,
    enableOfflineQueue = true
  } = options;

  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const changeQueueRef = useRef<QueuedChange[]>([]);

  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    pendingChanges: 0
  });

  // Connection management
  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/menu-sync`;
      const token = localStorage.getItem('auth-token');

      wsRef.current = new WebSocket(`${wsUrl}?token=${token}&platform=${platformId || 'all'}`);

      wsRef.current.onopen = () => {
        console.log('🔌 Menu sync WebSocket connected');
        setSyncState(prev => ({
          ...prev,
          isConnected: true,
          syncStatus: 'idle',
          error: undefined
        }));

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        // Process queued changes
        processChangeQueue();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleSyncEvent(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 Menu sync WebSocket disconnected', event.code);
        setSyncState(prev => ({
          ...prev,
          isConnected: false
        }));

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Auto-reconnect
        if (autoReconnect && !event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, retryDelay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('🔌 Menu sync WebSocket error:', error);
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'error',
          error: 'Connection error'
        }));
      };

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setSyncState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: 'Failed to connect'
      }));
    }
  }, [user, platformId, autoReconnect, retryDelay]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setSyncState(prev => ({
      ...prev,
      isConnected: false
    }));
  }, []);

  // Handle sync events from server
  const handleSyncEvent = useCallback((event: MenuSyncEvent) => {
    console.log('📡 Received sync event:', event);

    switch (event.type) {
      case 'sync_start':
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'syncing'
        }));
        break;

      case 'sync_progress':
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'syncing'
        }));
        break;

      case 'sync_complete':
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'success',
          lastSyncTime: new Date(),
          pendingChanges: Math.max(0, prev.pendingChanges - 1)
        }));

        // Remove completed change from queue
        changeQueueRef.current = changeQueueRef.current.filter(
          change => change.id !== event.data?.changeId
        );

        toast.success('Menu synced successfully');
        break;

      case 'sync_error':
        setSyncState(prev => ({
          ...prev,
          syncStatus: 'error',
          error: event.error || 'Sync failed'
        }));

        // Retry failed change
        retryFailedChange(event.data?.changeId);
        toast.error(`Sync failed: ${event.error}`);
        break;

      default:
        console.log('Unknown sync event type:', event.type);
    }
  }, []);

  // Queue change for sync
  const queueChange = useCallback((change: Omit<QueuedChange, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedChange: QueuedChange = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0
    };

    changeQueueRef.current.push(queuedChange);

    setSyncState(prev => ({
      ...prev,
      pendingChanges: prev.pendingChanges + 1
    }));

    // Try to sync immediately if connected
    if (syncState.isConnected && syncState.isOnline) {
      syncChange(queuedChange);
    } else if (!enableOfflineQueue) {
      // If offline queue is disabled, show error
      toast.error('Cannot sync changes while offline');
    }
  }, [syncState.isConnected, syncState.isOnline, enableOfflineQueue]);

  // Sync individual change
  const syncChange = useCallback((change: QueuedChange) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot sync change');
      return;
    }

    try {
      const syncMessage = {
        type: 'sync_change',
        changeId: change.id,
        changeType: change.type,
        platformId: change.platformId,
        data: change.data,
        timestamp: change.timestamp.toISOString()
      };

      wsRef.current.send(JSON.stringify(syncMessage));

      setSyncState(prev => ({
        ...prev,
        syncStatus: 'syncing'
      }));

    } catch (error) {
      console.error('Failed to sync change:', error);
      setSyncState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: 'Failed to send change'
      }));
    }
  }, []);

  // Process queued changes
  const processChangeQueue = useCallback(() => {
    const queue = changeQueueRef.current;
    if (queue.length === 0) return;

    console.log(`📝 Processing ${queue.length} queued changes`);

    queue.forEach(change => {
      if (change.retryCount < maxRetries) {
        syncChange(change);
      } else {
        console.error('Max retries exceeded for change:', change.id);
        toast.error('Failed to sync change after multiple retries');
      }
    });
  }, [syncChange, maxRetries]);

  // Retry failed change
  const retryFailedChange = useCallback((changeId: string) => {
    const change = changeQueueRef.current.find(c => c.id === changeId);
    if (!change) return;

    change.retryCount += 1;

    if (change.retryCount < maxRetries) {
      setTimeout(() => {
        syncChange(change);
      }, retryDelay * change.retryCount);
    } else {
      console.error('Max retries exceeded for change:', changeId);
      toast.error('Failed to sync change after multiple retries');
    }
  }, [syncChange, maxRetries, retryDelay]);

  // Menu sync methods
  const syncMenu = useCallback((platform: Platform, menu: PlatformMenu) => {
    queueChange({
      type: 'menu_update',
      platformId: platform.id,
      data: {
        menuId: menu.id,
        categories: menu.categories,
        products: menu.products,
        metadata: menu.metadata
      }
    });
  }, [queueChange]);

  const syncProductAdd = useCallback((platformId: string, productId: string, categoryId?: string) => {
    queueChange({
      type: 'product_add',
      platformId,
      data: { productId, categoryId }
    });
  }, [queueChange]);

  const syncProductRemove = useCallback((platformId: string, productId: string) => {
    queueChange({
      type: 'product_remove',
      platformId,
      data: { productId }
    });
  }, [queueChange]);

  const syncCategoryAdd = useCallback((platformId: string, categoryId: string) => {
    queueChange({
      type: 'category_add',
      platformId,
      data: { categoryId }
    });
  }, [queueChange]);

  const syncCategoryRemove = useCallback((platformId: string, categoryId: string) => {
    queueChange({
      type: 'category_remove',
      platformId,
      data: { categoryId }
    });
  }, [queueChange]);

  // Force sync all pending changes
  const forceSyncAll = useCallback(() => {
    if (!syncState.isConnected) {
      toast.error('Cannot sync - not connected to server');
      return;
    }

    if (!syncState.isOnline) {
      toast.error('Cannot sync - device is offline');
      return;
    }

    processChangeQueue();
  }, [syncState.isConnected, syncState.isOnline, processChangeQueue]);

  // Clear all pending changes
  const clearPendingChanges = useCallback(() => {
    changeQueueRef.current = [];
    setSyncState(prev => ({
      ...prev,
      pendingChanges: 0
    }));
    toast.success('Pending changes cleared');
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      if (autoReconnect && !syncState.isConnected) {
        connect();
      }
      processChangeQueue();
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
      if (enableOfflineQueue) {
        toast('Working offline - changes will sync when reconnected', {
          icon: '📴',
          duration: 3000
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, processChangeQueue, autoReconnect, syncState.isConnected, enableOfflineQueue]);

  // Initialize connection
  useEffect(() => {
    if (user && syncState.isOnline) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect, syncState.isOnline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected: syncState.isConnected,
    isOnline: syncState.isOnline,
    syncStatus: syncState.syncStatus,
    lastSyncTime: syncState.lastSyncTime,
    pendingChanges: syncState.pendingChanges,
    error: syncState.error,

    // Connection control
    connect,
    disconnect,

    // Sync methods
    syncMenu,
    syncProductAdd,
    syncProductRemove,
    syncCategoryAdd,
    syncCategoryRemove,

    // Manual control
    forceSyncAll,
    clearPendingChanges,

    // Queue info
    getPendingChanges: () => [...changeQueueRef.current],
    getQueueSize: () => changeQueueRef.current.length
  };
};