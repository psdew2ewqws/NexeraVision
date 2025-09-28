#!/bin/bash

# Thermal Printer USB Configuration Script
# Configures USB thermal printer (POS-80C) for proper operation and prevents continuous feeding
# Addresses USB quirks, permissions, and CUPS configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Thermal Printer USB Configuration Script${NC}"
echo -e "${BLUE}===========================================${NC}"
echo "Configuring POS-80C thermal printer for proper operation"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Function to log messages
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Check for USB thermal printer devices
echo -e "${BLUE}📋 Step 1: Detecting USB Thermal Printers${NC}"
echo "----------------------------------------"

# List USB devices and look for common thermal printer vendors
echo "Scanning for USB thermal printers..."
lsusb | grep -E "(04b8|0fe6|067b|04f9|0519)" || log_warn "No common thermal printer USB IDs found"

# Check for USB printer devices
if ls /dev/usb/lp* 1> /dev/null 2>&1; then
    log_info "USB printer device(s) found:"
    ls -la /dev/usb/lp*
else
    log_warn "No USB printer devices found at /dev/usb/lp*"
fi

echo ""

# 2. USB Permission Configuration
echo -e "${BLUE}📋 Step 2: USB Permissions Configuration${NC}"
echo "----------------------------------------"

# Create udev rule for thermal printers
UDEV_RULE_FILE="/etc/udev/rules.d/99-thermal-printer.rules"

cat > "$UDEV_RULE_FILE" << 'EOF'
# Thermal Printer USB Configuration
# POS-80C and compatible thermal receipt printers

# Generic USB thermal printer rule - adjust vendor/product IDs as needed
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", ATTR{idProduct}=="0202", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fe6", ATTR{idProduct}=="811e", MODE="0666", GROUP="lp"

# USB printer class devices
KERNEL=="lp[0-9]*", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{bInterfaceClass}=="07", ATTR{bInterfaceSubClass}=="01", MODE="0666", GROUP="lp"

# USB serial devices that might be thermal printers
KERNEL=="ttyUSB[0-9]*", ATTRS{idVendor}=="04b8", MODE="0666", GROUP="lp"
KERNEL=="ttyUSB[0-9]*", ATTRS{idVendor}=="0fe6", MODE="0666", GROUP="lp"

# Add raw device access for thermal printers
ACTION=="add", SUBSYSTEM=="usb", ATTR{bDeviceClass}=="00", ATTR{bInterfaceClass}=="07", MODE="0666", GROUP="lp", SYMLINK+="thermal-printer"
EOF

log_info "Created udev rule: $UDEV_RULE_FILE"

# Add current user to lp group if not already added
if [ -n "$SUDO_USER" ]; then
    usermod -a -G lp "$SUDO_USER"
    log_info "Added user $SUDO_USER to lp group"
else
    log_warn "Could not determine user to add to lp group"
fi

# Reload udev rules
udevadm control --reload-rules
udevadm trigger
log_info "Reloaded udev rules"

echo ""

# 3. CUPS Configuration
echo -e "${BLUE}📋 Step 3: CUPS Printer Configuration${NC}"
echo "----------------------------------------"

# Ensure CUPS is running
if systemctl is-active --quiet cups; then
    log_info "CUPS service is running"
else
    log_warn "CUPS service not running, attempting to start..."
    systemctl start cups || log_error "Failed to start CUPS"
fi

# Create CUPS configuration for raw printing
CUPS_CONF_DIR="/etc/cups"
RAW_PRINTER_CONF="$CUPS_CONF_DIR/raw.convs"

# Add raw mime type support
if [ ! -f "$RAW_PRINTER_CONF" ]; then
    cat > "$RAW_PRINTER_CONF" << 'EOF'
# Raw printer support for thermal printers
application/vnd.cups-raw    0    -
EOF
    log_info "Created raw printer configuration"
fi

# Configure CUPS for raw printing
CUPS_MIME_TYPES="$CUPS_CONF_DIR/mime.types"
if ! grep -q "application/vnd.cups-raw" "$CUPS_MIME_TYPES" 2>/dev/null; then
    echo "application/vnd.cups-raw" >> "$CUPS_MIME_TYPES"
    log_info "Added raw mime type to CUPS"
fi

# Restart CUPS to apply changes
systemctl restart cups
log_info "Restarted CUPS service"

echo ""

# 4. Thermal Printer Driver Configuration
echo -e "${BLUE}📋 Step 4: Thermal Printer Driver Setup${NC}"
echo "----------------------------------------"

# Install common thermal printer drivers if available
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    log_info "Installing printer drivers for Debian/Ubuntu..."
    apt-get update -qq
    apt-get install -y printer-driver-escpr cups-filters || log_warn "Some printer drivers could not be installed"
elif command -v yum &> /dev/null; then
    # RedHat/CentOS
    log_info "Installing printer drivers for RedHat/CentOS..."
    yum install -y cups-filters ghostscript || log_warn "Some printer drivers could not be installed"
elif command -v dnf &> /dev/null; then
    # Fedora
    log_info "Installing printer drivers for Fedora..."
    dnf install -y cups-filters ghostscript || log_warn "Some printer drivers could not be installed"
else
    log_warn "Package manager not recognized, skipping driver installation"
fi

echo ""

# 5. USB Power Management Configuration
echo -e "${BLUE}📋 Step 5: USB Power Management${NC}"
echo "----------------------------------------"

# Disable USB autosuspend for printer devices to prevent connection issues
USB_QUIRKS_FILE="/etc/modprobe.d/thermal-printer-usb.conf"

cat > "$USB_QUIRKS_FILE" << 'EOF'
# USB configuration for thermal printers
# Disable autosuspend for USB printer devices to prevent connection issues

# Disable USB autosuspend globally for printer class devices
options usbcore autosuspend=-1

# Specific quirks for common thermal printer USB IDs
# EPSON thermal printers
options usb-storage quirks=04b8:0202:i
# Custom thermal printer controllers
options usb-storage quirks=0fe6:811e:i
EOF

log_info "Created USB quirks configuration: $USB_QUIRKS_FILE"

echo ""

# 6. Test Printer Detection
echo -e "${BLUE}📋 Step 6: Printer Detection Test${NC}"
echo "----------------------------------------"

# List all available printers
echo "Available printers in CUPS:"
lpstat -p 2>/dev/null || log_warn "No printers configured in CUPS"

# Check for USB devices again
echo ""
echo "USB devices after configuration:"
lsusb | grep -E "(04b8|0fe6|067b|04f9|0519)" || echo "No thermal printer USB devices detected"

# Check permissions
echo ""
echo "USB printer device permissions:"
ls -la /dev/usb/lp* 2>/dev/null || echo "No USB printer devices found"

echo ""

# 7. Auto-detect and add POS-80C printer if found
echo -e "${BLUE}📋 Step 7: Auto-configure POS-80C Printer${NC}"
echo "----------------------------------------"

# Try to auto-detect and configure the printer
USB_PRINTER_DEVICE=""
if ls /dev/usb/lp* 1> /dev/null 2>&1; then
    USB_PRINTER_DEVICE=$(ls /dev/usb/lp* | head -n 1)
    log_info "Found USB printer device: $USB_PRINTER_DEVICE"

    # Add printer to CUPS if not already present
    if ! lpstat -p "POS-80C" 2>/dev/null; then
        log_info "Adding POS-80C printer to CUPS..."

        # Try to add the printer with raw driver
        lpadmin -p "POS-80C" \
                -E \
                -v "usb:$USB_PRINTER_DEVICE" \
                -m "raw" \
                -L "Thermal Receipt Printer" \
                -D "POS-80C Thermal Printer" \
                2>/dev/null && log_info "POS-80C printer added successfully" || log_warn "Could not auto-add POS-80C printer"
    else
        log_info "POS-80C printer already configured"
    fi
else
    log_warn "No USB printer devices found for auto-configuration"
fi

echo ""

# 8. Create test script
echo -e "${BLUE}📋 Step 8: Creating Test Scripts${NC}"
echo "----------------------------------------"

# Create a simple test script
TEST_SCRIPT="/usr/local/bin/test-thermal-printer"

cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash

# Simple thermal printer test script
echo "Testing thermal printer..."

# Create test content with proper ESC/POS commands
TEST_CONTENT=$(cat << 'EOT'
ESC @ - Initialize printer
Test Print
GS V A 0 - Cut paper
EOT
)

# Replace text representations with actual ESC/POS commands
echo -e "\x1b@Test Print\n\n\x1dV\x41\x00\x1dV\x00" > /tmp/thermal-test.bin

# Print to POS-80C if available
if lpstat -p "POS-80C" >/dev/null 2>&1; then
    echo "Printing to POS-80C..."
    lp -o raw -o job-sheets=none -d "POS-80C" /tmp/thermal-test.bin
    echo "Print job sent. Check printer for output."
else
    echo "POS-80C printer not found. Available printers:"
    lpstat -p
fi

# Cleanup
rm -f /tmp/thermal-test.bin
EOF

chmod +x "$TEST_SCRIPT"
log_info "Created test script: $TEST_SCRIPT"

echo ""

# 9. Configuration Summary
echo -e "${BLUE}📊 Configuration Summary${NC}"
echo "========================"
echo ""
log_info "USB thermal printer configuration completed"
echo ""
echo -e "${GREEN}✅ Completed Configuration Steps:${NC}"
echo "   1. USB device detection and permissions"
echo "   2. udev rules for thermal printer access"
echo "   3. CUPS configuration for raw printing"
echo "   4. USB power management configuration"
echo "   5. Printer driver installation"
echo "   6. Auto-detection and CUPS setup"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. Reconnect your POS-80C thermal printer"
echo "   2. Run: lpstat -p (to check if printer is detected)"
echo "   3. Test with: $TEST_SCRIPT"
echo "   4. Or test from your application dashboard"
echo ""
echo -e "${YELLOW}🔧 Manual Configuration (if auto-detection failed):${NC}"
echo "   1. lpadmin -p 'POS-80C' -E -v 'usb:/dev/usb/lp0' -m raw"
echo "   2. cupsenable POS-80C"
echo "   3. cupsaccept POS-80C"
echo ""
echo -e "${BLUE}🔗 Configuration Files Created:${NC}"
echo "   • $UDEV_RULE_FILE"
echo "   • $USB_QUIRKS_FILE"
echo "   • $RAW_PRINTER_CONF"
echo "   • $TEST_SCRIPT"
echo ""

# Check if reboot is recommended
if [ -f "$USB_QUIRKS_FILE" ]; then
    log_warn "A system reboot is recommended to apply USB configuration changes"
    echo "   Run: sudo reboot"
fi

echo ""
log_info "Thermal printer USB configuration script completed!"
echo ""