import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  RefreshCw,
  Edit,
  Printer,
  Share,
  MoreVertical,
  User,
  MapPin,
  Phone,
  Package,
  DollarSign,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

// Order components
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderCard } from '@/components/orders/OrderCard';

// Hooks
import { useOrder, useUpdateOrderStatus, useCancelOrder, useResyncOrder } from '@/hooks/useOrders';
import { useOrderUpdates, useDeliveryTracking } from '@/hooks/useOrderUpdates';

import { Order, OrderStatus, DeliveryProvider } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  // Queries
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useOrder(id);

  // Mutations
  const updateOrderStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const resyncOrder = useResyncOrder();

  // Real-time updates
  useOrderUpdates({
    onOrderUpdate: (event) => {
      if (event.order.id === id) {
        refetch();
      }
    },
  });

  useDeliveryTracking(id);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: newStatus,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleCancelOrder = async (reason: string) => {
    if (!order) return;

    try {
      await cancelOrder.mutateAsync({
        orderId: order.id,
        reason,
      });
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const handleResync = async () => {
    if (!order) return;

    try {
      await resyncOrder.mutateAsync(order.id);
    } catch (error) {
      console.error('Failed to resync order:', error);
    }
  };

  const getProviderConfig = (provider: DeliveryProvider) => {
    const configs = {
      careem: { name: 'Careem', color: 'bg-green-600', logo: '🚗' },
      talabat: { name: 'Talabat', color: 'bg-orange-600', logo: '🍔' },
      deliveroo: { name: 'Deliveroo', color: 'bg-teal-600', logo: '🚴' },
      uber_eats: { name: 'Uber Eats', color: 'bg-black', logo: '🍕' },
      jahez: { name: 'Jahez', color: 'bg-red-600', logo: '🛵' },
      hungerstation: { name: 'HungerStation', color: 'bg-purple-600', logo: '🍽️' },
      noon_food: { name: 'Noon Food', color: 'bg-blue-600', logo: '🥘' },
      mrsool: { name: 'Mrsool', color: 'bg-indigo-600', logo: '📦' },
      zomato: { name: 'Zomato', color: 'bg-red-500', logo: '🍛' },
    };

    return configs[provider] || { name: provider, color: 'bg-gray-600', logo: '🍕' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access order details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
          <p className="text-gray-500 mb-4">
            {error?.message || "The order you're looking for doesn't exist."}
          </p>
          <div className="space-x-2">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => router.push('/orders')}>
              View All Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const providerConfig = getProviderConfig(order.provider);

  return (
    <>
      <Head>
        <title>Order #{order.external_id || order.id.slice(-8)} | NEXARA Integration Platform</title>
        <meta name="description" content={`Order details for order #${order.external_id || order.id.slice(-8)}`} />
      </Head>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg text-white text-lg', providerConfig.color)}>
                  {providerConfig.logo}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Order #{order.external_id || order.id.slice(-8)}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{providerConfig.name}</Badge>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-gray-500 text-sm">
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResync}
              disabled={resyncOrder.isPending}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', resyncOrder.isPending && 'animate-spin')} />
              Resync
            </Button>

            {order.delivery_info.tracking_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={order.delivery_info.tracking_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Track
                </a>
              </Button>
            )}

            <Button onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Actions for Active Orders */}
        {['pending', 'confirmed', 'preparing', 'ready'].includes(order.status) && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>This order is active and may require your attention.</span>
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={updateOrderStatus.isPending}
                  >
                    Confirm Order
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate('preparing')}
                    disabled={updateOrderStatus.isPending}
                  >
                    Start Preparing
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate('ready')}
                    disabled={updateOrderStatus.isPending}
                  >
                    Mark Ready
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="customer">Customer Info</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Order Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <Badge variant="outline">{providerConfig.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-sm">{order.external_id || order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-sm">{formatDateTime(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="text-sm">{formatDateTime(order.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Delivery Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant="outline" className="capitalize">
                      {order.delivery_info.type}
                    </Badge>
                  </div>

                  {order.delivery_info.scheduled_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scheduled:</span>
                      <span className="text-sm">{formatDateTime(order.delivery_info.scheduled_time)}</span>
                    </div>
                  )}

                  {order.delivery_info.delivery_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivered:</span>
                      <span className="text-sm">{formatDateTime(order.delivery_info.delivery_time)}</span>
                    </div>
                  )}

                  {order.delivery_info.driver_name && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Driver</div>
                      <div className="text-sm">{order.delivery_info.driver_name}</div>
                      {order.delivery_info.driver_phone && (
                        <div className="text-sm text-gray-500">{order.delivery_info.driver_phone}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Totals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Order Total
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(order.totals.subtotal)}</span>
                  </div>
                  {order.totals.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span>{formatCurrency(order.totals.tax)}</span>
                    </div>
                  )}
                  {order.totals.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee:</span>
                      <span>{formatCurrency(order.totals.delivery_fee)}</span>
                    </div>
                  )}
                  {order.totals.service_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Fee:</span>
                      <span>{formatCurrency(order.totals.service_fee)}</span>
                    </div>
                  )}
                  {order.totals.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(order.totals.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(order.totals.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg font-medium">
                      {order.customer.name}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {order.customer.phone}
                    </div>
                  </div>
                  {order.customer.email && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        {order.customer.email}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Delivery Address</label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-medium">{order.customer.address.street}</div>
                        <div className="text-gray-600">
                          {order.customer.address.city}, {order.customer.address.area}
                        </div>
                        {(order.customer.address.building || order.customer.address.floor || order.customer.address.apartment) && (
                          <div className="text-sm text-gray-600">
                            {order.customer.address.building && `Building: ${order.customer.address.building}`}
                            {order.customer.address.floor && `, Floor: ${order.customer.address.floor}`}
                            {order.customer.address.apartment && `, Apt: ${order.customer.address.apartment}`}
                          </div>
                        )}
                        {order.customer.address.notes && (
                          <div className="text-sm text-gray-600 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <strong>Notes:</strong> {order.customer.address.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({order.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">{item.name}</h4>
                          <div className="text-sm text-gray-600 mt-1">
                            Quantity: {item.quantity} × {formatCurrency(item.price)}
                          </div>

                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Modifiers:</div>
                              <div className="space-y-1">
                                {item.modifiers.map((modifier, idx) => (
                                  <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                    <span>• {modifier.name} (×{modifier.quantity})</span>
                                    <span>{formatCurrency(modifier.price * modifier.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.special_instructions && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <div className="text-sm font-medium text-yellow-900 mb-1">Special Instructions:</div>
                              <div className="text-sm text-yellow-800">{item.special_instructions}</div>
                            </div>
                          )}
                        </div>

                        <div className="text-right ml-4">
                          <div className="text-xl font-bold">
                            {formatCurrency(
                              item.price * item.quantity +
                              (item.modifiers?.reduce((sum, mod) => sum + mod.price * mod.quantity, 0) || 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <OrderTimeline
              timeline={order.timeline}
              currentStatus={order.status}
              showRelativeTime={true}
              compact={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default OrderDetailPage;