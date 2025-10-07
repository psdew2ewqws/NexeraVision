import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DeliverySystem } from '../../delivery.system';
import { ProviderFactory } from '../../factory/provider.factory';
import { ProviderSelectionEngine } from '../../engines/provider-selection.engine';
import { FailoverEngine } from '../../engines/failover.engine';
import { DeliveryAnalyticsService } from '../../analytics/delivery-analytics.service';
import { ProviderConfig, StandardOrderFormat } from '../../interfaces/delivery-provider.interface';
import { performance } from 'perf_hooks';

describe('Delivery System Stress Testing', () => {
  let deliverySystem: DeliverySystem;
  let mockAxios: MockAdapter;

  const createStressTestConfig = (): ProviderConfig[] => [
    {
      providerId: 'dhub-stress-test',
      providerType: 'dhub',
      companyId: 'stress-test-company',
      isActive: true,
      priority: 1,
      apiConfig: { baseUrl: 'https://api.dhub.jo', timeout: 1000, retryAttempts: 1, retryDelay: 100 },
      credentials: { username: 'stress_test', password: 'test', merchantId: 'STRESS_TEST' },
      businessRules: { serviceFee: 2.5, coverageRadius: 15, operatingHours: { start: '00:00', end: '23:59' } }
    },
    {
      providerId: 'talabat-stress-test',
      providerType: 'talabat',
      companyId: 'stress-test-company',
      isActive: true,
      priority: 2,
      apiConfig: { baseUrl: 'https://api.talabat.com', timeout: 1000, retryAttempts: 1, retryDelay: 100 },
      credentials: { apiKey: 'stress_test_key', restaurantId: 'STRESS_TEST', region: 'gulf' },
      businessRules: { serviceFee: 1.5, coverageRadius: 20, operatingHours: { start: '00:00', end: '23:59' } }
    },
    {
      providerId: 'careem-stress-test',
      providerType: 'careem',
      companyId: 'stress-test-company',
      isActive: true,
      priority: 3,
      apiConfig: { baseUrl: 'https://api.careem.com', timeout: 1000, retryAttempts: 1, retryDelay: 100 },
      credentials: { clientId: 'stress_test', clientSecret: 'test', merchantId: 'STRESS_TEST' },
      businessRules: { serviceFee: 3.0, coverageRadius: 25, operatingHours: { start: '00:00', end: '23:59' } }
    }
  ];

  beforeAll(async () => {
    mockAxios = new MockAdapter(axios, { delayResponse: 50 });
    
    const providerFactory = new ProviderFactory();
    const selectionEngine = new ProviderSelectionEngine();
    const failoverEngine = new FailoverEngine(providerFactory, selectionEngine);
    const analyticsService = new DeliveryAnalyticsService();
    
    deliverySystem = new DeliverySystem(providerFactory, selectionEngine, failoverEngine, analyticsService);
    
    // Mock authentication
    mockAxios.onPost('/oauth/token').reply(200, { access_token: 'stress_test_token', expires_in: 3600 });
    mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
    mockAxios.onPost('/oauth2/token').reply(200, { access_token: 'stress_test_token', expires_in: 7200 });
    
    await deliverySystem.initialize(createStressTestConfig());
    
    console.log('🔥 Stress testing environment initialized');
  }, 30000);

  afterAll(() => {
    mockAxios.restore();
  });

  describe('Extreme Load Conditions', () => {
    const createStressOrder = (id: string): StandardOrderFormat => ({
      orderId: `STRESS-${id}-${Date.now()}`,
      branchId: 'STRESS-BRANCH',
      companyId: 'stress-test-company',
      customer: {
        name: `Stress Customer ${id}`,
        phone: `+96279${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
        email: `stress${id}@test.com`
      },
      deliveryAddress: {
        street: `Stress Street ${Math.floor(Math.random() * 1000)}`,
        city: 'Stress City',
        area: 'Stress Area',
        latitude: 31.9454 + (Math.random() - 0.5) * 0.1,
        longitude: 35.9284 + (Math.random() - 0.5) * 0.1
      },
      items: [{ id: `STRESS-ITEM-${id}`, name: 'Stress Item', quantity: 1, price: 10 }],
      subtotal: 10,
      deliveryFee: 3,
      tax: 0,
      discount: 0,
      total: 13,
      paymentMethod: 'cash',
      priority: 'normal',
      estimatedPreparationTime: 15
    });

    beforeEach(() => {
      // Mock responses with variable delays to simulate real-world conditions
      mockAxios.onPost('/api/v1/orders').reply(() => {
        const delay = Math.floor(Math.random() * 300) + 50; // 50-350ms
        return new Promise(resolve => setTimeout(() => resolve([201, {
          order_id: `DHUB-STRESS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          status: 'confirmed'
        }]), delay));
      });

      mockAxios.onPost('/v1/orders').reply(() => {
        const delay = Math.floor(Math.random() * 400) + 100; // 100-500ms
        return new Promise(resolve => setTimeout(() => resolve([201, {
          order_id: `TLB-STRESS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          status: 'confirmed'
        }]), delay));
      });

      mockAxios.onPost('/v1/delivery/premium/orders').reply(() => {
        const delay = Math.floor(Math.random() * 200) + 75; // 75-275ms
        return new Promise(resolve => setTimeout(() => resolve([201, {
          order_id: `CRM-STRESS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          status: 'confirmed'
        }]), delay));
      });

      mockAxios.onGet(/.*coverage.*/).reply(200, { is_covered: true, delivery_fee: 3.0 });
    });

    it('should handle massive concurrent order burst (500 orders)', async () => {
      const massiveBatchSize = 500;
      const maxConcurrency = 100; // Limit concurrent requests
      
      console.log(`🚀 Starting massive concurrent burst: ${massiveBatchSize} orders`);
      
      const orders = Array.from({ length: massiveBatchSize }, (_, i) => 
        createStressOrder(i.toString().padStart(3, '0'))
      );

      const startTime = performance.now();
      
      // Process in batches to prevent overwhelming the system
      const batches = [];
      for (let i = 0; i < orders.length; i += maxConcurrency) {
        batches.push(orders.slice(i, i + maxConcurrency));
      }

      let totalSuccessful = 0;
      let totalFailed = 0;
      const batchResults = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchStartTime = performance.now();
        
        const batchPromises = batch.map(order => 
          deliverySystem.createOrder(order).catch(error => ({
            success: false,
            error: error.message,
            orderId: order.orderId
          }))
        );

        const batchResults_inner = await Promise.allSettled(batchPromises);
        const batchSuccesses = batchResults_inner.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;
        
        const batchDuration = performance.now() - batchStartTime;
        totalSuccessful += batchSuccesses;
        totalFailed += batch.length - batchSuccesses;
        
        batchResults.push({
          batchIndex: batchIndex + 1,
          size: batch.length,
          successes: batchSuccesses,
          duration: batchDuration,
          throughput: batch.length / (batchDuration / 1000)
        });

        console.log(`  Batch ${batchIndex + 1}/${batches.length}: ${batchSuccesses}/${batch.length} successful (${batchDuration.toFixed(0)}ms)`);
      }

      const totalDuration = performance.now() - startTime;
      const overallThroughput = massiveBatchSize / (totalDuration / 1000);
      const successRate = (totalSuccessful / massiveBatchSize) * 100;
      const avgBatchThroughput = batchResults.reduce((sum, r) => sum + r.throughput, 0) / batchResults.length;

      console.log(`🎯 Massive Burst Results:`);
      console.log(`  Total orders: ${massiveBatchSize:,}`);
      console.log(`  Successful: ${totalSuccessful:,} (${successRate.toFixed(1)}%)`);
      console.log(`  Failed: ${totalFailed:,}`);
      console.log(`  Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
      console.log(`  Overall throughput: ${overallThroughput.toFixed(1)} orders/second`);
      console.log(`  Average batch throughput: ${avgBatchThroughput.toFixed(1)} orders/second`);

      expect(successRate).toBeGreaterThan(85); // 85% success rate under extreme load
      expect(overallThroughput).toBeGreaterThan(20); // At least 20 orders/second
      expect(totalDuration).toBeLessThan(60000); // Complete within 1 minute
    }, 120000);

    it('should handle continuous high-frequency order stream', async () => {
      const streamDuration = 45000; // 45 seconds
      const orderFrequency = 20; // orders per second
      const intervalMs = 1000 / orderFrequency; // 50ms intervals
      
      console.log(`🌊 Starting high-frequency order stream: ${orderFrequency}/second for ${streamDuration/1000}s`);
      
      const startTime = performance.now();
      const results = [];
      let orderCounter = 0;
      let successCounter = 0;
      let errorCounter = 0;

      const streamPromise = new Promise<void>((resolve) => {
        const intervalId = setInterval(async () => {
          if ((performance.now() - startTime) >= streamDuration) {
            clearInterval(intervalId);
            resolve();
            return;
          }

          const order = createStressOrder(`STREAM-${orderCounter++}`);
          
          deliverySystem.createOrder(order)
            .then(result => {
              if (result.success) {
                successCounter++;
              } else {
                errorCounter++;
              }
              
              results.push({
                orderId: order.orderId,
                success: result.success,
                timestamp: Date.now(),
                responseTime: Date.now() - parseInt(order.orderId.split('-')[2])
              });
            })
            .catch(error => {
              errorCounter++;
              results.push({
                orderId: order.orderId,
                success: false,
                error: error.message,
                timestamp: Date.now()
              });
            });
        }, intervalMs);
      });

      await streamPromise;
      
      // Wait a bit more for pending orders to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const finalDuration = (performance.now() - startTime) / 1000;
      const actualThroughput = orderCounter / finalDuration;
      const successRate = (successCounter / orderCounter) * 100;
      const errorRate = (errorCounter / orderCounter) * 100;
      
      // Calculate response time statistics
      const completedResults = results.filter(r => r.responseTime);
      if (completedResults.length > 0) {
        const responseTimes = completedResults.map(r => r.responseTime).sort((a, b) => a - b);
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
        const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];

        console.log(`📊 High-Frequency Stream Results:`);
        console.log(`  Target frequency: ${orderFrequency} orders/second`);
        console.log(`  Actual throughput: ${actualThroughput.toFixed(1)} orders/second`);
        console.log(`  Orders generated: ${orderCounter:,}`);
        console.log(`  Successful: ${successCounter:,} (${successRate.toFixed(1)}%)`);
        console.log(`  Errors: ${errorCounter:,} (${errorRate.toFixed(1)}%)`);
        console.log(`  Average response time: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`  Median response time: ${medianResponseTime.toFixed(0)}ms`);
        console.log(`  95th percentile: ${p95ResponseTime.toFixed(0)}ms`);

        expect(successRate).toBeGreaterThan(80); // 80% success rate
        expect(actualThroughput).toBeGreaterThan(orderFrequency * 0.8); // 80% of target throughput
        expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds average
        expect(p95ResponseTime).toBeLessThan(5000); // 95% under 5 seconds
      }
    }, 60000);

    it('should survive catastrophic provider failures', async () => {
      const testOrders = 200;
      const catastrophicFailureRate = 0.8; // 80% failure rate
      
      console.log(`💥 Starting catastrophic failure test: ${catastrophicFailureRate * 100}% failure rate`);
      
      // Mock catastrophic failures for primary providers
      mockAxios.onPost('/api/v1/orders').reply(() => {
        if (Math.random() < catastrophicFailureRate) {
          return [503, { error: 'service_unavailable', message: 'Service is down' }];
        }
        return [201, { order_id: `DHUB-SURVIVOR-${Date.now()}`, status: 'confirmed' }];
      });

      mockAxios.onPost('/v1/orders').reply(() => {
        if (Math.random() < catastrophicFailureRate) {
          return [500, { error: 'internal_error', message: 'Internal server error' }];
        }
        return [201, { order_id: `TLB-SURVIVOR-${Date.now()}`, status: 'confirmed' }];
      });

      // Keep Careem more reliable as backup
      mockAxios.onPost('/v1/delivery/premium/orders').reply(() => {
        if (Math.random() < 0.3) { // 30% failure rate for backup
          return [429, { error: 'rate_limited', message: 'Rate limit exceeded' }];
        }
        return [201, { order_id: `CRM-SURVIVOR-${Date.now()}`, status: 'confirmed' }];
      });

      const orders = Array.from({ length: testOrders }, (_, i) => 
        createStressOrder(`CATASTROPHIC-${i}`)
      );

      const startTime = performance.now();
      
      const results = await Promise.allSettled(
        orders.map(order => 
          deliverySystem.createOrderWithFailover(order, {
            enableFailover: true,
            maxFailoverAttempts: 3,
            adaptiveRetry: true,
            timeoutMs: 10000
          })
        )
      );

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const withFailover = results.filter(r => 
        r.status === 'fulfilled' && r.value.failoverInfo?.attemptsCount > 1
      ).length;
      
      const totallyFailed = results.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length;

      const survivalRate = (successful / testOrders) * 100;
      const failoverUsage = (withFailover / successful) * 100;

      console.log(`🔥 Catastrophic Failure Results:`);
      console.log(`  Orders tested: ${testOrders}`);
      console.log(`  Survived: ${successful} (${survivalRate.toFixed(1)}%)`);
      console.log(`  Used failover: ${withFailover} (${failoverUsage.toFixed(1)}% of successful)`);
      console.log(`  Totally failed: ${totallyFailed}`);
      console.log(`  Test duration: ${duration.toFixed(1)}s`);

      // System should survive even catastrophic failures
      expect(survivalRate).toBeGreaterThan(60); // At least 60% survival rate
      expect(withFailover).toBeGreaterThan(0); // Failover was used
      expect(duration).toBeLessThan(30); // Complete within reasonable time
    }, 45000);
  });

  describe('Resource Exhaustion Tests', () => {
    it('should handle memory pressure gracefully', async () => {
      const memoryPressureOrders = 1000;
      const batchSize = 50;
      const numberOfBatches = Math.ceil(memoryPressureOrders / batchSize);
      
      console.log(`💾 Starting memory pressure test: ${memoryPressureOrders} orders in ${numberOfBatches} batches`);
      
      const initialMemory = process.memoryUsage();
      const memorySnapshots = [initialMemory];
      
      let totalOrders = 0;
      let successfulOrders = 0;
      
      for (let batchNum = 0; batchNum < numberOfBatches; batchNum++) {
        const orders = Array.from({ length: batchSize }, (_, i) => 
          createStressOrder(`MEMORY-${batchNum}-${i}`)
        );

        const batchResults = await Promise.allSettled(
          orders.map(order => deliverySystem.createOrder(order))
        );

        const batchSuccesses = batchResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;

        totalOrders += batchSize;
        successfulOrders += batchSuccesses;
        
        // Take memory snapshot
        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory);
        
        // Force garbage collection periodically if available
        if (global.gc && batchNum % 5 === 0) {
          global.gc();
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (batchNum % 10 === 0) {
          const memoryMB = currentMemory.heapUsed / (1024 * 1024);
          console.log(`  Batch ${batchNum + 1}/${numberOfBatches}: Memory ${memoryMB.toFixed(1)}MB`);
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowthMB = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);
      const maxMemoryMB = Math.max(...memorySnapshots.map(m => m.heapUsed)) / (1024 * 1024);
      const successRate = (successfulOrders / totalOrders) * 100;

      console.log(`📈 Memory Pressure Results:`);
      console.log(`  Orders processed: ${totalOrders:,}`);
      console.log(`  Successful: ${successfulOrders:,} (${successRate.toFixed(1)}%)`);
      console.log(`  Initial memory: ${(initialMemory.heapUsed / (1024 * 1024)).toFixed(1)}MB`);
      console.log(`  Final memory: ${(finalMemory.heapUsed / (1024 * 1024)).toFixed(1)}MB`);
      console.log(`  Memory growth: ${memoryGrowthMB.toFixed(1)}MB`);
      console.log(`  Peak memory: ${maxMemoryMB.toFixed(1)}MB`);

      expect(successRate).toBeGreaterThan(85); // 85% success rate
      expect(memoryGrowthMB).toBeLessThan(100); // Less than 100MB growth
      expect(maxMemoryMB).toBeLessThan(300); // Less than 300MB peak
    }, 90000);

    it('should handle connection pool exhaustion', async () => {
      const connectionPressureOrders = 300;
      const highConcurrency = 100; // Very high concurrency to pressure connections
      
      console.log(`🔌 Starting connection pool pressure test: ${connectionPressureOrders} orders, ${highConcurrency} concurrent`);
      
      // Process all orders with maximum concurrency
      const orders = Array.from({ length: connectionPressureOrders }, (_, i) => 
        createStressOrder(`CONNECTION-${i}`)
      );

      const startTime = performance.now();
      
      // Split into concurrent batches
      const concurrentBatches = [];
      for (let i = 0; i < orders.length; i += highConcurrency) {
        concurrentBatches.push(orders.slice(i, i + highConcurrency));
      }

      let totalSuccessful = 0;
      let connectionErrors = 0;
      let timeoutErrors = 0;
      
      for (const batch of concurrentBatches) {
        const batchResults = await Promise.allSettled(
          batch.map(order => 
            deliverySystem.createOrder(order).catch(error => {
              if (error.message.includes('timeout') || error.code === 'TIMEOUT') {
                timeoutErrors++;
              } else if (error.message.includes('connection') || error.code === 'ECONNREFUSED') {
                connectionErrors++;
              }
              return { success: false, error: error.message };
            })
          )
        );

        const batchSuccesses = batchResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;
        
        totalSuccessful += batchSuccesses;
        
        // Brief pause between batches to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const duration = (performance.now() - startTime) / 1000;
      const successRate = (totalSuccessful / connectionPressureOrders) * 100;
      const throughput = connectionPressureOrders / duration;

      console.log(`🌐 Connection Pressure Results:`);
      console.log(`  Orders processed: ${connectionPressureOrders}`);
      console.log(`  Successful: ${totalSuccessful} (${successRate.toFixed(1)}%)`);
      console.log(`  Connection errors: ${connectionErrors}`);
      console.log(`  Timeout errors: ${timeoutErrors}`);
      console.log(`  Duration: ${duration.toFixed(1)}s`);
      console.log(`  Throughput: ${throughput.toFixed(1)} orders/second`);

      expect(successRate).toBeGreaterThan(75); // 75% success rate under connection pressure
      expect(throughput).toBeGreaterThan(10); // At least 10 orders/second
      expect(duration).toBeLessThan(60); // Complete within 1 minute
    }, 75000);
  });

  describe('System Recovery Tests', () => {
    it('should recover from complete system failure', async () => {
      const recoveryTestOrders = 100;
      
      console.log(`🚨 Starting system recovery test: Complete failure then recovery`);
      
      // Phase 1: Complete system failure
      mockAxios.onPost().reply(503, { error: 'system_down' });
      mockAxios.onGet().reply(503, { error: 'system_down' });
      
      const failureOrders = Array.from({ length: 20 }, (_, i) => 
        createStressOrder(`FAILURE-${i}`)
      );

      console.log('  Phase 1: Simulating complete system failure...');
      const failureResults = await Promise.allSettled(
        failureOrders.map(order => 
          deliverySystem.createOrder(order).catch(error => ({ success: false, error: error.message }))
        )
      );

      const failureSuccesses = failureResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      console.log(`  Failure phase: ${failureSuccesses}/${failureOrders.length} succeeded (expected: 0)`);
      
      // Phase 2: System recovery
      console.log('  Phase 2: Simulating system recovery...');
      
      // Reset mocks to normal operation
      mockAxios.reset();
      mockAxios.onPost('/oauth/token').reply(200, { access_token: 'recovery_token', expires_in: 3600 });
      mockAxios.onGet('/v1/auth/verify').reply(200, { status: 'authenticated' });
      mockAxios.onPost('/oauth2/token').reply(200, { access_token: 'recovery_token', expires_in: 7200 });
      
      // Gradual recovery - start with some failures, then improve
      let recoveryCallCount = 0;
      mockAxios.onPost('/api/v1/orders').reply(() => {
        recoveryCallCount++;
        // First 25% of calls still fail (gradual recovery)
        if (recoveryCallCount <= recoveryTestOrders * 0.25 && Math.random() < 0.7) {
          return [503, { error: 'still_recovering' }];
        }
        return [201, { order_id: `DHUB-RECOVERY-${recoveryCallCount}`, status: 'confirmed' }];
      });

      mockAxios.onPost('/v1/orders').reply(201, {
        order_id: `TLB-RECOVERY-${Date.now()}`,
        status: 'confirmed'
      });

      mockAxios.onPost('/v1/delivery/premium/orders').reply(201, {
        order_id: `CRM-RECOVERY-${Date.now()}`,
        status: 'confirmed'
      });

      mockAxios.onGet(/.*coverage.*/).reply(200, { is_covered: true, delivery_fee: 3.0 });

      // Wait a moment for system to "recover"
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Phase 3: Test recovery performance
      const recoveryOrders = Array.from({ length: recoveryTestOrders }, (_, i) => 
        createStressOrder(`RECOVERY-${i}`)
      );

      const recoveryStartTime = performance.now();
      
      const recoveryResults = await Promise.allSettled(
        recoveryOrders.map(order => 
          deliverySystem.createOrderWithFailover(order, {
            enableFailover: true,
            maxFailoverAttempts: 3,
            adaptiveRetry: true
          })
        )
      );

      const recoveryDuration = (performance.now() - recoveryStartTime) / 1000;
      const recoverySuccesses = recoveryResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const recoveryRate = (recoverySuccesses / recoveryTestOrders) * 100;
      const recoveryThroughput = recoveryTestOrders / recoveryDuration;

      console.log(`♻️ System Recovery Results:`);
      console.log(`  Recovery orders: ${recoveryTestOrders}`);
      console.log(`  Successful: ${recoverySuccesses} (${recoveryRate.toFixed(1)}%)`);
      console.log(`  Recovery time: ${recoveryDuration.toFixed(1)}s`);
      console.log(`  Recovery throughput: ${recoveryThroughput.toFixed(1)} orders/second`);

      expect(recoveryRate).toBeGreaterThan(70); // 70% success rate during recovery
      expect(recoveryThroughput).toBeGreaterThan(5); // At least 5 orders/second during recovery
      expect(failureSuccesses).toBe(0); // Complete failure phase should have 0 successes
    }, 60000);
  });
});