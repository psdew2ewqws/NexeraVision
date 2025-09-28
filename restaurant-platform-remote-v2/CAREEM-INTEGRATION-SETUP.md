# 🚀 CAREEM INTEGRATION SETUP GUIDE

Complete guide to integrate Careem webhooks into your restaurant platform and receive real-time orders.

## 📋 REQUIREMENTS

### ✅ What You Already Have:
- NestJS backend with orders module
- PostgreSQL database with Prisma
- Webhook infrastructure
- Company & Branch management
- Printing system integration

### 📦 What You Need to Add:
- Careem API credentials
- Webhook endpoint configuration
- Order transformation logic
- Branch mapping setup

---

## 🚀 INSTALLATION STEPS

### 1. Add Database Models
```bash
# Copy the new models to your schema.prisma
cat prisma/careem-models.prisma >> prisma/schema.prisma

# Run migration
npx prisma migrate dev --name add-careem-integration
npx prisma generate
```

### 2. Install Dependencies
```bash
npm install @nestjs/axios rxjs
```

### 3. Add IntegrationsModule to App
Update `src/app.module.ts`:
```typescript
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    // ... existing modules
    IntegrationsModule,
  ],
  // ...
})
```

### 4. Configure Environment Variables
Copy `.env.careem.example` to your `.env` file and configure:
```bash
# Required Careem Configuration
CAREEM_API_URL=https://api.careem.com
CAREEM_API_KEY=your_api_key_from_careem_dashboard
CAREEM_WEBHOOK_SECRET=your_webhook_secret_from_careem_dashboard

# Optional Settings
CAREEM_AUTO_ACCEPT_ORDERS=true
CAREEM_DEFAULT_PREPARATION_TIME=15
```

### 5. Start Your Application
```bash
npm run start:dev
```

Your webhook endpoint will be available at:
```
https://yourdomain.com/integrations/careem/webhook
```

---

## 🔧 CAREEM DASHBOARD CONFIGURATION

### Step 1: Access Careem Partner Dashboard
1. Go to https://partners.careem.com
2. Login with your partner credentials
3. Navigate to "Integration Settings"

### Step 2: Configure Webhook
1. Set webhook URL: `https://yourdomain.com/integrations/careem/webhook`
2. Select events: `ORDER_CREATED`, `ORDER_STATUS_UPDATED`, `ORDER_CANCELLED`
3. Copy the webhook secret to your `.env` file
4. Test the webhook connection

### Step 3: Get API Credentials
1. Go to "API Management"
2. Generate new API key
3. Copy API key to your `.env` file
4. Note your brand ID and branch IDs

### Step 4: Configure Branch Mapping
Update your branches in the database to include Careem branch IDs:
```sql
UPDATE branches
SET integration_data = jsonb_set(
  COALESCE(integration_data, '{}'),
  '{careem}',
  '{"branchId": "your_careem_branch_id"}'
)
WHERE id = 'your_internal_branch_id';
```

---

## 📱 TESTING THE INTEGRATION

### 1. Local Testing with ngrok
```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3001

# Use the https URL in Careem dashboard
# Example: https://abc123.ngrok.io/integrations/careem/webhook
```

### 2. Test Webhook Endpoint
```bash
curl -X POST https://yourdomain.com/integrations/careem/webhook \
  -H "X-Careem-Event-Type: ORDER_CREATED" \
  -H "X-Careem-Signature: sha256=test_signature" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456,
    "status": "pending",
    "branch": {"id": "your_careem_branch_id"},
    "customer": {"name": "Test Customer"},
    "items": [{"id": "item1", "quantity": 1, "price": 10}],
    "price": {"total_taxable_price": 10}
  }'
```

### 3. Monitor Webhook Events
```bash
# Check webhook events via API
curl https://yourdomain.com/integrations/careem/webhook-events

# Check database
SELECT * FROM careem_webhook_events ORDER BY created_at DESC LIMIT 10;
```

---

## 🔄 ORDER FLOW

### When Customer Places Order on Careem:
1. **Careem** → Sends `ORDER_CREATED` webhook to your endpoint
2. **Your System** → Receives and validates webhook
3. **Your System** → Transforms Careem order to internal format
4. **Your System** → Creates order in your database
5. **Your System** → Sends acceptance to Careem API
6. **Your System** → Triggers printing and notifications
7. **Restaurant** → Prepares order
8. **Your System** → Updates order status to Careem

### API Endpoints Available:
```
GET  /integrations/careem/orders              # List orders
GET  /integrations/careem/orders/:id          # Get order details
POST /integrations/careem/orders/:id/accept   # Accept order
POST /integrations/careem/orders/:id/reject   # Reject order
POST /integrations/careem/orders/:id/ready    # Mark ready
GET  /integrations/careem/webhook-events      # Debug webhooks
```

---

## 🎯 PRODUCTION DEPLOYMENT

### 1. Domain & SSL
- Ensure your domain has valid SSL certificate
- Careem requires HTTPS for webhooks
- Use a stable domain (not ngrok in production)

### 2. Security
- Keep webhook secret secure
- Validate all incoming webhooks
- Monitor for suspicious activity
- Implement rate limiting if needed

### 3. Monitoring
- Set up logging for all webhook events
- Monitor API response times
- Track order processing success rates
- Set up alerts for failed webhooks

### 4. Branch Configuration
Each of your restaurant branches needs:
- Careem branch ID mapping
- Menu synchronization
- Operating hours alignment
- Delivery area configuration

---

## 🐛 TROUBLESHOOTING

### Common Issues:

**❌ Webhook signature validation fails**
- Check webhook secret in environment
- Ensure timestamp is within acceptable range
- Verify payload format

**❌ Branch mapping not found**
- Update branch integration_data with Careem branch ID
- Check branch ID format (UUID vs string)

**❌ Orders not appearing in system**
- Check webhook events table for errors
- Verify order transformation logic
- Ensure branch is properly mapped

**❌ Menu sync fails**
- Verify API credentials
- Check menu data format
- Ensure all required fields are present

### Debug Commands:
```bash
# Check recent webhook events
npx prisma studio
# Navigate to careem_webhook_events table

# Test webhook locally
npm run start:dev
curl -X POST http://localhost:3001/integrations/careem/webhook ...

# Check logs
docker logs your_backend_container
```

---

## ✅ SUCCESS CRITERIA

Your integration is working when:
1. ✅ Webhook endpoint responds with 200 OK
2. ✅ Orders appear in careem_orders table
3. ✅ Internal orders are created automatically
4. ✅ Order receipts print automatically
5. ✅ Status updates sync back to Careem
6. ✅ Restaurant receives real-time notifications

---

## 📞 SUPPORT

- **Careem Partner Support**: partners@careem.com
- **Integration Documentation**: https://developers.careem.com
- **API Reference**: https://api.careem.com/docs

---

## 🎉 CONGRATULATIONS!

You now have a complete Careem integration that:
- ✅ Receives real-time orders via webhooks
- ✅ Transforms data to your internal format
- ✅ Automatically accepts/rejects orders
- ✅ Triggers printing and notifications
- ✅ Syncs status updates back to Careem
- ✅ Provides complete order management

Your restaurants can now receive Careem orders seamlessly integrated into your existing workflow!