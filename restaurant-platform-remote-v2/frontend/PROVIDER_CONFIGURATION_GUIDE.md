# Delivery Provider Configuration Guide

## Overview
The integration portal allows you to manage delivery provider integrations for your restaurant platform. Currently supported providers: Careem, Talabat, Uber Eats, Zomato, and Deliveroo.

## Accessing the Integration Portal

Navigate to: `http://localhost:3000/integration/providers`

## Provider Management

### 1. Viewing Providers
- All configured providers appear as cards on the main page
- Each card shows:
  - Provider name
  - Active/Inactive status badge
  - Provider slug (code identifier)
  - Statistics (Total Orders, Success Rate, Avg Response Time)
  - Action buttons (Configure, Test, View Logs)

### 2. Activating/Deactivating Providers
- Use the **toggle switch** in the top-right of each provider card
- Active providers can receive orders
- Inactive providers are disabled system-wide

### 3. Testing a Provider
Click **"Test"** button on any provider card to:
- Verify webhook endpoint connectivity
- Check provider configuration
- Test backend communication

### 4. Configuring Providers

#### Method 1: Via Provider Card
1. Click **"Configure"** on the provider card
2. View provider details:
   - Provider Name (read-only)
   - Provider Slug (read-only)
   - Configuration JSON (webhook endpoint, supported features)
3. Click **"Branch Configuration"** to set up per-branch settings

#### Method 2: Via Branch Configuration Page
Navigate to: `http://localhost:3000/integration/branch-config`

**Per-Branch Configuration includes:**
- API Credentials (API Key, Secret)
- Menu Mapping (link your menu items to provider items)
- Webhook URLs
- Order synchronization settings
- Branch-specific pricing rules

### 5. Viewing Provider Logs
Click **"View Logs"** to see:
- Order history
- Webhook events
- Error logs
- Success/failure rates

## Provider Configuration Backend

### Backend API Endpoints

**Get All Providers:**
```
GET /api/v1/integration/delivery/providers
```

**Get Provider by ID:**
```
GET /api/v1/integration/delivery/providers/:id
```

**Toggle Provider Status:**
```
PATCH /api/v1/integration/delivery/providers/:id/toggle
Body: { "isActive": true/false }
Auth: Required (super_admin, company_owner)
```

**Test Provider:**
```
POST /api/v1/integration/delivery/providers/:id/test
Auth: Required (super_admin, company_owner, branch_manager)
```

**Get Provider Statistics:**
```
GET /api/v1/integration/delivery/providers/:id/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### Database Schema

Providers are stored in the `delivery_providers` table:

```sql
CREATE TABLE delivery_providers (
  id VARCHAR PRIMARY KEY,
  code VARCHAR UNIQUE,        -- 'careem', 'talabat', etc.
  name VARCHAR,               -- Display name
  slug VARCHAR,
  is_active BOOLEAN DEFAULT true,
  api_base_url VARCHAR,
  webhook_endpoint VARCHAR,
  supported_features JSONB,  -- ['orders', 'webhooks', 'status_updates']
  rate_limits JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Adding New Providers

### Step 1: Add to Database
```sql
INSERT INTO delivery_providers (
  id, code, name, slug, is_active, webhook_endpoint, supported_features
) VALUES (
  gen_random_uuid(),
  'provider_code',
  'Provider Name',
  'provider_code',
  false,
  '/api/v1/delivery/webhook/provider_code',
  '["orders", "webhooks", "status_updates"]'::jsonb
);
```

### Step 2: Implement Webhook Handler
Create webhook handler in backend:
```
/backend/src/modules/delivery-webhooks/providers/provider-name.handler.ts
```

### Step 3: Configure Branch Settings
1. Go to Branch Configuration page
2. Select your branch
3. Select the new provider
4. Enter API credentials
5. Map menu items
6. Save configuration

## Webhook Configuration

Each provider has a unique webhook endpoint:
- Careem: `/api/v1/delivery/webhook/careem`
- Talabat: `/api/v1/delivery/webhook/talabat`
- Uber Eats: `/api/v1/delivery/webhook/ubereats`
- Zomato: `/api/v1/delivery/webhook/zomato`
- Deliveroo: `/api/v1/delivery/webhook/deliveroo`

**Setup in Provider Dashboard:**
1. Login to provider's merchant dashboard
2. Navigate to webhook settings
3. Enter your webhook URL: `https://yourdomain.com/api/v1/delivery/webhook/[provider-code]`
4. Save and test the webhook

## Monitoring & Analytics

### Integration Status Dashboard
Shows aggregated metrics:
- **Total Providers**: Count of all configured providers
- **Active Providers**: Count of enabled providers
- **Total Orders**: Sum of all orders across providers
- **Avg Success Rate**: Average success rate across all providers

### Per-Provider Statistics
Each provider card displays:
- **Total Orders**: Number of orders received
- **Success Rate**: Percentage of successfully processed orders
- **Avg Response**: Average API response time in milliseconds

## Troubleshooting

### Provider Shows 0 Orders
1. Check if provider is active (toggle switch)
2. Verify webhook is configured in provider's dashboard
3. Check webhook logs for incoming requests
4. Verify branch configuration has correct API credentials

### Test Connection Fails
1. Check backend is running (`http://localhost:3001`)
2. Verify database connection
3. Check provider is in database: `SELECT * FROM delivery_providers WHERE code = 'provider_name';`
4. Review backend logs for errors

### Orders Not Syncing
1. Verify webhook URL is correct in provider's dashboard
2. Check firewall/security settings allow incoming webhooks
3. Review webhook logs for failed requests
4. Verify menu mapping is configured correctly

## Security Best Practices

1. **API Credentials**: Store provider API keys securely in branch configuration
2. **Webhook Security**: Validate webhook signatures to prevent spoofing
3. **HTTPS**: Always use HTTPS for production webhook URLs
4. **Rate Limiting**: Respect provider rate limits to avoid blocking
5. **Error Handling**: Log all webhook failures for investigation

## Support

For additional help:
- Check backend logs: `/home/admin/restaurant-platform-remote-v2/backend/logs`
- Review webhook logs in Integration Portal
- Contact provider support for webhook issues
- Check database connectivity with provided credentials

---

**Last Updated**: October 1, 2025
**Platform Version**: 2.0
**Database**: PostgreSQL with password `E$$athecode006`
