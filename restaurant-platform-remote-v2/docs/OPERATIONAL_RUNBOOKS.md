# PrinterMaster WebSocket Operational Runbooks

**Document Version**: 1.0
**Last Updated**: October 7, 2025
**Target Audience**: DevOps, SREs, System Administrators

---

## Table of Contents

1. [Deployment Procedures](#deployment-procedures)
2. [Monitoring & Health Checks](#monitoring--health-checks)
3. [Backup & Recovery](#backup--recovery)
4. [Incident Response](#incident-response)
5. [Scaling Operations](#scaling-operations)
6. [Maintenance Windows](#maintenance-windows)

---

## Deployment Procedures

### Zero-Downtime Deployment

**Objective**: Deploy new backend version without disrupting active WebSocket connections.

**Prerequisites**:
- [ ] Code changes tested in staging environment
- [ ] Database migrations tested
- [ ] Backup taken before deployment
- [ ] Rollback plan prepared

**Procedure**:

```bash
# Step 1: Verify current system status
pm2 status backend
pm2 logs backend --lines 50 --nostream

# Step 2: Pull latest code
cd /home/admin/restaurant-platform-remote-v2/backend
git fetch origin
git checkout main
git pull origin main

# Step 3: Install dependencies (if package.json changed)
npm install

# Step 4: Run database migrations (if needed)
npx prisma migrate deploy

# Step 5: Build the application
npm run build

# Step 6: Graceful reload (zero-downtime)
pm2 reload backend --wait-ready --listen-timeout 10000

# Step 7: Verify deployment
pm2 logs backend --lines 20 --nostream
curl -f http://31.57.166.18:3001/api/health || echo "Health check failed"

# Step 8: Monitor for 5 minutes
watch -n 5 'pm2 status && pm2 logs backend --lines 10 --nostream'
```

**Verification Checklist**:
- [ ] Backend process status shows "online"
- [ ] Health endpoint returns 200 OK
- [ ] WebSocket connections maintained (check logs for "Client connected")
- [ ] No error spike in logs
- [ ] Desktop apps remain connected (check `desktop-health` endpoint)

**Rollback Procedure** (if deployment fails):
```bash
# Step 1: Revert to previous version
git reset --hard HEAD~1

# Step 2: Reinstall previous dependencies
npm install

# Step 3: Rebuild
npm run build

# Step 4: Reload PM2
pm2 reload backend

# Step 5: Verify rollback
curl -f http://31.57.166.18:3001/api/health
```

---

### Database Migration Deployment

**Objective**: Apply schema changes safely with data integrity.

**Prerequisites**:
- [ ] Migration tested in staging
- [ ] Database backup completed
- [ ] Downtime window scheduled (if required)

**Procedure**:

```bash
# Step 1: Backup database
pg_dump -h localhost -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Step 2: Review migration
cat backend/prisma/migrations/YYYYMMDDHHMMSS_description/migration.sql

# Step 3: Apply migration
cd /home/admin/restaurant-platform-remote-v2/backend
npx prisma migrate deploy

# Step 4: Verify migration
npx prisma migrate status

# Step 5: Generate Prisma Client
npx prisma generate

# Step 6: Restart backend
pm2 restart backend

# Step 7: Verify application
curl -f http://31.57.166.18:3001/api/health
```

**Rollback Procedure** (if migration fails):
```bash
# Step 1: Stop backend
pm2 stop backend

# Step 2: Restore database from backup
psql -h localhost -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql

# Step 3: Revert Prisma migration
npx prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_description

# Step 4: Restart backend
pm2 restart backend
```

---

## Monitoring & Health Checks

### System Health Monitoring

**Objective**: Continuous monitoring of system health and performance.

**Health Check Endpoints**:

```bash
# 1. Backend Health
curl http://31.57.166.18:3001/api/health

# Expected Response:
# {
#   "status": "ok",
#   "timestamp": "2025-10-07T12:34:56Z",
#   "uptime": 3600,
#   "database": "connected",
#   "websocket": "active"
# }

# 2. Desktop App Health
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health

# 3. Service Registry Status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/service-registry/status
```

**Automated Monitoring Script**:

```bash
#!/bin/bash
# File: /home/admin/scripts/health-monitor.sh

LOG_FILE="/var/log/health-monitor.log"
ALERT_EMAIL="admin@example.com"

# Health check function
check_health() {
  local endpoint=$1
  local name=$2

  response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")

  if [ "$response" != "200" ]; then
    echo "$(date): CRITICAL - $name health check failed (HTTP $response)" >> "$LOG_FILE"
    echo "$name health check failed" | mail -s "ALERT: $name Down" "$ALERT_EMAIL"
    return 1
  fi

  echo "$(date): OK - $name health check passed" >> "$LOG_FILE"
  return 0
}

# Run checks
check_health "http://31.57.166.18:3001/api/health" "Backend"
check_health "http://31.57.166.18:3000/api/health" "Frontend"

# Check PM2 status
if ! pm2 status backend | grep -q "online"; then
  echo "$(date): CRITICAL - Backend PM2 process not online" >> "$LOG_FILE"
  echo "Backend PM2 process not online" | mail -s "ALERT: Backend Down" "$ALERT_EMAIL"
fi
```

**Cron Job Setup**:
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * /home/admin/scripts/health-monitor.sh
```

---

### Performance Metrics Collection

**Key Metrics to Track**:

1. **WebSocket Connections**:
   - Active connections count
   - Connection churn rate
   - Average connection duration

2. **Request Performance**:
   - Average correlation ID resolution time
   - Pending requests queue depth
   - Timeout rate

3. **Desktop App Health**:
   - Connection quality distribution
   - Average latency
   - Packet loss rate

**Metrics Collection Script**:

```bash
#!/bin/bash
# File: /home/admin/scripts/collect-metrics.sh

METRICS_FILE="/var/log/websocket-metrics.json"
JWT_TOKEN="your_admin_jwt_token"

# Collect desktop health metrics
health_data=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health)

# Extract summary
excellent=$(echo "$health_data" | jq -r '.summary.excellent')
good=$(echo "$health_data" | jq -r '.summary.good')
fair=$(echo "$health_data" | jq -r '.summary.fair')
poor=$(echo "$health_data" | jq -r '.summary.poor')

# Write to metrics file
cat <<EOF >> "$METRICS_FILE"
{
  "timestamp": "$(date -Iseconds)",
  "connection_quality": {
    "excellent": $excellent,
    "good": $good,
    "fair": $fair,
    "poor": $poor
  }
}
EOF

echo "Metrics collected at $(date)"
```

---

## Backup & Recovery

### Database Backup Procedure

**Objective**: Regular backups with point-in-time recovery capability.

**Daily Backup Script**:

```bash
#!/bin/bash
# File: /home/admin/scripts/backup-database.sh

BACKUP_DIR="/home/admin/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Perform backup
pg_dump -h localhost -U postgres -d postgres | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Verify backup
if [ $? -eq 0 ]; then
  echo "$(date): Backup successful - backup_$DATE.sql.gz" >> /var/log/database-backup.log
else
  echo "$(date): Backup FAILED" >> /var/log/database-backup.log
  exit 1
fi

# Remove old backups (older than 30 days)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Database backup completed: backup_$DATE.sql.gz"
```

**Cron Job**:
```bash
# Daily at 2 AM
0 2 * * * /home/admin/scripts/backup-database.sh
```

---

### Database Restore Procedure

**Objective**: Restore database from backup with minimal downtime.

**Procedure**:

```bash
# Step 1: Stop backend to prevent writes
pm2 stop backend

# Step 2: List available backups
ls -lht /home/admin/backups/database/

# Step 3: Select backup to restore
BACKUP_FILE="backup_20251007_020000.sql.gz"

# Step 4: Drop existing database (CAUTION!)
psql -h localhost -U postgres -c "DROP DATABASE postgres;"

# Step 5: Create new database
psql -h localhost -U postgres -c "CREATE DATABASE postgres;"

# Step 6: Restore from backup
gunzip -c /home/admin/backups/database/$BACKUP_FILE | psql -h localhost -U postgres -d postgres

# Step 7: Verify restore
psql -h localhost -U postgres -d postgres -c "SELECT COUNT(*) FROM \"Printer\";"

# Step 8: Restart backend
pm2 start backend

# Step 9: Verify application
curl -f http://31.57.166.18:3001/api/health
```

---

## Incident Response

### High Latency Alert

**Symptom**: Desktop apps reporting >500ms average latency.

**Investigation Steps**:

```bash
# Step 1: Check backend CPU/memory usage
pm2 monit

# Step 2: Check database connections
psql -h localhost -U postgres -d postgres -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Step 3: Check network connectivity
ping -c 10 31.57.166.18

# Step 4: Review recent error logs
pm2 logs backend --lines 100 --nostream | grep ERROR

# Step 5: Check pending requests
# (Backend logs will show: "Active pending requests: X")
pm2 logs backend --lines 100 | grep "pending requests"
```

**Resolution Actions**:

1. **If CPU/Memory High**:
   ```bash
   # Restart backend
   pm2 restart backend
   ```

2. **If Database Connection Saturation**:
   ```bash
   # Kill idle database connections
   psql -h localhost -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '1 hour';"
   ```

3. **If Network Issues**:
   ```bash
   # Check firewall rules
   sudo iptables -L -n | grep 3001

   # Check open connections
   netstat -an | grep 3001 | wc -l
   ```

---

### Desktop App Connection Failures

**Symptom**: Desktop apps cannot connect to WebSocket.

**Investigation Steps**:

```bash
# Step 1: Verify backend is running
pm2 status backend

# Step 2: Check WebSocket port
netstat -tlnp | grep 3001

# Step 3: Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Host: 31.57.166.18:3001" -H "Origin: http://localhost" \
  http://31.57.166.18:3001/socket.io/

# Step 4: Review backend logs for connection attempts
pm2 logs backend --lines 100 | grep "Client connected\|Client disconnected"

# Step 5: Verify CORS configuration
grep CORS_ORIGINS /home/admin/restaurant-platform-remote-v2/backend/.env
```

**Resolution Actions**:

1. **Restart Backend**:
   ```bash
   pm2 restart backend
   ```

2. **Fix CORS Configuration**:
   ```bash
   # Edit .env file
   nano /home/admin/restaurant-platform-remote-v2/backend/.env

   # Add/update CORS_ORIGINS
   CORS_ORIGINS=http://localhost:3000,http://31.57.166.18:3000

   # Restart
   pm2 restart backend
   ```

3. **Check Firewall**:
   ```bash
   # Allow port 3001
   sudo ufw allow 3001/tcp
   sudo ufw reload
   ```

---

### Correlation ID Timeout Issues

**Symptom**: Print tests timing out, correlation ID warnings in logs.

**Investigation Steps**:

```bash
# Step 1: Check pending requests count
pm2 logs backend --lines 50 | grep "Active pending requests"

# Step 2: Look for timeout warnings
pm2 logs backend --lines 100 | grep "Request timeout"

# Step 3: Check Desktop App connectivity
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health | jq '.totalClients'
```

**Resolution Actions**:

1. **Cleanup Stale Requests** (happens automatically every 30s):
   ```bash
   # Monitor cleanup logs
   pm2 logs backend --lines 50 | grep "Cleaned up.*stale"
   ```

2. **Restart Desktop App** (if no Desktop Apps connected):
   ```bash
   # Desktop App must be restarted on client machine
   # Guide user to restart RestaurantPrint Pro application
   ```

3. **Increase Timeout** (if frequent timeouts):
   ```typescript
   // Edit printing-websocket.gateway.ts
   // Change timeout from 15000 to 30000 ms
   this.registerPendingRequest(correlationId, 'printer_test', 30000, ...);
   ```

---

## Scaling Operations

### Horizontal Scaling (Add Backend Instance)

**Objective**: Scale to handle increased load with multiple backend instances.

**Prerequisites**:
- [ ] Redis server installed and running
- [ ] Load balancer configured
- [ ] Shared PostgreSQL database

**Procedure**:

```bash
# Step 1: Install Redis (if not already installed)
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Step 2: Install Socket.IO Redis Adapter
cd /home/admin/restaurant-platform-remote-v2/backend
npm install @socket.io/redis-adapter redis

# Step 3: Configure Redis adapter in gateway
# Edit: printing-websocket.gateway.ts
# Add in afterInit():
#   const pubClient = createClient({ url: 'redis://localhost:6379' });
#   const subClient = pubClient.duplicate();
#   await Promise.all([pubClient.connect(), subClient.connect()]);
#   this.server.adapter(createAdapter(pubClient, subClient));

# Step 4: Start second instance on different port
PORT=3002 pm2 start dist/main.js --name backend-2

# Step 5: Configure load balancer (nginx example)
sudo nano /etc/nginx/sites-available/backend-lb.conf

# Add upstream configuration:
# upstream backend_cluster {
#   ip_hash;  # Sticky sessions for WebSocket
#   server 127.0.0.1:3001;
#   server 127.0.0.1:3002;
# }

# Step 6: Restart nginx
sudo systemctl restart nginx

# Step 7: Verify both instances
pm2 status
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3002/api/health
```

---

### Vertical Scaling (Increase Resources)

**Objective**: Increase CPU/memory for single backend instance.

**Procedure**:

```bash
# Step 1: Check current resource usage
pm2 monit

# Step 2: Increase PM2 max memory restart threshold
pm2 restart backend --max-memory-restart 4G

# Step 3: Adjust Node.js memory limit
pm2 delete backend
pm2 start dist/main.js --name backend --max-memory-restart 4G -- --max-old-space-size=4096

# Step 4: Monitor resource usage
watch -n 5 'pm2 monit'
```

---

## Maintenance Windows

### Scheduled Maintenance Procedure

**Objective**: Perform system maintenance with minimal disruption.

**Notification Timeline**:
- **T-7 days**: Announce maintenance window to users
- **T-24 hours**: Send reminder notification
- **T-1 hour**: Final warning
- **T-0**: Begin maintenance

**Maintenance Checklist**:

```bash
# Step 1: Announce maintenance (send email/notification)
# "System maintenance scheduled for 2025-10-15 02:00-04:00 UTC"

# Step 2: Backup everything
/home/admin/scripts/backup-database.sh
tar -czf /home/admin/backups/backend_$(date +%Y%m%d).tar.gz \
  /home/admin/restaurant-platform-remote-v2/backend

# Step 3: Set maintenance mode (optional)
# Create maintenance.html in frontend
echo "System under maintenance. Back at 04:00 UTC" > /var/www/maintenance.html

# Step 4: Stop services
pm2 stop backend
pm2 stop frontend

# Step 5: Perform maintenance tasks
# - Database cleanup
# - Log rotation
# - Security updates
# - Dependency updates

# Step 6: Test changes
npm test
npm run build

# Step 7: Start services
pm2 start backend
pm2 start frontend

# Step 8: Verify system
curl -f http://31.57.166.18:3001/api/health
curl -f http://31.57.166.18:3000/

# Step 9: Monitor for 30 minutes
watch -n 10 'pm2 logs backend --lines 20 --nostream'

# Step 10: Announce completion
# "Maintenance complete. System operational."
```

---

### Emergency Hotfix Deployment

**Objective**: Deploy critical fix outside maintenance window.

**Procedure**:

```bash
# Step 1: Prepare hotfix branch
git checkout -b hotfix/critical-fix
# Make changes
git commit -m "Critical fix: Description"
git push origin hotfix/critical-fix

# Step 2: Emergency approval
# Get approval from tech lead

# Step 3: Merge to main
git checkout main
git merge hotfix/critical-fix
git push origin main

# Step 4: Deploy immediately
cd /home/admin/restaurant-platform-remote-v2/backend
git pull origin main
npm install
npm run build
pm2 reload backend

# Step 5: Monitor closely
pm2 logs backend --lines 50 --follow

# Step 6: Verify fix
# Test the specific issue that was fixed

# Step 7: Document incident
# Create incident report with:
# - Issue description
# - Root cause
# - Fix applied
# - Verification steps
```

---

## Runbook Maintenance

**Review Schedule**: Quarterly (January, April, July, October)

**Review Checklist**:
- [ ] Update procedures based on lessons learned
- [ ] Verify all scripts still work
- [ ] Update contact information
- [ ] Add new procedures for new features
- [ ] Remove deprecated procedures

---

**Document Owner**: DevOps Team
**Last Reviewed**: October 7, 2025
**Next Review**: January 7, 2026
**On-Call Contact**: devops@example.com
