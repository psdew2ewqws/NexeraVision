import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Info, Settings, Shield, Truck, Bell, Globe } from 'lucide-react';

interface DeliverooWebhookConfigProps {
  form: UseFormReturn<any>;
}

const DELIVEROO_MARKETS = [
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ireland', label: 'Ireland' },
  { value: 'france', label: 'France' },
  { value: 'spain', label: 'Spain' },
  { value: 'italy', label: 'Italy' },
  { value: 'germany', label: 'Germany' },
  { value: 'netherlands', label: 'Netherlands' },
  { value: 'belgium', label: 'Belgium' },
  { value: 'australia', label: 'Australia' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'uae', label: 'UAE' },
  { value: 'kuwait', label: 'Kuwait' },
];

const KITCHEN_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'dark_kitchen', label: 'Dark Kitchen' },
  { value: 'virtual_brand', label: 'Virtual Brand' },
  { value: 'marketplace', label: 'Marketplace' },
];

const DeliverooWebhookConfig: React.FC<DeliverooWebhookConfigProps> = ({ form }) => {
  const { register, watch, setValue, control } = form;

  return (
    <div className="space-y-6">
      {/* Deliveroo Specific Info */}
      <Card className="border-teal-200 bg-teal-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-teal-800">
            <Truck className="w-5 h-5" />
            Deliveroo Integration
          </CardTitle>
          <CardDescription className="text-teal-700">
            Configure your webhook endpoint to receive order events from Deliveroo platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
            <Info className="w-5 h-5 text-teal-600 mt-0.5" />
            <div className="text-sm text-teal-700">
              <p className="font-medium mb-1">Deliveroo Webhook Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>HTTPS endpoint required with valid SSL certificate</li>
                <li>Response within 5 seconds with 2xx status code</li>
                <li>JSON webhook payload with signature verification</li>
                <li>Order acknowledgment within 2 minutes</li>
                <li>Real-time menu availability updates</li>
              </ul>
            </div>
          </div>

          {/* Market & Restaurant Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveroo-market">Deliveroo Market</Label>
              <Select
                value={watch('metadata.deliverooMarket')}
                onValueChange={(value) => setValue('metadata.deliverooMarket', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVEROO_MARKETS.map((market) => (
                    <SelectItem key={market.value} value={market.value}>
                      {market.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kitchen-type">Kitchen Type</Label>
              <Select
                value={watch('metadata.kitchenType')}
                onValueChange={(value) => setValue('metadata.kitchenType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {KITCHEN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveroo-restaurant-id">Restaurant ID</Label>
              <Input
                {...register('metadata.deliverooRestaurantId')}
                placeholder="Deliveroo restaurant ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="deliveroo-site-id">Site ID</Label>
              <Input
                {...register('metadata.deliverooSiteId')}
                placeholder="Deliveroo site identifier"
                className="mt-1"
              />
            </div>
          </div>

          {/* Order Processing Settings */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Order Processing
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
                  checked={watch('metadata.enableOrderBatching') || false}
                  onCheckedChange={(checked) => setValue('metadata.enableOrderBatching', checked)}
                />
                <Label className="text-sm">Enable order batching</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="preparation-time">Preparation Time (min)</Label>
                <Input
                  {...register('metadata.preparationTime', { valueAsNumber: true })}
                  type="number"
                  min="5"
                  max="120"
                  placeholder="25"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pickup-time">Pickup Time (min)</Label>
                <Input
                  {...register('metadata.pickupTime', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="30"
                  placeholder="5"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="max-acceptance-time">Max Acceptance Time (sec)</Label>
                <Input
                  {...register('metadata.maxAcceptanceTime', { valueAsNumber: true })}
                  type="number"
                  min="30"
                  max="300"
                  placeholder="120"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Menu Management */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Menu Management
            </h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableRealTimeMenu') || true}
                  onCheckedChange={(checked) => setValue('metadata.enableRealTimeMenu', checked)}
                />
                <Label className="text-sm">Real-time menu updates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.syncItemAvailability') || true}
                  onCheckedChange={(checked) => setValue('metadata.syncItemAvailability', checked)}
                />
                <Label className="text-sm">Sync item availability</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableModifierSync') || false}
                  onCheckedChange={(checked) => setValue('metadata.enableModifierSync', checked)}
                />
                <Label className="text-sm">Sync modifiers and add-ons</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enablePriceSync') || false}
                  onCheckedChange={(checked) => setValue('metadata.enablePriceSync', checked)}
                />
                <Label className="text-sm">Sync pricing changes</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="menu-update-endpoint">Menu Update Endpoint</Label>
              <Input
                {...register('metadata.menuUpdateEndpoint')}
                placeholder="https://api.deliveroo.com/v1/restaurants/{id}/menu"
                className="mt-1"
              />
            </div>
          </div>

          {/* Authentication & API Configuration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              API Authentication
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveroo-api-key">API Key</Label>
                <Input
                  {...register('metadata.deliverooApiKey')}
                  type="password"
                  placeholder="Your Deliveroo API key"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="webhook-signing-secret">Webhook Signing Secret</Label>
                <Input
                  {...register('metadata.webhookSigningSecret')}
                  type="password"
                  placeholder="Deliveroo webhook signing secret"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client-id">Client ID</Label>
                <Input
                  {...register('metadata.clientId')}
                  placeholder="OAuth client ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input
                  {...register('metadata.clientSecret')}
                  type="password"
                  placeholder="OAuth client secret"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.enableSignatureValidation') || true}
                onCheckedChange={(checked) => setValue('metadata.enableSignatureValidation', checked)}
              />
              <Label className="text-sm">Enable webhook signature validation</Label>
            </div>
          </div>

          {/* Notification Preferences */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notification Preferences
            </h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnNewOrder') || true}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnNewOrder', checked)}
                />
                <Label className="text-sm">New order notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnOrderCancellation') || true}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnOrderCancellation', checked)}
                />
                <Label className="text-sm">Order cancellation notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnDeliveryUpdate') || false}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnDeliveryUpdate', checked)}
                />
                <Label className="text-sm">Delivery status notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.notifyOnMenuErrors') || true}
                  onCheckedChange={(checked) => setValue('metadata.notifyOnMenuErrors', checked)}
                />
                <Label className="text-sm">Menu sync error notifications</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input
                {...register('metadata.notificationEmail')}
                type="email"
                placeholder="orders@restaurant.com"
                className="mt-1"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Advanced Configuration</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rider-assignment-mode">Rider Assignment</Label>
                <Select
                  value={watch('metadata.riderAssignmentMode')}
                  onValueChange={(value) => setValue('metadata.riderAssignmentMode', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="delivery-radius">Delivery Radius (km)</Label>
                <Input
                  {...register('metadata.deliveryRadius', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="50"
                  step="0.1"
                  placeholder="5.0"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enablePreOrders') || false}
                  onCheckedChange={(checked) => setValue('metadata.enablePreOrders', checked)}
                />
                <Label className="text-sm">Enable pre-orders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableTableService') || false}
                  onCheckedChange={(checked) => setValue('metadata.enableTableService', checked)}
                />
                <Label className="text-sm">Enable table service</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableCollectionOrders') || true}
                  onCheckedChange={(checked) => setValue('metadata.enableCollectionOrders', checked)}
                />
                <Label className="text-sm">Enable collection orders</Label>
              </div>
            </div>
          </div>

          {/* Error Handling */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Error Handling & Monitoring</h4>

            <div>
              <Label htmlFor="error-callback-url">Error Callback URL</Label>
              <Input
                {...register('metadata.errorCallbackUrl')}
                placeholder="https://your-domain.com/webhooks/deliveroo/errors"
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.enableDetailedLogging') || false}
                onCheckedChange={(checked) => setValue('metadata.enableDetailedLogging', checked)}
              />
              <Label className="text-sm">Enable detailed logging</Label>
            </div>

            <div>
              <Label htmlFor="monitoring-notes">Monitoring Notes</Label>
              <Textarea
                {...register('metadata.monitoringNotes')}
                placeholder="Add any specific monitoring requirements or notes..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Environment Configuration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Environment & Testing</h4>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.enableSandboxMode') || false}
                onCheckedChange={(checked) => setValue('metadata.enableSandboxMode', checked)}
              />
              <Label className="text-sm">Enable sandbox mode</Label>
            </div>

            {watch('metadata.enableSandboxMode') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Sandbox Mode:</strong> Using Deliveroo's test environment.
                  Ensure to switch to production before going live.
                </p>
              </div>
            )}
          </div>

          {/* Supported Events for Deliveroo */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Deliveroo-Specific Events</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">order.created</Badge>
              <Badge variant="outline">order.confirmed</Badge>
              <Badge variant="outline">order.prepared</Badge>
              <Badge variant="outline">order.rider_assigned</Badge>
              <Badge variant="outline">order.collected</Badge>
              <Badge variant="outline">order.delivered</Badge>
              <Badge variant="outline">order.cancelled</Badge>
              <Badge variant="outline">deliveroo.order_event</Badge>
              <Badge variant="outline">menu.updated</Badge>
              <Badge variant="outline">item.availability_changed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliverooWebhookConfig;