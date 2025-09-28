// Menu Builder Performance Optimization Hook
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  totalProducts: number;
  visibleProducts: number;
}

interface OptimizationOptions {
  debounceSearchMs?: number;
  throttleScrollMs?: number;
  virtualizationOverscan?: number;
  enableLazyLoading?: boolean;
  enableMemoization?: boolean;
  maxCacheSize?: number;
}

export const useMenuBuilderOptimization = (options: OptimizationOptions = {}) => {
  const {
    debounceSearchMs = 300,
    throttleScrollMs = 16,
    virtualizationOverscan = 5,
    enableLazyLoading = true,
    enableMemoization = true,
    maxCacheSize = 1000
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    interactionTime: 0,
    memoryUsage: 0,
    totalProducts: 0,
    visibleProducts: 0
  });

  const cacheRef = useRef<Map<string, any>>(new Map());
  const renderTimestampRef = useRef<number>(0);

  // Performance monitoring
  const startRenderTiming = useCallback(() => {
    renderTimestampRef.current = performance.now();
  }, []);

  const endRenderTiming = useCallback(() => {
    const renderTime = performance.now() - renderTimestampRef.current;
    metricsRef.current.renderTime = renderTime;

    // Log performance warnings
    if (renderTime > 100) {
      console.warn(`🐌 Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }, []);

  // Memory management
  const cleanupCache = useCallback(() => {
    const cache = cacheRef.current;
    if (cache.size > maxCacheSize) {
      const entriesToDelete = cache.size - Math.floor(maxCacheSize * 0.8);
      const iterator = cache.keys();

      for (let i = 0; i < entriesToDelete; i++) {
        const key = iterator.next().value;
        if (key) cache.delete(key);
      }
    }
  }, [maxCacheSize]);

  // Optimized search with debouncing
  const createDebouncedSearch = useCallback(
    (searchFunction: (query: string) => void) => {
      return debounce(searchFunction, debounceSearchMs);
    },
    [debounceSearchMs]
  );

  // Optimized scroll handling with throttling
  const createThrottledScroll = useCallback(
    (scrollFunction: (event: Event) => void) => {
      return throttle(scrollFunction, throttleScrollMs);
    },
    [throttleScrollMs]
  );

  // Memoized selector functions
  const createMemoizedSelector = useCallback(
    <T, R>(selectorFn: (data: T) => R, keyFn: (data: T) => string) => {
      if (!enableMemoization) return selectorFn;

      return (data: T): R => {
        const key = keyFn(data);
        const cache = cacheRef.current;

        if (cache.has(key)) {
          return cache.get(key);
        }

        const result = selectorFn(data);
        cache.set(key, result);
        cleanupCache();

        return result;
      };
    },
    [enableMemoization, cleanupCache]
  );

  // Virtualization optimization
  const virtualizationConfig = useMemo(() => ({
    overscan: virtualizationOverscan,
    increaseViewportBy: {
      top: 200 * virtualizationOverscan,
      bottom: 200 * virtualizationOverscan
    },
    scrollSeekConfiguration: {
      enter: (velocity: number) => Math.abs(velocity) > 200,
      exit: (velocity: number) => Math.abs(velocity) < 30
    }
  }), [virtualizationOverscan]);

  // Lazy loading utilities
  const createIntersectionObserver = useCallback(
    (callback: (entries: IntersectionObserverEntry[]) => void) => {
      if (!enableLazyLoading || typeof window === 'undefined') {
        return null;
      }

      return new IntersectionObserver(callback, {
        rootMargin: '50px',
        threshold: 0.1
      });
    },
    [enableLazyLoading]
  );

  // Image optimization
  const optimizeImageLoading = useCallback(
    (src: string, width: number, height: number) => {
      if (!enableLazyLoading) return src;

      // Generate optimized image URLs based on dimensions
      const params = new URLSearchParams({
        w: width.toString(),
        h: height.toString(),
        q: '80', // Quality
        f: 'webp' // Format
      });

      return `${src}?${params.toString()}`;
    },
    [enableLazyLoading]
  );

  // Component optimization utilities
  const optimizationUtils = useMemo(() => ({
    // Batch state updates
    batchUpdates: (updates: (() => void)[]) => {
      updates.forEach(update => update());
    },

    // Optimize component re-renders
    shouldComponentUpdate: (prevProps: any, nextProps: any, keys: string[]) => {
      return keys.some(key => prevProps[key] !== nextProps[key]);
    },

    // Create stable references
    createStableRef: <T>(value: T, deps: any[]): T => {
      return useMemo(() => value, deps);
    },

    // Performance tracking
    trackInteraction: (interactionName: string, duration: number) => {
      metricsRef.current.interactionTime = duration;

      if (duration > 50) {
        console.warn(`🐌 Slow interaction: ${interactionName} took ${duration.toFixed(2)}ms`);
      }
    }
  }), []);

  // Memory usage monitoring
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  // Performance reporting
  const getPerformanceReport = useCallback(() => {
    const metrics = metricsRef.current;
    const cacheSize = cacheRef.current.size;

    return {
      ...metrics,
      cacheSize,
      cacheHitRatio: cacheSize > 0 ? (cacheSize / maxCacheSize) * 100 : 0,
      recommendations: [
        ...(metrics.renderTime > 100 ? ['Consider reducing component complexity or implementing more aggressive memoization'] : []),
        ...(metrics.interactionTime > 50 ? ['Optimize event handlers and state updates'] : []),
        ...(metrics.memoryUsage > 100 ? ['Monitor memory usage and implement cleanup strategies'] : []),
        ...(cacheSize > maxCacheSize * 0.8 ? ['Cache is near capacity, consider increasing maxCacheSize'] : [])
      ]
    };
  }, [maxCacheSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  return {
    // Performance monitoring
    startRenderTiming,
    endRenderTiming,
    getPerformanceReport,

    // Optimization creators
    createDebouncedSearch,
    createThrottledScroll,
    createMemoizedSelector,
    createIntersectionObserver,

    // Utilities
    optimizeImageLoading,
    virtualizationConfig,
    optimizationUtils,

    // Cache management
    clearCache: () => cacheRef.current.clear(),
    getCacheSize: () => cacheRef.current.size,

    // Performance metrics (read-only)
    metrics: metricsRef.current
  };
};

// Performance HOC for components
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  options?: OptimizationOptions
) => {
  const OptimizedComponent = React.memo((props: P) => {
    const { startRenderTiming, endRenderTiming } = useMenuBuilderOptimization(options);

    useEffect(() => {
      startRenderTiming();
      return () => endRenderTiming();
    });

    return <Component {...props} />;
  });

  OptimizedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;

  return OptimizedComponent;
};

// Performance monitoring decorator
export const trackPerformance = (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = method.apply(this, args);
    const end = performance.now();

    console.log(`🔍 Performance: ${propertyName} executed in ${(end - start).toFixed(2)}ms`);

    return result;
  };

  return descriptor;
};