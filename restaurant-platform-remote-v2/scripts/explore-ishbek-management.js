const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function exploreIshbekManagement() {
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down actions for better visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  const screenshotDir = '/home/admin/restaurant-platform-remote-v2/screenshots/ishbek-management';
  let screenshotCounter = 1;

  async function takeScreenshot(name) {
    const filename = `${screenshotCounter.toString().padStart(2, '0')}-${name}.png`;
    const fullPath = path.join(screenshotDir, filename);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
    screenshotCounter++;
    await page.waitForTimeout(2000); // Wait between actions
  }

  try {
    console.log('🚀 Starting Ishbek Management Platform exploration...');

    // 1. Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('https://integration.ishbek.com/Management/');
    await page.waitForLoadState('networkidle');
    await takeScreenshot('login-page-initial');

    // 2. Login process
    console.log('📍 Step 2: Performing login...');

    // Look for login form elements
    const usernameSelector = 'input[name="username"], input[type="text"], input[placeholder*="username"], input[placeholder*="user"]';
    const passwordSelector = 'input[name="password"], input[type="password"]';
    const loginButtonSelector = 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")';

    // Fill login form
    try {
      await page.fill(usernameSelector, 'demotest');
      await page.fill(passwordSelector, 'demotest');
      await takeScreenshot('login-form-filled');

      await page.click(loginButtonSelector);
      await page.waitForLoadState('networkidle');
      await takeScreenshot('post-login-redirect');

    } catch (error) {
      console.log('❌ Login form not found in expected format, trying alternative selectors...');
      await takeScreenshot('login-page-analysis');

      // Try alternative login approaches
      const allInputs = await page.locator('input').all();
      console.log(`Found ${allInputs.length} input elements`);

      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type') || '';
        const name = await input.getAttribute('name') || '';
        const placeholder = await input.getAttribute('placeholder') || '';
        console.log(`Input ${i}: type="${type}", name="${name}", placeholder="${placeholder}"`);
      }
    }

    // 3. Dashboard exploration
    console.log('📍 Step 3: Exploring main dashboard...');
    await page.waitForTimeout(3000);
    await takeScreenshot('dashboard-main');

    // 4. Navigation menu exploration
    console.log('📍 Step 4: Mapping navigation structure...');

    // Look for navigation elements
    const navSelectors = [
      'nav', '.navbar', '.navigation', '.menu', '.sidebar',
      '[role="navigation"]', '.nav-menu', '.main-menu'
    ];

    for (const selector of navSelectors) {
      try {
        const navElements = await page.locator(selector).all();
        if (navElements.length > 0) {
          console.log(`Found navigation with selector: ${selector}`);
          await takeScreenshot(`navigation-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // 5. Explore all visible links and buttons
    console.log('📍 Step 5: Documenting all interactive elements...');

    const links = await page.locator('a').all();
    console.log(`Found ${links.length} links on the page`);

    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on the page`);

    // 6. Try to navigate to different sections
    const commonSectionNames = [
      'dashboard', 'orders', 'menu', 'restaurants', 'integrations',
      'careem', 'talabat', 'pos', 'reports', 'analytics', 'settings',
      'users', 'companies', 'branches', 'delivery', 'payments'
    ];

    for (const sectionName of commonSectionNames) {
      try {
        console.log(`🔍 Looking for ${sectionName} section...`);

        // Try different selectors for the section
        const sectionSelectors = [
          `a:has-text("${sectionName}")`,
          `a[href*="${sectionName}"]`,
          `button:has-text("${sectionName}")`,
          `.menu-item:has-text("${sectionName}")`,
          `[data-section="${sectionName}"]`
        ];

        for (const selector of sectionSelectors) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              console.log(`✅ Found ${sectionName} with selector: ${selector}`);
              await element.click();
              await page.waitForLoadState('networkidle');
              await takeScreenshot(`section-${sectionName}`);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      } catch (error) {
        console.log(`❌ Could not find ${sectionName} section`);
      }
    }

    // 7. Comprehensive page structure analysis
    console.log('📍 Step 7: Analyzing page structure...');

    const pageStructure = await page.evaluate(() => {
      const structure = {
        title: document.title,
        url: window.location.href,
        forms: [],
        links: [],
        buttons: [],
        tables: [],
        divs: []
      };

      // Analyze forms
      document.querySelectorAll('form').forEach((form, i) => {
        structure.forms.push({
          index: i,
          action: form.action || '',
          method: form.method || 'GET',
          inputCount: form.querySelectorAll('input').length
        });
      });

      // Analyze links
      document.querySelectorAll('a[href]').forEach((link, i) => {
        if (i < 50) { // Limit to first 50 links
          structure.links.push({
            text: link.textContent.trim().substring(0, 50),
            href: link.href
          });
        }
      });

      // Analyze buttons
      document.querySelectorAll('button').forEach((button, i) => {
        if (i < 20) { // Limit to first 20 buttons
          structure.buttons.push({
            text: button.textContent.trim().substring(0, 50),
            type: button.type || 'button'
          });
        }
      });

      // Analyze tables
      document.querySelectorAll('table').forEach((table, i) => {
        structure.tables.push({
          index: i,
          rows: table.rows.length,
          columns: table.rows[0] ? table.rows[0].cells.length : 0
        });
      });

      return structure;
    });

    console.log('📊 Page Structure Analysis:');
    console.log(JSON.stringify(pageStructure, null, 2));

    // Save structure analysis to file
    fs.writeFileSync(
      path.join(screenshotDir, 'page-structure-analysis.json'),
      JSON.stringify(pageStructure, null, 2)
    );

    // 8. Final comprehensive screenshot
    await takeScreenshot('final-comprehensive-view');

    console.log('✅ Exploration completed successfully!');
    console.log(`📸 Total screenshots taken: ${screenshotCounter - 1}`);

  } catch (error) {
    console.error('❌ Error during exploration:', error);
    await takeScreenshot('error-state');
  } finally {
    await browser.close();
  }
}

// Run the exploration
exploreIshbekManagement().catch(console.error);