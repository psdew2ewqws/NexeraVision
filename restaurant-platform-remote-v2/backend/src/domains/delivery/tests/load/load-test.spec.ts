import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DeliverySystem } from '../../delivery.system';
import { ProviderFactory } from '../../factory/provider.factory';
import { ProviderSelectionEngine } from '../../engines/provider-selection.engine';
import { FailoverEngine } from '../../engines/failover.engine';
import { DeliveryAnalyticsService } from '../../analytics/delivery-analytics.service';
import { ProviderConfig, StandardOrderFormat } from '../../interfaces/delivery-provider.interface';
import { performance } from 'perf_hooks';

describe('Delivery System Load Testing', () => {
  let deliverySystem: DeliverySystem;
  let mockAxios: MockAdapter;
  let testStartTime: number;
  
  const TARGET_ORDERS_PER_DAY = 50000;
  const TARGET_ORDERS_PER_HOUR = Math.ceil(TARGET_ORDERS_PER_DAY / 24);
  const TARGET_ORDERS_PER_MINUTE = Math.ceil(TARGET_ORDERS_PER_HOUR / 60);
  const TARGET_ORDERS_PER_SECOND = Math.ceil(TARGET_ORDERS_PER_MINUTE / 60);

  const mockConfigs: ProviderConfig[] = [
    {
      providerId: 'dhub-load-test',
      providerType: 'dhub',
      companyId: 'load-test-company',
      isActive: true,
      priority: 1,
      apiConfig: { baseUrl: 'https://api.dhub.jo', timeout: 5000, retryAttempts: 2, retryDelay: 500 },
      credentials: { username: 'load_test', password: 'test', merchantId: 'LOAD_TEST' },
      businessRules: { serviceFee: 2.5, coverageRadius: 15, operatingHours: { start: '00:00', end: '23:59' } }
    },
    {
      providerId: 'talabat-load-test',
      providerType: 'talabat',
      companyId: 'load-test-company',
      isActive: true,
      priority: 2,
      apiConfig: { baseUrl: 'https://api.talabat.com', timeout: 5000, retryAttempts: 2, retryDelay: 500 },
      credentials: { apiKey: 'load_test_key', restaurantId: 'LOAD_TEST', region: 'gulf' },
      businessRules: { serviceFee: 1.5, coverageRadius: 20, operatingHours: { start: '00:00', end: '23:59' } }
    },
    {
      providerId: 'careem-load-test',
      providerType: 'careem',
      companyId: 'load-test-company',
      isActive: true,
      priority: 3,
      apiConfig: { baseUrl: 'https://api.careem.com', timeout: 5000, retryAttempts: 2, retryDelay: 500 },
      credentials: { clientId: 'load_test', clientSecret: 'test', merchantId: 'LOAD_TEST' },
      businessRules: { serviceFee: 3.0, coverageRadius: 25, operatingHours: { start: '00:00', end: '23:59' } }
    }
  ];

  beforeAll(async () => {
    testStartTime = performance.now();
    
    mockAxios = new MockAdapter(axios, { delayResponse: 100 }); // Simulate network delay
    
    // Initialize delivery system
    const providerFactory = new ProviderFactory();
    const selectionEngine = new ProviderSelectionEngine();
    const failoverEngine = new FailoverEngine(providerFactory, selectionEngine);
    const analyticsService = new DeliveryAnalyticsService();
    
    deliverySystem = new DeliverySystem(providerFactory, selectionEngine, failoverEngine, analyticsService);
    
    // Mock authentication responses
    mockAxios.onPost('/oauth/token').reply(200, { access_token: 'load_test_token', expires_in: 3600 });
    mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
    mockAxios.onPost('/oauth2/token').reply(200, { access_token: 'load_test_token', expires_in: 7200 });
    
    await deliverySystem.initialize(mockConfigs);
    
    console.log(`🚀 Load testing initialized for ${TARGET_ORDERS_PER_DAY:,} orders/day capacity`);
    console.log(`📊 Target rates: ${TARGET_ORDERS_PER_HOUR:,}/hour, ${TARGET_ORDERS_PER_MINUTE}/minute, ${TARGET_ORDERS_PER_SECOND}/second`);
  }, 30000);

  afterAll(() => {
    mockAxios.restore();
    const totalTestTime = (performance.now() - testStartTime) / 1000;
    console.log(`⏱️ Total load testing time: ${totalTestTime.toFixed(2)} seconds`);
  });

  describe('High Volume Order Processing', () => {
    const createLoadTestOrder = (orderId: string): StandardOrderFormat => ({
      orderId,
      branchId: 'LOAD-TEST-BRANCH',
      companyId: 'load-test-company',
      customer: {
        name: `Customer ${orderId.split('-')[2]}`,
        phone: '+962791234567',
        email: `customer${orderId.split('-')[2]}@loadtest.com`
      },
      deliveryAddress: {
        street: `Street ${Math.floor(Math.random() * 1000)}`,
        city: 'Amman',
        area: 'Test Area',
        latitude: 31.9454 + (Math.random() - 0.5) * 0.1,
        longitude: 35.9284 + (Math.random() - 0.5) * 0.1
      },
      items: [
        {
          id: `ITEM-${Math.floor(Math.random() * 100)}`,
          name: `Item ${Math.floor(Math.random() * 50)}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Math.floor(Math.random() * 20) + 10
        }
      ],
      subtotal: Math.floor(Math.random() * 50) + 20,
      deliveryFee: 3.0,
      tax: 0,
      discount: 0,
      total: Math.floor(Math.random() * 50) + 23,
      paymentMethod: Math.random() > 0.5 ? 'cash' : 'card',
      priority: Math.random() > 0.8 ? 'urgent' : 'normal',
      estimatedPreparationTime: Math.floor(Math.random() * 30) + 15
    });

    beforeEach(() => {
      // Mock successful order responses with realistic response times
      const responseDelay = Math.floor(Math.random() * 200) + 50; // 50-250ms
      
      mockAxios.onPost('/api/v1/orders').reply(
        () => new Promise(resolve => setTimeout(() => resolve([201, {
          order_id: `DHUB-LOAD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          status: 'confirmed',
          estimated_delivery_time: new Date(Date.now() + 30 * 60000).toISOString()
        }]), responseDelay))
      );

      mockAxios.onPost('/v1/orders').reply(
        () => new Promise(resolve => setTimeout(() => resolve([201, {
          order_id: `TLB-LOAD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          status: 'confirmed',
          estimated_delivery_time: new Date(Date.now() + 35 * 60000).toISOString()
        }]), responseDelay))
      );

      mockAxios.onPost('/v1/delivery/premium/orders').reply(
        () => new Promise(resolve => setTimeout(() => resolve([201, {
          order_id: `CRM-LOAD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          status: 'confirmed',
          estimated_delivery_time: new Date(Date.now() + 25 * 60000).toISOString()
        }]), responseDelay))
      );

      // Mock coverage validation
      mockAxios.onGet(/.*coverage.*/).reply(200, {
        is_covered: true,
        delivery_fee: 3.0,
        estimated_delivery_time: 30
      });
    });

    it('should handle burst load of 100 concurrent orders', async () => {
      const batchSize = 100;
      const orders: StandardOrderFormat[] = [];
      
      // Generate test orders
      for (let i = 0; i < batchSize; i++) {
        orders.push(createLoadTestOrder(`BURST-LOAD-${Date.now()}-${i}`));
      }

      const startTime = performance.now();
      
      // Execute concurrent orders
      const promises = orders.map(order => 
        deliverySystem.createOrder(order).catch(error => ({
          success: false,
          error: error.message,
          orderId: order.orderId
        }))
      );

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      const successfulOrders = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failedOrders = results.length - successfulOrders;
      const throughput = (batchSize / (executionTime / 1000));

      console.log(`📈 Burst Load Results:`);
      console.log(`  Orders processed: ${batchSize}`);
      console.log(`  Successful: ${successfulOrders} (${((successfulOrders/batchSize)*100).toFixed(1)}%)`);
      console.log(`  Failed: ${failedOrders}`);
      console.log(`  Execution time: ${executionTime.toFixed(0)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(1)} orders/second`);

      expect(successfulOrders).toBeGreaterThan(batchSize * 0.95); // 95% success rate
      expect(executionTime).toBeLessThan(10000); // Under 10 seconds
      expect(throughput).toBeGreaterThan(TARGET_ORDERS_PER_SECOND * 2); // 2x target throughput
    }, 30000);

    it('should sustain high throughput over extended period', async () => {
      const testDuration = 30000; // 30 seconds
      const batchSize = 50;
      const batchInterval = 1000; // 1 second between batches
      
      const startTime = performance.now();
      const results: any[] = [];
      let totalOrders = 0;
      let successfulOrders = 0;

      while ((performance.now() - startTime) < testDuration) {
        const batchStartTime = performance.now();
        const orders: StandardOrderFormat[] = [];
        
        // Generate batch of orders
        for (let i = 0; i < batchSize; i++) {
          orders.push(createLoadTestOrder(`SUSTAINED-${Date.now()}-${totalOrders + i}`));
        }

        // Execute batch
        const batchPromises = orders.map(order => 
          deliverySystem.createOrder(order).catch(() => ({ success: false, orderId: order.orderId }))
        );

        const batchResults = await Promise.all(batchPromises);
        const batchSuccesses = batchResults.filter(r => r.success).length;
        
        totalOrders += batchSize;
        successfulOrders += batchSuccesses;
        
        const batchTime = performance.now() - batchStartTime;
        const batchThroughput = batchSize / (batchTime / 1000);
        
        results.push({
          batchNumber: results.length + 1,
          batchSize,
          successes: batchSuccesses,
          failures: batchSize - batchSuccesses,
          executionTime: batchTime,
          throughput: batchThroughput
        });

        // Wait for next batch interval
        const remainingTime = batchInterval - batchTime;
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }

      const totalTestTime = (performance.now() - startTime) / 1000;
      const overallThroughput = totalOrders / totalTestTime;
      const successRate = (successfulOrders / totalOrders) * 100;
      const averageBatchTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

      console.log(`📊 Sustained Load Results:`);
      console.log(`  Test duration: ${totalTestTime.toFixed(1)}s`);
      console.log(`  Total orders: ${totalOrders:,}`);
      console.log(`  Successful: ${successfulOrders:,} (${successRate.toFixed(1)}%)`);
      console.log(`  Overall throughput: ${overallThroughput.toFixed(1)} orders/second`);
      console.log(`  Average batch time: ${averageBatchTime.toFixed(0)}ms`);
      console.log(`  Batches executed: ${results.length}`);

      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(overallThroughput).toBeGreaterThan(TARGET_ORDERS_PER_SECOND); // Meet target throughput
      expect(averageBatchTime).toBeLessThan(2000); // Under 2 seconds per batch
    }, 60000);

    it('should handle daily volume simulation (scaled)', async () => {
      // Scale down daily volume for testing (simulate 1% of daily load)
      const scaledDailyTarget = Math.floor(TARGET_ORDERS_PER_DAY * 0.01); // 500 orders
      const batchSize = 25;
      const numberOfBatches = Math.ceil(scaledDailyTarget / batchSize);
      
      console.log(`📅 Daily Volume Simulation (1% scale):`);
      console.log(`  Target orders: ${scaledDailyTarget:,}`);
      console.log(`  Batch size: ${batchSize}`);
      console.log(`  Number of batches: ${numberOfBatches}`);

      const startTime = performance.now();
      const batchResults: any[] = [];
      let totalProcessed = 0;
      let totalSuccessful = 0;

      for (let batchNum = 0; batchNum < numberOfBatches; batchNum++) {
        const batchStartTime = performance.now();
        const currentBatchSize = Math.min(batchSize, scaledDailyTarget - totalProcessed);
        const orders: StandardOrderFormat[] = [];
        
        // Generate orders for this batch
        for (let i = 0; i < currentBatchSize; i++) {
          orders.push(createLoadTestOrder(`DAILY-${batchNum}-${i}-${Date.now()}`));
        }

        // Process batch with some concurrency
        const concurrencyLimit = 10;
        const chunks = [];
        for (let i = 0; i < orders.length; i += concurrencyLimit) {
          chunks.push(orders.slice(i, i + concurrencyLimit));
        }

        let batchSuccesses = 0;
        for (const chunk of chunks) {
          const chunkPromises = chunk.map(order => 
            deliverySystem.createOrder(order).catch(() => ({ success: false }))
          );
          
          const chunkResults = await Promise.all(chunkPromises);
          batchSuccesses += chunkResults.filter(r => r.success).length;
        }

        const batchEndTime = performance.now();
        const batchDuration = batchEndTime - batchStartTime;
        
        totalProcessed += currentBatchSize;
        totalSuccessful += batchSuccesses;
        
        batchResults.push({
          batchNumber: batchNum + 1,
          processed: currentBatchSize,
          successful: batchSuccesses,
          duration: batchDuration,
          throughput: currentBatchSize / (batchDuration / 1000)
        });

        // Progress logging every 10 batches
        if ((batchNum + 1) % 10 === 0) {
          console.log(`  Batch ${batchNum + 1}/${numberOfBatches}: ${totalSuccessful}/${totalProcessed} successful`);
        }

        // Small delay between batches to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const totalTime = (performance.now() - startTime) / 1000;
      const overallThroughput = totalProcessed / totalTime;
      const successRate = (totalSuccessful / totalProcessed) * 100;
      const averageBatchThroughput = batchResults.reduce((sum, r) => sum + r.throughput, 0) / batchResults.length;

      // Extrapolate to full daily capacity
      const projectedDailyThroughput = overallThroughput * 86400; // seconds in a day
      const projectedDailyCapacity = projectedDailyThroughput * (successRate / 100);

      console.log(`📊 Daily Volume Simulation Results:`);
      console.log(`  Orders processed: ${totalProcessed:,}`);
      console.log(`  Successful: ${totalSuccessful:,} (${successRate.toFixed(1)}%)`);
      console.log(`  Total time: ${totalTime.toFixed(1)}s`);
      console.log(`  Overall throughput: ${overallThroughput.toFixed(1)} orders/second`);
      console.log(`  Average batch throughput: ${averageBatchThroughput.toFixed(1)} orders/second`);
      console.log(`  Projected daily capacity: ${projectedDailyCapacity.toFixed(0):,} orders/day`);

      expect(successRate).toBeGreaterThan(95);
      expect(projectedDailyCapacity).toBeGreaterThan(TARGET_ORDERS_PER_DAY * 0.8); // 80% of target
      expect(overallThroughput).toBeGreaterThan(TARGET_ORDERS_PER_SECOND * 0.5); // 50% of target
    }, 120000);
  });

  describe('System Performance Under Load', () => {
    it('should maintain response times under load', async () => {
      const testOrders = 200;
      const responseTimes: number[] = [];
      const maxAcceptableResponseTime = 2000; // 2 seconds

      for (let i = 0; i < testOrders; i++) {
        const order = createLoadTestOrder(`RESPONSE-TIME-${i}-${Date.now()}`);
        
        const startTime = performance.now();
        const result = await deliverySystem.createOrder(order);
        const endTime = performance.now();
        
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);

        expect(result.success).toBe(true);
        expect(responseTime).toBeLessThan(maxAcceptableResponseTime);

        // Small delay to prevent overwhelming
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const medianResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)];
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
      const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];

      console.log(`⏱️ Response Time Analysis (${testOrders} orders):`);
      console.log(`  Average: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`  Median: ${medianResponseTime.toFixed(0)}ms`);
      console.log(`  95th percentile: ${p95ResponseTime.toFixed(0)}ms`);
      console.log(`  99th percentile: ${p99ResponseTime.toFixed(0)}ms`);

      expect(avgResponseTime).toBeLessThan(1000); // Under 1 second average
      expect(p95ResponseTime).toBeLessThan(1500); // 95% under 1.5 seconds
      expect(p99ResponseTime).toBeLessThan(maxAcceptableResponseTime); // 99% under 2 seconds
    }, 60000);

    it('should handle provider failures gracefully under load', async () => {
      const testOrders = 100;
      const failureRate = 0.3; // 30% failure rate

      // Mock intermittent failures for DHUB
      let dhubCallCount = 0;
      mockAxios.onPost('/api/v1/orders').reply(() => {
        dhubCallCount++;
        if (Math.random() < failureRate) {
          return [500, { error: 'service_unavailable' }];
        }
        return [201, {
          order_id: `DHUB-FAILOVER-${dhubCallCount}-${Date.now()}`,
          status: 'confirmed'
        }];
      });

      const startTime = performance.now();
      const results: any[] = [];

      const orderPromises = Array.from({ length: testOrders }, (_, i) => {
        const order = createLoadTestOrder(`FAILOVER-LOAD-${i}-${Date.now()}`);
        return deliverySystem.createOrderWithFailover(order, {
          enableFailover: true,
          maxFailoverAttempts: 2,
          preferredProviders: ['dhub', 'talabat', 'careem']
        });
      });

      const allResults = await Promise.allSettled(orderPromises);
      const endTime = performance.now();

      const successful = allResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const withFailover = allResults.filter(r => 
        r.status === 'fulfilled' && r.value.failoverInfo?.attemptsCount > 1
      ).length;

      const executionTime = (endTime - startTime) / 1000;
      const throughput = testOrders / executionTime;
      const successRate = (successful / testOrders) * 100;

      console.log(`🔄 Failover Load Test Results:`);
      console.log(`  Orders processed: ${testOrders}`);
      console.log(`  Successful: ${successful} (${successRate.toFixed(1)}%)`);
      console.log(`  Used failover: ${withFailover} (${((withFailover/testOrders)*100).toFixed(1)}%)`);
      console.log(`  Execution time: ${executionTime.toFixed(1)}s`);
      console.log(`  Throughput: ${throughput.toFixed(1)} orders/second`);

      expect(successRate).toBeGreaterThan(90); // 90% success despite failures
      expect(withFailover).toBeGreaterThan(0); // Failover was used
      expect(throughput).toBeGreaterThan(5); // Maintain reasonable throughput
    }, 45000);
  });

  describe('Memory and Resource Management', () => {
    it('should maintain stable memory usage during extended load', async () => {
      const memorySnapshots: any[] = [];
      const testDuration = 20000; // 20 seconds
      const snapshotInterval = 2000; // Every 2 seconds
      const ordersPerSnapshot = 25;

      const startTime = performance.now();
      let orderCounter = 0;

      const memoryMonitor = setInterval(() => {
        const memUsage = process.memoryUsage();
        memorySnapshots.push({
          timestamp: Date.now(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external,
          orderCount: orderCounter
        });
      }, snapshotInterval);

      // Generate continuous load
      const loadPromise = (async () => {
        while ((performance.now() - startTime) < testDuration) {
          const batchPromises = Array.from({ length: ordersPerSnapshot }, (_, i) => {
            orderCounter++;
            const order = createLoadTestOrder(`MEMORY-TEST-${orderCounter}-${Date.now()}`);
            return deliverySystem.createOrder(order).catch(() => ({ success: false }));
          });

          await Promise.all(batchPromises);
          await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        }
      })();

      await loadPromise;
      clearInterval(memoryMonitor);

      // Analyze memory usage
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const maxMemory = memorySnapshots.reduce((max, snapshot) => 
        snapshot.heapUsed > max.heapUsed ? snapshot : max
      );

      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      const maxHeapMB = maxMemory.heapUsed / (1024 * 1024);

      console.log(`💾 Memory Usage Analysis:`);
      console.log(`  Orders processed: ${orderCounter:,}`);
      console.log(`  Test duration: ${((performance.now() - startTime) / 1000).toFixed(1)}s`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / (1024 * 1024)).toFixed(1)}MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / (1024 * 1024)).toFixed(1)}MB`);
      console.log(`  Max heap: ${maxHeapMB.toFixed(1)}MB`);
      console.log(`  Memory growth: ${memoryGrowthMB.toFixed(1)}MB`);

      // Memory should not grow excessively
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
      expect(maxHeapMB).toBeLessThan(200); // Less than 200MB max heap
    }, 45000);
  });

  const createLoadTestOrder = (orderId: string): StandardOrderFormat => ({
    orderId,
    branchId: 'LOAD-TEST-BRANCH',
    companyId: 'load-test-company',
    customer: {
      name: `Load Customer ${orderId.split('-')[2] || Math.floor(Math.random() * 1000)}`,
      phone: `+96279${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
      email: `load${Math.floor(Math.random() * 1000)}@test.com`
    },
    deliveryAddress: {
      street: `Load Test Street ${Math.floor(Math.random() * 1000)}`,
      city: ['Amman', 'Zarqa', 'Irbid'][Math.floor(Math.random() * 3)],
      area: `Area ${Math.floor(Math.random() * 100)}`,
      latitude: 31.9454 + (Math.random() - 0.5) * 0.5,
      longitude: 35.9284 + (Math.random() - 0.5) * 0.5,
      instructions: Math.random() > 0.5 ? `Instructions ${Math.floor(Math.random() * 100)}` : undefined
    },
    items: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
      id: `LOAD-ITEM-${i}-${Math.floor(Math.random() * 1000)}`,
      name: `Load Test Item ${i + 1}`,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: Math.floor(Math.random() * 25) + 5
    })),
    subtotal: Math.floor(Math.random() * 75) + 25,
    deliveryFee: [2.5, 3.0, 3.5, 4.0][Math.floor(Math.random() * 4)],
    tax: Math.floor(Math.random() * 5),
    discount: Math.random() > 0.8 ? Math.floor(Math.random() * 10) + 5 : 0,
    total: Math.floor(Math.random() * 85) + 30,
    paymentMethod: Math.random() > 0.6 ? 'cash' : 'card',
    priority: Math.random() > 0.9 ? 'urgent' : Math.random() > 0.7 ? 'high' : 'normal',
    estimatedPreparationTime: Math.floor(Math.random() * 40) + 10
  });
});