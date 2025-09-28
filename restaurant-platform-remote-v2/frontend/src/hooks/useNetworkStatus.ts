import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

interface RetryState {
  attempt: number;
  maxAttempts: number;
  isRetrying: boolean;
  nextRetryIn: number;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    effectiveType: null,
    downlink: null,
    rtt: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection;

      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        isSlowConnection: connection ? (
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g' ||
          connection.downlink < 1
        ) : false,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null
      }));
    };

    updateNetworkStatus();

    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}

export function useRetryLogic(maxAttempts: number = 3) {
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    maxAttempts,
    isRetrying: false,
    nextRetryIn: 0
  });

  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Cap at 30 seconds
  }, []);

  const retry = useCallback(async (operation: () => Promise<any>): Promise<any> => {
    const attempt = retryState.attempt + 1;

    if (attempt > maxAttempts) {
      throw new Error(`Maximum retry attempts (${maxAttempts}) exceeded`);
    }

    setRetryState(prev => ({
      ...prev,
      attempt,
      isRetrying: true
    }));

    try {
      const result = await operation();

      // Success - reset retry state
      setRetryState({
        attempt: 0,
        maxAttempts,
        isRetrying: false,
        nextRetryIn: 0
      });

      return result;
    } catch (error) {
      console.log(`Retry attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt >= maxAttempts) {
        setRetryState(prev => ({
          ...prev,
          isRetrying: false
        }));
        throw error;
      }

      // Schedule next retry
      const delay = calculateDelay(attempt - 1);

      setRetryState(prev => ({
        ...prev,
        nextRetryIn: delay / 1000,
        isRetrying: true
      }));

      // Start countdown
      let countdown = Math.ceil(delay / 1000);
      const countdownInterval = setInterval(() => {
        countdown -= 1;
        setRetryState(prev => ({
          ...prev,
          nextRetryIn: countdown
        }));

        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      setCountdownTimer(countdownInterval);

      // Schedule retry
      const timeout = setTimeout(async () => {
        clearInterval(countdownInterval);
        setCountdownTimer(null);
        return retry(operation);
      }, delay);

      setRetryTimer(timeout);

      return new Promise((resolve, reject) => {
        // This will be resolved by the recursive retry call
      });
    }
  }, [retryState.attempt, maxAttempts, calculateDelay]);

  const reset = useCallback(() => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      setRetryTimer(null);
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }

    setRetryState({
      attempt: 0,
      maxAttempts,
      isRetrying: false,
      nextRetryIn: 0
    });
  }, [retryTimer, countdownTimer, maxAttempts]);

  const canRetry = retryState.attempt < maxAttempts;

  useEffect(() => {
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [retryTimer, countdownTimer]);

  return {
    retryState,
    retry,
    reset,
    canRetry
  };
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<Array<{
    id: string;
    operation: () => Promise<any>;
    timestamp: number;
    description: string;
  }>>([]);

  const networkStatus = useNetworkStatus();

  const addToQueue = useCallback((
    operation: () => Promise<any>,
    description: string = 'Operation'
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    setQueue(prev => [...prev, {
      id,
      operation,
      timestamp: Date.now(),
      description
    }]);

    return id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const processQueue = useCallback(async () => {
    if (!networkStatus.isOnline || queue.length === 0) return;

    const toProcess = [...queue];
    setQueue([]);

    for (const item of toProcess) {
      try {
        await item.operation();
        console.log(`Offline operation completed: ${item.description}`);
      } catch (error) {
        console.error(`Offline operation failed: ${item.description}`, error);
        // Re-add failed operations to queue
        setQueue(prev => [...prev, item]);
      }
    }
  }, [networkStatus.isOnline, queue]);

  // Process queue when coming back online
  useEffect(() => {
    if (networkStatus.isOnline && queue.length > 0) {
      const timer = setTimeout(processQueue, 1000); // Small delay to ensure connection is stable
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, queue.length, processQueue]);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
    queueSize: queue.length
  };
}

export default {
  useNetworkStatus,
  useRetryLogic,
  useOfflineQueue
};