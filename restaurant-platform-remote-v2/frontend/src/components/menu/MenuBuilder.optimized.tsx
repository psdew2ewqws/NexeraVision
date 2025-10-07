import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getLocalizedText, getCategoryName, getProductName, LocalizedString } from '../../types/localization';
import BranchSelector from './BranchSelector.optimized';
import ChannelSelector from './ChannelSelector.optimized';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';

interface MenuProduct {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  imageUrl?: string;
  categoryId: string;
  categoryName?: LocalizedString;
  isActive: boolean;
  tags?: string[];
}

interface MenuCategory {
  id: string;
  name: LocalizedString;
  displayNumber: number;
  isActive: boolean;
  productCount?: number;
}

interface MenuBuilderProps {
  onSave?: (menuData: any) => void;
  initialData?: any;
  className?: string;
}

// Optimized Product Card Component - Memoized to prevent unnecessary re-renders
const ProductCard = memo<{
  product: MenuProduct;
  isSelected: boolean;
  onToggle: (id: string) => void;
  language: 'en' | 'ar';
}>(({ product, isSelected, onToggle, language }) => {
  return (
    <div
      onClick={() => onToggle(product.id)}
      className={`
        relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}
    >
      {/* Selection Indicator */}
      <div className={`
        absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${isSelected
          ? 'bg-blue-600 border-blue-600'
          : 'bg-white border-gray-300'
        }
      `}>
        {isSelected && <CheckCircleIcon className="w-3 h-3 text-white" />}
      </div>

      {/* Product Image */}
      <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={typeof product.name === 'string' ? product.name : product.name.en}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-gray-900 truncate mb-1">
          {getProductName(product, language)}
        </h4>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {getLocalizedText(product.description, language)}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-sm font-medium text-gray-900">
              {product.price != null ? product.price.toFixed(2) : 'N/A'}
            </span>
          </div>
          {product.categoryName && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
              {getLocalizedText(product.categoryName, language)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => (
  // Custom comparison to prevent re-renders when only unrelated props change
  prev.product.id === next.product.id &&
  prev.isSelected === next.isSelected &&
  prev.language === next.language
));

ProductCard.displayName = 'ProductCard';

// API fetch functions with AbortController support
const fetchCategories = async (authToken: string, signal?: AbortSignal): Promise<MenuCategory[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/menu/categories`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to load categories: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.categories || [];
};

const fetchProducts = async (
  authToken: string,
  filters: {
    status: number;
    categoryId: string | null;
    search: string;
    limit: number;
  },
  signal?: AbortSignal
): Promise<MenuProduct[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/menu/products/paginated`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(filters),
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to load products: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.products || [];
};

export const MenuBuilder = memo<MenuBuilderProps>(({
  onSave,
  initialData,
  className = ""
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // Extract stable user ID instead of entire user object
  const userId = user?.id;
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Menu configuration state
  const [menuName, setMenuName] = useState(initialData?.name || '');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(initialData?.branchIds || []);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(initialData?.channelIds || []);

  // Products and categories state
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialData?.productIds || []);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounced search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // React Query for categories with automatic caching and deduplication
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoryError
  } = useQuery({
    queryKey: ['menu-categories', userId],
    queryFn: ({ signal }) => fetchCategories(authToken!, signal),
    enabled: !!userId && !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // React Query for products with automatic caching, deduplication, and cancellation
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productError,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['menu-products', userId, selectedCategoryId, debouncedSearchTerm],
    queryFn: ({ signal }) => fetchProducts(
      authToken!,
      {
        status: 1,
        categoryId: selectedCategoryId,
        search: debouncedSearchTerm,
        limit: 100
      },
      signal
    ),
    enabled: !!userId && !!authToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true, // Keep previous data while fetching new
  });

  // Memoized product toggle handler - stable reference
  const handleProductToggle = useCallback((productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  // Memoized select all handler
  const handleSelectAllVisible = useCallback(() => {
    const visibleProductIds = products.map(p => p.id);
    const allSelected = visibleProductIds.every(id => selectedProducts.includes(id));

    if (allSelected) {
      // Deselect all visible
      setSelectedProducts(prev => prev.filter(id => !visibleProductIds.includes(id)));
    } else {
      // Select all visible
      setSelectedProducts(prev => [...new Set([...prev, ...visibleProductIds])]);
    }
  }, [products, selectedProducts]);

  // Memoized save handler
  const handleSaveMenu = useCallback(async () => {
    // Validation
    if (!menuName.trim()) {
      toast.error('Please enter a menu name');
      return;
    }

    if (selectedBranchIds.length === 0) {
      toast.error('Please select at least one branch');
      return;
    }

    if (selectedChannelIds.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const menuData = {
      name: menuName,
      branchIds: selectedBranchIds,
      channelIds: selectedChannelIds,
      productIds: selectedProducts,
      createdAt: new Date().toISOString(),
      createdBy: userId
    };

    try {
      setSaving(true);

      if (onSave) {
        await onSave(menuData);
      } else {
        // Default save implementation
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/save`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(menuData)
        });

        if (response.ok) {
          toast.success('Menu saved successfully!');
          // Reset form
          setMenuName('');
          setSelectedBranchIds([]);
          setSelectedChannelIds([]);
          setSelectedProducts([]);
        } else {
          throw new Error('Failed to save menu');
        }
      }
    } catch (error) {
      console.error('Save menu error:', error);
      toast.error('Failed to save menu');
    } finally {
      setSaving(false);
    }
  }, [menuName, selectedBranchIds, selectedChannelIds, selectedProducts, userId, onSave, authToken]);

  // Memoized selected products summary
  const selectedProductsSummary = useMemo(
    () => selectedProducts.length > 0
      ? `${selectedProducts.length} products selected`
      : 'No products selected',
    [selectedProducts.length] // Only depend on length, not array
  );

  // Memoized active categories
  const activeCategories = useMemo(
    () => categories.filter(c => c.isActive),
    [categories]
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Menu Builder</h2>
              <p className="text-sm text-gray-500">Create and customize your menu for different branches and channels</p>
            </div>
          </div>
          <button
            onClick={handleSaveMenu}
            disabled={saving || !menuName || selectedBranchIds.length === 0 || selectedChannelIds.length === 0 || selectedProducts.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Save Menu
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="px-6 py-6 space-y-6">
        {/* Menu Name */}
        <div>
          <label htmlFor="menu-name" className="block text-sm font-medium text-gray-700 mb-2">
            Menu Name *
          </label>
          <input
            type="text"
            id="menu-name"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="Enter menu name (e.g., 'Weekend Special Menu')"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>

        {/* Branch and Channel Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Branches *
            </label>
            <BranchSelector
              selectedBranchIds={selectedBranchIds}
              onBranchChange={setSelectedBranchIds}
              placeholder="Select branches for this menu"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose which branches will use this menu
            </p>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Channels *
            </label>
            <ChannelSelector
              selectedChannelIds={selectedChannelIds}
              onChannelChange={setSelectedChannelIds}
              placeholder="Select channels for this menu"
              required
              allowMultiple={true}
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose delivery platforms and order channels
            </p>
          </div>
        </div>

        {/* Product Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Product Selection *</h3>
              <p className="text-xs text-gray-500">{selectedProductsSummary}</p>
            </div>
            <button
              onClick={handleSelectAllVisible}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {products.length > 0 && products.every(p => selectedProducts.includes(p.id)) ? 'Deselect All' : 'Select All Visible'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-48">
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {activeCategories.map(category => {
                  const categoryName = getCategoryName(category, language);
                  return (
                    <option key={category.id} value={category.id}>
                      {categoryName} {category.productCount ? `(${category.productCount})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Error Display */}
          {productError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 mb-1">Failed to load products</h4>
                  <p className="text-sm text-red-700">{(productError as Error).message}</p>
                  <button
                    onClick={() => refetchProducts()}
                    className="mt-2 inline-flex items-center text-sm text-red-700 hover:text-red-800 font-medium"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-1" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-sm text-gray-600">Loading products...</span>
              </div>
            ) : productError ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <ExclamationTriangleIcon className="h-8 w-8 mb-2 text-red-500" />
                <p className="text-sm">Unable to load products</p>
                <p className="text-xs">Click "Try Again" above to retry</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <PhotoIcon className="h-8 w-8 mb-2" />
                <p className="text-sm">No products found</p>
                <p className="text-xs">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProducts.includes(product.id)}
                    onToggle={handleProductToggle}
                    language={language}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom deep comparison to prevent unnecessary re-renders
  return (
    prevProps.className === nextProps.className &&
    prevProps.onSave === nextProps.onSave &&
    JSON.stringify(prevProps.initialData) === JSON.stringify(nextProps.initialData)
  );
});

MenuBuilder.displayName = 'MenuBuilder';

export default MenuBuilder;
