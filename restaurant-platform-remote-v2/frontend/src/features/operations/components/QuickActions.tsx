import React, { useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  PrinterIcon,
  DocumentIcon,
  ChartBarIcon,
  CogIcon,
  RefreshIcon,
  TruckIcon,
  BellIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  TagIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useOperations } from '../contexts/OperationsContext';
import axios from 'axios';

interface QuickActionsProps {
  branchId?: string;
  companyId?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color: string;
  roles: string[];
  category: 'orders' | 'menu' | 'system' | 'reports' | 'settings';
  disabled?: boolean;
  badge?: string | number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function QuickActions({ branchId, companyId, size = 'small' }: QuickActionsProps) {
  const { user } = useAuth();
  const { addAlert, metrics } = useOperations();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'orders' | 'menu' | 'system' | 'reports' | 'settings'>('all');

  const handlePrintTestReceipt = async () => {
    setIsLoading('print-test');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/printing/print-test`,
        {
          branchId: branchId || user?.branchId,
          template: 'test-receipt'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addAlert({
        type: 'success',
        title: 'Test Print Sent',
        message: 'Test receipt has been sent to the default printer',
        read: false,
        source: 'printers'
      });
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Print Failed',
        message: 'Failed to send test print. Check printer connection.',
        read: false,
        source: 'printers'
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleSyncMenus = async () => {
    setIsLoading('sync-menus');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/menu/sync-providers`,
        {
          branchId: branchId || user?.branchId,
          companyId: companyId || user?.companyId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addAlert({
        type: 'success',
        title: 'Menu Sync Started',
        message: 'Menu synchronization with delivery providers has been initiated',
        read: false,
        source: 'menu'
      });
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync menus with delivery providers',
        read: false,
        source: 'menu'
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleRefreshOrders = async () => {
    setIsLoading('refresh-orders');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/delivery/refresh-orders`,
        {
          branchId: branchId || user?.branchId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addAlert({
        type: 'info',
        title: 'Orders Refreshed',
        message: 'Order data has been refreshed from all providers',
        read: false,
        source: 'orders'
      });
    } catch (error) {
      addAlert({
        type: 'warning',
        title: 'Refresh Warning',
        message: 'Some providers may not have responded to refresh request',
        read: false,
        source: 'orders'
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading('generate-report');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/reports/daily-summary`,
        {
          branchId: branchId || user?.branchId,
          date: new Date().toISOString().split('T')[0]
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      addAlert({
        type: 'success',
        title: 'Report Generated',
        message: 'Daily summary report has been downloaded',
        read: false,
        source: 'system'
      });
    } catch (error) {
      addAlert({
        type: 'error',
        title: 'Report Failed',
        message: 'Failed to generate daily summary report',
        read: false,
        source: 'system'
      });
    } finally {
      setIsLoading(null);
    }
  };

  const quickActions: QuickAction[] = [
    // Orders Category
    {
      id: 'refresh-orders',
      label: 'Refresh Orders',
      icon: ArrowPathIcon,
      action: handleRefreshOrders,
      color: 'bg-blue-500 hover:bg-blue-600',
      roles: ['super_admin', 'company_owner', 'branch_manager', 'call_center'],
      category: 'orders',
      badge: metrics.activeOrders
    },
    {
      id: 'new-order',
      label: 'New Order',
      icon: PlusIcon,
      action: () => window.open('/orders/new', '_blank'),
      color: 'bg-green-500 hover:bg-green-600',
      roles: ['super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier'],
      category: 'orders'
    },
    {
      id: 'emergency-call',
      label: 'Emergency Contact',
      icon: PhoneIcon,
      action: () => window.open('tel:+962-6-123-4567'),
      color: 'bg-red-500 hover:bg-red-600',
      roles: ['super_admin', 'company_owner', 'branch_manager', 'call_center'],
      category: 'orders'
    },

    // Menu Category
    {
      id: 'sync-menus',
      label: 'Sync Menus',
      icon: RefreshIcon,
      action: handleSyncMenus,
      color: 'bg-purple-500 hover:bg-purple-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'menu'
    },
    {
      id: 'manage-products',
      label: 'Manage Products',
      icon: TagIcon,
      action: () => window.open('/menu/products', '_blank'),
      color: 'bg-indigo-500 hover:bg-indigo-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'menu'
    },
    {
      id: 'manage-availability',
      label: 'Availability',
      icon: ClipboardDocumentListIcon,
      action: () => window.open('/menu/availability', '_blank'),
      color: 'bg-yellow-500 hover:bg-yellow-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'menu'
    },

    // System Category
    {
      id: 'test-printer',
      label: 'Test Printer',
      icon: PrinterIcon,
      action: handlePrintTestReceipt,
      color: 'bg-gray-500 hover:bg-gray-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'system'
    },
    {
      id: 'system-alerts',
      label: 'System Status',
      icon: ExclamationTriangleIcon,
      action: () => window.open('/settings/system-status', '_blank'),
      color: 'bg-orange-500 hover:bg-orange-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'system',
      badge: metrics.systemAlerts > 0 ? metrics.systemAlerts : undefined
    },

    // Reports Category
    {
      id: 'daily-report',
      label: 'Daily Report',
      icon: ArrowDownTrayIcon,
      action: handleGenerateReport,
      color: 'bg-teal-500 hover:bg-teal-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'reports'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: ChartBarIcon,
      action: () => window.open('/analytics', '_blank'),
      color: 'bg-pink-500 hover:bg-pink-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'reports'
    },

    // Settings Category
    {
      id: 'delivery-settings',
      label: 'Delivery Settings',
      icon: TruckIcon,
      action: () => window.open('/settings/delivery', '_blank'),
      color: 'bg-cyan-500 hover:bg-cyan-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'settings'
    },
    {
      id: 'printer-settings',
      label: 'Printer Settings',
      icon: CogIcon,
      action: () => window.open('/settings/printing', '_blank'),
      color: 'bg-violet-500 hover:bg-violet-600',
      roles: ['super_admin', 'company_owner', 'branch_manager'],
      category: 'settings'
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: UserGroupIcon,
      action: () => window.open('/settings/users', '_blank'),
      color: 'bg-emerald-500 hover:bg-emerald-600',
      roles: ['super_admin', 'company_owner'],
      category: 'settings'
    },
    {
      id: 'branch-settings',
      label: 'Branch Settings',
      icon: BuildingOfficeIcon,
      action: () => window.open('/settings/branches', '_blank'),
      color: 'bg-lime-500 hover:bg-lime-600',
      roles: ['super_admin', 'company_owner'],
      category: 'settings'
    }
  ];

  // Filter actions based on user role and current filter
  const filteredActions = quickActions.filter(action => {
    const hasRole = user?.role && action.roles.includes(user.role);
    const matchesFilter = filter === 'all' || action.category === filter;
    return hasRole && matchesFilter;
  });

  const getGridCols = () => {
    switch (size) {
      case 'small': return 'grid-cols-2';
      case 'medium': return 'grid-cols-3';
      case 'large': return 'grid-cols-4';
      case 'full': return 'grid-cols-6';
      default: return 'grid-cols-3';
    }
  };

  const getMaxActions = () => {
    switch (size) {
      case 'small': return 4;
      case 'medium': return 6;
      case 'large': return 8;
      case 'full': return 12;
      default: return 6;
    }
  };

  const displayActions = filteredActions.slice(0, getMaxActions());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Quick Actions</h3>

        {size !== 'small' && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="orders">Orders</option>
            <option value="menu">Menu</option>
            <option value="system">System</option>
            <option value="reports">Reports</option>
            <option value="settings">Settings</option>
          </select>
        )}
      </div>

      {/* Actions Grid */}
      <div className={`grid ${getGridCols()} gap-3`}>
        {displayActions.map((action) => {
          const IconComponent = action.icon;
          const isLoadingAction = isLoading === action.id;

          return (
            <button
              key={action.id}
              onClick={action.action}
              disabled={action.disabled || isLoadingAction}
              className={`relative p-3 rounded-lg text-white transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                action.color
              } ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'shadow-md hover:shadow-lg'}`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="relative">
                  {isLoadingAction ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  ) : (
                    <IconComponent className="h-6 w-6" />
                  )}

                  {action.badge && !isLoadingAction && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {action.badge}
                    </span>
                  )}
                </div>

                <span className={`text-xs font-medium text-center leading-tight ${
                  size === 'small' ? 'line-clamp-2' : ''
                }`}>
                  {action.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Category Stats for Large/Full Size */}
      {(size === 'large' || size === 'full') && (
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-5 gap-2 text-center">
            {['orders', 'menu', 'system', 'reports', 'settings'].map((category) => {
              const categoryActions = quickActions.filter(a => a.category === category && user?.role && a.roles.includes(user.role));
              const categoryColor = {
                orders: 'text-blue-600',
                menu: 'text-purple-600',
                system: 'text-orange-600',
                reports: 'text-teal-600',
                settings: 'text-violet-600'
              }[category];

              return (
                <button
                  key={category}
                  onClick={() => setFilter(category as any)}
                  className={`p-2 rounded-lg transition-colors ${
                    filter === category ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-lg font-bold ${categoryColor}`}>
                    {categoryActions.length}
                  </div>
                  <div className="text-xs text-gray-600 capitalize">
                    {category}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}