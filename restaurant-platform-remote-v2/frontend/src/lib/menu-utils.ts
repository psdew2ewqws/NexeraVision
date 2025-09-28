// Enterprise Menu Utilities - B2B Professional
import { MenuProduct, ProductFilters, PerformanceMetrics } from '../types/menu';

// Multi-language text extraction
export const getLocalizedText = (textObj: { en?: string; ar?: string } | string, language: 'en' | 'ar' = 'en'): string => {
  if (typeof textObj === 'string') return textObj;
  return textObj?.[language] || textObj?.en || textObj?.ar || 'Untitled';
};

// Currency formatter for enterprise use
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Professional price formatting for multi-channel
export const formatMultiChannelPricing = (pricing: Record<string, number | undefined>): string => {
  const channels = Object.entries(pricing).filter(([_, price]) => price !== undefined);
  if (channels.length <= 1) {
    return formatCurrency(Object.values(pricing)[0] || 0);
  }
  
  const min = Math.min(...channels.map(([_, price]) => price!));
  const max = Math.max(...channels.map(([_, price]) => price!));
  
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;
};

// Performance tracking for enterprise dashboards
export const trackPerformanceMetric = (metricName: string, value: number): void => {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`menu-${metricName}-${value}`);
  }
};

// Search and filter utilities for large datasets
export const filterProducts = (products: MenuProduct[], filters: ProductFilters): MenuProduct[] => {
  let filtered = [...products];

  // Company isolation is handled at API level
  
  if (filters.categoryId) {
    filtered = filtered.filter(p => p.categoryId === filters.categoryId);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      getLocalizedText(p.name, 'en').toLowerCase().includes(searchLower) ||
      getLocalizedText(p.name, 'ar').toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  if (filters.status !== undefined) {
    filtered = filtered.filter(p => p.status === filters.status);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(p => 
      filters.tags!.some(tag => p.tags.includes(tag))
    );
  }

  // Sort results
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (filters.sortBy) {
        case 'name':
          aVal = getLocalizedText(a.name).toLowerCase();
          bVal = getLocalizedText(b.name).toLowerCase();
          break;
        case 'price':
          aVal = a.basePrice;
          bVal = b.basePrice;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
          break;
        default:
          return 0;
      }
      
      if (filters.sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  }

  return filtered;
};

// Performance optimization utilities
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Cache key generation for API requests
export const generateCacheKey = (
  companyId: string, 
  filters: ProductFilters, 
  page: number = 1
): string => {
  const filterString = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(',') : value}`)
    .join('|');
    
  return `menu:${companyId}:${filterString}:page:${page}`;
};

// Professional status badge configuration
export const getStatusConfig = (status: number) => ({
  1: { 
    label: 'Active', 
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '●'
  },
  0: { 
    label: 'Inactive', 
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '○'
  }
})[status] || { label: 'Unknown', className: 'bg-gray-100 text-gray-600', icon: '?' };

// Tag color assignment for consistent UI
export const getTagColor = (tag: string): string => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800', 
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800'
  ];
  
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Enterprise validation utilities
export const validateProductData = (product: Partial<MenuProduct>): string[] => {
  const errors: string[] = [];
  
  if (!product.name || (!getLocalizedText(product.name, 'en') && !getLocalizedText(product.name, 'ar'))) {
    errors.push('Product name is required in at least one language');
  }
  
  if (product.basePrice === undefined || product.basePrice < 0) {
    errors.push('Base price must be a positive number');
  }
  
  if (product.cost !== undefined && product.cost < 0) {
    errors.push('Cost must be a positive number');
  }
  
  if (product.preparationTime !== undefined && product.preparationTime < 0) {
    errors.push('Preparation time must be a positive number');
  }
  
  return errors;
};

// Performance monitoring for enterprise
export const measureRenderPerformance = (componentName: string, renderCount: number): PerformanceMetrics => {
  const memory = (performance as any).memory;
  
  return {
    productsLoaded: renderCount,
    renderTime: performance.now(),
    memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
    scrollPerformance: 60, // Target FPS
    cacheHitRate: 0 // To be calculated by caching layer
  };
};