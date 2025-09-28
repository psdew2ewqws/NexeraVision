// ================================================
// Sync Progress Bars Component
// Restaurant Platform v2 - Real-time Progress Visualization
// ================================================

import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { SyncStatus } from '../../../types/platform-menu.types';
import { MultiPlatformSyncStatus } from '../hooks/useSyncProgress';

// ================================================
// INTERFACES
// ================================================

interface SyncProgressBarsProps {
  syncStatus: MultiPlatformSyncStatus;
}

// ================================================
// PLATFORM CONFIG
// ================================================

const PLATFORM_COLORS = {
  CAREEM: 'bg-green-500',
  TALABAT: 'bg-orange-500',
  WEBSITE: 'bg-blue-500',
  CALL_CENTER: 'bg-purple-500',
  MOBILE_APP: 'bg-pink-500',
  KIOSK: 'bg-indigo-500',
  IN_STORE_DISPLAY: 'bg-teal-500',
  CHATBOT: 'bg-gray-500',
  ONLINE_ORDERING: 'bg-cyan-500'
};

// ================================================
// SYNC PROGRESS BARS COMPONENT
// ================================================

export const SyncProgressBars: React.FC<SyncProgressBarsProps> = ({ syncStatus }) => {
  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.COMPLETED:
        return <CheckCircleIcon className=\"w-5 h-5 text-green-500\" />;
      case SyncStatus.FAILED:
        return <XCircleIcon className=\"w-5 h-5 text-red-500\" />;
      case SyncStatus.IN_PROGRESS:
        return <ArrowPathIcon className=\"w-5 h-5 text-blue-500 animate-spin\" />;
      default:
        return <div className=\"w-5 h-5 rounded-full bg-gray-300\" />;
    }
  };

  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.COMPLETED:
        return 'bg-green-500';
      case SyncStatus.FAILED:
        return 'bg-red-500';
      case SyncStatus.IN_PROGRESS:
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8\">
      <div className=\"flex items-center justify-between mb-6\">
        <h3 className=\"text-lg font-semibold text-gray-900\">Platform Sync Progress</h3>
        <div className=\"text-sm text-gray-500\">
          {syncStatus.overallProgress.completedPlatforms} of {syncStatus.overallProgress.totalPlatforms} platforms completed
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className=\"mb-8\">
        <div className=\"flex items-center justify-between mb-2\">
          <span className=\"text-sm font-medium text-gray-700\">Overall Progress</span>
          <span className=\"text-sm text-gray-500\">
            {syncStatus.overallProgress.percentage.toFixed(1)}%
          </span>
        </div>

        <div className=\"w-full bg-gray-200 rounded-full h-3\">
          <motion.div
            className=\"bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full flex items-center justify-end pr-2\"
            initial={{ width: 0 }}
            animate={{ width: `${syncStatus.overallProgress.percentage}%` }}
            transition={{ duration: 0.5 }}
          >
            {syncStatus.overallProgress.percentage > 15 && (
              <span className=\"text-white text-xs font-medium\">
                {syncStatus.overallProgress.percentage.toFixed(0)}%
              </span>
            )}
          </motion.div>
        </div>

        <div className=\"flex items-center justify-between mt-2 text-xs text-gray-500\">
          <span>Started: {new Date(syncStatus.startedAt).toLocaleTimeString()}</span>
          {syncStatus.estimatedTimeRemaining > 0 && (
            <span>
              Est. remaining: {Math.ceil(syncStatus.estimatedTimeRemaining / 1000)}s
            </span>
          )}
        </div>
      </div>

      {/* Individual Platform Progress */}
      <div className=\"space-y-4\">
        <h4 className=\"text-sm font-medium text-gray-700 mb-3\">Platform Details</h4>

        {syncStatus.platformStatuses.map((platformStatus, index) => {
          const platformColor = PLATFORM_COLORS[platformStatus.platform as keyof typeof PLATFORM_COLORS] || 'bg-gray-500';

          return (
            <motion.div
              key={platformStatus.platform}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className=\"border border-gray-200 rounded-lg p-4\"
            >
              <div className=\"flex items-center justify-between mb-3\">
                <div className=\"flex items-center space-x-3\">
                  <div className={`w-3 h-3 rounded-full ${platformColor}`} />
                  <span className=\"font-medium text-gray-900\">
                    {platformStatus.platform.replace('_', ' ').toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase())}
                  </span>
                  {getStatusIcon(platformStatus.status)}
                </div>

                <div className=\"flex items-center space-x-3\">
                  <span className=\"text-sm text-gray-500\">
                    {platformStatus.progress.current}/{platformStatus.progress.total} items
                  </span>
                  <span className=\"text-sm font-medium text-gray-700\">
                    {platformStatus.progress.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Platform Progress Bar */}
              <div className=\"w-full bg-gray-200 rounded-full h-2 mb-2\">
                <motion.div
                  className={`h-2 rounded-full ${getStatusColor(platformStatus.status)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${platformStatus.progress.percentage}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>

              {/* Platform Status Details */}
              <div className=\"flex items-center justify-between text-xs text-gray-500\">
                <span>
                  {platformStatus.progress.currentOperation ||
                   (platformStatus.status === SyncStatus.COMPLETED ? 'Sync completed' :
                    platformStatus.status === SyncStatus.FAILED ? 'Sync failed' :
                    platformStatus.status === SyncStatus.IN_PROGRESS ? 'Syncing...' : 'Pending')}
                </span>

                {platformStatus.errors && platformStatus.errors.length > 0 && (
                  <span className=\"text-red-500 font-medium\">
                    {platformStatus.errors.length} error{platformStatus.errors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Error Display */}
              {platformStatus.errors && platformStatus.errors.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className=\"mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700\"
                >
                  {platformStatus.errors.slice(0, 2).map((error, errorIndex) => (
                    <div key={errorIndex} className=\"mb-1 last:mb-0\">
                      • {error}
                    </div>
                  ))}
                  {platformStatus.errors.length > 2 && (
                    <div className=\"text-red-500 font-medium\">
                      +{platformStatus.errors.length - 2} more errors
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className=\"mt-6 pt-6 border-t border-gray-200\">
        <div className=\"grid grid-cols-3 gap-4 text-center\">
          <div>
            <p className=\"text-2xl font-semibold text-gray-900\">{syncStatus.totalItemsSynced}</p>
            <p className=\"text-sm text-gray-500\">Items Synced</p>
          </div>
          <div>
            <p className=\"text-2xl font-semibold text-red-600\">{syncStatus.totalErrors}</p>
            <p className=\"text-sm text-gray-500\">Total Errors</p>
          </div>
          <div>
            <p className=\"text-2xl font-semibold text-blue-600\">
              {syncStatus.overallProgress.completedPlatforms}
            </p>
            <p className=\"text-sm text-gray-500\">Platforms Done</p>
          </div>
        </div>
      </div>
    </div>
  );
};