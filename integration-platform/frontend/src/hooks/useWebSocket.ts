import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WSMessage, ProviderStatusUpdate } from '@/types';
import toast from 'react-hot-toast';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onMessage?: (message: WSMessage) => void;
  onOrderUpdate?: (order: any) => void;
  onProviderStatusUpdate?: (update: ProviderStatusUpdate) => void;
  onSystemAlert?: (alert: any) => void;
  onMetricsUpdate?: (metrics: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = true,
    onMessage,
    onOrderUpdate,
    onProviderStatusUpdate,
    onSystemAlert,
    onMetricsUpdate,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: {
          // Add authentication token if needed
          token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
        },
      });

      socketRef.current.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        toast.success('Real-time updates connected');
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected, need to reconnect manually
          socketRef.current?.connect();
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        toast.error('Failed to connect to real-time updates');
      });

      // Handle different message types
      socketRef.current.on('order_update', (data) => {
        const message: WSMessage = {
          type: 'order_update',
          data,
          timestamp: new Date().toISOString(),
        };
        setLastMessage(message);
        onMessage?.(message);
        onOrderUpdate?.(data);

        // Show notification for important order updates
        if (data.status === 'delivered') {
          toast.success(`Order #${data.external_id} delivered successfully`);
        } else if (data.status === 'cancelled') {
          toast.error(`Order #${data.external_id} was cancelled`);
        }
      });

      socketRef.current.on('provider_status', (data: ProviderStatusUpdate) => {
        const message: WSMessage = {
          type: 'provider_status',
          data,
          timestamp: new Date().toISOString(),
        };
        setLastMessage(message);
        onMessage?.(message);
        onProviderStatusUpdate?.(data);

        // Show notification for provider status changes
        if (data.status === 'error') {
          toast.error(`${data.provider.toUpperCase()} integration is down`);
        } else if (data.status === 'active') {
          toast.success(`${data.provider.toUpperCase()} integration is back online`);
        }
      });

      socketRef.current.on('system_alert', (data) => {
        const message: WSMessage = {
          type: 'system_alert',
          data,
          timestamp: new Date().toISOString(),
        };
        setLastMessage(message);
        onMessage?.(message);
        onSystemAlert?.(data);

        // Show system alerts
        if (data.level === 'error') {
          toast.error(data.message);
        } else if (data.level === 'warning') {
          toast(data.message, { icon: '⚠️' });
        } else {
          toast(data.message, { icon: 'ℹ️' });
        }
      });

      socketRef.current.on('metrics_update', (data) => {
        const message: WSMessage = {
          type: 'metrics_update',
          data,
          timestamp: new Date().toISOString(),
        };
        setLastMessage(message);
        onMessage?.(message);
        onMetricsUpdate?.(data);
      });

      // Custom event handlers
      socketRef.current.on('webhook_received', (data) => {
        console.log('Webhook received:', data);
        toast.success(`Webhook from ${data.provider} processed`);
      });

      socketRef.current.on('menu_sync_complete', (data) => {
        console.log('Menu sync complete:', data);
        toast.success(`Menu sync completed for ${data.provider}`);
      });

      socketRef.current.on('test_result', (data) => {
        console.log('Test result:', data);
        if (data.success) {
          toast.success(`${data.provider} test passed`);
        } else {
          toast.error(`${data.provider} test failed: ${data.error}`);
        }
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setConnectionError('Failed to initialize WebSocket connection');
    }
  }, [url, onMessage, onOrderUpdate, onProviderStatusUpdate, onSystemAlert, onMetricsUpdate]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Subscribe to specific events
  const subscribeToOrders = useCallback((filters?: any) => {
    sendMessage('subscribe_orders', filters);
  }, [sendMessage]);

  const subscribeToProvider = useCallback((provider: string) => {
    sendMessage('subscribe_provider', { provider });
  }, [sendMessage]);

  const subscribeToMetrics = useCallback(() => {
    sendMessage('subscribe_metrics', {});
  }, [sendMessage]);

  // Unsubscribe from events
  const unsubscribeFromOrders = useCallback(() => {
    sendMessage('unsubscribe_orders', {});
  }, [sendMessage]);

  const unsubscribeFromProvider = useCallback((provider: string) => {
    sendMessage('unsubscribe_provider', { provider });
  }, [sendMessage]);

  const unsubscribeFromMetrics = useCallback(() => {
    sendMessage('unsubscribe_metrics', {});
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when auth token changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'auth_token') {
          disconnect();
          setTimeout(connect, 1000);
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [connect, disconnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected || !socketRef.current) return;

    const heartbeat = setInterval(() => {
      sendMessage('heartbeat', { timestamp: Date.now() });
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeat);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    connectionError,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribeToOrders,
    subscribeToProvider,
    subscribeToMetrics,
    unsubscribeFromOrders,
    unsubscribeFromProvider,
    unsubscribeFromMetrics,
  };
}