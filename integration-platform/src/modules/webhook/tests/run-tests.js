#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * Comprehensive webhook test runner
 * Supports running different test suites with various configurations
 */

const TEST_SUITES = {
  unit: {
    name: 'Unit Tests',
    pattern: 'webhook.spec.ts|webhook-retry.spec.ts',
    timeout: 30000,
    description: 'Fast unit tests for individual components',
  },
  integration: {
    name: 'Integration Tests',
    pattern: 'webhook.spec.ts',
    timeout: 45000,
    description: 'End-to-end API integration tests',
  },
  performance: {
    name: 'Performance Tests',
    pattern: 'webhook-performance.spec.ts',
    timeout: 120000,
    description: 'Load and performance testing',
  },
  all: {
    name: 'All Tests',
    pattern: '*.spec.ts',
    timeout: 120000,
    description: 'Complete test suite',
  },
};

const CONFIGS = {
  fast: {
    coverage: false,
    verbose: false,
    maxWorkers: 'auto',
    description: 'Fast execution, no coverage',
  },
  ci: {
    coverage: true,
    verbose: false,
    maxWorkers: 2,
    description: 'CI/CD optimized configuration',
  },
  development: {
    coverage: true,
    verbose: true,
    maxWorkers: 'auto',
    description: 'Development with full output',
  },
  debug: {
    coverage: false,
    verbose: true,
    maxWorkers: 1,
    description: 'Debug mode with detailed output',
  },
};

function printUsage() {
  console.log(`
🧪 Webhook Test Runner

Usage: node run-tests.js [suite] [config] [options]

Test Suites:`);

  Object.entries(TEST_SUITES).forEach(([key, suite]) => {
    console.log(`  ${key.padEnd(12)} - ${suite.description}`);
  });

  console.log(`
Configurations:`);

  Object.entries(CONFIGS).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} - ${config.description}`);
  });

  console.log(`
Options:
  --help, -h     Show this help message
  --list, -l     List available test files
  --watch, -w    Run tests in watch mode
  --update-snapshots  Update Jest snapshots
  --bail         Stop on first test failure
  --silent       Suppress output except errors

Examples:
  node run-tests.js unit fast           # Fast unit tests
  node run-tests.js integration ci      # Integration tests for CI
  node run-tests.js performance debug   # Performance tests with debug output
  node run-tests.js all development --watch  # All tests in watch mode
`);
}

function listTests() {
  console.log('\n📁 Available Test Files:\n');

  const testDir = __dirname;
  const fs = require('fs');

  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.ts'))
    .sort();

  testFiles.forEach(file => {
    const filePath = path.join(testDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(1);

    console.log(`  📄 ${file.padEnd(30)} (${size} KB)`);
  });

  console.log(`\n📊 Total: ${testFiles.length} test files\n`);
}

function buildJestCommand(suite, config, options) {
  const suiteConfig = TEST_SUITES[suite];
  const configSettings = CONFIGS[config];

  if (!suiteConfig) {
    throw new Error(`Unknown test suite: ${suite}`);
  }

  if (!configSettings) {
    throw new Error(`Unknown configuration: ${config}`);
  }

  let command = 'npx jest';

  // Test pattern
  command += ` --testPathPattern="${suiteConfig.pattern}"`;

  // Timeout
  command += ` --testTimeout=${suiteConfig.timeout}`;

  // Max workers
  if (configSettings.maxWorkers !== 'auto') {
    command += ` --maxWorkers=${configSettings.maxWorkers}`;
  }

  // Coverage
  if (configSettings.coverage) {
    command += ' --coverage';
    command += ' --coverageReporters=text --coverageReporters=lcov --coverageReporters=html';
  } else {
    command += ' --coverage=false';
  }

  // Verbose
  if (configSettings.verbose) {
    command += ' --verbose';
  }

  // Options
  if (options.watch) {
    command += ' --watch';
  }

  if (options.updateSnapshots) {
    command += ' --updateSnapshot';
  }

  if (options.bail) {
    command += ' --bail';
  }

  if (options.silent) {
    command += ' --silent';
  }

  // Environment variables
  const envVars = [];

  if (config === 'debug') {
    envVars.push('DEBUG_TESTS=true');
  }

  if (suite === 'performance') {
    envVars.push('NODE_OPTIONS="--max-old-space-size=4096"');
  }

  if (envVars.length > 0) {
    command = `${envVars.join(' ')} ${command}`;
  }

  return command;
}

function runTests(suite, config, options) {
  console.log(`\n🚀 Running ${TEST_SUITES[suite].name} with ${CONFIGS[config].name} configuration\n`);

  try {
    const command = buildJestCommand(suite, config, options);

    console.log(`📋 Command: ${command}\n`);

    const startTime = Date.now();

    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../../..'), // Project root
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Tests completed successfully in ${duration}s`);

  } catch (error) {
    console.error('\n❌ Tests failed');
    process.exit(1);
  }
}

function parseArguments() {
  const args = process.argv.slice(2);

  const options = {
    watch: args.includes('--watch') || args.includes('-w'),
    updateSnapshots: args.includes('--update-snapshots'),
    bail: args.includes('--bail'),
    silent: args.includes('--silent'),
    help: args.includes('--help') || args.includes('-h'),
    list: args.includes('--list') || args.includes('-l'),
  };

  // Remove option flags from args
  const cleanArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  const suite = cleanArgs[0] || 'unit';
  const config = cleanArgs[1] || 'development';

  return { suite, config, options };
}

function validateEnvironment() {
  const requiredVars = ['DATABASE_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set up your environment properly before running tests.');
    process.exit(1);
  }

  // Warn if not using test database
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('test')) {
    console.warn('⚠️  Warning: DATABASE_URL does not appear to be a test database');
    console.warn('   Tests may affect production data!');
  }
}

function main() {
  const { suite, config, options } = parseArguments();

  if (options.help) {
    printUsage();
    return;
  }

  if (options.list) {
    listTests();
    return;
  }

  console.log('🔧 Webhook Test Suite Runner\n');

  // Validate environment
  validateEnvironment();

  // Validate arguments
  if (!TEST_SUITES[suite]) {
    console.error(`❌ Unknown test suite: ${suite}`);
    console.error(`Available suites: ${Object.keys(TEST_SUITES).join(', ')}`);
    process.exit(1);
  }

  if (!CONFIGS[config]) {
    console.error(`❌ Unknown configuration: ${config}`);
    console.error(`Available configs: ${Object.keys(CONFIGS).join(', ')}`);
    process.exit(1);
  }

  // Run tests
  runTests(suite, config, options);
}

if (require.main === module) {
  main();
}

module.exports = {
  TEST_SUITES,
  CONFIGS,
  buildJestCommand,
  runTests,
};