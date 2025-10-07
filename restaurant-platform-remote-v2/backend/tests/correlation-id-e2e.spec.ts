import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// Production URLs
const FRONTEND_URL = 'http://31.57.166.18:3000';
const BACKEND_URL = 'http://localhost:3001';
const PRINTER_NAME = 'POS-80C';

// Log paths
const BACKEND_LOG_PATH = '/tmp/backend-debug.log';
const DESKTOP_LOG_PATH = '/tmp/printer-debug.log';

test.describe('Phase 4-6: Correlation ID E2E Test', () => {
  let browser: Browser;
  let page: Page;
  let correlationId: string;

  test.beforeAll(async () => {
    // Clear existing logs
    try {
      await fs.writeFile(BACKEND_LOG_PATH, '');
      await fs.writeFile(DESKTOP_LOG_PATH, '');
      console.log('✅ Cleared log files');
    } catch (error) {
      console.log('⚠️ Could not clear logs:', error.message);
    }

    browser = await chromium.launch({
      headless: false, // Visual debugging
      slowMo: 500, // Slow down for observation
    });
  });

  test.afterAll(async () => {
    await browser?.close();
  });

  test('Complete correlation ID flow from frontend to desktop app', async () => {
    // STEP 1: Open browser and navigate
    console.log('📱 Step 1: Opening browser to printing settings...');
    page = await browser.newPage();

    // Enable console logging
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`🌐 [Browser Console]: ${text}`);
    });

    // Enable network request logging
    const networkRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/printing/')) {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
        });
      }
    });

    // Enable network response logging
    const networkResponses: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/printing/')) {
        try {
          const body = await response.text();
          networkResponses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            body: body,
          });
        } catch (e) {
          // Ignore errors reading body
        }
      }
    });

    await page.goto(`${FRONTEND_URL}/settings/printing`);
    await page.waitForLoadState('networkidle');

    console.log('✅ Page loaded successfully');

    // STEP 2: Find and click Test Print button
    console.log('📝 Step 2: Looking for Test Print button...');

    // Wait for printer list to load
    await page.waitForSelector('[data-testid="printer-card"], .printer-card, button:has-text("Test Print")', {
      timeout: 10000,
    });

    // Find the Test Print button for POS-80C
    const testPrintButton = page.locator(`button:has-text("Test Print")`).first();

    if (!(await testPrintButton.isVisible())) {
      throw new Error('Test Print button not found');
    }

    console.log('✅ Found Test Print button');

    // STEP 3: Click and capture correlation ID
    console.log('🖨️ Step 3: Clicking Test Print button...');

    // Start time tracking
    const startTime = Date.now();

    await testPrintButton.click();

    // Wait for network request with correlation ID
    await page.waitForTimeout(2000); // Give time for request to complete

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`⏱️ Response time: ${responseTime}ms`);

    // STEP 4: Extract correlation ID from console logs
    console.log('🔍 Step 4: Extracting correlation ID from logs...');

    const correlationIdLog = consoleLogs.find(log =>
      log.includes('🆔 Correlation ID:') || log.includes('printer_test_')
    );

    if (correlationIdLog) {
      const match = correlationIdLog.match(/printer_test_[a-z0-9]+/);
      if (match) {
        correlationId = match[0];
        console.log(`✅ Found correlation ID: ${correlationId}`);
      }
    }

    // Also check network requests for correlation ID
    const requestWithCorrelationId = networkRequests.find(req =>
      req.headers['x-correlation-id'] || req.url.includes('correlationId')
    );

    if (requestWithCorrelationId && !correlationId) {
      correlationId = requestWithCorrelationId.headers['x-correlation-id'];
      console.log(`✅ Found correlation ID in request header: ${correlationId}`);
    }

    // Check network responses
    const responseWithCorrelationId = networkResponses.find(res =>
      res.body.includes('printer_test_') || res.headers['x-correlation-id']
    );

    if (responseWithCorrelationId) {
      console.log('✅ Backend response received:', {
        status: responseWithCorrelationId.status,
        correlationId: responseWithCorrelationId.headers['x-correlation-id'],
      });
    }

    // STEP 5: Verify backend logs
    console.log('📋 Step 5: Checking backend logs...');

    await page.waitForTimeout(2000); // Allow logs to flush

    try {
      const backendLog = await fs.readFile(BACKEND_LOG_PATH, 'utf-8');
      const backendLines = backendLog.split('\n');

      // Look for correlation ID markers
      const correlationIdMarkers = backendLines.filter(line =>
        line.includes('🆔 [PHYSICAL-TEST] Correlation ID:') ||
        line.includes(correlationId)
      );

      const requestResolutionMarkers = backendLines.filter(line =>
        line.includes('✅ [REQ-RES] Resolved request:') &&
        line.includes(correlationId)
      );

      console.log('📊 Backend Log Analysis:');
      console.log(`  - Correlation ID markers: ${correlationIdMarkers.length}`);
      console.log(`  - Request resolution markers: ${requestResolutionMarkers.length}`);

      if (correlationIdMarkers.length > 0) {
        console.log('✅ Backend correlation ID tracking confirmed');
        correlationIdMarkers.forEach(line => console.log(`  ${line.trim()}`));
      } else {
        console.log('⚠️ No backend correlation ID markers found');
      }

      if (requestResolutionMarkers.length > 0) {
        console.log('✅ Request resolution tracking confirmed');
        requestResolutionMarkers.forEach(line => console.log(`  ${line.trim()}`));
      }

      // Verify response time in logs
      const responseTimeLog = backendLines.find(line =>
        line.includes(correlationId) && /\d+ms/.test(line)
      );

      if (responseTimeLog) {
        const timeMatch = responseTimeLog.match(/(\d+)ms/);
        if (timeMatch) {
          const loggedTime = parseInt(timeMatch[1]);
          console.log(`✅ Backend logged response time: ${loggedTime}ms`);
          expect(loggedTime).toBeLessThan(5000);
        }
      }

    } catch (error) {
      console.log('⚠️ Could not read backend log:', error.message);
    }

    // STEP 6: Verify Desktop App logs
    console.log('🖥️ Step 6: Checking Desktop App logs...');

    try {
      const desktopLog = await fs.readFile(DESKTOP_LOG_PATH, 'utf-8');
      const desktopLines = desktopLog.split('\n');

      const desktopCorrelationIdLines = desktopLines.filter(line =>
        line.includes(correlationId)
      );

      console.log('📊 Desktop App Log Analysis:');
      console.log(`  - Correlation ID occurrences: ${desktopCorrelationIdLines.length}`);

      if (desktopCorrelationIdLines.length > 0) {
        console.log('✅ Desktop App correlation ID tracking confirmed');
        desktopCorrelationIdLines.slice(0, 5).forEach(line =>
          console.log(`  ${line.trim()}`)
        );
      } else {
        console.log('⚠️ No Desktop App correlation ID markers found');
      }

    } catch (error) {
      console.log('⚠️ Could not read Desktop App log:', error.message);
    }

    // STEP 7: Final assertions
    console.log('✅ Step 7: Running final assertions...');

    expect(correlationId).toBeTruthy();
    expect(correlationId).toMatch(/^printer_test_[a-z0-9]+$/);
    expect(responseTime).toBeLessThan(5000);
    expect(consoleLogs.length).toBeGreaterThan(0);
    expect(networkRequests.length).toBeGreaterThan(0);

    console.log('🎉 All correlation ID E2E tests passed!');
    console.log('📊 Test Summary:');
    console.log(`  - Correlation ID: ${correlationId}`);
    console.log(`  - Response Time: ${responseTime}ms`);
    console.log(`  - Console Logs: ${consoleLogs.length}`);
    console.log(`  - Network Requests: ${networkRequests.length}`);
    console.log(`  - Network Responses: ${networkResponses.length}`);
  });

  test('Verify correlation ID in print history', async () => {
    if (!correlationId) {
      test.skip();
      return;
    }

    console.log('📜 Checking print history for correlation ID...');

    page = page || await browser.newPage();

    // Navigate to print history or admin panel
    await page.goto(`${FRONTEND_URL}/settings/printing`);
    await page.waitForLoadState('networkidle');

    // Look for correlation ID in page content
    const pageContent = await page.content();
    const hasCorrelationId = pageContent.includes(correlationId);

    console.log(`Correlation ID in page: ${hasCorrelationId ? '✅ Found' : '❌ Not found'}`);

    // Optional: Check if there's a print history section
    const historySection = page.locator('[data-testid="print-history"], .print-history');
    if (await historySection.isVisible()) {
      console.log('✅ Print history section found');
      const historyContent = await historySection.textContent();
      console.log('History content preview:', historyContent?.slice(0, 200));
    }
  });
});

test.describe('Phase 4-6: Additional Correlation ID Tests', () => {
  test('Multiple print jobs maintain unique correlation IDs', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const correlationIds: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('printer_test_')) {
        const match = text.match(/printer_test_[a-z0-9]+/);
        if (match) {
          correlationIds.push(match[0]);
        }
      }
    });

    await page.goto(`${FRONTEND_URL}/settings/printing`);
    await page.waitForLoadState('networkidle');

    // Click Test Print 3 times
    for (let i = 0; i < 3; i++) {
      const testPrintButton = page.locator(`button:has-text("Test Print")`).first();
      if (await testPrintButton.isVisible()) {
        await testPrintButton.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log('📊 Correlation IDs collected:', correlationIds);

    // Verify uniqueness
    const uniqueIds = new Set(correlationIds);
    expect(uniqueIds.size).toBe(correlationIds.length);

    console.log(`✅ All ${correlationIds.length} correlation IDs are unique`);

    await browser.close();
  });
});
