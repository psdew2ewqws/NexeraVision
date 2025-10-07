# Delivery Settings & Integration Platform Access Guide
**Date:** October 1, 2025
**Status:** ✅ FIXED

---

## Issues Fixed

### 1. ✅ Hardcoded Location Count Removed
**Issue:** Tab showed "546+" hardcoded count
**Fix:** Removed static badge, count now comes from actual data
**File:** `/pages/settings/delivery.tsx` line 113

### 2. ✅ No Locations Showing
**Root Cause:** Database has 0 Jordan locations
**API Response:**
```json
{
  "locations": [],
  "total": 0,
  "pagination": {
    "limit": 0,
    "offset": 0,
    "hasMore": false
  }
}
```

**Solution:** Use "Add Location" button to create locations
**API Endpoint:** `POST /api/v1/delivery/jordan-locations`

---

## How to Access Integration Platform

### Integration Platform URLs:

1. **Main Dashboard:**
   ```
   http://localhost:3000/integration
   http://localhost:3000/integration/dashboard
   ```

2. **API Keys Management:**
   ```
   http://localhost:3000/integration/api-keys
   ```

3. **Webhooks:**
   ```
   http://localhost:3000/integration/webhooks
   ```

4. **Monitoring:**
   ```
   http://localhost:3000/integration/monitoring
   ```

5. **API Documentation:**
   ```
   http://localhost:3000/integration/docs
   ```

6. **API Playground:**
   ```
   http://localhost:3000/integration/playground
   ```

### Integration Platform Features:

✅ **API Key Management** - Generate and manage API keys for external integrations
✅ **Webhook Configuration** - Set up webhooks for real-time notifications
✅ **Integration Monitoring** - Track API usage and performance
✅ **API Documentation** - Complete API reference
✅ **API Playground** - Test API endpoints interactively

---

## Delivery Settings Features

### Tabs Available:

1. **Jordan Locations**
   - Manage all Jordan delivery locations
   - Assign locations to branches
   - Set delivery fees per location

2. **Delivery Providers**
   - Configure delivery service providers
   - Manage provider credentials
   - Multi-tenant provider setup

3. **Integration Readiness**
   - Check integration status
   - Validate configurations
   - System health checks

4. **Webhook Monitoring**
   - Monitor webhook deliveries
   - View webhook logs
   - Retry failed webhooks

5. **Failover Management**
   - Configure backup providers
   - Set failover rules
   - Automatic switching

6. **Statistics**
   - Delivery analytics
   - Performance metrics
   - Provider comparison

---

## How to Add Jordan Locations

### Method 1: Using the UI

1. Go to `http://localhost:3000/settings/delivery`
2. Click "Jordan Locations" tab
3. Click "+ Add Location" button
4. Fill in the form:
   - Area (English)
   - Area (Arabic)
   - City
   - Governorate
5. Click "Save"

### Method 2: Using the API

```bash
curl -X POST http://localhost:3001/api/v1/delivery/jordan-locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "area": "Abdoun",
    "areaNameAr": "عبدون",
    "city": "Amman",
    "governorate": "Amman",
    "deliveryDifficulty": 2
  }'
```

### Available Governorates:

- Amman (عمان)
- Irbid (اربد)
- Zarqa (الزرقاء)
- Aqaba (العقبة)
- Ma'an (معان)
- Tafilah (الطفيلة)
- Karak (الكرك)
- Madaba (مادبا)
- Jarash (جرش)
- Ajloun (عجلون)
- Balqa (السلط)
- Mafraq (المفرق)

---

## Integration Platform Setup

### Step 1: Access Integration Dashboard

```
http://localhost:3000/integration
```

### Step 2: Generate API Key

1. Go to **API Keys** tab
2. Click "+ Create API Key"
3. Set permissions (read, write, admin)
4. Copy the generated key (shown only once!)

### Step 3: Configure Webhooks

1. Go to **Webhooks** tab
2. Click "+ Add Webhook"
3. Enter webhook URL
4. Select events to subscribe to:
   - Order created
   - Order updated
   - Payment received
   - Delivery dispatched

### Step 4: Test Integration

1. Go to **API Playground**
2. Select endpoint to test
3. Enter parameters
4. Click "Send Request"
5. View response

---

## Navigation Menu Access

### Adding Integration to Main Menu:

The integration platform is already built. To add it to the main navigation:

**Option 1:** Add to Dashboard
- Add a card/link in the dashboard pointing to `/integration`

**Option 2:** Add to Sidebar
- Edit the sidebar navigation component
- Add "Integration Platform" menu item

**Example Navigation Item:**
```tsx
{
  name: 'Integration',
  icon: CodeBracketIcon,
  href: '/integration',
  roles: ['super_admin', 'company_owner']
}
```

---

## Database Schema

### Jordan Locations Table:

```sql
CREATE TABLE jordan_locations (
  id UUID PRIMARY KEY,
  area VARCHAR(255) NOT NULL,
  area_name_ar VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  governorate VARCHAR(100) NOT NULL,
  delivery_difficulty INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Location-Branch Assignment:

```sql
CREATE TABLE jordan_zone_assignments (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES jordan_locations(id),
  branch_id UUID REFERENCES branches(id),
  company_id UUID REFERENCES companies(id),
  delivery_fee DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Common Issues & Solutions

### Issue: "No locations showing"
**Solution:** Database is empty. Add locations using:
1. UI: Click "+ Add Location" button
2. API: POST to `/api/v1/delivery/jordan-locations`

### Issue: "Cannot assign location to branch"
**Cause:** No locations created yet
**Solution:** Create locations first, then assign

### Issue: "Integration platform 404"
**Cause:** Typo in URL
**Correct URL:** `http://localhost:3000/integration` (not `/integrations`)

### Issue: "API returns 401"
**Cause:** Missing or invalid auth token
**Solution:**
1. Login first
2. Include token in headers: `Authorization: Bearer YOUR_TOKEN`

---

## API Endpoints Reference

### Delivery Locations:

```
GET    /api/v1/delivery/jordan-locations          - List all locations
POST   /api/v1/delivery/jordan-locations          - Create location
GET    /api/v1/delivery/jordan-locations/:id      - Get location
PUT    /api/v1/delivery/jordan-locations/:id      - Update location
DELETE /api/v1/delivery/jordan-locations/:id      - Delete location
```

### Location Assignment:

```
POST   /api/v1/delivery/assign-location-to-branch - Assign location
POST   /api/v1/delivery/assign-locations-to-branch - Bulk assign
DELETE /api/v1/delivery/unassign-location-from-branch - Unassign
GET    /api/v1/delivery/locations-with-branches   - Get locations with assignments
```

### Integration Platform:

```
GET    /api/v1/integration/health                 - System health
POST   /api/v1/integration/api-keys               - Create API key
GET    /api/v1/integration/api-keys               - List API keys
DELETE /api/v1/integration/api-keys/:id           - Revoke API key
POST   /api/v1/integration/webhooks               - Create webhook
GET    /api/v1/integration/webhooks               - List webhooks
```

---

## Quick Start Guide

### 1. Set Up Delivery Locations (5 minutes)

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -d '{"email":"admin@example.com","password":"password"}'

# Add location
curl -X POST http://localhost:3001/api/v1/delivery/jordan-locations \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "area": "Downtown",
    "areaNameAr": "وسط البلد",
    "city": "Amman",
    "governorate": "Amman"
  }'
```

### 2. Access Integration Platform (1 minute)

```
Open browser: http://localhost:3000/integration
```

### 3. Create API Key (2 minutes)

1. Click "API Keys" tab
2. Click "+ Create API Key"
3. Name: "External Integration"
4. Permissions: Read & Write
5. Click "Generate"
6. **Copy the key immediately!**

### 4. Test Integration (3 minutes)

1. Click "API Playground" tab
2. Select "Get Menu Products"
3. Paste your API key
4. Click "Send Request"
5. View response

---

## Summary

### ✅ Fixed Issues:

1. **Hardcoded location count** - Removed from UI
2. **No locations showing** - Expected behavior (database empty)

### 🎯 Integration Platform Access:

- **Main URL:** `http://localhost:3000/integration`
- **Features:** API Keys, Webhooks, Monitoring, Docs, Playground

### 📝 Next Steps:

1. Add Jordan locations using "+ Add Location" button
2. Assign locations to branches
3. Set up delivery providers
4. Configure webhooks for real-time notifications
5. Generate API keys for external integrations

---

**Last Updated:** October 1, 2025
**Platform:** Restaurant Platform v2
**Status:** ✅ Production Ready

---

*For more information, see the Integration Platform README at `/pages/integration/README.md`*
