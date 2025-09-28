import { useState, useEffect, useCallback } from 'react';
import { WebhookApi } from '../lib/webhook-api';
import {
  WebhookConfig,
  WebhookLog,
  WebhookStats,
  WebhookFilters,
  RetryQueueItem,
  WebhookMetrics,
  WebhookHealthStatus,
  SupportedProvider
} from '../types/webhook';

export const useWebhooks = (clientId?: string) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WebhookApi.getWebhooks(clientId);
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const updateWebhook = useCallback(async (clientId: string, config: Partial<WebhookConfig>) => {
    try {
      const updated = await WebhookApi.updateWebhookConfig(clientId, config);
      setWebhooks(prev => prev.map(w => w.clientId === clientId ? updated : w));
      return updated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update webhook');
    }
  }, []);

  const deleteWebhook = useCallback(async (webhookId: string) => {
    try {
      await WebhookApi.deleteWebhook(webhookId);
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  }, []);

  return {
    webhooks,
    loading,
    error,
    refetch: fetchWebhooks,
    updateWebhook,
    deleteWebhook
  };
};

export const useWebhookLogs = (filters: WebhookFilters = {}) => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WebhookApi.getWebhookLogs(filters);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const retryWebhook = useCallback(async (logId: string) => {
    try {
      await WebhookApi.retryWebhook(logId);
      // Refresh logs after retry
      await fetchLogs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to retry webhook');
    }
  }, [fetchLogs]);

  return {
    logs,
    total,
    loading,
    error,
    refetch: fetchLogs,
    retryWebhook
  };
};

export const useWebhookStats = (filters: {
  provider?: SupportedProvider;
  clientId?: string;
  period?: '1h' | '24h' | '7d' | '30d';
} = {}) => {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WebhookApi.getWebhookStats(filters);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook stats');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

export const useWebhookMetrics = (filters: {
  provider?: SupportedProvider;
  clientId?: string;
  period?: '1h' | '24h' | '7d' | '30d';
} = {}) => {
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WebhookApi.getWebhookMetrics(filters);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook metrics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
};

export const useRetryQueue = (filters: {
  provider?: SupportedProvider;
  clientId?: string;
  status?: 'pending' | 'processing' | 'failed' | 'abandoned';
  limit?: number;
  offset?: number;
} = {}) => {
  const [items, setItems] = useState<RetryQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WebhookApi.getRetryQueue(filters);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch retry queue');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return {
    items,
    total,
    loading,
    error,
    refetch: fetchQueue
  };
};

export const useWebhookHealth = () => {
  const [health, setHealth] = useState<WebhookHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WebhookApi.getHealthStatus();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhook health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    // Auto-refresh health status every 30 seconds
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    health,
    loading,
    error,
    refetch: fetchHealth
  };
};

export const useRealtimeWebhookEvents = (onEvent: (event: WebhookLog) => void) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = WebhookApi.subscribeToEvents(onEvent);

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };

      eventSource.onerror = () => {
        setConnected(false);
        setError('Connection to real-time events failed');
      };
    } catch (err) {
      setError('Failed to establish real-time connection');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      setConnected(false);
    };
  }, [onEvent]);

  return { connected, error };
};