# Unified Operations Center

## Overview

The Unified Operations Center is a comprehensive real-time dashboard that combines data from both the Restaurant Platform and NEXARA Integration Platform. It provides restaurant operators with a single interface to monitor orders, track performance, manage alerts, execute quick actions, and oversee provider integrations.

## Features

### 🎛️ Multi-Panel Layout
- Customizable widget arrangement with drag-and-drop functionality
- Responsive grid layout that adapts to different screen sizes
- Widget size options: small, medium, large, and full-width
- Persistent widget configuration saved to localStorage

### 📊 Real-Time Order Tracking
- Live order status updates across all delivery providers
- Priority-based order sorting with urgency indicators
- Advanced filtering by status, provider, and time range
- Order progress visualization with completion percentage
- Detailed order modal with customer and payment information

### 📈 Branch Performance Monitoring
- Real-time branch metrics and KPIs
- Performance indicators with color-coded thresholds
- Revenue, order count, and delivery time tracking
- Trend analysis with period-over-period comparisons
- Top provider performance rankings

### 🚨 Centralized Alert Management
- Real-time alert system with browser notifications
- Alert categorization by type (info, warning, error, success)
- Source-based filtering (orders, providers, system, printers, menu)
- Auto-mark read functionality with configurable delays
- Bulk alert management operations

### ⚡ Quick Actions Panel
- Role-based action shortcuts with permission control
- Category-filtered actions (orders, menu, system, reports, settings)
- One-click operations with loading states and feedback
- Integration with external systems and APIs
- Emergency contact and support actions

### 🔌 Provider Integration Status
- Real-time provider connection monitoring
- Configuration status validation and health checks
- Performance metrics and success rate tracking
- Provider testing and synchronization tools
- Issue tracking with detailed error reporting

## Architecture

### Component Structure
```
frontend/src/features/operations/
├── components/
│   ├── OrderTrackingGrid.tsx      # Live order monitoring
│   ├── BranchPerformanceCard.tsx  # Performance metrics
│   ├── AlertCenter.tsx            # Alert management
│   ├── QuickActions.tsx           # Action shortcuts
│   └── ProviderIntegrationPanel.tsx # Provider status
├── contexts/
│   └── OperationsContext.tsx      # Global state management
├── hooks/
│   ├── useOperationsWebSocket.ts  # Real-time connections
│   ├── useOrderTracking.ts        # Order state management
│   └── useAlerts.ts               # Alert system
└── README.md
```

### State Management
- **OperationsContext**: Centralized state using React Context + useReducer
- **Real-time Updates**: WebSocket connections with automatic reconnection
- **Local Persistence**: Widget configurations saved to localStorage
- **Optimistic Updates**: Immediate UI feedback for user actions

### Real-Time Features
- **WebSocket Integration**: Live updates from backend services
- **Auto-Reconnection**: Exponential backoff retry logic
- **Heartbeat Monitoring**: Connection health checks every 30 seconds
- **Message Filtering**: Role-based message filtering for security

## API Integration

### Backend Endpoints
```typescript
// Order Management
GET  /api/v1/delivery/orders              # Fetch orders with filters
GET  /api/v1/delivery/orders/stats        # Order statistics
PATCH /api/v1/delivery/orders/:id/status  # Update order status
POST /api/v1/delivery/refresh-orders      # Manual refresh

// Analytics
GET  /api/v1/analytics/branch-performance # Branch metrics
GET  /api/v1/reports/daily-summary        # Generate reports

// Provider Integration
GET  /api/v1/integrations/provider-status # Provider health
POST /api/v1/integrations/test-connection # Test connectivity
POST /api/v1/integrations/sync-provider   # Sync provider data

// System Operations
POST /api/v1/printing/print-test          # Test printing
POST /api/v1/menu/sync-providers          # Menu synchronization
```

### WebSocket Events
```typescript
// Incoming Events
order_update        # Order status changes
provider_status     # Provider connectivity updates
alert               # System alerts and notifications
metrics_update      # Real-time performance metrics
system_notification # System-wide messages

// Outgoing Events
ping                # Heartbeat ping
subscribe           # Channel subscriptions
```

## Usage

### Basic Setup
```tsx
import { OperationsProvider } from './contexts/OperationsContext';
import OperationsCenterPage from './pages/operations/center';

function App() {
  return (
    <OperationsProvider>
      <OperationsCenterPage />
    </OperationsProvider>
  );
}
```

### Custom Widget Implementation
```tsx
import { useOperations } from './contexts/OperationsContext';

function CustomWidget({ branchId, companyId, size }) {
  const { addAlert, updateMetrics } = useOperations();

  // Widget implementation
  return <div>Custom Widget Content</div>;
}
```

### Real-Time Hook Usage
```tsx
import { useOperationsWebSocket } from './hooks/useOperationsWebSocket';

function MyComponent() {
  const { isConnected, sendMessage } = useOperationsWebSocket({
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  });

  // Component logic
}
```

## Configuration

### Widget Customization
- **Drag-and-Drop**: Reorder widgets by dragging in configuration mode
- **Size Control**: Choose from 4 size options per widget
- **Visibility Toggle**: Show/hide widgets based on role requirements
- **Reset Options**: Restore default widget layout

### Alert Configuration
```typescript
interface AlertConfig {
  autoMarkReadDelay: number;    // Auto-mark delay (ms)
  maxDisplayAlerts: number;     // Maximum visible alerts
  enableNotifications: boolean; // Browser notifications
  groupBySource: boolean;       // Group alerts by source
}
```

### Real-Time Settings
```typescript
interface WebSocketConfig {
  autoConnect: boolean;         // Auto-connect on mount
  reconnectInterval: number;    // Reconnection delay (ms)
  maxReconnectAttempts: number; // Max retry attempts
  heartbeatInterval: number;    // Ping interval (ms)
}
```

## Security

### Role-Based Access Control
- **Super Admin**: Full access to all widgets and data
- **Company Owner**: Company-level data access
- **Branch Manager**: Branch-specific data access
- **Call Center/Cashier**: Limited order management access

### Data Filtering
- Automatic filtering based on user role and permissions
- Branch-level isolation for multi-tenant security
- Company-level data separation

### WebSocket Security
- JWT token authentication for WebSocket connections
- Role-based channel subscriptions
- Message filtering by user permissions

## Performance Optimizations

### React Query Integration
- Intelligent caching with stale-while-revalidate strategy
- Background refetching for real-time data freshness
- Optimistic updates for immediate user feedback

### Virtual Scrolling
- Large dataset handling in order grids
- Memory-efficient rendering for thousands of orders
- Smooth scrolling performance

### Bundle Optimization
- Lazy loading for widget components
- Code splitting by feature modules
- Tree shaking for unused dependencies

## Browser Support

### Requirements
- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **WebSocket Support**: Required for real-time features
- **LocalStorage**: Required for widget persistence
- **Notifications API**: Optional for browser alerts

### Progressive Enhancement
- Graceful degradation when WebSocket unavailable
- Fallback polling for real-time updates
- Offline-first approach with service worker integration

## Development

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access operations center
http://localhost:3000/operations/center
```

### Testing
```bash
# Run component tests
npm run test:components

# Run integration tests
npm run test:integration

# Run WebSocket tests
npm run test:websocket
```

### Build and Deployment
```bash
# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Troubleshooting

### Common Issues

**WebSocket Connection Fails**
- Check backend WebSocket server status
- Verify authentication token validity
- Ensure proper CORS configuration

**Widgets Not Loading**
- Clear localStorage widget configuration
- Check user role permissions
- Verify API endpoint accessibility

**Real-Time Updates Not Working**
- Check WebSocket connection status
- Verify channel subscriptions
- Monitor browser network tab for errors

**Performance Issues**
- Enable React DevTools Profiler
- Check for memory leaks in components
- Monitor bundle size and loading times

### Debug Tools
- WebSocket connection status indicator
- Alert system for connection issues
- Performance metrics in development mode
- Network request monitoring

## Future Enhancements

### Planned Features
- **Offline Support**: Service worker integration for offline operations
- **Mobile App**: React Native version for mobile management
- **AI Insights**: Machine learning predictions for order patterns
- **Advanced Analytics**: Custom dashboard builder
- **Multi-Language**: Internationalization support

### API Improvements
- **GraphQL Integration**: More efficient data fetching
- **Subscription System**: Server-sent events for real-time updates
- **Batch Operations**: Bulk order management APIs
- **Webhook System**: Third-party integration webhooks

## Support

### Documentation
- [API Documentation](../../../docs/api.md)
- [Component Guide](../../../docs/components.md)
- [Deployment Guide](../../../docs/deployment.md)

### Contact
- **Technical Support**: tech-support@restaurant-platform.com
- **Bug Reports**: GitHub Issues
- **Feature Requests**: Product Roadmap

---

*Last Updated: September 2025*
*Version: 1.0.0*