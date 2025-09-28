import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SignalIcon,
  CogIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BellIcon,
  WifiIcon,
  CloudIcon,
  CpuChipIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useOperations } from '../contexts/OperationsContext';

interface ProviderStatus {
  providerId: string;
  providerName: string;
  type: 'delivery' | 'payment' | 'pos' | 'menu_sync';
  status: 'connected' | 'disconnected' | 'error' | 'maintenance' | 'warning';
  lastSync: Date;
  responseTime: number;
  successRate: number;
  totalRequests: number;
  errorCount: number;
  configuration: {
    apiKey: boolean;
    webhook: boolean;
    credentials: boolean;
    menuSync: boolean;
  };
  metrics: {
    ordersToday: number;
    revenue: number;
    avgResponseTime: number;
    uptime: number;
  };
  issues: {
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }[];
  actions: {
    canSync: boolean;
    canTest: boolean;
    canConfigure: boolean;
    canDisable: boolean;
  };
}

interface ProviderIntegrationPanelProps {
  branchId?: string;
  companyId?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const statusColors = {
  connected: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
    dot: 'bg-green-500'
  },
  disconnected: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-500',
    dot: 'bg-gray-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    dot: 'bg-red-500'
  },
  maintenance: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    dot: 'bg-yellow-500'
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    icon: 'text-orange-500',
    dot: 'bg-orange-500'
  }
};

const statusIcons = {
  connected: CheckCircleIcon,
  disconnected: XCircleIcon,
  error: ExclamationTriangleIcon,
  maintenance: CogIcon,
  warning: ExclamationTriangleIcon
};

const providerTypeIcons = {
  delivery: TruckIcon,
  payment: CpuChipIcon,
  pos: CloudIcon,
  menu_sync: LinkIcon
};

export default function ProviderIntegrationPanel({ branchId, companyId, size = 'large' }: ProviderIntegrationPanelProps) {
  const { user } = useAuth();
  const { addAlert, isConnected } = useOperations();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'error' | 'warning'>('all');
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  // Fetch provider status data
  const { data: providers = [], isLoading, isError, refetch } = useQuery<ProviderStatus[]>({
    queryKey: ['provider-status', branchId, companyId],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();

        if (branchId) params.append('branchId', branchId);
        if (companyId) params.append('companyId', companyId);

        const response = await axios.get(
          `${API_BASE_URL}/integrations/provider-status?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        return response.data;
      } catch (error) {
        // Mock data for development
        return [
          {
            providerId: 'careem-1',
            providerName: 'Careem Now',
            type: 'delivery',
            status: 'connected',
            lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
            responseTime: 245,
            successRate: 98.5,
            totalRequests: 1247,
            errorCount: 18,
            configuration: {
              apiKey: true,
              webhook: true,
              credentials: true,
              menuSync: true
            },
            metrics: {
              ordersToday: 67,
              revenue: 1450.75,
              avgResponseTime: 245,
              uptime: 99.2
            },
            issues: [
              {
                type: 'info',
                message: 'Menu sync completed successfully',
                timestamp: new Date(Date.now() - 5 * 60 * 1000)
              }
            ],
            actions: {
              canSync: true,
              canTest: true,
              canConfigure: true,
              canDisable: true
            }
          },
          {
            providerId: 'talabat-1',
            providerName: 'Talabat',
            type: 'delivery',
            status: 'warning',
            lastSync: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            responseTime: 890,
            successRate: 89.2,
            totalRequests: 892,
            errorCount: 96,
            configuration: {
              apiKey: true,
              webhook: false,
              credentials: true,
              menuSync: true
            },
            metrics: {
              ordersToday: 34,
              revenue: 780.25,
              avgResponseTime: 890,
              uptime: 94.1
            },
            issues: [
              {
                type: 'warning',
                message: 'Webhook endpoint not responding - manual order sync required',
                timestamp: new Date(Date.now() - 15 * 60 * 1000)
              },
              {
                type: 'warning',
                message: 'Response time above threshold (>500ms)',
                timestamp: new Date(Date.now() - 10 * 60 * 1000)
              }
            ],
            actions: {
              canSync: true,
              canTest: true,
              canConfigure: true,
              canDisable: true
            }
          },
          {
            providerId: 'dhub-1',
            providerName: 'D-Hub',
            type: 'delivery',
            status: 'error',
            lastSync: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
            responseTime: 0,
            successRate: 0,
            totalRequests: 156,
            errorCount: 156,
            configuration: {
              apiKey: false,
              webhook: false,
              credentials: false,
              menuSync: false
            },
            metrics: {
              ordersToday: 0,
              revenue: 0,
              avgResponseTime: 0,
              uptime: 0
            },
            issues: [
              {
                type: 'error',
                message: 'API authentication failed - invalid credentials',
                timestamp: new Date(Date.now() - 45 * 60 * 1000)
              },
              {
                type: 'error',
                message: 'Connection timeout after 30 seconds',
                timestamp: new Date(Date.now() - 30 * 60 * 1000)
              }
            ],
            actions: {
              canSync: false,
              canTest: true,
              canConfigure: true,
              canDisable: true
            }
          },
          {
            providerId: 'pos-system',
            providerName: 'POS Integration',
            type: 'pos',
            status: 'connected',
            lastSync: new Date(Date.now() - 30 * 1000), // 30 seconds ago
            responseTime: 45,
            successRate: 99.8,
            totalRequests: 5632,
            errorCount: 11,
            configuration: {
              apiKey: true,
              webhook: true,
              credentials: true,
              menuSync: true
            },
            metrics: {
              ordersToday: 156,
              revenue: 3245.50,
              avgResponseTime: 45,
              uptime: 99.9
            },
            issues: [],
            actions: {
              canSync: true,
              canTest: true,
              canConfigure: true,
              canDisable: false
            }
          }
        ];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3
  });

  // Monitor provider issues and create alerts
  useEffect(() => {
    if (providers && providers.length > 0) {
      providers.forEach(provider => {
        if (provider.status === 'error') {
          addAlert({
            type: 'error',
            title: `${provider.providerName} Integration Failed`,
            message: provider.issues[0]?.message || 'Provider connection error',
            read: false,
            source: 'providers',
            providerId: provider.providerId
          });
        } else if (provider.status === 'warning') {
          addAlert({
            type: 'warning',
            title: `${provider.providerName} Performance Issue`,
            message: provider.issues[0]?.message || 'Provider performance degraded',
            read: false,
            source: 'providers',
            providerId: provider.providerId
          });
        }
      });
    }
  }, [providers, addAlert]);

  const handleTestConnection = async (providerId: string) => {
    setIsActionLoading(`test-${providerId}`);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/integrations/test-connection`,
        { providerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addAlert({
        type: 'success',
        title: 'Connection Test',
        message: 'Provider connection test completed successfully',
        read: false,
        source: 'providers',
        providerId
      });

      refetch();
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Connection Test Failed',
        message: 'Provider connection test failed',
        read: false,
        source: 'providers',
        providerId
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSyncProvider = async (providerId: string) => {
    setIsActionLoading(`sync-${providerId}`);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/integrations/sync-provider`,
        { providerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addAlert({
        type: 'success',
        title: 'Provider Sync',
        message: 'Provider synchronization initiated successfully',
        read: false,
        source: 'providers',
        providerId
      });

      refetch();
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Sync Failed',
        message: 'Provider synchronization failed',
        read: false,
        source: 'providers',
        providerId
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const filteredProviders = providers.filter(provider => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'connected') return provider.status === 'connected';
    if (filterStatus === 'error') return provider.status === 'error';
    if (filterStatus === 'warning') return provider.status === 'warning';
    return true;
  });

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
        <p className="text-gray-600 mb-4">Unable to load provider status</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <WifiIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Provider Integration Status</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Providers</option>
            <option value="connected">Connected</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            title="Refresh status"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Connected</p>
              <p className="text-2xl font-bold text-green-900">
                {providers.filter(p => p.status === 'connected').length}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Errors</p>
              <p className="text-2xl font-bold text-red-900">
                {providers.filter(p => p.status === 'error').length}
              </p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Warnings</p>
              <p className="text-2xl font-bold text-yellow-900">
                {providers.filter(p => p.status === 'warning').length}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">
                {providers.reduce((sum, p) => sum + p.metrics.ordersToday, 0)}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className={`grid ${size === 'full' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {filteredProviders.map((provider) => {
          const colors = statusColors[provider.status];
          const StatusIcon = statusIcons[provider.status];
          const TypeIcon = providerTypeIcons[provider.type];
          const isLoadingAction = isActionLoading?.includes(provider.providerId);

          return (
            <div
              key={provider.providerId}
              className={`border rounded-lg p-4 transition-all duration-200 ${colors.bg} ${colors.border} ${
                selectedProvider === provider.providerId ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <TypeIcon className="h-8 w-8 text-gray-600" />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${colors.dot}`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${colors.text}`}>{provider.providerName}</h4>
                    <p className="text-sm text-gray-600 capitalize">{provider.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <StatusIcon className={`h-5 w-5 ${colors.icon}`} />
                  <span className={`text-sm font-medium ${colors.text} capitalize`}>
                    {provider.status}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{provider.metrics.ordersToday}</p>
                  <p className="text-xs text-gray-600">Orders Today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(provider.metrics.revenue)}</p>
                  <p className="text-xs text-gray-600">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{provider.responseTime}ms</p>
                  <p className="text-xs text-gray-600">Response Time</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{provider.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">Success Rate</p>
                </div>
              </div>

              {/* Configuration Status */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Configuration:</span>
                  <div className="flex items-center space-x-2">
                    {Object.entries(provider.configuration).map(([key, enabled]) => (
                      <div
                        key={key}
                        className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-red-500'}`}
                        title={`${key}: ${enabled ? 'enabled' : 'disabled'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Issues */}
              {provider.issues.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Issues:</h5>
                  <div className="space-y-1">
                    {provider.issues.slice(0, 2).map((issue, index) => (
                      <div key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                        <BellIcon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                          issue.type === 'error' ? 'text-red-500' :
                          issue.type === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <p>{issue.message}</p>
                          <p className="text-gray-500">{formatTimeAgo(issue.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-500">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  Last sync: {formatTimeAgo(provider.lastSync)}
                </div>

                <div className="flex items-center space-x-2">
                  {provider.actions.canTest && (
                    <button
                      onClick={() => handleTestConnection(provider.providerId)}
                      disabled={isLoadingAction}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isActionLoading === `test-${provider.providerId}` ? 'Testing...' : 'Test'}
                    </button>
                  )}

                  {provider.actions.canSync && (
                    <button
                      onClick={() => handleSyncProvider(provider.providerId)}
                      disabled={isLoadingAction}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isActionLoading === `sync-${provider.providerId}` ? 'Syncing...' : 'Sync'}
                    </button>
                  )}

                  {provider.actions.canConfigure && (
                    <button
                      onClick={() => window.open(`/settings/integrations/${provider.providerId}`, '_blank')}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Configure
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <WifiIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No providers found</h3>
          <p className="text-gray-600 mb-4">
            {filterStatus === 'all'
              ? 'No integration providers configured'
              : `No providers with ${filterStatus} status`
            }
          </p>
          <button
            onClick={() => window.open('/settings/integrations', '_blank')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Configure Integrations
          </button>
        </div>
      )}
    </div>
  );
}