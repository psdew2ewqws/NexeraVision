import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Info, Settings, Shield, Zap } from 'lucide-react';

interface CareemWebhookConfigProps {
  form: UseFormReturn<any>;
}

const CareemWebhookConfig: React.FC<CareemWebhookConfigProps> = ({ form }) => {
  const { register, watch, setValue, control } = form;

  return (
    <div className="space-y-6">
      {/* Careem Specific Info */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Zap className="w-5 h-5" />
            Careem Now Integration
          </CardTitle>
          <CardDescription className="text-green-700">
            Configure your webhook endpoint to receive real-time order notifications from Careem Now
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
            <Info className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">Careem Webhook Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>HTTPS endpoint required for production</li>
                <li>Must respond with 200 status code within 5 seconds</li>
                <li>HMAC-SHA256 signature validation recommended</li>
                <li>Support for order lifecycle events</li>
              </ul>
            </div>
          </div>

          {/* Careem-specific URL validation */}
          <div>
            <Label htmlFor="careem-endpoint">Careem Webhook Endpoint</Label>
            <Input
              {...register('url')}
              placeholder="https://your-domain.com/webhooks/careem"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This URL will be registered with Careem to receive order notifications
            </p>
          </div>

          {/* Careem Store Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="careem-store-id">Careem Store ID</Label>
              <Input
                {...register('metadata.careemStoreId')}
                placeholder="Store ID from Careem"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="careem-branch-id">Branch ID</Label>
              <Input
                {...register('metadata.branchId')}
                placeholder="Your internal branch ID"
                className="mt-1"
              />
            </div>
          </div>

          {/* Order Processing Settings */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Order Processing Settings
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.autoAcceptOrders') || false}
                  onCheckedChange={(checked) => setValue('metadata.autoAcceptOrders', checked)}
                />
                <Label className="text-sm">Auto-accept orders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.sendOrderConfirmation') || true}
                  onCheckedChange={(checked) => setValue('metadata.sendOrderConfirmation', checked)}
                />
                <Label className="text-sm">Send order confirmation</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="preparation-time">Default Preparation Time (minutes)</Label>
              <Input
                {...register('metadata.defaultPrepTime', { valueAsNumber: true })}
                type="number"
                min="5"
                max="120"
                placeholder="30"
                className="mt-1"
              />
            </div>
          </div>

          {/* Notification Settings */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Notification Preferences</h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnNewOrder') || true}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnNewOrder', checked)}
                />
                <Label className="text-sm">Notify on new orders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnCancellation') || true}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnCancellation', checked)}
                />
                <Label className="text-sm">Notify on order cancellation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnStatusUpdate') || false}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnStatusUpdate', checked)}
                />
                <Label className="text-sm">Notify on status updates</Label>
              </div>
            </div>
          </div>

          {/* Custom Headers for Careem */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Careem Authentication Headers
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="careem-api-key">Careem API Key</Label>
                <Input
                  {...register('metadata.careemApiKey')}
                  type="password"
                  placeholder="Your Careem API key"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="careem-merchant-id">Merchant ID</Label>
                <Input
                  {...register('metadata.careemMerchantId')}
                  placeholder="Careem merchant identifier"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Error Handling */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Error Handling</h4>

            <div>
              <Label htmlFor="error-webhook">Error Notification Webhook (Optional)</Label>
              <Input
                {...register('metadata.errorWebhookUrl')}
                placeholder="https://your-domain.com/webhooks/careem/errors"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate endpoint to receive error notifications
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.retryFailedOrders') || false}
                onCheckedChange={(checked) => setValue('metadata.retryFailedOrders', checked)}
              />
              <Label className="text-sm">Retry failed order processing</Label>
            </div>
          </div>

          {/* Testing Configuration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Testing & Validation</h4>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.enableTestMode') || false}
                onCheckedChange={(checked) => setValue('metadata.enableTestMode', checked)}
              />
              <Label className="text-sm">Enable test mode</Label>
            </div>

            {watch('metadata.enableTestMode') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Test Mode Enabled:</strong> This configuration will only process test orders.
                  Remember to disable test mode for production use.
                </p>
              </div>
            )}
          </div>

          {/* Supported Events for Careem */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Careem-Specific Events</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">order.created</Badge>
              <Badge variant="outline">order.confirmed</Badge>
              <Badge variant="outline">order.prepared</Badge>
              <Badge variant="outline">order.picked_up</Badge>
              <Badge variant="outline">order.delivered</Badge>
              <Badge variant="outline">order.cancelled</Badge>
              <Badge variant="outline">careem.order_notification</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CareemWebhookConfig;