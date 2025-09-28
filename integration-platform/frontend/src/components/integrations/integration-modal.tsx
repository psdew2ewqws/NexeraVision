'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Integration, DeliveryProvider, IntegrationForm } from '@/types';
import { capitalize } from '@/lib/utils';

const integrationSchema = z.object({
  provider: z.enum(['careem', 'talabat', 'deliveroo', 'uber_eats', 'jahez']),
  api_key: z.string().min(1, 'API Key is required'),
  secret_key: z.string().optional(),
  store_id: z.string().optional(),
  brand_id: z.string().optional(),
  auto_accept_orders: z.boolean().default(false),
  sync_menu: z.boolean().default(false),
  sync_inventory: z.boolean().default(false),
});

interface IntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: Integration;
  onSave: (data: IntegrationForm) => Promise<void>;
}

const providerFields = {
  careem: ['api_key', 'store_id', 'brand_id'],
  talabat: ['api_key', 'secret_key', 'store_id'],
  deliveroo: ['api_key', 'store_id'],
  uber_eats: ['api_key', 'store_id'],
  jahez: ['api_key', 'secret_key', 'store_id'],
};

export default function IntegrationModal({ open, onOpenChange, integration, onSave }: IntegrationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!integration;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<IntegrationForm>({
    resolver: zodResolver(integrationSchema),
    defaultValues: integration
      ? {
          provider: integration.provider,
          api_key: integration.config.api_key || '',
          secret_key: integration.config.secret_key || '',
          store_id: integration.config.store_id || '',
          brand_id: integration.config.brand_id || '',
          auto_accept_orders: integration.config.auto_accept_orders,
          sync_menu: integration.config.sync_menu,
          sync_inventory: integration.config.sync_inventory,
        }
      : {
          provider: 'careem',
          api_key: '',
          secret_key: '',
          store_id: '',
          brand_id: '',
          auto_accept_orders: false,
          sync_menu: false,
          sync_inventory: false,
        },
  });

  const selectedProvider = watch('provider');

  const onSubmit = async (data: IntegrationForm) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const renderFieldsForProvider = (provider: DeliveryProvider) => {
    const fields = providerFields[provider];

    return (
      <div className="space-y-4">
        {fields.includes('api_key') && (
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input
              id="api_key"
              type="password"
              {...register('api_key')}
              className={errors.api_key ? 'border-red-500' : ''}
            />
            {errors.api_key && (
              <p className="text-sm text-red-600">{errors.api_key.message}</p>
            )}
          </div>
        )}

        {fields.includes('secret_key') && (
          <div className="space-y-2">
            <Label htmlFor="secret_key">Secret Key</Label>
            <Input
              id="secret_key"
              type="password"
              {...register('secret_key')}
            />
          </div>
        )}

        {fields.includes('store_id') && (
          <div className="space-y-2">
            <Label htmlFor="store_id">Store ID</Label>
            <Input
              id="store_id"
              {...register('store_id')}
              placeholder="Your store identifier"
            />
          </div>
        )}

        {fields.includes('brand_id') && (
          <div className="space-y-2">
            <Label htmlFor="brand_id">Brand ID</Label>
            <Input
              id="brand_id"
              {...register('brand_id')}
              placeholder="Your brand identifier"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Integration' : 'Add New Integration'}
          </DialogTitle>
          <DialogDescription>
            Configure your delivery provider integration settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Delivery Provider *</Label>
            <Select
              value={selectedProvider}
              onValueChange={(value) => setValue('provider', value as DeliveryProvider)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="careem">Careem Now</SelectItem>
                <SelectItem value="talabat">Talabat</SelectItem>
                <SelectItem value="deliveroo">Deliveroo</SelectItem>
                <SelectItem value="uber_eats">Uber Eats</SelectItem>
                <SelectItem value="jahez">Jahez</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Provider-specific fields */}
          {renderFieldsForProvider(selectedProvider)}

          {/* Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Integration Options</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_accept_orders">Auto Accept Orders</Label>
                <div className="text-sm text-gray-500">
                  Automatically accept incoming orders
                </div>
              </div>
              <Switch
                id="auto_accept_orders"
                {...register('auto_accept_orders')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync_menu">Menu Synchronization</Label>
                <div className="text-sm text-gray-500">
                  Keep menu items in sync with provider
                </div>
              </div>
              <Switch
                id="sync_menu"
                {...register('sync_menu')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync_inventory">Inventory Sync</Label>
                <div className="text-sm text-gray-500">
                  Sync availability and stock levels
                </div>
              </div>
              <Switch
                id="sync_inventory"
                {...register('sync_inventory')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add Integration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

