import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  BellAlertIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import websocketService, { AlertData } from '@/services/websocket.service';

interface AlertsPanelProps {
  maxAlerts?: number;
  autoResolve?: boolean;
  showFilters?: boolean;
  defaultFilters?: {
    level?: AlertData['level'];
    resolved?: boolean;
    provider?: string;
  };
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  maxAlerts = 50,
  autoResolve = true,
  showFilters = true,
  defaultFilters = {}
}) => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertData[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [showResolved, setShowResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle new alerts
  const handleAlert = useCallback((alert: AlertData) => {
    setAlerts(prevAlerts => {
      // Check if alert already exists
      const existingIndex = prevAlerts.findIndex(a => a.id === alert.id);

      if (existingIndex >= 0) {
        // Update existing alert
        const newAlerts = [...prevAlerts];
        newAlerts[existingIndex] = alert;
        return newAlerts;
      } else {
        // Add new alert
        const newAlerts = [alert, ...prevAlerts];
        return newAlerts.slice(0, maxAlerts);
      }
    });
    setIsLoading(false);
  }, [maxAlerts]);

  // Apply filters
  useEffect(() => {
    let filtered = alerts;

    // Filter by resolution status
    if (!showResolved) {
      filtered = filtered.filter(alert => !alert.resolved);
    }

    // Filter by level
    if (filters.level) {
      filtered = filtered.filter(alert => alert.level === filters.level);
    }

    // Filter by provider
    if (filters.provider) {
      filtered = filtered.filter(alert =>
        alert.provider?.toLowerCase().includes(filters.provider!.toLowerCase())
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredAlerts(filtered);
  }, [alerts, filters, showResolved]);

  // Setup WebSocket listeners
  useEffect(() => {
    const unsubscribe = websocketService.on('alert', handleAlert);

    // Subscribe to alerts
    websocketService.emit('subscribe_alerts');

    return () => {
      unsubscribe();
      websocketService.emit('unsubscribe_alerts');
    };
  }, [handleAlert]);

  // Auto-resolve alerts after a certain time (if enabled)
  useEffect(() => {
    if (!autoResolve) return;

    const interval = setInterval(() => {
      const now = new Date();
      setAlerts(prevAlerts =>
        prevAlerts.map(alert => {
          const alertTime = new Date(alert.timestamp);
          const hoursDiff = (now.getTime() - alertTime.getTime()) / (1000 * 60 * 60);

          // Auto-resolve info alerts after 1 hour, warnings after 4 hours
          if (!alert.resolved && (
            (alert.level === 'info' && hoursDiff > 1) ||
            (alert.level === 'warning' && hoursDiff > 4)
          )) {
            return { ...alert, resolved: true };
          }

          return alert;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoResolve]);

  const getAlertIcon = (level: AlertData['level']) => {
    switch (level) {
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertBadgeClass = (level: AlertData['level'], resolved: boolean) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";

    if (resolved) {
      return `${baseClasses} bg-gray-100 text-gray-600`;
    }

    switch (level) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800 animate-pulse`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'info':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getAlertRowClass = (level: AlertData['level'], resolved: boolean) => {
    if (resolved) {
      return 'bg-gray-50 opacity-75';
    }

    switch (level) {
      case 'critical':
        return 'bg-red-50 border-l-4 border-red-400';
      case 'error':
        return 'bg-red-50 border-l-4 border-red-300';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      case 'info':
        return 'bg-blue-50 border-l-4 border-blue-400';
      default:
        return 'bg-white';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );

    // Notify backend about resolved alert
    websocketService.emit('resolve_alert', { alertId });
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  };

  const clearAllResolved = () => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => !alert.resolved));
  };

  const getUnresolvedCount = () => {
    return alerts.filter(alert => !alert.resolved).length;
  };

  const getCriticalCount = () => {
    return alerts.filter(alert => !alert.resolved && alert.level === 'critical').length;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BellAlertIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">System Alerts</h3>
              <p className="text-sm text-gray-500">
                {getUnresolvedCount()} active alerts
                {getCriticalCount() > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    ({getCriticalCount()} critical)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearAllResolved}
              className="text-sm text-gray-600 hover:text-gray-900"
              disabled={alerts.filter(a => a.resolved).length === 0}
            >
              Clear resolved
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Show resolved</span>
              </label>
            </div>

            <select
              value={filters.level || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value as AlertData['level'] || undefined }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All levels</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <input
              type="text"
              placeholder="Filter by provider..."
              value={filters.provider || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value || undefined }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence initial={false}>
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {isLoading ? (
                <div className="animate-pulse">
                  <BellAlertIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading alerts...</p>
                </div>
              ) : (
                <>
                  <CheckIcon className="h-12 w-12 mx-auto mb-4 text-green-400" />
                  <p>No alerts match your filters</p>
                  <p className="text-sm mt-1">All systems are operating normally</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 ${getAlertRowClass(alert.level, alert.resolved)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {alert.resolved ? (
                          <CheckIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          getAlertIcon(alert.level)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={getAlertBadgeClass(alert.level, alert.resolved)}>
                            {alert.resolved ? 'resolved' : alert.level}
                          </span>
                          {alert.provider && (
                            <span className="text-sm text-gray-500">
                              {alert.provider}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {formatTimestamp(alert.timestamp)}
                          </span>
                        </div>

                        <p className={`text-sm ${alert.resolved ? 'text-gray-500' : 'text-gray-900'}`}>
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!alert.resolved && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Mark as resolved"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Dismiss alert"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      {filteredAlerts.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Showing {filteredAlerts.length} of {alerts.length} alerts
          {filters.level || filters.provider ? ' (filtered)' : ''}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;