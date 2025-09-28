import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PerformanceChartProps {
  data: {
    timestamp: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  }[];
  title: string;
  metric: 'successRate' | 'responseTime' | 'volume';
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  metric
}) => {
  const getMetricValue = (item: any) => {
    switch (metric) {
      case 'successRate':
        return item.totalRequests > 0 ? (item.successfulRequests / item.totalRequests) * 100 : 0;
      case 'responseTime':
        return item.averageResponseTime;
      case 'volume':
        return item.totalRequests;
      default:
        return 0;
    }
  };

  const formatValue = (value: number) => {
    switch (metric) {
      case 'successRate':
        return `${value.toFixed(1)}%`;
      case 'responseTime':
        return `${value.toFixed(0)}ms`;
      case 'volume':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const maxValue = Math.max(...data.map(getMetricValue));
  const minValue = Math.min(...data.map(getMetricValue));
  const currentValue = data.length > 0 ? getMetricValue(data[data.length - 1]) : 0;
  const previousValue = data.length > 1 ? getMetricValue(data[data.length - 2]) : currentValue;

  const change = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  const getTrendIcon = () => {
    if (change > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (change > 5) return 'text-green-600';
    if (change < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xl font-medium text-gray-900">
          {formatValue(currentValue)}
        </div>
        <div className="text-xs text-gray-500">
          {metric === 'successRate' ? 'Success rate' : metric === 'responseTime' ? 'Avg response' : 'Request volume'}
        </div>
      </div>

      {/* Simple line chart */}
      <div className="relative h-20">
        <svg className="w-full h-full" viewBox="0 0 400 80">
          {/* Data line */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data.map((item, index) => {
                const x = (index / (data.length - 1)) * 380 + 10;
                const value = getMetricValue(item);
                const y = 70 - ((value - minValue) / (maxValue - minValue)) * 60;
                return `${x},${y}`;
              }).join(' ')}
            />
          )}

          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 380 + 10;
            const value = getMetricValue(item);
            const y = 70 - ((value - minValue) / (maxValue - minValue)) * 60;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#6b7280"
                className="hover:r-3 transition-all"
              >
                <title>{`${new Date(item.timestamp).toLocaleTimeString()}: ${formatValue(value)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {data.length > 0 && (
          <>
            <span>{new Date(data[0].timestamp).toLocaleTimeString()}</span>
            <span>{new Date(data[data.length - 1].timestamp).toLocaleTimeString()}</span>
          </>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-200">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {formatValue(maxValue)}
          </div>
          <div className="text-xs text-gray-500">Peak</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {formatValue(data.reduce((sum, item) => sum + getMetricValue(item), 0) / data.length)}
          </div>
          <div className="text-xs text-gray-500">Avg</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {formatValue(minValue)}
          </div>
          <div className="text-xs text-gray-500">Low</div>
        </div>
      </div>
    </div>
  );
};