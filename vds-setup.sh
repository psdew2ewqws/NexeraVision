#!/bin/bash
# VDS Nexara Setup Script
# IP: 31.57.166.18
# This script will set up Remote Desktop + Web Panel + Docker

set -e

SERVER_IP="31.57.166.18"
SERVER_USER="root"
SERVER_PASS="qMRF2Y5Z44fBP1kANKcJHX61"

echo "🚀 Installing sshpass for automated connection..."
sudo apt-get update
sudo apt-get install -y sshpass

echo "📡 Connecting to VDS and running setup..."

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'bash -s' << 'ENDSSH'

echo "======================================"
echo "🚀 VDS Nexara Setup Starting..."
echo "======================================"

# Update system
echo "📦 Updating system packages..."
apt update && DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Install xRDP for Remote Desktop
echo "🖥️  Installing Remote Desktop (xRDP)..."
DEBIAN_FRONTEND=noninteractive apt install -y xrdp xfce4 xfce4-goodies

# Configure xRDP
echo "⚙️  Configuring xRDP..."
systemctl enable xrdp
systemctl start xrdp

# Allow root login for xRDP
sed -i 's/allowed_users=console/allowed_users=anybody/' /etc/X11/Xwrapper.config 2>/dev/null || echo "allowed_users=anybody" > /etc/X11/Xwrapper.config

# Install Cockpit
echo "📊 Installing Cockpit web panel..."
DEBIAN_FRONTEND=noninteractive apt install -y cockpit cockpit-docker cockpit-podman

# Enable Cockpit
systemctl enable --now cockpit.socket

# Install essentials
echo "🔧 Installing essential tools..."
DEBIAN_FRONTEND=noninteractive apt install -y git curl wget nano vim ufw

# Configure firewall
echo "🔒 Configuring firewall..."
ufw --force reset
ufw allow 22/tcp      # SSH
ufw allow 3389/tcp    # RDP
ufw allow 9090/tcp    # Cockpit
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # Frontend
ufw allow 3001/tcp    # Backend
ufw allow 5432/tcp    # PostgreSQL
echo "y" | ufw enable

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
DEBIAN_FRONTEND=noninteractive apt install -y docker-compose

# Install PostgreSQL client
echo "🐘 Installing PostgreSQL client..."
DEBIAN_FRONTEND=noninteractive apt install -y postgresql-client

# Install Node.js (for restaurant platform)
echo "📗 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
DEBIAN_FRONTEND=noninteractive apt install -y nodejs

# Create project directory
echo "📁 Creating project directories..."
mkdir -p /home/restaurant-platform
mkdir -p /var/backups/postgres

# Set up Docker to start on boot
systemctl enable docker

# Check services status
echo ""
echo "======================================"
echo "✅ Installation Complete!"
echo "======================================"
echo ""
echo "📊 Service Status:"
systemctl is-active xrdp && echo "  ✅ xRDP: Running" || echo "  ❌ xRDP: Failed"
systemctl is-active cockpit && echo "  ✅ Cockpit: Running" || echo "  ❌ Cockpit: Failed"
systemctl is-active docker && echo "  ✅ Docker: Running" || echo "  ❌ Docker: Failed"
ufw status | grep -q "Status: active" && echo "  ✅ Firewall: Active" || echo "  ❌ Firewall: Inactive"

echo ""
echo "🖥️  Remote Desktop (RDP):"
echo "  Computer: 31.57.166.18:3389"
echo "  Username: root"
echo "  Password: qMRF2Y5Z44fBP1kANKcJHX61"
echo ""
echo "📊 Cockpit Web Panel:"
echo "  URL: https://31.57.166.18:9090"
echo "  Username: root"
echo "  Password: qMRF2Y5Z44fBP1kANKcJHX61"
echo ""
echo "🐳 Docker version:"
docker --version
echo ""
echo "💾 Disk usage:"
df -h / | tail -1
echo ""
echo "🧠 Memory usage:"
free -h | grep Mem
echo ""

ENDSSH

echo ""
echo "======================================"
echo "✅ VDS Setup Complete!"
echo "======================================"
echo ""
echo "You can now connect via:"
echo "1. Remote Desktop: Open 'Remote Desktop Connection' on Windows"
echo "   Computer: 31.57.166.18"
echo "   Username: root"
echo ""
echo "2. Web Panel: Open browser"
echo "   https://31.57.166.18:9090"
echo ""
