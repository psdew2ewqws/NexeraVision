import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { MenuItem, Integration, ApiResponse, MenuSyncForm } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime, capitalize } from '@/lib/utils';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const fetchMenuItems = async (): Promise<MenuItem[]> => {
  const response = await apiClient.get<ApiResponse<MenuItem[]>>('/menu/items');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch menu items');
  }
  return response.data.data;
};

const fetchIntegrations = async (): Promise<Integration[]> => {
  const response = await apiClient.get<ApiResponse<Integration[]>>('/integrations?status=active');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch integrations');
  }
  return response.data.data;
};

export default function MenuSync() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [syncPrices, setSyncPrices] = useState(true);
  const [syncAvailability, setSyncAvailability] = useState(true);

  const queryClient = useQueryClient();

  const {
    data: menuItems = [],
    isLoading: itemsLoading,
  } = useQuery({
    queryKey: ['menu-items'],
    queryFn: fetchMenuItems,
  });

  const {
    data: integrations = [],
    isLoading: integrationsLoading,
  } = useQuery({
    queryKey: ['active-integrations'],
    queryFn: fetchIntegrations,
  });

  const syncMenuMutation = useMutation({
    mutationFn: async (data: MenuSyncForm) => {
      const response = await apiClient.post<ApiResponse<any>>('/menu/sync', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Sync failed');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Menu sync completed successfully');
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Menu sync failed');
    },
  });

  const bulkSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ApiResponse<any>>('/menu/sync/all');
      if (!response.data.success) {
        throw new Error(response.data.message || 'Bulk sync failed');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Bulk sync completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Bulk sync failed');
    },
  });

  const handleItemSelect = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(menuItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSyncSelected = async () => {
    if (!selectedProvider || selectedItems.length === 0) {
      toast.error('Please select a provider and items to sync');
      return;
    }

    await syncMenuMutation.mutateAsync({
      provider: selectedProvider as any,
      items: selectedItems,
      sync_prices: syncPrices,
      sync_availability: syncAvailability,
    });
  };

  const getSyncStatusIcon = (item: MenuItem, provider: string) => {
    const mapping = item.provider_mappings.find(m => m.provider === provider);
    if (!mapping) {
      return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
    if (!mapping.is_synced) {
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
  };

  const getSyncStatusText = (item: MenuItem, provider: string) => {
    const mapping = item.provider_mappings.find(m => m.provider === provider);
    if (!mapping) return 'Not synced';
    if (!mapping.is_synced) return 'Pending sync';
    return `Synced ${formatDateTime(mapping.last_sync)}`;
  };

  if (itemsLoading || integrationsLoading) {
    return (
      
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      
    );
  }

  const activeProviders = integrations.filter(i => i.status === 'active' && i.config.sync_menu);

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Synchronization</h1>
          <p className="text-gray-600 mt-1">
            Keep your menu items in sync across delivery platforms
          </p>
        </div>

        {/* No Active Integrations */}
        {activeProviders.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu sync integrations</h3>
                <p className="text-gray-500 mb-4">
                  Enable menu synchronization on your integrations to start syncing items
                </p>
                <Button asChild>
                  <a href="/integrations">Configure Integrations</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Controls */}
        {activeProviders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Controls</CardTitle>
              <CardDescription>
                Select items and provider to synchronize
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select Provider</option>
                    {activeProviders.map(integration => (
                      <option key={integration.id} value={integration.provider}>
                        {capitalize(integration.provider)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sync Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sync-prices"
                      checked={syncPrices}
                      onCheckedChange={setSyncPrices}
                    />
                    <label htmlFor="sync-prices" className="text-sm font-medium">
                      Sync Prices
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sync-availability"
                      checked={syncAvailability}
                      onCheckedChange={setSyncAvailability}
                    />
                    <label htmlFor="sync-availability" className="text-sm font-medium">
                      Sync Availability
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={handleSyncSelected}
                    disabled={selectedItems.length === 0 || !selectedProvider || syncMenuMutation.isPending}
                  >
                    {syncMenuMutation.isPending ? 'Syncing...' : `Sync Selected (${selectedItems.length})`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => bulkSyncMutation.mutate()}
                    disabled={bulkSyncMutation.isPending}
                  >
                    {bulkSyncMutation.isPending ? 'Syncing...' : 'Sync All'}
                  </Button>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center space-x-2 pb-4 border-b">
                <Switch
                  id="select-all"
                  checked={selectedItems.length === menuItems.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="font-medium">
                  Select All Items ({menuItems.length})
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Items */}
        {menuItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>
                Select items to synchronize with delivery providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {menuItems.map(item => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Switch
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleItemSelect(item.id, checked)}
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.price)}</div>
                          <Badge variant={item.is_available ? 'success' : 'secondary'}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Sync Status for Active Providers */}
                    <div className="flex flex-col space-y-2">
                      {activeProviders.map(integration => (
                        <div key={integration.provider} className="flex items-center space-x-2 text-sm">
                          {getSyncStatusIcon(item, integration.provider)}
                          <span className="text-gray-600">
                            {capitalize(integration.provider)}: {getSyncStatusText(item, integration.provider)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {menuItems.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items</h3>
                <p className="text-gray-500 mb-4">
                  Add menu items to your system to enable synchronization
                </p>
                <Button variant="outline">
                  Add Menu Items
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    
  );
}