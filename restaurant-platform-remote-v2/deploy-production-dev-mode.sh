#!/bin/bash

# Production Deployment Script for Restaurant Platform
# Deploys in development mode to avoid build issues
# Server: 31.57.166.18
# User: root

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server configuration
PROD_SERVER="31.57.166.18"
PROD_USER="root"
PROD_PASSWORD="qMRF2Y5Z44fBP1kANKcJHX61"
DEPLOY_PATH="/var/www/restaurant-platform"
DB_NAME="restaurant_platform_prod"
DB_USER="restaurant_user"
DB_PASSWORD="E\$\$athecode006"

# Function to run SSH commands
run_ssh() {
    sshpass -p "${PROD_PASSWORD}" ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_SERVER} "$1"
}

# Function to copy files
copy_files() {
    sshpass -p "${PROD_PASSWORD}" rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'dist' \
        --exclude '.git' \
        --exclude '*.log' \
        "$1" ${PROD_USER}@${PROD_SERVER}:"$2"
}

echo -e "${GREEN}Starting Restaurant Platform Deployment...${NC}"

# Step 1: Create deployment directory on production
echo -e "${YELLOW}Step 1: Creating deployment directory...${NC}"
run_ssh "mkdir -p ${DEPLOY_PATH}/{backend,frontend}"
echo -e "${GREEN}✓ Directory created${NC}"

# Step 2: Copy backend files
echo -e "${YELLOW}Step 2: Copying backend files...${NC}"
copy_files "./backend/" "${DEPLOY_PATH}/backend/"
echo -e "${GREEN}✓ Backend files copied${NC}"

# Step 3: Copy frontend files
echo -e "${YELLOW}Step 3: Copying frontend files...${NC}"
copy_files "./frontend/" "${DEPLOY_PATH}/frontend/"
echo -e "${GREEN}✓ Frontend files copied${NC}"

# Step 4: Create environment files
echo -e "${YELLOW}Step 4: Creating environment files...${NC}"

# Backend .env
run_ssh "cat > ${DEPLOY_PATH}/backend/.env << 'EOF'
# Database
DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public\"

# Application
NODE_ENV=production
PORT=3001

# JWT
JWT_SECRET=prod_jwt_secret_$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://31.57.166.18,http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/restaurant-platform/uploads

# Redis (if needed)
REDIS_HOST=localhost
REDIS_PORT=6379

# PrinterMaster
PRINTER_MASTER_URL=http://localhost:8182
EOF"

# Frontend .env.local
run_ssh "cat > ${DEPLOY_PATH}/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://31.57.166.18/api/v1
NEXT_PUBLIC_WS_URL=ws://31.57.166.18
NODE_ENV=production
EOF"

echo -e "${GREEN}✓ Environment files created${NC}"

# Step 5: Setup PostgreSQL database
echo -e "${YELLOW}Step 5: Setting up PostgreSQL database...${NC}"
run_ssh "sudo -u postgres psql << EOF
-- Create database user if not exists
DO \\\$\\\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\\\$\\\$;

-- Drop database if exists and create new
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF"
echo -e "${GREEN}✓ Database created${NC}"

# Step 6: Install backend dependencies
echo -e "${YELLOW}Step 6: Installing backend dependencies...${NC}"
run_ssh "cd ${DEPLOY_PATH}/backend && npm install --production=false"
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Step 7: Generate Prisma Client and run migrations
echo -e "${YELLOW}Step 7: Running Prisma migrations...${NC}"
run_ssh "cd ${DEPLOY_PATH}/backend && npx prisma generate && npx prisma migrate deploy"
echo -e "${GREEN}✓ Prisma migrations completed${NC}"

# Step 8: Install frontend dependencies
echo -e "${YELLOW}Step 8: Installing frontend dependencies...${NC}"
run_ssh "cd ${DEPLOY_PATH}/frontend && npm install"
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Step 9: Build frontend
echo -e "${YELLOW}Step 9: Building frontend...${NC}"
run_ssh "cd ${DEPLOY_PATH}/frontend && npm run build"
echo -e "${GREEN}✓ Frontend built${NC}"

# Step 10: Create PM2 ecosystem file
echo -e "${YELLOW}Step 10: Creating PM2 ecosystem file...${NC}"
run_ssh "cat > ${DEPLOY_PATH}/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'restaurant-backend',
      cwd: '/var/www/restaurant-platform/backend',
      script: 'npm',
      args: 'run start:dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/restaurant-backend-error.log',
      out_file: '/var/log/restaurant-backend-out.log',
      log_file: '/var/log/restaurant-backend-combined.log',
      time: true
    },
    {
      name: 'restaurant-frontend',
      cwd: '/var/www/restaurant-platform/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/restaurant-frontend-error.log',
      out_file: '/var/log/restaurant-frontend-out.log',
      log_file: '/var/log/restaurant-frontend-combined.log',
      time: true
    }
  ]
};
EOF"
echo -e "${GREEN}✓ PM2 ecosystem file created${NC}"

# Step 11: Configure Nginx
echo -e "${YELLOW}Step 11: Configuring Nginx...${NC}"
run_ssh "cat > /etc/nginx/sites-available/restaurant-platform << 'EOF'
server {
    listen 80;
    server_name 31.57.166.18;

    client_max_body_size 10M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    # Static files
    location /uploads {
        alias /var/www/restaurant-platform/uploads;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
EOF"

run_ssh "ln -sf /etc/nginx/sites-available/restaurant-platform /etc/nginx/sites-enabled/restaurant-platform"
run_ssh "nginx -t && systemctl reload nginx"
echo -e "${GREEN}✓ Nginx configured${NC}"

# Step 12: Create uploads directory
echo -e "${YELLOW}Step 12: Creating uploads directory...${NC}"
run_ssh "mkdir -p /var/www/restaurant-platform/uploads && chmod 755 /var/www/restaurant-platform/uploads"
echo -e "${GREEN}✓ Uploads directory created${NC}"

# Step 13: Configure firewall
echo -e "${YELLOW}Step 13: Configuring firewall...${NC}"
run_ssh "ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable"
echo -e "${GREEN}✓ Firewall configured${NC}"

# Step 14: Stop existing PM2 processes
echo -e "${YELLOW}Step 14: Stopping existing PM2 processes...${NC}"
run_ssh "pm2 delete all || true"
echo -e "${GREEN}✓ Existing processes stopped${NC}"

# Step 15: Start applications with PM2
echo -e "${YELLOW}Step 15: Starting applications with PM2...${NC}"
run_ssh "cd ${DEPLOY_PATH} && pm2 start ecosystem.config.js"
run_ssh "pm2 save"
run_ssh "pm2 startup systemd -u root --hp /root | tail -1 | bash || true"
echo -e "${GREEN}✓ Applications started${NC}"

# Step 16: Verify deployment
echo -e "${YELLOW}Step 16: Verifying deployment...${NC}"
sleep 10

# Check PM2 status
echo -e "\n${YELLOW}PM2 Status:${NC}"
run_ssh "pm2 status"

# Check backend health
echo -e "\n${YELLOW}Backend Health Check:${NC}"
run_ssh "curl -s http://localhost:3001/api/v1/health || echo 'Backend not responding yet'"

# Check frontend
echo -e "\n${YELLOW}Frontend Check:${NC}"
run_ssh "curl -s http://localhost:3000 | head -20 || echo 'Frontend not responding yet'"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Access URLs:${NC}"
echo -e "Frontend: ${GREEN}http://31.57.166.18${NC}"
echo -e "Backend API: ${GREEN}http://31.57.166.18/api/v1${NC}"
echo -e "Backend Health: ${GREEN}http://31.57.166.18/api/v1/health${NC}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "SSH to server: ${GREEN}sshpass -p 'qMRF2Y5Z44fBP1kANKcJHX61' ssh root@31.57.166.18${NC}"
echo -e "View PM2 status: ${GREEN}pm2 status${NC}"
echo -e "View PM2 logs: ${GREEN}pm2 logs${NC}"
echo -e "Restart backend: ${GREEN}pm2 restart restaurant-backend${NC}"
echo -e "Restart frontend: ${GREEN}pm2 restart restaurant-frontend${NC}"
echo -e "View Nginx logs: ${GREEN}tail -f /var/log/nginx/error.log${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Set up SSL certificate using certbot"
echo -e "2. Configure domain name (if applicable)"
echo -e "3. Set up database backups"
echo -e "4. Configure monitoring and alerts"
echo -e "5. Review and optimize PM2 settings"
