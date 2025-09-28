import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { BarChart3, Radar as RadarIcon, ScatterChart as ScatterIcon, Star, Clock, DollarSign, TrendingUp, Award } from 'lucide-react';
import { ProviderComparisonData } from '../../../services/analytics.service';

interface ProviderComparisonProps {
  data?: ProviderComparisonData[];
  isLoading?: boolean;
  height?: number;
}

const PROVIDER_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

const ProviderComparison: React.FC<ProviderComparisonProps> = ({
  data = [],
  isLoading = false,
  height = 400
}) => {
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'scatter'>('bar');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders' | 'efficiency'>('revenue');

  const processedData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
      displayName: item.provider.length > 10 ? `${item.provider.substring(0, 10)}...` : item.provider,
      efficiency: item.revenue / (item.averageDeliveryTime || 1), // Revenue per minute
      profitMargin: ((item.netRevenue / item.revenue) * 100) || 0
    }));
  }, [data]);

  const radarData = useMemo(() => {
    const maxValues = {
      revenue: Math.max(...data.map(p => p.revenue)),
      orders: Math.max(...data.map(p => p.orders)),
      rating: 5,
      speed: Math.max(...data.map(p => p.averageDeliveryTime)),
      netRevenue: Math.max(...data.map(p => p.netRevenue))
    };

    return processedData.map(provider => ({
      provider: provider.displayName,
      fullName: provider.provider,
      Revenue: (provider.revenue / maxValues.revenue) * 100,
      Orders: (provider.orders / maxValues.orders) * 100,
      Rating: (provider.customerRating / maxValues.rating) * 100,
      Speed: 100 - ((provider.averageDeliveryTime / maxValues.speed) * 100), // Inverted for better visualization
      'Net Revenue': (provider.netRevenue / maxValues.netRevenue) * 100
    }));
  }, [processedData, data]);

  const scatterData = useMemo(() => {
    return processedData.map(provider => ({
      x: provider.averageDeliveryTime,
      y: provider.customerRating,
      z: provider.revenue,
      name: provider.provider,
      color: provider.color
    }));
  }, [processedData]);

  const getTopPerformer = (metric: keyof ProviderComparisonData) => {
    if (data.length === 0) return null;

    return data.reduce((best, current) => {
      if (metric === 'averageDeliveryTime') {
        return current[metric] < best[metric] ? current : best;
      }
      return current[metric] > best[metric] ? current : best;
    });
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.provider}</p>
          <div className="space-y-1">
            <p className="text-blue-600">Revenue: ${data.revenue.toLocaleString()}</p>
            <p className="text-green-600">Orders: {data.orders.toLocaleString()}</p>
            <p className="text-purple-600">Net Revenue: ${data.netRevenue.toLocaleString()}</p>
            <p className="text-orange-600">Avg Delivery: {data.averageDeliveryTime} min</p>
            <p className="text-yellow-600">Rating: {data.customerRating.toFixed(1)} ⭐</p>
            <p className="text-gray-600">Commission: ${data.commission.toLocaleString()}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.dataKey}: {entry.value.toFixed(0)}%
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">Revenue: ${data.z.toLocaleString()}</p>
            <p className="text-orange-600">Delivery Time: {data.x} min</p>
            <p className="text-yellow-600">Rating: {data.y.toFixed(1)} ⭐</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-40"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
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
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No provider comparison data available</p>
          <p className="text-sm">Provider metrics will appear once orders are processed</p>
        </div>
      </div>
    );
  }

  const topPerformerRevenue = getTopPerformer('revenue');
  const topPerformerRating = getTopPerformer('customerRating');
  const fastestProvider = getTopPerformer('averageDeliveryTime');

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          {/* Top Performers */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-600">Top Revenue:</span>
              <span className="font-semibold text-gray-900">
                {topPerformerRevenue?.provider || 'N/A'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-600">Best Rated:</span>
              <span className="font-semibold text-gray-900">
                {topPerformerRating?.provider || 'N/A'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Fastest:</span>
              <span className="font-semibold text-gray-900">
                {fastestProvider?.provider || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('radar')}
              className={`p-2 rounded ${chartType === 'radar' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Radar Chart"
            >
              <RadarIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('scatter')}
              className={`p-2 rounded ${chartType === 'scatter' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Scatter Plot"
            >
              <ScatterIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Filter for Bar Chart */}
          {chartType === 'bar' && (
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="revenue">Revenue</option>
              <option value="orders">Orders</option>
              <option value="efficiency">Efficiency</option>
            </select>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'bar' ? (
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
              <Legend />
              <Bar
                dataKey={selectedMetric}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'radar' ? (
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis tick={{ fontSize: 10 }} />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickCount={6}
              />
              <Tooltip content={<CustomRadarTooltip />} />
              {processedData.map((provider, index) => (
                <Radar
                  key={provider.provider}
                  name={provider.displayName}
                  dataKey={radarData[index]?.provider}
                  stroke={provider.color}
                  fill={provider.color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend />
            </RadarChart>
          ) : (
            <ScatterChart
              data={scatterData}
              margin={{
                top: 20,
                right: 20,
                bottom: 60,
                left: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                dataKey="x"
                name="Delivery Time (min)"
                label={{ value: 'Average Delivery Time (minutes)', position: 'insideBottom', offset: -10 }}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Rating"
                domain={[0, 5]}
                label={{ value: 'Customer Rating', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter
                dataKey="z"
                fill="#3b82f6"
              >
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Performance Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit Margin
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedData
                .sort((a, b) => b.revenue - a.revenue)
                .map((provider, index) => (
                  <tr key={provider.provider} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: provider.color }}
                        ></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {provider.provider}
                          </div>
                          <div className="text-xs text-gray-500">
                            Rank #{index + 1}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${provider.revenue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {provider.orders.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {provider.averageDeliveryTime} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <div className="text-sm text-gray-900">
                          {provider.customerRating.toFixed(1)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${provider.commission.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${provider.netRevenue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        provider.profitMargin > 70 ? 'text-green-600' :
                        provider.profitMargin > 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {provider.profitMargin.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Revenue Leader</p>
              <p className="text-gray-600">
                {topPerformerRevenue?.provider} leads with ${topPerformerRevenue?.revenue.toLocaleString()} in revenue.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Fastest Delivery</p>
              <p className="text-gray-600">
                {fastestProvider?.provider} has the fastest average delivery time at {fastestProvider?.averageDeliveryTime} minutes.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Star className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Customer Satisfaction</p>
              <p className="text-gray-600">
                {topPerformerRating?.provider} has the highest customer rating at {topPerformerRating?.customerRating.toFixed(1)} stars.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderComparison;