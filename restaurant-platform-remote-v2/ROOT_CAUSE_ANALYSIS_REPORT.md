# Root Cause Analysis Report
## Restaurant Platform Menu System Issues

**Date**: October 3, 2025
**Analyst**: Claude Code
**Severity**: CRITICAL

---

## Executive Summary

Three interconnected issues have been identified in the restaurant platform menu system:
1. **Routing Conflict**: `/menu` index page conflicts with menu listing requirements
2. **BranchSelector 404 Error**: Incorrect API endpoint causing branch loading failures
3. **Products API 400 Error**: Token authentication mismatch and endpoint path issues

All three issues stem from **API endpoint inconsistencies** and **authentication token naming conflicts**.

---

## Issue #1: Routing Conflict - /menu vs /menu/list

### Current State Analysis

**Frontend Route Structure:**
```
frontend/pages/menu/
├── index.tsx         ← Currently serves as menu synchronization page
├── list.tsx          ← Desired menu list page
├── products.tsx      ← Product management page
├── builder.tsx       ← Menu builder
├── availability.tsx
├── promotions.tsx
└── [other pages]
```

### Root Cause

**Problem**: Two different menu management systems coexist:
- **`/menu/index.tsx`**: Legacy "menu synchronization" page (fetches from `/menus` endpoint)
- **`/menu/list.tsx`**: Modern "menu list" page (fetches from `/api/v1/menus` endpoint)

**Evidence from Code:**

**File: `/frontend/pages/menu/index.tsx` (Line 59)**
```typescript
const response = await fetch('http://localhost:3001/menus', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
});
```

**File: `/frontend/pages/menu/list.tsx` (Line 109)**
```typescript
const response = await fetch(`http://localhost:3001/api/v1/menus`, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Backend Controllers:**
- **`/menus`** → `src/modules/menus/controllers/menus.controller.ts` (Line 25: `@Controller('menus')`)
- **`/api/v1/menus`** → Same controller but with global prefix

### Impact

- Confusion about which page serves as the primary menu list
- Navigation inconsistency
- Two different data models for similar functionality

### Resolution Required

**Option A (Recommended): Replace /menu with /menu/list**
```typescript
// DELETE: frontend/pages/menu/index.tsx
// REDIRECT: All links to /menu → /menu/list
```

**Option B: Merge Functionality**
- Consolidate both pages into single unified menu list at `/menu/list`
- Update all navigation references

---

## Issue #2: BranchSelector 404 Error - Failed to Load Branches

### Root Cause: Missing API Version Prefix

**Error Location:**
```
File: frontend/src/components/menu/BranchSelector.tsx
Line: 52 - API endpoint construction
Line: 60 - Error thrown when response.status = 404
```

**Problematic Code (Line 52):**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/branches`, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

**What Actually Happens:**
```
Expected:  http://localhost:3001/api/v1/branches
Actual:    http://localhost:3001/branches  ← 404 NOT FOUND
```

### Evidence from Backend

**File: `backend/src/main.ts` (Line 101)**
```typescript
app.setGlobalPrefix('api/v1');
```

**File: `backend/src/modules/branches/branches.controller.ts` (Line 26)**
```typescript
@Controller('branches')  // Becomes /api/v1/branches after global prefix
```

**File: `backend/src/modules/branches/branches.controller.ts` (Line 47-56)**
```typescript
@Get()
@Public()  // ← This endpoint IS public and accessible!
@ApiOperation({ summary: 'Get all branches (public read access for delivery zones)' })
async findAll(@Query('companyId') companyId?: string) {
  const branches = await this.branchesService.findAllPublic({ companyId });
  return { branches };
}
```

### Why It Returns 404

The backend correctly exposes branches at:
```
✅ GET /api/v1/branches (Public access, no auth required)
```

But the frontend is calling:
```
❌ GET /branches (Does not exist - 404)
```

### Authentication Token Issue

**Secondary Problem**: Token key inconsistency

**Line 47 in BranchSelector.tsx:**
```typescript
const authToken = localStorage.getItem('auth-token');  // ← Looking for 'auth-token'
```

**But most of the app uses:**
```typescript
localStorage.getItem('token');  // ← Different key!
```

**Evidence:**
- `menu/index.tsx` Line 61: Uses `'token'`
- `menu/list.tsx` Line 101: Uses `'token'`
- `BranchSelector.tsx` Line 47: Uses `'auth-token'` ← INCONSISTENT

### Complete Fix Required

**File: `/frontend/src/components/menu/BranchSelector.tsx`**

**Change Line 47:**
```typescript
// BEFORE:
const authToken = localStorage.getItem('auth-token');

// AFTER:
const authToken = localStorage.getItem('token');
```

**Change Line 52:**
```typescript
// BEFORE:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/branches`, {

// AFTER:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/branches`, {
```

---

## Issue #3: Products API 400 Bad Request Error

### Root Cause: Multiple Compounding Issues

**Problem Location:**
```
Component: VirtualizedProductGrid or products.tsx
API Endpoint: POST /menu/products/paginated
Error: 400 Bad Request
```

### Issue 3A: Endpoint Path Inconsistency

**Frontend API Helper (Line 196-198 in apiHelpers.tsx):**
```typescript
const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const baseUrl = envUrl.includes('/api/v1') ? envUrl : `${envUrl}/api/v1`;
const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
```

**Menu API Call (Line 291 in apiHelpers.tsx):**
```typescript
getProducts: (filters: any) => apiCall<{...}>(
  '/menu/products/paginated',  // ← Endpoint passed to apiCall
  {
    method: 'POST',
    body: JSON.stringify(filters)
  },
  {
    validateResponse: (data) => Array.isArray(data?.products) && data?.pagination,
    fallbackData: { products: [], pagination: { hasMore: false, total: 0, page: 1 } }
  }
```

**Constructed URL:**
```
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001"
baseUrl = "http://localhost:3001/api/v1"
endpoint = "/menu/products/paginated"
Final URL = "http://localhost:3001/api/v1/menu/products/paginated"
```

**Backend Controller (Line 38 in menu.controller.ts):**
```typescript
@Controller('menu')  // With global prefix becomes /api/v1/menu
export class MenuController {

  @Post('products/paginated')  // Full path: /api/v1/menu/products/paginated
  @Public()  // ← Made public for development
```

**Verdict**: ✅ Endpoint path is CORRECT

### Issue 3B: Authentication Token Problem

**The apiCall helper (Line 188 in apiHelpers.tsx):**
```typescript
if (requireAuth) {
  const token = localStorage.getItem('auth-token');  // ← Uses 'auth-token'
  if (!token) {
    throw new Error('Authentication required');
  }
  headers['Authorization'] = `Bearer ${token}`;
}
```

**But the endpoint is @Public() and doesn't require auth!**

**Backend Controller (Line 47-48):**
```typescript
@Post('products/paginated')
@Public() // Make public for development
```

**Problem**: Frontend still tries to send auth, but looks for wrong token key!

### Issue 3C: Request Body Validation

**Backend expects (ProductFiltersDto):**
```typescript
class ProductFiltersDto {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
  companyId?: string;  // ← Required for public access
}
```

**Frontend sends (Line 58-64 in products.tsx):**
```typescript
const [filters, setFilters] = useState<ProductFiltersType>({
  sortBy: 'priority',
  sortOrder: 'asc',
  status: undefined,
  search: '',
  tags: []
  // ← Missing companyId!
});
```

**Backend Line 57 in menu.controller.ts:**
```typescript
return this.menuService.getPaginatedProducts(
  filters,
  filters.companyId || 'dc3c6a10-96c6-4467-9778-313af66956af',  // ← Falls back to default
  'public'
);
```

### Why 400 Bad Request?

**Most Likely Cause**: Token-related errors or validation failures

1. **Frontend looks for 'auth-token'** but app stores 'token'
2. **No token found** → might send empty Authorization header
3. **Backend validation** might reject malformed requests
4. **Missing required fields** in filters object

---

## Data Flow Comparison: Working vs. Broken

### Working Flow (menu/list.tsx)

```
1. Frontend loads page
2. Checks authentication (isAuthenticated, user)
3. Retrieves token: localStorage.getItem('token')  ✅
4. Calls API: http://localhost:3001/api/v1/menus  ✅
5. Backend: @Controller('menus') + app.setGlobalPrefix('api/v1')
6. Response: { data: [...], menus: [...] }
7. Success! ✅
```

### Broken Flow (BranchSelector)

```
1. Component loads
2. Retrieves token: localStorage.getItem('auth-token')  ❌ (wrong key)
3. Calls API: http://localhost:3001/branches  ❌ (missing /api/v1)
4. Backend: No route exists for /branches
5. Response: 404 Not Found
6. Error displayed: "Failed to load branches: 404" ❌
```

### Broken Flow (Products API)

```
1. Frontend loads products page
2. apiHelper looks for: localStorage.getItem('auth-token')  ❌
3. Token not found (stored as 'token')
4. Calls API: http://localhost:3001/api/v1/menu/products/paginated  ✅
5. Request body may be malformed or missing companyId
6. Backend validation fails
7. Response: 400 Bad Request ❌
```

---

## Impact Analysis

### Files Requiring Modification

**Frontend:**
1. `/frontend/src/components/menu/BranchSelector.tsx`
   - Line 47: Change token key from 'auth-token' to 'token'
   - Line 52: Add '/api/v1' to endpoint path

2. `/frontend/src/utils/apiHelpers.tsx`
   - Line 188: Change token key from 'auth-token' to 'token'
   - OR: Update entire app to use consistent token key

3. `/frontend/pages/menu/index.tsx`
   - DECISION: Delete or redirect to /menu/list

4. `/frontend/pages/menu/list.tsx`
   - Line 101: Already correct (uses 'token')
   - Line 137: Already correct (uses 'auth-token' for platforms API)
   - INCONSISTENCY: Uses both token keys!

**Navigation/Links:**
- Search all files for `href="/menu"` and update to `/menu/list`
- Check dashboard navigation components

**Backend:**
- No changes required - all endpoints are correctly configured

---

## Recommended Fix Strategy

### Phase 1: Token Standardization (CRITICAL)

**Decision Point**: Which token key should be the standard?

**Current Usage Audit:**
- ✅ `'token'`: menu/index.tsx, menu/list.tsx, most auth flows
- ❌ `'auth-token'`: apiHelpers.tsx, some components

**Recommendation**: Standardize on `'token'`

**Files to Update:**
1. `/frontend/src/utils/apiHelpers.tsx` Line 188
2. `/frontend/src/components/menu/BranchSelector.tsx` Line 47
3. Any other components using 'auth-token'

**Search Command:**
```bash
grep -r "auth-token" frontend/src --include="*.tsx" --include="*.ts"
```

### Phase 2: API Endpoint Fixes (HIGH PRIORITY)

**File: `/frontend/src/components/menu/BranchSelector.tsx`**

```typescript
// Line 52 - BEFORE:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/branches`, {

// Line 52 - AFTER:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/branches`, {
```

### Phase 3: Routing Resolution (MEDIUM PRIORITY)

**Option A: Delete /menu/index.tsx**
```bash
# Backup first
mv frontend/pages/menu/index.tsx frontend/pages/menu/index.tsx.backup

# Update navigation
# Find all references: grep -r "href=\"/menu\"" frontend/
# Replace with: href="/menu/list"
```

**Option B: Redirect /menu to /menu/list**
```typescript
// frontend/pages/menu/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MenuRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/menu/list');
  }, [router]);

  return null;
}
```

### Phase 4: Products API Fix (HIGH PRIORITY)

**Option A: Ensure Public Access Works**
- Verify token standardization fixes the issue
- Test without authentication

**Option B: Add CompanyId to Filters**
```typescript
// In products.tsx when calling getProducts
const filters = {
  ...currentFilters,
  companyId: user?.companyId || 'dc3c6a10-96c6-4467-9778-313af66956af'
};
```

---

## Risk Assessment

### Potential Breaking Changes

1. **Token Key Change**
   - Risk: Users might need to re-login
   - Mitigation: Check both keys during migration period

2. **Route Removal (/menu)**
   - Risk: Bookmarks and external links break
   - Mitigation: Use redirect approach (Option B)

3. **API Endpoint Changes**
   - Risk: None - only fixing frontend calls
   - Impact: Immediate improvement

### Dependencies and Side Effects

**Token Standardization Impact:**
- Authentication flows
- API calls across entire frontend
- localStorage management
- Session persistence

**Routing Change Impact:**
- Navigation components
- Breadcrumb trails
- Dashboard quick links
- User bookmarks

---

## Testing Checklist

### After Token Fixes
- [ ] Login flow works correctly
- [ ] Token persists after page reload
- [ ] All API calls include correct Authorization header
- [ ] BranchSelector loads branches without 404
- [ ] Products page loads without 400

### After API Endpoint Fixes
- [ ] GET /api/v1/branches returns branch list
- [ ] POST /api/v1/menu/products/paginated returns products
- [ ] No authentication required for public endpoints
- [ ] CompanyId filtering works correctly

### After Routing Changes
- [ ] /menu redirects to /menu/list
- [ ] /menu/list displays menu list correctly
- [ ] Navigation from dashboard works
- [ ] Breadcrumbs show correct path
- [ ] No 404 errors on navigation

---

## Conclusion

All three issues stem from **inconsistent API integration patterns**:

1. **Mixed token storage keys** ('token' vs 'auth-token')
2. **Missing /api/v1 prefix** in some API calls
3. **Route confusion** between legacy and modern menu pages

**Priority Order:**
1. **CRITICAL**: Fix token key inconsistency (breaks all API calls)
2. **HIGH**: Fix BranchSelector endpoint path (user-facing error)
3. **HIGH**: Fix products API authentication (user-facing error)
4. **MEDIUM**: Resolve /menu routing conflict (UX improvement)

**Estimated Fix Time**: 2-3 hours for all issues
**Testing Time**: 1-2 hours for comprehensive validation

---

**Report Generated**: October 3, 2025
**Next Steps**: Proceed with Phase 1 (Token Standardization) immediately
