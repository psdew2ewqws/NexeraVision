// React Query hooks for Menu Product Selection API operations
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MenuProduct } from '../../../types/menu';
import toast from 'react-hot-toast';

interface UseMenuProductSelectionReturn {
  allProducts: MenuProduct[];
  assignedProducts: MenuProduct[];
  loading: boolean;
  error: string | null;
  addProductToMenu: (product: MenuProduct) => Promise<void>;
  removeProductFromMenu: (productId: string) => Promise<void>;
  reorderMenuProducts: (productIds: string[]) => Promise<void>;
  bulkAddProducts: (productIds: string[]) => Promise<void>;
  bulkRemoveProducts: (productIds: string[]) => Promise<void>;
  loadAllProducts: () => Promise<void>;
  loadAssignedProducts: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useMenuProductSelection = (
  platformId: string,
  branchId?: string
): UseMenuProductSelectionReturn => {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<string | null>(null);

  // API helper function
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const authToken = localStorage.getItem('auth-token');
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  };

  // Query keys
  const allProductsKey = ['menu', 'products', 'all'];
  const assignedProductsKey = ['menu', 'products', 'assigned', platformId, branchId];

  // Query for all company products (not assigned to this platform)
  const {
    data: allProductsData,
    isLoading: allProductsLoading,
    error: allProductsError,
    refetch: refetchAllProducts
  } = useQuery({
    queryKey: allProductsKey,
    queryFn: async () => {
      const response = await apiCall('/api/menu/products/paginated', {
        method: 'POST',
        body: JSON.stringify({
          page: 1,
          limit: 1000, // Load all products for selection
          status: 1, // Only active products
          excludePlatform: platformId // Exclude products already assigned to this platform
        })
      });
      return response.products || response.data || [];
    },
    enabled: !!platformId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for products assigned to this platform menu
  const {
    data: assignedProductsData,
    isLoading: assignedProductsLoading,
    error: assignedProductsError,
    refetch: refetchAssignedProducts
  } = useQuery({
    queryKey: assignedProductsKey,
    queryFn: async () => {
      const response = await apiCall(`/api/menu/platforms/${platformId}/products`, {
        method: 'GET'
      });
      return response.products || response.data || [];
    },
    enabled: !!platformId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations for adding products to menu
  const addProductMutation = useMutation({
    mutationFn: async (product: MenuProduct) => {
      return apiCall(`/api/menu/platforms/${platformId}/products`, {
        method: 'POST',
        body: JSON.stringify({
          productIds: [product.id],
          branchId
        })
      });
    },
    onSuccess: (_, product) => {
      // Optimistically update the cache
      queryClient.setQueryData(assignedProductsKey, (old: MenuProduct[] = []) => [
        ...old,
        product
      ]);

      // Remove from all products cache
      queryClient.setQueryData(allProductsKey, (old: MenuProduct[] = []) =>
        old.filter(p => p.id !== product.id)
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: assignedProductsKey });
      queryClient.invalidateQueries({ queryKey: allProductsKey });

      toast.success(`"${product.name.en || product.name.ar || 'Product'}" added to menu`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add product to menu: ${error.message}`);
      setLocalError(error.message);
    }
  });

  // Mutation for removing products from menu
  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiCall(`/api/menu/platforms/${platformId}/products`, {
        method: 'DELETE',
        body: JSON.stringify({
          productIds: [productId],
          branchId
        })
      });
    },
    onSuccess: (_, productId) => {
      // Find the product that was removed
      const assignedProducts = queryClient.getQueryData<MenuProduct[]>(assignedProductsKey) || [];
      const removedProduct = assignedProducts.find(p => p.id === productId);

      // Optimistically update the cache
      queryClient.setQueryData(assignedProductsKey, (old: MenuProduct[] = []) =>
        old.filter(p => p.id !== productId)
      );

      // Add back to all products cache if we have the product data
      if (removedProduct) {
        queryClient.setQueryData(allProductsKey, (old: MenuProduct[] = []) => [
          ...old,
          removedProduct
        ]);
      }

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: assignedProductsKey });
      queryClient.invalidateQueries({ queryKey: allProductsKey });

      toast.success(`Product removed from menu`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove product from menu: ${error.message}`);
      setLocalError(error.message);
    }
  });

  // Mutation for reordering products in menu
  const reorderProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      return apiCall(`/api/menu/platforms/${platformId}/products/reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          productIds,
          branchId
        })
      });
    },
    onSuccess: (_, productIds) => {
      // Optimistically update the order in cache
      queryClient.setQueryData(assignedProductsKey, (old: MenuProduct[] = []) => {
        const orderedProducts = productIds.map(id =>
          old.find(product => product.id === id)
        ).filter(Boolean) as MenuProduct[];

        // Add any products that weren't in the reorder list
        const remainingProducts = old.filter(product =>
          !productIds.includes(product.id)
        );

        return [...orderedProducts, ...remainingProducts];
      });

      toast.success('Menu order updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder menu: ${error.message}`);
      setLocalError(error.message);

      // Invalidate to restore correct order
      queryClient.invalidateQueries({ queryKey: assignedProductsKey });
    }
  });

  // Callback functions
  const addProductToMenu = useCallback(async (product: MenuProduct) => {
    setLocalError(null);
    await addProductMutation.mutateAsync(product);
  }, [addProductMutation]);

  const removeProductFromMenu = useCallback(async (productId: string) => {
    setLocalError(null);
    await removeProductMutation.mutateAsync(productId);
  }, [removeProductMutation]);

  const reorderMenuProducts = useCallback(async (productIds: string[]) => {
    setLocalError(null);
    await reorderProductsMutation.mutateAsync(productIds);
  }, [reorderProductsMutation]);

  // Bulk add products to menu
  const bulkAddProducts = useCallback(async (productIds: string[]) => {
    setLocalError(null);
    try {
      const response = await apiCall(`/api/menu/platforms/${platformId}/products`, {
        method: 'POST',
        body: JSON.stringify({
          productIds,
          branchId
        })
      });

      // Optimistically update cache
      const productsToAdd = allProductsData?.filter(p => productIds.includes(p.id)) || [];

      queryClient.setQueryData(assignedProductsKey, (old: MenuProduct[] = []) => [
        ...old,
        ...productsToAdd
      ]);

      queryClient.setQueryData(allProductsKey, (old: MenuProduct[] = []) =>
        old.filter(p => !productIds.includes(p.id))
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: assignedProductsKey });
      queryClient.invalidateQueries({ queryKey: allProductsKey });

      return response;
    } catch (error) {
      setLocalError((error as Error).message);
      throw error;
    }
  }, [platformId, branchId, apiCall, queryClient, assignedProductsKey, allProductsKey, allProductsData]);

  // Bulk remove products from menu
  const bulkRemoveProducts = useCallback(async (productIds: string[]) => {
    setLocalError(null);
    try {
      const response = await apiCall(`/api/menu/platforms/${platformId}/products`, {
        method: 'DELETE',
        body: JSON.stringify({
          productIds,
          branchId
        })
      });

      // Optimistically update cache
      const productsToRemove = assignedProductsData?.filter(p => productIds.includes(p.id)) || [];

      queryClient.setQueryData(assignedProductsKey, (old: MenuProduct[] = []) =>
        old.filter(p => !productIds.includes(p.id))
      );

      queryClient.setQueryData(allProductsKey, (old: MenuProduct[] = []) => [
        ...old,
        ...productsToRemove
      ]);

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: assignedProductsKey });
      queryClient.invalidateQueries({ queryKey: allProductsKey });

      return response;
    } catch (error) {
      setLocalError((error as Error).message);
      throw error;
    }
  }, [platformId, branchId, apiCall, queryClient, assignedProductsKey, allProductsKey, assignedProductsData]);

  const loadAllProducts = useCallback(async () => {
    setLocalError(null);
    await refetchAllProducts();
  }, [refetchAllProducts]);

  const loadAssignedProducts = useCallback(async () => {
    setLocalError(null);
    await refetchAssignedProducts();
  }, [refetchAssignedProducts]);

  const refreshData = useCallback(async () => {
    setLocalError(null);
    await Promise.all([
      refetchAllProducts(),
      refetchAssignedProducts()
    ]);
  }, [refetchAllProducts, refetchAssignedProducts]);

  // Calculate loading state
  const loading = allProductsLoading ||
                 assignedProductsLoading ||
                 addProductMutation.isLoading ||
                 removeProductMutation.isLoading ||
                 reorderProductsMutation.isLoading;

  // Calculate error state
  const error = localError ||
                (allProductsError as Error)?.message ||
                (assignedProductsError as Error)?.message;

  return {
    allProducts: allProductsData || [],
    assignedProducts: assignedProductsData || [],
    loading,
    error,
    addProductToMenu,
    removeProductFromMenu,
    reorderMenuProducts,
    bulkAddProducts,
    bulkRemoveProducts,
    loadAllProducts,
    loadAssignedProducts,
    refreshData,
  };
};

// Hook for platform-specific product operations
export const usePlatformProducts = (platformId: string) => {
  const queryClient = useQueryClient();

  // Query for getting platform details
  const {
    data: platformData,
    isLoading: platformLoading,
    error: platformError
  } = useQuery({
    queryKey: ['menu', 'platform', platformId],
    queryFn: async () => {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) throw new Error('No authentication token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platformId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to load platform: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!platformId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for bulk operations
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ action, productIds }: { action: 'add' | 'remove', productIds: string[] }) => {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) throw new Error('No authentication token');

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/menu/platforms/${platformId}/products`;
      const method = action === 'add' ? 'POST' : 'DELETE';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${action} products`);
      }

      return response.json();
    },
    onSuccess: (_, { action, productIds }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['menu', 'products', 'assigned', platformId] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'products', 'all'] });

      toast.success(`${productIds.length} products ${action === 'add' ? 'added to' : 'removed from'} menu`);
    },
    onError: (error: Error, { action }) => {
      toast.error(`Failed to ${action} products: ${error.message}`);
    }
  });

  const bulkAddProducts = useCallback(async (productIds: string[]) => {
    await bulkOperationMutation.mutateAsync({ action: 'add', productIds });
  }, [bulkOperationMutation]);

  const bulkRemoveProducts = useCallback(async (productIds: string[]) => {
    await bulkOperationMutation.mutateAsync({ action: 'remove', productIds });
  }, [bulkOperationMutation]);

  return {
    platform: platformData,
    platformLoading,
    platformError: (platformError as Error)?.message,
    bulkAddProducts,
    bulkRemoveProducts,
    bulkLoading: bulkOperationMutation.isLoading,
  };
};