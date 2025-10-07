// Search and filter controls component

import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getCategoryName } from '../../../types/localization';
import type { MenuCategory } from '../types/menuBuilder.types';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (search: string) => void;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories: MenuCategory[];
  language: 'en' | 'ar';
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategoryId,
  onCategoryChange,
  categories,
  language
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search */}
      <div className="flex-1">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search products"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="sm:w-48">
        <select
          value={selectedCategoryId ?? ''}
          onChange={(e) => onCategoryChange(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories
            .filter(c => c.isActive)
            .map(category => {
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
  );
};
