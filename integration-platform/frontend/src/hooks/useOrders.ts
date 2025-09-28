import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Order, PaginatedResponse, FilterOptions, OrderStatus } from '@/types';
import toast from 'react-hot-toast';

export interface OrdersQueryParams {
  page?: number;
  per_page?: number;
  status?: OrderStatus[];
  provider?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'updated_at' | 'total';
  sort_order?: 'asc' | 'desc';
}

export const useOrders = (params: OrdersQueryParams = {}) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });

      const response = await apiClient.get<PaginatedResponse<Order>>(
        `/orders?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await apiClient.get<Order>(`/orders/${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
    staleTime: 30000,
  });
};

export const useOrderStats = (filters?: FilterOptions) => {
  return useQuery({
    queryKey: ['order-stats', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v));
            } else {
              searchParams.append(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get(
        `/orders/stats?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 60000, // 1 minute
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, note }: {
      orderId: string;
      status: OrderStatus;
      note?: string;
    }) => {
      const response = await apiClient.patch(`/orders/${orderId}/status`, {
        status,
        note,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });

      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const response = await apiClient.post(`/orders/${orderId}/cancel`, {
        reason,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });

      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
};

export const useResyncOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/orders/${orderId}/resync`);
      return response.data;
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });

      toast.success('Order resynced with provider successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resync order');
    },
  });
};

export const useExportOrders = () => {
  return useMutation({
    mutationFn: async (params: OrdersQueryParams & { format: 'csv' | 'xlsx' }) => {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'format') {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });

      const response = await apiClient.get(
        `/orders/export?format=${params.format}&${searchParams.toString()}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${new Date().toISOString().split('T')[0]}.${params.format}`;
      link.click();
      window.URL.revokeObjectURL(url);

      return response.data;
    },
    onSuccess: () => {
      toast.success('Orders exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export orders');
    },
  });
};