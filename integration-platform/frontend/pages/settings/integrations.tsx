import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import { ProviderConfigModal } from '@/components/providers/ProviderConfigModal';
import {
  Integration,
  DeliveryProvider,
  ApiResponse,
  IntegrationTest,
  IntegrationConfig,
} from '@/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  TestTube,
  Key,
  Webhook,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Provider configurations
const PROVIDER_CONFIGS = {
  careem: {
    name: 'Careem Now',
    color: 'bg-green-500',
    logo: '🚗',
    documentation: 'https://developer.careem.com/docs',
    requires_webhook: true,
    test_endpoint: '/api/careem/test',
  },
  talabat: {
    name: 'Talabat',
    color: 'bg-orange-500',
    logo: '🍽️',
    documentation: 'https://partners.talabat.com/api',
    requires_webhook: true,
    test_endpoint: '/api/talabat/test',
  },
  deliveroo: {
    name: 'Deliveroo',
    color: 'bg-teal-500',
    logo: '🦌',
    documentation: 'https://developer.deliveroo.com',
    requires_webhook: true,
    test_endpoint: '/api/deliveroo/test',
  },
  uber_eats: {
    name: 'Uber Eats',
    color: 'bg-black',
    logo: '🚚',
    documentation: 'https://developer.uber.com/docs/eats',
    requires_webhook: true,
    test_endpoint: '/api/uber/test',
  },
  jahez: {
    name: 'Jahez',
    color: 'bg-red-500',
    logo: '🥘',
    documentation: 'https://developer.jahez.com',
    requires_webhook: true,
    test_endpoint: '/api/jahez/test',
  },
  hungerstation: {
    name: 'HungerStation',
    color: 'bg-yellow-500',
    logo: '🍕',
    documentation: 'https://partners.hungerstation.com',
    requires_webhook: true,
    test_endpoint: '/api/hungerstation/test',
  },
  noon_food: {
    name: 'Noon Food',
    color: 'bg-blue-500',
    logo: '🌙',
    documentation: 'https://developer.noon.com/food',
    requires_webhook: true,
    test_endpoint: '/api/noon/test',
  },
  mrsool: {
    name: 'Mrsool',
    color: 'bg-purple-500',
    logo: '🛵',
    documentation: 'https://developer.mrsool.com',
    requires_webhook: true,
    test_endpoint: '/api/mrsool/test',
  },
  zomato: {
    name: 'Zomato',
    color: 'bg-red-600',
    logo: '🍴',
    documentation: 'https://developers.zomato.com',
    requires_webhook: true,
    test_endpoint: '/api/zomato/test',
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

const fetchGlobalSettings = async () => {
  const response = await apiClient.get<ApiResponse<any>>('/settings/integrations');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch settings');
  }
  return response.data.data;
};

const saveGlobalSettings = async (settings: any) => {
  const response = await apiClient.put('/settings/integrations', settings);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to save settings');
  }
  return response.data;
};

const testProduction = async () => {
  const response = await apiClient.post('/integrations/test-production');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to test production');
  }
  return response.data.data;
};

export default function IntegrationSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<Integration | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Fetch data
  const {
    data: integrations = [],
    isLoading: integrationsLoading,
    refetch: refetchIntegrations,
  } = useQuery({
    queryKey: ['integrations'],
    queryFn: fetchIntegrations,
  });

  const {
    data: globalSettings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['global-settings'],
    queryFn: fetchGlobalSettings,
  });

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: saveGlobalSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const testProductionMutation = useMutation({
    mutationFn: testProduction,
    onSuccess: (data) => {
      setTestResults(data);
      toast.success('Production test completed');
    },
    onError: () => {
      toast.error('Production test failed');
    },
  });

  const handleConfigureProvider = (integration: Integration) => {
    setSelectedProvider(integration);
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async (config: any) => {
    if (!selectedProvider) return;

    try {
      const response = await apiClient.put(`/integrations/${selectedProvider.id}/config`, config);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['integrations'] });
        toast.success('Configuration saved successfully');
        setConfigModalOpen(false);
        setSelectedProvider(null);
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const handleTestConnection = async (testType: string): Promise<IntegrationTest> => {
    if (!selectedProvider) {
      throw new Error('No provider selected');
    }

    const response = await apiClient.post(`/integrations/${selectedProvider.id}/test`, { testType });
    return response.data.data;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      error: 'destructive',
      pending: 'secondary',
      inactive: 'outline',
      disabled: 'outline',
    };
    return variants[status as keyof typeof variants] || 'outline';
  };

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure delivery provider integrations and global settings
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => testProductionMutation.mutate()}
              disabled={testProductionMutation.isPending}
            >
              <TestTube className={`h-4 w-4 mr-2 ${testProductionMutation.isPending ? 'animate-spin' : ''}`} />
              Test Production (Teta Raheeba)
            </Button>
            <Button variant="outline" onClick={() => setGlobalSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Global Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetchIntegrations();
                refetchSettings();
              }}
              disabled={integrationsLoading || settingsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(integrationsLoading || settingsLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Production Test Results */}
        {Object.keys(testResults).length > 0 && (
          <Alert>
            <TestTube className="h-4 w-4" />
            <AlertDescription>
              <strong>Production Test Results (Teta Raheeba):</strong>
              <div className="mt-2 space-y-1">
                {Object.entries(testResults).map(([provider, result]: [string, any]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span>{PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS]?.name || provider}</span>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="providers">Provider Configurations</TabsTrigger>
            <TabsTrigger value="webhooks">Webhook Settings</TabsTrigger>
            <TabsTrigger value="credentials">API Credentials</TabsTrigger>
            <TabsTrigger value="testing">Testing & Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(PROVIDER_CONFIGS).map(([providerKey, config]) => {
                const provider = providerKey as DeliveryProvider;
                const integration = integrations.find(i => i.provider === provider);

                return (
                  <Card key={provider} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{config.logo}</div>
                          <div>
                            <CardTitle className="text-lg">{config.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              {integration ? (
                                <>
                                  {getStatusIcon(integration.status)}
                                  <Badge variant={getStatusBadge(integration.status)}>
                                    {integration.status.toUpperCase()}
                                  </Badge>
                                </>
                              ) : (
                                <Badge variant="outline">NOT CONFIGURED</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={config.documentation} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {integration ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last ping:</span>
                            <span>{new Date(integration.health.last_ping).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Response time:</span>
                            <span>{integration.health.response_time}ms</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Success rate:</span>
                            <span>{(integration.health.success_rate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="pt-2 border-t">
                            <Button
                              onClick={() => handleConfigureProvider(integration)}
                              className="w-full"
                              size="sm"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            This provider is not configured yet.
                          </p>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => {
                              // Create new integration for this provider
                              toast.success(`Setup for ${config.name} coming soon!`);
                              console.log(`Setup integration for ${provider}`);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Setup Integration
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Webhook className="h-5 w-5" />
                    <span>Webhook Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Base Webhook URL</Label>
                    <div className="flex mt-1">
                      <Input
                        value={globalSettings?.webhook_base_url || 'https://your-domain.com/webhooks'}
                        className="flex-1"
                        readOnly
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => copyToClipboard(globalSettings?.webhook_base_url || 'https://your-domain.com/webhooks')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Webhook Secret</Label>
                    <div className="flex mt-1">
                      <Input
                        type={showSecrets ? 'text' : 'password'}
                        value={globalSettings?.webhook_secret || '••••••••••••••••'}
                        className="flex-1"
                        readOnly
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => setShowSecrets(!showSecrets)}
                      >
                        {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Provider Webhook URLs</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => (
                        <div key={provider} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{config.name}:</span>
                          <code className="text-xs bg-white px-2 py-1 rounded">
                            /webhooks/{provider}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations.map(integration => {
                    const config = PROVIDER_CONFIGS[integration.provider];
                    return (
                      <div key={integration.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg">{config.logo}</div>
                          <div>
                            <div className="font-medium">{config.name}</div>
                            <div className="text-sm text-gray-500">
                              Last webhook: {integration.updated_at ? new Date(integration.updated_at).toLocaleString() : 'Never'}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            integration.config.webhook_url && integration.config.webhook_secret
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {integration.config.webhook_url && integration.config.webhook_secret
                            ? 'CONFIGURED'
                            : 'MISSING'
                          }
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-6">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Production Credentials (Teta Raheeba Restaurant)</strong>
                <br />
                These are the live credentials used for the production environment. Handle with care.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {integrations.map(integration => {
                const config = PROVIDER_CONFIGS[integration.provider];
                return (
                  <Card key={integration.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-3">
                        <div className="text-xl">{config.logo}</div>
                        <span>{config.name}</span>
                        <Badge variant={getStatusBadge(integration.status)}>
                          {integration.status.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>API Key</Label>
                          <div className="flex mt-1">
                            <Input
                              type={showSecrets ? 'text' : 'password'}
                              value={integration.config.api_key || '••••••••••••••••'}
                              className="flex-1"
                              readOnly
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-2"
                              onClick={() => copyToClipboard(integration.config.api_key || '')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {integration.config.secret_key && (
                          <div>
                            <Label>Secret Key</Label>
                            <div className="flex mt-1">
                              <Input
                                type={showSecrets ? 'text' : 'password'}
                                value={integration.config.secret_key || '••••••••••••••••'}
                                className="flex-1"
                                readOnly
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={() => copyToClipboard(integration.config.secret_key || '')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {integration.config.store_id && (
                          <div>
                            <Label>Store ID</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded">
                              {integration.config.store_id}
                            </div>
                          </div>
                        )}

                        {integration.config.brand_id && (
                          <div>
                            <Label>Brand ID</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded">
                              {integration.config.brand_id}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Label>Auto Accept Orders</Label>
                              <Badge variant={integration.config.auto_accept_orders ? 'default' : 'secondary'}>
                                {integration.config.auto_accept_orders ? 'ENABLED' : 'DISABLED'}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label>Menu Sync</Label>
                              <Badge variant={integration.config.sync_menu ? 'default' : 'secondary'}>
                                {integration.config.sync_menu ? 'ENABLED' : 'DISABLED'}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label>Inventory Sync</Label>
                              <Badge variant={integration.config.sync_inventory ? 'default' : 'secondary'}>
                                {integration.config.sync_inventory ? 'ENABLED' : 'DISABLED'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleConfigureProvider(integration)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Configuration
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Integration Testing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Test All Providers</h4>
                    <div className="space-y-2">
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => testProductionMutation.mutate()}
                        disabled={testProductionMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Test All Connections
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={async () => {
                          try {
                            toast.loading('Testing all webhooks...', { id: 'test-webhooks' });
                            const response = await apiClient.post('/integrations/test-webhooks');
                            if (response.data.success) {
                              toast.success('All webhook tests completed', { id: 'test-webhooks' });
                            } else {
                              toast.error('Some webhook tests failed', { id: 'test-webhooks' });
                            }
                          } catch (error) {
                            toast.error('Webhook test failed', { id: 'test-webhooks' });
                          }
                        }}
                      >
                        <Webhook className="h-4 w-4 mr-2" />
                        Test All Webhooks
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={async () => {
                          try {
                            toast.loading('Testing menu sync...', { id: 'test-menu-sync' });
                            const response = await apiClient.post('/integrations/test-menu-sync');
                            if (response.data.success) {
                              toast.success('Menu sync test completed', { id: 'test-menu-sync' });
                            } else {
                              toast.error('Menu sync test failed', { id: 'test-menu-sync' });
                            }
                          } catch (error) {
                            toast.error('Menu sync test failed', { id: 'test-menu-sync' });
                          }
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Test Menu Sync
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Individual Provider Tests</h4>
                    <div className="space-y-2">
                      {integrations.slice(0, 3).map(integration => {
                        const config = PROVIDER_CONFIGS[integration.provider];
                        return (
                          <Button
                            key={integration.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleConfigureProvider(integration)}
                          >
                            <div className="mr-2">{config.logo}</div>
                            Test {config.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {Object.keys(testResults).length > 0 && (
                  <div className="pt-6 border-t">
                    <h4 className="font-medium mb-3">Latest Test Results</h4>
                    <div className="space-y-2">
                      {Object.entries(testResults).map(([provider, result]: [string, any]) => {
                        const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
                        return (
                          <div key={provider} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              <div>{config?.logo}</div>
                              <div>
                                <div className="font-medium">{config?.name}</div>
                                <div className="text-sm text-gray-500">
                                  Response: {result.response_time || 'N/A'}ms
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={result.success ? 'default' : 'destructive'}>
                                {result.success ? 'PASS' : 'FAIL'}
                              </Badge>
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Provider Configuration Modal */}
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

        {/* Global Settings Modal */}
        <GlobalSettingsModal
          open={globalSettingsOpen}
          onClose={() => setGlobalSettingsOpen(false)}
          settings={globalSettings}
          onSave={(settings) => saveSettingsMutation.mutate(settings)}
          loading={saveSettingsMutation.isPending}
        />
      </div>
    
  );
}

// Global Settings Modal
interface GlobalSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: any;
  onSave: (settings: any) => void;
  loading: boolean;
}

function GlobalSettingsModal({ open, onClose, settings, onSave, loading }: GlobalSettingsModalProps) {
  const [formData, setFormData] = useState({
    webhook_base_url: '',
    webhook_secret: '',
    max_retry_attempts: 3,
    retry_delay: 5000,
    timeout_duration: 30000,
    enable_logging: true,
    enable_metrics: true,
    notification_email: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({ ...formData, ...settings });
    }
  }, [settings]);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Global Integration Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <Label>Webhook Base URL</Label>
              <Input
                className="mt-1"
                value={formData.webhook_base_url}
                onChange={(e) => setFormData({ ...formData, webhook_base_url: e.target.value })}
                placeholder="https://your-domain.com/webhooks"
              />
            </div>

            <div>
              <Label>Webhook Secret</Label>
              <Input
                className="mt-1"
                type="password"
                value={formData.webhook_secret}
                onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                placeholder="Enter webhook secret key"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Max Retry Attempts</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.max_retry_attempts}
                  onChange={(e) => setFormData({ ...formData, max_retry_attempts: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Retry Delay (ms)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.retry_delay}
                  onChange={(e) => setFormData({ ...formData, retry_delay: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Timeout Duration (ms)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.timeout_duration}
                  onChange={(e) => setFormData({ ...formData, timeout_duration: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Notification Email</Label>
              <Input
                className="mt-1"
                type="email"
                value={formData.notification_email}
                onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                placeholder="admin@restaurant.com"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Enable Logging</Label>
                <Switch
                  checked={formData.enable_logging}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_logging: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Metrics Collection</Label>
                <Switch
                  checked={formData.enable_metrics}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_metrics: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}