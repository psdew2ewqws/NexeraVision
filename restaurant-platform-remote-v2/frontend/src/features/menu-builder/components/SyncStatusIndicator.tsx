// Sync Status Indicator - Real-time progress with animated feedback
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  CloudIcon,
  WifiIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

type SyncStatus = 'synced' | 'syncing' | 'error' | 'draft' | 'pending' | 'offline';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSync?: Date;
  progress?: number;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

interface SyncStatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

const SYNC_STATUS_CONFIGS: Record<SyncStatus, SyncStatusConfig> = {
  synced: {
    icon: CheckCircleIconSolid,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Synced',
    description: 'All changes are synchronized'
  },
  syncing: {
    icon: ArrowPathIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Syncing',
    description: 'Synchronizing changes...'
  },
  error: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Error',
    description: 'Sync failed - click to retry'
  },
  draft: {
    icon: ClockIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Draft',
    description: 'Changes not yet synchronized'
  },
  pending: {
    icon: CloudIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Pending',
    description: 'Waiting for sync...'
  },
  offline: {
    icon: WifiIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    label: 'Offline',
    description: 'No connection available'
  }
};

const SIZE_CONFIGS = {
  sm: {
    icon: 'w-3 h-3',
    container: 'px-2 py-1',
    text: 'text-xs',
    badge: 'w-5 h-5'
  },
  md: {
    icon: 'w-4 h-4',
    container: 'px-3 py-1.5',
    text: 'text-sm',
    badge: 'w-6 h-6'
  },
  lg: {
    icon: 'w-5 h-5',
    container: 'px-4 py-2',
    text: 'text-base',
    badge: 'w-8 h-8'
  }
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  lastSync,
  progress,
  error,
  size = 'md',
  showLabel = true,
  showTimestamp = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const config = SYNC_STATUS_CONFIGS[status];
  const sizeConfig = SIZE_CONFIGS[size];
  const IconComponent = config.icon;

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Progress bar component
  const ProgressBar = () => {
    if (status !== 'syncing' || progress === undefined) return null;

    return (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 rounded-full overflow-hidden"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-blue-500 rounded-full"
        />
      </motion.div>
    );
  };

  // Tooltip component
  const Tooltip = () => {
    if (!isHovered && !showDetails) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
      >
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
          <div className="font-medium">{config.label}</div>
          <div className="text-gray-300 text-xs">{config.description}</div>
          {lastSync && (
            <div className="text-gray-400 text-xs mt-1">
              Last sync: {formatRelativeTime(lastSync)}
            </div>
          )}
          {error && (
            <div className="text-red-300 text-xs mt-1">
              Error: {error}
            </div>
          )}
          {progress !== undefined && status === 'syncing' && (
            <div className="text-blue-300 text-xs mt-1">
              {Math.round(progress)}% complete
            </div>
          )}

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className={`sync-status-indicator relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Main Status Badge */}
      <motion.div
        layout
        className={`relative flex items-center rounded-full transition-all duration-200 cursor-pointer ${
          sizeConfig.container
        } ${config.bgColor} ${config.color} ${
          isHovered ? 'shadow-md scale-105' : 'shadow-sm'
        }`}
      >
        {/* Icon */}
        <motion.div
          animate={{
            rotate: status === 'syncing' ? 360 : 0
          }}
          transition={{
            duration: status === 'syncing' ? 1 : 0,
            repeat: status === 'syncing' ? Infinity : 0,
            ease: "linear"
          }}
          className="flex-shrink-0"
        >
          <IconComponent className={`${sizeConfig.icon} ${config.color}`} />
        </motion.div>

        {/* Label */}
        {showLabel && (
          <motion.span
            layout
            className={`ml-2 font-medium ${sizeConfig.text} ${config.color}`}
          >
            {config.label}
          </motion.span>
        )}

        {/* Timestamp */}
        {showTimestamp && lastSync && (
          <motion.span
            layout
            className={`ml-2 ${sizeConfig.text} opacity-75`}
          >
            {formatRelativeTime(lastSync)}
          </motion.span>
        )}

        {/* Progress Bar */}
        <ProgressBar />

        {/* Pulse Animation for Syncing */}
        {status === 'syncing' && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute inset-0 rounded-full ${config.bgColor}`}
          />
        )}

        {/* Error Pulse */}
        {status === 'error' && (
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-red-200"
          />
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        <Tooltip />
      </AnimatePresence>
    </div>
  );
};

// Bulk sync status for multiple items
interface BulkSyncStatusProps {
  items: Array<{
    id: string;
    name: string;
    status: SyncStatus;
    progress?: number;
  }>;
  className?: string;
}

export const BulkSyncStatus: React.FC<BulkSyncStatusProps> = ({
  items,
  className = ''
}) => {
  const totalItems = items.length;
  const syncedItems = items.filter(item => item.status === 'synced').length;
  const syncingItems = items.filter(item => item.status === 'syncing').length;
  const errorItems = items.filter(item => item.status === 'error').length;

  const overallProgress = totalItems > 0 ? (syncedItems / totalItems) * 100 : 0;

  return (
    <div className={`bulk-sync-status ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold text-gray-900">Sync Status</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{syncedItems}/{totalItems} synced</span>
            {syncingItems > 0 && (
              <>
                <span>•</span>
                <span>{syncingItems} syncing</span>
              </>
            )}
            {errorItems > 0 && (
              <>
                <span>•</span>
                <span className="text-red-600">{errorItems} errors</span>
              </>
            )}
          </div>
        </div>

        <div className="text-sm font-medium text-gray-900">
          {Math.round(overallProgress)}%
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.5 }}
          className="bg-green-500 h-2 rounded-full"
        />
      </div>

      {/* Individual Item Status */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-900 truncate flex-1">
              {item.name}
            </span>
            <SyncStatusIndicator
              status={item.status}
              progress={item.progress}
              size="sm"
              showLabel={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};