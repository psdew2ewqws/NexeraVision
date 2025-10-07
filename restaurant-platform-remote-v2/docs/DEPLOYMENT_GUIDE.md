# PrinterMaster WebSocket Deployment Guide

**Document Version**: 1.0
**Last Updated**: October 7, 2025
**Environment**: Production (31.57.166.18)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ or Debian 11+
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14+ with full-text search support
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 20GB+ available disk space
- **Network**: Static IP address, ports 3000-3001 accessible

### Software Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 14
sudo apt-get install -y postgresql-14 postgresql-contrib-14

# Install PM2 globally
sudo npm install -g pm2

# Install build essentials
sudo apt-get install -y build-essential python3 git
```

---

## Initial Setup

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /home/admin
cd /home/admin

# Clone repository
git clone https://github.com/your-org/restaurant-platform-remote-v2.git
cd restaurant-platform-remote-v2
```

### 2. Database Setup

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE postgres;
CREATE USER postgres_user WITH PASSWORD 'E$$athecode006';
GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres_user;
\q

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Backend Configuration

```bash
cd /home/admin/restaurant-platform-remote-v2/backend

# Install dependencies
npm install

# Create environment file
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres_user:E$$athecode006@localhost:5432/postgres"

# JWT Authentication
JWT_SECRET=your-secure-secret-key-change-this
JWT_EXPIRATION=1d

# API Configuration
PORT=3001
NODE_ENV=production

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://31.57.166.18:3000,https://yourdomain.com

# Service Registry
SERVICE_MDNS_ENABLED=false
SERVICE_HEARTBEAT_INTERVAL=30000
SERVICE_HEALTH_CHECK_INTERVAL=15000

# Logging
LOG_LEVEL=info
EOF

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build
```

### 4. Frontend Configuration

```bash
cd /home/admin/restaurant-platform-remote-v2/frontend

# Install dependencies
npm install

# Create environment file
cat > .env.local << 'EOF'
# API Endpoints
NEXT_PUBLIC_API_URL=http://31.57.166.18:3001
NEXT_PUBLIC_WS_URL=ws://31.57.166.18:3001

# Application
NEXT_PUBLIC_APP_NAME=RestaurantPrint Pro
EOF

# Build application
npm run build
```

---

## Production Deployment

### PM2 Ecosystem Configuration

```bash
cd /home/admin/restaurant-platform-remote-v2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      cwd: '/home/admin/restaurant-platform-remote-v2/backend',
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/restaurant-platform/backend-error.log',
      out_file: '/var/log/restaurant-platform/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/admin/restaurant-platform-remote-v2/frontend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/restaurant-platform/frontend-error.log',
      out_file: '/var/log/restaurant-platform/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false
    }
  ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/restaurant-platform
sudo chown -R $(whoami):$(whoami) /var/log/restaurant-platform

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output to enable startup
```

---

## Verification Checklist

```bash
# 1. Check PM2 status
pm2 status

# Expected output:
# │ name     │ status │ instances │ cpu │ memory │
# │ backend  │ online │ 1         │ ... │ ...    │
# │ frontend │ online │ 1         │ ... │ ...    │

# 2. Test backend health
curl -f http://localhost:3001/api/health

# Expected: {"status":"ok","timestamp":"...","uptime":...}

# 3. Test frontend
curl -f http://localhost:3000/

# Expected: HTML response

# 4. Test WebSocket connection
curl -i http://localhost:3001/socket.io/

# Expected: HTTP/1.1 200 OK

# 5. Check database connectivity
psql -h localhost -U postgres_user -d postgres -c "SELECT COUNT(*) FROM \"Printer\";"

# 6. Check logs for errors
pm2 logs --lines 50 --nostream

# 7. Verify ports are listening
netstat -tlnp | grep -E '3000|3001'
```

---

## Firewall Configuration

```bash
# Allow backend port
sudo ufw allow 3001/tcp comment 'PrinterMaster Backend'

# Allow frontend port
sudo ufw allow 3000/tcp comment 'PrinterMaster Frontend'

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp comment 'SSH'

# Enable firewall
sudo ufw enable

# Verify rules
sudo ufw status numbered
```

---

## SSL/TLS Configuration (Optional)

### Using Let's Encrypt with Nginx

```bash
# Install Nginx and Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/restaurant-platform

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /printing-ws/ {
        proxy_pass http://localhost:3001/printing-ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/restaurant-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Database Backup Configuration

```bash
# Create backup script
sudo nano /usr/local/bin/backup-database.sh

# Add content:
#!/bin/bash
BACKUP_DIR="/home/admin/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
pg_dump -h localhost -U postgres_user -d postgres | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

# Make executable
sudo chmod +x /usr/local/bin/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-database.sh
```

---

## Monitoring Setup

### PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Health Check Automation

```bash
# Create health check script
sudo nano /usr/local/bin/health-check.sh

# Add content:
#!/bin/bash
LOG_FILE="/var/log/health-monitor.log"
ALERT_EMAIL="admin@example.com"

check_health() {
  local endpoint=$1
  local name=$2
  response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
  if [ "$response" != "200" ]; then
    echo "$(date): CRITICAL - $name health check failed" >> "$LOG_FILE"
    echo "$name health check failed" | mail -s "ALERT: $name Down" "$ALERT_EMAIL"
    return 1
  fi
  return 0
}

check_health "http://localhost:3001/api/health" "Backend"
check_health "http://localhost:3000/" "Frontend"

if ! pm2 status backend | grep -q "online"; then
  echo "$(date): CRITICAL - Backend PM2 process not online" >> "$LOG_FILE"
  pm2 restart backend
fi

# Make executable
sudo chmod +x /usr/local/bin/health-check.sh

# Add to crontab (every 5 minutes)
crontab -e
# Add: */5 * * * * /usr/local/bin/health-check.sh
```

---

## Rollback Procedure

```bash
# 1. Stop current version
pm2 stop all

# 2. Restore previous code version
cd /home/admin/restaurant-platform-remote-v2
git reset --hard <previous-commit-hash>

# 3. Rebuild backend
cd backend
npm install
npm run build

# 4. Rebuild frontend
cd ../frontend
npm install
npm run build

# 5. Restore database backup (if needed)
gunzip -c /home/admin/backups/database/backup_YYYYMMDD_HHMMSS.sql.gz | \
  psql -h localhost -U postgres_user -d postgres

# 6. Restart applications
pm2 start all

# 7. Verify
curl -f http://localhost:3001/api/health
```

---

## Troubleshooting Deployment Issues

### Issue: npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: Prisma migration fails

```bash
# Reset Prisma migrations (CAUTION: data loss)
npx prisma migrate reset

# Or manually resolve migration conflicts
npx prisma migrate resolve --rolled-back <migration-name>
```

### Issue: PM2 won't start

```bash
# Kill PM2 daemon
pm2 kill

# Restart PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## Security Hardening

1. **Change default passwords**
2. **Enable fail2ban** for SSH protection
3. **Configure firewall** to allow only necessary ports
4. **Set up SSL/TLS** for production
5. **Enable database encryption** at rest
6. **Implement rate limiting** at nginx level
7. **Regular security updates**: `sudo apt-get update && sudo apt-get upgrade`

---

**Document Owner**: DevOps Team
**Last Reviewed**: October 7, 2025
**Next Review**: January 7, 2026
