import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  ShoppingCart,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

// Types
interface OrderAnalyticsData {
  timeSeriesData: {
    timestamp: string;
    totalOrders: number;
    revenue: number;
    avgOrderValue: number;
    conversionRate: number;
  }[];
  categoryBreakdown: {
    category: string;
    orders: number;
    revenue: number;
    percentage: number;
  }[];
  platformComparison: {
    platform: string;
    orders: number;
    revenue: number;
    growthRate: number;
    marketShare: number;
  }[];
  hourlyPatterns: {
    hour: number;
    orders: number;
    revenue: number;
    avgOrderValue: number;
  }[];
  weeklyPatterns: {
    day: string;
    orders: number;
    revenue: number;
    busyScore: number;
  }[];
  insights: {
    id: string;
    type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
    actionable: boolean;
  }[];
  kpis: {
    totalOrders: { value: number; change: number; period: string };
    totalRevenue: { value: number; change: number; period: string };
    avgOrderValue: { value: number; change: number; period: string };
    conversionRate: { value: number; change: number; period: string };
    topSellingCategory: { name: string; orders: number };
    peakHour: { hour: number; orders: number };
  };
}

interface OrderAnalyticsProps {
  companyId: string;
  branchId?: string;
}

// Custom hook for analytics data
const useOrderAnalytics = (companyId: string, branchId?: string, timeRange: string = '7d', refreshInterval: number = 300000) => {
  const [data, setData] = useState<OrderAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = `/api/analytics/orders?companyId=${companyId}&timeRange=${timeRange}${branchId ? `&branchId=${branchId}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const analyticsData = await response.json();
        setData(analyticsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up auto-refresh
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [companyId, branchId, timeRange, refreshInterval]);

  return { data, loading, error, refetch: () => window.location.reload() };
};

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string | number;
  change: number;
  period: string;
  icon: React.ComponentType<{ className?: string }>;
  format?: 'currency' | 'percentage' | 'number';
}> = ({ title, value, change, period, icon: Icon, format = 'number' }) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500';
  const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Activity;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-1">{formatValue(value)}</p>
            <div className={`flex items-center mt-2 text-sm ${changeColor}`}>
              <ChangeIcon className="w-4 h-4 mr-1" />
              <span>{change > 0 ? '+' : ''}{change.toFixed(1)}% vs {period}</span>
            </div>
          </div>
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
};

// Time Series Chart Component
const TimeSeriesChart: React.FC<{
  data: OrderAnalyticsData['timeSeriesData'];
  metric: 'totalOrders' | 'revenue' | 'avgOrderValue' | 'conversionRate';
  title: string;
}> = ({ data, metric, title }) => {
  const chartData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    value: point[metric]
  }));

  const formatValue = (value: number) => {
    switch (metric) {
      case 'revenue':
        return `$${value.toLocaleString()}`;
      case 'avgOrderValue':
        return `$${value.toFixed(2)}`;
      case 'conversionRate':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis tickFormatter={formatValue} />
            <Tooltip formatter={formatValue} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Platform Comparison Chart
const PlatformComparisonChart: React.FC<{
  data: OrderAnalyticsData['platformComparison'];
}> = ({ data }) => {
  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  const chartData = data.map((platform, index) => ({
    ...platform,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart - Orders by Platform */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart - Market Share */}
      <Card>
        <CardHeader>
          <CardTitle>Market Share</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="marketShare"
                nameKey="platform"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ platform, marketShare }) => `${platform} ${marketShare.toFixed(1)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Hourly Patterns Chart
const HourlyPatternsChart: React.FC<{
  data: OrderAnalyticsData['hourlyPatterns'];
}> = ({ data }) => {
  const chartData = data.map(point => ({
    hour: `${point.hour.toString().padStart(2, '0')}:00`,
    orders: point.orders,
    revenue: point.revenue,
    avgOrderValue: point.avgOrderValue
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Order Patterns</CardTitle>
        <p className="text-sm text-gray-600">Orders and revenue throughout the day</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" />
            <Line yAxisId="right" type="monotone" dataKey="avgOrderValue" stroke="#ef4444" strokeWidth={2} name="Avg Order Value" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Weekly Patterns Chart
const WeeklyPatternsChart: React.FC<{
  data: OrderAnalyticsData['weeklyPatterns'];
}> = ({ data }) => {
  const chartData = data.map(point => ({
    day: point.day.substring(0, 3), // Mon, Tue, etc.
    orders: point.orders,
    revenue: point.revenue,
    busyScore: point.busyScore
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Order Patterns</CardTitle>
        <p className="text-sm text-gray-600">Performance across days of the week</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.1}
            />
            <Area
              type="monotone"
              dataKey="busyScore"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Category Breakdown Component
const CategoryBreakdown: React.FC<{
  data: OrderAnalyticsData['categoryBreakdown'];
}> = ({ data }) => {
  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="percentage"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {data.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${category.revenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{category.orders} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// AI Insights Component
const AIInsights: React.FC<{
  insights: OrderAnalyticsData['insights'];
}> = ({ insights }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return TrendingUp;
      case 'warning': return AlertCircle;
      case 'trend': return BarChart3;
      case 'recommendation': return Lightbulb;
      default: return Activity;
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    if (type === 'warning') return 'border-orange-200 bg-orange-50';
    if (impact === 'high') return 'border-blue-200 bg-blue-50';
    if (impact === 'medium') return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="w-5 h-5 mr-2" />
          AI-Generated Insights
        </CardTitle>
        <p className="text-sm text-gray-600">Actionable recommendations based on your data</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map(insight => {
            const IconComponent = getInsightIcon(insight.type);

            return (
              <Alert key={insight.id} className={getInsightColor(insight.type, insight.impact)}>
                <div className="flex items-start space-x-3">
                  <IconComponent className="h-5 w-5 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={insight.impact === 'high' ? 'default' : 'secondary'}>
                          {insight.impact.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                    <AlertDescription>
                      {insight.description}
                      {insight.actionable && (
                        <div className="mt-2">
                          <Button size="sm" variant="outline">
                            Take Action
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
const OrderAnalytics: React.FC<OrderAnalyticsProps> = ({ companyId, branchId }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const { data, loading, error, refetch } = useOrderAnalytics(companyId, branchId, timeRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading analytics: {error}
          <Button size="sm" onClick={refetch} className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No analytics data available for the selected time range.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into your order performance</p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={refetch} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Orders"
          value={data.kpis.totalOrders.value}
          change={data.kpis.totalOrders.change}
          period={data.kpis.totalOrders.period}
          icon={ShoppingCart}
        />
        <KPICard
          title="Total Revenue"
          value={data.kpis.totalRevenue.value}
          change={data.kpis.totalRevenue.change}
          period={data.kpis.totalRevenue.period}
          icon={DollarSign}
          format="currency"
        />
        <KPICard
          title="Avg Order Value"
          value={data.kpis.avgOrderValue.value}
          change={data.kpis.avgOrderValue.change}
          period={data.kpis.avgOrderValue.period}
          icon={TrendingUp}
          format="currency"
        />
        <KPICard
          title="Conversion Rate"
          value={data.kpis.conversionRate.value}
          change={data.kpis.conversionRate.change}
          period={data.kpis.conversionRate.period}
          icon={Users}
          format="percentage"
        />
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeSeriesChart
              data={data.timeSeriesData}
              metric="totalOrders"
              title="Orders Over Time"
            />
            <TimeSeriesChart
              data={data.timeSeriesData}
              metric="revenue"
              title="Revenue Over Time"
            />
          </div>
          <CategoryBreakdown data={data.categoryBreakdown} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeSeriesChart
              data={data.timeSeriesData}
              metric="avgOrderValue"
              title="Average Order Value Trend"
            />
            <TimeSeriesChart
              data={data.timeSeriesData}
              metric="conversionRate"
              title="Conversion Rate Trend"
            />
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <PlatformComparisonChart data={data.platformComparison} />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <HourlyPatternsChart data={data.hourlyPatterns} />
          <WeeklyPatternsChart data={data.weeklyPatterns} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AIInsights insights={data.insights} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrderAnalytics;