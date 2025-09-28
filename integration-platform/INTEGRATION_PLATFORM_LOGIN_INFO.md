# Integration Platform - Login Information 🔐

## Default Test Credentials

The Integration Platform uses mock authentication for development. Use these credentials to log in:

### Admin Accounts

#### 🔴 Super Admin
- **Email**: `admin@integration.com`
- **Password**: `Admin123!`
- **Role**: Full system access
- **Access**: All organizations, POS systems, and delivery platforms

#### 🟠 Integration Manager
- **Email**: `manager@integration.com`
- **Password**: `Manager123!`
- **Role**: Organization manager
- **Access**: Manage integrations for assigned organizations

#### 🟡 Developer Account
- **Email**: `developer@integration.com`
- **Password**: `Dev123!`
- **Role**: API access and webhook configuration
- **Access**: Technical integration setup and monitoring

#### 🟢 Viewer Account
- **Email**: `viewer@integration.com`
- **Password**: `View123!`
- **Role**: Read-only access
- **Access**: View dashboards and reports only

## Access URLs

### Frontend Application
- **Login Page**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard (after login)
- **Webhook Config**: http://localhost:3000/webhooks/configuration
- **Monitoring**: http://localhost:3000/monitoring/dashboard

### Backend API
- **API Base**: http://localhost:3001/api/v1
- **Auth Endpoint**: http://localhost:3001/api/v1/auth/login
- **Health Check**: http://localhost:3001/api/v1/health

## Mock Authentication Setup

Since the backend is running in minimal mode, the authentication is mocked. Any of the above credentials will work for testing purposes.

### How to Login:
1. Navigate to http://localhost:3000/login
2. Enter one of the test credentials above
3. Click "Sign In"
4. You'll be redirected to the dashboard

## API Testing with cURL

Test the login endpoint directly:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@integration.com",
    "password": "Admin123!"
  }'
```

## Features Available After Login

Based on Week 4 implementation, you can access:

1. **Webhook Configuration** - Configure webhooks for Careem, Talabat, Deliveroo, Jahez
2. **Real-time Monitoring** - Live webhook events and system health
3. **Analytics Dashboard** - Order volumes, revenue breakdowns, performance metrics
4. **Operations Center** - Unified view of all integrations

## Notes

- These are development/test credentials only
- In production, real authentication with database validation would be required
- The current backend (minimal.app.ts) doesn't validate credentials - it's for UI testing only
- To implement real authentication, the full backend modules need to be configured

---

*Created for Integration Platform development and testing purposes*