import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import { ProviderCard } from '@/components/providers/ProviderCard';
import { ProviderConfigModal } from '@/components/providers/ProviderConfigModal';
import { MetricsChart } from '@/components/providers/MetricsChart';
import {
  Integration,
  ProviderMetrics,
  DeliveryProvider,
  IntegrationTest,
  ApiResponse,
} from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  RefreshCw,
  Settings,
  TestTube,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Provider configurations with comprehensive details
const PROVIDER_CONFIGS = {
  careem: {
    name: 'Careem Now',
    color: 'bg-green-500',
    logo: '🚗',
    country: 'UAE, KSA, Qatar',
    features: ['Menu Sync', 'Order Management', 'Real-time Status', 'Webhooks'],
    documentation: 'https://developer.careem.com/docs',
  },
  talabat: {
    name: 'Talabat',
    color: 'bg-orange-500',
    logo: '🍽️',
    country: 'Kuwait, UAE, Oman, Bahrain, Qatar, Jordan, Egypt',
    features: ['Menu Sync', 'Order Management', 'Analytics', 'Promotions'],
    documentation: 'https://partners.talabat.com/api',
  },
  deliveroo: {
    name: 'Deliveroo',
    color: 'bg-teal-500',
    logo: '🦌',
    country: 'UAE, Kuwait',
    features: ['Menu Sync', 'Order Management', 'Inventory Sync'],
    documentation: 'https://developer.deliveroo.com',
  },
  uber_eats: {
    name: 'Uber Eats',
    color: 'bg-black',
    logo: '🚚',
    country: 'UAE, KSA, Egypt, Lebanon',
    features: ['Menu Sync', 'Order Management', 'Driver Tracking'],
    documentation: 'https://developer.uber.com/docs/eats',
  },
  jahez: {
    name: 'Jahez',
    color: 'bg-red-500',
    logo: '🥘',
    country: 'Saudi Arabia',
    features: ['Menu Sync', 'Order Management', 'Customer Data'],
    documentation: 'https://developer.jahez.com',
  },
  hungerstation: {
    name: 'HungerStation',
    color: 'bg-yellow-500',
    logo: '🍕',
    country: 'Saudi Arabia, Kuwait, Bahrain',
    features: ['Menu Sync', 'Order Management', 'Delivery Zones'],
    documentation: 'https://partners.hungerstation.com',
  },
  noon_food: {
    name: 'Noon Food',
    color: 'bg-blue-500',
    logo: '🌙',
    country: 'UAE, KSA',
    features: ['Menu Sync', 'Order Management', 'Payment Processing'],
    documentation: 'https://developer.noon.com/food',
  },
  mrsool: {
    name: 'Mrsool',
    color: 'bg-purple-500',
    logo: '🛵',
    country: 'Saudi Arabia',
    features: ['Menu Sync', 'Order Management', 'Fleet Management'],
    documentation: 'https://developer.mrsool.com',
  },
  zomato: {
    name: 'Zomato',
    color: 'bg-red-600',
    logo: '🍴',
    country: 'UAE, Qatar',
    features: ['Menu Sync', 'Order Management', 'Reviews Integration'],
    documentation: 'https://developers.zomato.com',
  },
};

// API functions
const fetchIntegrations = async (): Promise<Integration[]> => {
  const response = await apiClient.get<ApiResponse<Integration[]>>('/integrations');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch integrations');
  }
  return response.data.data;
};

const fetchProviderMetrics = async (): Promise<ProviderMetrics[]> => {
  const response = await apiClient.get<ApiResponse<ProviderMetrics[]>>('/providers/metrics');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch provider metrics');
  }
  return response.data.data;
};

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<Integration | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Data fetching
  const {
    data: integrations = [],
    isLoading: integrationsLoading,
    refetch: refetchIntegrations,
  } = useQuery({
    queryKey: ['integrations'],
    queryFn: fetchIntegrations,
    refetchInterval: 30000,
  });

  const {
    data: providerMetrics = [],
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['provider-metrics'],
    queryFn: fetchProviderMetrics,
    refetchInterval: 30000,
  });

  // Mutations
  const toggleProviderMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await apiClient.patch(`/integrations/${id}/toggle`, { enabled });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Provider status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update provider status');
    },
  });

  const testProviderMutation = useMutation({
    mutationFn: async ({ id, testType }: { id: string; testType: string }) => {
      const response = await apiClient.post(`/integrations/${id}/test`, { testType });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.testType.replace('_', ' ')} test completed`);
    },
    onError: () => {
      toast.error('Test failed');
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: any }) => {
      const response = await apiClient.put(`/integrations/${id}/config`, config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Configuration saved successfully');
      setConfigModalOpen(false);
      setSelectedProvider(null);
    },
    onError: () => {
      toast.error('Failed to save configuration');
    },
  });

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      const matchesSearch = PROVIDER_CONFIGS[integration.provider]?.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || integration.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [integrations, searchQuery, statusFilter]);

  // Handler functions
  const handleProviderToggle = async (id: string, enabled: boolean) => {
    toggleProviderMutation.mutate({ id, enabled });
  };

  const handleProviderConfigure = (integration: Integration) => {
    setSelectedProvider(integration);
    setConfigModalOpen(true);
  };

  const handleProviderTest = async (integration: Integration) => {
    testProviderMutation.mutate({ id: integration.id, testType: 'connection' });
  };

  const handleProviderDetails = (integration: Integration) => {
    window.location.href = `/providers/${integration.provider}/details`;
  };

  const handleSaveConfig = async (config: any) => {
    if (!selectedProvider) return;
    saveConfigMutation.mutate({ id: selectedProvider.id, config });
  };

  const handleTestConnection = async (testType: string): Promise<IntegrationTest> => {
    if (!selectedProvider) {
      throw new Error('No provider selected');
    }

    const response = await apiClient.post(`/integrations/${selectedProvider.id}/test`, { testType });
    return response.data.data;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleRefreshAll = () => {
    refetchIntegrations();
    refetchMetrics();
    toast.success('Data refreshed');
  };

  const isLoading = integrationsLoading || metricsLoading;

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Providers Management</h1>
            <p className="text-gray-600 mt-1">
              Manage all 9 delivery provider integrations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleRefreshAll} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {integrations.length} configured
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders Today</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {providerMetrics.reduce((sum, p) => sum + p.last_24h_orders, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all providers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Response</CardTitle>
              <TestTube className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  providerMetrics.reduce((sum, p) => sum + p.avg_response_time, 0) /
                  Math.max(providerMetrics.length, 1)
                )}ms
              </div>
              <p className="text-xs text-muted-foreground">
                System-wide average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(
                  (1 - providerMetrics.reduce((sum, p) => sum + p.error_rate, 0) /
                  Math.max(providerMetrics.length, 1)) * 100
                ).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Overall success rate
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="grid">Provider Grid</TabsTrigger>
            <TabsTrigger value="list">Provider List</TabsTrigger>
            <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-6">
            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map((integration) => (
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
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            {/* Provider List */}
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredIntegrations.map((integration) => {
                    const config = PROVIDER_CONFIGS[integration.provider];
                    const metrics = getProviderMetrics(integration.provider);

                    return (
                      <div key={integration.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{config.logo}</div>
                          <div>
                            <h3 className="font-semibold">{config.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {getStatusIcon(integration.status)}
                              <span className="text-sm text-muted-foreground">
                                {integration.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-8">
                          <div className="text-center">
                            <div className="text-lg font-bold">{metrics.last_24h_orders}</div>
                            <div className="text-xs text-muted-foreground">Orders</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {((1 - metrics.error_rate) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Success</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{metrics.avg_response_time}ms</div>
                            <div className="text-xs text-muted-foreground">Response</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleProviderConfigure(integration)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleProviderTest(integration)}>
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Connection
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleProviderDetails(integration)}>
                                <Activity className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <MetricsChart
              data={{
                provider_performance: integrations.map(integration => {
                  const metrics = getProviderMetrics(integration.provider);
                  return {
                    provider: integration.provider,
                    orders: metrics.total_orders,
                    revenue: metrics.revenue_today,
                    success_rate: 1 - metrics.error_rate,
                  };
                }),
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
              title="Provider Performance Analytics"
            />
          </TabsContent>
        </Tabs>

        {/* Configuration Modal */}
        <ProviderConfigModal
          integration={selectedProvider}
          open={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedProvider(null);
          }}
          onSave={handleSaveConfig}
          onTest={handleTestConnection}
        />
      </div>
    
  );
}