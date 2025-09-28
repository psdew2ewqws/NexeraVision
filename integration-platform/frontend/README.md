# Integration Platform Frontend

A comprehensive management interface for delivery integration platform built with Next.js 14, React 18, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Functionality
- **Authentication & Authorization** - JWT-based login with role-based access control
- **Real-time Dashboard** - Analytics, statistics, and live monitoring
- **Integration Management** - Configure and manage delivery provider integrations
- **Order Management** - Monitor and track orders across all platforms
- **Menu Synchronization** - Sync menu items across delivery platforms
- **Webhook Monitoring** - Real-time webhook event logging and debugging
- **API Key Management** - Secure API credential management

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui components
- **State Management**: React Query for server state, Context API for global state
- **Real-time**: Socket.io for WebSocket connections
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Icons**: Heroicons
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
frontend/
├── pages/                      # Next.js pages
│   ├── login.tsx              # Authentication page
│   ├── dashboard.tsx          # Main dashboard
│   ├── integrations/
│   │   └── index.tsx         # Integration management
│   ├── orders/
│   │   ├── index.tsx         # Order list
│   │   └── [orderId].tsx     # Order details
│   ├── menu/
│   │   └── sync.tsx          # Menu synchronization
│   ├── webhooks/
│   │   └── logs.tsx          # Webhook monitoring
│   └── settings/
│       └── api-keys.tsx      # API key management
├── src/
│   ├── components/           # Reusable components
│   │   ├── ui/              # Basic UI components
│   │   ├── layout/          # Layout components
│   │   ├── dashboard/       # Dashboard-specific
│   │   ├── integrations/    # Integration components
│   │   └── [feature]/       # Feature-specific components
│   ├── contexts/            # React contexts
│   │   └── auth-context.tsx # Authentication state
│   ├── hooks/               # Custom hooks
│   │   └── use-websocket.ts # WebSocket integration
│   ├── lib/                 # Utilities and configurations
│   │   ├── api-client.ts    # Axios API client
│   │   └── utils.ts         # Utility functions
│   ├── services/            # API service layers
│   ├── types/               # TypeScript definitions
│   └── styles/              # Global styles
└── public/                  # Static assets
```

## 🎨 UI Components

### Built-in Components
- **Cards** - Information display containers
- **Tables** - Data tables with sorting and pagination
- **Badges** - Status indicators and labels
- **Buttons** - Action triggers with variants
- **Forms** - Input fields with validation
- **Modals** - Dialog and form overlays
- **Navigation** - Sidebar and header navigation

### Custom Components
- **StatsCards** - Dashboard metric displays
- **OrderTrendsChart** - Revenue and order analytics
- **ProviderPerformance** - Integration performance metrics
- **IntegrationCard** - Provider configuration cards
- **RecentActivity** - Activity feed component

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_APP_NAME=Integration Platform
NEXT_PUBLIC_APP_VERSION=1.0.0

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Development
NODE_ENV=development
```

### API Client Configuration
- Automatic JWT token attachment
- Request/response interceptors
- Error handling and token refresh
- Multi-tenant company isolation

## 🔌 Real-time Integration

### WebSocket Features
- **Live Order Updates** - Real-time order status changes
- **Integration Health** - Provider status monitoring
- **Webhook Events** - Live webhook event stream
- **Multi-tenant Support** - Company-specific channels

### Event Types
- `order_created` - New order notifications
- `order_updated` - Order status changes
- `integration_status_changed` - Provider health updates
- `webhook_received` - Incoming webhook events
- `menu_sync_completed` - Sync operation results

## 📊 Dashboard Features

### Analytics Cards
- Total orders count with trends
- Active integrations status
- Pending orders alerts
- Daily revenue tracking

### Charts & Visualizations
- Order trends over time
- Provider performance metrics
- Revenue analytics
- Response time monitoring

### Activity Feed
- Recent system events
- User activity tracking
- Integration updates
- Error notifications

## 🔐 Security Features

### Authentication
- JWT token-based authentication
- Automatic token refresh
- Secure logout functionality
- Session persistence

### Authorization
- Role-based access control
- Company-level data isolation
- Protected routes
- API endpoint security

### API Security
- Request/response sanitization
- CORS configuration
- Rate limiting ready
- Error boundary protection

## 🎯 Integration Management

### Supported Providers
- **Careem Now** - Saudi Arabia delivery platform
- **Talabat** - Middle East food delivery
- **Deliveroo** - International delivery service
- **Uber Eats** - Global food delivery platform
- **Jahez** - Saudi Arabia local delivery

### Configuration Options
- API credentials management
- Webhook URL configuration
- Auto-accept order settings
- Menu synchronization options
- Inventory sync controls

## 📱 Responsive Design

### Mobile Support
- Touch-friendly navigation
- Responsive table layouts
- Mobile-optimized forms
- Adaptive card grids

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Focus management

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0+
- npm or yarn package manager

### Installation
1. **Install dependencies**:
   ```bash
   cd /home/admin/integration-platform/frontend
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   Navigate to `http://localhost:3000`

### Building for Production
```bash
# Build optimized production bundle
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔧 Development

### Code Structure
- **Components**: Modular, reusable UI components
- **Pages**: Next.js page-based routing
- **Hooks**: Custom React hooks for shared logic
- **Services**: API interaction layers
- **Types**: Comprehensive TypeScript definitions

### State Management
- **Server State**: React Query for API data caching
- **Global State**: Context API for authentication and app state
- **Local State**: useState and useReducer for component state
- **Form State**: React Hook Form for form management

### Performance Optimizations
- React Query caching and background updates
- Component lazy loading
- Image optimization
- Bundle splitting
- Memoization for expensive operations

## 📈 Monitoring & Analytics

### Performance Monitoring
- Real-time dashboard updates
- API response time tracking
- Error rate monitoring
- User activity analytics

### Debugging Tools
- React Query DevTools (development)
- WebSocket connection status
- API request/response logging
- Error boundary reporting

## 🔄 Integration Workflow

1. **Setup Integration** - Configure provider credentials
2. **Test Connection** - Verify API connectivity
3. **Enable Services** - Activate order processing and menu sync
4. **Monitor Health** - Track performance and errors
5. **Handle Webhooks** - Process real-time events

## 📋 Features Summary

✅ **Authentication System** - Secure login with role-based access
✅ **Real-time Dashboard** - Live analytics and monitoring
✅ **Integration Management** - Multi-provider configuration
✅ **Order Processing** - Complete order lifecycle management
✅ **Menu Synchronization** - Cross-platform menu management
✅ **Webhook Monitoring** - Real-time event debugging
✅ **API Management** - Secure credential management
✅ **Responsive Design** - Mobile and desktop optimized
✅ **Real-time Updates** - WebSocket integration
✅ **Modern UI/UX** - Tailwind CSS and Shadcn/ui components

## 🎉 Deployment Ready

The frontend is production-ready with:
- TypeScript for type safety
- ESLint and Prettier for code quality
- Optimized build process
- Docker containerization support
- Environment-based configuration
- Comprehensive error handling

---

**Built with ❤️ using modern web technologies for enterprise-grade delivery platform management.**