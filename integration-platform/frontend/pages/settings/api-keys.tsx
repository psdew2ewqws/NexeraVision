import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApiResponse } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { EyeIcon, EyeSlashIcon, KeyIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  last_used: string | null;
  created_at: string;
}

const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const response = await apiClient.get<ApiResponse<ApiKey[]>>('/settings/api-keys');
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch API keys');
  }
  return response.data.data;
};

export default function ApiKeys() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['read']);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: apiKeys = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { name: string; permissions: string[] }) => {
      const response = await apiClient.post<ApiResponse<ApiKey>>('/settings/api-keys', data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create API key');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key created successfully');
      setNewKeyName('');
      setSelectedPermissions(['read']);
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create API key');
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiClient.delete<ApiResponse<void>>(`/settings/api-keys/${keyId}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete API key');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete API key');
    },
  });

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 8) + '...' + key.substring(key.length - 8);
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    await createApiKeyMutation.mutateAsync({
      name: newKeyName.trim(),
      permissions: selectedPermissions,
    });
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      await deleteApiKeyMutation.mutateAsync(keyId);
    }
  };

  const availablePermissions = [
    { value: 'read', label: 'Read', description: 'View data and configurations' },
    { value: 'write', label: 'Write', description: 'Create and update data' },
    { value: 'delete', label: 'Delete', description: 'Delete data and configurations' },
    { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  ];

  if (isLoading) {
    return (
      
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <p className="text-gray-600 mt-1">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <KeyIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Security Notice</p>
              <p className="mt-1">
                API keys provide access to your integration platform. Keep them secure and never share them publicly.
                Delete any keys that are no longer needed.
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800">Error loading API keys</h3>
            <p className="mt-1 text-sm text-red-700">
              Unable to fetch API keys. Please refresh the page.
            </p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New API Key</CardTitle>
              <CardDescription>
                Generate a new API key with specific permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name *
                  </label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key, Mobile App Key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {availablePermissions.map(permission => (
                      <div key={permission.value} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id={permission.value}
                          checked={selectedPermissions.includes(permission.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, permission.value]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(p => p !== permission.value));
                            }
                          }}
                          className="mt-1"
                        />
                        <div>
                          <label htmlFor={permission.value} className="font-medium text-sm">
                            {permission.label}
                          </label>
                          <p className="text-sm text-gray-500">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleCreateApiKey}
                    disabled={createApiKeyMutation.isPending || !newKeyName.trim()}
                  >
                    {createApiKeyMutation.isPending ? 'Creating...' : 'Create API Key'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewKeyName('');
                      setSelectedPermissions(['read']);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Keys List */}
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No API keys yet</h3>
                  <p className="mt-2 text-gray-500">
                    Create your first API key to start using the API
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Your First API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map(apiKey => (
              <Card key={apiKey.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-lg">{apiKey.name}</h3>
                        <div className="flex items-center space-x-2">
                          {apiKey.permissions.map(permission => (
                            <Badge key={permission} variant="outline">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="font-mono text-sm bg-gray-100 p-3 rounded border flex items-center space-x-2">
                        <code className="flex-1">
                          {showKeys[apiKey.id] ? apiKey.key : maskApiKey(apiKey.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {showKeys[apiKey.id] ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey.key);
                            toast.success('API key copied to clipboard');
                          }}
                        >
                          Copy
                        </Button>
                      </div>

                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>Created: {formatDateTime(apiKey.created_at)}</span>
                        {apiKey.last_used && (
                          <span>Last used: {formatDateTime(apiKey.last_used)}</span>
                        )}
                        {!apiKey.last_used && (
                          <Badge variant="outline">Never used</Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={deleteApiKeyMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    
  );
}