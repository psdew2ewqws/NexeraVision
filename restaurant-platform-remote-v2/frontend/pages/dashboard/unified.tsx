import { useState, useEffect, useMemo, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { useAuth } from '../../src/contexts/AuthContext'
import ProtectedRoute from '../../src/components/shared/ProtectedRoute'
import LicenseWarningHeader from '../../src/components/shared/LicenseWarningHeader'
import ErrorBoundary from '../../src/components/shared/ErrorBoundary'
import LoadingSpinner, { SkeletonCard } from '../../src/components/shared/LoadingSpinner'
import {
  ChartBarIcon,
  BellIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SignalIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

// Import dashboard components
import IntegrationStatus from '../../src/components/dashboard/IntegrationStatus'
import ProviderMetrics from '../../src/components/dashboard/ProviderMetrics'
import OrderStream from '../../src/components/dashboard/OrderStream'
import RevenueChart from '../../src/components/dashboard/RevenueChart'
import AlertsPanel from '../../src/components/dashboard/AlertsPanel'
import QuickActions from '../../src/components/dashboard/QuickActions'

// Import hooks
import { useDashboardMetrics } from '../../src/hooks/useDashboardMetrics'
import { useIntegrationData } from '../../src/hooks/useIntegrationData'

interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  avgOrderValue: number
  activeProviders: number
  integrationHealth: number
  pendingOrders: number
}

export default function UnifiedDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  // Custom hooks for data
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useDashboardMetrics()

  const {
    integrationStatus,
    providerStats,
    loading: integrationLoading,
    error: integrationError,
    refetch: refetchIntegration
  } = useIntegrationData()

  // Live time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMetrics()
      refetchIntegration()
    }, 30000)

    return () => clearInterval(interval)
  }, [refetchMetrics, refetchIntegration])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchMetrics(),
        refetchIntegration()
      ])
      toast.success('Dashboard refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }, [refetchMetrics, refetchIntegration])

  // Computed dashboard stats
  const dashboardStats: DashboardStats = useMemo(() => ({
    todayRevenue: metrics?.todayRevenue || 0,
    todayOrders: metrics?.todayOrders || 0,
    avgOrderValue: metrics?.avgOrderValue || 0,
    activeProviders: providerStats?.activeCount || 0,
    integrationHealth: integrationStatus?.healthScore || 0,
    pendingOrders: metrics?.pendingOrders || 0
  }), [metrics, providerStats, integrationStatus])

  // Check user permissions
  useEffect(() => {
    if (user) {
      const allowedRoles = ['super_admin', 'company_owner', 'branch_manager']
      if (!allowedRoles.includes(user.role)) {
        toast.error('Access denied. Unified dashboard is for management only.')
        router.push('/dashboard')
        return
      }
    }
  }, [user, router])

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2
    }).format(amount)
  }, [])

  const formatTime = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }, [])

  // Main stats cards data
  const statsCards = useMemo(() => [
    {
      title: 'Today\'s Revenue',
      value: formatCurrency(dashboardStats.todayRevenue),
      trend: metrics?.revenueTrend || '+0%',
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Orders Today',
      value: dashboardStats.todayOrders.toString(),
      subtitle: `${dashboardStats.pendingOrders} pending`,
      icon: ShoppingBagIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(dashboardStats.avgOrderValue),
      trend: metrics?.avgOrderTrend || '+0%',
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Active Providers',
      value: `${dashboardStats.activeProviders}/5`,
      subtitle: `${Math.round(dashboardStats.integrationHealth)}% health`,
      icon: TruckIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ], [dashboardStats, formatCurrency, metrics])

  if (metricsLoading && integrationLoading) {
    return (
      <ProtectedRoute>
        <ErrorBoundary level="page">
          <div className="min-h-screen bg-gray-50">
            <LicenseWarningHeader />
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
              <LoadingSpinner
                size="lg"
                text="Loading unified dashboard..."
                className="h-64"
              />

              {/* Loading Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SkeletonCard className="h-96" />
                </div>
                <div>
                  <SkeletonCard className="h-96" />
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <ErrorBoundary level="page">
        <Head>
          <title>Unified Operations Dashboard - Restaurant Platform</title>
          <meta name="description" content="Unified operations dashboard integrating Restaurant Platform with NEXARA" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <div className="min-h-screen bg-gray-50">
          <LicenseWarningHeader />

          {/* Header - Responsive */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="flex justify-between items-center h-16">
                {/* Title and Status - Responsive */}
                <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                      Unified Operations Dashboard
                    </h1>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs md:text-sm text-gray-600 truncate">
                        Last updated: {formatTime(currentTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls - Responsive */}
                <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
                  {/* View Mode Toggle - Hidden on mobile */}
                  <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('overview')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'overview'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setViewMode('detailed')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'detailed'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Detailed
                    </button>
                  </div>

                  {/* Mobile View Mode Select */}
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as 'overview' | 'detailed')}
                    className="md:hidden text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                  >
                    <option value="overview">Overview</option>
                    <option value="detailed">Detailed</option>
                  </select>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    title="Refresh dashboard"
                  >
                    <ArrowPathIcon className={`w-4 h-4 md:w-5 md:h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>

                  {/* Settings - Hidden on small screens */}
                  <button
                    onClick={() => router.push('/settings')}
                    className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Settings"
                  >
                    <Cog6ToothIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content - Responsive */}
          <main className="max-w-7xl mx-auto px-4 lg:px-6 py-4 md:py-6">
            {/* Error States */}
            {(metricsError || integrationError) && (
              <ErrorBoundary level="component">
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                    <p className="text-red-800 flex-1 min-w-0">
                      {metricsError || integrationError}
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="ml-auto text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </ErrorBoundary>
            )}

            {/* Stats Overview - Responsive Grid */}
            <section className="mb-6 md:mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statsCards.map((stat, index) => (
                  <ErrorBoundary key={index} level="component">
                    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                          <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
                        </div>
                        {stat.trend && (
                          <span className="text-xs md:text-sm font-medium text-green-600">
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1">
                        {stat.title}
                      </h3>
                      <p className="text-lg md:text-2xl font-bold text-gray-900 mb-1 truncate">
                        {stat.value}
                      </p>
                      {stat.subtitle && (
                        <p className="text-xs md:text-sm text-gray-600 truncate">
                          {stat.subtitle}
                        </p>
                      )}
                    </div>
                  </ErrorBoundary>
                ))}
              </div>
            </section>

            {/* Integration Status */}
            <section className="mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                Integration Health
              </h2>
              <ErrorBoundary level="component">
                <IntegrationStatus
                  status={integrationStatus}
                  loading={integrationLoading}
                  onRefresh={refetchIntegration}
                />
              </ErrorBoundary>
            </section>

            {/* Main Dashboard Grid - Responsive */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 md:mb-8">
              {/* Order Stream - Full width on mobile, 2/3 on desktop */}
              <div className="xl:col-span-2">
                <ErrorBoundary level="component">
                  <OrderStream
                    viewMode={viewMode}
                    onRefresh={refetchMetrics}
                  />
                </ErrorBoundary>
              </div>

              {/* Alerts Panel - Full width on mobile, 1/3 on desktop */}
              <div>
                <ErrorBoundary level="component">
                  <AlertsPanel
                    integrationStatus={integrationStatus}
                    metrics={metrics}
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Provider Metrics */}
            <section className="mb-6 md:mb-8">
              <ErrorBoundary level="component">
                <ProviderMetrics
                  providers={providerStats?.providers || []}
                  loading={integrationLoading}
                  viewMode={viewMode}
                />
              </ErrorBoundary>
            </section>

            {/* Revenue Chart */}
            <section className="mb-6 md:mb-8">
              <ErrorBoundary level="component">
                <RevenueChart
                  data={metrics?.revenueChart || []}
                  loading={metricsLoading}
                  viewMode={viewMode}
                />
              </ErrorBoundary>
            </section>

            {/* Quick Actions */}
            <section>
              <ErrorBoundary level="component">
                <QuickActions
                  user={user}
                  stats={dashboardStats}
                />
              </ErrorBoundary>
            </section>
          </main>
        </div>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}