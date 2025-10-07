import React, { useState } from 'react'
import { format } from 'date-fns'
import type { DeliveryErrorLog } from '@/types/integration'
import { StatusBadge } from './StatusBadge'
import { Button } from './ui/Button'
import { CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface ErrorCardProps {
  error: DeliveryErrorLog
  onResolve?: (error: DeliveryErrorLog) => void
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ error, onResolve }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <StatusBadge status={error.severity} />
              <span className="text-sm font-medium text-gray-200">{error.providerName}</span>
              <span className="text-sm text-gray-500">→</span>
              <span className="text-sm text-gray-400">{error.errorType}</span>
              {error.isResolved && (
                <span className="text-xs text-green-400 flex items-center">
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Resolved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300 mt-2">{error.errorMessage}</p>
            <p className="text-xs text-gray-500 mt-1">
              {format(new Date(error.createdAt), 'MMM dd, yyyy HH:mm:ss')}
            </p>
            {error.isResolved && error.resolvedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Resolved {format(new Date(error.resolvedAt), 'MMM dd, yyyy HH:mm:ss')}
                {error.resolvedBy && ` by ${error.resolvedBy}`}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {!error.isResolved && onResolve && (
              <Button variant="secondary" size="sm" onClick={() => onResolve(error)}>
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Resolve
              </Button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {expanded ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded && error.stackTrace && (
        <div className="border-t border-gray-800 p-4 bg-gray-950">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Stack Trace</h4>
          <div className="bg-black rounded p-3 overflow-x-auto">
            <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
              {error.stackTrace}
            </pre>
          </div>
          {Object.keys(error.context).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Context</h4>
              <div className="bg-black rounded p-3 overflow-x-auto">
                <pre className="text-xs text-gray-300 font-mono">
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
