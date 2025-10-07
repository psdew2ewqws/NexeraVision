import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Input } from '@/components/integration/ui/Input'
import { StatusBadge } from '@/components/integration/StatusBadge'
import { PayloadViewer } from '@/components/integration/PayloadViewer'
import { providerOrders, deliveryProviders } from '@/lib/integration-api'
import type { ProviderOrder, OrderFilters } from '@/types/integration'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { MagnifyingGlassIcon, ArrowPathIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 20,
    searchTerm: '',
    providerId: '',
    status: '',
    syncStatus: ''
  })
  const [selectedOrder, setSelectedOrder] = useState<ProviderOrder | null>(null)

  const { data: providers } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: () => deliveryProviders.getAll()
  })

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['provider-orders', filters],
    queryFn: () => providerOrders.getAll(filters)
  })

  const retryMutation = useMutation({
    mutationFn: (orderId: string) => providerOrders.retry(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-orders'] })
      toast.success('Order retry initiated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to retry order')
    }
  })

  const syncMutation = useMutation({
    mutationFn: (orderId: string) => providerOrders.sync(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-orders'] })
      toast.success('Order sync initiated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync order')
    }
  })

  const handleSearch = (searchTerm: string) => {
    setFilters({ ...filters, searchTerm, page: 1 })
  }

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Order Tracking</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track and manage delivery provider orders
          </p>
        </div>

        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Orders
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    value={filters.searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Order ID, External ID..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={filters.providerId}
                  onChange={(e) => handleFilterChange('providerId', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                >
                  <option value="">All Providers</option>
                  {providers?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Order Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sync Status
                </label>
                <select
                  value={filters.syncStatus}
                  onChange={(e) => handleFilterChange('syncStatus', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                >
                  <option value="">All Sync Statuses</option>
                  <option value="synced">Synced</option>
                  <option value="sync_failed">Sync Failed</option>
                  <option value="pending_sync">Pending Sync</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2 mt-2"></div>
                  </div>
                ))}
              </div>
            ) : ordersData && ordersData.data.length > 0 ? (
              <>
                <div className="space-y-3">
                  {ordersData.data.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gray-950 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <StatusBadge status={order.status} />
                            <StatusBadge status={order.syncStatus} />
                            <span className="text-sm font-medium text-gray-200">
                              {order.providerName}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-300">
                              <span className="text-gray-500">External ID:</span>{' '}
                              {order.externalOrderId}
                            </p>
                            {order.internalOrderId && (
                              <p className="text-sm text-gray-300">
                                <span className="text-gray-500">Internal ID:</span>{' '}
                                {order.internalOrderId}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                            {order.syncError && (
                              <p className="text-sm text-red-400 mt-1">{order.syncError}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {order.syncStatus === 'sync_failed' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => syncMutation.mutate(order.id)}
                              disabled={syncMutation.isLoading}
                            >
                              <ArrowsRightLeftIcon className="w-4 h-4 mr-1" />
                              Sync
                            </Button>
                          )}
                          {order.status === 'failed' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => retryMutation.mutate(order.id)}
                              disabled={retryMutation.isLoading}
                            >
                              <ArrowPathIcon className="w-4 h-4 mr-1" />
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {ordersData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-500">
                      Showing {(ordersData.page - 1) * ordersData.limit + 1} to{' '}
                      {Math.min(ordersData.page * ordersData.limit, ordersData.total)} of{' '}
                      {ordersData.total} results
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ordersData.page === 1}
                        onClick={() => handlePageChange(ordersData.page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-400">
                        Page {ordersData.page} of {ordersData.totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ordersData.page === ordersData.totalPages}
                        onClick={() => handlePageChange(ordersData.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No orders found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-100">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="text-sm font-medium text-gray-200">{selectedOrder.providerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">External Order ID</p>
                  <p className="text-sm font-medium text-gray-200">{selectedOrder.externalOrderId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Internal Order ID</p>
                  <p className="text-sm font-medium text-gray-200">
                    {selectedOrder.internalOrderId || 'Not synced'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sync Status</p>
                  <StatusBadge status={selectedOrder.syncStatus} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-200">
                    {format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
              </div>
              <PayloadViewer payload={selectedOrder.orderData} title="Order Data" />
            </div>
          </div>
        </div>
      )}
    </IntegrationLayout>
  )
}
