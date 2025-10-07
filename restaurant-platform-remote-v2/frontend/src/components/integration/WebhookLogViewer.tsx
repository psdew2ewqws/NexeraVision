import React, { useState } from 'react'
import { format } from 'date-fns'
import type { WebhookLog } from '@/types/integration'
import { StatusBadge } from './StatusBadge'
import { PayloadViewer } from './PayloadViewer'
import { Button } from './ui/Button'
import { ChevronDownIcon, ChevronUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface WebhookLogViewerProps {
  logs: WebhookLog[]
  onRetry?: (log: WebhookLog) => void
  loading?: boolean
}

export const WebhookLogViewer: React.FC<WebhookLogViewerProps> = ({ logs, onRetry, loading }) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-3 bg-gray-800 rounded w-1/2 mt-2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-lg">
        <p className="text-gray-400">No webhook logs found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <StatusBadge status={log.status} />
                  <span className="text-sm font-medium text-gray-200">{log.providerName}</span>
                  <span className="text-sm text-gray-500">→</span>
                  <span className="text-sm text-gray-400">{log.eventType}</span>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}</span>
                  <span>Status: {log.statusCode}</span>
                  <span>Response: {log.responseTime}ms</span>
                  {log.retryCount > 0 && <span>Retries: {log.retryCount}</span>}
                  <span className={log.signatureValid ? 'text-green-400' : 'text-red-400'}>
                    {log.signatureValid ? '✓ Signature valid' : '✗ Signature invalid'}
                  </span>
                </div>
                {log.errorMessage && (
                  <p className="text-sm text-red-400 mt-2">{log.errorMessage}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {onRetry && log.status === 'failed' && (
                  <Button variant="outline" size="sm" onClick={() => onRetry(log)}>
                    <ArrowPathIcon className="w-4 h-4" />
                  </Button>
                )}
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {expandedLogs.has(log.id) ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {expandedLogs.has(log.id) && (
            <div className="border-t border-gray-800 p-4 bg-gray-950">
              <PayloadViewer payload={log.payload} title="Webhook Payload" maxHeight="max-h-64" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
