# Production Deployment Guide
**Date**: October 3, 2025
**Target Server**: 31.57.166.18

---

## 🚀 Quick Deployment

### One-Command Deployment
```bash
cd /home/admin/restaurant-platform-remote-v2
./deploy-to-production.sh
```

This script will automatically:
1. ✅ Install required dependencies
2. ✅ Build production bundles
3. ✅ Copy files to production server
4. ✅ Set up PostgreSQL database
5. ✅ Configure PM2 process manager
6. ✅ Set up Nginx reverse proxy
7. ✅ Configure firewall
8. ✅ Start all services

---

## 📋 Pre-Deployment Checklist

### Local Environment
- [ ] All code committed to git
- [ ] Tests passing locally
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Build succeeds without errors

### Production Server Access
- [ ] SSH access confirmed: `ssh root@31.57.166.18`
- [ ] Sufficient disk space (>20GB recommended)
- [ ] PostgreSQL credentials verified
- [ ] Domain/IP confirmed: 31.57.166.18

---

## 🔧 Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### Step 1: Install sshpass
```bash
sudo apt-get install -y sshpass
```

### Step 2: Test Connection
```bash
ssh root@31.57.166.18
# Password: qMRF2Y5Z44fBP1kANKcJHX61
```

### Step 3: Build Locally
```bash
# Build backend
cd backend
npm install --production
npm run build

# Build frontend
cd ../frontend
npm install --production
npm run build
```

### Step 4: Copy Files
```bash
scp -r backend/ root@31.57.166.18:/var/www/restaurant-platform/
scp -r frontend/ root@31.57.166.18:/var/www/restaurant-platform/
```

### Step 5: Configure Production Server
SSH into the server and run:
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs nginx postgresql pm2

# Set up database
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'E\$\$athecode006';"

# Run migrations
cd /var/www/restaurant-platform/backend
npx prisma migrate deploy
npx prisma generate
```

---

## 🌐 Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet (Port 80)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Nginx Reverse Proxy  │
         │    (31.57.166.18:80)   │
         └───────────┬────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Frontend (PM2) │    │  Backend (PM2)  │
│   Port 3000     │    │   Port 3001     │
│   Next.js       │    │   NestJS        │
└─────────────────┘    └────────┬────────┘
                                 │
                                 ▼
                      ┌─────────────────┐
                      │   PostgreSQL    │
                      │   Port 5432     │
                      └─────────────────┘
```

---

## 📊 Production Configuration

### Backend Environment (`/var/www/restaurant-platform/backend/.env`)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:E$$athecode006@localhost:5432/postgres
JWT_SECRET=production-secret-key-change-this
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://31.57.166.18
```

### Frontend Environment (`/var/www/restaurant-platform/frontend/.env.production`)
```env
NEXT_PUBLIC_API_URL=http://31.57.166.18:3001
NODE_ENV=production
```

### PM2 Ecosystem (`/var/www/restaurant-platform/ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'restaurant-backend',
      cwd: '/var/www/restaurant-platform/backend',
      script: 'npm',
      args: 'run start:prod',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '1G'
    },
    {
      name: 'restaurant-frontend',
      cwd: '/var/www/restaurant-platform/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
};
```

### Nginx Configuration (`/etc/nginx/sites-available/restaurant-platform`)
```nginx
server {
    listen 80;
    server_name 31.57.166.18;

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Post-Deployment Verification

### Check Services Status
```bash
ssh root@31.57.166.18

# Check PM2 processes
pm2 status

# Check Nginx
systemctl status nginx

# Check PostgreSQL
systemctl status postgresql

# View logs
pm2 logs
```

### Test Endpoints
```bash
# Test backend API
curl http://31.57.166.18/api/v1/health

# Test frontend
curl -I http://31.57.166.18
```

### Monitor Resources
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top
```

---

## 🛠️ Common Operations

### View Logs
```bash
# All logs
ssh root@31.57.166.18 'pm2 logs'

# Backend only
ssh root@31.57.166.18 'pm2 logs restaurant-backend'

# Frontend only
ssh root@31.57.166.18 'pm2 logs restaurant-frontend'

# Last 100 lines
ssh root@31.57.166.18 'pm2 logs --lines 100'
```

### Restart Services
```bash
# Restart all
ssh root@31.57.166.18 'pm2 restart all'

# Restart backend
ssh root@31.57.166.18 'pm2 restart restaurant-backend'

# Restart frontend
ssh root@31.57.166.18 'pm2 restart restaurant-frontend'

# Reload (0-downtime)
ssh root@31.57.166.18 'pm2 reload all'
```

### Update Deployment
```bash
# Run deployment script again
./deploy-to-production.sh

# Or manual update
rsync -avz backend/ root@31.57.166.18:/var/www/restaurant-platform/backend/
rsync -avz frontend/ root@31.57.166.18:/var/www/restaurant-platform/frontend/
ssh root@31.57.166.18 'pm2 restart all'
```

### Database Operations
```bash
# Run migrations
ssh root@31.57.166.18 'cd /var/www/restaurant-platform/backend && npx prisma migrate deploy'

# Backup database
ssh root@31.57.166.18 'pg_dump -U postgres postgres > /backup/db_$(date +%Y%m%d).sql'

# Restore database
ssh root@31.57.166.18 'psql -U postgres postgres < /backup/db_20251003.sql'
```

---

## 🔒 Security Recommendations

### Immediate Actions
1. ✅ Change default PostgreSQL password
2. ✅ Update JWT_SECRET in production .env
3. ✅ Enable firewall (UFW configured by script)
4. ✅ Use HTTPS (install SSL certificate)

### SSL Certificate Setup (Recommended)
```bash
# Install Certbot
ssh root@31.57.166.18 'apt-get install -y certbot python3-certbot-nginx'

# Get SSL certificate (replace with your domain)
ssh root@31.57.166.18 'certbot --nginx -d yourdomain.com'

# Auto-renewal is configured automatically
```

### Additional Security
```bash
# Change SSH port (optional)
ssh root@31.57.166.18 'sed -i "s/#Port 22/Port 2222/" /etc/ssh/sshd_config'
ssh root@31.57.166.18 'systemctl restart sshd'

# Disable root login after creating sudo user
ssh root@31.57.166.18 'adduser admin'
ssh root@31.57.166.18 'usermod -aG sudo admin'
```

---

## ⚠️ Troubleshooting

### Services Won't Start
```bash
# Check PM2 logs
ssh root@31.57.166.18 'pm2 logs --err'

# Check if ports are in use
ssh root@31.57.166.18 'netstat -tlnp | grep -E "3000|3001"'

# Restart PM2
ssh root@31.57.166.18 'pm2 kill && pm2 start ecosystem.config.js'
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
ssh root@31.57.166.18 'psql -U postgres -c "SELECT version();"'

# Check PostgreSQL status
ssh root@31.57.166.18 'systemctl status postgresql'

# Restart PostgreSQL
ssh root@31.57.166.18 'systemctl restart postgresql'
```

### Nginx Issues
```bash
# Test configuration
ssh root@31.57.166.18 'nginx -t'

# View error logs
ssh root@31.57.166.18 'tail -f /var/log/nginx/error.log'

# Restart Nginx
ssh root@31.57.166.18 'systemctl restart nginx'
```

### High Memory Usage
```bash
# Check PM2 memory
ssh root@31.57.166.18 'pm2 monit'

# Restart with memory limit
ssh root@31.57.166.18 'pm2 restart all --max-memory-restart 1G'
```

---

## 📈 Monitoring Setup

### PM2 Plus (Optional)
```bash
# Sign up at https://pm2.io
# Link your server
ssh root@31.57.166.18 'pm2 link [SECRET_KEY] [PUBLIC_KEY]'
```

### Custom Health Checks
```bash
# Create monitoring script
cat > /root/health-check.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:3001/health || pm2 restart restaurant-backend
curl -f http://localhost:3000 || pm2 restart restaurant-frontend
EOF

# Add to crontab (check every 5 minutes)
(crontab -l ; echo "*/5 * * * * /root/health-check.sh") | crontab -
```

---

## 📝 Production URLs

- **Frontend**: http://31.57.166.18
- **Backend API**: http://31.57.166.18/api
- **Health Check**: http://31.57.166.18/api/v1/health

---

## 🎯 Next Steps After Deployment

1. [ ] Test login functionality
2. [ ] Verify category management works
3. [ ] Test product creation
4. [ ] Check order processing
5. [ ] Verify printing integration
6. [ ] Set up SSL certificate
7. [ ] Configure domain name (if applicable)
8. [ ] Set up automated backups
9. [ ] Configure monitoring alerts
10. [ ] Document admin credentials

---

**Deployment Script**: `/home/admin/restaurant-platform-remote-v2/deploy-to-production.sh`
**Created**: October 3, 2025
**Server**: 31.57.166.18
**Status**: Ready for deployment
