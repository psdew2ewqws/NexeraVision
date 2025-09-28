import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface DeliveryNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  autoHide?: boolean;
  hideAfter?: number;
  timestamp: Date;
}

interface DeliveryNotificationSystemProps {
  notifications: DeliveryNotification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const iconsByType = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon
};

const colorsByType = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    message: 'text-green-700'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    message: 'text-yellow-700'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    message: 'text-red-700'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700'
  }
};

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4'
};

export default function DeliveryNotificationSystem({
  notifications,
  onDismiss,
  maxVisible = 5,
  position = 'top-right'
}: DeliveryNotificationSystemProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<DeliveryNotification[]>([]);

  useEffect(() => {
    // Show only the most recent notifications
    const recent = notifications.slice(-maxVisible);
    setVisibleNotifications(recent);

    // Set up auto-hide timers
    recent.forEach(notification => {
      if (notification.autoHide !== false) {
        const hideAfter = notification.hideAfter || 5000;
        setTimeout(() => {
          onDismiss(notification.id);
        }, hideAfter);
      }
    });
  }, [notifications, maxVisible, onDismiss]);

  if (visibleNotifications.length === 0) return null;

  return (
    <div className={`fixed z-50 flex flex-col space-y-2 max-w-md ${positionClasses[position]}`}>
      {visibleNotifications.map((notification) => {
        const Icon = iconsByType[notification.type];
        const colors = colorsByType[notification.type];

        return (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${colors.title}`}>
                  {notification.title}
                </h3>
                
                <div className={`mt-1 text-sm ${colors.message}`}>
                  {notification.message}
                </div>

                {notification.details && (
                  <div className={`mt-2 text-xs ${colors.message} opacity-75`}>
                    {notification.details}
                  </div>
                )}

                {notification.action && (
                  <div className="mt-3">
                    <button
                      onClick={notification.action.onClick}
                      className={`text-xs font-medium underline ${colors.title} hover:opacity-75`}
                    >
                      {notification.action.label}
                    </button>
                  </div>
                )}

                <div className={`mt-2 text-xs ${colors.message} opacity-50`}>
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {notification.dismissible !== false && (
                <div className="ml-3 flex-shrink-0">
                  <button
                    onClick={() => onDismiss(notification.id)}
                    className={`inline-flex rounded-md ${colors.bg} p-1.5 ${colors.icon} hover:${colors.bg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${colors.bg} focus:ring-${colors.icon}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hook for managing delivery notifications
export function useDeliveryNotifications() {
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);

  const addNotification = (notification: Omit<DeliveryNotification, 'id' | 'timestamp'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: DeliveryNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      dismissible: notification.dismissible ?? true,
      autoHide: notification.autoHide ?? true
    };

    setNotifications(prev => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Convenience methods for different notification types
  const success = (title: string, message: string, options?: Partial<DeliveryNotification>) => {
    addNotification({ type: 'success', title, message, ...options });
  };

  const warning = (title: string, message: string, options?: Partial<DeliveryNotification>) => {
    addNotification({ type: 'warning', title, message, ...options });
  };

  const error = (title: string, message: string, options?: Partial<DeliveryNotification>) => {
    addNotification({ type: 'error', title, message, autoHide: false, ...options });
  };

  const info = (title: string, message: string, options?: Partial<DeliveryNotification>) => {
    addNotification({ type: 'info', title, message, ...options });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    warning,
    error,
    info
  };
}