#!/bin/bash
# File migration script for merging integration-platform into restaurant-platform
# Usage: ./02-migrate-files.sh

set -e

echo "================================================"
echo "Starting File Migration Process"
echo "================================================"

# Configuration
RESTAURANT_DIR="/home/admin/restaurant-platform-remote-v2"
INTEGRATION_DIR="/home/admin/integration-platform"
BACKEND_DIR="$RESTAURANT_DIR/backend"

# Step 1: Create new directory structure
echo "Creating integration domain structure..."
mkdir -p "$BACKEND_DIR/src/integration/webhooks"
mkdir -p "$BACKEND_DIR/src/integration/providers"
mkdir -p "$BACKEND_DIR/src/integration/orders"
mkdir -p "$BACKEND_DIR/src/integration/analytics"
mkdir -p "$BACKEND_DIR/src/integration/api-keys"
mkdir -p "$BACKEND_DIR/src/shared/auth"
mkdir -p "$BACKEND_DIR/src/shared/database"
mkdir -p "$BACKEND_DIR/src/shared/utils"

# Step 2: Copy webhook modules
echo "Migrating webhook modules..."
if [ -d "$INTEGRATION_DIR/src/modules/webhook" ]; then
  cp -r "$INTEGRATION_DIR/src/modules/webhook"/* "$BACKEND_DIR/src/integration/webhooks/" 2>/dev/null || true
fi

# Step 3: Copy provider modules
echo "Migrating provider modules..."
PROVIDERS=("careem" "talabat" "deliveroo" "jahez" "hungerstation")
for provider in "${PROVIDERS[@]}"; do
  if [ -d "$INTEGRATION_DIR/src/modules/$provider" ]; then
    echo "  - Migrating $provider provider"
    mkdir -p "$BACKEND_DIR/src/integration/providers/$provider"
    cp -r "$INTEGRATION_DIR/src/modules/$provider"/* "$BACKEND_DIR/src/integration/providers/$provider/" 2>/dev/null || true
  fi
done

# Step 4: Copy order management
echo "Migrating order management..."
if [ -d "$INTEGRATION_DIR/src/modules/orders" ]; then
  cp -r "$INTEGRATION_DIR/src/modules/orders"/* "$BACKEND_DIR/src/integration/orders/" 2>/dev/null || true
fi

# Step 5: Copy analytics
echo "Migrating analytics..."
if [ -d "$INTEGRATION_DIR/src/modules/analytics" ]; then
  cp -r "$INTEGRATION_DIR/src/modules/analytics"/* "$BACKEND_DIR/src/integration/analytics/" 2>/dev/null || true
fi

# Step 6: Copy microservices
echo "Migrating microservices..."
if [ -d "$INTEGRATION_DIR/microservices" ]; then
  cp -r "$INTEGRATION_DIR/microservices" "$BACKEND_DIR/"
fi

# Step 7: Copy shared utilities
echo "Migrating shared utilities..."
if [ -d "$INTEGRATION_DIR/src/common" ]; then
  cp -r "$INTEGRATION_DIR/src/common"/* "$BACKEND_DIR/src/shared/utils/" 2>/dev/null || true
fi

# Step 8: Copy configuration files
echo "Copying configuration files..."
if [ -f "$INTEGRATION_DIR/nest-cli.json" ]; then
  cp "$INTEGRATION_DIR/nest-cli.json" "$BACKEND_DIR/nest-cli.json.integration"
fi

if [ -f "$INTEGRATION_DIR/tsconfig.json" ]; then
  cp "$INTEGRATION_DIR/tsconfig.json" "$BACKEND_DIR/tsconfig.json.integration"
fi

# Step 9: Create migration log
echo "Creating migration log..."
cat > "$RESTAURANT_DIR/scripts/migration/migration-log.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "files_migrated": {
    "webhooks": $(find "$BACKEND_DIR/src/integration/webhooks" -type f 2>/dev/null | wc -l),
    "providers": $(find "$BACKEND_DIR/src/integration/providers" -type f 2>/dev/null | wc -l),
    "orders": $(find "$BACKEND_DIR/src/integration/orders" -type f 2>/dev/null | wc -l),
    "analytics": $(find "$BACKEND_DIR/src/integration/analytics" -type f 2>/dev/null | wc -l),
    "microservices": $(find "$BACKEND_DIR/microservices" -type f 2>/dev/null | wc -l)
  },
  "status": "completed"
}
EOF

echo "================================================"
echo "File Migration Complete!"
echo "Migrated files to: $BACKEND_DIR/src/integration/"
echo "================================================"

# Display summary
echo "Migration Summary:"
echo "  - Webhooks: $(find "$BACKEND_DIR/src/integration/webhooks" -type f 2>/dev/null | wc -l) files"
echo "  - Providers: $(find "$BACKEND_DIR/src/integration/providers" -type f 2>/dev/null | wc -l) files"
echo "  - Orders: $(find "$BACKEND_DIR/src/integration/orders" -type f 2>/dev/null | wc -l) files"
echo "  - Analytics: $(find "$BACKEND_DIR/src/integration/analytics" -type f 2>/dev/null | wc -l) files"
echo "  - Microservices: $(find "$BACKEND_DIR/microservices" -type f 2>/dev/null | wc -l) files"