# Restaurant Integration Platform

## Overview
Centralized integration platform for managing connections between the restaurant platform and various delivery services (Talabat, Careem, Deliveroo, etc.).

## Architecture

### Core Services
1. **Webhook Service** - Receives and processes incoming webhooks from delivery platforms
2. **Order Management** - Unified order processing and status synchronization
3. **Menu Sync Service** - Manages menu updates across platforms
4. **Notification Service** - Handles platform notifications and alerts

### Supported Platforms
- ✅ Talabat
- ✅ Careem
- 🔄 Deliveroo (planned)
- 🔄 Uber Eats (planned)
- 🔄 HungerStation (planned)
- 🔄 Jahez (planned)

## Project Structure
```
integration-platform/
├── src/
│   ├── adapters/           # Platform-specific adapters
│   │   ├── talabat/
│   │   ├── careem/
│   │   └── common/
│   ├── webhooks/           # Webhook handlers
│   ├── services/           # Core business logic
│   ├── models/            # Data models
│   └── utils/             # Utilities
├── config/                # Configuration files
├── tests/                 # Test files
└── docs/                  # Documentation
```

## Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/integration_db

# Platform Credentials
TALABAT_API_KEY=
TALABAT_BASE_URL=

CAREEM_API_KEY=
CAREEM_BASE_URL=

# Webhook URLs
WEBHOOK_BASE_URL=http://localhost:3000/webhooks
```

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Run migrations:
```bash
npm run migrate
```

4. Start the service:
```bash
npm run dev
```

## API Endpoints

### Webhooks
- `POST /webhooks/talabat` - Talabat webhook receiver
- `POST /webhooks/careem` - Careem webhook receiver
- `POST /webhooks/generic` - Generic webhook handler

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/:platform/:orderId` - Get specific order
- `PUT /api/orders/:id/status` - Update order status

### Menu
- `POST /api/menu/sync` - Trigger menu synchronization
- `GET /api/menu/status` - Check sync status

## Testing

Run tests:
```bash
npm test
```

## Documentation
See `/docs` folder for detailed platform-specific integration guides.