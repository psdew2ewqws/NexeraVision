#!/bin/bash
###############################################################################
# Pre-Commit Validation Script
#
# Prevents commits with configuration issues that could break the application.
# Install as a Git hook:
#   ln -s ../../.github/pre-commit-check.sh .git/hooks/pre-commit
#
# Or add to package.json with husky:
#   "husky": {
#     "hooks": {
#       "pre-commit": ".github/pre-commit-check.sh"
#     }
#   }
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
WRONG_PORTS=(3002 5000 8080)
ERRORS=0
WARNINGS=0

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

###############################################################################
# Check 1: Search for hardcoded localhost URLs with wrong ports
###############################################################################
check_hardcoded_urls() {
    log "$BLUE" "\n📋 Check 1: Hardcoded URL Detection"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    # Get list of staged files
    local staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx)$')

    if [ -z "$staged_files" ]; then
        info "No JS/TS files staged for commit"
        return
    fi

    local found_issues=0

    # Check each staged file
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Check for wrong backend ports
            for port in "${WRONG_PORTS[@]}"; do
                if grep -n "localhost:$port\|127\.0\.0\.1:$port\|:$port" "$file" | grep -v "^[[:space:]]*//\|^[[:space:]]*\*" > /dev/null; then
                    error "Wrong port $port found in $file:"
                    grep -n "localhost:$port\|127\.0\.0\.1:$port\|:$port" "$file" | grep -v "^[[:space:]]*//\|^[[:space:]]*\*" | while read -r line; do
                        echo "    $line"
                    done
                    found_issues=1
                fi
            done

            # Check for generic localhost patterns (excluding frontend port 3000)
            if grep -n "http://localhost:\|https://localhost:" "$file" | grep -v "localhost:3000" | grep -v "^[[:space:]]*//\|^[[:space:]]*\*" > /dev/null; then
                warn "Hardcoded localhost URL found in $file:"
                grep -n "http://localhost:\|https://localhost:" "$file" | grep -v "localhost:3000" | grep -v "^[[:space:]]*//\|^[[:space:]]*\*" | head -5 | while read -r line; do
                    echo "    $line"
                done
            fi
        fi
    done <<< "$staged_files"

    if [ $found_issues -eq 0 ]; then
        success "No critical hardcoded URL issues found"
    fi
}

###############################################################################
# Check 2: Verify environment variable usage
###############################################################################
check_env_usage() {
    log "$BLUE" "\n🔍 Check 2: Environment Variable Usage"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx)$')

    if [ -z "$staged_files" ]; then
        return
    fi

    local found_env_usage=0

    # Check if files that make API calls use environment variables
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Check for fetch/axios calls without env variable
            if grep -E "fetch\(|axios\.|http\.(get|post|put|delete)" "$file" > /dev/null; then
                if ! grep -E "process\.env\.NEXT_PUBLIC_API_URL|API_URL" "$file" > /dev/null; then
                    # Check if it's using hardcoded URLs
                    if grep -E "fetch\(['\"]http" "$file" > /dev/null; then
                        warn "API call without environment variable in $file"
                        info "Consider using process.env.NEXT_PUBLIC_API_URL"
                    fi
                else
                    found_env_usage=1
                fi
            fi
        fi
    done <<< "$staged_files"

    if [ $found_env_usage -eq 1 ]; then
        success "Environment variables properly used for API calls"
    fi
}

###############################################################################
# Check 3: Verify backend port consistency
###############################################################################
check_port_consistency() {
    log "$BLUE" "\n🔌 Check 3: Port Configuration Consistency"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local staged_files=$(git diff --cached --name-only --diff-filter=ACM)

    # Check if any config files are being committed
    if echo "$staged_files" | grep -E "\.env|config\.(js|ts)|package\.json" > /dev/null; then
        info "Configuration files detected in commit"

        # Check .env files for correct backend port
        if echo "$staged_files" | grep "\.env" > /dev/null; then
            while IFS= read -r env_file; do
                if [ -f "$env_file" ]; then
                    if grep "NEXT_PUBLIC_API_URL.*:${EXPECTED_BACKEND_PORT}" "$env_file" > /dev/null; then
                        success "Correct backend port ($EXPECTED_BACKEND_PORT) in $env_file"
                    else
                        for port in "${WRONG_PORTS[@]}"; do
                            if grep "NEXT_PUBLIC_API_URL.*:$port" "$env_file" > /dev/null; then
                                error "Wrong backend port ($port) in $env_file"
                                info "Backend should use port $EXPECTED_BACKEND_PORT"
                            fi
                        done
                    fi
                fi
            done <<< "$(echo "$staged_files" | grep "\.env")"
        fi
    fi
}

###############################################################################
# Check 4: Look for API client inconsistencies
###############################################################################
check_api_client() {
    log "$BLUE" "\n🌐 Check 4: API Client Configuration"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx)$')

    if [ -z "$staged_files" ]; then
        return
    fi

    # Check for files that look like API clients
    local api_files=$(echo "$staged_files" | grep -E "api\.|client\.|service\." | head -5)

    if [ -n "$api_files" ]; then
        info "API client files detected:"
        while IFS= read -r file; do
            if [ -f "$file" ]; then
                echo "    - $file"

                # Check if they use baseURL or similar
                if grep -n "baseURL\|baseUrl\|BASE_URL" "$file" > /dev/null; then
                    if ! grep "process\.env\.NEXT_PUBLIC_API_URL" "$file" > /dev/null; then
                        warn "API client may have hardcoded baseURL in $file"
                    else
                        success "API client uses environment variable in $file"
                    fi
                fi
            fi
        done <<< "$api_files"
    fi
}

###############################################################################
# Check 5: Frontend-Backend port conflict
###############################################################################
check_port_conflicts() {
    log "$BLUE" "\n⚡ Check 5: Port Conflict Detection"
    log "$BLUE" "$(printf '%.0s─' {1..60})"

    local staged_files=$(git diff --cached --name-only --diff-filter=ACM)

    # Check package.json for port configurations
    if echo "$staged_files" | grep "package\.json" > /dev/null; then
        if [ -f "package.json" ]; then
            # Check if scripts define ports that conflict
            if grep -E "\"start.*--port.*${EXPECTED_BACKEND_PORT}|\"dev.*--port.*${EXPECTED_BACKEND_PORT}" package.json > /dev/null; then
                error "Frontend package.json trying to use backend port ${EXPECTED_BACKEND_PORT}"
                info "Frontend should use port 3000, backend uses port ${EXPECTED_BACKEND_PORT}"
            else
                success "No port conflicts detected in package.json"
            fi
        fi
    fi
}

###############################################################################
# Main execution
###############################################################################
main() {
    log "$CYAN" "\n🔒 Pre-Commit Validation Starting..."
    log "$CYAN" "$(printf '%.0s═' {1..60})"

    # Run all checks
    check_hardcoded_urls
    check_env_usage
    check_port_consistency
    check_api_client
    check_port_conflicts

    # Summary
    log "$CYAN" "\n$(printf '%.0s═' {1..60})"

    if [ $ERRORS -gt 0 ]; then
        log "$RED" "\n❌ Pre-commit validation FAILED with $ERRORS error(s)"
        log "$RED" "Fix the issues above before committing."
        log "$CYAN" "$(printf '%.0s═' {1..60})\n"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        log "$YELLOW" "\n⚠️  Pre-commit validation completed with $WARNINGS warning(s)"
        log "$YELLOW" "Review warnings above. Commit will proceed."
        log "$CYAN" "$(printf '%.0s═' {1..60})\n"
        exit 0
    else
        log "$GREEN" "\n✅ All pre-commit checks passed!"
        log "$CYAN" "$(printf '%.0s═' {1..60})\n"
        exit 0
    fi
}

# Run main function
main
