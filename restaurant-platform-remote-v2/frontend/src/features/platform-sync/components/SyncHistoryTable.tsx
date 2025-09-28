// ================================================
// Sync History Table Component
// Restaurant Platform v2 - Historical Sync Data
// ================================================

import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { SyncStatus } from '../../../types/platform-menu.types';
import { SyncHistoryItem } from '../hooks/usePlatformSync';

// ================================================
// INTERFACES
// ================================================

interface SyncHistoryTableProps {
  history: SyncHistoryItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

// ================================================
// SYNC HISTORY TABLE COMPONENT
// ================================================

export const SyncHistoryTable: React.FC<SyncHistoryTableProps> = ({
  history,
  isLoading,
  onRefresh
}) => {
  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.COMPLETED:
        return <CheckCircleIcon className=\"w-5 h-5 text-green-500\" />;
      case SyncStatus.FAILED:
        return <XCircleIcon className=\"w-5 h-5 text-red-500\" />;
      case SyncStatus.IN_PROGRESS:
        return <ArrowPathIcon className=\"w-5 h-5 text-blue-500 animate-spin\" />;
      default:
        return <ClockIcon className=\"w-5 h-5 text-gray-400\" />;
    }
  };

  const getStatusBadge = (status: SyncStatus) => {
    const baseClasses = \"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium\";

    switch (status) {
      case SyncStatus.COMPLETED:
        return `${baseClasses} bg-green-100 text-green-800`;
      case SyncStatus.FAILED:
        return `${baseClasses} bg-red-100 text-red-800`;
      case SyncStatus.IN_PROGRESS:
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDuration = (durationMs: number): string => {
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${(durationMs / 60000).toFixed(1)}m`;
  };

  const formatPlatforms = (platforms: string[]): string => {
    if (platforms.length <= 2) {
      return platforms.join(', ');
    }
    return `${platforms.slice(0, 2).join(', ')} +${platforms.length - 2} more`;
  };

  if (isLoading) {
    return (
      <div className=\"p-8 text-center\">
        <ArrowPathIcon className=\"w-8 h-8 text-gray-400 animate-spin mx-auto mb-4\" />
        <p className=\"text-gray-500\">Loading sync history...</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className=\"p-8 text-center\">
        <ClockIcon className=\"w-12 h-12 text-gray-300 mx-auto mb-4\" />
        <p className=\"text-gray-500 text-lg\">No sync history yet</p>
        <p className=\"text-gray-400 text-sm mt-2\">
          Your sync operations will appear here after you start syncing menus
        </p>
      </div>
    );
  }

  return (
    <div className=\"p-6\">
      <div className=\"flex items-center justify-between mb-4\">
        <h4 className=\"text-lg font-medium text-gray-900\">Recent Sync Operations</h4>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          className=\"inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500\"
        >
          <ArrowPathIcon className=\"w-4 h-4 mr-1\" />
          Refresh
        </motion.button>
      </div>

      <div className=\"overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg\">
        <table className=\"min-w-full divide-y divide-gray-300\">
          <thead className=\"bg-gray-50\">
            <tr>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                Status
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                Platforms
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                Items Synced
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                Duration
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                Started
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                Errors
              </th>
            </tr>
          </thead>
          <tbody className=\"bg-white divide-y divide-gray-200\">
            {history.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className=\"hover:bg-gray-50\"
              >
                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"flex items-center\">
                    {getStatusIcon(item.overallStatus)}
                    <span className={`ml-2 ${getStatusBadge(item.overallStatus)}`}>
                      {item.overallStatus}
                    </span>
                  </div>
                </td>

                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm text-gray-900\">
                    {formatPlatforms(item.platforms)}
                  </div>
                  <div className=\"text-sm text-gray-500\">
                    {item.platforms.length} platform{item.platforms.length !== 1 ? 's' : ''}
                  </div>
                </td>

                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm font-medium text-gray-900\">
                    {item.totalItemsSynced.toLocaleString()}
                  </div>
                  <div className=\"text-sm text-gray-500\">items</div>
                </td>

                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm text-gray-900\">
                    {formatDuration(item.syncDurationMs)}
                  </div>
                  <div className={`text-sm ${
                    item.syncDurationMs <= 30000 ? 'text-green-600' :
                    item.syncDurationMs <= 60000 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {item.syncDurationMs <= 30000 ? 'Excellent' :
                     item.syncDurationMs <= 60000 ? 'Good' : 'Slow'}
                  </div>
                </td>

                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm text-gray-900\">
                    {new Date(item.startedAt).toLocaleDateString()}
                  </div>
                  <div className=\"text-sm text-gray-500\">
                    {new Date(item.startedAt).toLocaleTimeString()}
                  </div>
                </td>

                <td className=\"px-6 py-4 whitespace-nowrap\">
                  {item.totalErrors > 0 ? (
                    <div className=\"flex items-center\">
                      <XCircleIcon className=\"w-4 h-4 text-red-500 mr-1\" />
                      <span className=\"text-sm font-medium text-red-600\">
                        {item.totalErrors}
                      </span>
                    </div>
                  ) : (
                    <div className=\"flex items-center\">
                      <CheckCircleIcon className=\"w-4 h-4 text-green-500 mr-1\" />
                      <span className=\"text-sm text-green-600\">None</span>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Summary */}
      <div className=\"mt-6 bg-gray-50 rounded-lg p-4\">
        <h5 className=\"text-sm font-medium text-gray-700 mb-3\">Performance Summary</h5>
        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm\">
          <div>
            <span className=\"text-gray-500\">Total Operations</span>
            <p className=\"font-semibold text-gray-900\">{history.length}</p>
          </div>
          <div>
            <span className=\"text-gray-500\">Success Rate</span>
            <p className=\"font-semibold text-green-600\">
              {history.length > 0
                ? `${((history.filter(h => h.overallStatus === SyncStatus.COMPLETED).length / history.length) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
          <div>
            <span className=\"text-gray-500\">Avg Duration</span>
            <p className=\"font-semibold text-blue-600\">
              {history.length > 0
                ? formatDuration(history.reduce((sum, h) => sum + h.syncDurationMs, 0) / history.length)
                : '0s'
              }
            </p>
          </div>
          <div>
            <span className=\"text-gray-500\">Items Synced</span>
            <p className=\"font-semibold text-purple-600\">
              {history.reduce((sum, h) => sum + h.totalItemsSynced, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};