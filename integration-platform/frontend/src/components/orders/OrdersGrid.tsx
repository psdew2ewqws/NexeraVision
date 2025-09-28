import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Order } from '@/types';
import { OrderCard } from './OrderCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Package,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/router';

interface OrdersGridProps {
  orders: Order[];
  isLoading?: boolean;
  error?: string | null;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onOrderSelect?: (order: Order) => void;
  onStatusChange?: (orderId: string, status: string) => void;
  onRefresh?: () => void;
  className?: string;
  gridView?: boolean;
  itemHeight?: number;
}

interface OrderRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    orders: Order[];
    onOrderSelect?: (order: Order) => void;
    onStatusChange?: (orderId: string, status: string) => void;
    gridView: boolean;
  };
}

const OrderRow: React.FC<OrderRowProps> = ({ index, style, data }) => {
  const { orders, onOrderSelect, onStatusChange, gridView } = data;
  const order = orders[index];

  if (!order) return null;

  return (
    <div style={style} className={cn('px-4', gridView ? 'py-2' : 'py-1')}>
      <OrderCard
        order={order}
        onClick={onOrderSelect}
        onStatusChange={onStatusChange}
        onViewDetails={(orderId) => {
          // Navigate to order detail page
          window.open(`/orders/${orderId}`, '_blank');
        }}
        className={cn(
          'h-full',
          gridView ? 'min-h-[300px]' : 'min-h-[250px]'
        )}
      />
    </div>
  );
};

const LoadingRow: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div style={style} className="px-4 py-2">
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const EmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-center space-y-4">
      <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
        <Package className="h-12 w-12 text-gray-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
        <p className="text-gray-500 max-w-sm">
          There are no orders matching your current filters. Try adjusting your search criteria or refresh to check for new orders.
        </p>
      </div>
      {onRefresh && (
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Orders
        </Button>
      )}
    </div>
  </div>
);

const ErrorState: React.FC<{ error: string; onRefresh?: () => void }> = ({ error, onRefresh }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-center space-y-4">
      <div className="mx-auto h-24 w-24 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Failed to load orders</h3>
        <p className="text-gray-500 max-w-sm">{error}</p>
      </div>
      {onRefresh && (
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  </div>
);

export const OrdersGrid: React.FC<OrdersGridProps> = ({
  orders,
  isLoading = false,
  error = null,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onOrderSelect,
  onStatusChange,
  onRefresh,
  className,
  gridView = true,
  itemHeight = 320,
}) => {
  const router = useRouter();

  const handleOrderSelect = useCallback((order: Order) => {
    if (onOrderSelect) {
      onOrderSelect(order);
    } else {
      router.push(`/orders/${order.id}`);
    }
  }, [onOrderSelect, router]);

  const rowData = useMemo(() => ({
    orders,
    onOrderSelect: handleOrderSelect,
    onStatusChange,
    gridView,
  }), [orders, handleOrderSelect, onStatusChange, gridView]);

  const handlePageChange = useCallback((page: number) => {
    if (onPageChange && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  }, [onPageChange, totalPages]);

  // Show error state
  if (error && !isLoading) {
    return (
      <div className={className}>
        <ErrorState error={error} onRefresh={onRefresh} />
      </div>
    );
  }

  // Show empty state when not loading and no orders
  if (!isLoading && orders.length === 0) {
    return (
      <div className={className}>
        <EmptyState onRefresh={onRefresh} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col space-y-4', className)}>
      {/* Grid Container */}
      <div className="flex-1 min-h-0">
        {isLoading && orders.length === 0 ? (
          // Initial loading state
          <div className="space-y-4 px-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingRow
                key={index}
                style={{ height: itemHeight, marginBottom: 8 }}
              />
            ))}
          </div>
        ) : (
          // Virtualized list
          <List
            height={600} // Adjust based on your layout
            itemCount={orders.length}
            itemSize={itemHeight}
            itemData={rowData}
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {OrderRow}
          </List>
        )}
      </div>

      {/* Loading overlay for pagination */}
      {isLoading && orders.length > 0 && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading orders...</span>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, totalCount)}
                </span>{' '}
                of <span className="font-medium">{totalCount}</span> orders
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(
                      currentPage - 2 + i,
                      totalPages - 4 + i
                    ));

                    if (pageNumber > totalPages) return null;

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={isLoading}
                        className="w-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {isLoading ? 'Refreshing...' : 'Refresh Orders'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrdersGrid;