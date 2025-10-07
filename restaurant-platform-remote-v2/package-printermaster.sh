#!/bin/bash

# PrinterMaster Desktop App - Source Packaging Script
# This script creates a distributable source package

set -e

echo "🔨 PrinterMaster Desktop - Source Packaging Script"
echo "=================================================="

# Configuration
VERSION="2.0.0"
SOURCE_DIR="/home/admin/restaurant-platform-remote-v2/PrinterMasterv2"
PACKAGE_NAME="PrinterMaster-v${VERSION}-source"
TEMP_DIR="/tmp/${PACKAGE_NAME}"
OUTPUT_DIR="/var/www/html/downloads"
WEB_ROOT="/var/www/html"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Step 1: Cleaning up...${NC}"
rm -rf "$TEMP_DIR" 2>/dev/null || true
mkdir -p "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}📋 Step 2: Copying source files...${NC}"
# Copy only necessary directories
cp -r "$SOURCE_DIR/apps" "$TEMP_DIR/"
cp -r "$SOURCE_DIR/packages" "$TEMP_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/types" "$TEMP_DIR/" 2>/dev/null || true

# Copy configuration files
cp "$SOURCE_DIR/package.json" "$TEMP_DIR/"
cp "$SOURCE_DIR/package-lock.json" "$TEMP_DIR/"

# Copy documentation
cp "$SOURCE_DIR/README.md" "$TEMP_DIR/" 2>/dev/null || echo "# PrinterMaster Desktop v${VERSION}" > "$TEMP_DIR/README.md"
cp "/home/admin/restaurant-platform-remote-v2/PRINTERMASTER_DOWNLOAD_GUIDE.md" "$TEMP_DIR/"

# Create a simple installation guide in the root
cat > "$TEMP_DIR/QUICK_START.md" << 'EOF'
# PrinterMaster Desktop - Quick Start

## 🚀 Installation Steps

### 1. Install Dependencies
```bash
cd apps/desktop
npm install
```

### 2. Build for Your Platform

**Windows:**
```bash
npm run dist:win
```

**Mac:**
```bash
npm run dist:mac
```

**Linux:**
```bash
npm run dist:linux
```

### 3. Install & Run
Find the installer in: `../../dist/desktop/`

### 4. Enter License Key
When the app launches, enter your branch license key in Settings.

### 5. Start Printing!
The app automatically connects to: **http://31.57.166.18:3001**

---

📖 For detailed instructions, see: PRINTERMASTER_DOWNLOAD_GUIDE.md
EOF

echo -e "${BLUE}🔧 Step 3: Removing unnecessary files...${NC}"
# Remove node_modules to reduce package size
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
# Remove build artifacts
find "$TEMP_DIR" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find "$TEMP_DIR" -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
# Remove git files
find "$TEMP_DIR" -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
# Remove logs
find "$TEMP_DIR" -name "*.log" -type f -delete 2>/dev/null || true

echo -e "${BLUE}📦 Step 4: Creating ZIP archive...${NC}"
cd /tmp
zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}" -q
mv "${PACKAGE_NAME}.zip" "$OUTPUT_DIR/"

echo -e "${BLUE}📄 Step 5: Copying documentation...${NC}"
cp "/home/admin/restaurant-platform-remote-v2/PRINTERMASTER_DOWNLOAD_GUIDE.md" "$OUTPUT_DIR/"
cp "/home/admin/restaurant-platform-remote-v2/printermaster-download.html" "$WEB_ROOT/"

echo -e "${BLUE}🔧 Step 6: Setting permissions...${NC}"
chmod 644 "$OUTPUT_DIR/${PACKAGE_NAME}.zip"
chmod 644 "$OUTPUT_DIR/PRINTERMASTER_DOWNLOAD_GUIDE.md"
chmod 644 "$WEB_ROOT/printermaster-download.html"

echo -e "${BLUE}🧹 Step 7: Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(ls -lh "$OUTPUT_DIR/${PACKAGE_NAME}.zip" | awk '{print $5}')

echo ""
echo -e "${GREEN}✅ SUCCESS! Package created successfully!${NC}"
echo "=================================================="
echo -e "${YELLOW}📦 Package Details:${NC}"
echo "   Name: ${PACKAGE_NAME}.zip"
echo "   Size: ${FILE_SIZE}"
echo "   Location: $OUTPUT_DIR/${PACKAGE_NAME}.zip"
echo ""
echo -e "${YELLOW}🌐 Download URLs:${NC}"
echo "   Package: http://31.57.166.18/downloads/${PACKAGE_NAME}.zip"
echo "   Guide: http://31.57.166.18/downloads/PRINTERMASTER_DOWNLOAD_GUIDE.md"
echo "   Web Page: http://31.57.166.18/printermaster-download.html"
echo ""
echo -e "${YELLOW}📋 Installation Command:${NC}"
echo "   wget http://31.57.166.18/downloads/${PACKAGE_NAME}.zip"
echo "   unzip ${PACKAGE_NAME}.zip"
echo "   cd ${PACKAGE_NAME}/apps/desktop"
echo "   npm install && npm run dist:win"
echo ""
echo -e "${GREEN}🎉 Users can now download and build the Desktop App!${NC}"
