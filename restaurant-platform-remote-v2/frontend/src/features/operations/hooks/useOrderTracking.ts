import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useOperations } from '../contexts/OperationsContext';

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  customer: {
    name: string;
    phone: string;
    address: {
      street: string;
      area: string;
      city: string;
    };
  };
  restaurant: {
    branchName: string;
    companyName: string;
    branchId: string;
  };
  provider: {
    name: string;
    type: string;
    estimatedTime: number;
  };
  pricing: {
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface OrderFilters {
  status?: string;
  provider?: string;
  timeRange?: 'today' | '7days' | '30days';
  branchId?: string;
  companyId?: string;
}

interface OrderStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  avgDeliveryTime: number;
  totalRevenue: number;
}

interface UseOrderTrackingOptions {
  filters?: OrderFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useOrderTracking(options: UseOrderTrackingOptions = {}) {
  const {
    filters = {},
    autoRefresh = true,
    refreshInterval = 10000,
    enableRealTime = true
  } = options;

  const { user } = useAuth();
  const { addAlert } = useOperations();
  const queryClient = useQueryClient();

  const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);
  const [sortBy, setSortBy] = useState<'time' | 'status' | 'priority'>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  // Build query key for caching
  const queryKey = ['orders', localFilters, user?.branchId, user?.companyId];

  // Fetch orders
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Order[]>({
    queryKey,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      // Apply user-based filters
      if (user?.role === 'branch_manager' && user.branchId) {
        params.append('branchId', user.branchId);
      } else if (user?.role !== 'super_admin' && user?.companyId) {
        params.append('companyId', user.companyId);
      }

      // Apply additional filters
      if (localFilters.status) params.append('status', localFilters.status);
      if (localFilters.provider) params.append('provider', localFilters.provider);
      if (localFilters.timeRange) params.append('timeRange', localFilters.timeRange);
      if (localFilters.branchId) params.append('branchId', localFilters.branchId);
      if (localFilters.companyId) params.append('companyId', localFilters.companyId);

      const response = await axios.get(
        `${API_BASE_URL}/delivery/orders?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.map((order: any) => ({
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt)
      }));
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch order statistics
  const { data: stats } = useQuery<OrderStats>({
    queryKey: ['order-stats', localFilters, user?.branchId, user?.companyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (user?.role === 'branch_manager' && user.branchId) {
        params.append('branchId', user.branchId);
      } else if (user?.role !== 'super_admin' && user?.companyId) {
        params.append('companyId', user.companyId);
      }

      if (localFilters.timeRange) params.append('timeRange', localFilters.timeRange);
      if (localFilters.branchId) params.append('branchId', localFilters.branchId);
      if (localFilters.companyId) params.append('companyId', localFilters.companyId);

      const response = await axios.get(
        `${API_BASE_URL}/delivery/orders/stats?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 3 : false
  });

  // Real-time order updates
  useEffect(() => {
    if (!enableRealTime) return;

    const handleOrderUpdate = (event: CustomEvent) => {
      const orderData = event.detail;

      // Update the orders cache
      queryClient.setQueryData<Order[]>(queryKey, (oldOrders = []) => {
        const existingIndex = oldOrders.findIndex(order => order.id === orderData.id);

        if (existingIndex >= 0) {
          // Update existing order
          const updatedOrders = [...oldOrders];
          updatedOrders[existingIndex] = {
            ...updatedOrders[existingIndex],
            ...orderData,
            updatedAt: new Date(orderData.updatedAt)
          };
          return updatedOrders;
        } else {
          // Add new order
          return [
            {
              ...orderData,
              createdAt: new Date(orderData.createdAt),
              updatedAt: new Date(orderData.updatedAt)
            },
            ...oldOrders
          ];
        }
      });

      // Invalidate stats to trigger refetch
      queryClient.invalidateQueries(['order-stats']);
    };

    window.addEventListener('orderUpdate', handleOrderUpdate as EventListener);

    return () => {
      window.removeEventListener('orderUpdate', handleOrderUpdate as EventListener);
    };
  }, [queryClient, queryKey, enableRealTime]);

  // Order processing functions
  const getOrderUrgency = useCallback((order: Order): number => {
    const timeElapsed = Date.now() - order.createdAt.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    const thirtyMinutes = 30 * 60 * 1000;

    if (order.status === 'failed' || order.status === 'cancelled') return 0;
    if (timeElapsed > thirtyMinutes && (order.status === 'pending' || order.status === 'preparing')) return 3;
    if (timeElapsed > fifteenMinutes && order.status === 'pending') return 2;
    if (order.status === 'ready' || order.status === 'picked_up') return 2;
    return 1;
  }, []);

  const getOrderProgress = useCallback((order: Order): number => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    return Math.round(((currentIndex + 1) / statusOrder.length) * 100);
  }, []);

  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }, []);

  // Filter and sort orders
  const processedOrders = orders
    .filter(order => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer.name.toLowerCase().includes(query) ||
          order.customer.phone.includes(query) ||
          order.provider.name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'priority':
          const aUrgency = getOrderUrgency(a);
          const bUrgency = getOrderUrgency(b);
          if (aUrgency !== bUrgency) return bUrgency - aUrgency;
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

  // Monitor for urgent orders
  useEffect(() => {
    const urgentOrders = orders.filter(order => getOrderUrgency(order) >= 3);

    urgentOrders.forEach(order => {
      addAlert({
        type: 'warning',
        title: 'Order Delay Alert',
        message: `Order #${order.orderNumber} has been ${order.status} for over 30 minutes`,
        read: false,
        source: 'orders',
        branchId: order.restaurant.branchId,
        orderId: order.id
      });
    });
  }, [orders, getOrderUrgency, addAlert]);

  // Action handlers
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: Order['status']) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/delivery/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Optimistically update the cache
      queryClient.setQueryData<Order[]>(queryKey, (oldOrders = []) =>
        oldOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, updatedAt: new Date() }
            : order
        )
      );

      addAlert({
        type: 'success',
        title: 'Order Updated',
        message: `Order status changed to ${newStatus}`,
        read: false,
        source: 'orders',
        orderId
      });

      return true;
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update order status',
        read: false,
        source: 'orders',
        orderId
      });
      return false;
    }
  }, [queryClient, queryKey, addAlert]);

  const refreshOrders = useCallback(async () => {
    try {
      await refetch();
      addAlert({
        type: 'info',
        title: 'Orders Refreshed',
        message: 'Order data has been updated',
        read: false,
        source: 'orders'
      });
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh order data',
        read: false,
        source: 'orders'
      });
    }
  }, [refetch, addAlert]);

  const updateFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setLocalFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    // Data
    orders: processedOrders,
    stats,
    isLoading,
    isError,
    error,

    // Filters and sorting
    filters: localFilters,
    sortBy,
    searchQuery,
    updateFilters,
    setSortBy,
    setSearchQuery,

    // Actions
    refreshOrders,
    updateOrderStatus,

    // Utilities
    getOrderUrgency,
    getOrderProgress,
    formatTimeAgo,

    // Real-time status
    isRealTimeEnabled: enableRealTime
  };
}