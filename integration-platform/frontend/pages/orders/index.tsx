import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutGrid,
  List,
  RefreshCw,
  Settings,
  Download,
  Plus,
  Bell,
  Filter
} from 'lucide-react';

// Order components
import { OrdersGrid } from '@/components/orders/OrdersGrid';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderStats } from '@/components/orders/OrderStats';
import { OrderCard } from '@/components/orders/OrderCard';

// Hooks
import { useOrders, useUpdateOrderStatus, useExportOrders, OrdersQueryParams } from '@/hooks/useOrders';
import { useOrderUpdates, useOrderStatsUpdates } from '@/hooks/useOrderUpdates';
import { useOrderStats } from '@/hooks/useOrders';

import { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const OrdersDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<OrdersQueryParams>({
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNotifications, setShowNotifications] = useState(true);

  // Queries
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders(filters);

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useOrderStats({
    date_from: filters.date_from,
    date_to: filters.date_to,
    provider: filters.provider,
  });

  // Mutations
  const updateOrderStatus = useUpdateOrderStatus();
  const exportOrders = useExportOrders();

  // Real-time updates
  useOrderUpdates({
    showNotifications,
    onOrderUpdate: (event) => {
      // Refresh data when orders are updated
      refetchOrders();
      refetchStats();
    },
    onNewOrder: (order) => {
      toast.success(`New order #${order.external_id} from ${order.provider}`, {
        duration: 5000,
        icon: '🆕',
      });
    },
  });

  useOrderStatsUpdates();

  // Tab filtering
  const tabFilters = useMemo(() => {
    const baseFilters = { ...filters };

    switch (selectedTab) {
      case 'active':
        return {
          ...baseFilters,
          status: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up'] as OrderStatus[],
        };
      case 'completed':
        return {
          ...baseFilters,
          status: ['delivered', 'cancelled', 'failed'] as OrderStatus[],
        };
      default:
        return baseFilters;
    }
  }, [filters, selectedTab]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: OrdersQueryParams) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId,
        status: status as OrderStatus,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await exportOrders.mutateAsync({ ...tabFilters, format });
    } catch (error) {
      console.error('Failed to export orders:', error);
    }
  };

  const handleRefresh = () => {
    refetchOrders();
    refetchStats();
  };

  // Calculate active orders count for notifications
  const activeOrdersCount = useMemo(() => {
    if (!ordersData?.data) return 0;
    return ordersData.data.filter(order =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
    ).length;
  }, [ordersData]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access the orders dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Orders Dashboard | NEXARA Integration Platform</title>
        <meta name="description" content="Manage and track orders from all delivery providers" />
      </Head>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage orders from all delivery providers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                'relative',
                showNotifications && 'bg-blue-50 border-blue-200'
              )}
            >
              <Bell className={cn(
                'h-4 w-4',
                showNotifications && 'text-blue-600'
              )} />
              {activeOrdersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                  {activeOrdersCount}
                </Badge>
              )}
            </Button>

            <div className="flex items-center border border-gray-200 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleRefresh} disabled={ordersLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', ordersLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        {statsData && (
          <OrderStats
            data={statsData}
            isLoading={statsLoading}
            showTrends={true}
            compact={false}
          />
        )}

        <Separator />

        {/* Orders Section */}
        <div className="space-y-4">
          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all">
                  All Orders
                  {ordersData?.meta.total && (
                    <Badge variant="secondary" className="ml-2">
                      {ordersData.meta.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active
                  {activeOrdersCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {activeOrdersCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Select
                  value={`${filters.per_page || 20}`}
                  onValueChange={(value) =>
                    setFilters({ ...filters, per_page: parseInt(value), page: 1 })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters */}
            <OrderFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onExport={handleExport}
              isLoading={ordersLoading}
            />

            {/* Order Content */}
            <TabsContent value="all" className="space-y-4">
              <OrdersGrid
                orders={ordersData?.data || []}
                isLoading={ordersLoading}
                error={ordersError?.message || null}
                totalCount={ordersData?.meta.total || 0}
                currentPage={ordersData?.meta.current_page || 1}
                totalPages={ordersData?.meta.last_page || 1}
                onPageChange={handlePageChange}
                onStatusChange={handleStatusChange}
                onRefresh={handleRefresh}
                gridView={viewMode === 'grid'}
                itemHeight={viewMode === 'grid' ? 350 : 280}
              />
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              <OrdersGrid
                orders={ordersData?.data || []}
                isLoading={ordersLoading}
                error={ordersError?.message || null}
                totalCount={ordersData?.meta.total || 0}
                currentPage={ordersData?.meta.current_page || 1}
                totalPages={ordersData?.meta.last_page || 1}
                onPageChange={handlePageChange}
                onStatusChange={handleStatusChange}
                onRefresh={handleRefresh}
                gridView={viewMode === 'grid'}
                itemHeight={viewMode === 'grid' ? 350 : 280}
              />
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <OrdersGrid
                orders={ordersData?.data || []}
                isLoading={ordersLoading}
                error={ordersError?.message || null}
                totalCount={ordersData?.meta.total || 0}
                currentPage={ordersData?.meta.current_page || 1}
                totalPages={ordersData?.meta.last_page || 1}
                onPageChange={handlePageChange}
                onStatusChange={handleStatusChange}
                onRefresh={handleRefresh}
                gridView={viewMode === 'grid'}
                itemHeight={viewMode === 'grid' ? 350 : 280}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Actions */}
        {activeOrdersCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-orange-900">
                      {activeOrdersCount} active orders require attention
                    </h3>
                    <p className="text-sm text-orange-700">
                      Review pending and preparing orders to ensure timely delivery
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTab('active');
                    setFilters({
                      ...filters,
                      status: ['pending', 'confirmed'],
                      page: 1,
                    });
                  }}
                >
                  Review Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default OrdersDashboard;