// ================================================
// Sync Metrics Cards Component
// Restaurant Platform v2 - Performance Metrics Display
// ================================================

import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// ================================================
// INTERFACES
// ================================================

interface SyncMetricsCardsProps {
  totalSyncs: number;
  activeSyncs: number;
  averageSyncTime: number; // in milliseconds
  successRate: number; // percentage
}

// ================================================
// SYNC METRICS CARDS COMPONENT
// ================================================

export const SyncMetricsCards: React.FC<SyncMetricsCardsProps> = ({
  totalSyncs,
  activeSyncs,
  averageSyncTime,
  successRate
}) => {
  const formatSyncTime = (timeMs: number): string => {
    if (timeMs < 1000) return `${timeMs}ms`;
    if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`;
    return `${(timeMs / 60000).toFixed(1)}m`;
  };

  const metrics = [
    {
      name: 'Total Syncs',
      value: totalSyncs.toLocaleString(),
      icon: ChartBarIcon,
      color: 'blue',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      name: 'Active Syncs',
      value: activeSyncs.toString(),
      icon: ArrowPathIcon,
      color: 'purple',
      change: activeSyncs > 0 ? 'Running' : 'Idle',
      changeType: activeSyncs > 0 ? 'neutral' : 'neutral' as const
    },
    {
      name: 'Avg Sync Time',
      value: formatSyncTime(averageSyncTime),
      icon: ClockIcon,
      color: 'green',
      change: '-15%',
      changeType: 'positive' as const,
      subtext: 'Target: <30s'
    },
    {
      name: 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircleIcon,
      color: 'emerald',
      change: '+2%',
      changeType: 'positive' as const,
      subtext: 'Last 30 days'
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-200'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-200'
    }
  };

  return (
    <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
      {metrics.map((metric, index) => {
        const colors = colorClasses[metric.color as keyof typeof colorClasses];

        return (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow border ${colors.border} hover:shadow-md transition-shadow`}
          >
            <div className=\"flex items-center\">
              <div className=\"flex-shrink-0\">
                <div className={`inline-flex items-center justify-center p-3 ${colors.bg} rounded-md`}>
                  <metric.icon
                    className={`h-6 w-6 ${colors.icon} ${activeSyncs > 0 && metric.name === 'Active Syncs' ? 'animate-spin' : ''}`}
                    aria-hidden=\"true\"
                  />
                </div>
              </div>
              <div className=\"ml-5 w-0 flex-1\">
                <dl>
                  <dt className=\"text-sm font-medium text-gray-500 truncate\">
                    {metric.name}
                  </dt>
                  <dd className=\"flex items-baseline\">
                    <div className=\"text-2xl font-semibold text-gray-900\">
                      {metric.value}
                    </div>
                    {metric.change && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        metric.changeType === 'positive'
                          ? 'text-green-600'
                          : metric.changeType === 'negative'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        {metric.change}
                      </div>
                    )}
                  </dd>
                  {metric.subtext && (
                    <dd className=\"text-xs text-gray-400 mt-1\">
                      {metric.subtext}
                    </dd>
                  )}
                </dl>
              </div>
            </div>

            {/* Performance indicator for sync time */}
            {metric.name === 'Avg Sync Time' && (
              <div className=\"mt-3\">
                <div className=\"flex items-center justify-between text-xs text-gray-500 mb-1\">
                  <span>Performance</span>
                  <span>Target: 30s</span>
                </div>
                <div className=\"w-full bg-gray-200 rounded-full h-1.5\">
                  <motion.div
                    className={`h-1.5 rounded-full ${
                      averageSyncTime <= 30000 ? 'bg-green-500' :
                      averageSyncTime <= 45000 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((averageSyncTime / 30000) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Success rate indicator */}
            {metric.name === 'Success Rate' && (
              <div className=\"mt-3\">
                <div className=\"flex items-center justify-between text-xs text-gray-500 mb-1\">
                  <span>Reliability</span>
                  <span>Target: 95%</span>
                </div>
                <div className=\"w-full bg-gray-200 rounded-full h-1.5\">
                  <motion.div
                    className={`h-1.5 rounded-full ${
                      successRate >= 95 ? 'bg-green-500' :
                      successRate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${successRate}%` }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};