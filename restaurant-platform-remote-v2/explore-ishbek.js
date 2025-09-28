const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function exploreIshbekIntegration() {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const page = await context.newPage();
    const screenshotDir = '/home/admin/restaurant-platform-remote-v2/screenshots/ishbek-integration';

    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const analysis = [];

    try {
        console.log('🌐 Starting systematic exploration of integration.ishbek.com...');

        // 1. Initial Site Access
        console.log('📍 Step 1: Accessing landing page...');
        await page.goto('https://integration.ishbek.com', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait a bit for any dynamic content
        await page.waitForTimeout(3000);

        // Capture initial page
        await page.screenshot({
            path: `${screenshotDir}/01-landing-page.png`,
            fullPage: true
        });

        // Get page title and basic info
        const title = await page.title();
        const url = page.url();

        analysis.push({
            step: 1,
            page: 'Landing Page',
            url: url,
            title: title,
            screenshot: '01-landing-page.png',
            description: 'Initial page load and main interface'
        });

        console.log(`✅ Landing page captured: ${title}`);

        // 2. Check for login forms or authentication interfaces
        console.log('🔐 Step 2: Looking for login interfaces...');

        // Look for common login selectors
        const loginSelectors = [
            'form[action*="login"]',
            'input[type="email"]',
            'input[type="password"]',
            'button:has-text("Login")',
            'button:has-text("Sign In")',
            'a:has-text("Login")',
            'a:has-text("Sign In")',
            '.login-form',
            '#login',
            '.auth-form'
        ];

        let loginFound = false;
        for (const selector of loginSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    console.log(`🔍 Found login element: ${selector}`);
                    loginFound = true;
                    break;
                }
            } catch (e) {
                // Continue checking other selectors
            }
        }

        if (loginFound) {
            await page.screenshot({
                path: `${screenshotDir}/02-login-interface.png`,
                fullPage: true
            });

            analysis.push({
                step: 2,
                page: 'Login Interface',
                url: url,
                screenshot: '02-login-interface.png',
                description: 'Authentication interface detected'
            });
        }

        // 3. Explore navigation and menu structure
        console.log('🧭 Step 3: Exploring navigation structure...');

        // Look for navigation elements
        const navSelectors = [
            'nav',
            '.navbar',
            '.navigation',
            '.menu',
            '.sidebar',
            'header',
            '.header'
        ];

        for (const selector of navSelectors) {
            try {
                const navElement = await page.locator(selector).first();
                if (await navElement.isVisible({ timeout: 1000 })) {
                    console.log(`📋 Found navigation: ${selector}`);

                    // Try to get all links in navigation
                    const links = await page.locator(`${selector} a`).all();
                    console.log(`🔗 Found ${links.length} navigation links`);

                    break;
                }
            } catch (e) {
                // Continue
            }
        }

        // 4. Look for service-specific pages or APIs
        console.log('🔧 Step 4: Looking for service endpoints and documentation...');

        // Try common API documentation paths
        const apiPaths = [
            '/docs',
            '/api',
            '/swagger',
            '/api-docs',
            '/documentation',
            '/help',
            '/guide',
            '/integration',
            '/services'
        ];

        for (const apiPath of apiPaths) {
            try {
                console.log(`🔍 Trying path: ${apiPath}`);
                const response = await page.goto(`https://integration.ishbek.com${apiPath}`, {
                    waitUntil: 'networkidle',
                    timeout: 10000
                });

                if (response.status() === 200) {
                    await page.waitForTimeout(2000);

                    const currentTitle = await page.title();
                    const currentUrl = page.url();

                    await page.screenshot({
                        path: `${screenshotDir}/03-${apiPath.replace('/', '')}-page.png`,
                        fullPage: true
                    });

                    analysis.push({
                        step: 3,
                        page: `${apiPath} Page`,
                        url: currentUrl,
                        title: currentTitle,
                        screenshot: `03-${apiPath.replace('/', '')}-page.png`,
                        description: `Service or documentation page: ${apiPath}`
                    });

                    console.log(`✅ Found accessible page: ${apiPath} - ${currentTitle}`);
                }
            } catch (e) {
                console.log(`❌ ${apiPath} not accessible or timeout`);
            }
        }

        // 5. Try to access common service names mentioned in the project
        console.log('🎯 Step 5: Checking for specific integration services...');

        const servicePaths = [
            '/careem',
            '/talabat',
            '/pos',
            '/delivery',
            '/orders',
            '/menu',
            '/webhook',
            '/status',
            '/health'
        ];

        for (const servicePath of servicePaths) {
            try {
                console.log(`🔍 Trying service: ${servicePath}`);
                const response = await page.goto(`https://integration.ishbek.com${servicePath}`, {
                    waitUntil: 'networkidle',
                    timeout: 10000
                });

                if (response.status() === 200) {
                    await page.waitForTimeout(2000);

                    const currentTitle = await page.title();
                    const currentUrl = page.url();

                    await page.screenshot({
                        path: `${screenshotDir}/04-service-${servicePath.replace('/', '')}.png`,
                        fullPage: true
                    });

                    analysis.push({
                        step: 4,
                        page: `${servicePath} Service`,
                        url: currentUrl,
                        title: currentTitle,
                        screenshot: `04-service-${servicePath.replace('/', '')}.png`,
                        description: `Integration service endpoint: ${servicePath}`
                    });

                    console.log(`✅ Found service endpoint: ${servicePath} - ${currentTitle}`);
                }
            } catch (e) {
                console.log(`❌ ${servicePath} not accessible`);
            }
        }

        // 6. Go back to main page and try to interact with any visible elements
        console.log('🔄 Step 6: Returning to main page for detailed analysis...');
        await page.goto('https://integration.ishbek.com', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Get page content for analysis
        const bodyText = await page.locator('body').textContent();
        const pageHTML = await page.content();

        // Look for any forms or interactive elements
        const forms = await page.locator('form').count();
        const buttons = await page.locator('button').count();
        const inputs = await page.locator('input').count();

        console.log(`📊 Page analysis: ${forms} forms, ${buttons} buttons, ${inputs} inputs`);

        // Capture final state
        await page.screenshot({
            path: `${screenshotDir}/05-final-analysis.png`,
            fullPage: true
        });

        analysis.push({
            step: 5,
            page: 'Final Analysis',
            url: page.url(),
            screenshot: '05-final-analysis.png',
            description: `Final page state - ${forms} forms, ${buttons} buttons, ${inputs} inputs`,
            bodyText: bodyText.slice(0, 500) + '...' // First 500 chars
        });

        // Save analysis to JSON file
        fs.writeFileSync(
            `${screenshotDir}/analysis-report.json`,
            JSON.stringify(analysis, null, 2)
        );

        // Create markdown report
        let markdownReport = `# Integration.ishbek.com Analysis Report\n\n`;
        markdownReport += `**Date**: ${new Date().toISOString()}\n`;
        markdownReport += `**Total Screenshots**: ${analysis.length}\n\n`;

        analysis.forEach(item => {
            markdownReport += `## Step ${item.step}: ${item.page}\n\n`;
            markdownReport += `- **URL**: ${item.url}\n`;
            if (item.title) markdownReport += `- **Title**: ${item.title}\n`;
            markdownReport += `- **Screenshot**: ${item.screenshot}\n`;
            markdownReport += `- **Description**: ${item.description}\n\n`;
            if (item.bodyText) {
                markdownReport += `### Page Content Sample:\n\`\`\`\n${item.bodyText}\n\`\`\`\n\n`;
            }
        });

        fs.writeFileSync(`${screenshotDir}/ANALYSIS_REPORT.md`, markdownReport);

        console.log(`\n✅ Analysis complete! Screenshots saved to: ${screenshotDir}`);
        console.log(`📄 Analysis report saved as: analysis-report.json and ANALYSIS_REPORT.md`);

    } catch (error) {
        console.error('❌ Error during exploration:', error.message);

        // Try to capture error state
        try {
            await page.screenshot({
                path: `${screenshotDir}/error-state.png`,
                fullPage: true
            });
        } catch (screenshotError) {
            console.error('Failed to capture error screenshot:', screenshotError.message);
        }
    } finally {
        await browser.close();
    }
}

// Run the exploration
exploreIshbekIntegration().catch(console.error);