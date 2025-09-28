// Platform Menu Item Manager - Add/Remove Items from Platforms
import React, { useState, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  MinusIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ListBulletIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { usePlatformProductOperations } from '../../../hooks/usePlatforms';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';

// Types
interface Product {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
  image?: string;
  isAssigned?: boolean;
}

interface Platform {
  id: string;
  name: string;
  displayName: { en: string; ar?: string };
  platformType: string;
  status: number;
  _count?: {
    productPlatformAssignments: number;
  };
}

interface PlatformMenuItemManagerProps {
  platform: Platform;
  onClose?: () => void;
}

// Mock data for now - you'll replace this with real API calls
const MOCK_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Chicken Burger', nameAr: 'برجر دجاج', category: 'Burgers', price: 12.50, status: 'active', isAssigned: false },
  { id: 'prod-2', name: 'Beef Pizza', nameAr: 'بيتزا لحم', category: 'Pizza', price: 18.00, status: 'active', isAssigned: true },
  { id: 'prod-3', name: 'Caesar Salad', nameAr: 'سلطة قيصر', category: 'Salads', price: 8.50, status: 'active', isAssigned: false },
  { id: 'prod-4', name: 'Chocolate Cake', nameAr: 'كيك شوكولاتة', category: 'Desserts', price: 6.00, status: 'active', isAssigned: true },
  { id: 'prod-5', name: 'Grilled Fish', nameAr: 'سمك مشوي', category: 'Seafood', price: 22.00, status: 'active', isAssigned: false }
];

export const PlatformMenuItemManager: React.FC<PlatformMenuItemManagerProps> = ({
  platform,
  onClose
}) => {
  const { language } = useLanguage();
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showAssigned, setShowAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const { addProductsToPlatform, removeProductsFromPlatform, isLoading } = usePlatformProductOperations();

  // Filter products based on search, category, and assignment status
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.nameAr && product.nameAr.includes(searchTerm));
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesAssignment = showAssigned === 'all' ||
                               (showAssigned === 'assigned' && product.isAssigned) ||
                               (showAssigned === 'unassigned' && !product.isAssigned);

      return matchesSearch && matchesCategory && matchesAssignment;
    });
  }, [products, searchTerm, categoryFilter, showAssigned]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.sort();
  }, [products]);

  // Statistics
  const stats = useMemo(() => {
    const assigned = products.filter(p => p.isAssigned).length;
    const unassigned = products.length - assigned;
    return { total: products.length, assigned, unassigned };
  }, [products]);

  // Handle product selection
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAll = useCallback(() => {
    const visibleProductIds = filteredProducts.map(p => p.id);
    setSelectedProducts(visibleProductIds);
  }, [filteredProducts]);

  const clearSelection = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  // Handle add/remove operations
  const handleAddSelectedProducts = useCallback(async () => {
    if (selectedProducts.length === 0) return;

    try {
      await addProductsToPlatform(platform.id, selectedProducts);

      // Update local state optimistically
      setProducts(prev => prev.map(product =>
        selectedProducts.includes(product.id)
          ? { ...product, isAssigned: true }
          : product
      ));

      setSelectedProducts([]);
    } catch (error) {
      console.error('Failed to add products:', error);
    }
  }, [selectedProducts, platform.id, addProductsToPlatform]);

  const handleRemoveSelectedProducts = useCallback(async () => {
    if (selectedProducts.length === 0) return;

    try {
      await removeProductsFromPlatform(platform.id, selectedProducts);

      // Update local state optimistically
      setProducts(prev => prev.map(product =>
        selectedProducts.includes(product.id)
          ? { ...product, isAssigned: false }
          : product
      ));

      setSelectedProducts([]);
    } catch (error) {
      console.error('Failed to remove products:', error);
    }
  }, [selectedProducts, platform.id, removeProductsFromPlatform]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Menu Items for {getLocalizedText(platform.displayName || platform.name || '', language)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Add or remove items from this platform menu
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-700">Total Products</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{stats.assigned}</div>
            <div className="text-sm text-green-700">Assigned</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
            <div className="text-sm text-orange-700">Unassigned</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Assignment Status Filter */}
            <select
              value={showAssigned}
              onChange={(e) => setShowAssigned(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="assigned">Assigned Only</option>
              <option value="unassigned">Unassigned Only</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-gray-300">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleAddSelectedProducts}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add to Platform
              </button>
              <button
                onClick={handleRemoveSelectedProducts}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                <MinusIcon className="w-4 h-4 mr-1" />
                Remove from Platform
              </button>
              <button
                onClick={clearSelection}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Select All/None */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Select All Visible
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={clearSelection}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Select None
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="p-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products found matching your criteria
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  selectedProducts.includes(product.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${product.isAssigned ? 'bg-green-50' : 'bg-white'}`}
                onClick={() => toggleProductSelection(product.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        {product.nameAr && (
                          <p className="text-sm text-gray-600">{product.nameAr}</p>
                        )}
                        <p className="text-sm text-gray-500">{product.category}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">${product.price}</span>
                    {product.isAssigned ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        Assigned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                        Not Assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};