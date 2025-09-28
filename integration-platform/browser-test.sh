#!/bin/bash

echo "🚀 COMPREHENSIVE INTEGRATION PLATFORM TEST"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_page() {
    local name=$1
    local url=$2
    echo -n "Testing $name page... "

    # Use curl to test the page
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} (HTTP $response)"

        # Take screenshot using Firefox
        timeout 10 firefox --headless --screenshot="/tmp/test-${name}.png" "$url" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  Screenshot saved: /tmp/test-${name}.png"
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $response)"
    fi
    echo ""
}

# Test backend API
echo "📡 Testing Backend API..."
response=$(curl -s -X POST http://localhost:3002/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"admin123"}' | head -c 100)

if [[ "$response" == *"token"* ]] || [[ "$response" == *"access_token"* ]]; then
    echo -e "${GREEN}✅ Backend API working${NC}"
else
    echo -e "${YELLOW}⚠️ Backend API may have issues${NC}"
fi
echo ""

# Test Frontend Pages
echo "🖥️ Testing Frontend Pages..."
echo "----------------------------"
test_page "login" "http://localhost:3003/login"
test_page "menu" "http://localhost:3003/menu"
test_page "orders" "http://localhost:3003/orders"
test_page "dashboard" "http://localhost:3003/dashboard"
test_page "integrations" "http://localhost:3003/integrations"

echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="

# Count screenshots
screenshot_count=$(ls -1 /tmp/test-*.png 2>/dev/null | wc -l)
echo "Screenshots captured: $screenshot_count"
echo ""

# Display screenshots if they exist
if [ $screenshot_count -gt 0 ]; then
    echo "Screenshots saved to:"
    ls -la /tmp/test-*.png
fi

echo ""
echo "Test complete!"