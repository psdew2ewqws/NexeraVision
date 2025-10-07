import React from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { StatusBadge } from './StatusBadge'
import type { DeliveryProvider, ProviderStats } from '@/types/integration'
import { TruckIcon, CogIcon, PlayIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface ProviderCardProps {
  provider: DeliveryProvider
  stats?: ProviderStats
  onConfigure?: (provider: DeliveryProvider) => void
  onTest?: (provider: DeliveryProvider) => void
  onToggle?: (provider: DeliveryProvider, isActive: boolean) => void
  onViewLogs?: (provider: DeliveryProvider) => void
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  stats,
  onConfigure,
  onTest,
  onToggle,
  onViewLogs
}) => {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-100">{provider.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <StatusBadge status={provider.isActive ? 'active' : 'inactive'} />
              <span className="text-xs text-gray-500">{provider.slug}</span>
            </div>
          </div>

          {onToggle && (
            <button
              onClick={() => onToggle(provider, !provider.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                provider.isActive ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  provider.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-800">
            <div>
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-lg font-semibold text-gray-100 mt-1">{stats.totalOrders.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-lg font-semibold text-gray-100 mt-1">{stats.successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Response</p>
              <p className="text-lg font-semibold text-gray-100 mt-1">{stats.avgResponseTime}ms</p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2 mt-4">
          {onConfigure && (
            <Button variant="outline" size="sm" onClick={() => onConfigure(provider)}>
              <CogIcon className="w-4 h-4 mr-1" />
              Configure
            </Button>
          )}
          {onTest && (
            <Button variant="outline" size="sm" onClick={() => onTest(provider)}>
              <PlayIcon className="w-4 h-4 mr-1" />
              Test
            </Button>
          )}
          {onViewLogs && (
            <Button variant="ghost" size="sm" onClick={() => onViewLogs(provider)}>
              <ChartBarIcon className="w-4 h-4 mr-1" />
              View Logs
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
