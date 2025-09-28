#!/bin/bash

# PrinterMaster v2 - Production Deployment Script
# Enterprise-grade deployment automation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV="${DEPLOY_ENV:-production}"
PROJECT_NAME="printer-master-v2"
BACKUP_RETENTION_DAYS="30"
HEALTH_CHECK_TIMEOUT="300"
DEPLOYMENT_TIMEOUT="600"

# Deployment paths
DEPLOY_ROOT="/opt/printer-master-v2"
BACKUP_DIR="/opt/printer-master-v2/backups"
LOG_DIR="/opt/printer-master-v2/logs"
CONFIG_DIR="/opt/printer-master-v2/config"

echo -e "${BLUE}🚀 PrinterMaster v2 - Production Deployment${NC}"
echo -e "${BLUE}=============================================${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${YELLOW}📋 Step $1: $2${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service health
wait_for_health() {
    local service_name="$1"
    local health_url="$2"
    local timeout="$3"
    local start_time=$(date +%s)
    
    echo "Waiting for $service_name to be healthy..."
    
    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            print_error "$service_name health check timeout after ${timeout}s"
        fi
        
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            break
        fi
        
        echo "Waiting for $service_name... (${elapsed}s)"
        sleep 5
    done
}

# Function to create backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="${PROJECT_NAME}_backup_${timestamp}"
    
    echo "Creating backup: $backup_name"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker compose -f deployment/docker/docker-compose.production.yml ps postgres | grep -q "running"; then
        docker compose -f deployment/docker/docker-compose.production.yml exec -T postgres \
            pg_dump -U printer_prod printer_master_v2_prod > "$BACKUP_DIR/${backup_name}_database.sql"
        print_success "Database backup created"
    fi
    
    # Backup configuration
    if [ -d "$CONFIG_DIR" ]; then
        tar -czf "$BACKUP_DIR/${backup_name}_config.tar.gz" -C "$CONFIG_DIR" .
        print_success "Configuration backup created"
    fi
    
    # Backup application data
    if docker volume ls | grep -q "${PROJECT_NAME}_app_uploads"; then
        docker run --rm -v "${PROJECT_NAME}_app_uploads:/data" -v "$BACKUP_DIR:/backup" \
            alpine tar -czf "/backup/${backup_name}_uploads.tar.gz" -C /data .
        print_success "Application data backup created"
    fi
}

# Function to cleanup old backups
cleanup_backups() {
    echo "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "*.sql" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    print_success "Old backups cleaned up"
}

# Function to check prerequisites
check_prerequisites() {
    echo "Checking deployment prerequisites..."
    
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root or with sudo"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "git" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            print_error "Required command not found: $cmd"
        fi
    done
    
    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon is not running"
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space=$(df /opt | tail -1 | awk '{print $4}')
    local min_space=5242880  # 5GB in KB
    if [ "$available_space" -lt "$min_space" ]; then
        print_error "Insufficient disk space. Required: 5GB, Available: $(($available_space/1024/1024))GB"
    fi
    
    print_success "Prerequisites check passed"
}

# Function to setup environment files
setup_environment() {
    echo "Setting up environment configuration..."
    
    # Create config directory
    mkdir -p "$CONFIG_DIR"
    
    # Create environment file if it doesn't exist
    if [ ! -f "$CONFIG_DIR/.env.production" ]; then
        cat > "$CONFIG_DIR/.env.production" << EOF
# PrinterMaster v2 Production Configuration
# Generated on $(date)

# Database
DB_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=printer_master_v2_prod
POSTGRES_USER=printer_prod

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# JWT
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d

# API
CORS_ORIGIN=*
LOG_LEVEL=info
API_RATE_LIMIT=100
FILE_UPLOAD_MAX_SIZE=10485760

# Encryption
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Monitoring
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL=60000

# Grafana (if using monitoring)
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# License Server
LICENSE_SERVER_URL=https://license.restaurant-platform.com
LICENSE_VALIDATION_KEY=your-license-validation-key
EOF
        print_success "Environment configuration created"
    else
        print_success "Environment configuration already exists"
    fi
    
    # Set proper permissions
    chmod 600 "$CONFIG_DIR/.env.production"
    chown root:root "$CONFIG_DIR/.env.production"
}

# Function to create systemd service
create_systemd_service() {
    echo "Creating systemd service..."
    
    cat > "/etc/systemd/system/${PROJECT_NAME}.service" << EOF
[Unit]
Description=PrinterMaster v2 - Enterprise Printer Management
Requires=docker.service
After=docker.service
StartLimitBurst=3
StartLimitInterval=60s

[Service]
Type=notify
Restart=always
RestartSec=30
TimeoutStartSec=300
TimeoutStopSec=120
WorkingDirectory=${DEPLOY_ROOT}
Environment=COMPOSE_FILE=deployment/docker/docker-compose.production.yml
Environment=COMPOSE_PROJECT_NAME=${PROJECT_NAME}
EnvironmentFile=${CONFIG_DIR}/.env.production

# Pre-start checks
ExecStartPre=/usr/bin/docker-compose -f deployment/docker/docker-compose.production.yml pull
ExecStartPre=/usr/bin/docker-compose -f deployment/docker/docker-compose.production.yml build

# Start services
ExecStart=/usr/bin/docker-compose -f deployment/docker/docker-compose.production.yml up --remove-orphans

# Stop services
ExecStop=/usr/bin/docker-compose -f deployment/docker/docker-compose.production.yml down

# Reload configuration
ExecReload=/usr/bin/docker-compose -f deployment/docker/docker-compose.production.yml restart

# Security settings
User=root
Group=docker
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DEPLOY_ROOT} ${LOG_DIR} ${BACKUP_DIR}

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "${PROJECT_NAME}.service"
    print_success "Systemd service created and enabled"
}

# Function to setup log rotation
setup_log_rotation() {
    echo "Setting up log rotation..."
    
    cat > "/etc/logrotate.d/${PROJECT_NAME}" << EOF
${LOG_DIR}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill --signal="USR1" \$(docker ps -q --filter name=${PROJECT_NAME}) 2>/dev/null || true
    endscript
}
EOF
    
    print_success "Log rotation configured"
}

# Function to setup monitoring
setup_monitoring() {
    echo "Setting up monitoring and alerting..."
    
    # Create monitoring configuration
    mkdir -p "$CONFIG_DIR/monitoring"
    
    # Prometheus configuration
    cat > "$CONFIG_DIR/monitoring/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'printer-master-backend'
    static_configs:
      - targets: ['backend:9090']
    scrape_interval: 30s
    metrics_path: /metrics

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 60s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 60s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
EOF
    
    # Health check script
    cat > "$CONFIG_DIR/health-check.sh" << 'EOF'
#!/bin/bash
# PrinterMaster v2 Health Check Script

HEALTH_URL="http://localhost:3001/health"
ALERT_EMAIL="admin@restaurant-platform.com"
LOG_FILE="/opt/printer-master-v2/logs/health-check.log"

check_health() {
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$HEALTH_URL")
    
    if [ "$response" = "200" ]; then
        echo "$(date): Health check PASSED" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Health check FAILED (HTTP $response)" >> "$LOG_FILE"
        cat /tmp/health_response >> "$LOG_FILE"
        return 1
    fi
}

send_alert() {
    local message="$1"
    echo "PrinterMaster v2 Alert: $message" | mail -s "PrinterMaster v2 Health Alert" "$ALERT_EMAIL"
}

# Perform health check
if ! check_health; then
    send_alert "Health check failed. Please investigate immediately."
    exit 1
fi
EOF
    
    chmod +x "$CONFIG_DIR/health-check.sh"
    
    # Setup cron job for health checks
    echo "*/5 * * * * $CONFIG_DIR/health-check.sh" | crontab -
    
    print_success "Monitoring and alerting configured"
}

# Function to deploy application
deploy_application() {
    echo "Deploying PrinterMaster v2..."
    
    # Navigate to project directory
    cd "$DEPLOY_ROOT"
    
    # Pull latest changes (if deploying from git)
    if [ -d ".git" ]; then
        git fetch origin
        git reset --hard origin/main
        print_success "Source code updated"
    fi
    
    # Load environment variables
    set -a
    source "$CONFIG_DIR/.env.production"
    set +a
    
    # Create necessary directories
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    
    # Pull and build images
    docker-compose -f deployment/docker/docker-compose.production.yml pull
    docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache
    
    # Start services
    docker-compose -f deployment/docker/docker-compose.production.yml up -d
    
    print_success "Application deployed"
}

# Function to verify deployment
verify_deployment() {
    echo "Verifying deployment..."
    
    # Wait for services to be healthy
    wait_for_health "Backend API" "http://localhost:3001/health" "$HEALTH_CHECK_TIMEOUT"
    
    # Check if all containers are running
    local failed_containers=$(docker-compose -f deployment/docker/docker-compose.production.yml ps --services --filter "status=exited")
    if [ -n "$failed_containers" ]; then
        print_error "Failed containers detected: $failed_containers"
    fi
    
    # Test API endpoints
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health)
    if [ "$api_response" != "200" ]; then
        print_error "API health check failed (HTTP $api_response)"
    fi
    
    # Check database connectivity
    if ! docker-compose -f deployment/docker/docker-compose.production.yml exec -T postgres \
         psql -U printer_prod -d printer_master_v2_prod -c "SELECT 1;" > /dev/null 2>&1; then
        print_error "Database connectivity check failed"
    fi
    
    print_success "Deployment verification completed"
}

# Function to setup SSL certificates (Let's Encrypt)
setup_ssl() {
    echo "Setting up SSL certificates..."
    
    # Install certbot if not present
    if ! command_exists certbot; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Generate certificates (interactive - would need domain configuration)
    # This is a placeholder - actual implementation would depend on domain setup
    echo "SSL setup requires manual domain configuration"
    echo "Run: certbot --nginx -d your-domain.com"
    
    print_success "SSL setup guidance provided"
}

# Main deployment process
main() {
    print_step "1" "Checking Prerequisites"
    check_prerequisites
    
    print_step "2" "Creating Backup"
    create_backup
    cleanup_backups
    
    print_step "3" "Setting Up Environment"
    setup_environment
    
    print_step "4" "Creating System Services"
    create_systemd_service
    setup_log_rotation
    
    print_step "5" "Setting Up Monitoring"
    setup_monitoring
    
    print_step "6" "Deploying Application"
    deploy_application
    
    print_step "7" "Verifying Deployment"
    verify_deployment
    
    print_step "8" "SSL Setup (Optional)"
    setup_ssl
    
    echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
    echo -e "${GREEN}======================${NC}"
    echo -e "\n${BLUE}Access Points:${NC}"
    echo -e "- API: ${YELLOW}http://localhost:3001${NC}"
    echo -e "- Health: ${YELLOW}http://localhost:3001/health${NC}"
    echo -e "- API Docs: ${YELLOW}http://localhost:3001/api/docs${NC}"
    echo -e "- Metrics: ${YELLOW}http://localhost:9090${NC} (if enabled)"
    echo -e "- Grafana: ${YELLOW}http://localhost:3000${NC} (if enabled)"
    
    echo -e "\n${BLUE}Management Commands:${NC}"
    echo -e "- Start: ${YELLOW}systemctl start ${PROJECT_NAME}${NC}"
    echo -e "- Stop: ${YELLOW}systemctl stop ${PROJECT_NAME}${NC}"
    echo -e "- Status: ${YELLOW}systemctl status ${PROJECT_NAME}${NC}"
    echo -e "- Logs: ${YELLOW}journalctl -u ${PROJECT_NAME} -f${NC}"
    echo -e "- Backup: ${YELLOW}$CONFIG_DIR/health-check.sh${NC}"
    
    echo -e "\n${YELLOW}📖 Next Steps:${NC}"
    echo -e "1. Configure domain and SSL certificates"
    echo -e "2. Set up monitoring alerts"
    echo -e "3. Test desktop client connections"
    echo -e "4. Configure backup automation"
    echo -e "5. Review security settings"
    
    echo -e "\n${GREEN}Deployment successful! 🚀${NC}"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        create_backup
        ;;
    "health")
        "$CONFIG_DIR/health-check.sh"
        ;;
    "update")
        print_step "1" "Creating Backup"
        create_backup
        print_step "2" "Updating Application"
        deploy_application
        print_step "3" "Verifying Update"
        verify_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|update}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full production deployment"
        echo "  backup  - Create system backup"
        echo "  health  - Run health check"
        echo "  update  - Update application"
        exit 1
        ;;
esac