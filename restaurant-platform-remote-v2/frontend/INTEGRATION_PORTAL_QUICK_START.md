# Integration Portal - Quick Start Guide

## File Structure Overview

```
frontend/
├── pages/integration/
│   ├── providers.tsx           # Provider management page
│   ├── branch-config.tsx       # Branch configuration page
│   ├── orders.tsx              # Order tracking page
│   ├── errors.tsx              # Error log viewer page
│   └── webhooks-enhanced.tsx   # Enhanced webhook monitoring
│
├── src/
│   ├── components/integration/
│   │   ├── StatusBadge.tsx       # Status indicator component
│   │   ├── ProviderCard.tsx      # Provider display card
│   │   ├── PayloadViewer.tsx     # JSON payload viewer
│   │   ├── OrderTimeline.tsx     # Order status timeline
│   │   ├── WebhookLogViewer.tsx  # Webhook log viewer
│   │   ├── ErrorCard.tsx         # Error display card
│   │   └── layout/
│   │       └── IntegrationLayout.tsx  # Navigation layout
│   │
│   ├── types/
│   │   └── integration.ts        # TypeScript type definitions
│   │
│   └── lib/
│       └── integration-api.ts    # API client layer
│
├── .env.local.example           # Environment configuration template
└── INTEGRATION_PORTAL_COMPLETE.md  # Full documentation
```

## Quick Setup (5 Minutes)

### Step 1: Environment Configuration
```bash
cd /home/admin/restaurant-platform-remote-v2/frontend
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_INTEGRATION_API_URL=http://localhost:3002
```

### Step 2: Install & Run
```bash
npm install  # If not already done
npm run dev
```

### Step 3: Access Portal
Open browser: `http://localhost:3000/integration/dashboard`

## Navigation Quick Reference

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/integration/dashboard` | Overview & stats |
| Providers | `/integration/providers` | Manage delivery providers |
| Branch Config | `/integration/branch-config` | Configure provider settings per branch |
| Orders | `/integration/orders` | Track delivery provider orders |
| Webhooks | `/integration/webhooks-enhanced` | Monitor incoming webhooks |
| Errors | `/integration/errors` | View & resolve errors |

## API Endpoints Expected

The integration service (port 3002) should provide:

```
GET    /providers
GET    /providers/:id/stats
PATCH  /providers/:id/toggle
POST   /providers/:id/test

GET    /branches/:branchId/providers/:providerId
POST   /branches/:branchId/providers/:providerId

GET    /orders
GET    /webhooks/logs
GET    /errors
GET    /stats
```

## Common Use Cases

### 1. Enable a Delivery Provider
1. Go to **Providers** page
2. Find the provider (e.g., Careem)
3. Toggle the switch to **Active**
4. Click **Configure** to view settings
5. Click **Test** to verify connection

### 2. Configure Branch Settings
1. Go to **Branch Config** page
2. Enter your branch ID (auto-filled if logged in)
3. Select a provider from dropdown
4. Enter webhook secret
5. Toggle auto-print/auto-accept as needed
6. Click **Save Configuration**

### 3. Track Orders
1. Go to **Orders** page
2. Use filters to find specific orders
3. Click **View Details** to see full order data
4. Click **Retry** for failed orders
5. Click **Sync** to sync to internal system

### 4. Monitor Webhooks
1. Go to **Webhooks** (enhanced) page
2. View real-time webhook logs
3. Filter by provider/status/date
4. Click arrow to expand payload
5. Click **Retry** for failed webhooks
6. Use **Export** to download logs

### 5. Resolve Errors
1. Go to **Errors** page
2. Filter by severity (critical, high, medium, low)
3. Click arrow to view stack trace
4. Click **Resolve** to mark as fixed
5. Monitor unresolved count in dashboard

## Component Usage Examples

### Using StatusBadge
```tsx
import { StatusBadge } from '@/components/integration/StatusBadge'

<StatusBadge status="active" />      // Green badge
<StatusBadge status="failed" />      // Red badge
<StatusBadge status="pending" />     // Yellow badge
```

### Using ProviderCard
```tsx
import { ProviderCard } from '@/components/integration/ProviderCard'

<ProviderCard
  provider={providerData}
  stats={statsData}
  onConfigure={(p) => handleConfig(p)}
  onTest={(p) => handleTest(p)}
  onToggle={(p, active) => handleToggle(p, active)}
  onViewLogs={(p) => router.push(`/integration/webhooks?provider=${p.id}`)}
/>
```

### Using WebhookLogViewer
```tsx
import { WebhookLogViewer } from '@/components/integration/WebhookLogViewer'

<WebhookLogViewer
  logs={webhookLogs}
  onRetry={(log) => retryMutation.mutate(log.id)}
  loading={isLoading}
/>
```

## API Client Usage

```tsx
import { deliveryProviders, branchConfig, providerOrders, webhookLogs, errorLogs } from '@/lib/integration-api'

// Get all providers
const providers = await deliveryProviders.getAll()

// Get provider stats
const stats = await deliveryProviders.getStats(providerId)

// Save branch configuration
const config = await branchConfig.save(branchId, providerId, {
  isActive: true,
  config: { webhookSecret: 'secret', autoPrint: true }
})

// Get orders with filters
const orders = await providerOrders.getAll({
  providerId: 'provider-id',
  status: 'pending',
  page: 1,
  limit: 20
})

// Get webhook logs
const logs = await webhookLogs.getAll({ providerId: 'provider-id' })

// Resolve error
const resolved = await errorLogs.resolve(errorId, 'user@email.com')
```

## React Query Integration

All API calls are cached with React Query:

```tsx
const { data: providers, isLoading } = useQuery({
  queryKey: ['delivery-providers'],
  queryFn: () => deliveryProviders.getAll()
})

const toggleMutation = useMutation({
  mutationFn: ({ id, isActive }) => deliveryProviders.toggle(id, isActive),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-providers'] })
    toast.success('Updated successfully')
  }
})
```

## Troubleshooting

### "Failed to fetch providers"
- Check integration service is running on port 3002
- Verify `NEXT_PUBLIC_INTEGRATION_API_URL` in `.env.local`
- Check browser console for CORS errors

### "Authentication failed"
- Ensure you're logged in
- Check auth token in localStorage
- Verify backend accepts JWT tokens

### "Cannot save branch config"
- Ensure you have permission for the branch
- Verify branch ID is correct
- Check backend branch configuration endpoints

### Empty data / No results
- Backend may not have seeded data
- Check backend database has provider records
- Verify API endpoints return proper data structure

## Testing the Portal

### Manual Testing Checklist
1. ✅ Navigate to each page - no errors
2. ✅ Toggle provider on/off - updates state
3. ✅ Save branch configuration - persists data
4. ✅ Search/filter orders - filters work
5. ✅ View order details - modal opens
6. ✅ Retry failed webhook - triggers retry
7. ✅ Resolve error - marks as resolved
8. ✅ Export webhook logs - downloads CSV
9. ✅ Pagination works - changes pages
10. ✅ Responsive design - works on mobile

## Performance Tips

1. **Use Pagination** - Don't load all records at once
2. **Cache with React Query** - Automatic caching reduces API calls
3. **Filter Data** - Use server-side filtering where possible
4. **Debounce Search** - Add debouncing for search inputs
5. **Lazy Load** - Use dynamic imports for heavy components

## Security Notes

- **Webhook Secrets**: Displayed as password inputs (masked)
- **Auth Tokens**: Automatically included in API requests
- **CORS**: Backend must allow frontend origin
- **Rate Limiting**: Backend should implement rate limits

## Next Steps

1. **Backend Integration**: Ensure integration service implements all endpoints
2. **Database Setup**: Seed delivery_providers table
3. **Webhook Configuration**: Set up webhook secrets with providers
4. **Testing**: Test with real delivery provider webhooks
5. **Monitoring**: Set up error alerting and logging

## Support Resources

- **Full Documentation**: See `INTEGRATION_PORTAL_COMPLETE.md`
- **Backend API**: Integration service on port 3002
- **Main Platform**: Backend on port 3001
- **Database**: PostgreSQL (postgres, password: E$$athecode006)

---

**Quick Start Complete!** 🎉

You now have a fully functional integration portal for managing delivery provider integrations.
