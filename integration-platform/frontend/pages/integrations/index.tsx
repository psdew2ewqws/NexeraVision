import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import IntegrationCard from '@/components/integrations/integration-card';
import IntegrationModal from '@/components/integrations/integration-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Integration, ApiResponse, IntegrationForm } from '@/types';
import { apiClient } from '@/lib/api-client';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const fetchIntegrations = async (): Promise<Integration[]> => {
  const response = await apiClient.get<ApiResponse<Integration[]>>('/integrations');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch integrations');
  }
  return response.data.data;
};

export default function Integrations() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: integrations = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['integrations'],
    queryFn: fetchIntegrations,
  });

  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      const response = await apiClient.patch<ApiResponse<Integration>>(
        `/integrations/${id}/status`,
        { status }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update integration');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update integration');
    },
  });

  const testIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiResponse<any>>(`/integrations/${id}/test`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Test failed');
      }
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Integration test successful');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Integration test failed');
    },
  });

  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationForm) => {
      if (selectedIntegration) {
        // Update existing
        const response = await apiClient.put<ApiResponse<Integration>>(
          `/integrations/${selectedIntegration.id}`,
          data
        );
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to update integration');
        }
        return response.data.data;
      } else {
        // Create new
        const response = await apiClient.post<ApiResponse<Integration>>('/integrations', data);
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to create integration');
        }
        return response.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success(
        selectedIntegration
          ? 'Integration updated successfully'
          : 'Integration created successfully'
      );
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save integration');
    },
  });

  const handleToggle = (id: string, status: 'active' | 'inactive') => {
    toggleIntegrationMutation.mutate({ id, status });
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setModalOpen(true);
  };

  const handleTest = (id: string) => {
    testIntegrationMutation.mutate(id);
  };

  const handleAddNew = () => {
    setSelectedIntegration(undefined);
    setModalOpen(true);
  };

  const handleSaveIntegration = async (data: IntegrationForm) => {
    await saveIntegrationMutation.mutateAsync(data);
  };

  const activeCount = integrations.filter(i => i.status === 'active').length;
  const errorCount = integrations.filter(i => i.health.status === 'critical').length;

  if (isLoading) {
    return (
      
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-1">
              Manage your delivery provider integrations
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4">
          <Badge variant="success" className="px-3 py-1">
            {activeCount} Active
          </Badge>
          {errorCount > 0 && (
            <Badge variant="error" className="px-3 py-1">
              {errorCount} Errors
            </Badge>
          )}
          <Badge variant="outline" className="px-3 py-1">
            {integrations.length} Total
          </Badge>
        </div>

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800">Error loading integrations</h3>
            <p className="mt-1 text-sm text-red-700">
              Unable to fetch integration data. Please refresh the page.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && integrations.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No integrations yet</h3>
            <p className="mt-2 text-gray-500">
              Get started by adding your first delivery provider integration
            </p>
            <Button className="mt-6" onClick={handleAddNew}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Integration
            </Button>
          </div>
        )}

        {/* Integration Cards */}
        {integrations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onToggle={handleToggle}
                onConfigure={handleConfigure}
                onTest={handleTest}
              />
            ))}
          </div>
        )}

        {/* Integration Modal */}
        <IntegrationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          integration={selectedIntegration}
          onSave={handleSaveIntegration}
        />
      </div>
    
  );
}