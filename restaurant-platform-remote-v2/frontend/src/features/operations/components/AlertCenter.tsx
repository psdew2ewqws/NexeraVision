import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  FunnelIcon,
  ClockIcon,
  BuildingOfficeIcon,
  TruckIcon,
  PrinterIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useOperations, Alert } from '../contexts/OperationsContext';

interface AlertCenterProps {
  branchId?: string;
  companyId?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

const alertIcons = {
  orders: TruckIcon,
  providers: TruckIcon,
  system: InformationCircleIcon,
  printers: PrinterIcon,
  menu: DocumentIcon
};

const alertTypeColors = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: 'text-blue-500',
    accent: 'bg-blue-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    icon: 'text-yellow-500',
    accent: 'bg-yellow-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    icon: 'text-red-500',
    accent: 'bg-red-500'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    icon: 'text-green-500',
    accent: 'bg-green-500'
  }
};

const alertTypeIcons = {
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationTriangleIcon,
  success: CheckCircleIcon
};

export default function AlertCenter({ branchId, companyId, size = 'medium' }: AlertCenterProps) {
  const { alerts, markAlertRead, clearAlerts, unreadAlertsCount } = useOperations();
  const [filter, setFilter] = useState<'all' | 'unread' | 'orders' | 'providers' | 'system' | 'printers' | 'menu'>('all');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Filter alerts based on props and filter state
  const filteredAlerts = alerts
    .filter(alert => {
      // Filter by branch/company if specified
      if (branchId && alert.branchId && alert.branchId !== branchId) return false;
      if (companyId && !branchId && alert.branchId) {
        // If company filter but specific branch alert, skip for now
        // In a real implementation, you'd check if the branch belongs to the company
      }

      // Filter by read status or source
      if (filter === 'unread') return !alert.read;
      if (filter !== 'all') return alert.source === filter;

      return true;
    })
    .sort((a, b) => {
      // Sort by read status first (unread first), then by timestamp (newest first)
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleMarkRead = (alertId: string) => {
    markAlertRead(alertId);
  };

  const handleClearSource = (source: string) => {
    clearAlerts(source);
  };

  const handleClearAll = () => {
    clearAlerts();
  };

  const getMaxItems = () => {
    switch (size) {
      case 'small': return 3;
      case 'medium': return 5;
      case 'large': return 8;
      case 'full': return 15;
      default: return 5;
    }
  };

  const displayAlerts = filteredAlerts.slice(0, getMaxItems());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BellIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Alert Center</h3>
          {unreadAlertsCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {unreadAlertsCount} new
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {size !== 'small' && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Alerts</option>
              <option value="unread">Unread ({unreadAlertsCount})</option>
              <option value="orders">Orders</option>
              <option value="providers">Providers</option>
              <option value="system">System</option>
              <option value="printers">Printers</option>
              <option value="menu">Menu</option>
            </select>
          )}

          {filteredAlerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              title="Clear all alerts"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-gray-600">
              {filter === 'unread' ? 'No unread alerts' : 'No alerts to display'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your operations are running smoothly
            </p>
          </div>
        ) : (
          displayAlerts.map((alert) => {
            const colors = alertTypeColors[alert.type];
            const TypeIcon = alertTypeIcons[alert.type];
            const SourceIcon = alertIcons[alert.source];
            const isExpanded = expandedAlert === alert.id;

            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-3 transition-all duration-200 ${colors.bg} ${colors.border} ${
                  !alert.read ? 'ring-2 ring-blue-200' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Alert Type Icon */}
                  <div className="flex-shrink-0">
                    <TypeIcon className={`h-5 w-5 ${colors.icon}`} />
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`text-sm font-medium ${colors.text} truncate`}>
                          {alert.title}
                        </h4>
                        {!alert.read && (
                          <div className={`w-2 h-2 rounded-full ${colors.accent}`} />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <SourceIcon className="h-3 w-3" />
                          <span className="capitalize">{alert.source}</span>
                        </div>

                        {!alert.read && (
                          <button
                            onClick={() => handleMarkRead(alert.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            title="Mark as read"
                          >
                            <EyeIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className={`text-sm ${colors.text} ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatTimeAgo(alert.timestamp)}
                        </span>

                        {alert.branchId && (
                          <span className="flex items-center">
                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                            Branch
                          </span>
                        )}
                      </div>

                      {size !== 'small' && alert.message.length > 100 && (
                        <button
                          onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>

                    {/* Additional Info for expanded alerts */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Source:</span>
                            <span className="ml-1 capitalize">{alert.source}</span>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>
                            <span className="ml-1 capitalize">{alert.type}</span>
                          </div>
                          {alert.orderId && (
                            <div>
                              <span className="font-medium">Order ID:</span>
                              <span className="ml-1">{alert.orderId}</span>
                            </div>
                          )}
                          {alert.providerId && (
                            <div>
                              <span className="font-medium">Provider:</span>
                              <span className="ml-1">{alert.providerId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show More Button */}
      {filteredAlerts.length > getMaxItems() && (
        <div className="text-center pt-2 border-t border-gray-200">
          <button
            onClick={() => {
              // In a real implementation, this would navigate to a full alerts page
              console.log('Navigate to full alerts page');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View {filteredAlerts.length - getMaxItems()} more alerts
          </button>
        </div>
      )}

      {/* Quick Actions for Large Size */}
      {size === 'large' || size === 'full' ? (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Quick Actions</h4>
            <div className="flex items-center space-x-2">
              {['orders', 'providers', 'system'].map((source) => {
                const sourceAlerts = alerts.filter(a => a.source === source).length;
                return sourceAlerts > 0 ? (
                  <button
                    key={source}
                    onClick={() => handleClearSource(source)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 capitalize"
                  >
                    Clear {source} ({sourceAlerts})
                  </button>
                ) : null;
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Summary Stats for Full Size */}
      {size === 'full' && (
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {Object.entries(alertTypeColors).map(([type, colors]) => {
            const count = alerts.filter(a => a.type === type).length;
            const TypeIcon = alertTypeIcons[type as keyof typeof alertTypeIcons];

            return (
              <div key={type} className={`${colors.bg} rounded-lg p-3 border ${colors.border}`}>
                <div className="flex items-center space-x-2">
                  <TypeIcon className={`h-4 w-4 ${colors.icon}`} />
                  <div>
                    <p className={`text-lg font-bold ${colors.text}`}>{count}</p>
                    <p className={`text-xs ${colors.text} capitalize`}>{type}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}