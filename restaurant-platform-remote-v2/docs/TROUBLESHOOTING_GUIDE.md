# PrinterMaster WebSocket Troubleshooting Guide

**Document Version**: 1.0
**Last Updated**: October 7, 2025
**For**: Operations Team, Support Engineers, Developers

---

## Table of Contents

1. [Common Issues](#common-issues)
2. [Desktop App Connection Problems](#desktop-app-connection-problems)
3. [Print Test Failures](#print-test-failures)
4. [High Latency Issues](#high-latency-issues)
5. [Database Connection Problems](#database-connection-problems)
6. [Diagnostic Tools](#diagnostic-tools)
7. [Log Analysis](#log-analysis)

---

## Common Issues

### Issue: Desktop App Won't Connect to WebSocket

**Symptoms**:
- Desktop app shows "Disconnected" status
- No printers appearing in web interface
- Backend logs show no "Client connected" messages

**Diagnosis Steps**:

```bash
# Step 1: Verify backend is running
pm2 status backend

# Expected Output:
# │ name    │ status │ ↺ │ cpu │ mem │
# │ backend │ online │ 0 │ 0%  │ ... │

# Step 2: Check if WebSocket port is listening
netstat -tlnp | grep 3001

# Expected Output:
# tcp 0 0 0.0.0.0:3001 0.0.0.0:* LISTEN 12345/node

# Step 3: Test WebSocket endpoint
curl -i http://31.57.166.18:3001/socket.io/

# Expected Output:
# HTTP/1.1 200 OK
# (Socket.IO handshake response)

# Step 4: Check Desktop App logs
# Desktop App log location: ~/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop/logs/app.log
cat ~/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop/logs/app.log | tail -50

# Look for:
# - "WebSocket connection established"
# - "Connection failed" errors
```

**Solutions**:

1. **Backend Not Running**:
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/backend
   pm2 start ecosystem.config.js
   # or
   pm2 restart backend
   ```

2. **CORS Issues**:
   ```bash
   # Check CORS configuration
   grep CORS_ORIGINS /home/admin/restaurant-platform-remote-v2/backend/.env

   # Should include Desktop App origin
   # CORS_ORIGINS=http://localhost:3000,http://31.57.166.18:3000

   # If missing, add and restart:
   echo "CORS_ORIGINS=http://localhost:3000,http://31.57.166.18:3000" >> .env
   pm2 restart backend
   ```

3. **Firewall Blocking Port**:
   ```bash
   # Check firewall status
   sudo ufw status | grep 3001

   # If not allowed, add rule:
   sudo ufw allow 3001/tcp
   sudo ufw reload
   ```

4. **Wrong WebSocket URL in Desktop App**:
   ```javascript
   // Check Desktop App configuration
   // File: PrinterMasterv2/apps/desktop/config.js
   // Should be: http://31.57.166.18:3001

   // Edit if incorrect and restart Desktop App
   ```

---

### Issue: Print Tests Timeout

**Symptoms**:
- Web interface shows "Test print sent" but no response
- Backend logs show "Request timeout after 15000ms"
- Correlation ID warnings in logs

**Diagnosis Steps**:

```bash
# Step 1: Check if Desktop App is connected
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health | jq '.totalClients'

# Expected: Number > 0

# Step 2: Check pending requests
pm2 logs backend --lines 100 --nostream | grep "pending requests"

# Look for high numbers (>50 indicates problem)

# Step 3: Check correlation ID resolution
pm2 logs backend --lines 100 --nostream | grep "Resolved request"

# Should see matching resolution logs

# Step 4: Check Desktop App printer status
pm2 logs backend --lines 100 --nostream | grep "STATUS-UPDATE"
```

**Solutions**:

1. **No Desktop Apps Connected**:
   ```bash
   # Verify Desktop App is running on client machine
   # User must start RestaurantPrint Pro application

   # Check connection from Desktop App side:
   # Desktop App logs should show:
   # "WebSocket connection established to ws://31.57.166.18:3001"
   ```

2. **Correlation ID Mismatch**:
   ```bash
   # Check backend logs for correlation ID flow
   pm2 logs backend --lines 200 --nostream | grep "correlationId"

   # Should see sequence:
   # 1. "Registered pending request: printer_test_..."
   # 2. "Correlation ID: printer_test_..."
   # 3. "Resolved request: printer_test_..."

   # If mismatch, likely Desktop App version is old
   # Update Desktop App to latest version
   ```

3. **Stale Pending Requests**:
   ```bash
   # Backend automatically cleans up every 30 seconds
   # Force cleanup by restarting:
   pm2 restart backend

   # Monitor cleanup logs:
   pm2 logs backend --lines 50 | grep "Cleaned up"
   ```

4. **Printer Offline**:
   ```bash
   # Check printer status in database
   psql -h localhost -U postgres -d postgres -c \
     "SELECT name, status, \"lastSeen\" FROM \"Printer\" WHERE id = 'printer-uuid';"

   # If status is 'offline' or lastSeen is old:
   # - Check physical printer power/connection
   # - Restart Desktop App
   # - Check printer cables (USB/Network)
   ```

---

### Issue: High Latency Warnings

**Symptoms**:
- Desktop App logs show latency >500ms
- Connection quality reported as "poor"
- Health alerts in backend logs

**Diagnosis Steps**:

```bash
# Step 1: Get current latency metrics
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health | jq '.healthMetrics[] | {deviceId, averageLatency, connectionQuality}'

# Step 2: Check network connectivity
ping -c 10 31.57.166.18

# Step 3: Check backend CPU/memory
pm2 monit

# Step 4: Check database query performance
psql -h localhost -U postgres -d postgres -c \
  "SELECT pg_stat_statements_reset();"
# Wait 1 minute
psql -h localhost -U postgres -d postgres -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions**:

1. **Network Issues**:
   ```bash
   # Check routing
   traceroute 31.57.166.18

   # Check for packet loss
   mtr -r -c 100 31.57.166.18

   # If high packet loss:
   # - Contact network administrator
   # - Check ISP connection
   # - Verify no bandwidth throttling
   ```

2. **Backend Overload**:
   ```bash
   # Check backend resource usage
   pm2 monit

   # If CPU >80% or Memory high:
   # Option 1: Restart backend
   pm2 restart backend

   # Option 2: Scale vertically
   pm2 delete backend
   pm2 start dist/main.js --name backend --max-memory-restart 4G

   # Option 3: Scale horizontally (add instance)
   # See OPERATIONAL_RUNBOOKS.md for procedure
   ```

3. **Slow Database Queries**:
   ```bash
   # Identify slow queries
   psql -h localhost -U postgres -d postgres -c \
     "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 20;"

   # If slow queries found:
   # - Add missing indexes
   # - Optimize query structure
   # - Consider query caching
   ```

4. **Geographic Distance**:
   ```bash
   # If Desktop App is far from server:
   # - Consider regional deployment
   # - Use CDN for static assets
   # - Implement edge caching
   ```

---

## Desktop App Connection Problems

### Problem: Connection Keeps Dropping

**Symptoms**:
- Frequent reconnection logs
- High `reconnectionCount` in health metrics
- Intermittent printer availability

**Diagnosis**:

```bash
# Check reconnection frequency
pm2 logs backend --lines 500 | grep "Client connected\|Client disconnected" | tail -20

# Get detailed health metrics
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health/desktop-device-001 | jq '.reconnectionCount'

# Check for network stability
# On client machine:
ping -i 1 -c 300 31.57.166.18 | tee ping-results.txt
# Analyze packet loss percentage
```

**Solutions**:

1. **Network Instability**:
   ```bash
   # Client-side fixes:
   # - Check WiFi signal strength
   # - Switch to wired connection
   # - Check router firmware updates
   # - Disable power-saving modes
   ```

2. **Backend Restarts**:
   ```bash
   # Check if backend is restarting frequently
   pm2 logs backend | grep "Started\|Stopped"

   # If backend restarts due to memory:
   pm2 restart backend --max-memory-restart 4G
   ```

3. **Load Balancer Session Issues**:
   ```bash
   # Verify sticky sessions enabled in load balancer
   # Nginx example:
   # upstream backend_cluster {
   #   ip_hash;  # Enables sticky sessions
   #   ...
   # }
   ```

---

### Problem: Authentication Failures

**Symptoms**:
- Desktop App connection rejected
- Backend logs show "Authentication failed"
- "Invalid license key" errors

**Diagnosis**:

```bash
# Check Desktop App authentication logs
cat ~/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop/logs/app.log | grep "auth\|license"

# Check backend authentication logs
pm2 logs backend --lines 200 | grep "Authentication\|LICENSE"

# Verify license key in database
psql -h localhost -U postgres -d postgres -c \
  "SELECT key, \"isActive\", \"expiresAt\" FROM \"PrinterLicense\" WHERE key = 'license-key-here';"
```

**Solutions**:

1. **Expired License**:
   ```bash
   # Update license expiration
   psql -h localhost -U postgres -d postgres -c \
     "UPDATE \"PrinterLicense\" SET \"expiresAt\" = '2026-12-31' WHERE key = 'license-key-here';"
   ```

2. **Inactive License**:
   ```bash
   # Activate license
   psql -h localhost -U postgres -d postgres -c \
     "UPDATE \"PrinterLicense\" SET \"isActive\" = true WHERE key = 'license-key-here';"
   ```

3. **Wrong License Key**:
   ```javascript
   // Check Desktop App configuration
   // File: PrinterMasterv2/apps/desktop/config.js
   // Verify license key matches database

   // Update configuration and restart Desktop App
   ```

---

## Print Test Failures

### Problem: Physical Printer Not Responding

**Symptoms**:
- Print test returns success but nothing prints
- Printer status shows "online" but unresponsive
- No error messages in logs

**Diagnosis**:

```bash
# Step 1: Check printer connectivity from Desktop App machine
# USB Printer:
lsusb | grep -i printer

# Network Printer:
ping <printer-ip-address>

# Step 2: Check printer status in OS
lpstat -p -d

# Step 3: Test direct print to printer
echo "Test Print" | lp -d POS-80C

# Step 4: Check Desktop App printer manager logs
cat ~/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop/logs/printer-manager.log | tail -50
```

**Solutions**:

1. **Printer Offline**:
   ```bash
   # Power cycle printer
   # 1. Turn off printer
   # 2. Wait 10 seconds
   # 3. Turn on printer
   # 4. Wait for printer to initialize

   # Re-scan for printers in Desktop App
   # Or restart Desktop App
   ```

2. **USB Connection Issues**:
   ```bash
   # Check USB device
   lsusb -v | grep -A 10 "Printer"

   # If not detected:
   # - Try different USB port
   # - Check USB cable
   # - Verify printer drivers installed
   ```

3. **Network Printer Issues**:
   ```bash
   # Verify printer IP reachable
   ping -c 5 192.168.1.100

   # Test raw printing
   echo "Test" | nc 192.168.1.100 9100

   # If unreachable:
   # - Check printer network settings
   # - Verify same network subnet
   # - Check firewall rules
   ```

4. **ESC/POS Command Issues**:
   ```bash
   # Desktop App might be sending wrong commands
   # Check printer model supports ESC/POS
   # Update printer definition in Desktop App

   # Test with raw ESC/POS commands:
   printf "\x1b\x40Test Print\n\n\n\x1b\x64\x04\x1b\x69" | lp -d POS-80C
   ```

---

### Problem: Print Job Queue Stuck

**Symptoms**:
- Multiple print jobs pending
- Jobs not processing
- Queue length keeps increasing

**Diagnosis**:

```bash
# Check active print jobs
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/jobs/active | jq '.'

# Check printer queue in backend
pm2 logs backend | grep "queueLength"

# Check Desktop App print queue
# Desktop App logs should show queue status
cat ~/restaurant-platform-remote-v2/PrinterMasterv2/apps/desktop/logs/app.log | grep "queue"
```

**Solutions**:

1. **Clear Backend Queue**:
   ```bash
   # Restart backend to clear in-memory queue
   pm2 restart backend
   ```

2. **Clear System Print Queue**:
   ```bash
   # Cancel all print jobs
   cancel -a

   # Restart CUPS (if using)
   sudo systemctl restart cups
   ```

3. **Restart Desktop App**:
   ```bash
   # User must restart RestaurantPrint Pro application
   # This clears Desktop App's internal queue
   ```

---

## High Latency Issues

### Problem: Consistent High Latency (>500ms)

**Symptoms**:
- All Desktop Apps showing poor connection quality
- Slow print test responses
- User complaints about system slowness

**Diagnosis**:

```bash
# Step 1: Check backend performance
pm2 monit

# Step 2: Check database performance
psql -h localhost -U postgres -d postgres -c \
  "SELECT datname, numbackends, xact_commit, xact_rollback, blks_read, blks_hit FROM pg_stat_database WHERE datname = 'postgres';"

# Step 3: Check system resources
top -b -n 1 | head -20
free -h
df -h

# Step 4: Check network latency from different locations
# Run from multiple Desktop App machines:
ping -c 100 31.57.166.18 | tail -1
```

**Solutions**:

1. **Database Slow Queries**:
   ```bash
   # Enable query logging
   psql -h localhost -U postgres -d postgres -c \
     "ALTER SYSTEM SET log_min_duration_statement = 100;"  # Log queries >100ms
   psql -h localhost -U postgres -d postgres -c \
     "SELECT pg_reload_conf();"

   # Review slow query log
   tail -f /var/log/postgresql/postgresql-main.log | grep "duration"

   # Add missing indexes
   psql -h localhost -U postgres -d postgres -c \
     "CREATE INDEX CONCURRENTLY idx_printer_branch ON \"Printer\"(\"branchId\") WHERE \"deletedAt\" IS NULL;"
   ```

2. **Memory Pressure**:
   ```bash
   # Check memory usage
   free -h

   # If low available memory:
   # Clear cache
   sudo sync; echo 3 | sudo tee /proc/sys/vm/drop_caches

   # Increase swap (if needed)
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **CPU Saturation**:
   ```bash
   # Check CPU usage
   top -b -n 1 | head -10

   # If backend using >80% CPU:
   # Option 1: Optimize code (profile and fix hot spots)
   # Option 2: Scale horizontally (add instance)
   # Option 3: Upgrade server CPU
   ```

---

## Database Connection Problems

### Problem: "Too Many Connections" Error

**Symptoms**:
- Backend crashes with "FATAL: sorry, too many clients already"
- Intermittent database connection failures
- 503 errors from API endpoints

**Diagnosis**:

```bash
# Check current connections
psql -h localhost -U postgres -d postgres -c \
  "SELECT COUNT(*) FROM pg_stat_activity;"

# Check connection limit
psql -h localhost -U postgres -d postgres -c \
  "SHOW max_connections;"

# Check Prisma connection pool settings
grep "connection_limit" /home/admin/restaurant-platform-remote-v2/backend/prisma/schema.prisma
```

**Solutions**:

1. **Increase PostgreSQL Connection Limit**:
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/14/main/postgresql.conf

   # Change:
   # max_connections = 200  (increase from default 100)

   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Optimize Prisma Connection Pool**:
   ```prisma
   // File: backend/prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Add connection pool limits
     // DATABASE_URL="postgresql://user:pass@localhost:5432/postgres?connection_limit=20&pool_timeout=10"
   }
   ```

3. **Kill Idle Connections**:
   ```bash
   # Kill connections idle for >1 hour
   psql -h localhost -U postgres -d postgres -c \
     "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '1 hour';"
   ```

4. **Enable Connection Pooling (PgBouncer)**:
   ```bash
   # Install PgBouncer
   sudo apt-get install pgbouncer

   # Configure PgBouncer
   sudo nano /etc/pgbouncer/pgbouncer.ini

   # [databases]
   # postgres = host=localhost port=5432 dbname=postgres

   # [pgbouncer]
   # listen_addr = 127.0.0.1
   # listen_port = 6432
   # pool_mode = transaction
   # max_client_conn = 500
   # default_pool_size = 20

   # Start PgBouncer
   sudo systemctl start pgbouncer

   # Update backend DATABASE_URL to use PgBouncer
   # DATABASE_URL="postgresql://user:pass@localhost:6432/postgres"
   ```

---

## Diagnostic Tools

### WebSocket Connection Testing Tool

```javascript
// File: test-websocket-connection.js
const io = require('socket.io-client');

const socket = io('http://31.57.166.18:3001/printing-ws', {
  auth: {
    token: process.env.JWT_TOKEN,
    userRole: 'web_user'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection Error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️ Disconnected:', reason);
});

socket.on('printerUpdate', (data) => {
  console.log('📡 Printer Update:', data);
});

// Test print request
setTimeout(() => {
  console.log('📤 Sending test print request...');
  socket.emit('testPrinter', { printerId: 'test-printer-1' });
}, 2000);

// Keep alive
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  socket.close();
  process.exit(0);
});
```

**Usage**:
```bash
JWT_TOKEN="your-token-here" node test-websocket-connection.js
```

---

### Health Monitoring Dashboard Script

```bash
#!/bin/bash
# File: health-dashboard.sh

clear
echo "========================================="
echo "PrinterMaster Health Dashboard"
echo "========================================="
echo ""

# Backend status
echo "🖥️  Backend Status:"
pm2 status backend | grep backend

# WebSocket connections
echo ""
echo "🔌 Active WebSocket Connections:"
CONNECTIONS=$(pm2 logs backend --lines 1000 --nostream | grep "Client connected" | wc -l)
DISCONNECTIONS=$(pm2 logs backend --lines 1000 --nostream | grep "Client disconnected" | wc -l)
echo "  Connected: $CONNECTIONS"
echo "  Disconnected: $DISCONNECTIONS"
echo "  Active: $((CONNECTIONS - DISCONNECTIONS))"

# Desktop App health
echo ""
echo "📱 Desktop App Health:"
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  http://31.57.166.18:3001/printing/desktop-health | \
  jq -r '.summary | "  Excellent: \(.excellent)\n  Good: \(.good)\n  Fair: \(.fair)\n  Poor: \(.poor)"'

# Database connections
echo ""
echo "🗄️  Database Connections:"
psql -h localhost -U postgres -d postgres -t -c \
  "SELECT COUNT(*) FROM pg_stat_activity;" | tr -d ' '

# Recent errors
echo ""
echo "❌ Recent Errors (last 50 lines):"
pm2 logs backend --lines 50 --nostream | grep -i "error\|failed" | tail -5

echo ""
echo "========================================="
echo "Last Updated: $(date)"
echo "========================================="
```

**Usage**:
```bash
chmod +x health-dashboard.sh
watch -n 5 ./health-dashboard.sh
```

---

## Log Analysis

### Common Log Patterns

**1. Successful Connection**:
```
[WEBSOCKET] Client connected: abc123def456
[WEB] Connected: branch_manager - Branch: branch-uuid-1
[ROOMS] Auto-joined branch room: branch-uuid-1
```

**2. Failed Authentication**:
```
[ERROR] Authentication failed for client: abc123def456
[WARN] Invalid JWT token provided
```

**3. Print Test Success**:
```
[PHYSICAL-TEST] Sending test to PrinterMaster: POS-80C
[PHYSICAL-TEST] Correlation ID: printer_test_1696700000_001_abc123
[PHYSICAL-TEST] Test request sent to client 1/1
[TEST-RESULT] Printer test result received
[REQ-RES] Resolved request: printer_test_1696700000_001_abc123
```

**4. Print Test Timeout**:
```
[PHYSICAL-TEST] Sending test to PrinterMaster: POS-80C
[PHYSICAL-TEST] Correlation ID: printer_test_1696700000_002_def456
[REQ-RES] Request timeout: printer_test_1696700000_002_def456
[WARN] No pending request found for: printer_test_1696700000_002_def456
```

**5. Health Report**:
```
[HEALTH] Health report received from desktop-device-001 (branch-uuid-1)
[HEALTH] Quality: excellent, Latency: 45ms, Uptime: 3600s
```

---

### Log Analysis Commands

```bash
# Find all WebSocket connection events
pm2 logs backend --lines 1000 | grep "Client connected\|Client disconnected"

# Find all correlation ID issues
pm2 logs backend --lines 1000 | grep "correlationId\|Correlation ID"

# Find all health alerts
pm2 logs backend --lines 1000 | grep "HEALTH-ALERT"

# Find all errors
pm2 logs backend --lines 1000 | grep "ERROR\|CRITICAL"

# Count errors by type
pm2 logs backend --lines 5000 --nostream | grep "ERROR" | awk '{print $4}' | sort | uniq -c | sort -rn

# Find slow operations (>1000ms)
pm2 logs backend --lines 1000 | grep "took.*ms" | awk '{for(i=1;i<=NF;i++){if($i~/[0-9]+ms/){print $i}}}' | sed 's/ms//' | awk '$1>1000'
```

---

## Escalation Path

### Level 1 Support (Help Desk)
- Basic connectivity checks
- Desktop App restart
- Printer power cycle
- Follow this troubleshooting guide

### Level 2 Support (Operations Team)
- Backend restart
- Log analysis
- Database query optimization
- Network diagnostics

### Level 3 Support (Development Team)
- Code fixes required
- Architecture changes
- Performance optimization
- Database schema changes

---

**Document Owner**: Support Team
**Last Reviewed**: October 7, 2025
**Next Review**: January 7, 2026
**Contact**: support@example.com
