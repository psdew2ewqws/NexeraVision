# Integration Platform Frontend - Setup and Integration Guide

## Overview

This comprehensive Platform Management Interface provides a complete solution for managing delivery provider integrations similar to integration.ishbek.com/Management/.

## Key Features Implemented

### 1. Enhanced Dashboard Page (`/dashboard.tsx`)
- Overview of all 9 delivery providers with real-time status
- System health monitoring with alerts
- Real-time metrics and provider performance cards
- Quick actions and tabbed interface for different views
- WebSocket integration for live updates

### 2. Providers Management Page (`/providers/index.tsx`)
- Comprehensive management of all 9 delivery providers
- Provider cards with individual status and controls
- Configuration modal for each provider
- Testing capabilities and connection validation
- Grid and list view with analytics integration

### 3. Advanced Orders Management (`/orders/index.tsx`)
- Advanced filtering by status, provider, date range
- Detailed order modal with customer info, items, and timeline
- Export functionality (CSV, Excel, JSON)
- Bulk operations and status updates
- Real-time order status updates via WebSocket

### 4. Integration Settings Page (`/settings/integrations.tsx`)
- Production credentials management (Teta Raheeba)
- Global webhook configuration
- API credentials with security features
- Comprehensive testing suite
- Provider-specific configuration tabs

### 5. Analytics Dashboard (`/analytics/index.tsx`)
- Performance metrics and charts across all providers
- Provider comparison and trending data
- KPI cards with growth indicators
- Insights and recommendations
- Comprehensive reporting capabilities

## Component Architecture

### Core Components

```
src/components/
├── providers/
│   ├── ProviderCard.tsx          # Individual provider status card
│   ├── ProviderConfigModal.tsx   # Configuration modal
│   └── MetricsChart.tsx          # Comprehensive charts
├── shared/
│   ├── ConnectionStatus.tsx      # WebSocket status indicator
│   └── LicenseWarningHeader.tsx  # License status
└── ui/                           # Shadcn/ui components
```

### Contexts and Hooks

```
src/
├── contexts/
│   └── WebSocketContext.tsx     # WebSocket provider
├── hooks/
│   └── useWebSocket.ts          # WebSocket hook
└── types/
    └── index.ts                 # Enhanced TypeScript types
```

## WebSocket Integration

### Real-time Features
- Order status updates with notifications
- Provider connection monitoring
- System health alerts
- Performance metrics updates
- Webhook notifications

### Usage Example

```tsx
import { useWebSocketContext } from '@/contexts/WebSocketContext';

export function MyComponent() {
  const {
    isConnected,
    subscribeToOrders,
    subscribeToProvider
  } = useWebSocketContext();

  useEffect(() => {
    if (isConnected) {
      subscribeToOrders({ status: 'pending' });
      subscribeToProvider('careem');
    }
  }, [isConnected]);

  return (
    <div>
      <ConnectionStatus />
      {/* Your component content */}
    </div>
  );
}
```

## 9 Delivery Providers Supported

1. **Careem Now** 🚗 (UAE, KSA, Qatar)
2. **Talabat** 🍽️ (Kuwait, UAE, Oman, Bahrain, Qatar, Jordan, Egypt)
3. **Deliveroo** 🦌 (UAE, Kuwait)
4. **Uber Eats** 🚚 (UAE, KSA, Egypt, Lebanon)
5. **Jahez** 🥘 (Saudi Arabia)
6. **HungerStation** 🍕 (Saudi Arabia, Kuwait, Bahrain)
7. **Noon Food** 🌙 (UAE, KSA)
8. **Mrsool** 🛵 (Saudi Arabia)
9. **Zomato** 🍴 (UAE, Qatar)

## Setup Instructions

### 1. Install Dependencies

The project uses the following key dependencies (already in package.json):
- `@tanstack/react-query` for server state management
- `socket.io-client` for WebSocket connections
- `recharts` for analytics charts
- `react-hook-form` + `zod` for form validation
- `date-fns` for date manipulation
- `framer-motion` for animations

### 2. Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 3. Add WebSocket Provider

Update your `_app.tsx`:

```tsx
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <Component {...pageProps} />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
```

### 4. Add Connection Status

Update your layout to include the connection status:

```tsx
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';

export default function Layout({ children }) {
  return (
    <div>
      <header className="flex justify-between items-center">
        <h1>Integration Platform</h1>
        <ConnectionStatus />
      </header>
      <main>{children}</main>
    </div>
  );
}
```

## API Integration

### Required Backend Endpoints

The frontend expects these API endpoints:

```
GET /api/integrations                    # Get all provider integrations
GET /api/dashboard/stats                 # Dashboard statistics
GET /api/dashboard/provider-metrics      # Provider metrics
GET /api/dashboard/health               # System health
POST /api/integrations/:id/test         # Test provider connection
PUT /api/integrations/:id/config        # Update provider config
GET /api/orders                         # Get orders with filtering
POST /api/orders/export                 # Export orders
GET /api/analytics                      # Analytics data
POST /api/integrations/test-production  # Test production (Teta Raheeba)
```

### WebSocket Events

The WebSocket server should emit:
- `order_update` - Order status changes
- `provider_status` - Provider connection status
- `system_alert` - System alerts
- `metrics_update` - Performance metrics
- `webhook_received` - Webhook notifications

## Production Features

### Security
- Credential masking with show/hide toggle
- Copy to clipboard for API keys
- Production credential management for Teta Raheeba
- Webhook secret validation

### Performance
- React Query for caching and background updates
- Virtualized components for large datasets
- Optimistic updates for better UX
- Debounced search and filters

### UX/UI
- Professional, clean interface
- Responsive design for all screen sizes
- Real-time notifications and alerts
- Loading states and error handling
- Accessibility compliance

## Testing Features

### Provider Testing
- Connection testing for all providers
- Menu sync validation
- Webhook endpoint testing
- Production environment testing (Teta Raheeba)

### Export Functionality
- Multiple formats (CSV, Excel, JSON)
- Date range selection
- Column selection
- Filter preservation

This implementation provides a complete, production-ready platform management interface that matches the requirements and provides comprehensive delivery provider integration management.