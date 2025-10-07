const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to menu list page...');
    await page.goto('http://localhost:3000/menu/list', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Waiting for page to settle...');
    await page.waitForTimeout(2000);

    // Check if we're on login page
    const isLoginPage = await page.locator('input[type="email"], input[type="password"]').count() > 0;

    if (isLoginPage) {
      console.log('Login page detected - attempting to log in...');
      // Try to find and fill login form
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      console.log('Waiting for navigation after login...');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {
        console.log('Navigation timeout - continuing anyway');
      });

      // Navigate to menu list again after login
      console.log('Navigating to menu list page again...');
      await page.goto('http://localhost:3000/menu/list', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(2000);
    }

    console.log('Taking full page screenshot...');
    await page.screenshot({
      path: '/tmp/menu-list-current-state.png',
      fullPage: true
    });

    console.log('Screenshot saved to /tmp/menu-list-current-state.png');

    // Analyze what's visible
    console.log('\n=== Page Analysis ===');

    const pageTitle = await page.title();
    console.log('Page Title:', pageTitle);

    const url = page.url();
    console.log('Current URL:', url);

    // Check for sync buttons
    const syncButtons = await page.locator('button:has-text("Sync"), button:has-text("sync")').count();
    console.log('Sync buttons found:', syncButtons);

    // Check for menu items
    const menuItems = await page.locator('[class*="menu"], [class*="Menu"], tr, li').count();
    console.log('Potential menu items found:', menuItems);

    // Check for any buttons
    const allButtons = await page.locator('button').count();
    console.log('Total buttons on page:', allButtons);

    // Get all button text
    const buttonTexts = await page.locator('button').allTextContents();
    console.log('Button texts found:', buttonTexts);

    // Check for errors
    const errorMessages = await page.locator('[class*="error"], [class*="Error"], .text-red-500, .text-red-600').allTextContents();
    if (errorMessages.length > 0) {
      console.log('Error messages:', errorMessages);
    }

    console.log('\n=== Analysis Complete ===');

  } catch (error) {
    console.error('Error occurred:', error.message);

    // Take screenshot anyway
    try {
      await page.screenshot({
        path: '/tmp/menu-list-current-state.png',
        fullPage: true
      });
      console.log('Screenshot saved despite error');
    } catch (screenshotError) {
      console.error('Could not take screenshot:', screenshotError.message);
    }
  } finally {
    console.log('\nKeeping browser open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
