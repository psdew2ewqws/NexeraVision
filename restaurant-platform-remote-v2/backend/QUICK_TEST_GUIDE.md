# Quick Test Guide - Correlation ID E2E

## 🚀 Quick Start

### 1. One-Command Test
```bash
cd /home/admin/restaurant-platform-remote-v2/backend && ./run-correlation-test.sh
```

### 2. Manual API Test (No Browser)
```bash
cd /home/admin/restaurant-platform-remote-v2/backend && ./manual-correlation-test.sh
```

### 3. Playwright Test Only
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx playwright test tests/correlation-id-e2e.spec.ts --headed
```

## ✅ Prerequisites Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on 31.57.166.18:3000
- [ ] PrinterMaster running on port 8182
- [ ] Playwright installed
- [ ] POS-80C printer configured

## 🔍 Quick Status Check

```bash
# Check all services
curl -s http://localhost:3001/api/v1/printing/printers 2>&1 | grep -q "Unauthorized" && echo "✅ Backend OK" || echo "❌ Backend DOWN"
curl -s http://31.57.166.18:3000 | grep -q "DOCTYPE" && echo "✅ Frontend OK" || echo "❌ Frontend DOWN"
curl -s http://localhost:8182/health | grep -q "healthy" && echo "✅ PrinterMaster OK" || echo "❌ PrinterMaster DOWN"
```

## 📊 View Test Results

### After test completion:
```bash
# View HTML report
xdg-open backend/playwright-report/index.html

# View backend logs
grep "🆔 \[PHYSICAL-TEST\]" /tmp/backend-debug.log

# View desktop logs
grep "printer_test_" /tmp/printer-debug.log
```

## 🐛 Quick Troubleshooting

### Backend not responding?
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev
```

### Frontend not accessible?
```bash
cd /home/admin/restaurant-platform-remote-v2/frontend
npm run dev
```

### Playwright not installed?
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npm install -D @playwright/test
npx playwright install chromium
```

## 📋 What to Expect

✅ **Successful test output:**
```
✅ All Tests Passed!
📊 Backend correlation tracking: 3 entries
📊 Desktop correlation tracking: 5 entries
⏱️  Response time: <5000ms
```

❌ **Failed test indicators:**
```
❌ Test Print button not found
❌ No correlation ID in logs
❌ Response timeout
```

## 📞 Need Help?

See full documentation: `CORRELATION_ID_E2E_TEST_GUIDE.md`
