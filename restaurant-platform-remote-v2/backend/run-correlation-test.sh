#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 4-6: Correlation ID E2E Test Runner${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Set working directory
cd /home/admin/restaurant-platform-remote-v2/backend

# Pre-test checks
echo -e "${YELLOW}📋 Pre-Test Checks${NC}"
echo "---------------------------------------------------"

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running (port 3001)${NC}"
else
    echo -e "${RED}❌ Backend is NOT running on port 3001${NC}"
    echo -e "${YELLOW}   Start with: cd backend && npm run start:dev${NC}"
    exit 1
fi

# Check if frontend is accessible
if curl -s http://31.57.166.18:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible (31.57.166.18:3000)${NC}"
else
    echo -e "${RED}❌ Frontend is NOT accessible${NC}"
    echo -e "${YELLOW}   Start with: cd frontend && npm run dev${NC}"
    exit 1
fi

# Check if PrinterMaster is running
if curl -s http://localhost:8182/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PrinterMaster is running (port 8182)${NC}"
else
    echo -e "${YELLOW}⚠️  PrinterMaster may not be running (port 8182)${NC}"
    echo -e "${YELLOW}   This is optional but recommended for full E2E test${NC}"
fi

# Check Playwright installation
if npx playwright --version > /dev/null 2>&1; then
    PLAYWRIGHT_VERSION=$(npx playwright --version)
    echo -e "${GREEN}✅ Playwright installed: ${PLAYWRIGHT_VERSION}${NC}"
else
    echo -e "${RED}❌ Playwright is NOT installed${NC}"
    echo -e "${YELLOW}   Install with: npm install -D @playwright/test${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📂 Log File Setup${NC}"
echo "---------------------------------------------------"

# Ensure log directories exist
mkdir -p /tmp
touch /tmp/backend-debug.log
touch /tmp/printer-debug.log

echo -e "${GREEN}✅ Log files ready:${NC}"
echo "   - Backend: /tmp/backend-debug.log"
echo "   - Desktop: /tmp/printer-debug.log"

echo ""
echo -e "${YELLOW}🧪 Running Playwright E2E Tests${NC}"
echo "---------------------------------------------------"

# Install Playwright browsers if needed
if [ ! -d ~/.cache/ms-playwright ]; then
    echo -e "${YELLOW}Installing Playwright browsers...${NC}"
    npx playwright install chromium
fi

# Run the test
echo -e "${BLUE}Starting test execution...${NC}"
echo ""

npx playwright test tests/correlation-id-e2e.spec.ts \
    --reporter=list \
    --headed \
    --project=chromium

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All Tests Passed!${NC}"
else
    echo -e "${RED}❌ Tests Failed with exit code: $TEST_EXIT_CODE${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Post-test analysis
echo -e "${YELLOW}📊 Post-Test Log Analysis${NC}"
echo "---------------------------------------------------"

# Analyze backend logs
if [ -f /tmp/backend-debug.log ]; then
    BACKEND_CORRELATION_COUNT=$(grep -c "🆔 \[PHYSICAL-TEST\] Correlation ID:" /tmp/backend-debug.log 2>/dev/null || echo "0")
    BACKEND_RESOLUTION_COUNT=$(grep -c "✅ \[REQ-RES\] Resolved request:" /tmp/backend-debug.log 2>/dev/null || echo "0")

    echo -e "${BLUE}Backend Log Summary:${NC}"
    echo "  - Correlation ID entries: $BACKEND_CORRELATION_COUNT"
    echo "  - Request resolutions: $BACKEND_RESOLUTION_COUNT"

    if [ $BACKEND_CORRELATION_COUNT -gt 0 ]; then
        echo -e "${GREEN}  ✅ Backend correlation tracking verified${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No backend correlation tracking found${NC}"
    fi
fi

echo ""

# Analyze desktop logs
if [ -f /tmp/printer-debug.log ]; then
    DESKTOP_LOG_SIZE=$(wc -l < /tmp/printer-debug.log)

    echo -e "${BLUE}Desktop App Log Summary:${NC}"
    echo "  - Total log lines: $DESKTOP_LOG_SIZE"

    if [ $DESKTOP_LOG_SIZE -gt 0 ]; then
        echo -e "${GREEN}  ✅ Desktop app logging active${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Desktop app logs empty${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📁 Test Artifacts${NC}"
echo "---------------------------------------------------"
echo "  - HTML Report: backend/playwright-report/index.html"
echo "  - JSON Results: backend/test-results/correlation-id-results.json"
echo "  - Screenshots: backend/test-results/"
echo "  - Videos: backend/test-results/"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Execution Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Open HTML report if test passed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}Would you like to open the HTML report? (y/n)${NC}"
    read -r -n 1 OPEN_REPORT
    echo ""

    if [ "$OPEN_REPORT" = "y" ] || [ "$OPEN_REPORT" = "Y" ]; then
        if [ -f backend/playwright-report/index.html ]; then
            xdg-open backend/playwright-report/index.html 2>/dev/null || \
            open backend/playwright-report/index.html 2>/dev/null || \
            echo "Please open: backend/playwright-report/index.html"
        fi
    fi
fi

exit $TEST_EXIT_CODE
