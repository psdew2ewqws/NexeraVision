#!/usr/bin/env node

/**
 * Frontend Bundle Analysis Tool
 * Analyzes Next.js frontend bundles and provides optimization recommendations
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            bundleAnalysis: {},
            networkAnalysis: {},
            performanceInsights: [],
            recommendations: []
        };

        this.frontendPaths = [
            '/home/admin/integration-platform/frontend',
            '/home/admin/restaurant-platform-remote-v2/frontend'
        ];
    }

    async analyzeBundleSizes() {
        console.log('📦 Analyzing frontend bundle sizes...');

        for (const frontendPath of this.frontendPaths) {
            try {
                const stats = await fs.stat(frontendPath);
                if (!stats.isDirectory()) continue;

                console.log(`\n🔍 Analyzing: ${frontendPath}`);

                const analysis = await this.analyzeFrontendProject(frontendPath);
                this.results.bundleAnalysis[frontendPath] = analysis;

            } catch (error) {
                console.log(`⚠️  Could not analyze ${frontendPath}: ${error.message}`);
            }
        }
    }

    async analyzeFrontendProject(projectPath) {
        const analysis = {
            projectPath: projectPath,
            packageJson: null,
            buildFiles: [],
            staticAssets: [],
            dependencies: {},
            devDependencies: {},
            bundleStats: {}
        };

        try {
            // Read package.json
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            analysis.packageJson = JSON.parse(packageJsonContent);

            analysis.dependencies = analysis.packageJson.dependencies || {};
            analysis.devDependencies = analysis.packageJson.devDependencies || {};

            console.log(`  📋 Dependencies: ${Object.keys(analysis.dependencies).length}`);
            console.log(`  🔧 Dev Dependencies: ${Object.keys(analysis.devDependencies).length}`);

            // Check for .next build directory
            const nextBuildPath = path.join(projectPath, '.next');
            try {
                const buildStats = await fs.stat(nextBuildPath);
                if (buildStats.isDirectory()) {
                    analysis.buildFiles = await this.analyzeBuildDirectory(nextBuildPath);
                    console.log(`  🏗️  Build files found: ${analysis.buildFiles.length}`);
                }
            } catch (err) {
                console.log(`  ⚠️  No .next build directory found`);
            }

            // Check for static assets
            const publicPath = path.join(projectPath, 'public');
            try {
                const publicStats = await fs.stat(publicPath);
                if (publicStats.isDirectory()) {
                    analysis.staticAssets = await this.analyzeStaticAssets(publicPath);
                    console.log(`  🖼️  Static assets: ${analysis.staticAssets.length}`);
                }
            } catch (err) {
                console.log(`  ⚠️  No public directory found`);
            }

            // Analyze large dependencies
            analysis.largeDependencies = this.identifyLargeDependencies(analysis.dependencies);

        } catch (error) {
            console.log(`    ❌ Error analyzing project: ${error.message}`);
        }

        return analysis;
    }

    async analyzeBuildDirectory(buildPath) {
        const buildFiles = [];

        try {
            const files = await this.readDirectoryRecursive(buildPath);

            for (const file of files) {
                const filePath = path.join(buildPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isFile()) {
                    buildFiles.push({
                        path: file,
                        size: stats.size,
                        sizeKB: (stats.size / 1024).toFixed(2),
                        extension: path.extname(file)
                    });
                }
            }

            // Sort by size descending
            buildFiles.sort((a, b) => b.size - a.size);

        } catch (error) {
            console.log(`    ❌ Error reading build directory: ${error.message}`);
        }

        return buildFiles;
    }

    async analyzeStaticAssets(publicPath) {
        const staticAssets = [];

        try {
            const files = await this.readDirectoryRecursive(publicPath);

            for (const file of files) {
                const filePath = path.join(publicPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isFile()) {
                    staticAssets.push({
                        path: file,
                        size: stats.size,
                        sizeKB: (stats.size / 1024).toFixed(2),
                        extension: path.extname(file)
                    });
                }
            }

            // Sort by size descending
            staticAssets.sort((a, b) => b.size - a.size);

        } catch (error) {
            console.log(`    ❌ Error reading static assets: ${error.message}`);
        }

        return staticAssets;
    }

    async readDirectoryRecursive(dirPath, files = []) {
        const items = await fs.readdir(dirPath);

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);

            if (stats.isDirectory()) {
                await this.readDirectoryRecursive(itemPath, files);
            } else {
                files.push(path.relative(dirPath, itemPath));
            }
        }

        return files;
    }

    identifyLargeDependencies(dependencies) {
        // List of commonly large dependencies
        const largeDeps = [
            'react', 'react-dom', 'next', '@next/bundle-analyzer',
            'lodash', 'moment', 'antd', 'material-ui',
            'chart.js', 'recharts', 'd3',
            'socket.io-client', 'axios',
            'tailwindcss', 'bootstrap'
        ];

        return Object.keys(dependencies)
            .filter(dep => largeDeps.includes(dep))
            .map(dep => ({ name: dep, version: dependencies[dep] }));
    }

    analyzeNetworkPerformance() {
        console.log('\n🌐 Analyzing network performance...');

        // Performance insights based on analysis
        this.results.performanceInsights = [
            {
                category: 'Bundle Size',
                findings: this.analyzeBundleFindings(),
                priority: 'High'
            },
            {
                category: 'Static Assets',
                findings: this.analyzeAssetFindings(),
                priority: 'Medium'
            },
            {
                category: 'Dependencies',
                findings: this.analyzeDependencyFindings(),
                priority: 'Medium'
            }
        ];
    }

    analyzeBundleFindings() {
        const findings = [];

        Object.values(this.results.bundleAnalysis).forEach(analysis => {
            if (analysis.buildFiles && analysis.buildFiles.length > 0) {
                const jsFiles = analysis.buildFiles.filter(f => f.extension === '.js');
                const cssFiles = analysis.buildFiles.filter(f => f.extension === '.css');

                const totalJSSize = jsFiles.reduce((sum, f) => sum + f.size, 0);
                const totalCSSSize = cssFiles.reduce((sum, f) => sum + f.size, 0);

                findings.push(`Total JS bundle size: ${(totalJSSize / 1024 / 1024).toFixed(2)}MB`);
                findings.push(`Total CSS bundle size: ${(totalCSSSize / 1024).toFixed(2)}KB`);

                if (totalJSSize > 1024 * 1024) { // > 1MB
                    findings.push('⚠️ JS bundle is large (>1MB) - consider code splitting');
                }

                const largestJS = jsFiles[0];
                if (largestJS && largestJS.size > 500 * 1024) { // > 500KB
                    findings.push(`⚠️ Largest JS file: ${largestJS.path} (${largestJS.sizeKB}KB)`);
                }
            } else {
                findings.push('No build files found - project may not be built');
            }
        });

        return findings;
    }

    analyzeAssetFindings() {
        const findings = [];

        Object.values(this.results.bundleAnalysis).forEach(analysis => {
            if (analysis.staticAssets && analysis.staticAssets.length > 0) {
                const images = analysis.staticAssets.filter(f =>
                    ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(f.extension));

                const totalImageSize = images.reduce((sum, f) => sum + f.size, 0);
                findings.push(`Total image assets: ${images.length} files (${(totalImageSize / 1024).toFixed(2)}KB)`);

                const largeImages = images.filter(img => img.size > 100 * 1024); // > 100KB
                if (largeImages.length > 0) {
                    findings.push(`⚠️ ${largeImages.length} images are large (>100KB) - consider optimization`);
                    largeImages.slice(0, 3).forEach(img => {
                        findings.push(`  - ${img.path}: ${img.sizeKB}KB`);
                    });
                }
            } else {
                findings.push('No static assets analyzed');
            }
        });

        return findings;
    }

    analyzeDependencyFindings() {
        const findings = [];

        Object.values(this.results.bundleAnalysis).forEach(analysis => {
            const depCount = Object.keys(analysis.dependencies).length;
            const devDepCount = Object.keys(analysis.devDependencies).length;

            findings.push(`Dependencies: ${depCount}, Dev Dependencies: ${devDepCount}`);

            if (analysis.largeDependencies && analysis.largeDependencies.length > 0) {
                findings.push('Large dependencies detected:');
                analysis.largeDependencies.forEach(dep => {
                    findings.push(`  - ${dep.name}@${dep.version}`);
                });
            }

            // Check for potential optimizations
            if (analysis.dependencies.lodash) {
                findings.push('⚠️ Consider using lodash-es for better tree shaking');
            }
            if (analysis.dependencies.moment) {
                findings.push('⚠️ Consider replacing moment with date-fns for smaller bundle');
            }
        });

        return findings;
    }

    generateRecommendations() {
        console.log('\n💡 Generating bundle optimization recommendations...');

        this.results.recommendations = [
            {
                category: 'Code Splitting',
                priority: 'High',
                issue: 'Large bundle sizes affecting initial load',
                recommendation: 'Implement route-based code splitting with Next.js dynamic imports. Split vendor bundles from application code.',
                implementation: 'Use next/dynamic for component lazy loading and webpack bundle splitting configuration.'
            },
            {
                category: 'Asset Optimization',
                priority: 'High',
                issue: 'Unoptimized images and static assets',
                recommendation: 'Implement next/image for automatic image optimization. Use WebP format where possible. Enable gzip/brotli compression.',
                implementation: 'Configure next.config.js with image optimization and compression settings.'
            },
            {
                category: 'Dependency Optimization',
                priority: 'Medium',
                issue: 'Large or unnecessary dependencies',
                recommendation: 'Audit dependencies for tree-shaking opportunities. Replace large libraries with smaller alternatives. Use bundle analyzer to identify heavy imports.',
                implementation: 'Run webpack-bundle-analyzer and review import patterns for tree-shaking opportunities.'
            },
            {
                category: 'Caching Strategy',
                priority: 'Medium',
                issue: 'No optimized caching headers',
                recommendation: 'Implement proper cache headers for static assets. Use service workers for application caching. Configure CDN caching.',
                implementation: 'Set up cache-control headers and implement service worker with workbox.'
            },
            {
                category: 'Performance Monitoring',
                priority: 'Low',
                issue: 'No bundle size monitoring',
                recommendation: 'Set up bundle size monitoring with CI/CD integration. Monitor Core Web Vitals in production.',
                implementation: 'Add bundle-size checks to CI pipeline and implement real user monitoring (RUM).'
            }
        ];
    }

    async generateReport() {
        console.log('\n📊 Generating comprehensive bundle analysis report...');

        const reportContent = this.generateReportContent();

        // Save to file
        const reportPath = path.join(__dirname, 'performance-results', 'BUNDLE_ANALYSIS_REPORT.md');
        await fs.writeFile(reportPath, reportContent);

        console.log(`✅ Bundle analysis report saved to: ${reportPath}`);

        return this.results;
    }

    generateReportContent() {
        return `# 📦 Frontend Bundle Analysis Report

**Analysis Date:** ${new Date(this.results.timestamp).toLocaleString()}

## 📊 Bundle Analysis Summary

${Object.entries(this.results.bundleAnalysis).map(([path, analysis]) => `
### Project: ${path}

**Dependencies:** ${Object.keys(analysis.dependencies).length} production, ${Object.keys(analysis.devDependencies).length} development
**Build Files:** ${analysis.buildFiles.length} files
**Static Assets:** ${analysis.staticAssets.length} files

#### Top 5 Largest Build Files
${analysis.buildFiles.slice(0, 5).map(file =>
    `- ${file.path}: ${file.sizeKB}KB`).join('\n')}

#### Top 5 Largest Static Assets
${analysis.staticAssets.slice(0, 5).map(asset =>
    `- ${asset.path}: ${asset.sizeKB}KB`).join('\n')}

#### Large Dependencies
${analysis.largeDependencies && analysis.largeDependencies.length > 0
    ? analysis.largeDependencies.map(dep => `- ${dep.name}@${dep.version}`).join('\n')
    : 'None detected'}
`).join('')}

## 🎯 Performance Insights

${this.results.performanceInsights.map(insight => `
### ${insight.category} - Priority: ${insight.priority}

${insight.findings.map(finding => `- ${finding}`).join('\n')}
`).join('')}

## 💡 Optimization Recommendations

${this.results.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - Priority: ${rec.priority}

**Issue:** ${rec.issue}
**Recommendation:** ${rec.recommendation}
**Implementation:** ${rec.implementation}
`).join('')}

## 🚀 Action Items

### 🔴 High Priority (Implement This Week)
${this.results.recommendations.filter(r => r.priority === 'High').map(r => `- ${r.issue}`).join('\n')}

### 🟡 Medium Priority (Implement This Month)
${this.results.recommendations.filter(r => r.priority === 'Medium').map(r => `- ${r.issue}`).join('\n')}

### 🟢 Low Priority (Nice to Have)
${this.results.recommendations.filter(r => r.priority === 'Low').map(r => `- ${r.issue}`).join('\n')}

## 📈 Performance Targets

- **Initial Bundle Size:** < 250KB (gzipped)
- **Main Bundle Size:** < 1MB (gzipped)
- **Image Optimization:** All images < 100KB
- **Core Web Vitals:** LCP < 2.5s, FID < 100ms, CLS < 0.1

---
*Generated by Frontend Bundle Analyzer*
*Analysis Date: ${this.results.timestamp}*
`;
    }

    async run() {
        try {
            console.log('🚀 Starting Frontend Bundle Analysis...');

            await this.analyzeBundleSizes();
            this.analyzeNetworkPerformance();
            this.generateRecommendations();

            const results = await this.generateReport();

            console.log('\n✅ Bundle analysis completed!');
            console.log(`📦 Projects analyzed: ${Object.keys(results.bundleAnalysis).length}`);
            console.log(`💡 Recommendations: ${results.recommendations.length}`);

            return results;

        } catch (error) {
            console.error('❌ Bundle analysis failed:', error.message);
            throw error;
        }
    }
}

// Main execution
if (require.main === module) {
    const analyzer = new BundleAnalyzer();

    analyzer.run()
        .then(() => {
            console.log('\n🎉 Bundle analysis completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Bundle analysis failed:', error.message);
            process.exit(1);
        });
}

module.exports = BundleAnalyzer;