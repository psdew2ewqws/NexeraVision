# Troubleshooting Guide

## Common API Connection Issues

This guide covers common connectivity issues between frontend, backend, and PrinterMaster services.

---

## Table of Contents

1. [API Connection Issues](#api-connection-issues)
2. [Port Configuration Problems](#port-configuration-problems)
3. [Environment Variable Issues](#environment-variable-issues)
4. [CORS Errors](#cors-errors)
5. [PrinterMaster Connection Issues](#printermaster-connection-issues)
6. [Database Connection Problems](#database-connection-problems)
7. [Quick Diagnostic Tools](#quick-diagnostic-tools)

---

## API Connection Issues

### Problem: Frontend shows "Failed to fetch" or "Network Error"

**Symptoms:**
- API calls return network errors
- Console shows CORS errors or connection refused
- Features not loading data

**Common Causes:**
1. Backend not running
2. Wrong API URL in frontend configuration
3. Port mismatch between frontend and backend
4. CORS not properly configured

**Solutions:**

#### 1. Check Backend is Running
```bash
# Check if backend is running on port 3001
curl http://localhost:3001/health

# Or check with lsof
lsof -i :3001
```

#### 2. Verify Frontend API URL
```bash
# Check frontend environment file
cat frontend/.env.local | grep NEXT_PUBLIC_API_URL

# Should output:
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 3. Run Health Check
```bash
cd frontend
npm run health-check
```

---

## Port Configuration Problems

### Standard Port Configuration

| Service       | Port | Purpose                    |
|---------------|------|----------------------------|
| Frontend      | 3000 | Next.js development server |
| Backend       | 3001 | NestJS API server          |
| PrinterMaster | 8182 | Printer service            |

### Problem: Wrong Port in Configuration

**Symptoms:**
- Connection errors even though services are running
- "Connection refused" errors
- API returns 404 for all endpoints

**Common Wrong Ports:**
- `3002` - Often mistakenly used for backend
- `5000` - Sometimes used in development
- `8080` - Generic port that conflicts with other services

**Fix:**

1. **Check Backend Port:**
```bash
# In backend/.env
PORT=3001  # Correct

# Verify in main.ts
grep -n "3001" backend/src/main.ts
```

2. **Check Frontend API URL:**
```bash
# In frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001  # Correct
```

3. **Run Configuration Validation:**
```bash
./scripts/validate-config.sh
```

---

## Environment Variable Issues

### Problem: Environment Variables Not Set

**Symptoms:**
- Frontend shows "API URL not configured" error
- Backend cannot connect to database
- Application fails to start

**Required Environment Variables:**

#### Frontend (`.env.local`)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# PrinterMaster Configuration (optional)
NEXT_PUBLIC_PRINTER_URL=http://localhost:8182

# WebSocket Configuration (optional)
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

#### Backend (`.env`)
```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-secure-secret-here
JWT_EXPIRES_IN=24h
```

**Fix:**

1. **Create Missing Files:**
```bash
# Create frontend .env.local if missing
touch frontend/.env.local

# Add required configuration
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' >> frontend/.env.local
```

2. **Verify Configuration:**
```bash
# Run configuration validation
./scripts/validate-config.sh --verbose
```

---

## CORS Errors

### Problem: CORS Policy Blocking Requests

**Symptoms:**
```
Access to fetch at 'http://localhost:3001/api/menu' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Common Causes:**
1. Frontend URL not in CORS whitelist
2. Missing CORS configuration in backend
3. Wrong origin in CORS settings

**Fix:**

1. **Check Backend CORS Configuration:**
```typescript
// backend/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

2. **Verify Frontend URL in Backend .env:**
```bash
echo 'FRONTEND_URL=http://localhost:3000' >> backend/.env
```

3. **Restart Backend:**
```bash
cd backend
npm run start:dev
```

---

## PrinterMaster Connection Issues

### Problem: Printers Not Responding

**Symptoms:**
- "PrinterMaster not available" error
- Print jobs not executing
- Printer list empty

**Solutions:**

#### 1. Check PrinterMaster Service
```bash
# Check if PrinterMaster is running
curl http://localhost:8182/health

# Check process
ps aux | grep PrinterMaster
```

#### 2. Verify Printer Configuration
```bash
# Test printer connectivity
curl -X POST http://localhost:8182/print \
  -H "Content-Type: application/json" \
  -d '{
    "printer": "POS-80C",
    "text": "Test Print",
    "id": "test-123"
  }'
```

#### 3. Check CUPS Configuration (Linux)
```bash
# List available printers
lpstat -p -d

# Test direct printing
echo "Test" | lp -d POS-80C
```

---

## Database Connection Problems

### Problem: Cannot Connect to Database

**Symptoms:**
- Backend fails to start
- "Connection refused" or "Authentication failed" errors
- Prisma client errors

**Solutions:**

#### 1. Verify PostgreSQL is Running
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql
```

#### 2. Test Database Connection
```bash
# Using psql
psql -U postgres -d postgres -c "SELECT 1;"

# Should prompt for password: E$$athecode006
```

#### 3. Verify Database URL
```bash
# Check backend/.env
cat backend/.env | grep DATABASE_URL

# Should be:
# DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres"
```

#### 4. Check Database Exists
```bash
# List databases
psql -U postgres -c "\l"

# If 'postgres' database missing, it will be created on first run
```

---

## Quick Diagnostic Tools

### Health Check Script

Run comprehensive health checks before starting development:

```bash
cd frontend
npm run health-check
```

**What it checks:**
- ✅ Environment variables are set
- ✅ API URL format is valid
- ✅ Backend is responding
- ✅ No hardcoded wrong ports in code
- ✅ Port configuration is correct

### Configuration Validation

Validate entire system configuration:

```bash
./scripts/validate-config.sh
```

**What it checks:**
- ✅ Backend configuration (.env)
- ✅ Frontend configuration (.env.local)
- ✅ Port conflicts
- ✅ CORS settings
- ✅ Database connection
- ✅ Consistency across services

### Pre-Commit Validation

Prevent committing configuration issues:

```bash
# Install as git hook
ln -s ../../.github/pre-commit-check.sh .git/hooks/pre-commit

# Or run manually
./.github/pre-commit-check.sh
```

**What it checks:**
- ✅ No hardcoded wrong ports in staged files
- ✅ Environment variables properly used
- ✅ Port configuration consistency
- ✅ API client configuration

---

## Port Configuration Checklist

Use this checklist when setting up or troubleshooting the system:

### Backend Configuration
- [ ] Backend `.env` file exists
- [ ] `PORT=3001` in backend `.env`
- [ ] `DATABASE_URL` points to `postgres` database
- [ ] `DATABASE_URL` uses password `E$$athecode006`
- [ ] `FRONTEND_URL=http://localhost:3000` in backend `.env`
- [ ] CORS enabled in `main.ts`
- [ ] Backend starts successfully on port 3001

### Frontend Configuration
- [ ] Frontend `.env.local` file exists
- [ ] `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env.local`
- [ ] No hardcoded `localhost:3002` or wrong ports in code
- [ ] API client uses environment variable
- [ ] Frontend starts successfully on port 3000

### Service Status
- [ ] PostgreSQL is running
- [ ] Backend is accessible at `http://localhost:3001/health`
- [ ] Frontend is accessible at `http://localhost:3000`
- [ ] PrinterMaster is accessible at `http://localhost:8182/health` (if needed)

### Testing
- [ ] Health check script passes: `npm run health-check`
- [ ] Configuration validation passes: `./scripts/validate-config.sh`
- [ ] API calls work from frontend
- [ ] No CORS errors in browser console

---

## Environment Variable Setup Guide

### Step-by-Step Setup

#### 1. Backend Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create .env file if it doesn't exist
touch .env

# Add configuration
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-secure-secret-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
EOF

# Verify configuration
npm run start:dev
```

#### 2. Frontend Environment Setup

```bash
# Navigate to frontend directory
cd frontend

# Create .env.local file
touch .env.local

# Add configuration
cat > .env.local << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# PrinterMaster Configuration
NEXT_PUBLIC_PRINTER_URL=http://localhost:8182

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Environment
NEXT_PUBLIC_ENV=development
EOF

# Verify configuration
npm run health-check
```

#### 3. Verify Complete Setup

```bash
# Return to project root
cd ..

# Run full configuration validation
./scripts/validate-config.sh --verbose

# Start services
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Test connectivity
curl http://localhost:3001/health
curl http://localhost:3000
```

---

## Common Error Messages and Solutions

### Error: "NEXT_PUBLIC_API_URL environment variable is not set"

**Cause:** Missing or empty API URL in frontend environment

**Fix:**
```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' >> frontend/.env.local
```

---

### Error: "Backend connectivity failed: connect ECONNREFUSED"

**Cause:** Backend is not running or wrong port

**Fix:**
```bash
# Check if backend is running
lsof -i :3001

# If not running, start it
cd backend && npm run start:dev

# If running on wrong port, fix .env
echo 'PORT=3001' > backend/.env
```

---

### Error: "Hardcoded URLs with wrong ports found"

**Cause:** Source code has hardcoded `localhost:3002` or other wrong ports

**Fix:**
```bash
# Find the files
grep -r "localhost:3002" frontend/src

# Replace with environment variable
# In API client files, use:
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

### Error: "Database connection failed"

**Cause:** PostgreSQL not running or wrong credentials

**Fix:**
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Test connection
psql -U postgres -d postgres

# Verify password is: E$$athecode006
```

---

### Error: "Port 3001 is already in use"

**Cause:** Another process is using the backend port

**Fix:**
```bash
# Find process using port
lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use different port temporarily
PORT=3002 npm run start:dev
```

---

## Advanced Troubleshooting

### Enable Verbose Logging

#### Backend
```bash
# Start with debug logging
DEBUG=* npm run start:dev

# Or set in .env
LOG_LEVEL=debug
```

#### Frontend
```bash
# Enable Next.js debug mode
NODE_OPTIONS='--inspect' npm run dev
```

---

### Network Debugging

#### Test Backend API
```bash
# Health check
curl -v http://localhost:3001/health

# Test specific endpoint
curl -v http://localhost:3001/api/menu/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check CORS headers
curl -v -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3001/api/menu/products
```

#### Test PrinterMaster
```bash
# Health check
curl http://localhost:8182/health

# List printers
curl http://localhost:8182/printers

# Test print
curl -X POST http://localhost:8182/print \
  -H "Content-Type: application/json" \
  -d '{"printer":"POS-80C","text":"Test","id":"test-1"}'
```

---

### Database Debugging

```bash
# Check active connections
psql -U postgres -d postgres -c "SELECT * FROM pg_stat_activity;"

# Check tables
psql -U postgres -d postgres -c "\dt"

# Check database size
psql -U postgres -d postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Reset database (caution: deletes all data)
cd backend
npx prisma migrate reset
npx prisma db push
```

---

## Getting Help

If you've tried all troubleshooting steps and still have issues:

1. **Check Logs:**
   - Backend: `backend/logs/`
   - Frontend: Browser console (F12)
   - PrinterMaster: Service logs

2. **Gather Diagnostic Information:**
   ```bash
   # Run all checks
   ./scripts/validate-config.sh --verbose > diagnostics.txt
   cd frontend && npm run health-check >> ../diagnostics.txt

   # Check service status
   curl http://localhost:3001/health >> diagnostics.txt
   curl http://localhost:8182/health >> diagnostics.txt
   ```

3. **Document the Issue:**
   - Exact error message
   - Steps to reproduce
   - What you've already tried
   - Output from diagnostic scripts

---

## Prevention Best Practices

### 1. Always Use Environment Variables
```typescript
// ✅ Good
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ Bad
const apiUrl = 'http://localhost:3002';
```

### 2. Run Health Checks Before Committing
```bash
# Add to git pre-commit hook
npm run health-check && git commit
```

### 3. Use Configuration Validation
```bash
# Run before starting development
./scripts/validate-config.sh
```

### 4. Document Configuration Changes
When changing ports or URLs, update:
- Environment files (`.env`, `.env.local`)
- Documentation
- Docker configurations
- Deployment scripts

---

## Quick Reference

### Essential Commands

```bash
# Health checks
npm run health-check                    # Frontend health check
./scripts/validate-config.sh            # Full system validation

# Service status
curl http://localhost:3001/health       # Backend
curl http://localhost:3000              # Frontend
curl http://localhost:8182/health       # PrinterMaster

# Database
psql -U postgres -d postgres            # Connect to database
sudo systemctl status postgresql        # Check PostgreSQL status

# Ports
lsof -i :3001                          # Check backend port
lsof -i :3000                          # Check frontend port
lsof -i :8182                          # Check PrinterMaster port
```

### Configuration Files

```
backend/.env                           # Backend configuration
frontend/.env.local                    # Frontend configuration
backend/src/main.ts                    # Backend startup & CORS
frontend/scripts/health-check.js       # Health check script
scripts/validate-config.sh             # Configuration validator
.github/pre-commit-check.sh           # Pre-commit validation
```

---

*Last Updated: 2025-09-30*
*Version: 1.0.0*
