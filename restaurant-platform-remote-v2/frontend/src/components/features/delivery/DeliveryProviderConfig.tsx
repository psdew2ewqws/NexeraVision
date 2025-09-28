import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CogIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  GlobeAltIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface DeliveryProvider {
  id: string;
  name: string;
  displayName: {
    en: string;
    ar: string;
  };
  apiBaseUrl: string;
  apiKey?: string;
  isActive: boolean;
  priority: number;
  avgDeliveryTime: number;
  baseFee: string;
  feePerKm: string;
  maxDistance: string;
  configuration: {
    timeout?: number;
    retryAttempts?: number;
    webhookUrl?: string;
    sandboxMode?: boolean;
    additionalHeaders?: Record<string, string>;
    rateLimit?: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
}

interface ConfigurationForm {
  apiKey: string;
  apiSecret: string;
  timeout: number;
  retryAttempts: number;
  webhookUrl: string;
  sandboxMode: boolean;
  additionalHeaders: string; // JSON string
  rateLimitPerMinute: number;
  rateLimitBurst: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function DeliveryProviderConfig() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configForm, setConfigForm] = useState<ConfigurationForm>({
    apiKey: '',
    apiSecret: '',
    timeout: 30000,
    retryAttempts: 3,
    webhookUrl: '',
    sandboxMode: false,
    additionalHeaders: '{}',
    rateLimitPerMinute: 60,
    rateLimitBurst: 10
  });
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({});

  // Fetch delivery providers
  const { data: providers = [], isLoading, error } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Configure provider mutation
  const configureProviderMutation = useMutation({
    mutationFn: async ({ providerId, config }: { providerId: string; config: any }) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/delivery/providers/${providerId}/configure`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-providers'] });
      setIsConfiguring(false);
      setSelectedProvider(null);
      alert('Provider configuration updated successfully!');
    },
    onError: (error: any) => {
      alert(`Configuration failed: ${error.response?.data?.message || error.message}`);
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/delivery/providers/${providerId}/test-connection`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: (data, providerId) => {
      setConnectionStatus(prev => ({ ...prev, [providerId]: 'success' }));
      setTimeout(() => {
        setConnectionStatus(prev => ({ ...prev, [providerId]: null }));
      }, 5000);
    },
    onError: (error: any, providerId) => {
      setConnectionStatus(prev => ({ ...prev, [providerId]: 'error' }));
      setTimeout(() => {
        setConnectionStatus(prev => ({ ...prev, [providerId]: null }));
      }, 5000);
    }
  });

  const handleConfigure = (provider: DeliveryProvider) => {
    setSelectedProvider(provider.id);
    setIsConfiguring(true);
    
    // Populate form with existing configuration
    setConfigForm({
      apiKey: provider.apiKey || '',
      apiSecret: (provider.configuration as any)?.apiSecret || '',
      timeout: provider.configuration.timeout || 30000,
      retryAttempts: provider.configuration.retryAttempts || 3,
      webhookUrl: provider.configuration.webhookUrl || '',
      sandboxMode: provider.configuration.sandboxMode || false,
      additionalHeaders: JSON.stringify(provider.configuration.additionalHeaders || {}, null, 2),
      rateLimitPerMinute: provider.configuration.rateLimit?.requestsPerMinute || 60,
      rateLimitBurst: provider.configuration.rateLimit?.burstLimit || 10
    });
  };

  const handleTestConnection = (providerId: string) => {
    setConnectionStatus(prev => ({ ...prev, [providerId]: 'testing' }));
    testConnectionMutation.mutate(providerId);
  };

  const handleSaveConfiguration = () => {
    if (!selectedProvider) return;

    try {
      const additionalHeaders = JSON.parse(configForm.additionalHeaders);
      
      const config = {
        apiKey: configForm.apiKey,
        apiSecret: configForm.apiSecret,
        timeout: configForm.timeout,
        retryAttempts: configForm.retryAttempts,
        webhookUrl: configForm.webhookUrl,
        sandboxMode: configForm.sandboxMode,
        additionalHeaders,
        rateLimit: {
          requestsPerMinute: configForm.rateLimitPerMinute,
          burstLimit: configForm.rateLimitBurst
        }
      };

      configureProviderMutation.mutate({ providerId: selectedProvider, config });
    } catch (error) {
      alert('Invalid JSON in additional headers');
    }
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'dhub':
        return '🚛';
      case 'careem':
        return '🚗';
      case 'talabat':
        return '🏍️';
      default:
        return '📦';
    }
  };

  const getConnectionStatusIcon = (providerId: string) => {
    const status = connectionStatus[providerId];
    switch (status) {
      case 'testing':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <p className="mt-2 text-red-600">Failed to load delivery providers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Provider Integration Configuration</h2>
        <p className="text-sm text-gray-600">
          Configure API settings for delivery providers (DHUB, Careem, Talabat)
        </p>
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider: DeliveryProvider) => (
          <div
            key={provider.id}
            className={`bg-white rounded-lg border-2 p-6 transition-all ${
              provider.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'
            }`}
          >
            {/* Provider Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getProviderIcon(provider.name)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{provider.displayName.en}</h3>
                  <p className="text-sm text-gray-500">{provider.displayName.ar}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon(provider.id)}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  provider.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {provider.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Provider Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <GlobeAltIcon className="h-4 w-4 mr-2" />
                <span className="truncate">{provider.apiBaseUrl}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-2" />
                <span>Avg: {provider.avgDeliveryTime} mins</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <KeyIcon className="h-4 w-4 mr-2" />
                <span>{provider.apiKey ? 'API Key Configured' : 'No API Key'}</span>
              </div>
            </div>

            {/* Provider Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-semibold text-gray-900">#{provider.priority}</div>
                <div className="text-xs text-gray-500">Priority</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-semibold text-gray-900">{provider.baseFee}</div>
                <div className="text-xs text-gray-500">Base Fee</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-semibold text-gray-900">{provider.maxDistance}</div>
                <div className="text-xs text-gray-500">Max KM</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleConfigure(provider)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <CogIcon className="h-4 w-4 mr-1 inline" />
                Configure
              </button>
              <button
                onClick={() => handleTestConnection(provider.id)}
                disabled={!provider.apiKey || connectionStatus[provider.id] === 'testing'}
                className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {isConfiguring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Configure Provider API Settings</h3>
                <button
                  onClick={() => setIsConfiguring(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* API Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={configForm.apiKey}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter API key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Secret
                    </label>
                    <input
                      type="password"
                      value={configForm.apiSecret}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter API secret (if required)"
                    />
                  </div>
                </div>

                {/* Connection Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={configForm.timeout}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1000"
                      max="60000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      value={configForm.retryAttempts}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={configForm.webhookUrl}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://your-domain.com/api/v1/delivery/webhooks/provider-id"
                  />
                </div>

                {/* Sandbox Mode */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={configForm.sandboxMode}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, sandboxMode: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Sandbox Mode (Testing)</span>
                  </label>
                </div>

                {/* Rate Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requests per Minute
                    </label>
                    <input
                      type="number"
                      value={configForm.rateLimitPerMinute}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Burst Limit
                    </label>
                    <input
                      type="number"
                      value={configForm.rateLimitBurst}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, rateLimitBurst: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>

                {/* Additional Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Headers (JSON)
                  </label>
                  <textarea
                    value={configForm.additionalHeaders}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, additionalHeaders: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder='{"X-Custom-Header": "value"}'
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setIsConfiguring(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfiguration}
                    disabled={configureProviderMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {configureProviderMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}