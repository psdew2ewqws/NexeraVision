import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WSMessage, ProviderStatusUpdate } from '@/types';
import toast from 'react-hot-toast';

interface WebSocketContextValue {
  isConnected: boolean;
  connectionError: string | null;
  lastMessage: WSMessage | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data: any) => void;
  subscribeToOrders: (filters?: any) => void;
  subscribeToProvider: (provider: string) => void;
  subscribeToMetrics: () => void;
  unsubscribeFromOrders: () => void;
  unsubscribeFromProvider: (provider: string) => void;
  unsubscribeFromMetrics: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const queryClient = useQueryClient();

  const handleMessage = (message: WSMessage) => {
    console.log('WebSocket message received:', message);

    // Invalidate relevant queries based on message type
    switch (message.type) {
      case 'order_update':
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        break;

      case 'provider_status':
        queryClient.invalidateQueries({ queryKey: ['integrations'] });
        queryClient.invalidateQueries({ queryKey: ['provider-integrations'] });
        queryClient.invalidateQueries({ queryKey: ['provider-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['system-health'] });
        break;

      case 'metrics_update':
        queryClient.invalidateQueries({ queryKey: ['provider-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['provider-analytics'] });
        break;

      case 'system_alert':
        queryClient.invalidateQueries({ queryKey: ['system-health'] });
        break;
    }
  };

  const handleOrderUpdate = (order: any) => {
    console.log('Order update received:', order);

    // Update specific order in cache if it exists
    queryClient.setQueryData(['order-details', order.id], order);

    // Show specific notifications based on order status
    switch (order.status) {
      case 'confirmed':
        toast.success(`Order #${order.external_id} confirmed`, {
          duration: 3000,
          icon: '✅',
        });
        break;
      case 'preparing':
        toast(`Order #${order.external_id} is being prepared`, {
          duration: 3000,
          icon: '👨‍🍳',
        });
        break;
      case 'ready':
        toast(`Order #${order.external_id} is ready for pickup`, {
          duration: 5000,
          icon: '🍽️',
        });
        break;
      case 'picked_up':
        toast(`Order #${order.external_id} picked up by driver`, {
          duration: 3000,
          icon: '🚗',
        });
        break;
      case 'delivered':
        toast.success(`Order #${order.external_id} delivered successfully`, {
          duration: 4000,
          icon: '🎉',
        });
        break;
      case 'cancelled':
        toast.error(`Order #${order.external_id} was cancelled`, {
          duration: 4000,
          icon: '❌',
        });
        break;
      case 'failed':
        toast.error(`Order #${order.external_id} failed - requires attention`, {
          duration: 6000,
          icon: '⚠️',
        });
        break;
    }
  };

  const handleProviderStatusUpdate = (update: ProviderStatusUpdate) => {
    console.log('Provider status update:', update);

    // Update provider status in cache
    queryClient.setQueryData(['integrations'], (oldData: any[]) => {
      if (!oldData) return oldData;
      return oldData.map(integration =>
        integration.provider === update.provider
          ? { ...integration, status: update.status, health: update.health }
          : integration
      );
    });

    // Show status change notifications
    const providerName = update.provider.replace('_', ' ').toUpperCase();

    switch (update.status) {
      case 'active':
        if (update.health.status === 'healthy') {
          toast.success(`${providerName} is now online and healthy`, {
            duration: 4000,
            icon: '🟢',
          });
        }
        break;
      case 'error':
        toast.error(`${providerName} integration error detected`, {
          duration: 6000,
          icon: '🔴',
          action: {
            label: 'View Details',
            onClick: () => {
              // Navigate to provider details
              window.location.href = `/providers/${update.provider}`;
            },
          },
        });
        break;
      case 'inactive':
        toast(`${providerName} is currently inactive`, {
          duration: 4000,
          icon: '🟡',
        });
        break;
    }
  };

  const handleSystemAlert = (alert: any) => {
    console.log('System alert:', alert);

    const alertConfig = {
      duration: alert.level === 'error' ? 8000 : 5000,
      icon: alert.level === 'error' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️',
    };

    if (alert.level === 'error') {
      toast.error(alert.message, alertConfig);
    } else if (alert.level === 'warning') {
      toast(alert.message, alertConfig);
    } else {
      toast(alert.message, alertConfig);
    }

    // Handle specific system alerts
    if (alert.type === 'high_error_rate') {
      // Show specific action for high error rates
      toast.error('High error rate detected across providers', {
        duration: 10000,
        action: {
          label: 'View Analytics',
          onClick: () => {
            window.location.href = '/analytics';
          },
        },
      });
    } else if (alert.type === 'webhook_failures') {
      toast.error('Multiple webhook failures detected', {
        duration: 10000,
        action: {
          label: 'Check Settings',
          onClick: () => {
            window.location.href = '/settings/integrations';
          },
        },
      });
    }
  };

  const handleMetricsUpdate = (metrics: any) => {
    console.log('Metrics update received:', metrics);

    // Update metrics in cache
    queryClient.setQueryData(['provider-metrics'], metrics.providers);
    queryClient.setQueryData(['system-health'], metrics.system);

    // Show performance alerts if needed
    if (metrics.alerts?.length > 0) {
      metrics.alerts.forEach((alert: any) => {
        if (alert.type === 'performance_degradation') {
          toast(`Performance alert: ${alert.message}`, {
            duration: 6000,
            icon: '📊',
          });
        }
      });
    }
  };

  const webSocket = useWebSocket({
    autoConnect: true,
    onMessage: handleMessage,
    onOrderUpdate: handleOrderUpdate,
    onProviderStatusUpdate: handleProviderStatusUpdate,
    onSystemAlert: handleSystemAlert,
    onMetricsUpdate: handleMetricsUpdate,
  });

  // Subscribe to relevant events on connection
  useEffect(() => {
    if (webSocket.isConnected) {
      // Subscribe to all orders for real-time updates
      webSocket.subscribeToOrders();

      // Subscribe to metrics for dashboard updates
      webSocket.subscribeToMetrics();

      // Subscribe to all provider status updates
      const providers = [
        'careem', 'talabat', 'deliveroo', 'uber_eats', 'jahez',
        'hungerstation', 'noon_food', 'mrsool', 'zomato'
      ];

      providers.forEach(provider => {
        webSocket.subscribeToProvider(provider);
      });
    }
  }, [webSocket.isConnected]);

  const contextValue: WebSocketContextValue = {
    isConnected: webSocket.isConnected,
    connectionError: webSocket.connectionError,
    lastMessage: webSocket.lastMessage,
    connect: webSocket.connect,
    disconnect: webSocket.disconnect,
    sendMessage: webSocket.sendMessage,
    subscribeToOrders: webSocket.subscribeToOrders,
    subscribeToProvider: webSocket.subscribeToProvider,
    subscribeToMetrics: webSocket.subscribeToMetrics,
    unsubscribeFromOrders: webSocket.unsubscribeFromOrders,
    unsubscribeFromProvider: webSocket.unsubscribeFromProvider,
    unsubscribeFromMetrics: webSocket.unsubscribeFromMetrics,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}