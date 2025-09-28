#!/usr/bin/env node

/**
 * Comprehensive Browser Testing with Screenshots
 * Tests the Integration Platform login functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLogin() {
  console.log('🚀 Starting comprehensive browser testing...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1366, height: 768 }
  });

  try {
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });

    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3003/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Take screenshot of initial page load
    await page.screenshot({
      path: '/tmp/01-initial-load.png',
      fullPage: true
    });
    console.log('   ✅ Screenshot saved: /tmp/01-initial-load.png');

    // Step 2: Check if CSS is loaded
    console.log('\n📍 Step 2: Checking CSS loading...');
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      const bgColor = styles.backgroundColor;
      const font = styles.fontFamily;
      return {
        hasBackground: bgColor && bgColor !== 'rgba(0, 0, 0, 0)',
        hasFont: font && font !== '',
        backgroundColor: bgColor,
        fontFamily: font
      };
    });
    console.log('   🎨 CSS Status:', hasStyles);

    // Step 3: Check page content
    console.log('\n📍 Step 3: Checking page content...');
    const pageContent = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent || '';
      const subtitle = document.querySelector('h1 + p')?.textContent || '';
      const demoCredentials = document.body.textContent.includes('Test Account');
      const emailField = document.querySelector('input[type="email"]');
      const passwordField = document.querySelector('input[type="password"]');
      const submitButton = document.querySelector('button[type="submit"]');

      return {
        title,
        subtitle,
        hasDemoCredentials: demoCredentials,
        hasEmailField: !!emailField,
        hasPasswordField: !!passwordField,
        hasSubmitButton: !!submitButton,
        submitButtonText: submitButton?.textContent || ''
      };
    });
    console.log('   📄 Page Content:', pageContent);

    // Step 4: Fill in login form with wrong credentials first
    console.log('\n📍 Step 4: Testing with wrong credentials...');
    await page.type('input[type="email"]', 'wrong@test.com');
    await page.type('input[type="password"]', 'wrongpass');

    await page.screenshot({
      path: '/tmp/02-wrong-credentials-filled.png',
      fullPage: true
    });
    console.log('   ✅ Screenshot saved: /tmp/02-wrong-credentials-filled.png');

    // Submit wrong credentials
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check for error message
    const errorAfterWrong = await page.evaluate(() => {
      const alerts = document.querySelectorAll('[role="alert"], .error, .text-red-500, .text-red-600');
      return Array.from(alerts).map(el => el.textContent).join(' | ');
    });
    console.log('   ⚠️ Error message:', errorAfterWrong || 'No error displayed');

    await page.screenshot({
      path: '/tmp/03-wrong-credentials-result.png',
      fullPage: true
    });
    console.log('   ✅ Screenshot saved: /tmp/03-wrong-credentials-result.png');

    // Step 5: Clear and try correct credentials
    console.log('\n📍 Step 5: Testing with correct credentials...');

    // Clear fields
    await page.evaluate(() => {
      document.querySelector('input[type="email"]').value = '';
      document.querySelector('input[type="password"]').value = '';
    });

    // Enter correct credentials
    await page.type('input[type="email"]', 'admin@test.com');
    await page.type('input[type="password"]', 'admin123');

    await page.screenshot({
      path: '/tmp/04-correct-credentials-filled.png',
      fullPage: true
    });
    console.log('   ✅ Screenshot saved: /tmp/04-correct-credentials-filled.png');

    // Submit correct credentials
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('   🔗 Current URL:', currentUrl);

    if (currentUrl.includes('dashboard')) {
      console.log('   ✅ Successfully redirected to dashboard!');

      await page.screenshot({
        path: '/tmp/05-dashboard.png',
        fullPage: true
      });
      console.log('   ✅ Screenshot saved: /tmp/05-dashboard.png');

      // Get dashboard content
      const dashboardContent = await page.evaluate(() => {
        return {
          title: document.querySelector('h1')?.textContent || '',
          hasContent: document.body.textContent.length > 100,
          elementsCount: document.querySelectorAll('*').length
        };
      });
      console.log('   📊 Dashboard Content:', dashboardContent);

    } else {
      console.log('   ❌ Still on login page');

      // Check for error message
      const errorAfterCorrect = await page.evaluate(() => {
        const alerts = document.querySelectorAll('[role="alert"], .error, .text-red-500, .text-red-600');
        return Array.from(alerts).map(el => el.textContent).join(' | ');
      });
      console.log('   ⚠️ Error message:', errorAfterCorrect || 'No error displayed');

      await page.screenshot({
        path: '/tmp/05-login-failed.png',
        fullPage: true
      });
      console.log('   ✅ Screenshot saved: /tmp/05-login-failed.png');
    }

    // Step 6: Test API directly
    console.log('\n📍 Step 6: Testing API directly...');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3002/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@test.com',
            password: 'admin123'
          })
        });
        const data = await response.json();
        return {
          status: response.status,
          success: data.success,
          hasToken: !!data.access_token || !!data.token,
          user: data.user
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('   🔌 API Response:', apiResponse);

    // Step 7: Check localStorage
    console.log('\n📍 Step 7: Checking localStorage...');
    const localStorage = await page.evaluate(() => {
      const token = window.localStorage.getItem('token');
      const user = window.localStorage.getItem('user');
      return {
        hasToken: !!token,
        hasUser: !!user,
        tokenLength: token ? token.length : 0,
        user: user ? JSON.parse(user) : null
      };
    });
    console.log('   💾 LocalStorage:', localStorage);

    // Step 8: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Page loads:', true);
    console.log('✅ CSS loaded:', hasStyles.hasBackground && hasStyles.hasFont);
    console.log('✅ Form elements present:', pageContent.hasEmailField && pageContent.hasPasswordField);
    console.log('✅ API responds:', apiResponse.success === true);
    console.log('❓ Login redirects:', currentUrl.includes('dashboard'));
    console.log('❓ Token stored:', localStorage.hasToken);
    console.log('='.repeat(60));

    // List all screenshots
    console.log('\n📸 Screenshots saved:');
    const screenshots = [
      '/tmp/01-initial-load.png',
      '/tmp/02-wrong-credentials-filled.png',
      '/tmp/03-wrong-credentials-result.png',
      '/tmp/04-correct-credentials-filled.png',
      currentUrl.includes('dashboard') ? '/tmp/05-dashboard.png' : '/tmp/05-login-failed.png'
    ];
    screenshots.forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Keep browser open for 5 seconds to see the result
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the test
testLogin().then(() => {
  console.log('\n✨ Browser testing completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});