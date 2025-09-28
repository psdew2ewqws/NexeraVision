import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  SignalIcon,
  ServerIcon,
  CpuChipIcon,
  CloudIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import websocketService, { SystemMetrics } from '@/services/websocket.service';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTime: number;
  lastCheck: string;
  message?: string;
  details?: Record<string, any>;
}

interface HealthIndicatorProps {
  showDetails?: boolean;
  refreshInterval?: number;
  services?: string[];
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  showDetails = true,
  refreshInterval = 30,
  services = ['database', 'webhooks', 'integrations', 'notifications']
}) => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Handle health check updates
  const handleHealthCheck = useCallback((data: any) => {
    setIsLoading(false);
    setLastUpdate(new Date().toISOString());

    if (data.services) {
      setHealthChecks(data.services);

      // Calculate overall health
      const criticalCount = data.services.filter((s: HealthCheck) => s.status === 'critical').length;
      const warningCount = data.services.filter((s: HealthCheck) => s.status === 'warning').length;

      if (criticalCount > 0) {
        setOverallHealth('critical');
      } else if (warningCount > 0) {
        setOverallHealth('warning');
      } else {
        setOverallHealth('healthy');
      }
    }
  }, []);

  // Handle system metrics updates
  const handleSystemMetrics = useCallback((metrics: SystemMetrics) => {
    setSystemMetrics(metrics);
  }, []);

  // Setup WebSocket listeners and periodic health checks
  useEffect(() => {
    const unsubscribeHealthCheck = websocketService.on('health_check', handleHealthCheck);
    const unsubscribeMetrics = websocketService.on('system_metrics', handleSystemMetrics);

    // Request initial health check
    websocketService.requestHealthCheck();
    websocketService.requestSystemMetrics();

    // Set up periodic health checks
    const interval = setInterval(() => {
      websocketService.requestHealthCheck();
      websocketService.requestSystemMetrics();
    }, refreshInterval * 1000);

    return () => {
      unsubscribeHealthCheck();
      unsubscribeMetrics();
      clearInterval(interval);
    };
  }, [handleHealthCheck, handleSystemMetrics, refreshInterval]);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'healthy':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getOverallStatusClass = () => {
    switch (overallHealth) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getOverallStatusIcon = () => {
    switch (overallHealth) {
      case 'healthy':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
    }
  };

  const formatUptime = (uptime: string) => {
    return uptime || 'N/A';
  };

  const formatResponseTime = (responseTime: number) => {
    return `${responseTime.toFixed(0)}ms`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border-2 p-6 ${getOverallStatusClass()}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getOverallStatusIcon()}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                System Health: {overallHealth.charAt(0).toUpperCase() + overallHealth.slice(1)}
              </h2>
              <p className="text-sm text-gray-600">
                Last updated: {lastUpdate ? formatTimestamp(lastUpdate) : 'Never'}
              </p>
            </div>
          </div>

          {/* System Metrics Summary */}
          {systemMetrics && (
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <div className="text-sm text-gray-500">Uptime</div>
                <div className="font-medium">{formatUptime(systemMetrics.uptime)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Memory</div>
                <div className="font-medium">{systemMetrics.memoryUsage.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Individual Service Health */}
      {showDetails && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Service Status</h3>
            <p className="text-sm text-gray-500">Real-time health monitoring of all services</p>
          </div>

          <div className="divide-y divide-gray-100">
            {healthChecks.map((check, index) => (
              <motion.div
                key={check.service}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(check.status)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900 capitalize">
                          {check.service}
                        </h4>
                        <span className={getStatusBadge(check.status)}>
                          {check.status}
                        </span>
                      </div>
                      {check.message && (
                        <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <SignalIcon className="h-4 w-4" />
                      <span>{formatResponseTime(check.responseTime)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{formatTimestamp(check.lastCheck)}</span>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                {check.details && (
                  <div className="mt-4 pl-9">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(check.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="ml-2 font-medium text-gray-900">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {healthChecks.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <ServerIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No health check data available</p>
              <p className="text-sm mt-1">Waiting for system health information...</p>
            </div>
          )}
        </div>
      )}

      {/* System Resources */}
      {systemMetrics && showDetails && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Resources</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                <CloudIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {systemMetrics.activeConnections}
              </div>
              <div className="text-sm text-gray-500">Active Connections</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {systemMetrics.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {systemMetrics.avgResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-500">Avg Response</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-2">
                <CpuChipIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {systemMetrics.cpuUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">CPU Usage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthIndicator;