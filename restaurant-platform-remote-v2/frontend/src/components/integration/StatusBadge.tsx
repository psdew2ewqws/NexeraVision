import React from 'react'
import { Badge } from './ui/Badge'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const statusConfig: Record<string, { variant: 'success' | 'error' | 'warning' | 'info' | 'default'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'error', label: 'Inactive' },
    success: { variant: 'success', label: 'Success' },
    failed: { variant: 'error', label: 'Failed' },
    retrying: { variant: 'warning', label: 'Retrying' },
    pending: { variant: 'warning', label: 'Pending' },
    synced: { variant: 'success', label: 'Synced' },
    sync_failed: { variant: 'error', label: 'Sync Failed' },
    pending_sync: { variant: 'warning', label: 'Pending Sync' },
    accepted: { variant: 'success', label: 'Accepted' },
    preparing: { variant: 'info', label: 'Preparing' },
    ready: { variant: 'success', label: 'Ready' },
    delivered: { variant: 'success', label: 'Delivered' },
    cancelled: { variant: 'error', label: 'Cancelled' },
    low: { variant: 'info', label: 'Low' },
    medium: { variant: 'warning', label: 'Medium' },
    high: { variant: 'error', label: 'High' },
    critical: { variant: 'error', label: 'Critical' }
  }

  const config = statusConfig[status.toLowerCase()] || { variant: 'default' as const, label: status }

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  )
}
