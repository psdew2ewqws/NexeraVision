// Custom hook for fetching menu categories

import { useQuery } from '@tanstack/react-query';
import { menuBuilderService } from '../services/menuBuilderService';
import type { MenuCategory } from '../types/menuBuilder.types';

export const useMenuCategories = () => {
  const query = useQuery<MenuCategory[], Error>(
    ['menu-categories'],
    () => menuBuilderService.getCategories(),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes (gcTime renamed to cacheTime in v4)
      retry: 2
    }
  );

  return {
    categories: (query.data ?? []) as MenuCategory[],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};
