import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, throttle } from 'lodash';

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    componentRenders: 0,
    lastUpdate: Date.now(),
  });

  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentRenders: prev.componentRenders + 1,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        lastUpdate: Date.now(),
      }));
    };
  });

  return metrics;
};

// Virtual scrolling for large lists
interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualScroll = <T>(
  items: T[],
  options: VirtualScrollOptions
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const { itemHeight, containerHeight, overscan = 5 } = options;

  const visibleItems = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + overscan,
      items.length
    );

    const adjustedStartIndex = Math.max(0, startIndex - overscan);

    return {
      items: items.slice(adjustedStartIndex, endIndex),
      startIndex: adjustedStartIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: adjustedStartIndex * itemHeight,
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback(
    throttle((event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    }, 16), // ~60fps
    []
  );

  return {
    visibleItems,
    handleScroll,
    containerStyle: {
      height: containerHeight,
      overflowY: 'auto' as const,
    },
    contentStyle: {
      height: visibleItems.totalHeight,
      position: 'relative' as const,
    },
    itemStyle: {
      position: 'absolute' as const,
      top: visibleItems.offsetY,
      width: '100%',
    },
  };
};

// Lazy loading with intersection observer
export const useLazyLoading = (
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isIntersecting) {
          setIsIntersecting(true);
          callback();
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [callback, isIntersecting, options]);

  return { targetRef, isIntersecting };
};

// Optimized search with debouncing
export const useOptimizedSearch = <T>(
  items: T[],
  searchFunction: (items: T[], query: string) => T[],
  delay: number = 300
) => {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      setIsSearching(true);

      // Use requestIdleCallback for non-blocking search
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          const results = searchFunction(items, searchQuery);
          setFilteredItems(results);
          setIsSearching(false);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          const results = searchFunction(items, searchQuery);
          setFilteredItems(results);
          setIsSearching(false);
        }, 0);
      }
    }, delay),
    [items, searchFunction, delay]
  );

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredItems(items);
      setIsSearching(false);
    } else {
      debouncedSearch(query);
    }

    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch, items]);

  return {
    query,
    setQuery,
    filteredItems,
    isSearching,
  };
};

// Memory optimization for large datasets
export const useMemoryOptimization = <T>(
  data: T[],
  maxItems: number = 1000
) => {
  const memoizedData = useMemo(() => {
    if (data.length <= maxItems) {
      return data;
    }

    // Keep most recent items
    return data.slice(-maxItems);
  }, [data, maxItems]);

  return memoizedData;
};

// Image lazy loading and optimization
export const useImageOptimization = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const preloadImage = useCallback((src: string): Promise<void> => {
    if (loadedImages.has(src) || imageCache.current.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCache.current.set(src, img);
        setLoadedImages(prev => new Set(prev).add(src));
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }, [loadedImages]);

  const getOptimizedImageUrl = useCallback((
    src: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ) => {
    const { width, height, quality = 80, format = 'webp' } = options;

    // Build optimized URL (adjust for your image optimization service)
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('q', quality.toString());
    params.append('f', format);

    return `${src}?${params.toString()}`;
  }, []);

  const clearImageCache = useCallback(() => {
    imageCache.current.clear();
    setLoadedImages(new Set());
  }, []);

  return {
    preloadImage,
    getOptimizedImageUrl,
    clearImageCache,
    isImageLoaded: (src: string) => loadedImages.has(src),
  };
};

// Batch API requests
export const useBatchRequests = <T, R>(
  requestFunction: (items: T[]) => Promise<R[]>,
  batchSize: number = 50
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const batchProcess = useCallback(async (items: T[]): Promise<R[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const results: R[] = [];

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await requestFunction(batch);
        results.push(...batchResults);

        // Small delay between batches to prevent overwhelming the server
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return results;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [requestFunction, batchSize]);

  return { batchProcess, isLoading, error };
};

// Web Workers for heavy computations
export const useWebWorker = <T, R>(
  workerFunction: (data: T) => R
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<R | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const processData = useCallback(async (data: T): Promise<R> => {
    setIsProcessing(true);
    setError(null);

    return new Promise((resolve, reject) => {
      try {
        // Create worker from function
        const workerCode = `
          self.onmessage = function(e) {
            try {
              const result = (${workerFunction.toString()})(e.data);
              self.postMessage({ success: true, result });
            } catch (error) {
              self.postMessage({ success: false, error: error.message });
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        worker.onmessage = (e) => {
          const { success, result, error } = e.data;

          if (success) {
            setResult(result);
            resolve(result);
          } else {
            const err = new Error(error);
            setError(err);
            reject(err);
          }

          worker.terminate();
          URL.revokeObjectURL(blob);
          setIsProcessing(false);
        };

        worker.onerror = (err) => {
          const error = new Error(`Worker error: ${err.message}`);
          setError(error);
          reject(error);
          worker.terminate();
          setIsProcessing(false);
        };

        worker.postMessage(data);
      } catch (err) {
        setError(err as Error);
        reject(err);
        setIsProcessing(false);
      }
    });
  }, [workerFunction]);

  return { processData, isProcessing, result, error };
};

// Component state optimization
export const useOptimizedState = <T>(
  initialState: T,
  shouldUpdate?: (prev: T, next: T) => boolean
) => {
  const [state, setState] = useState(initialState);

  const optimizedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState;

      if (shouldUpdate && !shouldUpdate(prev, next)) {
        return prev;
      }

      return next;
    });
  }, [shouldUpdate]);

  return [state, optimizedSetState] as const;
};

// Performance-aware effect hook
export const usePerformanceAwareEffect = (
  effect: () => void | (() => void),
  deps: React.DependencyList,
  options: {
    priority?: 'high' | 'low';
    timeout?: number;
  } = {}
) => {
  const { priority = 'low', timeout = 5000 } = options;

  useEffect(() => {
    let cleanup: (() => void) | void;

    const runEffect = () => {
      cleanup = effect();
    };

    if (priority === 'high') {
      runEffect();
    } else {
      // Use scheduling API for low priority effects
      if ('scheduler' in window && (window as any).scheduler.postTask) {
        (window as any).scheduler.postTask(runEffect, { priority: 'background' });
      } else if ('requestIdleCallback' in window) {
        const id = requestIdleCallback(runEffect, { timeout });
        return () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(runEffect, 0);
        return () => clearTimeout(id);
      }
    }

    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, deps);
};