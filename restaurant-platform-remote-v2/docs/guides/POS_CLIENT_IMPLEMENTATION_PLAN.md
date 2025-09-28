# POS Client Implementation Plan - Updated v2.0
## Modern Web-Based Printer Management System

### Executive Summary
This document outlines the comprehensive implementation plan for a modern web-based POS client application that provides a professional printer management dashboard for restaurant staff. The system integrates with the existing backend API to display configured printers, manage print jobs, and provide real-time status monitoring without requiring network discovery.

---

## 1. System Architecture Overview

### Core Components
- **Modern Web-Based POS Client** (Professional HTML5/CSS3/JavaScript interface)
- **Backend API Integration** (REST endpoints for printer management)
- **Real-time Status Dashboard** (Live printer status updates)
- **Print Job Management Interface** (Job queues and monitoring)
- **Responsive Design** (Tablet and desktop optimized)

### Technology Stack
- **Frontend**: HTML5, CSS3, modern JavaScript (ES6+)
- **UI Framework**: Native CSS Grid/Flexbox with custom components
- **Communication**: Fetch API for REST calls, Server-Sent Events for real-time updates  
- **Styling**: Professional restaurant POS theme with modern gradients
- **Backend Integration**: Direct integration with existing NestJS API on localhost:3001
- **No Network Discovery**: Uses existing configured printers from database

---

## 2. Database Schema Analysis

### Key Database Tables

#### **Companies Table**
```sql
-- Primary tenant isolation
companies (
  id UUID PRIMARY KEY,           -- Company identifier
  name VARCHAR,                  -- Company name
  slug VARCHAR UNIQUE,           -- URL-friendly identifier
  status company_status,         -- active|trial|suspended|inactive
  business_type VARCHAR,         -- Default: "restaurant"
  timezone VARCHAR,              -- Default: "Asia/Amman"
  subscription_plan VARCHAR,     -- Licensing tier
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### **Branches Table**
```sql
-- License key source (Branch ID = License Key)
branches (
  id UUID PRIMARY KEY,           -- THIS IS THE LICENSE KEY
  company_id UUID,               -- Links to company (tenant isolation)
  name VARCHAR,                  -- Branch display name
  name_ar VARCHAR,               -- Arabic name for UI display
  phone VARCHAR,                 -- Contact information
  email VARCHAR,                 -- Branch email
  address VARCHAR,               -- Physical location
  city VARCHAR,                  -- Geographic data
  country VARCHAR,               -- Geographic data
  is_active BOOLEAN,             -- Branch operational status
  allows_online_orders BOOLEAN,   -- Feature flags
  timezone VARCHAR,              -- Branch-specific timezone
  open_time VARCHAR,             -- Operating hours
  close_time VARCHAR,            -- Operating hours
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### **Printers Table** (Core Entity)
```sql
printers (
  id UUID PRIMARY KEY,           -- Internal printer ID
  company_id UUID,               -- Tenant isolation (FK to companies)
  branch_id UUID,                -- License context (FK to branches)
  name VARCHAR,                  -- Printer display name
  type printer_type,             -- thermal|receipt|kitchen|label
  connection printer_connection, -- network|usb|bluetooth|menuhere
  ip VARCHAR,                    -- Network printer IP
  port INTEGER,                  -- Default: 9100 (RAW), 631 (IPP), etc.
  manufacturer VARCHAR,          -- Epson, Star, Citizen, etc.
  model VARCHAR,                 -- Printer model info
  location VARCHAR,              -- Physical location description
  paper_width INTEGER,           -- 58mm, 80mm, etc.
  assigned_to printer_assignment,-- kitchen|cashier|bar|all
  is_default BOOLEAN,            -- Default printer flag
  status printer_status,         -- online|offline|error|unknown
  capabilities VARCHAR,          -- JSON: ['text', 'cut', 'graphics']
  last_seen TIMESTAMP,           -- Last heartbeat/communication
  
  -- Advanced Features
  delivery_platforms JSONB,      -- Talabat, Careem specific config
  license_key VARCHAR,           -- Branch ID reference
  last_auto_detection TIMESTAMP, -- Auto-discovery tracking
  menuhere_config JSONB,         -- MenuHere-specific settings
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### **Print Jobs Table**
```sql
print_jobs (
  id UUID PRIMARY KEY,
  printer_id UUID,               -- FK to printers
  company_id UUID,               -- Tenant isolation
  branch_id UUID,                -- License context
  user_id UUID,                  -- Who initiated the print
  type print_job_type,           -- receipt|kitchen_order|label|test
  status print_job_status,       -- pending|printing|completed|failed
  priority INTEGER,              -- Job queue priority (1-10)
  content TEXT,                  -- Print job content (JSON/ESC-POS)
  order_id UUID,                 -- Optional: related order
  attempts INTEGER,              -- Retry counter
  processing_time INTEGER,       -- Time taken (milliseconds)
  error TEXT,                    -- Error message if failed
  
  created_at TIMESTAMP,          -- Job created
  started_at TIMESTAMP,          -- Print started
  completed_at TIMESTAMP,        -- Print completed
  failed_at TIMESTAMP            -- Print failed
)
```

#### **Print Templates Table**
```sql
print_templates (
  id UUID PRIMARY KEY,
  company_id UUID,               -- Tenant isolation
  name VARCHAR,                  -- Template name (Cash, Kitchen)
  type print_job_type,           -- receipt|kitchen_order|label|test
  template TEXT,                 -- Template content (JSON)
  is_default BOOLEAN,            -- Default for this type
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Database Relationships
```
Company (1) → (N) Branches
Company (1) → (N) Printers  
Company (1) → (N) Print_Templates
Branch (1) → (N) Printers
Printer (1) → (N) Print_Jobs
```

---

## 3. API Integration Architecture

### Authentication Flow
```
1. POS Client enters Branch ID (License Key)
2. Client validates license via: POST /api/v1/printing/license/validate-public
3. On success, Client connects via WebSocket for real-time updates
4. Client discovers and registers printers automatically
```

### Key API Endpoints

#### **License Validation** (Public - No Auth)
```http
POST /api/v1/printing/license/validate-public
Content-Type: application/json

{
  "licenseKey": "f97ceb38-c797-4d1c-9ff4-89d9f8da5235"
}

Response:
{
  "success": true,
  "valid": true,
  "message": "Branch ID is valid"
}
```

#### **Auto-Detection** (Authenticated)
```http
POST /api/v1/printing/license/auto-detect
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseKey": "f97ceb38-c797-4d1c-9ff4-89d9f8da5235",
  "timeout": 30000,
  "forceRedetection": false,
  "autoAssignPlatforms": true
}

Response:
{
  "success": true,
  "detected": 3,
  "added": 2,
  "updated": 1,
  "printers": [...]
}
```

#### **Public Printer Registration** (No Auth - For POS Client)
```http
POST /api/v1/printing/printers/menuhere-register
Content-Type: application/json

{
  "name": "Kitchen Printer 1",
  "branchId": "f97ceb38-c797-4d1c-9ff4-89d9f8da5235",
  "type": "thermal",
  "connection": "network",
  "status": "online",
  "ip": "192.168.1.100",
  "port": 9100,
  "manufacturer": "Epson",
  "model": "TM-T88V"
}
```

#### **Real-time Status Updates** (WebSocket)
```javascript
// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:3001/printing-ws');

// Broadcast printer status
{
  "type": "printer_status",
  "printerId": "uuid",
  "status": "online",
  "lastSeen": "2025-01-11T10:00:00Z",
  "queueLength": 0
}
```

---

## 4. POS Client Application Design

### Application Structure
```
pos-client/
├── src/
│   ├── core/
│   │   ├── license-manager.js      # License validation & storage
│   │   ├── printer-discovery.js   # Network printer discovery
│   │   ├── api-client.js          # Backend API communication
│   │   └── websocket-manager.js   # Real-time communication
│   ├── printers/
│   │   ├── escpos-driver.js       # ESC/POS protocol implementation
│   │   ├── raw-printer.js         # RAW socket printing
│   │   └── network-scanner.js     # Network discovery utilities
│   ├── ui/
│   │   ├── license-entry.js       # License key input screen
│   │   ├── printer-list.js        # Discovered printers display
│   │   └── status-monitor.js      # Real-time status display
│   └── utils/
│       ├── logger.js              # Application logging
│       ├── config.js              # Configuration management
│       └── system-tray.js         # System tray integration
├── assets/                        # Application resources
├── build/                         # PKG build scripts
└── package.json
```

### Key Features

#### **License Management**
```javascript
// license-manager.js
class LicenseManager {
  async validateLicense(branchId, secretPin = null) {
    // Special dev bypass with PIN "0011"
    if (secretPin === "0011") {
      return { valid: true, bypass: true };
    }
    
    // Validate via public API
    const response = await fetch('/api/v1/printing/license/validate-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: branchId })
    });
    
    const result = await response.json();
    if (result.valid) {
      this.storeLicense(branchId);
    }
    return result;
  }

  storeLicense(branchId) {
    // Store in encrypted local storage or registry
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(os.homedir(), '.restaurant-pos', 'license.json');
    
    fs.writeFileSync(configPath, JSON.stringify({
      branchId,
      activatedAt: new Date().toISOString(),
      lastValidation: new Date().toISOString()
    }));
  }
}
```

#### **Printer Discovery Engine**
```javascript
// printer-discovery.js
class PrinterDiscovery {
  async discoverNetworkPrinters() {
    const discoveredPrinters = [];
    const networkRanges = this.getLocalNetworkRanges();
    const commonPorts = [9100, 515, 631]; // RAW, LPR, IPP
    
    for (const range of networkRanges) {
      for (let i = 1; i <= 254; i++) {
        const ip = `${range}.${i}`;
        for (const port of commonPorts) {
          try {
            const printer = await this.testPrinterConnection(ip, port);
            if (printer) {
              discoveredPrinters.push(printer);
            }
          } catch (error) {
            // Silent fail for non-printer devices
          }
        }
      }
    }
    
    return discoveredPrinters;
  }

  async testPrinterConnection(ip, port, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(null);
      }, timeout);

      socket.connect(port, ip, () => {
        clearTimeout(timer);
        
        // Send ESC/POS status query
        const statusQuery = Buffer.from([0x10, 0x04, 0x01]); // DLE EOT n
        socket.write(statusQuery);
      });

      socket.on('data', (data) => {
        clearTimeout(timer);
        socket.destroy();
        
        // Parse response to determine if it's a printer
        const printer = this.parsePrinterResponse(data, ip, port);
        resolve(printer);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  parsePrinterResponse(data, ip, port) {
    // Detect printer type based on response
    const response = data.toString().toLowerCase();
    const keywords = ['epson', 'star', 'citizen', 'thermal', 'receipt'];
    
    if (keywords.some(keyword => response.includes(keyword))) {
      return {
        name: `Printer ${ip}`,
        ip,
        port,
        manufacturer: this.detectManufacturer(response),
        model: this.detectModel(response),
        type: 'thermal',
        connection: 'network',
        status: 'online',
        capabilities: ['text', 'cut']
      };
    }
    
    return null;
  }
}
```

#### **Auto Registration Process**
```javascript
// printer-registration.js
class PrinterRegistration {
  async registerDiscoveredPrinters(branchId, discoveredPrinters) {
    const registrationResults = [];
    
    for (const printer of discoveredPrinters) {
      try {
        const registrationData = {
          name: printer.name,
          branchId: branchId,
          type: printer.type,
          connection: printer.connection,
          status: printer.status,
          ip: printer.ip,
          port: printer.port,
          manufacturer: printer.manufacturer,
          model: printer.model,
          assignedTo: this.determineAssignment(printer)
        };
        
        const response = await fetch('/api/v1/printing/printers/menuhere-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });
        
        const result = await response.json();
        registrationResults.push({
          printer: printer.name,
          success: result.success,
          message: result.message
        });
        
      } catch (error) {
        registrationResults.push({
          printer: printer.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return registrationResults;
  }

  determineAssignment(printer) {
    // Smart assignment based on printer characteristics
    const name = printer.name.toLowerCase();
    const model = (printer.model || '').toLowerCase();
    
    if (name.includes('kitchen') || model.includes('kitchen')) {
      return 'kitchen';
    } else if (name.includes('bar') || model.includes('bar')) {
      return 'bar';
    } else {
      return 'cashier'; // Default assignment
    }
  }
}
```

---

## 5. User Interface Design

### License Entry Screen
```
┌─────────────────────────────────────────────┐
│  Restaurant Platform - Printer Discovery    │
├─────────────────────────────────────────────┤
│                                             │
│  Enter Branch License Key:                  │
│  ┌─────────────────────────────────────────┐ │
│  │ f97ceb38-c797-4d1c-9ff4-89d9f8da5235   │ │
│  └─────────────────────────────────────────┘ │
│                                             │
│  Secret Pin (Dev Only):                     │
│  ┌─────────────────────────────────────────┐ │
│  │ ••••                                    │ │
│  └─────────────────────────────────────────┘ │
│                                             │
│  [Validate License]  [Advanced Settings]    │
│                                             │
└─────────────────────────────────────────────┘
```

### Printer Discovery Screen
```
┌─────────────────────────────────────────────────────────┐
│  Branch: Main Branch - Amman                           │
├─────────────────────────────────────────────────────────┤
│  Discovering Printers... ████████████░░░ 75%           │
│                                                         │
│  Found Printers:                                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ✓ Kitchen Printer 1 (192.168.1.100) - Epson       │ │
│  │ ✓ Cashier Printer (192.168.1.101) - Star          │ │
│  │ ⚠ Bar Printer (192.168.1.102) - Connection Error   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Registration Status:                                   │
│  • 2 printers registered successfully                   │
│  • 1 printer failed registration                        │
│                                                         │
│  [Re-scan] [Register All] [Settings] [Minimize]        │
└─────────────────────────────────────────────────────────┘
```

### System Tray Interface
```
┌──────────────────────────┐
│ Restaurant POS Client    │
├──────────────────────────┤
│ Status: Connected        │
│ Branch: Main Branch      │
│ Printers: 2 online       │
├──────────────────────────┤
│ ○ Show Window            │
│ ○ Rescan Printers        │
│ ○ Settings               │
│ ○ Exit                   │
└──────────────────────────┘
```

---

## 6. Real-time Communication

### WebSocket Integration
```javascript
// websocket-manager.js
class WebSocketManager {
  constructor(branchId) {
    this.branchId = branchId;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect() {
    this.socket = new WebSocket(`ws://localhost:3001/printing-ws?branchId=${this.branchId}`);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.heartbeat();
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'printer_status_update':
        this.updatePrinterStatus(message.data);
        break;
      case 'new_print_job':
        this.processPrintJob(message.data);
        break;
      case 'printer_registered':
        this.addNewPrinter(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  heartbeat() {
    setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'ping',
          branchId: this.branchId,
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // 30 second heartbeat
  }
}
```

### Status Broadcasting
```javascript
// status-broadcaster.js
class StatusBroadcaster {
  constructor(websocketManager) {
    this.ws = websocketManager;
    this.statusInterval = null;
  }

  startStatusBroadcast() {
    this.statusInterval = setInterval(async () => {
      const printerStatuses = await this.collectPrinterStatuses();
      
      for (const status of printerStatuses) {
        this.ws.send({
          type: 'printer_status',
          data: {
            printerId: status.id,
            status: status.status,
            lastSeen: new Date().toISOString(),
            queueLength: status.queueLength,
            paperLevel: status.paperLevel,
            temperature: status.temperature
          }
        });
      }
    }, 10000); // Update every 10 seconds
  }

  async collectPrinterStatuses() {
    // Query local printer statuses
    const printers = await this.getLocalPrinters();
    const statuses = [];
    
    for (const printer of printers) {
      try {
        const status = await this.checkPrinterHealth(printer);
        statuses.push(status);
      } catch (error) {
        statuses.push({
          id: printer.id,
          status: 'offline',
          error: error.message
        });
      }
    }
    
    return statuses;
  }
}
```

---

## 7. Print Template System

### Template Structure
```json
{
  "templateId": "cash_receipt_v1",
  "name": "Cash Receipt Template",
  "type": "receipt",
  "company": "Pizza Palace",
  "version": "1.0",
  "elements": [
    {
      "type": "header",
      "content": {
        "logo": "base64_image_data",
        "companyName": "{{company.name}}",
        "branchName": "{{branch.name}}",
        "address": "{{branch.address}}"
      }
    },
    {
      "type": "order_info",
      "content": {
        "orderNumber": "{{order.number}}",
        "date": "{{order.date}}",
        "cashier": "{{user.name}}"
      }
    },
    {
      "type": "items",
      "content": {
        "items": "{{order.items}}",
        "format": "quantity name price"
      }
    },
    {
      "type": "totals",
      "content": {
        "subtotal": "{{order.subtotal}}",
        "tax": "{{order.tax}}",
        "total": "{{order.total}}"
      }
    },
    {
      "type": "footer",
      "content": {
        "message": "Thank you for your visit!",
        "cut": true
      }
    }
  ]
}
```

### Template Processing
```javascript
// template-processor.js
class TemplateProcessor {
  processTemplate(template, orderData) {
    const escposCommands = [];
    
    for (const element of template.elements) {
      switch (element.type) {
        case 'header':
          escposCommands.push(...this.processHeader(element, orderData));
          break;
        case 'order_info':
          escposCommands.push(...this.processOrderInfo(element, orderData));
          break;
        case 'items':
          escposCommands.push(...this.processItems(element, orderData));
          break;
        case 'totals':
          escposCommands.push(...this.processTotals(element, orderData));
          break;
        case 'footer':
          escposCommands.push(...this.processFooter(element, orderData));
          break;
      }
    }
    
    return escposCommands;
  }

  processHeader(element, orderData) {
    const commands = [];
    
    // Center align
    commands.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1
    
    // Company name (double size)
    commands.push(Buffer.from([0x1B, 0x21, 0x30])); // ESC ! 48
    commands.push(Buffer.from(this.replaceVariables(element.content.companyName, orderData)));
    commands.push(Buffer.from([0x0A])); // LF
    
    // Branch name (normal size)
    commands.push(Buffer.from([0x1B, 0x21, 0x00])); // ESC ! 0
    commands.push(Buffer.from(this.replaceVariables(element.content.branchName, orderData)));
    commands.push(Buffer.from([0x0A])); // LF
    
    // Address
    commands.push(Buffer.from(this.replaceVariables(element.content.address, orderData)));
    commands.push(Buffer.from([0x0A, 0x0A])); // LF LF
    
    return commands;
  }

  replaceVariables(template, data) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return this.getNestedProperty(data, path) || match;
    });
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
}
```

---

## 8. Cross-Platform Deployment

### PKG Configuration
```json
{
  "name": "restaurant-pos-client",
  "version": "1.0.0",
  "description": "Restaurant Platform POS Client",
  "main": "src/app.js",
  "bin": {
    "restaurant-pos": "./src/app.js"
  },
  "pkg": {
    "scripts": [
      "src/**/*.js",
      "node_modules/**/*.js"
    ],
    "assets": [
      "assets/**/*",
      "templates/**/*"
    ],
    "targets": [
      "node18-win-x64",
      "node18-linux-x64", 
      "node18-macos-x64"
    ],
    "outputPath": "dist"
  },
  "scripts": {
    "build": "pkg . --compress GZip",
    "build-win": "pkg . --targets node18-win-x64 --compress GZip",
    "build-linux": "pkg . --targets node18-linux-x64 --compress GZip",
    "build-mac": "pkg . --targets node18-macos-x64 --compress GZip"
  }
}
```

### Build Scripts
```bash
#!/bin/bash
# build-all.sh

echo "Building Restaurant POS Client for all platforms..."

# Clean previous builds
rm -rf dist/

# Create dist directory
mkdir -p dist/

# Build for Windows
echo "Building for Windows..."
pkg . --targets node18-win-x64 --compress GZip --output dist/restaurant-pos-client-win.exe

# Build for Linux
echo "Building for Linux..."
pkg . --targets node18-linux-x64 --compress GZip --output dist/restaurant-pos-client-linux

# Build for macOS
echo "Building for macOS..."
pkg . --targets node18-macos-x64 --compress GZip --output dist/restaurant-pos-client-macos

echo "Build complete! Files available in dist/ directory"
```

### Installation Process
```
1. User downloads appropriate binary for their OS
2. Runs executable (no Node.js installation required)
3. Application creates config directory: 
   - Windows: %APPDATA%/RestaurantPOS/
   - Linux: ~/.restaurant-pos/
   - macOS: ~/Library/Application Support/RestaurantPOS/
4. User enters Branch ID (License Key)
5. Application validates license and begins printer discovery
6. Discovered printers are automatically registered
7. Application minimizes to system tray for background operation
```

---

## 9. Memory Optimization Strategies

### V8 Engine Optimizations
```javascript
// app.js - V8 optimization flags
process.env.NODE_OPTIONS = [
  '--max-old-space-size=512',      // Limit heap to 512MB
  '--max-semi-space-size=128',     // Optimize young generation
  '--optimize-for-size',           // Prioritize memory over speed
  '--gc-interval=100',             // Frequent garbage collection
  '--expose-gc'                    // Allow manual GC
].join(' ');

// Memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB threshold
    if (global.gc) {
      global.gc(); // Manual garbage collection
    }
  }
}, 30000); // Check every 30 seconds
```

### Efficient Data Structures
```javascript
// Use Map instead of Object for better memory management
class PrinterRegistry {
  constructor() {
    this.printers = new Map(); // More memory efficient than {}
    this.statusCache = new Map();
    this.maxCacheSize = 1000;
  }

  addPrinter(id, printer) {
    this.printers.set(id, printer);
    
    // Prevent memory leaks with cache size limit
    if (this.statusCache.size > this.maxCacheSize) {
      const firstKey = this.statusCache.keys().next().value;
      this.statusCache.delete(firstKey);
    }
  }

  cleanup() {
    // Explicit cleanup for better memory management
    this.printers.clear();
    this.statusCache.clear();
  }
}
```

### Connection Pooling
```javascript
// Reuse connections to prevent socket exhaustion
class ConnectionPool {
  constructor() {
    this.connections = new Map();
    this.maxConnections = 10;
  }

  async getConnection(ip, port) {
    const key = `${ip}:${port}`;
    
    if (this.connections.has(key)) {
      return this.connections.get(key);
    }
    
    if (this.connections.size >= this.maxConnections) {
      // Close oldest connection
      const oldestKey = this.connections.keys().next().value;
      const oldConnection = this.connections.get(oldestKey);
      oldConnection.destroy();
      this.connections.delete(oldestKey);
    }
    
    const connection = new net.Socket();
    this.connections.set(key, connection);
    return connection;
  }
}
```

---

## 10. Security Considerations

### License Key Security
```javascript
// Encrypt stored license keys
const crypto = require('crypto');

class SecureLicenseStorage {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = this.generateMachineKey();
  }

  generateMachineKey() {
    // Generate key based on machine characteristics
    const os = require('os');
    const machineId = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0].model
    ].join('|');
    
    return crypto.createHash('sha256').update(machineId).digest();
  }

  encryptLicense(licenseKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(licenseKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted
    };
  }

  decryptLicense(encryptedData) {
    const decipher = crypto.createDecipher(
      this.algorithm, 
      this.key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Secure API Communication
```javascript
// TLS/SSL enforcement
const https = require('https');
const fs = require('fs');

class SecureApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.agent = new https.Agent({
      rejectUnauthorized: true,
      checkServerIdentity: this.verifyServerCertificate
    });
  }

  verifyServerCertificate(hostname, cert) {
    // Additional certificate validation
    const expectedFingerprint = process.env.SERVER_CERT_FINGERPRINT;
    if (expectedFingerprint && cert.fingerprint !== expectedFingerprint) {
      throw new Error('Server certificate fingerprint mismatch');
    }
    return undefined; // Valid
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = {
      ...options,
      agent: this.agent,
      headers: {
        'User-Agent': 'RestaurantPOS/1.0',
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    return fetch(url, requestOptions);
  }
}
```

---

## 11. Error Handling & Logging

### Comprehensive Error Handling
```javascript
// error-handler.js
class ErrorHandler {
  constructor() {
    this.logFile = path.join(os.homedir(), '.restaurant-pos', 'error.log');
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      this.logError('UNCAUGHT_EXCEPTION', error);
      // Graceful shutdown
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logError('UNHANDLED_REJECTION', { reason, promise });
    });
  }

  logError(type, error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message: error.message,
      stack: error.stack,
      pid: process.pid,
      memory: process.memoryUsage()
    };

    // Write to file
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');

    // Send to remote logging service (optional)
    this.sendToRemoteLogger(logEntry);
  }

  async sendToRemoteLogger(logEntry) {
    try {
      await fetch('/api/v1/logs/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Silent fail - don't cause recursive errors
    }
  }
}
```

### Printer Communication Error Handling
```javascript
// printer-error-handler.js
class PrinterErrorHandler {
  async handlePrintError(printer, error) {
    const errorCode = this.classifyError(error);
    
    switch (errorCode) {
      case 'NETWORK_TIMEOUT':
        await this.handleNetworkTimeout(printer);
        break;
      case 'PAPER_OUT':
        await this.handlePaperOut(printer);
        break;
      case 'PRINTER_OFFLINE':
        await this.handlePrinterOffline(printer);
        break;
      case 'UNKNOWN_ERROR':
      default:
        await this.handleUnknownError(printer, error);
        break;
    }
  }

  classifyError(error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return 'NETWORK_TIMEOUT';
    }
    if (error.message.includes('paper') || error.message.includes('out')) {
      return 'PAPER_OUT';
    }
    if (error.code === 'ECONNREFUSED') {
      return 'PRINTER_OFFLINE';
    }
    return 'UNKNOWN_ERROR';
  }

  async handleNetworkTimeout(printer) {
    // Try alternative network path or mark as temporarily offline
    await this.updatePrinterStatus(printer.id, 'offline', 'Network timeout');
    
    // Schedule retry in 30 seconds
    setTimeout(() => {
      this.retryPrinterConnection(printer);
    }, 30000);
  }

  async handlePaperOut(printer) {
    await this.updatePrinterStatus(printer.id, 'no_paper', 'Paper out');
    
    // Notify via WebSocket
    this.notifyPaperOut(printer);
  }
}
```

---

## 12. Implementation Timeline

### Phase 1: Core Foundation (Weeks 1-2)
- [ ] Set up Node.js project structure
- [ ] Implement license validation system
- [ ] Create basic API client for backend communication
- [ ] Develop printer discovery engine (network scanning)
- [ ] Build ESC/POS protocol driver

### Phase 2: User Interface (Weeks 3-4)
- [ ] Design and implement license entry screen
- [ ] Create printer discovery and registration UI
- [ ] Implement system tray integration
- [ ] Add real-time status monitoring interface
- [ ] Build configuration management system

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Implement WebSocket real-time communication
- [ ] Add print template processing system
- [ ] Create automatic printer assignment logic
- [ ] Implement memory optimization strategies
- [ ] Add comprehensive error handling and logging

### Phase 4: Security & Packaging (Weeks 7-8)
- [ ] Implement secure license storage encryption
- [ ] Add TLS/SSL certificate validation
- [ ] Create PKG build configuration for all platforms
- [ ] Implement auto-update mechanism
- [ ] Add installation and deployment scripts

### Phase 5: Testing & Deployment (Weeks 9-10)
- [ ] Comprehensive testing with various printer brands
- [ ] Performance testing and memory profiling
- [ ] Multi-platform compatibility testing
- [ ] User acceptance testing
- [ ] Documentation and deployment guides

---

## 13. Testing Strategy

### Unit Tests
```javascript
// tests/license-manager.test.js
const { LicenseManager } = require('../src/core/license-manager');

describe('LicenseManager', () => {
  let licenseManager;

  beforeEach(() => {
    licenseManager = new LicenseManager();
  });

  test('should validate correct branch ID', async () => {
    const result = await licenseManager.validateLicense('f97ceb38-c797-4d1c-9ff4-89d9f8da5235');
    expect(result.valid).toBe(true);
  });

  test('should accept secret PIN for dev bypass', async () => {
    const result = await licenseManager.validateLicense('invalid-id', '0011');
    expect(result.valid).toBe(true);
    expect(result.bypass).toBe(true);
  });

  test('should reject invalid branch ID', async () => {
    const result = await licenseManager.validateLicense('invalid-branch-id');
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests
```javascript
// tests/integration/printer-discovery.test.js
describe('Printer Discovery Integration', () => {
  test('should discover and register network printers', async () => {
    const discovery = new PrinterDiscovery();
    const registration = new PrinterRegistration();
    
    // Mock network printer
    const mockPrinter = {
      ip: '192.168.1.100',
      port: 9100,
      manufacturer: 'Epson',
      model: 'TM-T88V'
    };

    const discovered = await discovery.discoverNetworkPrinters();
    expect(discovered.length).toBeGreaterThan(0);

    const results = await registration.registerDiscoveredPrinters(
      'test-branch-id', 
      discovered
    );
    
    expect(results.some(r => r.success)).toBe(true);
  });
});
```

### Performance Tests
```javascript
// tests/performance/memory-usage.test.js
describe('Memory Usage Tests', () => {
  test('should not exceed 512MB memory limit', (done) => {
    const app = require('../src/app');
    
    const checkMemory = () => {
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(512 * 1024 * 1024); // 512MB
    };

    // Run for 10 minutes
    const interval = setInterval(checkMemory, 10000);
    setTimeout(() => {
      clearInterval(interval);
      done();
    }, 600000);
  });
});
```

---

## 14. Maintenance & Updates

### Auto-Update System
```javascript
// updater.js
class AutoUpdater {
  constructor() {
    this.currentVersion = require('../package.json').version;
    this.updateEndpoint = '/api/v1/client/version';
  }

  async checkForUpdates() {
    try {
      const response = await fetch(this.updateEndpoint);
      const { latestVersion, downloadUrl } = await response.json();
      
      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        return { hasUpdate: true, version: latestVersion, downloadUrl };
      }
      
      return { hasUpdate: false };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false };
    }
  }

  async downloadAndInstallUpdate(downloadUrl) {
    const tempFile = path.join(os.tmpdir(), 'pos-client-update.exe');
    
    // Download update
    const response = await fetch(downloadUrl);
    const buffer = await response.buffer();
    fs.writeFileSync(tempFile, buffer);
    
    // Verify signature (important for security)
    if (!this.verifyUpdateSignature(tempFile)) {
      throw new Error('Update signature verification failed');
    }
    
    // Replace current executable (Windows example)
    const currentExe = process.execPath;
    const backupExe = currentExe + '.backup';
    
    fs.renameSync(currentExe, backupExe);
    fs.renameSync(tempFile, currentExe);
    
    // Restart application
    spawn(currentExe, process.argv.slice(2), {
      detached: true,
      stdio: 'ignore'
    });
    
    process.exit(0);
  }
}
```

### Remote Configuration Management
```javascript
// config-manager.js
class RemoteConfigManager {
  async fetchRemoteConfig() {
    try {
      const response = await fetch('/api/v1/client/config');
      const remoteConfig = await response.json();
      
      // Merge with local config
      const localConfig = this.loadLocalConfig();
      const mergedConfig = { ...localConfig, ...remoteConfig };
      
      this.saveLocalConfig(mergedConfig);
      return mergedConfig;
    } catch (error) {
      console.warn('Failed to fetch remote config:', error);
      return this.loadLocalConfig();
    }
  }

  loadLocalConfig() {
    const configPath = path.join(os.homedir(), '.restaurant-pos', 'config.json');
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      discoveryTimeout: 30000,
      heartbeatInterval: 30000,
      maxMemoryUsage: 512, // MB
      logLevel: 'info',
      autoReconnect: true,
      printerTimeout: 5000
    };
  }
}
```

---

## 15. Conclusion

This comprehensive implementation plan provides a detailed roadmap for building a robust, cross-platform POS client application with license-based printer auto-discovery capabilities. The system leverages Node.js for maximum compatibility while implementing advanced features like:

- **Secure License Management**: Branch ID-based authentication with encryption
- **Intelligent Printer Discovery**: Network scanning with ESC/POS protocol support
- **Real-time Communication**: WebSocket integration for live status updates
- **Memory Optimization**: V8 tuning for minimal resource usage
- **Cross-platform Deployment**: PKG packaging for Windows, Linux, and macOS
- **Comprehensive Error Handling**: Robust error management and recovery

The system supports both authenticated and public endpoints, enabling seamless integration with existing restaurant management systems while maintaining security and multi-tenant isolation.

### Next Steps:
1. Begin Phase 1 implementation with core foundation components
2. Set up development environment with testing frameworks  
3. Create initial prototypes for license validation and printer discovery
4. Establish CI/CD pipeline for automated building and testing
5. Begin user interface mockups and design validation

This plan ensures a production-ready solution that meets enterprise requirements for scalability, security, and reliability while remaining lightweight and user-friendly for restaurant operators.