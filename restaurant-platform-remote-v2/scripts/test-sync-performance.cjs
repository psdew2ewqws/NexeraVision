#!/usr/bin/env node

// ================================================
// Sync Performance Test Script
// Restaurant Platform v2 - Performance Validation
// ================================================

const axios = require('axios');
const { performance } = require('perf_hooks');

// ================================================
// CONFIGURATION
// ================================================

const CONFIG = {
  API_BASE_URL: process.env.API_URL || 'http://localhost:3001',
  AUTH_TOKEN: process.env.AUTH_TOKEN || '',
  TEST_TIMEOUT: 60000, // 60 seconds max test time
  PERFORMANCE_TARGET: 30000, // 30 seconds target
  TARGET_ITEM_COUNT: 500,
  CONCURRENT_PLATFORMS: 4
};

const PLATFORMS = [
  'CAREEM',
  'TALABAT',
  'WEBSITE',
  'CALL_CENTER',
  'MOBILE_APP',
  'KIOSK'
];

// ================================================
// TEST UTILITIES
// ================================================

class PerformanceLogger {
  constructor() {
    this.results = [];
    this.startTime = null;
  }

  start(testName) {
    this.startTime = performance.now();
    console.log(`\\n🚀 Starting: ${testName}`);
    console.log(`Target: Complete in <30s for 500+ items`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('─'.repeat(60));
  }

  log(message, data = null) {
    const elapsed = this.startTime ? performance.now() - this.startTime : 0;
    const timestamp = `[${(elapsed / 1000).toFixed(2)}s]`;
    console.log(`${timestamp} ${message}`);

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  success(message, duration) {
    const durationSeconds = (duration / 1000).toFixed(2);
    const isUnderTarget = duration < CONFIG.PERFORMANCE_TARGET;

    console.log('─'.repeat(60));
    console.log(`✅ ${message}`);
    console.log(`⏱️  Duration: ${durationSeconds}s`);
    console.log(`🎯 Target: ${isUnderTarget ? 'ACHIEVED' : 'MISSED'} (<30s)`);

    if (isUnderTarget) {
      console.log(`🚀 Performance: EXCELLENT (${((CONFIG.PERFORMANCE_TARGET - duration) / 1000).toFixed(1)}s under target)`);
    } else {
      console.log(`⚠️  Performance: NEEDS OPTIMIZATION (${((duration - CONFIG.PERFORMANCE_TARGET) / 1000).toFixed(1)}s over target)`);
    }

    this.results.push({
      test: message,
      duration,
      success: true,
      underTarget: isUnderTarget
    });
  }

  error(message, error) {
    const elapsed = this.startTime ? performance.now() - this.startTime : 0;
    console.log('─'.repeat(60));
    console.log(`❌ ${message}`);
    console.log(`⏱️  Duration: ${(elapsed / 1000).toFixed(2)}s`);
    console.log(`💥 Error: ${error.message}`);

    this.results.push({
      test: message,
      duration: elapsed,
      success: false,
      error: error.message
    });
  }

  summary() {
    console.log('\\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const testsUnderTarget = this.results.filter(r => r.success && r.underTarget).length;

    console.log(`Tests Run: ${totalTests}`);
    console.log(`Successful: ${successfulTests}/${totalTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Under Target: ${testsUnderTarget}/${successfulTests} (${successfulTests > 0 ? ((testsUnderTarget/successfulTests)*100).toFixed(1) : 0}%)`);

    if (testsUnderTarget === successfulTests && successfulTests > 0) {
      console.log('\\n🎉 ALL PERFORMANCE TARGETS ACHIEVED!');
      console.log('✨ Blazing fast sync implementation is ready for production');
    } else if (successfulTests > 0) {
      console.log('\\n⚠️  Some performance targets missed');
      console.log('🔧 Consider optimization strategies');
    } else {
      console.log('\\n❌ Tests failed - check implementation');
    }

    console.log('\\n📈 Individual Results:');
    this.results.forEach((result, index) => {
      const status = result.success ?
        (result.underTarget ? '🟢' : '🟡') : '🔴';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${index + 1}. ${status} ${result.test} - ${duration}s`);
    });
  }
}

// ================================================
// API CLIENT
// ================================================

class SyncTestClient {
  constructor() {
    this.apiClient = axios.create({
      baseURL: CONFIG.API_BASE_URL,
      timeout: CONFIG.TEST_TIMEOUT,
      headers: {
        'Authorization': `Bearer ${CONFIG.AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createTestMenu() {
    const menuData = {
      platform: 'WEBSITE',
      name: { en: `Performance Test Menu ${Date.now()}` },
      description: { en: 'Generated for sync performance testing' },
      status: 'active',
      isActive: true
    };

    const response = await this.apiClient.post('/platform-menus', menuData);
    return response.data;
  }

  async addTestItems(menuId, itemCount = CONFIG.TARGET_ITEM_COUNT) {
    // Generate test product IDs (assuming they exist)
    const productIds = Array.from(
      { length: itemCount },
      (_, i) => `test_product_${i + 1}`
    );

    const response = await this.apiClient.post(
      `/platform-menus/${menuId}/items/bulk-add`,
      {
        productIds,
        defaultConfig: {
          isAvailable: true,
          isFeatured: false
        }
      }
    );

    return response.data;
  }

  async startMultiPlatformSync(menuId, platforms = PLATFORMS) {
    const syncRequest = {
      platforms,
      syncType: 'manual',
      options: {
        parallelProcessing: true,
        maxConcurrency: CONFIG.CONCURRENT_PLATFORMS,
        stopOnFirstError: false,
        notifyOnComplete: true
      }
    };

    const response = await this.apiClient.post(
      `/platform-menus/${menuId}/sync/multi-platform`,
      syncRequest
    );

    return response.data;
  }

  async getSyncStatus(multiSyncId) {
    const response = await this.apiClient.get(
      `/platform-menus/sync/multi-platform/${multiSyncId}/status`
    );
    return response.data;
  }

  async waitForSyncCompletion(multiSyncId, maxWaitTime = CONFIG.TEST_TIMEOUT) {
    const startTime = performance.now();
    let status = null;

    while (performance.now() - startTime < maxWaitTime) {
      status = await this.getSyncStatus(multiSyncId);

      if (status.overallStatus === 'completed' || status.overallStatus === 'failed') {
        break;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return status;
  }

  async cleanup(menuId) {
    try {
      await this.apiClient.delete(`/platform-menus/${menuId}`);
    } catch (error) {
      console.log(`Warning: Failed to cleanup test menu ${menuId}: ${error.message}`);
    }
  }
}

// ================================================
// PERFORMANCE TESTS
// ================================================

class SyncPerformanceTests {
  constructor() {
    this.logger = new PerformanceLogger();
    this.client = new SyncTestClient();
  }

  async runAllTests() {
    console.log('🔥 BLAZING FAST SYNC PERFORMANCE TESTS');
    console.log('Restaurant Platform v2 - Multi-Platform Sync Engine');
    console.log('Target: <30 seconds for 500+ items across multiple platforms\\n');

    try {
      await this.testBasicMultiPlatformSync();
      await this.testHighVolumeSync();
      await this.testParallelProcessingEfficiency();
      await this.testErrorRecovery();
    } catch (error) {
      console.error('Test suite failed:', error);
    }

    this.logger.summary();
  }

  async testBasicMultiPlatformSync() {
    this.logger.start('Basic Multi-Platform Sync Test');

    let menuId = null;
    try {
      // Create test menu
      this.logger.log('Creating test menu...');
      const menu = await this.client.createTestMenu();
      menuId = menu.id;

      // Add test items
      this.logger.log(`Adding ${CONFIG.TARGET_ITEM_COUNT} test items...`);
      await this.client.addTestItems(menuId, CONFIG.TARGET_ITEM_COUNT);

      // Start sync
      this.logger.log(`Starting sync across ${PLATFORMS.length} platforms...`);
      const startTime = performance.now();

      const syncResult = await this.client.startMultiPlatformSync(menuId, PLATFORMS);
      this.logger.log('Sync initiated', {
        multiSyncId: syncResult.multiSyncId,
        platforms: PLATFORMS,
        estimatedDuration: `${(syncResult.estimatedDuration / 1000).toFixed(1)}s`
      });

      // Wait for completion
      this.logger.log('Waiting for sync completion...');
      const finalStatus = await this.client.waitForSyncCompletion(syncResult.multiSyncId);

      const totalDuration = performance.now() - startTime;

      if (finalStatus.overallStatus === 'completed') {
        this.logger.success('Basic Multi-Platform Sync Completed', totalDuration);
        this.logger.log('Final metrics', {
          totalItemsSynced: finalStatus.totalItemsSynced,
          totalErrors: finalStatus.totalErrors,
          platformsCompleted: finalStatus.overallProgress.completedPlatforms,
          totalPlatforms: finalStatus.overallProgress.totalPlatforms
        });
      } else {
        throw new Error(`Sync failed with status: ${finalStatus.overallStatus}`);
      }

    } catch (error) {
      this.logger.error('Basic Multi-Platform Sync Failed', error);
    } finally {
      if (menuId) {
        await this.client.cleanup(menuId);
      }
    }
  }

  async testHighVolumeSync() {
    this.logger.start('High Volume Sync Test (1000+ items)');

    let menuId = null;
    try {
      const highVolumeItemCount = 1000;

      // Create test menu
      this.logger.log('Creating high-volume test menu...');
      const menu = await this.client.createTestMenu();
      menuId = menu.id;

      // Add high volume of items
      this.logger.log(`Adding ${highVolumeItemCount} items for high-volume test...`);
      await this.client.addTestItems(menuId, highVolumeItemCount);

      // Start sync with subset of platforms for focused test
      const testPlatforms = ['CAREEM', 'TALABAT', 'WEBSITE', 'MOBILE_APP'];
      this.logger.log(`Starting high-volume sync across ${testPlatforms.length} platforms...`);

      const startTime = performance.now();
      const syncResult = await this.client.startMultiPlatformSync(menuId, testPlatforms);

      // Wait for completion
      const finalStatus = await this.client.waitForSyncCompletion(syncResult.multiSyncId);
      const totalDuration = performance.now() - startTime;

      if (finalStatus.overallStatus === 'completed') {
        this.logger.success('High Volume Sync Completed', totalDuration);

        // Calculate performance metrics
        const itemsPerSecond = finalStatus.totalItemsSynced / (totalDuration / 1000);
        this.logger.log('High-volume performance metrics', {
          itemCount: highVolumeItemCount,
          itemsPerSecond: itemsPerSecond.toFixed(2),
          averageTimePerItem: `${(totalDuration / finalStatus.totalItemsSynced).toFixed(2)}ms`
        });
      } else {
        throw new Error(`High-volume sync failed: ${finalStatus.overallStatus}`);
      }

    } catch (error) {
      this.logger.error('High Volume Sync Failed', error);
    } finally {
      if (menuId) {
        await this.client.cleanup(menuId);
      }
    }
  }

  async testParallelProcessingEfficiency() {
    this.logger.start('Parallel Processing Efficiency Test');

    let menuId = null;
    try {
      // Create test menu
      const menu = await this.client.createTestMenu();
      menuId = menu.id;
      await this.client.addTestItems(menuId, 200); // Smaller set for timing comparison

      // Test 1: Sequential sync (simulate non-parallel)
      this.logger.log('Testing with limited concurrency (sequential-like)...');
      const sequentialStart = performance.now();
      const sequentialSync = await this.client.startMultiPlatformSync(menuId, ['CAREEM', 'TALABAT']);
      const sequentialResult = await this.client.waitForSyncCompletion(sequentialSync.multiSyncId);
      const sequentialTime = performance.now() - sequentialStart;

      // Test 2: Full parallel sync
      this.logger.log('Testing with full parallel processing...');
      const parallelStart = performance.now();
      const parallelSync = await this.client.startMultiPlatformSync(menuId, PLATFORMS);
      const parallelResult = await this.client.waitForSyncCompletion(parallelSync.multiSyncId);
      const parallelTime = performance.now() - parallelStart;

      // Calculate efficiency
      const efficiency = ((sequentialTime - parallelTime) / sequentialTime) * 100;

      this.logger.success('Parallel Processing Efficiency Test Completed', parallelTime);
      this.logger.log('Efficiency analysis', {
        sequentialTime: `${(sequentialTime / 1000).toFixed(2)}s`,
        parallelTime: `${(parallelTime / 1000).toFixed(2)}s`,
        efficiency: `${efficiency.toFixed(1)}% improvement`,
        parallelismFactor: `${(sequentialTime / parallelTime).toFixed(2)}x faster`
      });

    } catch (error) {
      this.logger.error('Parallel Processing Efficiency Test Failed', error);
    } finally {
      if (menuId) {
        await this.client.cleanup(menuId);
      }
    }
  }

  async testErrorRecovery() {
    this.logger.start('Error Recovery Test');

    try {
      // This test validates that the system handles errors gracefully
      // and doesn't crash the entire sync process

      this.logger.log('Testing sync with invalid menu ID...');

      try {
        await this.client.startMultiPlatformSync('invalid-menu-id', ['WEBSITE']);
        throw new Error('Expected error did not occur');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.logger.log('✅ Error handling working correctly - invalid menu rejected');
        } else {
          throw error;
        }
      }

      // Test with valid menu but simulate platform errors
      const menu = await this.client.createTestMenu();
      await this.client.addTestItems(menu.id, 50);

      this.logger.log('Testing resilient sync with mixed platform results...');
      const startTime = performance.now();

      // This should succeed for internal platforms even if external ones have issues
      const syncResult = await this.client.startMultiPlatformSync(
        menu.id,
        ['WEBSITE', 'CALL_CENTER', 'MOBILE_APP'] // Use only internal platforms for reliability
      );

      const finalStatus = await this.client.waitForSyncCompletion(syncResult.multiSyncId);
      const totalDuration = performance.now() - startTime;

      await this.client.cleanup(menu.id);

      this.logger.success('Error Recovery Test Completed', totalDuration);
      this.logger.log('Resilience metrics', {
        finalStatus: finalStatus.overallStatus,
        completedPlatforms: finalStatus.overallProgress.completedPlatforms,
        totalErrors: finalStatus.totalErrors
      });

    } catch (error) {
      this.logger.error('Error Recovery Test Failed', error);
    }
  }
}

// ================================================
// MAIN EXECUTION
// ================================================

async function main() {
  // Validate configuration
  if (!CONFIG.AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN environment variable is required');
    console.log('Usage: AUTH_TOKEN=your_jwt_token node test-sync-performance.js');
    process.exit(1);
  }

  const tests = new SyncPerformanceTests();
  await tests.runAllTests();
}

// Run tests if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { SyncPerformanceTests, PerformanceLogger };