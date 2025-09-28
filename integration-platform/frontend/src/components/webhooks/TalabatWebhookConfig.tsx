import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Info, Settings, Shield, Clock, MapPin } from 'lucide-react';

interface TalabatWebhookConfigProps {
  form: UseFormReturn<any>;
}

const TALABAT_REGIONS = [
  { value: 'uae', label: 'UAE' },
  { value: 'saudi', label: 'Saudi Arabia' },
  { value: 'kuwait', label: 'Kuwait' },
  { value: 'bahrain', label: 'Bahrain' },
  { value: 'oman', label: 'Oman' },
  { value: 'qatar', label: 'Qatar' },
  { value: 'jordan', label: 'Jordan' },
  { value: 'egypt', label: 'Egypt' },
];

const TalabatWebhookConfig: React.FC<TalabatWebhookConfigProps> = ({ form }) => {
  const { register, watch, setValue, control } = form;

  return (
    <div className="space-y-6">
      {/* Talabat Specific Info */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="w-5 h-5" />
            Talabat Integration
          </CardTitle>
          <CardDescription className="text-orange-700">
            Configure your webhook endpoint to receive order updates from Talabat delivery platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200">
            <Info className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-700">
              <p className="font-medium mb-1">Talabat Webhook Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>HTTPS endpoint mandatory for all environments</li>
                <li>Response time must be under 3 seconds</li>
                <li>Support for JSON payload format</li>
                <li>Regional configuration required</li>
                <li>Order acknowledgment within 60 seconds</li>
              </ul>
            </div>
          </div>

          {/* Talabat Region & Store Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="talabat-region">Talabat Region</Label>
              <Select
                value={watch('metadata.talabatRegion')}
                onValueChange={(value) => setValue('metadata.talabatRegion', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {TALABAT_REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="talabat-restaurant-id">Restaurant ID</Label>
              <Input
                {...register('metadata.talabatRestaurantId')}
                placeholder="Talabat restaurant ID"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="talabat-branch-code">Branch Code</Label>
              <Input
                {...register('metadata.talabatBranchCode')}
                placeholder="Talabat branch identifier"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="internal-branch-id">Internal Branch ID</Label>
              <Input
                {...register('metadata.internalBranchId')}
                placeholder="Your internal branch ID"
                className="mt-1"
              />
            </div>
          </div>

          {/* Order Management Settings */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Order Management
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.autoConfirmOrders') || false}
                  onCheckedChange={(checked) => setValue('metadata.autoConfirmOrders', checked)}
                />
                <Label className="text-sm">Auto-confirm orders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.requireOrderAcknowledgment') || true}
                  onCheckedChange={(checked) => setValue('metadata.requireOrderAcknowledgment', checked)}
                />
                <Label className="text-sm">Require acknowledgment</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order-prep-time">Order Preparation Time (minutes)</Label>
                <Input
                  {...register('metadata.orderPrepTime', { valueAsNumber: true })}
                  type="number"
                  min="10"
                  max="180"
                  placeholder="45"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="acknowledgment-timeout">Acknowledgment Timeout (seconds)</Label>
                <Input
                  {...register('metadata.acknowledgmentTimeout', { valueAsNumber: true })}
                  type="number"
                  min="30"
                  max="300"
                  placeholder="60"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Menu Synchronization */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Menu Synchronization
            </h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableMenuSync') || false}
                  onCheckedChange={(checked) => setValue('metadata.enableMenuSync', checked)}
                />
                <Label className="text-sm">Enable menu synchronization</Label>
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
                  checked={watch('metadata.syncPricing') || false}
                  onCheckedChange={(checked) => setValue('metadata.syncPricing', checked)}
                />
                <Label className="text-sm">Sync pricing updates</Label>
              </div>
            </div>

            {watch('metadata.enableMenuSync') && (
              <div>
                <Label htmlFor="menu-sync-interval">Menu Sync Interval (minutes)</Label>
                <Select
                  value={watch('metadata.menuSyncInterval')}
                  onValueChange={(value) => setValue('metadata.menuSyncInterval', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                    <SelectItem value="180">Every 3 hours</SelectItem>
                    <SelectItem value="360">Every 6 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Authentication & Security */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Authentication & Security
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="talabat-api-key">Talabat API Key</Label>
                <Input
                  {...register('metadata.talabatApiKey')}
                  type="password"
                  placeholder="Your Talabat API key"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="talabat-secret">Webhook Secret</Label>
                <Input
                  {...register('metadata.talabatWebhookSecret')}
                  type="password"
                  placeholder="Talabat webhook secret"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.validateTalabatSignature') || true}
                onCheckedChange={(checked) => setValue('metadata.validateTalabatSignature', checked)}
              />
              <Label className="text-sm">Validate Talabat signature</Label>
            </div>
          </div>

          {/* Delivery Tracking */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Delivery Tracking</h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableDeliveryTracking') || true}
                  onCheckedChange={(checked) => setValue('metadata.enableDeliveryTracking', checked)}
                />
                <Label className="text-sm">Enable delivery tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.sendDeliveryUpdates') || false}
                  onCheckedChange={(checked) => setValue('metadata.sendDeliveryUpdates', checked)}
                />
                <Label className="text-sm">Send delivery status updates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.trackDriverLocation') || false}
                  onCheckedChange={(checked) => setValue('metadata.trackDriverLocation', checked)}
                />
                <Label className="text-sm">Track driver location</Label>
              </div>
            </div>
          </div>

          {/* Business Rules */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Business Rules</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimum-order-value">Minimum Order Value</Label>
                <Input
                  {...register('metadata.minimumOrderValue', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maximum-order-value">Maximum Order Value</Label>
                <Input
                  {...register('metadata.maximumOrderValue', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1000.00"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.rejectOrdersOutsideHours') || false}
                onCheckedChange={(checked) => setValue('metadata.rejectOrdersOutsideHours', checked)}
              />
              <Label className="text-sm">Reject orders outside operating hours</Label>
            </div>
          </div>

          {/* Testing Configuration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Testing & Debug</h4>

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
                  <strong>Sandbox Mode:</strong> Using Talabat's test environment.
                  Switch to production before going live.
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.logAllRequests') || false}
                onCheckedChange={(checked) => setValue('metadata.logAllRequests', checked)}
              />
              <Label className="text-sm">Log all webhook requests</Label>
            </div>
          </div>

          {/* Supported Events for Talabat */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Talabat-Specific Events</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">order.created</Badge>
              <Badge variant="outline">order.confirmed</Badge>
              <Badge variant="outline">order.prepared</Badge>
              <Badge variant="outline">order.dispatched</Badge>
              <Badge variant="outline">order.delivered</Badge>
              <Badge variant="outline">order.cancelled</Badge>
              <Badge variant="outline">talabat.status_update</Badge>
              <Badge variant="outline">menu.updated</Badge>
              <Badge variant="outline">item.availability_changed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TalabatWebhookConfig;