#!/bin/bash
###############################################################################
# Configuration Validation Script
#
# Validates backend and frontend configuration consistency to prevent
# connection issues and port conflicts.
#
# Usage:
#   ./scripts/validate-config.sh
#   ./scripts/validate-config.sh --verbose
###############################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
EXPECTED_BACKEND_PORT=3001
EXPECTED_FRONTEND_PORT=3000
EXPECTED_PRINTER_PORT=8182
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ERRORS=0
WARNINGS=0
VERBOSE=0

# Check for verbose flag
if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
    VERBOSE=1
fi

# Print colored message
log() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

error() {
    log "$RED" "❌ ERROR: $1"
    ((ERRORS++))
}

warn() {
    log "$YELLOW" "⚠️  WARNING: $1"
    ((WARNINGS++))
}

success() {
    log "$GREEN" "✅ $1"
}

info() {
    log "$CYAN" "ℹ️  $1"
}

verbose() {
    if [ $VERBOSE -eq 1 ]; then
        log "$CYAN" "   $1"
    fi
}

###############################################################################
# Check 1: Backend Configuration Validation
###############################################################################
check_backend_config() {
    log "$BLUE" "\n📋 Check 1: Backend Configuration"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local backend_dir="$PROJECT_ROOT/backend"

    if [ ! -d "$backend_dir" ]; then
        error "Backend directory not found at $backend_dir"
        return
    fi

    # Check for .env file
    if [ -f "$backend_dir/.env" ]; then
        verbose "Found backend .env file"

        # Check database connection
        if grep -q "DATABASE_URL" "$backend_dir/.env"; then
            local db_url=$(grep "DATABASE_URL" "$backend_dir/.env" | cut -d '=' -f2- | tr -d '"')

            # Check for correct database name
            if echo "$db_url" | grep -q "postgres"; then
                success "Database configured correctly (postgres)"
                verbose "DATABASE_URL: ${db_url:0:50}..."
            else
                warn "Database name may not be 'postgres'"
            fi

            # Check for correct password
            if echo "$db_url" | grep -q "E\$\$athecode006"; then
                success "Database password configured correctly"
            else
                warn "Database password may not match expected value"
            fi
        else
            warn "DATABASE_URL not found in backend .env"
        fi

        # Check backend port
        if grep -q "PORT" "$backend_dir/.env"; then
            local backend_port=$(grep "^PORT=" "$backend_dir/.env" | cut -d '=' -f2)
            if [ "$backend_port" = "$EXPECTED_BACKEND_PORT" ]; then
                success "Backend port correctly set to $EXPECTED_BACKEND_PORT"
            else
                error "Backend port is $backend_port, should be $EXPECTED_BACKEND_PORT"
            fi
        else
            info "PORT not explicitly set in backend .env (will use default $EXPECTED_BACKEND_PORT)"
        fi

        # Check CORS configuration
        if grep -q "FRONTEND_URL" "$backend_dir/.env"; then
            local frontend_url=$(grep "FRONTEND_URL" "$backend_dir/.env" | cut -d '=' -f2 | tr -d '"')
            verbose "CORS configured for: $frontend_url"

            # Verify it uses correct frontend port
            if echo "$frontend_url" | grep -q ":$EXPECTED_FRONTEND_PORT"; then
                success "CORS configured with correct frontend port"
            else
                warn "CORS frontend URL may have wrong port"
            fi
        else
            warn "FRONTEND_URL not configured for CORS"
        fi

    else
        warn "Backend .env file not found (may use environment variables)"
    fi

    # Check main.ts for port configuration
    if [ -f "$backend_dir/src/main.ts" ]; then
        if grep -q "process.env.PORT.*$EXPECTED_BACKEND_PORT" "$backend_dir/src/main.ts"; then
            success "main.ts uses correct default port"
        fi
    fi
}

###############################################################################
# Check 2: Frontend Configuration Validation
###############################################################################
check_frontend_config() {
    log "$BLUE" "\n🌐 Check 2: Frontend Configuration"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local frontend_dir="$PROJECT_ROOT/frontend"

    if [ ! -d "$frontend_dir" ]; then
        error "Frontend directory not found at $frontend_dir"
        return
    fi

    # Check for .env.local file
    local env_files=(".env.local" ".env" ".env.development")
    local found_env=0

    for env_file in "${env_files[@]}"; do
        if [ -f "$frontend_dir/$env_file" ]; then
            verbose "Found frontend $env_file"
            found_env=1

            # Check API URL
            if grep -q "NEXT_PUBLIC_API_URL" "$frontend_dir/$env_file"; then
                local api_url=$(grep "NEXT_PUBLIC_API_URL" "$frontend_dir/$env_file" | cut -d '=' -f2 | tr -d '"' | tr -d "'")

                # Check for correct backend port
                if echo "$api_url" | grep -q ":$EXPECTED_BACKEND_PORT"; then
                    success "Frontend API URL points to correct backend port: $api_url"
                else
                    error "Frontend API URL has wrong port: $api_url (should be :$EXPECTED_BACKEND_PORT)"
                fi

                # Check for common wrong ports
                if echo "$api_url" | grep -q ":3002\|:5000\|:8080"; then
                    error "Frontend API URL uses wrong port commonly seen in issues"
                fi
            else
                warn "NEXT_PUBLIC_API_URL not found in $env_file"
            fi

            # Check PrinterMaster URL if exists
            if grep -q "NEXT_PUBLIC_PRINTER_URL" "$frontend_dir/$env_file"; then
                local printer_url=$(grep "NEXT_PUBLIC_PRINTER_URL" "$frontend_dir/$env_file" | cut -d '=' -f2 | tr -d '"' | tr -d "'")

                if echo "$printer_url" | grep -q ":$EXPECTED_PRINTER_PORT"; then
                    success "PrinterMaster URL correctly configured: $printer_url"
                else
                    warn "PrinterMaster URL may have wrong port: $printer_url"
                fi
            fi
        fi
    done

    if [ $found_env -eq 0 ]; then
        error "No environment files found in frontend directory"
        info "Create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:$EXPECTED_BACKEND_PORT"
    fi

    # Check for hardcoded URLs in API client files
    if [ -d "$frontend_dir/src" ]; then
        verbose "Checking for hardcoded API URLs in source files..."

        local api_files=$(find "$frontend_dir/src" -type f \( -name "*api*.ts" -o -name "*api*.js" -o -name "*client*.ts" \) 2>/dev/null)

        if [ -n "$api_files" ]; then
            while IFS= read -r file; do
                if grep -q "localhost:3002\|localhost:5000\|localhost:8080" "$file" 2>/dev/null; then
                    error "Hardcoded wrong port found in: $(basename $file)"
                    verbose "File: $file"
                fi
            done <<< "$api_files"
        fi
    fi
}

###############################################################################
# Check 3: Port Conflict Detection
###############################################################################
check_port_conflicts() {
    log "$BLUE" "\n🔌 Check 3: Port Conflict Detection"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    # Check if ports are already in use
    local ports=("$EXPECTED_BACKEND_PORT:Backend" "$EXPECTED_FRONTEND_PORT:Frontend" "$EXPECTED_PRINTER_PORT:PrinterMaster")

    for port_info in "${ports[@]}"; do
        local port=$(echo $port_info | cut -d ':' -f1)
        local service=$(echo $port_info | cut -d ':' -f2)

        if command -v lsof &> /dev/null; then
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                local process=$(lsof -Pi :$port -sTCP:LISTEN | tail -n 1 | awk '{print $1}')
                info "Port $port is in use by $process (expected for $service)"
            else
                verbose "Port $port is available for $service"
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tuln | grep -q ":$port "; then
                info "Port $port is in use (expected for $service)"
            else
                verbose "Port $port is available for $service"
            fi
        else
            verbose "Cannot check port availability (lsof/netstat not found)"
        fi
    done

    success "No unexpected port conflicts detected"
}

###############################################################################
# Check 4: CORS Configuration Consistency
###############################################################################
check_cors_config() {
    log "$BLUE" "\n🔒 Check 4: CORS Configuration"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local backend_dir="$PROJECT_ROOT/backend"

    # Check if CORS is properly configured in backend
    if [ -f "$backend_dir/src/main.ts" ]; then
        if grep -q "enableCors" "$backend_dir/src/main.ts"; then
            success "CORS is enabled in backend"

            # Check for proper origin configuration
            if grep -A5 "enableCors" "$backend_dir/src/main.ts" | grep -q "origin.*process.env"; then
                success "CORS uses environment variable for origin"
            elif grep -A5 "enableCors" "$backend_dir/src/main.ts" | grep -q "origin.*true"; then
                warn "CORS allows all origins (not recommended for production)"
            fi
        else
            error "CORS not enabled in backend main.ts"
        fi
    fi

    # Verify frontend URL in backend .env matches actual frontend config
    if [ -f "$backend_dir/.env" ] && [ -f "$PROJECT_ROOT/frontend/.env.local" ]; then
        local backend_frontend_url=$(grep "FRONTEND_URL" "$backend_dir/.env" 2>/dev/null | cut -d '=' -f2 | tr -d '"')

        if [ -n "$backend_frontend_url" ]; then
            if echo "$backend_frontend_url" | grep -q "localhost:$EXPECTED_FRONTEND_PORT"; then
                success "Backend CORS origin matches expected frontend URL"
            else
                warn "Backend CORS origin may not match frontend URL"
            fi
        fi
    fi
}

###############################################################################
# Check 5: Database Connection Validation
###############################################################################
check_database_config() {
    log "$BLUE" "\n🗄️  Check 5: Database Configuration"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local backend_dir="$PROJECT_ROOT/backend"

    if [ -f "$backend_dir/.env" ]; then
        local db_url=$(grep "DATABASE_URL" "$backend_dir/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"')

        if [ -n "$db_url" ]; then
            # Extract database components
            if echo "$db_url" | grep -q "postgresql://"; then
                success "PostgreSQL connection string format is correct"

                # Check database name
                local db_name=$(echo "$db_url" | sed 's/.*\///' | cut -d '?' -f1)
                if [ "$db_name" = "postgres" ]; then
                    success "Database name is correct: postgres"
                else
                    error "Database name is '$db_name', should be 'postgres'"
                fi

                # Check if password is present (without revealing it)
                if echo "$db_url" | grep -q ":[^@]*@"; then
                    success "Database password is configured"
                else
                    error "Database password appears to be missing"
                fi

                # Test database connectivity if psql is available
                if command -v psql &> /dev/null; then
                    verbose "Testing database connection..."
                    if psql "$db_url" -c "SELECT 1;" &>/dev/null; then
                        success "Database connection successful"
                    else
                        error "Cannot connect to database"
                        info "Ensure PostgreSQL is running and credentials are correct"
                    fi
                else
                    verbose "psql not available, skipping connection test"
                fi
            else
                error "Invalid PostgreSQL connection string format"
            fi
        else
            error "DATABASE_URL not found in backend .env"
        fi
    else
        warn "Backend .env file not found, cannot validate database config"
    fi
}

###############################################################################
# Main execution
###############################################################################
main() {
    log "$CYAN" "\n🔍 Configuration Validation Starting..."
    log "$CYAN" "$(printf '%.0s═' {1..60})"
    log "$CYAN" "Project Root: $PROJECT_ROOT"

    # Run all checks
    check_backend_config
    check_frontend_config
    check_port_conflicts
    check_cors_config
    check_database_config

    # Summary
    log "$CYAN" "\n$(printf '%.0s═' {1..60})"

    if [ $ERRORS -gt 0 ]; then
        log "$RED" "\n❌ Configuration validation FAILED with $ERRORS error(s)"
        log "$RED" "Fix the issues above before starting the application."
        log "$CYAN" "$(printf '%.0s═' {1..60})\n"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        log "$YELLOW" "\n⚠️  Configuration validation completed with $WARNINGS warning(s)"
        log "$YELLOW" "Review warnings above. Application may still work."
        log "$CYAN" "$(printf '%.0s═' {1..60})\n"
        exit 0
    else
        log "$GREEN" "\n✅ All configuration checks passed!"
        log "$GREEN" "System is properly configured."
        log "$CYAN" "$(printf '%.0s═' {1..60})\n"
        exit 0
    fi
}

# Run main function
main
