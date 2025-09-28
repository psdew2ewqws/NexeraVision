import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  BellIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from 'src/contexts/AuthContext';

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
      coordinates?: {
        lat: number;
        lng: number;
      };
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
  trackingInfo?: {
    driverLocation?: {
      lat: number;
      lng: number;
      timestamp: Date;
    };
    estimatedArrival?: Date;
    driverNotes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface OrderStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  avgDeliveryTime: number;
  successRate: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon, label: 'Confirmed' },
  preparing: { color: 'bg-purple-100 text-purple-800', icon: BuildingOfficeIcon, label: 'Preparing' },
  ready: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'Ready' },
  picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: TruckIcon, label: 'Picked Up' },
  in_transit: { color: 'bg-blue-100 text-blue-800', icon: TruckIcon, label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'Delivered' },
  cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircleIcon, label: 'Cancelled' },
  failed: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon, label: 'Failed' }
};

interface OrderTrackingDashboardProps {
  branchId?: string;
  companyId?: string;
}

export default function OrderTrackingDashboard({ 
  branchId, 
  companyId 
}: OrderTrackingDashboardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days'>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch orders with filters
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<DeliveryOrder[]>({
    queryKey: ['delivery-orders', branchId, companyId, statusFilter, timeFilter],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (branchId) params.append('branchId', branchId);
      if (companyId) params.append('companyId', companyId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('timeRange', timeFilter);

      const response = await axios.get(
        `${API_BASE_URL}/delivery/orders?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    refetchInterval: autoRefresh ? 10000 : false // Auto refresh every 10 seconds
  });

  // Fetch order statistics
  const { data: stats } = useQuery<OrderStats>({
    queryKey: ['delivery-order-stats', branchId, companyId, timeFilter],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (branchId) params.append('branchId', branchId);
      if (companyId) params.append('companyId', companyId);
      params.append('timeRange', timeFilter);

      const response = await axios.get(
        `${API_BASE_URL}/delivery/orders/stats?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    refetchInterval: autoRefresh ? 30000 : false // Refresh stats every 30 seconds
  });

  // Get order status progress
  const getOrderProgress = (order: DeliveryOrder) => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    return {
      current: currentIndex + 1,
      total: statusOrder.length,
      percentage: Math.round(((currentIndex + 1) / statusOrder.length) * 100)
    };
  };

  // Format time ago
  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Estimate delivery time
  const getEstimatedDelivery = (order: DeliveryOrder) => {
    if (order.status === 'delivered') return 'Delivered';
    if (order.status === 'cancelled' || order.status === 'failed') return 'N/A';
    
    const estimatedTime = order.provider.estimatedTime || 30;
    const orderTime = new Date(order.createdAt);
    const estimatedDelivery = new Date(orderTime.getTime() + estimatedTime * 60000);
    
    return estimatedDelivery.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Tracking Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of delivery orders</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">Auto Refresh:</label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1 rounded-full ${
                autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
          
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
          
          <button
            onClick={() => refetchOrders()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Time</p>
                <p className="text-xl font-bold text-purple-600">{Math.round(stats.avgDeliveryTime)}m</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <BellIcon className="h-8 w-8 text-emerald-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-xl font-bold text-emerald-600">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Orders</h2>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No orders found for the selected filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => {
              const progress = getOrderProgress(order);
              const statusInfo = statusConfig[order.status];
              const StatusIcon = statusInfo.icon;

              return (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <StatusIcon className="h-8 w-8 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {order.customer.name}
                          </span>
                          <span className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {order.customer.phone}
                          </span>
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatTimeAgo(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          ${order.pricing.total.toFixed(2)} JOD
                        </div>
                        <div className="text-sm text-gray-600">
                          Est: {getEstimatedDelivery(order)}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        <span className="font-medium">Delivery Address:</span>
                      </div>
                      <p className="text-gray-900">
                        {order.customer.address.street}, {order.customer.address.area}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <TruckIcon className="h-4 w-4 mr-1" />
                        <span className="font-medium">Provider:</span>
                      </div>
                      <p className="text-gray-900">{order.provider.name}</p>
                      {order.provider.driverPhone && (
                        <p className="text-gray-600">Driver: {order.provider.driverPhone}</p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                        <span className="font-medium">Restaurant:</span>
                      </div>
                      <p className="text-gray-900">{order.restaurant.branchName}</p>
                      <p className="text-gray-600">{order.restaurant.companyName}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

            <div className="space-y-4">
              {/* Timeline */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Order Timeline</h4>
                <div className="space-y-2">
                  {Object.entries(selectedOrder.timeline)
                    .filter(([key, value]) => value)
                    .map(([key, timestamp]) => (
                      <div key={key} className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                        <span className="text-gray-600 capitalize mr-2">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                        </span>
                        <span className="text-gray-900">
                          {new Date(timestamp as Date).toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)} JOD</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.pricing.subtotal.toFixed(2)} JOD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>${selectedOrder.pricing.deliveryFee.toFixed(2)} JOD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${selectedOrder.pricing.tax.toFixed(2)} JOD</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span>${selectedOrder.pricing.total.toFixed(2)} JOD</span>
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