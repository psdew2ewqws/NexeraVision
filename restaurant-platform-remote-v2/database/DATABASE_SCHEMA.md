# Restaurant Platform Database Schema

This document outlines the complete database schema for the Restaurant Platform, including all tables, relationships, and key features.

## Schema Overview

The database is designed with a multi-tenant architecture supporting:
- **Companies/Brands**: Multiple restaurant brands with isolated data
- **Branches**: Multiple locations per company
- **Users**: Role-based access control system
- **Menu Management**: Products, categories, modifiers with multi-language support
- **Promotion System**: Comprehensive campaign management
- **Order Management**: Full order lifecycle tracking
- **Delivery Integration**: Multi-provider delivery system
- **Printing System**: Receipt and kitchen order printing
- **Availability Management**: Real-time stock and availability tracking

## Key Features

### 🏢 Multi-Tenant Architecture
- Complete data isolation between companies
- Hierarchical permission system
- Scalable for enterprise deployment

### 🍽️ Advanced Menu System
- Multi-language support (English/Arabic + extensible)
- Platform-specific pricing (Talabat, Careem, Website, Call Center)
- Smart preparation time calculation
- Image optimization and storage
- Comprehensive modifier system

### 🎯 Promotion System
- Campaign-based promotions with analytics
- Multiple discount types (percentage, fixed, buy-x-get-y)
- Platform-specific promotion targeting
- Usage tracking and conversion analytics
- A/B testing capabilities

### 📍 Location Management
- 546+ Jordan locations pre-loaded
- Delivery zone mapping
- Geographic coordinate support
- Search optimization for large datasets

### 🚚 Delivery Integration
- Multi-provider support (Talabat, Careem, D-Hub)
- Real-time order tracking
- Provider-specific configuration
- Delivery analytics and monitoring

### 🖨️ Printing System
- Multiple printer types (thermal, receipt, kitchen)
- Network, USB, Bluetooth connectivity
- Print job queue management
- Template-based printing

### 📊 Analytics & Monitoring
- Real-time availability tracking
- Promotion performance analytics
- User activity logging
- Delivery provider performance metrics

## Database Statistics

- **Total Tables**: 50+
- **Main Models**: 35+
- **Enums**: 15+
- **Indexes**: 100+
- **Relationships**: Complex many-to-many and hierarchical

## Authentication & Security

- JWT-based authentication
- Role-based access control (RBAC)
- Activity logging for audit trails
- Multi-tenant data isolation
- Input sanitization and validation

## Performance Optimizations

- Strategic database indexing
- Efficient query patterns
- Caching layer support
- Pagination for large datasets
- Optimized image storage

## Environment

- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **File Storage**: Database BLOB with optimization
- **Search**: Full-text search capabilities

## Getting Started

1. Ensure PostgreSQL is running
2. Set DATABASE_URL in environment
3. Run migrations: `npx prisma migrate deploy`
4. Generate client: `npx prisma generate`
5. Seed data: `npm run seed` (if available)

## Schema Version

Current schema version includes:
- Complete promotion system (latest)
- Menu availability management
- Multi-language support
- Delivery provider integration
- Comprehensive audit logging

---

*Generated: $(date)*
*Platform: Restaurant Management System v2.0*