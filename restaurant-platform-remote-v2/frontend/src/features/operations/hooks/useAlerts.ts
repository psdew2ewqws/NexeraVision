import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOperations, Alert } from '../contexts/OperationsContext';

interface AlertFilters {
  type?: Alert['type'];
  source?: Alert['source'];
  read?: boolean;
  branchId?: string;
  timeRange?: 'all' | 'today' | 'week' | 'month';
}

interface AlertGrouping {
  source: Alert['source'];
  count: number;
  unreadCount: number;
  latestAlert: Alert;
  severity: 'low' | 'medium' | 'high';
}

interface UseAlertsOptions {
  autoMarkReadDelay?: number;
  maxDisplayAlerts?: number;
  groupBySource?: boolean;
  enableNotifications?: boolean;
}

export function useAlerts(options: UseAlertsOptions = {}) {
  const {
    autoMarkReadDelay = 30000, // 30 seconds
    maxDisplayAlerts = 50,
    groupBySource = false,
    enableNotifications = true
  } = options;

  const {
    alerts,
    markAlertRead,
    clearAlerts,
    addAlert,
    unreadAlertsCount
  } = useOperations();

  const [filters, setFilters] = useState<AlertFilters>({});
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [expandedAlerts, setExpandedAlerts] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  useEffect(() => {
    if (enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, [enableNotifications]);

  // Show browser notifications for high-priority alerts
  useEffect(() => {
    if (
      enableNotifications &&
      notificationPermission === 'granted' &&
      alerts.length > 0
    ) {
      const latestAlert = alerts[0];

      // Only show notifications for new, unread, high-priority alerts
      if (
        !latestAlert.read &&
        (latestAlert.type === 'error' || latestAlert.type === 'warning') &&
        Date.now() - latestAlert.timestamp.getTime() < 5000 // Within last 5 seconds
      ) {
        const notification = new Notification(latestAlert.title, {
          body: latestAlert.message,
          icon: '/favicon.ico',
          tag: latestAlert.id,
          requireInteraction: latestAlert.type === 'error'
        });

        notification.onclick = () => {
          window.focus();
          markAlertRead(latestAlert.id);
          notification.close();
        };

        // Auto-close after 10 seconds for non-error alerts
        if (latestAlert.type !== 'error') {
          setTimeout(() => notification.close(), 10000);
        }
      }
    }
  }, [alerts, enableNotifications, notificationPermission, markAlertRead]);

  // Auto-mark alerts as read after delay
  useEffect(() => {
    if (autoMarkReadDelay > 0) {
      const unreadAlerts = alerts.filter(alert => !alert.read);

      unreadAlerts.forEach(alert => {
        const timeElapsed = Date.now() - alert.timestamp.getTime();

        if (timeElapsed >= autoMarkReadDelay) {
          markAlertRead(alert.id);
        } else {
          // Set timeout for remaining time
          const remainingTime = autoMarkReadDelay - timeElapsed;
          setTimeout(() => {
            markAlertRead(alert.id);
          }, remainingTime);
        }
      });
    }
  }, [alerts, autoMarkReadDelay, markAlertRead]);

  // Filter alerts based on current filters
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Type filter
      if (filters.type && alert.type !== filters.type) return false;

      // Source filter
      if (filters.source && alert.source !== filters.source) return false;

      // Read status filter
      if (filters.read !== undefined && alert.read !== filters.read) return false;

      // Branch filter
      if (filters.branchId && alert.branchId !== filters.branchId) return false;

      // Time range filter
      if (filters.timeRange) {
        const now = new Date();
        const alertTime = alert.timestamp;

        switch (filters.timeRange) {
          case 'today':
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (alertTime < today) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (alertTime < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (alertTime < monthAgo) return false;
            break;
        }
      }

      return true;
    }).slice(0, maxDisplayAlerts);
  }, [alerts, filters, maxDisplayAlerts]);

  // Group alerts by source
  const groupedAlerts = useMemo((): AlertGrouping[] => {
    if (!groupBySource) return [];

    const groups = new Map<Alert['source'], AlertGrouping>();

    filteredAlerts.forEach(alert => {
      if (!groups.has(alert.source)) {
        groups.set(alert.source, {
          source: alert.source,
          count: 0,
          unreadCount: 0,
          latestAlert: alert,
          severity: 'low'
        });
      }

      const group = groups.get(alert.source)!;
      group.count++;

      if (!alert.read) {
        group.unreadCount++;
      }

      // Update latest alert if this one is newer
      if (alert.timestamp > group.latestAlert.timestamp) {
        group.latestAlert = alert;
      }

      // Update severity based on alert types in group
      if (alert.type === 'error') {
        group.severity = 'high';
      } else if (alert.type === 'warning' && group.severity !== 'high') {
        group.severity = 'medium';
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Sort by severity first, then by latest alert time
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.latestAlert.timestamp.getTime() - a.latestAlert.timestamp.getTime();
    });
  }, [filteredAlerts, groupBySource]);

  // Alert statistics
  const alertStats = useMemo(() => {
    const stats = {
      total: alerts.length,
      unread: unreadAlertsCount,
      byType: {
        info: 0,
        warning: 0,
        error: 0,
        success: 0
      },
      bySource: {
        orders: 0,
        providers: 0,
        system: 0,
        printers: 0,
        menu: 0
      },
      last24Hours: 0,
      critical: 0
    };

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    alerts.forEach(alert => {
      stats.byType[alert.type]++;
      stats.bySource[alert.source]++;

      if (alert.timestamp >= oneDayAgo) {
        stats.last24Hours++;
      }

      if (alert.type === 'error') {
        stats.critical++;
      }
    });

    return stats;
  }, [alerts, unreadAlertsCount]);

  // Action handlers
  const updateFilters = useCallback((newFilters: Partial<AlertFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const markMultipleAsRead = useCallback((alertIds: string[]) => {
    alertIds.forEach(id => markAlertRead(id));
    setSelectedAlerts([]);
  }, [markAlertRead]);

  const markAllAsRead = useCallback(() => {
    filteredAlerts.filter(alert => !alert.read).forEach(alert => {
      markAlertRead(alert.id);
    });
  }, [filteredAlerts, markAlertRead]);

  const clearBySource = useCallback((source: Alert['source']) => {
    clearAlerts(source);
  }, [clearAlerts]);

  const clearSelected = useCallback(() => {
    // In a full implementation, this would delete specific alerts
    setSelectedAlerts([]);
  }, []);

  const toggleAlertSelection = useCallback((alertId: string) => {
    setSelectedAlerts(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  }, []);

  const toggleAlertExpanded = useCallback((alertId: string) => {
    setExpandedAlerts(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedAlerts(filteredAlerts.map(alert => alert.id));
  }, [filteredAlerts]);

  const clearAllSelected = useCallback(() => {
    setSelectedAlerts([]);
  }, []);

  // Create test alert (for development/testing)
  const createTestAlert = useCallback((type: Alert['type'], source: Alert['source']) => {
    const testMessages = {
      info: 'This is a test information alert',
      warning: 'This is a test warning alert',
      error: 'This is a test error alert',
      success: 'This is a test success alert'
    };

    addAlert({
      type,
      title: `Test ${type.charAt(0).toUpperCase() + type.slice(1)} Alert`,
      message: testMessages[type],
      read: false,
      source
    });
  }, [addAlert]);

  // Format time ago for display
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  return {
    // Data
    alerts: filteredAlerts,
    groupedAlerts,
    alertStats,
    unreadCount: unreadAlertsCount,

    // Filters
    filters,
    updateFilters,
    clearFilters,

    // Selection
    selectedAlerts,
    expandedAlerts,
    toggleAlertSelection,
    toggleAlertExpanded,
    selectAllVisible,
    clearAllSelected,

    // Actions
    markAsRead: markAlertRead,
    markMultipleAsRead,
    markAllAsRead,
    clearBySource,
    clearSelected,
    clearAll: () => clearAlerts(),

    // Utilities
    formatTimeAgo,
    createTestAlert,

    // Settings
    notificationPermission,
    enableNotifications
  };
}