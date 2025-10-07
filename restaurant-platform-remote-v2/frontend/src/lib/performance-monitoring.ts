/**
 * Performance Monitoring Library
 *
 * Comprehensive performance tracking for the Restaurant Platform
 * Monitors Web Vitals, custom metrics, and provides real-time performance insights
 */

import React from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  page: string;
  metadata?: Record<string, any>;
}

const PERFORMANCE_ENDPOINT = '/api/analytics/performance';
const isDevelopment = process.env.NODE_ENV === 'development';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift (score, not ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
};

/**
 * Get performance rating based on metric value and thresholds
 */
function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send performance metrics to analytics backend
 */
function sendToAnalytics(metric: PerformanceMetric) {
  // Send to backend analytics (non-blocking)
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    const data = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: window.location.pathname,
      timestamp: Date.now(),
      navigationType: metric.navigationType,
      userAgent: navigator.userAgent,
    });

    navigator.sendBeacon(PERFORMANCE_ENDPOINT, data);
  } else {
    // Fallback to fetch for browsers without sendBeacon
    fetch(PERFORMANCE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: Date.now()
      }),
      keepalive: true // Allow request to complete even if page unloads
    }).catch(console.error);
  }

  // Log to console in development
  if (isDevelopment) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(
      `${emoji} [${metric.rating.toUpperCase()}] ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'}`,
      metric
    );
  }
}

/**
 * Process Web Vitals metric and send to analytics
 */
function handleWebVital(metric: Metric) {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'navigate'
  };

  sendToAnalytics(performanceMetric);
}

/**
 * Initialize performance monitoring
 * Sets up Web Vitals tracking for the application
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals
  onCLS(handleWebVital);
  onINP(handleWebVital);
  onFCP(handleWebVital);
  onLCP(handleWebVital);
  onTTFB(handleWebVital);

  if (isDevelopment) {
    console.log('🔍 Performance monitoring initialized');
  }
}

/**
 * Custom performance markers for specific features
 */
export const PerformanceMarkers = {
  // Menu Builder markers
  menuBuilderStart: () => {
    performance.mark('menu-builder-start');
  },

  menuBuilderProductsLoaded: () => {
    performance.mark('menu-builder-products-loaded');
    performance.measure(
      'menu-builder-products-load-time',
      'menu-builder-start',
      'menu-builder-products-loaded'
    );

    const measure = performance.getEntriesByName('menu-builder-products-load-time')[0];
    if (measure) {
      const customMetric: CustomMetric = {
        name: 'menu-builder-products-load-time',
        value: measure.duration,
        timestamp: Date.now(),
        page: window.location.pathname
      };

      if (isDevelopment) {
        console.log(`📊 Products loaded in ${measure.duration.toFixed(2)}ms`);
      }

      // Send custom metric
      sendCustomMetric(customMetric);
    }
  },

  menuBuilderRenderComplete: () => {
    performance.mark('menu-builder-render-complete');
    performance.measure(
      'menu-builder-total-time',
      'menu-builder-start',
      'menu-builder-render-complete'
    );

    const measure = performance.getEntriesByName('menu-builder-total-time')[0];
    if (measure && isDevelopment) {
      console.log(`🎨 Menu Builder total render time: ${measure.duration.toFixed(2)}ms`);
    }
  },

  // API call performance
  apiCallStart: (endpoint: string) => {
    performance.mark(`api-call-start-${endpoint}`);
  },

  apiCallEnd: (endpoint: string) => {
    const startMark = `api-call-start-${endpoint}`;
    const endMark = `api-call-end-${endpoint}`;
    const measureName = `api-call-${endpoint}`;

    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    if (measure && isDevelopment) {
      const rating = measure.duration < 200 ? '✅' : measure.duration < 500 ? '⚠️' : '❌';
      console.log(`${rating} API: ${endpoint} - ${measure.duration.toFixed(2)}ms`);
    }

    // Cleanup marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  },

  // Component render performance
  componentRenderStart: (componentName: string) => {
    performance.mark(`component-render-start-${componentName}`);
  },

  componentRenderEnd: (componentName: string) => {
    const startMark = `component-render-start-${componentName}`;
    const endMark = `component-render-end-${componentName}`;
    const measureName = `component-render-${componentName}`;

    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    if (measure && isDevelopment && measure.duration > 16) {
      console.warn(`⚠️ Slow render: ${componentName} - ${measure.duration.toFixed(2)}ms (target: <16ms)`);
    }

    // Cleanup
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  }
};

/**
 * Send custom performance metric to analytics
 */
function sendCustomMetric(metric: CustomMetric) {
  fetch(PERFORMANCE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'custom',
      ...metric
    }),
    keepalive: true
  }).catch(console.error);
}

/**
 * Get current performance metrics snapshot
 */
export function getPerformanceSnapshot(): {
  navigation: PerformanceNavigationTiming | null;
  paint: PerformancePaintTiming[];
  resources: PerformanceResourceTiming[];
} {
  if (typeof window === 'undefined' || !window.performance) {
    return { navigation: null, paint: [], resources: [] };
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint') as PerformancePaintTiming[];
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return { navigation, paint, resources };
}

/**
 * Log performance summary to console (development only)
 */
export function logPerformanceSummary() {
  if (!isDevelopment || typeof window === 'undefined') return;

  const { navigation, paint } = getPerformanceSnapshot();

  console.group('📊 Performance Summary');

  if (navigation) {
    console.log(`DNS Lookup: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`);
    console.log(`TCP Connection: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`);
    console.log(`Request Time: ${(navigation.responseEnd - navigation.requestStart).toFixed(2)}ms`);
    console.log(`DOM Content Loaded: ${navigation.domContentLoadedEventEnd.toFixed(2)}ms`);
    console.log(`Page Load Complete: ${navigation.loadEventEnd.toFixed(2)}ms`);
  }

  paint.forEach(entry => {
    console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
  });

  console.groupEnd();
}

/**
 * Monitor component re-renders (for development)
 */
export function useRenderCount(componentName: string) {
  if (!isDevelopment) return;

  const renderCount = React.useRef(0);
  renderCount.current++;

  React.useEffect(() => {
    if (renderCount.current > 10) {
      console.warn(`⚠️ ${componentName} has re-rendered ${renderCount.current} times`);
    }
  });
}

// Polyfill for web-vitals if needed
declare global {
  interface Window {
    webVitals?: any;
  }
}

// Export types
export type { PerformanceMetric, CustomMetric };
