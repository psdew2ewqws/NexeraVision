#!/bin/bash

# Thermal Printer USB Quirks Configuration Script
# This script configures USB quirks for thermal printers to prevent continuous feeding issues

echo "🔧 Thermal Printer USB Quirks Configuration"
echo "============================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    echo "Usage: sudo ./thermal-printer-usb-quirks-setup.sh"
    exit 1
fi

echo "📋 Configuring USB quirks for thermal printers..."

# 1. Blacklist usblp module
echo "1. Blacklisting usblp module..."
BLACKLIST_FILE="/etc/modprobe.d/blacklist-usblp.conf"

if [ ! -f "$BLACKLIST_FILE" ]; then
    echo "blacklist usblp" > "$BLACKLIST_FILE"
    echo "✅ Created $BLACKLIST_FILE"
else
    if ! grep -q "blacklist usblp" "$BLACKLIST_FILE"; then
        echo "blacklist usblp" >> "$BLACKLIST_FILE"
        echo "✅ Added usblp blacklist to existing file"
    else
        echo "ℹ️  usblp already blacklisted"
    fi
fi

# 2. Configure USB quirks for common thermal printers
echo ""
echo "2. Configuring USB quirks..."
QUIRKS_FILE="/etc/cups/usb-quirks"

# Create quirks file if it doesn't exist
if [ ! -f "$QUIRKS_FILE" ]; then
    touch "$QUIRKS_FILE"
    echo "✅ Created $QUIRKS_FILE"
fi

# Common thermal printer USB quirks
# Format: vendor_id product_id quirks_mask description
QUIRKS=(
    "0x0519 0x0001 0x2 # Zijiang ZJ-58 thermal printer"
    "0x0416 0x5011 0x2 # POS-80C thermal printer"
    "0x28e9 0x0289 0x2 # Generic thermal printer"
    "0x0525 0xa4a7 0x2 # Generic ESC/POS printer"
    "0x04b8 0x0202 0x2 # Epson TM series"
    "0x04b8 0x0002 0x2 # Epson thermal printer"
)

echo "📝 Adding USB quirks for thermal printers..."
for quirk in "${QUIRKS[@]}"; do
    vendor_product=$(echo "$quirk" | cut -d' ' -f1-2)
    if ! grep -q "$vendor_product" "$QUIRKS_FILE"; then
        echo "$quirk" >> "$QUIRKS_FILE"
        echo "✅ Added quirk: $quirk"
    else
        echo "ℹ️  Quirk already exists: $vendor_product"
    fi
done

# 3. Set up udev rules for thermal printers
echo ""
echo "3. Setting up udev rules..."
UDEV_RULES_FILE="/etc/udev/rules.d/99-thermal-printers.rules"

cat > "$UDEV_RULES_FILE" << 'EOF'
# Thermal printer udev rules
# These rules ensure proper permissions and setup for thermal printers

# POS-80C and similar thermal printers
SUBSYSTEM=="usb", ATTR{idVendor}=="0416", ATTR{idProduct}=="5011", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="0519", ATTR{idProduct}=="0001", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="28e9", ATTR{idProduct}=="0289", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="0525", ATTR{idProduct}=="a4a7", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", ATTR{idProduct}=="0202", MODE="0666", GROUP="lp"

# Generic thermal printer rules
SUBSYSTEM=="usb", ATTRS{bInterfaceClass}=="07", ATTRS{bInterfaceSubClass}=="01", MODE="0666", GROUP="lp"

# Set permissions for thermal printer character devices
KERNEL=="lp[0-9]*", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", KERNEL=="lp[0-9]*", MODE="0666", GROUP="lp"
EOF

echo "✅ Created udev rules: $UDEV_RULES_FILE"

# 4. Add user to lp group
echo ""
echo "4. Configuring user permissions..."
if [ -n "$SUDO_USER" ]; then
    usermod -a -G lp "$SUDO_USER"
    echo "✅ Added user $SUDO_USER to lp group"
else
    echo "⚠️  Please add your user to the lp group manually: sudo usermod -a -G lp \$USER"
fi

# 5. Reload udev rules
echo ""
echo "5. Reloading system configuration..."
udevadm control --reload-rules
udevadm trigger
echo "✅ Udev rules reloaded"

# 6. Restart CUPS service
echo ""
echo "6. Restarting CUPS service..."
systemctl restart cups
echo "✅ CUPS service restarted"

# 7. Show connected USB devices
echo ""
echo "7. Current USB devices:"
echo "======================"
lsusb | grep -E "(Printer|POS|thermal|Epson|Star)" || echo "ℹ️  No thermal printers detected via lsusb"

echo ""
echo "8. Available printers in CUPS:"
echo "=============================="
lpstat -p 2>/dev/null || echo "ℹ️  No printers configured in CUPS yet"

echo ""
echo "🎉 USB Quirks Configuration Complete!"
echo "======================================"

echo ""
echo "📋 Next Steps:"
echo "1. REBOOT the system for all changes to take effect"
echo "2. Connect your thermal printer via USB"
echo "3. Check if printer is detected: lsusb"
echo "4. Add printer in CUPS: system-config-printer"
echo "5. Test printing with: node test-thermal-printer-fix.js"

echo ""
echo "🔍 Troubleshooting:"
echo "- If printer still not working, check dmesg for USB errors"
echo "- Verify printer VID/PID with lsusb and add to quirks if needed"
echo "- Ensure printer is in ESC/POS mode (check printer manual)"
echo "- Try different USB ports or cables"

echo ""
echo "📄 Configuration files created/modified:"
echo "- $BLACKLIST_FILE"
echo "- $QUIRKS_FILE"
echo "- $UDEV_RULES_FILE"

echo ""
echo "⚠️  IMPORTANT: A system reboot is required for all changes to take effect!"