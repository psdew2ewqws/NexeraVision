'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderPerformance } from '@/types';
import { formatCurrency, getProviderColor, capitalize } from '@/lib/utils';

interface ProviderPerformanceProps {
  data: ProviderPerformance[];
  loading: boolean;
}

export default function ProviderPerformanceComponent({ data, loading }: ProviderPerformanceProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Performance</CardTitle>
          <CardDescription>Order volume and response times by delivery provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Performance</CardTitle>
          <CardDescription>Order volume and response times by delivery provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No provider data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Performance</CardTitle>
        <CardDescription>Order volume and response times by delivery provider</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((provider) => (
            <div key={provider.provider} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getProviderColor(provider.provider)}`}></div>
                <div>
                  <div className="font-medium text-gray-900">{capitalize(provider.provider)}</div>
                  <div className="text-sm text-gray-500">{provider.orders} orders</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{formatCurrency(provider.revenue)}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {provider.avg_response_time}ms
                  </Badge>
                  <Badge
                    variant={provider.error_rate < 5 ? 'success' : provider.error_rate < 10 ? 'warning' : 'error'}
                    className="text-xs"
                  >
                    {provider.error_rate.toFixed(1)}% errors
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}