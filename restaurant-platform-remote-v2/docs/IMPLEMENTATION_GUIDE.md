# Platform Management System - Implementation Guide

## Overview

This guide provides step-by-step instructions to implement the comprehensive platform management system that addresses all identified issues with the restaurant management platform.

---

## 🔧 IMMEDIATE FIXES REQUIRED

### 1. Database Migration (CRITICAL - RUN FIRST)

```bash
# Navigate to backend directory
cd /home/admin/restaurant-platform-remote-v2/backend

# Run the platform management migration
psql -U postgres -d postgres -f prisma/migrations/001_add_platform_management.sql

# Verify tables were created
psql -U postgres -d postgres -c "\dt platform*"
```

### 2. Backend Module Integration

The platform management modules have been created and integrated:

✅ **Files Created:**
- `src/modules/platforms/platforms.module.ts`
- `src/modules/platforms/platforms.service.ts`
- `src/modules/platforms/platforms.controller.ts`

✅ **Integrations Updated:**
- `src/app.module.ts` - Added PlatformsModule
- `src/modules/menu/menu.controller.ts` - Added platform endpoints
- `src/modules/menu/menu.service.ts` - Added platform methods

### 3. Frontend Integration

✅ **Files Created:**
- `frontend/src/services/platformApi.ts` - API client
- `frontend/src/hooks/usePlatforms.ts` - React Query hooks

## 📋 STEP-BY-STEP IMPLEMENTATION

### Step 1: Database Setup

1. **Run Migration (CRITICAL)**
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/backend
   psql -U postgres -d postgres -f prisma/migrations/001_add_platform_management.sql
   ```

2. **Verify Database Changes**
   ```sql
   -- Check if platform tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name LIKE 'platform%';

   -- Verify default platforms were created
   SELECT * FROM platforms LIMIT 5;
   ```

### Step 2: Backend Service Restart

1. **Restart Backend Service**
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/backend
   npm run dev
   ```

2. **Test Platform Endpoints**
   ```bash
   # Test platform listing (replace with actual auth token)
   curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
        http://localhost:3001/platforms

   # Test menu platforms endpoint
   curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
        http://localhost:3001/menu/platforms
   ```

### Step 3: Frontend Updates

1. **Update Frontend Dependencies** (if needed)
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/frontend
   npm install @tanstack/react-query
   ```

2. **Update Menu Products Page**

   The current `/menu/products` page needs to be updated to use the new platform system. Key changes needed:

   ```typescript
   // In pages/menu/products.tsx - Update platform loading
   const loadPlatforms = useCallback(async () => {
     if (!user || !isAuthenticated) return;

     try {
       setPlatformsLoading(true);
       const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/platforms`, {
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
         }
       });

       if (response.ok) {
         const data = await response.json();
         setPlatforms(data.platforms || []);
       } else {
         console.error('Platforms API failed:', response.status);
       }
     } catch (error) {
       console.error('Failed to load platforms:', error);
     } finally {
       setPlatformsLoading(false);
     }
   }, [user, isAuthenticated]);
   ```

### Step 4: Fix Menu Products 404 Issue

The main issue with the menu products page is authentication context problems. Here's the fix:

1. **Update AuthContext** (if needed)
   ```typescript
   // Ensure AuthContext properly handles company-based data
   // The context should expose user.companyId for proper data filtering
   ```

2. **Update API Calls**
   ```typescript
   // In menu/products.tsx loadFilterData function
   const loadFilterData = async () => {
     if (!user || !isAuthenticated) {
       console.log('Skipping loadFilterData - user not authenticated');
       return;
     }

     try {
       const authToken = localStorage.getItem('auth-token');
       if (!authToken) {
         console.error('No auth token found');
         return;
       }

       const [categoriesRes, platformsRes] = await Promise.all([
         fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/categories`, {
           headers: { 'Authorization': `Bearer ${authToken}` }
         }),
         fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/platforms`, {
           headers: { 'Authorization': `Bearer ${authToken}` }
         })
       ]);

       if (categoriesRes.ok) {
         const categoriesData = await categoriesRes.json();
         setCategories(categoriesData.categories || []);
       }

       if (platformsRes.ok) {
         const platformsData = await platformsRes.json();
         setPlatforms(platformsData.platforms || []);
       }
     } catch (error) {
       console.error('Failed to load filter data:', error);
     }
   };
   ```

### Step 5: Role-Based Access Control Verification

1. **Test Super Admin Access**
   ```javascript
   // Super admin should see all companies' data
   // Test with super_admin user login
   ```

2. **Test Company Owner Access**
   ```javascript
   // Company owner should only see their company's data
   // Test with company_owner user login
   ```

3. **Test Other Roles**
   ```javascript
   // branch_manager, call_center, cashier should have limited access
   // Test platform management permissions
   ```

---

## 🎯 CRITICAL FIXES FOR CURRENT ISSUES

### Issue 1: Menu Products 404 Error

**Root Cause:** Authentication context not properly providing user data for API calls.

**Fix:**
1. Ensure user object has `companyId` property
2. Verify API endpoints return proper data for user's company
3. Check that database has categories and products for the user's company

### Issue 2: Platform Management Buttons Not Functional

**Root Cause:** Missing backend platform management APIs.

**Fix:** ✅ **COMPLETED** - Created platform management system with proper APIs.

### Issue 3: Fake Product Counts

**Root Cause:** Frontend showing hardcoded counts instead of real data.

**Fix:** Update product grid to use real API data from platform-aware endpoints.

### Issue 4: Role-Based Access Not Working

**Root Cause:** Insufficient role checking in API endpoints.

**Fix:** ✅ **COMPLETED** - Implemented proper role-based access control in all platform APIs.

### Issue 5: Frontend-Backend Integration Broken

**Root Cause:** Missing API clients and React Query integration.

**Fix:** ✅ **COMPLETED** - Created comprehensive API client and React Query hooks.

---

## 🚀 TESTING CHECKLIST

### Backend Testing

- [ ] Platform CRUD operations work for different roles
- [ ] Product-platform assignments work correctly
- [ ] Role-based access control enforced
- [ ] Multi-tenant data isolation working
- [ ] API endpoints return correct data structure

### Frontend Testing

- [ ] Menu products page loads without 404 errors
- [ ] Categories display correctly
- [ ] Platform filters work
- [ ] Bulk product assignment works
- [ ] Role-based UI elements show/hide properly

### Integration Testing

- [ ] Real-time updates work
- [ ] Error handling displays proper messages
- [ ] Loading states work correctly
- [ ] Cache invalidation works
- [ ] Navigation between pages works

---

## 📊 PERFORMANCE MONITORING

### Database Performance

```sql
-- Monitor platform-related query performance
EXPLAIN ANALYZE SELECT * FROM platforms WHERE company_id = 'your-company-id';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename LIKE 'platform%';
```

### API Performance

```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/platforms
```

---

## 🔒 SECURITY VERIFICATION

### Role-Based Access

1. **Super Admin Test**
   - Can create/edit/delete platforms across all companies
   - Can view all company data
   - Can assign products across companies

2. **Company Owner Test**
   - Can manage only their company's platforms
   - Cannot see other companies' data
   - Can assign products within their company

3. **Other Roles Test**
   - Branch manager: Limited platform editing
   - Call center: View-only access
   - Cashier: Basic view access

### Data Isolation

1. **Multi-tenant Verification**
   ```sql
   -- Verify company data isolation
   SELECT DISTINCT company_id FROM platforms;
   SELECT DISTINCT company_id FROM product_platform_assignments;
   ```

2. **API Security Test**
   ```bash
   # Test cross-company access (should fail)
   curl -H "Authorization: Bearer COMPANY_A_TOKEN" \
        http://localhost:3001/platforms?companyId=COMPANY_B_ID
   ```

---

## 🛠 TROUBLESHOOTING

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database "postgres" exists

2. **Authentication Errors**
   - Verify JWT tokens are valid
   - Check token expiration
   - Ensure user has proper company assignment

3. **Platform Assignment Errors**
   - Verify products and platforms belong to same company
   - Check role permissions
   - Ensure database constraints are met

4. **Frontend API Errors**
   - Check CORS configuration
   - Verify API base URL in environment
   - Check network connectivity

### Debug Commands

```bash
# Check database connectivity
psql -U postgres -d postgres -c "SELECT NOW();"

# Check backend logs
cd /home/admin/restaurant-platform-remote-v2/backend
npm run dev 2>&1 | grep -i error

# Check frontend API calls
# Open browser DevTools > Network tab
# Filter by XHR requests to see API calls
```

---

## 📈 NEXT STEPS

### Immediate (Week 1)
1. Run database migration
2. Test backend API endpoints
3. Fix frontend authentication issues
4. Verify role-based access

### Short-term (Week 2-3)
1. Implement real-time WebSocket updates
2. Add platform analytics dashboard
3. Create platform management UI
4. Add bulk operations interface

### Long-term (Month 2-3)
1. Add external platform integrations
2. Implement advanced sync mechanisms
3. Add comprehensive monitoring
4. Performance optimization

---

## 🎉 SUCCESS CRITERIA

### ✅ Platform Management Working
- Users can create, edit, delete platforms
- Role-based permissions enforced
- Multi-tenant data isolation

### ✅ Product Assignment Working
- Bulk assignment/unassignment works
- Platform filtering functions
- Real-time updates visible

### ✅ Menu Products Fixed
- Page loads without 404 errors
- Categories display correctly
- Product counts are accurate
- Platform filters work

### ✅ Role-Based Access Working
- Super admin sees all data
- Company users see only their data
- Permissions enforced at API level

---

This implementation guide provides a complete roadmap to fix all identified issues and implement a scalable, enterprise-grade platform management system. Follow the steps in order, and test thoroughly at each stage.