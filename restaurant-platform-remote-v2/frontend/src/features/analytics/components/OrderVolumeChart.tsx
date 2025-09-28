import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { OrderVolumeData } from '../../../services/analytics.service';

interface OrderVolumeChartProps {
  data?: OrderVolumeData[];
  isLoading?: boolean;
  height?: number;
}

const OrderVolumeChart: React.FC<OrderVolumeChartProps> = ({
  data = [],
  isLoading = false,
  height = 400
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [showRevenue, setShowRevenue] = useState(true);
  const [showOrders, setShowOrders] = useState(true);

  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedDate: format(parseISO(item.date), 'MMM dd'),
      fullDate: format(parseISO(item.date), 'MMMM dd, yyyy')
    }));
  }, [data]);

  const trends = useMemo(() => {
    if (data.length < 2) return { orderTrend: 0, revenueTrend: 0 };

    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);

    const firstHalfOrders = firstHalf.reduce((sum, item) => sum + item.orders, 0) / firstHalf.length;
    const secondHalfOrders = secondHalf.reduce((sum, item) => sum + item.orders, 0) / secondHalf.length;

    const firstHalfRevenue = firstHalf.reduce((sum, item) => sum + item.revenue, 0) / firstHalf.length;
    const secondHalfRevenue = secondHalf.reduce((sum, item) => sum + item.revenue, 0) / secondHalf.length;

    const orderTrend = ((secondHalfOrders - firstHalfOrders) / firstHalfOrders) * 100;
    const revenueTrend = ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;

    return {
      orderTrend: Math.round(orderTrend * 100) / 100,
      revenueTrend: Math.round(revenueTrend * 100) / 100
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.fullDate}</p>
          {showOrders && (
            <p className="text-blue-600">
              <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
              Orders: {data.orders}
            </p>
          )}
          {showRevenue && (
            <p className="text-green-600">
              <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2"></span>
              Revenue: ${data.revenue.toFixed(2)}
            </p>
          )}
          <p className="text-gray-600">
            Average Order Value: ${data.averageOrderValue.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
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
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No order volume data available</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(item => item.revenue));
  const maxOrders = Math.max(...data.map(item => item.orders));

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Trend Indicators */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Orders:</span>
            <div className={`flex items-center gap-1 ${trends.orderTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trends.orderTrend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">{Math.abs(trends.orderTrend)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Revenue:</span>
            <div className={`flex items-center gap-1 ${trends.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trends.revenueTrend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">{Math.abs(trends.revenueTrend)}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${chartType === 'line' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Line Chart"
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Data Series Toggles */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowOrders(!showOrders)}
              className={`px-3 py-1 text-sm rounded ${
                showOrders
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-500 border border-gray-300'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setShowRevenue(!showRevenue)}
              className={`px-3 py-1 text-sm rounded ${
                showRevenue
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-500 border border-gray-300'
              }`}
            >
              Revenue
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={processedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              yAxisId="orders"
              orientation="left"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              hide={!showOrders}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              hide={!showRevenue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Reference lines for averages */}
            {showOrders && (
              <ReferenceLine
                yAxisId="orders"
                y={data.reduce((sum, item) => sum + item.orders, 0) / data.length}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            )}

            {showRevenue && (
              <ReferenceLine
                yAxisId="revenue"
                y={data.reduce((sum, item) => sum + item.revenue, 0) / data.length}
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            )}

            {/* Order line */}
            {showOrders && (
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                name="Orders"
              />
            )}

            {/* Revenue line */}
            {showRevenue && (
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name="Revenue ($)"
              />
            )}

            {/* Brush for zooming */}
            <Brush
              dataKey="formattedDate"
              height={30}
              stroke="#8884d8"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-blue-600 font-medium">Total Orders</div>
          <div className="text-2xl font-bold text-blue-900">
            {data.reduce((sum, item) => sum + item.orders, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-green-600 font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-green-900">
            ${data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-purple-600 font-medium">Avg Order Value</div>
          <div className="text-2xl font-bold text-purple-900">
            ${(data.reduce((sum, item) => sum + item.averageOrderValue, 0) / data.length).toFixed(2)}
          </div>
        </div>

        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-orange-600 font-medium">Peak Day</div>
          <div className="text-lg font-bold text-orange-900">
            {data.reduce((max, item) => item.orders > max.orders ? item : max, data[0])?.formattedDate || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderVolumeChart;