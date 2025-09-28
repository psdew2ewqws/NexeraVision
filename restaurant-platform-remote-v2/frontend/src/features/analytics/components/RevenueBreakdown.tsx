import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { RevenueData } from '../../../services/analytics.service';

interface RevenueBreakdownProps {
  data?: RevenueData[];
  isLoading?: boolean;
  height?: number;
}

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
];

const RevenueBreakdown: React.FC<RevenueBreakdownProps> = ({
  data = [],
  isLoading = false,
  height = 400
}) => {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [showGrowth, setShowGrowth] = useState(true);

  const processedData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      displayName: item.provider.length > 12 ? `${item.provider.substring(0, 12)}...` : item.provider
    }));
  }, [data]);

  const totalRevenue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.revenue, 0);
  }, [data]);

  const totalOrders = useMemo(() => {
    return data.reduce((sum, item) => sum + item.orders, 0);
  }, [data]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.provider}</p>
          <p className="text-blue-600">Revenue: ${data.revenue.toLocaleString()}</p>
          <p className="text-green-600">Orders: {data.orders.toLocaleString()}</p>
          <p className="text-purple-600">Share: {data.percentage.toFixed(1)}%</p>
          {showGrowth && (
            <p className={`${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Growth: {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-blue-600">Revenue: ${data.revenue.toLocaleString()}</p>
          <p className="text-green-600">Orders: {data.orders.toLocaleString()}</p>
          <p className="text-purple-600">Avg Order: ${(data.revenue / data.orders).toFixed(2)}</p>
          {showGrowth && (
            <p className={`${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Growth: {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for slices less than 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <PieChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No revenue data available</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-gray-900">${totalRevenue.toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-600">
            Orders: <span className="font-bold text-gray-900">{totalOrders.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded ${chartType === 'pie' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Pie Chart"
            >
              <PieChartIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Growth Toggle */}
          <button
            onClick={() => setShowGrowth(!showGrowth)}
            className={`px-3 py-1 text-sm rounded ${
              showGrowth
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}
          >
            Growth
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="revenue"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>
                    {entry.payload.provider}
                  </span>
                )}
              />
            </PieChart>
          ) : (
            <BarChart
              data={processedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayName"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="revenue"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Provider Details Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">Provider Performance Details</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Share
                </th>
                {showGrowth && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedData
                .sort((a, b) => b.revenue - a.revenue)
                .map((provider, index) => (
                  <tr key={provider.provider} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: provider.color }}
                        ></div>
                        <div className="text-sm font-medium text-gray-900">
                          {provider.provider}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${provider.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {provider.orders.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(provider.revenue / provider.orders).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {provider.percentage.toFixed(1)}%
                    </td>
                    {showGrowth && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className={`flex items-center ${
                          provider.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {provider.growth >= 0 ? (
                            <TrendingUp className="w-4 h-4 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 mr-1" />
                          )}
                          {Math.abs(provider.growth).toFixed(1)}%
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueBreakdown;