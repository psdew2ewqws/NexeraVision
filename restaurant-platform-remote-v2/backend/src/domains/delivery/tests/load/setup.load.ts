import 'reflect-metadata';
import { config } from 'dotenv';

// Load environment variables for load tests
config({ path: '.env.load' });

// Global load test setup
beforeAll(async () => {
  // Set load test environment
  process.env.NODE_ENV = 'load_test';
  
  // Set timezone for consistent testing
  process.env.TZ = 'UTC';
  
  // Increase timeout for load tests
  jest.setTimeout(300000); // 5 minutes
  
  // Configure console output for load tests
  const originalConsole = { ...console };
  global.console = {
    ...console,
    log: (message, ...args) => {
      // Only show important load test messages
      if (typeof message === 'string' && (
        message.includes('🚀') ||
        message.includes('📊') ||
        message.includes('⏱️') ||
        message.includes('💾') ||
        message.includes('🔥') ||
        message.includes('📈') ||
        message.includes('♻️') ||
        message.includes('Results:')
      )) {
        originalConsole.log(message, ...args);
      }
    },
    info: jest.fn(),
    warn: originalConsole.warn,
    error: originalConsole.error,
    debug: jest.fn()
  };
  
  // Set up performance monitoring
  await setupPerformanceMonitoring();
  
  // Initialize load test metrics collection
  global.loadTestMetrics = {
    startTime: Date.now(),
    totalOrders: 0,
    successfulOrders: 0,
    failedOrders: 0,
    averageResponseTime: 0,
    peakMemoryUsage: 0,
    peakThroughput: 0,
    providerStats: new Map(),
    errorStats: new Map()
  };
  
  console.log('🚀 Load test environment initialized');
  console.log(`📊 Target capacity: 50,000+ orders/day`);
  console.log(`⚙️ Max workers: 1 (sequential execution)`);
  console.log(`⏱️ Test timeout: 5 minutes`);
  
}, 30000);

afterAll(async () => {
  // Generate load test summary
  await generateLoadTestSummary();
  
  // Cleanup performance monitoring
  await cleanupPerformanceMonitoring();
  
  // Final memory cleanup
  if (global.gc) {
    global.gc();
  }
  
  console.log('🏁 Load test environment cleaned up');
}, 30000);

// Performance monitoring setup
async function setupPerformanceMonitoring() {
  // Start memory monitoring
  global.memoryMonitorInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
    
    if (heapUsedMB > global.loadTestMetrics.peakMemoryUsage) {
      global.loadTestMetrics.peakMemoryUsage = heapUsedMB;
    }
  }, 1000); // Every second
  
  // Set up process monitoring
  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning') {
      console.warn('⚠️ Max listeners warning detected - potential memory leak');
    }
  });
  
  // Monitor for unhandled promises
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection in load test:', reason);
  });
}

async function cleanupPerformanceMonitoring() {
  if (global.memoryMonitorInterval) {
    clearInterval(global.memoryMonitorInterval);
  }
}

async function generateLoadTestSummary() {
  const metrics = global.loadTestMetrics;
  const duration = (Date.now() - metrics.startTime) / 1000;
  const successRate = metrics.totalOrders > 0 ? (metrics.successfulOrders / metrics.totalOrders) * 100 : 0;
  const averageThroughput = metrics.totalOrders / duration;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOAD TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`🔢 Total Orders Processed: ${metrics.totalOrders.toLocaleString()}`);
  console.log(`✅ Successful Orders: ${metrics.successfulOrders.toLocaleString()} (${successRate.toFixed(1)}%)`);
  console.log(`❌ Failed Orders: ${metrics.failedOrders.toLocaleString()}`);
  console.log(`⏱️ Total Duration: ${duration.toFixed(1)} seconds`);
  console.log(`🚀 Average Throughput: ${averageThroughput.toFixed(1)} orders/second`);
  console.log(`🏔️ Peak Throughput: ${metrics.peakThroughput.toFixed(1)} orders/second`);
  console.log(`💾 Peak Memory Usage: ${metrics.peakMemoryUsage.toFixed(1)} MB`);
  console.log(`📈 Average Response Time: ${metrics.averageResponseTime.toFixed(0)} ms`);
  
  if (metrics.providerStats.size > 0) {
    console.log('\n📡 PROVIDER STATISTICS:');
    for (const [provider, stats] of metrics.providerStats) {
      const providerSuccessRate = (stats.successful / stats.total) * 100;
      console.log(`  ${provider}: ${stats.successful}/${stats.total} (${providerSuccessRate.toFixed(1)}%)`);
    }
  }
  
  if (metrics.errorStats.size > 0) {
    console.log('\n🚨 ERROR BREAKDOWN:');
    for (const [errorType, count] of metrics.errorStats) {
      console.log(`  ${errorType}: ${count}`);
    }
  }
  
  // Calculate projected daily capacity
  const projectedDaily = averageThroughput * 86400 * (successRate / 100); // 86400 seconds in a day
  console.log(`\n🎯 PROJECTED DAILY CAPACITY: ${projectedDaily.toFixed(0).toLocaleString()} orders/day`);
  
  if (projectedDaily >= 50000) {
    console.log('✅ TARGET ACHIEVED: System can handle 50k+ orders/day');
  } else {
    console.log('⚠️ TARGET NOT MET: System capacity below 50k orders/day target');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Enhanced global utilities for load testing
global.recordOrderMetric = (success: boolean, responseTime: number, provider?: string, error?: string) => {
  const metrics = global.loadTestMetrics;
  
  metrics.totalOrders++;
  if (success) {
    metrics.successfulOrders++;
  } else {
    metrics.failedOrders++;
  }
  
  // Update average response time
  metrics.averageResponseTime = (
    (metrics.averageResponseTime * (metrics.totalOrders - 1) + responseTime) / metrics.totalOrders
  );
  
  // Track provider stats
  if (provider) {
    if (!metrics.providerStats.has(provider)) {
      metrics.providerStats.set(provider, { total: 0, successful: 0 });
    }
    const providerStats = metrics.providerStats.get(provider);
    providerStats.total++;
    if (success) {
      providerStats.successful++;
    }
  }
  
  // Track error stats
  if (!success && error) {
    const errorCount = metrics.errorStats.get(error) || 0;
    metrics.errorStats.set(error, errorCount + 1);
  }
};

global.recordThroughputPeak = (throughput: number) => {
  if (throughput > global.loadTestMetrics.peakThroughput) {
    global.loadTestMetrics.peakThroughput = throughput;
  }
};

global.createLoadTestBatch = <T>(
  items: T[],
  batchSize: number
): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
};

global.executeBatchWithConcurrency = async <T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> => {
  const results: R[] = [];
  const batches = global.createLoadTestBatch(items, concurrency);
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(item => operation(item))
    );
    results.push(...batchResults);
  }
  
  return results;
};

global.measureThroughput = <T>(
  count: number,
  startTime: number,
  endTime?: number
): number => {
  const duration = ((endTime || Date.now()) - startTime) / 1000;
  return count / duration;
};

global.waitForSystemStabilization = async (
  delayMs: number = 2000
): Promise<void> => {
  console.log(`⏳ Waiting ${delayMs}ms for system stabilization...`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
};

global.simulateRealisticDelay = (): Promise<void> => {
  // Simulate realistic network delays (50-200ms)
  const delay = Math.floor(Math.random() * 150) + 50;
  return new Promise(resolve => setTimeout(resolve, delay));
};

global.createProgressTracker = (total: number, label: string = 'Progress') => {
  let completed = 0;
  const updateInterval = Math.max(1, Math.floor(total / 20)); // Update every 5%
  
  return {
    update: (increment: number = 1) => {
      completed += increment;
      if (completed % updateInterval === 0 || completed === total) {
        const percentage = (completed / total * 100).toFixed(1);
        console.log(`📈 ${label}: ${completed}/${total} (${percentage}%)`);
      }
    },
    complete: () => {
      completed = total;
      console.log(`✅ ${label}: ${completed}/${total} (100.0%)`);
    }
  };
};

// Memory monitoring utilities
global.checkMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / (1024 * 1024)),
    heapTotal: Math.round(usage.heapTotal / (1024 * 1024)),
    rss: Math.round(usage.rss / (1024 * 1024)),
    external: Math.round(usage.external / (1024 * 1024))
  };
};

global.logMemoryUsage = (label: string) => {
  const memory = global.checkMemoryUsage();
  console.log(`💾 ${label} - Heap: ${memory.heapUsed}/${memory.heapTotal}MB, RSS: ${memory.rss}MB`);
};

// Type declarations for global load test utilities
declare global {
  var loadTestMetrics: {
    startTime: number;
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    averageResponseTime: number;
    peakMemoryUsage: number;
    peakThroughput: number;
    providerStats: Map<string, { total: number; successful: number }>;
    errorStats: Map<string, number>;
  };
  
  var memoryMonitorInterval: NodeJS.Timeout;
  
  function recordOrderMetric(success: boolean, responseTime: number, provider?: string, error?: string): void;
  function recordThroughputPeak(throughput: number): void;
  function createLoadTestBatch<T>(items: T[], batchSize: number): T[][];
  function executeBatchWithConcurrency<T, R>(items: T[], operation: (item: T) => Promise<R>, concurrency?: number): Promise<R[]>;
  function measureThroughput(count: number, startTime: number, endTime?: number): number;
  function waitForSystemStabilization(delayMs?: number): Promise<void>;
  function simulateRealisticDelay(): Promise<void>;
  function createProgressTracker(total: number, label?: string): { update: (increment?: number) => void; complete: () => void };
  function checkMemoryUsage(): { heapUsed: number; heapTotal: number; rss: number; external: number };
  function logMemoryUsage(label: string): void;
}