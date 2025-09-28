// Enterprise Virtualized Product Grid - B2B Professional
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import Image from 'next/image';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  TagIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { MenuProduct, ProductFilters } from '../../../types/menu';
import { getLocalizedText, formatCurrency, getStatusConfig, getTagColor, trackPerformanceMetric } from '../../../lib/menu-utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getImageUrl, getPlaceholderUrl } from '../../../utils/imageUrl';

interface VirtualizedProductGridProps {
  filters: ProductFilters;
  onProductSelect?: (productId: string) => void;
  onProductEdit?: (product: MenuProduct) => void;
  onProductDelete?: (productId: string, productName?: string) => void;
  onProductView?: (product: MenuProduct) => void;
  selectedProducts?: string[];
  selectionMode?: boolean;
  className?: string;
  refreshTrigger?: number;
}

interface ProductCardSkeletonProps {
  index: number;
}

// Professional loading skeleton
const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ index }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
    <div className="aspect-w-16 aspect-h-10 mb-4">
      <div className="bg-gray-200 rounded-lg"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>
    </div>
  </div>
);

export const VirtualizedProductGrid: React.FC<VirtualizedProductGridProps> = ({
  filters,
  onProductSelect,
  onProductEdit,
  onProductDelete,
  onProductView,
  selectedProducts = [],
  selectionMode = false,
  className = '',
  refreshTrigger = 0
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load products with pagination
  const loadProducts = useCallback(async (reset: boolean = false) => {
    // For super_admin users, they can see all company data, so we don't require companyId
    // For regular users, we need companyId for data isolation
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      trackPerformanceMetric('product-load-start', Date.now());
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products/paginated`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          ...filters,
          page: reset ? 1 : Math.ceil(products.length / 50) + 1,
          limit: 50,
          // Super admin can see all companies, others are restricted to their company
          ...(user.role !== 'super_admin' && user.companyId && { companyId: user.companyId })
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (reset) {
        setProducts(data.products);
      } else {
        setProducts(prev => [...prev, ...data.products]);
      }
      
      setHasNextPage(data.pagination.hasMore);
      trackPerformanceMetric('product-load-complete', data.products.length);
      
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters, user, products.length]);

  // Load initial data and reload on filter changes or category updates
  useEffect(() => {
    if (user) {
      loadProducts(true);
    }
  }, [user, filters.categoryId, filters.search, filters.sortBy, filters.sortOrder, filters.status, refreshTrigger, loadProducts]);

  // Single product card component
  const SingleProductCard = useMemo(() => ({ product }: { product: MenuProduct }) => {
    const statusConfig = getStatusConfig(product.status);
    const isSelected = selectedProducts.includes(product.id);
    
    return (
      <div className={`product-card bg-white rounded-lg border transition-all duration-200 hover:shadow-md relative ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
      }`}>
        {/* Selection checkbox for bulk operations */}
        {selectionMode && (
          <div className="absolute top-3 left-3 z-20">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onProductSelect?.(product.id)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-blue-600 border-blue-600 shadow-md' 
                  : 'bg-white border-gray-300 hover:border-gray-400 shadow-sm'
              }`}>
                {isSelected && (
                  <CheckIcon className="w-3 h-3 text-white" />
                )}
              </div>
            </label>
          </div>
        )}
        
        {/* Product Image - Enterprise optimized */}
        <div className="relative w-full h-48 rounded-t-lg overflow-hidden bg-gray-100">
          {product.image ? (
            <Image
              src={getImageUrl(product.image)}
              alt={getLocalizedText(product.name, language)}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover"
              loading="lazy"
              placeholder="blur"
              blurDataURL={getPlaceholderUrl()}
              priority={false}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-2" />
                <span className="text-sm">No Image</span>
              </div>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.className}`}>
              <span className="mr-1">{statusConfig.icon}</span>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Product Information */}
        <div className="p-4">
          {/* Name and Category */}
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 text-base leading-tight mb-1 line-clamp-2">
              {getLocalizedText(product.name, language)}
            </h3>
            <p className="text-sm text-gray-500">
              {product.category ? getLocalizedText(product.category.name, language) : 'Uncategorized'}
            </p>
            
            {/* Company name for super_admin */}
            {user?.role === 'super_admin' && product.company && (
              <p className="text-xs text-blue-600 font-medium mt-1 bg-blue-50 px-2 py-1 rounded inline-block">
                🏢 {product.company.name}
              </p>
            )}
          </div>

          {/* Multi-channel pricing indicator - removed base price display */}
          {Object.keys(product.pricing).length > 1 && (
            <div className="mb-3">
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                Multi-channel pricing
              </span>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {product.tags.slice(0, 3).map((tag, tagIndex) => (
                  <span 
                    key={tagIndex}
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${getTagColor(tag)}`}
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {product.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{product.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Preparation Time */}
          {product.preparationTime > 0 && (
            <div className="mb-3 flex items-center text-sm text-gray-500">
              <ClockIcon className="w-4 h-4 mr-1" />
              <span>{product.preparationTime} min prep</span>
            </div>
          )}

          {/* Action Buttons - Professional Layout */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onProductView?.(product)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <EyeIcon className="w-3 h-3 mr-1" />
                View
              </button>
              
              {user?.role !== 'cashier' && (
                <button
                  onClick={() => onProductEdit?.(product)}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                >
                  <PencilIcon className="w-3 h-3 mr-1" />
                  Edit
                </button>
              )}
            </div>
            
            {(user?.role === 'super_admin' || user?.role === 'company_owner') && (
              <button
                onClick={() => onProductDelete?.(product.id, getLocalizedText(product.name, language))}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                <TrashIcon className="w-3 h-3 mr-1" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }, [selectedProducts, selectionMode, language, user?.role, onProductSelect, onProductEdit, onProductDelete, onProductView]);

  // Row renderer for 5-column grid (renders 5 products per row)
  const ProductRow = useMemo(() => ({ index }: { index: number }) => {
    const rowStartIndex = index * 5;
    const rowProducts = products.slice(rowStartIndex, rowStartIndex + 5);
    
    if (rowProducts.length === 0) {
      return null;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 px-6 py-3">
        {rowProducts.map((product, colIndex) => (
          <SingleProductCard key={product.id} product={product} />
        ))}
        {/* Fill empty columns with skeleton cards if needed */}
        {rowProducts.length < 5 && Array.from({ length: 5 - rowProducts.length }).map((_, emptyIndex) => (
          <div key={`empty-${emptyIndex}`} className="invisible">
            <ProductCardSkeleton index={rowStartIndex + rowProducts.length + emptyIndex} />
          </div>
        ))}
      </div>
    );
  }, [products, SingleProductCard]);

  // Calculate total number of rows (5 products per row)
  const totalRows = Math.ceil(products.length / 5);

  // Loading footer component
  const LoadingFooter = useCallback(() => {
    if (!loading) return null;
    
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading products...</span>
      </div>
    );
  }, [loading]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Products</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => loadProducts(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`virtualized-product-grid h-[calc(100vh-300px)] ${className}`}>
      <Virtuoso
        totalCount={totalRows}
        endReached={() => hasNextPage && loadProducts(false)}
        overscan={5} // Pre-render rows for smooth scrolling
        itemContent={(rowIndex) => <ProductRow index={rowIndex} />}
        components={{
          Footer: LoadingFooter,
        }}
        style={{ height: '100%' }}
        className="grid-container"
        // Performance optimizations for large datasets
        increaseViewportBy={{ top: 500, bottom: 500 }}
      />
      
      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-600">
            {filters.search ? 'No products match your search criteria.' : 'Start by adding your first product.'}
          </p>
        </div>
      )}
    </div>
  );
};