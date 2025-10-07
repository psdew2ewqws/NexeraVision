#!/bin/bash
# Backup script for platform migration
# Usage: ./01-backup.sh

set -e

echo "================================================"
echo "Starting Platform Backup Process"
echo "================================================"

# Configuration
BACKUP_DIR="/home/admin/backups/$(date +%Y%m%d_%H%M%S)"
RESTAURANT_DIR="/home/admin/restaurant-platform-remote-v2"
INTEGRATION_DIR="/home/admin/integration-platform"

# Create backup directory
echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 1. Backup restaurant platform
echo "Backing up restaurant platform..."
cp -r "$RESTAURANT_DIR" "$BACKUP_DIR/restaurant-platform-backup"

# 2. Backup integration platform
echo "Backing up integration platform..."
cp -r "$INTEGRATION_DIR" "$BACKUP_DIR/integration-platform-backup"

# 3. Backup database
echo "Backing up database..."
sudo -u postgres pg_dump postgres > "$BACKUP_DIR/database-backup.sql"

# 4. Create backup manifest
echo "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "restaurant_platform": "$RESTAURANT_DIR",
  "integration_platform": "$INTEGRATION_DIR",
  "database": "postgres",
  "backup_location": "$BACKUP_DIR",
  "files": {
    "restaurant_platform": "$(find $RESTAURANT_DIR -type f | wc -l) files",
    "integration_platform": "$(find $INTEGRATION_DIR -type f | wc -l) files",
    "database_size": "$(du -h $BACKUP_DIR/database-backup.sql | cut -f1)"
  }
}
EOF

# 5. Compress backup
echo "Compressing backup..."
cd "$(dirname $BACKUP_DIR)"
tar -czf "$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"

echo "================================================"
echo "Backup Complete!"
echo "Location: $BACKUP_DIR"
echo "Compressed: $(dirname $BACKUP_DIR)/$(basename $BACKUP_DIR).tar.gz"
echo "================================================"

# Verify backup
echo "Verifying backup integrity..."
if [ -f "$BACKUP_DIR/manifest.json" ] && [ -f "$BACKUP_DIR/database-backup.sql" ]; then
  echo "✅ Backup verified successfully"
else
  echo "❌ Backup verification failed!"
  exit 1
fi