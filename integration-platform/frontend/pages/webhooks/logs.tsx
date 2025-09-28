import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// Layout is already provided by _app.tsx, no need to import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WebhookLog, ApiResponse, PaginatedResponse } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, capitalize } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { RefreshCwIcon } from 'lucide-react';

const fetchWebhookLogs = async (page = 1, filters: any = {}): Promise<PaginatedResponse<WebhookLog>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: '50',
    ...filters,
  });

  const response = await apiClient.get<ApiResponse<PaginatedResponse<WebhookLog>>>(
    `/webhooks/logs?${params}`
  );

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch webhook logs');
  }
  return response.data.data;
};

export default function WebhookLogs() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const filters = useMemo(() => ({
    ...(search && { search }),
    ...(providerFilter && { provider: providerFilter }),
    ...(statusFilter && { status: statusFilter }),
  }), [search, providerFilter, statusFilter]);

  const {
    data: logsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['webhook-logs', currentPage, filters],
    queryFn: () => fetchWebhookLogs(currentPage, filters),
    placeholderData: (previousData) => previousData,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const logs = logsData?.data || [];
  const meta = logsData?.meta;

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge variant="success">Success ({status})</Badge>;
    } else if (status >= 400 && status < 500) {
      return <Badge variant="warning">Client Error ({status})</Badge>;
    } else if (status >= 500) {
      return <Badge variant="error">Server Error ({status})</Badge>;
    } else {
      return <Badge variant="outline">Unknown ({status})</Badge>;
    }
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    }
  };

  const providerOptions = ['careem', 'talabat', 'deliveroo', 'uber_eats', 'jahez'];
  const statusOptions = ['200', '201', '400', '401', '404', '500'];

  if (isLoading && logs.length === 0) {
    return (
      
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
            <p className="text-gray-600 mt-1">
              Monitor incoming webhook events and responses
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Provider Filter */}
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Providers</option>
                {providerOptions.map(provider => (
                  <option key={provider} value={provider}>
                    {capitalize(provider)}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    HTTP {status}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              {(search || providerFilter || statusFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setProviderFilter('');
                    setStatusFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800">Error loading webhook logs</h3>
            <p className="mt-1 text-sm text-red-700">
              Unable to fetch webhook logs. Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Webhook Events ({meta?.total || 0})
            </CardTitle>
            <CardDescription>
              Real-time webhook event monitoring and debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">No webhook events found</div>
                <p className="text-gray-500">
                  {search || providerFilter || statusFilter
                    ? 'Try adjusting your filters'
                    : 'Webhook events will appear here once integrations are active'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(log.response_status)}
                            {getStatusBadge(log.response_status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {capitalize(log.provider)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.event_type}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                        <TableCell>
                          {log.processed_at ? (
                            <Badge variant="success">
                              Processed
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.error ? (
                            <Badge variant="error">
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="success">
                              None
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      Showing {meta.from} to {meta.to} of {meta.total} logs
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {currentPage} of {meta.last_page}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, meta.last_page))}
                        disabled={currentPage === meta.last_page || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Webhook Event Details</h3>
                  <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                    ×
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Event Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Provider</label>
                      <div>{capitalize(selectedLog.provider)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Event Type</label>
                      <div>{selectedLog.event_type}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status Code</label>
                      <div>{getStatusBadge(selectedLog.response_status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Timestamp</label>
                      <div>{formatDateTime(selectedLog.created_at)}</div>
                    </div>
                  </div>

                  {/* Payload */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Request Payload</label>
                    <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-60">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>

                  {/* Response */}
                  {selectedLog.response_body && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Response Body</label>
                      <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-60">
                        {selectedLog.response_body}
                      </pre>
                    </div>
                  )}

                  {/* Error */}
                  {selectedLog.error && (
                    <div>
                      <label className="text-sm font-medium text-red-700 mb-2 block">Error Details</label>
                      <div className="bg-red-50 border border-red-200 p-4 rounded-md text-sm text-red-700">
                        {selectedLog.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    
  );
}