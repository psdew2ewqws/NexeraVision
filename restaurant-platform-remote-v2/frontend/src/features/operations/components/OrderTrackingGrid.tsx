import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  BellIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useOperations } from '../contexts/OperationsContext';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  customer: {
    name: string;
    phone: string;
    address: {
      street: string;
      area: string;
      city: string;
    };
  };
  restaurant: {
    branchName: string;
    companyName: string;
    address: string;
  };
  provider: {
    name: string;
    type: string;
    driverId?: string;
    driverPhone?: string;
    estimatedTime: number;
    actualTime?: number;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  pricing: {
    subtotal: number;
    deliveryFee: number;
    tax: number;
    total: number;
  };
  timeline: {
    orderPlaced: Date;
    confirmed?: Date;
    preparing?: Date;
    ready?: Date;
    pickedUp?: Date;
    inTransit?: Date;
    delivered?: Date;
    cancelled?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface OrderTrackingGridProps {
  branchId?: string;
  companyId?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ClockIcon, label: 'Pending', priority: 1 },
  confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircleIcon, label: 'Confirmed', priority: 2 },
  preparing: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: BuildingOfficeIcon, label: 'Preparing', priority: 3 },
  ready: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircleIcon, label: 'Ready', priority: 4 },
  picked_up: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: TruckIcon, label: 'Picked Up', priority: 5 },
  in_transit: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: TruckIcon, label: 'In Transit', priority: 6 },
  delivered: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircleIcon, label: 'Delivered', priority: 7 },
  cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircleIcon, label: 'Cancelled', priority: 8 },
  failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: ExclamationTriangleIcon, label: 'Failed', priority: 9 }
};

export default function OrderTrackingGrid({ branchId, companyId, size = 'large' }: OrderTrackingGridProps) {
  const { user } = useAuth();
  const { addAlert, isConnected, setConnectionStatus } = useOperations();
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'status' | 'priority'>('priority');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch orders with filters
  const { data: orders = [], isLoading, isError, refetch } = useQuery<DeliveryOrder[]>({
    queryKey: ['orders-grid', branchId, companyId, statusFilter],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();

        if (branchId) params.append('branchId', branchId);
        if (companyId) params.append('companyId', companyId);

        // Filter for active orders (not delivered, cancelled, or failed)
        if (statusFilter === 'active') {
          params.append('status', 'pending,confirmed,preparing,ready,picked_up,in_transit');
        } else if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await axios.get(
          `${API_BASE_URL}/delivery/orders?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setConnectionStatus(true);
        return response.data;
      } catch (error) {
        setConnectionStatus(false);
        throw error;
      }
    },
    refetchInterval: autoRefresh ? 10000 : false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Monitor for new orders and alerts
  useEffect(() => {
    if (orders && orders.length > 0) {
      const urgentOrders = orders.filter(order => {
        const timeElapsed = Date.now() - new Date(order.createdAt).getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        return (order.status === 'pending' || order.status === 'preparing') && timeElapsed > thirtyMinutes;
      });

      urgentOrders.forEach(order => {
        addAlert({
          type: 'warning',
          title: 'Order Delay Alert',
          message: `Order #${order.orderNumber} has been ${order.status} for over 30 minutes`,
          read: false,
          source: 'orders',
          branchId: order.restaurant?.branchName,
          orderId: order.id
        });
      });
    }
  }, [orders, addAlert]);

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer.name.toLowerCase().includes(query) ||
          order.customer.phone.includes(query) ||
          order.provider.name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'status':
          return statusConfig[a.status].priority - statusConfig[b.status].priority;
        case 'priority':
          // Prioritize by urgency and status
          const aUrgency = getOrderUrgency(a);
          const bUrgency = getOrderUrgency(b);
          if (aUrgency !== bUrgency) return bUrgency - aUrgency;
          return statusConfig[a.status].priority - statusConfig[b.status].priority;
        default:
          return 0;
      }
    });

  function getOrderUrgency(order: DeliveryOrder): number {
    const timeElapsed = Date.now() - new Date(order.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    const thirtyMinutes = 30 * 60 * 1000;

    if (order.status === 'failed' || order.status === 'cancelled') return 0;
    if (timeElapsed > thirtyMinutes && (order.status === 'pending' || order.status === 'preparing')) return 3;
    if (timeElapsed > fifteenMinutes && order.status === 'pending') return 2;
    if (order.status === 'ready' || order.status === 'picked_up') return 2;
    return 1;
  }

  function formatTimeAgo(date: Date | string): string {
    const now = new Date();
    const orderDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }

  function getEstimatedDelivery(order: DeliveryOrder): string {
    if (order.status === 'delivered') return 'Delivered';
    if (order.status === 'cancelled' || order.status === 'failed') return 'N/A';

    const estimatedTime = order.provider.estimatedTime || 30;
    const orderTime = new Date(order.createdAt);
    const estimatedDelivery = new Date(orderTime.getTime() + estimatedTime * 60000);

    return estimatedDelivery.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getOrderProgress(order: DeliveryOrder): number {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    return Math.round(((currentIndex + 1) / statusOrder.length) * 100);
  }

  const getGridLayout = () => {
    switch (size) {
      case 'small':
        return 'grid-cols-1';
      case 'medium':
        return 'grid-cols-1 lg:grid-cols-2';
      case 'large':
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
      case 'full':
        return 'grid-cols-1 lg:grid-cols-3 xl:grid-cols-4';
      default:
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
        <p className="text-gray-600 mb-4">Unable to load order data</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active Orders</option>
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">Priority</option>
            <option value="time">Time</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${
              autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            title="Manual refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <TruckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search terms' : 'No orders match the current filters'}
          </p>
        </div>
      ) : (
        <div className={`grid ${getGridLayout()} gap-4`}>
          {filteredOrders.map((order) => {
            const statusInfo = statusConfig[order.status];
            const StatusIcon = statusInfo.icon;
            const progress = getOrderProgress(order);
            const urgency = getOrderUrgency(order);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-all cursor-pointer ${
                  urgency >= 3 ? 'border-red-300 bg-red-50' :
                  urgency >= 2 ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200'
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <StatusIcon className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">#{order.orderNumber}</span>
                    {urgency >= 2 && (
                      <BellIcon className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <UserIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{order.customer.name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{order.customer.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{order.customer.address.area}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        urgency >= 3 ? 'bg-red-500' :
                        urgency >= 2 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    {formatTimeAgo(order.createdAt)}
                  </div>
                  <div className="font-semibold text-gray-900">
                    ${order.pricing.total.toFixed(2)}
                  </div>
                </div>

                {/* Provider */}
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <TruckIcon className="h-3 w-3 mr-1" />
                  {order.provider.name} • Est: {getEstimatedDelivery(order)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Order Details - #{selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Customer Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Customer Information</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedOrder.customer.name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.customer.phone}</p>
                  <p><span className="font-medium">Address:</span> {selectedOrder.customer.address.street}, {selectedOrder.customer.address.area}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>${selectedOrder.pricing.deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${selectedOrder.pricing.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span>${selectedOrder.pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}