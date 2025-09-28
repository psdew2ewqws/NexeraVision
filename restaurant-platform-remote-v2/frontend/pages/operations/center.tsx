import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsPointingOutIcon,
  MinusIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import ProtectedRoute from '../../src/components/shared/ProtectedRoute';
import LicenseWarningHeader from '../../src/components/shared/LicenseWarningHeader';
import { useAuth } from '../../src/contexts/AuthContext';
import { OperationsProvider, useOperations } from '../../src/features/operations/contexts/OperationsContext';

// Import all the operation components
import OrderTrackingGrid from '../../src/features/operations/components/OrderTrackingGrid';
import BranchPerformanceCard from '../../src/features/operations/components/BranchPerformanceCard';
import AlertCenter from '../../src/features/operations/components/AlertCenter';
import QuickActions from '../../src/features/operations/components/QuickActions';
import ProviderIntegrationPanel from '../../src/features/operations/components/ProviderIntegrationPanel';

// Import hooks for enhanced functionality
import { useOperationsWebSocket } from '../../src/features/operations/hooks/useOperationsWebSocket';
import { useOrderTracking } from '../../src/features/operations/hooks/useOrderTracking';
import { useAlerts } from '../../src/features/operations/hooks/useAlerts';

interface Widget {
  id: string;
  type: 'orders' | 'performance' | 'alerts' | 'actions' | 'providers' | 'analytics';
  title: string;
  component: React.ComponentType<any>;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  minimized: boolean;
  order: number;
}

const defaultWidgets: Widget[] = [
  {
    id: 'orders',
    type: 'orders',
    title: 'Live Order Tracking',
    component: OrderTrackingGrid,
    size: 'large',
    visible: true,
    minimized: false,
    order: 1
  },
  {
    id: 'performance',
    type: 'performance',
    title: 'Branch Performance',
    component: BranchPerformanceCard,
    size: 'medium',
    visible: true,
    minimized: false,
    order: 2
  },
  {
    id: 'alerts',
    type: 'alerts',
    title: 'Alert Center',
    component: AlertCenter,
    size: 'medium',
    visible: true,
    minimized: false,
    order: 3
  },
  {
    id: 'actions',
    type: 'actions',
    title: 'Quick Actions',
    component: QuickActions,
    size: 'small',
    visible: true,
    minimized: false,
    order: 4
  },
  {
    id: 'providers',
    type: 'providers',
    title: 'Provider Integration Status',
    component: ProviderIntegrationPanel,
    size: 'large',
    visible: true,
    minimized: false,
    order: 5
  }
];

function OperationsCenter() {
  const { user } = useAuth();
  const { widgets, updateWidget, reorderWidgets, isConnected } = useOperations();
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize real-time connections and hooks
  const { connect, disconnect } = useOperationsWebSocket({
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  });

  const { refreshOrders } = useOrderTracking({
    autoRefresh: true,
    refreshInterval: 10000,
    enableRealTime: true
  });

  const { markAllAsRead, unreadCount } = useAlerts({
    autoMarkReadDelay: 30000,
    enableNotifications: true
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newWidgets = Array.from(widgets);
    const [reorderedWidget] = newWidgets.splice(result.source.index, 1);
    newWidgets.splice(result.destination.index, 0, reorderedWidget);

    // Update order numbers
    const reorderedWithOrder = newWidgets.map((widget, index) => ({
      ...widget,
      order: index + 1
    }));

    reorderWidgets(reorderedWithOrder);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      updateWidget(widgetId, { visible: !widget.visible });
    }
  };

  const toggleWidgetMinimized = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      updateWidget(widgetId, { minimized: !widget.minimized });
    }
  };

  const changeWidgetSize = (widgetId: string, size: Widget['size']) => {
    updateWidget(widgetId, { size });
  };

  const getGridClasses = (size: Widget['size']) => {
    switch (size) {
      case 'small':
        return 'col-span-1 lg:col-span-2';
      case 'medium':
        return 'col-span-1 lg:col-span-3';
      case 'large':
        return 'col-span-1 lg:col-span-4';
      case 'full':
        return 'col-span-1 lg:col-span-6';
      default:
        return 'col-span-1 lg:col-span-3';
    }
  };

  const visibleWidgets = widgets
    .filter(widget => widget.visible)
    .sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager', 'call_center']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'company_owner', 'branch_manager', 'call_center']}>
      <Head>
        <title>Operations Center - Restaurant Platform</title>
        <meta name="description" content="Unified operations center for restaurant management" />
      </Head>

      <LicenseWarningHeader />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-none mx-auto px-2 sm:px-4 lg:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-800 transition-colors" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Operations Center</h1>
                  <p className="mt-2 text-gray-600">
                    Unified dashboard for real-time restaurant operations management
                  </p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsConfigMode(!isConfigMode)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isConfigMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-2" />
                  {isConfigMode ? 'Exit Config' : 'Configure'}
                </button>

                <div className="hidden lg:flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {isConnected ? 'Live Updates' : 'Disconnected'}
                    </span>
                  </div>

                  {unreadCount > 0 && (
                    <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                      <BellIcon className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">{unreadCount} alerts</span>
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration Panel */}
            {isConfigMode && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Widget Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {widget.title}
                        </h4>
                        <button
                          onClick={() => toggleWidgetVisibility(widget.id)}
                          className={`p-1 rounded ${
                            widget.visible
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {widget.visible ? (
                            <EyeIcon className="h-4 w-4" />
                          ) : (
                            <EyeSlashIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Size</label>
                          <select
                            value={widget.size}
                            onChange={(e) => changeWidgetSize(widget.id, e.target.value as Widget['size'])}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="full">Full Width</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Widgets Grid */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets" direction="horizontal" type="widget">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-1 lg:grid-cols-6 gap-6"
                >
                  {visibleWidgets.map((widget, index) => {
                    const WidgetComponent = widget.component;

                    return (
                      <Draggable
                        key={widget.id}
                        draggableId={widget.id}
                        index={index}
                        isDragDisabled={!isConfigMode}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${getGridClasses(widget.size)} ${
                              snapshot.isDragging ? 'z-50' : ''
                            }`}
                          >
                            <div
                              className={`bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 ${
                                snapshot.isDragging
                                  ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50'
                                  : 'hover:shadow-md'
                              } ${
                                isConfigMode ? 'ring-1 ring-blue-200' : ''
                              }`}
                            >
                              {/* Widget Header */}
                              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <h3
                                  {...(isConfigMode ? provided.dragHandleProps : {})}
                                  className={`text-lg font-semibold text-gray-900 ${
                                    isConfigMode ? 'cursor-move' : ''
                                  }`}
                                >
                                  {widget.title}
                                </h3>

                                <div className="flex items-center space-x-2">
                                  {isConfigMode && (
                                    <>
                                      <button
                                        onClick={() => toggleWidgetMinimized(widget.id)}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                      >
                                        {widget.minimized ? (
                                          <PlusIcon className="h-4 w-4" />
                                        ) : (
                                          <MinusIcon className="h-4 w-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => toggleWidgetVisibility(widget.id)}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                      >
                                        <EyeSlashIcon className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Widget Content */}
                              {!widget.minimized && (
                                <div className="p-4">
                                  <WidgetComponent
                                    branchId={user?.role === 'branch_manager' ? user?.branchId : undefined}
                                    companyId={user?.role !== 'super_admin' ? user?.companyId : undefined}
                                    size={widget.size}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Empty State */}
          {visibleWidgets.length === 0 && (
            <div className="text-center py-12">
              <ArrowsPointingOutIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets visible</h3>
              <p className="text-gray-600 mb-4">
                Click "Configure" to enable and arrange your operation widgets.
              </p>
              <button
                onClick={() => setIsConfigMode(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Configure Widgets
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function OperationsCenterPage() {
  return (
    <OperationsProvider>
      <OperationsCenter />
    </OperationsProvider>
  );
}