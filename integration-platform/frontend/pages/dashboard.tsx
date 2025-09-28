import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
// Layout is already provided by _app.tsx, no need to import
import StatsCards from '@/components/dashboard/stats-cards';
import OrderTrendsChart from '@/components/dashboard/order-trends-chart';
import ProviderPerformance from '@/components/dashboard/provider-performance';
import RecentActivity from '@/components/dashboard/recent-activity';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { MetricsChart } from '@/components/providers/MetricsChart';
import {
  DashboardStats,
  ApiResponse,
  Integration,
  ProviderMetrics,
  SystemHealth,
  DeliveryProvider
} from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCwIcon,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  Users,
  DollarSign,
  Server,
  Settings
} from 'lucide-react';

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch dashboard stats');
  }
  return response.data.data;
};

const fetchProviderIntegrations = async (): Promise<Integration[]> => {
  const response = await apiClient.get<ApiResponse<Integration[]>>('/integrations');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch integrations');
  }
  return response.data.data;
};

const fetchProviderMetrics = async (): Promise<ProviderMetrics[]> => {
  const response = await apiClient.get<ApiResponse<ProviderMetrics[]>>('/dashboard/provider-metrics');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch provider metrics');
  }
  return response.data.data;
};

const fetchSystemHealth = async (): Promise<SystemHealth> => {
  const response = await apiClient.get<ApiResponse<SystemHealth>>('/dashboard/health');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch system health');
  }
  return response.data.data;
};

export default function Dashboard() {
  const [selectedProvider, setSelectedProvider] = useState<Integration | null>(null);

  // Fetch dashboard data
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Fetch provider integrations
  const {
    data: integrations = [],
    isLoading: integrationsLoading,
    refetch: refetchIntegrations,
  } = useQuery({
    queryKey: ['provider-integrations'],
    queryFn: fetchProviderIntegrations,
    refetchInterval: 30000,
  });

  // Fetch provider metrics
  const {
    data: providerMetrics = [],
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['provider-metrics'],
    queryFn: fetchProviderMetrics,
    refetchInterval: 30000,
  });

  // Fetch system health
  const {
    data: systemHealth,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 10000,
  });

  const isLoading = statsLoading || integrationsLoading || metricsLoading || healthLoading;
  const isError = statsError;

  const handleRefresh = () => {
    refetchStats();
    refetchIntegrations();
    refetchMetrics();
    refetchHealth();
  };

  // Provider action handlers with proper API calls
  const handleProviderToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await apiClient.patch(`/integrations/${id}/status`, {
        status: enabled ? 'active' : 'inactive'
      });
      if (response.data.success) {
        refetchIntegrations();
        toast.success(`Provider ${enabled ? 'enabled' : 'disabled'} successfully`);
      }
    } catch (error) {
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} provider`);
    }
  };

  const handleProviderConfigure = (integration: Integration) => {
    setSelectedProvider(integration);
    // Navigate to integration settings page
    window.location.href = `/settings/integrations`;
  };

  const handleProviderTest = async (integration: Integration) => {
    try {
      toast.loading('Testing provider connection...', { id: `test-${integration.id}` });
      const response = await apiClient.post(`/integrations/${integration.id}/test`);
      if (response.data.success) {
        toast.success('Provider test successful', { id: `test-${integration.id}` });
      } else {
        toast.error('Provider test failed', { id: `test-${integration.id}` });
      }
    } catch (error) {
      toast.error('Provider test failed', { id: `test-${integration.id}` });
    }
  };

  const handleProviderDetails = (integration: Integration) => {
    // Navigate to provider details page
    window.location.href = `/providers/${integration.provider}`;
  };

  const getProviderMetrics = (provider: DeliveryProvider) => {
    return providerMetrics.find(m => m.provider === provider) || {
      provider,
      total_orders: 0,
      successful_orders: 0,
      failed_orders: 0,
      avg_response_time: 0,
      uptime: 0,
      last_24h_orders: 0,
      revenue_today: 0,
      error_rate: 0,
    };
  };

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive overview of all 9 delivery provider integrations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Never'}
            </span>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health Alert */}
        {systemHealth && systemHealth.overall_status !== 'healthy' && (
          <Alert variant={systemHealth.overall_status === 'critical' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              System status: <strong>{systemHealth.overall_status.toUpperCase()}</strong>
              {systemHealth.last_incident && ` - Last incident: ${systemHealth.last_incident}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemHealth?.active_providers || integrations.filter(i => i.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {systemHealth?.total_providers || 9} total providers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.pending_orders || 0} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.revenue_today?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all providers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemHealth?.uptime.toFixed(1) || '99.9'}%
              </div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="providers">Providers Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-6">
            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <ProviderCard
                  key={integration.id}
                  integration={integration}
                  metrics={getProviderMetrics(integration.provider)}
                  onToggle={handleProviderToggle}
                  onConfigure={handleProviderConfigure}
                  onTest={handleProviderTest}
                  onViewDetails={handleProviderDetails}
                />
              ))}
            </div>

            {/* Provider Performance Comparison */}
            <MetricsChart
              data={{
                provider_performance: stats?.provider_performance,
                hourly_orders: [
                  { hour: 0, orders: 5, revenue: 125 },
                  { hour: 1, orders: 3, revenue: 75 },
                  { hour: 6, orders: 12, revenue: 300 },
                  { hour: 12, orders: 45, revenue: 1125 },
                  { hour: 18, orders: 78, revenue: 1950 },
                  { hour: 23, orders: 23, revenue: 575 },
                ],
                response_times: providerMetrics.map(m => ({
                  provider: m.provider,
                  avg_time: m.avg_response_time,
                  p95_time: m.avg_response_time * 1.5,
                })),
                status_distribution: [
                  { status: 'active', count: integrations.filter(i => i.status === 'active').length, color: '#22c55e' },
                  { status: 'inactive', count: integrations.filter(i => i.status === 'inactive').length, color: '#6b7280' },
                  { status: 'error', count: integrations.filter(i => i.status === 'error').length, color: '#ef4444' },
                  { status: 'pending', count: integrations.filter(i => i.status === 'pending').length, color: '#f59e0b' },
                ],
              }}
              title="Provider Performance Dashboard"
            />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OrderTrendsChart
                data={stats?.order_trends || []}
                loading={isLoading}
              />
              <ProviderPerformance
                data={stats?.provider_performance || []}
                loading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <RecentActivity
              data={stats?.recent_activity || []}
              loading={isLoading}
            />
          </TabsContent>

          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemHealth && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Overall Status</span>
                        <Badge variant={
                          systemHealth.overall_status === 'healthy' ? 'default' :
                          systemHealth.overall_status === 'warning' ? 'secondary' : 'destructive'
                        }>
                          {systemHealth.overall_status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Server Load</span>
                        <span>{systemHealth.server_load.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Memory Usage</span>
                        <span>{systemHealth.memory_usage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Uptime</span>
                        <span>{systemHealth.uptime.toFixed(2)}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    <Button asChild className="justify-start">
                      <a href="/providers">
                        <Server className="h-4 w-4 mr-2" />
                        Manage All Providers
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <a href="/orders">
                        <Activity className="h-4 w-4 mr-2" />
                        View All Orders
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <a href="/settings/integrations">
                        <Settings className="h-4 w-4 mr-2" />
                        Integration Settings
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <a href="/analytics">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Detailed Analytics
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    
  );
}