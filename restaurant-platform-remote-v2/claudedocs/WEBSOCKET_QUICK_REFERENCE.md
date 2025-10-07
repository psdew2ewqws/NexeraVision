# WebSocket Infrastructure Quick Reference Card

**Last Updated**: 2025-10-07
**Production Server**: root@31.57.166.18
**Backend URL**: `http://31.57.166.18:3001`

---

## Namespace Overview

| Namespace | URL | Purpose | Auth Required |
|-----------|-----|---------|---------------|
| `/printing-ws` | `ws://backend:3001/printing-ws` | Printer management, desktop app | JWT or Desktop App credentials |
| `/orders` | `ws://backend:3001/orders` | Order tracking, delivery updates | JWT token |
| `/availability` | `ws://backend:3001/availability` | Inventory, stock alerts | JWT token |

---

## Connection Examples

### Frontend (Web Client)

```typescript
import { io, Socket } from 'socket.io-client';

// Printing namespace
const printingSocket = io('http://backend:3001/printing-ws', {
  auth: {
    token: jwtToken,
    userRole: 'web_client',
    branchId: userBranchId,
    companyId: userCompanyId
  }
});

// Orders namespace
const ordersSocket = io('http://backend:3001/orders', {
  auth: { token: jwtToken }
});

// Availability namespace
const availabilitySocket = io('http://backend:3001/availability', {
  auth: { token: jwtToken }
});
```

### Desktop App (PrinterMaster)

```typescript
const socket = io('http://backend:3001/printing-ws', {
  auth: {
    userRole: 'desktop_app',
    deviceId: 'DESKTOP-ABC123',
    branchId: 'branch-uuid',
    companyId: 'company-uuid',
    licenseKey: 'license-key',
    appVersion: '2.0.0',
    instanceId: 'instance-uuid'
  }
});
```

---

## Room Strategy

### Automatic Room Joining

**Printing Namespace**:
```typescript
// On connection, auto-join:
client.join(`branch:${branchId}`);
client.join(`company:${companyId}`);
```

**Orders Namespace**:
```typescript
// On connection, auto-join:
client.join(`company:${companyId}`);
client.join(`branch:${branchId}`); // if user has branchId
```

**Availability Namespace**:
```typescript
// On connection, auto-join:
client.join(`company:${companyId}`);
// Manual branch subscription via joinBranch event
```

### Manual Room Joining

```typescript
// Join specific branch room
socket.emit('join:branch', { branchId: 'branch-uuid' });

// Leave branch room
socket.emit('leaveBranch', { branchId: 'branch-uuid' });
```

---

## Key Events by Namespace

### `/printing-ws` Namespace

**Client → Server**:
- `printer:test` - Send test print request
- `printer:discovered` - Desktop app discovered new printer
- `desktop:status` - Desktop app status update
- `join:branch` - Join branch-specific room

**Server → Client**:
- `printer:test:result` - Test print result
- `printerStatusUpdate` - Real-time printer health update
- `printer:added` - New printer discovered
- `printerUpdate` - Printer configuration changed
- `desktop:connected` - Desktop app connection confirmed

### `/orders` Namespace

**Client → Server**:
- `joinBranch` - Subscribe to branch orders
- `leaveBranch` - Unsubscribe from branch
- `requestLiveOrders` - Get current live orders

**Server → Client**:
- `newOrder` - New order created
- `orderStatusUpdate` - Order status changed
- `orderCancelled` - Order cancelled
- `driverUpdate` - Delivery driver assigned/updated

### `/availability` Namespace

**Client → Server**:
- `joinBranch` - Subscribe to branch inventory
- `leaveBranch` - Unsubscribe from branch
- `ping` - Connection health check

**Server → Client**:
- `availabilityUpdate` - Product/modifier availability changed
- `bulkAvailabilityUpdate` - Bulk inventory update
- `stockAlert` - Stock alert (out of stock, low stock)
- `newAlert` - Critical inventory alert

---

## Broadcasting Strategies

### Company-Wide Broadcast

```typescript
// Emit to all users in a company
this.server.to(`company:${companyId}`).emit('eventName', data);
```

### Branch-Specific Broadcast

```typescript
// Emit to all users watching a specific branch
this.server.to(`branch:${branchId}`).emit('eventName', data);
```

### User-Specific Message

```typescript
// Emit to specific client
client.emit('eventName', data);
```

### Global Broadcast

```typescript
// Emit to all connected clients (use sparingly)
this.server.emit('eventName', data);
```

---

## Authentication Flow

### Web Client (JWT)

1. User logs in via `/auth/login`
2. Receives JWT token
3. Connects to WebSocket with token in `auth` object
4. Backend verifies JWT token
5. Client auto-joins company/branch rooms based on token claims

### Desktop App (License Key)

1. Desktop app starts with license key
2. Connects to `/printing-ws` with device metadata
3. Backend verifies license key
4. Client auto-joins branch/company rooms
5. Desktop app receives printer discovery requests

---

## Correlation ID Pattern (Printing Namespace)

**Purpose**: Match asynchronous requests with responses

**Request** (Backend → Desktop App):
```typescript
const correlationId = `printer_test_${Date.now()}_${Math.random()}`;
client.emit('printer:test', {
  printerId: 'printer-uuid',
  correlationId: correlationId,
  ...testData
});
```

**Response** (Desktop App → Backend):
```typescript
socket.emit('printer:test:result', {
  correlationId: receivedCorrelationId,
  printerId: 'printer-uuid',
  success: true,
  message: 'Test print completed'
});
```

**Resolution** (Backend):
```typescript
// Pending requests resolved by correlation ID
this.resolvePendingRequest(correlationId, response);
```

---

## Common Troubleshooting

### Desktop App Not Connecting

**Check**:
1. Desktop app running? `ps aux | grep PrinterMaster`
2. Backend WebSocket server running? `pm2 status restaurant-backend`
3. Firewall blocking port 3001? `telnet backend 3001`
4. Correct backend URL in desktop app config?

**Verify**:
```bash
# Backend logs should show:
"🖥️ [DESKTOP] Connected: Device DESKTOP-ABC123 (2.0.0) - Branch: branch-uuid"
```

### Test Print Not Working

**Check**:
1. Desktop app connected? Look for `[DESKTOP] Connected` in logs
2. Printer discovered? Check `printerStatuses` map
3. Correlation ID matching? Look for `[REQ-RES]` logs
4. Timeout issues? Default 15s timeout

**Verify**:
```bash
# Backend logs should show:
"📤 [PHYSICAL-TEST] Test request sent to 1 PrinterMaster clients"
"✅ [REQ-RES] Resolved request: printer_test_12345"
```

### Events Not Being Received

**Check**:
1. Client connected to correct namespace?
2. Client joined correct room? `client.join(room)`
3. Event name matches exactly? (case-sensitive)
4. Auth token valid and not expired?

**Verify**:
```typescript
// Client-side debugging
socket.on('connect', () => {
  console.log('Connected to namespace:', socket.nsp);
  console.log('Socket ID:', socket.id);
});

socket.onAny((eventName, ...args) => {
  console.log('Received event:', eventName, args);
});
```

---

## Performance Guidelines

### Connection Limits

- **Recommended**: < 1000 concurrent connections per namespace
- **Maximum tested**: 5000 total connections (all namespaces)
- **Desktop apps**: Typically 1-10 per company
- **Web clients**: Variable based on active users

### Event Size Limits

- **Small events**: < 1 KB (status updates, pings)
- **Medium events**: 1-10 KB (printer discovery, order updates)
- **Large events**: 10-100 KB (bulk updates, reports)
- **Avoid**: Events > 100 KB (use HTTP API instead)

### Broadcast Frequency

- **High frequency**: Every 1-5 seconds (printer status)
- **Medium frequency**: Every 10-30 seconds (order updates)
- **Low frequency**: Every 1-5 minutes (analytics, reports)

---

## PM2 Management

### Check Status

```bash
pm2 status restaurant-backend
pm2 logs restaurant-backend --lines 100
```

### Restart Backend

```bash
pm2 restart restaurant-backend
```

### Monitor Real-time

```bash
pm2 monit restaurant-backend
```

### View WebSocket Connections

```bash
pm2 logs restaurant-backend | grep "Client connected"
```

---

## Configuration Files

### Backend

- **Main adapter**: `src/common/adapters/socket-io.adapter.ts`
- **Printing gateway**: `src/modules/printing/gateways/printing-websocket.gateway.ts`
- **Orders gateway**: `src/modules/orders/gateways/orders.gateway.ts`
- **Availability gateway**: `src/modules/availability/availability.gateway.ts`

### PM2

- **Config file**: `/home/admin/restaurant-platform-remote-v2/backend/ecosystem.config.js`
- **Current mode**: Fork (1 instance)
- **Port**: 3001

### Environment Variables

```bash
# .env
PORT=3001
CORS_ORIGINS=http://localhost:3000,http://31.57.166.18:3000
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...
```

---

## Quick Debugging Commands

### Check Active WebSocket Connections

```bash
# On server
netstat -an | grep :3001 | grep ESTABLISHED | wc -l
```

### Test WebSocket Connection

```bash
# Using wscat
npm install -g wscat
wscat -c "ws://31.57.166.18:3001/printing-ws"
```

### Check Backend Logs for WebSocket Events

```bash
pm2 logs restaurant-backend | grep -E "Client connected|Client disconnected|PHYSICAL-TEST"
```

### Monitor Event Flow

```bash
pm2 logs restaurant-backend --raw | grep -E "emit|broadcast"
```

---

## Emergency Procedures

### All WebSocket Connections Hanging

1. Check PM2 status: `pm2 status`
2. Check process memory: `pm2 monit`
3. If memory > 1GB: `pm2 restart restaurant-backend`
4. Check for error loops: `pm2 logs restaurant-backend --err --lines 50`

### Desktop App Can't Connect

1. Check if backend is running: `pm2 status restaurant-backend`
2. Check firewall: `sudo ufw status`
3. Check CORS origins in backend logs
4. Restart backend: `pm2 restart restaurant-backend`

### Events Not Broadcasting

1. Check if room exists: Look for room join in logs
2. Check event name spelling (case-sensitive)
3. Check if client is still connected
4. Restart backend as last resort

---

## Contact & Escalation

**Primary Documentation**:
- `/home/admin/restaurant-platform-remote-v2/claudedocs/PHASE_7_8_INFRASTRUCTURE.md`
- `/home/admin/restaurant-platform-remote-v2/claudedocs/PHASE_4_5_6_COMPREHENSIVE_REPORT.md`

**Related Systems**:
- Backend API: Port 3001
- Frontend: Port 3000
- PrinterMaster Desktop App: Custom installer
- Database: PostgreSQL (postgres database)

---

**Version**: 1.0
**Last Review**: 2025-10-07
**Next Review**: When scaling to cluster mode
