'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardStats } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCartIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Total Orders',
      value: stats.total_orders.toLocaleString(),
      icon: ShoppingCartIcon,
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: 'Active Integrations',
      value: stats.active_integrations,
      icon: BuildingStorefrontIcon,
      status: stats.active_integrations > 0 ? 'active' : 'inactive',
    },
    {
      title: 'Pending Orders',
      value: stats.pending_orders,
      icon: ClockIcon,
      urgent: stats.pending_orders > 5,
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.revenue_today),
      icon: CurrencyDollarIcon,
      trend: '+8.2%',
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
            <card.icon className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">{card.value}</div>
            <div className="flex items-center space-x-2">
              {card.trend && (
                <Badge variant={card.trendUp ? 'success' : 'error'} className="text-xs">
                  {card.trend}
                </Badge>
              )}
              {card.status && (
                <Badge variant={card.status === 'active' ? 'success' : 'secondary'}>
                  {card.status}
                </Badge>
              )}
              {card.urgent && (
                <Badge variant="warning">
                  Attention needed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}