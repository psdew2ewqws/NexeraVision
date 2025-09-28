# Restaurant Platform with NEXARA Integration

A comprehensive restaurant management system with integrated delivery platform connectivity through NEXARA middleware.

## 🏗️ Architecture Overview

This project consists of two main components working together:

### 1. Restaurant Platform v2 (`/restaurant-platform-remote-v2`)
- **Backend**: NestJS API (Port 3001) - Core restaurant management
- **Frontend**: Next.js Application (Port 3000) - Restaurant dashboard
- **Database**: PostgreSQL - Data persistence
- **Features**: Menu management, order processing, multi-tenant support, role-based access

### 2. NEXARA Integration Platform (`/integration-platform`)
- **Backend**: Express + Socket.IO (Port 3002) - Delivery platform middleware
- **Frontend**: Next.js Dashboard (Port 3003) - Integration monitoring
- **Purpose**: Bridge between restaurant system and delivery providers (Talabat, Careem, Deliveroo, Jahez)

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Install dependencies for all services:
```bash
# Restaurant Platform Backend
cd restaurant-platform-remote-v2/backend
npm install

# Restaurant Platform Frontend
cd ../frontend
npm install

# NEXARA Integration Backend
cd ../../integration-platform
npm install

# NEXARA Dashboard Frontend
cd frontend
npm install
```

3. Set up environment variables:
```bash
# Copy example env files and configure
cp integration-platform/.env.example integration-platform/.env
# Edit with your database credentials
```

4. Set up the database:
```bash
# Database name: postgres
# Password: Configure in .env files
```

### Running the Services

Start all services in separate terminals:

```bash
# Terminal 1: Restaurant Backend
cd restaurant-platform-remote-v2/backend
npm run start:dev  # Port 3001

# Terminal 2: Restaurant Frontend
cd restaurant-platform-remote-v2/frontend
npm run dev  # Port 3000

# Terminal 3: NEXARA Integration
cd integration-platform
node start-nexara.js  # Port 3002

# Terminal 4: NEXARA Dashboard
cd integration-platform/frontend
PORT=3003 npm run dev  # Port 3003
```

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE SYSTEM VIEW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ Restaurant       │         │ NEXARA           │            │
│  │ Frontend         │         │ Dashboard        │            │
│  │ localhost:3000   │         │ localhost:3003   │            │
│  └────────┬─────────┘         └────────┬─────────┘            │
│           │                             │                      │
│           ▼                             ▼                      │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ Restaurant       │◄───────►│ NEXARA           │            │
│  │ Backend API      │         │ Backend Service  │            │
│  │ localhost:3001   │         │ localhost:3002   │            │
│  └──────────────────┘         └──────────────────┘            │
│           │                             ▲                      │
│           │                             │                      │
│           ▼                             │                      │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ PostgreSQL       │         │ Delivery         │            │
│  │ Database         │         │ Platforms        │            │
│  └──────────────────┘         └──────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔌 Integration Flow

1. **Delivery Platform** sends webhook to NEXARA (Port 3002)
2. **NEXARA** transforms order format to restaurant standard
3. **NEXARA** forwards to Restaurant Backend (Port 3001)
4. **Restaurant Backend** processes and stores order
5. **Restaurant Frontend** displays real-time updates
6. **NEXARA Dashboard** monitors entire flow

## 📝 Features

### Restaurant Platform
- ✅ Multi-tenant architecture
- ✅ Role-based access control (Super Admin, Company Owner, Branch Manager, etc.)
- ✅ Menu and product management
- ✅ Order processing system
- ✅ Branch management
- ✅ Real-time updates via WebSocket

### NEXARA Integration
- ✅ Webhook receivers for multiple delivery platforms
- ✅ Order transformation and mapping
- ✅ Circuit breaker pattern for resilience
- ✅ Real-time monitoring dashboard
- ✅ Profile and settings management
- ✅ API key management
- ✅ Activity tracking and logging

## 🧪 Testing

### Test Talabat Integration
```bash
curl -X POST http://localhost:3002/api/webhooks/talabat \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST_001",
    "customer": {"name": "Test Customer"},
    "items": [{"name": "Burger", "quantity": 1, "price": 10}]
  }'
```

### Check Service Health
```bash
# Restaurant Backend
curl http://localhost:3001/api/v1/health

# NEXARA Integration
curl http://localhost:3002/api/health
```

## 📚 Documentation

- [Unified Action Plan](./UNIFIED_ACTION_PLAN.md)
- [Implementation Summary](./IMPLEMENTATION_SUCCESS_SUMMARY.md)
- [Services Status](./SERVICES_STATUS.md)
- [NEXARA Service Documentation](./integration-platform/NEXARA_SERVICE_README.md)
- [Test Credentials](./integration-platform/TEST_CREDENTIALS.md)

## 🔐 Security

- JWT authentication for all API endpoints
- Role-based access control
- Input validation and sanitization
- Circuit breaker pattern for external services
- Environment-based configuration

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs.

## 📄 License

[Your License Here]

## 🆘 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ for modern restaurant operations**