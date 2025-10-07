// Custom hook for fetching menu products with TanStack Query

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { menuBuilderService } from '../services/menuBuilderService';
import type { ProductFilters, MenuProduct, PaginatedProductsResponse } from '../types/menuBuilder.types';

interface UseMenuProductsOptions {
  categoryId?: string | null;
  search?: string;
  filters?: Omit<ProductFilters, 'categoryId' | 'search'>;
  enabled?: boolean;
}

export const useMenuProducts = (options: UseMenuProductsOptions = {}) => {
  const { categoryId, search, filters = {}, enabled = true } = options;
  const queryClient = useQueryClient();

  const queryKey = ['menu-products', { categoryId, search, ...filters }];

  const query = useQuery<PaginatedProductsResponse, Error>(
    queryKey,
    async () => {
      return menuBuilderService.getProducts({
        categoryId,
        search,
        ...filters
      });
    },
    {
      enabled,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  );

  const refetch = () => {
    return queryClient.invalidateQueries({ queryKey: ['menu-products'] });
  };

  return {
    products: query.data?.products ?? [],
    total: query.data?.total ?? 0,
    hasMore: query.data?.hasMore ?? false,
    loading: query.isLoading,
    error: query.error,
    refetch,
    isRefetching: query.isRefetching
  };
};
