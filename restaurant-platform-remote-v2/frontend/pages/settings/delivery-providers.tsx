import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useAuth } from '../../src/contexts/AuthContext';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  CogIcon, 
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface DeliveryProvider {
  id: string;
  name: string;
  type: 'dhub' | 'talabat' | 'careem' | 'jahez' | 'deliveroo';
  status: 'active' | 'inactive' | 'error';
  config: {
    enabled: boolean;
    priority: number;
    coverageAreas: string[];
    supportedServices: string[];
  };
  credentials: {
    configured: boolean;
    lastValidated: Date;
  };
  metrics: {
    successRate: number;
    averageDeliveryTime: number;
    totalOrders: number;
    errorCount: number;
  };
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  providers: {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
  }[];
  metrics: {
    totalOrders: number;
    successRate: number;
    errorRate: number;
  };
}

const DeliveryProvidersPage: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<DeliveryProvider[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/delivery/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/delivery/monitoring/health');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  const toggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/delivery/providers/${providerId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        await fetchProviders();
      }
    } catch (error) {
      console.error('Error toggling provider:', error);
    }
  };

  const configureProvider = async (providerId: string) => {
    setConfiguring(providerId);
    // This would open a modal or navigate to configuration page
    setTimeout(() => setConfiguring(null), 2000);
  };

  const getProviderIcon = (type: string) => {
    const icons = {
      dhub: '🚚',
      talabat: '🍔',
      careem: '🚗',
      jahez: '🍕',
      deliveroo: '🛵'
    };
    return icons[type as keyof typeof icons] || '📦';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Providers</h1>
            <p className="text-gray-600">
              Manage your delivery provider integrations and monitor system health
            </p>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            onClick={() => configureProvider('new')}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Provider
          </button>
        </div>

        {/* System Health Overview */}
        {systemHealth && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Overall Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(systemHealth.status)}`}>
                    {systemHealth.status}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {systemHealth.metrics.totalOrders.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Orders Today</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {systemHealth.metrics.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {systemHealth.metrics.errorRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Error Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div key={provider.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Provider Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="text-3xl mr-3">{getProviderIcon(provider.type)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{provider.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.status)}`}>
                    {provider.status}
                  </span>
                </div>

                {/* Configuration Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Configuration</span>
                    {provider.credentials.configured ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Configured
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Not Configured
                      </div>
                    )}
                  </div>
                  {provider.credentials.configured && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last validated: {new Date(provider.credentials.lastValidated).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-medium text-green-600">
                      {provider.metrics.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg. Delivery Time</span>
                    <span className="font-medium">
                      {Math.round(provider.metrics.averageDeliveryTime)} min
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Orders</span>
                    <span className="font-medium">
                      {provider.metrics.totalOrders.toLocaleString()}
                    </span>
                  </div>
                  {provider.metrics.errorCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Errors</span>
                      <span className="font-medium text-red-600">
                        {provider.metrics.errorCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Coverage Areas */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Coverage Areas</div>
                  <div className="flex flex-wrap gap-1">
                    {provider.config.coverageAreas.slice(0, 3).map((area, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {area}
                      </span>
                    ))}
                    {provider.config.coverageAreas.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{provider.config.coverageAreas.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleProvider(provider.id, !provider.config.enabled)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                      provider.config.enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {provider.config.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => configureProvider(provider.id)}
                    disabled={configuring === provider.id}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    {configuring === provider.id ? (
                      <ClockIcon className="h-4 w-4" />
                    ) : (
                      <CogIcon className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    onClick={() => window.open(`/analytics/providers/${provider.id}`, '_blank')}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {providers.length === 0 && (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No providers configured</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first delivery provider.
            </p>
            <div className="mt-6">
              <button
                onClick={() => configureProvider('new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Provider
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Add any server-side authentication checks here
  return {
    props: {},
  };
};

export default DeliveryProvidersPage;