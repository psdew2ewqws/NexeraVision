import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { Input } from '@/components/integration/ui/Input'
import { WebhookLogViewer } from '@/components/integration/WebhookLogViewer'
import { StatusBadge } from '@/components/integration/StatusBadge'
import { webhookLogs, deliveryProviders } from '@/lib/integration-api'
import type { WebhookFilters } from '@/types/integration'
import toast from 'react-hot-toast'
import { MagnifyingGlassIcon, ArrowDownTrayIcon, FunnelIcon } from '@heroicons/react/24/outline'

export default function WebhooksEnhancedPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<WebhookFilters>({
    page: 1,
    limit: 20,
    providerId: (router.query.provider as string) || '',
    status: undefined,
    eventType: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: providers } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: () => deliveryProviders.getAll()
  })

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['webhook-logs', filters],
    queryFn: () => webhookLogs.getAll(filters)
  })

  const retryMutation = useMutation({
    mutationFn: (logId: string) => webhookLogs.retry(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] })
      toast.success('Webhook retry initiated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to retry webhook')
    }
  })

  const exportMutation = useMutation({
    mutationFn: () => webhookLogs.export(filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webhook-logs-${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Export downloaded successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export logs')
    }
  })

  const handleFilterChange = (key: keyof WebhookFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  const handleExport = () => {
    exportMutation.mutate()
  }

  const successCount = logsData?.data.filter(l => l.status === 'success').length || 0
  const failedCount = logsData?.data.filter(l => l.status === 'failed').length || 0
  const avgResponseTime = logsData?.data.reduce((acc, l) => acc + l.responseTime, 0) / (logsData?.data.length || 1) || 0

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Webhook Monitoring</h1>
            <p className="text-sm text-gray-400 mt-1">
              Monitor incoming webhooks from delivery providers
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-4 h-4 mr-1" />
              Filters
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exportMutation.isLoading}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              {exportMutation.isLoading ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Webhooks</p>
                  <p className="text-2xl font-bold text-gray-100 mt-1">
                    {logsData?.total || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {logsData?.data.length ? ((successCount / logsData.data.length) * 100).toFixed(1) : '0.0'}%
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
                  <p className="text-sm text-gray-400">Failed</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{failedCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Response</p>
                  <p className="text-2xl font-bold text-gray-100 mt-1">
                    {avgResponseTime.toFixed(0)}ms
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
        </div>

        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider
                  </label>
                  <select
                    value={filters.providerId}
                    onChange={(e) => handleFilterChange('providerId', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                  >
                    <option value="">All Providers</option>
                    {providers?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="retrying">Retrying</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Type
                  </label>
                  <Input
                    value={filters.eventType}
                    onChange={(e) => handleFilterChange('eventType', e.target.value)}
                    placeholder="e.g., order.created"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Range
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Webhook Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <WebhookLogViewer
              logs={logsData?.data || []}
              onRetry={(log) => retryMutation.mutate(log.id)}
              loading={isLoading}
            />

            {logsData && logsData.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  Showing {(logsData.page - 1) * logsData.limit + 1} to{' '}
                  {Math.min(logsData.page * logsData.limit, logsData.total)} of{' '}
                  {logsData.total} results
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={logsData.page === 1}
                    onClick={() => handlePageChange(logsData.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {logsData.page} of {logsData.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={logsData.page === logsData.totalPages}
                    onClick={() => handlePageChange(logsData.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </IntegrationLayout>
  )
}
