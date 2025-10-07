# 🖨️ PrinterMaster Remote Printing Setup Guide

## Overview
PrinterMaster runs on your **LOCAL device** (where printers are connected), NOT on the production server. It discovers local printers, registers them with the backend, and receives print jobs via WebSocket.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION SERVER                             │
│                    (31.57.166.18)                               │
│                                                                  │
│   ┌──────────────┐         ┌─────────────────┐                │
│   │   Backend    │◄────────┤   Database      │                │
│   │   Port 3001  │         │   (PostgreSQL)  │                │
│   └──────┬───────┘         └─────────────────┘                │
│          │ WebSocket                                            │
│          │ /printing-ws                                         │
└──────────┼──────────────────────────────────────────────────────┘
           │
           │ Internet
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                    YOUR LOCAL DEVICE                             │
│                                                                  │
│   ┌──────────────────┐       ┌──────────────────────┐          │
│   │  PrinterMaster   │◄──────┤  Local Printers      │          │
│   │  Desktop App     │       │  (USB/Network)       │          │
│   │                  │       │  - Thermal           │          │
│   │  Port 8182       │       │  - Receipt           │          │
│   └──────────────────┘       │  - Kitchen           │          │
│                              └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### 1. Get Branch ID
First, you need your Branch ID from the database:

```bash
# SSH to production server
ssh root@31.57.166.18

# Get your branch ID
PGPASSWORD='E$athecode006' psql -U postgres -d postgres -c \
  "SELECT id, name, company_id FROM branches WHERE company_id = 'test-company-001';"
```

**Example Output**:
```
                  id                  |    name     |    company_id
--------------------------------------+-------------+------------------
 393ca640-23fd-4b81-bc56-2c519d867d7a | Main Office | test-company-001
```

**Save your Branch ID**: `393ca640-23fd-4b81-bc56-2c519d867d7a`

---

## 🚀 Setup Steps

### Step 1: Install PrinterMaster on Your Device

**Download PrinterMaster**:
- The installer is in: `/home/admin/restaurant-platform-remote-v2/PrinterMasterv2/`
- Or build from source

**Install on Your Local Machine** (not the server):
- Windows: Run `PrinterMaster-Setup.exe`
- macOS: Run `PrinterMaster.dmg`
- Linux: Run `PrinterMaster.AppImage`

### Step 2: Configure PrinterMaster

1. **Launch PrinterMaster** on your local device
2. **Enter Configuration**:
   - **Backend URL**: `http://31.57.166.18:3001`
   - **Branch ID**: `393ca640-23fd-4b81-bc56-2c519d867d7a` (from Step 1)
   - **License Key**: (same as Branch ID for now)

3. **Connect to Server**:
   - Click "Connect" or "Authenticate"
   - PrinterMaster will:
     - Connect to WebSocket at `ws://31.57.166.18:3001/printing-ws`
     - Discover local printers (USB/Network)
     - Register printers with backend

### Step 3: Verify Printer Registration

**On Production Server**, check registered printers:

```bash
ssh root@31.57.166.18
curl -s http://31.57.166.18:3001/api/v1/printing/printers/public | jq .
```

**Expected Output**:
```json
{
  "success": true,
  "printers": [
    {
      "id": "...",
      "name": "Your-Printer-Name",
      "type": "thermal",
      "connection": "usb",
      "status": "online",
      "branchId": "393ca640-23fd-4b81-bc56-2c519d867d7a"
    }
  ],
  "count": 1
}
```

---

## 🧪 Testing Print from Server

### Method 1: Via Backend API (Template Builder)

1. **Login to Frontend**: http://31.57.166.18:3002
2. **Go to Template Builder**: `/settings/template-builder`
3. **Select your registered printer**
4. **Click "Test Print"**

### Method 2: Via WebSocket (Advanced)

Backend sends print job via WebSocket:

```javascript
// Backend emits event
socket.emit('executePrintJob', {
  printerId: 'your-printer-id',
  content: 'Test receipt content',
  type: 'receipt'
});
```

PrinterMaster receives and prints locally.

### Method 3: Via Direct API Call

From production server:

```bash
# SSH to server
ssh root@31.57.166.18

# Send test print (will be forwarded to PrinterMaster via WebSocket)
curl -X POST http://31.57.166.18:3001/api/v1/printing/print-job \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "your-printer-id-here",
    "content": "Test from production server",
    "type": "receipt"
  }'
```

---

## 🔌 WebSocket Events Reference

### Events PrinterMaster Listens For (from Backend):

| Event | Purpose | Payload |
|-------|---------|---------|
| `executePrintJob` | Execute print job | `{ printerId, content, type, orderId }` |
| `testPrinter` | Test printer connection | `{ printerId }` |
| `updatePrinterStatus` | Request status update | `{ printerId }` |

### Events PrinterMaster Emits (to Backend):

| Event | Purpose | Payload |
|-------|---------|---------|
| `printerRegistered` | Printer discovered and registered | `{ printer details }` |
| `printJobResult` | Print job completed | `{ jobId, success, error }` |
| `printerStatusUpdate` | Status changed | `{ printerId, status }` |

---

## 📊 Registration Endpoints

### Bulk Printer Registration
**Endpoint**: `POST /api/v1/printing/printers/bulk`
**Public**: Yes (no auth required)

**Payload**:
```json
{
  "printers": [
    {
      "name": "Thermal-Printer-1",
      "type": "thermal",
      "connection": "usb",
      "status": "online",
      "branchId": "393ca640-23fd-4b81-bc56-2c519d867d7a",
      "discoveredBy": "PrinterMaster",
      "capabilities": ["text", "graphics"]
    }
  ],
  "deviceInfo": {
    "hostname": "MyComputer",
    "platform": "Windows",
    "deviceId": "unique-device-fingerprint"
  }
}
```

---

## 🛠️ Troubleshooting

### Issue 1: PrinterMaster Can't Connect to Server

**Check Network**:
```bash
# From your local device
ping 31.57.166.18
curl http://31.57.166.18:3001/api/v1/health
```

**Check Firewall**:
- Production server port 3001 must be open
- WebSocket connections must be allowed

**Verify Backend Running**:
```bash
ssh root@31.57.166.18
pm2 status restaurant-backend
```

### Issue 2: Printers Not Discovered

**Check Local Printers**:
```bash
# Windows
wmic printer list brief

# Linux/macOS
lpstat -p -d
lsusb | grep -i printer
```

**Check PrinterMaster Logs**:
- Open PrinterMaster console (Ctrl+Shift+I / Cmd+Option+I)
- Check for discovery errors

### Issue 3: Print Jobs Not Received

**Check WebSocket Connection**:
- In PrinterMaster, verify "Connected" status
- Check console for WebSocket errors

**Check Backend Logs**:
```bash
ssh root@31.57.166.18
pm2 logs restaurant-backend --lines 50 | grep -i websocket
```

---

## 📝 Configuration Files

### PrinterMaster Config Location

- **Windows**: `%APPDATA%/PrinterMaster/config.json`
- **macOS**: `~/Library/Application Support/PrinterMaster/config.json`
- **Linux**: `~/.config/PrinterMaster/config.json`

### Example Config:
```json
{
  "apiBaseUrl": "http://31.57.166.18:3001",
  "branchId": "393ca640-23fd-4b81-bc56-2c519d867d7a",
  "companyId": "test-company-001",
  "licenseKey": "393ca640-23fd-4b81-bc56-2c519d867d7a",
  "autoStart": true,
  "autoReconnect": true,
  "discoveryInterval": 30000
}
```

---

## ✅ Verification Checklist

- [ ] PrinterMaster installed on local device (NOT server)
- [ ] Branch ID obtained from database
- [ ] PrinterMaster configured with server URL
- [ ] PrinterMaster connected to WebSocket
- [ ] Local printers discovered
- [ ] Printers registered in backend database
- [ ] Test print successful

---

## 🎯 Quick Start Command

For your setup, use:

1. **Get Branch ID**:
```bash
ssh root@31.57.166.18 "PGPASSWORD='E\$athecode006' psql -U postgres -d postgres -c \"SELECT id, name FROM branches LIMIT 1;\""
```

2. **Install PrinterMaster** on your local Windows/Mac/Linux device

3. **Configure**:
   - Backend URL: `http://31.57.166.18:3001`
   - Branch ID: (from step 1)

4. **Verify**:
```bash
curl -s http://31.57.166.18:3001/api/v1/printing/printers/public | jq '.count'
```

Should return count > 0 when printers are registered.

---

## 📞 Support

If you encounter issues:
1. Check PrinterMaster console logs
2. Check backend logs: `pm2 logs restaurant-backend`
3. Verify network connectivity
4. Ensure printers are powered on and connected

**Production Server**: 31.57.166.18
**Backend API**: http://31.57.166.18:3001
**Frontend**: http://31.57.166.18:3002

---

**Last Updated**: October 5, 2025
**Server**: Production (31.57.166.18)
