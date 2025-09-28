import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../services/platformApi';
import type {
  Platform,
  PlatformResponse,
  CreatePlatformDto,
  UpdatePlatformDto,
  BulkAssignmentDto,
  PlatformFiltersDto,
  AssignmentResult,
  PlatformAssignment
} from '../services/platformApi';
import toast from 'react-hot-toast';

// Platform Queries
export const usePlatforms = (filters?: PlatformFiltersDto) => {
  return useQuery({
    queryKey: ['platforms', filters],
    queryFn: () => platformApi.getPlatforms(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
  });
};

export const usePlatformsForUser = () => {
  return useQuery({
    queryKey: ['platforms', 'user'],
    queryFn: () => platformApi.getPlatformsForUser(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const usePlatformsForMenu = () => {
  return useQuery({
    queryKey: ['platforms', 'menu'],
    queryFn: () => platformApi.getPlatformsForMenu(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const usePlatformAssignments = (productIds: string[]) => {
  return useQuery({
    queryKey: ['platform-assignments', productIds],
    queryFn: () => platformApi.getProductAssignments(productIds),
    enabled: productIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for assignments
  });
};

export const useProductsByPlatform = (filters: any) => {
  return useQuery({
    queryKey: ['products', 'by-platform', filters],
    queryFn: () => platformApi.getProductsByPlatform(filters),
    enabled: !!filters,
    staleTime: 1 * 60 * 1000, // 1 minute for products
  });
};

// Platform Mutations
export const useCreatePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (platform: CreatePlatformDto) => platformApi.createPlatform(platform),
    onSuccess: (newPlatform) => {
      // Update platforms cache
      queryClient.setQueryData(['platforms'], (old: PlatformResponse) => {
        if (!old) return { platforms: [newPlatform], totalCount: 1, permissions: { canCreate: true, canEdit: true, canDelete: true } };
        return {
          ...old,
          platforms: [...old.platforms, newPlatform],
          totalCount: old.totalCount + 1
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      toast.success('Platform created successfully');
    },
    onError: (error: any) => {
      console.error('Create platform error:', error);
      toast.error(error.response?.data?.message || 'Failed to create platform');
    },
  });
};

export const useUpdatePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePlatformDto }) =>
      platformApi.updatePlatform(id, updates),
    onSuccess: (updatedPlatform) => {
      // Update platforms cache
      queryClient.setQueryData(['platforms'], (old: PlatformResponse) => {
        if (!old) return old;
        return {
          ...old,
          platforms: old.platforms.map(platform =>
            platform.id === updatedPlatform.id ? updatedPlatform : platform
          )
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      toast.success('Platform updated successfully');
    },
    onError: (error: any) => {
      console.error('Update platform error:', error);
      toast.error(error.response?.data?.message || 'Failed to update platform');
    },
  });
};

export const useDeletePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => platformApi.deletePlatform(id),
    onSuccess: (_, deletedId) => {
      // Update platforms cache
      queryClient.setQueryData(['platforms'], (old: PlatformResponse) => {
        if (!old) return old;
        return {
          ...old,
          platforms: old.platforms.filter(platform => platform.id !== deletedId),
          totalCount: old.totalCount - 1
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['platform-assignments'] });
      toast.success('Platform deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete platform error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete platform');
    },
  });
};

export const useBulkPlatformAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignment: BulkAssignmentDto) => platformApi.bulkPlatformAssignment(assignment),
    onSuccess: (result: AssignmentResult) => {
      // Invalidate product and assignment caches
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['platform-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });

      toast.success(result.message);
    },
    onError: (error: any) => {
      console.error('Bulk assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to update platform assignments');
    },
  });
};

export const useBulkAssignProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignment: BulkAssignmentDto) => platformApi.bulkAssignProducts(assignment),
    onSuccess: (result: AssignmentResult) => {
      // Invalidate product and assignment caches
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['platform-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });

      toast.success(result.message);
    },
    onError: (error: any) => {
      console.error('Bulk assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to assign products to platforms');
    },
  });
};

// Custom hooks for specific use cases
export const usePlatformOperations = () => {
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();
  const bulkAssignment = useBulkPlatformAssignment();

  return {
    createPlatform,
    updatePlatform,
    deletePlatform,
    bulkAssignment,
    isLoading: createPlatform.isPending || updatePlatform.isPending ||
               deletePlatform.isPending || bulkAssignment.isPending
  };
};

export const usePlatformAssignmentOperations = () => {
  const bulkAssignment = useBulkAssignProducts();

  const assignProducts = (productIds: string[], platformIds: string[]) =>
    bulkAssignment.mutate({ productIds, platformIds, action: 'assign' });

  const unassignProducts = (productIds: string[], platformIds: string[]) =>
    bulkAssignment.mutate({ productIds, platformIds, action: 'unassign' });

  return {
    assignProducts,
    unassignProducts,
    isLoading: bulkAssignment.isPending
  };
};

// Platform Product Management Operations
export const useAssignProductsToPlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platformId, productIds }: { platformId: string; productIds: string[] }) =>
      platformApi.assignProductsToPlatform(platformId, productIds),
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['platform-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success(result.message);
    },
    onError: (error: any) => {
      console.error('Assign products error:', error);
      toast.error(error.response?.data?.message || 'Failed to assign products to platform');
    },
  });
};

export const useRemoveProductsFromPlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platformId, productIds }: { platformId: string; productIds: string[] }) =>
      platformApi.removeProductsFromPlatform(platformId, productIds),
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['platform-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success(result.message);
    },
    onError: (error: any) => {
      console.error('Remove products error:', error);
      toast.error(error.response?.data?.message || 'Failed to remove products from platform');
    },
  });
};

export const usePlatformProductOperations = () => {
  const assignProducts = useAssignProductsToPlatform();
  const removeProducts = useRemoveProductsFromPlatform();

  const addProductsToPlatform = (platformId: string, productIds: string[]) =>
    assignProducts.mutate({ platformId, productIds });

  const removeProductsFromPlatform = (platformId: string, productIds: string[]) =>
    removeProducts.mutate({ platformId, productIds });

  return {
    addProductsToPlatform,
    removeProductsFromPlatform,
    isLoading: assignProducts.isPending || removeProducts.isPending
  };
};