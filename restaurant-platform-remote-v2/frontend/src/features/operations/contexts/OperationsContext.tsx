import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

export interface Widget {
  id: string;
  type: 'orders' | 'performance' | 'alerts' | 'actions' | 'providers' | 'analytics';
  title: string;
  component: React.ComponentType<any>;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  minimized: boolean;
  order: number;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source: 'orders' | 'providers' | 'system' | 'printers' | 'menu';
  branchId?: string;
  orderId?: string;
  providerId?: string;
}

export interface OperationMetrics {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  failedOrders: number;
  avgDeliveryTime: number;
  activeProviders: number;
  systemAlerts: number;
  revenue: number;
  orderTrends: {
    hour: number;
    count: number;
  }[];
  providerPerformance: {
    provider: string;
    orders: number;
    successRate: number;
    avgTime: number;
  }[];
}

export interface OperationsState {
  widgets: Widget[];
  alerts: Alert[];
  metrics: OperationMetrics;
  isConnected: boolean;
  lastUpdate: Date | null;
  selectedBranchId?: string;
  selectedCompanyId?: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

type OperationsAction =
  | { type: 'UPDATE_WIDGET'; payload: { id: string; updates: Partial<Widget> } }
  | { type: 'REORDER_WIDGETS'; payload: Widget[] }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'MARK_ALERT_READ'; payload: string }
  | { type: 'CLEAR_ALERTS'; payload?: string }
  | { type: 'UPDATE_METRICS'; payload: OperationMetrics }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LAST_UPDATE'; payload: Date }
  | { type: 'SET_BRANCH_FILTER'; payload: string | undefined }
  | { type: 'SET_COMPANY_FILTER'; payload: string | undefined }
  | { type: 'SET_AUTO_REFRESH'; payload: boolean }
  | { type: 'SET_REFRESH_INTERVAL'; payload: number }
  | { type: 'RESET_WIDGETS' };

// Default widgets configuration
const defaultWidgets: Widget[] = [
  {
    id: 'orders',
    type: 'orders',
    title: 'Live Order Tracking',
    component: () => null, // Will be replaced with actual component
    size: 'large',
    visible: true,
    minimized: false,
    order: 1
  },
  {
    id: 'performance',
    type: 'performance',
    title: 'Branch Performance',
    component: () => null,
    size: 'medium',
    visible: true,
    minimized: false,
    order: 2
  },
  {
    id: 'alerts',
    type: 'alerts',
    title: 'Alert Center',
    component: () => null,
    size: 'medium',
    visible: true,
    minimized: false,
    order: 3
  },
  {
    id: 'actions',
    type: 'actions',
    title: 'Quick Actions',
    component: () => null,
    size: 'small',
    visible: true,
    minimized: false,
    order: 4
  },
  {
    id: 'providers',
    type: 'providers',
    title: 'Provider Integration Status',
    component: () => null,
    size: 'large',
    visible: true,
    minimized: false,
    order: 5
  }
];

const initialMetrics: OperationMetrics = {
  totalOrders: 0,
  activeOrders: 0,
  completedOrders: 0,
  failedOrders: 0,
  avgDeliveryTime: 0,
  activeProviders: 0,
  systemAlerts: 0,
  revenue: 0,
  orderTrends: [],
  providerPerformance: []
};

const initialState: OperationsState = {
  widgets: defaultWidgets,
  alerts: [],
  metrics: initialMetrics,
  isConnected: false,
  lastUpdate: null,
  autoRefresh: true,
  refreshInterval: 30000 // 30 seconds
};

function operationsReducer(state: OperationsState, action: OperationsAction): OperationsState {
  switch (action.type) {
    case 'UPDATE_WIDGET':
      return {
        ...state,
        widgets: state.widgets.map(widget =>
          widget.id === action.payload.id
            ? { ...widget, ...action.payload.updates }
            : widget
        )
      };

    case 'REORDER_WIDGETS':
      return {
        ...state,
        widgets: action.payload
      };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [action.payload, ...state.alerts].slice(0, 100) // Keep only last 100 alerts
      };

    case 'MARK_ALERT_READ':
      return {
        ...state,
        alerts: state.alerts.map(alert =>
          alert.id === action.payload ? { ...alert, read: true } : alert
        )
      };

    case 'CLEAR_ALERTS':
      return {
        ...state,
        alerts: action.payload
          ? state.alerts.filter(alert => alert.source !== action.payload)
          : []
      };

    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: action.payload,
        lastUpdate: new Date()
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload
      };

    case 'SET_LAST_UPDATE':
      return {
        ...state,
        lastUpdate: action.payload
      };

    case 'SET_BRANCH_FILTER':
      return {
        ...state,
        selectedBranchId: action.payload
      };

    case 'SET_COMPANY_FILTER':
      return {
        ...state,
        selectedCompanyId: action.payload
      };

    case 'SET_AUTO_REFRESH':
      return {
        ...state,
        autoRefresh: action.payload
      };

    case 'SET_REFRESH_INTERVAL':
      return {
        ...state,
        refreshInterval: action.payload
      };

    case 'RESET_WIDGETS':
      return {
        ...state,
        widgets: defaultWidgets
      };

    default:
      return state;
  }
}

interface OperationsContextType {
  state: OperationsState;
  widgets: Widget[];
  alerts: Alert[];
  metrics: OperationMetrics;
  isConnected: boolean;
  lastUpdate: Date | null;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  reorderWidgets: (widgets: Widget[]) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  markAlertRead: (alertId: string) => void;
  clearAlerts: (source?: string) => void;
  updateMetrics: (metrics: OperationMetrics) => void;
  setConnectionStatus: (connected: boolean) => void;
  setBranchFilter: (branchId: string | undefined) => void;
  setCompanyFilter: (companyId: string | undefined) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  resetWidgets: () => void;
  unreadAlertsCount: number;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

interface OperationsProviderProps {
  children: ReactNode;
}

export function OperationsProvider({ children }: OperationsProviderProps) {
  const [state, dispatch] = useReducer(operationsReducer, initialState);
  const { user } = useAuth();

  // Initialize filters based on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'branch_manager' && user.branchId) {
        dispatch({ type: 'SET_BRANCH_FILTER', payload: user.branchId });
      }
      if (user.role !== 'super_admin' && user.companyId) {
        dispatch({ type: 'SET_COMPANY_FILTER', payload: user.companyId });
      }
    }
  }, [user]);

  // Load widget configuration from localStorage
  useEffect(() => {
    const savedWidgets = localStorage.getItem('operations-widgets');
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);
        dispatch({ type: 'REORDER_WIDGETS', payload: parsedWidgets });
      } catch (error) {
        console.warn('Failed to load saved widgets configuration');
      }
    }
  }, []);

  // Save widget configuration to localStorage
  useEffect(() => {
    localStorage.setItem('operations-widgets', JSON.stringify(state.widgets));
  }, [state.widgets]);

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    dispatch({ type: 'UPDATE_WIDGET', payload: { id, updates } });
  };

  const reorderWidgets = (widgets: Widget[]) => {
    dispatch({ type: 'REORDER_WIDGETS', payload: widgets });
  };

  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    dispatch({ type: 'ADD_ALERT', payload: newAlert });
  };

  const markAlertRead = (alertId: string) => {
    dispatch({ type: 'MARK_ALERT_READ', payload: alertId });
  };

  const clearAlerts = (source?: string) => {
    dispatch({ type: 'CLEAR_ALERTS', payload: source });
  };

  const updateMetrics = (metrics: OperationMetrics) => {
    dispatch({ type: 'UPDATE_METRICS', payload: metrics });
  };

  const setConnectionStatus = (connected: boolean) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: connected });
  };

  const setBranchFilter = (branchId: string | undefined) => {
    dispatch({ type: 'SET_BRANCH_FILTER', payload: branchId });
  };

  const setCompanyFilter = (companyId: string | undefined) => {
    dispatch({ type: 'SET_COMPANY_FILTER', payload: companyId });
  };

  const setAutoRefresh = (enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_REFRESH', payload: enabled });
  };

  const setRefreshInterval = (interval: number) => {
    dispatch({ type: 'SET_REFRESH_INTERVAL', payload: interval });
  };

  const resetWidgets = () => {
    dispatch({ type: 'RESET_WIDGETS' });
  };

  const unreadAlertsCount = state.alerts.filter(alert => !alert.read).length;

  const contextValue: OperationsContextType = {
    state,
    widgets: state.widgets,
    alerts: state.alerts,
    metrics: state.metrics,
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    updateWidget,
    reorderWidgets,
    addAlert,
    markAlertRead,
    clearAlerts,
    updateMetrics,
    setConnectionStatus,
    setBranchFilter,
    setCompanyFilter,
    setAutoRefresh,
    setRefreshInterval,
    resetWidgets,
    unreadAlertsCount
  };

  return (
    <OperationsContext.Provider value={contextValue}>
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (context === undefined) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}