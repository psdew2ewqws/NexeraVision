#!/usr/bin/env node
/**
 * Frontend Health Check Script
 *
 * Validates API connectivity and configuration before starting the application.
 * Prevents runtime failures from configuration issues.
 *
 * Checks performed:
 * 1. Environment variable validation
 * 2. API URL format validation
 * 3. Backend connectivity test
 * 4. Port configuration verification
 * 5. Hardcoded URL detection
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  // Handle both Windows (\r\n) and Unix (\n) line endings
  envContent.split(/\r?\n/).forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;

    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      // Remove carriage return and any trailing whitespace
      const value = match[2].replace(/\r$/, '').trim();
      process.env[key] = value;
    }
  });
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Configuration
const EXPECTED_BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const WRONG_PORTS = [3002, 5000, 8080]; // Common wrong port configurations

/**
 * Print colored message to console
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print error and exit
 */
function fatal(message) {
  log(`\n❌ CRITICAL ERROR: ${message}`, 'red');
  log('\nStartup aborted. Fix the issues above before continuing.', 'red');
  process.exit(1);
}

/**
 * Print warning
 */
function warn(message) {
  log(`⚠️  WARNING: ${message}`, 'yellow');
}

/**
 * Print success
 */
function success(message) {
  log(`✅ ${message}`, 'green');
}

/**
 * Print info
 */
function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Check if environment variable is set
 */
function checkEnvVariable(varName) {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    return { valid: false, value: null };
  }
  return { valid: true, value: value.trim() };
}

/**
 * Validate API URL format
 */
function validateApiUrl(url) {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid protocol. Must be http:// or https://' };
    }

    // Check for localhost with wrong port
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
      if (WRONG_PORTS.includes(parseInt(port))) {
        return {
          valid: false,
          error: `Wrong port ${port} detected. Backend should be on port ${EXPECTED_BACKEND_PORT}`
        };
      }
      if (port !== EXPECTED_BACKEND_PORT.toString()) {
        warn(`Unexpected port ${port}. Backend typically runs on port ${EXPECTED_BACKEND_PORT}`);
      }
    }

    return { valid: true, url: parsed };
  } catch (error) {
    return { valid: false, error: `Invalid URL format: ${error.message}` };
  }
}

/**
 * Test connectivity to backend API
 */
function testBackendConnectivity(apiUrl) {
  return new Promise((resolve) => {
    const url = new URL(apiUrl);
    const client = url.protocol === 'https:' ? https : http;

    // Backend health endpoint is at /api/v1/health (not /health)
    const healthEndpoint = `${url.origin}/api/v1/health`;

    info(`Testing connectivity to ${healthEndpoint}...`);

    const req = client.get(healthEndpoint, { timeout: HEALTH_CHECK_TIMEOUT }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        // 404 is OK if health endpoint doesn't exist, as long as server responds
        success(`Backend is responding on ${url.origin}`);
        resolve({ connected: true });
      } else {
        warn(`Backend responded with status code ${res.statusCode}`);
        resolve({ connected: true, warning: `Unexpected status code: ${res.statusCode}` });
      }
    });

    req.on('error', (error) => {
      resolve({
        connected: false,
        error: `Cannot connect to backend: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        connected: false,
        error: `Connection timeout after ${HEALTH_CHECK_TIMEOUT}ms`
      });
    });
  });
}

/**
 * Search for hardcoded localhost URLs in source files
 */
function findHardcodedUrls() {
  const srcDir = path.join(process.cwd(), 'src');
  const pagesDir = path.join(process.cwd(), 'pages');
  const issues = [];

  if (!fs.existsSync(srcDir) && !fs.existsSync(pagesDir)) {
    warn('Cannot find src or pages directory for hardcoded URL check');
    return issues;
  }

  const dirsToCheck = [];
  if (fs.existsSync(srcDir)) dirsToCheck.push(srcDir);
  if (fs.existsSync(pagesDir)) dirsToCheck.push(pagesDir);

  const patterns = [
    /localhost:\d{4}/g,
    /127\.0\.0\.1:\d{4}/g,
    /http:\/\/localhost(?!:3000)/g, // Allow frontend port 3000
    /https?:\/\/.*:3002/g, // Wrong backend port
  ];

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .next, test directories
        if (!['node_modules', '.next', 'test', '__tests__', '__mocks__'].includes(entry.name)) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Check JS, TS, JSX, TSX files
        if (/\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
              // Skip comments
              if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                return;
              }

              patterns.forEach((pattern) => {
                const matches = line.match(pattern);
                if (matches) {
                  matches.forEach((match) => {
                    // Check if it's the wrong port
                    const portMatch = match.match(/:(\d{4})/);
                    if (portMatch) {
                      const port = parseInt(portMatch[1]);
                      if (WRONG_PORTS.includes(port)) {
                        issues.push({
                          file: path.relative(process.cwd(), fullPath),
                          line: index + 1,
                          match: match,
                          severity: 'critical',
                        });
                      } else if (port !== EXPECTED_BACKEND_PORT && port !== FRONTEND_PORT) {
                        issues.push({
                          file: path.relative(process.cwd(), fullPath),
                          line: index + 1,
                          match: match,
                          severity: 'warning',
                        });
                      }
                    }
                  });
                }
              });
            });
          } catch (error) {
            // Ignore files that can't be read
          }
        }
      }
    }
  }

  dirsToCheck.forEach(dir => scanDirectory(dir));
  return issues;
}

/**
 * Main health check function
 */
async function runHealthChecks() {
  log('\n🏥 Frontend Health Check Starting...', 'cyan');
  log('═'.repeat(60), 'cyan');

  let hasErrors = false;
  let hasWarnings = false;

  // 1. Check environment variables
  log('\n📋 Step 1: Environment Variable Validation', 'blue');
  log('─'.repeat(60));

  const apiUrlCheck = checkEnvVariable('NEXT_PUBLIC_API_URL');
  if (!apiUrlCheck.valid) {
    fatal('NEXT_PUBLIC_API_URL environment variable is not set!\n' +
          'Set it in .env.local file:\n' +
          `  NEXT_PUBLIC_API_URL=http://localhost:${EXPECTED_BACKEND_PORT}`);
  }
  success(`NEXT_PUBLIC_API_URL is set: ${apiUrlCheck.value}`);

  // 2. Validate API URL format
  log('\n🔍 Step 2: API URL Format Validation', 'blue');
  log('─'.repeat(60));

  const urlValidation = validateApiUrl(apiUrlCheck.value);
  if (!urlValidation.valid) {
    fatal(`Invalid API URL: ${urlValidation.error}`);
  }
  success('API URL format is valid');

  // 3. Test backend connectivity
  log('\n🌐 Step 3: Backend Connectivity Test', 'blue');
  log('─'.repeat(60));

  const connectivityTest = await testBackendConnectivity(apiUrlCheck.value);
  if (!connectivityTest.connected) {
    fatal(`Backend connectivity failed: ${connectivityTest.error}\n\n` +
          'Please ensure:\n' +
          `  1. Backend server is running on port ${EXPECTED_BACKEND_PORT}\n` +
          '  2. CORS is properly configured\n' +
          '  3. No firewall is blocking the connection\n\n' +
          'To start the backend:\n' +
          '  cd backend && npm run start:dev');
  }
  if (connectivityTest.warning) {
    warn(connectivityTest.warning);
    hasWarnings = true;
  }

  // 4. Check for hardcoded URLs
  log('\n🔎 Step 4: Hardcoded URL Detection', 'blue');
  log('─'.repeat(60));

  info('Scanning source files for hardcoded URLs...');
  const hardcodedIssues = findHardcodedUrls();

  if (hardcodedIssues.length > 0) {
    const criticalIssues = hardcodedIssues.filter(i => i.severity === 'critical');
    const warningIssues = hardcodedIssues.filter(i => i.severity === 'warning');

    if (criticalIssues.length > 0) {
      log('\n🚨 CRITICAL: Hardcoded URLs with wrong ports found:', 'red');
      criticalIssues.forEach(issue => {
        log(`  ${issue.file}:${issue.line} → "${issue.match}"`, 'red');
      });
      hasErrors = true;
    }

    if (warningIssues.length > 0) {
      log('\n⚠️  Hardcoded URLs found (verify these are intentional):', 'yellow');
      warningIssues.forEach(issue => {
        log(`  ${issue.file}:${issue.line} → "${issue.match}"`, 'yellow');
      });
      hasWarnings = true;
    }
  } else {
    success('No hardcoded URL issues found');
  }

  // 5. Port configuration check
  log('\n🔌 Step 5: Port Configuration Verification', 'blue');
  log('─'.repeat(60));

  const expectedPort = process.env.PORT || FRONTEND_PORT;
  if (parseInt(expectedPort) === EXPECTED_BACKEND_PORT) {
    fatal(`Frontend port (${expectedPort}) conflicts with backend port (${EXPECTED_BACKEND_PORT})!\n` +
          'Frontend should run on port 3000');
  }
  success(`Port configuration is correct (Frontend: ${expectedPort}, Backend: ${EXPECTED_BACKEND_PORT})`);

  // Summary
  log('\n' + '═'.repeat(60), 'cyan');
  if (hasErrors) {
    fatal('Health check failed! Fix critical issues above.');
  } else if (hasWarnings) {
    log('\n⚠️  Health check completed with warnings', 'yellow');
    log('Review warnings above. Application will start but may have issues.', 'yellow');
    log('\nContinuing in 3 seconds...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    log('\n✅ All health checks passed!', 'green');
    success('Frontend is ready to start');
  }

  log('═'.repeat(60) + '\n', 'cyan');
}

// Run health checks
runHealthChecks().catch((error) => {
  log(`\n💥 Unexpected error during health check: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
