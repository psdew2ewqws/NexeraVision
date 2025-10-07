# Server Management Guide
**Date**: October 3, 2025
**Status**: ✅ Persistent servers running in screen sessions

---

## 🚀 Quick Start

### Start Servers
```bash
/home/admin/restaurant-platform-remote-v2/start-servers.sh
```

This will:
- Stop any existing server processes
- Clean up ports 3000 and 3001
- Start backend in screen session `restaurant-backend`
- Start frontend in screen session `restaurant-frontend`

### View Running Servers
```bash
screen -ls
```

Expected output:
```
There are screens on:
    950368.restaurant-frontend    (Detached)
    950251.restaurant-backend     (Detached)
2 Sockets in /run/screen/S-admin.
```

---

## 📊 Server Details

### Backend Server
- **Port**: 3001
- **URL**: http://localhost:3001
- **Screen Session**: `restaurant-backend`
- **Directory**: `/home/admin/restaurant-platform-remote-v2/backend`
- **Command**: `PORT=3001 npm run start:dev`

### Frontend Server
- **Port**: 3000
- **URL**: http://localhost:3000
- **Screen Session**: `restaurant-frontend`
- **Directory**: `/home/admin/restaurant-platform-remote-v2/frontend`
- **Command**: `PORT=3000 npm run dev`

---

## 🔧 Screen Commands

### Attach to Server (View Logs)
```bash
# Attach to backend server
screen -r restaurant-backend

# Attach to frontend server
screen -r restaurant-frontend
```

### Detach from Screen (Keep Server Running)
While attached to a screen session:
```
Ctrl+A, then D
```

### Kill a Screen Session
```bash
# Kill backend
screen -S restaurant-backend -X quit

# Kill frontend
screen -S restaurant-frontend -X quit
```

### Restart a Single Server
```bash
# Restart backend only
screen -S restaurant-backend -X quit
cd /home/admin/restaurant-platform-remote-v2/backend
screen -dmS restaurant-backend bash -c "PORT=3001 npm run start:dev"

# Restart frontend only
screen -S restaurant-frontend -X quit
cd /home/admin/restaurant-platform-remote-v2/frontend
screen -dmS restaurant-frontend bash -c "PORT=3000 npm run dev"
```

---

## 🔄 Auto-Start Configuration

Servers are configured to start automatically on login.

### Autostart File Location
```
/home/admin/.config/autostart/restaurant-servers.desktop
```

### Disable Auto-Start
```bash
rm ~/.config/autostart/restaurant-servers.desktop
```

### Enable Auto-Start
The autostart file is already created. If you deleted it:
```bash
cat > ~/.config/autostart/restaurant-servers.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Restaurant Platform Servers
Comment=Auto-start backend and frontend servers on login
Exec=/home/admin/restaurant-platform-remote-v2/start-servers.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF
```

---

## 🖥️ Screen Always On Configuration

The following settings have been applied to prevent screen from sleeping:

```bash
# GNOME Settings (Permanent)
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-timeout 0

# X11 Settings (Session-based)
xset s off
xset s noblank
```

### Verify Screen Settings
```bash
# Check GNOME idle delay (should be 0)
gsettings get org.gnome.desktop.session idle-delay

# Check screen lock (should be false)
gsettings get org.gnome.desktop.screensaver lock-enabled

# Check power settings (should be 0)
gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout
```

---

## 🔍 Troubleshooting

### Check if Servers are Running
```bash
# Check screen sessions
screen -ls

# Check ports
netstat -tlnp | grep -E ':(3000|3001)'

# Test backend API
curl http://localhost:3001/health

# Test frontend
curl -I http://localhost:3000
```

### View Server Logs
```bash
# View backend logs
screen -r restaurant-backend

# View frontend logs
screen -r restaurant-frontend
```

### Restart All Servers
```bash
/home/admin/restaurant-platform-remote-v2/start-servers.sh
```

### Port Already in Use
```bash
# Kill processes on port 3000
fuser -k 3000/tcp

# Kill processes on port 3001
fuser -k 3001/tcp

# Then restart servers
/home/admin/restaurant-platform-remote-v2/start-servers.sh
```

### Screen Session Stuck
```bash
# Force kill all screen sessions
killall screen

# Or kill specific sessions
screen -S restaurant-backend -X quit
screen -S restaurant-frontend -X quit

# Then restart
/home/admin/restaurant-platform-remote-v2/start-servers.sh
```

---

## 📋 Common Tasks

### Check Server Health
```bash
# Backend health check
curl http://localhost:3001/health

# Frontend accessibility
curl -I http://localhost:3000

# Both servers status
screen -ls
```

### Monitor Real-Time Logs
```bash
# Attach to backend and watch logs
screen -r restaurant-backend

# In another terminal, attach to frontend
screen -r restaurant-frontend
```

### Clean Restart (Full Reset)
```bash
# Kill all servers
screen -S restaurant-backend -X quit
screen -S restaurant-frontend -X quit
fuser -k 3000/tcp
fuser -k 3001/tcp

# Wait 5 seconds
sleep 5

# Start fresh
/home/admin/restaurant-platform-remote-v2/start-servers.sh
```

---

## 🎯 Best Practices

### Regular Maintenance
1. **Monitor server logs**: Attach to screen sessions weekly
2. **Check disk space**: `df -h`
3. **Review error logs**: Check console output in screen sessions
4. **Update dependencies**: Run `npm update` monthly (in both backend and frontend)

### Before Rebooting System
```bash
# Servers will auto-start on login
# No action needed - autostart is configured
```

### After System Updates
```bash
# Verify autostart still works
ls ~/.config/autostart/restaurant-servers.desktop

# If missing, recreate with setup above
```

---

## 📝 Files Created

| File | Purpose |
|------|---------|
| `/home/admin/restaurant-platform-remote-v2/start-servers.sh` | Main server management script |
| `/home/admin/.config/autostart/restaurant-servers.desktop` | Auto-start configuration |
| `/home/admin/restaurant-platform-remote-v2/SERVER_MANAGEMENT.md` | This documentation |

---

## ✅ Configuration Summary

✅ **Screen Installed**: Persistent terminal sessions
✅ **Startup Script Created**: Manages both servers
✅ **Autostart Configured**: Servers start on login
✅ **Screen Always On**: No sleep/lock configured
✅ **Backend Running**: Port 3001 (restaurant-backend)
✅ **Frontend Running**: Port 3000 (restaurant-frontend)

---

**Setup Date**: October 3, 2025
**Maintained By**: Restaurant Platform Development Team
**Related Documentation**: CATEGORY_API_PERMANENT_FIX.md, MENU_PRODUCTS_PERMANENT_FIX.md
