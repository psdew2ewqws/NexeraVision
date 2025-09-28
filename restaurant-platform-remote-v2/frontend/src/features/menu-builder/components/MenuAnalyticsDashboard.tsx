// Menu Analytics Dashboard - Business intelligence for platform-specific menus
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowTrendingDownIcon as TrendingDownIcon,
  EyeIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  FunnelIcon as FilterIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import { Platform, PlatformMenu, MenuAnalytics } from '../../../types/menu-builder';
import { formatCurrency, getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';

interface MenuAnalyticsDashboardProps {
  platform: Platform;
  menu?: PlatformMenu;
  className?: string;
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 3 months', value: '90d', days: 90 },
  { label: 'This year', value: '1y', days: 365 }
];

// Mock analytics data
const generateMockAnalytics = (platform: Platform, days: number): MenuAnalytics => {
  const baseMetrics = {
    call_center: { views: 1200, orders: 340, revenue: 8500 },
    talabat: { views: 2800, orders: 520, revenue: 12400 },
    careem: { views: 2100, orders: 380, revenue: 9800 },
    website: { views: 5400, orders: 720, revenue: 18200 },
    pos: { views: 3200, orders: 890, revenue: 22100 }
  };

  const base = baseMetrics[platform.id as keyof typeof baseMetrics] || baseMetrics.website;
  const multiplier = days / 30; // Scale based on time range

  return {
    platformId: platform.id,
    menuId: 'current-menu',
    metrics: {
      views: Math.round(base.views * multiplier),
      orders: Math.round(base.orders * multiplier),
      revenue: base.revenue * multiplier,
      topProducts: [
        { productId: '1', name: 'Margherita Pizza', orderCount: Math.round(45 * multiplier), revenue: 1350 * multiplier },
        { productId: '2', name: 'Chicken Burger', orderCount: Math.round(38 * multiplier), revenue: 1140 * multiplier },
        { productId: '3', name: 'Caesar Salad', orderCount: Math.round(32 * multiplier), revenue: 960 * multiplier },
        { productId: '4', name: 'Pasta Carbonara', orderCount: Math.round(28 * multiplier), revenue: 840 * multiplier },
        { productId: '5', name: 'Fish & Chips', orderCount: Math.round(25 * multiplier), revenue: 750 * multiplier }
      ],
      categoryPerformance: [
        { categoryId: '1', name: 'Main Courses', productCount: 12, orderCount: Math.round(180 * multiplier), conversionRate: 15.2 },
        { categoryId: '2', name: 'Appetizers', productCount: 8, orderCount: Math.round(95 * multiplier), conversionRate: 12.8 },
        { categoryId: '3', name: 'Beverages', productCount: 15, orderCount: Math.round(165 * multiplier), conversionRate: 22.5 },
        { categoryId: '4', name: 'Desserts', productCount: 6, orderCount: Math.round(45 * multiplier), conversionRate: 8.7 }
      ]
    },
    timeRange: {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  };
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  format?: 'currency' | 'number' | 'percentage';
}> = ({ title, value, change, changeLabel, icon: Icon, color = 'blue', format = 'number' }) => {
  const formattedValue = useMemo(() => {
    if (format === 'currency' && typeof value === 'number') {
      return formatCurrency(value);
    }
    if (format === 'percentage' && typeof value === 'number') {
      return `${value.toFixed(1)}%`;
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }, [value, format]);

  const changeColor = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-gray-500';
  const ChangeIcon = change && change > 0 ? TrendingUpIcon : change && change < 0 ? TrendingDownIcon : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        {change !== undefined && ChangeIcon && (
          <div className={`flex items-center space-x-1 ${changeColor}`}>
            <ChangeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
        {changeLabel && (
          <p className="text-xs text-gray-500 mt-1">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
};

// Top Products Table
const TopProductsTable: React.FC<{
  products: MenuAnalytics['metrics']['topProducts'];
}> = ({ products }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Top Performing Products</h3>
        <p className="text-sm text-gray-500 mt-1">Products with highest order volume</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg. Order Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => (
              <motion.tr
                key={product.productId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="hover:bg-gray-50"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm mr-3`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{getLocalizedText(product.name, 'en')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                  {product.orderCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                  {formatCurrency(product.revenue)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(product.revenue / product.orderCount)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Category Performance Chart
const CategoryPerformanceChart: React.FC<{
  categories: MenuAnalytics['metrics']['categoryPerformance'];
}> = ({ categories }) => {
  const maxOrders = Math.max(...categories.map(cat => cat.orderCount));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
        <p className="text-sm text-gray-500 mt-1">Order volume and conversion rates by category</p>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.categoryId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <h4 className="text-sm font-medium text-gray-900">{getLocalizedText(category.name, 'en')}</h4>
                <span className="text-xs text-gray-500">
                  {category.productCount} products
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="font-medium text-gray-900">
                  {category.orderCount.toLocaleString()} orders
                </span>
                <span className="text-gray-500">
                  {category.conversionRate}% conversion
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(category.orderCount / maxOrders) * 100}%` }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              />
            </div>

            {/* Conversion Rate Indicator */}
            <div className="flex justify-end mt-1">
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                category.conversionRate > 15
                  ? 'bg-green-100 text-green-800'
                  : category.conversionRate > 10
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                {category.conversionRate > 15 ? 'High' : category.conversionRate > 10 ? 'Medium' : 'Low'} conversion
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const MenuAnalyticsDashboard: React.FC<MenuAnalyticsDashboardProps> = ({
  platform,
  menu,
  className = ''
}) => {
  const { language } = useLanguage();
  const [selectedTimeRange, setSelectedTimeRange] = useState(TIME_RANGES[1]); // Default to 30 days
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<MenuAnalytics | null>(null);

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockData = generateMockAnalytics(platform, selectedTimeRange.days);
        setAnalytics(mockData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [platform, selectedTimeRange]);

  // Calculate conversion rate
  const conversionRate = useMemo(() => {
    if (!analytics) return 0;
    return analytics.metrics.views > 0 ? (analytics.metrics.orders / analytics.metrics.views) * 100 : 0;
  }, [analytics]);

  // Calculate average order value
  const avgOrderValue = useMemo(() => {
    if (!analytics) return 0;
    return analytics.metrics.orders > 0 ? analytics.metrics.revenue / analytics.metrics.orders : 0;
  }, [analytics]);

  if (loading || !analytics) {
    return (
      <div className={`menu-analytics-dashboard flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center">
          <RefreshIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`menu-analytics-dashboard h-full bg-gray-50 overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {platform.name} Analytics
            </h1>
            <p className="text-gray-500 mt-1">
              Performance insights for your {platform.name} menu
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <select
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = TIME_RANGES.find(r => r.value === e.target.value);
                if (range) setSelectedTimeRange(range);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>

            <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setAnalytics(generateMockAnalytics(platform, selectedTimeRange.days));
                  setLoading(false);
                }, 500);
              }}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Time Range Info */}
        <div className="text-sm text-gray-500">
          Data from {analytics.timeRange.start.toLocaleDateString()} to {analytics.timeRange.end.toLocaleDateString()}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Views"
            value={analytics.metrics.views}
            change={12.5}
            changeLabel="vs previous period"
            icon={EyeIcon}
            color="blue"
          />

          <MetricCard
            title="Total Orders"
            value={analytics.metrics.orders}
            change={8.3}
            changeLabel="vs previous period"
            icon={ShoppingCartIcon}
            color="green"
          />

          <MetricCard
            title="Total Revenue"
            value={analytics.metrics.revenue}
            change={15.7}
            changeLabel="vs previous period"
            icon={CurrencyDollarIcon}
            color="purple"
            format="currency"
          />

          <MetricCard
            title="Conversion Rate"
            value={conversionRate}
            change={-2.1}
            changeLabel="vs previous period"
            icon={TrendingUpIcon}
            color="orange"
            format="percentage"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Average Order Value"
            value={avgOrderValue}
            change={5.2}
            changeLabel="vs previous period"
            icon={ChartBarIcon}
            color="indigo"
            format="currency"
          />

          <MetricCard
            title="Menu Items"
            value={menu?.metadata.totalProducts || 0}
            icon={FilterIcon}
            color="gray"
          />

          <MetricCard
            title="Active Categories"
            value={menu?.metadata.categoryCount || 0}
            icon={CalendarIcon}
            color="teal"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <TopProductsTable products={analytics.metrics.topProducts} />

          {/* Category Performance */}
          <CategoryPerformanceChart categories={analytics.metrics.categoryPerformance} />
        </div>

        {/* Platform-specific Insights */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {platform.name} Insights
          </h3>

          <div className="space-y-4">
            {platform.id === 'talabat' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2">Delivery Optimization</h4>
                <p className="text-sm text-orange-800">
                  Your menu performs well during peak hours (7-9 PM). Consider promoting combo meals during lunch hours to increase average order value.
                </p>
              </div>
            )}

            {platform.id === 'call_center' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Phone Order Efficiency</h4>
                <p className="text-sm text-blue-800">
                  Popular items are being ordered quickly. Consider highlighting preparation times for complex items to manage customer expectations.
                </p>
              </div>
            )}

            {platform.id === 'website' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Online Engagement</h4>
                <p className="text-sm text-purple-800">
                  High view-to-order conversion rate suggests effective menu presentation. Consider A/B testing product descriptions for underperforming items.
                </p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Performance Summary</h4>
              <p className="text-sm text-green-800">
                {conversionRate > 15
                  ? 'Excellent conversion rate! Your menu is performing above industry average.'
                  : conversionRate > 10
                    ? 'Good conversion rate. There are opportunities to optimize underperforming categories.'
                    : 'Conversion rate needs improvement. Consider reviewing menu layout and product descriptions.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};