#!/usr/bin/env node

/**
 * Focused Performance Test Suite for Integration Platform
 * Tests actual endpoints and provides actionable performance insights
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class IntegrationPlatformTester {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testId: `perf_test_${Date.now()}`,
            apiResults: [],
            frontendResults: [],
            loadTestResults: [],
            performanceMetrics: {},
            criticalIssues: [],
            recommendations: []
        };

        this.apiBaseUrl = 'http://localhost:3002';
        this.frontendBaseUrl = 'http://localhost:3003';
        this.authToken = null;
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const symbols = { info: '📊', success: '✅', error: '❌', warning: '⚠️' };
        console.log(`${symbols[level]} [${timestamp}] ${message}`);
    }

    async testAPIEndpoints() {
        this.log('Starting API endpoint testing...', 'info');

        const endpoints = [
            {
                name: 'Health Check',
                method: 'GET',
                path: '/api/v1/health',
                expectStatus: 200
            },
            {
                name: 'User Login',
                method: 'POST',
                path: '/api/v1/auth/login',
                body: { email: 'admin@test.com', password: 'admin123' },
                expectStatus: 200,
                saveToken: true
            },
            {
                name: 'Get Provider List',
                method: 'GET',
                path: '/api/v1/providers',
                requiresAuth: true,
                expectStatus: 200
            },
            {
                name: 'Get Orders List',
                method: 'GET',
                path: '/api/v1/orders',
                requiresAuth: true,
                expectStatus: 200
            },
            {
                name: 'Create Provider',
                method: 'POST',
                path: '/api/v1/providers',
                body: {
                    name: 'Test Provider',
                    type: 'delivery',
                    config: { endpoint: 'https://api.test.com' }
                },
                requiresAuth: true,
                expectStatus: [200, 201]
            }
        ];

        for (const endpoint of endpoints) {
            const startTime = Date.now();
            const url = `${this.apiBaseUrl}${endpoint.path}`;

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

                if (endpoint.requiresAuth && this.authToken) {
                    config.headers['Authorization'] = `Bearer ${this.authToken}`;
                }

                this.log(`Testing ${endpoint.method} ${endpoint.path}...`);

                const response = await axios(config);
                const responseTime = Date.now() - startTime;

                if (endpoint.saveToken && response.data.access_token) {
                    this.authToken = response.data.access_token;
                    this.log('Authentication token saved', 'success');
                }

                const expectedStatuses = Array.isArray(endpoint.expectStatus)
                    ? endpoint.expectStatus
                    : [endpoint.expectStatus];

                const success = expectedStatuses.includes(response.status);

                const result = {
                    name: endpoint.name,
                    method: endpoint.method,
                    path: endpoint.path,
                    status: response.status,
                    responseTime: responseTime,
                    success: success,
                    dataSize: JSON.stringify(response.data).length,
                    timestamp: new Date().toISOString()
                };

                this.results.apiResults.push(result);

                if (success) {
                    this.log(`${endpoint.name}: ${response.status} (${responseTime}ms)`, 'success');
                } else {
                    this.log(`${endpoint.name}: Unexpected status ${response.status}`, 'warning');
                }

                // Performance checks
                if (responseTime > 1000) {
                    this.results.criticalIssues.push({
                        type: 'API Performance',
                        severity: 'High',
                        message: `${endpoint.name} is slow: ${responseTime}ms (>1000ms threshold)`
                    });
                }

            } catch (error) {
                const responseTime = Date.now() - startTime;

                const result = {
                    name: endpoint.name,
                    method: endpoint.method,
                    path: endpoint.path,
                    status: error.response?.status || 0,
                    responseTime: responseTime,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };

                this.results.apiResults.push(result);
                this.log(`${endpoint.name}: ${error.message}`, 'error');

                this.results.criticalIssues.push({
                    type: 'API Error',
                    severity: 'Critical',
                    message: `${endpoint.name} failed: ${error.message}`
                });
            }
        }
    }

    async testFrontendPages() {
        this.log('Starting frontend page testing...', 'info');

        const pages = [
            { name: 'Login Page', path: '/login' },
            { name: 'Dashboard', path: '/dashboard' },
            { name: 'Orders Page', path: '/orders' },
            { name: 'Integrations Page', path: '/integrations' }
        ];

        for (const page of pages) {
            const startTime = Date.now();
            const url = `${this.frontendBaseUrl}${page.path}`;

            try {
                this.log(`Testing ${page.name}...`);

                const response = await axios.get(url, {
                    timeout: 15000,
                    maxRedirects: 5
                });

                const loadTime = Date.now() - startTime;

                // Basic content analysis
                const content = response.data;
                const hasTitle = content.includes('<title>') || content.includes('Integration Platform');
                const hasNavigation = content.includes('nav') || content.includes('menu');
                const hasForm = content.includes('<form>') || content.includes('input');

                const result = {
                    name: page.name,
                    path: page.path,
                    url: url,
                    status: response.status,
                    loadTime: loadTime,
                    success: response.status === 200,
                    contentSize: content.length,
                    hasTitle: hasTitle,
                    hasNavigation: hasNavigation,
                    hasForm: hasForm,
                    timestamp: new Date().toISOString()
                };

                this.results.frontendResults.push(result);

                if (response.status === 200) {
                    this.log(`${page.name}: ${response.status} (${loadTime}ms, ${content.length} bytes)`, 'success');
                } else {
                    this.log(`${page.name}: Status ${response.status}`, 'warning');
                }

                // Performance checks
                if (loadTime > 3000) {
                    this.results.criticalIssues.push({
                        type: 'Frontend Performance',
                        severity: 'High',
                        message: `${page.name} loads slowly: ${loadTime}ms (>3000ms threshold)`
                    });
                }

            } catch (error) {
                const loadTime = Date.now() - startTime;

                const result = {
                    name: page.name,
                    path: page.path,
                    url: url,
                    status: error.response?.status || 0,
                    loadTime: loadTime,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };

                this.results.frontendResults.push(result);
                this.log(`${page.name}: ${error.message}`, 'error');

                this.results.criticalIssues.push({
                    type: 'Frontend Error',
                    severity: 'Critical',
                    message: `${page.name} failed to load: ${error.message}`
                });
            }
        }
    }

    async performLoadTest() {
        this.log('Starting load testing...', 'info');

        const testCases = [
            { users: 1, description: 'Single user baseline' },
            { users: 5, description: 'Light load' },
            { users: 10, description: 'Medium load' },
            { users: 20, description: 'Heavy load' }
        ];

        const testEndpoint = `${this.apiBaseUrl}/api/v1/health`;

        for (const testCase of testCases) {
            this.log(`Testing with ${testCase.users} concurrent users...`);

            const promises = [];
            const startTime = Date.now();

            // Create concurrent requests
            for (let i = 0; i < testCase.users; i++) {
                promises.push(this.makeLoadTestRequest(testEndpoint, i));
            }

            try {
                const results = await Promise.all(promises);
                const totalTime = Date.now() - startTime;

                const successCount = results.filter(r => r.success).length;
                const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
                const maxResponseTime = Math.max(...results.map(r => r.responseTime));
                const minResponseTime = Math.min(...results.map(r => r.responseTime));

                const loadTestResult = {
                    concurrentUsers: testCase.users,
                    description: testCase.description,
                    totalRequests: testCase.users,
                    successCount: successCount,
                    failureCount: testCase.users - successCount,
                    successRate: (successCount / testCase.users) * 100,
                    totalTime: totalTime,
                    avgResponseTime: avgResponseTime,
                    maxResponseTime: maxResponseTime,
                    minResponseTime: minResponseTime,
                    requestsPerSecond: testCase.users / (totalTime / 1000),
                    timestamp: new Date().toISOString()
                };

                this.results.loadTestResults.push(loadTestResult);

                this.log(`${testCase.description}: ${successCount}/${testCase.users} success (${loadTestResult.successRate.toFixed(1)}%), avg ${avgResponseTime.toFixed(0)}ms`, 'success');

                // Performance checks
                if (loadTestResult.successRate < 95) {
                    this.results.criticalIssues.push({
                        type: 'Load Test',
                        severity: 'Critical',
                        message: `Low success rate under ${testCase.users} users: ${loadTestResult.successRate.toFixed(1)}%`
                    });
                }

                if (avgResponseTime > 2000) {
                    this.results.criticalIssues.push({
                        type: 'Load Test',
                        severity: 'High',
                        message: `High response time under ${testCase.users} users: ${avgResponseTime.toFixed(0)}ms`
                    });
                }

            } catch (error) {
                this.log(`Load test with ${testCase.users} users failed: ${error.message}`, 'error');
                this.results.criticalIssues.push({
                    type: 'Load Test',
                    severity: 'Critical',
                    message: `Load test failed for ${testCase.users} users: ${error.message}`
                });
            }
        }
    }

    async makeLoadTestRequest(url, requestId) {
        const startTime = Date.now();

        try {
            const response = await axios.get(url, { timeout: 10000 });
            return {
                requestId: requestId,
                responseTime: Date.now() - startTime,
                status: response.status,
                success: response.status === 200
            };
        } catch (error) {
            return {
                requestId: requestId,
                responseTime: Date.now() - startTime,
                status: error.response?.status || 0,
                success: false,
                error: error.message
            };
        }
    }

    calculatePerformanceScore() {
        let score = 100;

        // Deduct for critical issues
        this.results.criticalIssues.forEach(issue => {
            switch (issue.severity) {
                case 'Critical': score -= 20; break;
                case 'High': score -= 10; break;
                case 'Medium': score -= 5; break;
            }
        });

        // Deduct for API failures
        const apiFailures = this.results.apiResults.filter(r => !r.success).length;
        score -= apiFailures * 15;

        // Deduct for frontend failures
        const frontendFailures = this.results.frontendResults.filter(r => !r.success).length;
        score -= frontendFailures * 10;

        return Math.max(0, score);
    }

    generateRecommendations() {
        this.log('Generating performance recommendations...', 'info');

        // API Performance Recommendations
        const slowApiCalls = this.results.apiResults.filter(r => r.responseTime > 500);
        if (slowApiCalls.length > 0) {
            this.results.recommendations.push({
                category: 'API Performance',
                priority: 'High',
                issue: `${slowApiCalls.length} API endpoints are slow (>500ms)`,
                recommendation: 'Implement database indexing, add Redis caching, optimize database queries, and consider API response compression.',
                affectedEndpoints: slowApiCalls.map(r => r.path)
            });
        }

        // Frontend Performance Recommendations
        const slowPages = this.results.frontendResults.filter(r => r.loadTime > 2000);
        if (slowPages.length > 0) {
            this.results.recommendations.push({
                category: 'Frontend Performance',
                priority: 'High',
                issue: `${slowPages.length} pages load slowly (>2000ms)`,
                recommendation: 'Implement code splitting, enable gzip compression, optimize bundle sizes, use CDN for static assets, and implement lazy loading.',
                affectedPages: slowPages.map(r => r.name)
            });
        }

        // Load Test Recommendations
        const failedLoadTests = this.results.loadTestResults.filter(r => r.successRate < 95);
        if (failedLoadTests.length > 0) {
            this.results.recommendations.push({
                category: 'Scalability',
                priority: 'Critical',
                issue: 'System struggles under concurrent load',
                recommendation: 'Implement connection pooling, add load balancing, increase server resources, and optimize database connections.',
                details: `Failed at ${failedLoadTests[0].concurrentUsers} concurrent users`
            });
        }

        // Security Recommendations
        this.results.recommendations.push({
            category: 'Security',
            priority: 'Medium',
            issue: 'Security headers and authentication flow need review',
            recommendation: 'Implement HTTPS, add security headers (CSP, HSTS), rate limiting, and conduct security audit.'
        });

        // Monitoring Recommendations
        this.results.recommendations.push({
            category: 'Monitoring',
            priority: 'Medium',
            issue: 'No performance monitoring in place',
            recommendation: 'Implement APM solution (New Relic, DataDog), add logging aggregation, and set up performance alerts.'
        });
    }

    async generateReport() {
        this.log('Generating comprehensive performance report...', 'info');

        const performanceScore = this.calculatePerformanceScore();

        this.results.performanceMetrics = {
            performanceScore: performanceScore,
            apiAverageResponseTime: this.results.apiResults.length > 0
                ? this.results.apiResults.reduce((sum, r) => sum + r.responseTime, 0) / this.results.apiResults.length
                : 0,
            frontendAverageLoadTime: this.results.frontendResults.length > 0
                ? this.results.frontendResults.reduce((sum, r) => sum + r.loadTime, 0) / this.results.frontendResults.length
                : 0,
            apiSuccessRate: this.results.apiResults.length > 0
                ? (this.results.apiResults.filter(r => r.success).length / this.results.apiResults.length) * 100
                : 0,
            frontendSuccessRate: this.results.frontendResults.length > 0
                ? (this.results.frontendResults.filter(r => r.success).length / this.results.frontendResults.length) * 100
                : 0
        };

        // Create results directory
        const resultsDir = path.join(__dirname, 'performance-results');
        await fs.mkdir(resultsDir, { recursive: true });

        // Save detailed JSON results
        const jsonPath = path.join(resultsDir, 'performance-test-results.json');
        await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));

        // Generate markdown report
        const markdownReport = this.generateMarkdownReport();
        const markdownPath = path.join(resultsDir, 'PERFORMANCE_REPORT.md');
        await fs.writeFile(markdownPath, markdownReport);

        this.log(`Detailed results saved to: ${jsonPath}`, 'success');
        this.log(`Performance report saved to: ${markdownPath}`, 'success');

        return this.results;
    }

    generateMarkdownReport() {
        const { performanceMetrics } = this.results;

        return `# 🚀 Integration Platform Performance Test Report

**Test Date:** ${new Date(this.results.timestamp).toLocaleString()}
**Test ID:** ${this.results.testId}
**Performance Score:** ${performanceMetrics.performanceScore}/100

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Overall Performance Score | ${performanceMetrics.performanceScore}/100 | ${performanceMetrics.performanceScore >= 80 ? '✅ Good' : performanceMetrics.performanceScore >= 60 ? '⚠️ Needs Improvement' : '❌ Poor'} |
| API Success Rate | ${performanceMetrics.apiSuccessRate.toFixed(1)}% | ${performanceMetrics.apiSuccessRate >= 95 ? '✅' : '❌'} |
| Frontend Success Rate | ${performanceMetrics.frontendSuccessRate.toFixed(1)}% | ${performanceMetrics.frontendSuccessRate >= 95 ? '✅' : '❌'} |
| Average API Response Time | ${performanceMetrics.apiAverageResponseTime.toFixed(0)}ms | ${performanceMetrics.apiAverageResponseTime <= 500 ? '✅' : performanceMetrics.apiAverageResponseTime <= 1000 ? '⚠️' : '❌'} |
| Average Page Load Time | ${performanceMetrics.frontendAverageLoadTime.toFixed(0)}ms | ${performanceMetrics.frontendAverageLoadTime <= 2000 ? '✅' : performanceMetrics.frontendAverageLoadTime <= 3000 ? '⚠️' : '❌'} |

## 🚨 Critical Issues (${this.results.criticalIssues.length})

${this.results.criticalIssues.length > 0
    ? this.results.criticalIssues.map((issue, i) =>
        `**${i + 1}. ${issue.severity}:** ${issue.message} [${issue.type}]`).join('\n')
    : '✅ No critical issues found!'
}

## 📡 API Performance Results

### API Endpoint Testing
| Endpoint | Method | Status | Response Time | Result |
|----------|--------|--------|---------------|--------|
${this.results.apiResults.map(r =>
    `| ${r.path} | ${r.method} | ${r.status} | ${r.responseTime}ms | ${r.success ? '✅' : '❌'} |`
).join('\n')}

**API Performance Summary:**
- Total Endpoints Tested: ${this.results.apiResults.length}
- Successful Requests: ${this.results.apiResults.filter(r => r.success).length}
- Failed Requests: ${this.results.apiResults.filter(r => !r.success).length}
- Average Response Time: ${performanceMetrics.apiAverageResponseTime.toFixed(0)}ms

## 🌐 Frontend Performance Results

### Page Load Testing
| Page | Status | Load Time | Content Size | Result |
|------|--------|-----------|--------------|--------|
${this.results.frontendResults.map(r =>
    `| ${r.name} | ${r.status} | ${r.loadTime}ms | ${r.contentSize ? (r.contentSize/1024).toFixed(1) + 'KB' : 'N/A'} | ${r.success ? '✅' : '❌'} |`
).join('\n')}

**Frontend Performance Summary:**
- Total Pages Tested: ${this.results.frontendResults.length}
- Successfully Loaded: ${this.results.frontendResults.filter(r => r.success).length}
- Failed to Load: ${this.results.frontendResults.filter(r => !r.success).length}
- Average Load Time: ${performanceMetrics.frontendAverageLoadTime.toFixed(0)}ms

## ⚡ Load Testing Results

### Concurrent User Testing
| Users | Success Rate | Avg Response | Max Response | Req/Sec |
|-------|--------------|--------------|--------------|---------|
${this.results.loadTestResults.map(r =>
    `| ${r.concurrentUsers} | ${r.successRate.toFixed(1)}% | ${r.avgResponseTime.toFixed(0)}ms | ${r.maxResponseTime}ms | ${r.requestsPerSecond.toFixed(1)} |`
).join('\n')}

## 💡 Performance Recommendations

${this.results.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - Priority: ${rec.priority}

**Issue:** ${rec.issue}
**Recommendation:** ${rec.recommendation}

${rec.affectedEndpoints ? `**Affected Endpoints:** ${rec.affectedEndpoints.join(', ')}` : ''}
${rec.affectedPages ? `**Affected Pages:** ${rec.affectedPages.join(', ')}` : ''}
${rec.details ? `**Details:** ${rec.details}` : ''}
`).join('')}

## 🎯 Action Plan

### 🔴 Critical Priority (Fix Immediately)
${this.results.recommendations.filter(r => r.priority === 'Critical').map(r => `- ${r.issue}`).join('\n') || 'None identified'}

### 🟡 High Priority (Fix This Week)
${this.results.recommendations.filter(r => r.priority === 'High').map(r => `- ${r.issue}`).join('\n') || 'None identified'}

### 🟢 Medium Priority (Fix This Month)
${this.results.recommendations.filter(r => r.priority === 'Medium').map(r => `- ${r.issue}`).join('\n') || 'None identified'}

## 📈 Performance Benchmarks

### Current Performance Thresholds
- ✅ **Good**: API <500ms, Pages <2000ms, Load success >95%
- ⚠️ **Acceptable**: API <1000ms, Pages <3000ms, Load success >90%
- ❌ **Poor**: API >1000ms, Pages >3000ms, Load success <90%

### Target Performance Goals
- API Response Time: <200ms average
- Page Load Time: <1500ms average
- Load Test Success: 100% up to 50 concurrent users
- Performance Score: 90/100

## 📊 Test Configuration

- **API Base URL:** ${this.apiBaseUrl}
- **Frontend Base URL:** ${this.frontendBaseUrl}
- **Test Duration:** ${((Date.now() - new Date(this.results.timestamp).getTime()) / 1000).toFixed(0)} seconds
- **Test Environment:** Development/Staging

---

*Generated by Integration Platform Performance Test Suite*
*Test ID: ${this.results.testId}*
*Report Generated: ${new Date().toISOString()}*
`;
    }

    async run() {
        try {
            this.log('🚀 Starting Integration Platform Performance Test Suite...', 'info');

            // Run test phases
            await this.testAPIEndpoints();
            await this.testFrontendPages();
            await this.performLoadTest();

            // Generate insights
            this.generateRecommendations();

            // Generate final report
            const results = await this.generateReport();

            // Summary
            this.log('', 'info');
            this.log('🎉 Performance Testing Complete!', 'success');
            this.log(`📊 Performance Score: ${results.performanceMetrics.performanceScore}/100`, 'info');
            this.log(`🚨 Critical Issues: ${results.criticalIssues.length}`, results.criticalIssues.length > 0 ? 'warning' : 'success');
            this.log(`💡 Recommendations: ${results.recommendations.length}`, 'info');

            return results;

        } catch (error) {
            this.log(`Performance testing failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Main execution
if (require.main === module) {
    const tester = new IntegrationPlatformTester();

    tester.run()
        .then(results => {
            console.log('\n✅ All performance tests completed successfully!');
            console.log(`\n📋 Quick Summary:`);
            console.log(`   Performance Score: ${results.performanceMetrics.performanceScore}/100`);
            console.log(`   Critical Issues: ${results.criticalIssues.length}`);
            console.log(`   API Success Rate: ${results.performanceMetrics.apiSuccessRate.toFixed(1)}%`);
            console.log(`   Frontend Success Rate: ${results.performanceMetrics.frontendSuccessRate.toFixed(1)}%`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Performance testing suite failed:', error.message);
            process.exit(1);
        });
}

module.exports = IntegrationPlatformTester;