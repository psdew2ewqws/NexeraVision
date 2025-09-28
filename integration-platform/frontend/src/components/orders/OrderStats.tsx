import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Clock,
  CheckCircle,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  Star,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStatsData {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  preparing_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_today: number;
  revenue_today: number;
  orders_yesterday?: number;
  revenue_yesterday?: number;
  provider_breakdown: {
    provider: string;
    orders: number;
    revenue: number;
    avg_delivery_time?: number;
  }[];
  hourly_trends?: {
    hour: number;
    orders: number;
    revenue: number;
  }[];
  top_items?: {
    name: string;
    orders: number;
    revenue: number;
  }[];
}

interface OrderStatsProps {
  data: OrderStatsData;
  isLoading?: boolean;
  showTrends?: boolean;
  compact?: boolean;
  className?: string;
}

export const OrderStats: React.FC<OrderStatsProps> = ({
  data,
  isLoading = false,
  showTrends = true,
  compact = false,
  className,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const ordersTrend = useMemo(() => {
    if (!data.orders_yesterday) return 0;
    return calculateTrend(data.orders_today, data.orders_yesterday);
  }, [data.orders_today, data.orders_yesterday]);

  const revenueTrend = useMemo(() => {
    if (!data.revenue_yesterday) return 0;
    return calculateTrend(data.revenue_today, data.revenue_yesterday);
  }, [data.revenue_today, data.revenue_yesterday]);

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return TrendingUp;
    if (trend < -5) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-green-600';
    if (trend < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProviderEmoji = (provider: string) => {
    const emojis: Record<string, string> = {
      careem: '🚗',
      talabat: '🍔',
      deliveroo: '🚴',
      uber_eats: '🍕',
      jahez: '🛵',
      hungerstation: '🍽️',
      noon_food: '🥘',
      mrsool: '📦',
      zomato: '🍛',
    };
    return emojis[provider] || '🍕';
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const mainStats = [
    {
      title: 'Total Orders',
      value: data.total_orders.toLocaleString(),
      subtitle: `${data.orders_today} today`,
      icon: ShoppingCart,
      trend: ordersTrend,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Revenue',
      value: formatCurrency(data.total_revenue),
      subtitle: `${formatCurrency(data.revenue_today)} today`,
      icon: DollarSign,
      trend: revenueTrend,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(data.average_order_value),
      subtitle: 'Per order',
      icon: Star,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Completion Rate',
      value: `${((data.completed_orders / data.total_orders) * 100).toFixed(1)}%`,
      subtitle: `${data.completed_orders} delivered`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  if (compact) {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
        {mainStats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend ? getTrendIcon(stat.trend) : null;

          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">{stat.title}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  {stat.trend !== undefined && TrendIcon && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendIcon className={cn('h-3 w-3', getTrendColor(stat.trend))} />
                      <span className={cn('text-xs', getTrendColor(stat.trend))}>
                        {formatPercentage(stat.trend)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend ? getTrendIcon(stat.trend) : null;

          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                  <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                    <Icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{stat.subtitle}</span>
                    {stat.trend !== undefined && TrendIcon && showTrends && (
                      <div className="flex items-center gap-1">
                        <TrendIcon className={cn('h-4 w-4', getTrendColor(stat.trend))} />
                        <span className={cn('text-sm font-medium', getTrendColor(stat.trend))}>
                          {formatPercentage(stat.trend)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.pending_orders}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.confirmed_orders}</div>
              <div className="text-sm text-gray-500">Confirmed</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.preparing_orders}</div>
              <div className="text-sm text-gray-500">Preparing</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.completed_orders}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.cancelled_orders}</div>
              <div className="text-sm text-gray-500">Cancelled</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.total_orders}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Performance */}
      {data.provider_breakdown && data.provider_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.provider_breakdown.map((provider, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getProviderEmoji(provider.provider)}</span>
                      <div>
                        <h4 className="font-medium capitalize">{provider.provider.replace('_', ' ')}</h4>
                        <p className="text-sm text-gray-500">{provider.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(provider.revenue)}</div>
                      {provider.avg_delivery_time && (
                        <div className="text-sm text-gray-500">
                          {provider.avg_delivery_time}min avg
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(provider.orders / data.total_orders) * 100}%`,
                      }}
                    />
                  </div>

                  {index < data.provider_breakdown.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Items */}
      {data.top_items && data.top_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.top_items.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(item.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderStats;