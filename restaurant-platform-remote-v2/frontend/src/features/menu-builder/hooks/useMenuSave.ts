// Custom hook for saving menu with optimistic updates

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuBuilderService } from '../services/menuBuilderService';
import type { MenuData } from '../types/menuBuilder.types';
import toast from 'react-hot-toast';

export const useMenuSave = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (menuData: MenuData) => menuBuilderService.saveMenu(menuData),
    onMutate: async () => {
      // Show loading toast
      toast.loading('Saving menu...', { id: 'menu-save' });
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['menus'] });

      // Show success toast
      toast.success('Menu saved successfully!', { id: 'menu-save' });

      return data;
    },
    onError: (error) => {
      // Show error toast
      const message = error instanceof Error ? error.message : 'Failed to save menu';
      toast.error(message, { id: 'menu-save' });
    }
  });

  return {
    saveMenu: mutation.mutate,
    saveMenuAsync: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset
  };
};
