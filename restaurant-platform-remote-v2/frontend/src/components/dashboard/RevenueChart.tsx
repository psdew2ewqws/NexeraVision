import React, { useMemo } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface RevenueDataPoint {
  time: string
  revenue: number
  orders: number
  hour?: number
  date?: string
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  loading: boolean
  viewMode: 'overview' | 'detailed'
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading, viewMode }) => {
  // Calculate chart dimensions and scaling
  const chartDimensions = useMemo(() => {
    if (!data || data.length === 0) return { maxRevenue: 0, maxOrders: 0, width: 0, height: 0 }

    const maxRevenue = Math.max(...data.map(d => d.revenue))
    const maxOrders = Math.max(...data.map(d => d.orders))
    const width = viewMode === 'detailed' ? 800 : 600
    const height = viewMode === 'detailed' ? 300 : 200

    return { maxRevenue, maxOrders, width, height }
  }, [data, viewMode])

  // Generate chart points for revenue line
  const revenuePoints = useMemo(() => {
    if (!data || data.length === 0) return ''

    const { maxRevenue, width, height } = chartDimensions
    const padding = 40
    const chartWidth = width - (padding * 2)
    const chartHeight = height - (padding * 2)

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth
      const y = padding + chartHeight - (point.revenue / maxRevenue) * chartHeight
      return `${x},${y}`
    }).join(' ')

    return points
  }, [data, chartDimensions])

  // Generate bars for orders
  const orderBars = useMemo(() => {
    if (!data || data.length === 0) return []

    const { maxOrders, width, height } = chartDimensions
    const padding = 40
    const chartWidth = width - (padding * 2)
    const chartHeight = height - (padding * 2)
    const barWidth = chartWidth / data.length * 0.6

    return data.map((point, index) => {
      const x = padding + (index / data.length) * chartWidth + chartWidth / data.length * 0.2
      const barHeight = (point.orders / maxOrders) * chartHeight
      const y = padding + chartHeight - barHeight

      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        value: point.orders,
        time: point.time
      }
    })
  }, [data, chartDimensions])

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        revenueChange: 0,
        ordersChange: 0
      }
    }

    const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0)
    const totalOrders = data.reduce((sum, point) => sum + point.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate percentage change (last point vs average of previous points)
    const lastPoint = data[data.length - 1]
    const previousPoints = data.slice(0, -1)

    let revenueChange = 0
    let ordersChange = 0

    if (previousPoints.length > 0) {
      const avgPreviousRevenue = previousPoints.reduce((sum, p) => sum + p.revenue, 0) / previousPoints.length
      const avgPreviousOrders = previousPoints.reduce((sum, p) => sum + p.orders, 0) / previousPoints.length

      if (avgPreviousRevenue > 0) {
        revenueChange = ((lastPoint.revenue - avgPreviousRevenue) / avgPreviousRevenue) * 100
      }
      if (avgPreviousOrders > 0) {
        ordersChange = ((lastPoint.orders - avgPreviousOrders) / avgPreviousOrders) * 100
      }
    }

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenueChange,
      ordersChange
    }
  }, [data])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Performance</h3>
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Performance</h3>
        <div className="flex items-center space-x-4">
          {/* Legend */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-blue-600 mr-1" />
            <span className="text-sm text-blue-600 font-medium">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className={`text-sm font-medium flex items-center justify-center mt-1 ${
            stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats.revenueChange >= 0 ? (
              <TrendingUpIcon className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDownIcon className="w-3 h-3 mr-1" />
            )}
            {formatPercentage(stats.revenueChange)}
          </div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <ChartBarIcon className="w-5 h-5 text-green-600 mr-1" />
            <span className="text-sm text-green-600 font-medium">Total Orders</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalOrders}
          </div>
          <div className={`text-sm font-medium flex items-center justify-center mt-1 ${
            stats.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats.ordersChange >= 0 ? (
              <TrendingUpIcon className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDownIcon className="w-3 h-3 mr-1" />
            )}
            {formatPercentage(stats.ordersChange)}
          </div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-purple-600 mr-1" />
            <span className="text-sm text-purple-600 font-medium">Avg Order Value</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.avgOrderValue)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Per order
          </div>
        </div>

        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <ChartBarIcon className="w-5 h-5 text-orange-600 mr-1" />
            <span className="text-sm text-orange-600 font-medium">Peak Hour</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data && data.length > 0
              ? data.reduce((max, point) => point.revenue > max.revenue ? point : max, data[0]).time
              : '--'
            }
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Highest revenue
          </div>
        </div>
      </div>

      {/* Chart */}
      {data && data.length > 0 ? (
        <div className="relative">
          <svg
            width={chartDimensions.width}
            height={chartDimensions.height}
            className="overflow-visible"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Order bars */}
            {orderBars.map((bar, index) => (
              <g key={index}>
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill="#10b981"
                  fillOpacity="0.6"
                  className="hover:fill-opacity-80 transition-all cursor-pointer"
                >
                  <title>{`${bar.time}: ${bar.value} orders`}</title>
                </rect>
              </g>
            ))}

            {/* Revenue line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={revenuePoints}
            />

            {/* Revenue points */}
            {data.map((point, index) => {
              const x = 40 + (index / (data.length - 1)) * (chartDimensions.width - 80)
              const y = 40 + (chartDimensions.height - 80) - (point.revenue / chartDimensions.maxRevenue) * (chartDimensions.height - 80)

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#3b82f6"
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>{`${point.time}: ${formatCurrency(point.revenue)}`}</title>
                </circle>
              )
            })}

            {/* X-axis labels */}
            {data.map((point, index) => {
              const x = 40 + (index / (data.length - 1)) * (chartDimensions.width - 80)
              const y = chartDimensions.height - 20

              return (
                <text
                  key={index}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {point.time}
                </text>
              )
            })}

            {/* Y-axis labels for revenue */}
            {[0, 0.25, 0.5, 0.75, 1].map((factor) => {
              const value = chartDimensions.maxRevenue * factor
              const y = 40 + (chartDimensions.height - 80) - factor * (chartDimensions.height - 80)

              return (
                <text
                  key={factor}
                  x="30"
                  y={y + 3}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {formatCurrency(value)}
                </text>
              )
            })}
          </svg>

          {/* Chart tooltip overlay for detailed view */}
          {viewMode === 'detailed' && (
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {/* Tooltips would be rendered here with mouse position tracking */}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No revenue data available</p>
          <p className="text-sm text-gray-400 mt-1">
            Revenue data will appear here once orders start coming in
          </p>
        </div>
      )}

      {/* Time period selector for detailed view */}
      {viewMode === 'detailed' && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <span className="text-sm text-gray-600">Time period:</span>
          <select className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      )}
    </div>
  )
}

export default RevenueChart