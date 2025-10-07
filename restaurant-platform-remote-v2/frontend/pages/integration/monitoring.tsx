import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Badge } from '@/components/integration/ui/Badge'
import { Input, Select } from '@/components/integration/ui/Input'
import { CodeBlock } from '@/components/integration/ui/CodeBlock'
import { Modal } from '@/components/integration/ui/Modal'
import { format } from 'date-fns'

interface LogEntry {
  id: string
  timestamp: string
  method: string
  endpoint: string
  statusCode: number
  responseTime: number
  apiKey: string
  ip: string
  userAgent: string
  requestBody?: any
  responseBody?: any
  error?: string
}

interface PerformanceMetric {
  endpoint: string
  avgResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestCount: number
  errorRate: number
}

export default function MonitoringPage() {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    search: ''
  })
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch logs with auto-refresh
  const { data: logs, refetch } = useQuery({
    queryKey: ['api-logs', filters],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - i * 30000).toISOString(),
        method: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
        endpoint: `/api/v1/${['orders', 'products', 'customers'][i % 3]}`,
        statusCode: i % 10 === 0 ? 500 : i % 8 === 0 ? 404 : 200,
        responseTime: Math.floor(Math.random() * 200) + 20,
        apiKey: `pk_live_${Math.random().toString(36).substr(2, 8)}`,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'RestaurantApp/1.0',
        requestBody: i % 3 === 0 ? { name: 'Test Item', price: 9.99 } : undefined,
        responseBody: i % 10 === 0 ? undefined : { id: i, success: true },
        error: i % 10 === 0 ? 'Internal Server Error' : undefined
      })) as LogEntry[]
    },
    refetchInterval: autoRefresh ? 5000 : false
  })

  // Fetch performance metrics
  const { data: metrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      return [
        {
          endpoint: '/api/v1/orders',
          avgResponseTime: 45,
          p95ResponseTime: 120,
          p99ResponseTime: 180,
          requestCount: 12847,
          errorRate: 0.8
        },
        {
          endpoint: '/api/v1/products',
          avgResponseTime: 32,
          p95ResponseTime: 85,
          p99ResponseTime: 140,
          requestCount: 8234,
          errorRate: 0.3
        },
        {
          endpoint: '/api/v1/customers',
          avgResponseTime: 38,
          p95ResponseTime: 95,
          p99ResponseTime: 155,
          requestCount: 5621,
          errorRate: 0.5
        }
      ] as PerformanceMetric[]
    }
  })

  const filteredLogs = logs?.filter(log => {
    if (filters.status !== 'all') {
      if (filters.status === 'success' && log.statusCode >= 400) return false
      if (filters.status === 'error' && log.statusCode < 400) return false
    }
    if (filters.method !== 'all' && log.method !== filters.method) return false
    if (filters.search && !log.endpoint.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Monitoring</h1>
            <p className="text-sm text-gray-400 mt-1">
              Real-time API request logs and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-700 rounded bg-gray-900"
              />
              Auto-refresh
            </label>
            <Button onClick={() => refetch()}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Endpoint</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Requests</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Avg</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">P95</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">P99</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Error Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {metrics?.map((metric) => (
                    <tr key={metric.endpoint}>
                      <td className="py-3 px-4">
                        <code className="text-indigo-400 font-mono text-xs">{metric.endpoint}</code>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300">
                        {metric.requestCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300">
                        {metric.avgResponseTime}ms
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300">
                        {metric.p95ResponseTime}ms
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300">
                        {metric.p99ResponseTime}ms
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={metric.errorRate > 1 ? 'error' : 'success'} size="sm">
                          {metric.errorRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search endpoint..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'success', label: 'Success Only' },
                  { value: 'error', label: 'Errors Only' }
                ]}
              />
              <Select
                value={filters.method}
                onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                options={[
                  { value: 'all', label: 'All Methods' },
                  { value: 'GET', label: 'GET' },
                  { value: 'POST', label: 'POST' },
                  { value: 'PUT', label: 'PUT' },
                  { value: 'DELETE', label: 'DELETE' }
                ]}
              />
              <Button
                variant="secondary"
                onClick={() => setFilters({ status: 'all', method: 'all', search: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Request Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Request Logs</CardTitle>
              <span className="text-xs text-gray-500">
                {filteredLogs?.length} of {logs?.length} requests
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLogs?.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={
                            log.method === 'GET' ? 'info' :
                            log.method === 'POST' ? 'success' :
                            log.method === 'DELETE' ? 'error' : 'warning'
                          }
                          size="sm"
                        >
                          {log.method}
                        </Badge>
                        <code className="text-sm text-gray-300 font-mono truncate">
                          {log.endpoint}
                        </code>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{format(new Date(log.timestamp), 'HH:mm:ss.SSS')}</span>
                        <span>IP: {log.ip}</span>
                        <span>Key: {log.apiKey.slice(0, 12)}...</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      <Badge
                        variant={log.statusCode >= 500 ? 'error' : log.statusCode >= 400 ? 'warning' : 'success'}
                        size="sm"
                      >
                        {log.statusCode}
                      </Badge>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {log.responseTime}ms
                      </span>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {log.error && (
                    <div className="mt-2 text-xs text-red-400">
                      Error: {log.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Log Detail Modal */}
        {selectedLog && (
          <Modal
            isOpen={!!selectedLog}
            onClose={() => setSelectedLog(null)}
            title="Request Details"
            size="xl"
          >
            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Method</label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        selectedLog.method === 'GET' ? 'info' :
                        selectedLog.method === 'POST' ? 'success' :
                        selectedLog.method === 'DELETE' ? 'error' : 'warning'
                      }
                    >
                      {selectedLog.method}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedLog.statusCode >= 500 ? 'error' : selectedLog.statusCode >= 400 ? 'warning' : 'success'}
                    >
                      {selectedLog.statusCode}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Response Time</label>
                  <p className="text-sm text-gray-300 mt-1">{selectedLog.responseTime}ms</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</label>
                  <p className="text-sm text-gray-300 mt-1">
                    {format(new Date(selectedLog.timestamp), 'PPpp')}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">IP Address</label>
                  <p className="text-sm text-gray-300 mt-1">{selectedLog.ip}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">API Key</label>
                  <p className="text-sm text-gray-300 mt-1 font-mono">{selectedLog.apiKey}</p>
                </div>
              </div>

              {/* Endpoint */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Endpoint</label>
                <code className="block mt-1 text-sm text-indigo-400 font-mono">
                  {selectedLog.endpoint}
                </code>
              </div>

              {/* User Agent */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">User Agent</label>
                <p className="text-sm text-gray-300 mt-1">{selectedLog.userAgent}</p>
              </div>

              {/* Request Body */}
              {selectedLog.requestBody && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Request Body</label>
                  <CodeBlock
                    code={JSON.stringify(selectedLog.requestBody, null, 2)}
                    language="json"
                    className="mt-2"
                  />
                </div>
              )}

              {/* Response Body */}
              {selectedLog.responseBody && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Response Body</label>
                  <CodeBlock
                    code={JSON.stringify(selectedLog.responseBody, null, 2)}
                    language="json"
                    className="mt-2"
                  />
                </div>
              )}

              {/* Error */}
              {selectedLog.error && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Error</label>
                  <div className="mt-2 p-4 bg-red-900/20 border border-red-800 rounded text-sm text-red-400">
                    {selectedLog.error}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </IntegrationLayout>
  )
}
