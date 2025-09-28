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
import { Info, Settings, Shield, MapPin, Clock, Star } from 'lucide-react';

interface JahezWebhookConfigProps {
  form: UseFormReturn<any>;
}

const SAUDI_CITIES = [
  { value: 'riyadh', label: 'Riyadh' },
  { value: 'jeddah', label: 'Jeddah' },
  { value: 'dammam', label: 'Dammam' },
  { value: 'mecca', label: 'Mecca' },
  { value: 'medina', label: 'Medina' },
  { value: 'khobar', label: 'Khobar' },
  { value: 'taif', label: 'Taif' },
  { value: 'tabuk', label: 'Tabuk' },
  { value: 'abha', label: 'Abha' },
  { value: 'khamis_mushait', label: 'Khamis Mushait' },
];

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'fast_food', label: 'Fast Food' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'street_food', label: 'Street Food' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'juice_bar', label: 'Juice Bar' },
];

const JahezWebhookConfig: React.FC<JahezWebhookConfigProps> = ({ form }) => {
  const { register, watch, setValue, control } = form;

  return (
    <div className="space-y-6">
      {/* Jahez Specific Info */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Star className="w-5 h-5" />
            Jahez Integration
          </CardTitle>
          <CardDescription className="text-purple-700">
            Configure your webhook endpoint for Jahez delivery platform integration in Saudi Arabia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
            <Info className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-700">
              <p className="font-medium mb-1">Jahez Webhook Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>HTTPS endpoint mandatory for production</li>
                <li>Response time under 10 seconds</li>
                <li>Arabic language support for customer communications</li>
                <li>Saudi Arabia timezone (UTC+3) compliance</li>
                <li>Local payment method support (Mada, STC Pay, etc.)</li>
                <li>Halal certification compliance tracking</li>
              </ul>
            </div>
          </div>

          {/* Location & Business Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jahez-city">Operating City</Label>
              <Select
                value={watch('metadata.jahezCity')}
                onValueChange={(value) => setValue('metadata.jahezCity', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {SAUDI_CITIES.map((city) => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="business-type">Business Type</Label>
              <Select
                value={watch('metadata.businessType')}
                onValueChange={(value) => setValue('metadata.businessType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
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
              <Label htmlFor="jahez-restaurant-id">Jahez Restaurant ID</Label>
              <Input
                {...register('metadata.jahezRestaurantId')}
                placeholder="Jahez restaurant identifier"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="commercial-register">Commercial Register No.</Label>
              <Input
                {...register('metadata.commercialRegisterNumber')}
                placeholder="Saudi commercial register number"
                className="mt-1"
              />
            </div>
          </div>

          {/* Arabic Localization */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Arabic Localization
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="restaurant-name-arabic">Restaurant Name (Arabic)</Label>
                <Input
                  {...register('metadata.restaurantNameArabic')}
                  placeholder="اسم المطعم بالعربية"
                  className="mt-1 text-right"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="restaurant-name-english">Restaurant Name (English)</Label>
                <Input
                  {...register('metadata.restaurantNameEnglish')}
                  placeholder="Restaurant name in English"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address-arabic">Address (Arabic)</Label>
              <Textarea
                {...register('metadata.addressArabic')}
                placeholder="العنوان بالعربية"
                className="mt-1 text-right"
                dir="rtl"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.enableArabicSupport') || true}
                onCheckedChange={(checked) => setValue('metadata.enableArabicSupport', checked)}
              />
              <Label className="text-sm">Enable Arabic language support</Label>
            </div>
          </div>

          {/* Order Processing */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Order Processing
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
                  checked={watch('metadata.enableOrderScheduling') || true}
                  onCheckedChange={(checked) => setValue('metadata.enableOrderScheduling', checked)}
                />
                <Label className="text-sm">Enable order scheduling</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="preparation-time">Preparation Time (min)</Label>
                <Input
                  {...register('metadata.preparationTime', { valueAsNumber: true })}
                  type="number"
                  min="10"
                  max="180"
                  placeholder="35"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="min-order-value">Min Order Value (SAR)</Label>
                <Input
                  {...register('metadata.minimumOrderValue', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="delivery-fee">Delivery Fee (SAR)</Label>
                <Input
                  {...register('metadata.deliveryFee', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5.00"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Prayer Times Integration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Prayer Times & Operating Hours
            </h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.respectPrayerTimes') || true}
                  onCheckedChange={(checked) => setValue('metadata.respectPrayerTimes', checked)}
                />
                <Label className="text-sm">Respect prayer times for operations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.pauseOrdersDuringPrayer') || false}
                  onCheckedChange={(checked) => setValue('metadata.pauseOrdersDuringPrayer', checked)}
                />
                <Label className="text-sm">Pause orders during prayer times</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableRamadanHours') || true}
                  onCheckedChange={(checked) => setValue('metadata.enableRamadanHours', checked)}
                />
                <Label className="text-sm">Enable special Ramadan hours</Label>
              </div>
            </div>

            {watch('metadata.pauseOrdersDuringPrayer') && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Orders will be automatically paused during the 5 daily prayer times.
                  Customers will see estimated resume times.
                </p>
              </div>
            )}
          </div>

          {/* Payment Integration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Payment & Authentication
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jahez-api-key">Jahez API Key</Label>
                <Input
                  {...register('metadata.jahezApiKey')}
                  type="password"
                  placeholder="Your Jahez API key"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="webhook-secret">Webhook Secret</Label>
                <Input
                  {...register('metadata.jahezWebhookSecret')}
                  type="password"
                  placeholder="Jahez webhook secret"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Supported Payment Methods</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={watch('metadata.acceptCash') || true}
                    onCheckedChange={(checked) => setValue('metadata.acceptCash', checked)}
                  />
                  <Label className="text-sm">Cash on Delivery</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={watch('metadata.acceptMada') || true}
                    onCheckedChange={(checked) => setValue('metadata.acceptMada', checked)}
                  />
                  <Label className="text-sm">Mada Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={watch('metadata.acceptVisa') || true}
                    onCheckedChange={(checked) => setValue('metadata.acceptVisa', checked)}
                  />
                  <Label className="text-sm">Visa/Mastercard</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={watch('metadata.acceptSTCPay') || true}
                    onCheckedChange={(checked) => setValue('metadata.acceptSTCPay', checked)}
                  />
                  <Label className="text-sm">STC Pay</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={watch('metadata.acceptApplePay') || false}
                    onCheckedChange={(checked) => setValue('metadata.acceptApplePay', checked)}
                  />
                  <Label className="text-sm">Apple Pay</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={watch('metadata.acceptTamara') || false}
                    onCheckedChange={(checked) => setValue('metadata.acceptTamara', checked)}
                  />
                  <Label className="text-sm">Tamara (Buy Now, Pay Later)</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Certifications */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Compliance & Certifications</h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.isHalalCertified') || false}
                  onCheckedChange={(checked) => setValue('metadata.isHalalCertified', checked)}
                />
                <Label className="text-sm">Halal Certified</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.hasFoodSafetyLicense') || false}
                  onCheckedChange={(checked) => setValue('metadata.hasFoodSafetyLicense', checked)}
                />
                <Label className="text-sm">Food Safety License</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.hasHealthPermit') || false}
                  onCheckedChange={(checked) => setValue('metadata.hasHealthPermit', checked)}
                />
                <Label className="text-sm">Health Department Permit</Label>
              </div>
            </div>

            {watch('metadata.isHalalCertified') && (
              <div>
                <Label htmlFor="halal-cert-number">Halal Certificate Number</Label>
                <Input
                  {...register('metadata.halalCertificateNumber')}
                  placeholder="Halal certification number"
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Customer Communication */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Customer Communication</h4>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableSMSNotifications') || true}
                  onCheckedChange={(checked) => setValue('metadata.enableSMSNotifications', checked)}
                />
                <Label className="text-sm">Enable SMS notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.enableWhatsAppNotifications') || false}
                  onCheckedChange={(checked) => setValue('metadata.enableWhatsAppNotifications', checked)}
                />
                <Label className="text-sm">Enable WhatsApp notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('metadata.sendArabicMessages') || true}
                  onCheckedChange={(checked) => setValue('metadata.sendArabicMessages', checked)}
                />
                <Label className="text-sm">Send messages in Arabic</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="contact-phone">Contact Phone Number</Label>
              <Input
                {...register('metadata.contactPhone')}
                placeholder="+966 5X XXX XXXX"
                className="mt-1"
              />
            </div>
          </div>

          {/* Delivery Configuration */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Delivery Configuration</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery-radius">Delivery Radius (km)</Label>
                <Input
                  {...register('metadata.deliveryRadius', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="30"
                  step="0.5"
                  placeholder="8.0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="estimated-delivery">Estimated Delivery Time (min)</Label>
                <Input
                  {...register('metadata.estimatedDeliveryTime', { valueAsNumber: true })}
                  type="number"
                  min="15"
                  max="120"
                  placeholder="45"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.offerExpressDelivery') || false}
                onCheckedChange={(checked) => setValue('metadata.offerExpressDelivery', checked)}
              />
              <Label className="text-sm">Offer express delivery option</Label>
            </div>
          </div>

          {/* Testing & Environment */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Testing & Environment</h4>

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
                  <strong>Test Mode:</strong> Using Jahez sandbox environment.
                  Remember to disable for production deployment.
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('metadata.enableDebugLogging') || false}
                onCheckedChange={(checked) => setValue('metadata.enableDebugLogging', checked)}
              />
              <Label className="text-sm">Enable debug logging</Label>
            </div>
          </div>

          {/* Supported Events for Jahez */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Jahez-Specific Events</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">order.created</Badge>
              <Badge variant="outline">order.confirmed</Badge>
              <Badge variant="outline">order.prepared</Badge>
              <Badge variant="outline">order.out_for_delivery</Badge>
              <Badge variant="outline">order.delivered</Badge>
              <Badge variant="outline">order.cancelled</Badge>
              <Badge variant="outline">jahez.order_action</Badge>
              <Badge variant="outline">payment.processed</Badge>
              <Badge variant="outline">menu.updated</Badge>
              <Badge variant="outline">restaurant.status_changed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JahezWebhookConfig;