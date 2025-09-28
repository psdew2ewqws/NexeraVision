#!/usr/bin/env node

const playwright = require('playwright');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class PerformanceTester {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testId: `perf_test_${Date.now()}`,
            frontend: {
                baseUrl: 'http://localhost:3003',
                pages: []
            },
            api: {
                baseUrl: 'http://localhost:3002/api/v1',
                endpoints: []
            },
            loadTest: {
                results: []
            },
            bundleAnalysis: {},
            recommendations: [],
            criticalIssues: []
        };
        this.browser = null;
    }

    async initialize() {
        console.log('🚀 Initializing Performance Testing Suite...');
        this.browser = await playwright.chromium.launch({
            headless: false, // Set to true for production
            devtools: true
        });

        // Create results directory
        await fs.mkdir(path.join(__dirname, 'performance-results'), { recursive: true });

        console.log('✅ Browser launched and ready');
    }

    async testAPIEndpoints() {
        console.log('\n📡 Testing API Endpoints...');

        const endpoints = [
            { method: 'GET', path: '/health', description: 'Health check' },
            { method: 'GET', path: '/auth/profile', description: 'Get user profile', requiresAuth: true },
            { method: 'POST', path: '/auth/login', description: 'User login', body: { email: 'admin@test.com', password: 'password123' } },
            { method: 'GET', path: '/orders', description: 'Get orders list', requiresAuth: true },
            { method: 'GET', path: '/integrations', description: 'Get integrations', requiresAuth: true },
            { method: 'GET', path: '/dashboard/stats', description: 'Dashboard statistics', requiresAuth: true }
        ];

        let authToken = null;

        for (const endpoint of endpoints) {
            const startTime = Date.now();
            const url = `${this.results.api.baseUrl}${endpoint.path}`;

            try {
                const config = {
                    method: endpoint.method.toLowerCase(),
                    url: url,
                    timeout: 10000,
                    headers: {}
                };

                if (endpoint.body) {
                    config.data = endpoint.body;
                    config.headers['Content-Type'] = 'application/json';
                }

                if (endpoint.requiresAuth && authToken) {
                    config.headers['Authorization'] = `Bearer ${authToken}`;
                }

                console.log(`  Testing ${endpoint.method} ${endpoint.path}...`);

                const response = await axios(config);
                const responseTime = Date.now() - startTime;

                // Store auth token if this is login
                if (endpoint.path === '/auth/login' && response.data.token) {
                    authToken = response.data.token;
                }

                const result = {
                    method: endpoint.method,
                    path: endpoint.path,
                    description: endpoint.description,
                    status: response.status,
                    responseTime: responseTime,
                    success: true,
                    dataSize: JSON.stringify(response.data).length,
                    headers: response.headers
                };

                this.results.api.endpoints.push(result);

                console.log(`    ✅ ${response.status} - ${responseTime}ms`);

                // Check for performance issues
                if (responseTime > 1000) {
                    this.results.criticalIssues.push(`API ${endpoint.path} is slow: ${responseTime}ms`);
                }

            } catch (error) {
                const responseTime = Date.now() - startTime;
                const result = {
                    method: endpoint.method,
                    path: endpoint.path,
                    description: endpoint.description,
                    status: error.response?.status || 0,
                    responseTime: responseTime,
                    success: false,
                    error: error.message,
                    errorDetails: error.response?.data
                };

                this.results.api.endpoints.push(result);
                console.log(`    ❌ Failed - ${error.message}`);

                this.results.criticalIssues.push(`API ${endpoint.path} failed: ${error.message}`);
            }
        }
    }

    async testFrontendPages() {
        console.log('\n🌐 Testing Frontend Pages...');

        const pages = [
            { url: '/login', name: 'Login Page' },
            { url: '/dashboard', name: 'Dashboard' },
            { url: '/orders', name: 'Orders Page' },
            { url: '/integrations', name: 'Integrations Page' }
        ];

        const context = await this.browser.newContext();

        for (const pageInfo of pages) {
            console.log(`  Testing ${pageInfo.name}...`);

            const page = await context.newPage();
            const startTime = Date.now();

            try {
                // Enable performance tracking
                await page.goto('chrome://settings/', { waitUntil: 'load' });

                const navigationStart = Date.now();
                await page.goto(`${this.results.frontend.baseUrl}${pageInfo.url}`, {
                    waitUntil: 'networkidle',
                    timeout: 30000
                });

                const loadTime = Date.now() - navigationStart;

                // Get performance metrics
                const performanceMetrics = await page.evaluate(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const paint = performance.getEntriesByType('paint');

                    return {
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                        transferSize: navigation.transferSize,
                        encodedBodySize: navigation.encodedBodySize,
                        decodedBodySize: navigation.decodedBodySize
                    };
                });

                // Get page content analysis
                const pageAnalysis = await page.evaluate(() => {
                    return {
                        elementsCount: document.querySelectorAll('*').length,
                        imagesCount: document.querySelectorAll('img').length,
                        scriptsCount: document.querySelectorAll('script').length,
                        stylesCount: document.querySelectorAll('link[rel="stylesheet"], style').length,
                        buttonsCount: document.querySelectorAll('button').length,
                        inputsCount: document.querySelectorAll('input').length,
                        title: document.title,
                        hasErrors: !!document.querySelector('[class*="error"], .error, #error')
                    };
                });

                // Capture console errors
                const consoleErrors = [];
                page.on('console', msg => {
                    if (msg.type() === 'error') {
                        consoleErrors.push(msg.text());
                    }
                });

                // Take screenshot
                const screenshotPath = path.join(__dirname, 'performance-results', `${pageInfo.name.toLowerCase().replace(/\s+/g, '_')}_screenshot.png`);
                await page.screenshot({
                    path: screenshotPath,
                    fullPage: true
                });

                const result = {
                    name: pageInfo.name,
                    url: pageInfo.url,
                    loadTime: loadTime,
                    performanceMetrics: performanceMetrics,
                    pageAnalysis: pageAnalysis,
                    screenshotPath: screenshotPath,
                    consoleErrors: consoleErrors,
                    success: true
                };

                this.results.frontend.pages.push(result);

                console.log(`    ✅ Loaded in ${loadTime}ms`);
                console.log(`    📊 DOM Elements: ${pageAnalysis.elementsCount}`);
                console.log(`    🖼️  Images: ${pageAnalysis.imagesCount}`);
                console.log(`    📜 Scripts: ${pageAnalysis.scriptsCount}`);

                // Check for performance issues
                if (loadTime > 3000) {
                    this.results.criticalIssues.push(`${pageInfo.name} loads slowly: ${loadTime}ms`);
                }

                if (performanceMetrics.firstContentfulPaint > 2500) {
                    this.results.criticalIssues.push(`${pageInfo.name} has slow First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
                }

            } catch (error) {
                console.log(`    ❌ Failed to load: ${error.message}`);

                const result = {
                    name: pageInfo.name,
                    url: pageInfo.url,
                    loadTime: Date.now() - startTime,
                    success: false,
                    error: error.message
                };

                this.results.frontend.pages.push(result);
                this.results.criticalIssues.push(`${pageInfo.name} failed to load: ${error.message}`);
            }

            await page.close();
        }

        await context.close();
    }

    async performLoadTesting() {
        console.log('\n⚡ Performing Load Testing...');

        const concurrentUsers = [1, 5, 10, 20];
        const testEndpoints = [
            `${this.results.api.baseUrl}/health`,
            `${this.results.frontend.baseUrl}/login`
        ];

        for (const userCount of concurrentUsers) {
            console.log(`  Testing with ${userCount} concurrent users...`);

            const promises = [];
            const startTime = Date.now();

            for (let i = 0; i < userCount; i++) {
                for (const endpoint of testEndpoints) {
                    promises.push(this.simulateUser(endpoint, i));
                }
            }

            try {
                const results = await Promise.all(promises);
                const totalTime = Date.now() - startTime;

                const loadTestResult = {
                    concurrentUsers: userCount,
                    totalRequests: promises.length,
                    totalTime: totalTime,
                    averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
                    successRate: (results.filter(r => r.success).length / results.length) * 100,
                    requestsPerSecond: results.length / (totalTime / 1000),
                    errors: results.filter(r => !r.success).map(r => r.error)
                };

                this.results.loadTest.results.push(loadTestResult);

                console.log(`    ✅ ${loadTestResult.successRate.toFixed(1)}% success rate`);
                console.log(`    📈 ${loadTestResult.requestsPerSecond.toFixed(1)} req/sec`);
                console.log(`    ⏱️  Avg response: ${loadTestResult.averageResponseTime.toFixed(0)}ms`);

                // Check for load issues
                if (loadTestResult.successRate < 95) {
                    this.results.criticalIssues.push(`Low success rate under ${userCount} users: ${loadTestResult.successRate.toFixed(1)}%`);
                }

                if (loadTestResult.averageResponseTime > 2000) {
                    this.results.criticalIssues.push(`High response time under ${userCount} users: ${loadTestResult.averageResponseTime.toFixed(0)}ms`);
                }

            } catch (error) {
                console.log(`    ❌ Load test failed: ${error.message}`);
                this.results.criticalIssues.push(`Load testing failed for ${userCount} users: ${error.message}`);
            }
        }
    }

    async simulateUser(endpoint, userId) {
        const startTime = Date.now();

        try {
            let response;

            if (endpoint.includes('/api/')) {
                // API request
                response = await axios.get(endpoint, { timeout: 10000 });
            } else {
                // Frontend page request
                const context = await this.browser.newContext();
                const page = await context.newPage();
                await page.goto(endpoint, { waitUntil: 'load', timeout: 10000 });
                response = { status: 200 };
                await page.close();
                await context.close();
            }

            return {
                userId: userId,
                endpoint: endpoint,
                responseTime: Date.now() - startTime,
                status: response.status,
                success: true
            };

        } catch (error) {
            return {
                userId: userId,
                endpoint: endpoint,
                responseTime: Date.now() - startTime,
                success: false,
                error: error.message
            };
        }
    }

    async analyzeBundleSize() {
        console.log('\n📦 Analyzing Bundle Sizes...');

        try {
            // Try to read build stats if available
            const possiblePaths = [
                '/home/admin/integration-platform/frontend/.next',
                '/home/admin/delivery-integration-platform/frontend/.next',
                '/home/admin/restaurant-platform-remote-v2/frontend/.next'
            ];

            for (const buildPath of possiblePaths) {
                try {
                    const stats = await fs.stat(buildPath);
                    if (stats.isDirectory()) {
                        const files = await fs.readdir(buildPath, { recursive: true });
                        const jsFiles = files.filter(f => f.endsWith('.js'));
                        const cssFiles = files.filter(f => f.endsWith('.css'));

                        console.log(`    Found build at: ${buildPath}`);
                        console.log(`    JS files: ${jsFiles.length}`);
                        console.log(`    CSS files: ${cssFiles.length}`);

                        this.results.bundleAnalysis[buildPath] = {
                            jsFiles: jsFiles.length,
                            cssFiles: cssFiles.length,
                            totalFiles: files.length
                        };
                    }
                } catch (err) {
                    // Path doesn't exist, continue
                }
            }

        } catch (error) {
            console.log(`    ⚠️  Could not analyze bundle: ${error.message}`);
        }
    }

    generateRecommendations() {
        console.log('\n💡 Generating Recommendations...');

        // API Performance Recommendations
        const slowApiEndpoints = this.results.api.endpoints.filter(e => e.responseTime > 500);
        if (slowApiEndpoints.length > 0) {
            this.results.recommendations.push({
                category: 'API Performance',
                priority: 'High',
                issue: `${slowApiEndpoints.length} API endpoints are slow (>500ms)`,
                recommendation: 'Add database indexing, implement caching (Redis), optimize queries, and consider API response compression.'
            });
        }

        // Frontend Performance Recommendations
        const slowPages = this.results.frontend.pages.filter(p => p.loadTime > 2000);
        if (slowPages.length > 0) {
            this.results.recommendations.push({
                category: 'Frontend Performance',
                priority: 'High',
                issue: `${slowPages.length} pages load slowly (>2s)`,
                recommendation: 'Implement code splitting, lazy loading, optimize images, and use service workers for caching.'
            });
        }

        // Load Testing Recommendations
        const failedLoadTests = this.results.loadTest.results.filter(l => l.successRate < 95);
        if (failedLoadTests.length > 0) {
            this.results.recommendations.push({
                category: 'Scalability',
                priority: 'Critical',
                issue: 'System fails under concurrent load',
                recommendation: 'Implement connection pooling, add load balancer, optimize database connections, and consider horizontal scaling.'
            });
        }

        // Bundle Size Recommendations
        this.results.recommendations.push({
            category: 'Bundle Optimization',
            priority: 'Medium',
            issue: 'Bundle analysis needed',
            recommendation: 'Run webpack-bundle-analyzer, implement tree shaking, split vendor bundles, and compress assets.'
        });

        // Security Recommendations
        this.results.recommendations.push({
            category: 'Security',
            priority: 'High',
            issue: 'Security headers analysis needed',
            recommendation: 'Implement CSP headers, HSTS, X-Frame-Options, and regular security audits.'
        });
    }

    async generateReport() {
        console.log('\n📊 Generating Performance Report...');

        // Calculate overall performance score
        let performanceScore = 100;

        // Deduct points for critical issues
        performanceScore -= this.results.criticalIssues.length * 10;

        // Deduct points for API issues
        const failedApis = this.results.api.endpoints.filter(e => !e.success).length;
        performanceScore -= failedApis * 15;

        // Deduct points for frontend issues
        const failedPages = this.results.frontend.pages.filter(p => !p.success).length;
        performanceScore -= failedPages * 20;

        performanceScore = Math.max(0, performanceScore);

        const report = {
            summary: {
                testDate: this.results.timestamp,
                performanceScore: performanceScore,
                totalIssues: this.results.criticalIssues.length,
                apiEndpointsTested: this.results.api.endpoints.length,
                frontendPagesTested: this.results.frontend.pages.length,
                loadTestsCompleted: this.results.loadTest.results.length
            },
            ...this.results,
            performanceScore: performanceScore
        };

        // Save detailed results
        const resultsPath = path.join(__dirname, 'performance-results', 'detailed-results.json');
        await fs.writeFile(resultsPath, JSON.stringify(report, null, 2));

        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = path.join(__dirname, 'performance-results', 'performance-report.md');
        await fs.writeFile(markdownPath, markdownReport);

        console.log(`✅ Results saved to: ${resultsPath}`);
        console.log(`📄 Report saved to: ${markdownPath}`);

        return report;
    }

    generateMarkdownReport(report) {
        const { summary, api, frontend, loadTest, recommendations, criticalIssues } = report;

        return `# 🚀 Integration Platform Performance Test Report

**Test Date:** ${new Date(summary.testDate).toLocaleString()}
**Performance Score:** ${summary.performanceScore}/100
**Test ID:** ${report.testId}

## 📋 Executive Summary

- **API Endpoints Tested:** ${summary.apiEndpointsTested}
- **Frontend Pages Tested:** ${summary.frontendPagesTested}
- **Load Tests Completed:** ${summary.loadTestsCompleted}
- **Critical Issues Found:** ${summary.totalIssues}

## 🚨 Critical Issues

${criticalIssues.length > 0 ?
    criticalIssues.map((issue, i) => `${i + 1}. ❌ ${issue}`).join('\n') :
    '✅ No critical issues found!'
}

## 📡 API Performance Results

### Endpoint Performance Summary
| Endpoint | Method | Status | Response Time | Result |
|----------|--------|--------|---------------|---------|
${api.endpoints.map(e =>
    `| ${e.path} | ${e.method} | ${e.status} | ${e.responseTime}ms | ${e.success ? '✅' : '❌'} |`
).join('\n')}

### API Metrics
- **Average Response Time:** ${(api.endpoints.reduce((sum, e) => sum + e.responseTime, 0) / api.endpoints.length).toFixed(0)}ms
- **Success Rate:** ${((api.endpoints.filter(e => e.success).length / api.endpoints.length) * 100).toFixed(1)}%
- **Slowest Endpoint:** ${api.endpoints.reduce((prev, curr) => prev.responseTime > curr.responseTime ? prev : curr).path} (${api.endpoints.reduce((prev, curr) => prev.responseTime > curr.responseTime ? prev : curr).responseTime}ms)

## 🌐 Frontend Performance Results

### Page Performance Summary
| Page | Load Time | FCP* | Elements | Status |
|------|-----------|------|----------|---------|
${frontend.pages.map(p =>
    `| ${p.name} | ${p.loadTime}ms | ${p.performanceMetrics?.firstContentfulPaint || 'N/A'}ms | ${p.pageAnalysis?.elementsCount || 'N/A'} | ${p.success ? '✅' : '❌'} |`
).join('\n')}

*FCP = First Contentful Paint

### Frontend Metrics
- **Average Load Time:** ${(frontend.pages.reduce((sum, p) => sum + p.loadTime, 0) / frontend.pages.length).toFixed(0)}ms
- **Pages Loading Successfully:** ${frontend.pages.filter(p => p.success).length}/${frontend.pages.length}
- **Slowest Page:** ${frontend.pages.reduce((prev, curr) => prev.loadTime > curr.loadTime ? prev : curr).name} (${frontend.pages.reduce((prev, curr) => prev.loadTime > curr.loadTime ? prev : curr).loadTime}ms)

## ⚡ Load Testing Results

### Concurrent User Testing
| Users | Requests | Success Rate | Avg Response | Req/Sec |
|-------|----------|--------------|--------------|---------|
${loadTest.results.map(l =>
    `| ${l.concurrentUsers} | ${l.totalRequests} | ${l.successRate.toFixed(1)}% | ${l.averageResponseTime.toFixed(0)}ms | ${l.requestsPerSecond.toFixed(1)} |`
).join('\n')}

## 💡 Performance Recommendations

${recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - Priority: ${rec.priority}

**Issue:** ${rec.issue}
**Recommendation:** ${rec.recommendation}
`).join('')}

## 🎯 Performance Optimization Priorities

### 🔴 Critical (Fix Immediately)
${recommendations.filter(r => r.priority === 'Critical').map(r => `- ${r.issue}`).join('\n') || 'None identified'}

### 🟡 High (Fix This Week)
${recommendations.filter(r => r.priority === 'High').map(r => `- ${r.issue}`).join('\n') || 'None identified'}

### 🟢 Medium (Fix This Month)
${recommendations.filter(r => r.priority === 'Medium').map(r => `- ${r.issue}`).join('\n') || 'None identified'}

## 📊 Performance Score Breakdown

- **Base Score:** 100
- **Critical Issues:** -${criticalIssues.length * 10} (${criticalIssues.length} × 10)
- **API Failures:** -${api.endpoints.filter(e => !e.success).length * 15} (${api.endpoints.filter(e => !e.success).length} × 15)
- **Frontend Failures:** -${frontend.pages.filter(p => !p.success).length * 20} (${frontend.pages.filter(p => !p.success).length} × 20)
- **Final Score:** **${summary.performanceScore}/100**

## 🔧 Next Steps

1. **Immediate Actions:** Address all critical issues first
2. **Performance Monitoring:** Set up continuous monitoring
3. **Regular Testing:** Schedule weekly performance tests
4. **Optimization Cycles:** Plan monthly optimization sprints
5. **User Experience:** Monitor real user metrics

---
*Generated by Integration Platform Performance Test Suite*
*Test ID: ${report.testId}*
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser cleanup completed');
        }
    }

    async run() {
        try {
            await this.initialize();

            // Run all test phases
            await this.testAPIEndpoints();
            await this.testFrontendPages();
            await this.performLoadTesting();
            await this.analyzeBundleSize();

            // Generate insights
            this.generateRecommendations();

            // Generate and save report
            const report = await this.generateReport();

            console.log('\n🎉 Performance Testing Complete!');
            console.log(`📊 Performance Score: ${report.performanceScore}/100`);
            console.log(`🚨 Critical Issues: ${report.criticalIssues.length}`);
            console.log(`💡 Recommendations: ${report.recommendations.length}`);

            return report;

        } catch (error) {
            console.error('💥 Performance testing failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
if (require.main === module) {
    const tester = new PerformanceTester();

    tester.run()
        .then(report => {
            console.log('\n✅ All tests completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Performance testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = PerformanceTester;