// Pure presentation component for a single product card

import React, { memo } from 'react';
import { CheckCircleIcon, PhotoIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { getProductName, getLocalizedText, type LocalizedString } from '../../../types/localization';
import type { MenuProduct } from '../types/menuBuilder.types';

interface ProductCardProps {
  product: MenuProduct;
  isSelected: boolean;
  onToggle: (productId: string) => void;
  language: 'en' | 'ar';
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  isSelected,
  onToggle,
  language
}) => {
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
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(product.id);
        }
      }}
    >
      {/* Selection Indicator */}
      <div className={`
        absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10
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
            alt={getProductName(product, language)}
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
};

// Memoize to prevent unnecessary re-renders
export const ProductCard = memo(ProductCardComponent);
