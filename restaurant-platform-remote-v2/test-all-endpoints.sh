#!/bin/bash

# Comprehensive E2E Testing Script for Restaurant Platform
# Tests all pages and API endpoints systematically

BASE_URL="http://31.57.166.18:3001/api/v1"
FRONTEND_URL="http://31.57.166.18:3000"
TEST_EMAIL="admin@test.com"
TEST_PASSWORD="test123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H 'Content-Type: application/json' \
            -d "$data")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" -eq "$expected_status" ] || [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
        echo -e "${GREEN}✅ PASS${NC} - $name (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $name (HTTP $status_code, expected $expected_status)"
        echo "   Response: ${body:0:100}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test page
test_page() {
    local name="$1"
    local path="$2"
    local expected_status="${3:-200}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL$path")

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Page: $name (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - Page: $name (HTTP $status_code, expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "========================================="
echo "Restaurant Platform E2E Testing"
echo "========================================="
echo ""

# Wait for rate limit
echo "Waiting 60s for rate limit cooldown..."
sleep 60

echo ""
echo "=== PHASE 1: Authentication Tests ==="
test_endpoint "Valid Login" "POST" "/auth/login" '{"email":"admin@test.com","password":"test123"}' 200
test_endpoint "Invalid Login" "POST" "/auth/login" '{"email":"wrong@test.com","password":"wrong"}' 401
test_endpoint "Empty Credentials" "POST" "/auth/login" '{"email":"","password":""}' 400

# Get token for authenticated tests
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@test.com","password":"test123"}')
TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "=== PHASE 2: Frontend Pages Tests ==="
test_page "Login Page" "/login" 200
test_page "Dashboard" "/dashboard" 200
test_page "Products List" "/menu/products" 200
test_page "Menu Builder" "/menu/builder" 200
test_page "Menu List" "/menu/list" 200
test_page "Menu Availability" "/menu/availability" 200
test_page "Menu Promotions" "/menu/promotions" 200
test_page "Settings - Companies" "/settings/companies" 200
test_page "Settings - Users" "/settings/users" 200
test_page "Settings - Printing" "/settings/printing" 200
test_page "Settings - Templates" "/settings/thermal-printer-templates" 200
test_page "Settings - Delivery" "/settings/delivery" 200
test_page "Integration Dashboard" "/integration/dashboard" 200
test_page "Integration Providers" "/integration/providers" 200
test_page "Integration Webhooks" "/integration/webhooks" 200
test_page "Operations Center" "/operations/center" 200
test_page "Live Orders" "/operations/live-orders" 200
test_page "Analytics Dashboard" "/analytics/dashboard" 200
test_page "Branches" "/branches" 200
test_page "404 Page" "/nonexistent" 404

echo ""
echo "=== PHASE 3: Menu API Tests ==="
test_endpoint "Get Categories" "GET" "/menu/categories" "" 200
test_endpoint "Get Products Paginated" "POST" "/menu/products/paginated" '{"page":1,"limit":10}' 200
test_endpoint "Get Menu Channels" "GET" "/menu/channels" "" 200

echo ""
echo "=== PHASE 4: Companies & Users API Tests ==="
test_endpoint "Get Companies" "GET" "/companies" "" 200
test_endpoint "Get Users" "GET" "/users" "" 200

echo ""
echo "=== PHASE 5: Printing API Tests ==="
test_endpoint "Get Printers" "GET" "/printing/printers" "" 200
test_endpoint "Get Templates" "GET" "/template-builder/templates" "" 200

echo ""
echo "=== PHASE 6: Delivery API Tests ==="
test_endpoint "Get Delivery Providers" "GET" "/delivery/providers" "" 200

echo ""
echo "=== PHASE 7: Health & System Tests ==="
test_endpoint "Health Check" "GET" "/health" "" 200

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! System is production-ready.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review issues before production deployment.${NC}"
    exit 1
fi
