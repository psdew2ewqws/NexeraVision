import React, { useMemo } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  SignalIcon,
  WifiIcon,
  ServerIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid
} from '@heroicons/react/24/solid'

interface IntegrationService {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'error' | 'offline'
  uptime: number
  latency: number
  lastCheck: Date
  endpoint: string
  errorMessage?: string
  version?: string
}

interface IntegrationStatusData {
  healthScore: number
  services: IntegrationService[]
  nexaraConnection: {
    status: 'connected' | 'disconnected' | 'connecting'
    port: number
    lastSync: Date
    webhook_status: 'active' | 'inactive'
  }
  restaurantBackend: {
    status: 'connected' | 'disconnected' | 'connecting'
    port: number
    lastSync: Date
  }
}

interface IntegrationStatusProps {
  status?: IntegrationStatusData
  loading: boolean
  onRefresh: () => void
}

const IntegrationStatus: React.FC<IntegrationStatusProps> = ({
  status,
  loading,
  onRefresh
}) => {
  // Get status color and icon
  const getStatusDisplay = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'healthy':
      case 'connected':
      case 'active':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircleIconSolid,
          label: 'Healthy'
        }
      case 'warning':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: ExclamationTriangleIconSolid,
          label: 'Warning'
        }
      case 'error':
      case 'offline':
      case 'disconnected':
      case 'inactive':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: XCircleIconSolid,
          label: 'Error'
        }
      case 'connecting':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: ClockIcon,
          label: 'Connecting'
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: ClockIcon,
          label: 'Unknown'
        }
    }
  }

  // Calculate overall health score
  const healthScore = useMemo(() => {
    if (!status) return 0
    return Math.round(status.healthScore || 0)
  }, [status])

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatLatency = (latency: number) => {
    if (latency < 1000) return `${latency}ms`
    return `${(latency / 1000).toFixed(1)}s`
  }

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`
  }

  const formatLastCheck = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)

    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Integration Health</h3>
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Integration Health</h3>
          <div className="flex items-center space-x-2">
            <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
              {healthScore}%
            </div>
            <SignalIcon className={`w-5 h-5 ${getHealthScoreColor(healthScore)}`} />
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh integration status"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Platform Connections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* NEXARA Connection */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ServerIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">NEXARA Platform</span>
            </div>
            {status?.nexaraConnection && (
              <div className="flex items-center space-x-2">
                {(() => {
                  const display = getStatusDisplay(status.nexaraConnection.status)
                  return (
                    <>
                      <display.icon className={`w-4 h-4 ${display.color}`} />
                      <span className={`text-sm font-medium ${display.color}`}>
                        {display.label}
                      </span>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="font-mono">{status?.nexaraConnection?.port || 3002}</span>
            </div>
            <div className="flex justify-between">
              <span>Webhooks:</span>
              <span className={`font-medium ${
                status?.nexaraConnection?.webhook_status === 'active'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {status?.nexaraConnection?.webhook_status || 'inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span>
                {status?.nexaraConnection?.lastSync
                  ? formatLastCheck(new Date(status.nexaraConnection.lastSync))
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Restaurant Backend Connection */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <WifiIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Restaurant Backend</span>
            </div>
            {status?.restaurantBackend && (
              <div className="flex items-center space-x-2">
                {(() => {
                  const display = getStatusDisplay(status.restaurantBackend.status)
                  return (
                    <>
                      <display.icon className={`w-4 h-4 ${display.color}`} />
                      <span className={`text-sm font-medium ${display.color}`}>
                        {display.label}
                      </span>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="font-mono">{status?.restaurantBackend?.port || 3001}</span>
            </div>
            <div className="flex justify-between">
              <span>API Status:</span>
              <span className={`font-medium ${
                status?.restaurantBackend?.status === 'connected'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {status?.restaurantBackend?.status || 'disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span>
                {status?.restaurantBackend?.lastSync
                  ? formatLastCheck(new Date(status.restaurantBackend.lastSync))
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status List */}
      {status?.services && status.services.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">Service Status</h4>
          {status.services.map((service) => {
            const display = getStatusDisplay(service.status)
            return (
              <div
                key={service.id}
                className={`border rounded-lg p-4 ${display.borderColor} ${display.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <display.icon className={`w-5 h-5 ${display.color}`} />
                    <div>
                      <h5 className="font-medium text-gray-900">{service.name}</h5>
                      <p className="text-sm text-gray-600">{service.endpoint}</p>
                      {service.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">{service.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <div>
                        <span className="text-xs text-gray-500">Uptime:</span>
                        <div className="font-medium">{formatUptime(service.uptime)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Latency:</span>
                        <div className="font-medium">{formatLatency(service.latency)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Last Check:</span>
                        <div className="font-medium">{formatLastCheck(service.lastCheck)}</div>
                      </div>
                    </div>
                    {service.version && (
                      <div className="text-xs text-gray-500 mt-1">
                        v{service.version}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* No data state */}
      {(!status?.services || status.services.length === 0) && !loading && (
        <div className="text-center py-8">
          <ServerIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No integration services configured</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Refresh to check for services
          </button>
        </div>
      )}
    </div>
  )
}

export default IntegrationStatus