# API Connections Map - Restaurant Platform

## Overview
Complete mapping of frontend-backend API connections, endpoints, and data flows for the Restaurant Platform system.

---

## Authentication & Authorization

### Login Flow
```
Frontend → POST /api/v1/auth/login
Request: { "emailOrUsername": string, "password": string }
Response: { "accessToken": string, "user": UserProfile }
```

### Protected Route Structure
```
Authorization: Bearer <JWT_TOKEN>
User Context: { id, email, role, companyId, branchId }
```

### User Management
- `GET /api/v1/users` - List users (with pagination)
- `GET /api/v1/users/available-roles` - Get available roles for user creation
- `POST /api/v1/users` - Create new user
- `GET /api/v1/users/my` - Get current user profile
- `GET /api/v1/users/:id` - Get specific user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

---

## Company Management

### Core Company Operations
```
GET /api/v1/companies → List all companies (super_admin only)
POST /api/v1/companies → Create company (super_admin only)
GET /api/v1/companies/:id → Get company details
PATCH /api/v1/companies/:id → Update company
DELETE /api/v1/companies/:id → Delete company
```

### Company-Specific Endpoints
- `GET /api/v1/companies/list` - Simple company list
- `GET /api/v1/companies/my` - Current user's company
- `GET /api/v1/companies/:id/statistics` - Company stats

### Data Structure
```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "businessType": "restaurant",
  "timezone": "Asia/Amman",
  "defaultCurrency": "JOD",
  "status": "active|inactive|suspended",
  "subscriptionPlan": "basic|premium|enterprise"
}
```

---

## Branch Management

### Branch Operations
```
GET /api/v1/branches → List branches
POST /api/v1/branches → Create branch
GET /api/v1/branches/my → Current user's branches
GET /api/v1/branches/:id → Get branch details
PATCH /api/v1/branches/:id → Update branch
DELETE /api/v1/branches/:id → Delete branch
```

### Multi-Language Support
```json
{
  "name": "Main Office",
  "nameAr": "المكتب الرئيسي",
  "address": "string",
  "city": "string",
  "country": "string",
  "timezone": "Asia/Amman"
}
```

---

## Menu Management

### Menu Categories
```
GET /api/v1/menu/categories → List categories
POST /api/v1/menu/categories → Create category
PUT /api/v1/menu/categories/:id → Update category
DELETE /api/v1/menu/categories/:id → Delete category
```

**Verified Working Response**:
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": {"en": "Burgers", "ar": "برجر"},
      "description": {"en": "Delicious burgers", "ar": "برجر لذيذ"},
      "displayNumber": 1,
      "isActive": true,
      "companyId": "company-uuid"
    }
  ]
}
```

### Product Management
```
POST /api/v1/menu/products/paginated → Get paginated products
GET /api/v1/menu/tags → List product tags
GET /api/v1/menu/stats → Menu statistics
POST /api/v1/menu/products → Create product
PUT /api/v1/menu/products/:id → Update product
DELETE /api/v1/menu/products/:id → Delete product
```

### Bulk Operations
- `POST /api/v1/menu/products/bulk-status` - Update multiple product statuses
- `POST /api/v1/menu/products/bulk-delete` - Delete multiple products

### Image Management
- `POST /api/v1/menu/products/upload-images` - Upload product images
- `GET /api/v1/menu/products/:id/images` - Get product images
- `DELETE /api/v1/menu/images/:id` - Delete image
- `POST /api/v1/menu/images/update-product` - Update product image

---

## Modifiers Management

### Modifier Operations
```
GET /api/v1/modifiers → List modifiers
POST /api/v1/modifiers → Create modifier
GET /api/v1/modifiers/:id → Get modifier
PATCH /api/v1/modifiers/:id → Update modifier
DELETE /api/v1/modifiers/:id → Delete modifier
```

### Modifier Categories
```
GET /api/v1/modifier-categories → List modifier categories
POST /api/v1/modifier-categories → Create category
GET /api/v1/modifier-categories/:id → Get category
PATCH /api/v1/modifier-categories/:id → Update category
DELETE /api/v1/modifier-categories/:id → Delete category
```

---

## Availability Management

### Branch Availability
```
POST /api/v1/availability/branch → Create availability
PUT /api/v1/availability/branch/:id → Update availability
DELETE /api/v1/availability/branch/:id → Delete availability
```

### Bulk Operations
- `POST /api/v1/availability/bulk/update` - Bulk update availability
- `POST /api/v1/availability/bulk/create` - Bulk create availability
- `POST /api/v1/availability/bulk/delete` - Bulk delete availability
- `POST /api/v1/availability/bulk/status-change` - Bulk status change
- `POST /api/v1/availability/bulk/stock-update` - Bulk stock update

### Templates & Alerts
```
GET /api/v1/availability/templates → List templates
POST /api/v1/availability/templates → Create template
GET /api/v1/availability/alerts → List alerts
POST /api/v1/availability/alerts → Create alert
```

---

## Order Management

### Order Operations
Based on discovered endpoints:
- Order creation and management
- Order status tracking
- Order item management
- Integration with delivery zones and providers

### Data Relations
- Orders → Branch (branchId)
- Orders → DeliveryZone (deliveryZoneId, select: zoneName, deliveryFee)
- Orders → DeliveryProvider (deliveryProviderId, select: name, displayName)
- Orders → OrderItems → Products

---

## Printing System

### Printer Management
```
POST /api/v1/printing/printers → Register printer
GET /api/v1/printing/printers → List printers
POST /api/v1/printing/test/:id → Test printer
GET /api/v1/printing/jobs → List print jobs
GET /api/v1/printing/stats → Printing statistics
```

### WebSocket Integration
- Real-time printer status updates
- Job queue management
- Print job submissions

---

## Delivery Integration

### Provider Management
Based on codebase analysis:
- Multiple delivery provider integrations (Talabat, Careem, DHUB, etc.)
- Provider failover system
- Order tracking and webhook monitoring
- Location-based delivery zones

---

## License Management

### License Operations
```
GET /api/v1/licenses → List licenses
POST /api/v1/licenses → Create license
GET /api/v1/licenses/stats → License statistics
GET /api/v1/licenses/my-company → Company licenses
PATCH /api/v1/licenses/:id → Update license
POST /api/v1/licenses/:id/extend → Extend license
```

### Feature Access Control
- `GET /api/v1/licenses/feature-access/:feature` - Check feature access
- `POST /api/v1/licenses/track-usage/:feature` - Track feature usage

---

## WebSocket Connections

### Real-time Features
1. **Availability Gateway**: Branch-specific availability updates
2. **Printing Gateway**: Printer status and job management  
3. **Orders Gateway**: Live order tracking and updates

### WebSocket Events
```javascript
// Availability
socket.emit('joinBranch', branchId)
socket.emit('leaveBranch', branchId)

// Printing
socket.emit('requestPrinterStatus', printerId)
socket.emit('submitPrintJob', jobData)

// Orders
socket.emit('requestLiveOrders', branchId)
```

---

## Database Schema Relationships

### Key Entity Relationships
```
Company (1) → (*) Branch
Company (1) → (*) User  
Company (1) → (*) MenuCategory
Branch (1) → (*) BranchAvailability
Product (*) → (1) MenuCategory
Order (*) → (1) Branch
Order (*) → (1) DeliveryZone  
Order (*) → (1) DeliveryProvider
```

### Multi-Language Fields
- All user-facing text stored as JSON: `{"en": "English", "ar": "Arabic"}`
- Categories, products, descriptions support multiple languages
- Timezone-aware operations (default: Asia/Amman)

---

## Error Handling & Status Codes

### Common Response Patterns
```json
// Success
{ "data": {...}, "message": "Success" }

// Error  
{ "message": "Error details", "error": "Error Type", "statusCode": 400 }

// Validation Error
{ "message": ["field1 error", "field2 error"], "error": "Bad Request", "statusCode": 400 }
```

### Authentication Errors
- 401: `{"message": "Invalid token", "error": "Unauthorized"}`
- 403: Insufficient permissions for role-based access

---

## Frontend Integration Points

### Key Integration Areas
1. **Authentication**: Handle JWT tokens, refresh logic
2. **Multi-tenant Context**: Pass companyId in requests
3. **Role-based UI**: Show/hide features based on user role  
4. **Multi-language**: Handle Arabic/English content
5. **Real-time Updates**: WebSocket connection management

### Recommended Frontend Structure
```javascript
// API Client Configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Multi-tenant aware requests
const getMenuCategories = () => 
  apiClient.get('/menu/categories') // companyId from JWT context

// WebSocket connection
const socket = io('http://localhost:3001', {
  auth: { token }
})
```

---

## Performance Considerations

### Response Times (Local Testing)
- Health check: ~6ms
- Authentication: ~107ms  
- Menu categories: ~20ms
- Database queries: <50ms average

### Optimization Opportunities
1. Implement response caching for frequently accessed data
2. Add database connection pooling optimization
3. Consider pagination for large datasets
4. Implement request rate limiting

---

**Document Updated**: September 9, 2025  
**System Version**: Restaurant Platform v2.0  
**API Base URL**: `http://localhost:3001/api/v1`  
**Frontend URL**: `http://localhost:3001` (redirected from 3000)