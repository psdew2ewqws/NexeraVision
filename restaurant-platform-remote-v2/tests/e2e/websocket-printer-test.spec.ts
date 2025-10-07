import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const PRODUCTION_URL = 'http://31.57.166.18:3000';
const PRINTING_PAGE = `${PRODUCTION_URL}/settings/printing`;
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const TIMEOUT_SUCCESS = 2000; // 2 seconds - expected success time
const TIMEOUT_FAILURE = 15000; // 15 seconds - old timeout (should not happen)

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Phase 0 WebSocket Printer Test Fix', () => {
  let page: Page;
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let networkRequests: any[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Capture console logs
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString(),
      });
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`[PAGE ERROR] ${error.message}`);
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should successfully test print POS-80C printer within 2 seconds', async () => {
    const testStartTime = Date.now();

    console.log('=== Test Start ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Target URL:', PRINTING_PAGE);

    // Step 1: Navigate to printing settings page
    console.log('\nStep 1: Navigating to printing settings page...');
    await page.goto(PRINTING_PAGE, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-page-loaded.png'),
      fullPage: true
    });

    // Step 2: Check if login is required
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/login')) {
      console.log('\nStep 2: Login required - attempting authentication...');

      // Try to find login form elements
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

      // Check if login elements exist
      const emailExists = await emailInput.count() > 0;
      const passwordExists = await passwordInput.count() > 0;

      if (emailExists && passwordExists) {
        // Try common test credentials
        await emailInput.fill('admin@test.com');
        await passwordInput.fill('password');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-form-filled.png') });

        await loginButton.click();
        await page.waitForURL('**/settings/printing', { timeout: 5000 }).catch(() => {
          console.log('Login may have failed or redirected elsewhere');
        });

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-login.png'), fullPage: true });
      } else {
        console.log('Login form not found - may need manual credentials');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-page.png'), fullPage: true });
      }
    }

    // Step 3: Wait for page to fully load
    console.log('\nStep 3: Waiting for page elements to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give React time to hydrate

    // Step 4: Locate POS-80C printer
    console.log('\nStep 4: Locating POS-80C printer...');

    // Try multiple possible selectors for the printer card and test button
    const printerCardSelectors = [
      'div:has-text("POS-80C")',
      '[data-printer-name="POS-80C"]',
      'div.printer-card:has-text("POS-80C")',
      'li:has-text("POS-80C")',
    ];

    let printerCard = null;
    for (const selector of printerCardSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        printerCard = element;
        console.log(`Found printer with selector: ${selector}`);
        break;
      }
    }

    if (!printerCard) {
      console.log('ERROR: POS-80C printer not found on page');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-printer-not-found.png'),
        fullPage: true
      });

      // Get all text content to debug
      const pageText = await page.textContent('body');
      console.log('Page contains POS-80C:', pageText?.includes('POS-80C'));

      throw new Error('POS-80C printer not found on page');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-printer-found.png'),
      fullPage: true
    });

    // Step 5: Find and click Test Print button
    console.log('\nStep 5: Finding Test Print button...');

    const testButtonSelectors = [
      'button:has-text("Test Print")',
      'button:has-text("Test")',
      '[data-test="test-print-button"]',
      'button[aria-label*="test"]',
    ];

    let testButton = null;
    for (const selector of testButtonSelectors) {
      // Look for button within or near the printer card
      const button = printerCard.locator(selector).first();
      if (await button.count() > 0) {
        testButton = button;
        console.log(`Found test button with selector: ${selector}`);
        break;
      }
    }

    if (!testButton) {
      // Try finding button anywhere on page as fallback
      for (const selector of testButtonSelectors) {
        const button = page.locator(selector).first();
        if (await button.count() > 0) {
          testButton = button;
          console.log(`Found test button (global) with selector: ${selector}`);
          break;
        }
      }
    }

    if (!testButton) {
      console.log('ERROR: Test Print button not found');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-test-button-not-found.png'),
        fullPage: true
      });
      throw new Error('Test Print button not found');
    }

    // Step 6: Click Test Print and measure response time
    console.log('\nStep 6: Clicking Test Print button...');
    const clickStartTime = Date.now();

    // Listen for WebSocket messages
    const wsMessages: any[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        wsMessages.push({ type: 'received', payload: event.payload, timestamp: Date.now() });
      });
      ws.on('framesent', event => {
        wsMessages.push({ type: 'sent', payload: event.payload, timestamp: Date.now() });
      });
    });

    await testButton.click();
    console.log('Test Print button clicked at:', new Date(clickStartTime).toISOString());

    // Step 7: Wait for response (success toast or error message)
    console.log('\nStep 7: Waiting for response...');

    // Try to detect success/failure within expected timeframe
    let responseDetected = false;
    let responseTime = 0;
    let responseType = 'unknown';
    let responseMessage = '';

    try {
      // Wait for success toast notification (should appear within 2 seconds)
      const successToast = page.locator('[role="status"], .toast, [class*="toast"], [class*="notification"]').filter({ hasText: /success|sent|completed/i });

      await successToast.waitFor({ state: 'visible', timeout: TIMEOUT_SUCCESS });

      responseDetected = true;
      responseTime = Date.now() - clickStartTime;
      responseType = 'success';
      responseMessage = await successToast.textContent() || 'Success toast appeared';

      console.log(`✅ SUCCESS detected in ${responseTime}ms`);
      console.log('Success message:', responseMessage);

    } catch (successError) {
      console.log('No success toast within 2 seconds, checking for error...');

      // Check for error message
      try {
        const errorMessage = page.locator('[role="alert"], .error, [class*="error"], [class*="toast"]').filter({ hasText: /error|fail|timeout/i });

        await errorMessage.waitFor({ state: 'visible', timeout: TIMEOUT_FAILURE - TIMEOUT_SUCCESS });

        responseDetected = true;
        responseTime = Date.now() - clickStartTime;
        responseType = 'error';
        responseMessage = await errorMessage.textContent() || 'Error message appeared';

        console.log(`❌ ERROR detected in ${responseTime}ms`);
        console.log('Error message:', responseMessage);

      } catch (errorTimeout) {
        responseDetected = false;
        responseTime = Date.now() - clickStartTime;
        responseType = 'timeout';
        responseMessage = 'No response detected within timeout period';

        console.log(`⏱️ TIMEOUT after ${responseTime}ms`);
      }
    }

    // Step 8: Take final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `06-final-state-${responseType}.png`),
      fullPage: true
    });

    // Step 9: Generate detailed report
    const testEndTime = Date.now();
    const totalTestTime = testEndTime - testStartTime;

    const report = {
      testResult: responseType,
      responseTime: responseTime,
      totalTestTime: totalTestTime,
      responseMessage: responseMessage,
      expectedTime: TIMEOUT_SUCCESS,
      passedExpectation: responseType === 'success' && responseTime <= TIMEOUT_SUCCESS,

      screenshots: {
        pageLoaded: path.join(SCREENSHOT_DIR, '01-page-loaded.png'),
        printerFound: path.join(SCREENSHOT_DIR, '04-printer-found.png'),
        finalState: path.join(SCREENSHOT_DIR, `06-final-state-${responseType}.png`),
      },

      consoleLogs: consoleLogs,
      consoleErrors: consoleErrors,
      networkRequests: networkRequests.slice(-20), // Last 20 requests
      webSocketMessages: wsMessages,

      timestamps: {
        testStart: new Date(testStartTime).toISOString(),
        clickTime: new Date(clickStartTime).toISOString(),
        responseTime: new Date(clickStartTime + responseTime).toISOString(),
        testEnd: new Date(testEndTime).toISOString(),
      },

      analysis: {
        phase0FixWorking: responseType === 'success' && responseTime <= TIMEOUT_SUCCESS,
        webSocketConnected: wsMessages.length > 0,
        anyErrors: consoleErrors.length > 0,
        criticalErrors: consoleErrors.filter(e => e.includes('WebSocket') || e.includes('timeout')),
      }
    };

    // Save report to file
    const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('\n=== Test Report Saved ===');
    console.log('Report path:', reportPath);

    // Print summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Result:', responseType.toUpperCase());
    console.log('Response Time:', responseTime + 'ms');
    console.log('Expected Time:', TIMEOUT_SUCCESS + 'ms');
    console.log('Phase 0 Fix Working:', report.analysis.phase0FixWorking ? '✅ YES' : '❌ NO');
    console.log('WebSocket Connected:', report.analysis.webSocketConnected ? '✅ YES' : '❌ NO');
    console.log('Console Errors:', consoleErrors.length);
    console.log('Screenshots:', Object.keys(report.screenshots).length);
    console.log('\nDetailed report available at:', reportPath);

    // Assertions
    expect(responseDetected).toBe(true);
    expect(responseType).toBe('success');
    expect(responseTime).toBeLessThanOrEqual(TIMEOUT_SUCCESS);
    expect(report.analysis.phase0FixWorking).toBe(true);
  });
});
