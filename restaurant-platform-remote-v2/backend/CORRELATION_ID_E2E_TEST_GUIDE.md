# Phase 4-6: Correlation ID E2E Test Guide

## Overview
This document explains how to run end-to-end tests for the correlation ID tracking system implemented in Phases 4-6 of the printing system.

## Test Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Playwright E2E Test                          │
│                                                                   │
│  1. Opens browser to http://31.57.166.18:3000/settings/printing │
│  2. Clicks "Test Print" button for POS-80C                      │
│  3. Captures correlation ID from browser console                 │
│  4. Monitors network requests/responses                          │
│  5. Verifies backend logs for correlation tracking              │
│  6. Verifies Desktop App logs for correlation tracking          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                            │
│                                                                   │
│  - Generates correlation ID: printer_test_[random]              │
│  - Sends to backend with X-Correlation-ID header                │
│  - Logs to browser console                                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                              │
│                                                                   │
│  - Receives correlation ID in header                             │
│  - Logs: 🆔 [PHYSICAL-TEST] Correlation ID: printer_test_...   │
│  - Passes to PrinterMaster                                       │
│  - Logs: ✅ [REQ-RES] Resolved request: printer_test_...       │
│  - Writes to /tmp/backend-debug.log                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Desktop App (PrinterMaster)                      │
│                                                                   │
│  - Receives print job with correlation ID                        │
│  - Logs correlation ID in all operations                         │
│  - Writes to /tmp/printer-debug.log                             │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Running Services
All services must be running before executing tests:

```bash
# Backend (port 3001)
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev
# OR if already running via PM2:
pm2 list | grep restaurant-backend

# Frontend (port 3000, accessible via 31.57.166.18)
cd /home/admin/restaurant-platform-remote-v2/frontend
npm run dev

# PrinterMaster Desktop App (port 8182)
cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop
npm run start
```

### 2. Playwright Installation
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npm install -D @playwright/test
npx playwright install chromium
```

### 3. Log Files
Ensure log files exist and are writable:
```bash
touch /tmp/backend-debug.log
touch /tmp/printer-debug.log
chmod 666 /tmp/backend-debug.log
chmod 666 /tmp/printer-debug.log
```

### 4. Printer Setup
- Physical printer "POS-80C" must be configured in the system
- Printer should be visible in the frontend at `/settings/printing`

## Running Tests

### Option 1: Automated E2E Test (Recommended)

```bash
cd /home/admin/restaurant-platform-remote-v2/backend
./run-correlation-test.sh
```

This script will:
- ✅ Check all services are running
- ✅ Verify Playwright installation
- ✅ Clear log files
- ✅ Run Playwright E2E test
- ✅ Analyze backend and desktop logs
- ✅ Generate HTML report

### Option 2: Manual Playwright Test

```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx playwright test tests/correlation-id-e2e.spec.ts --headed --project=chromium
```

Options:
- `--headed`: Run with visible browser (for debugging)
- `--debug`: Run in debug mode with inspector
- `--ui`: Run with Playwright UI mode

### Option 3: Manual API Test

```bash
cd /home/admin/restaurant-platform-remote-v2/backend
./manual-correlation-test.sh
```

This script will:
- Generate a correlation ID
- Send direct API request to backend
- Monitor logs in real-time
- Verify correlation tracking

## Test Validation Checklist

### ✅ Frontend Validation
- [ ] Browser opens to `/settings/printing`
- [ ] "Test Print" button is visible for POS-80C
- [ ] Clicking button triggers network request
- [ ] Console logs show correlation ID
- [ ] Network request contains `X-Correlation-ID` header
- [ ] Response time < 5 seconds

### ✅ Backend Validation
Check `/tmp/backend-debug.log` for:
- [ ] `🆔 [PHYSICAL-TEST] Correlation ID: printer_test_[id]`
- [ ] `✅ [REQ-RES] Resolved request: printer_test_[id]`
- [ ] Response time logged (e.g., `Response time: 234ms`)
- [ ] No errors or exceptions

### ✅ Desktop App Validation
Check `/tmp/printer-debug.log` for:
- [ ] Correlation ID appears in print job
- [ ] All print operations include correlation ID
- [ ] No errors during job processing

### ✅ End-to-End Validation
- [ ] Same correlation ID appears in all three layers
- [ ] Correlation ID format: `printer_test_[a-z0-9]{16}`
- [ ] Each print request has unique correlation ID
- [ ] Multiple print jobs don't share IDs

## Expected Test Output

### Successful Test Run
```
📱 Step 1: Opening browser to printing settings...
✅ Page loaded successfully

📝 Step 2: Looking for Test Print button...
✅ Found Test Print button

🖨️ Step 3: Clicking Test Print button...
⏱️ Response time: 1234ms

🔍 Step 4: Extracting correlation ID from logs...
✅ Found correlation ID: printer_test_a1b2c3d4e5f6g7h8

📋 Step 5: Checking backend logs...
📊 Backend Log Analysis:
  - Correlation ID markers: 3
  - Request resolution markers: 1
✅ Backend correlation ID tracking confirmed

🖥️ Step 6: Checking Desktop App logs...
📊 Desktop App Log Analysis:
  - Correlation ID occurrences: 5
✅ Desktop App correlation ID tracking confirmed

✅ Step 7: Running final assertions...
🎉 All correlation ID E2E tests passed!
```

### Failed Test Indicators
- ❌ Browser timeout (service not running)
- ❌ Test Print button not found (printer not configured)
- ❌ No correlation ID in logs (logging not working)
- ❌ Response time > 5000ms (performance issue)
- ❌ Duplicate correlation IDs (ID generation issue)

## Troubleshooting

### Issue: Backend not accessible
**Solution:**
```bash
# Check if backend is running
curl http://localhost:3001/api/v1/printing/printers
# Should return 401 Unauthorized (auth required)

# Start backend if not running
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev
```

### Issue: Frontend not accessible
**Solution:**
```bash
# Check if frontend is running
curl http://31.57.166.18:3000
# Should return HTML

# Start frontend if not running
cd /home/admin/restaurant-platform-remote-v2/frontend
npm run dev
```

### Issue: No correlation ID in logs
**Solution:**
1. Verify log files are writable:
   ```bash
   ls -la /tmp/backend-debug.log
   ls -la /tmp/printer-debug.log
   ```

2. Check if logging is enabled in code:
   ```bash
   grep -r "🆔 \[PHYSICAL-TEST\]" /home/admin/restaurant-platform-remote-v2/backend/src
   ```

3. Ensure DEBUG environment variable is set:
   ```bash
   export DEBUG=true
   ```

### Issue: Playwright browser crashes
**Solution:**
```bash
# Reinstall Playwright browsers
npx playwright install --force chromium

# Run with debug mode
npx playwright test --debug
```

### Issue: PrinterMaster not receiving jobs
**Solution:**
1. Check PrinterMaster is running:
   ```bash
   curl http://localhost:8182/health
   ```

2. Verify printer configuration:
   ```bash
   curl http://localhost:8182/printers
   ```

3. Check PrinterMaster logs:
   ```bash
   tail -f /tmp/printer-debug.log
   ```

## Test Artifacts

After running tests, the following artifacts are generated:

### HTML Report
```
backend/playwright-report/index.html
```
- Detailed test results with screenshots
- Network requests/responses
- Console logs
- Video recordings (on failure)

### JSON Results
```
backend/test-results/correlation-id-results.json
```
- Machine-readable test results
- Useful for CI/CD integration

### Screenshots
```
backend/test-results/correlation-id-e2e-spec-*/*.png
```
- Captured on test failures
- Useful for debugging UI issues

### Videos
```
backend/test-results/correlation-id-e2e-spec-*/*.webm
```
- Recorded on test failures
- Full replay of test execution

## CI/CD Integration

To run tests in continuous integration:

```yaml
# .github/workflows/correlation-id-test.yml
name: Correlation ID E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd backend && npm install

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Start services
        run: |
          cd backend && npm run start:dev &
          cd frontend && npm run dev &
          sleep 10

      - name: Run E2E tests
        run: cd backend && npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: backend/playwright-report/
```

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Maximum |
|--------|--------|---------|
| Frontend → Backend | < 100ms | 500ms |
| Backend → Desktop App | < 200ms | 1000ms |
| Total print job time | < 1000ms | 5000ms |
| Correlation ID generation | < 1ms | 10ms |
| Log write time | < 5ms | 50ms |

## Security Considerations

1. **Correlation IDs are not sensitive data**
   - Safe to log and expose
   - Used only for tracking, not authentication

2. **Log file permissions**
   - Ensure proper file permissions
   - Consider log rotation for production

3. **Rate limiting**
   - Monitor for correlation ID abuse
   - Implement rate limiting if needed

## Future Enhancements

Potential improvements to the test suite:

1. **Load Testing**
   - Test with 100+ concurrent print jobs
   - Verify correlation ID uniqueness at scale

2. **Error Scenarios**
   - Test correlation tracking during failures
   - Verify correlation ID in error logs

3. **Multi-Printer Testing**
   - Test with multiple printers simultaneously
   - Verify correlation IDs don't collide

4. **Performance Profiling**
   - Measure overhead of correlation tracking
   - Optimize logging if needed

## Contacts

For issues or questions:
- **Developer**: System Administrator
- **Project**: Restaurant Platform v2
- **Location**: `/home/admin/restaurant-platform-remote-v2`

---

*Last Updated: October 7, 2025*
*Test Version: 1.0.0*
*Playwright Version: 1.55.0*
