# Monitoring Components

This directory contains React components for real-time monitoring of the NEXARA Integration Platform. All components are built with WebSocket integration for live updates and use Tailwind CSS for styling.

## Components

### WebhookEventStream
Real-time display of webhook events with filtering and controls.

**Features:**
- Live event stream with WebSocket integration
- Pause/resume functionality
- Event filtering by provider, status, and type
- Clear events functionality
- Auto-scroll with animation
- Connection status indicator

**Props:**
```typescript
interface WebhookEventStreamProps {
  maxEvents?: number; // Maximum events to display (default: 100)
  autoScroll?: boolean; // Auto-scroll to new events (default: true)
  filters?: {
    provider?: string;
    status?: string;
    type?: string;
  };
}
```

### MetricsChart
Interactive charts for system metrics using Recharts library.

**Features:**
- Multiple chart types (line, area, bar, pie)
- Real-time data updates
- Configurable time windows
- Responsive design
- Live indicators

**Props:**
```typescript
interface MetricsChartProps {
  type: 'line' | 'area' | 'bar' | 'pie';
  metric: 'responseTime' | 'successRate' | 'webhookCount' | 'status';
  title: string;
  height?: number; // Chart height in pixels (default: 300)
  timeWindow?: number; // Time window in minutes (default: 30)
  refreshInterval?: number; // Refresh interval in seconds (default: 5)
}
```

### HealthIndicator
System health monitoring with service status display.

**Features:**
- Overall system health status
- Individual service health checks
- System resource metrics
- Real-time status updates
- Color-coded health indicators

**Props:**
```typescript
interface HealthIndicatorProps {
  showDetails?: boolean; // Show detailed service status (default: true)
  refreshInterval?: number; // Refresh interval in seconds (default: 30)
  services?: string[]; // Services to monitor
}
```

### AlertsPanel
Alert management with filtering and resolution capabilities.

**Features:**
- Real-time alert notifications
- Alert filtering by level and provider
- Mark alerts as resolved
- Auto-resolve old alerts
- Alert level prioritization
- Dismiss alerts functionality

**Props:**
```typescript
interface AlertsPanelProps {
  maxAlerts?: number; // Maximum alerts to display (default: 50)
  autoResolve?: boolean; // Auto-resolve old alerts (default: true)
  showFilters?: boolean; // Show filter controls (default: true)
  defaultFilters?: {
    level?: 'info' | 'warning' | 'error' | 'critical';
    resolved?: boolean;
    provider?: string;
  };
}
```

### ProviderStatus
Monitor external provider connections and performance metrics.

**Features:**
- Real-time connection status
- Provider performance metrics
- Connection testing
- Response time monitoring
- Error count tracking

**Props:**
```typescript
interface ProviderStatusProps {
  providers?: string[]; // Providers to monitor
  refreshInterval?: number; // Refresh interval in seconds (default: 10)
  showMetrics?: boolean; // Show performance metrics (default: true)
  showHistory?: boolean; // Show historical data (default: false)
}
```

## WebSocket Service

All components use the centralized WebSocket service (`@/services/websocket.service`) for real-time communication.

**Features:**
- Automatic reconnection with exponential backoff
- Message queuing during disconnection
- Event listener management
- Connection status monitoring
- Error handling and recovery

**Usage:**
```typescript
import websocketService from '@/services/websocket.service';

// Listen for events
const unsubscribe = websocketService.on('webhook_event', (data) => {
  console.log('New webhook event:', data);
});

// Request data
websocketService.requestSystemMetrics();
websocketService.requestProviderStatus();

// Clean up
unsubscribe();
```

## Dashboard Implementation

The main monitoring dashboard (`/pages/monitoring/dashboard.tsx`) combines all components into a comprehensive monitoring interface.

**Features:**
- Responsive grid layout
- Global filters affecting all components
- Connection status monitoring
- Auto-refresh controls
- Manual refresh capabilities

## Styling

All components use Tailwind CSS for styling with:
- Consistent color scheme
- Responsive design patterns
- Smooth animations using Framer Motion
- Accessible color contrasts
- Dark mode support (where applicable)

## Dependencies

- **React**: Core framework
- **Next.js**: Application framework
- **Socket.io-client**: WebSocket communication
- **Recharts**: Chart library
- **Framer Motion**: Animations
- **Heroicons**: Icon library
- **Tailwind CSS**: Styling

## Environment Variables

Configure the WebSocket connection in your environment:

```env
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
```

## Backend Integration

These components expect the backend to emit the following WebSocket events:

- `webhook_event`: New webhook events
- `system_metrics`: System performance metrics
- `provider_status`: Provider connection status
- `alert`: System alerts
- `health_check`: Service health status

The backend should also handle these incoming events:

- `subscribe_monitoring`: Subscribe to monitoring events
- `get_system_metrics`: Request current metrics
- `get_provider_status`: Request provider status
- `test_provider_connection`: Test provider connection
- `resolve_alert`: Mark alert as resolved

## Usage Example

```tsx
import React from 'react';
import {
  WebhookEventStream,
  MetricsChart,
  HealthIndicator,
  AlertsPanel,
  ProviderStatus
} from '@/components/monitoring';

const MonitoringPage = () => {
  return (
    <div className="space-y-6">
      <HealthIndicator />

      <div className="grid grid-cols-3 gap-6">
        <MetricsChart type="line" metric="responseTime" title="Response Time" />
        <MetricsChart type="area" metric="successRate" title="Success Rate" />
        <MetricsChart type="bar" metric="webhookCount" title="Webhook Volume" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ProviderStatus providers={['careem', 'talabat']} />
        <AlertsPanel maxAlerts={25} />
      </div>

      <WebhookEventStream maxEvents={50} />
    </div>
  );
};

export default MonitoringPage;
```