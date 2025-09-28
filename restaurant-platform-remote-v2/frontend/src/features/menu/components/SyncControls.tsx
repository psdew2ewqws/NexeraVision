import React, { useState } from 'react';
import {
  ArrowPathIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import {
  useSyncStatus,
  useSyncLogs,
  useSyncHistory,
  useSyncAnalytics,
  useTriggerMenuSync,
  useCancelSync,
} from '../hooks/useSyncManagement';

interface SyncControlsProps {
  assignmentId: string;
}

export const SyncControls: React.FC<SyncControlsProps> = ({ assignmentId }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'history' | 'analytics'>('status');
  const [logLevel, setLogLevel] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Queries
  const { data: syncStatus } = useSyncStatus(assignmentId);
  const { data: syncLogs } = useSyncLogs(assignmentId, {
    limit: 50,
    level: logLevel === 'all' ? undefined : logLevel,
  });
  const { data: syncHistory } = useSyncHistory(assignmentId, { limit: 10 });
  const { data: analytics } = useSyncAnalytics(assignmentId, '7d');

  // Mutations
  const triggerSync = useTriggerMenuSync();
  const cancelSync = useCancelSync();

  const isActive = syncStatus?.isActive || false;
  const currentStatus = syncStatus?.status;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return CheckCircleIcon;
      case 'failed':
        return XCircleIcon;
      case 'in_progress':
        return ArrowPathIcon;
      case 'pending':
        return ClockIcon;
      default:
        return ClockIcon;
    }
  };

  const renderStatusTab = () => {
    if (!currentStatus) {
      return (
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No sync status available</p>
        </div>
      );
    }

    const StatusIcon = getStatusIcon(currentStatus.status);
    const progress = currentStatus.totalItems > 0
      ? Math.round((currentStatus.itemsProcessed / currentStatus.totalItems) * 100)
      : 0;

    return (
      <div className="space-y-6">
        {/* Current Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Current Sync Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus.status)}`}>
              <StatusIcon className={`w-4 h-4 mr-1.5 ${isActive ? 'animate-spin' : ''}`} />
              {currentStatus.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Sync Type</p>
              <p className="text-sm text-gray-600 capitalize">{currentStatus.syncType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Started At</p>
              <p className="text-sm text-gray-600">
                {format(new Date(currentStatus.startedAt), 'MMM d, yyyy HH:mm:ss')}
              </p>
            </div>
            {currentStatus.completedAt && (
              <div>
                <p className="text-sm font-medium text-gray-900">Completed At</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(currentStatus.completedAt), 'MMM d, yyyy HH:mm:ss')}
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Progress</p>
              <p className="text-sm text-gray-600">
                {currentStatus.itemsProcessed} / {currentStatus.totalItems} items ({progress}%)
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStatus.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Errors */}
          {currentStatus.errors && currentStatus.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors ({currentStatus.errors.length})</h4>
              <div className="space-y-1">
                {currentStatus.errors.slice(0, 3).map((error, index) => (
                  <p key={index} className="text-sm text-red-700">{error.message || error}</p>
                ))}
                {currentStatus.errors.length > 3 && (
                  <p className="text-sm text-red-600">... and {currentStatus.errors.length - 3} more errors</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => triggerSync.mutate(assignmentId)}
            disabled={isActive || triggerSync.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
            {triggerSync.isPending ? 'Starting...' : 'Trigger Sync'}
          </button>

          {isActive && (
            <button
              onClick={() => cancelSync.mutate(assignmentId)}
              disabled={cancelSync.isPending}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <StopIcon className="w-4 h-4 mr-2" />
              {cancelSync.isPending ? 'Cancelling...' : 'Cancel Sync'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderLogsTab = () => {
    return (
      <div className="space-y-4">
        {/* Log Level Filter */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Sync Logs</h3>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value as any)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Logs List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {syncLogs?.logs && syncLogs.logs.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {syncLogs.logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{log.message}</p>
                        {log.metadata && (
                          <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No logs available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Sync History</h3>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {syncHistory?.history && syncHistory.history.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {syncHistory.history.map((sync) => {
                const StatusIcon = getStatusIcon(sync.status);
                const progress = sync.totalItems > 0
                  ? Math.round((sync.itemsProcessed / sync.totalItems) * 100)
                  : 0;

                return (
                  <div key={sync.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sync.status)}`}>
                          <StatusIcon className="w-4 h-4 mr-1.5" />
                          {sync.status}
                        </span>
                        <span className="text-sm text-gray-600 capitalize">{sync.syncType}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {format(new Date(sync.startedAt), 'MMM d, HH:mm')}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium">
                          {sync.completedAt
                            ? `${Math.round((new Date(sync.completedAt).getTime() - new Date(sync.startedAt).getTime()) / 1000)}s`
                            : 'In progress'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Items</p>
                        <p className="font-medium">{sync.itemsProcessed} / {sync.totalItems}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Progress</p>
                        <p className="font-medium">{progress}%</p>
                      </div>
                    </div>

                    {sync.errors && sync.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        {sync.errors.length} error{sync.errors.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No sync history available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    if (!analytics) {
      return (
        <div className="text-center py-8">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No analytics available</p>
        </div>
      );
    }

    const successRate = analytics.totalSyncs > 0
      ? Math.round((analytics.successfulSyncs / analytics.totalSyncs) * 100)
      : 0;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Sync Analytics (Last 7 Days)</h3>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Total Syncs</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalSyncs}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Success Rate</p>
            <p className="text-2xl font-bold text-green-600">{successRate}%</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Avg Sync Time</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(analytics.avgSyncTime)}s</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Frequency</p>
            <p className="text-2xl font-bold text-indigo-600">{analytics.syncFrequency}/day</p>
          </div>
        </div>

        {/* Error Breakdown */}
        {Object.keys(analytics.errorBreakdown).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Error Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(analytics.errorBreakdown).map(([error, count]) => (
                <div key={error} className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">{error}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {analytics.lastSync && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Last Sync</h4>
            <p className="text-sm text-gray-600">
              {format(new Date(analytics.lastSync), 'MMM d, yyyy HH:mm:ss')}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Sync Management</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'status', label: 'Status', icon: EyeIcon },
            { key: 'logs', label: 'Logs', icon: DocumentTextIcon },
            { key: 'history', label: 'History', icon: ClockIcon },
            { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'status' && renderStatusTab()}
        {activeTab === 'logs' && renderLogsTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>
    </div>
  );
};