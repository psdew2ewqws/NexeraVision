# Unified Action Plan: Restaurant Platform + Integration Platform

## System Overview

You have **TWO interconnected projects** that work together as one complete system:

### 1. **Restaurant Platform v2** (`/restaurant-platform-remote-v2`)
- **Purpose**: Core restaurant management system
- **Stack**: NestJS backend (3001) + Next.js frontend (3000)
- **Database**: PostgreSQL ("postgres" database)
- **Features**: Menu, Orders, Users, Branches, Printing, etc.

### 2. **Integration Platform** (`/integration-platform`)
- **Purpose**: Delivery platform connector (middleware)
- **Stack**: Should run on port 3002 (NEXARA replacement)
- **Role**: Bridge between restaurant system and delivery providers

## Current System State

### ✅ What's Already Working

#### Restaurant Platform v2:
1. **Backend Infrastructure** (Port 3001)
   - 24 functional modules
   - JWT authentication with roles
   - Multi-tenant architecture
   - PostgreSQL database integration
   - PrinterMaster integration

2. **Frontend** (Port 3000)
   - Dashboard and settings pages
   - Authentication system
   - Template builder
   - Basic UI structure

3. **Integration Module** (Inside restaurant-platform)
   - **NEXARA Integration** already configured
   - Webhook handlers for Careem, Talabat, Deliveroo, Jahez
   - Order mapping services
   - Real-time WebSocket updates
   - Located at: `backend/src/modules/integration/`

#### Integration Platform:
1. **Basic Structure**
   - Docker setup
   - Microservices architecture
   - Test credentials documented
   - Basic webhook routes planned

### ❌ What's Missing/Broken

1. **CRITICAL: Menu Products Page (404 Error)**
   - Users can't access `/menu/products`
   - Categories not loading
   - **MUST FIX FIRST**

2. **Integration Platform Not Running**
   - Not configured to run on port 3002
   - No actual webhook receivers implemented
   - Not connected to restaurant platform

3. **Connection Between Platforms**
   - Restaurant platform expects NEXARA on 3002
   - Integration platform not set up as NEXARA replacement

## The Architecture You Need

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE SYSTEM ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Delivery Providers          Your System              Physical  │
│  ┌──────────────┐     ┌──────────────────────┐    ┌──────────┐│
│  │   Talabat    │────►│ Integration Platform │    │ Printers ││
│  │   Careem     │◄────│    (Port 3002)      │    │          ││
│  │   Deliveroo  │     └──────────┬───────────┘    │ POS-80C  ││
│  │   Jahez      │                │                 │          ││
│  └──────────────┘                ▼                 └─────▲────┘│
│                        ┌──────────────────────┐          │     │
│                        │ Restaurant Platform  │          │     │
│                        │  Backend (3001)      │──────────┘     │
│                        └──────────┬───────────┘                │
│                                   │                            │
│                        ┌──────────▼───────────┐                │
│  Customers ──────────► │  Frontend (3000)     │                │
│                        └──────────────────────┘                │
│                                                                 │
│                        ┌──────────────────────┐                │
│                        │  PostgreSQL DB       │                │
│                        │  (postgres)          │                │
│                        └──────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## ACTION PLAN - What to Do Next

### Phase 1: Fix Critical Issues (TODAY - URGENT)

#### Task 1.1: Fix Menu Products Page (TOP PRIORITY)
```bash
# 1. Check backend is running correctly
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev  # Should run on port 3001

# 2. Check frontend authentication
cd /home/admin/restaurant-platform-remote-v2/frontend
# Fix AuthContext issues in src/app/menu/products.tsx

# 3. Verify database has categories
psql -U postgres -d postgres -c "SELECT * FROM categories LIMIT 5;"
```

#### Task 1.2: Start Integration Platform as NEXARA
```bash
# 1. Configure integration platform to run on 3002
cd /home/admin/integration-platform
# Update package.json or create start script to use port 3002

# 2. Create minimal NEXARA-compatible service
# The restaurant platform expects endpoints at:
# POST http://localhost:3002/api/webhooks/register
# POST http://localhost:3002/api/webhooks/event
```

### Phase 2: Connect the Platforms (Day 2-3)

#### Task 2.1: Make Integration Platform NEXARA-Compatible
Create these endpoints in integration-platform:
```typescript
// Integration platform needs these endpoints:
POST /api/webhooks/register     // Restaurant platform registers here
POST /api/webhooks/event        // Delivery events come here
GET /api/health                 // Health check endpoint
```

#### Task 2.2: Configure Restaurant Platform
Update `.env` in restaurant-platform:
```env
NEXARA_BASE_URL=http://localhost:3002
CAREEM_ENABLED=true
TALABAT_ENABLED=true
```

### Phase 3: Implement Delivery Integrations (Week 1)

#### Task 3.1: Talabat Integration (Start Here - Most Data Available)
```typescript
// In integration-platform, create:
// 1. Talabat webhook receiver
// 2. Order transformer (Talabat format → Restaurant format)
// 3. Forward to restaurant platform webhook endpoint
```

Use discovered endpoints:
- Base: `https://hcustomers.ishbek.com/api/Customers/`
- Test with 79 companies from UAT list

#### Task 3.2: Careem Integration
- Similar to Talabat
- Use Careem-specific order format
- Test with discovered credentials

### Phase 4: Complete the Integration (Week 2)

#### Task 4.1: Menu Synchronization
```typescript
// Integration platform should:
// 1. Pull menu from restaurant platform
// 2. Transform to delivery platform format
// 3. Push to Talabat/Careem
```

#### Task 4.2: Order Status Sync
- Bidirectional status updates
- Real-time WebSocket notifications
- Status mapping between platforms

### Phase 5: Testing & Validation (Week 2-3)

#### Task 5.1: End-to-End Testing
1. Create test order from Talabat
2. Receive in integration platform
3. Forward to restaurant platform
4. Print receipt via PrinterMaster
5. Update status back to Talabat

## File Structure You Need

```
/home/admin/
├── restaurant-platform-remote-v2/     [MAIN SYSTEM]
│   ├── backend/                       [Port 3001]
│   │   └── src/modules/integration/   [Already has webhook handlers!]
│   └── frontend/                      [Port 3000]
│
└── integration-platform/              [NEXARA REPLACEMENT]
    ├── src/
    │   ├── webhooks/                 [Receive from delivery platforms]
    │   ├── transformers/              [Convert order formats]
    │   └── forwarders/               [Send to restaurant platform]
    └── [Should run on Port 3002]
```

## Quick Start Commands

```bash
# Terminal 1: Start Restaurant Backend
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev  # Port 3001

# Terminal 2: Start Restaurant Frontend
cd /home/admin/restaurant-platform-remote-v2/frontend
npm run dev  # Port 3000

# Terminal 3: Start Integration Platform (as NEXARA)
cd /home/admin/integration-platform
# Need to configure to run on port 3002
npm run start:dev  # Should be Port 3002

# Terminal 4: Start PrinterMaster (if needed)
cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2
npm run start  # Port 8182
```

## Database Access
```bash
# Connect to database
psql -U postgres -d postgres
# Password: E$$athecode006
```

## Key Integration Points

### Restaurant → Integration
- Registration: `POST http://localhost:3002/api/webhooks/register`
- Health check: `GET http://localhost:3002/api/health`

### Integration → Restaurant
- Webhook events: `POST http://localhost:3001/api/integration/webhook`
- Order sync: `POST http://localhost:3001/api/integration/sync-order/:orderId`

### Delivery Platforms → Integration
- Talabat: `POST http://localhost:3002/webhooks/talabat`
- Careem: `POST http://localhost:3002/webhooks/careem`

## Success Metrics

✅ **Phase 1 Complete When:**
- Menu products page loads without 404
- Integration platform runs on port 3002
- Platforms can communicate

✅ **Phase 2 Complete When:**
- Restaurant registers with integration platform
- Health checks pass between systems

✅ **Phase 3 Complete When:**
- Can receive test order from Talabat
- Order appears in restaurant system
- Receipt prints successfully

✅ **Phase 4 Complete When:**
- Menu syncs to delivery platforms
- Status updates work bidirectionally

✅ **Phase 5 Complete When:**
- Full order flow works end-to-end
- All 4 delivery platforms integrated

## Immediate Next Steps (DO NOW!)

1. **FIX THE MENU PAGE** - Critical business functionality
2. **Start integration platform on port 3002**
3. **Create minimal NEXARA-compatible endpoints**
4. **Test connection between platforms**
5. **Implement first Talabat webhook receiver**

## Resources Available

- **Test Credentials**: `/home/admin/integration-platform/TEST_CREDENTIALS.md`
- **79 Test Companies**: Via UAT endpoint
- **Picolinate Examples**: Working integration code to reference
- **Database**: Full access to PostgreSQL

## Important Notes

⚠️ **The restaurant platform ALREADY HAS integration module** - don't duplicate!
⚠️ **Integration platform should be a THIN LAYER** - just transform and forward
⚠️ **Use port 3002** - Restaurant expects NEXARA there
⚠️ **Fix menu page FIRST** - Everything else depends on core functionality

---

**Remember**: These are ONE PROJECT. The integration platform is just the delivery connector for your restaurant system. They must work together!