#!/bin/bash

# RestaurantPrint Pro - Cross-Platform Build Script
# This script builds the application for all supported platforms

set -e

echo "🚀 Starting cross-platform build for RestaurantPrint Pro v2.0.0"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the desktop app directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version check passed: $(node -v)"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist out .next
npm run clean 2>/dev/null || true
print_success "Previous builds cleaned"

# Install dependencies
print_status "Installing dependencies..."
npm ci
print_success "Dependencies installed"

# Build Next.js application
print_status "Building Next.js application..."
npm run build:next
if [ $? -eq 0 ]; then
    print_success "Next.js build completed"
else
    print_error "Next.js build failed"
    exit 1
fi

# Function to build for specific platform
build_platform() {
    local platform=$1
    local args=$2
    
    print_status "Building for $platform..."
    
    if npm run dist -- $args --publish=never; then
        print_success "$platform build completed"
        return 0
    else
        print_warning "$platform build failed (this is expected in some environments)"
        return 1
    fi
}

# Build for current platform first (most likely to succeed)
CURRENT_PLATFORM=$(uname -s)
case "$CURRENT_PLATFORM" in
    Linux*)
        print_status "Detected Linux environment"
        build_platform "Linux" "--linux"
        ;;
    Darwin*)
        print_status "Detected macOS environment"
        build_platform "macOS" "--mac"
        build_platform "Linux" "--linux"
        ;;
    MINGW*|CYGWIN*|MSYS*)
        print_status "Detected Windows environment"
        build_platform "Windows" "--win"
        ;;
    *)
        print_warning "Unknown platform: $CURRENT_PLATFORM"
        print_status "Attempting Linux build..."
        build_platform "Linux" "--linux"
        ;;
esac

# Try building for other platforms if tools are available
if command -v wine >/dev/null 2>&1; then
    print_status "Wine detected, attempting Windows build..."
    build_platform "Windows (via Wine)" "--win"
fi

# Generate build report
print_status "Generating build report..."
BUILD_DIR="../../dist/desktop"

if [ -d "$BUILD_DIR" ]; then
    echo ""
    echo "📦 Build Artifacts:"
    echo "=================="
    find "$BUILD_DIR" -type f \( -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.zip" \) -exec ls -lh {} \; | while read -r line; do
        echo "  $line"
    done
    
    # Calculate total size
    TOTAL_SIZE=$(find "$BUILD_DIR" -type f \( -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.zip" \) -exec du -b {} \; | awk '{sum += $1} END {print sum}')
    if [ -n "$TOTAL_SIZE" ] && [ "$TOTAL_SIZE" -gt 0 ]; then
        TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024 / 1024))
        echo ""
        echo "📊 Total build size: ${TOTAL_SIZE_MB}MB"
    fi
else
    print_warning "No build artifacts found in $BUILD_DIR"
fi

# Performance metrics
echo ""
echo "⚡ Performance Metrics:"
echo "====================="
echo "  Next.js bundle size: $(du -sh out 2>/dev/null || echo 'N/A')"
echo "  Node modules size: $(du -sh node_modules 2>/dev/null || echo 'N/A')"
echo "  Build time: $(date)"

# Security checks
print_status "Running security checks..."
if npm audit --audit-level=high --production; then
    print_success "Security audit passed"
else
    print_warning "Security audit found issues - review npm audit output"
fi

# Success message
echo ""
print_success "Cross-platform build process completed!"
echo ""
echo "🎯 Next Steps:"
echo "============="
echo "1. Test the generated installers on target platforms"
echo "2. Verify auto-update functionality"
echo "3. Run integration tests with QZ Tray"
echo "4. Deploy to staging environment"
echo "5. Create GitHub release when ready"
echo ""
echo "📁 Artifacts location: $BUILD_DIR"
echo "📝 Logs location: logs/"
echo ""
print_status "Build script completed at $(date)"