#!/bin/bash

##############################################################################
# PrinterMaster Linux systemd Service Setup Script
#
# This script provides automated setup for Linux systems with systemd:
# - User permission configuration
# - USB device access setup
# - Service installation and configuration
# - Firewall configuration
# - Log rotation setup
# - Health monitoring setup
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="printermaster"
SERVICE_USER="admin"
SERVICE_GROUP="admin"
SERVICE_PORT="8182"
APP_DIR="/home/admin/restaurant-platform-remote-v2/PrinterMasterv2"
LOG_DIR="$APP_DIR/logs"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        echo "Please run: sudo $0"
        exit 1
    fi
    success "Running with root privileges"
}

check_dependencies() {
    log "Checking system dependencies..."

    # Check if systemd is available
    if ! command -v systemctl &> /dev/null; then
        error "systemd is not available on this system"
        exit 1
    fi
    success "systemd is available"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        echo "Please install Node.js first: https://nodejs.org/"
        exit 1
    fi

    local node_version=$(node --version)
    success "Node.js is installed: $node_version"

    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        error "npm is not available"
        exit 1
    fi
    success "npm is available"

    # Check if the application directory exists
    if [[ ! -d "$APP_DIR" ]]; then
        error "Application directory not found: $APP_DIR"
        exit 1
    fi
    success "Application directory found"

    # Check if the service script exists
    if [[ ! -f "$APP_DIR/service/service-main.js" ]]; then
        error "Service script not found: $APP_DIR/service/service-main.js"
        exit 1
    fi
    success "Service script found"
}

setup_user_permissions() {
    log "Setting up user permissions..."

    # Create user if it doesn't exist
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/false "$SERVICE_USER"
        success "Created user: $SERVICE_USER"
    else
        success "User already exists: $SERVICE_USER"
    fi

    # Add user to required groups for printer access
    local groups=("lp" "dialout" "plugdev")
    for group in "${groups[@]}"; do
        if getent group "$group" > /dev/null; then
            usermod -a -G "$group" "$SERVICE_USER"
            success "Added $SERVICE_USER to group: $group"
        else
            warning "Group $group not found, skipping"
        fi
    done

    # Set ownership of application directory
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR"
    success "Set ownership of application directory"

    # Set execute permissions on service script
    chmod +x "$APP_DIR/service/service-main.js"
    success "Set execute permissions on service script"
}

setup_usb_access() {
    log "Setting up USB device access..."

    # Create udev rule for USB printer access
    local udev_rule="/etc/udev/rules.d/99-printermaster-usb.rules"
    cat > "$udev_rule" << 'EOF'
# PrinterMaster USB Printer Access Rules
# Allow access to USB printers for the printermaster service

# USB printers
SUBSYSTEM=="usb", ENV{DEVTYPE}=="usb_device", GROUP="lp", MODE="0664"
SUBSYSTEM=="usb", ENV{DEVTYPE}=="usb_interface", GROUP="lp", MODE="0664"

# USB to serial adapters (common in thermal printers)
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", GROUP="dialout", MODE="0664"
SUBSYSTEM=="tty", ATTRS{idVendor}=="067b", ATTRS{idProduct}=="2303", GROUP="dialout", MODE="0664"

# Common thermal printer vendor IDs
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", GROUP="lp", MODE="0664"  # Epson
SUBSYSTEM=="usb", ATTR{idVendor}=="0922", GROUP="lp", MODE="0664"  # Star Micronics
SUBSYSTEM=="usb", ATTR{idVendor}=="1fc9", GROUP="lp", MODE="0664"  # NXP
SUBSYSTEM=="usb", ATTR{idVendor}=="20d1", GROUP="lp", MODE="0664"  # RONGTA
EOF

    # Set proper permissions
    chmod 644 "$udev_rule"
    success "Created udev rule: $udev_rule"

    # Reload udev rules
    udevadm control --reload-rules
    udevadm trigger
    success "Reloaded udev rules"
}

install_service() {
    log "Installing systemd service..."

    # Copy service file to systemd directory
    local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
    cp "$APP_DIR/config/printermaster.service" "$service_file"

    # Update paths in service file if needed
    sed -i "s|/home/admin/restaurant-platform-remote-v2/PrinterMasterv2|$APP_DIR|g" "$service_file"
    sed -i "s|User=admin|User=$SERVICE_USER|g" "$service_file"
    sed -i "s|Group=admin|Group=$SERVICE_GROUP|g" "$service_file"

    success "Copied service file to systemd"

    # Reload systemd daemon
    systemctl daemon-reload
    success "Reloaded systemd daemon"

    # Enable service
    systemctl enable "$SERVICE_NAME.service"
    success "Enabled service for auto-start"
}

setup_firewall() {
    log "Setting up firewall rules..."

    # Check if ufw is available and active
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            ufw allow "$SERVICE_PORT/tcp" comment "PrinterMaster Service"
            success "Added firewall rule for port $SERVICE_PORT"
        else
            warning "UFW is installed but not active"
        fi
    else
        # Check if firewalld is available
        if command -v firewall-cmd &> /dev/null; then
            if systemctl is-active --quiet firewalld; then
                firewall-cmd --permanent --add-port="$SERVICE_PORT/tcp"
                firewall-cmd --reload
                success "Added firewall rule for port $SERVICE_PORT (firewalld)"
            else
                warning "firewalld is installed but not active"
            fi
        else
            warning "No supported firewall detected"
        fi
    fi
}

setup_log_rotation() {
    log "Setting up log rotation..."

    # Create logrotate configuration
    local logrotate_config="/etc/logrotate.d/$SERVICE_NAME"
    cat > "$logrotate_config" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 $SERVICE_USER $SERVICE_GROUP
}
EOF

    chmod 644 "$logrotate_config"
    success "Created logrotate configuration"

    # Test logrotate configuration
    if logrotate -d "$logrotate_config" &> /dev/null; then
        success "Logrotate configuration is valid"
    else
        warning "Logrotate configuration validation failed"
    fi
}

create_health_monitor() {
    log "Setting up health monitoring..."

    # Create health check script
    local health_script="/usr/local/bin/printermaster-health-check"
    cat > "$health_script" << 'EOF'
#!/bin/bash

# PrinterMaster Health Check Script
# This script checks the health of the PrinterMaster service and restarts it if necessary

SERVICE_NAME="printermaster"
HEALTH_URL="http://localhost:8182/health"
LOG_FILE="/var/log/printermaster-health.log"

log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if service is running
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    log_message "ERROR: Service $SERVICE_NAME is not running"
    systemctl start "$SERVICE_NAME"
    log_message "INFO: Attempted to start $SERVICE_NAME"
    exit 1
fi

# Check health endpoint
if ! curl -f -s --max-time 10 "$HEALTH_URL" > /dev/null 2>&1; then
    log_message "ERROR: Health check failed for $SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"
    log_message "INFO: Restarted $SERVICE_NAME due to health check failure"
    exit 1
fi

log_message "INFO: Health check passed for $SERVICE_NAME"
exit 0
EOF

    chmod +x "$health_script"
    success "Created health check script: $health_script"

    # Create systemd timer for health checks (optional)
    local timer_file="/etc/systemd/system/printermaster-health.timer"
    cat > "$timer_file" << 'EOF'
[Unit]
Description=PrinterMaster Health Check Timer
Requires=printermaster-health.service

[Timer]
OnCalendar=*:0/5  # Every 5 minutes
Persistent=true

[Install]
WantedBy=timers.target
EOF

    local timer_service="/etc/systemd/system/printermaster-health.service"
    cat > "$timer_service" << EOF
[Unit]
Description=PrinterMaster Health Check
Type=oneshot

[Service]
ExecStart=$health_script
User=root
EOF

    systemctl daemon-reload
    systemctl enable printermaster-health.timer
    success "Created health monitoring timer"
}

install_dependencies() {
    log "Installing Node.js dependencies..."

    # Change to application directory
    cd "$APP_DIR"

    # Install production dependencies
    npm install --production
    success "Installed Node.js dependencies"

    # Install PM2 globally if not present
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        success "Installed PM2 globally"
    else
        success "PM2 is already installed"
    fi
}

test_installation() {
    log "Testing service installation..."

    # Start the service
    systemctl start "$SERVICE_NAME"
    success "Started service"

    # Wait for service to initialize
    sleep 5

    # Check if service is running
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        success "Service is running"
    else
        error "Service failed to start"
        systemctl status "$SERVICE_NAME"
        exit 1
    fi

    # Test health endpoint
    if curl -f -s --max-time 10 "http://localhost:$SERVICE_PORT/health" > /dev/null; then
        success "Health endpoint is responding"
    else
        warning "Health endpoint is not responding (may need time to initialize)"
    fi

    # Show service status
    systemctl status "$SERVICE_NAME" --no-pager
}

display_summary() {
    echo
    success "PrinterMaster systemd service setup completed!"
    echo
    echo "📋 Service Management Commands:"
    echo "  Start:   sudo systemctl start $SERVICE_NAME"
    echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  Status:  sudo systemctl status $SERVICE_NAME"
    echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo
    echo "🌐 Service Endpoints:"
    echo "  Health:  http://localhost:$SERVICE_PORT/health"
    echo "  Metrics: http://localhost:$SERVICE_PORT/metrics"
    echo "  API:     http://localhost:$SERVICE_PORT/"
    echo
    echo "📁 Important Files:"
    echo "  Service: /etc/systemd/system/$SERVICE_NAME.service"
    echo "  Logs:    $LOG_DIR/"
    echo "  Health:  /usr/local/bin/printermaster-health-check"
    echo
    echo "🔧 Next Steps:"
    echo "  1. Configure your license in the Electron app"
    echo "  2. Test printer connectivity"
    echo "  3. Monitor service logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "  4. Enable health monitoring: sudo systemctl start printermaster-health.timer"
}

main() {
    log "Starting PrinterMaster systemd service setup..."

    check_root
    check_dependencies
    setup_user_permissions
    setup_usb_access
    install_dependencies
    install_service
    setup_firewall
    setup_log_rotation
    create_health_monitor
    test_installation
    display_summary

    success "Setup completed successfully!"
}

# Run main function
main "$@"