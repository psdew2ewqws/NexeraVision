# Production Deployment - Ready to Deploy

**Target Server**: 31.57.166.18
**Status**: ✅ Scripts ready, waiting for deployment

---

## 🎯 What's Been Prepared

### ✅ Deployment Automation
- **Script**: `deploy-to-production.sh`
- **Features**: Fully automated deployment with error handling
- **Components**: Backend, Frontend, Database, Nginx, PM2, Firewall

### ✅ Documentation Created
1. **PRODUCTION_DEPLOYMENT_GUIDE.md** - Complete deployment manual
2. **deploy-to-production.sh** - Automated deployment script
3. **SERVER_MANAGEMENT.md** - Local server management guide

---

## 🚀 Quick Deployment

### One-Command Deployment
```bash
cd /home/admin/restaurant-platform-remote-v2
./deploy-to-production.sh
```

**What it does:**
1. Builds production bundles locally
2. Copies files to production server
3. Sets up PostgreSQL database with migrations
4. Configures PM2 for process management
5. Sets up Nginx reverse proxy
6. Configures firewall (UFW)
7. Starts all services
8. Verifies deployment

**Time Required**: ~10-15 minutes

---

## 📊 Production Stack

| Component | Technology | Port | Management |
|-----------|-----------|------|------------|
| Frontend | Next.js 15 | 3000 | PM2 |
| Backend | NestJS | 3001 | PM2 (Cluster x2) |
| Database | PostgreSQL 14+ | 5432 | systemd |
| Web Server | Nginx | 80/443 | systemd |
| Process Manager | PM2 | - | - |

---

## 🔐 Server Credentials

**SSH Access:**
- IP: 31.57.166.18
- Username: root
- Password: qMRF2Y5Z44fBP1kANKcJHX61

**Database:**
- User: postgres
- Password: E$$athecode006
- Database: postgres

---

## ⚙️ Production Configuration

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:E$$athecode006@localhost:5432/postgres
JWT_SECRET=production-secret-key-change-this
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://31.57.166.18
```

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=http://31.57.166.18:3001
NODE_ENV=production
```

---

## 🛡️ Security Features

✅ **Firewall**: UFW configured (ports 22, 80, 443)
✅ **CORS**: Configured for production domain
✅ **JWT**: Secure authentication
✅ **Database**: Password-protected PostgreSQL
✅ **Process Isolation**: PM2 cluster mode
✅ **Reverse Proxy**: Nginx security headers

### Recommended Post-Deployment
1. Change default PostgreSQL password
2. Update JWT_SECRET in production
3. Install SSL certificate (Certbot)
4. Set up automated backups
5. Configure monitoring alerts

---

## 📈 Production URLs

After deployment, the application will be available at:

- **Main Application**: http://31.57.166.18
- **Backend API**: http://31.57.166.18/api
- **API Health Check**: http://31.57.166.18/api/v1/health
- **API Documentation**: http://31.57.166.18/api/docs (if enabled)

---

## 🔍 Deployment Process

### Step-by-Step Flow

1. **Local Preparation**
   - Installs sshpass for automated SSH
   - Tests connection to production server
   - Builds production bundles (backend + frontend)

2. **Server Setup**
   - Installs Node.js 18
   - Installs Nginx, PostgreSQL, PM2
   - Creates application directories

3. **File Transfer**
   - Copies backend build to `/var/www/restaurant-platform/backend`
   - Copies frontend build to `/var/www/restaurant-platform/frontend`
   - Uploads configuration files

4. **Database Configuration**
   - Sets PostgreSQL password
   - Runs Prisma migrations
   - Generates Prisma client

5. **Process Management**
   - Configures PM2 ecosystem
   - Starts backend in cluster mode (2 instances)
   - Starts frontend
   - Enables PM2 startup on boot

6. **Web Server Configuration**
   - Configures Nginx reverse proxy
   - Sets up frontend at root (/)
   - Sets up backend API at /api
   - Enables and restarts Nginx

7. **Security**
   - Configures UFW firewall
   - Opens required ports (22, 80, 443)
   - Enables firewall

8. **Verification**
   - Tests backend health endpoint
   - Tests frontend accessibility
   - Displays PM2 process status
   - Shows access URLs

---

## 🎨 Architecture Diagram

```
Internet
    │
    ▼
Nginx (Port 80)
    │
    ├─→ / (Frontend) ──→ PM2: Next.js (Port 3000)
    │
    └─→ /api (Backend) ──→ PM2: NestJS Cluster x2 (Port 3001)
                                    │
                                    ▼
                            PostgreSQL (Port 5432)
```

---

## 📝 Post-Deployment Tasks

### Immediate (First 15 minutes)
- [ ] Verify all services running: `ssh root@31.57.166.18 'pm2 status'`
- [ ] Test frontend: http://31.57.166.18
- [ ] Test backend API: http://31.57.166.18/api/v1/health
- [ ] Check logs: `ssh root@31.57.166.18 'pm2 logs --lines 50'`

### Within 24 hours
- [ ] Update JWT_SECRET in production .env
- [ ] Change default PostgreSQL password
- [ ] Install SSL certificate (Let's Encrypt)
- [ ] Set up database backup cron job
- [ ] Configure monitoring (PM2 Plus or custom)

### Within 1 week
- [ ] Set up domain name (if applicable)
- [ ] Configure automated backups to external storage
- [ ] Set up log rotation
- [ ] Create admin user accounts
- [ ] Document production credentials securely
- [ ] Set up health check monitoring

---

## 🚨 Troubleshooting

### If Deployment Fails

**Connection Issues:**
```bash
# Test SSH manually
ssh root@31.57.166.18

# Check if server is reachable
ping 31.57.166.18
```

**Build Failures:**
```bash
# Check Node.js version (should be 18+)
node --version

# Clean build directories
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/.next

# Rebuild
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

**Service Issues on Production:**
```bash
# SSH into server
ssh root@31.57.166.18

# Check PM2 status
pm2 status

# View error logs
pm2 logs --err

# Restart services
pm2 restart all

# Check Nginx
nginx -t
systemctl status nginx

# Check PostgreSQL
systemctl status postgresql
```

---

## 💡 Useful Commands

### View Logs Remotely
```bash
# All application logs
ssh root@31.57.166.18 'pm2 logs'

# Only errors
ssh root@31.57.166.18 'pm2 logs --err'

# Backend only
ssh root@31.57.166.18 'pm2 logs restaurant-backend'

# Frontend only
ssh root@31.57.166.18 'pm2 logs restaurant-frontend'
```

### Restart Services Remotely
```bash
# Restart all
ssh root@31.57.166.18 'pm2 restart all'

# Restart backend
ssh root@31.57.166.18 'pm2 restart restaurant-backend'

# Restart frontend
ssh root@31.57.166.18 'pm2 restart restaurant-frontend'

# Reload (zero-downtime)
ssh root@31.57.166.18 'pm2 reload all'
```

### Check Server Status
```bash
# PM2 processes
ssh root@31.57.166.18 'pm2 status'

# Server resources
ssh root@31.57.166.18 'free -h && df -h'

# Network connections
ssh root@31.57.166.18 'netstat -tlnp | grep -E "(3000|3001)"'
```

---

## ✅ Deployment Checklist

Before running deployment:
- [ ] All local changes committed
- [ ] Tests passing locally
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] SSH access to production verified
- [ ] Database credentials confirmed
- [ ] Backup of current production (if applicable)

After deployment:
- [ ] All PM2 processes running
- [ ] Frontend accessible
- [ ] Backend API responding
- [ ] Database migrations applied
- [ ] Nginx serving correctly
- [ ] Firewall configured
- [ ] SSL certificate installed (if applicable)

---

## 🎉 Ready to Deploy!

Everything is prepared and ready for production deployment.

**To deploy now:**
```bash
cd /home/admin/restaurant-platform-remote-v2
./deploy-to-production.sh
```

The script will guide you through the process and confirm before making any changes.

---

**Created**: October 3, 2025
**Script Location**: `/home/admin/restaurant-platform-remote-v2/deploy-to-production.sh`
**Documentation**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
**Status**: ✅ Ready for deployment
