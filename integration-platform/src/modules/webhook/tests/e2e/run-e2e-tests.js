#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner for NEXARA Webhook System
 *
 * This script runs all end-to-end tests for the webhook system and generates
 * detailed reports on test coverage, performance, and system reliability.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WebhookE2ETestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testSuites: [],
      performance: {
        totalDuration: 0,
        averageTestTime: 0,
        slowestTest: null,
        fastestTest: null
      },
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      },
      issues: [],
      recommendations: []
    };

    this.testSuites = [
      {
        name: 'Webhook Registration',
        file: 'webhook-registration.e2e-spec.ts',
        description: 'Tests webhook endpoint registration and validation',
        critical: true
      },
      {
        name: 'Webhook Security',
        file: 'webhook-security.e2e-spec.ts',
        description: 'Tests HMAC, API key, and bearer token validation',
        critical: true
      },
      {
        name: 'Webhook Processing',
        file: 'webhook-processing.e2e-spec.ts',
        description: 'Tests event processing and normalization',
        critical: true
      },
      {
        name: 'Webhook Retry',
        file: 'webhook-retry.e2e-spec.ts',
        description: 'Tests retry mechanisms and failure handling',
        critical: true
      }
    ];

    this.colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };
  }

  log(message, color = 'white') {
    const timestamp = new Date().toISOString();
    console.log(`${this.colors[color]}[${timestamp}] ${message}${this.colors.reset}`);
  }

  async runTests() {
    this.log('🚀 Starting NEXARA Webhook System E2E Tests', 'cyan');
    this.log('=' * 60, 'cyan');

    try {
      await this.setupTestEnvironment();
      await this.runTestSuites();
      await this.collectCoverage();
      await this.analyzeResults();
      await this.generateReport();
      await this.cleanup();
    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    this.log('🔧 Setting up test environment...', 'yellow');

    // Check if required dependencies are installed
    const requiredPackages = ['jest', 'supertest', '@nestjs/testing'];
    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg);
      } catch (error) {
        throw new Error(`Required package ${pkg} is not installed`);
      }
    }

    // Create test database
    try {
      execSync('npm run prisma:migrate:test', { stdio: 'pipe' });
      this.log('✅ Test database setup complete', 'green');
    } catch (error) {
      this.log('⚠️  Test database setup skipped (may not be configured)', 'yellow');
    }

    // Start test services if needed
    try {
      // Check if application is running
      execSync('curl -f http://localhost:3000/health', { stdio: 'pipe' });
      this.log('✅ Application is running', 'green');
    } catch (error) {
      this.log('⚠️  Application health check failed', 'yellow');
    }
  }

  async runTestSuites() {
    this.log('🧪 Running test suites...', 'yellow');

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }
  }

  async runTestSuite(suite) {
    this.log(`\n📋 Running: ${suite.name}`, 'blue');
    this.log(`📝 Description: ${suite.description}`, 'white');

    const startTime = Date.now();
    const suiteResult = {
      name: suite.name,
      file: suite.file,
      description: suite.description,
      critical: suite.critical,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      coverage: null,
      errors: []
    };

    try {
      const testPath = path.join(__dirname, suite.file);

      // Run Jest for this specific test file
      const jestCommand = [
        'npx', 'jest',
        testPath,
        '--verbose',
        '--coverage',
        '--coverageDirectory=coverage/e2e',
        '--coverageReporters=json,text',
        '--detectOpenHandles',
        '--forceExit',
        '--runInBand'
      ];

      const result = await this.executeCommand(jestCommand);

      // Parse Jest output
      const testResults = this.parseJestOutput(result.stdout);

      suiteResult.passed = testResults.passed;
      suiteResult.failed = testResults.failed;
      suiteResult.skipped = testResults.skipped;
      suiteResult.tests = testResults.tests;

      if (testResults.failed > 0) {
        suiteResult.errors = testResults.errors;
        this.log(`❌ ${suite.name}: ${testResults.failed} failed, ${testResults.passed} passed`, 'red');
      } else {
        this.log(`✅ ${suite.name}: All ${testResults.passed} tests passed`, 'green');
      }

    } catch (error) {
      suiteResult.errors.push({
        type: 'Suite Execution Error',
        message: error.message,
        stack: error.stack
      });
      this.log(`💥 ${suite.name}: Execution failed - ${error.message}`, 'red');
    }

    const endTime = Date.now();
    suiteResult.endTime = new Date(endTime);
    suiteResult.duration = endTime - startTime;

    this.testResults.testSuites.push(suiteResult);
    this.updateGlobalStats(suiteResult);

    this.log(`⏱️  Duration: ${suiteResult.duration}ms`, 'magenta');
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '../../../..')
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseJestOutput(output) {
    const result = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      errors: []
    };

    try {
      // Parse Jest JSON output if available
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.includes('✓') || line.includes('√')) {
          result.passed++;
        } else if (line.includes('✗') || line.includes('×')) {
          result.failed++;
        } else if (line.includes('○')) {
          result.skipped++;
        }

        // Extract test names
        if (line.trim().startsWith('✓') || line.trim().startsWith('✗')) {
          const testName = line.replace(/[✓✗○]/g, '').trim();
          result.tests.push({
            name: testName,
            status: line.includes('✓') ? 'passed' : 'failed'
          });
        }

        // Extract error messages
        if (line.includes('Error:') || line.includes('Failed:')) {
          result.errors.push(line.trim());
        }
      }
    } catch (error) {
      this.log(`⚠️  Could not parse Jest output: ${error.message}`, 'yellow');
    }

    return result;
  }

  updateGlobalStats(suiteResult) {
    this.testResults.totalTests += suiteResult.passed + suiteResult.failed + suiteResult.skipped;
    this.testResults.passedTests += suiteResult.passed;
    this.testResults.failedTests += suiteResult.failed;
    this.testResults.skippedTests += suiteResult.skipped;

    // Update performance metrics
    if (!this.testResults.performance.slowestTest ||
        suiteResult.duration > this.testResults.performance.slowestTest.duration) {
      this.testResults.performance.slowestTest = {
        name: suiteResult.name,
        duration: suiteResult.duration
      };
    }

    if (!this.testResults.performance.fastestTest ||
        suiteResult.duration < this.testResults.performance.fastestTest.duration) {
      this.testResults.performance.fastestTest = {
        name: suiteResult.name,
        duration: suiteResult.duration
      };
    }
  }

  async collectCoverage() {
    this.log('\n📊 Collecting code coverage...', 'yellow');

    try {
      const coveragePath = path.join(__dirname, '../../../../coverage/e2e/coverage-final.json');

      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

        // Calculate overall coverage percentages
        let totalStatements = 0, coveredStatements = 0;
        let totalBranches = 0, coveredBranches = 0;
        let totalFunctions = 0, coveredFunctions = 0;
        let totalLines = 0, coveredLines = 0;

        for (const file in coverage) {
          const fileCoverage = coverage[file];

          if (fileCoverage.s) {
            totalStatements += Object.keys(fileCoverage.s).length;
            coveredStatements += Object.values(fileCoverage.s).filter(v => v > 0).length;
          }

          if (fileCoverage.b) {
            totalBranches += Object.keys(fileCoverage.b).length;
            coveredBranches += Object.values(fileCoverage.b).filter(branches =>
              branches.some(branch => branch > 0)
            ).length;
          }

          if (fileCoverage.f) {
            totalFunctions += Object.keys(fileCoverage.f).length;
            coveredFunctions += Object.values(fileCoverage.f).filter(v => v > 0).length;
          }
        }

        this.testResults.coverage = {
          statements: totalStatements > 0 ? (coveredStatements / totalStatements * 100).toFixed(2) : 0,
          branches: totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(2) : 0,
          functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0,
          lines: totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0
        };

        this.log(`✅ Coverage collected: ${this.testResults.coverage.statements}% statements`, 'green');
      } else {
        this.log('⚠️  No coverage data found', 'yellow');
      }
    } catch (error) {
      this.log(`❌ Coverage collection failed: ${error.message}`, 'red');
    }
  }

  async analyzeResults() {
    this.log('\n🔍 Analyzing test results...', 'yellow');

    this.testResults.endTime = new Date();
    this.testResults.performance.totalDuration =
      this.testResults.endTime.getTime() - this.testResults.startTime.getTime();

    if (this.testResults.totalTests > 0) {
      this.testResults.performance.averageTestTime =
        this.testResults.performance.totalDuration / this.testResults.totalTests;
    }

    // Analyze issues and generate recommendations
    this.analyzeIssues();
    this.generateRecommendations();

    this.log('✅ Analysis complete', 'green');
  }

  analyzeIssues() {
    // Check for critical test failures
    const criticalFailures = this.testResults.testSuites.filter(
      suite => suite.critical && suite.failed > 0
    );

    if (criticalFailures.length > 0) {
      this.testResults.issues.push({
        type: 'Critical Test Failures',
        severity: 'High',
        description: `${criticalFailures.length} critical test suite(s) have failures`,
        suites: criticalFailures.map(s => s.name)
      });
    }

    // Check for low coverage
    if (this.testResults.coverage.statements < 80) {
      this.testResults.issues.push({
        type: 'Low Code Coverage',
        severity: 'Medium',
        description: `Statement coverage is ${this.testResults.coverage.statements}% (target: 80%)`
      });
    }

    // Check for slow tests
    if (this.testResults.performance.slowestTest &&
        this.testResults.performance.slowestTest.duration > 30000) {
      this.testResults.issues.push({
        type: 'Slow Test Performance',
        severity: 'Medium',
        description: `Slowest test (${this.testResults.performance.slowestTest.name}) took ${this.testResults.performance.slowestTest.duration}ms`
      });
    }

    // Check for skipped tests
    if (this.testResults.skippedTests > 0) {
      this.testResults.issues.push({
        type: 'Skipped Tests',
        severity: 'Low',
        description: `${this.testResults.skippedTests} test(s) were skipped`
      });
    }
  }

  generateRecommendations() {
    if (this.testResults.failedTests > 0) {
      this.testResults.recommendations.push(
        'Review and fix failing tests before deploying to production'
      );
    }

    if (this.testResults.coverage.statements < 80) {
      this.testResults.recommendations.push(
        'Add more test cases to improve code coverage, especially for webhook validation logic'
      );
    }

    if (this.testResults.performance.averageTestTime > 5000) {
      this.testResults.recommendations.push(
        'Optimize test performance by using mocks and reducing external dependencies'
      );
    }

    if (this.testResults.testSuites.some(s => s.errors.length > 0)) {
      this.testResults.recommendations.push(
        'Investigate and resolve test execution errors for more reliable test runs'
      );
    }

    this.testResults.recommendations.push(
      'Run these E2E tests as part of your CI/CD pipeline to catch integration issues early'
    );
  }

  async generateReport() {
    this.log('\n📄 Generating test report...', 'yellow');

    const reportData = {
      ...this.testResults,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
        testRunner: 'NEXARA Webhook E2E Test Runner v1.0.0'
      }
    };

    // Generate JSON report
    const jsonReportPath = path.join(__dirname, 'e2e-test-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(reportData);
    const htmlReportPath = path.join(__dirname, 'e2e-test-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate console summary
    this.printSummary();

    this.log(`✅ Reports generated:`, 'green');
    this.log(`   JSON: ${jsonReportPath}`, 'cyan');
    this.log(`   HTML: ${htmlReportPath}`, 'cyan');
  }

  generateHtmlReport(data) {
    const passRate = data.totalTests > 0 ? (data.passedTests / data.totalTests * 100).toFixed(1) : 0;
    const statusColor = data.failedTests === 0 ? 'green' : 'red';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>NEXARA Webhook System E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .test-suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #f9f9f9; padding: 10px; font-weight: bold; }
        .suite-details { padding: 15px; }
        .issues { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendations { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>NEXARA Webhook System E2E Test Report</h1>
        <p>Generated: ${data.metadata.timestamp}</p>
        <p>Duration: ${data.performance.totalDuration}ms</p>
        <p>Status: <span class="${statusColor}">${data.failedTests === 0 ? 'PASSED' : 'FAILED'}</span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Test Results</h3>
            <p>Total: ${data.totalTests}</p>
            <p class="success">Passed: ${data.passedTests}</p>
            <p class="error">Failed: ${data.failedTests}</p>
            <p class="warning">Skipped: ${data.skippedTests}</p>
            <p>Pass Rate: ${passRate}%</p>
        </div>
        <div class="metric">
            <h3>Code Coverage</h3>
            <p>Statements: ${data.coverage.statements}%</p>
            <p>Branches: ${data.coverage.branches}%</p>
            <p>Functions: ${data.coverage.functions}%</p>
        </div>
        <div class="metric">
            <h3>Performance</h3>
            <p>Average Test Time: ${Math.round(data.performance.averageTestTime)}ms</p>
            <p>Slowest: ${data.performance.slowestTest ? data.performance.slowestTest.name : 'N/A'}</p>
            <p>Fastest: ${data.performance.fastestTest ? data.performance.fastestTest.name : 'N/A'}</p>
        </div>
    </div>

    <h2>Test Suites</h2>
    ${data.testSuites.map(suite => `
        <div class="test-suite">
            <div class="suite-header">
                ${suite.name} - ${suite.failed === 0 ? '<span class="success">PASSED</span>' : '<span class="error">FAILED</span>'}
            </div>
            <div class="suite-details">
                <p><strong>Description:</strong> ${suite.description}</p>
                <p><strong>Duration:</strong> ${suite.duration}ms</p>
                <p><strong>Results:</strong> ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped</p>
                ${suite.errors.length > 0 ? `
                    <h4>Errors:</h4>
                    <ul>
                        ${suite.errors.map(error => `<li class="error">${error.message || error}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        </div>
    `).join('')}

    ${data.issues.length > 0 ? `
        <div class="issues">
            <h2>Issues Found</h2>
            <ul>
                ${data.issues.map(issue => `
                    <li><strong>${issue.type}</strong> (${issue.severity}): ${issue.description}</li>
                `).join('')}
            </ul>
        </div>
    ` : ''}

    ${data.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>
    `;
  }

  printSummary() {
    const { colors } = this;

    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}${colors.cyan}NEXARA WEBHOOK SYSTEM E2E TEST SUMMARY${colors.reset}`);
    console.log('='.repeat(80));

    // Overall status
    const overallStatus = this.testResults.failedTests === 0 ? 'PASSED' : 'FAILED';
    const statusColor = this.testResults.failedTests === 0 ? 'green' : 'red';
    console.log(`${colors.bold}Overall Status: ${colors[statusColor]}${overallStatus}${colors.reset}`);

    // Test results
    console.log(`\n${colors.bold}Test Results:${colors.reset}`);
    console.log(`  Total Tests: ${this.testResults.totalTests}`);
    console.log(`  ${colors.green}Passed: ${this.testResults.passedTests}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${this.testResults.failedTests}${colors.reset}`);
    console.log(`  ${colors.yellow}Skipped: ${this.testResults.skippedTests}${colors.reset}`);

    if (this.testResults.totalTests > 0) {
      const passRate = (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(1);
      console.log(`  Pass Rate: ${passRate}%`);
    }

    // Coverage
    console.log(`\n${colors.bold}Code Coverage:${colors.reset}`);
    console.log(`  Statements: ${this.testResults.coverage.statements}%`);
    console.log(`  Branches: ${this.testResults.coverage.branches}%`);
    console.log(`  Functions: ${this.testResults.coverage.functions}%`);

    // Performance
    console.log(`\n${colors.bold}Performance:${colors.reset}`);
    console.log(`  Total Duration: ${this.testResults.performance.totalDuration}ms`);
    console.log(`  Average Test Time: ${Math.round(this.testResults.performance.averageTestTime)}ms`);

    if (this.testResults.performance.slowestTest) {
      console.log(`  Slowest Test: ${this.testResults.performance.slowestTest.name} (${this.testResults.performance.slowestTest.duration}ms)`);
    }

    // Test suites
    console.log(`\n${colors.bold}Test Suites:${colors.reset}`);
    this.testResults.testSuites.forEach(suite => {
      const status = suite.failed === 0 ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
      console.log(`  ${suite.name}: ${status} (${suite.passed} passed, ${suite.failed} failed)`);
    });

    // Issues
    if (this.testResults.issues.length > 0) {
      console.log(`\n${colors.bold}${colors.yellow}Issues Found:${colors.reset}`);
      this.testResults.issues.forEach(issue => {
        console.log(`  ${colors.yellow}• ${issue.type} (${issue.severity}): ${issue.description}${colors.reset}`);
      });
    }

    // Recommendations
    if (this.testResults.recommendations.length > 0) {
      console.log(`\n${colors.bold}${colors.cyan}Recommendations:${colors.reset}`);
      this.testResults.recommendations.forEach(rec => {
        console.log(`  ${colors.cyan}• ${rec}${colors.reset}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  async cleanup() {
    this.log('\n🧹 Cleaning up...', 'yellow');

    try {
      // Clean up test data if needed
      // execSync('npm run test:cleanup', { stdio: 'pipe' });
      this.log('✅ Cleanup complete', 'green');
    } catch (error) {
      this.log('⚠️  Cleanup skipped', 'yellow');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new WebhookE2ETestRunner();

  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NEXARA Webhook System E2E Test Runner

Usage: node run-e2e-tests.js [options]

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose output
  --coverage          Generate coverage report
  --no-cleanup        Skip cleanup after tests

Examples:
  node run-e2e-tests.js                    # Run all tests
  node run-e2e-tests.js --verbose          # Run with verbose output
  node run-e2e-tests.js --coverage         # Run with coverage
    `);
    process.exit(0);
  }

  runner.runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = WebhookE2ETestRunner;