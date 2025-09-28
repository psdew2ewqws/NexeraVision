import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity
} from 'lucide-react';

// Types
interface ProviderMetric {
  providerId: string;
  providerName: string;
  platform: 'careem' | 'talabat' | 'dhub' | 'jahez' | 'deliveroo';
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  metrics: {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    cancelledOrders: number;
    successRate: number;
    averageDeliveryTime: number; // in minutes
    averageResponseTime: number; // in milliseconds
    revenue: number;
    commission: number;
    uptime: number; // percentage
  };
  recentPerformance: {
    timestamp: string;
    successRate: number;
    deliveryTime: number;
    responseTime: number;
    orderCount: number;
  }[];
  alerts: {
    id: string;
    type: 'performance' | 'availability' | 'error_rate' | 'response_time';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }[];
}

interface ProviderMetricsProps {
  companyId: string;
  branchId?: string;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
}

// Custom hook for real-time provider metrics
const useProviderMetrics = (companyId: string, branchId?: string, timeRange: string = '24h') => {
  const [metrics, setMetrics] = useState<ProviderMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const url = `/api/analytics/provider-metrics?companyId=${companyId}&timeRange=${timeRange}${branchId ? `&branchId=${branchId}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch provider metrics');
        }

        const data = await response.json();
        setMetrics(data.metrics);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Set up WebSocket for real-time updates
    const wsUrl = `ws://localhost:3001/analytics/provider-metrics?companyId=${companyId}${branchId ? `&branchId=${branchId}` : ''}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'METRICS_UPDATE') {
        setMetrics(prev => prev.map(metric =>
          metric.providerId === data.providerId
            ? { ...metric, ...data.updates }
            : metric
        ));
        setLastUpdated(new Date());
      }
    };

    return () => {
      ws.close();
    };
  }, [companyId, branchId, timeRange]);

  return { metrics, loading, error, lastUpdated, refetch: () => window.location.reload() };
};

// Platform indicator
const PlatformIndicator: React.FC<{ platform: ProviderMetric['platform'] }> = ({ platform }) => {
  const platformConfig = {
    careem: { label: 'Careem', color: 'bg-green-500', icon: '🚗' },
    talabat: { label: 'Talabat', color: 'bg-orange-500', icon: '🍽️' },
    dhub: { label: 'DHub', color: 'bg-blue-500', icon: '📦' },
    jahez: { label: 'Jahez', color: 'bg-purple-500', icon: '🥪' },
    deliveroo: { label: 'Deliveroo', color: 'bg-teal-500', icon: '🛵' }
  };

  const config = platformConfig[platform];

  return (
    <Badge className={`${config.color} text-white`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

// Status indicator
const StatusIndicator: React.FC<{ status: ProviderMetric['status'] }> = ({ status }) => {
  const statusConfig = {
    active: { label: 'Active', color: 'text-green-600', icon: CheckCircle },
    inactive: { label: 'Inactive', color: 'text-gray-500', icon: XCircle },
    maintenance: { label: 'Maintenance', color: 'text-yellow-600', icon: AlertTriangle },
    error: { label: 'Error', color: 'text-red-600', icon: XCircle }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center space-x-1 ${config.color}`}>
      <IconComponent className="w-4 h-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

// Metric card component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  format?: 'number' | 'percentage' | 'currency' | 'time';
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ title, value, change, format = 'number', icon: Icon }) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'time':
        return val >= 60 ? `${Math.floor(val / 60)}h ${val % 60}m` : `${val}m`;
      default:
        return val.toLocaleString();
    }
  };

  const changeColor = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-gray-500';
  const ChangeIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{formatValue(value)}</p>
            {change !== undefined && (
              <div className={`flex items-center space-x-1 text-sm ${changeColor}`}>
                {ChangeIcon && <ChangeIcon className="w-3 h-3" />}
                <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          {Icon && <Icon className="w-8 h-8 text-gray-400" />}
        </div>
      </CardContent>
    </Card>
  );
};

// Provider performance chart
const ProviderPerformanceChart: React.FC<{
  data: ProviderMetric['recentPerformance'];
  metric: 'successRate' | 'deliveryTime' | 'responseTime' | 'orderCount';
}> = ({ data, metric }) => {
  const chartData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    value: point[metric]
  }));

  const formatValue = (value: number) => {
    switch (metric) {
      case 'successRate':
        return `${value.toFixed(1)}%`;
      case 'deliveryTime':
        return `${value}min`;
      case 'responseTime':
        return `${value}ms`;
      default:
        return value.toString();
    }
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis tickFormatter={formatValue} />
        <Tooltip formatter={formatValue} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Provider comparison chart
const ProviderComparisonChart: React.FC<{ metrics: ProviderMetric[] }> = ({ metrics }) => {
  const data = metrics.map(metric => ({
    name: metric.providerName,
    successRate: metric.metrics.successRate,
    deliveryTime: metric.metrics.averageDeliveryTime,
    responseTime: metric.metrics.averageResponseTime,
    revenue: metric.metrics.revenue
  }));

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Success Rate Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="successRate" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="revenue"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Alert panel
const AlertPanel: React.FC<{ alerts: ProviderMetric['alerts']; onAcknowledge: (alertId: string) => void }> = ({
  alerts,
  onAcknowledge
}) => {
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  if (unacknowledgedAlerts.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
        Active Alerts ({unacknowledgedAlerts.length})
      </h3>

      {unacknowledgedAlerts.map(alert => (
        <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAcknowledge(alert.id)}
                className="ml-2"
              >
                Acknowledge
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

// Individual provider card
const ProviderCard: React.FC<{
  metric: ProviderMetric;
  onAcknowledgeAlert: (providerId: string, alertId: string) => void
}> = ({ metric, onAcknowledgeAlert }) => {
  const [expandedSection, setExpandedSection] = useState<'performance' | 'alerts' | null>(null);

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <CardTitle className="text-lg">{metric.providerName}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <PlatformIndicator platform={metric.platform} />
                <StatusIndicator status={metric.status} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {metric.metrics.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Total Orders"
            value={metric.metrics.totalOrders}
            icon={Activity}
          />
          <MetricCard
            title="Avg Delivery"
            value={metric.metrics.averageDeliveryTime}
            format="time"
            icon={Clock}
          />
          <MetricCard
            title="Revenue"
            value={metric.metrics.revenue}
            format="currency"
            icon={TrendingUp}
          />
          <MetricCard
            title="Uptime"
            value={metric.metrics.uptime}
            format="percentage"
            icon={CheckCircle}
          />
        </div>

        {/* Alerts Summary */}
        {metric.alerts.filter(a => !a.acknowledged).length > 0 && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {metric.alerts.filter(a => !a.acknowledged).length} unacknowledged alerts
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedSection(expandedSection === 'alerts' ? null : 'alerts')}
                >
                  {expandedSection === 'alerts' ? 'Hide' : 'Show'} Alerts
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Expanded Alerts */}
        {expandedSection === 'alerts' && (
          <AlertPanel
            alerts={metric.alerts}
            onAcknowledge={(alertId) => onAcknowledgeAlert(metric.providerId, alertId)}
          />
        )}

        {/* Performance Chart Toggle */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedSection(expandedSection === 'performance' ? null : 'performance')}
          >
            {expandedSection === 'performance' ? 'Hide' : 'Show'} Performance Chart
          </Button>
        </div>

        {/* Performance Chart */}
        {expandedSection === 'performance' && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Success Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProviderPerformanceChart
                    data={metric.recentPerformance}
                    metric="successRate"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Delivery Time Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProviderPerformanceChart
                    data={metric.recentPerformance}
                    metric="deliveryTime"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main component
const ProviderMetrics: React.FC<ProviderMetricsProps> = ({ companyId, branchId, timeRange }) => {
  const { metrics, loading, error, lastUpdated, refetch } = useProviderMetrics(companyId, branchId, timeRange);
  const [viewMode, setViewMode] = useState<'cards' | 'comparison'>('cards');

  const handleAcknowledgeAlert = async (providerId: string, alertId: string) => {
    try {
      await fetch(`/api/analytics/provider-metrics/${providerId}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });

      // The WebSocket will handle the real-time update
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading provider metrics: {error}
          <Button size="sm" onClick={refetch} className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const overallStats = {
    totalProviders: metrics.length,
    activeProviders: metrics.filter(m => m.status === 'active').length,
    totalOrders: metrics.reduce((sum, m) => sum + m.metrics.totalOrders, 0),
    avgSuccessRate: metrics.reduce((sum, m) => sum + m.metrics.successRate, 0) / metrics.length,
    totalRevenue: metrics.reduce((sum, m) => sum + m.metrics.revenue, 0),
    totalAlerts: metrics.reduce((sum, m) => sum + m.alerts.filter(a => !a.acknowledged).length, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Performance Metrics</h1>
          <p className="text-gray-600">
            Monitor delivery provider performance and system health
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'comparison')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">Card View</SelectItem>
              <SelectItem value="comparison">Comparison View</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <MetricCard title="Providers" value={overallStats.totalProviders} icon={Activity} />
        <MetricCard title="Active" value={overallStats.activeProviders} icon={CheckCircle} />
        <MetricCard title="Orders" value={overallStats.totalOrders} icon={TrendingUp} />
        <MetricCard title="Avg Success" value={overallStats.avgSuccessRate} format="percentage" />
        <MetricCard title="Revenue" value={overallStats.totalRevenue} format="currency" />
        <MetricCard
          title="Alerts"
          value={overallStats.totalAlerts}
          icon={AlertTriangle}
        />
      </div>

      {/* Main Content */}
      {viewMode === 'comparison' ? (
        <ProviderComparisonChart metrics={metrics} />
      ) : (
        <div className="space-y-4">
          {metrics.map(metric => (
            <ProviderCard
              key={metric.providerId}
              metric={metric}
              onAcknowledgeAlert={handleAcknowledgeAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderMetrics;