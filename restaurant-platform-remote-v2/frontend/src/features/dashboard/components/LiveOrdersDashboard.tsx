import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Phone, DollarSign, RefreshCw } from 'lucide-react';

// Types
interface Order {
  id: string;
  orderNumber: string;
  platform: 'careem' | 'talabat' | 'direct' | 'whatsapp';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  items: OrderItem[];
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryTime?: string;
  branch: {
    id: string;
    name: string;
  };
  deliveryProvider?: {
    name: string;
    driverName?: string;
    driverPhone?: string;
  };
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: string[];
}

interface LiveOrdersDashboardProps {
  companyId: string;
  branchId?: string;
}

// WebSocket hook for real-time orders
const useRealTimeOrders = (companyId: string, branchId?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const wsUrl = `ws://localhost:3001/orders/live?companyId=${companyId}${branchId ? `&branchId=${branchId}` : ''}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'ORDERS_INITIAL':
          setOrders(data.orders);
          break;
        case 'ORDER_CREATED':
          setOrders(prev => [data.order, ...prev]);
          break;
        case 'ORDER_UPDATED':
          setOrders(prev => prev.map(order =>
            order.id === data.order.id ? data.order : order
          ));
          break;
        case 'ORDER_DELETED':
          setOrders(prev => prev.filter(order => order.id !== data.orderId));
          break;
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [companyId, branchId]);

  return { orders, connectionStatus };
};

// Platform indicator component
const PlatformIndicator: React.FC<{ platform: Order['platform'] }> = ({ platform }) => {
  const platformConfig = {
    careem: { label: 'Careem', color: 'bg-green-500', icon: '🚗' },
    talabat: { label: 'Talabat', color: 'bg-orange-500', icon: '🍽️' },
    direct: { label: 'Direct', color: 'bg-blue-500', icon: '📞' },
    whatsapp: { label: 'WhatsApp', color: 'bg-green-600', icon: '💬' }
  };

  const config = platformConfig[platform];

  return (
    <Badge className={`${config.color} text-white`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

// Order status badge
const OrderStatusBadge: React.FC<{ status: Order['status'] }> = ({ status }) => {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-500' },
    confirmed: { label: 'Confirmed', color: 'bg-blue-500' },
    preparing: { label: 'Preparing', color: 'bg-purple-500' },
    ready: { label: 'Ready', color: 'bg-green-500' },
    out_for_delivery: { label: 'Out for Delivery', color: 'bg-indigo-500' },
    delivered: { label: 'Delivered', color: 'bg-green-700' },
    cancelled: { label: 'Cancelled', color: 'bg-red-500' }
  };

  const config = statusConfig[status];

  return (
    <Badge className={`${config.color} text-white`}>
      {config.label}
    </Badge>
  );
};

// Order timeline component
const OrderTimeline: React.FC<{ order: Order }> = ({ order }) => {
  const timelineSteps = [
    { key: 'pending', label: 'Order Received', completed: true },
    { key: 'confirmed', label: 'Confirmed', completed: ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.status) },
    { key: 'preparing', label: 'Preparing', completed: ['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.status) },
    { key: 'ready', label: 'Ready', completed: ['ready', 'out_for_delivery', 'delivered'].includes(order.status) },
    { key: 'out_for_delivery', label: 'Out for Delivery', completed: ['out_for_delivery', 'delivered'].includes(order.status) },
    { key: 'delivered', label: 'Delivered', completed: order.status === 'delivered' }
  ];

  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
        <span className="text-sm">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {timelineSteps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className={`text-xs ${step.completed ? 'text-green-600' : 'text-gray-500'}`}>
              {step.label}
            </span>
          </div>
          {index < timelineSteps.length - 1 && (
            <div className={`w-4 h-0.5 ${step.completed && timelineSteps[index + 1].completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Individual order card
const OrderCard: React.FC<{ order: Order; onStatusUpdate: (orderId: string, newStatus: Order['status']) => void }> = ({
  order,
  onStatusUpdate
}) => {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / 60000);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ${diffInMinutes % 60}m ago`;
    }
  };

  const handleStatusChange = (newStatus: Order['status']) => {
    onStatusUpdate(order.id, newStatus);
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <CardTitle className="text-lg font-semibold">
                Order #{order.orderNumber}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <PlatformIndicator platform={order.platform} />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {order.currency} {order.total.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              {getTimeSince(order.createdAt)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <OrderTimeline order={order} />

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="w-4 h-4" />
              <span>{order.customerName}</span>
              <span className="text-gray-500">{order.customerPhone}</span>
            </div>

            {order.deliveryAddress && (
              <div className="flex items-start space-x-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span className="text-gray-600">{order.deliveryAddress}</span>
              </div>
            )}

            {order.estimatedDeliveryTime && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>ETA: {formatTime(order.estimatedDeliveryTime)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Branch:</span> {order.branch.name}
            </div>

            {order.deliveryProvider && (
              <div className="text-sm">
                <span className="font-medium">Driver:</span> {order.deliveryProvider.driverName || 'Assigned'}
                {order.deliveryProvider.driverPhone && (
                  <span className="text-gray-500 ml-1">({order.deliveryProvider.driverPhone})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-0 h-auto text-sm text-blue-600"
          >
            {expanded ? 'Hide' : 'Show'} Items ({order.items.length})
          </Button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-xs text-gray-500 ml-2">
                        {item.modifiers.join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="font-medium">
                    {order.currency} {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Update Actions */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="mt-4 flex space-x-2">
            {order.status === 'pending' && (
              <>
                <Button size="sm" onClick={() => handleStatusChange('confirmed')} className="bg-blue-500 hover:bg-blue-600">
                  Confirm
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleStatusChange('cancelled')}>
                  Cancel
                </Button>
              </>
            )}

            {order.status === 'confirmed' && (
              <Button size="sm" onClick={() => handleStatusChange('preparing')} className="bg-purple-500 hover:bg-purple-600">
                Start Preparing
              </Button>
            )}

            {order.status === 'preparing' && (
              <Button size="sm" onClick={() => handleStatusChange('ready')} className="bg-green-500 hover:bg-green-600">
                Ready for Pickup
              </Button>
            )}

            {order.status === 'ready' && (
              <Button size="sm" onClick={() => handleStatusChange('out_for_delivery')} className="bg-indigo-500 hover:bg-indigo-600">
                Out for Delivery
              </Button>
            )}

            {order.status === 'out_for_delivery' && (
              <Button size="sm" onClick={() => handleStatusChange('delivered')} className="bg-green-700 hover:bg-green-800">
                Mark Delivered
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main dashboard component
const LiveOrdersDashboard: React.FC<LiveOrdersDashboardProps> = ({ companyId, branchId }) => {
  const { orders, connectionStatus } = useRealTimeOrders(companyId, branchId);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState({
    platform: 'all',
    status: 'all',
    search: '',
    timeRange: '24h'
  });

  // Filter orders based on current filters
  useEffect(() => {
    let filtered = orders;

    // Platform filter
    if (filters.platform !== 'all') {
      filtered = filtered.filter(order => order.platform === filters.platform);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.customerPhone.includes(filters.search)
      );
    }

    // Time range filter
    const now = new Date();
    const timeRangeHours = {
      '1h': 1,
      '4h': 4,
      '12h': 12,
      '24h': 24,
      '7d': 168
    };

    const hoursBack = timeRangeHours[filters.timeRange as keyof typeof timeRangeHours] || 24;
    const cutoffTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));

    filtered = filtered.filter(order => new Date(order.createdAt) >= cutoffTime);

    setFilteredOrders(filtered);
  }, [orders, filters]);

  // Handle status updates
  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // The WebSocket will handle the real-time update
    } catch (error) {
      console.error('Error updating order status:', error);
      // TODO: Show error notification
    }
  };

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className={`flex items-center space-x-2 text-sm ${
      connectionStatus === 'connected' ? 'text-green-600' :
      connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-500' :
        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
      }`}></div>
      <span>{connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
      {connectionStatus === 'connected' && (
        <RefreshCw className="w-3 h-3 animate-spin" />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Orders Dashboard</h1>
          <p className="text-gray-600">Real-time order tracking and management</p>
        </div>
        <ConnectionIndicator />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Orders', value: filteredOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length, icon: Clock },
          { label: 'Pending', value: filteredOrders.filter(o => o.status === 'pending').length, icon: RefreshCw },
          { label: 'In Progress', value: filteredOrders.filter(o => ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length, icon: RefreshCw },
          { label: 'Total Revenue', value: `${filteredOrders[0]?.currency || 'USD'} ${filteredOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}`, icon: DollarSign },
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>
              <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="careem">Careem</SelectItem>
                  <SelectItem value="talabat">Talabat</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Time Range</label>
              <Select value={filters.timeRange} onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 Hour</SelectItem>
                  <SelectItem value="4h">Last 4 Hours</SelectItem>
                  <SelectItem value="12h">Last 12 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Search</label>
              <Input
                placeholder="Search by order number, customer name, or phone..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div>
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No orders found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveOrdersDashboard;