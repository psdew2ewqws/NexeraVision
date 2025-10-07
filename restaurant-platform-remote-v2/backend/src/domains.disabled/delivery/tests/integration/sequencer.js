const Sequencer = require('@jest/test-sequencer').default;

class IntegrationTestSequencer extends Sequencer {
  /**
   * Custom sequencer for integration tests to ensure proper test execution order
   * This helps with test dependencies and resource management
   */
  sort(tests) {
    // Define test execution priority
    const testPriority = {
      // Setup and basic functionality tests first
      'setup': 1,
      'authentication': 2,
      'provider': 3,
      
      // Core integration tests
      'dhub-integration': 10,
      'talabat-integration': 11,
      'careem-integration': 12,
      
      // System integration tests last
      'delivery-system-integration': 20,
      'end-to-end': 21,
      
      // Cleanup tests
      'teardown': 30
    };

    const sortedTests = tests.sort((testA, testB) => {
      // Extract test category from file path
      const getTestCategory = (testPath) => {
        const fileName = testPath.split('/').pop() || '';
        
        // Check for specific patterns in filename
        for (const [category] of Object.entries(testPriority)) {
          if (fileName.includes(category)) {
            return category;
          }
        }
        
        // Default priority
        return 'default';
      };

      const categoryA = getTestCategory(testA.path);
      const categoryB = getTestCategory(testB.path);
      
      const priorityA = testPriority[categoryA] || 15; // Default priority
      const priorityB = testPriority[categoryB] || 15;

      // Primary sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by file modification time (newer first)
      const mtimeA = testA.context?.config?.mtime || 0;
      const mtimeB = testB.context?.config?.mtime || 0;
      
      if (mtimeA !== mtimeB) {
        return mtimeB - mtimeA;
      }

      // Tertiary sort alphabetically by file name
      return testA.path.localeCompare(testB.path);
    });

    // Log the test execution order for debugging
    console.log('\n🔄 Integration Test Execution Order:');
    sortedTests.forEach((test, index) => {
      const fileName = test.path.split('/').pop();
      const category = this.getTestCategory(test.path);
      const priority = testPriority[category] || 15;
      console.log(`  ${index + 1}. ${fileName} (priority: ${priority}, category: ${category})`);
    });
    console.log('');

    return sortedTests;
  }

  getTestCategory(testPath) {
    const fileName = testPath.split('/').pop() || '';
    
    const testPriority = {
      'setup': 1,
      'authentication': 2,
      'provider': 3,
      'dhub-integration': 10,
      'talabat-integration': 11,
      'careem-integration': 12,
      'delivery-system-integration': 20,
      'end-to-end': 21,
      'teardown': 30
    };
    
    for (const [category] of Object.entries(testPriority)) {
      if (fileName.includes(category)) {
        return category;
      }
    }
    
    return 'default';
  }

  /**
   * Override to add custom logic for shard distribution
   * This helps with parallel test execution across multiple workers
   */
  shard(tests, { shardIndex, shardCount }) {
    // Group tests by category for better distribution
    const testsByCategory = {};
    
    tests.forEach(test => {
      const category = this.getTestCategory(test.path);
      if (!testsByCategory[category]) {
        testsByCategory[category] = [];
      }
      testsByCategory[category].push(test);
    });

    // Distribute tests across shards while keeping categories together when possible
    const allTests = [];
    Object.keys(testsByCategory).sort().forEach(category => {
      allTests.push(...testsByCategory[category]);
    });

    // Simple round-robin distribution
    const shardTests = allTests.filter((test, index) => {
      return index % shardCount === shardIndex;
    });

    console.log(`\n📊 Shard ${shardIndex + 1}/${shardCount} Test Distribution:`);
    const categoryCounts = {};
    shardTests.forEach(test => {
      const category = this.getTestCategory(test.path);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} test(s)`);
    });
    console.log(`  Total: ${shardTests.length} test(s)\n`);

    return shardTests;
  }
}

module.exports = IntegrationTestSequencer;