// Enterprise Product Filters - B2B Professional Design
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  TagIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { ProductFilters as ProductFiltersType, MenuCategory } from '../../../types/menu';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText, debounce } from '../../../lib/menu-utils';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: Partial<ProductFiltersType>) => void;
  categories?: MenuCategory[];
  availableTags?: string[];
  className?: string;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  categories = [],
  availableTags = [],
  className = ''
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  // Debounced search to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onFiltersChange({ search: value });
    }, 300),
    [onFiltersChange]
  );

  // Handle search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof ProductFiltersType, value: any) => {
    onFiltersChange({ [key]: value });
  }, [onFiltersChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchValue('');
    onFiltersChange({
      search: '',
      categoryId: '',
      sortBy: 'priority',
      sortOrder: 'asc',
      status: undefined,
      tags: []
    });
  }, [onFiltersChange]);

  // Active filter count for UI
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categoryId) count++;
    if (filters.status !== undefined) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Handle tag selection
  const handleTagToggle = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    handleFilterChange('tags', newTags);
  }, [filters.tags, handleFilterChange]);

  return (
    <div className={`product-filters bg-white border-b border-gray-200 ${className}`}>
      <div className="p-6">
        {/* Primary Filter Bar */}
        <div className="flex items-center space-x-4 mb-4">
          {/* Search Input - Professional Design */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, categories, or tags..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-500"
              />
              {searchValue && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="min-w-48">
            <select
              value={filters.categoryId || ''}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
          <div className="min-w-32">
            <select
              value={filters.status !== undefined ? filters.status.toString() : 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : parseInt(e.target.value))}
              className="block w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <select
              value={`${filters.sortBy || 'priority'}-${filters.sortOrder || 'asc'}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                handleFilterChange('sortBy', sortBy as any);
                handleFilterChange('sortOrder', sortOrder as any);
              }}
              className="block px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="priority-asc">Priority (Low to High)</option>
              <option value="priority-desc">Priority (High to Low)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              showAdvanced || activeFilterCount > 0
                ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Clear
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TagIcon className="inline w-4 h-4 mr-1" />
                    Tags
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <span>
                        {filters.tags && filters.tags.length > 0 
                          ? `${filters.tags.length} tag${filters.tags.length > 1 ? 's' : ''} selected`
                          : 'Select tags'
                        }
                      </span>
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${showTagsDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showTagsDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {availableTags.map(tag => (
                          <div key={tag} className="flex items-center px-3 py-2 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`tag-${tag}`}
                              checked={filters.tags?.includes(tag) || false}
                              onChange={() => handleTagToggle(tag)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`tag-${tag}`} className="ml-2 text-sm text-gray-700 flex-1 cursor-pointer">
                              {tag}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Filter Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFilterChange('tags', ['popular'])}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      filters.tags?.includes('popular') 
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    onClick={() => handleFilterChange('tags', ['new'])}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      filters.tags?.includes('new') 
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    New
                  </button>
                  <button
                    onClick={() => handleFilterChange('tags', ['featured'])}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      filters.tags?.includes('featured') 
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Featured
                  </button>
                </div>
              </div>

              {/* Results Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View Options
                </label>
                <div className="text-sm text-gray-600">
                  <p>Filtered by: {user?.role === 'super_admin' ? 'All Companies' : 'Your Company'}</p>
                  <p className="mt-1">Showing results for: {language === 'en' ? 'English' : 'Arabic'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>
            
            {filters.search && (
              <span className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                Search: "{filters.search}"
                <button
                  onClick={() => handleSearchChange('')}
                  className="ml-2 p-0.5 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-200"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.categoryId && (
              <span className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                Category: {getLocalizedText(categories.find(c => c.id === filters.categoryId)?.name || { en: 'Unknown' }, language)}
                <button
                  onClick={() => handleFilterChange('categoryId', '')}
                  className="ml-2 p-0.5 text-green-600 hover:text-green-800 rounded-full hover:bg-green-200"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.status !== undefined && (
              <span className="inline-flex items-center px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full">
                Status: {filters.status === 1 ? 'Active' : 'Inactive'}
                <button
                  onClick={() => handleFilterChange('status', undefined)}
                  className="ml-2 p-0.5 text-yellow-600 hover:text-yellow-800 rounded-full hover:bg-yellow-200"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {filters.tags && filters.tags.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">
                Tags: {filters.tags.join(', ')}
                <button
                  onClick={() => handleFilterChange('tags', [])}
                  className="ml-2 p-0.5 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-200"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};