// Custom hook for managing product selection state

import { useState, useCallback } from 'react';

interface UseProductSelectionOptions {
  initialSelection?: string[];
}

export const useProductSelection = (options: UseProductSelectionOptions = {}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(options.initialSelection ?? []);

  const toggleProduct = useCallback((productId: string) => {
    setSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAll = useCallback((productIds: string[]) => {
    setSelectedIds(prev => [...new Set([...prev, ...productIds])]);
  }, []);

  const deselectAll = useCallback((productIds: string[]) => {
    setSelectedIds(prev => prev.filter(id => !productIds.includes(id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback((productId: string) => {
    return selectedIds.includes(productId);
  }, [selectedIds]);

  const selectOnly = useCallback((productIds: string[]) => {
    setSelectedIds(productIds);
  }, []);

  return {
    selectedIds,
    toggleProduct,
    selectAll,
    deselectAll,
    clearSelection,
    isSelected,
    selectOnly,
    count: selectedIds.length
  };
};
