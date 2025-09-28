import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface MetricsChartProps {
  data: {
    hourly_orders?: { hour: number; orders: number; revenue: number }[];
    provider_performance?: { provider: string; orders: number; revenue: number; success_rate: number }[];
    revenue_trend?: { date: string; revenue: number; orders: number }[];
    status_distribution?: { status: string; count: number; color: string }[];
    response_times?: { provider: string; avg_time: number; p95_time: number }[];
  };
  title?: string;
  height?: number;
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff88',
  '#ff0080',
  '#8000ff',
  '#ff8000',
  '#0080ff',
];

const PROVIDER_COLORS = {
  careem: '#00C851',
  talabat: '#FF8800',
  deliveroo: '#00D4AA',
  uber_eats: '#000000',
  jahez: '#FF0000',
  hungerstation: '#FFD700',
  noon_food: '#0066CC',
  mrsool: '#8B00FF',
  zomato: '#CB202D',
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const formatTime = (value: number) => `${value}ms`;

export const MetricsChart: React.FC<MetricsChartProps> = ({
  data,
  title = 'Metrics Dashboard',
  height = 400,
}) => {
  const {
    hourly_orders = [],
    provider_performance = [],
    revenue_trend = [],
    status_distribution = [],
    response_times = []
  } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly_orders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(hour) => `Hour: ${hour}:00`}
                    formatter={(value, name) => [value, name === 'orders' ? 'Orders' : 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip
                    labelFormatter={(date) => `Date: ${date}`}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    strokeWidth={3}
                    dot={{ fill: '#82ca9d', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provider_performance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="provider"
                    width={100}
                    tickFormatter={(provider) => provider.replace('_', ' ').toUpperCase()}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name === 'orders' ? 'Orders' :
                      name === 'revenue' ? 'Revenue' :
                      name === 'success_rate' ? 'Success Rate' : name
                    ]}
                  />
                  <Bar
                    dataKey="orders"
                    fill="#8884d8"
                    name="orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Provider Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {provider_performance.slice(0, 3).map((provider, index) => (
                <div
                  key={provider.provider}
                  className="p-4 border rounded-lg"
                  style={{ borderColor: PROVIDER_COLORS[provider.provider as keyof typeof PROVIDER_COLORS] }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {provider.provider.replace('_', ' ').toUpperCase()}
                    </span>
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Orders: <strong>{provider.orders}</strong></div>
                    <div>Revenue: <strong>{formatCurrency(provider.revenue)}</strong></div>
                    <div>Success: <strong>{(provider.success_rate * 100).toFixed(1)}%</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={status_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-4 justify-center">
              {status_distribution.map((status, index) => (
                <div key={status.status} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color || COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">
                    {status.status.toUpperCase()}: {status.count}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={response_times}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="provider"
                    tickFormatter={(provider) => provider.replace('_', ' ').toUpperCase()}
                  />
                  <YAxis tickFormatter={formatTime} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatTime(value as number),
                      name === 'avg_time' ? 'Average' : 'P95'
                    ]}
                  />
                  <Bar dataKey="avg_time" fill="#8884d8" name="avg_time" />
                  <Bar dataKey="p95_time" fill="#82ca9d" name="p95_time" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Fastest Response</h4>
                {response_times.length > 0 && (
                  <div>
                    <span className="text-lg font-bold text-green-600">
                      {Math.min(...response_times.map(r => r.avg_time))}ms
                    </span>
                    <div className="text-sm text-muted-foreground">
                      {response_times.find(r => r.avg_time === Math.min(...response_times.map(rt => rt.avg_time)))?.provider.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Average Response</h4>
                {response_times.length > 0 && (
                  <div>
                    <span className="text-lg font-bold text-blue-600">
                      {Math.round(response_times.reduce((acc, r) => acc + r.avg_time, 0) / response_times.length)}ms
                    </span>
                    <div className="text-sm text-muted-foreground">
                      Across all providers
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};