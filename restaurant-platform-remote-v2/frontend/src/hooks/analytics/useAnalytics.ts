import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../realtime/useWebSocket';

// Types
interface AnalyticsConfig {
  companyId: string;
  branchId?: string;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | '90d';
  refreshInterval?: number;
  realTime?: boolean;
}

interface AnalyticsData<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface AnalyticsHookReturn<T> extends AnalyticsData<T> {
  refetch: () => Promise<void>;
  updateTimeRange: (timeRange: AnalyticsConfig['timeRange']) => void;
  updateBranch: (branchId?: string) => void;
}

// Generic analytics hook
export const useAnalytics = <T = any>(
  endpoint: string,
  config: AnalyticsConfig
): AnalyticsHookReturn<T> => {
  const [state, setState] = useState<AnalyticsData<T>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [currentConfig, setCurrentConfig] = useState(config);

  // WebSocket for real-time updates
  const wsUrl = config.realTime
    ? `ws://localhost:3001/${endpoint.replace('/api/', '')}?companyId=${config.companyId}${config.branchId ? `&branchId=${config.branchId}` : ''}`
    : '';

  const { sendMessage } = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data.type === 'analytics_update') {
        setState(prev => ({
          ...prev,
          data: data.payload,
          lastUpdated: new Date()
        }));
      }
    },
    onError: (error) => {
      console.error('WebSocket error in analytics:', error);
    }
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams({
        companyId: currentConfig.companyId,
        timeRange: currentConfig.timeRange
      });

      if (currentConfig.branchId) {
        params.append('branchId', currentConfig.branchId);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics data: ${response.statusText}`);
      }

      const data = await response.json();

      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [endpoint, currentConfig]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const updateTimeRange = useCallback((timeRange: AnalyticsConfig['timeRange']) => {
    setCurrentConfig(prev => ({ ...prev, timeRange }));
  }, []);

  const updateBranch = useCallback((branchId?: string) => {
    setCurrentConfig(prev => ({ ...prev, branchId }));
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchData();

    const interval = currentConfig.refreshInterval
      ? setInterval(fetchData, currentConfig.refreshInterval)
      : null;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchData, currentConfig.refreshInterval]);

  // Refetch when config changes
  useEffect(() => {
    fetchData();
  }, [currentConfig.companyId, currentConfig.branchId, currentConfig.timeRange]);

  return {
    ...state,
    refetch,
    updateTimeRange,
    updateBranch
  };
};

// Specific analytics hooks
export const useOrderAnalytics = (config: AnalyticsConfig) => {
  return useAnalytics('/api/analytics/orders', {
    ...config,
    refreshInterval: config.refreshInterval || 300000, // 5 minutes
    realTime: true
  });
};

export const useProviderMetrics = (config: AnalyticsConfig) => {
  return useAnalytics('/api/analytics/provider-metrics', {
    ...config,
    refreshInterval: config.refreshInterval || 60000, // 1 minute
    realTime: true
  });
};

export const useRevenueAnalytics = (config: AnalyticsConfig) => {
  return useAnalytics('/api/analytics/revenue', {
    ...config,
    refreshInterval: config.refreshInterval || 300000, // 5 minutes
    realTime: true
  });
};

export const useFraudDetection = (config: AnalyticsConfig) => {
  return useAnalytics('/api/analytics/fraud-detection', {
    ...config,
    refreshInterval: config.refreshInterval || 30000, // 30 seconds
    realTime: true
  });
};

export const usePerformanceMetrics = (config: AnalyticsConfig) => {
  return useAnalytics('/api/analytics/performance', {
    ...config,
    refreshInterval: config.refreshInterval || 120000, // 2 minutes
    realTime: true
  });
};

// Aggregated dashboard data
export const useDashboardAnalytics = (config: AnalyticsConfig) => {
  const orderAnalytics = useOrderAnalytics(config);
  const providerMetrics = useProviderMetrics(config);
  const revenueAnalytics = useRevenueAnalytics(config);
  const fraudDetection = useFraudDetection(config);

  return {
    orders: orderAnalytics,
    providers: providerMetrics,
    revenue: revenueAnalytics,
    fraud: fraudDetection,
    loading: orderAnalytics.loading || providerMetrics.loading || revenueAnalytics.loading || fraudDetection.loading,
    error: orderAnalytics.error || providerMetrics.error || revenueAnalytics.error || fraudDetection.error,
    refetchAll: async () => {
      await Promise.all([
        orderAnalytics.refetch(),
        providerMetrics.refetch(),
        revenueAnalytics.refetch(),
        fraudDetection.refetch()
      ]);
    }
  };
};