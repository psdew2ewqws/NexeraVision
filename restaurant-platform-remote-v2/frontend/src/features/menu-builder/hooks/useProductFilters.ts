// Custom hook for managing product filters state

import { useState, useCallback } from 'react';

interface ProductFilterState {
  categoryId: string | null;
  search: string;
}

export const useProductFilters = () => {
  const [filters, setFilters] = useState<ProductFilterState>({
    categoryId: null,
    search: ''
  });

  const setCategoryId = useCallback((categoryId: string | null) => {
    setFilters(prev => ({ ...prev, categoryId }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ categoryId: null, search: '' });
  }, []);

  const hasActiveFilters = filters.categoryId !== null || filters.search !== '';

  return {
    filters,
    categoryId: filters.categoryId,
    search: filters.search,
    setCategoryId,
    setSearch,
    clearFilters,
    hasActiveFilters
  };
};
