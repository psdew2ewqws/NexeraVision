# Careem Webhook Configuration Guide

## Your Credentials (Production - Teta Raheeba)

```json
{
  "client_id": "4a27196f-7c1b-42c2-82ff-7e251126f1b1",
  "client_secret": "3d327a41-7dca-4b03-94dc-f91e79aed220",
  "restaurant_name": "Teta Raheeba",
  "user_id": "82263842"
}
```

## Webhook Registration Payload

Send this to Careem API to register your webhook:

```json
{
  "clientId": "4a27196f-7c1b-42c2-82ff-7e251126f1b1",
  "webhookUrl": "https://integration.ishbek.com/api/v1/delivery/webhook/careem",
  "events": [
    "ORDER_CREATED",
    "ORDER_CONFIRMED",
    "ORDER_READY",
    "DELIVERY_STARTED",
    "DELIVERY_ENDED",
    "CAPTAIN_ASSIGNED",
    "CAPTAIN_COMING",
    "CAPTAIN_HERE",
    "CANCELED"
  ],
  "verificationToken": "YOUR_VERIFICATION_TOKEN_HERE"
}
```

## Steps to Register Webhook

### 1. Contact Careem Integration Team
- **Email**: integrations@careem.com or careemnow-integrations@careem.com
- **Request**: Webhook registration for Teta Raheeba
- **Provide**: client_id and desired webhook URL

### 2. Or Use Careem Dashboard (If Available)
- Login to https://business.careem.com/ or https://partner.careemnow.com/
- Navigate to Integration Settings
- Add webhook URL and select events
- Save and verify

### 3. Test Webhook Reception

```bash
# Test that your backend is reachable
curl -X POST https://integration.ishbek.com/api/v1/delivery/webhook/careem \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-order-123",
    "status": "confirmed",
    "branch": {
      "id": "your-branch-id"
    },
    "customer": {
      "name": "Test Customer",
      "phone": "+962791234567"
    },
    "items": [
      {
        "id": "item-1",
        "name": "Test Item",
        "quantity": 1,
        "price": 10.00
      }
    ],
    "total": 10.00
  }'
```

## Backend Endpoint Details

**File**: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/delivery-webhooks/careem-webhook.controller.ts`

**Endpoint**: `POST /api/v1/delivery/webhook/careem`

**Features**:
- ✅ Webhook signature validation (HMAC-SHA256)
- ✅ Order creation from Careem payload
- ✅ Customer creation/lookup
- ✅ Automatic printing integration
- ✅ Comprehensive logging (WebhookLog table)
- ✅ Error handling and retry logic

## Environment Variables

Add to your backend `.env` file:

```bash
# Careem Integration
CAREEM_CLIENT_ID=4a27196f-7c1b-42c2-82ff-7e251126f1b1
CAREEM_CLIENT_SECRET=3d327a41-7dca-4b03-94dc-f91e79aed220
CAREEM_WEBHOOK_SECRET=2a3d9339-c2b1-498a-aac3-443ac029efb9
CAREEM_WEBHOOK_URL=https://integration.ishbek.com/api/v1/delivery/webhook/careem
```

## Branch Configuration

Configure Careem for your branch at: `http://localhost:3000/integration/branch-config`

### Required Fields:
- **Branch ID**: Your Careem branch identifier (careemBranchId)
- **Store ID**: Careem store ID (usually same as branch ID)
- **Menu ID**: For menu synchronization (optional)
- **Auto-Accept**: Automatically accept incoming orders
- **Auto-Print**: Automatically print orders when received

## Webhook Events Explained

| Event | Description | Action |
|-------|-------------|--------|
| `ORDER_CREATED` | New order placed | Create order in system |
| `ORDER_CONFIRMED` | Restaurant confirmed | Update order status |
| `ORDER_READY` | Food ready for pickup | Notify driver |
| `DELIVERY_STARTED` | Driver picked up order | Update tracking |
| `DELIVERY_ENDED` | Order delivered | Complete order |
| `CAPTAIN_ASSIGNED` | Driver assigned | Store driver info |
| `CAPTAIN_COMING` | Driver en route to restaurant | Alert staff |
| `CAPTAIN_HERE` | Driver arrived | Prepare handoff |
| `CANCELED` | Order cancelled | Update status, notify |

## Security

### Webhook Signature Validation
The backend validates all incoming webhooks using HMAC-SHA256:

```typescript
// Signature validation (line 155-165)
const hmac = crypto.createHmac('sha256', CAREEM_WEBHOOK_SECRET);
hmac.update(JSON.stringify(payload));
const calculatedSignature = hmac.digest('hex');

// Timing-safe comparison prevents timing attacks
crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(calculatedSignature)
);
```

### Headers Required by Careem:
- `x-webhook-signature`: HMAC-SHA256 signature
- `x-forwarded-for`: Original IP address
- `Content-Type`: application/json

## Monitoring & Debugging

### Check Webhook Logs
```sql
-- View recent webhooks
SELECT * FROM webhook_logs
WHERE provider_id = (SELECT id FROM delivery_providers WHERE code = 'careem')
ORDER BY created_at DESC
LIMIT 50;
```

### Backend Logs
```bash
# Watch backend logs for webhook activity
cd /home/admin/restaurant-platform-remote-v2/backend
npm run start:dev

# Look for:
# "Received Careem webhook: {...}"
# "Successfully processed Careem order CAREEM-xxx in Xms"
```

### Test Webhook Manually
```bash
# Simulate Careem sending webhook
curl -X POST http://localhost:3001/api/v1/delivery/webhook/careem \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test-signature" \
  -d @careem-test-payload.json
```

## Production Checklist

- [ ] Domain configured with SSL certificate
- [ ] Firewall allows HTTPS traffic on port 443
- [ ] Backend running and accessible publicly
- [ ] Webhook URL registered with Careem
- [ ] Environment variables set correctly
- [ ] Branch configuration completed in UI
- [ ] Test order placed and received successfully
- [ ] Signature validation working
- [ ] Auto-print configured if desired
- [ ] Monitoring and alerts set up

## Contact Information

**Careem Support**:
- Email: integrations@careem.com, careemnow-integrations@careem.com
- Dashboard: https://business.careem.com/ or https://partner.careemnow.com/
- Documentation: https://docs.careemnow.com/

**Your Restaurant**:
- Name: Teta Raheeba
- User ID: 82263842
- Client ID: 4a27196f-7c1b-42c2-82ff-7e251126f1b1

---

*Last Updated: October 1, 2025*
