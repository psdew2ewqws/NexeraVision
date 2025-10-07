#!/bin/bash
# Quick verification script to confirm all API URL fixes

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          API FIX VERIFICATION SCRIPT                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd /home/admin/restaurant-platform-remote-v2/frontend

echo "Running verification checks..."
echo ""

# Check 1: Hardcoded /api/v1 URLs
HARDCODED=$(grep -r "localhost:3001/api/v1" pages/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "1. Hardcoded /api/v1 URLs: $HARDCODED"
if [ "$HARDCODED" -eq 0 ]; then
    echo "   ✅ PASS - No hardcoded URLs found"
else
    echo "   ❌ FAIL - Found $HARDCODED hardcoded URLs"
fi
echo ""

# Check 2: Doubled /api/v1 patterns
DOUBLED=$(grep -r "'http://localhost:3001/api/v1'" pages/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "2. Doubled /api/v1 patterns: $DOUBLED"
if [ "$DOUBLED" -eq 0 ]; then
    echo "   ✅ PASS - No doubled patterns found"
else
    echo "   ❌ FAIL - Found $DOUBLED doubled patterns"
fi
echo ""

# Check 3: apiCall with absolute URLs
APICALL=$(grep -r "apiCall.*http://localhost" pages/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "3. apiCall with absolute URLs: $APICALL"
if [ "$APICALL" -eq 0 ]; then
    echo "   ✅ PASS - All apiCall uses relative paths"
else
    echo "   ❌ FAIL - Found $APICALL absolute URL usages"
fi
echo ""

# Check 4: Critical pages
echo "4. Critical Pages Check:"
CRITICAL_ISSUES=0
for PAGE in pages/menu/products.tsx pages/menu/promotions.tsx pages/menu/availability.tsx pages/branches.tsx; do
    if [ -f "$PAGE" ]; then
        COUNT=$(grep -c "localhost:3001" "$PAGE" 2>/dev/null || echo "0")
        LEGIT=$(grep -c "8182\|ws://\|health" "$PAGE" 2>/dev/null || echo "0")
        ISSUES=$((COUNT - LEGIT))
        if [ "$ISSUES" -le 0 ]; then
            echo "   ✅ $PAGE: OK"
        else
            echo "   ⚠️  $PAGE: $ISSUES issues"
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + ISSUES))
        fi
    fi
done
echo ""

# Overall result
echo "═══════════════════════════════════════════════════════════════"
if [ "$HARDCODED" -eq 0 ] && [ "$DOUBLED" -eq 0 ] && [ "$APICALL" -eq 0 ] && [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED - No issues found!"
    echo ""
    echo "Your frontend is correctly configured."
    echo "All pages should work without 404 errors."
else
    echo "⚠️  SOME ISSUES FOUND"
    echo ""
    echo "Please review the above checks."
fi
echo "═══════════════════════════════════════════════════════════════"
