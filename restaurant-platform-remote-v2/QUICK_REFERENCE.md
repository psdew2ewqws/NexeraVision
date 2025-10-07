# Restaurant Platform - Quick Reference Guide

## Service Management

### Check Service Status
```bash
pm2 status
```

### View Live Logs
```bash
# All services
pm2 logs

# Backend only
pm2 logs restaurant-backend

# Frontend only
pm2 logs restaurant-frontend

# Last 100 lines
pm2 logs --lines 100
```

### Restart Services
```bash
# Restart backend
pm2 restart restaurant-backend

# Restart frontend
pm2 restart restaurant-frontend

# Restart all
pm2 restart all
```

### Stop Services
```bash
pm2 stop restaurant-backend
pm2 stop restaurant-frontend
```

### Start Services (after stop)
```bash
pm2 start restaurant-backend
pm2 start restaurant-frontend
```

## Service URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432 (postgres)

## Quick Health Checks

### Test Backend API
```bash
curl http://localhost:3001/api/v1/companies
```

### Test Frontend
```bash
curl -I http://localhost:3000
```

### Test Database
```bash
PGPASSWORD='E$$athecode006' psql -h localhost -U postgres -d postgres -c "SELECT version();"
```

## Common Operations

### View Process Details
```bash
pm2 info restaurant-backend
pm2 info restaurant-frontend
```

### Monitor Resources
```bash
pm2 monit
```

### View Environment Variables
```bash
pm2 env 0  # Backend (process id 0)
pm2 env 1  # Frontend (process id 1)
```

## Database Operations

### Connect to Database
```bash
PGPASSWORD='E$$athecode006' psql -h localhost -U postgres -d postgres
```

### Quick Queries
```sql
-- Count users
SELECT COUNT(*) FROM users;

-- List companies
SELECT id, name, status FROM companies;

-- Check menu categories
SELECT COUNT(*) FROM menu_categories;
```

## Configuration Files

- **Backend**: `/home/admin/restaurant-platform-remote-v2/backend/.env`
- **Frontend**: `/home/admin/restaurant-platform-remote-v2/frontend/.env.production`
- **PM2 Backend**: `/home/admin/restaurant-platform-remote-v2/backend/ecosystem.config.js`
- **PM2 Frontend**: `/home/admin/restaurant-platform-remote-v2/frontend/ecosystem.config.js`

## Log Locations

- **Backend Logs**: `/home/admin/restaurant-platform-remote-v2/backend/logs/`
- **Frontend Logs**: `/home/admin/restaurant-platform-remote-v2/frontend/logs/`
- **PM2 Logs**: `~/.pm2/logs/`

## Emergency Procedures

### Service Won't Start
```bash
# Check error logs
pm2 logs restaurant-backend --err --lines 50

# Delete and restart
pm2 delete restaurant-backend
cd /home/admin/restaurant-platform-remote-v2/backend
pm2 start ecosystem.config.js
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Out of Memory
```bash
# Restart service to free memory
pm2 restart restaurant-backend
pm2 restart restaurant-frontend
```

## Useful Commands

### Save PM2 Configuration
```bash
pm2 save
```

### Update PM2
```bash
npm install pm2@latest -g
pm2 update
```

### Clear Logs
```bash
pm2 flush
```

### PM2 Dashboard
```bash
pm2 monit
```

## Demo Credentials

**Test Login**:
- Email: `admin@restaurantplatform.com`
- Password: `test123`

## Support

For detailed deployment information, see: `DEPLOYMENT_REPORT_2025-10-04.md`
