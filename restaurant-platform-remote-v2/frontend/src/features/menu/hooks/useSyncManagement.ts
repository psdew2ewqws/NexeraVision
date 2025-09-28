import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/lib/api';
import toast from 'react-hot-toast';

export interface SyncStatus {
  id: string;
  assignmentId: string;
  syncType: 'manual' | 'automatic';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  itemsProcessed: number;
  totalItems: number;
  errors?: any[];
  metadata?: any;
}

export interface SyncLog {
  id: string;
  assignmentId: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  metadata?: any;
}

// API client extension for sync management
const syncApi = {
  // Trigger manual sync for platform menu assignment
  triggerMenuSync: async (assignmentId: string): Promise<{
    success: boolean;
    message: string;
    syncId: string;
  }> => {
    const response = await api.channels.triggerMenuSync(assignmentId);
    return response.data;
  },

  // Get sync status for assignment
  getSyncStatus: async (assignmentId: string): Promise<{
    status: SyncStatus | null;
    isActive: boolean;
  }> => {
    const response = await api.channels.getSyncStatus(assignmentId);
    return response.data;
  },

  // Get sync logs for assignment
  getSyncLogs: async (assignmentId: string, options?: {
    limit?: number;
    offset?: number;
    level?: string;
  }): Promise<{
    logs: SyncLog[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.level) params.append('level', options.level);

    const response = await api.channels.getSyncLogs(assignmentId, `?${params.toString()}`);
    return response.data;
  },

  // Get sync history for assignment
  getSyncHistory: async (assignmentId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    history: SyncStatus[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.channels.getSyncHistory(assignmentId, `?${params.toString()}`);
    return response.data;
  },

  // Cancel active sync
  cancelSync: async (assignmentId: string): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await api.channels.cancelSync(assignmentId);
    return response.data;
  },

  // Get sync analytics/summary
  getSyncAnalytics: async (assignmentId: string, timeframe?: '24h' | '7d' | '30d'): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    avgSyncTime: number;
    lastSync?: string;
    syncFrequency: number;
    errorBreakdown: { [key: string]: number };
  }> => {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    const response = await api.channels.getSyncAnalytics(assignmentId, params);
    return response.data;
  },
};

// React Query hooks

export const useSyncStatus = (assignmentId: string | undefined, options?: {
  refetchInterval?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['syncStatus', assignmentId],
    queryFn: () => assignmentId ? syncApi.getSyncStatus(assignmentId) : null,
    enabled: !!assignmentId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval || 5000, // Poll every 5 seconds for active syncs
    staleTime: 1000, // Consider data stale after 1 second
  });
};

export const useSyncLogs = (assignmentId: string | undefined, options?: {
  limit?: number;
  offset?: number;
  level?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['syncLogs', assignmentId, options?.limit, options?.offset, options?.level],
    queryFn: () => assignmentId ? syncApi.getSyncLogs(assignmentId, options) : null,
    enabled: !!assignmentId && (options?.enabled !== false),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSyncHistory = (assignmentId: string | undefined, options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['syncHistory', assignmentId, options?.limit, options?.offset],
    queryFn: () => assignmentId ? syncApi.getSyncHistory(assignmentId, options) : null,
    enabled: !!assignmentId && (options?.enabled !== false),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useSyncAnalytics = (assignmentId: string | undefined, timeframe?: '24h' | '7d' | '30d') => {
  return useQuery({
    queryKey: ['syncAnalytics', assignmentId, timeframe],
    queryFn: () => assignmentId ? syncApi.getSyncAnalytics(assignmentId, timeframe) : null,
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTriggerMenuSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncApi.triggerMenuSync,
    onSuccess: (data, assignmentId) => {
      // Invalidate sync status and history for this assignment
      queryClient.invalidateQueries({ queryKey: ['syncStatus', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['syncLogs', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['platformMenuAssignments'] });

      toast.success(data.message || 'Sync started successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start sync');
    },
  });
};

export const useCancelSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncApi.cancelSync,
    onSuccess: (data, assignmentId) => {
      // Invalidate sync status for this assignment
      queryClient.invalidateQueries({ queryKey: ['syncStatus', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['syncLogs', assignmentId] });

      toast.success(data.message || 'Sync cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel sync');
    },
  });
};

// Helper hook to determine if sync is currently active
export const useIsSyncActive = (assignmentId: string | undefined) => {
  const { data: syncStatusData } = useSyncStatus(assignmentId, {
    refetchInterval: (data) => {
      // Only poll if sync is active
      return data?.status?.status === 'in_progress' || data?.status?.status === 'pending' ? 2000 : false;
    },
  });

  return {
    isActive: syncStatusData?.isActive || false,
    status: syncStatusData?.status?.status,
    progress: syncStatusData?.status ? {
      processed: syncStatusData.status.itemsProcessed,
      total: syncStatusData.status.totalItems,
      percentage: syncStatusData.status.totalItems > 0
        ? Math.round((syncStatusData.status.itemsProcessed / syncStatusData.status.totalItems) * 100)
        : 0,
    } : undefined,
  };
};

// Helper hook for sync management with real-time updates
export const useSyncManager = (assignmentId: string | undefined) => {
  const triggerSync = useTriggerMenuSync();
  const cancelSync = useCancelSync();
  const { isActive, status, progress } = useIsSyncActive(assignmentId);
  const { data: analytics } = useSyncAnalytics(assignmentId);

  const handleTriggerSync = async () => {
    if (!assignmentId) {
      toast.error('No assignment ID provided');
      return;
    }

    if (isActive) {
      toast.error('Sync is already in progress');
      return;
    }

    await triggerSync.mutateAsync(assignmentId);
  };

  const handleCancelSync = async () => {
    if (!assignmentId) {
      toast.error('No assignment ID provided');
      return;
    }

    if (!isActive) {
      toast.error('No active sync to cancel');
      return;
    }

    await cancelSync.mutateAsync(assignmentId);
  };

  return {
    // Status
    isActive,
    status,
    progress,
    analytics,

    // Actions
    triggerSync: handleTriggerSync,
    cancelSync: handleCancelSync,

    // Loading states
    isTriggering: triggerSync.isPending,
    isCancelling: cancelSync.isPending,
  };
};