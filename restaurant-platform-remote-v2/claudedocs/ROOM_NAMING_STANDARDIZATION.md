# Room Naming Standardization Guide

**Issue**: Inconsistent room naming across WebSocket namespaces
**Resolution**: Standardize to colon separator (`company:{id}`, `branch:{id}`)

---

## Current State (Inconsistent)

### Orders Namespace ✅
```typescript
// src/modules/orders/gateways/orders.gateway.ts
client.join(`company:${client.user.companyId}`);  // COLON
client.join(`branch:${client.user.branchId}`);    // COLON
```

### Availability Namespace ✅
```typescript
// src/modules/availability/availability.gateway.ts
client.join(`company:${companyId}`);  // COLON
client.join(`branch:${branchId}`);    // COLON
```

### Printing Namespace ❌ (NEEDS FIX)
```typescript
// src/modules/printing/gateways/printing-websocket.gateway.ts
client.join(`branch_${branchId}`);   // UNDERSCORE ← WRONG
client.join(`company_${companyId}`); // UNDERSCORE ← WRONG
```

---

## Required Changes

### File: `src/modules/printing/gateways/printing-websocket.gateway.ts`

**Search for**: `branch_${` and `company_${`
**Replace with**: `branch:${` and `company:${`

**Total Changes Required**: ~30 occurrences

### Example Changes

#### Connection Handler (Line ~356)
```typescript
// BEFORE
if (branchId) {
  client.join(`branch_${branchId}`);
  this.logger.log(`👥 [ROOMS] Auto-joined branch room: ${branchId}`);
}
if (companyId) {
  client.join(`company_${companyId}`);
  this.logger.log(`👥 [ROOMS] Auto-joined company room: ${companyId}`);
}

// AFTER
if (branchId) {
  client.join(`branch:${branchId}`);  // ← Changed to colon
  this.logger.log(`👥 [ROOMS] Auto-joined branch room: ${branchId}`);
}
if (companyId) {
  client.join(`company:${companyId}`);  // ← Changed to colon
  this.logger.log(`👥 [ROOMS] Auto-joined company room: ${companyId}`);
}
```

#### Broadcast Methods (Lines ~1115, ~1125)
```typescript
// BEFORE
this.server.to(`branch_${printerData.branchId}`).emit('printer:added', {...});

// AFTER
this.server.to(`branch:${printerData.branchId}`).emit('printer:added', {...});
```

#### Join Branch Handler (Line ~1251)
```typescript
// BEFORE
client.join(`branch_${data.branchId}`);

// AFTER
client.join(`branch:${data.branchId}`);
```

#### Subscription Handlers (Lines ~1484, ~1500)
```typescript
// BEFORE
client.join(`company_${data.companyId}`);
client.join(`branch_${data.branchId}`);

// AFTER
client.join(`company:${data.companyId}`);
client.join(`branch:${data.branchId}`);
```

---

## Automated Fix Script

```bash
#!/bin/bash
# File: scripts/fix-room-naming.sh

FILE="src/modules/printing/gateways/printing-websocket.gateway.ts"

# Backup original file
cp "$FILE" "$FILE.backup"

# Replace all occurrences
sed -i 's/branch_\${/branch:\${/g' "$FILE"
sed -i 's/company_\${/company:\${/g' "$FILE"

# Replace string literals
sed -i "s/'branch_/$'branch:/g" "$FILE"
sed -i "s/'company_/$'company:/g" "$FILE"

echo "✅ Room naming standardized in $FILE"
echo "📁 Backup saved to $FILE.backup"
```

**Run**:
```bash
chmod +x scripts/fix-room-naming.sh
./scripts/fix-room-naming.sh
```

---

## Testing After Changes

### 1. Test Desktop App Connection
```typescript
// Desktop app connects to /printing-ws
// Expected: Auto-joins branch:BRANCH_ID and company:COMPANY_ID

// Check logs:
// ✅ "Auto-joined branch room: branch:abc-123"
// ✅ "Auto-joined company room: company:xyz-789"
```

### 2. Test Printer Discovery Broadcast
```typescript
// Desktop app discovers printer
// Expected: Broadcast to branch:BRANCH_ID room

// Verify:
// ✅ this.server.to(`branch:${branchId}`).emit('printer:added', ...)
```

### 3. Test Subscription Events
```typescript
// Web client subscribes to company updates
// Expected: Joins company:COMPANY_ID room

// Verify:
// ✅ client.join(`company:${companyId}`)
```

---

## Verification Commands

### Check for remaining underscores
```bash
grep -n "branch_\${" src/modules/printing/gateways/printing-websocket.gateway.ts
grep -n "company_\${" src/modules/printing/gateways/printing-websocket.gateway.ts

# Expected: No matches
```

### Check for correct colons
```bash
grep -n "branch:\${" src/modules/printing/gateways/printing-websocket.gateway.ts | wc -l
grep -n "company:\${" src/modules/printing/gateways/printing-websocket.gateway.ts | wc -l

# Expected: ~15 matches each
```

---

## Rollback Plan

If issues occur after deployment:

```bash
# Restore backup
cp src/modules/printing/gateways/printing-websocket.gateway.ts.backup \
   src/modules/printing/gateways/printing-websocket.gateway.ts

# Rebuild
npm run build

# Restart PM2
pm2 restart restaurant-backend
```

---

## Standard Room Naming Convention

### Company Rooms
- **Format**: `company:{companyId}`
- **Usage**: Broadcast to all users in a company
- **Example**: `company:550e8400-e29b-41d4-a716-446655440000`

### Branch Rooms
- **Format**: `branch:{branchId}`
- **Usage**: Broadcast to users watching specific branch
- **Example**: `branch:6fa459ea-ee8a-3ca4-894e-db77e160355e`

### User-Specific Rooms (if needed)
- **Format**: `user:{userId}`
- **Usage**: Private notifications to specific user
- **Example**: `user:7c9e6679-7425-40de-944b-e07fc1f90ae7`

### Desktop App Rooms (if needed)
- **Format**: `desktop:{deviceId}`
- **Usage**: Target specific desktop app instance
- **Example**: `desktop:DESKTOP-ABC123`

---

## Benefits of Standardization

1. **Consistency**: Same pattern across all namespaces
2. **Readability**: Colon separator is clearer than underscore
3. **Debugging**: Easier to grep and search logs
4. **Maintenance**: Reduces cognitive load for developers
5. **Compatibility**: Matches Socket.io community conventions

---

## Post-Deployment Checklist

- [ ] Backup original file created
- [ ] All `branch_${` replaced with `branch:${`
- [ ] All `company_${` replaced with `company:${`
- [ ] No remaining underscore separators
- [ ] TypeScript compilation successful
- [ ] Desktop app test connection working
- [ ] Printer discovery broadcasts received
- [ ] Web client subscriptions functional
- [ ] No errors in PM2 logs

---

**Priority**: Medium
**Effort**: Low (30 minutes)
**Risk**: Low (backward compatible with existing connections)
**Recommendation**: Apply during next maintenance window
