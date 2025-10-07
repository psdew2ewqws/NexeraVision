# Integration Developer Portal

A comprehensive developer portal for the Restaurant Platform API integration.

## Pages

### 1. Dashboard (`/integration/dashboard`)
- API usage overview with statistics
- Recent activity logs
- Quick action links
- Performance metrics chart

### 2. API Keys (`/integration/api-keys`)
- List all API keys with usage stats
- Create new API keys with scope selection
- View key statistics and recent activity
- Rotate and delete keys
- Copy keys to clipboard

### 3. Webhooks (`/integration/webhooks`)
- Configure webhook endpoints
- Subscribe to events
- Test webhook delivery
- View delivery logs
- Retry failed deliveries
- Signature verification examples

### 4. Documentation (`/integration/docs`)
- Interactive API reference
- Endpoint documentation
- Request/response examples
- Code examples (cURL, JavaScript, Python)
- Error codes reference
- Authentication guide

### 5. Monitoring (`/integration/monitoring`)
- Real-time request logs
- Performance metrics table
- Filter by method, status, endpoint
- Detailed log inspection
- Auto-refresh capability

### 6. Playground (`/integration/playground`)
- Interactive API testing
- Request builder with headers and body
- Response inspector
- Save common requests
- Generate cURL commands

## Components

### UI Components (`src/components/integration/ui/`)
- **Button**: Customizable button with variants
- **Card**: Container component with header/content
- **CodeBlock**: Syntax-highlighted code with copy functionality
- **Badge**: Status and label badges
- **Input/Textarea/Select**: Form input components
- **Modal**: Modal dialog component
- **Tabs**: Tabbed content container

### Layout
- **IntegrationLayout**: Main layout with sidebar navigation

## API Integration

### API Client (`src/lib/integration-api.ts`)
```typescript
import { apiKeys, webhooks, monitoring, statistics } from '@/lib/integration-api'

// API Keys
const keys = await apiKeys.getAll()
await apiKeys.create({ name: 'Production', scopes: ['read:orders'] })

// Webhooks
const webhooks = await webhooks.getAll()
await webhooks.create({ url: 'https://...', events: ['order.created'] })

// Monitoring
const logs = await monitoring.getLogs({ page: 1, limit: 20 })
const metrics = await monitoring.getMetrics()
```

### WebSocket Support (`src/lib/integration-websocket.ts`)
```typescript
import { useIntegrationWebSocket } from '@/lib/integration-websocket'

const { connect, subscribeLogs, on, off } = useIntegrationWebSocket()

// Connect
await connect()

// Subscribe to logs
subscribeLogs({ method: 'POST' })

// Listen for events
on('log', (data) => {
  console.log('New log:', data)
})
```

## Features

### Developer-Focused Design
- Dark theme optimized for code viewing
- Syntax highlighting for code examples
- Keyboard-navigable interface
- Fast, responsive UI

### Real-Time Updates
- WebSocket integration for live logs
- Auto-refresh for monitoring
- Real-time metrics updates

### Code Examples
- Multiple language examples (cURL, JavaScript, Python)
- Copy-to-clipboard functionality
- Interactive API playground

### Security
- API key management with scopes
- Webhook signature verification
- Rate limiting information

## Usage

### Accessing the Portal
Navigate to `/integration/dashboard` to access the integration portal.

### Creating an API Key
1. Go to `/integration/api-keys`
2. Click "Create API Key"
3. Enter name and select scopes
4. Copy the generated key (shown only once)

### Setting Up Webhooks
1. Go to `/integration/webhooks`
2. Click "Add Webhook"
3. Enter endpoint URL
4. Select events to subscribe
5. Test the webhook delivery

### Testing API Endpoints
1. Go to `/integration/playground`
2. Select method and endpoint
3. Configure headers and body
4. Click "Send" to test
5. Inspect response

## Technical Stack

- **Framework**: Next.js 14 (Pages Router)
- **UI**: Custom components with Tailwind CSS
- **State Management**: TanStack Query
- **Forms**: React Hook Form
- **WebSocket**: Socket.IO Client
- **Code Highlighting**: Built-in syntax highlighting
- **Date Formatting**: date-fns

## Future Enhancements

- [ ] GraphQL playground
- [ ] SDK code generation
- [ ] Postman collection export
- [ ] OpenAPI/Swagger integration
- [ ] API versioning support
- [ ] Sandbox environment
- [ ] Rate limit configuration
- [ ] Custom alert rules
- [ ] Batch operations
- [ ] API analytics dashboard
