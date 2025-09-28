import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  ServerIcon,
  GlobeAltIcon,
  PrinterIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'degraded' | 'checking';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
  uptime?: number;
}

interface PageHealth {
  path: string;
  name: string;
  status: 'accessible' | 'not_found' | 'auth_required' | 'error' | 'checking';
  statusCode?: number;
  responseTime?: number;
  lastChecked: Date;
  critical?: boolean;
}

interface HealthStats {
  totalPages: number;
  accessiblePages: number;
  totalServices: number;
  onlineServices: number;
  averageResponseTime: number;
  criticalIssues: number;
}

const HealthMonitoringDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Frontend',
      url: 'http://localhost:3000',
      status: 'checking',
      lastChecked: new Date(),
    },
    {
      name: 'Backend API',
      url: 'http://localhost:3001',
      status: 'checking',
      lastChecked: new Date(),
    },
    {
      name: 'PrinterMaster',
      url: 'http://localhost:8182',
      status: 'checking',
      lastChecked: new Date(),
    },
  ]);

  const [pages, setPages] = useState<PageHealth[]>([
    { path: '/', name: 'Home Page', status: 'checking', lastChecked: new Date() },
    { path: '/login', name: 'Login Page', status: 'checking', lastChecked: new Date() },
    { path: '/dashboard', name: 'Main Dashboard', status: 'checking', lastChecked: new Date() },
    { path: '/menu/products', name: 'Products Page', status: 'checking', lastChecked: new Date(), critical: true },
    { path: '/menu/availability', name: 'Menu Availability', status: 'checking', lastChecked: new Date() },
    { path: '/settings/printing', name: 'Printing Settings', status: 'checking', lastChecked: new Date() },
    { path: '/branches', name: 'Branches Management', status: 'checking', lastChecked: new Date() },
  ]);

  const [stats, setStats] = useState<HealthStats>({
    totalPages: 0,
    accessiblePages: 0,
    totalServices: 0,
    onlineServices: 0,
    averageResponseTime: 0,
    criticalIssues: 0,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Utility function to make HTTP requests
  const makeHealthCheck = async (url: string, timeout: number = 5000): Promise<{
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
  }> => {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        responseTime,
        statusCode: response.status,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error.name === 'AbortError' ? 'Timeout' : error.message,
      };
    }
  };

  // Check service health
  const checkServiceHealth = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const result = await makeHealthCheck(service.url);

    return {
      ...service,
      status: result.success ? 'online' : 'offline',
      responseTime: result.responseTime,
      lastChecked: new Date(),
      error: result.error,
    };
  };

  // Check page health
  const checkPageHealth = async (page: PageHealth): Promise<PageHealth> => {
    const fullUrl = `http://localhost:3000${page.path}`;
    const result = await makeHealthCheck(fullUrl);

    let status: PageHealth['status'] = 'error';

    if (result.success) {
      status = 'accessible';
    } else if (result.statusCode === 404) {
      status = 'not_found';
    } else if (result.statusCode === 401 || result.statusCode === 403) {
      status = 'auth_required';
    }

    return {
      ...page,
      status,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      lastChecked: new Date(),
    };
  };

  // Run comprehensive health check
  const runHealthCheck = useCallback(async () => {
    console.log('🏥 Running health check...');

    // Update services status to 'checking'
    setServices(prev => prev.map(service => ({ ...service, status: 'checking' as const })));
    setPages(prev => prev.map(page => ({ ...page, status: 'checking' as const })));

    try {
      // Check all services in parallel
      const servicePromises = services.map(checkServiceHealth);
      const updatedServices = await Promise.all(servicePromises);
      setServices(updatedServices);

      // Check all pages in parallel
      const pagePromises = pages.map(checkPageHealth);
      const updatedPages = await Promise.all(pagePromises);
      setPages(updatedPages);

      // Calculate stats
      const newStats: HealthStats = {
        totalPages: updatedPages.length,
        accessiblePages: updatedPages.filter(p => p.status === 'accessible' || p.status === 'auth_required').length,
        totalServices: updatedServices.length,
        onlineServices: updatedServices.filter(s => s.status === 'online').length,
        averageResponseTime: Math.round(
          [...updatedServices, ...updatedPages]
            .filter(item => item.responseTime)
            .reduce((acc, item) => acc + (item.responseTime || 0), 0) /
          [...updatedServices, ...updatedPages].filter(item => item.responseTime).length
        ),
        criticalIssues: updatedPages.filter(p => p.critical && p.status !== 'accessible' && p.status !== 'auth_required').length,
      };

      setStats(newStats);
      setLastUpdate(new Date());

      console.log('✅ Health check completed', newStats);
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }, [services, pages]);

  // Start/stop monitoring
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  // Auto-refresh monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      // Run initial check
      runHealthCheck();

      // Set up interval for continuous monitoring
      interval = setInterval(() => {
        runHealthCheck();
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, runHealthCheck]);

  // Status icon component
  const StatusIcon: React.FC<{ status: string; size?: string }> = ({ status, size = 'h-5 w-5' }) => {
    switch (status) {
      case 'online':
      case 'accessible':
        return <CheckCircleIcon className={`${size} text-green-500`} />;
      case 'offline':
      case 'not_found':
      case 'error':
        return <XCircleIcon className={`${size} text-red-500`} />;
      case 'degraded':
      case 'auth_required':
        return <ExclamationTriangleIcon className={`${size} text-yellow-500`} />;
      case 'checking':
        return <ArrowPathIcon className={`${size} text-blue-500 animate-spin`} />;
      default:
        return <ClockIcon className={`${size} text-gray-400`} />;
    }
  };

  // Status color for cards
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'accessible':
        return 'border-green-200 bg-green-50';
      case 'offline':
      case 'not_found':
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'degraded':
      case 'auth_required':
        return 'border-yellow-200 bg-yellow-50';
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health Monitor</h1>
          <p className="text-sm text-gray-600">
            Real-time monitoring of all platform services and pages
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <button
            onClick={toggleMonitoring}
            className={`px-4 py-2 rounded-lg font-medium ${
              isMonitoring
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={runHealthCheck}
            disabled={isMonitoring}
            className="px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-2" />
            Check Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Pages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPages}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Accessible</p>
              <p className="text-2xl font-bold text-gray-900">{stats.accessiblePages}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ServerIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Services Online</p>
              <p className="text-2xl font-bold text-gray-900">{stats.onlineServices}/{stats.totalServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-indigo-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageResponseTime || 0}ms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Critical Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.criticalIssues}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ServerIcon className="h-5 w-5 mr-2" />
            Services Status
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.map((service) => (
              <div
                key={service.name}
                className={`rounded-lg border-2 p-4 ${getStatusColor(service.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StatusIcon status={service.status} />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-600">{service.url}</p>
                    </div>
                  </div>
                  {service.responseTime && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{service.responseTime}ms</p>
                      <p className="text-xs text-gray-500">response</p>
                    </div>
                  )}
                </div>
                {service.error && (
                  <div className="mt-2 text-xs text-red-600 bg-red-100 rounded px-2 py-1">
                    {service.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pages Status */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <GlobeAltIcon className="h-5 w-5 mr-2" />
            Pages Status
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pages.map((page) => (
              <div
                key={page.path}
                className={`rounded-lg border-2 p-4 ${getStatusColor(page.status)} ${
                  page.critical ? 'ring-2 ring-red-400' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StatusIcon status={page.status} />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 flex items-center">
                        {page.name}
                        {page.critical && (
                          <span className="ml-2 px-2 py-1 text-xs font-bold text-red-800 bg-red-200 rounded">
                            CRITICAL
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{page.path}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {page.statusCode && (
                      <p className="text-sm font-medium text-gray-900">{page.statusCode}</p>
                    )}
                    {page.responseTime && (
                      <p className="text-xs text-gray-500">{page.responseTime}ms</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time updates indicator */}
      {isMonitoring && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 rounded-lg px-4 py-2 shadow-lg">
          <div className="flex items-center text-green-800">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm font-medium">Live monitoring active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthMonitoringDashboard;