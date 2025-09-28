import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Key,
  Settings,
  Webhook,
} from 'lucide-react';
import { Integration, DeliveryProvider, IntegrationTest } from '@/types';

const configSchema = z.object({
  api_key: z.string().min(1, 'API Key is required'),
  secret_key: z.string().optional(),
  webhook_url: z.string().url('Valid webhook URL required').optional(),
  webhook_secret: z.string().optional(),
  store_id: z.string().optional(),
  brand_id: z.string().optional(),
  auto_accept_orders: z.boolean(),
  sync_menu: z.boolean(),
  sync_inventory: z.boolean(),
});

type ConfigForm = z.infer<typeof configSchema>;

interface ProviderConfigModalProps {
  integration: Integration | null;
  open: boolean;
  onClose: () => void;
  onSave: (config: ConfigForm) => Promise<void>;
  onTest: (testType: string) => Promise<IntegrationTest>;
}

const PROVIDER_DOCS = {
  careem: 'https://developer.careem.com/docs',
  talabat: 'https://partners.talabat.com/api',
  deliveroo: 'https://developer.deliveroo.com',
  uber_eats: 'https://developer.uber.com/docs/eats',
  jahez: 'https://developer.jahez.com',
  hungerstation: 'https://partners.hungerstation.com',
  noon_food: 'https://developer.noon.com/food',
  mrsool: 'https://developer.mrsool.com',
  zomato: 'https://developers.zomato.com',
};

const PROVIDER_FEATURES = {
  careem: ['Menu Sync', 'Order Management', 'Real-time Status', 'Webhooks'],
  talabat: ['Menu Sync', 'Order Management', 'Analytics', 'Promotions'],
  deliveroo: ['Menu Sync', 'Order Management', 'Inventory Sync'],
  uber_eats: ['Menu Sync', 'Order Management', 'Driver Tracking'],
  jahez: ['Menu Sync', 'Order Management', 'Customer Data'],
  hungerstation: ['Menu Sync', 'Order Management', 'Delivery Zones'],
  noon_food: ['Menu Sync', 'Order Management', 'Payment Processing'],
  mrsool: ['Menu Sync', 'Order Management', 'Fleet Management'],
  zomato: ['Menu Sync', 'Order Management', 'Reviews Integration'],
};

export const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  integration,
  open,
  onClose,
  onSave,
  onTest,
}) => {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<IntegrationTest[]>([]);

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      api_key: '',
      secret_key: '',
      webhook_url: '',
      webhook_secret: '',
      store_id: '',
      brand_id: '',
      auto_accept_orders: true,
      sync_menu: true,
      sync_inventory: true,
    },
  });

  useEffect(() => {
    if (integration && open) {
      form.reset({
        api_key: integration.config.api_key || '',
        secret_key: integration.config.secret_key || '',
        webhook_url: integration.config.webhook_url || '',
        webhook_secret: integration.config.webhook_secret || '',
        store_id: integration.config.store_id || '',
        brand_id: integration.config.brand_id || '',
        auto_accept_orders: integration.config.auto_accept_orders,
        sync_menu: integration.config.sync_menu,
        sync_inventory: integration.config.sync_inventory,
      });
      setTestResults([]);
    }
  }, [integration, open, form]);

  const handleSave = async (data: ConfigForm) => {
    setSaving(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (testType: string) => {
    if (!integration) return;

    setTesting(testType);
    try {
      const result = await onTest(testType);
      setTestResults((prev) => [
        ...prev.filter((r) => r.test_type !== testType),
        result,
      ]);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(null);
    }
  };

  const getTestResult = (testType: string) => {
    return testResults.find((r) => r.test_type === testType);
  };

  const renderTestButton = (testType: string, label: string) => {
    const result = getTestResult(testType);
    const isLoading = testing === testType;

    return (
      <Button
        variant="outline"
        onClick={() => handleTest(testType)}
        disabled={isLoading}
        className="w-full justify-start"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
        ) : result?.status === 'success' ? (
          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
        ) : result?.status === 'failed' ? (
          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
        ) : (
          <Settings className="h-4 w-4 mr-2" />
        )}
        {label}
        {result && result.response_time && (
          <Badge variant="secondary" className="ml-auto">
            {result.response_time}ms
          </Badge>
        )}
      </Button>
    );
  };

  if (!integration) return null;

  const provider = integration.provider;
  const features = PROVIDER_FEATURES[provider] || [];
  const docsUrl = PROVIDER_DOCS[provider];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configure {provider.replace('_', ' ').toUpperCase()}</span>
            {docsUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)}>
              <TabsContent value="credentials" className="space-y-6">
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    Enter your API credentials for {provider.replace('_', ' ')}.
                    These will be encrypted and stored securely.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter API key"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secret_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter secret key (if required)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="store_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter store ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter brand ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Supported Features */}
                <div>
                  <h4 className="font-medium mb-2">Supported Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {features.map((feature) => (
                      <Badge key={feature} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="auto_accept_orders"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto Accept Orders</FormLabel>
                          <FormDescription>
                            Automatically accept incoming orders without manual confirmation
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sync_menu"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Sync Menu</FormLabel>
                          <FormDescription>
                            Automatically sync menu items and prices with the platform
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sync_inventory"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Sync Inventory</FormLabel>
                          <FormDescription>
                            Keep inventory levels synchronized in real-time
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="webhooks" className="space-y-6">
                <Alert>
                  <Webhook className="h-4 w-4" />
                  <AlertDescription>
                    Configure webhook endpoints for real-time order updates and notifications.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="webhook_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-domain.com/webhooks/provider"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          URL where webhook notifications will be sent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webhook_secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Secret</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter webhook secret for verification"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Secret key used to verify webhook authenticity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="testing" className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Test your integration configuration to ensure everything is working correctly.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderTestButton('connection', 'Test Connection')}
                  {renderTestButton('menu_sync', 'Test Menu Sync')}
                  {renderTestButton('order_create', 'Test Order Creation')}
                  {renderTestButton('webhook', 'Test Webhook')}
                </div>

                {/* Test Results */}
                {testResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Test Results</h4>
                    {testResults.map((result) => (
                      <Alert
                        key={result.test_type}
                        variant={result.status === 'success' ? 'default' : 'destructive'}
                      >
                        <AlertDescription>
                          <strong>{result.test_type.replace('_', ' ').toUpperCase()}:</strong>{' '}
                          {result.message ||
                            (result.status === 'success' ? 'Test passed successfully' : 'Test failed')
                          }
                          {result.response_time && (
                            <Badge variant="secondary" className="ml-2">
                              {result.response_time}ms
                            </Badge>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </TabsContent>

              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};