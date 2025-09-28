import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import BranchSelector from './BranchSelector';
import ChannelSelector from './ChannelSelector';
import toast from 'react-hot-toast';

interface MenuProduct {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  categoryName?: string;
  isActive: boolean;
  tags?: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  nameAr?: string;
  displayNumber: number;
  isActive: boolean;
  productCount?: number;
}

interface MenuBuilderProps {
  onSave?: (menuData: any) => void;
  initialData?: any;
  className?: string;
}

export const MenuBuilder: React.FC<MenuBuilderProps> = ({
  onSave,
  initialData,
  className = ""
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // Menu configuration state
  const [menuName, setMenuName] = useState(initialData?.name || '');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(initialData?.branchIds || []);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(initialData?.channelIds || []);

  // Products and categories state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialData?.productIds || []);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const authToken = localStorage.getItem('auth-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [user]);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth-token');

      const filters = {
        status: 1, // Active products only
        categoryId: selectedCategoryId,
        search: searchTerm,
        limit: 100 // Load reasonable amount for menu builder
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/paginated`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCategoryId, searchTerm]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle product selection toggle
  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Handle select all products in current view
  const handleSelectAllVisible = () => {
    const visibleProductIds = products.map(p => p.id);
    const allSelected = visibleProductIds.every(id => selectedProducts.includes(id));

    if (allSelected) {
      // Deselect all visible
      setSelectedProducts(prev => prev.filter(id => !visibleProductIds.includes(id)));
    } else {
      // Select all visible
      setSelectedProducts(prev => [...new Set([...prev, ...visibleProductIds])]);
    }
  };

  // Handle save menu
  const handleSaveMenu = async () => {
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
      createdBy: user?.id
    };

    try {
      setSaving(true);

      if (onSave) {
        await onSave(menuData);
      } else {
        // Default save implementation
        const authToken = localStorage.getItem('auth-token');
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
  };

  // Get selected products summary
  const selectedProductsSummary = selectedProducts.length > 0
    ? `${selectedProducts.length} products selected`
    : 'No products selected';

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
                {categories.filter(c => c.isActive).map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.productCount ? `(${category.productCount})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-sm text-gray-600">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <PhotoIcon className="h-8 w-8 mb-2" />
                <p className="text-sm">No products found</p>
                <p className="text-xs">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                {products.map(product => {
                  const isSelected = selectedProducts.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductToggle(product.id)}
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
                            alt={product.name}
                            className="w-full h-full object-cover"
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
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CurrencyDollarIcon className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {product.price.toFixed(2)}
                            </span>
                          </div>
                          {product.categoryName && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {product.categoryName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuBuilder;