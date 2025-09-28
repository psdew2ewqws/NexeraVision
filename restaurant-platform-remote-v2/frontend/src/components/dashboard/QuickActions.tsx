import React from 'react'
import { useRouter } from 'next/router'
import {
  PlusIcon,
  DocumentTextIcon,
  PrinterIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  TruckIcon,
  UserGroupIcon,
  BellIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PhoneIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  CakeIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  name: string
  role: string
  companyId: string
  branchId?: string
}

interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  avgOrderValue: number
  activeProviders: number
  integrationHealth: number
  pendingOrders: number
}

interface QuickActionsProps {
  user: User | null
  stats: DashboardStats
}

interface QuickAction {
  id: string
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  href?: string
  onClick?: () => void
  requiresRole?: string[]
  badge?: string | number
  priority: 'high' | 'medium' | 'low'
}

const QuickActions: React.FC<QuickActionsProps> = ({ user, stats }) => {
  const router = useRouter()

  // Define all available quick actions
  const allActions: QuickAction[] = [
    // High Priority Actions
    {
      id: 'view-pending-orders',
      label: 'Pending Orders',
      description: 'View and manage pending orders',
      icon: ClockIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/operations/live-orders?filter=pending',
      badge: stats.pendingOrders > 0 ? stats.pendingOrders : undefined,
      priority: 'high'
    },
    {
      id: 'add-new-order',
      label: 'New Order',
      description: 'Create a new manual order',
      icon: PlusIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/orders/new',
      priority: 'high'
    },
    {
      id: 'manage-menu',
      label: 'Menu Products',
      description: 'Add or edit menu items',
      icon: CakeIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/menu/products',
      priority: 'high'
    },
    {
      id: 'print-reports',
      label: 'Print Reports',
      description: 'Generate and print daily reports',
      icon: PrinterIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      onClick: () => {
        console.log('Print daily reports')
        // Implementation for printing reports
      },
      priority: 'high'
    },

    // Medium Priority Actions
    {
      id: 'view-analytics',
      label: 'Analytics',
      description: 'View detailed business analytics',
      icon: ChartBarIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      href: '/analytics/reports',
      priority: 'medium'
    },
    {
      id: 'delivery-providers',
      label: 'Delivery Settings',
      description: 'Configure delivery providers',
      icon: TruckIcon,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      href: '/settings/delivery-providers',
      requiresRole: ['super_admin', 'company_owner'],
      priority: 'medium'
    },
    {
      id: 'user-management',
      label: 'Manage Users',
      description: 'Add or modify user accounts',
      icon: UserGroupIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      href: '/settings/users',
      requiresRole: ['super_admin', 'company_owner', 'branch_manager'],
      priority: 'medium'
    },
    {
      id: 'branch-management',
      label: 'Manage Branches',
      description: 'Configure restaurant branches',
      icon: BuildingOfficeIcon,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/branches',
      requiresRole: ['super_admin', 'company_owner'],
      priority: 'medium'
    },

    // Low Priority Actions
    {
      id: 'system-settings',
      label: 'System Settings',
      description: 'Configure system preferences',
      icon: Cog6ToothIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      href: '/settings',
      requiresRole: ['super_admin', 'company_owner'],
      priority: 'low'
    },
    {
      id: 'export-data',
      label: 'Export Data',
      description: 'Download reports and data',
      icon: ArrowDownTrayIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => {
        console.log('Export data')
        // Implementation for data export
      },
      priority: 'low'
    },
    {
      id: 'import-data',
      label: 'Import Data',
      description: 'Upload and import data',
      icon: ArrowUpTrayIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      onClick: () => {
        console.log('Import data')
        // Implementation for data import
      },
      requiresRole: ['super_admin', 'company_owner'],
      priority: 'low'
    },
    {
      id: 'phone-orders',
      label: 'Phone Orders',
      description: 'Take orders over the phone',
      icon: PhoneIcon,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      href: '/orders/phone',
      priority: 'low'
    }
  ]

  // Filter actions based on user role and priority
  const getVisibleActions = () => {
    let filtered = allActions.filter(action => {
      // Check role requirements
      if (action.requiresRole && user) {
        return action.requiresRole.includes(user.role)
      }
      return true
    })

    // Sort by priority and show top actions
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return filtered
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 8) // Show top 8 actions
  }

  const visibleActions = getVisibleActions()

  // Handle action click
  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      router.push(action.href)
    }
  }

  // Get priority indicator
  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'high':
        return <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
      case 'medium':
        return <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full"></div>
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="text-sm text-gray-600">
          {user?.role === 'super_admin' ? 'Full Access' :
           user?.role === 'company_owner' ? 'Management Access' :
           'Standard Access'}
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={`relative p-4 rounded-lg border-2 border-transparent hover:border-gray-200 transition-all hover:shadow-md group ${action.bgColor}`}
          >
            {/* Priority Indicator */}
            {getPriorityIndicator(action.priority)}

            {/* Icon */}
            <div className="mb-3">
              <action.icon className={`w-8 h-8 ${action.color} group-hover:scale-110 transition-transform`} />
            </div>

            {/* Content */}
            <div className="text-left">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-900 text-sm">{action.label}</h4>
                {action.badge && (
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    typeof action.badge === 'number' && action.badge > 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {action.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-tight">{action.description}</p>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all"></div>
          </button>
        ))}
      </div>

      {/* System Status Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">System Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-xs text-green-700 font-medium">Integration</div>
            <div className="text-xs text-green-600">{Math.round(stats.integrationHealth)}% Health</div>
          </div>

          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <TruckIcon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-blue-700 font-medium">Providers</div>
            <div className="text-xs text-blue-600">{stats.activeProviders} Active</div>
          </div>

          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <ClockIcon className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <div className="text-xs text-orange-700 font-medium">Pending</div>
            <div className="text-xs text-orange-600">{stats.pendingOrders} Orders</div>
          </div>

          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <ChartBarIcon className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-xs text-purple-700 font-medium">Today</div>
            <div className="text-xs text-purple-600">{stats.todayOrders} Orders</div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Need Help?</h4>
            <p className="text-xs text-gray-500">Access documentation and support</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
              Documentation
            </button>
            <button className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors">
              Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickActions