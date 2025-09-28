const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function exploreIshbekManagement() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000 // Slow down for better observation
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    });

    const page = await context.newPage();
    const screenshotDir = '/home/admin/restaurant-platform-remote-v2/screenshots/ishbek-management';

    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    try {
        console.log('1. Navigating to management interface...');
        await page.goto('https://integration.ishbek.com/Management/', {
            waitUntil: 'networkidle'
        });

        // Take initial screenshot
        await page.screenshot({
            path: path.join(screenshotDir, '01-initial-page.png'),
            fullPage: true
        });

        console.log('2. Looking for login form...');

        // Check if we need to login
        const loginFormVisible = await page.isVisible('input[type="email"], input[type="text"][placeholder*="email"], input[name*="email"]');

        if (loginFormVisible) {
            console.log('3. Login form found, attempting to login...');

            // Find email field (try multiple selectors)
            const emailSelectors = [
                'input[type="email"]',
                'input[name*="email"]',
                'input[placeholder*="email"]',
                'input[id*="email"]'
            ];

            let emailField = null;
            for (const selector of emailSelectors) {
                if (await page.isVisible(selector)) {
                    emailField = selector;
                    break;
                }
            }

            // Find password field
            const passwordSelectors = [
                'input[type="password"]',
                'input[name*="password"]',
                'input[placeholder*="password"]'
            ];

            let passwordField = null;
            for (const selector of passwordSelectors) {
                if (await page.isVisible(selector)) {
                    passwordField = selector;
                    break;
                }
            }

            if (emailField && passwordField) {
                // Fill credentials
                await page.fill(emailField, 'admin@ishbek.com');
                await page.fill(passwordField, 'admin');

                await page.screenshot({
                    path: path.join(screenshotDir, '02-login-form-filled.png'),
                    fullPage: true
                });

                // Find and click login button
                const loginButtonSelectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button:has-text("Login")',
                    'button:has-text("Sign in")',
                    '.btn-primary',
                    '.login-btn'
                ];

                let loginButton = null;
                for (const selector of loginButtonSelectors) {
                    if (await page.isVisible(selector)) {
                        loginButton = selector;
                        break;
                    }
                }

                if (loginButton) {
                    await page.click(loginButton);
                    await page.waitForLoadState('networkidle');

                    await page.screenshot({
                        path: path.join(screenshotDir, '03-after-login-attempt.png'),
                        fullPage: true
                    });
                }
            }
        }

        console.log('4. Exploring main dashboard...');

        // Wait for page to stabilize
        await page.waitForTimeout(3000);

        // Take main dashboard screenshot
        await page.screenshot({
            path: path.join(screenshotDir, '04-main-dashboard.png'),
            fullPage: true
        });

        // Get page title and URL
        const title = await page.title();
        const url = page.url();
        console.log(`Current page: ${title} - ${url}`);

        // Look for navigation elements
        console.log('5. Identifying navigation elements...');
        const navLinks = await page.$$eval('a', links =>
            links.map(link => ({
                text: link.innerText.trim(),
                href: link.href,
                visible: link.offsetParent !== null
            })).filter(link => link.text && link.visible)
        );

        console.log('Found navigation links:', navLinks.slice(0, 20)); // Show first 20

        // Look for menu items or navigation sections
        const menuSelectors = [
            '.sidebar a',
            '.nav-menu a',
            '.menu-item',
            '.navigation a',
            'nav a',
            '.main-menu a'
        ];

        let mainMenuItems = [];
        for (const selector of menuSelectors) {
            try {
                const items = await page.$$eval(selector, elements =>
                    elements.map(el => ({
                        text: el.innerText?.trim(),
                        href: el.href,
                        classes: el.className
                    })).filter(item => item.text)
                );
                if (items.length > 0) {
                    mainMenuItems = items;
                    console.log(`Found menu items with selector: ${selector}`, items);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        // Document the interface structure
        const interfaceStructure = {
            title,
            url,
            navigationLinks: navLinks,
            menuItems: mainMenuItems,
            timestamp: new Date().toISOString()
        };

        // Save interface structure to JSON
        fs.writeFileSync(
            path.join(screenshotDir, 'interface-structure.json'),
            JSON.stringify(interfaceStructure, null, 2)
        );

        // Try to explore main sections
        console.log('6. Exploring main sections...');

        const sectionsToExplore = mainMenuItems.length > 0 ? mainMenuItems : navLinks.slice(0, 10);

        for (let i = 0; i < Math.min(sectionsToExplore.length, 15); i++) {
            const item = sectionsToExplore[i];
            if (item.href && item.href.startsWith('http')) {
                try {
                    console.log(`Exploring: ${item.text} - ${item.href}`);
                    await page.goto(item.href, { waitUntil: 'networkidle', timeout: 15000 });
                    await page.waitForTimeout(2000);

                    const sectionTitle = await page.title();
                    const sanitizedName = item.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

                    await page.screenshot({
                        path: path.join(screenshotDir, `section-${String(i + 1).padStart(2, '0')}-${sanitizedName}.png`),
                        fullPage: true
                    });

                    console.log(`Captured: ${sectionTitle}`);
                } catch (e) {
                    console.log(`Failed to explore ${item.text}: ${e.message}`);
                }
            }
        }

        console.log('7. Looking for data tables or forms...');

        // Check for common management interface elements
        const tableExists = await page.isVisible('table');
        const formExists = await page.isVisible('form');
        const dashboardExists = await page.isVisible('.dashboard, .panel, .card, .widget');

        if (tableExists) {
            await page.screenshot({
                path: path.join(screenshotDir, '90-data-tables.png'),
                fullPage: true
            });
        }

        if (formExists) {
            await page.screenshot({
                path: path.join(screenshotDir, '91-forms-interface.png'),
                fullPage: true
            });
        }

        if (dashboardExists) {
            await page.screenshot({
                path: path.join(screenshotDir, '92-dashboard-widgets.png'),
                fullPage: true
            });
        }

        // Final comprehensive screenshot
        await page.screenshot({
            path: path.join(screenshotDir, '99-final-state.png'),
            fullPage: true
        });

        console.log('Exploration complete! Screenshots saved to:', screenshotDir);

    } catch (error) {
        console.error('Error during exploration:', error);
        await page.screenshot({
            path: path.join(screenshotDir, 'error-state.png'),
            fullPage: true
        });
    } finally {
        await browser.close();
    }
}

// Run the exploration
exploreIshbekManagement().catch(console.error);