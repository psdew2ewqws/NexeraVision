import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { api } from '../../../shared/lib/api';
import toast from 'react-hot-toast';

export interface DeliveryChannel {
  id: string;
  name: string;
  slug: string;
  channelType: string;
  providerName: string;
  apiBaseUrl?: string;
  webhookUrl?: string;
  authType?: string;
  isActive: boolean;
  isSystemDefault: boolean;
  configuration?: any;
  supportedFeatures?: any;
  rateLimits?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyChannelAssignment {
  id: string;
  companyId: string;
  channelId: string;
  isEnabled: boolean;
  priority: number;
  syncEnabled: boolean;
  lastSyncAt?: string;
  syncStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  channel: {
    id: string;
    name: string;
    slug: string;
    channelType: string;
    providerName: string;
    supportedFeatures?: any;
    isActive: boolean;
  };
}

export interface PlatformMenuAssignment {
  id: string;
  platformMenuId: string;
  companyChannelAssignmentId: string;
  isEnabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  lastSyncAt?: string;
  syncStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  companyChannelAssignment: CompanyChannelAssignment;
}

// API client extension for channel management - use the updated api object
const channelApi = {
  // Get all available delivery channels
  getDeliveryChannels: async (): Promise<{ channels: DeliveryChannel[]; totalCount: number }> => {
    const response = await api.channels.getDeliveryChannels();
    return response.data;
  },

  // Get company's channel assignments
  getCompanyChannelAssignments: async (): Promise<{ assignments: CompanyChannelAssignment[]; totalCount: number }> => {
    const response = await api.channels.getCompanyChannelAssignments();
    return response.data;
  },

  // Create company channel assignment
  createCompanyChannelAssignment: async (data: {
    channelId: string;
    isEnabled?: boolean;
    priority?: number;
    credentials?: any;
    channelSettings?: any;
    syncEnabled?: boolean;
    autoSyncInterval?: number;
  }): Promise<{ success: boolean; message: string; assignment: CompanyChannelAssignment }> => {
    const response = await api.channels.createCompanyChannelAssignment(data);
    return response.data;
  },

  // Update company channel assignment
  updateCompanyChannelAssignment: async (assignmentId: string, data: {
    isEnabled?: boolean;
    priority?: number;
    credentials?: any;
    channelSettings?: any;
    syncEnabled?: boolean;
    autoSyncInterval?: number;
  }): Promise<{ success: boolean; message: string; assignment: CompanyChannelAssignment }> => {
    const response = await api.channels.updateCompanyChannelAssignment(assignmentId, data);
    return response.data;
  },

  // Delete company channel assignment
  deleteCompanyChannelAssignment: async (assignmentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.channels.deleteCompanyChannelAssignment(assignmentId);
    return response.data;
  },

  // Get platform menu assignments
  getPlatformMenuAssignments: async (platformMenuId?: string): Promise<{ assignments: PlatformMenuAssignment[]; totalCount: number }> => {
    const params = platformMenuId ? `?platformMenuId=${platformMenuId}` : '';
    const response = await api.channels.getPlatformMenuAssignments(params);
    return response.data;
  },

  // Create platform menu assignment
  createPlatformMenuAssignment: async (data: {
    platformMenuId: string;
    companyChannelAssignmentId: string;
    isEnabled?: boolean;
    autoSync?: boolean;
    syncInterval?: number;
  }): Promise<{ success: boolean; message: string; assignment: PlatformMenuAssignment }> => {
    const response = await api.channels.createPlatformMenuAssignment(data);
    return response.data;
  },

  // Update platform menu assignment
  updatePlatformMenuAssignment: async (assignmentId: string, data: {
    isEnabled?: boolean;
    autoSync?: boolean;
    syncInterval?: number;
  }): Promise<{ success: boolean; message: string; assignment: PlatformMenuAssignment }> => {
    const response = await api.channels.updatePlatformMenuAssignment(assignmentId, data);
    return response.data;
  },

  // Delete platform menu assignment
  deletePlatformMenuAssignment: async (assignmentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.channels.deletePlatformMenuAssignment(assignmentId);
    return response.data;
  },
};

// React Query hooks

export const useDeliveryChannels = () => {
  return useQuery({
    queryKey: ['deliveryChannels'],
    queryFn: channelApi.getDeliveryChannels,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCompanyChannelAssignments = () => {
  return useQuery({
    queryKey: ['companyChannelAssignments'],
    queryFn: channelApi.getCompanyChannelAssignments,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const usePlatformMenuAssignments = (platformMenuId?: string) => {
  return useQuery({
    queryKey: ['platformMenuAssignments', platformMenuId],
    queryFn: () => channelApi.getPlatformMenuAssignments(platformMenuId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateCompanyChannelAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelApi.createCompanyChannelAssignment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companyChannelAssignments'] });
      toast.success(data.message || 'Channel assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign channel');
    },
  });
};

export const useUpdateCompanyChannelAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      channelApi.updateCompanyChannelAssignment(assignmentId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companyChannelAssignments'] });
      toast.success(data.message || 'Assignment updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    },
  });
};

export const useDeleteCompanyChannelAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelApi.deleteCompanyChannelAssignment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companyChannelAssignments'] });
      toast.success(data.message || 'Assignment removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove assignment');
    },
  });
};

export const useCreatePlatformMenuAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelApi.createPlatformMenuAssignment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platformMenuAssignments'] });
      toast.success(data.message || 'Platform menu assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign platform menu');
    },
  });
};

export const useUpdatePlatformMenuAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      channelApi.updatePlatformMenuAssignment(assignmentId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platformMenuAssignments'] });
      toast.success(data.message || 'Platform assignment updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update platform assignment');
    },
  });
};

export const useDeletePlatformMenuAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelApi.deletePlatformMenuAssignment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platformMenuAssignments'] });
      toast.success(data.message || 'Platform assignment removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove platform assignment');
    },
  });
};