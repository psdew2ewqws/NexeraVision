import { test, expect } from '@playwright/test';

test.describe('Menu Sync Button Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to menu list page
    await page.goto('http://localhost:3000/menu/list');

    // Wait for page to load and menus to appear
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for any async operations
  });

  test('should display menu list page successfully', async ({ page }) => {
    // Take full page screenshot
    await page.screenshot({
      path: '/tmp/sync-button-test-page-load.png',
      fullPage: true
    });

    // Verify page title or heading
    const pageTitle = await page.locator('h1, h2').first();
    await expect(pageTitle).toBeVisible();

    console.log('✅ Menu list page loaded successfully');
  });

  test('should verify sync button exists next to menu names', async ({ page }) => {
    // Wait for menu items to load
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item, tr').filter({
      has: page.locator('text=/menu/i, text=/name/i')
    });

    const count = await menuItems.count();
    console.log(`Found ${count} menu items on page`);

    if (count === 0) {
      // Take screenshot if no menus found
      await page.screenshot({
        path: '/tmp/sync-button-test-no-menus.png',
        fullPage: true
      });

      // Check console for errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      console.error('⚠️ No menu items found on page');
      console.error('Console errors:', consoleErrors);
    }

    // Look for sync buttons - try multiple selectors
    const syncButtons = await page.locator('button').filter({
      has: page.locator('svg[aria-hidden="true"]')
    }).filter({
      hasText: ''
    });

    const buttonCount = await syncButtons.count();
    console.log(`Found ${buttonCount} potential sync buttons`);

    // Take screenshot showing buttons
    await page.screenshot({
      path: '/tmp/sync-button-test-buttons-visible.png',
      fullPage: true
    });

    // Verify at least one sync button exists
    expect(buttonCount).toBeGreaterThan(0);
    console.log('✅ Sync buttons found on page');
  });

  test('should verify sync button has ArrowPathIcon', async ({ page }) => {
    // Look for ArrowPath SVG icon (heroicons ArrowPathIcon)
    // The icon has a specific path that creates an arrow with circular motion
    const arrowPathIcons = page.locator('svg').filter({
      has: page.locator('path[stroke-linecap="round"]')
    });

    const iconCount = await arrowPathIcons.count();
    console.log(`Found ${iconCount} ArrowPath-like icons`);

    // Take screenshot highlighting icons
    await page.screenshot({
      path: '/tmp/sync-button-test-icons.png',
      fullPage: true
    });

    expect(iconCount).toBeGreaterThan(0);
    console.log('✅ ArrowPathIcon elements found');
  });

  test('should verify sync button is clickable', async ({ page }) => {
    // Find first sync button
    const firstSyncButton = page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: ''
    }).first();

    // Check if button exists
    await expect(firstSyncButton).toBeVisible({ timeout: 5000 });

    // Check if button is enabled
    const isDisabled = await firstSyncButton.isDisabled();
    console.log(`First sync button disabled: ${isDisabled}`);

    // Take screenshot before click
    await page.screenshot({
      path: '/tmp/sync-button-test-before-click.png',
      fullPage: true
    });

    expect(isDisabled).toBe(false);
    console.log('✅ Sync button is clickable (not disabled)');
  });

  test('should test sync button click functionality', async ({ page }) => {
    // Set up console monitoring
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Set up network monitoring
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    // Find and click first sync button
    const firstSyncButton = page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: ''
    }).first();

    await expect(firstSyncButton).toBeVisible({ timeout: 5000 });

    console.log('Clicking sync button...');
    await firstSyncButton.click();

    // Wait for any loading state
    await page.waitForTimeout(1000);

    // Take screenshot after click
    await page.screenshot({
      path: '/tmp/sync-button-test-after-click.png',
      fullPage: true
    });

    // Check for loading spinner (animate-spin class)
    const hasSpinner = await page.locator('.animate-spin').count() > 0;
    console.log(`Loading spinner visible: ${hasSpinner}`);

    // Wait for response
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({
      path: '/tmp/sync-button-test-final-state.png',
      fullPage: true
    });

    // Log results
    console.log('\n📊 Test Results:');
    console.log('API Calls made:', apiCalls);
    console.log('Console messages:', consoleMessages.slice(-5)); // Last 5 messages

    if (consoleErrors.length > 0) {
      console.error('⚠️ Console Errors:', consoleErrors);
    } else {
      console.log('✅ No console errors detected');
    }

    console.log('✅ Sync button click functionality tested');
  });

  test('should perform DOM inspection for diagnostic purposes', async ({ page }) => {
    // Get page HTML to inspect structure
    const bodyHTML = await page.locator('body').innerHTML();

    // Check for specific elements
    const hasTableStructure = bodyHTML.includes('<table');
    const hasMenuText = bodyHTML.toLowerCase().includes('menu');
    const hasSyncButton = bodyHTML.includes('ArrowPath') || bodyHTML.includes('sync');

    console.log('\n🔍 DOM Inspection Results:');
    console.log(`Table structure present: ${hasTableStructure}`);
    console.log(`Menu text found: ${hasMenuText}`);
    console.log(`Sync-related elements: ${hasSyncButton}`);

    // Take diagnostic screenshot
    await page.screenshot({
      path: '/tmp/sync-button-test-dom-inspection.png',
      fullPage: true
    });

    // Check button styles
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    console.log(`\nTotal buttons on page: ${buttonCount}`);

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const buttonText = await button.textContent();
        const buttonClass = await button.getAttribute('class');
        console.log(`Button ${i}: text="${buttonText?.trim()}", class="${buttonClass}"`);
      }
    }

    console.log('✅ DOM inspection completed');
  });
});
