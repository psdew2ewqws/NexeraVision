# PrinterMaster Desktop App - Download & Build Guide

## 🎯 Overview
PrinterMaster Desktop App connects your local USB/network printers to the cloud restaurant platform at **http://31.57.166.18:3001**

## ✅ What You Get
- **Automatic License Validation**: Enter your branch license key once
- **Auto-Discovery**: Detects USB and network printers automatically
- **Real-time Printing**: Receive print jobs from the cloud instantly
- **Cross-Platform**: Works on Windows, Mac, and Linux

---

## 📥 Download Options

### Option 1: Download Pre-configured Source (Recommended)
```bash
# Download the pre-configured source package
wget http://31.57.166.18/downloads/PrinterMaster-v2.0.0-source.zip

# OR use SCP (if you have SSH access)
scp admin@31.57.166.18:/var/www/html/downloads/PrinterMaster-v2.0.0-source.zip .
```

### Option 2: Clone from Server
```bash
# Using SCP to download entire directory
scp -r admin@31.57.166.18:/home/admin/restaurant-platform-remote-v2/PrinterMasterv2 .
```

---

## 🔨 Build Instructions

### Prerequisites
1. **Node.js 16+** - [Download](https://nodejs.org/)
2. **Windows Users**: Visual Studio Build Tools (for native USB drivers)
3. **Stable Internet**: For downloading dependencies

### Step 1: Extract and Navigate
```bash
# Extract the downloaded file (Windows/Mac/Linux)
unzip PrinterMaster-v2.0.0-source.zip
cd PrinterMasterv2/apps/desktop
```

### Step 2: Install Dependencies
```bash
npm install
```

**⏱️ This may take 5-10 minutes** to compile native USB drivers

### Step 3: Build Distribution Package

#### **For Windows (Most Common)**
```bash
npm run dist:win
```
**Output**:
- `../../dist/desktop/RestaurantPrint Pro-2.0.0-windows-x64.exe` (Installer)
- `../../dist/desktop/RestaurantPrint Pro-2.0.0-windows-x64-portable.exe` (Portable)

#### **For Mac**
```bash
npm run dist:mac
```
**Output**: `../../dist/desktop/RestaurantPrint Pro-2.0.0-mac.dmg`

#### **For Linux**
```bash
npm run dist:linux
```
**Output**:
- `../../dist/desktop/RestaurantPrint Pro-2.0.0-linux-x86_64.AppImage`
- `../../dist/desktop/RestaurantPrint Pro-2.0.0-linux-amd64.deb`

---

## 📦 Installation

### Windows
1. **Run Installer**: Double-click `RestaurantPrint Pro-2.0.0-windows-x64.exe`
2. **Follow Setup Wizard**: Choose installation directory
3. **Launch App**: Desktop shortcut created automatically

### Mac
1. **Open DMG**: Double-click the `.dmg` file
2. **Drag to Applications**: Drag app icon to Applications folder
3. **Launch**: Open from Applications

### Linux
**AppImage** (No installation required):
```bash
chmod +x "RestaurantPrint Pro-2.0.0-linux-x86_64.AppImage"
./"RestaurantPrint Pro-2.0.0-linux-x86_64.AppImage"
```

**Debian/Ubuntu**:
```bash
sudo dpkg -i "RestaurantPrint Pro-2.0.0-linux-amd64.deb"
```

---

## 🔑 First-Time Setup

### Step 1: Launch Application
The app will appear in your system tray (Windows notification area)

### Step 2: Enter License Key
1. **Click tray icon** → "Settings" or "License"
2. **Enter your branch license key** (provided by administrator)
3. **Click "Activate"**

### Step 3: Automatic Connection
✅ App connects to: **http://31.57.166.18:3001**
✅ Discovers local USB/network printers
✅ Ready to receive print jobs!

---

## 🖨️ Testing Print Functionality

### Method 1: From Web Dashboard
1. Open browser: **http://31.57.166.18:3000/settings/printing**
2. Select your printer from dropdown
3. Click **"Test Print"**
4. Receipt should print on your local printer

### Method 2: From Desktop App
1. **Right-click tray icon** → "Test Print"
2. Select printer
3. Test receipt prints

---

## 🔧 Troubleshooting

### Printer Not Detected
1. **Check USB Connection**: Ensure printer is connected and powered
2. **Restart App**: Right-click tray icon → "Restart"
3. **Manual Refresh**: Settings → "Refresh Printers"

### Connection Failed
1. **Check Firewall**: Allow app through firewall
2. **Verify Internet**: Ensure connection to 31.57.166.18:3001
3. **Re-enter License**: Settings → "Re-validate License"

### Print Job Not Received
1. **Check WebSocket Status**: Tray icon should show "Connected"
2. **View Logs**: Settings → "View Logs"
3. **Restart Backend Connection**: Settings → "Reconnect"

### Windows USB Driver Issues
If USB printer not detected on Windows:
```bash
# Install Visual C++ Redistributable
# Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
```

---

## 📊 System Requirements

### Minimum
- **OS**: Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **RAM**: 2GB
- **Disk**: 500MB free space
- **Network**: Internet connection for cloud communication

### Recommended
- **OS**: Windows 11, macOS 12+, Ubuntu 22.04+
- **RAM**: 4GB
- **Network**: Stable broadband connection

---

## 🔐 Security & Privacy

- **Encrypted License Storage**: License keys stored with AES-256 encryption
- **Secure WebSocket**: TLS-encrypted communication (when HTTPS enabled)
- **Local Processing**: Print data processed locally, not stored in cloud
- **Auto-Updates**: Automatic security updates (can be disabled in settings)

---

## 📞 Support

### Common Issues
- **License Invalid**: Contact administrator for valid license key
- **Printer Offline**: Check printer power and USB/network connection
- **Connection Timeout**: Verify backend server is running

### Advanced Debugging
```bash
# View detailed logs (Windows)
%APPDATA%\RestaurantPrint Pro\logs\

# View detailed logs (Mac)
~/Library/Application Support/RestaurantPrint Pro/logs/

# View detailed logs (Linux)
~/.config/RestaurantPrint Pro/logs/
```

---

## 🚀 Quick Start Summary

1. **Download**: Get source package from server
2. **Build**: `npm install && npm run dist:win` (or dist:mac/dist:linux)
3. **Install**: Run the generated installer
4. **License**: Enter your branch license key
5. **Print**: Test from web dashboard or desktop app

**That's it! Your printer is now connected to the cloud platform!** 🎉

---

## 📝 Version Information

- **Version**: 2.0.0
- **Server URL**: http://31.57.166.18:3001 (Pre-configured)
- **WebSocket Namespace**: /printing-ws
- **Auto-Updates**: Enabled by default

---

## ⚙️ Advanced Configuration

### Change Server URL (Advanced Users Only)
If you need to point to a different server:

1. Edit `.env.production` before building:
```bash
API_URL=http://your-server-ip:3001
WEBSOCKET_URL=http://your-server-ip:3001
```

2. Rebuild: `npm run dist:win` (or your platform)

---

**📧 Questions?** Contact your system administrator or check the logs for detailed error messages.
