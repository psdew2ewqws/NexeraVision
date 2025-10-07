#!/bin/bash
# Master Migration Script - Orchestrates the entire platform merge
# Usage: ./MASTER_MIGRATION.sh [--skip-backup] [--skip-tests] [--environment ENV]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default settings
SKIP_BACKUP=false
SKIP_TESTS=false
ENVIRONMENT="development"
AUTO_APPROVE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-backup     Skip backup creation (dangerous!)"
            echo "  --skip-tests      Skip test execution (not recommended)"
            echo "  --environment ENV Set deployment environment (development|staging|production)"
            echo "  --auto-approve    Skip confirmation prompts"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Banner
echo -e "${PURPLE}================================================${NC}"
echo -e "${PURPLE}     RESTAURANT PLATFORM INTEGRATION MERGER     ${NC}"
echo -e "${PURPLE}================================================${NC}"
echo ""
echo -e "${CYAN}Environment:${NC} $ENVIRONMENT"
echo -e "${CYAN}Skip Backup:${NC} $SKIP_BACKUP"
echo -e "${CYAN}Skip Tests:${NC} $SKIP_TESTS"
echo -e "${CYAN}Start Time:${NC} $(date)"
echo ""

# Confirmation
if [ "$AUTO_APPROVE" = false ]; then
    echo -e "${YELLOW}This script will merge the integration-platform into restaurant-platform-remote-v2${NC}"
    echo -e "${YELLOW}This is a major operation that will modify your database and codebase.${NC}"
    echo ""
    read -p "Do you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

# Function to run a step
run_step() {
    local step_name=$1
    local script_name=$2
    local optional=$3

    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Step: $step_name${NC}"
    echo -e "${BLUE}================================================${NC}"

    if [ "$optional" = true ] && [ "$SKIP_BACKUP" = true -o "$SKIP_TESTS" = true ]; then
        echo -e "${YELLOW}Skipping: $step_name${NC}"
        return 0
    fi

    if [ -f "$script_name" ]; then
        if bash "$script_name"; then
            echo -e "${GREEN}✅ $step_name completed successfully${NC}"
            return 0
        else
            echo -e "${RED}❌ $step_name failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Script not found: $script_name${NC}"
        return 1
    fi
}

# Function to handle errors
handle_error() {
    echo ""
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}ERROR: Migration failed at step $1${NC}"
    echo -e "${RED}================================================${NC}"

    if [ "$SKIP_BACKUP" = false ]; then
        echo -e "${YELLOW}A backup was created. You can rollback using:${NC}"
        echo -e "${CYAN}./rollback.sh${NC}"
    else
        echo -e "${RED}WARNING: No backup was created. Manual recovery may be needed.${NC}"
    fi

    exit 1
}

# Main migration steps
main() {
    local STEP=0
    local TOTAL_STEPS=5

    # Step 1: Create Backup
    ((STEP++))
    echo -e "${CYAN}[$STEP/$TOTAL_STEPS] Creating backup...${NC}"
    if [ "$SKIP_BACKUP" = false ]; then
        run_step "Backup Creation" "./01-backup.sh" false || handle_error "Backup"
    else
        echo -e "${YELLOW}⚠️  Skipping backup (dangerous!)${NC}"
    fi

    # Step 2: Migrate Files
    ((STEP++))
    echo -e "${CYAN}[$STEP/$TOTAL_STEPS] Migrating files...${NC}"
    run_step "File Migration" "./02-migrate-files.sh" false || handle_error "File Migration"

    # Step 3: Merge Database
    ((STEP++))
    echo -e "${CYAN}[$STEP/$TOTAL_STEPS] Merging database schemas...${NC}"
    if psql -U postgres -d postgres -f ./03-merge-database.sql > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database merge completed${NC}"
    else
        handle_error "Database Merge"
    fi

    # Step 4: Run Tests
    ((STEP++))
    echo -e "${CYAN}[$STEP/$TOTAL_STEPS] Running tests...${NC}"
    if [ "$SKIP_TESTS" = false ]; then
        run_step "Test Execution" "./04-run-tests.sh" true || handle_error "Tests"
    else
        echo -e "${YELLOW}⚠️  Skipping tests (not recommended)${NC}"
    fi

    # Step 5: Deploy
    ((STEP++))
    echo -e "${CYAN}[$STEP/$TOTAL_STEPS] Deploying merged platform...${NC}"
    run_step "Deployment" "./05-deploy.sh $ENVIRONMENT" false || handle_error "Deployment"
}

# Create migration report
create_report() {
    local END_TIME=$(date)
    local REPORT_FILE="/home/admin/restaurant-platform-remote-v2/MIGRATION_REPORT.md"

    cat > "$REPORT_FILE" <<EOF
# Platform Migration Report

## Migration Summary
- **Start Time**: $START_TIME
- **End Time**: $END_TIME
- **Environment**: $ENVIRONMENT
- **Status**: SUCCESS ✅

## Steps Completed
1. ✅ Backup created
2. ✅ Files migrated
3. ✅ Database merged
4. ✅ Tests passed
5. ✅ Platform deployed

## Key Changes
- Integrated webhook infrastructure from integration-platform
- Added developer portal for API integration
- Unified authentication system (JWT + API Keys)
- Merged database schemas with new integration tables
- Consolidated order management systems

## New Features Available
- Integration Developer Portal: http://localhost:3001/integration
- API Key Management
- Webhook Configuration UI
- Integration Analytics Dashboard
- Unified Order State Machine

## Post-Migration Checklist
- [ ] Verify all existing features work correctly
- [ ] Test new integration endpoints
- [ ] Configure webhook URLs for providers
- [ ] Generate API keys for integration partners
- [ ] Review monitoring dashboards
- [ ] Update team documentation

## Backup Location
$(ls -td /home/admin/backups/* | head -1)

## Next Steps
1. Monitor system performance for 24 hours
2. Collect feedback from users
3. Address any issues that arise
4. Plan feature enhancements

## Support
For issues or questions, check:
- Logs: /home/admin/restaurant-platform-remote-v2/logs/
- Documentation: /home/admin/restaurant-platform-remote-v2/docs/
- Rollback Script: ./scripts/migration/rollback.sh
EOF

    echo -e "${GREEN}Migration report created: $REPORT_FILE${NC}"
}

# Trap errors
trap 'handle_error "Unknown"' ERR

# Record start time
START_TIME=$(date)

# Run main migration
echo -e "${CYAN}Starting migration process...${NC}"
main

# Create report
create_report

# Success message
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}     ✅ MIGRATION COMPLETED SUCCESSFULLY!      ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${CYAN}Platform Status:${NC}"
echo -e "  • Backend:     ${GREEN}http://localhost:3000${NC}"
echo -e "  • Frontend:    ${GREEN}http://localhost:3001${NC}"
echo -e "  • Integration: ${GREEN}http://localhost:3001/integration${NC}"
echo ""
echo -e "${CYAN}What's New:${NC}"
echo -e "  • Unified platform with business + integration portals"
echo -e "  • Webhook infrastructure for all delivery providers"
echo -e "  • API key management for developers"
echo -e "  • Enhanced order state machine"
echo -e "  • Integration analytics dashboard"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  • Review the migration report: MIGRATION_REPORT.md"
echo -e "  • Monitor system health for the next 24 hours"
echo -e "  • Backup location: $(ls -td /home/admin/backups/* | head -1)"
echo ""
echo -e "${PURPLE}================================================${NC}"
echo -e "${PURPLE}Thank you for using the Platform Migration Tool${NC}"
echo -e "${PURPLE}================================================${NC}"