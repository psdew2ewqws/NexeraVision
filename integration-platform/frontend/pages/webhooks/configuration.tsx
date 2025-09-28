import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';
import {
  Settings,
  Webhook,
  Shield,
  Clock,
  Globe,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  TestTube,
  RefreshCw
} from 'lucide-react';

// Import our custom components
import CareemWebhookConfig from '@/components/webhooks/CareemWebhookConfig';
import TalabatWebhookConfig from '@/components/webhooks/TalabatWebhookConfig';
import DeliverooWebhookConfig from '@/components/webhooks/DeliverooWebhookConfig';
import JahezWebhookConfig from '@/components/webhooks/JahezWebhookConfig';
import WebhookTestPanel from '@/components/webhooks/WebhookTestPanel';
import WebhookSecretGenerator from '@/components/webhooks/WebhookSecretGenerator';
import WebhookEventSelector from '@/components/webhooks/WebhookEventSelector';

// Import types
import {
  SupportedProvider,
  WebhookConfig,
  WebhookEventType,
  WebhookStatus,
  WebhookRetryConfig,
  RegisterWebhookDto
} from '@/types/webhook';

// Validation schema
const webhookConfigSchema = z.object({
  provider: z.nativeEnum(SupportedProvider),
  url: z.string().url('Must be a valid URL'),
  events: z.array(z.nativeEnum(WebhookEventType)).min(1, 'Select at least one event'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  timeoutMs: z.number().min(1000).max(30000).default(15000),
  enableSignatureValidation: z.boolean().default(true),
  secretKey: z.string().min(1, 'Secret key is required'),
  retryConfig: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    exponentialBackoff: z.boolean().default(true),
    initialDelay: z.number().min(1000).max(60000).default(1000),
    maxDelay: z.number().min(1000).max(300000).default(30000),
  }).optional(),
  headers: z.array(z.object({
    name: z.string().min(1),
    value: z.string().min(1)
  })).optional()
});

type WebhookConfigForm = z.infer<typeof webhookConfigSchema>;

const PROVIDER_NAMES = {
  [SupportedProvider.CAREEM]: 'Careem Now',
  [SupportedProvider.TALABAT]: 'Talabat',
  [SupportedProvider.DELIVEROO]: 'Deliveroo',
  [SupportedProvider.JAHEZ]: 'Jahez',
  [SupportedProvider.UBER_EATS]: 'Uber Eats',
  [SupportedProvider.FOODPANDA]: 'FoodPanda',
  [SupportedProvider.POS_SYSTEM]: 'POS System'
};

const PROVIDER_COLORS = {
  [SupportedProvider.CAREEM]: 'bg-green-100 text-green-800',
  [SupportedProvider.TALABAT]: 'bg-orange-100 text-orange-800',
  [SupportedProvider.DELIVEROO]: 'bg-teal-100 text-teal-800',
  [SupportedProvider.JAHEZ]: 'bg-purple-100 text-purple-800',
  [SupportedProvider.UBER_EATS]: 'bg-black text-white',
  [SupportedProvider.FOODPANDA]: 'bg-pink-100 text-pink-800',
  [SupportedProvider.POS_SYSTEM]: 'bg-gray-100 text-gray-800'
};

export default function WebhookConfiguration() {
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<WebhookConfig | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<WebhookConfigForm>({
    resolver: zodResolver(webhookConfigSchema),
    defaultValues: {
      isActive: true,
      timeoutMs: 15000,
      enableSignatureValidation: true,
      retryConfig: {
        maxRetries: 3,
        exponentialBackoff: true,
        initialDelay: 1000,
        maxDelay: 30000,
      }
    }
  });

  // Fetch webhook configurations
  const { data: webhookConfigs, isLoading } = useQuery({
    queryKey: ['webhook-configs'],
    queryFn: async () => {
      const response = await fetch('/api/webhooks/configs');
      if (!response.ok) throw new Error('Failed to fetch webhook configurations');
      return response.json() as WebhookConfig[];
    }
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (data: RegisterWebhookDto) => {
      const response = await fetch('/api/webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create webhook');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Webhook configuration created successfully');
      setIsCreatingNew(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    }
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookConfig> }) => {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update webhook');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Webhook configuration updated successfully');
      setSelectedConfig(null);
    },
    onError: (error) => {
      toast.error(`Failed to update webhook: ${error.message}`);
    }
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete webhook');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast.success('Webhook configuration deleted successfully');
      setSelectedConfig(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete webhook: ${error.message}`);
    }
  });

  const onSubmit = (data: WebhookConfigForm) => {
    if (selectedConfig) {
      updateWebhookMutation.mutate({ id: selectedConfig.id, data });
    } else {
      createWebhookMutation.mutate({
        ...data,
        clientId: 'default-client' // This should come from auth context
      });
    }
  };

  const handleEdit = (config: WebhookConfig) => {
    setSelectedConfig(config);
    setIsCreatingNew(false);
    form.reset({
      provider: config.provider,
      url: config.url,
      events: config.events,
      description: config.description,
      isActive: config.isActive,
      timeoutMs: config.timeoutMs,
      enableSignatureValidation: config.enableSignatureValidation,
      secretKey: config.secretKey,
      retryConfig: config.retryConfig,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this webhook configuration?')) {
      deleteWebhookMutation.mutate(id);
    }
  };

  const getStatusIcon = (status: WebhookStatus) => {
    switch (status) {
      case WebhookStatus.ACTIVE:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case WebhookStatus.INACTIVE:
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case WebhookStatus.ERROR:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const renderProviderSpecificConfig = () => {
    if (!selectedProvider) return null;

    switch (selectedProvider) {
      case SupportedProvider.CAREEM:
        return <CareemWebhookConfig form={form} />;
      case SupportedProvider.TALABAT:
        return <TalabatWebhookConfig form={form} />;
      case SupportedProvider.DELIVEROO:
        return <DeliverooWebhookConfig form={form} />;
      case SupportedProvider.JAHEZ:
        return <JahezWebhookConfig form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="w-8 h-8" />
            Webhook Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure webhook endpoints for delivery platform integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTestPanel(true)}
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            Test Webhooks
          </Button>
          <Button
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedConfig(null);
              form.reset();
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Existing Configurations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : webhookConfigs?.length ? (
                  <div className="space-y-2">
                    {webhookConfigs.map((config) => (
                      <div
                        key={config.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedConfig?.id === config.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleEdit(config)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={PROVIDER_COLORS[config.provider]}>
                                {PROVIDER_NAMES[config.provider]}
                              </Badge>
                              {getStatusIcon(config.isActive ? WebhookStatus.ACTIVE : WebhookStatus.INACTIVE)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {config.url}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {config.events.length} events
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(config);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(config.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No webhook configurations found</p>
                    <p className="text-sm">Create your first configuration to get started</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <div className="lg:col-span-2">
          {(isCreatingNew || selectedConfig) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isCreatingNew ? <Plus className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                  {isCreatingNew ? 'Create New Webhook' : 'Edit Webhook Configuration'}
                </CardTitle>
                <CardDescription>
                  {isCreatingNew
                    ? 'Configure a new webhook endpoint for delivery platform integration'
                    : 'Modify the existing webhook configuration'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="events">Events</TabsTrigger>
                      <TabsTrigger value="security">Security</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="provider">Provider</Label>
                          <Controller
                            name="provider"
                            control={form.control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedProvider(value as SupportedProvider);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
                                    <SelectItem key={key} value={key}>
                                      {name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {form.formState.errors.provider && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.provider.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Controller
                            name="isActive"
                            control={form.control}
                            render={({ field }) => (
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                          <Label>Active</Label>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="url">Webhook URL</Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              {...form.register('url')}
                              placeholder="https://your-domain.com/webhooks/provider"
                              className="flex-1"
                            />
                            {form.formState.errors.url && (
                              <p className="text-sm text-red-500 mt-1">
                                {form.formState.errors.url.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                          {...form.register('description')}
                          placeholder="Brief description of this webhook configuration"
                        />
                      </div>

                      <div>
                        <Label htmlFor="timeoutMs">Timeout (milliseconds)</Label>
                        <Input
                          {...form.register('timeoutMs', { valueAsNumber: true })}
                          type="number"
                          min="1000"
                          max="30000"
                          placeholder="15000"
                        />
                        {form.formState.errors.timeoutMs && (
                          <p className="text-sm text-red-500 mt-1">
                            {form.formState.errors.timeoutMs.message}
                          </p>
                        )}
                      </div>

                      {/* Provider-specific configuration */}
                      {renderProviderSpecificConfig()}
                    </TabsContent>

                    <TabsContent value="events">
                      <WebhookEventSelector form={form} />
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="enableSignatureValidation"
                          control={form.control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <Label>Enable HMAC Signature Validation</Label>
                      </div>

                      <WebhookSecretGenerator form={form} />
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                      <div className="space-y-4">
                        <h4 className="font-medium">Retry Configuration</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="retryConfig.maxRetries">Max Retries</Label>
                            <Input
                              {...form.register('retryConfig.maxRetries', { valueAsNumber: true })}
                              type="number"
                              min="0"
                              max="10"
                              placeholder="3"
                            />
                          </div>

                          <div className="flex items-center space-x-2 pt-6">
                            <Controller
                              name="retryConfig.exponentialBackoff"
                              control={form.control}
                              render={({ field }) => (
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              )}
                            />
                            <Label>Exponential Backoff</Label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="retryConfig.initialDelay">Initial Delay (ms)</Label>
                            <Input
                              {...form.register('retryConfig.initialDelay', { valueAsNumber: true })}
                              type="number"
                              min="1000"
                              max="60000"
                              placeholder="1000"
                            />
                          </div>

                          <div>
                            <Label htmlFor="retryConfig.maxDelay">Max Delay (ms)</Label>
                            <Input
                              {...form.register('retryConfig.maxDelay', { valueAsNumber: true })}
                              type="number"
                              min="1000"
                              max="300000"
                              placeholder="30000"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Separator />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setSelectedConfig(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createWebhookMutation.isPending || updateWebhookMutation.isPending}
                    >
                      {createWebhookMutation.isPending || updateWebhookMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {isCreatingNew ? 'Create Webhook' : 'Update Webhook'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {!isCreatingNew && !selectedConfig && (
            <Card className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Configuration Selected</h3>
                <p>Select an existing configuration to edit or create a new one</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Test Panel Modal */}
      {showTestPanel && (
        <WebhookTestPanel
          isOpen={showTestPanel}
          onClose={() => setShowTestPanel(false)}
          webhookConfigs={webhookConfigs || []}
        />
      )}
    </div>
  );
}