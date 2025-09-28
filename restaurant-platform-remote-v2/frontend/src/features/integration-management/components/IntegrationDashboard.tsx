import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  BarChart3,
  Zap,
  Truck,
  CreditCard,
  Store,
  Globe,
} from 'lucide-react';
import { POSSystemsManagement } from './POSSystemsManagement';
import { DeliveryProvidersManagement } from './DeliveryProvidersManagement';
import { IntegrationAnalytics } from './IntegrationAnalytics';
import { RealTimeMonitoring } from './RealTimeMonitoring';
import { VendorSelection } from './VendorSelection';
import { WebhookManagement } from './WebhookManagement';

interface IntegrationStatus {
  type: 'pos' | 'delivery' | 'payment';
  name: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  lastSync: string;
  errorCount: number;
  responseTime: number;
}

interface SystemMetrics {
  totalIntegrations: number;
  activeIntegrations: number;
  errorRate: number;
  avgResponseTime: number;
  dataTransferred: string;
  uptime: number;
}

export const IntegrationDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalIntegrations: 0,
    activeIntegrations: 0,
    errorRate: 0,
    avgResponseTime: 0,
    dataTransferred: '0 MB',
    uptime: 0,
  });

  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load system metrics
      const metricsResponse = await fetch('/api/integration-management/dashboard/metrics');
      const metrics = await metricsResponse.json();
      setSystemMetrics(metrics.data);

      // Load integration statuses
      const statusResponse = await fetch('/api/integration-management/dashboard/status');
      const statuses = await statusResponse.json();
      setIntegrationStatuses(statuses.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4" />;
      case 'inactive': return <Clock className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pos': return <Store className="h-5 w-5" />;
      case 'delivery': return <Truck className="h-5 w-5" />;
      case 'payment': return <CreditCard className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integration Management</h1>
          <p className="text-gray-600 mt-1">
            Manage POS systems, delivery providers, and real-time integrations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={loadDashboardData}
            variant="outline"
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="secondary" className="text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Integrations</p>
                <p className="text-2xl font-bold">{systemMetrics.totalIntegrations}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Integrations</p>
                <p className="text-2xl font-bold text-green-600">
                  {systemMetrics.activeIntegrations}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {systemMetrics.errorRate.toFixed(1)}%
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {systemMetrics.avgResponseTime}ms
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Integration Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrationStatuses.map((integration, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(integration.type)}
                    <span className="font-medium">{integration.name}</span>
                  </div>
                  <Badge
                    variant={integration.status === 'active' ? 'default' : 'secondary'}
                    className="flex items-center space-x-1"
                  >
                    {getStatusIcon(integration.status)}
                    <span className="capitalize">{integration.status}</span>
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span>{integration.lastSync}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span>{integration.responseTime}ms</span>
                  </div>
                  {integration.errorCount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Errors (24h):</span>
                      <span>{integration.errorCount}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <Button variant="outline" size="sm">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Management Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="pos-systems" className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span>POS Systems</span>
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center space-x-2">
                  <Truck className="h-4 w-4" />
                  <span>Delivery</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="monitoring" className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Monitoring</span>
                </TabsTrigger>
                <TabsTrigger value="webhooks" className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Webhooks</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>System Uptime</span>
                          <Badge variant="default">{systemMetrics.uptime}%</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Data Transferred (24h)</span>
                          <Badge variant="secondary">{systemMetrics.dataTransferred}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>API Success Rate</span>
                          <Badge variant="default">
                            {(100 - systemMetrics.errorRate).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <Store className="h-4 w-4 mr-2" />
                          Add New POS Integration
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Truck className="h-4 w-4 mr-2" />
                          Configure Delivery Provider
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Activity className="h-4 w-4 mr-2" />
                          View System Logs
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="h-4 w-4 mr-2" />
                          Integration Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pos-systems" className="p-6">
              <POSSystemsManagement />
            </TabsContent>

            <TabsContent value="delivery" className="p-6">
              <div className="space-y-6">
                <DeliveryProvidersManagement />
                <VendorSelection />
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="p-6">
              <IntegrationAnalytics />
            </TabsContent>

            <TabsContent value="monitoring" className="p-6">
              <RealTimeMonitoring />
            </TabsContent>

            <TabsContent value="webhooks" className="p-6">
              <WebhookManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};