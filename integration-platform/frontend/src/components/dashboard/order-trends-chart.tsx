'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { OrderTrend } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface OrderTrendsChartProps {
  data: OrderTrend[];
  loading: boolean;
}

export default function OrderTrendsChart({ data, loading }: OrderTrendsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Trends</CardTitle>
          <CardDescription>Daily orders and revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`Date: ${label}`}</p>
          <p className="text-blue-600">{`Orders: ${payload[0].value}`}</p>
          <p className="text-green-600">{`Revenue: ${formatCurrency(payload[1]?.value || 0)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Trends</CardTitle>
        <CardDescription>Daily orders and revenue over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Orders"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}