# 🚀 VDS Nexara - Access Guide

## ✅ Setup Complete!

Your VDS is now fully configured with Remote Desktop, Web Panel, Docker, and all necessary tools.

---

## 🖥️ Remote Desktop Access (Recommended)

**For Windows Users:**

1. Press `Windows + R`
2. Type: `mstsc` and press Enter
3. Enter the following:

**Option 1 - Regular User (RECOMMENDED):**
```
Computer: 31.57.166.18:3389
Username: nexara
Password: Nexara2025!
```

**Option 2 - Root User (Advanced):**
```
Computer: 31.57.166.18:3389
Username: root
Password: qMRF2Y5Z44fBP1kANKcJHX61
```

4. Click "Connect"
5. You'll see a full Linux desktop (XFCE)

**For Mac Users:**

1. Download "Microsoft Remote Desktop" from App Store
2. Click "+" → "Add PC"
3. PC name: `31.57.166.18`
4. User account: `root` / `qMRF2Y5Z44fBP1kANKcJHX61`
5. Connect

---

## 📊 Cockpit Web Panel (Browser Access)

**URL:** https://31.57.166.18:9090

**Login:**
- Username: `root`
- Password: `qMRF2Y5Z44fBP1kANKcJHX61`

**Features:**
- ✅ Server monitoring (CPU, RAM, Disk usage)
- ✅ Service management (start/stop/restart)
- ✅ Terminal access in browser
- ✅ File manager
- ✅ System updates
- ✅ Network configuration

**Note:** Your browser will show a security warning (self-signed certificate). Click "Advanced" → "Proceed" to continue.

---

## 🔒 SSH Access (Command Line)

**Windows (PowerShell):**
```powershell
ssh root@31.57.166.18
# Password: qMRF2Y5Z44fBP1kANKcJHX61
```

**Mac/Linux (Terminal):**
```bash
ssh root@31.57.166.18
# Password: qMRF2Y5Z44fBP1kANKcJHX61
```

---

## 📦 Installed Software

✅ **xRDP** - Remote Desktop Protocol server
✅ **XFCE Desktop** - Lightweight Linux desktop environment
✅ **Cockpit** - Web-based server management
✅ **Docker** - Container platform (v28.5.0)
✅ **Docker Compose** - Multi-container management
✅ **PostgreSQL Client** - Database tools
✅ **Node.js 20** - JavaScript runtime
✅ **Git** - Version control
✅ **Firewall (UFW)** - Security configured

---

## 🔐 Open Firewall Ports

| Port | Service | Purpose |
|------|---------|---------|
| 22 | SSH | Remote terminal access |
| 3389 | RDP | Remote Desktop |
| 9090 | Cockpit | Web panel |
| 80 | HTTP | Web traffic |
| 443 | HTTPS | Secure web traffic |
| 3000 | Frontend | Restaurant platform UI |
| 3001 | Backend | Restaurant platform API |
| 5432 | PostgreSQL | Database |

---

## 💾 Current System Status

**Resources:**
- CPU: Intel i9-14900K (10 cores / 20GB RAM / 196GB disk)
- RAM Usage: 807 MB / 19 GB (4% used) ✅
- Disk Usage: 4.9 GB / 196 GB (3% used) ✅
- Available Space: 183 GB ✅

**Services Running:**
- ✅ xRDP (Remote Desktop)
- ✅ Cockpit (Web Panel)
- ✅ Docker (Container Engine)
- ✅ UFW Firewall (Active)

---

## 🍽️ Next Steps - Deploy Restaurant Platform

### Option 1: Deploy from Local Machine

```bash
# 1. Copy your project to VDS
scp -r /home/admin/restaurant-platform-remote-v2 root@31.57.166.18:/home/

# 2. SSH into VDS
ssh root@31.57.166.18

# 3. Navigate to project
cd /home/restaurant-platform-remote-v2

# 4. Create .env file
nano .env
```

**Add this to .env:**
```env
DATABASE_URL="postgresql://postgres:E$$athecode006@postgres:5432/postgres"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=E$$athecode006
POSTGRES_DB=postgres

BACKEND_PORT=3001
JWT_SECRET=change-this-super-secret-key-in-production

NEXT_PUBLIC_API_URL=http://31.57.166.18:3001
```

```bash
# 5. Build and start
docker-compose up -d

# 6. Check status
docker-compose ps

# 7. View logs
docker-compose logs -f
```

### Option 2: Deploy via Remote Desktop

1. Connect via Remote Desktop (see above)
2. Open Terminal in the desktop
3. Clone or upload your project
4. Follow same docker-compose steps

### Option 3: Deploy via Cockpit

1. Open https://31.57.166.18:9090
2. Go to "Terminal" section
3. Clone or upload your project
4. Run docker-compose commands

---

## 🔍 Monitoring & Management

**Check Services:**
```bash
systemctl status xrdp cockpit docker
```

**View Docker Containers:**
```bash
docker ps -a
```

**Check Disk Space:**
```bash
df -h
```

**Check Memory:**
```bash
free -h
```

**View Firewall Status:**
```bash
ufw status
```

**View Logs:**
```bash
# Docker logs
docker-compose logs -f

# System logs
journalctl -f
```

---

## 🆘 Troubleshooting

**Can't connect to Remote Desktop?**
```bash
ssh root@31.57.166.18
systemctl restart xrdp
systemctl status xrdp
```

**Can't access Cockpit?**
```bash
ssh root@31.57.166.18
systemctl restart cockpit.socket
ufw allow 9090/tcp
```

**Docker issues?**
```bash
systemctl restart docker
docker ps
```

---

## 📞 Server Details

**Hostname:** nexara
**IP Address:** 31.57.166.18
**Location:** Netherlands (NL21)
**Expiration:** 2025-11-02
**Network:** 750 Mbps unlimited

---

## 🎯 Quick Access Checklist

- [x] Remote Desktop: 31.57.166.18:3389
- [x] Cockpit Web: https://31.57.166.18:9090
- [x] SSH: ssh root@31.57.166.18
- [ ] Deploy Restaurant Platform
- [ ] Configure Domain (optional)
- [ ] Set up SSL Certificate (optional)
- [ ] Configure Database Backups

---

## 🔐 Security Recommendations

1. **Change root password** after first login
2. **Create non-root user** for daily operations
3. **Set up SSH keys** instead of password auth
4. **Configure automated backups** for PostgreSQL
5. **Set up monitoring alerts** for disk/RAM usage
6. **Regular security updates:** `apt update && apt upgrade`

---

**Setup completed:** October 2, 2025
**Status:** ✅ Ready for production deployment
