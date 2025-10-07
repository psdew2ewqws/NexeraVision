#!/bin/bash
# Production Deployment Script for Restaurant Platform
# Target: 31.57.166.18

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production server details
PROD_HOST="31.57.166.18"
PROD_USER="root"
PROD_PASSWORD="qMRF2Y5Z44fBP1kANKcJHX61"
PROD_DIR="/var/www/restaurant-platform"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Restaurant Platform - Production Deployment Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute commands on remote server
remote_exec() {
    sshpass -p "$PROD_PASSWORD" ssh -o StrictHostKeyChecking=no "$PROD_USER@$PROD_HOST" "$1"
}

# Function to copy files to remote server
remote_copy() {
    sshpass -p "$PROD_PASSWORD" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" "$1" "$PROD_USER@$PROD_HOST:$2"
}

echo -e "${YELLOW}⚠️  WARNING: This will deploy to PRODUCTION server${NC}"
echo -e "   Server: ${BLUE}$PROD_HOST${NC}"
echo -e ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Installing sshpass for automated deployment${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
sudo apt-get update && sudo apt-get install -y sshpass

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Testing connection to production server${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if remote_exec "echo 'Connection successful'"; then
    echo -e "${GREEN}✅ Connected to production server${NC}"
else
    echo -e "${RED}❌ Failed to connect to production server${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 3: Preparing production server${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

remote_exec "mkdir -p $PROD_DIR/{backend,frontend}"
remote_exec "apt-get update"
remote_exec "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
remote_exec "apt-get install -y nodejs nginx postgresql postgresql-contrib"
remote_exec "npm install -g pm2"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 4: Building production bundles locally${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Build backend
cd backend
echo -e "${BLUE}Building backend...${NC}"
npm install --production
npm run build

# Build frontend
cd ../frontend
echo -e "${BLUE}Building frontend...${NC}"
npm install --production
npm run build

cd ..

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 5: Copying files to production server${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${BLUE}Copying backend...${NC}"
remote_copy "backend/" "$PROD_DIR/backend/"

echo -e "${BLUE}Copying frontend...${NC}"
remote_copy "frontend/" "$PROD_DIR/frontend/"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 6: Setting up production environment${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create production .env for backend
remote_exec "cat > $PROD_DIR/backend/.env << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:E\$\$athecode006@localhost:5432/postgres
JWT_SECRET=production-secret-key-change-this-in-production-$(date +%s)
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://$PROD_HOST,http://$PROD_HOST:3000
EOF"

# Create production .env for frontend
remote_exec "cat > $PROD_DIR/frontend/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://$PROD_HOST:3001
NODE_ENV=production
EOF"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 7: Setting up PostgreSQL database${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

remote_exec "sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'E\\\$\\\$athecode006';\""
remote_exec "cd $PROD_DIR/backend && npx prisma migrate deploy"
remote_exec "cd $PROD_DIR/backend && npx prisma generate"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 8: Configuring PM2 process manager${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create PM2 ecosystem file
remote_exec "cat > $PROD_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'restaurant-backend',
      cwd: '$PROD_DIR/backend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'restaurant-frontend',
      cwd: '$PROD_DIR/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 9: Configuring Nginx reverse proxy${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

remote_exec "cat > /etc/nginx/sites-available/restaurant-platform << 'EOF'
server {
    listen 80;
    server_name $PROD_HOST;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF"

remote_exec "ln -sf /etc/nginx/sites-available/restaurant-platform /etc/nginx/sites-enabled/"
remote_exec "rm -f /etc/nginx/sites-enabled/default"
remote_exec "nginx -t && systemctl restart nginx"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 10: Starting applications with PM2${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

remote_exec "cd $PROD_DIR && pm2 delete all || true"
remote_exec "cd $PROD_DIR && pm2 start ecosystem.config.js"
remote_exec "pm2 save"
remote_exec "pm2 startup systemd -u root --hp /root"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 11: Setting up firewall${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

remote_exec "ufw allow 22/tcp"
remote_exec "ufw allow 80/tcp"
remote_exec "ufw allow 443/tcp"
remote_exec "ufw --force enable"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 12: Verifying deployment${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 10  # Give services time to start

echo -e "${BLUE}Testing backend API...${NC}"
if remote_exec "curl -s http://localhost:3001/health | grep -q 'ok'"; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed${NC}"
fi

echo -e "${BLUE}Testing frontend...${NC}"
if remote_exec "curl -s http://localhost:3000 | grep -q 'restaurant'"; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend check failed${NC}"
fi

echo -e "${BLUE}Checking PM2 processes...${NC}"
remote_exec "pm2 list"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 DEPLOYMENT COMPLETED! 🎉                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Production URLs:${NC}"
echo -e "  🌐 Frontend: ${GREEN}http://$PROD_HOST${NC}"
echo -e "  🔧 Backend API: ${GREEN}http://$PROD_HOST/api${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs:        ${YELLOW}ssh root@$PROD_HOST 'pm2 logs'${NC}"
echo -e "  Check status:     ${YELLOW}ssh root@$PROD_HOST 'pm2 status'${NC}"
echo -e "  Restart backend:  ${YELLOW}ssh root@$PROD_HOST 'pm2 restart restaurant-backend'${NC}"
echo -e "  Restart frontend: ${YELLOW}ssh root@$PROD_HOST 'pm2 restart restaurant-frontend'${NC}"
echo ""
