import React, { useMemo } from 'react'
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  WifiIcon,
  TruckIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  BellIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Alert {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  category: 'system' | 'integration' | 'orders' | 'payments' | 'printers' | 'general'
  title: string
  message: string
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
  actions?: Array<{
    label: string
    action: () => void
    primary?: boolean
  }>
}

interface AlertsPanelProps {
  integrationStatus?: any
  metrics?: any
  onDismissAlert?: (alertId: string) => void
  onResolveAlert?: (alertId: string) => void
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  integrationStatus,
  metrics,
  onDismissAlert,
  onResolveAlert
}) => {
  // Generate alerts based on system status
  const systemAlerts = useMemo((): Alert[] => {
    const alerts: Alert[] = []

    // Integration health alerts
    if (integrationStatus) {
      if (integrationStatus.healthScore < 70) {
        alerts.push({
          id: 'integration-health-low',
          type: 'warning',
          category: 'integration',
          title: 'Integration Health Low',
          message: `System health is at ${Math.round(integrationStatus.healthScore)}%. Some services may be experiencing issues.`,
          timestamp: new Date(),
          priority: 'medium',
          resolved: false,
          actions: [
            {
              label: 'View Details',
              action: () => console.log('View integration details'),
              primary: true
            },
            {
              label: 'Refresh',
              action: () => console.log('Refresh integrations')
            }
          ]
        })
      }

      // NEXARA connection issues
      if (integrationStatus.nexaraConnection?.status === 'disconnected') {
        alerts.push({
          id: 'nexara-disconnected',
          type: 'error',
          category: 'integration',
          title: 'NEXARA Connection Lost',
          message: 'Connection to NEXARA platform has been lost. Webhook delivery may be affected.',
          timestamp: new Date(),
          priority: 'high',
          resolved: false,
          actions: [
            {
              label: 'Reconnect',
              action: () => console.log('Reconnect NEXARA'),
              primary: true
            },
            {
              label: 'Check Logs',
              action: () => console.log('Check connection logs')
            }
          ]
        })
      }

      // Webhook issues
      if (integrationStatus.nexaraConnection?.webhook_status === 'inactive') {
        alerts.push({
          id: 'webhooks-inactive',
          type: 'warning',
          category: 'integration',
          title: 'Webhooks Inactive',
          message: 'NEXARA webhooks are not active. Order synchronization may be delayed.',
          timestamp: new Date(),
          priority: 'medium',
          resolved: false,
          actions: [
            {
              label: 'Activate Webhooks',
              action: () => console.log('Activate webhooks'),
              primary: true
            }
          ]
        })
      }

      // Service errors
      if (integrationStatus.services) {
        integrationStatus.services.forEach((service: any) => {
          if (service.status === 'error') {
            alerts.push({
              id: `service-error-${service.id}`,
              type: 'error',
              category: 'system',
              title: `${service.name} Service Error`,
              message: service.errorMessage || `${service.name} is experiencing issues.`,
              timestamp: new Date(),
              priority: 'high',
              resolved: false,
              actions: [
                {
                  label: 'Restart Service',
                  action: () => console.log(`Restart ${service.name}`),
                  primary: true
                },
                {
                  label: 'View Logs',
                  action: () => console.log(`View logs for ${service.name}`)
                }
              ]
            })
          }
        })
      }
    }

    // Metrics-based alerts
    if (metrics) {
      // High pending orders
      if (metrics.pendingOrders > 10) {
        alerts.push({
          id: 'high-pending-orders',
          type: 'warning',
          category: 'orders',
          title: 'High Pending Orders',
          message: `${metrics.pendingOrders} orders are pending. Kitchen may need attention.`,
          timestamp: new Date(),
          priority: 'medium',
          resolved: false,
          actions: [
            {
              label: 'View Orders',
              action: () => console.log('View pending orders'),
              primary: true
            }
          ]
        })
      }

      // Low revenue alert (if it's a significant drop)
      if (metrics.revenueTrend && metrics.revenueTrend.includes('-')) {
        const trendValue = parseFloat(metrics.revenueTrend.replace(/[^\d.-]/g, ''))
        if (trendValue < -20) {
          alerts.push({
            id: 'revenue-drop',
            type: 'warning',
            category: 'general',
            title: 'Revenue Drop Detected',
            message: `Revenue is down ${Math.abs(trendValue)}% compared to previous period.`,
            timestamp: new Date(),
            priority: 'medium',
            resolved: false,
            actions: [
              {
                label: 'View Analytics',
                action: () => console.log('View revenue analytics'),
                primary: true
              }
            ]
          })
        }
      }
    }

    // Mock additional alerts for demonstration
    alerts.push(
      {
        id: 'printer-offline',
        type: 'error',
        category: 'printers',
        title: 'Thermal Printer Offline',
        message: 'POS-80C thermal printer in Kitchen A is not responding.',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        priority: 'high',
        resolved: false,
        actions: [
          {
            label: 'Check Printer',
            action: () => console.log('Check printer status'),
            primary: true
          },
          {
            label: 'Use Backup',
            action: () => console.log('Switch to backup printer')
          }
        ]
      },
      {
        id: 'payment-gateway-slow',
        type: 'warning',
        category: 'payments',
        title: 'Payment Gateway Slow',
        message: 'Payment processing is taking longer than usual (avg 8.5s).',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        priority: 'medium',
        resolved: false,
        actions: [
          {
            label: 'Check Status',
            action: () => console.log('Check payment gateway'),
            primary: true
          }
        ]
      },
      {
        id: 'backup-completed',
        type: 'success',
        category: 'system',
        title: 'Daily Backup Completed',
        message: 'Automated daily backup completed successfully at 2:00 AM.',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        priority: 'low',
        resolved: true
      }
    )

    return alerts.sort((a, b) => {
      // Sort by priority, then by timestamp
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
  }, [integrationStatus, metrics])

  // Get alert icon and styling
  const getAlertDisplay = (alert: Alert) => {
    const baseConfig = {
      error: {
        icon: XCircleIcon,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconBg: 'bg-red-100'
      },
      warning: {
        icon: ExclamationTriangleIcon,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconBg: 'bg-yellow-100'
      },
      info: {
        icon: InformationCircleIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconBg: 'bg-blue-100'
      },
      success: {
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-100'
      }
    }

    return baseConfig[alert.type]
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return ServerIcon
      case 'integration':
        return WifiIcon
      case 'orders':
        return ShoppingBagIcon
      case 'payments':
        return CurrencyDollarIcon
      case 'printers':
        return PrinterIcon
      default:
        return BellIcon
    }
  }

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Handle alert dismissal
  const handleDismiss = (alertId: string) => {
    if (onDismissAlert) {
      onDismissAlert(alertId)
    }
  }

  // Handle alert resolution
  const handleResolve = (alertId: string) => {
    if (onResolveAlert) {
      onResolveAlert(alertId)
    }
  }

  // Filter alerts
  const activeAlerts = systemAlerts.filter(alert => !alert.resolved)
  const resolvedAlerts = systemAlerts.filter(alert => alert.resolved)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
        <div className="flex items-center space-x-2">
          {activeAlerts.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              {activeAlerts.length} active
            </span>
          )}
          <BellIcon className="w-5 h-5 text-gray-500" />
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 ? (
        <div className="space-y-4 mb-6">
          {activeAlerts.map((alert) => {
            const display = getAlertDisplay(alert)
            const CategoryIcon = getCategoryIcon(alert.category)

            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${display.borderColor} ${display.bgColor}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Alert Icon */}
                  <div className={`w-8 h-8 ${display.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <display.icon className={`w-4 h-4 ${display.color}`} />
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <CategoryIcon className="w-4 h-4 text-gray-500" />
                        {alert.priority === 'critical' || alert.priority === 'high' ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            alert.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {alert.priority}
                          </span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{alert.message}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(alert.timestamp)}
                      </span>

                      {/* Actions */}
                      {alert.actions && alert.actions.length > 0 && (
                        <div className="flex items-center space-x-2">
                          {alert.actions.map((action, index) => (
                            <button
                              key={index}
                              onClick={action.action}
                              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                                action.primary
                                  ? `${display.color} ${display.bgColor} border ${display.borderColor} hover:opacity-80`
                                  : 'text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200'
                              }`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 mb-6">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">All systems running smoothly</p>
          <p className="text-sm text-gray-500 mt-1">No active alerts or issues detected</p>
        </div>
      )}

      {/* Recent Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recently Resolved</h4>
          <div className="space-y-2">
            {resolvedAlerts.slice(0, 3).map((alert) => {
              const display = getAlertDisplay(alert)
              const CategoryIcon = getCategoryIcon(alert.category)

              return (
                <div
                  key={alert.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50 opacity-75"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <display.icon className="w-3 h-3 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-gray-700">{alert.title}</h5>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No alerts state */}
      {systemAlerts.length === 0 && (
        <div className="text-center py-8">
          <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No alerts at this time</p>
          <p className="text-sm text-gray-400 mt-1">
            System monitoring is active
          </p>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel