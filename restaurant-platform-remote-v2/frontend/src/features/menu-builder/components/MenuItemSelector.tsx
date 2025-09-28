// Menu Item Selector - Virtualized product selection with advanced search and filtering
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useDrag } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  TagIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckCircleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { Platform, PlatformMenu, MenuBuilderState } from '../../../types/menu-builder';
import { MenuProduct, MenuCategory } from '../../../types/menu';
import { getLocalizedText, formatCurrency, getStatusConfig } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';

interface MenuItemSelectorProps {
  platform: Platform;
  menu?: PlatformMenu;
  builderState: MenuBuilderState;
  onStateChange: (state: MenuBuilderState) => void;
  className?: string;
}

interface FilterState {
  search: string;
  categoryId?: string;
  status?: number;
  priceRange?: [number, number];
  tags: string[];
  sortBy: 'name' | 'price' | 'popularity' | 'recent';
  sortOrder: 'asc' | 'desc';
}

// Draggable Product Item Component
const DraggableProductItem: React.FC<{
  product: MenuProduct;
  isInMenu: boolean;
  onToggle: (productId: string) => void;
}> = ({ product, isInMenu, onToggle }) => {
  const { language } = useLanguage();

  const [{ isDragging }, drag] = useDrag({
    type: 'product',
    item: { id: product.id, type: 'product', productId: product.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const statusConfig = getStatusConfig(product.status);
  const primaryPrice = Object.values(product.pricing)[0] || 0;

  return (
    <motion.div
      ref={drag as any}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={`product-selector-item bg-white rounded-lg border-2 p-4 cursor-move transition-all duration-200 ${
        isDragging
          ? 'opacity-50 shadow-lg border-blue-400 scale-105'
          : isInMenu
            ? 'border-green-200 bg-green-50 hover:border-green-300'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Product Image */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {product.image ? (
            <Image
              src={product.image}
              alt={getLocalizedText(product.name, language)}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-1 right-1">
            <div className={`w-3 h-3 rounded-full ${
              product.status === 1 ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {getLocalizedText(product.name, language)}
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                {product.category ? getLocalizedText(product.category.name, language) : 'Uncategorized'}
              </p>

              {/* Price */}
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-green-600 text-sm">
                  {primaryPrice > 0 ? formatCurrency(primaryPrice) : 'No price'}
                </span>
                {Object.keys(product.pricing).length > 1 && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                    Multi-channel
                  </span>
                )}
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {product.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {product.tags.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{product.tags.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Preparation Time */}
              {product.preparationTime > 0 && (
                <div className="flex items-center text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  {product.preparationTime} min
                </div>
              )}
            </div>

            {/* Add/Remove Button */}
            <button
              onClick={() => onToggle(product.id)}
              className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                isInMenu
                  ? 'text-green-600 bg-green-100 hover:bg-green-200'
                  : 'text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-600'
              }`}
              title={isInMenu ? 'Remove from menu' : 'Add to menu'}
            >
              {isInMenu ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : (
                <PlusCircleIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Advanced Filter Panel
const FilterPanel: React.FC<{
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: MenuCategory[];
  availableTags: string[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ filters, onFiltersChange, categories, availableTags, isOpen, onClose }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={filters.categoryId || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              categoryId: e.target.value || undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {getLocalizedText(category.name, language)}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status?.toString() || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              status: e.target.value ? parseInt(e.target.value) : undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => onFiltersChange({
                ...filters,
                sortBy: e.target.value as FilterState['sortBy']
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="popularity">Popularity</option>
              <option value="recent">Recently Added</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => onFiltersChange({
                ...filters,
                sortOrder: e.target.value as FilterState['sortOrder']
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange?.[0] || ''}
              onChange={(e) => {
                const min = e.target.value ? parseFloat(e.target.value) : undefined;
                const max = filters.priceRange?.[1];
                onFiltersChange({
                  ...filters,
                  priceRange: min !== undefined || max !== undefined ? [min || 0, max || 999999] : undefined
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange?.[1] || ''}
              onChange={(e) => {
                const max = e.target.value ? parseFloat(e.target.value) : undefined;
                const min = filters.priceRange?.[0];
                onFiltersChange({
                  ...filters,
                  priceRange: min !== undefined || max !== undefined ? [min || 0, max || 999999] : undefined
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  const newTags = filters.tags.includes(tag)
                    ? filters.tags.filter(t => t !== tag)
                    : [...filters.tags, tag];
                  onFiltersChange({ ...filters, tags: newTags });
                }}
                className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filters.tags.includes(tag)
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TagIcon className="w-3 h-3 mr-1" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={() => onFiltersChange({
            search: '',
            sortBy: 'name',
            sortOrder: 'asc',
            tags: []
          })}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </motion.div>
  );
};

export const MenuItemSelector: React.FC<MenuItemSelectorProps> = ({
  platform,
  menu,
  builderState,
  onStateChange,
  className = ''
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    tags: []
  });

  // Load available products and categories
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [productsRes, categoriesRes, tagsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/products/paginated`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            },
            body: JSON.stringify({
              page: 1,
              limit: 1000, // Load all for menu builder
              sortBy: 'name',
              sortOrder: 'asc'
            })
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/categories`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/tags`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
          })
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setAvailableTags(tagsData.tags || []);
        }
      } catch (error) {
        console.error('Failed to load menu data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        getLocalizedText(product.name, language).toLowerCase().includes(searchLower) ||
        getLocalizedText(product.description || { en: '', ar: '' }, language).toLowerCase().includes(searchLower) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filters.categoryId) {
      filtered = filtered.filter(product => product.categoryId === filters.categoryId);
    }

    // Status filter
    if (filters.status !== undefined) {
      filtered = filtered.filter(product => product.status === filters.status);
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(product => {
        const price = Object.values(product.pricing)[0] || 0;
        return price >= min && price <= max;
      });
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(product =>
        filters.tags.some(tag => product.tags.includes(tag))
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'price':
          aValue = Object.values(a.pricing)[0] || 0;
          bValue = Object.values(b.pricing)[0] || 0;
          break;
        case 'name':
          aValue = getLocalizedText(a.name, language);
          bValue = getLocalizedText(b.name, language);
          break;
        case 'recent':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default:
          aValue = getLocalizedText(a.name, language);
          bValue = getLocalizedText(b.name, language);
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, filters, language]);

  // Check if product is in current menu
  const isProductInMenu = useCallback((productId: string) => {
    return builderState.selectedProducts.includes(productId);
  }, [builderState.selectedProducts]);

  // Toggle product in menu
  const toggleProductInMenu = useCallback((productId: string) => {
    const isInMenu = isProductInMenu(productId);
    const newSelectedProducts = isInMenu
      ? builderState.selectedProducts.filter(id => id !== productId)
      : [...builderState.selectedProducts, productId];

    onStateChange({
      ...builderState,
      selectedProducts: newSelectedProducts
    });
  }, [builderState, isProductInMenu, onStateChange]);

  // Product item renderer for virtualization
  const ProductItemRenderer = useCallback((index: number) => {
    const product = filteredProducts[index];
    return (
      <div className="px-4 py-2">
        <DraggableProductItem
          product={product}
          isInMenu={isProductInMenu(product.id)}
          onToggle={toggleProductInMenu}
        />
      </div>
    );
  }, [filteredProducts, isProductInMenu, toggleProductInMenu]);

  return (
    <div className={`menu-item-selector bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Product Library
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{builderState.selectedProducts.length} selected</span>
            <span>•</span>
            <span>{filteredProducts.length} available</span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="relative">
          <div className="flex space-x-2">
            {/* Search Input */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className={`px-3 py-2 border rounded-lg transition-colors ${
                filterPanelOpen
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Advanced Filter Panel */}
          <AnimatePresence>
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              availableTags={availableTags}
              isOpen={filterPanelOpen}
              onClose={() => setFilterPanelOpen(false)}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <Virtuoso
            totalCount={filteredProducts.length}
            itemContent={ProductItemRenderer}
            className="h-full"
            overscan={5}
            increaseViewportBy={{ top: 200, bottom: 200 }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.categoryId || filters.tags.length > 0
                ? 'Try adjusting your filters to see more results.'
                : 'No products available in your inventory.'
              }
            </p>
            {filters.search || filters.categoryId || filters.tags.length > 0 ? (
              <button
                onClick={() => setFilters({
                  search: '',
                  sortBy: 'name',
                  sortOrder: 'asc',
                  tags: []
                })}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};