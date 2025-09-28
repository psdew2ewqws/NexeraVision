#!/bin/bash

# ================================================================
# Talabat End-to-End Integration Test Script
# ================================================================
#
# This script performs a comprehensive end-to-end test of the
# Talabat integration flow:
# Talabat webhook → NEXARA (3002) → Restaurant Platform (3001)
#
# Using realistic test data from UAT companies
# ================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NEXARA_BASE_URL="http://localhost:3002"
RESTAURANT_API_URL="http://localhost:3001"
TEST_RESULTS_DIR="/home/admin/integration-platform/claudedocs"
TEST_LOG_FILE="$TEST_RESULTS_DIR/talabat-e2e-test-$(date +%Y%m%d_%H%M%S).log"

# Real test data from UAT database
COMPANY_ID="366dc373-6ac1-4b6c-8328-6f166893fe19"
BRANCH_ID="f97ceb38-c797-4d1c-9ff4-89d9f8da5235"
COMPANY_NAME="Test Restaurant Chain"

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

# Function to check service health
check_service() {
    local service_name="$1"
    local service_url="$2"
    local health_endpoint="$3"

    print_step "Checking $service_name service..."

    if curl -s --connect-timeout 5 "$service_url$health_endpoint" > /dev/null; then
        print_success "$service_name is running on $service_url"
        return 0
    else
        print_error "$service_name is not accessible at $service_url"
        return 1
    fi
}

# Function to send test webhook
send_talabat_webhook() {
    local order_data="$1"
    local test_name="$2"

    print_step "Sending Talabat webhook: $test_name"

    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$NEXARA_BASE_URL/api/webhooks/talabat" \
        -H "Content-Type: application/json" \
        -H "User-Agent: TalabatWebhook/1.0" \
        -H "X-Talabat-Signature: test-signature" \
        -d "$order_data")

    local http_status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    local response_body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

    echo "Response Status: $http_status" >> "$TEST_LOG_FILE"
    echo "Response Body: $response_body" >> "$TEST_LOG_FILE"

    if [ "$http_status" -eq 200 ]; then
        print_success "Webhook sent successfully - HTTP $http_status"
        echo "$response_body"
        return 0
    else
        print_error "Webhook failed - HTTP $http_status"
        echo "$response_body"
        return 1
    fi
}

# Function to check NEXARA statistics
check_nexara_stats() {
    print_step "Checking NEXARA statistics..."

    local response=$(curl -s "$NEXARA_BASE_URL/api/webhooks/talabat/stats")

    if [ $? -eq 0 ]; then
        print_success "Statistics retrieved successfully"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        echo "$response" >> "$TEST_LOG_FILE"
    else
        print_error "Failed to retrieve statistics"
    fi
}

# Function to check NEXARA logs
check_nexara_logs() {
    print_step "Checking NEXARA recent logs..."

    local response=$(curl -s "$NEXARA_BASE_URL/api/webhooks/talabat/logs?limit=5")

    if [ $? -eq 0 ]; then
        print_success "Logs retrieved successfully"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        echo "$response" >> "$TEST_LOG_FILE"
    else
        print_error "Failed to retrieve logs"
    fi
}

# Function to verify order in restaurant platform
verify_restaurant_order() {
    local order_id="$1"

    print_step "Verifying order was received by Restaurant Platform..."

    # Note: This would require authentication, so we'll just check the health
    local response=$(curl -s "$RESTAURANT_API_URL/api/health" 2>/dev/null || echo "failed")

    if [ "$response" != "failed" ]; then
        print_success "Restaurant Platform is accessible"
        print_info "Manual verification needed: Check Restaurant Platform logs for order $order_id"
    else
        print_warning "Restaurant Platform not accessible for verification"
    fi
}

# Generate realistic Talabat order with Jordan data
generate_talabat_order() {
    local order_id="TLB_$(date +%s)"
    local customer_phone="+962791234567"  # Jordan mobile number

    cat << EOF
{
    "id": "$order_id",
    "orderId": "$order_id",
    "orderNumber": "$(date +%s)",
    "status": "confirmed",
    "orderType": "delivery",
    "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "customer": {
        "name": "أحمد العلي",
        "phone": "$customer_phone",
        "email": "ahmed.ali@example.jo",
        "address": {
            "street": "شارع الملك عبدالله الثاني",
            "building": "مبنى رقم 15",
            "floor": "الطابق الثالث",
            "apartment": "شقة 7",
            "area": "عبدون",
            "city": "عمان",
            "country": "Jordan",
            "latitude": 31.9539,
            "longitude": 35.9106,
            "notes": "بجانب مسجد عبدون"
        }
    },
    "restaurant": {
        "id": "$COMPANY_ID",
        "name": "$COMPANY_NAME",
        "branchId": "$BRANCH_ID"
    },
    "items": [
        {
            "id": "hummus-product-uuid",
            "name": "حمص مع خبز البيتا",
            "nameEn": "Hummus with Pita",
            "sku": "hummus-product-uuid",
            "quantity": 2,
            "price": 4.50,
            "totalPrice": 9.00,
            "category": "مقبلات",
            "categoryEn": "Appetizers",
            "notes": "بدون ثوم"
        },
        {
            "id": "shawarma-product-uuid",
            "name": "شاورما دجاج مشوي",
            "nameEn": "Grilled Chicken Shawarma",
            "sku": "shawarma-product-uuid",
            "quantity": 1,
            "price": 8.50,
            "totalPrice": 8.50,
            "category": "الطبق الرئيسي",
            "categoryEn": "Main Course",
            "modifiers": [
                {
                    "id": "extra-garlic",
                    "name": "ثوم إضافي",
                    "nameEn": "Extra Garlic",
                    "price": 0.50
                }
            ],
            "notes": "مشوي جيداً"
        }
    ],
    "delivery": {
        "fee": 2.00,
        "estimatedTime": "35-45 دقيقة",
        "instructions": "الرجاء الاتصال عند الوصول",
        "latitude": 31.9539,
        "longitude": 35.9106
    },
    "payment": {
        "method": "cash",
        "status": "pending",
        "amount": 20.50,
        "currency": "JOD"
    },
    "subtotal": 18.00,
    "deliveryFee": 2.00,
    "tax": 0.50,
    "discount": 0.00,
    "serviceCharge": 0.00,
    "total": 20.50,
    "currency": "JOD",
    "branchId": "$BRANCH_ID",
    "companyId": "$COMPANY_ID",
    "estimatedDeliveryTime": "$(date -u -d '+45 minutes' +%Y-%m-%dT%H:%M:%S.000Z)",
    "notes": "طلب عاجل - عميل مهم",
    "metadata": {
        "talabatOrderRef": "TLB_REF_$(date +%s)",
        "platformFee": 1.00,
        "restaurantId": "$COMPANY_ID",
        "branchCode": "MAIN_001"
    }
}
EOF
}

# Generate status update payload
generate_status_update() {
    local order_id="$1"

    cat << EOF
{
    "eventType": "status_update",
    "orderId": "$order_id",
    "oldStatus": "confirmed",
    "newStatus": "preparing",
    "status": "preparing",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "reason": "تم البدء في تحضير الطلب",
    "reasonEn": "Order preparation started",
    "estimatedDeliveryTime": "$(date -u -d '+40 minutes' +%Y-%m-%dT%H:%M:%S.000Z)",
    "companyId": "$COMPANY_ID",
    "branchId": "$BRANCH_ID"
}
EOF
}

# Main test execution
main() {
    echo "================================================================" | tee "$TEST_LOG_FILE"
    echo "Talabat End-to-End Integration Test" | tee -a "$TEST_LOG_FILE"
    echo "Started: $(date)" | tee -a "$TEST_LOG_FILE"
    echo "================================================================" | tee -a "$TEST_LOG_FILE"

    # Step 1: Check service health
    print_step "Phase 1: Service Health Checks"

    if ! check_service "NEXARA" "$NEXARA_BASE_URL" "/api/health"; then
        print_error "NEXARA service is not running. Please start it first."
        exit 1
    fi

    check_service "Restaurant Platform" "$RESTAURANT_API_URL" "/api/health" || \
        print_warning "Restaurant Platform not accessible - will skip verification"

    echo ""

    # Step 2: Test webhook processing
    print_step "Phase 2: Webhook Processing Tests"

    # Generate and send new order
    ORDER_PAYLOAD=$(generate_talabat_order)
    ORDER_ID=$(echo "$ORDER_PAYLOAD" | jq -r '.id')

    print_info "Generated order ID: $ORDER_ID"
    print_info "Company: $COMPANY_NAME ($COMPANY_ID)"
    print_info "Branch: Main Branch ($BRANCH_ID)"

    echo "Order Payload:" >> "$TEST_LOG_FILE"
    echo "$ORDER_PAYLOAD" | jq '.' >> "$TEST_LOG_FILE" 2>/dev/null || echo "$ORDER_PAYLOAD" >> "$TEST_LOG_FILE"

    if send_talabat_webhook "$ORDER_PAYLOAD" "New Order"; then
        print_success "Order webhook processed successfully"

        # Wait a moment for processing
        sleep 2

        # Test status update
        STATUS_UPDATE_PAYLOAD=$(generate_status_update "$ORDER_ID")

        echo "Status Update Payload:" >> "$TEST_LOG_FILE"
        echo "$STATUS_UPDATE_PAYLOAD" | jq '.' >> "$TEST_LOG_FILE" 2>/dev/null || echo "$STATUS_UPDATE_PAYLOAD" >> "$TEST_LOG_FILE"

        if send_talabat_webhook "$STATUS_UPDATE_PAYLOAD" "Status Update"; then
            print_success "Status update webhook processed successfully"
        else
            print_error "Status update webhook failed"
        fi
    else
        print_error "Order webhook failed"
    fi

    echo ""

    # Step 3: Check integration statistics
    print_step "Phase 3: Integration Statistics and Logs"

    check_nexara_stats
    echo ""

    check_nexara_logs
    echo ""

    # Step 4: Verify order forwarding
    print_step "Phase 4: Order Forwarding Verification"

    verify_restaurant_order "$ORDER_ID"

    echo ""

    # Step 5: Test error handling
    print_step "Phase 5: Error Handling Tests"

    # Test invalid payload
    INVALID_PAYLOAD='{"invalid": "payload", "missing": "required_fields"}'

    if send_talabat_webhook "$INVALID_PAYLOAD" "Invalid Payload Test"; then
        print_warning "Invalid payload was accepted (unexpected)"
    else
        print_success "Invalid payload was properly rejected"
    fi

    echo ""

    # Final summary
    echo "================================================================" | tee -a "$TEST_LOG_FILE"
    echo "Test Summary" | tee -a "$TEST_LOG_FILE"
    echo "================================================================" | tee -a "$TEST_LOG_FILE"
    print_success "End-to-end test completed"
    print_info "Test results saved to: $TEST_LOG_FILE"
    print_info "Order ID tested: $ORDER_ID"
    print_info "Company: $COMPANY_NAME"
    print_info "Next steps:"
    echo "  1. Check NEXARA logs for order processing details"
    echo "  2. Verify order was received in Restaurant Platform backend"
    echo "  3. Check printing system for receipt generation"
    echo "  4. Monitor delivery integration if configured"

    echo ""
    print_info "Manual verification commands:"
    echo "  - NEXARA logs: curl $NEXARA_BASE_URL/api/webhooks/talabat/logs"
    echo "  - NEXARA stats: curl $NEXARA_BASE_URL/api/webhooks/talabat/stats"
    echo "  - Restaurant health: curl $RESTAURANT_API_URL/api/health"

    echo "Completed: $(date)" | tee -a "$TEST_LOG_FILE"
}

# Check if required tools are available
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed - JSON output will not be formatted"
fi

# Run the main test
main "$@"

# End of script