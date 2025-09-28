// ================================================
// Platform Sync Hook
// Restaurant Platform v2 - Sync Management
// ================================================

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '../../../utils/api';
import { DeliveryPlatform, SyncStatus } from '../../../types/platform-menu.types';

// ================================================
// INTERFACES
// ================================================

export interface PlatformMenu {
  id: string;
  name: { en: string; ar?: string };
  platform: DeliveryPlatform;
  itemCount: number;
  status: string;
  lastSyncedAt?: Date;
  syncStatus?: SyncStatus;
}

export interface MultiPlatformSyncRequest {
  menuId: string;
  platforms: DeliveryPlatform[];
  syncType: 'manual' | 'scheduled' | 'auto';
  options?: {
    parallelProcessing?: boolean;
    maxConcurrency?: number;
    stopOnFirstError?: boolean;
    notifyOnComplete?: boolean;
  };
}

export interface MultiPlatformSyncResponse {
  multiSyncId: string;
  individualSyncs: {
    platform: DeliveryPlatform;
    syncId: string;
    status: SyncStatus;
  }[];
  overallStatus: SyncStatus;
  estimatedDuration: number;
  startedAt: Date;
}

export interface SyncHistoryItem {
  id: string;
  menuId: string;
  platforms: DeliveryPlatform[];
  overallStatus: SyncStatus;
  totalItemsSynced: number;
  totalErrors: number;
  syncDurationMs: number;
  startedAt: Date;
  completedAt?: Date;
}

// ================================================
// PLATFORM SYNC HOOK
// ================================================

export const usePlatformSync = () => {
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const queryClient = useQueryClient();

  // Fetch platform menus
  const {
    data: menus = [],
    isLoading,
    error,
    refetch: refetchMenus
  } = useQuery({
    queryKey: ['platform-menus'],
    queryFn: async (): Promise<PlatformMenu[]> => {
      const response = await apiCall('/platform-menus/search', {
        method: 'POST',
        body: JSON.stringify({
          page: 1,
          limit: 100,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        })
      });
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000 // 30 seconds
  });

  // Start multi-platform sync mutation
  const startMultiPlatformSyncMutation = useMutation({
    mutationFn: async (request: MultiPlatformSyncRequest): Promise<MultiPlatformSyncResponse> => {
      const response = await apiCall(
        `/platform-menus/${request.menuId}/sync/multi-platform`,
        {
          method: 'POST',
          body: JSON.stringify({
            platforms: request.platforms,
            syncType: request.syncType,
            options: request.options
          })
        }
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate menus to refresh sync status
      queryClient.invalidateQueries({ queryKey: ['platform-menus'] });

      // Show success notification
      console.log(`Multi-platform sync started: ${data.multiSyncId}`);
    },
    onError: (error: any) => {
      console.error('Failed to start multi-platform sync:', error);
    }
  });

  // Cancel sync mutation
  const cancelSyncMutation = useMutation({
    mutationFn: async (multiSyncId: string): Promise<void> => {
      await apiCall(`/platform-menus/sync/multi-platform/${multiSyncId}/cancel`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-menus'] });
      console.log('Multi-platform sync cancelled');
    },
    onError: (error: any) => {
      console.error('Failed to cancel sync:', error);
    }
  });

  // Fetch sync history
  const getSyncHistory = useCallback(async () => {
    try {
      const response = await apiCall('/platform-menus/sync-history?page=1&limit=50&sortBy=startedAt&sortOrder=desc');
      setSyncHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sync history:', error);
      setSyncHistory([]);
    }
  }, []);

  // Load sync history on mount
  useEffect(() => {
    getSyncHistory();
  }, [getSyncHistory]);

  // API functions
  const startMultiPlatformSync = async (request: MultiPlatformSyncRequest): Promise<MultiPlatformSyncResponse> => {
    return startMultiPlatformSyncMutation.mutateAsync(request);
  };

  const cancelSync = async (multiSyncId: string): Promise<void> => {
    return cancelSyncMutation.mutateAsync(multiSyncId);
  };

  return {
    // Data
    menus,
    syncHistory,

    // Loading states
    isLoading,
    isStartingSync: startMultiPlatformSyncMutation.isPending,
    isCancellingSync: cancelSyncMutation.isPending,

    // Error states
    error,
    startSyncError: startMultiPlatformSyncMutation.error,
    cancelSyncError: cancelSyncMutation.error,

    // Actions
    startMultiPlatformSync,
    cancelSync,
    refetchMenus,
    getSyncHistory,

    // Utilities
    getMenuById: (id: string) => menus.find(menu => menu.id === id),
    getMenusByPlatform: (platform: DeliveryPlatform) =>
      menus.filter(menu => menu.platform === platform),
    getActiveSyncs: () =>
      menus.filter(menu => menu.syncStatus === SyncStatus.IN_PROGRESS)
  };
};