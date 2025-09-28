# Test Credentials and API Keys for Integration Platform

⚠️ **IMPORTANT: These are UAT/Test credentials found in the Picolinate project. DO NOT use in production.**

## API Keys and Tokens

### JWT Authentication
```json
{
  "AccessTokenSecret": "9GrCxtjpjRwhmDok56AgVQQoFz9L8CSCmTwxNr6E2pY=",
  "RefreshTokenSecret": "Wni0xZalqfDjLqUEhOUCxtiv6SCUFtzIOLkNr6E2pY=",
  "AccessTokenExpirationMinutes": 43200,
  "RefreshTokenExpirationMinutes": 1438300,
  "Issuer": "https://localhost:5001",
  "Audience": "https://localhost:5001"
}
```

### Infobip SMS Service
- **API URL**: `https://qg4mer.api.infobip.com/sms/2/text/advanced`
- **Authorization**: `App 6919584b436c207261464e962f1e858c-3dbe806f-dc50-41c1-abb6-bb367bfc783c`

### Food Aggregator Service
- **Base URL**: `https://middleware.ishbek.com/api/aggregator/`
- **Integration Auth Token**: `BTevbdYD8hcKNpAFQ5S26R7tEmJ3kHsGLajC9ZynP4`

### WhatsApp Business API
```json
{
  "Token": "EABJbsaEZB68IBAEove1nYwOJrV8wPrc8aF9mCifrWBQMXG5EB8NvRX4EufEspOZBnUmqa37IXB4mKVb0o9GDymBtukKyMyIMMSZC1ogXWgWqH0gHwt6ZCaQsFZA63iWsZBKB4sm9In9R2w8FkDBfJYlKxK91151hoEODuF44ipINqNvzjJzBbf",
  "VerifyToken": "ROMUlunV45ju8RU7L6EQqPnAa0QTL2cCdD68KkHdGOLTI6SWge",
  "BaseUrl": "https://graph.facebook.com/v20.0/"
}
```

### Encryption Keys
```json
{
  "Key": "u8x/A?D(G-KaPdSg",
  "Iv": "-KaPdSgVkYp3s6v9"
}
```

## Database Connections

### UAT Database (PostgreSQL)
```
Host: 10.1.0.2
Port: 5432
Database: CompanyDB
Username: postgres
Password: pBZEuh5enQvW45W8Lrn6SHk3Z27B2uwkJE2L2J5BWme8Xtw3h
```

### Production Database (PostgreSQL)
```
Host: 10.0.0.3
Port: 5432
Database: CompanyDB
Username: postgres
Password: pBZEuh5enQvW45W8Lrn6SHk3Z27B2uwkJE2L2J5BWme8Xtw3h
```

### Local Test Database
```
Host: 127.0.0.1
Port: 5432
Database: ishbek_intgration_v2
Username: postgres
Password: (empty for local)
```

## Delivery Platform Endpoints

### Talabat Service
- **Base URL**: `https://hcustomers.ishbek.com/api/Customers/`
- **Endpoints**:
  - Create Order: `/CreateOrder`
  - Get Fees: `/GetEstimatedFees`
  - Create Credentials: `/branch/Createtalabatcredentials`
  - Get Credentials: `/branch/GetTalabatBranchids`

### Nashmi Service
- **Base URL**: `https://integration.ishbek.com/Nashmi/Nashmi`
- **Endpoints**:
  - Get Fees: `checkPreorderEstimationsTime/branch/`
  - Create Task: `createOrder/branch/`

### Dhub Service
- **Base URL**: `https://middleware.ishbek.com/api/`
- **Endpoints**:
  - Check Merchant Task: `dhub/checkMerchantTask`
  - Create Task: `dhub/createTask`

### TopDelivery Service
- **Base URL**: `https://integration.ishbek.com/TopDelivery/Api/`
- **Endpoints**:
  - Check Estimations: `checkOrderEstimations/branch/`
  - Create Order: `createOrder/branch/`
  - Check Status: `checkOrderStatus/orderId/`

### JoodDelivery Service
- **Base URL**: `https://integration.ishbek.com/JoodDelivery/Api`
- **Endpoints**:
  - Check Estimations: `checkOrderEstimations/branch/`
  - Create Order: `createOrder/branch/`
  - Check Status: `checkOrderStatus/orderId/`

## Integration Hub URLs

### UAT Environment
- **Base API**: `http://37.27.9.104:708/api/`
- **Companies List**: `http://65.108.53.41/integrationsHub.ishbek.com/getUatCompaniesList`
- **ISHBEK HTTP Host**: `65.108.60.120`

### Production Environment
- **Base API**: `http://65.108.60.120:708/api/`

## Laravel Application
```env
APP_KEY=base64:sgQ7u/RmAe4hdPx+d4Gy1UiOX+C/H1Lq8yXbRBLeuh4=
APP_URL_PUBLIC=http://127.0.0.1:8000/api
```

## Channel IDs (Delivery Platforms)
These UUIDs represent different delivery/ordering channels:
- `0c698066-ce70-483f-8da6-968465fd697a`
- `1e9c179d-299a-439e-89e8-44d55231f27b`
- `35f7e99f-ad6e-48b3-8975-d9124896e15d`
- `4bba2939-a11f-43eb-845d-2e2b9e23c29d`
- `79401a8a-0d53-4988-a08d-31d1b3514919`
- `b4100651-6f39-4a52-91b4-ca2f0ce68400`
- `d43d0969-837d-474f-abe0-75d6181d44af`
- `e0e505f0-5b9b-4ba7-8b4a-e458286a6424`

## Test Companies Available
Total of **79 test companies** available via the UAT companies list endpoint, including:
- Sushi Crush
- Nashville Fried Chicken
- Dynamite Box
- Shawerma 3a saj
- Ishbek Demo (with Talabat test branches)
- Tazaj
- Heat Burger
- And many more...

## Usage Notes

1. **Security**: These are test/UAT credentials - never use in production
2. **Testing**: Use these endpoints for integration testing only
3. **Rate Limits**: Be aware that test endpoints may have rate limits
4. **Data Persistence**: Test data may be periodically cleaned
5. **Authentication**: Most endpoints require JWT bearer tokens

## Example Usage

### Get JWT Token
```bash
curl -X POST https://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### Call Talabat API
```bash
curl -X POST https://hcustomers.ishbek.com/api/Customers/CreateOrder \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_data":"..."}'
```

### Get UAT Companies
```bash
curl http://65.108.53.41/integrationsHub.ishbek.com/getUatCompaniesList
```

## Important Security Notes

⚠️ **WARNING**:
- These credentials are from a test environment
- Do not commit these to public repositories
- Rotate credentials regularly
- Use environment variables in your code
- Never hardcode credentials in source code