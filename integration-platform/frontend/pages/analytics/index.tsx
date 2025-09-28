import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import { MetricsChart } from '@/components/providers/MetricsChart';
import {
  ProviderAnalytics,
  DeliveryProvider,
  ApiResponse,
  DashboardStats,
  FilterOptions,
} from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  Activity,
  DollarSign,
  Clock,
  Users,
  Package,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

// Provider configurations for visualization
const PROVIDER_CONFIGS = {
  careem: { name: 'Careem Now', color: '#00C851', logo: '🚗' },
  talabat: { name: 'Talabat', color: '#FF8800', logo: '🍽️' },
  deliveroo: { name: 'Deliveroo', color: '#00D4AA', logo: '🦌' },
  uber_eats: { name: 'Uber Eats', color: '#000000', logo: '🚚' },
  jahez: { name: 'Jahez', color: '#FF0000', logo: '🥘' },
  hungerstation: { name: 'HungerStation', color: '#FFD700', logo: '🍕' },
  noon_food: { name: 'Noon Food', color: '#0066CC', logo: '🌙' },
  mrsool: { name: 'Mrsool', color: '#8B00FF', logo: '🛵' },
  zomato: { name: 'Zomato', color: '#CB202D', logo: '🍴' },
};

// API functions
const fetchAnalytics = async (filters: FilterOptions = {}): Promise<any> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v.toString()));
      } else {
        params.append(key, value.toString());
      }
    }
  });

  const response = await apiClient.get<ApiResponse<any>>(`/analytics?${params}`);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch analytics');
  }
  return response.data.data;
};

const fetchProviderAnalytics = async (providerId?: string): Promise<ProviderAnalytics[]> => {
  const url = providerId ? `/analytics/providers/${providerId}` : '/analytics/providers';
  const response = await apiClient.get<ApiResponse<ProviderAnalytics[]>>(url);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch provider analytics');
  }
  return response.data.data;
};

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch dashboard stats');
  }
  return response.data.data;
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{from?: Date; to?: Date}>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('orders');
  const [timeGranularity, setTimeGranularity] = useState<string>('day');

  const filters = useMemo(() => ({
    ...(dateRange.from && { date_from: format(dateRange.from, 'yyyy-MM-dd') }),
    ...(dateRange.to && { date_to: format(dateRange.to, 'yyyy-MM-dd') }),
    ...(selectedProvider !== 'all' && { providers: [selectedProvider as DeliveryProvider] }),
    granularity: timeGranularity,
  }), [dateRange, selectedProvider, timeGranularity]);

  // Data fetching
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => fetchAnalytics(filters),
    refetchInterval: 300000, // 5 minutes
  });

  const {
    data: providerAnalytics = [],
    isLoading: providersLoading,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ['provider-analytics', selectedProvider],
    queryFn: () => fetchProviderAnalytics(selectedProvider !== 'all' ? selectedProvider : undefined),
    refetchInterval: 300000,
  });

  const {
    data: dashboardStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 300000,
  });

  const isLoading = analyticsLoading || providersLoading || statsLoading;

  const handleRefresh = () => {
    refetchAnalytics();
    refetchProviders();
    refetchStats();
    toast.success('Analytics data refreshed');
  };

  const handleExport = () => {
    // Implementation for exporting analytics data
    toast.success('Exporting analytics data...');
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!analytics || !dashboardStats) return null;

    return {
      totalOrders: analytics.total_orders || 0,
      totalRevenue: analytics.total_revenue || 0,
      averageOrderValue: analytics.total_revenue / Math.max(analytics.total_orders, 1),
      conversionRate: (analytics.successful_orders / Math.max(analytics.total_orders, 1)) * 100,
      growthRate: analytics.growth_rate || 0,
    };
  }, [analytics, dashboardStats]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!analytics) return null;

    return {
      orderTrends: analytics.order_trends || [],
      revenueTrends: analytics.revenue_trends || [],
      providerComparison: providerAnalytics.map(provider => ({
        name: PROVIDER_CONFIGS[provider.provider]?.name || provider.provider,
        provider: provider.provider,
        orders: provider.orders_by_hour?.reduce((sum, h) => sum + h.orders, 0) || 0,
        revenue: provider.revenue_by_day?.reduce((sum, d) => sum + d.revenue, 0) || 0,
        success_rate: provider.success_rate * 100,
        avg_delivery_time: provider.avg_delivery_time,
        color: PROVIDER_CONFIGS[provider.provider]?.color || '#8884d8',
      })),
      hourlyDistribution: analytics.hourly_orders || [],
      statusDistribution: analytics.status_distribution || [],
    };
  }, [analytics, providerAnalytics]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive performance analytics across all delivery providers
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <DatePickerWithRange
                  date={dateRange}
                  setDate={setDateRange}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Provider</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.logo} {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Time Granularity</label>
                <Select value={timeGranularity} onValueChange={setTimeGranularity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hourly</SelectItem>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Primary Metric</label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="success_rate">Success Rate</SelectItem>
                    <SelectItem value="delivery_time">Delivery Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalOrders.toLocaleString()}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {kpis.growthRate >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  {Math.abs(kpis.growthRate).toFixed(1)}% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  12.5% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.averageOrderValue)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  3.2% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(kpis.conversionRate)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  1.8% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {providerAnalytics.length > 0
                    ? Math.round(
                        providerAnalytics.reduce((sum, p) => sum + p.avg_delivery_time, 0) /
                        providerAnalytics.length
                      )
                    : 0}min
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                  2.1 min faster
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Orders Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Orders Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData?.orderTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData?.revenueTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#82ca9d"
                          strokeWidth={3}
                          dot={{ fill: '#82ca9d', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData?.statusDistribution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.status}: ${entry.count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(chartData?.statusDistribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Hourly Order Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Orders by Hour</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData?.hourlyDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(hour) => `${hour}:00`}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(hour) => `Hour: ${hour}:00`}
                          formatter={(value) => [value, 'Orders']}
                        />
                        <Bar dataKey="orders" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            {/* Provider Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData?.providerComparison || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="success_rate"
                        stroke="#ff7300"
                        strokeWidth={2}
                        name="Success Rate (%)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Provider Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providerAnalytics.map((provider) => {
                const config = PROVIDER_CONFIGS[provider.provider];
                return (
                  <Card key={provider.provider}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <span className="text-xl">{config?.logo}</span>
                        <span>{config?.name || provider.provider}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Orders:</span>
                        <span className="font-medium">
                          {provider.orders_by_hour?.reduce((sum, h) => sum + h.orders, 0) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            provider.revenue_by_day?.reduce((sum, d) => sum + d.revenue, 0) || 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Success Rate:</span>
                        <Badge variant="default">
                          {formatPercentage(provider.success_rate)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Delivery:</span>
                        <span className="font-medium">{provider.avg_delivery_time} min</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Top Items:</span>
                        <div className="mt-1 space-y-1">
                          {provider.popular_items?.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{item.name}</span>
                              <span>{item.orders} orders</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <MetricsChart
              data={chartData || {}}
              title="Comprehensive Trends Analysis"
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance metrics and detailed analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Times by Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData?.providerComparison || []} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value) => [`${value} min`, 'Delivery Time']} />
                        <Bar dataKey="avg_delivery_time" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Orders Correlation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData?.providerComparison || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#82ca9d"
                          strokeWidth={2}
                          name="Revenue ($)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <span>Top Performers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {chartData?.providerComparison
                    ?.sort((a, b) => b.orders - a.orders)
                    .slice(0, 3)
                    .map((provider, index) => (
                      <div key={provider.provider} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            #{index + 1}
                          </Badge>
                          <span>{provider.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {provider.orders} orders
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>Areas for Improvement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {chartData?.providerComparison
                    ?.sort((a, b) => a.success_rate - b.success_rate)
                    .slice(0, 3)
                    .map((provider, index) => (
                      <div key={provider.provider} className="flex items-center justify-between p-3 bg-red-50 rounded">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span>{provider.name}</span>
                        </div>
                        <div className="text-sm text-red-600">
                          {formatPercentage(provider.success_rate)} success rate
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            {/* Key insights and recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Growth Opportunity</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Peak hours are 6-8 PM. Consider promotions during off-peak hours to balance load and increase overall orders.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Delivery Optimization</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average delivery time varies significantly by provider. Focus on partnering with faster providers during peak hours.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Revenue Insights</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Higher-priced providers show better success rates. Consider adjusting pricing strategy to improve margins while maintaining volume.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Market Focus</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Top-performing providers should receive priority support and marketing focus to maximize ROI and customer satisfaction.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    
  );
}