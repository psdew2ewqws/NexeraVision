import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  BoltIcon,
  EyeIcon,
  CodeBracketIcon,
  ChartBarIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useDeliveryNotifications } from './DeliveryNotificationSystem';
import { DeliveryTestingHelpers } from 'src/utils/testingHelpers';

interface WebhookLog {
  id: string;
  providerType: string;
  eventType: string;
  success: boolean;
  message: string;
  webhookData: any;
  sourceIp: string;
  processedAt: string;
  responseTime: number;
  retryCount?: number;
  errorDetails?: string;
}

interface WebhookStats {
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  successRate: number;
  providerBreakdown: Record<string, { total: number; success: number; failed: number }>;
  eventTypeBreakdown: Record<string, number>;
  timeSeriesData: Array<{ date: string; webhooks: number; success: number; failed: number }>;
  recentErrors: Array<{ provider: string; error: string; count: number; lastSeen: string }>;
}

interface WebhookFilter {
  providerType?: string;
  eventType?: string;
  success?: boolean | null;
  timeframe: '1h' | '24h' | '7d' | '30d';
  limit: number;
  offset: number;
}

const PROVIDER_TYPES = [
  'dhub', 'talabat', 'careem', 'careemexpress', 'jahez', 
  'deliveroo', 'yallow', 'jooddelivery', 'topdeliver', 
  'nashmi', 'tawasi', 'delivergy', 'utrac', 'local_delivery'
];

const EVENT_TYPES = [
  'order_created', 'order_confirmed', 'order_picked_up', 
  'order_in_transit', 'order_delivered', 'order_cancelled',
  'driver_assigned', 'driver_arrived', 'delivery_failed',
  'payment_processed', 'refund_issued', 'status_update'
];

export default function WebhookMonitoringSystem() {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [filter, setFilter] = useState<WebhookFilter>({
    timeframe: '24h',
    limit: 50,
    offset: 0,
    providerType: undefined,
    eventType: undefined,
    success: null
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const { success: showSuccess, error: showError } = useDeliveryNotifications();

  useEffect(() => {
    loadWebhookData();
    if (autoRefresh) {
      const interval = setInterval(loadWebhookData, 10000); // Refresh every 10 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [filter, autoRefresh]);

  const loadWebhookData = async () => {
    if (!autoRefresh) setIsLoading(true);
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

      // Build query parameters
      const params = new URLSearchParams({
        timeframe: filter.timeframe,
        limit: filter.limit.toString(),
        offset: filter.offset.toString()
      });

      if (filter.providerType) params.append('providerType', filter.providerType);
      if (filter.eventType) params.append('eventType', filter.eventType);
      if (filter.success !== null && filter.success !== undefined) {
        params.append('success', filter.success.toString());
      }

      // Use safe fetch with proper error handling
      const [logsData, statsData] = await Promise.all([
        DeliveryTestingHelpers.safeFetch(`${API_BASE_URL}/delivery/webhook-logs?${params}`)
          .catch(() => ({ logs: [], total: 0, hasMore: false })),
        DeliveryTestingHelpers.safeFetch(`${API_BASE_URL}/delivery/webhook-stats?timeframe=${filter.timeframe}`)
          .catch(() => DeliveryTestingHelpers.generateMockWebhookStats())
      ]);

      setWebhookLogs(logsData.logs || []);
      setWebhookStats(statsData);

      if (!autoRefresh) {
        showSuccess('Data Refreshed', 'Webhook data refreshed successfully');
      }

    } catch (error) {
      console.error('Failed to load webhook data:', error);
      
      // Fallback to mock data
      setWebhookLogs([]);
      setWebhookStats(DeliveryTestingHelpers.generateMockWebhookStats());
      
      if (!autoRefresh) {
        const errorMessage = DeliveryTestingHelpers.getErrorMessage(error);
        showError('Data Load Failed', 'Using mock data: ' + errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter: Partial<WebhookFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter, offset: 0 })); // Reset offset when filter changes
  };

  const loadMore = () => {
    setFilter(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  const getStatusColor = (success: boolean) => {
    return success 
      ? 'text-green-600 bg-green-50 border-green-200' 
      : 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? CheckCircleIcon : XCircleIcon;
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getHealthStatus = (successRate: number) => {
    if (successRate >= 98) return { status: 'excellent', color: 'green', text: 'Excellent' };
    if (successRate >= 95) return { status: 'good', color: 'blue', text: 'Good' };
    if (successRate >= 90) return { status: 'fair', color: 'yellow', text: 'Fair' };
    return { status: 'poor', color: 'red', text: 'Poor' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Webhook Monitoring System</h2>
            <p className="text-gray-600 mt-1">
              Real-time monitoring and analysis of delivery provider webhook processing
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BoltIcon className="h-4 w-4 mr-2" />
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </button>
            <button
              onClick={loadWebhookData}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-4 w-4 mr-2" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {webhookStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-50">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Webhooks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {webhookStats.totalWebhooks.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-50">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {webhookStats.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-50">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">
                  {webhookStats.successfulWebhooks.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-50">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {webhookStats.failedWebhooks.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Status */}
      {webhookStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Health */}
            <div className="text-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                getHealthStatus(webhookStats.successRate).color === 'green' ? 'bg-green-100 text-green-800' :
                getHealthStatus(webhookStats.successRate).color === 'blue' ? 'bg-blue-100 text-blue-800' :
                getHealthStatus(webhookStats.successRate).color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  getHealthStatus(webhookStats.successRate).color === 'green' ? 'bg-green-500' :
                  getHealthStatus(webhookStats.successRate).color === 'blue' ? 'bg-blue-500' :
                  getHealthStatus(webhookStats.successRate).color === 'yellow' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                {getHealthStatus(webhookStats.successRate).text}
              </div>
              <p className="text-sm text-gray-600 mt-2">Overall Health</p>
            </div>

            {/* Recent Errors */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {webhookStats.recentErrors?.length || 0}
              </div>
              <p className="text-sm text-gray-600">Recent Error Types</p>
            </div>

            {/* Provider Coverage */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(webhookStats.providerBreakdown).length}
              </div>
              <p className="text-sm text-gray-600">Active Providers</p>
            </div>
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {webhookStats?.providerBreakdown && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Provider Performance</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {Object.entries(webhookStats.providerBreakdown).map(([provider, stats]) => {
              const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
              const health = getHealthStatus(successRate);
              
              return (
                <div key={provider} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        health.color === 'green' ? 'bg-green-500' :
                        health.color === 'blue' ? 'bg-blue-500' :
                        health.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 uppercase">{provider}</h4>
                        <p className="text-xs text-gray-500">{stats.total} total webhooks</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {successRate.toFixed(1)}% success
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats.success} / {stats.total}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          health.color === 'green' ? 'bg-green-500' :
                          health.color === 'blue' ? 'bg-blue-500' :
                          health.color === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${successRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select
              value={filter.providerType || ''}
              onChange={(e) => handleFilterChange({ providerType: e.target.value || undefined })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Providers</option>
              {PROVIDER_TYPES.map(provider => (
                <option key={provider} value={provider} className="uppercase">
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
            <select
              value={filter.eventType || ''}
              onChange={(e) => handleFilterChange({ eventType: e.target.value || undefined })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {EVENT_TYPES.map(event => (
                <option key={event} value={event}>
                  {formatEventType(event)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter.success === null ? '' : filter.success.toString()}
              onChange={(e) => handleFilterChange({ 
                success: e.target.value === '' ? null : e.target.value === 'true'
              })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={filter.timeframe}
              onChange={(e) => handleFilterChange({ timeframe: e.target.value as WebhookFilter['timeframe'] })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {webhookStats?.recentErrors && webhookStats.recentErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-900 mb-3 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Recent Errors
          </h3>
          <div className="space-y-2">
            {webhookStats.recentErrors.map((error, index) => (
              <div key={index} className="bg-white rounded p-3 border border-red-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-red-900 uppercase">{error.provider}</p>
                    <p className="text-sm text-red-700">{error.error}</p>
                  </div>
                  <div className="text-right text-sm text-red-600">
                    <div>Count: {error.count}</div>
                    <div>Last: {new Date(error.lastSeen).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Webhook Logs</h3>
          <p className="text-sm text-gray-600 mt-1">
            {webhookLogs.length} logs loaded • Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {webhookLogs.map((log) => {
            const StatusIcon = getStatusIcon(log.success);
            return (
              <div key={log.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full border ${getStatusColor(log.success)}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 uppercase">{log.providerType}</h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {formatEventType(log.eventType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {log.message} • {new Date(log.processedAt).toLocaleString()}
                        {log.responseTime && ` • ${log.responseTime}ms`}
                      </p>
                      <p className="text-xs text-gray-500">
                        From: {log.sourceIp}
                        {log.retryCount && ` • Retries: ${log.retryCount}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                </div>

                {log.errorDetails && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{log.errorDetails}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {webhookLogs.length === 0 && !isLoading && (
          <div className="p-12 text-center">
            <CodeBracketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No webhook logs found</p>
            <p className="text-gray-600">
              No webhook logs match your current filters. Try adjusting the timeframe or filters.
            </p>
          </div>
        )}

        {webhookLogs.length > 0 && webhookLogs.length >= filter.limit && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Load More Logs
            </button>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedLog(null)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Webhook Log Details
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedLog.providerType.toUpperCase()} • {formatEventType(selectedLog.eventType)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLog.success)}`}>
                          {React.createElement(getStatusIcon(selectedLog.success), { className: "h-4 w-4 mr-2" })}
                          {selectedLog.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Processed At</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {new Date(selectedLog.processedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Source IP</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedLog.sourceIp}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Response Time</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedLog.responseTime}ms</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedLog.message}</div>
                  </div>

                  {selectedLog.errorDetails && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Error Details</label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                        <pre className="text-sm text-red-800 whitespace-pre-wrap">
                          {selectedLog.errorDetails}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Webhook Data</label>
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.webhookData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}