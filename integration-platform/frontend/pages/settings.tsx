import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Settings,
  Database,
  Zap,
  Globe,
  Bell,
  Shield,
  Building,
  Clock,
  DollarSign,
  Truck,
  Mail,
  Smartphone,
  MessageSquare,
  Download,
  Upload,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Server,
  Monitor,
  Cpu,
  HardDrive,
  Activity,
  MapPin,
  Calendar,
  Users,
  Webhook,
  Key,
  FileText,
  BarChart3,
  TestTube,
  Trash2,
  Copy,
  Plus,
  Edit,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DeliveryProvider, ApiResponse } from '@/types';

// Extended types for comprehensive settings
interface PlatformSettings {
  delivery_providers: {
    [key in DeliveryProvider]: {
      enabled: boolean;
      api_endpoint: string;
      webhook_timeout: number;
      retry_attempts: number;
      rate_limit: number;
      test_credentials: boolean;
    };
  };
}

interface IntegrationSettings {
  menu_sync: {
    interval_minutes: number;
    auto_sync: boolean;
    sync_prices: boolean;
    sync_availability: boolean;
    conflict_resolution: 'manual' | 'auto_accept' | 'auto_reject';
  };
  order_processing: {
    auto_accept: boolean;
    auto_accept_delay: number;
    reject_on_unavailable: boolean;
    max_preparation_time: number;
    notification_threshold: number;
  };
  pricing: {
    markup_percentage: number;
    tax_rate: number;
    service_fee: number;
    delivery_fee_markup: number;
    currency: string;
  };
}

interface SystemSettings {
  database: {
    host: string;
    port: number;
    name: string;
    connection_pool_size: number;
    query_timeout: number;
    ssl_enabled: boolean;
  };
  redis: {
    host: string;
    port: number;
    password_set: boolean;
    ttl_hours: number;
    max_memory: string;
  };
  websocket: {
    enabled: boolean;
    port: number;
    heartbeat_interval: number;
    max_connections: number;
  };
  performance: {
    cache_enabled: boolean;
    compression_enabled: boolean;
    request_timeout: number;
    max_concurrent_requests: number;
  };
}

interface BusinessSettings {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    tax_number: string;
    business_license: string;
  };
  branches: {
    id: string;
    name: string;
    address: string;
    phone: string;
    manager: string;
    is_active: boolean;
  }[];
  operating_hours: {
    [key in DeliveryProvider]: {
      [day: string]: {
        open: string;
        close: string;
        is_closed: boolean;
      };
    };
  };
  delivery_zones: {
    id: string;
    name: string;
    polygon: number[][];
    delivery_fee: number;
    min_order_value: number;
    max_delivery_time: number;
  }[];
  holidays: {
    date: string;
    name: string;
    affects_delivery: boolean;
  }[];
}

interface NotificationSettings {
  alerts: {
    order_failure_threshold: number;
    response_time_threshold: number;
    error_rate_threshold: number;
    queue_size_threshold: number;
    disk_usage_threshold: number;
    memory_usage_threshold: number;
  };
  email: {
    enabled: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password_set: boolean;
    from_address: string;
    templates: {
      order_confirmation: string;
      order_failure: string;
      system_alert: string;
      daily_report: string;
    };
  };
  sms: {
    enabled: boolean;
    provider: 'twilio' | 'aws_sns' | 'local';
    api_key_set: boolean;
    sender_id: string;
  };
  webhooks: {
    slack_url?: string;
    discord_url?: string;
    teams_url?: string;
    custom_endpoints: {
      name: string;
      url: string;
      events: string[];
    }[];
  };
}

interface AdvancedSettings {
  debug: {
    enabled: boolean;
    log_level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    log_retention_days: number;
    enable_sql_logging: boolean;
    enable_webhook_logging: boolean;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention_days: number;
    storage_type: 'local' | 's3' | 'gcs';
    encrypt_backups: boolean;
  };
  monitoring: {
    metrics_enabled: boolean;
    health_check_interval: number;
    performance_monitoring: boolean;
    error_tracking: boolean;
  };
  security: {
    api_rate_limit: number;
    session_timeout: number;
    password_policy: {
      min_length: number;
      require_special_chars: boolean;
      require_numbers: boolean;
      require_uppercase: boolean;
    };
    two_factor_required: boolean;
  };
}

interface SettingsData {
  platform: PlatformSettings;
  integration: IntegrationSettings;
  system: SystemSettings;
  business: BusinessSettings;
  notifications: NotificationSettings;
  advanced: AdvancedSettings;
}

const PROVIDER_CONFIGS = {
  careem: { name: 'Careem Now', logo: '🚗', color: 'bg-green-500' },
  talabat: { name: 'Talabat', logo: '🍽️', color: 'bg-orange-500' },
  deliveroo: { name: 'Deliveroo', logo: '🦌', color: 'bg-teal-500' },
  uber_eats: { name: 'Uber Eats', logo: '🚚', color: 'bg-black' },
  jahez: { name: 'Jahez', logo: '🥘', color: 'bg-red-500' },
  hungerstation: { name: 'HungerStation', logo: '🍕', color: 'bg-yellow-500' },
  noon_food: { name: 'Noon Food', logo: '🌙', color: 'bg-blue-500' },
  mrsool: { name: 'Mrsool', logo: '🛵', color: 'bg-purple-500' },
  zomato: { name: 'Zomato', logo: '🍴', color: 'bg-red-600' },
};

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

// API functions
const fetchSettings = async (): Promise<SettingsData> => {
  const response = await apiClient.get<ApiResponse<SettingsData>>('/settings/comprehensive');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch settings');
  }
  return response.data.data;
};

const saveSettings = async (settings: Partial<SettingsData>) => {
  const response = await apiClient.put('/settings/comprehensive', settings);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to save settings');
  }
  return response.data;
};

const testConnection = async (type: string, config: any) => {
  const response = await apiClient.post('/settings/test-connection', { type, config });
  return response.data;
};

const exportSettings = async (format: 'json' | 'yaml') => {
  const response = await apiClient.get(`/settings/export?format=${format}`, {
    responseType: 'blob'
  });
  return response.data;
};

const importSettings = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/settings/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('platform');
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Fetch settings
  const {
    data: settings,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['comprehensive-settings'],
    queryFn: fetchSettings,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprehensive-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: ({ type, config }: { type: string; config: any }) => testConnection(type, config),
    onSuccess: (data, variables) => {
      setTestResults(prev => ({ ...prev, [variables.type]: data }));
      toast.success(`${variables.type} connection test completed`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Connection test failed');
    },
  });

  // Export settings
  const handleExport = async (format: 'json' | 'yaml') => {
    try {
      const blob = await exportSettings(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexara-settings.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Settings exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  // Import settings
  const handleImport = async (file: File) => {
    try {
      await importSettings(file);
      await refetch();
      toast.success('Settings imported successfully');
      setImportModalOpen(false);
    } catch (error) {
      toast.error('Failed to import settings');
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    try {
      await apiClient.post('/settings/reset-defaults');
      await refetch();
      toast.success('Settings reset to defaults');
      setConfirmResetOpen(false);
    } catch (error) {
      toast.error('Failed to reset settings');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NEXARA Settings</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive platform configuration and management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('yaml')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export YAML
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => saveSettingsMutation.mutate(settings || {})}
            disabled={saveSettingsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="platform" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Platform</span>
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Integration</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Business</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Platform Configuration Tab */}
        <TabsContent value="platform" className="space-y-6">
          <PlatformConfigurationSection
            settings={settings?.platform}
            onSave={(data) => saveSettingsMutation.mutate({ platform: data })}
            onTest={(provider, config) => testConnectionMutation.mutate({ type: provider, config })}
            testResults={testResults}
            loading={saveSettingsMutation.isPending}
          />
        </TabsContent>

        {/* Integration Settings Tab */}
        <TabsContent value="integration" className="space-y-6">
          <IntegrationSettingsSection
            settings={settings?.integration}
            onSave={(data) => saveSettingsMutation.mutate({ integration: data })}
            loading={saveSettingsMutation.isPending}
          />
        </TabsContent>

        {/* System Configuration Tab */}
        <TabsContent value="system" className="space-y-6">
          <SystemConfigurationSection
            settings={settings?.system}
            onSave={(data) => saveSettingsMutation.mutate({ system: data })}
            onTest={(type, config) => testConnectionMutation.mutate({ type, config })}
            testResults={testResults}
            loading={saveSettingsMutation.isPending}
            showSecrets={showSecrets}
            onToggleSecrets={() => setShowSecrets(!showSecrets)}
          />
        </TabsContent>

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          <BusinessSettingsSection
            settings={settings?.business}
            onSave={(data) => saveSettingsMutation.mutate({ business: data })}
            loading={saveSettingsMutation.isPending}
          />
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettingsSection
            settings={settings?.notifications}
            onSave={(data) => saveSettingsMutation.mutate({ notifications: data })}
            onTest={(type, config) => testConnectionMutation.mutate({ type, config })}
            testResults={testResults}
            loading={saveSettingsMutation.isPending}
            showSecrets={showSecrets}
          />
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedSettingsSection
            settings={settings?.advanced}
            onSave={(data) => saveSettingsMutation.mutate({ advanced: data })}
            onReset={() => setConfirmResetOpen(true)}
            loading={saveSettingsMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Import Modal */}
      <ImportSettingsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmResetModal
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}

// Platform Configuration Section Component
interface PlatformConfigurationSectionProps {
  settings?: PlatformSettings;
  onSave: (data: PlatformSettings) => void;
  onTest: (provider: string, config: any) => void;
  testResults: Record<string, any>;
  loading: boolean;
}

function PlatformConfigurationSection({
  settings,
  onSave,
  onTest,
  testResults,
  loading
}: PlatformConfigurationSectionProps) {
  const [formData, setFormData] = useState<PlatformSettings>({
    delivery_providers: Object.keys(PROVIDER_CONFIGS).reduce((acc, provider) => ({
      ...acc,
      [provider]: {
        enabled: true,
        api_endpoint: `https://api.${provider}.com/v1`,
        webhook_timeout: 30000,
        retry_attempts: 3,
        rate_limit: 100,
        test_credentials: false,
      }
    }), {} as any)
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Platform Configuration</h2>
        <Badge variant="outline">
          {Object.values(formData.delivery_providers).filter(p => p.enabled).length} Active Providers
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(PROVIDER_CONFIGS).map(([providerId, providerConfig]) => {
          const provider = providerId as DeliveryProvider;
          const config = formData.delivery_providers[provider];
          const testResult = testResults[provider];

          return (
            <Card key={provider} className="relative">
              <div className={`absolute top-0 left-0 right-0 h-1 ${providerConfig.color}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{providerConfig.logo}</div>
                    <div>
                      <CardTitle className="text-lg">{providerConfig.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Switch
                          checked={config?.enabled || false}
                          onCheckedChange={(checked) =>
                            setFormData(prev => ({
                              ...prev,
                              delivery_providers: {
                                ...prev.delivery_providers,
                                [provider]: { ...config, enabled: checked }
                              }
                            }))
                          }
                        />
                        <Label className="text-sm">
                          {config?.enabled ? 'Enabled' : 'Disabled'}
                        </Label>
                      </div>
                    </div>
                  </div>
                  {testResult && (
                    <Badge variant={testResult.success ? 'default' : 'destructive'}>
                      {testResult.success ? 'PASS' : 'FAIL'}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label>API Endpoint</Label>
                  <Input
                    className="mt-1"
                    value={config?.api_endpoint || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        delivery_providers: {
                          ...prev.delivery_providers,
                          [provider]: { ...config, api_endpoint: e.target.value }
                        }
                      }))
                    }
                    placeholder={`https://api.${provider}.com/v1`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Timeout (ms)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={config?.webhook_timeout || 30000}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          delivery_providers: {
                            ...prev.delivery_providers,
                            [provider]: { ...config, webhook_timeout: parseInt(e.target.value) }
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Retry Attempts</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={config?.retry_attempts || 3}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          delivery_providers: {
                            ...prev.delivery_providers,
                            [provider]: { ...config, retry_attempts: parseInt(e.target.value) }
                          }
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Rate Limit (req/min)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={config?.rate_limit || 100}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        delivery_providers: {
                          ...prev.delivery_providers,
                          [provider]: { ...config, rate_limit: parseInt(e.target.value) }
                        }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config?.test_credentials || false}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          delivery_providers: {
                            ...prev.delivery_providers,
                            [provider]: { ...config, test_credentials: checked }
                          }
                        }))
                      }
                    />
                    <Label className="text-sm">Use test credentials</Label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onTest(provider, config)}
                    disabled={!config?.enabled}
                  >
                    <TestTube className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Platform Settings
        </Button>
      </div>
    </div>
  );
}

// Integration Settings Section Component
interface IntegrationSettingsSectionProps {
  settings?: IntegrationSettings;
  onSave: (data: IntegrationSettings) => void;
  loading: boolean;
}

function IntegrationSettingsSection({ settings, onSave, loading }: IntegrationSettingsSectionProps) {
  const [formData, setFormData] = useState<IntegrationSettings>({
    menu_sync: {
      interval_minutes: 30,
      auto_sync: true,
      sync_prices: true,
      sync_availability: true,
      conflict_resolution: 'manual',
    },
    order_processing: {
      auto_accept: false,
      auto_accept_delay: 60,
      reject_on_unavailable: true,
      max_preparation_time: 30,
      notification_threshold: 5,
    },
    pricing: {
      markup_percentage: 0,
      tax_rate: 15,
      service_fee: 0,
      delivery_fee_markup: 0,
      currency: 'SAR',
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Integration Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Menu Synchronization</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sync Interval (minutes)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.menu_sync.interval_minutes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  menu_sync: { ...prev.menu_sync, interval_minutes: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Auto Sync</Label>
                <Switch
                  checked={formData.menu_sync.auto_sync}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    menu_sync: { ...prev.menu_sync, auto_sync: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Sync Prices</Label>
                <Switch
                  checked={formData.menu_sync.sync_prices}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    menu_sync: { ...prev.menu_sync, sync_prices: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Sync Availability</Label>
                <Switch
                  checked={formData.menu_sync.sync_availability}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    menu_sync: { ...prev.menu_sync, sync_availability: checked }
                  }))}
                />
              </div>
            </div>

            <div>
              <Label>Conflict Resolution</Label>
              <Select
                value={formData.menu_sync.conflict_resolution}
                onValueChange={(value: any) => setFormData(prev => ({
                  ...prev,
                  menu_sync: { ...prev.menu_sync, conflict_resolution: value }
                }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Review</SelectItem>
                  <SelectItem value="auto_accept">Auto Accept Changes</SelectItem>
                  <SelectItem value="auto_reject">Auto Reject Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Processing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Order Processing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Auto Accept Orders</Label>
              <Switch
                checked={formData.order_processing.auto_accept}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  order_processing: { ...prev.order_processing, auto_accept: checked }
                }))}
              />
            </div>

            <div>
              <Label>Auto Accept Delay (seconds)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.order_processing.auto_accept_delay}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  order_processing: { ...prev.order_processing, auto_accept_delay: parseInt(e.target.value) }
                }))}
                disabled={!formData.order_processing.auto_accept}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Reject on Unavailable Items</Label>
              <Switch
                checked={formData.order_processing.reject_on_unavailable}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  order_processing: { ...prev.order_processing, reject_on_unavailable: checked }
                }))}
              />
            </div>

            <div>
              <Label>Max Preparation Time (minutes)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.order_processing.max_preparation_time}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  order_processing: { ...prev.order_processing, max_preparation_time: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Notification Threshold (orders)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.order_processing.notification_threshold}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  order_processing: { ...prev.order_processing, notification_threshold: parseInt(e.target.value) }
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Pricing Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Markup Percentage (%)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.1"
                value={formData.pricing.markup_percentage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, markup_percentage: parseFloat(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.1"
                value={formData.pricing.tax_rate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, tax_rate: parseFloat(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Service Fee</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={formData.pricing.service_fee}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, service_fee: parseFloat(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Delivery Fee Markup (%)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.1"
                value={formData.pricing.delivery_fee_markup}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, delivery_fee_markup: parseFloat(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Currency</Label>
              <Select
                value={formData.pricing.currency}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, currency: value }
                }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">Saudi Riyal (SAR)</SelectItem>
                  <SelectItem value="AED">UAE Dirham (AED)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Integration Settings
        </Button>
      </div>
    </div>
  );
}

// System Configuration Section Component
interface SystemConfigurationSectionProps {
  settings?: SystemSettings;
  onSave: (data: SystemSettings) => void;
  onTest: (type: string, config: any) => void;
  testResults: Record<string, any>;
  loading: boolean;
  showSecrets: boolean;
  onToggleSecrets: () => void;
}

function SystemConfigurationSection({
  settings,
  onSave,
  onTest,
  testResults,
  loading,
  showSecrets,
  onToggleSecrets
}: SystemConfigurationSectionProps) {
  const [formData, setFormData] = useState<SystemSettings>({
    database: {
      host: 'localhost',
      port: 5432,
      name: 'postgres',
      connection_pool_size: 20,
      query_timeout: 30000,
      ssl_enabled: false,
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password_set: false,
      ttl_hours: 24,
      max_memory: '256mb',
    },
    websocket: {
      enabled: true,
      port: 3001,
      heartbeat_interval: 30000,
      max_connections: 1000,
    },
    performance: {
      cache_enabled: true,
      compression_enabled: true,
      request_timeout: 30000,
      max_concurrent_requests: 100,
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Configuration</h2>
        <Button variant="outline" onClick={onToggleSecrets}>
          {showSecrets ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showSecrets ? 'Hide' : 'Show'} Sensitive Data
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Read-Only System Information:</strong> Database and Redis configurations are
          displayed for reference only. Changes to critical system settings require server restart.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Configuration</span>
              </div>
              <Badge variant={testResults.database?.success ? 'default' : 'destructive'}>
                {testResults.database?.success ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Host</Label>
                <Input
                  className="mt-1"
                  value={formData.database.host}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.database.port}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div>
              <Label>Database Name</Label>
              <Input
                className="mt-1"
                value={formData.database.name}
                readOnly
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Connection Pool Size</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.database.connection_pool_size}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    database: { ...prev.database, connection_pool_size: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label>Query Timeout (ms)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.database.query_timeout}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    database: { ...prev.database, query_timeout: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>SSL Enabled</Label>
              <Switch
                checked={formData.database.ssl_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  database: { ...prev.database, ssl_enabled: checked }
                }))}
                disabled
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onTest('database', formData.database)}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Database Connection
            </Button>
          </CardContent>
        </Card>

        {/* Redis Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Redis Configuration</span>
              </div>
              <Badge variant={testResults.redis?.success ? 'default' : 'destructive'}>
                {testResults.redis?.success ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Host</Label>
                <Input
                  className="mt-1"
                  value={formData.redis.host}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.redis.port}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div>
              <Label>Password</Label>
              <Input
                className="mt-1"
                type={showSecrets ? 'text' : 'password'}
                value={formData.redis.password_set ? '••••••••••••••••' : 'No password set'}
                readOnly
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>TTL Hours</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.redis.ttl_hours}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    redis: { ...prev.redis, ttl_hours: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label>Max Memory</Label>
                <Input
                  className="mt-1"
                  value={formData.redis.max_memory}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    redis: { ...prev.redis, max_memory: e.target.value }
                  }))}
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onTest('redis', formData.redis)}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Redis Connection
            </Button>
          </CardContent>
        </Card>

        {/* WebSocket Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>WebSocket Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>WebSocket Enabled</Label>
              <Switch
                checked={formData.websocket.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  websocket: { ...prev.websocket, enabled: checked }
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Port</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.websocket.port}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    websocket: { ...prev.websocket, port: parseInt(e.target.value) }
                  }))}
                  disabled={!formData.websocket.enabled}
                />
              </div>
              <div>
                <Label>Max Connections</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.websocket.max_connections}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    websocket: { ...prev.websocket, max_connections: parseInt(e.target.value) }
                  }))}
                  disabled={!formData.websocket.enabled}
                />
              </div>
            </div>

            <div>
              <Label>Heartbeat Interval (ms)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.websocket.heartbeat_interval}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  websocket: { ...prev.websocket, heartbeat_interval: parseInt(e.target.value) }
                }))}
                disabled={!formData.websocket.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Performance Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Cache Enabled</Label>
                <Switch
                  checked={formData.performance.cache_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    performance: { ...prev.performance, cache_enabled: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Compression Enabled</Label>
                <Switch
                  checked={formData.performance.compression_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    performance: { ...prev.performance, compression_enabled: checked }
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Request Timeout (ms)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.performance.request_timeout}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    performance: { ...prev.performance, request_timeout: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label>Max Concurrent Requests</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.performance.max_concurrent_requests}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    performance: { ...prev.performance, max_concurrent_requests: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save System Settings
        </Button>
      </div>
    </div>
  );
}

// Business Settings Section Component
interface BusinessSettingsSectionProps {
  settings?: BusinessSettings;
  onSave: (data: BusinessSettings) => void;
  loading: boolean;
}

function BusinessSettingsSection({ settings, onSave, loading }: BusinessSettingsSectionProps) {
  const [formData, setFormData] = useState<BusinessSettings>({
    company: {
      name: 'Teta Raheeba Restaurant',
      address: 'Riyadh, Saudi Arabia',
      phone: '+966 11 123 4567',
      email: 'info@tetaraheeba.com',
      tax_number: 'TAX123456789',
      business_license: 'LIC987654321',
    },
    branches: [
      {
        id: '1',
        name: 'Main Branch',
        address: 'King Fahd Road, Riyadh',
        phone: '+966 11 123 4567',
        manager: 'Ahmed Al-Mansouri',
        is_active: true,
      }
    ],
    operating_hours: {} as any,
    delivery_zones: [
      {
        id: '1',
        name: 'Zone 1 - Central Riyadh',
        polygon: [[24.7136, 46.6753], [24.7336, 46.6953], [24.7036, 46.7053], [24.6936, 46.6653]],
        delivery_fee: 15,
        min_order_value: 50,
        max_delivery_time: 45,
      }
    ],
    holidays: [
      {
        date: '2025-01-01',
        name: 'New Year',
        affects_delivery: true,
      }
    ],
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Business Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                className="mt-1"
                value={formData.company.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  company: { ...prev.company, name: e.target.value }
                }))}
              />
            </div>

            <div>
              <Label>Address</Label>
              <Textarea
                className="mt-1"
                value={formData.company.address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  company: { ...prev.company, address: e.target.value }
                }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input
                  className="mt-1"
                  value={formData.company.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    company: { ...prev.company, phone: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={formData.company.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    company: { ...prev.company, email: e.target.value }
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tax Number</Label>
                <Input
                  className="mt-1"
                  value={formData.company.tax_number}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    company: { ...prev.company, tax_number: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label>Business License</Label>
                <Input
                  className="mt-1"
                  value={formData.company.business_license}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    company: { ...prev.company, business_license: e.target.value }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours per Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Operating Hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {Object.entries(PROVIDER_CONFIGS).slice(0, 3).map(([providerId, providerConfig]) => (
                <div key={providerId} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{providerConfig.logo}</span>
                    <Label className="font-medium">{providerConfig.name}</Label>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="text-center">
                        <Label className="text-xs capitalize">{day.slice(0, 3)}</Label>
                        <div className="mt-1 space-y-1">
                          <Input
                            className="h-6 text-xs"
                            type="time"
                            defaultValue="09:00"
                          />
                          <Input
                            className="h-6 text-xs"
                            type="time"
                            defaultValue="23:00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Branch Management</span>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.branches.map((branch, index) => (
              <div key={branch.id} className="p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Branch Name</Label>
                    <Input
                      className="mt-1"
                      value={branch.name}
                      onChange={(e) => {
                        const newBranches = [...formData.branches];
                        newBranches[index] = { ...branch, name: e.target.value };
                        setFormData(prev => ({ ...prev, branches: newBranches }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      className="mt-1"
                      value={branch.address}
                      onChange={(e) => {
                        const newBranches = [...formData.branches];
                        newBranches[index] = { ...branch, address: e.target.value };
                        setFormData(prev => ({ ...prev, branches: newBranches }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      className="mt-1"
                      value={branch.phone}
                      onChange={(e) => {
                        const newBranches = [...formData.branches];
                        newBranches[index] = { ...branch, phone: e.target.value };
                        setFormData(prev => ({ ...prev, branches: newBranches }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Manager</Label>
                    <Input
                      className="mt-1"
                      value={branch.manager}
                      onChange={(e) => {
                        const newBranches = [...formData.branches];
                        newBranches[index] = { ...branch, manager: e.target.value };
                        setFormData(prev => ({ ...prev, branches: newBranches }));
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={branch.is_active}
                      onCheckedChange={(checked) => {
                        const newBranches = [...formData.branches];
                        newBranches[index] = { ...branch, is_active: checked };
                        setFormData(prev => ({ ...prev, branches: newBranches }));
                      }}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Delivery Zones</span>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.delivery_zones.map((zone, index) => (
              <div key={zone.id} className="p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Zone Name</Label>
                    <Input
                      className="mt-1"
                      value={zone.name}
                      onChange={(e) => {
                        const newZones = [...formData.delivery_zones];
                        newZones[index] = { ...zone, name: e.target.value };
                        setFormData(prev => ({ ...prev, delivery_zones: newZones }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Delivery Fee (SAR)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="0.01"
                      value={zone.delivery_fee}
                      onChange={(e) => {
                        const newZones = [...formData.delivery_zones];
                        newZones[index] = { ...zone, delivery_fee: parseFloat(e.target.value) };
                        setFormData(prev => ({ ...prev, delivery_zones: newZones }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Min Order Value (SAR)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="0.01"
                      value={zone.min_order_value}
                      onChange={(e) => {
                        const newZones = [...formData.delivery_zones];
                        newZones[index] = { ...zone, min_order_value: parseFloat(e.target.value) };
                        setFormData(prev => ({ ...prev, delivery_zones: newZones }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Max Delivery Time (min)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={zone.max_delivery_time}
                      onChange={(e) => {
                        const newZones = [...formData.delivery_zones];
                        newZones[index] = { ...zone, max_delivery_time: parseInt(e.target.value) };
                        setFormData(prev => ({ ...prev, delivery_zones: newZones }));
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Zone
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Business Settings
        </Button>
      </div>
    </div>
  );
}

// Notification Settings Section Component
interface NotificationSettingsSectionProps {
  settings?: NotificationSettings;
  onSave: (data: NotificationSettings) => void;
  onTest: (type: string, config: any) => void;
  testResults: Record<string, any>;
  loading: boolean;
  showSecrets: boolean;
}

function NotificationSettingsSection({
  settings,
  onSave,
  onTest,
  testResults,
  loading,
  showSecrets
}: NotificationSettingsSectionProps) {
  const [formData, setFormData] = useState<NotificationSettings>({
    alerts: {
      order_failure_threshold: 5,
      response_time_threshold: 5000,
      error_rate_threshold: 10,
      queue_size_threshold: 100,
      disk_usage_threshold: 85,
      memory_usage_threshold: 80,
    },
    email: {
      enabled: true,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_username: 'notifications@tetaraheeba.com',
      smtp_password_set: true,
      from_address: 'noreply@tetaraheeba.com',
      templates: {
        order_confirmation: 'Your order has been confirmed',
        order_failure: 'Order processing failed',
        system_alert: 'System alert notification',
        daily_report: 'Daily operations report',
      },
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      api_key_set: false,
      sender_id: 'TetaRaheeba',
    },
    webhooks: {
      custom_endpoints: [],
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notification Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alert Thresholds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Order Failure Threshold (count)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.alerts.order_failure_threshold}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, order_failure_threshold: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Response Time Threshold (ms)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.alerts.response_time_threshold}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, response_time_threshold: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Error Rate Threshold (%)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.alerts.error_rate_threshold}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, error_rate_threshold: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Queue Size Threshold</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.alerts.queue_size_threshold}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alerts: { ...prev.alerts, queue_size_threshold: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disk Usage (%)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.alerts.disk_usage_threshold}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    alerts: { ...prev.alerts, disk_usage_threshold: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label>Memory Usage (%)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.alerts.memory_usage_threshold}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    alerts: { ...prev.alerts, memory_usage_threshold: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Configuration</span>
              </div>
              <Switch
                checked={formData.email.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  email: { ...prev.email, enabled: checked }
                }))}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SMTP Host</Label>
                <Input
                  className="mt-1"
                  value={formData.email.smtp_host}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    email: { ...prev.email, smtp_host: e.target.value }
                  }))}
                  disabled={!formData.email.enabled}
                />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={formData.email.smtp_port}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    email: { ...prev.email, smtp_port: parseInt(e.target.value) }
                  }))}
                  disabled={!formData.email.enabled}
                />
              </div>
            </div>

            <div>
              <Label>SMTP Username</Label>
              <Input
                className="mt-1"
                value={formData.email.smtp_username}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  email: { ...prev.email, smtp_username: e.target.value }
                }))}
                disabled={!formData.email.enabled}
              />
            </div>

            <div>
              <Label>SMTP Password</Label>
              <Input
                className="mt-1"
                type={showSecrets ? 'text' : 'password'}
                value={formData.email.smtp_password_set ? '••••••••••••••••' : ''}
                placeholder="Enter SMTP password"
                disabled={!formData.email.enabled}
              />
            </div>

            <div>
              <Label>From Address</Label>
              <Input
                className="mt-1"
                type="email"
                value={formData.email.from_address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  email: { ...prev.email, from_address: e.target.value }
                }))}
                disabled={!formData.email.enabled}
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onTest('email', formData.email)}
              disabled={!formData.email.enabled}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Email Configuration
            </Button>
          </CardContent>
        </Card>

        {/* SMS Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5" />
                <span>SMS Configuration</span>
              </div>
              <Switch
                checked={formData.sms.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  sms: { ...prev.sms, enabled: checked }
                }))}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>SMS Provider</Label>
              <Select
                value={formData.sms.provider}
                onValueChange={(value: any) => setFormData(prev => ({
                  ...prev,
                  sms: { ...prev.sms, provider: value }
                }))}
                disabled={!formData.sms.enabled}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="aws_sns">AWS SNS</SelectItem>
                  <SelectItem value="local">Local Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                className="mt-1"
                type={showSecrets ? 'text' : 'password'}
                value={formData.sms.api_key_set ? '••••••••••••••••' : ''}
                placeholder="Enter API key"
                disabled={!formData.sms.enabled}
              />
            </div>

            <div>
              <Label>Sender ID</Label>
              <Input
                className="mt-1"
                value={formData.sms.sender_id}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sms: { ...prev.sms, sender_id: e.target.value }
                }))}
                disabled={!formData.sms.enabled}
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onTest('sms', formData.sms)}
              disabled={!formData.sms.enabled}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test SMS Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="h-5 w-5" />
              <span>Webhook Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Slack Webhook URL</Label>
              <Input
                className="mt-1"
                value={formData.webhooks.slack_url || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  webhooks: { ...prev.webhooks, slack_url: e.target.value }
                }))}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>

            <div>
              <Label>Discord Webhook URL</Label>
              <Input
                className="mt-1"
                value={formData.webhooks.discord_url || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  webhooks: { ...prev.webhooks, discord_url: e.target.value }
                }))}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>

            <div>
              <Label>Microsoft Teams Webhook URL</Label>
              <Input
                className="mt-1"
                value={formData.webhooks.teams_url || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  webhooks: { ...prev.webhooks, teams_url: e.target.value }
                }))}
                placeholder="https://outlook.office.com/webhook/..."
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Webhooks</Label>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom
                </Button>
              </div>
              {formData.webhooks.custom_endpoints.map((endpoint, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Webhook name" value={endpoint.name} />
                    <Input placeholder="Webhook URL" value={endpoint.url} />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Notification Settings
        </Button>
      </div>
    </div>
  );
}

// Advanced Settings Section Component
interface AdvancedSettingsSectionProps {
  settings?: AdvancedSettings;
  onSave: (data: AdvancedSettings) => void;
  onReset: () => void;
  loading: boolean;
}

function AdvancedSettingsSection({ settings, onSave, onReset, loading }: AdvancedSettingsSectionProps) {
  const [formData, setFormData] = useState<AdvancedSettings>({
    debug: {
      enabled: false,
      log_level: 'info',
      log_retention_days: 30,
      enable_sql_logging: false,
      enable_webhook_logging: true,
    },
    backup: {
      enabled: true,
      schedule: '0 2 * * *',
      retention_days: 7,
      storage_type: 'local',
      encrypt_backups: true,
    },
    monitoring: {
      metrics_enabled: true,
      health_check_interval: 60,
      performance_monitoring: true,
      error_tracking: true,
    },
    security: {
      api_rate_limit: 100,
      session_timeout: 3600,
      password_policy: {
        min_length: 8,
        require_special_chars: true,
        require_numbers: true,
        require_uppercase: true,
      },
      two_factor_required: false,
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Advanced Settings</h2>
        <Button variant="outline" onClick={onReset} className="text-red-600">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Advanced Configuration:</strong> These settings affect system behavior.
          Changes may require restart and should be tested in development first.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debug Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Debug & Logging</span>
              </div>
              <Switch
                checked={formData.debug.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  debug: { ...prev.debug, enabled: checked }
                }))}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Log Level</Label>
              <Select
                value={formData.debug.log_level}
                onValueChange={(value: any) => setFormData(prev => ({
                  ...prev,
                  debug: { ...prev.debug, log_level: value }
                }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="trace">Trace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Log Retention (days)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.debug.log_retention_days}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  debug: { ...prev.debug, log_retention_days: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>SQL Logging</Label>
                <Switch
                  checked={formData.debug.enable_sql_logging}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    debug: { ...prev.debug, enable_sql_logging: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Webhook Logging</Label>
                <Switch
                  checked={formData.debug.enable_webhook_logging}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    debug: { ...prev.debug, enable_webhook_logging: checked }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5" />
                <span>Backup & Restore</span>
              </div>
              <Switch
                checked={formData.backup.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  backup: { ...prev.backup, enabled: checked }
                }))}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Backup Schedule (Cron)</Label>
              <Input
                className="mt-1"
                value={formData.backup.schedule}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  backup: { ...prev.backup, schedule: e.target.value }
                }))}
                placeholder="0 2 * * *"
                disabled={!formData.backup.enabled}
              />
            </div>

            <div>
              <Label>Retention Period (days)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.backup.retention_days}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  backup: { ...prev.backup, retention_days: parseInt(e.target.value) }
                }))}
                disabled={!formData.backup.enabled}
              />
            </div>

            <div>
              <Label>Storage Type</Label>
              <Select
                value={formData.backup.storage_type}
                onValueChange={(value: any) => setFormData(prev => ({
                  ...prev,
                  backup: { ...prev.backup, storage_type: value }
                }))}
                disabled={!formData.backup.enabled}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Storage</SelectItem>
                  <SelectItem value="s3">Amazon S3</SelectItem>
                  <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Encrypt Backups</Label>
              <Switch
                checked={formData.backup.encrypt_backups}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  backup: { ...prev.backup, encrypt_backups: checked }
                }))}
                disabled={!formData.backup.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Monitoring & Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Metrics Collection</Label>
                <Switch
                  checked={formData.monitoring.metrics_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    monitoring: { ...prev.monitoring, metrics_enabled: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Performance Monitoring</Label>
                <Switch
                  checked={formData.monitoring.performance_monitoring}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    monitoring: { ...prev.monitoring, performance_monitoring: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Error Tracking</Label>
                <Switch
                  checked={formData.monitoring.error_tracking}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    monitoring: { ...prev.monitoring, error_tracking: checked }
                  }))}
                />
              </div>
            </div>

            <div>
              <Label>Health Check Interval (seconds)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.monitoring.health_check_interval}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  monitoring: { ...prev.monitoring, health_check_interval: parseInt(e.target.value) }
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>API Rate Limit (req/min)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.security.api_rate_limit}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, api_rate_limit: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div>
              <Label>Session Timeout (seconds)</Label>
              <Input
                className="mt-1"
                type="number"
                value={formData.security.session_timeout}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, session_timeout: parseInt(e.target.value) }
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Require Two-Factor Auth</Label>
              <Switch
                checked={formData.security.two_factor_required}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, two_factor_required: checked }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Password Policy</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Min Length: {formData.security.password_policy.min_length}</span>
                  <Input
                    type="range"
                    min="6"
                    max="20"
                    value={formData.security.password_policy.min_length}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        password_policy: {
                          ...prev.security.password_policy,
                          min_length: parseInt(e.target.value)
                        }
                      }
                    }))}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Require Special Characters</span>
                  <Switch
                    checked={formData.security.password_policy.require_special_chars}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        password_policy: {
                          ...prev.security.password_policy,
                          require_special_chars: checked
                        }
                      }
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Require Numbers</span>
                  <Switch
                    checked={formData.security.password_policy.require_numbers}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        password_policy: {
                          ...prev.security.password_policy,
                          require_numbers: checked
                        }
                      }
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Require Uppercase</span>
                  <Switch
                    checked={formData.security.password_policy.require_uppercase}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        password_policy: {
                          ...prev.security.password_policy,
                          require_uppercase: checked
                        }
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Advanced Settings
        </Button>
      </div>
    </div>
  );
}

// Import Settings Modal
interface ImportSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

function ImportSettingsModal({ open, onClose, onImport }: ImportSettingsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      onImport(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Settings</DialogTitle>
          <DialogDescription>
            Upload a settings file to import configuration. This will overwrite current settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Settings File</Label>
            <Input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm">
                <strong>File:</strong> {selectedFile.name}<br />
                <strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB<br />
                <strong>Type:</strong> {selectedFile.type}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Confirm Reset Modal
interface ConfirmResetModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmResetModal({ open, onClose, onConfirm }: ConfirmResetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Reset to Defaults</span>
          </DialogTitle>
          <DialogDescription>
            This will reset all settings to their default values. This action cannot be undone.
            Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}