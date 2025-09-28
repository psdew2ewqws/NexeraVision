# Webhook Management System

A comprehensive webhook management UI for the NEXARA integration platform, providing real-time monitoring, configuration management, and performance analytics for delivery provider webhooks.

## Features

### 🎯 Dashboard
- **Real-time Statistics**: Total webhooks, active webhooks, success rates, response times
- **Live Event Feed**: Real-time webhook events with WebSocket connection
- **Provider Performance**: Success rate visualization for each provider
- **Performance Metrics**: Interactive charts for success rate, response time, and volume trends

### ⚙️ Configuration Management
- **Register Webhooks**: Modal-based webhook registration with validation
- **Edit/Update**: Inline editing of webhook configurations
- **Toggle Status**: Enable/disable webhooks with one click
- **Delete Webhooks**: Safe webhook removal with confirmation

### 🏢 Provider-Specific Sections
- **Careem Now**: Order notifications and status updates
- **Talabat**: Order management and delivery tracking
- **Deliveroo**: Order lifecycle events and menu sync
- **Jahez**: Saudi Arabia food delivery integration
- **Uber Eats**: Order management and delivery tracking
- **Foodpanda**: Asian market food delivery platform
- **POS System**: Point of sale system integration

### 📊 Logs Viewer
- **Advanced Filtering**: Filter by provider, status, event type, date range
- **Search Functionality**: Search across client IDs, event types, and errors
- **Real-time Updates**: Live log updates with pagination
- **Export Capability**: Export logs for analysis
- **Retry Actions**: Retry failed webhooks directly from logs

### 🔄 Retry Queue Management
- **Queue Visualization**: View all pending, processing, failed, and abandoned retries
- **Bulk Operations**: Select and retry multiple failed webhooks
- **Progress Tracking**: Visual progress bars showing retry attempts
- **Smart Filtering**: Filter by provider, status, and other criteria
- **Queue Statistics**: Real-time stats on queue health

### 🧪 Test Functionality
- **Test Webhooks**: Send test events to verify endpoint functionality
- **Custom Payloads**: Test with custom JSON payloads
- **Response Analysis**: View response times, status codes, and errors
- **Provider Templates**: Pre-built test templates for each provider

## Technical Implementation

### TypeScript Types
- Comprehensive type definitions for all webhook entities
- Strong typing for API requests and responses
- Enum definitions for providers and event types

### React Hooks
- `useWebhooks`: Webhook configuration management
- `useWebhookLogs`: Log fetching and filtering
- `useWebhookStats`: Statistics and analytics
- `useWebhookMetrics`: Performance metrics for charts
- `useRetryQueue`: Retry queue management
- `useWebhookHealth`: System health monitoring
- `useRealtimeWebhookEvents`: Real-time event subscription

### Components Architecture
```
src/components/webhooks/
├── WebhookRegistrationModal.tsx    # Webhook registration form
├── ProviderConfigurations.tsx      # Provider-specific configurations
├── RetryQueueManager.tsx           # Retry queue interface
├── PerformanceChart.tsx            # Performance visualization
└── README.md                       # This documentation
```

### API Integration
- RESTful API client with error handling
- Real-time WebSocket/SSE connections
- Bulk operations support
- Automatic retry mechanisms

## Usage

### Adding a Webhook
1. Navigate to Configuration tab
2. Click "Add Webhook" button
3. Fill in the registration form:
   - Client ID (unique identifier)
   - Provider (Careem, Talabat, etc.)
   - Webhook URL (HTTPS required)
   - Event types to subscribe to
   - Optional custom headers
   - Retry configuration
4. Click "Register Webhook"

### Monitoring Performance
1. Dashboard provides real-time overview
2. Performance charts show trends over time
3. Provider performance section shows per-provider metrics
4. Real-time event feed shows live webhook activity

### Managing Failures
1. Check Retry Queue for failed webhooks
2. Use bulk retry for multiple failures
3. View detailed logs for debugging
4. Configure retry policies per webhook

### Testing Webhooks
1. Go to Testing tab
2. Select provider and enter client ID
3. Choose event type
4. Optionally add custom payload
5. Send test webhook and analyze response

## Security Features

- **HTTPS Only**: All webhook URLs must use HTTPS
- **Signature Validation**: Optional webhook signature verification
- **API Key Authentication**: Secure API access
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Graceful error handling and user feedback

## Performance Optimizations

- **Virtualized Lists**: Efficient rendering of large datasets
- **Real-time Updates**: WebSocket connections for live data
- **Caching**: React Query for efficient data caching
- **Pagination**: Paginated data loading for better performance
- **Debounced Search**: Optimized search functionality

## Responsive Design

- Mobile-first approach with Tailwind CSS
- Responsive grid layouts
- Touch-friendly interface elements
- Adaptive navigation for small screens

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus management

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- TypeScript 4.5+
- Tailwind CSS 3.0+
- Lucide React (icons)
- React Query (data fetching)
- Axios (HTTP client)

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

## Future Enhancements

- **Webhook Analytics**: Advanced analytics and reporting
- **Alerting System**: Email/SMS alerts for webhook failures
- **Rate Limiting**: Built-in rate limiting controls
- **Webhook Templates**: Pre-built webhook configurations
- **Multi-tenancy**: Support for multiple organizations
- **API Documentation**: Interactive API documentation
- **Webhook Debugging**: Advanced debugging tools
- **Performance Profiling**: Detailed performance analysis