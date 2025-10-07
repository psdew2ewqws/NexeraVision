import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Badge } from '@/components/integration/ui/Badge'
import Link from 'next/link'
import { format } from 'date-fns'

interface DashboardStats {
  apiCalls: {
    today: number
    yesterday: number
    thisWeek: number
    thisMonth: number
  }
  successRate: number
  avgResponseTime: number
  activeKeys: number
  activeWebhooks: number
}

interface RecentActivity {
  id: string
  type: 'api_call' | 'webhook' | 'error'
  endpoint: string
  status: number
  responseTime: number
  timestamp: string
}

export default function IntegrationDashboard() {
  // TODO: Replace with real API endpoint - currently uses mock data
  // Backend endpoint needed: GET /integration/stats
  // Should return: API call metrics, success rates, response times, active integrations

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['integration-stats'],
    queryFn: async () => {
      // MOCK DATA - Replace with real API call when backend endpoint is available
      return {
        apiCalls: {
          today: 1247,
          yesterday: 1108,
          thisWeek: 7823,
          thisMonth: 34521
        },
        successRate: 99.2,
        avgResponseTime: 45,
        activeKeys: 3,
        activeWebhooks: 2
      } as DashboardStats
    }
  })

  // TODO: Replace with real API endpoint - currently uses mock data
  // Backend endpoint needed: GET /integration/activity
  // Should return: Recent API calls, webhook deliveries, errors with timestamps

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      // MOCK DATA - Replace with real API call when backend endpoint is available
      return Array.from({ length: 10 }, (_, i) => ({
        id: `activity-${i}`,
        type: i % 7 === 0 ? 'error' : i % 3 === 0 ? 'webhook' : 'api_call',
        endpoint: i % 3 === 0 ? 'webhook: order.created' : `/api/v1/${['orders', 'products', 'customers'][i % 3]}`,
        status: i % 7 === 0 ? 500 : 200,
        responseTime: Math.floor(Math.random() * 150) + 30,
        timestamp: new Date(Date.now() - i * 300000).toISOString()
      })) as RecentActivity[]
    }
  })

  // Mock chart data
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    requests: Math.floor(Math.random() * 100) + 20
  }))

  const maxRequests = Math.max(...chartData.map(d => d.requests))

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Integration Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor your API usage and webhook deliveries
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">API Calls Today</p>
                  <p className="text-3xl font-bold text-gray-100 mt-1">
                    {stats?.apiCalls.today.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    +{Math.floor(((stats?.apiCalls.today || 0) - (stats?.apiCalls.yesterday || 1)) / (stats?.apiCalls.yesterday || 1) * 100)}% from yesterday
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-3xl font-bold text-gray-100 mt-1">
                    {stats?.successRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last 24 hours
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Response Time</p>
                  <p className="text-3xl font-bold text-gray-100 mt-1">
                    {stats?.avgResponseTime}ms
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    P95: 125ms
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Integrations</p>
                  <p className="text-3xl font-bold text-gray-100 mt-1">
                    {(stats?.activeKeys || 0) + (stats?.activeWebhooks || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.activeKeys} keys, {stats?.activeWebhooks} webhooks
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Chart */}
        <Card>
          <CardHeader>
            <CardTitle>API Requests (Last 24 Hours)</CardTitle>
            <CardDescription>Requests per hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-1">
              {chartData.map((data, i) => (
                <div
                  key={i}
                  className="flex-1 bg-indigo-600 rounded-t hover:bg-indigo-500 transition-colors relative group"
                  style={{ height: `${(data.requests / maxRequests) * 100}%` }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {data.hour}:00 - {data.requests} requests
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>24h ago</span>
              <span>Now</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link href="/integration/monitoring">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity?.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded hover:border-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {activity.type === 'webhook' && (
                          <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        <code className="text-sm text-gray-300 font-mono truncate">
                          {activity.endpoint}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(activity.timestamp), 'HH:mm:ss')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant={activity.status === 200 ? 'success' : 'error'} size="sm">
                        {activity.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {activity.responseTime}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common integration tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/integration/api-keys">
                  <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-200">Create API Key</h4>
                        <p className="text-xs text-gray-500">Generate a new API key</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <Link href="/integration/webhooks">
                  <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-200">Configure Webhook</h4>
                        <p className="text-xs text-gray-500">Set up event notifications</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <Link href="/integration/playground">
                  <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-200">Test API</h4>
                        <p className="text-xs text-gray-500">Interactive API playground</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <Link href="/integration/docs">
                  <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-200">View Documentation</h4>
                        <p className="text-xs text-gray-500">API reference and guides</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </IntegrationLayout>
  )
}
