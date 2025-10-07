# API URL Fix Guide - Complete System-Wide Fix

## Problem
Files across the frontend are using hardcoded URLs like:
- `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/endpoint`
- `'http://localhost:3001/api/v1/endpoint'`
- `http://localhost:3001/endpoint`

This causes 404 errors because the base URL construction is incorrect.

## Root Cause
The `/api/v1` prefix is being doubled:
- Hardcoded URL includes `/api/v1`
- Base URL from env also includes `/api/v1`
- Result: `http://localhost:3001/api/v1/api/v1/endpoint` → 404

## Correct Patterns

### Pattern 1: Use useApiClient Hook (PREFERRED)
```typescript
// ✅ CORRECT
import { useApiClient } from '@/hooks/useApiClient';

const MyComponent = () => {
  const { apiCall } = useApiClient();

  const fetchData = async () => {
    // apiCall automatically adds base URL + /api/v1
    const data = await apiCall('/endpoint'); // → http://localhost:3001/api/v1/endpoint
  };
};
```

### Pattern 2: Direct Fetch with Proper Base URL
```typescript
// ✅ CORRECT - For cases where useApiClient cannot be used
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const response = await fetch(`${baseUrl}/api/v1/endpoint`);

// ❌ WRONG - Includes /api/v1 twice
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/endpoint`);
```

### Pattern 3: WebSocket Connections
```typescript
// ✅ CORRECT
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const socket = io(`${wsUrl}/namespace`);

// ❌ WRONG
const socket = io('ws://localhost:3001/namespace');
```

## Files Fixed

### Priority 1: Pages (User-Facing)
- [ ] `pages/menu/promotions.tsx` - 8 occurrences
- [ ] `pages/menu/availability.tsx` - 4 occurrences
- [ ] `pages/menu/products-debug.tsx` - 2 occurrences
- [ ] `pages/branches.tsx` - 3 occurrences
- [ ] `pages/login.tsx` - 1 occurrence
- [ ] `pages/settings/printing.tsx` - 1 occurrence

### Priority 2: Components
- [ ] `src/components/features/delivery/*.tsx` - ~44 files
- [ ] `src/components/health/HealthMonitoringDashboard.tsx`
- [ ] `src/components/menu/*.tsx`

### Priority 3: Feature Modules
- [ ] `src/features/delivery/components/*.tsx` - ~22 files
- [ ] `src/features/menu/components/*.tsx` - ~12 files
- [ ] `src/features/operations/components/*.tsx` - ~4 files

### Priority 4: Hooks & Contexts
- [ ] `src/hooks/useIntegrationData.ts`
- [ ] `src/hooks/useDashboardMetrics.ts`
- [ ] `src/hooks/useAvailabilitySocket.ts`
- [ ] `src/hooks/analytics/useAnalytics.ts`
- [ ] `src/contexts/AuthContext.tsx`
- [ ] `src/contexts/LicenseContext.tsx`
- [ ] `src/shared/contexts/*.tsx`

### Priority 5: Utilities & Services
- [ ] `src/lib/api.ts`
- [ ] `src/lib/integration-api.ts`
- [ ] `src/lib/integration-websocket.ts`
- [ ] `src/services/websocketService.ts`
- [ ] `src/utils/apiHelpers.tsx`
- [ ] `src/utils/imageUrl.ts`
- [ ] `src/shared/lib/api.ts`
- [ ] `src/shared/utils/*.ts`

## Verification Commands

### Check for remaining hardcoded URLs
```bash
# Exclude allowed patterns (printer port 8182, health checks)
grep -r "localhost:3001" pages/ src/ --include="*.ts" --include="*.tsx" | \
  grep -v "8182" | \
  grep -v "health-check" | \
  grep -v node_modules | \
  grep -v ".next"
```

### Verify API calls use relative paths
```bash
grep -r "apiCall.*http" pages/ src/ --include="*.ts" --include="*.tsx"
```

### Check for proper base URL usage
```bash
grep -r "NEXT_PUBLIC_API_URL.*api/v1" pages/ src/ --include="*.ts" --include="*.tsx" -B 2 -A 2
```

## Testing Checklist
After fixes are applied:

1. **Authentication**
   - [ ] Login page works
   - [ ] Token refresh works
   - [ ] Logout works

2. **Menu Management**
   - [ ] Products page loads without 404
   - [ ] Categories load correctly
   - [ ] Product CRUD operations work
   - [ ] Availability management works
   - [ ] Promotions page works

3. **Settings**
   - [ ] Users page works
   - [ ] Companies page works
   - [ ] Branches page works
   - [ ] Printing settings work

4. **Delivery Integration**
   - [ ] Delivery provider pages load
   - [ ] Order tracking works
   - [ ] Provider configuration works

5. **Real-time Features**
   - [ ] WebSocket connections establish
   - [ ] Live updates work
   - [ ] Dashboard streams work

## Implementation Strategy

### Phase 1: Critical User-Facing Pages (IMMEDIATE)
Fix pages directory files first - these are what users directly access.

### Phase 2: Shared Components (HIGH PRIORITY)
Fix components used across multiple pages.

### Phase 3: Feature Modules (MEDIUM PRIORITY)
Fix feature-specific components.

### Phase 4: Infrastructure (LOW PRIORITY)
Fix utility files, services, and shared libraries.

### Phase 5: Verification (REQUIRED)
Run all verification commands and test all features.

## Notes
- **DO NOT** modify files with printer port 8182 (PrinterMaster service)
- **DO NOT** modify health check URLs
- **DO NOT** modify WebSocket URLs to different format
- **DO** preserve authentication headers
- **DO** preserve error handling logic
- **DO** test each change before moving to next file

## Environment Variables
Ensure `.env.local` has:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**Backend should handle the `/api/v1` prefix**, not the frontend code.
