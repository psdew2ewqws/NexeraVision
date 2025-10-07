// Utility functions for menu builder feature

import type { MenuProduct, MenuCategory } from '../types/menuBuilder.types';

/**
 * Groups products by category
 */
export const groupProductsByCategory = (
  products: MenuProduct[],
  categories: MenuCategory[]
): Record<string, MenuProduct[]> => {
  const grouped: Record<string, MenuProduct[]> = {};

  categories.forEach(category => {
    grouped[category.id] = products.filter(p => p.categoryId === category.id);
  });

  return grouped;
};

/**
 * Calculates total price of selected products
 */
export const calculateTotalPrice = (
  products: MenuProduct[],
  selectedIds: string[]
): number => {
  return products
    .filter(p => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + (p.price || 0), 0);
};

/**
 * Filters products by search term
 */
export const filterProductsBySearch = (
  products: MenuProduct[],
  searchTerm: string,
  language: 'en' | 'ar'
): MenuProduct[] => {
  if (!searchTerm.trim()) return products;

  const term = searchTerm.toLowerCase();

  return products.filter(product => {
    const name = typeof product.name === 'string'
      ? product.name
      : product.name[language as keyof typeof product.name] || product.name.en;

    return name.toLowerCase().includes(term);
  });
};

/**
 * Sorts products by display order or name
 */
export const sortProducts = (
  products: MenuProduct[],
  sortBy: 'name' | 'price' = 'name',
  language: 'en' | 'ar' = 'en'
): MenuProduct[] => {
  return [...products].sort((a, b) => {
    if (sortBy === 'price') {
      return (a.price || 0) - (b.price || 0);
    }

    const nameA = typeof a.name === 'string' ? a.name : a.name[language as keyof typeof a.name] || a.name.en;
    const nameB = typeof b.name === 'string' ? b.name : b.name[language as keyof typeof b.name] || b.name.en;

    return nameA.localeCompare(nameB);
  });
};

/**
 * Validates menu data before saving
 */
export const validateMenuData = (data: {
  name: string;
  branchIds: string[];
  channelIds: string[];
  productIds: string[];
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name.trim()) {
    errors.push('Menu name is required');
  }

  if (data.branchIds.length === 0) {
    errors.push('At least one branch must be selected');
  }

  if (data.channelIds.length === 0) {
    errors.push('At least one channel must be selected');
  }

  if (data.productIds.length === 0) {
    errors.push('At least one product must be selected');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Debounce function for search input
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
