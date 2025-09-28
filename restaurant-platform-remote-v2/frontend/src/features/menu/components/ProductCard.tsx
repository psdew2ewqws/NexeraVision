// Product Card Component - Enhanced for menu product selection
import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon,
  MinusIcon,
  CurrencyDollarIcon,
  TagIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { MenuProduct, MenuCategory } from '../../../types/menu';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getImageUrl, getPlaceholderUrl } from '../../../utils/imageUrl';

interface ProductCardProps {
  product: MenuProduct;
  onAdd?: () => void;
  onRemove?: () => void;
  showAddButton?: boolean;
  isDraggable?: boolean;
  categories?: MenuCategory[];
  showPlatformBadge?: boolean;
  platformName?: string;
  isDragOverlay?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAdd,
  onRemove,
  showAddButton = false,
  isDraggable = true,
  categories = [],
  showPlatformBadge = false,
  platformName,
  isDragOverlay = false,
  className = ''
}) => {
  const { language } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: product.id,
    disabled: !isDraggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // Get category name
  const categoryName = useMemo(() => {
    const category = categories.find(cat => cat.id === product.categoryId);
    return category ? getLocalizedText(category.name, language) : 'Uncategorized';
  }, [product.categoryId, categories, language]);

  // Get platform-specific price if available
  const displayPrice = useMemo(() => {
    if (product.pricing && typeof product.pricing === 'object') {
      // Try to get platform-specific pricing
      const platformPricing = Object.values(product.pricing).find(price => price !== undefined);
      return platformPricing || product.basePrice;
    }
    return product.basePrice;
  }, [product.pricing, product.basePrice]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Product status indicator
  const StatusIndicator = () => {
    const isActive = product.status === 1;
    return isActive ? (
      <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
    ) : (
      <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden
        ${isDragOverlay ? 'shadow-lg rotate-2 scale-105' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {/* Product Image Section */}
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image && !imageError ? (
          <Image
            src={getImageUrl(product.image)}
            alt={getLocalizedText(product.name, language)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-opacity duration-200 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAEAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k="
            quality={75}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <PhotoIcon className="w-16 h-16 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500 text-center px-2">
              {imageError ? 'Image unavailable' : 'No image'}
            </span>
          </div>
        )}

        {/* Loading overlay */}
        {imageLoading && product.image && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <StatusIndicator />
        </div>

        {/* Drag handle overlay */}
        {isDraggable && !isDragOverlay && (
          <div className="absolute top-2 left-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-white bg-black bg-opacity-50 hover:bg-opacity-70 transition-all p-1 rounded"
              aria-label="Drag to reorder"
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Header with product info and action button */}
        <div className="flex items-start justify-between mb-3">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 leading-tight">
              {getLocalizedText(product.name, language) || 'Untitled Product'}
            </h3>
            <p className="text-xs text-blue-600 font-medium mb-1">
              {categoryName}
            </p>
            {product.description && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {getLocalizedText(product.description, language)}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="ml-2">
            {/* Add/Remove Button */}
            {showAddButton && onAdd && (
              <button
                onClick={onAdd}
                className="inline-flex items-center justify-center w-6 h-6 text-white bg-green-600 border border-transparent rounded hover:bg-green-700 transition-colors"
                title="Add to menu"
              >
                <PlusIcon className="w-3 h-3" />
              </button>
            )}

            {!showAddButton && onRemove && (
              <button
                onClick={onRemove}
                className="inline-flex items-center justify-center w-6 h-6 text-white bg-red-600 border border-transparent rounded hover:bg-red-700 transition-colors"
                title="Remove from menu"
              >
                <MinusIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-2">
          {/* Price - Prominent Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-green-700">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Price</span>
              </div>
              <span className="text-lg font-bold text-green-800">
                {formatCurrency(displayPrice)}
              </span>
            </div>
          </div>

          {/* Preparation Time & Tags */}
          <div className="flex items-center justify-between text-sm">
            {product.preparationTime && (
              <div className="flex items-center space-x-1 text-orange-600">
                <ClockIcon className="w-3 h-3" />
                <span className="font-medium">{product.preparationTime}min</span>
              </div>
            )}
            {product.tags && product.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <TagIcon className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-purple-600 font-medium">
                  {product.tags.slice(0, 2).join(', ')}
                  {product.tags.length > 2 && ' +'}
                </span>
              </div>
            )}
          </div>


          {/* Platform Badge */}
          {showPlatformBadge && platformName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Platform:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {platformName}
              </span>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
              product.status === 1
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-1.5 ${
                product.status === 1 ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              {product.status === 1 ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Platform-specific pricing display */}
        {product.pricing && typeof product.pricing === 'object' && Object.keys(product.pricing).length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Platform Pricing:</div>
            <div className="space-y-1">
              {Object.entries(product.pricing).map(([platform, price]) => {
                if (price === undefined) return null;
                return (
                  <div key={platform} className="flex justify-between text-xs">
                    <span className="text-gray-600 capitalize">{platform.replace('_', ' ')}:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(price)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hover actions overlay */}
      {!isDragOverlay && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};