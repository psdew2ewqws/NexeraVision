# Unified Operations Dashboard

## Overview

The Unified Operations Dashboard is a comprehensive real-time management interface that integrates the Restaurant Platform with NEXARA for complete operational visibility. It provides restaurant managers with a single view of their operations across all delivery platforms and internal systems.

## Architecture

### Core Components

```
pages/dashboard/unified.tsx          # Main dashboard page
├── components/dashboard/
│   ├── IntegrationStatus.tsx       # NEXARA connection health
│   ├── ProviderMetrics.tsx         # Delivery provider performance
│   ├── OrderStream.tsx             # Real-time order feed
│   ├── RevenueChart.tsx            # Financial performance charts
│   ├── AlertsPanel.tsx             # System alerts and notifications
│   └── QuickActions.tsx            # Common operation shortcuts
├── hooks/
│   ├── useIntegrationData.ts       # Cross-platform integration data
│   └── useDashboardMetrics.ts      # Restaurant metrics aggregation
├── services/
│   └── websocketService.ts         # WebSocket connections manager
└── shared/
    ├── ErrorBoundary.tsx           # Error handling component
    └── LoadingSpinner.tsx          # Loading states and skeletons
```

### Integration Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Unified Dashboard  │◄──►│ Restaurant Platform │◄──►│      NEXARA         │
│    (Port 3000)      │    │    (Port 3001)      │    │    (Port 3002)      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         │                           │                           │
         └─────────── WebSocket Connections ─────────────────────┘
                     (Real-time data sync)
```

## Key Features

### 1. Real-time Order Stream
- **Live order updates** from all delivery platforms
- **Provider badges** (Careem, Talabat, Deliveroo, Jahez)
- **Status tracking** (pending, confirmed, preparing, ready, delivered)
- **Priority indicators** (normal, high, urgent)
- **Filtering** by status, source, and branch

### 2. Integration Health Monitor
- **NEXARA connection status** with port and webhook monitoring
- **Restaurant backend** connectivity tracking
- **Service health scores** with uptime metrics
- **Automatic reconnection** and retry mechanisms
- **Health score calculation** based on all integrations

### 3. Provider Performance Metrics
- **Delivery provider cards** with key performance indicators
- **Today's orders and revenue** per provider
- **Average delivery times** and success rates
- **Trend indicators** (up/down/stable)
- **Error tracking** and webhook status monitoring

### 4. Revenue Analytics
- **Interactive charts** showing hourly revenue and order patterns
- **Performance metrics** with percentage changes
- **Peak hour identification** for operational planning
- **Average order value** tracking and trends

### 5. System Alerts
- **Real-time notifications** for system issues
- **Integration problems** (connection losses, webhook failures)
- **Operational alerts** (high pending orders, revenue drops)
- **Hardware issues** (printer offline, payment gateway slow)
- **Categorized alerts** with priority levels and actions

### 6. Quick Actions
- **Role-based action buttons** for common operations
- **Pending order management** with live counters
- **Menu management** shortcuts
- **Printing and reporting** tools
- **System status indicators**

## Technical Implementation

### Data Integration

#### Restaurant Platform (Port 3001)
```typescript
// Fetches order metrics, revenue data, performance analytics
const restaurantData = await fetch(`${RESTAURANT_API_URL}/analytics/dashboard`)

// WebSocket for real-time updates
const wsRestaurant = new WebSocket(`ws://localhost:3001/ws/dashboard?token=${token}`)
```

#### NEXARA Platform (Port 3002)
```typescript
// Fetches integration status, provider stats, webhook health
const nexaraData = await fetch(`${NEXARA_API_URL}/health`)

// WebSocket for integration updates
const wsNexara = new WebSocket(`ws://localhost:3002/ws/integration`)
```

### Real-time Updates

The dashboard maintains live connections to both platforms:

1. **Order Updates**: New orders, status changes, completions
2. **Metrics Updates**: Revenue changes, performance indicators
3. **Integration Updates**: Connection status, webhook events
4. **System Alerts**: Error conditions, health changes

### Error Handling

```typescript
// Component-level error boundaries
<ErrorBoundary level="component">
  <IntegrationStatus />
</ErrorBoundary>

// Page-level error boundaries
<ErrorBoundary level="page">
  <UnifiedDashboard />
</ErrorBoundary>
```

### Responsive Design

- **Mobile-first approach** with progressive enhancement
- **Adaptive layouts** for tablets and desktop
- **Touch-friendly interactions** on mobile devices
- **Optimized data loading** for slower connections

## User Roles and Permissions

### Super Admin
- Full access to all features
- Company management capabilities
- System configuration access
- Cross-company analytics

### Company Owner
- Company-wide dashboard view
- All provider metrics
- Financial analytics
- User management within company

### Branch Manager
- Branch-specific metrics
- Local order management
- Staff operations
- Limited provider access

### Call Center / Cashier
- Order entry and management
- Basic metrics viewing
- Quick actions only
- No system configuration

## Performance Considerations

### Data Loading
- **Parallel API calls** to both platforms
- **WebSocket connections** for real-time updates
- **Automatic retry** with exponential backoff
- **Caching strategies** for frequently accessed data

### Client-side Optimization
- **React.memo** for expensive components
- **useMemo** for calculated values
- **useCallback** for event handlers
- **Virtualization** for large data sets

### Network Efficiency
- **Compressed data payloads**
- **Delta updates** via WebSocket
- **Intelligent polling** with adaptive intervals
- **Offline handling** with graceful degradation

## Monitoring and Alerting

### Health Metrics
- **Integration uptime** tracking
- **Response time** monitoring
- **Error rate** calculation
- **User experience** metrics

### Alert Categories
1. **Critical**: System down, data loss
2. **High**: Integration failures, payment issues
3. **Medium**: Performance degradation, warnings
4. **Low**: Informational, maintenance notifications

### Error Logging
- **Client-side error tracking**
- **Performance monitoring**
- **User interaction analytics**
- **Integration failure logs**

## Deployment and Configuration

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_NEXARA_API_URL=http://localhost:3002/api
NEXT_PUBLIC_WS_ENABLED=true
NEXT_PUBLIC_AUTO_REFRESH_INTERVAL=30000
```

### Build Configuration
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start -p 3000",
    "dev": "next dev -p 3000"
  }
}
```

### Production Checklist
- [ ] Error boundaries implemented
- [ ] WebSocket reconnection logic tested
- [ ] Mobile responsiveness verified
- [ ] Performance metrics within targets
- [ ] Integration failover tested
- [ ] User role restrictions verified

## Future Enhancements

### Planned Features
1. **Advanced Analytics**: Custom date ranges, export capabilities
2. **Mobile App**: Native mobile application
3. **Voice Commands**: Voice-controlled order management
4. **AI Insights**: Predictive analytics and recommendations
5. **Multi-language**: Full localization support

### Technical Improvements
1. **Micro-frontends**: Modular component architecture
2. **Service Workers**: Offline functionality
3. **GraphQL**: Unified data layer
4. **Real-time Collaboration**: Multi-user synchronization

## Support and Maintenance

### Troubleshooting
- Check browser console for errors
- Verify WebSocket connections in Network tab
- Test API endpoints manually
- Review error boundary logs in localStorage

### Common Issues
1. **WebSocket Connection Failures**: Check firewall settings
2. **Data Loading Errors**: Verify backend service status
3. **Performance Issues**: Check network latency
4. **Authentication Problems**: Verify JWT token validity

### Contact Information
- **Technical Support**: support@restaurant-platform.com
- **Documentation**: [Internal Wiki Link]
- **Bug Reports**: [Issue Tracker Link]