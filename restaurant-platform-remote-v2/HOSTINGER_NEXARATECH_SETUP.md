# Hostinger + nexaratech.io Webhook Setup Guide

## Your Hostinger Details
- **API Key**: `VJL7xWNORbQYqRuecEsMmORWbDfwdmEouYqgmn919c78fb46`
- **Domain**: `nexaratech.io`
- **Webhook URL**: `https://api.nexaratech.io/api/v1/delivery/webhook/careem`

---

## Architecture Overview

```
Careem Servers
      ↓
https://api.nexaratech.io/api/v1/delivery/webhook/careem
      ↓
Hostinger VPS/Cloud (Nginx/Apache)
      ↓
Your Backend (Port 3001)
      ↓
PostgreSQL Database
```

---

## Step-by-Step Setup

### Step 1: Access Your Hostinger VPS

**Via Hostinger Control Panel (hPanel)**:
1. Login to https://hpanel.hostinger.com/
2. Go to **VPS** section
3. Click **Manage** on your VPS
4. Open **SSH Access** or use web-based terminal

**Via SSH from Local Machine**:
```bash
# Get SSH details from Hostinger hPanel
ssh root@your-vps-ip  # or username@your-vps-ip
# Enter password from Hostinger panel
```

---

### Step 2: Configure DNS in Hostinger

**Option A: Using Hostinger hPanel**:
1. Go to https://hpanel.hostinger.com/
2. Click **Domains** → Select `nexaratech.io`
3. Go to **DNS / Name Servers**
4. Add **A Record**:
   ```
   Type: A
   Name: api
   Points to: [Your VPS IP Address]
   TTL: 14400 (or Auto)
   ```
5. Save changes

**Option B: If using Cloudflare**:
1. Login to Cloudflare
2. Select `nexaratech.io`
3. Go to **DNS** → **Records**
4. Add A Record:
   ```
   Type: A
   Name: api
   IPv4 address: [Your VPS IP]
   Proxy status: Proxied (orange cloud) ✅
   TTL: Auto
   ```

**Result**: `api.nexaratech.io` → Your Hostinger VPS

---

### Step 3: Install Required Software

**Connect to VPS via SSH, then run**:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (required for backend)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version  # Should show v18.x or higher
npm --version

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

---

### Step 4: Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE postgres;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'E$$athecode006';
GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;
\q

# Test connection
psql -U postgres -d postgres -h localhost
# Enter password: E$$athecode006
# If successful, type \q to exit
```

---

### Step 5: Deploy Backend Application

```bash
# Create application directory
sudo mkdir -p /var/www/nexaratech
cd /var/www/nexaratech

# Clone your repository (or upload files)
# Option A: Using Git
git clone [your-repo-url] backend
cd backend

# Option B: Upload via SCP from local machine
# On your local machine:
cd /home/admin/restaurant-platform-remote-v2
tar -czf backend.tar.gz backend/
scp backend.tar.gz root@your-vps-ip:/var/www/nexaratech/
# Then on VPS:
cd /var/www/nexaratech
tar -xzf backend.tar.gz
cd backend

# Install dependencies
npm install --production

# Create production .env file
sudo nano .env
```

**Paste this in `.env`**:
```bash
# Database
DATABASE_URL=postgresql://postgres:E$$athecode006@localhost:5432/postgres

# Application
NODE_ENV=production
PORT=3001

# Careem Integration
CAREEM_CLIENT_ID=4a27196f-7c1b-42c2-82ff-7e251126f1b1
CAREEM_CLIENT_SECRET=3d327a41-7dca-4b03-94dc-f91e79aed220
CAREEM_WEBHOOK_SECRET=2a3d9339-c2b1-498a-aac3-443ac029efb9
CAREEM_WEBHOOK_URL=https://api.nexaratech.io/api/v1/delivery/webhook/careem

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://nexaratech.io,https://www.nexaratech.io

# Hostinger API (if needed for automation)
HOSTINGER_API_KEY=VJL7xWNORbQYqRuecEsMmORWbDfwdmEouYqgmn919c78fb46
```

**Save** (Ctrl+X, then Y, then Enter)

```bash
# Run Prisma migrations
npx prisma generate
npx prisma migrate deploy

# Build application
npm run build

# Start with PM2
pm2 start dist/main.js --name nexaratech-backend
pm2 save
pm2 startup  # Follow the command it gives you

# Check status
pm2 status
pm2 logs nexaratech-backend
```

---

### Step 6: Configure Nginx for api.nexaratech.io

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/api.nexaratech.io
```

**Paste this configuration**:
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.nexaratech.io;

    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.nexaratech.io;

    # SSL Configuration (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.nexaratech.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nexaratech.io/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/api.nexaratech.io-access.log;
    error_log /var/log/nginx/api.nexaratech.io-error.log;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Proxy to Backend (Port 3001)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # WebSocket Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward Real IP and Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer Settings
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # Specific Careem Webhook Route (Optional - for monitoring)
    location /api/v1/delivery/webhook/careem {
        proxy_pass http://localhost:3001/api/v1/delivery/webhook/careem;

        # Log all webhook requests
        access_log /var/log/nginx/careem-webhook.log;

        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Careem signature header
        proxy_set_header x-webhook-signature $http_x_webhook_signature;

        # Timeouts
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
    }
}
```

**Save** (Ctrl+X, Y, Enter)

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/api.nexaratech.io /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

### Step 7: Install SSL Certificate (Let's Encrypt)

```bash
# Create certbot directory
sudo mkdir -p /var/www/certbot

# Get SSL certificate
sudo certbot --nginx -d api.nexaratech.io

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew via cron/systemd timer
```

---

### Step 8: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL only from localhost (security)
sudo ufw allow from 127.0.0.1 to any port 5432

# Block direct access to backend port 3001 from outside
# (Only Nginx should access it)
sudo ufw deny 3001/tcp

# Check firewall status
sudo ufw status verbose
```

---

### Step 9: Test Your Setup

**Test 1: Check Backend is Running**
```bash
# On VPS
curl http://localhost:3001/api/v1/delivery/webhook/careem

# Should return something (not connection refused)
```

**Test 2: Check Public HTTPS Access**
```bash
# From any machine
curl -I https://api.nexaratech.io/api/v1/delivery/webhook/careem

# Should return:
# HTTP/2 200
# or HTTP/2 405 (Method Not Allowed - GET instead of POST)
```

**Test 3: Send Test Webhook**
```bash
curl -X POST https://api.nexaratech.io/api/v1/delivery/webhook/careem \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test-signature" \
  -d '{
    "id": "test-order-123",
    "status": "confirmed",
    "customer": {
      "name": "Test Customer",
      "phone": "+962791234567"
    },
    "items": [],
    "total": 10.00
  }'

# Check logs
pm2 logs nexaratech-backend --lines 50
```

---

### Step 10: Register Webhook with Careem

**Your Production Webhook URL**:
```
https://api.nexaratech.io/api/v1/delivery/webhook/careem
```

**Contact Careem Integration Team**:
- **Email**: integrations@careem.com, careemnow-integrations@careem.com
- **Subject**: "Webhook Registration for Teta Raheeba - Restaurant Platform"

**Email Template**:
```
Hello Careem Integration Team,

We would like to register our webhook endpoint for receiving order notifications:

Restaurant Name: Teta Raheeba
Client ID: 4a27196f-7c1b-42c2-82ff-7e251126f1b1
Webhook URL: https://api.nexaratech.io/api/v1/delivery/webhook/careem

Events to Subscribe:
- ORDER_CREATED
- ORDER_CONFIRMED
- ORDER_READY
- DELIVERY_STARTED
- DELIVERY_ENDED
- CAPTAIN_ASSIGNED
- CAPTAIN_COMING
- CAPTAIN_HERE
- CANCELED

Our webhook endpoint supports HMAC-SHA256 signature validation and is ready for production use.

Please confirm webhook registration and provide any additional configuration requirements.

Thank you,
[Your Name]
Nexara Technologies
```

---

## Monitoring & Maintenance

### Check Backend Status
```bash
pm2 status
pm2 logs nexaratech-backend
pm2 monit  # Real-time monitoring
```

### Check Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/api.nexaratech.io-access.log

# Careem webhook specific logs
sudo tail -f /var/log/nginx/careem-webhook.log

# Error logs
sudo tail -f /var/log/nginx/api.nexaratech.io-error.log
```

### Check SSL Certificate Status
```bash
sudo certbot certificates
```

### Restart Services
```bash
# Restart Backend
pm2 restart nexaratech-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Database Operations
```bash
# Access database
psql -U postgres -d postgres

# View webhook logs
SELECT * FROM webhook_logs
WHERE provider_id = (SELECT id FROM delivery_providers WHERE code = 'careem')
ORDER BY created_at DESC
LIMIT 10;

# View recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
```

---

## Alternative: Using Hostinger's hPanel (No SSH Required)

If you don't have VPS access and are using **Hostinger Shared Hosting**:

### 1. Node.js Application Setup
1. Login to hPanel
2. Go to **Advanced** → **Node.js**
3. Click **Create Application**
   - Application mode: **Production**
   - Application root: `/public_html/backend`
   - Application URL: `api.nexaratech.io`
   - Application startup file: `dist/main.js`
   - Node.js version: **18.x**
   - Environment variables: Add all from `.env` above

### 2. Domain Configuration
1. Go to **Domains** → `nexaratech.io`
2. Click **DNS / Name Servers**
3. Add subdomain: `api.nexaratech.io`
4. Enable **SSL** from hPanel

### 3. Upload Files
1. Use **File Manager** in hPanel
2. Upload backend files to `/public_html/backend/`
3. Or use FTP:
   ```bash
   ftp ftp.nexaratech.io
   # Use FTP credentials from hPanel
   cd /public_html/backend
   put -r backend/*
   ```

---

## Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Backend port 3001 not accessible from internet
- [ ] PostgreSQL only accessible from localhost
- [ ] Strong database password set
- [ ] Environment variables properly configured
- [ ] Webhook signature validation enabled
- [ ] Nginx security headers configured
- [ ] PM2 process manager running
- [ ] Automatic backups enabled (Hostinger feature)

---

## Troubleshooting

### Issue: DNS not resolving
```bash
# Check DNS propagation
dig api.nexaratech.io
nslookup api.nexaratech.io

# Wait up to 24 hours for global DNS propagation
# Use https://dnschecker.org to check worldwide
```

### Issue: Backend not starting
```bash
# Check PM2 logs
pm2 logs nexaratech-backend --err

# Check if port 3001 is already in use
sudo lsof -i :3001
sudo netstat -tulpn | grep 3001

# Kill process if needed
sudo kill -9 [PID]
```

### Issue: 502 Bad Gateway
```bash
# Check backend is running
pm2 status
curl http://localhost:3001/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/api.nexaratech.io-error.log

# Restart services
pm2 restart nexaratech-backend
sudo systemctl restart nginx
```

### Issue: Database connection failed
```bash
# Test database connection
psql -U postgres -d postgres -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Final Webhook URL

**Production URL**: `https://api.nexaratech.io/api/v1/delivery/webhook/careem`

**Use this URL** in Careem partner dashboard or email to Careem integration team.

---

## Cost Summary

- Hostinger VPS: ~$4-12/month (already have ✅)
- Domain nexaratech.io: ~$10-15/year (already have ✅)
- SSL Certificate: **FREE** (Let's Encrypt)
- Backend Hosting: **FREE** (using Hostinger VPS)

**Total Additional Cost: $0** 🎉

---

*Last Updated: October 1, 2025*
*Domain: nexaratech.io*
*Hosting: Hostinger*
