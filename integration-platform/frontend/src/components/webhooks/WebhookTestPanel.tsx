import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import {
  TestTube,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Code,
  Send,
  Zap,
  AlertTriangle
} from 'lucide-react';

import {
  WebhookConfig,
  SupportedProvider,
  WebhookEventType,
  WebhookTestPayload
} from '@/types/webhook';

interface WebhookTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  webhookConfigs: WebhookConfig[];
}

interface TestForm {
  webhookId: string;
  eventType: WebhookEventType;
  customPayload?: string;
  useCustomPayload: boolean;
}

interface TestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  response?: any;
  error?: string;
  timestamp: string;
}

const SAMPLE_PAYLOADS: Record<WebhookEventType, any> = {
  [WebhookEventType.ORDER_CREATED]: {
    orderId: 'test-order-12345',
    customerId: 'customer-67890',
    items: [
      {
        id: 'item-1',
        name: 'Chicken Burger',
        quantity: 2,
        price: 25.99,
        modifiers: ['Extra Cheese', 'No Pickles']
      }
    ],
    total: 51.98,
    currency: 'USD',
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      postalCode: '12345'
    },
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.ORDER_UPDATED]: {
    orderId: 'test-order-12345',
    status: 'confirmed',
    estimatedDeliveryTime: '30 minutes',
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.ORDER_CANCELLED]: {
    orderId: 'test-order-12345',
    reason: 'Customer requested cancellation',
    refundAmount: 51.98,
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.ORDER_DELIVERED]: {
    orderId: 'test-order-12345',
    deliveredAt: new Date().toISOString(),
    driverId: 'driver-456',
    customerRating: 5
  },
  [WebhookEventType.ORDER_CONFIRMED]: {
    orderId: 'test-order-12345',
    confirmedAt: new Date().toISOString(),
    preparationTime: 25
  },
  [WebhookEventType.ORDER_PREPARED]: {
    orderId: 'test-order-12345',
    preparedAt: new Date().toISOString(),
    readyForPickup: true
  },
  [WebhookEventType.ORDER_PICKED_UP]: {
    orderId: 'test-order-12345',
    pickedUpAt: new Date().toISOString(),
    driverId: 'driver-456'
  },
  [WebhookEventType.MENU_UPDATED]: {
    restaurantId: 'restaurant-123',
    updatedItems: ['item-1', 'item-2'],
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.ITEM_AVAILABILITY_CHANGED]: {
    itemId: 'item-1',
    available: false,
    reason: 'Out of stock',
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.CONNECTION_TEST]: {
    test: true,
    timestamp: new Date().toISOString(),
    message: 'This is a connection test'
  },
  [WebhookEventType.SYSTEM_ALERT]: {
    alertType: 'warning',
    message: 'System maintenance scheduled',
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.CAREEM_ORDER_NOTIFICATION]: {
    careemOrderId: 'careem-order-789',
    restaurantId: 'restaurant-123',
    items: [{ name: 'Test Item', quantity: 1, price: 15.00 }],
    total: 15.00,
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.TALABAT_STATUS_UPDATE]: {
    talabatOrderId: 'talabat-order-456',
    status: 'preparing',
    estimatedTime: 20,
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.DELIVEROO_ORDER_EVENT]: {
    deliverooOrderId: 'deliveroo-order-321',
    event: 'rider_assigned',
    riderId: 'rider-654',
    timestamp: new Date().toISOString()
  },
  [WebhookEventType.JAHEZ_ORDER_ACTION]: {
    jahezOrderId: 'jahez-order-987',
    action: 'confirm',
    preparationTime: 30,
    timestamp: new Date().toISOString()
  }
};

const WebhookTestPanel: React.FC<WebhookTestPanelProps> = ({
  isOpen,
  onClose,
  webhookConfigs
}) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const form = useForm<TestForm>({
    defaultValues: {
      useCustomPayload: false,
      eventType: WebhookEventType.CONNECTION_TEST
    }
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (data: { webhookId: string; payload: WebhookTestPayload }) => {
      const startTime = Date.now();

      try {
        const response = await fetch(`/api/webhooks/${data.webhookId}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.payload)
        });

        const responseTime = Date.now() - startTime;
        const responseData = await response.json();

        return {
          success: response.ok,
          responseTime,
          statusCode: response.status,
          response: responseData,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
      }
    },
    onSuccess: (result) => {
      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      setIsRunningTest(false);

      if (result.success) {
        toast.success(`Webhook test completed successfully (${result.responseTime}ms)`);
      } else {
        toast.error(`Webhook test failed: ${result.error || `HTTP ${result.statusCode}`}`);
      }
    },
    onError: (error) => {
      setIsRunningTest(false);
      toast.error(`Test failed: ${error.message}`);
    }
  });

  const onSubmit = (data: TestForm) => {
    if (!data.webhookId) {
      toast.error('Please select a webhook configuration');
      return;
    }

    const selectedWebhook = webhookConfigs.find(w => w.id === data.webhookId);
    if (!selectedWebhook) {
      toast.error('Selected webhook configuration not found');
      return;
    }

    setIsRunningTest(true);

    let payload: any;
    if (data.useCustomPayload && data.customPayload) {
      try {
        payload = JSON.parse(data.customPayload);
      } catch (error) {
        toast.error('Invalid JSON in custom payload');
        setIsRunningTest(false);
        return;
      }
    } else {
      payload = SAMPLE_PAYLOADS[data.eventType] || { test: true, timestamp: new Date().toISOString() };
    }

    const testPayload: WebhookTestPayload = {
      provider: selectedWebhook.provider,
      clientId: selectedWebhook.clientId,
      eventType: data.eventType,
      customPayload: payload
    };

    testWebhookMutation.mutate({
      webhookId: data.webhookId,
      payload: testPayload
    });
  };

  const runAllTests = async () => {
    if (webhookConfigs.length === 0) {
      toast.error('No webhook configurations available to test');
      return;
    }

    setIsRunningTest(true);
    setTestResults([]);

    for (const webhook of webhookConfigs) {
      if (!webhook.isActive) continue;

      const testPayload: WebhookTestPayload = {
        provider: webhook.provider,
        clientId: webhook.clientId,
        eventType: WebhookEventType.CONNECTION_TEST,
        customPayload: SAMPLE_PAYLOADS[WebhookEventType.CONNECTION_TEST]
      };

      try {
        const result = await testWebhookMutation.mutateAsync({
          webhookId: webhook.id,
          payload: testPayload
        });

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Error handling is done in the mutation
        continue;
      }
    }

    setIsRunningTest(false);
    toast.success('Batch testing completed');
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 1000) return 'text-green-600';
    if (responseTime < 3000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const selectedWebhook = webhookConfigs.find(w => w.id === form.watch('webhookId'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Webhook Testing Panel
          </DialogTitle>
          <DialogDescription>
            Test your webhook endpoints to ensure they're working correctly
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Test Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Test Configuration</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={runAllTests}
                disabled={isRunningTest || webhookConfigs.length === 0}
                className="flex items-center gap-2"
              >
                {isRunningTest ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Test All
              </Button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="webhook-select">Select Webhook</Label>
                <Controller
                  name="webhookId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a webhook to test" />
                      </SelectTrigger>
                      <SelectContent>
                        {webhookConfigs.map((webhook) => (
                          <SelectItem key={webhook.id} value={webhook.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                                {webhook.provider}
                              </Badge>
                              <span className="truncate">{webhook.url}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {selectedWebhook && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <p><strong>Provider:</strong> {selectedWebhook.provider}</p>
                    <p><strong>URL:</strong> {selectedWebhook.url}</p>
                    <p><strong>Events:</strong> {selectedWebhook.events.length} configured</p>
                    <p><strong>Status:</strong>
                      <Badge variant={selectedWebhook.isActive ? 'default' : 'secondary'} className="ml-1">
                        {selectedWebhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Controller
                  name="eventType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(WebhookEventType).map((eventType) => (
                          <SelectItem key={eventType} value={eventType}>
                            {eventType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="useCustomPayload"
                  control={form.control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded"
                    />
                  )}
                />
                <Label className="text-sm">Use custom payload</Label>
              </div>

              {form.watch('useCustomPayload') && (
                <div>
                  <Label htmlFor="custom-payload">Custom JSON Payload</Label>
                  <Textarea
                    {...form.register('customPayload')}
                    placeholder='{"test": true, "timestamp": "2023-..."}'
                    className="mt-1 font-mono text-sm"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter valid JSON payload for testing
                  </p>
                </div>
              )}

              {!form.watch('useCustomPayload') && (
                <div>
                  <Label>Sample Payload Preview</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-600 overflow-auto">
                      {JSON.stringify(SAMPLE_PAYLOADS[form.watch('eventType')] || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isRunningTest || !form.watch('webhookId')}
                className="w-full flex items-center gap-2"
              >
                {isRunningTest ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isRunningTest ? 'Testing...' : 'Send Test Request'}
              </Button>
            </form>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Code className="w-5 h-5" />
              Test Results
            </h3>

            <ScrollArea className="h-[500px]">
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No test results yet</p>
                  <p className="text-sm">Run a test to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result)}
                          <span className="font-medium">
                            {result.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-3 h-3" />
                          <span className={getResponseTimeColor(result.responseTime)}>
                            {result.responseTime}ms
                          </span>
                        </div>
                      </div>

                      <div className="text-sm space-y-1">
                        <p><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                        {result.statusCode && (
                          <p><strong>Status Code:</strong> {result.statusCode}</p>
                        )}
                        {result.error && (
                          <p className="text-red-600"><strong>Error:</strong> {result.error}</p>
                        )}
                        {result.response && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600">View Response</summary>
                            <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto">
                              {JSON.stringify(result.response, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebhookTestPanel;