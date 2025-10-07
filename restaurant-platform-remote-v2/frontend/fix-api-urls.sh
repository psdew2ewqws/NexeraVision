#!/bin/bash

# Script to fix all hardcoded API URLs in the frontend codebase
# This script replaces direct fetch calls with proper API URL construction

set -e

FRONTEND_DIR="/home/admin/restaurant-platform-remote-v2/frontend"
cd "$FRONTEND_DIR"

echo "========================================="
echo "API URL Fix Script"
echo "========================================="
echo ""

# Count files before
TOTAL_FILES=$(find pages src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" | wc -l)
echo "Total TypeScript files: $TOTAL_FILES"

# Find files with hardcoded URLs (excluding health checks and printer port 8182)
FILES_WITH_URLS=$(grep -r "localhost:3001" pages/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "8182" | grep -v "health-check" | cut -d: -f1 | sort | uniq)

if [ -z "$FILES_WITH_URLS" ]; then
  echo "No files with hardcoded localhost:3001 URLs found!"
  exit 0
fi

FILES_COUNT=$(echo "$FILES_WITH_URLS" | wc -l)
echo "Files with hardcoded URLs: $FILES_COUNT"
echo ""

# Display files to be fixed
echo "Files that will be modified:"
echo "$FILES_WITH_URLS"
echo ""

read -p "Proceed with fixing these files? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo "Fixing files..."
echo ""

FIXED_COUNT=0

# Pattern 1: Fix `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/endpoint`
# This should become: just use fetch with proper base URL setup

# Pattern 2: Fix 'http://localhost:3001/api/v1/endpoint'
# This should use relative URLs or proper API client

# Create backup directory
BACKUP_DIR="$FRONTEND_DIR/.api-url-fixes-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backup directory: $BACKUP_DIR"
echo ""

for FILE in $FILES_WITH_URLS; do
  # Create backup
  BACKUP_PATH="$BACKUP_DIR/$(dirname $FILE)"
  mkdir -p "$BACKUP_PATH"
  cp "$FILE" "$BACKUP_PATH/"

  # Count occurrences before
  BEFORE_COUNT=$(grep -c "localhost:3001" "$FILE" 2>/dev/null || echo "0")

  if [ "$BEFORE_COUNT" -gt 0 ]; then
    echo "Processing: $FILE ($BEFORE_COUNT occurrences)"

    # We'll use sed for simple replacements
    # Note: This is a simplified approach - complex files may need manual review

    # Make the file use proper base URL construction
    sed -i 's|'"'"'http://localhost:3001/api/v1|`${process.env.NEXT_PUBLIC_API_URL || '"'"'http://localhost:3001'"'"'}/api/v1|g' "$FILE"
    sed -i 's|"http://localhost:3001/api/v1|`${process.env.NEXT_PUBLIC_API_URL || '"'"'http://localhost:3001'"'"'}/api/v1|g' "$FILE"
    sed -i 's|http://localhost:3001/api/v1/|${process.env.NEXT_PUBLIC_API_URL || '"'"'http://localhost:3001'"'"'}/api/v1/|g' "$FILE"

    # Count occurrences after
    AFTER_COUNT=$(grep -c "localhost:3001" "$FILE" 2>/dev/null || echo "0")

    if [ "$AFTER_COUNT" -lt "$BEFORE_COUNT" ]; then
      FIXED_COUNT=$((FIXED_COUNT + 1))
      echo "  ✓ Reduced from $BEFORE_COUNT to $AFTER_COUNT occurrences"
    else
      echo "  ⚠ No change detected - may need manual review"
    fi
  fi
done

echo ""
echo "========================================="
echo "Fix Summary"
echo "========================================="
echo "Files processed: $FILES_COUNT"
echo "Files successfully modified: $FIXED_COUNT"
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Test the application"
echo "3. If issues arise, restore from backup directory"
echo ""
echo "To verify no hardcoded URLs remain (excluding allowed ones):"
echo "grep -r \"localhost:3001\" pages/ src/ --include=\"*.ts\" --include=\"*.tsx\" | grep -v \"8182\" | grep -v \"health-check\""
