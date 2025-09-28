#!/bin/bash

# Integration Platform Setup Script
# This script sets up the complete integration platform environment

set -e

echo "🚀 Integration Platform Setup"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_requirements() {
    log_info "Checking system requirements..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi

    log_success "System requirements check passed"
}

# Setup environment files
setup_environment() {
    log_info "Setting up environment configuration..."

    # Copy .env.example to .env if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success "Created .env from .env.example"
        else
            log_warning ".env.example not found, creating basic .env"
            cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://postgres:E\$\$athecode006@localhost:5433/integration_platform
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=E\$\$athecode006
DB_NAME=integration_platform

# Redis Configuration
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=4000
API_PREFIX=api/v1

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Node Environment
NODE_ENV=development
EOL
        fi
    else
        log_info ".env file already exists, skipping..."
    fi

    # Setup backend .env
    if [ ! -f backend/.env ]; then
        cp .env backend/.env
        log_success "Created backend/.env"
    fi

    # Setup frontend .env.local
    if [ ! -f frontend/.env.local ]; then
        cat > frontend/.env.local << EOL
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_APP_NAME=Integration Platform
EOL
        log_success "Created frontend/.env.local"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing project dependencies..."

    # Root dependencies
    if [ -f package.json ]; then
        log_info "Installing root dependencies..."
        npm install
        log_success "Root dependencies installed"
    fi

    # Backend dependencies
    if [ -d backend ]; then
        log_info "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        log_success "Backend dependencies installed"
    fi

    # Frontend dependencies
    if [ -d frontend ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        log_success "Frontend dependencies installed"
    fi

    # Microservices dependencies
    for service in microservices/*/; do
        if [ -d "$service" ] && [ -f "${service}package.json" ]; then
            service_name=$(basename "$service")
            log_info "Installing $service_name dependencies..."
            cd "$service"
            npm install
            cd "../.."
            log_success "$service_name dependencies installed"
        fi
    done
}

# Setup database
setup_database() {
    log_info "Setting up database..."

    # Check if PostgreSQL is running
    if ! docker ps | grep -q postgres; then
        log_info "Starting PostgreSQL container..."
        docker-compose -f docker-compose.dev.yml up -d postgres

        # Wait for PostgreSQL to be ready
        log_info "Waiting for PostgreSQL to be ready..."
        sleep 10

        # Check if PostgreSQL is healthy
        for i in {1..30}; do
            if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
                break
            fi
            echo -n "."
            sleep 2
        done
        echo ""
        log_success "PostgreSQL is ready"
    fi

    # Run database setup script
    if [ -f database/setup-database.js ]; then
        log_info "Running database setup script..."
        cd database
        node setup-database.js
        cd ..
        log_success "Database setup completed"
    fi

    # Generate Prisma client and run migrations
    if [ -d backend ]; then
        log_info "Generating Prisma client and running migrations..."
        cd backend

        if [ -f prisma/schema.prisma ]; then
            npx prisma generate
            npx prisma migrate deploy --schema=prisma/schema.prisma
            log_success "Database migrations completed"
        fi

        cd ..
    fi
}

# Start services
start_services() {
    log_info "Starting all services..."

    # Start development services
    docker-compose -f docker-compose.dev.yml up -d

    log_success "All services started successfully!"
}

# Show service URLs
show_urls() {
    echo ""
    echo "🌐 Service URLs:"
    echo "================="
    echo "🖥️  Frontend:           http://localhost:3000"
    echo "🔧 API Gateway:        http://localhost:4000"
    echo "📚 API Documentation:  http://localhost:4000/api/v1/docs"
    echo "🗄️  pgAdmin:           http://localhost:5050"
    echo "📊 Redis Commander:    http://localhost:8081"
    echo ""
    echo "🔐 Default Credentials:"
    echo "========================"
    echo "pgAdmin:"
    echo "  Email: admin@integration-platform.com"
    echo "  Password: admin123"
    echo ""
    echo "Database:"
    echo "  Host: localhost:5433"
    echo "  Database: integration_platform"
    echo "  Username: postgres"
    echo "  Password: E\$\$athecode006"
    echo ""
}

# Health check
health_check() {
    log_info "Running health checks..."

    # Check if services are running
    services=("postgres" "redis" "api-gateway-dev" "frontend-dev")

    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            log_success "$service is running"
        else
            log_warning "$service is not running"
        fi
    done

    # Check if services are responding
    sleep 5

    # Check API Gateway
    if curl -f http://localhost:4000/health > /dev/null 2>&1; then
        log_success "API Gateway health check passed"
    else
        log_warning "API Gateway health check failed"
    fi

    # Check Frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed"
    fi
}

# Main setup process
main() {
    echo ""
    log_info "Starting Integration Platform setup process..."
    echo ""

    # Check requirements
    check_requirements

    # Setup environment
    setup_environment

    # Install dependencies
    install_dependencies

    # Setup database
    setup_database

    # Start services
    start_services

    # Wait a bit for services to start
    log_info "Waiting for services to start..."
    sleep 15

    # Run health checks
    health_check

    # Show URLs
    show_urls

    log_success "Integration Platform setup completed successfully! 🎉"
    echo ""
    log_info "To stop all services, run: docker-compose -f docker-compose.dev.yml down"
    log_info "To view logs, run: docker-compose -f docker-compose.dev.yml logs -f"
    echo ""
}

# Handle script interruption
cleanup() {
    echo ""
    log_warning "Setup interrupted. Cleaning up..."
    docker-compose -f docker-compose.dev.yml down > /dev/null 2>&1 || true
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if running from correct directory
if [ ! -f docker-compose.yml ] && [ ! -f docker-compose.dev.yml ]; then
    log_error "Please run this script from the integration-platform root directory"
    exit 1
fi

# Run main setup
main