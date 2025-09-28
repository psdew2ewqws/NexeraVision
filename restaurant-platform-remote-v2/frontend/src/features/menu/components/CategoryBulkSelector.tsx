// Category Bulk Selector - Enable bulk addition of all products from a category
import React, { useState, useCallback, useMemo } from 'react';
import {
  FolderIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { MenuCategory, MenuProduct, Platform } from '../../../types/menu';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { usePlatformProducts } from '../hooks/useMenuProductSelection';
import toast from 'react-hot-toast';

interface CategoryBulkSelectorProps {
  categories: MenuCategory[];
  allProducts: MenuProduct[];
  platform: Platform;
  onBulkAdd: (productIds: string[], categoryName: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface CategoryWithStats {
  category: MenuCategory;
  productsInCategory: MenuProduct[];
  totalProducts: number;
  availableProducts: number;
  alreadyAssigned: number;
}

export const CategoryBulkSelector: React.FC<CategoryBulkSelectorProps> = ({
  categories,
  allProducts,
  platform,
  onBulkAdd,
  disabled = false,
  className = ''
}) => {
  const { language } = useLanguage();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get platform products for checking what's already assigned
  const { bulkAddProducts, bulkLoading } = usePlatformProducts(platform.id);

  // Calculate category statistics
  const categoryStats = useMemo((): CategoryWithStats[] => {
    return categories
      .map(category => {
        const productsInCategory = allProducts.filter(
          product => product.categoryId === category.id && product.status === 1
        );

        const availableProducts = productsInCategory.length;

        return {
          category,
          productsInCategory,
          totalProducts: productsInCategory.length,
          availableProducts,
          alreadyAssigned: 0 // This will be calculated based on assigned products
        };
      })
      .filter(stat => stat.availableProducts > 0) // Only show categories with products
      .sort((a, b) => getLocalizedText(a.category.name, language).localeCompare(getLocalizedText(b.category.name, language)));
  }, [categories, allProducts, language]);

  // Toggle category selection
  const toggleCategory = useCallback((categoryId: string) => {
    if (disabled || processing.has(categoryId)) return;

    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, [disabled, processing]);

  // Select all categories
  const selectAll = useCallback(() => {
    if (disabled) return;
    const allCategoryIds = categoryStats.map(stat => stat.category.id);
    setSelectedCategories(new Set(allCategoryIds));
  }, [disabled, categoryStats]);

  // Clear all selections
  const clearAll = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  // Handle bulk add operation
  const handleBulkAdd = useCallback(async () => {
    if (selectedCategories.size === 0) {
      toast.error('Please select at least one category');
      return;
    }

    setShowConfirmDialog(false);
    const selectedStats = categoryStats.filter(stat => selectedCategories.has(stat.category.id));

    try {
      for (const stat of selectedStats) {
        setProcessing(prev => new Set(prev).add(stat.category.id));

        const productIds = stat.productsInCategory.map(p => p.id);
        const categoryName = getLocalizedText(stat.category.name, language);

        if (productIds.length > 0) {
          await onBulkAdd(productIds, categoryName);

          // Remove processed category from selection
          setSelectedCategories(prev => {
            const newSet = new Set(prev);
            newSet.delete(stat.category.id);
            return newSet;
          });
        }

        setProcessing(prev => {
          const newSet = new Set(prev);
          newSet.delete(stat.category.id);
          return newSet;
        });
      }

      toast.success(`Successfully added products from ${selectedStats.length} categories`);
    } catch (error) {
      toast.error('Some categories failed to process. Please try again.');
      console.error('Bulk add error:', error);

      // Clear processing state
      setProcessing(new Set());
    }
  }, [selectedCategories, categoryStats, onBulkAdd, language]);

  // Calculate totals for selected categories
  const selectedTotals = useMemo(() => {
    const selectedStats = categoryStats.filter(stat => selectedCategories.has(stat.category.id));
    return {
      categories: selectedStats.length,
      products: selectedStats.reduce((sum, stat) => sum + stat.availableProducts, 0)
    };
  }, [selectedCategories, categoryStats]);

  const isAnyProcessing = processing.size > 0 || bulkLoading;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Bulk Add by Category
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">
              {selectedTotals.categories} categories, {selectedTotals.products} products
            </span>

            {selectedCategories.size > 0 && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isAnyProcessing}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
              >
                <PlusIcon className="w-3 h-3 mr-1" />
                Add Selected
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAll}
              disabled={disabled || isAnyProcessing}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
            >
              Select All
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={clearAll}
              disabled={disabled || isAnyProcessing}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          <span className="text-xs text-gray-500">
            {categoryStats.length} categories available
          </span>
        </div>
      </div>

      {/* Categories List */}
      <div className="max-h-64 overflow-y-auto">
        {categoryStats.length === 0 ? (
          <div className="p-6 text-center">
            <FolderIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No categories with available products</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {categoryStats.map((stat) => {
              const isSelected = selectedCategories.has(stat.category.id);
              const isProcessing = processing.has(stat.category.id);
              const categoryName = getLocalizedText(stat.category.name, language);

              return (
                <div
                  key={stat.category.id}
                  className={`category-bulk-item flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${
                    (disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => toggleCategory(stat.category.id)}
                >
                  {/* Selection Checkbox */}
                  <div className="flex-shrink-0 mr-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {categoryName}
                      </h4>

                      {isProcessing && (
                        <ArrowPathIcon className="w-4 h-4 text-purple-600 animate-spin ml-2" />
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-600">
                        {stat.availableProducts} products available
                      </p>

                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          stat.category.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-xs text-gray-500">
                          {stat.category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Bulk Addition
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                You are about to add <strong>{selectedTotals.products} products</strong> from{' '}
                <strong>{selectedTotals.categories} categories</strong> to the{' '}
                <strong>{getLocalizedText(platform.name || '', language)}</strong> menu.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Products already in the menu will be skipped automatically.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdd}
                disabled={isAnyProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isAnyProcessing ? 'Processing...' : 'Add Products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};