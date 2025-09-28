import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/socket-context';
import { Order, OrderStatus, WSMessage } from '@/types';
import toast from 'react-hot-toast';

export interface OrderUpdateEvent {
  type: 'order_update' | 'order_created' | 'order_cancelled' | 'status_change';
  order: Order;
  previous_status?: OrderStatus;
  timestamp: string;
}

export const useOrderUpdates = (options?: {
  onOrderUpdate?: (event: OrderUpdateEvent) => void;
  onNewOrder?: (order: Order) => void;
  showNotifications?: boolean;
}) => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const handleOrderUpdate = useCallback((message: WSMessage) => {
    if (message.type !== 'order_update') return;

    const event = message.data as OrderUpdateEvent;
    const { order, type, previous_status } = event;

    // Update React Query cache
    queryClient.setQueryData(['order', order.id], order);

    // Update orders list cache
    queryClient.setQueriesData(
      { queryKey: ['orders'] },
      (oldData: any) => {
        if (!oldData) return oldData;

        const updatedOrders = oldData.data.map((existingOrder: Order) =>
          existingOrder.id === order.id ? order : existingOrder
        );

        return {
          ...oldData,
          data: updatedOrders,
        };
      }
    );

    // Invalidate stats to refresh
    queryClient.invalidateQueries({ queryKey: ['order-stats'] });

    // Call custom handlers
    if (options?.onOrderUpdate) {
      options.onOrderUpdate(event);
    }

    if (type === 'order_created' && options?.onNewOrder) {
      options.onNewOrder(order);
    }

    // Show notifications if enabled
    if (options?.showNotifications !== false) {
      showNotification(event, previous_status);
    }
  }, [queryClient, options]);

  const showNotification = (event: OrderUpdateEvent, previousStatus?: OrderStatus) => {
    const { order, type } = event;

    switch (type) {
      case 'order_created':
        toast.success(`New order #${order.external_id} from ${order.provider}`, {
          duration: 5000,
          icon: '🆕',
        });
        break;

      case 'status_change':
        const statusEmojis: Record<OrderStatus, string> = {
          pending: '⏳',
          confirmed: '✅',
          preparing: '👨‍🍳',
          ready: '🍽️',
          picked_up: '🚗',
          delivered: '✅',
          cancelled: '❌',
          failed: '💥',
        };

        if (order.status === 'delivered') {
          toast.success(`Order #${order.external_id} delivered successfully`, {
            icon: '🎉',
            duration: 3000,
          });
        } else if (order.status === 'cancelled') {
          toast.error(`Order #${order.external_id} was cancelled`, {
            icon: '❌',
            duration: 4000,
          });
        } else {
          toast(`Order #${order.external_id} is now ${order.status}`, {
            icon: statusEmojis[order.status] || '📝',
            duration: 3000,
          });
        }
        break;

      case 'order_cancelled':
        toast.error(`Order #${order.external_id} was cancelled`, {
          icon: '❌',
          duration: 4000,
        });
        break;

      default:
        // Generic update
        toast(`Order #${order.external_id} updated`, {
          icon: '📝',
          duration: 2000,
        });
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to order events
    const events = [
      'order:created',
      'order:updated',
      'order:status_changed',
      'order:cancelled',
    ];

    events.forEach(event => {
      socket.on(event, handleOrderUpdate);
    });

    // Subscribe to general order updates
    socket.on('order_update', handleOrderUpdate);

    return () => {
      events.forEach(event => {
        socket.off(event, handleOrderUpdate);
      });
      socket.off('order_update', handleOrderUpdate);
    };
  }, [socket, isConnected, handleOrderUpdate]);

  const subscribeToOrder = useCallback((orderId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('subscribe_order', { orderId });
  }, [socket, isConnected]);

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('unsubscribe_order', { orderId });
  }, [socket, isConnected]);

  const subscribeToCompanyOrders = useCallback((companyId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('subscribe_company_orders', { companyId });
  }, [socket, isConnected]);

  return {
    isConnected,
    subscribeToOrder,
    unsubscribeFromOrder,
    subscribeToCompanyOrders,
  };
};

// Hook for real-time order statistics
export const useOrderStatsUpdates = () => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatsUpdate = (data: any) => {
      // Update stats cache
      queryClient.setQueryData(['order-stats'], data);
    };

    socket.on('order_stats_update', handleStatsUpdate);

    return () => {
      socket.off('order_stats_update', handleStatsUpdate);
    };
  }, [socket, isConnected, queryClient]);

  return { isConnected };
};

// Hook for tracking order delivery estimates
export const useDeliveryTracking = (orderId: string) => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected || !orderId) return;

    const handleDeliveryUpdate = (data: {
      orderId: string;
      estimatedTime: string;
      driverLocation?: { lat: number; lng: number };
      driverName?: string;
      driverPhone?: string;
    }) => {
      if (data.orderId !== orderId) return;

      // Update order with delivery tracking info
      queryClient.setQueryData(['order', orderId], (oldOrder: Order | undefined) => {
        if (!oldOrder) return oldOrder;

        return {
          ...oldOrder,
          delivery_info: {
            ...oldOrder.delivery_info,
            delivery_time: data.estimatedTime,
            driver_name: data.driverName,
            driver_phone: data.driverPhone,
          },
          metadata: {
            ...oldOrder.metadata,
            driver_location: data.driverLocation,
          },
        };
      });
    };

    socket.on('delivery_tracking_update', handleDeliveryUpdate);

    // Subscribe to tracking for this order
    socket.emit('subscribe_delivery_tracking', { orderId });

    return () => {
      socket.off('delivery_tracking_update', handleDeliveryUpdate);
      socket.emit('unsubscribe_delivery_tracking', { orderId });
    };
  }, [socket, isConnected, orderId, queryClient]);

  return { isConnected };
};