import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  SignalIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  WifiIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import websocketService, { ProviderStatus as ProviderStatusType } from '@/services/websocket.service';

interface ProviderStatusProps {
  providers?: string[];
  refreshInterval?: number;
  showMetrics?: boolean;
  showHistory?: boolean;
}

interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  lastError?: string;
}

const ProviderStatus: React.FC<ProviderStatusProps> = ({
  providers = ['careem', 'talabat', 'deliveroo', 'jahez', 'dhub'],
  refreshInterval = 10,
  showMetrics = true,
  showHistory = false
}) => {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusType[]>([]);
  const [providerMetrics, setProviderMetrics] = useState<ProviderMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Handle provider status updates
  const handleProviderStatus = useCallback((status: ProviderStatusType) => {
    setProviderStatuses(prevStatuses => {
      const existingIndex = prevStatuses.findIndex(s => s.provider === status.provider);

      if (existingIndex >= 0) {
        const newStatuses = [...prevStatuses];
        newStatuses[existingIndex] = status;
        return newStatuses;
      } else {
        return [...prevStatuses, status];
      }
    });

    setIsLoading(false);
    setLastUpdate(new Date().toISOString());
  }, []);

  // Handle provider metrics updates
  const handleProviderMetrics = useCallback((metrics: ProviderMetrics) => {
    setProviderMetrics(prevMetrics => {
      const existingIndex = prevMetrics.findIndex(m => m.provider === metrics.provider);

      if (existingIndex >= 0) {
        const newMetrics = [...prevMetrics];
        newMetrics[existingIndex] = metrics;
        return newMetrics;
      } else {
        return [...prevMetrics, metrics];
      }
    });
  }, []);

  // Setup WebSocket listeners and periodic updates
  useEffect(() => {
    const unsubscribeStatus = websocketService.on('provider_status', handleProviderStatus);
    const unsubscribeMetrics = websocketService.on('provider_metrics', handleProviderMetrics);

    // Request initial data
    websocketService.requestProviderStatus();
    if (showMetrics) {
      websocketService.emit('get_provider_metrics');
    }

    // Set up periodic refresh
    const interval = setInterval(() => {
      websocketService.requestProviderStatus();
      if (showMetrics) {
        websocketService.emit('get_provider_metrics');
      }
    }, refreshInterval * 1000);

    return () => {
      unsubscribeStatus();
      unsubscribeMetrics();
      clearInterval(interval);
    };
  }, [handleProviderStatus, handleProviderMetrics, refreshInterval, showMetrics]);

  const getStatusIcon = (status: ProviderStatusType['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'disconnected':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ProviderStatusType['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: ProviderStatusType['status']) => {
    switch (status) {
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'disconnected':
        return 'border-red-200 bg-red-50';
      case 'error':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatResponseTime = (responseTime: number) => {
    return `${responseTime.toFixed(0)}ms`;
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`;
  };

  const getProviderMetrics = (provider: string): ProviderMetrics | undefined => {
    return providerMetrics.find(m => m.provider === provider);
  };

  const getProviderStatus = (provider: string): ProviderStatusType | undefined => {
    return providerStatuses.find(s => s.provider === provider);
  };

  const testConnection = (provider: string) => {
    websocketService.emit('test_provider_connection', { provider });
  };

  const getOverallHealth = () => {
    const connectedCount = providerStatuses.filter(s => s.status === 'connected').length;
    const totalCount = providers.length;

    if (connectedCount === totalCount) return 'healthy';
    if (connectedCount === 0) return 'critical';
    return 'warning';
  };

  const getHealthColor = () => {
    const health = getOverallHealth();
    switch (health) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {providers.map((provider, index) => (
              <div key={provider} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <WifiIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Provider Connections</h3>
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdate ? formatTimestamp(lastUpdate) : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`text-lg font-semibold ${getHealthColor()}`}>
              {providerStatuses.filter(s => s.status === 'connected').length} / {providers.length} Connected
            </div>
            <button
              onClick={() => websocketService.requestProviderStatus()}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const status = getProviderStatus(provider);
            const metrics = getProviderMetrics(provider);

            return (
              <motion.div
                key={provider}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-4 ${getStatusColor(status?.status || 'disconnected')}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status?.status || 'disconnected')}
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">{provider}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(status?.status || 'disconnected')}`}>
                        {status?.status || 'unknown'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => testConnection(provider)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Test connection"
                  >
                    <SignalIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Connection Details */}
                {status && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Response Time:</span>
                      <span className="font-medium">{formatResponseTime(status.responseTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Ping:</span>
                      <span className="font-medium">{formatTimestamp(status.lastPing)}</span>
                    </div>
                    {status.errorCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Error Count:</span>
                        <span className="font-medium text-red-600">{status.errorCount}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Metrics */}
                {showMetrics && metrics && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Requests:</span>
                      <span className="font-medium">{metrics.totalRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Success Rate:</span>
                      <span className="font-medium text-green-600">
                        {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uptime:</span>
                      <span className="font-medium">{formatUptime(metrics.uptime)}</span>
                    </div>
                    {metrics.lastError && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        Last Error: {metrics.lastError}
                      </div>
                    )}
                  </div>
                )}

                {/* No status available */}
                {!status && (
                  <div className="text-center text-gray-500 py-4">
                    <ServerIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No status data available</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detailed Metrics Table */}
      {showMetrics && providerMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uptime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providerMetrics.map((metrics) => {
                  const status = getProviderStatus(metrics.provider);
                  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;

                  return (
                    <tr key={metrics.provider} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 capitalize">
                          {metrics.provider}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {metrics.totalRequests}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={successRate >= 95 ? 'text-green-600' : successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}>
                          {successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatResponseTime(metrics.averageResponseTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatUptime(metrics.uptime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(status?.status || 'disconnected')}`}>
                          {status?.status || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderStatus;