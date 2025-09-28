import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useOperations } from '../contexts/OperationsContext';

interface BranchMetrics {
  branchId: string;
  branchName: string;
  companyName: string;
  todayStats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    revenue: number;
    avgDeliveryTime: number;
    customerRating: number;
    peakHour: {
      hour: number;
      orderCount: number;
    };
  };
  weeklyStats: {
    totalOrders: number;
    revenue: number;
    avgDailyOrders: number;
    growthRate: number;
  };
  performance: {
    efficiency: number;
    onTimeDelivery: number;
    customerSatisfaction: number;
    orderAccuracy: number;
  };
  trends: {
    ordersChange: number;
    revenueChange: number;
    ratingChange: number;
  };
  topProviders: {
    provider: string;
    orders: number;
    rating: number;
    avgTime: number;
  }[];
  alerts: {
    type: 'info' | 'warning' | 'error';
    message: string;
  }[];
}

interface BranchPerformanceCardProps {
  branchId?: string;
  companyId?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function BranchPerformanceCard({ branchId, companyId, size = 'medium' }: BranchPerformanceCardProps) {
  const { user } = useAuth();
  const { addAlert, isConnected } = useOperations();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || 'all');

  // Fetch branch performance data
  const { data: metrics, isLoading, isError, refetch } = useQuery<BranchMetrics[]>({
    queryKey: ['branch-performance', selectedBranch, companyId, selectedTimeframe],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();

        if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
        if (companyId) params.append('companyId', companyId);
        params.append('timeframe', selectedTimeframe);

        const response = await axios.get(
          `${API_BASE_URL}/analytics/branch-performance?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        return response.data;
      } catch (error) {
        // Mock data for development
        return [
          {
            branchId: 'branch-1',
            branchName: 'Downtown Branch',
            companyName: 'Test Restaurant',
            todayStats: {
              totalOrders: 145,
              completedOrders: 132,
              cancelledOrders: 8,
              revenue: 2850.75,
              avgDeliveryTime: 28,
              customerRating: 4.6,
              peakHour: { hour: 19, orderCount: 35 }
            },
            weeklyStats: {
              totalOrders: 980,
              revenue: 19420.50,
              avgDailyOrders: 140,
              growthRate: 12.5
            },
            performance: {
              efficiency: 91,
              onTimeDelivery: 87,
              customerSatisfaction: 92,
              orderAccuracy: 96
            },
            trends: {
              ordersChange: 8.3,
              revenueChange: 12.1,
              ratingChange: 0.2
            },
            topProviders: [
              { provider: 'Careem', orders: 85, rating: 4.5, avgTime: 25 },
              { provider: 'Talabat', orders: 47, rating: 4.3, avgTime: 32 }
            ],
            alerts: [
              { type: 'warning', message: 'Peak hour delivery time exceeding target' },
              { type: 'info', message: 'Customer satisfaction improved by 5% this week' }
            ]
          }
        ];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3
  });

  // Get branches for dropdown (if user can see multiple branches)
  const { data: branches = [] } = useQuery<Array<{id: string, name: string}>>({
    queryKey: ['branches-list', companyId],
    queryFn: async () => {
      if (user?.role === 'branch_manager') return [];

      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (companyId) params.append('companyId', companyId);

        const response = await axios.get(
          `${API_BASE_URL}/branches/list?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
      } catch (error) {
        return [];
      }
    },
    enabled: user?.role !== 'branch_manager'
  });

  // Add alerts for performance issues
  useEffect(() => {
    if (metrics && metrics.length > 0) {
      metrics.forEach(metric => {
        if (metric.performance.onTimeDelivery < 85) {
          addAlert({
            type: 'warning',
            title: 'Performance Alert',
            message: `${metric.branchName}: On-time delivery rate below 85%`,
            read: false,
            source: 'system',
            branchId: metric.branchId
          });
        }
        if (metric.todayStats.customerRating < 4.0) {
          addAlert({
            type: 'error',
            title: 'Customer Satisfaction Alert',
            message: `${metric.branchName}: Customer rating below 4.0`,
            read: false,
            source: 'system',
            branchId: metric.branchId
          });
        }
      });
    }
  }, [metrics, addAlert]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError || !metrics || metrics.length === 0) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Unable to load branch performance data</p>
      </div>
    );
  }

  const primaryMetric = metrics[0]; // Use first branch or aggregated data

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {primaryMetric.branchName}
            </h3>
            <p className="text-sm text-gray-600">{primaryMetric.companyName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">
                {selectedTimeframe === 'today' ? primaryMetric.todayStats.totalOrders : primaryMetric.weeklyStats.totalOrders}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2 text-sm">
            {getTrendIcon(primaryMetric.trends.ordersChange)}
            <span className="ml-1 text-gray-600">
              {formatPercentage(primaryMetric.trends.ordersChange)} vs last period
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Revenue</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(selectedTimeframe === 'today' ? primaryMetric.todayStats.revenue : primaryMetric.weeklyStats.revenue)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex items-center mt-2 text-sm">
            {getTrendIcon(primaryMetric.trends.revenueChange)}
            <span className="ml-1 text-gray-600">
              {formatPercentage(primaryMetric.trends.revenueChange)} vs last period
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Avg Delivery</p>
              <p className="text-2xl font-bold text-purple-900">
                {primaryMetric.todayStats.avgDeliveryTime}m
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2 text-sm">
            <span className={`${getPerformanceColor(40 - primaryMetric.todayStats.avgDeliveryTime, { good: 10, warning: 5 })}`}>
              {primaryMetric.todayStats.avgDeliveryTime <= 30 ? 'On Target' : 'Above Target'}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Rating</p>
              <p className="text-2xl font-bold text-yellow-900">
                {primaryMetric.todayStats.customerRating.toFixed(1)}
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="flex items-center mt-2 text-sm">
            {getTrendIcon(primaryMetric.trends.ratingChange)}
            <span className="ml-1 text-gray-600">
              {primaryMetric.trends.ratingChange >= 0 ? '+' : ''}{primaryMetric.trends.ratingChange.toFixed(1)} vs last period
            </span>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      {size !== 'small' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Indicators</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceColor(primaryMetric.performance.efficiency, { good: 90, warning: 80 })}`}>
                {formatPercentage(primaryMetric.performance.efficiency)}
              </div>
              <p className="text-sm text-gray-600">Efficiency</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${primaryMetric.performance.efficiency}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceColor(primaryMetric.performance.onTimeDelivery, { good: 90, warning: 80 })}`}>
                {formatPercentage(primaryMetric.performance.onTimeDelivery)}
              </div>
              <p className="text-sm text-gray-600">On-Time Delivery</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${primaryMetric.performance.onTimeDelivery}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceColor(primaryMetric.performance.customerSatisfaction, { good: 90, warning: 80 })}`}>
                {formatPercentage(primaryMetric.performance.customerSatisfaction)}
              </div>
              <p className="text-sm text-gray-600">Customer Satisfaction</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${primaryMetric.performance.customerSatisfaction}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceColor(primaryMetric.performance.orderAccuracy, { good: 95, warning: 90 })}`}>
                {formatPercentage(primaryMetric.performance.orderAccuracy)}
              </div>
              <p className="text-sm text-gray-600">Order Accuracy</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${primaryMetric.performance.orderAccuracy}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Providers & Alerts */}
      {size === 'large' || size === 'full' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Providers */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Delivery Providers</h4>
            <div className="space-y-3">
              {primaryMetric.topProviders.map((provider, index) => (
                <div key={provider.provider} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{provider.provider}</p>
                      <p className="text-sm text-gray-600">{provider.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{provider.avgTime}m avg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Branch Alerts</h4>
            <div className="space-y-3">
              {primaryMetric.alerts.length > 0 ? (
                primaryMetric.alerts.map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'error' ? 'bg-red-50 border-red-400' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {alert.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
                      {alert.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />}
                      {alert.type === 'info' && <CheckCircleIcon className="h-5 w-5 text-blue-500" />}
                      <p className="text-sm text-gray-900">{alert.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-gray-600">No alerts - everything looks good!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}