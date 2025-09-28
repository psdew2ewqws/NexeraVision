const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function detailedLoginAnalysis() {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 2000
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    });

    const page = await context.newPage();
    const screenshotDir = '/home/admin/restaurant-platform-remote-v2/screenshots/ishbek-management';

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
        });
    });

    page.on('response', response => {
        console.log(`Response: ${response.status()} ${response.url()}`);
    });

    try {
        console.log('=== DETAILED LOGIN ANALYSIS ===');

        await page.goto('https://integration.ishbek.com/Management/', {
            waitUntil: 'networkidle'
        });

        await page.screenshot({
            path: path.join(screenshotDir, 'detailed-01-initial-page.png'),
            fullPage: true
        });

        console.log('1. Analyzing login form structure...');

        // Get detailed form analysis
        const formAnalysis = await page.evaluate(() => {
            const forms = Array.from(document.forms);
            const inputs = Array.from(document.querySelectorAll('input'));
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));

            return {
                forms: forms.map(form => ({
                    action: form.action,
                    method: form.method,
                    id: form.id,
                    className: form.className
                })),
                inputs: inputs.map(input => ({
                    name: input.name,
                    type: input.type,
                    id: input.id,
                    placeholder: input.placeholder,
                    required: input.required
                })),
                buttons: buttons.map(btn => ({
                    type: btn.type,
                    textContent: btn.textContent?.trim(),
                    id: btn.id,
                    className: btn.className
                }))
            };
        });

        console.log('Form Analysis:', JSON.stringify(formAnalysis, null, 2));

        fs.writeFileSync(
            path.join(screenshotDir, 'form-analysis.json'),
            JSON.stringify(formAnalysis, null, 2)
        );

        console.log('2. Testing different login approaches...');

        const loginAttempts = [
            { username: 'admin', password: 'admin', description: 'Simple admin/admin' },
            { username: 'admin', password: 'password', description: 'admin/password' },
            { username: 'root', password: 'admin', description: 'root/admin' },
            { username: 'ishbek', password: 'ishbek', description: 'ishbek/ishbek' },
            { username: 'demo', password: 'demo', description: 'demo/demo' }
        ];

        for (let i = 0; i < loginAttempts.length; i++) {
            const attempt = loginAttempts[i];
            console.log(`\nAttempt ${i + 1}: ${attempt.description}`);

            // Clear previous network requests
            networkRequests.length = 0;

            // Navigate to fresh login page
            await page.goto('https://integration.ishbek.com/Management/', {
                waitUntil: 'networkidle'
            });

            await page.waitForTimeout(1000);

            try {
                // Fill credentials
                await page.fill('input[placeholder*="Username"], input[placeholder*="username"]', attempt.username);
                await page.fill('input[placeholder*="Password"], input[placeholder*="password"]', attempt.password);

                await page.screenshot({
                    path: path.join(screenshotDir, `attempt-${i + 1}-before-login.png`),
                    fullPage: true
                });

                // Get the form element to understand its action
                const formAction = await page.getAttribute('form', 'action');
                const formMethod = await page.getAttribute('form', 'method');
                console.log(`  Form action: ${formAction}, method: ${formMethod}`);

                // Click login and monitor
                console.log('  Clicking login button...');
                await page.click('button:has-text("Login")');

                // Wait a bit for the request to complete
                await page.waitForTimeout(3000);

                const currentTitle = await page.title();
                const currentUrl = page.url();
                console.log(`  After click: ${currentTitle} - ${currentUrl}`);

                await page.screenshot({
                    path: path.join(screenshotDir, `attempt-${i + 1}-after-login.png`),
                    fullPage: true
                });

                // Check for success indicators
                const hasErrorMessage = await page.isVisible('.error, .alert-danger, .message');
                const hasSuccessMessage = await page.isVisible('.success, .alert-success');
                const hasNavigation = await page.isVisible('nav, .navigation, .sidebar, .dashboard');

                console.log(`  Error message visible: ${hasErrorMessage}`);
                console.log(`  Success message visible: ${hasSuccessMessage}`);
                console.log(`  Navigation visible: ${hasNavigation}`);

                if (hasErrorMessage) {
                    const errorText = await page.textContent('.error, .alert-danger, .message');
                    console.log(`  Error text: ${errorText}`);
                }

                // Save network requests for this attempt
                fs.writeFileSync(
                    path.join(screenshotDir, `network-requests-attempt-${i + 1}.json`),
                    JSON.stringify(networkRequests, null, 2)
                );

                // If we see navigation or different page, we might have success
                if (hasNavigation || (!currentTitle.includes('Login') && !currentUrl.includes('404'))) {
                    console.log(`  ✓ POTENTIAL SUCCESS - exploring interface...`);

                    // Look for all interactive elements
                    const allElements = await page.$$eval('a, button, input, select', elements =>
                        elements.map(el => ({
                            tag: el.tagName.toLowerCase(),
                            text: el.innerText?.trim() || el.value || el.placeholder,
                            href: el.href,
                            type: el.type,
                            className: el.className,
                            visible: el.offsetParent !== null
                        })).filter(item => item.visible && (item.text || item.href))
                    );

                    console.log(`    Found ${allElements.length} interactive elements`);

                    fs.writeFileSync(
                        path.join(screenshotDir, `success-elements-attempt-${i + 1}.json`),
                        JSON.stringify({
                            credentials: attempt,
                            url: currentUrl,
                            title: currentTitle,
                            elements: allElements
                        }, null, 2)
                    );

                    // Try clicking some potential navigation items
                    const potentialNav = allElements.filter(el =>
                        (el.tag === 'a' && el.text && el.text.length > 2 && el.text.length < 30) ||
                        (el.tag === 'button' && el.text && !el.text.toLowerCase().includes('login'))
                    );

                    console.log(`    Found ${potentialNav.length} potential navigation items`);

                    for (let j = 0; j < Math.min(potentialNav.length, 3); j++) {
                        const navItem = potentialNav[j];
                        console.log(`      Trying to access: ${navItem.text}`);

                        try {
                            if (navItem.href && navItem.href.startsWith('http')) {
                                await page.goto(navItem.href, { timeout: 8000 });
                            } else {
                                await page.click(`text="${navItem.text}"`);
                            }

                            await page.waitForTimeout(2000);

                            const navTitle = await page.title();
                            const navUrl = page.url();
                            console.log(`        Result: ${navTitle} - ${navUrl}`);

                            await page.screenshot({
                                path: path.join(screenshotDir, `nav-${i + 1}-${j + 1}-${navItem.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`),
                                fullPage: true
                            });

                        } catch (navError) {
                            console.log(`        Navigation failed: ${navError.message}`);
                        }
                    }
                }

            } catch (attemptError) {
                console.log(`  Attempt failed: ${attemptError.message}`);
            }
        }

        console.log('\n3. Checking for session-based access...');

        // Try accessing protected areas directly after login attempts
        const protectedUrls = [
            'https://integration.ishbek.com/Management/dashboard',
            'https://integration.ishbek.com/Management/admin',
            'https://integration.ishbek.com/Management/panel',
            'https://integration.ishbek.com/Management/home'
        ];

        for (const url of protectedUrls) {
            try {
                console.log(`Testing direct access to: ${url}`);
                await page.goto(url, { waitUntil: 'networkidle', timeout: 8000 });

                const title = await page.title();
                const finalUrl = page.url();

                console.log(`  Result: ${title} - ${finalUrl}`);

                if (!title.includes('404') && !title.includes('Error')) {
                    await page.screenshot({
                        path: path.join(screenshotDir, `direct-access-${url.split('/').pop()}.png`),
                        fullPage: true
                    });
                }
            } catch (error) {
                console.log(`  Cannot access ${url}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('Analysis error:', error);
    } finally {
        await browser.close();
    }
}

detailedLoginAnalysis().catch(console.error);