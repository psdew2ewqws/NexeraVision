#!/bin/bash
# Rollback script for platform migration
# Usage: ./rollback.sh [backup-timestamp]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo -e "${RED}ROLLBACK PROCEDURE INITIATED${NC}"
echo "================================================"

# Configuration
RESTAURANT_DIR="/home/admin/restaurant-platform-remote-v2"
BACKUP_TIMESTAMP=${1}

# Find latest backup if not specified
if [ -z "$BACKUP_TIMESTAMP" ]; then
    BACKUP_DIR=$(ls -td /home/admin/backups/* 2>/dev/null | head -1)
    if [ -z "$BACKUP_DIR" ]; then
        echo -e "${RED}❌ No backup found. Cannot rollback.${NC}"
        exit 1
    fi
else
    BACKUP_DIR="/home/admin/backups/$BACKUP_TIMESTAMP"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}❌ Backup not found: $BACKUP_DIR${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Using backup: $BACKUP_DIR${NC}"

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will restore the platform to its previous state!${NC}"
echo "All changes since the backup will be lost."
read -p "Are you sure? (type 'ROLLBACK' to continue): " confirm

if [ "$confirm" != "ROLLBACK" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Function to stop services
stop_services() {
    echo "Stopping services..."

    # Stop PM2 processes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true

    # Stop Docker containers
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.staging.yml down 2>/dev/null || true

    # Kill any remaining Node processes
    pkill -f "node.*main.js" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true

    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to restore files
restore_files() {
    echo "Restoring application files..."

    # Create rollback backup (just in case)
    echo "Creating rollback safety backup..."
    cp -r "$RESTAURANT_DIR" "$RESTAURANT_DIR.rollback-$(date +%Y%m%d_%H%M%S)"

    # Restore restaurant platform
    if [ -d "$BACKUP_DIR/restaurant-platform-backup" ]; then
        echo "Restoring restaurant platform..."
        rm -rf "$RESTAURANT_DIR"/*
        cp -r "$BACKUP_DIR/restaurant-platform-backup"/* "$RESTAURANT_DIR/"
        echo -e "${GREEN}✅ Restaurant platform restored${NC}"
    fi

    # Restore integration platform if it was separate
    if [ -d "$BACKUP_DIR/integration-platform-backup" ]; then
        echo "Restoring integration platform..."
        rm -rf "/home/admin/integration-platform"
        cp -r "$BACKUP_DIR/integration-platform-backup" "/home/admin/integration-platform"
        echo -e "${GREEN}✅ Integration platform restored${NC}"
    fi
}

# Function to restore database
restore_database() {
    echo "Restoring database..."

    if [ ! -f "$BACKUP_DIR/database-backup.sql" ]; then
        echo -e "${YELLOW}⚠️  No database backup found${NC}"
        return
    fi

    # Drop and recreate database
    echo "Dropping current database..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS postgres_temp;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER DATABASE postgres RENAME TO postgres_temp;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE postgres;"

    # Restore backup
    echo "Restoring database backup..."
    sudo -u postgres psql postgres < "$BACKUP_DIR/database-backup.sql"

    # Verify restoration
    if sudo -u postgres psql -d postgres -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database restored successfully${NC}"
        # Remove temp database
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS postgres_temp;" 2>/dev/null || true
    else
        echo -e "${RED}❌ Database restoration failed${NC}"
        # Restore temp database
        sudo -u postgres psql -c "ALTER DATABASE postgres_temp RENAME TO postgres;" 2>/dev/null || true
        exit 1
    fi
}

# Function to restore configuration
restore_configuration() {
    echo "Restoring configuration files..."

    # Restore environment variables
    if [ -f "$BACKUP_DIR/.env" ]; then
        cp "$BACKUP_DIR/.env" "$RESTAURANT_DIR/.env"
    fi

    # Restore PM2 ecosystem file
    if [ -f "$BACKUP_DIR/ecosystem.config.js" ]; then
        cp "$BACKUP_DIR/ecosystem.config.js" "$RESTAURANT_DIR/"
    fi

    echo -e "${GREEN}✅ Configuration restored${NC}"
}

# Function to restart services
restart_services() {
    echo "Restarting services..."

    cd "$RESTAURANT_DIR"

    # Check for PM2 ecosystem file
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
        echo -e "${GREEN}✅ Services restarted with PM2${NC}"
    elif [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        echo -e "${GREEN}✅ Services restarted with Docker${NC}"
    else
        echo -e "${YELLOW}⚠️  No service configuration found. Manual restart required.${NC}"
    fi
}

# Function to verify rollback
verify_rollback() {
    echo "Verifying rollback..."

    # Check file restoration
    if [ -d "$RESTAURANT_DIR/backend" ]; then
        echo -e "${GREEN}✅ Files restored${NC}"
    else
        echo -e "${RED}❌ File restoration incomplete${NC}"
    fi

    # Check database
    if sudo -u postgres psql -d postgres -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database accessible${NC}"
    else
        echo -e "${RED}❌ Database not accessible${NC}"
    fi

    # Check services
    sleep 5
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend service running${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend service not responding${NC}"
    fi
}

# Function to create rollback report
create_rollback_report() {
    echo "Creating rollback report..."

    cat > "$RESTAURANT_DIR/ROLLBACK_REPORT.md" <<EOF
# Rollback Report

**Rollback Date**: $(date)
**Backup Used**: $BACKUP_DIR
**Backup Date**: $(stat -c %y "$BACKUP_DIR" | cut -d' ' -f1)

## Actions Performed
- ✅ Services stopped
- ✅ Files restored from backup
- ✅ Database restored from backup
- ✅ Configuration restored
- ✅ Services restarted

## Current Status
- Backend: $(curl -s http://localhost:3000/api/health > /dev/null 2>&1 && echo "Running" || echo "Not running")
- Frontend: $(curl -s http://localhost:3001 > /dev/null 2>&1 && echo "Running" || echo "Not running")
- Database: $(sudo -u postgres psql -d postgres -c "SELECT 1" > /dev/null 2>&1 && echo "Accessible" || echo "Not accessible")

## Next Steps
1. Verify all services are functioning correctly
2. Check application logs for any errors
3. Test critical functionality
4. Inform team of rollback completion

## Rollback Safety Backup
Location: $RESTAURANT_DIR.rollback-$(date +%Y%m%d_%H%M%S)
EOF

    echo -e "${GREEN}✅ Rollback report created: ROLLBACK_REPORT.md${NC}"
}

# Main rollback procedure
main() {
    echo "Starting rollback procedure..."

    # Step 1: Stop all services
    stop_services

    # Step 2: Restore files
    restore_files

    # Step 3: Restore database
    restore_database

    # Step 4: Restore configuration
    restore_configuration

    # Step 5: Restart services
    restart_services

    # Step 6: Verify rollback
    verify_rollback

    # Step 7: Create report
    create_rollback_report

    echo ""
    echo "================================================"
    echo -e "${GREEN}✅ ROLLBACK COMPLETE${NC}"
    echo "================================================"
    echo "Platform has been restored to backup from: $BACKUP_DIR"
    echo "Please verify all services are functioning correctly"
    echo "================================================"
}

# Error handler
trap 'echo -e "${RED}Rollback failed at line $LINENO${NC}"; exit 1' ERR

# Run main function
main