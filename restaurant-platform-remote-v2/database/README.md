# Restaurant Platform Database

This directory contains all database-related files for the Restaurant Platform project.

## Files Overview

### 📄 Schema Files
- **`prisma_schema.prisma`** - Current Prisma schema with all models and relationships
- **`restaurant_platform_current_schema.sql`** - PostgreSQL schema-only dump
- **`restaurant_platform_complete_with_data.sql`** - Complete database with all data (460KB)

### 🔄 Migrations
- **`migrations/`** - All Prisma migration files
  - `20250901223013_add_provider_configuration_models/` - Delivery provider configurations
  - `20250902000001_delivery_system_optimizations/` - Delivery system improvements
  - `20250904_create_promotion_system/` - Complete promotion system

### 🌱 Seeds
- **`seeds/`** - Database seeding scripts (to be created)

## Database Stats

- **Tables**: 50+ with comprehensive relationships
- **Companies**: 10 pre-loaded restaurant brands
- **Locations**: 546 Jordan delivery zones
- **Users**: Multi-role authentication system
- **Promotions**: Active campaigns with analytics
- **Menu Items**: Multi-language product catalog

## Quick Setup

### 1. Import Complete Database
```bash
# Import schema + all data
psql -d postgres < restaurant_platform_complete_with_data.sql
```

### 2. Schema Only (for fresh setup)
```bash
# Import schema only
psql -d postgres < restaurant_platform_current_schema.sql
```

### 3. Using Prisma (recommended)
```bash
# From backend directory
cd ../backend
npx prisma migrate deploy
npx prisma generate
npx prisma db seed  # If seed script exists
```

## Database Connection

Default connection string (from backend/.env):
```
DATABASE_URL="postgresql://postgres:E%24%24athecode006@localhost:5432/postgres"
```

## Key Features

### 🏢 Multi-Tenant Architecture
- Complete company isolation
- Role-based access control
- Branch management system

### 🍽️ Menu Management
- Multi-language support (English/Arabic)
- Platform-specific pricing
- Image optimization and storage
- Modifier system with categories

### 🎯 Promotion System
- Campaign-based promotions
- Menu item integration
- Platform targeting (Talabat, Careem, Website)
- Usage analytics and reporting
- A/B testing capabilities

### 📍 Location Management
- 546 Jordan locations pre-loaded
- Geographic coordinates
- Delivery difficulty ratings
- Search optimization

### 🚚 Delivery Integration
- Multi-provider support
- Real-time order tracking
- Provider-specific configurations
- Performance analytics

### 🖨️ Printing System
- Multiple printer types
- Print job queues
- Template-based printing
- Network/USB/Bluetooth support

### 📊 Analytics & Monitoring
- User activity logging
- Promotion performance tracking
- Delivery provider analytics
- Real-time availability monitoring

## Schema Evolution

The database schema has evolved through several major versions:

1. **v1.0** - Basic restaurant management (companies, branches, users)
2. **v1.5** - Menu system with multi-language support
3. **v1.7** - Delivery provider integration
4. **v2.0** - Complete promotion system with analytics

## Data Types

### JSON Fields
- Multi-language content (names, descriptions)
- Platform-specific pricing
- Configuration settings
- Analytics data

### Geographic Data
- Decimal coordinates with high precision
- Delivery zones with polygon support
- Distance calculations

### Audit Fields
- Created/updated timestamps
- User tracking for changes
- Soft delete support
- Version history

## Performance Considerations

### Indexes
- Strategic indexing for multi-tenant queries
- Geographic coordinate indexes
- Full-text search capabilities
- Performance monitoring

### Relationships
- Efficient foreign key constraints
- Cascading deletes where appropriate
- Optional relationships for flexibility

## Security

- Row-level security (RLS) ready
- Data isolation between companies
- Audit logging for compliance
- Input validation and sanitization

## Migration Strategy

1. **Development**: Use Prisma migrations
2. **Staging**: Test migrations with data
3. **Production**: Backup before migration
4. **Rollback**: Keep previous schema versions

---

**Last Updated**: $(date)
**Schema Version**: 2.0
**Total Tables**: 50+
**Migration Count**: 3 major migrations