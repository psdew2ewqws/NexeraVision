import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  BellAlertIcon,
  WifiIcon,
  HeartIcon,
  Cog6ToothIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Import monitoring components
import WebhookEventStream from '@/components/monitoring/WebhookEventStream';
import MetricsChart from '@/components/monitoring/MetricsChart';
import HealthIndicator from '@/components/monitoring/HealthIndicator';
import AlertsPanel from '@/components/monitoring/AlertsPanel';
import ProviderStatus from '@/components/monitoring/ProviderStatus';
import websocketService from '@/services/websocket.service';

interface DashboardFilters {
  provider?: string;
  status?: string;
  type?: string;
  timeRange?: string;
}

const MonitoringDashboard: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Handle WebSocket connection status
  useEffect(() => {
    const unsubscribe = websocketService.on('connection', (data: any) => {
      setConnectionStatus(data.status);
    });

    // Check initial connection status
    const status = websocketService.getConnectionStatus();
    setConnectionStatus(status.connected ? 'connected' : 'disconnected');

    return unsubscribe;
  }, []);

  // Auto-refresh handler
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      websocketService.requestSystemMetrics();
      websocketService.requestProviderStatus();
      websocketService.requestHealthCheck();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);

  const handleFilterChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const manualRefresh = () => {
    websocketService.requestSystemMetrics();
    websocketService.requestProviderStatus();
    websocketService.requestHealthCheck();
  };

  const reconnectWebSocket = () => {
    websocketService.reconnect();
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connected</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <div className="h-2 w-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">Disconnected</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-2 text-yellow-600">
            <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connecting...</span>
          </div>
        );
    }
  };

  return (
    <>
      <Head>
        <title>Monitoring Dashboard - NEXARA Integration Platform</title>
        <meta name="description" content="Real-time monitoring dashboard for NEXARA Integration Platform" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h1>
                    <p className="text-sm text-gray-500">Real-time system monitoring and analytics</p>
                  </div>
                </div>
                {getConnectionStatusBadge()}
              </div>

              <div className="flex items-center space-x-4">
                {/* Refresh Controls */}
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isAutoRefresh}
                      onChange={(e) => setIsAutoRefresh(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Auto-refresh</span>
                  </label>

                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    disabled={!isAutoRefresh}
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                  </select>
                </div>

                <button
                  onClick={manualRefresh}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Refresh
                </button>

                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={reconnectWebSocket}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Health Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <HealthIndicator
                showDetails={true}
                refreshInterval={refreshInterval}
              />
            </motion.div>

            {/* Metrics Charts Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              <MetricsChart
                type="line"
                metric="responseTime"
                title="Response Time"
                height={300}
                timeWindow={30}
                refreshInterval={refreshInterval}
              />
              <MetricsChart
                type="area"
                metric="successRate"
                title="Success Rate"
                height={300}
                timeWindow={30}
                refreshInterval={refreshInterval}
              />
              <MetricsChart
                type="bar"
                metric="webhookCount"
                title="Webhook Volume"
                height={300}
                timeWindow={30}
                refreshInterval={refreshInterval}
              />
            </motion.div>

            {/* Provider Status and Alerts Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-6"
            >
              <ProviderStatus
                providers={['careem', 'talabat', 'deliveroo', 'jahez', 'dhub']}
                refreshInterval={refreshInterval}
                showMetrics={true}
              />

              <AlertsPanel
                maxAlerts={50}
                autoResolve={true}
                showFilters={true}
                defaultFilters={filters}
              />
            </motion.div>

            {/* Event Stream */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <WebhookEventStream
                maxEvents={100}
                autoScroll={true}
                filters={filters}
              />
            </motion.div>

            {/* Filters Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Dashboard Filters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider
                  </label>
                  <select
                    value={filters.provider || ''}
                    onChange={(e) => handleFilterChange({ provider: e.target.value || undefined })}
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Providers</option>
                    <option value="careem">Careem</option>
                    <option value="talabat">Talabat</option>
                    <option value="deliveroo">Deliveroo</option>
                    <option value="jahez">Jahez</option>
                    <option value="dhub">DHub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={filters.type || ''}
                    onChange={(e) => handleFilterChange({ type: e.target.value || undefined })}
                    placeholder="Filter by event type..."
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Range
                  </label>
                  <select
                    value={filters.timeRange || ''}
                    onChange={(e) => handleFilterChange({ timeRange: e.target.value || undefined })}
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Time</option>
                    <option value="5m">Last 5 minutes</option>
                    <option value="15m">Last 15 minutes</option>
                    <option value="1h">Last hour</option>
                    <option value="24h">Last 24 hours</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setFilters({})}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all filters
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MonitoringDashboard;