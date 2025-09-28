import React, { useMemo } from 'react'
import {
  TruckIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'

interface DeliveryProvider {
  id: string
  name: string
  displayName: string
  status: 'active' | 'inactive' | 'maintenance' | 'error'
  todayOrders: number
  todayRevenue: number
  avgDeliveryTime: number // minutes
  successRate: number // percentage
  lastOrderTime: Date | null
  webhookStatus: 'healthy' | 'error' | 'disabled'
  errorCount: number
  responseTime: number // ms
  trend: {
    orders: 'up' | 'down' | 'stable'
    revenue: 'up' | 'down' | 'stable'
    deliveryTime: 'up' | 'down' | 'stable'
  }
}

interface ProviderMetricsProps {
  providers: DeliveryProvider[]
  loading: boolean
  viewMode: 'overview' | 'detailed'
}

const ProviderMetrics: React.FC<ProviderMetricsProps> = ({
  providers,
  loading,
  viewMode
}) => {
  // Provider status configurations
  const getProviderStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircleIcon,
          label: 'Active'
        }
      case 'maintenance':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: ExclamationTriangleIcon,
          label: 'Maintenance'
        }
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: XCircleIcon,
          label: 'Error'
        }
      case 'inactive':
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: MinusIcon,
          label: 'Inactive'
        }
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return ArrowUpIcon
      case 'down':
        return ArrowDownIcon
      default:
        return MinusIcon
    }
  }

  // Get trend color
  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGood: boolean) => {
    if (trend === 'stable') return 'text-gray-500'
    if (trend === 'up') return isGood ? 'text-green-600' : 'text-red-600'
    return isGood ? 'text-red-600' : 'text-green-600'
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  // Format last order time
  const formatLastOrder = (date: Date | null) => {
    if (!date) return 'No orders'
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

  // Calculate totals
  const totals = useMemo(() => {
    return providers.reduce(
      (acc, provider) => ({
        orders: acc.orders + provider.todayOrders,
        revenue: acc.revenue + provider.todayRevenue,
        avgDeliveryTime: acc.avgDeliveryTime + provider.avgDeliveryTime / providers.length,
        activeProviders: acc.activeProviders + (provider.status === 'active' ? 1 : 0)
      }),
      { orders: 0, revenue: 0, avgDeliveryTime: 0, activeProviders: 0 }
    )
  }, [providers])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Provider Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-100 rounded-lg"></div>
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
        <h3 className="text-lg font-semibold text-gray-900">Provider Performance</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>{totals.activeProviders}/{providers.length} Active</span>
          <span>|</span>
          <span>{totals.orders} Orders Today</span>
          <span>|</span>
          <span>{formatCurrency(totals.revenue)} Revenue</span>
        </div>
      </div>

      {/* Provider Cards */}
      <div className={`grid gap-4 ${
        viewMode === 'detailed'
          ? 'grid-cols-1'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {providers.map((provider) => {
          const statusConfig = getProviderStatusConfig(provider.status)

          return (
            <div
              key={provider.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${statusConfig.borderColor} ${statusConfig.bgColor}`}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${statusConfig.bgColor} rounded-lg flex items-center justify-center border ${statusConfig.borderColor}`}>
                    <TruckIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{provider.displayName}</h4>
                    <div className="flex items-center space-x-2">
                      <statusConfig.icon className={`w-3 h-3 ${statusConfig.color}`} />
                      <span className={`text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
                {provider.webhookStatus === 'error' && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" title="Webhook Error" />
                )}
              </div>

              {/* Metrics Grid */}
              <div className={`grid gap-3 ${
                viewMode === 'detailed' ? 'grid-cols-4' : 'grid-cols-2'
              }`}>
                {/* Orders */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-lg font-bold text-gray-900">
                      {provider.todayOrders}
                    </span>
                    {(() => {
                      const TrendIcon = getTrendIcon(provider.trend.orders)
                      return (
                        <TrendIcon className={`w-3 h-3 ${getTrendColor(provider.trend.orders, true)}`} />
                      )
                    })()}
                  </div>
                  <span className="text-xs text-gray-600">Orders</span>
                </div>

                {/* Revenue */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(provider.todayRevenue)}
                    </span>
                    {(() => {
                      const TrendIcon = getTrendIcon(provider.trend.revenue)
                      return (
                        <TrendIcon className={`w-3 h-3 ${getTrendColor(provider.trend.revenue, true)}`} />
                      )
                    })()}
                  </div>
                  <span className="text-xs text-gray-600">Revenue</span>
                </div>

                {/* Delivery Time */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-lg font-bold text-gray-900">
                      {formatTime(provider.avgDeliveryTime)}
                    </span>
                    {(() => {
                      const TrendIcon = getTrendIcon(provider.trend.deliveryTime)
                      return (
                        <TrendIcon className={`w-3 h-3 ${getTrendColor(provider.trend.deliveryTime, false)}`} />
                      )
                    })()}
                  </div>
                  <span className="text-xs text-gray-600">Avg Time</span>
                </div>

                {/* Success Rate */}
                <div className="text-center">
                  <span className="text-lg font-bold text-gray-900">
                    {provider.successRate.toFixed(1)}%
                  </span>
                  <div className="text-xs text-gray-600">Success</div>
                </div>
              </div>

              {/* Detailed View Additional Info */}
              {viewMode === 'detailed' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Last Order:</span>
                      <div className="font-medium">{formatLastOrder(provider.lastOrderTime)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Response Time:</span>
                      <div className="font-medium">{provider.responseTime}ms</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Webhook:</span>
                      <div className={`font-medium ${
                        provider.webhookStatus === 'healthy'
                          ? 'text-green-600'
                          : provider.webhookStatus === 'error'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        {provider.webhookStatus}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Errors:</span>
                      <div className={`font-medium ${
                        provider.errorCount > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {provider.errorCount}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* No providers state */}
      {providers.length === 0 && !loading && (
        <div className="text-center py-8">
          <TruckIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No delivery providers configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Configure delivery providers to see performance metrics
          </p>
        </div>
      )}
    </div>
  )
}

export default ProviderMetrics