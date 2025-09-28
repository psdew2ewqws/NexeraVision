import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, RefreshCw, TrendingUp, DollarSign, Clock, MapPin } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

import OrderVolumeChart from '../../src/features/analytics/components/OrderVolumeChart';
import RevenueBreakdown from '../../src/features/analytics/components/RevenueBreakdown';
import PerformanceMetrics from '../../src/features/analytics/components/PerformanceMetrics';
import HeatmapCalendar from '../../src/features/analytics/components/HeatmapCalendar';
import ProviderComparison from '../../src/features/analytics/components/ProviderComparison';
import { analyticsService } from '../../src/services/analytics.service';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface FilterOptions {
  dateRange: DateRange;
  branches: string[];
  providers: string[];
  orderTypes: string[];
}

const AnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      startDate: subDays(new Date(), 30),
      endDate: new Date()
    },
    branches: [],
    providers: [],
    orderTypes: []
  });

  const [isExporting, setIsExporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', 'dashboard', filters, refreshTrigger],
    queryFn: () => analyticsService.getAnalyticsData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['analytics', 'filter-options'],
    queryFn: () => analyticsService.getFilterOptions(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const handleDateRangeChange = (range: DateRange) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      const blob = await analyticsService.exportData(filters, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Analytics report exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to export analytics report');
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    refetch();
    toast.success('Analytics data refreshed');
  };

  const getQuickDateRange = (type: 'today' | 'week' | 'month' | 'quarter') => {
    const now = new Date();
    switch (type) {
      case 'today':
        return { startDate: now, endDate: now };
      case 'week':
        return { startDate: subDays(now, 7), endDate: now };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'quarter':
        return { startDate: subDays(now, 90), endDate: now };
      default:
        return filters.dateRange;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h2>
            <p className="text-red-600 mb-4">Unable to load analytics data. Please try again.</p>
            <button
              onClick={handleRefresh}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive analytics for orders, revenue, and performance
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Quick Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['today', 'week', 'month', 'quarter'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => handleDateRangeChange(getQuickDateRange(period))}
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors capitalize"
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={format(filters.dateRange.startDate, 'yyyy-MM-dd')}
                  onChange={(e) => handleDateRangeChange({
                    ...filters.dateRange,
                    startDate: new Date(e.target.value)
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={format(filters.dateRange.endDate, 'yyyy-MM-dd')}
                  onChange={(e) => handleDateRangeChange({
                    ...filters.dateRange,
                    endDate: new Date(e.target.value)
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branches
              </label>
              <select
                multiple
                value={filters.branches}
                onChange={(e) => handleFilterChange('branches', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filterOptions?.branches?.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Providers
              </label>
              <select
                multiple
                value={filters.providers}
                onChange={(e) => handleFilterChange('providers', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filterOptions?.providers?.map((provider: any) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <PerformanceMetrics data={analyticsData?.metrics} isLoading={isLoading} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Volume Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Order Volume Trends</h3>
            </div>
            <OrderVolumeChart data={analyticsData?.orderVolume} isLoading={isLoading} />
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
            </div>
            <RevenueBreakdown data={analyticsData?.revenue} isLoading={isLoading} />
          </div>
        </div>

        {/* Provider Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Provider Performance Comparison</h3>
          </div>
          <ProviderComparison data={analyticsData?.providerComparison} isLoading={isLoading} />
        </div>

        {/* Heatmap Calendar */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Order Density Heatmap</h3>
          </div>
          <HeatmapCalendar data={analyticsData?.heatmapData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;