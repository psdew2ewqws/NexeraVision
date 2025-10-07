#!/bin/bash
# Testing script for merged platform
# Usage: ./04-run-tests.sh

set -e

echo "================================================"
echo "Running Platform Integration Tests"
echo "================================================"

# Configuration
RESTAURANT_DIR="/home/admin/restaurant-platform-remote-v2"
BACKEND_DIR="$RESTAURANT_DIR/backend"
FRONTEND_DIR="$RESTAURANT_DIR/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2

    echo -e "${YELLOW}Running: $test_name${NC}"

    if eval $test_command; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        ((TESTS_FAILED++))
    fi
}

# 1. Database Connection Test
run_test "Database Connection" "psql -U postgres -d postgres -c 'SELECT 1' > /dev/null 2>&1"

# 2. Schema Validation Test
echo "Testing database schema..."
run_test "Integration Tables Exist" "psql -U postgres -d postgres -c \"
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('webhook_configs', 'webhook_logs', 'integrations')
\" | grep -q '3'"

# 3. API Endpoint Tests
echo "Testing API endpoints..."

# Start backend in test mode (if not running)
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "Starting backend server..."
    cd "$BACKEND_DIR"
    npm start > /dev/null 2>&1 &
    BACKEND_PID=$!
    sleep 5
fi

# Test health endpoints
run_test "Business API Health" "curl -s http://localhost:3000/api/health | grep -q 'ok'"
run_test "Integration API Health" "curl -s http://localhost:3000/api/integration/health | grep -q 'ok'"

# 4. Webhook Processing Test
echo "Testing webhook processing..."

# Create test webhook payload
cat > /tmp/test-webhook.json <<EOF
{
  "eventType": "order.created",
  "timestamp": "$(date -Iseconds)",
  "data": {
    "id": "test-order-001",
    "customer": {
      "name": "Test Customer",
      "phone": "+1234567890"
    },
    "items": [
      {"name": "Test Item", "quantity": 1, "price": 10}
    ],
    "total": 10
  }
}
EOF

run_test "Webhook Processing" "curl -s -X POST http://localhost:3000/webhooks/test \
    -H 'Content-Type: application/json' \
    -H 'x-webhook-signature: test' \
    -d @/tmp/test-webhook.json \
    | grep -q 'success'"

# 5. Authentication Tests
echo "Testing authentication..."

# Test JWT authentication
run_test "JWT Authentication" "curl -s http://localhost:3000/api/auth/validate \
    -H 'Authorization: Bearer test-token' \
    | grep -q 'unauthorized'"

# Test API Key authentication
run_test "API Key Authentication" "curl -s http://localhost:3000/api/integration/validate \
    -H 'x-api-key: sk_test_invalid' \
    | grep -q 'unauthorized'"

# 6. Unit Tests (if available)
if [ -f "$BACKEND_DIR/package.json" ] && grep -q '"test"' "$BACKEND_DIR/package.json"; then
    echo "Running unit tests..."
    cd "$BACKEND_DIR"
    run_test "Backend Unit Tests" "npm test 2>/dev/null"
fi

# 7. Integration Tests
echo "Running integration tests..."

# Test order flow
cat > /tmp/test-order-flow.sh <<'EOF'
#!/bin/bash
# Create order
ORDER_ID=$(curl -s -X POST http://localhost:3000/api/orders \
    -H 'Content-Type: application/json' \
    -d '{"customer": "Test", "items": [{"name": "Pizza", "quantity": 1, "price": 20}]}' \
    | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
    exit 1
fi

# Update order status
curl -s -X PATCH http://localhost:3000/api/orders/$ORDER_ID \
    -H 'Content-Type: application/json' \
    -d '{"status": "CONFIRMED"}' \
    | grep -q '"status":"CONFIRMED"'
EOF

chmod +x /tmp/test-order-flow.sh
run_test "Order Flow Integration" "/tmp/test-order-flow.sh"

# 8. Frontend Tests (if available)
if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
    echo "Running frontend tests..."
    cd "$FRONTEND_DIR"

    # Check if frontend can build
    run_test "Frontend Build" "npm run build 2>/dev/null"
fi

# 9. Migration Validation
echo "Validating migration..."

# Check data migration
run_test "Data Migration Check" "psql -U postgres -d postgres -c \"
    SELECT
        (SELECT COUNT(*) FROM integrations) > 0 OR
        (SELECT COUNT(*) FROM webhook_configs) > 0
\" | grep -q 't'"

# 10. Performance Test
echo "Running performance test..."

# Simple load test for webhook endpoint
cat > /tmp/performance-test.sh <<'EOF'
#!/bin/bash
START=$(date +%s%N)
for i in {1..10}; do
    curl -s -X POST http://localhost:3000/webhooks/test \
        -H 'Content-Type: application/json' \
        -d '{"test": true}' > /dev/null 2>&1 &
done
wait
END=$(date +%s%N)
DURATION=$((($END - $START) / 1000000))
# Should complete in under 2 seconds
[ $DURATION -lt 2000 ]
EOF

chmod +x /tmp/performance-test.sh
run_test "Webhook Performance" "/tmp/performance-test.sh"

# Cleanup
echo "Cleaning up..."
rm -f /tmp/test-webhook.json /tmp/test-order-flow.sh /tmp/performance-test.sh

# Stop backend if we started it
if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
fi

# Test Summary
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review and fix before deployment.${NC}"
    exit 1
fi