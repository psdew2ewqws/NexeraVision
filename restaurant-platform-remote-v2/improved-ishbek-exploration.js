const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function exploreIshbekManagement() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1500 // Slow down for better observation
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
            path: path.join(screenshotDir, 'step-01-login-page.png'),
            fullPage: true
        });

        console.log('2. Attempting login with credentials...');

        // Wait for form elements to be visible
        await page.waitForSelector('input[placeholder*="Username"], input[placeholder*="username"]', { timeout: 10000 });

        // Fill username
        await page.fill('input[placeholder*="Username"], input[placeholder*="username"]', 'admin@ishbek.com');

        // Fill password
        await page.fill('input[placeholder*="Password"], input[placeholder*="password"]', 'admin');

        // Take screenshot with filled credentials
        await page.screenshot({
            path: path.join(screenshotDir, 'step-02-credentials-filled.png'),
            fullPage: true
        });

        // Click login button
        await page.click('button:has-text("Login")');
        console.log('Login button clicked, waiting for navigation...');

        // Wait for navigation or page change
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Take screenshot after login
        await page.screenshot({
            path: path.join(screenshotDir, 'step-03-after-login.png'),
            fullPage: true
        });

        const currentUrl = page.url();
        const title = await page.title();
        console.log(`After login - Title: ${title}, URL: ${currentUrl}`);

        // Check if we're logged in by looking for common dashboard elements
        const isDashboard = await page.isVisible('.dashboard, .main-content, .content, .wrapper, nav, .sidebar, .menu');
        console.log('Dashboard elements detected:', isDashboard);

        if (!isDashboard) {
            // If still on login page, check for error messages
            const errorVisible = await page.isVisible('.alert, .error, .message');
            if (errorVisible) {
                const errorText = await page.textContent('.alert, .error, .message');
                console.log('Error message:', errorText);
            }
        }

        console.log('3. Exploring the interface...');

        // Get all clickable elements that might be navigation
        const allLinks = await page.$$eval('a, button, .nav-item, .menu-item, [role="button"], [onclick]', elements =>
            elements.map(el => ({
                text: el.innerText?.trim(),
                href: el.href,
                className: el.className,
                id: el.id,
                tagName: el.tagName.toLowerCase(),
                visible: el.offsetParent !== null,
                clickable: true
            })).filter(item =>
                item.text &&
                item.visible &&
                item.text.length > 0 &&
                item.text.length < 100 &&
                !['login', 'sign in'].includes(item.text.toLowerCase())
            )
        );

        console.log('Found clickable elements:', allLinks.slice(0, 20));

        // Save current interface state
        const interfaceData = {
            step: 'after-login',
            url: currentUrl,
            title: title,
            timestamp: new Date().toISOString(),
            clickableElements: allLinks,
            isDashboard: isDashboard
        };

        fs.writeFileSync(
            path.join(screenshotDir, 'interface-after-login.json'),
            JSON.stringify(interfaceData, null, 2)
        );

        // Look for specific elements that indicate a management interface
        const managementElements = [
            { selector: 'table', name: 'tables' },
            { selector: 'form', name: 'forms' },
            { selector: '.sidebar, .menu, nav', name: 'navigation' },
            { selector: '.dashboard, .panel, .card', name: 'dashboard' },
            { selector: '.btn, button', name: 'buttons' },
            { selector: 'input, select, textarea', name: 'form-inputs' }
        ];

        const foundElements = {};
        for (const element of managementElements) {
            try {
                const exists = await page.isVisible(element.selector);
                foundElements[element.name] = exists;
                if (exists) {
                    console.log(`Found ${element.name}: ${element.selector}`);
                }
            } catch (e) {
                foundElements[element.name] = false;
            }
        }

        // If we have navigation elements, try to explore them
        if (allLinks.length > 0) {
            console.log('4. Exploring navigation sections...');

            // Filter out common non-navigation items
            const navigationLinks = allLinks.filter(link =>
                !link.text.toLowerCase().includes('logout') &&
                !link.text.toLowerCase().includes('profile') &&
                link.text.length > 2
            );

            const maxExplore = Math.min(navigationLinks.length, 10);

            for (let i = 0; i < maxExplore; i++) {
                const link = navigationLinks[i];
                console.log(`Exploring: ${link.text}`);

                try {
                    if (link.href && link.href.startsWith('http')) {
                        // Navigate to URL
                        await page.goto(link.href, { waitUntil: 'networkidle', timeout: 10000 });
                    } else {
                        // Click element
                        await page.click(`text="${link.text}"`);
                        await page.waitForLoadState('networkidle');
                    }

                    await page.waitForTimeout(2000);

                    const sectionTitle = await page.title();
                    const sanitizedName = link.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

                    await page.screenshot({
                        path: path.join(screenshotDir, `section-${String(i + 1).padStart(2, '0')}-${sanitizedName}.png`),
                        fullPage: true
                    });

                    // Get page content info
                    const hasTable = await page.isVisible('table');
                    const hasForm = await page.isVisible('form');
                    const hasChart = await page.isVisible('canvas, .chart, svg');

                    console.log(`Section "${link.text}": Table=${hasTable}, Form=${hasForm}, Chart=${hasChart}`);

                } catch (error) {
                    console.log(`Failed to explore "${link.text}": ${error.message}`);
                }

                // Small delay between sections
                await page.waitForTimeout(1000);
            }
        }

        console.log('5. Taking final comprehensive screenshots...');

        // Return to main page if we navigated away
        if (page.url() !== currentUrl) {
            await page.goto(currentUrl);
            await page.waitForLoadState('networkidle');
        }

        // Final screenshot
        await page.screenshot({
            path: path.join(screenshotDir, 'step-99-final-interface.png'),
            fullPage: true
        });

        // Save final summary
        const finalSummary = {
            title: await page.title(),
            url: page.url(),
            foundElements: foundElements,
            totalClickableElements: allLinks.length,
            exploredSections: maxExplore || 0,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(screenshotDir, 'exploration-summary.json'),
            JSON.stringify(finalSummary, null, 2)
        );

        console.log('Exploration complete!');
        console.log('Screenshots saved to:', screenshotDir);
        console.log('Summary:', finalSummary);

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