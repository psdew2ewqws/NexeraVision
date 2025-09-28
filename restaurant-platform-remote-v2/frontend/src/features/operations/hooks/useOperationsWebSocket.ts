import { useEffect, useRef, useCallback } from 'react';
import { useOperations } from '../contexts/OperationsContext';
import { useAuth } from '../../../contexts/AuthContext';

interface WebSocketMessage {
  type: 'order_update' | 'provider_status' | 'alert' | 'metrics_update' | 'system_notification';
  data: any;
  timestamp: string;
  branchId?: string;
  companyId?: string;
}

interface UseOperationsWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export function useOperationsWebSocket(options: UseOperationsWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000
  } = options;

  const { user } = useAuth();
  const { addAlert, updateMetrics, setConnectionStatus } = useOperations();

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'ping' }));

      // Set timeout for pong response
      pingTimeoutRef.current = setTimeout(() => {
        console.warn('WebSocket ping timeout - connection may be lost');
        ws.current?.close();
      }, 10000);
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setInterval(sendHeartbeat, heartbeatInterval);
  }, [sendHeartbeat, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle pong response
      if (message.type === 'pong') {
        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
          pingTimeoutRef.current = null;
        }
        return;
      }

      // Filter messages by user's access level
      if (message.branchId && user?.role === 'branch_manager' && message.branchId !== user.branchId) {
        return; // Skip messages not for this branch
      }

      if (message.companyId && user?.role !== 'super_admin' && message.companyId !== user?.companyId) {
        return; // Skip messages not for this company
      }

      switch (message.type) {
        case 'order_update':
          handleOrderUpdate(message.data);
          break;
        case 'provider_status':
          handleProviderStatusUpdate(message.data);
          break;
        case 'alert':
          handleAlertMessage(message.data);
          break;
        case 'metrics_update':
          handleMetricsUpdate(message.data);
          break;
        case 'system_notification':
          handleSystemNotification(message.data);
          break;
        default:
          console.warn('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [user, addAlert, updateMetrics]);

  const handleOrderUpdate = useCallback((orderData: any) => {
    // Create alert for important order updates
    if (orderData.status === 'failed' || orderData.status === 'cancelled') {
      addAlert({
        type: 'warning',
        title: 'Order Update',
        message: `Order #${orderData.orderNumber} has been ${orderData.status}`,
        read: false,
        source: 'orders',
        orderId: orderData.id,
        branchId: orderData.branchId
      });
    } else if (orderData.status === 'delivered') {
      addAlert({
        type: 'success',
        title: 'Order Completed',
        message: `Order #${orderData.orderNumber} has been delivered successfully`,
        read: false,
        source: 'orders',
        orderId: orderData.id,
        branchId: orderData.branchId
      });
    }

    // Trigger refetch of order data in components
    window.dispatchEvent(new CustomEvent('orderUpdate', { detail: orderData }));
  }, [addAlert]);

  const handleProviderStatusUpdate = useCallback((providerData: any) => {
    if (providerData.status === 'disconnected' || providerData.status === 'error') {
      addAlert({
        type: 'error',
        title: 'Provider Connection Issue',
        message: `${providerData.providerName} is experiencing connectivity issues`,
        read: false,
        source: 'providers',
        providerId: providerData.providerId
      });
    } else if (providerData.status === 'connected' && providerData.previousStatus !== 'connected') {
      addAlert({
        type: 'success',
        title: 'Provider Reconnected',
        message: `${providerData.providerName} connection has been restored`,
        read: false,
        source: 'providers',
        providerId: providerData.providerId
      });
    }

    // Trigger refetch of provider data
    window.dispatchEvent(new CustomEvent('providerUpdate', { detail: providerData }));
  }, [addAlert]);

  const handleAlertMessage = useCallback((alertData: any) => {
    addAlert({
      type: alertData.type || 'info',
      title: alertData.title,
      message: alertData.message,
      read: false,
      source: alertData.source || 'system',
      branchId: alertData.branchId,
      orderId: alertData.orderId,
      providerId: alertData.providerId
    });
  }, [addAlert]);

  const handleMetricsUpdate = useCallback((metricsData: any) => {
    updateMetrics(metricsData);
  }, [updateMetrics]);

  const handleSystemNotification = useCallback((notificationData: any) => {
    // Handle system-wide notifications
    if (notificationData.severity === 'high') {
      addAlert({
        type: 'error',
        title: 'System Alert',
        message: notificationData.message,
        read: false,
        source: 'system'
      });
    } else {
      addAlert({
        type: 'info',
        title: 'System Notification',
        message: notificationData.message,
        read: false,
        source: 'system'
      });
    }
  }, [addAlert]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token available for WebSocket connection');
        return;
      }

      // Include authentication and user context in connection URL
      const url = new URL(`${WS_URL}/operations`);
      url.searchParams.set('token', token);
      if (user?.branchId) url.searchParams.set('branchId', user.branchId);
      if (user?.companyId) url.searchParams.set('companyId', user.companyId);
      if (user?.role) url.searchParams.set('role', user.role);

      ws.current = new WebSocket(url.toString());

      ws.current.onopen = () => {
        console.log('Operations WebSocket connected');
        setConnectionStatus(true);
        reconnectAttempts.current = 0;
        startHeartbeat();

        // Subscribe to relevant channels based on user role
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'subscribe',
            channels: getSubscriptionChannels()
          }));
        }
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        console.log('Operations WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus(false);
        stopHeartbeat();

        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * Math.pow(1.5, reconnectAttempts.current - 1)); // Exponential backoff
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          addAlert({
            type: 'error',
            title: 'Connection Lost',
            message: 'Unable to maintain real-time connection. Please refresh the page.',
            read: false,
            source: 'system'
          });
        }
      };

      ws.current.onerror = (error) => {
        console.error('Operations WebSocket error:', error);
        setConnectionStatus(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus(false);
    }
  }, [user, handleMessage, setConnectionStatus, startHeartbeat, stopHeartbeat, reconnectInterval, maxReconnectAttempts, addAlert]);

  const getSubscriptionChannels = useCallback(() => {
    const channels = ['system_notifications'];

    if (user?.role === 'super_admin') {
      channels.push('all_orders', 'all_providers', 'all_metrics');
    } else if (user?.role === 'company_owner') {
      channels.push(`company_${user.companyId}_orders`, `company_${user.companyId}_providers`, `company_${user.companyId}_metrics`);
    } else if (user?.role === 'branch_manager' && user.branchId) {
      channels.push(`branch_${user.branchId}_orders`, `branch_${user.branchId}_providers`, `branch_${user.branchId}_metrics`);
    } else if ((user?.role === 'call_center' || user?.role === 'cashier') && user.branchId) {
      channels.push(`branch_${user.branchId}_orders`);
    }

    return channels;
  }, [user]);

  const disconnect = useCallback(() => {
    cleanup();
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    setConnectionStatus(false);
  }, [cleanup, setConnectionStatus]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Auto-connect when user is authenticated and auto-connect is enabled
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      disconnect();
    };
  }, [cleanup, disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    reconnectAttempts: reconnectAttempts.current
  };
}