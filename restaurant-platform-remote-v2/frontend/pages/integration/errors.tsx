import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationLayout } from '@/components/integration/layout/IntegrationLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/integration/ui/Card'
import { Button } from '@/components/integration/ui/Button'
import { ErrorCard } from '@/components/integration/ErrorCard'
import { errorLogs, deliveryProviders } from '@/lib/integration-api'
import type { ErrorFilters } from '@/types/integration'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function ErrorsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ErrorFilters>({
    page: 1,
    limit: 20,
    providerId: '',
    severity: undefined,
    isResolved: undefined
  })

  const { data: providers } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: () => deliveryProviders.getAll()
  })

  const { data: errorsData, isLoading } = useQuery({
    queryKey: ['error-logs', filters],
    queryFn: () => errorLogs.getAll(filters)
  })

  const resolveMutation = useMutation({
    mutationFn: (errorId: string) => errorLogs.resolve(errorId, user?.email || 'Unknown'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] })
      toast.success('Error marked as resolved')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve error')
    }
  })

  const handleFilterChange = (key: keyof ErrorFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  const unresolvedCount = errorsData?.data.filter(e => !e.isResolved).length || 0
  const criticalCount = errorsData?.data.filter(e => e.severity === 'critical' && !e.isResolved).length || 0

  return (
    <IntegrationLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Error Logs</h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor and resolve delivery provider integration errors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Errors</p>
                  <p className="text-2xl font-bold text-gray-100 mt-1">
                    {errorsData?.total || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Unresolved</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">
                    {unresolvedCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Critical</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    {criticalCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <p className="text-sm text-gray-400">Resolved Today</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {errorsData?.data.filter(e => e.isResolved &&
                      e.resolvedAt &&
                      new Date(e.resolvedAt).toDateString() === new Date().toDateString()
                    ).length || 0}
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
        </div>

        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  Severity
                </label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) => handleFilterChange('severity', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.isResolved === undefined ? '' : filters.isResolved.toString()}
                  onChange={(e) => handleFilterChange('isResolved', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200"
                >
                  <option value="">All</option>
                  <option value="false">Unresolved</option>
                  <option value="true">Resolved</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2 mt-2"></div>
                  </div>
                ))}
              </div>
            ) : errorsData && errorsData.data.length > 0 ? (
              <>
                <div className="space-y-3">
                  {errorsData.data.map((error) => (
                    <ErrorCard
                      key={error.id}
                      error={error}
                      onResolve={(err) => resolveMutation.mutate(err.id)}
                    />
                  ))}
                </div>

                {errorsData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-500">
                      Showing {(errorsData.page - 1) * errorsData.limit + 1} to{' '}
                      {Math.min(errorsData.page * errorsData.limit, errorsData.total)} of{' '}
                      {errorsData.total} results
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={errorsData.page === 1}
                        onClick={() => handlePageChange(errorsData.page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-400">
                        Page {errorsData.page} of {errorsData.totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={errorsData.page === errorsData.totalPages}
                        onClick={() => handlePageChange(errorsData.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-200">No errors found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.isResolved === false ? 'All errors have been resolved!' : 'No errors match your filters.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </IntegrationLayout>
  )
}
