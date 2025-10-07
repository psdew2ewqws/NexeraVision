// Grid layout component for displaying products

import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { ProductCard } from './ProductCard';
import type { MenuProduct } from '../types/menuBuilder.types';

interface ProductGridProps {
  products: MenuProduct[];
  selectedIds: string[];
  onProductToggle: (productId: string) => void;
  loading?: boolean;
  language: 'en' | 'ar';
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  selectedIds,
  onProductToggle,
  loading = false,
  language
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-600">Loading products...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <PhotoIcon className="h-8 w-8 mb-2" />
        <p className="text-sm">No products found</p>
        <p className="text-xs">Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={selectedIds.includes(product.id)}
          onToggle={onProductToggle}
          language={language}
        />
      ))}
    </div>
  );
};
