import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  // Collect network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('printer') || request.url().includes('api')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
      console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
    }
  });

  // Collect network responses
  const networkResponses = [];
  page.on('response', async response => {
    if (response.url().includes('printer') || response.url().includes('api')) {
      try {
        const body = await response.text();
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          body: body
        });
        console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
        console.log(`[RESPONSE BODY]:`, body.substring(0, 500));
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
    console.log('\n=== Navigating to printing settings page ===\n');

    // First, navigate to the main page to check if login is needed
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait a bit to see what happens
    await page.waitForTimeout(2000);

    // Take a screenshot of the initial page
    await page.screenshot({ path: '/home/admin/restaurant-platform-remote-v2/screenshots/step1-initial.png', fullPage: true });
    console.log('Screenshot saved: step1-initial.png');

    // Check if we're on a login page
    const isLoginPage = await page.locator('input[type="password"]').count() > 0;
    console.log(`\nIs login page: ${isLoginPage}`);

    if (isLoginPage) {
      console.log('\n=== Login required - attempting to login ===\n');

      // Try to find login form fields
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

      // Fill in credentials (using common test credentials)
      await emailInput.fill('admin@test.com');
      await passwordInput.fill('password123');

      await page.screenshot({ path: '/home/admin/restaurant-platform-remote-v2/screenshots/step2-login-filled.png', fullPage: true });
      console.log('Screenshot saved: step2-login-filled.png');

      await submitButton.click();

      // Wait for navigation after login
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: '/home/admin/restaurant-platform-remote-v2/screenshots/step3-after-login.png', fullPage: true });
      console.log('Screenshot saved: step3-after-login.png');
    }

    // Now navigate to the printing settings page
    console.log('\n=== Navigating to /settings/printing ===\n');
    await page.goto('http://localhost:3000/settings/printing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({ path: '/home/admin/restaurant-platform-remote-v2/screenshots/step4-printing-settings.png', fullPage: true });
    console.log('Screenshot saved: step4-printing-settings.png');

    // Check what's on the page
    const pageTitle = await page.title();
    console.log(`\nPage title: ${pageTitle}`);

    const pageContent = await page.content();
    console.log(`\nPage has content: ${pageContent.length} characters`);

    // Look for printer-related elements
    const printerElements = await page.locator('[class*="printer"], [id*="printer"], [data-testid*="printer"]').count();
    console.log(`\nPrinter-related elements found: ${printerElements}`);

    // Check if there's a loading state
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], [aria-busy="true"]').count();
    console.log(`Loading elements: ${loadingElements}`);

    // Check for empty state messages
    const emptyStateText = await page.locator('text=/no printer|empty|not found/i').count();
    console.log(`Empty state messages: ${emptyStateText}`);

    // Wait a bit more to ensure all requests complete
    await page.waitForTimeout(3000);

    console.log('\n=== SUMMARY ===\n');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total network requests: ${networkRequests.length}`);
    console.log(`Total network responses: ${networkResponses.length}`);

    // Print detailed network information
    console.log('\n=== NETWORK REQUESTS DETAILS ===\n');
    networkRequests.forEach((req, index) => {
      console.log(`\nRequest ${index + 1}:`);
      console.log(`  URL: ${req.url}`);
      console.log(`  Method: ${req.method}`);
      console.log(`  Auth Header: ${req.headers['authorization'] || 'MISSING'}`);
      if (req.postData) {
        console.log(`  POST Data: ${req.postData.substring(0, 200)}`);
      }
    });

    console.log('\n=== NETWORK RESPONSES DETAILS ===\n');
    networkResponses.forEach((res, index) => {
      console.log(`\nResponse ${index + 1}:`);
      console.log(`  URL: ${res.url}`);
      console.log(`  Status: ${res.status}`);
      console.log(`  Body: ${res.body.substring(0, 500)}`);
    });

    console.log('\n=== CONSOLE ERRORS ===\n');
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    errors.forEach((err, index) => {
      console.log(`\nError ${index + 1}:`);
      console.log(`  ${err.text}`);
      if (err.location) {
        console.log(`  Location: ${err.location.url}:${err.location.lineNumber}`);
      }
    });

    // Final screenshot
    await page.screenshot({ path: '/home/admin/restaurant-platform-remote-v2/screenshots/step5-final.png', fullPage: true });
    console.log('\nFinal screenshot saved: step5-final.png');

    // Keep browser open for 10 seconds for manual inspection
    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error during debugging:', error);
    await page.screenshot({ path: '/home/admin/restaurant-platform-remote-v2/screenshots/error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
})();
