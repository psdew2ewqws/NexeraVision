import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import websocketService, { SystemMetrics } from '@/services/websocket.service';

interface MetricsChartProps {
  type: 'line' | 'area' | 'bar' | 'pie';
  metric: 'responseTime' | 'successRate' | 'webhookCount' | 'status';
  title: string;
  height?: number;
  timeWindow?: number; // in minutes
  refreshInterval?: number; // in seconds
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  type,
  metric,
  title,
  height = 300,
  timeWindow = 30,
  refreshInterval = 5
}) => {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle system metrics updates
  const handleSystemMetrics = useCallback((metrics: SystemMetrics) => {
    setCurrentMetrics(metrics);
    setIsLoading(false);

    // Handle status metric separately for pie chart
    if (metric === 'status') {
      const successCount = Math.round(metrics.webhookCount * metrics.successRate / 100);
      const failureCount = metrics.webhookCount - successCount;

      setStatusData([
        { name: 'Success', value: successCount, color: '#10B981' },
        { name: 'Failure', value: failureCount, color: '#EF4444' }
      ]);
      return;
    }

    // Handle time-series metrics
    const timestamp = new Date().toISOString();
    const newDataPoint: TimeSeriesData = {
      timestamp: new Date().toLocaleTimeString(),
      value: 0,
      label: timestamp
    };

    switch (metric) {
      case 'responseTime':
        newDataPoint.value = metrics.avgResponseTime;
        break;
      case 'successRate':
        newDataPoint.value = metrics.successRate;
        break;
      case 'webhookCount':
        newDataPoint.value = metrics.webhookCount;
        break;
      default:
        return;
    }

    setData(prevData => {
      const newData = [...prevData, newDataPoint];
      // Keep only data within the time window
      const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
      return newData.filter(point => new Date(point.label!) > cutoffTime);
    });
  }, [metric, timeWindow]);

  // Setup WebSocket listeners and data fetching
  useEffect(() => {
    const unsubscribe = websocketService.on('system_metrics', handleSystemMetrics);

    // Request initial metrics
    websocketService.requestSystemMetrics();

    // Set up periodic refresh
    const interval = setInterval(() => {
      websocketService.requestSystemMetrics();
    }, refreshInterval * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [handleSystemMetrics, refreshInterval]);

  const formatValue = (value: number) => {
    switch (metric) {
      case 'responseTime':
        return `${value.toFixed(0)}ms`;
      case 'successRate':
        return `${value.toFixed(1)}%`;
      case 'webhookCount':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getColor = () => {
    switch (metric) {
      case 'responseTime':
        return '#8B5CF6';
      case 'successRate':
        return '#10B981';
      case 'webhookCount':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getIcon = () => {
    switch (metric) {
      case 'responseTime':
        return <ClockIcon className="h-5 w-5" />;
      case 'successRate':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'webhookCount':
        return <ChartBarIcon className="h-5 w-5" />;
      default:
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const getCurrentValue = () => {
    if (!currentMetrics) return 'Loading...';

    switch (metric) {
      case 'responseTime':
        return formatValue(currentMetrics.avgResponseTime);
      case 'successRate':
        return formatValue(currentMetrics.successRate);
      case 'webhookCount':
        return formatValue(currentMetrics.webhookCount);
      default:
        return 'N/A';
    }
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    const chartProps = {
      data: metric === 'status' ? statusData : data,
      width: '100%',
      height: '100%'
    };

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer {...chartProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="timestamp"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number) => [formatValue(value), metric]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={getColor()}
                strokeWidth={2}
                dot={{ fill: getColor(), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: getColor(), strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...chartProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="timestamp"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number) => [formatValue(value), metric]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={getColor()}
                fillOpacity={0.3}
                fill={getColor()}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...chartProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="timestamp"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number) => [formatValue(value), metric]}
              />
              <Bar dataKey="value" fill={getColor()} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...chartProps}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              Current: <span className="font-medium">{getCurrentValue()}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Last {timeWindow}m
          </span>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Live</span>
          </div>
        </div>
      </div>

      <div style={{ height: `${height}px` }}>
        {renderChart()}
      </div>

      {data.length > 0 && metric !== 'status' && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          {data.length} data points • Updates every {refreshInterval}s
        </div>
      )}
    </div>
  );
};

export default MetricsChart;