#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}🧪 ${msg}${colors.reset}`)
};

async function testBackendAPI() {
  log.test('Testing Backend API...');

  try {
    // Test login endpoint
    const response = await fetch('http://localhost:3002/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      })
    });

    const data = await response.json();

    if (data.success || data.access_token) {
      log.success('Backend API login endpoint working');
      return { success: true, token: data.access_token || data.token };
    } else {
      log.error('Backend API login failed');
      return { success: false };
    }
  } catch (error) {
    log.error(`Backend API error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPageWithPuppeteer(browser, pageName, url) {
  log.test(`Testing ${pageName} page...`);

  const page = await browser.newPage();
  const errors = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    // Check for specific error indicators
    const hasErrorModal = await page.$('.error-modal') !== null;
    const hasRuntimeError = await page.evaluate(() => {
      const errorText = document.body.innerText;
      return errorText.includes('Unhandled Runtime Error') ||
             errorText.includes('Application error') ||
             errorText.includes('Something went wrong');
    });

    // Take screenshot
    await page.screenshot({
      path: `/tmp/test-${pageName.toLowerCase().replace(/\s/g, '-')}.png`
    });

    if (errors.length > 0) {
      log.warning(`${pageName} has console errors: ${errors.join(', ')}`);
    }

    if (hasErrorModal || hasRuntimeError) {
      log.error(`${pageName} has runtime errors displayed on page`);
      return false;
    }

    log.success(`${pageName} loaded successfully`);
    return true;

  } catch (error) {
    log.error(`${pageName} failed to load: ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function runComprehensiveTests() {
  console.log('');
  console.log('🚀 COMPREHENSIVE INTEGRATION PLATFORM TEST SUITE');
  console.log('================================================\n');

  let allTestsPassed = true;

  // Test 1: Backend API
  const backendResult = await testBackendAPI();
  if (!backendResult.success) {
    allTestsPassed = false;
  }

  console.log('');

  // Test 2: Frontend Pages with Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pagesToTest = [
      { name: 'Login', url: 'http://localhost:3003/login' },
      { name: 'Orders', url: 'http://localhost:3003/orders' },
      { name: 'Dashboard', url: 'http://localhost:3003/dashboard' },
      { name: 'Integrations', url: 'http://localhost:3003/integrations' }
    ];

    for (const page of pagesToTest) {
      const result = await testPageWithPuppeteer(browser, page.name, page.url);
      if (!result) {
        allTestsPassed = false;
      }
      console.log('');
    }

  } catch (error) {
    log.error(`Browser testing failed: ${error.message}`);
    allTestsPassed = false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Test Summary
  console.log('================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================\n');

  if (allTestsPassed) {
    log.success('ALL TESTS PASSED! Platform is working correctly.');
  } else {
    log.error('SOME TESTS FAILED! Please review the errors above.');
  }

  console.log('');
  console.log('Screenshots saved to /tmp/test-*.png');
  console.log('');

  process.exit(allTestsPassed ? 0 : 1);
}

// Check if dependencies are installed
async function checkAndInstallDependencies() {
  try {
    require('puppeteer');
    require('node-fetch');
    runComprehensiveTests();
  } catch (e) {
    log.info('Installing required dependencies...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install puppeteer node-fetch', {
        stdio: 'inherit',
        cwd: '/home/admin/integration-platform'
      });
      log.success('Dependencies installed');
      runComprehensiveTests();
    } catch (installError) {
      log.error('Failed to install dependencies');
      process.exit(1);
    }
  }
}

checkAndInstallDependencies();