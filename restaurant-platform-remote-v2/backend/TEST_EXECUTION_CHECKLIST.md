# Phase 4-6: Test Execution Checklist

## Pre-Execution Checklist

### ✅ Environment Setup

- [ ] **Backend Service Running**
  ```bash
  curl http://localhost:3001/api/v1/printing/printers
  # Expected: 401 Unauthorized (service is up, auth required)
  ```

- [ ] **Frontend Service Running**
  ```bash
  curl http://31.57.166.18:3000
  # Expected: HTML content with <!DOCTYPE>
  ```

- [ ] **PrinterMaster Service Running**
  ```bash
  curl http://localhost:8182/health
  # Expected: {"status":"healthy",...}
  ```

### ✅ Tool Installation

- [ ] **Playwright Installed**
  ```bash
  cd /home/admin/restaurant-platform-remote-v2/backend
  npx playwright --version
  # Expected: Version 1.55.0 (or similar)
  ```

- [ ] **Chromium Browser Installed**
  ```bash
  npx playwright install chromium
  # Should complete without errors
  ```

### ✅ Log File Setup

- [ ] **Backend Log File**
  ```bash
  touch /tmp/backend-debug.log
  chmod 666 /tmp/backend-debug.log
  ls -la /tmp/backend-debug.log
  # Should be writable by all users
  ```

- [ ] **Desktop Log File**
  ```bash
  touch /tmp/printer-debug.log
  chmod 666 /tmp/printer-debug.log
  ls -la /tmp/printer-debug.log
  # Should be writable by all users
  ```

### ✅ Printer Configuration

- [ ] **POS-80C Printer Exists**
  ```bash
  psql -U postgres -d postgres -c "SELECT * FROM \"PrinterConfiguration\" WHERE name = 'POS-80C';"
  # Should return at least one row
  ```

- [ ] **Printer Visible in Frontend**
  - Navigate to http://31.57.166.18:3000/settings/printing
  - Verify POS-80C printer card is visible
  - Verify "Test Print" button exists and is enabled

### ✅ Test Files Present

- [ ] **E2E Test File**
  ```bash
  ls -la /home/admin/restaurant-platform-remote-v2/backend/tests/correlation-id-e2e.spec.ts
  # Should exist, ~11KB
  ```

- [ ] **Playwright Config**
  ```bash
  ls -la /home/admin/restaurant-platform-remote-v2/backend/playwright.config.ts
  # Should exist
  ```

- [ ] **Test Runner Scripts**
  ```bash
  ls -la /home/admin/restaurant-platform-remote-v2/backend/*.sh
  # Should show: run-correlation-test.sh, manual-correlation-test.sh (executable)
  ```

## Execution Checklist

### ✅ Running the Automated Test

1. **Navigate to Backend Directory**
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/backend
   ```

2. **Execute Test Runner**
   ```bash
   ./run-correlation-test.sh
   ```

3. **Watch for Pre-Flight Checks**
   - [ ] Backend health check passes
   - [ ] Frontend health check passes
   - [ ] PrinterMaster health check passes (optional but recommended)
   - [ ] Playwright installation verified
   - [ ] Log files ready

4. **Observe Browser Launch**
   - [ ] Chromium browser opens (visible window)
   - [ ] Browser navigates to `/settings/printing`
   - [ ] Page loads completely
   - [ ] Printer cards visible

5. **Monitor Test Execution**
   - [ ] Test Print button located
   - [ ] Button clicked successfully
   - [ ] Console logs appear in terminal
   - [ ] Network requests logged
   - [ ] Response received

6. **Verify Log Analysis**
   - [ ] Backend log shows correlation ID markers
   - [ ] Desktop log shows correlation ID (if PrinterMaster running)
   - [ ] Response time < 5000ms
   - [ ] No errors in logs

7. **Check Test Results**
   - [ ] Test passes (green checkmarks)
   - [ ] HTML report generated
   - [ ] All assertions pass

## Post-Execution Verification

### ✅ Test Artifacts

- [ ] **HTML Report Exists**
  ```bash
  ls -la /home/admin/restaurant-platform-remote-v2/backend/playwright-report/index.html
  # Should exist after test run
  ```

- [ ] **JSON Results Exist**
  ```bash
  ls -la /home/admin/restaurant-platform-remote-v2/backend/test-results/correlation-id-results.json
  # Should exist after test run
  ```

- [ ] **Screenshots (if test failed)**
  ```bash
  ls -la /home/admin/restaurant-platform-remote-v2/backend/test-results/
  # May contain screenshots if test failed
  ```

### ✅ Log File Validation

- [ ] **Backend Log Contains Correlation ID**
  ```bash
  grep "🆔 \[PHYSICAL-TEST\]" /tmp/backend-debug.log
  # Should show correlation ID entries
  ```

- [ ] **Backend Log Contains Resolution**
  ```bash
  grep "✅ \[REQ-RES\]" /tmp/backend-debug.log
  # Should show request resolution entries
  ```

- [ ] **Desktop Log Contains Correlation ID** (if PrinterMaster running)
  ```bash
  grep "printer_test_" /tmp/printer-debug.log
  # Should show correlation ID entries
  ```

### ✅ Correlation ID Validation

- [ ] **Correct Format**
  - Pattern: `printer_test_[a-z0-9]{16}`
  - Example: `printer_test_a1b2c3d4e5f6g7h8`

- [ ] **Uniqueness**
  - Each test run generates a new correlation ID
  - No duplicate IDs across multiple test runs

- [ ] **Cross-Layer Consistency**
  - Same correlation ID appears in:
    - Browser console
    - Network request header
    - Backend logs
    - Desktop app logs (if running)

## Success Criteria

### ✅ All Tests Must Pass

- [ ] Browser test completes without errors
- [ ] Correlation ID extracted successfully
- [ ] Backend logs contain correlation tracking
- [ ] Desktop logs contain correlation tracking (if applicable)
- [ ] Response time < 5000ms
- [ ] All Playwright assertions pass
- [ ] HTML report shows green checkmarks

### ✅ Performance Benchmarks

- [ ] Frontend → Backend: < 500ms
- [ ] Backend → Desktop: < 1000ms
- [ ] Total response time: < 5000ms
- [ ] No timeouts or hanging requests

### ✅ Quality Checks

- [ ] No errors in console logs
- [ ] No HTTP errors (500, 404, etc.)
- [ ] No TypeScript compilation errors
- [ ] No Playwright test failures

## Troubleshooting Checklist

### ❌ If Backend Health Check Fails

- [ ] Check if backend process is running:
  ```bash
  ps aux | grep "node.*backend\|nest"
  ```

- [ ] Start backend if needed:
  ```bash
  cd /home/admin/restaurant-platform-remote-v2/backend
  npm run start:dev
  ```

- [ ] Check backend logs for errors:
  ```bash
  pm2 logs restaurant-backend
  ```

### ❌ If Frontend Health Check Fails

- [ ] Check if frontend process is running:
  ```bash
  ps aux | grep "next\|npm.*dev"
  ```

- [ ] Start frontend if needed:
  ```bash
  cd /home/admin/restaurant-platform-remote-v2/frontend
  npm run dev
  ```

- [ ] Verify port 3000 is accessible:
  ```bash
  netstat -tuln | grep 3000
  ```

### ❌ If PrinterMaster Health Check Fails

- [ ] Check if PrinterMaster is running:
  ```bash
  ps aux | grep "PrinterMaster\|electron"
  ```

- [ ] Start PrinterMaster if needed:
  ```bash
  cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop
  npm run start
  ```

- [ ] Note: PrinterMaster is optional for correlation ID testing

### ❌ If Test Print Button Not Found

- [ ] Verify printer exists in database:
  ```bash
  psql -U postgres -d postgres -c "SELECT * FROM \"PrinterConfiguration\";"
  ```

- [ ] Check frontend printer list:
  - Open http://31.57.166.18:3000/settings/printing in browser
  - Verify POS-80C is listed
  - Check if button is disabled or hidden

- [ ] Verify authentication:
  - Ensure user is logged in
  - Check browser console for auth errors

### ❌ If No Correlation ID in Logs

- [ ] Verify log files are writable:
  ```bash
  echo "test" >> /tmp/backend-debug.log
  echo "test" >> /tmp/printer-debug.log
  ```

- [ ] Check if logging code exists:
  ```bash
  grep -r "🆔 \[PHYSICAL-TEST\]" /home/admin/restaurant-platform-remote-v2/backend/src
  ```

- [ ] Ensure logs are being written:
  ```bash
  tail -f /tmp/backend-debug.log &
  # Then trigger a test print
  ```

### ❌ If Playwright Crashes

- [ ] Reinstall Playwright browsers:
  ```bash
  npx playwright install --force chromium
  ```

- [ ] Run with debug mode:
  ```bash
  npx playwright test --debug tests/correlation-id-e2e.spec.ts
  ```

- [ ] Check system resources:
  ```bash
  free -h
  df -h
  ```

## Final Validation

### ✅ Phase 4-6 Complete When:

- [ ] Automated test runs successfully
- [ ] All pre-flight checks pass
- [ ] Browser launches and navigates correctly
- [ ] Test Print button found and clicked
- [ ] Correlation ID generated and tracked
- [ ] Backend logs show correlation tracking
- [ ] Desktop logs show correlation tracking (if applicable)
- [ ] Response times within acceptable range
- [ ] HTML report generated with passing tests
- [ ] Documentation complete and accurate
- [ ] No errors or warnings in any layer

## Sign-Off

- **Date Executed**: _________________
- **Executed By**: _________________
- **Test Result**: ☐ PASS  ☐ FAIL
- **Notes**: _________________

---

*Use this checklist to ensure Phase 4-6 correlation ID testing is complete and validated.*
