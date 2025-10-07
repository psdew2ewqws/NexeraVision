import React from 'react'
import { format } from 'date-fns'
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid'

interface TimelineEvent {
  status: string
  timestamp: string
  description?: string
}

interface OrderTimelineProps {
  events: TimelineEvent[]
  currentStatus: string
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events, currentStatus }) => {
  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('fail') || statusLower.includes('cancel') || statusLower.includes('error')) {
      return <XCircleIcon className="w-5 h-5 text-red-400" />
    }
    if (statusLower.includes('delivered') || statusLower.includes('complete') || statusLower.includes('success')) {
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />
    }
    return <ClockIcon className="w-5 h-5 text-yellow-400" />
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(event.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-200">{event.status}</p>
              <span className="text-xs text-gray-500">
                {format(new Date(event.timestamp), 'HH:mm:ss')}
              </span>
            </div>
            {event.description && (
              <p className="text-xs text-gray-500 mt-1">{event.description}</p>
            )}
          </div>
          {index < events.length - 1 && (
            <div className="absolute left-2 top-6 w-0.5 h-full bg-gray-800" />
          )}
        </div>
      ))}
    </div>
  )
}
