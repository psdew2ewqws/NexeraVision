import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    console.log(`[CONSOLE ${type.toUpperCase()}]:`, text);
  });

  // Collect network requests related to printers
  const printerRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('printer') || url.includes('printing') || url.includes('/api/')) {
      printerRequests.push({
        url,
        method: request.method(),
        headers: request.headers()
      });
      console.log(`[REQUEST]: ${request.method()} ${url}`);
    }
  });

  // Collect network responses
  const printerResponses = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('printer') || url.includes('printing') || url.includes('/api/')) {
      try {
        const text = await response.text();
        printerResponses.push({
          url,
          status: response.status(),
          body: text
        });
        console.log(`[RESPONSE]: ${response.status()} ${url}`);
        if (text.length < 1000) {
          console.log(`[BODY]:`, text);
        } else {
          console.log(`[BODY PREVIEW]:`, text.substring(0, 300) + '...');
        }
      } catch (e) {
        console.log(`[RESPONSE ERROR]:`, e.message);
      }
    }
  });

  // Collect page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]:`, error.message);
  });

  try {
    console.log('\n=== STEP 1: Direct navigation to printing settings ===\n');

    // Navigate directly to printing settings
    await page.goto('http://localhost:3000/settings/printing', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for any async operations
    await page.waitForTimeout(3000);

    console.log('\n=== STEP 2: Taking initial screenshot ===\n');
    await page.screenshot({
      path: '/home/admin/restaurant-platform-remote-v2/screenshots/printing-page.png',
      fullPage: true
    });

    // Check page title
    const title = await page.title();
    console.log(`\nPage Title: ${title}`);

    // Check if we got redirected to login
    const currentUrl = page.url();
    console.log(`\nCurrent URL: ${currentUrl}`);

    if (currentUrl.includes('login')) {
      console.log('\n=== Redirected to login - using test credentials ===\n');

      // Wait for login form
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');

      await page.screenshot({
        path: '/home/admin/restaurant-platform-remote-v2/screenshots/login-filled.png'
      });

      // Click login button and wait for navigation
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.click('button[type="submit"]')
      ]);

      console.log('Login attempted, waiting for redirect...');
      await page.waitForTimeout(2000);

      // Navigate to printing settings again
      await page.goto('http://localhost:3000/settings/printing', {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForTimeout(3000);
    }

    console.log('\n=== STEP 3: Analyzing page content ===\n');

    // Check for printer-related elements
    const printerCount = await page.locator('[data-testid*="printer"], [class*="printer"], [id*="printer"]').count();
    console.log(`Printer-related DOM elements: ${printerCount}`);

    // Check for loading indicators
    const isLoading = await page.locator('[class*="loading"], [class*="spinner"]').count();
    console.log(`Loading indicators: ${isLoading}`);

    // Check for error messages
    const errorMessages = await page.locator('[class*="error"], [role="alert"]').count();
    console.log(`Error messages: ${errorMessages}`);

    // Check for empty state
    const emptyState = await page.locator('text=/no printer|empty|nothing/i').count();
    console.log(`Empty state messages: ${emptyState}`);

    // Get page text content
    const bodyText = await page.locator('body').textContent();
    console.log(`\nPage text preview (first 500 chars):\n${bodyText.substring(0, 500)}`);

    // Wait for any remaining network requests
    await page.waitForTimeout(3000);

    console.log('\n=== STEP 4: Network Analysis ===\n');
    console.log(`Total printer-related requests: ${printerRequests.length}`);
    console.log(`Total printer-related responses: ${printerResponses.length}`);

    // Detailed request/response analysis
    if (printerRequests.length === 0) {
      console.log('\n⚠️ WARNING: NO API REQUESTS FOR PRINTERS DETECTED!');
      console.log('This indicates the frontend is not making any API calls to fetch printers.');
    } else {
      console.log('\n=== Request Details ===');
      printerRequests.forEach((req, i) => {
        console.log(`\nRequest #${i + 1}:`);
        console.log(`  URL: ${req.url}`);
        console.log(`  Method: ${req.method}`);
        console.log(`  Authorization: ${req.headers.authorization || 'MISSING'}`);
      });

      console.log('\n=== Response Details ===');
      printerResponses.forEach((res, i) => {
        console.log(`\nResponse #${i + 1}:`);
        console.log(`  URL: ${res.url}`);
        console.log(`  Status: ${res.status}`);
        console.log(`  Body: ${res.body.substring(0, 300)}`);
      });
    }

    console.log('\n=== STEP 5: Console Errors ===\n');
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length === 0) {
      console.log('No console errors detected.');
    } else {
      errors.forEach((err, i) => {
        console.log(`\nError #${i + 1}: ${err.text}`);
      });
    }

    console.log('\n=== FINAL SCREENSHOT ===\n');
    await page.screenshot({
      path: '/home/admin/restaurant-platform-remote-v2/screenshots/printing-final.png',
      fullPage: true
    });

    console.log('\n=== SUMMARY ===');
    console.log(`Current URL: ${page.url()}`);
    console.log(`Page Title: ${await page.title()}`);
    console.log(`Console Errors: ${errors.length}`);
    console.log(`API Requests: ${printerRequests.length}`);
    console.log(`Printer Elements: ${printerCount}`);

    // Keep browser open to inspect
    console.log('\n\nBrowser will stay open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({
      path: '/home/admin/restaurant-platform-remote-v2/screenshots/error-final.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\nBrowser closed. Check screenshots in: /home/admin/restaurant-platform-remote-v2/screenshots/');
  }
})();
