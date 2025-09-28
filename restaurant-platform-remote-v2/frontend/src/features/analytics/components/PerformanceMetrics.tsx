import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Clock,
  MapPin,
  Target,
  Users
} from 'lucide-react';
import { PerformanceMetrics as IPerformanceMetrics } from '../../../services/analytics.service';

interface PerformanceMetricsProps {
  data?: IPerformanceMetrics;
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
  suffix?: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  prefix = '',
  suffix = '',
  description
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {prefix}{formatValue(value)}{suffix}
            </p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        </div>

        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  data,
  isLoading = false
}) => {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <div className="text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No performance metrics available</p>
          <p className="text-sm">Data will appear once orders are processed</p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Orders',
      value: data.totalOrders,
      change: data.orderGrowth,
      icon: <ShoppingCart className="w-6 h-6 text-white" />,
      color: 'bg-blue-500',
      description: 'All orders in selected period'
    },
    {
      title: 'Total Revenue',
      value: data.totalRevenue,
      change: data.revenueGrowth,
      icon: <DollarSign className="w-6 h-6 text-white" />,
      color: 'bg-green-500',
      prefix: '$',
      description: 'Gross revenue before commissions'
    },
    {
      title: 'Average Order Value',
      value: data.averageOrderValue.toFixed(2),
      icon: <Target className="w-6 h-6 text-white" />,
      color: 'bg-purple-500',
      prefix: '$',
      description: 'Mean order value across all providers'
    },
    {
      title: 'Conversion Rate',
      value: data.conversionRate.toFixed(1),
      icon: <Users className="w-6 h-6 text-white" />,
      color: 'bg-orange-500',
      suffix: '%',
      description: 'Orders completed vs abandoned'
    },
    {
      title: 'Top Branch',
      value: data.topPerformingBranch || 'N/A',
      icon: <MapPin className="w-6 h-6 text-white" />,
      color: 'bg-indigo-500',
      description: 'Highest performing location'
    },
    {
      title: 'Peak Hours',
      value: data.peakHour || 'N/A',
      icon: <Clock className="w-6 h-6 text-white" />,
      color: 'bg-teal-500',
      description: 'Busiest time period'
    },
    {
      title: 'Order Growth',
      value: data.orderGrowth.toFixed(1),
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      color: data.orderGrowth >= 0 ? 'bg-green-500' : 'bg-red-500',
      suffix: '%',
      description: 'Compared to previous period'
    },
    {
      title: 'Revenue Growth',
      value: data.revenueGrowth.toFixed(1),
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      color: data.revenueGrowth >= 0 ? 'bg-green-500' : 'bg-red-500',
      suffix: '%',
      description: 'Compared to previous period'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
          <p className="text-gray-600">Key metrics and performance indicators</p>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Positive Growth</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Negative Growth</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
            color={metric.color}
            prefix={metric.prefix}
            suffix={metric.suffix}
            description={metric.description}
          />
        ))}
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Revenue Performance</p>
              <p className="text-gray-600">
                {data.revenueGrowth >= 0 ? (
                  `Revenue is growing by ${data.revenueGrowth.toFixed(1)}% compared to the previous period.`
                ) : (
                  `Revenue has declined by ${Math.abs(data.revenueGrowth).toFixed(1)}% compared to the previous period.`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Order Volume</p>
              <p className="text-gray-600">
                {data.orderGrowth >= 0 ? (
                  `Order volume increased by ${data.orderGrowth.toFixed(1)}% with ${data.totalOrders.toLocaleString()} total orders.`
                ) : (
                  `Order volume decreased by ${Math.abs(data.orderGrowth).toFixed(1)}% with ${data.totalOrders.toLocaleString()} total orders.`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Customer Behavior</p>
              <p className="text-gray-600">
                Average order value is ${data.averageOrderValue.toFixed(2)} with a {data.conversionRate.toFixed(1)}% conversion rate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;