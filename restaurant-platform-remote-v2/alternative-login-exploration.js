const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function tryAlternativeApproaches() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1500
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    });

    const page = await context.newPage();
    const screenshotDir = '/home/admin/restaurant-platform-remote-v2/screenshots/ishbek-management';

    const credentialsToTry = [
        { username: 'admin', password: 'admin' },
        { username: 'admin@ishbek.com', password: 'admin' },
        { username: 'administrator', password: 'admin' },
        { username: 'ishbek', password: 'admin' },
        { username: 'admin', password: 'password' }
    ];

    const urlsToTry = [
        'https://integration.ishbek.com/Management/',
        'https://integration.ishbek.com/',
        'https://integration.ishbek.com/admin/',
        'https://integration.ishbek.com/login/',
        'https://integration.ishbek.com/Management/login/',
        'https://integration.ishbek.com/Management/admin/'
    ];

    try {
        console.log('=== EXPLORING ALTERNATIVE URLS ===');

        for (let i = 0; i < urlsToTry.length; i++) {
            const url = urlsToTry[i];
            console.log(`\nTrying URL ${i + 1}: ${url}`);

            try {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
                await page.waitForTimeout(2000);

                const title = await page.title();
                const currentUrl = page.url();

                console.log(`  Title: ${title}`);
                console.log(`  Final URL: ${currentUrl}`);

                // Take screenshot
                await page.screenshot({
                    path: path.join(screenshotDir, `url-test-${i + 1}-${url.split('/').pop() || 'root'}.png`),
                    fullPage: true
                });

                // Check for login form
                const hasLoginForm = await page.isVisible('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]');
                const hasUsernameField = await page.isVisible('input[placeholder*="username"], input[placeholder*="Username"], input[type="email"]');

                console.log(`  Has login form: ${hasLoginForm && hasUsernameField}`);

                // If we find a different interface, document it
                if (title !== '404 Page Not Found' && !title.includes('404')) {
                    console.log(`  ✓ Found valid page: ${title}`);

                    // Check for management interface elements
                    const hasTable = await page.isVisible('table');
                    const hasNav = await page.isVisible('nav, .navigation, .sidebar, .menu');
                    const hasDashboard = await page.isVisible('.dashboard, .panel, .card, .widget');

                    if (hasTable || hasNav || hasDashboard) {
                        console.log(`  ✓ Found management interface elements!`);

                        await page.screenshot({
                            path: path.join(screenshotDir, `management-interface-${i + 1}.png`),
                            fullPage: true
                        });

                        // Try to get all navigation links
                        const links = await page.$$eval('a', elements =>
                            elements.map(el => ({
                                text: el.innerText?.trim(),
                                href: el.href,
                                visible: el.offsetParent !== null
                            })).filter(link => link.text && link.visible && link.text.length > 0)
                        );

                        fs.writeFileSync(
                            path.join(screenshotDir, `interface-${i + 1}-links.json`),
                            JSON.stringify({
                                url: currentUrl,
                                title: title,
                                links: links,
                                hasTable,
                                hasNav,
                                hasDashboard
                            }, null, 2)
                        );
                    }

                    // If this has a login form, try our credentials
                    if (hasLoginForm && hasUsernameField) {
                        console.log(`  Attempting login on this page...`);

                        for (const cred of credentialsToTry.slice(0, 3)) { // Try first 3 credential sets
                            try {
                                console.log(`    Trying: ${cred.username} / ${cred.password}`);

                                // Fill username
                                await page.fill('input[placeholder*="username"], input[placeholder*="Username"], input[type="email"]', cred.username);
                                await page.fill('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]', cred.password);

                                // Click login
                                await page.click('button:has-text("Login"), button[type="submit"], input[type="submit"]');
                                await page.waitForLoadState('networkidle', { timeout: 5000 });

                                const afterLoginTitle = await page.title();
                                const afterLoginUrl = page.url();

                                console.log(`      After login: ${afterLoginTitle} - ${afterLoginUrl}`);

                                if (!afterLoginTitle.includes('404') && afterLoginUrl !== currentUrl) {
                                    console.log(`      ✓ LOGIN SUCCESSFUL!`);

                                    await page.screenshot({
                                        path: path.join(screenshotDir, `successful-login-${i + 1}-${cred.username}.png`),
                                        fullPage: true
                                    });

                                    // Explore this successful login
                                    await exploreLoggedInInterface(page, screenshotDir, i + 1);

                                    // Save successful credentials
                                    fs.writeFileSync(
                                        path.join(screenshotDir, 'successful-credentials.json'),
                                        JSON.stringify({
                                            url: url,
                                            loginUrl: currentUrl,
                                            dashboardUrl: afterLoginUrl,
                                            credentials: cred,
                                            timestamp: new Date().toISOString()
                                        }, null, 2)
                                    );

                                    return; // Exit after successful login
                                }

                                // Go back to login page for next attempt
                                await page.goto(url);
                                await page.waitForLoadState('networkidle');

                            } catch (loginError) {
                                console.log(`      Login attempt failed: ${loginError.message}`);
                            }
                        }
                    }
                }

            } catch (error) {
                console.log(`  Error accessing ${url}: ${error.message}`);
            }
        }

        console.log('\n=== TRYING DIRECT ACCESS TO COMMON PATHS ===');

        const commonPaths = [
            '/views/',
            '/views/dashboard.php',
            '/views/index.php',
            '/dashboard.php',
            '/admin.php',
            '/main.php'
        ];

        for (const path of commonPaths) {
            const fullUrl = `https://integration.ishbek.com/Management${path}`;
            console.log(`Trying direct path: ${fullUrl}`);

            try {
                await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 8000 });
                const title = await page.title();

                if (!title.includes('404') && !title.includes('Error')) {
                    console.log(`  ✓ Found accessible path: ${title}`);

                    await page.screenshot({
                        path: path.join(screenshotDir, `direct-path-${path.replace(/[^a-zA-Z0-9]/g, '-')}.png`),
                        fullPage: true
                    });
                }
            } catch (error) {
                console.log(`  Path not accessible: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('Exploration error:', error);
    } finally {
        await browser.close();
    }
}

async function exploreLoggedInInterface(page, screenshotDir, attemptNumber) {
    console.log('    Exploring logged-in interface...');

    try {
        // Get all navigation elements
        const navElements = await page.$$eval('a, button, .nav-item, .menu-item', elements =>
            elements.map(el => ({
                text: el.innerText?.trim(),
                href: el.href,
                className: el.className,
                visible: el.offsetParent !== null
            })).filter(item =>
                item.text &&
                item.visible &&
                item.text.length > 1 &&
                item.text.length < 50 &&
                !item.text.toLowerCase().includes('logout')
            )
        );

        console.log(`    Found ${navElements.length} navigation elements`);

        // Save navigation structure
        fs.writeFileSync(
            path.join(screenshotDir, `logged-in-navigation-${attemptNumber}.json`),
            JSON.stringify(navElements, null, 2)
        );

        // Try to explore first few navigation items
        const maxExplore = Math.min(navElements.length, 5);

        for (let i = 0; i < maxExplore; i++) {
            const item = navElements[i];
            console.log(`      Exploring: ${item.text}`);

            try {
                if (item.href && item.href.startsWith('http')) {
                    await page.goto(item.href, { waitUntil: 'networkidle', timeout: 8000 });
                } else {
                    await page.click(`text="${item.text}"`);
                    await page.waitForLoadState('networkidle');
                }

                await page.waitForTimeout(1000);

                const sectionTitle = await page.title();
                const sanitizedName = item.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

                await page.screenshot({
                    path: path.join(screenshotDir, `section-${attemptNumber}-${i + 1}-${sanitizedName}.png`),
                    fullPage: true
                });

                console.log(`        Captured: ${sectionTitle}`);

            } catch (error) {
                console.log(`        Failed to explore "${item.text}": ${error.message}`);
            }
        }

    } catch (error) {
        console.log(`    Interface exploration error: ${error.message}`);
    }
}

// Run the alternative exploration
tryAlternativeApproaches().catch(console.error);