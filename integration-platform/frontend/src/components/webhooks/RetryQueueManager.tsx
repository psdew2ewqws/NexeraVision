import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useRetryQueue } from '../../hooks/useWebhooks';
import { SupportedProvider, RetryQueueItem } from '../../types/webhook';
import { WebhookApi } from '../../lib/webhook-api';

interface RetryQueueManagerProps {
  onBulkRetry?: (items: RetryQueueItem[]) => void;
}

export const RetryQueueManager: React.FC<RetryQueueManagerProps> = ({ onBulkRetry }) => {
  const [filters, setFilters] = useState({
    provider: '' as SupportedProvider | '',
    status: '' as 'pending' | 'processing' | 'failed' | 'abandoned' | '',
    clientId: '',
    limit: 50,
    offset: 0
  });

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const { items, total, loading, error, refetch } = useRetryQueue(filters);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lastError.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [items, searchTerm]);

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Pending'
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: RotateCcw,
        label: 'Processing'
      },
      failed: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: 'Failed'
      },
      abandoned: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertTriangle,
        label: 'Abandoned'
      }
    };

    return configs[status as keyof typeof configs] || configs.failed;
  };

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkRetry = async () => {
    const selectedRetryItems = filteredItems.filter(item => selectedItems.has(item.id));

    if (selectedRetryItems.length === 0) return;

    setBulkActionLoading(true);
    try {
      const logIds = selectedRetryItems.map(item => item.id);
      await WebhookApi.bulkRetryWebhooks(logIds);

      setSelectedItems(new Set());
      await refetch();

      if (onBulkRetry) {
        onBulkRetry(selectedRetryItems);
      }
    } catch (error) {
      console.error('Bulk retry failed:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleRetryItem = async (item: RetryQueueItem) => {
    try {
      await WebhookApi.retryWebhook(item.id);
      await refetch();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / (1000 * 60));

    if (diffMins <= 0) {
      return 'Now';
    } else if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffMins < 1440) {
      return `${Math.ceil(diffMins / 60)}h`;
    } else {
      return `${Math.ceil(diffMins / 1440)}d`;
    }
  };

  const getProgressWidth = (retryCount: number, maxRetries: number) => {
    return Math.min((retryCount / maxRetries) * 100, 100);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Retry Queue</h3>
          <div className="flex space-x-2">
            <button
              onClick={refetch}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </button>
            {selectedItems.size > 0 && (
              <button
                onClick={handleBulkRetry}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {bulkActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry ({selectedItems.size})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2 py-1.5 border border-gray-200 rounded text-xs w-full focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <select
            value={filters.provider}
            onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value as SupportedProvider }))}
            className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">All Providers</option>
            {Object.values(SupportedProvider).map(provider => (
              <option key={provider} value={provider} className="capitalize">
                {provider}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>

          <div className="text-xs text-gray-500 flex items-center">
            {filteredItems.length} of {total} items
          </div>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="px-4 py-2 border-b border-slate-200 bg-gray-50">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Pending', count: items.filter(i => i.status === 'pending').length, color: 'text-yellow-600' },
            { label: 'Processing', count: items.filter(i => i.status === 'processing').length, color: 'text-blue-600' },
            { label: 'Failed', count: items.filter(i => i.status === 'failed').length, color: 'text-red-600' },
            { label: 'Abandoned', count: items.filter(i => i.status === 'abandoned').length, color: 'text-gray-600' }
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className={`text-lg font-medium ${stat.color}`}>{stat.count}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-4 text-center">
          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No items in retry queue</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Provider
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Event
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Progress
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Next Retry
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                const StatusIcon = statusConfig.icon;
                const progressWidth = getProgressWidth(item.retryCount, item.maxRetries);

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {item.provider}
                      </span>
                      <div className="text-xs text-gray-500">{item.clientId}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{item.eventType}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 w-16">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                item.status === 'abandoned'
                                  ? 'bg-gray-500'
                                  : item.status === 'failed'
                                  ? 'bg-red-500'
                                  : progressWidth < 50
                                  ? 'bg-green-500'
                                  : progressWidth < 80
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${progressWidth}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {item.retryCount}/{item.maxRetries}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {item.nextRetryAt ? formatRelativeTime(item.nextRetryAt) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex space-x-1">
                        {item.status !== 'abandoned' && item.status !== 'processing' && (
                          <button
                            onClick={() => handleRetryItem(item)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Retry Now"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        )}
                        {item.status === 'processing' && (
                          <button
                            className="p-1 text-yellow-600 hover:text-yellow-700 transition-colors"
                            title="Cancel"
                          >
                            <Pause className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Queue Settings */}
      <div className="px-4 py-3 border-t border-slate-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-gray-500 mb-1">Max Size</label>
            <span className="font-medium text-gray-900">10K items</span>
          </div>
          <div>
            <label className="block text-gray-500 mb-1">Retry Strategy</label>
            <span className="font-medium text-gray-900">Exponential backoff</span>
          </div>
          <div>
            <label className="block text-gray-500 mb-1">Auto-cleanup</label>
            <span className="font-medium text-gray-900">7 days</span>
          </div>
        </div>

        <div className="mt-3 flex space-x-4">
          <button className="text-xs text-blue-600 hover:text-blue-700 transition-colors">
            Configure Settings
          </button>
          <button className="text-xs text-red-600 hover:text-red-700 transition-colors">
            Clear Abandoned
          </button>
        </div>
      </div>
    </div>
  );
};