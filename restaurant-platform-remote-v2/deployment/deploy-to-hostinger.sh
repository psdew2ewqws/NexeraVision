#!/bin/bash

# Hostinger Deployment Script for nexaratech.io
# This script automates backend deployment to Hostinger VPS

set -e  # Exit on any error

echo "🚀 Starting deployment to Hostinger (nexaratech.io)..."

# Configuration
DOMAIN="api.nexaratech.io"
APP_DIR="/var/www/nexaratech/backend"
APP_NAME="nexaratech-backend"
NODE_VERSION="18"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running on VPS
check_environment() {
    print_info "Checking environment..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js $NODE_VERSION first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install npm first."
        exit 1
    fi

    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 not found. Installing PM2..."
        sudo npm install -g pm2
    fi

    print_success "Environment check passed"
}

# Create application directory
create_directories() {
    print_info "Creating application directories..."

    sudo mkdir -p $APP_DIR
    sudo mkdir -p /var/log/nexaratech

    print_success "Directories created"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."

    cd $APP_DIR
    npm install --production

    print_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."

    cd $APP_DIR
    npx prisma generate
    npx prisma migrate deploy

    print_success "Migrations completed"
}

# Build application
build_app() {
    print_info "Building application..."

    cd $APP_DIR
    npm run build

    print_success "Build completed"
}

# Start/Restart PM2
start_app() {
    print_info "Starting application with PM2..."

    cd $APP_DIR

    # Check if app is already running
    if pm2 list | grep -q $APP_NAME; then
        print_info "Restarting existing application..."
        pm2 restart $APP_NAME
    else
        print_info "Starting new application..."
        pm2 start dist/main.js --name $APP_NAME
        pm2 save
    fi

    print_success "Application started"
}

# Configure Nginx
configure_nginx() {
    print_info "Checking Nginx configuration..."

    if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
        print_success "Nginx configuration exists"
    else
        print_error "Nginx configuration not found. Please run manual setup first."
        exit 1
    fi

    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    print_success "Nginx reloaded"
}

# Health check
health_check() {
    print_info "Performing health check..."

    sleep 5  # Wait for app to start

    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed. Check logs with: pm2 logs $APP_NAME"
        exit 1
    fi
}

# Show status
show_status() {
    echo ""
    echo "================================================"
    echo "🎉 Deployment completed successfully!"
    echo "================================================"
    echo ""
    echo "Application: $APP_NAME"
    echo "Domain: https://$DOMAIN"
    echo "Webhook URL: https://$DOMAIN/api/v1/delivery/webhook/careem"
    echo ""
    echo "Useful commands:"
    echo "  pm2 status                    - Check application status"
    echo "  pm2 logs $APP_NAME            - View logs"
    echo "  pm2 restart $APP_NAME         - Restart application"
    echo "  pm2 monit                     - Real-time monitoring"
    echo ""
    echo "Nginx logs:"
    echo "  sudo tail -f /var/log/nginx/$DOMAIN-access.log"
    echo "  sudo tail -f /var/log/nginx/careem-webhook.log"
    echo ""
}

# Main deployment flow
main() {
    echo "================================================"
    echo "🚀 Hostinger Deployment Script"
    echo "================================================"
    echo ""

    check_environment
    create_directories
    install_dependencies
    run_migrations
    build_app
    start_app
    configure_nginx
    health_check
    show_status
}

# Run main function
main
