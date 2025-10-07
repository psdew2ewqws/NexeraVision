#!/bin/bash

# Manual Correlation ID Test Script
# This script tests the correlation ID system without Playwright

echo "🔍 Manual Correlation ID System Test"
echo "======================================"
echo ""

# Clear logs
echo "📋 Clearing log files..."
> /tmp/backend-debug.log
> /tmp/printer-debug.log
echo "✅ Logs cleared"
echo ""

# Generate correlation ID
CORRELATION_ID="printer_test_$(openssl rand -hex 8)"
echo "🆔 Generated Correlation ID: $CORRELATION_ID"
echo ""

# Start monitoring backend logs in background
echo "📡 Starting log monitors..."
tail -f /tmp/backend-debug.log | grep --line-buffered "$CORRELATION_ID" &
BACKEND_TAIL_PID=$!

tail -f /tmp/printer-debug.log | grep --line-buffered "$CORRELATION_ID" &
DESKTOP_TAIL_PID=$!

sleep 1

echo "✅ Log monitors running (PIDs: $BACKEND_TAIL_PID, $DESKTOP_TAIL_PID)"
echo ""

# Get auth token from environment or prompt
if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠️  No AUTH_TOKEN environment variable set"
    echo "Please login to http://31.57.166.18:3000 and get your token from:"
    echo "  - Browser DevTools → Application → Local Storage → authToken"
    echo ""
    read -p "Enter auth token: " AUTH_TOKEN
fi

echo ""
echo "🖨️ Sending test print request to backend..."
echo "-------------------------------------------"

# Send print request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:3001/api/v1/printing/printers/POS-80C/test \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Correlation-ID: $CORRELATION_ID" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
    echo "✅ Print request sent successfully"
else
    echo "❌ Print request failed"
fi

echo ""
echo "⏳ Waiting for logs to populate (5 seconds)..."
sleep 5

# Kill log monitors
kill $BACKEND_TAIL_PID $DESKTOP_TAIL_PID 2>/dev/null

echo ""
echo "📊 Backend Log Analysis"
echo "----------------------"

BACKEND_CORRELATION_LINES=$(grep "$CORRELATION_ID" /tmp/backend-debug.log | wc -l)
echo "Correlation ID occurrences: $BACKEND_CORRELATION_LINES"

if [ $BACKEND_CORRELATION_LINES -gt 0 ]; then
    echo "✅ Backend correlation tracking active"
    echo ""
    echo "Sample logs:"
    grep "$CORRELATION_ID" /tmp/backend-debug.log | head -n 10
else
    echo "⚠️  No backend correlation tracking found"
fi

echo ""
echo "📊 Desktop App Log Analysis"
echo "--------------------------"

DESKTOP_CORRELATION_LINES=$(grep "$CORRELATION_ID" /tmp/printer-debug.log | wc -l)
echo "Correlation ID occurrences: $DESKTOP_CORRELATION_LINES"

if [ $DESKTOP_CORRELATION_LINES -gt 0 ]; then
    echo "✅ Desktop app correlation tracking active"
    echo ""
    echo "Sample logs:"
    grep "$CORRELATION_ID" /tmp/printer-debug.log | head -n 10
else
    echo "⚠️  No desktop app correlation tracking found"
fi

echo ""
echo "======================================"
echo "🏁 Manual Test Complete"
echo "======================================"
