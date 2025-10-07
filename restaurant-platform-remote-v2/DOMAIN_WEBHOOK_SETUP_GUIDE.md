# Complete Domain + Web Hosting Webhook Setup Guide

## Overview
This guide shows you how to use your domain name and web hosting to create a public webhook URL for Careem integration.

## What You Need
- ✅ Domain name (e.g., `yourdomain.com`)
- ✅ Web hosting with SSH access
- ✅ Backend running on port 3001
- ✅ Server with Nginx or Apache

---

## Step-by-Step Setup

### Step 1: DNS Configuration

**Add DNS Record in Your Domain Provider** (e.g., GoDaddy, Namecheap, Cloudflare):

**Option A: A Record (Direct to Server)**
```
Type: A
Host: integration (or @ for root domain)
Value: YOUR_SERVER_IP
TTL: 300 (5 minutes)
```

**Option B: CNAME Record (If using existing host)**
```
Type: CNAME
Host: integration
Value: existing-host.yourdomain.com
TTL: 300
```

**Result**: `integration.yourdomain.com` → Your server

---

### Step 2: Get Free SSL Certificate

**Install Certbot** (Let's Encrypt):
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

**Generate Certificate**:
```bash
# For Nginx
sudo certbot --nginx -d integration.yourdomain.com

# For Apache
sudo certbot --apache -d integration.yourdomain.com

# Manual (if web server not auto-detected)
sudo certbot certonly --standalone -d integration.yourdomain.com
```

**Auto-Renewal Setup**:
```bash
# Test renewal
sudo certbot renew --dry-run

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot-timer
sudo systemctl start certbot-timer
```

---

### Step 3: Configure Web Server

#### For Nginx (Most Common)

**1. Create Config File**:
```bash
sudo nano /etc/nginx/sites-available/integration.yourdomain.com
```

**2. Paste Configuration**:
```nginx
server {
    listen 80;
    server_name integration.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name integration.yourdomain.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/integration.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/integration.yourdomain.com/privkey.pem;

    # Backend Proxy
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**3. Enable Site**:
```bash
sudo ln -s /etc/nginx/sites-available/integration.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### For Apache

**1. Enable Required Modules**:
```bash
sudo a2enmod proxy proxy_http ssl headers rewrite
```

**2. Create Config File**:
```bash
sudo nano /etc/apache2/sites-available/integration.yourdomain.com.conf
```

**3. Paste Configuration**:
```apache
<VirtualHost *:80>
    ServerName integration.yourdomain.com
    Redirect permanent / https://integration.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName integration.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/integration.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/integration.yourdomain.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

**4. Enable Site**:
```bash
sudo a2ensite integration.yourdomain.com
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

### Step 4: Firewall Configuration

**Allow HTTP/HTTPS Traffic**:
```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

---

### Step 5: Verify Setup

**Test Local Backend**:
```bash
curl http://localhost:3001/api/v1/delivery/webhook/careem
```

**Test Public Domain**:
```bash
# HTTP (should redirect to HTTPS)
curl -I http://integration.yourdomain.com/api/v1/delivery/webhook/careem

# HTTPS
curl -I https://integration.yourdomain.com/api/v1/delivery/webhook/careem
```

**Expected Response**:
```
HTTP/2 200
content-type: application/json
```

**Test Webhook with Sample Payload**:
```bash
curl -X POST https://integration.yourdomain.com/api/v1/delivery/webhook/careem \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test-signature" \
  -d '{
    "id": "test-123",
    "status": "confirmed",
    "customer": {
      "name": "Test",
      "phone": "+962791234567"
    },
    "items": [],
    "total": 10.00
  }'
```

---

### Step 6: Register Webhook with Careem

**Your Webhook URL**:
```
https://integration.yourdomain.com/api/v1/delivery/webhook/careem
```

**Contact Careem**:
- Email: integrations@careem.com
- Subject: "Webhook Registration for Teta Raheeba"
- Provide:
  - Client ID: `4a27196f-7c1b-42c2-82ff-7e251126f1b1`
  - Webhook URL: `https://integration.yourdomain.com/api/v1/delivery/webhook/careem`
  - Events: ORDER_CREATED, ORDER_CONFIRMED, etc.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│            Internet (Careem Servers)            │
└─────────────────┬───────────────────────────────┘
                  │
                  │ HTTPS (Port 443)
                  ▼
┌─────────────────────────────────────────────────┐
│  integration.yourdomain.com (Your Domain)       │
│  ├─ SSL Certificate (Let's Encrypt)             │
│  └─ DNS A Record → Server IP                    │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Nginx/Apache Reverse Proxy
                  ▼
┌─────────────────────────────────────────────────┐
│  localhost:3001 (NestJS Backend)                │
│  └─ POST /api/v1/delivery/webhook/careem        │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Process Order
                  ▼
┌─────────────────────────────────────────────────┐
│  PostgreSQL Database (postgres)                 │
│  ├─ Orders table                                │
│  ├─ WebhookLogs table                           │
│  └─ Customers table                             │
└─────────────────────────────────────────────────┘
```

---

## Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall allows only 80/443 (block 3001 direct access)
- [ ] Webhook signature validation enabled in backend
- [ ] Rate limiting configured in Nginx/Apache
- [ ] Logs enabled for monitoring
- [ ] Backend environment variables set correctly
- [ ] Database password protected
- [ ] Server hardened (fail2ban, SSH key-only, etc.)

---

## Monitoring & Maintenance

### Check SSL Certificate Expiry
```bash
sudo certbot certificates
```

### Monitor Webhook Logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/integration.yourdomain.com-access.log

# Backend logs
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev

# Database webhook logs
psql -U postgres -d postgres -c "SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;"
```

### Performance Monitoring
```bash
# Check Nginx status
sudo systemctl status nginx

# Check backend process
pm2 status  # if using PM2
ps aux | grep node

# Check server resources
htop
df -h
```

---

## Troubleshooting

### Issue: SSL Certificate Not Working
```bash
# Check certificate files
sudo ls -la /etc/letsencrypt/live/integration.yourdomain.com/

# Test SSL
curl -vI https://integration.yourdomain.com 2>&1 | grep -i ssl

# Regenerate if needed
sudo certbot --nginx -d integration.yourdomain.com --force-renewal
```

### Issue: 502 Bad Gateway
```bash
# Check backend is running
curl http://localhost:3001/api/v1/delivery/webhook/careem

# Check Nginx proxy settings
sudo nginx -t
sudo systemctl restart nginx

# Check firewall
sudo ufw status
```

### Issue: DNS Not Resolving
```bash
# Check DNS propagation
dig integration.yourdomain.com
nslookup integration.yourdomain.com

# Flush DNS cache
sudo systemctl restart systemd-resolved

# Wait up to 24 hours for global DNS propagation
```

### Issue: Webhook Not Receiving Data
```bash
# Test directly
curl -X POST https://integration.yourdomain.com/api/v1/delivery/webhook/careem \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check backend logs
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev  # Watch for incoming requests

# Check database logs
psql -U postgres -d postgres -c "SELECT * FROM webhook_logs WHERE status = 'failed';"
```

---

## Production Environment Variables

Add to `/home/admin/restaurant-platform-remote-v2/backend/.env`:

```bash
# Careem Production
CAREEM_CLIENT_ID=4a27196f-7c1b-42c2-82ff-7e251126f1b1
CAREEM_CLIENT_SECRET=3d327a41-7dca-4b03-94dc-f91e79aed220
CAREEM_WEBHOOK_SECRET=2a3d9339-c2b1-498a-aac3-443ac029efb9
CAREEM_WEBHOOK_URL=https://integration.yourdomain.com/api/v1/delivery/webhook/careem

# Database
DATABASE_URL=postgresql://postgres:E$$athecode006@localhost:5432/postgres

# Application
NODE_ENV=production
PORT=3001
```

---

## Alternative: Using Existing Web Hosting Control Panel

If you have **cPanel**, **Plesk**, or similar:

### cPanel Setup
1. Go to **Domains** → **Subdomains**
2. Create `integration` subdomain
3. Go to **SSL/TLS** → Install Let's Encrypt certificate
4. Create `.htaccess` in subdomain root:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]
```

### Plesk Setup
1. **Websites & Domains** → Add Subdomain
2. **SSL/TLS Certificates** → Let's Encrypt
3. **Apache & nginx Settings** → Add directives:

```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Cost Estimate

- Domain Name: $10-15/year (already have ✅)
- Web Hosting: $5-50/month (already have ✅)
- SSL Certificate: **FREE** (Let's Encrypt)
- Backend Server: $0 (using existing server)

**Total Additional Cost: $0** 🎉

---

## Final Webhook URL

**Production URL**:
```
https://integration.yourdomain.com/api/v1/delivery/webhook/careem
```

**Use this URL with Careem** in their partner dashboard or by contacting their integration team.

---

*Last Updated: October 1, 2025*
