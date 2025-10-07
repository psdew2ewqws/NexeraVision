#!/bin/bash
# Deployment script for merged platform
# Usage: ./05-deploy.sh [development|staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-development}
RESTAURANT_DIR="/home/admin/restaurant-platform-remote-v2"
BACKEND_DIR="$RESTAURANT_DIR/backend"
FRONTEND_DIR="$RESTAURANT_DIR/frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo -e "${BLUE}Deploying to $ENVIRONMENT environment${NC}"
echo "================================================"

# Function to check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    # Check if backup exists
    if [ ! -d "/home/admin/backups" ] || [ -z "$(ls -A /home/admin/backups 2>/dev/null)" ]; then
        echo -e "${RED}❌ No backup found. Run ./01-backup.sh first${NC}"
        exit 1
    fi

    # Check if tests passed
    if [ -f "$RESTAURANT_DIR/scripts/migration/.test-results" ]; then
        if grep -q "FAILED" "$RESTAURANT_DIR/scripts/migration/.test-results"; then
            echo -e "${RED}❌ Tests failed. Fix issues before deployment${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  No test results found. Running tests...${NC}"
        ./04-run-tests.sh || exit 1
    fi

    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to deploy development environment
deploy_development() {
    echo -e "${BLUE}Deploying to development environment...${NC}"

    # 1. Run database migrations
    echo "Running database migrations..."
    psql -U postgres -d postgres -f 03-merge-database.sql

    # 2. Install backend dependencies
    echo "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install

    # 3. Build backend
    echo "Building backend..."
    npm run build 2>/dev/null || true

    # 4. Install frontend dependencies
    echo "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install

    # 5. Build frontend
    echo "Building frontend..."
    npm run build 2>/dev/null || true

    # 6. Start services
    echo "Starting services..."
    cd "$RESTAURANT_DIR"

    # Create PM2 ecosystem file
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: 'backend',
      script: '$BACKEND_DIR/dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:E\$\$athecode006@localhost:5432/postgres',
        JWT_SECRET: 'dev-secret-key',
        PORT: 3000
      }
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '$FRONTEND_DIR',
      env: {
        NODE_ENV: 'development',
        NEXT_PUBLIC_API_URL: 'http://localhost:3000'
      }
    }
  ]
};
EOF

    # Start with PM2
    pm2 delete all 2>/dev/null || true
    pm2 start ecosystem.config.js

    echo -e "${GREEN}✅ Development deployment complete${NC}"
}

# Function to deploy staging environment
deploy_staging() {
    echo -e "${BLUE}Deploying to staging environment...${NC}"

    # 1. Build Docker images
    echo "Building Docker images..."
    cd "$RESTAURANT_DIR"

    # Create docker-compose for staging
    cat > docker-compose.staging.yml <<EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: restaurant_staging
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - ./scripts/migration/03-merge-database.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - postgres_staging_data:/var/lib/postgresql/data
    networks:
      - staging

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgresql://postgres:\${DB_PASSWORD}@postgres:5432/restaurant_staging
      JWT_SECRET: \${JWT_SECRET}
    depends_on:
      - postgres
    ports:
      - "3000:3000"
    networks:
      - staging

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: staging
      NEXT_PUBLIC_API_URL: http://backend:3000
    depends_on:
      - backend
    ports:
      - "3001:3000"
    networks:
      - staging

volumes:
  postgres_staging_data:

networks:
  staging:
EOF

    # 2. Create Dockerfiles if not exist
    if [ ! -f "$BACKEND_DIR/Dockerfile" ]; then
        cat > "$BACKEND_DIR/Dockerfile" <<EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
EOF
    fi

    if [ ! -f "$FRONTEND_DIR/Dockerfile" ]; then
        cat > "$FRONTEND_DIR/Dockerfile" <<EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
EOF
    fi

    # 3. Deploy with Docker Compose
    echo "Starting staging services..."
    docker-compose -f docker-compose.staging.yml down 2>/dev/null || true
    docker-compose -f docker-compose.staging.yml up -d --build

    # 4. Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 10

    # 5. Run health checks
    echo "Running health checks..."
    curl -f http://localhost:3000/api/health || exit 1
    curl -f http://localhost:3001 || exit 1

    echo -e "${GREEN}✅ Staging deployment complete${NC}"
}

# Function to deploy production environment
deploy_production() {
    echo -e "${BLUE}Deploying to production environment...${NC}"

    # Safety check
    echo -e "${YELLOW}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
    read -p "Are you sure? (type 'yes' to continue): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 1
    fi

    # 1. Create production backup
    echo "Creating production backup..."
    ./01-backup.sh

    # 2. Enable maintenance mode
    echo "Enabling maintenance mode..."
    cat > "$FRONTEND_DIR/public/maintenance.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Maintenance</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>System Maintenance</h1>
    <p>We're upgrading our systems. We'll be back shortly!</p>
    <p>Expected completion: $(date -d '+30 minutes' '+%H:%M %Z')</p>
</body>
</html>
EOF

    # 3. Run database migrations
    echo "Running database migrations..."
    psql -U postgres -d postgres -f 03-merge-database.sql

    # 4. Build production assets
    echo "Building production assets..."
    cd "$BACKEND_DIR"
    NODE_ENV=production npm run build

    cd "$FRONTEND_DIR"
    NODE_ENV=production npm run build

    # 5. Deploy using production configuration
    echo "Deploying production services..."

    # Create production PM2 ecosystem file
    cat > "$RESTAURANT_DIR/ecosystem.production.js" <<EOF
module.exports = {
  apps: [
    {
      name: 'backend-prod',
      script: '$BACKEND_DIR/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        PORT: 3000
      },
      error_file: '$RESTAURANT_DIR/logs/backend-error.log',
      out_file: '$RESTAURANT_DIR/logs/backend-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'frontend-prod',
      script: 'npm',
      args: 'start',
      cwd: '$FRONTEND_DIR',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: process.env.API_URL
      },
      error_file: '$RESTAURANT_DIR/logs/frontend-error.log',
      out_file: '$RESTAURANT_DIR/logs/frontend-out.log'
    }
  ]
};
EOF

    # 6. Restart services with zero downtime
    pm2 reload ecosystem.production.js --update-env

    # 7. Run post-deployment checks
    echo "Running post-deployment checks..."
    sleep 5

    # Health checks
    curl -f http://localhost:3000/api/health || exit 1
    curl -f http://localhost:3001 || exit 1

    # 8. Disable maintenance mode
    rm -f "$FRONTEND_DIR/public/maintenance.html"

    # 9. Clear caches
    echo "Clearing caches..."
    npm cache clean --force 2>/dev/null || true

    echo -e "${GREEN}✅ Production deployment complete${NC}"
}

# Function to run post-deployment tasks
post_deployment() {
    echo "Running post-deployment tasks..."

    # 1. Update documentation
    echo "Updating documentation..."
    cat > "$RESTAURANT_DIR/DEPLOYMENT.md" <<EOF
# Deployment Information

**Environment**: $ENVIRONMENT
**Deployed at**: $(date)
**Version**: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')

## Services Status
- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- Database: PostgreSQL on localhost:5432

## Health Check URLs
- Backend: http://localhost:3000/api/health
- Integration: http://localhost:3000/api/integration/health
- Frontend: http://localhost:3001

## Logs Location
- Backend: $RESTAURANT_DIR/logs/backend-*.log
- Frontend: $RESTAURANT_DIR/logs/frontend-*.log

## Rollback Instructions
Run: ./scripts/migration/rollback.sh
EOF

    # 2. Set up monitoring
    echo "Setting up monitoring..."

    # Create monitoring script
    cat > "$RESTAURANT_DIR/scripts/monitor-health.sh" <<'EOF'
#!/bin/bash
# Health monitoring script

while true; do
    # Check backend
    if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "$(date): Backend unhealthy" >> /var/log/platform-health.log
    fi

    # Check frontend
    if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "$(date): Frontend unhealthy" >> /var/log/platform-health.log
    fi

    sleep 60
done
EOF

    chmod +x "$RESTAURANT_DIR/scripts/monitor-health.sh"

    # 3. Send notification
    echo -e "${GREEN}Deployment successful!${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Backend: http://localhost:3000"
    echo "Frontend: http://localhost:3001"
}

# Main deployment flow
main() {
    # Check prerequisites
    check_prerequisites

    # Deploy based on environment
    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
            echo "Usage: ./05-deploy.sh [development|staging|production]"
            exit 1
            ;;
    esac

    # Run post-deployment tasks
    post_deployment

    echo ""
    echo "================================================"
    echo -e "${GREEN}✅ Deployment Complete!${NC}"
    echo "================================================"
    echo "Environment: $ENVIRONMENT"
    echo "Time: $(date)"
    echo "================================================"
}

# Run main function
main