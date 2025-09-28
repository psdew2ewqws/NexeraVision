import React from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  animate = true
}) => (
  <div
    className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    role="status"
    aria-label="Loading..."
  />
);

// Product card skeleton for grid layout
export const ProductCardSkeleton: React.FC<{ index?: number }> = ({ index }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
    {/* Image skeleton */}
    <div className="aspect-w-16 aspect-h-10 mb-4">
      <Skeleton className="w-full h-48 rounded-lg" />
    </div>

    {/* Content skeleton */}
    <div className="space-y-3">
      {/* Title */}
      <Skeleton className="h-4 w-3/4" />

      {/* Category */}
      <Skeleton className="h-3 w-1/2" />

      {/* Tags */}
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>

      {/* Price and actions */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <Skeleton className="h-4 w-1/4" />
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-12 rounded" />
          <Skeleton className="h-6 w-10 rounded" />
        </div>
      </div>
    </div>
  </div>
);

// Grid of product card skeletons
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 20 }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 p-6">
    {Array.from({ length: count }, (_, index) => (
      <ProductCardSkeleton key={index} index={index} />
    ))}
  </div>
);

// Category sidebar skeleton
export const CategorySidebarSkeleton: React.FC = () => (
  <div className="w-80 bg-white border-l border-gray-200 p-4 animate-pulse">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-16 rounded" />
    </div>

    {/* All products option */}
    <div className="mb-4">
      <Skeleton className="h-10 w-full rounded-md" />
    </div>

    {/* Category list */}
    <div className="space-y-2">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Page header skeleton
export const PageHeaderSkeleton: React.FC = () => (
  <div className="bg-white border-b border-gray-200 animate-pulse">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-20 rounded" />
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded" />
      </div>
    </div>
  </div>
);

// Filters skeleton
export const FiltersSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <Skeleton className="h-10 w-64 rounded-md" />

      {/* Sort */}
      <Skeleton className="h-10 w-32 rounded-md" />

      {/* Status */}
      <Skeleton className="h-10 w-24 rounded-md" />

      {/* Tags */}
      <Skeleton className="h-10 w-40 rounded-md" />

      {/* Clear button */}
      <Skeleton className="h-8 w-16 rounded" />
    </div>
  </div>
);

// Action bar skeleton
export const ActionBarSkeleton: React.FC = () => (
  <div className="flex items-center justify-between mb-6 animate-pulse">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-9 w-24 rounded-md" />
      <div className="flex border border-gray-200 rounded-md">
        <Skeleton className="h-9 w-20 rounded-l-md" />
        <Skeleton className="h-9 w-16 border-l border-gray-200" />
        <Skeleton className="h-9 w-16 rounded-r-md border-l border-gray-200" />
      </div>
    </div>
  </div>
);

// Full page loading skeleton
export const FullPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <PageHeaderSkeleton />

    <div className="flex h-[calc(100vh-64px)]">
      <CategorySidebarSkeleton />

      <div className="flex-1 flex flex-col">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-8">
          <ActionBarSkeleton />
          <FiltersSkeleton />

          <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ProductGridSkeleton />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Error state component
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  showRetry = true
}) => (
  <div className="text-center py-12">
    <div className="mx-auto h-16 w-16 text-red-500 mb-4">
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>

    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{message}</p>

    {showRetry && onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Try Again
      </button>
    )}
  </div>
);

// Empty state component
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title = 'No items found',
  message = 'There are no items to display.',
  actionLabel,
  onAction,
  icon
}) => (
  <div className="text-center py-12">
    <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
      {icon || (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
    </div>

    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{message}</p>

    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default {
  Skeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  CategorySidebarSkeleton,
  PageHeaderSkeleton,
  FiltersSkeleton,
  ActionBarSkeleton,
  FullPageSkeleton,
  ErrorState,
  EmptyState
};