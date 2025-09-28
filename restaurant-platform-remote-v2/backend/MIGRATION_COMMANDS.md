# Migration Commands - Picolinate Schema Enhancements

## Quick Reference

To apply the Picolinate-inspired schema enhancements to your database, run these commands:

### 1. Generate Prisma Client
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npm run prisma:generate
```

### 2. Push Schema to Database
```bash
# Push schema changes directly (recommended for development)
npx prisma db push

# OR create a migration (recommended for production)
npx prisma migrate dev --name picolinate-enhanced-schema
```

### 3. Verify Tables Created
```bash
# Check new tables exist
psql "postgresql://postgres:E\$\$athecode006@localhost:5432/postgres" -c "\dt menu_integration_sync"
psql "postgresql://postgres:E\$\$athecode006@localhost:5432/postgres" -c "\dt branch_delivery_providers"
psql "postgresql://postgres:E\$\$athecode006@localhost:5432/postgres" -c "\dt branch_platform_menus"
psql "postgresql://postgres:E\$\$athecode006@localhost:5432/postgres" -c "\dt platform_integration_logs"
```

### 4. Check Enhanced Fields
```bash
# Verify soft deletion fields added
psql "postgresql://postgres:E\$\$athecode006@localhost:5432/postgres" -c "\d menu_categories" | grep deleted
psql "postgresql://postgres:E\$\$athecode006@localhost:5432/postgres" -c "\d delivery_providers" | grep deleted
```

## New Tables Created

✅ **menu_integration_sync** - Platform sync tracking
✅ **branch_delivery_providers** - Branch-to-provider connections with priority
✅ **branch_platform_menus** - Branch-specific menu assignments
✅ **platform_integration_logs** - Comprehensive integration logging

## Enhanced Existing Tables

✅ **menu_categories** - Added `deleted_by` field and index
✅ **delivery_providers** - Added soft deletion support (`deleted_at`, `created_by`, `updated_by`, `deleted_by`)

## Database Connection

The schema updates are applied to the PostgreSQL database:
- **Host**: localhost:5432
- **Database**: postgres
- **User**: postgres
- **Password**: E$$athecode006

## Verification Queries

### Check All New Tables
```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename IN (
    'menu_integration_sync',
    'branch_delivery_providers',
    'branch_platform_menus',
    'platform_integration_logs'
)
ORDER BY tablename;
```

### Check Indexes Created
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN (
    'menu_integration_sync',
    'branch_delivery_providers',
    'branch_platform_menus',
    'platform_integration_logs'
)
ORDER BY tablename, indexname;
```

### Check Foreign Key Relationships
```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN (
    'menu_integration_sync',
    'branch_delivery_providers',
    'branch_platform_menus',
    'platform_integration_logs'
);
```

## Rollback Commands (if needed)

### Drop New Tables
```sql
-- CAUTION: This will delete all data in these tables
DROP TABLE IF EXISTS platform_integration_logs;
DROP TABLE IF EXISTS branch_platform_menus;
DROP TABLE IF EXISTS branch_delivery_providers;
DROP TABLE IF EXISTS menu_integration_sync;
```

### Remove Enhanced Fields
```sql
-- Remove added fields from existing tables
ALTER TABLE menu_categories DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE delivery_providers DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE delivery_providers DROP COLUMN IF EXISTS created_by;
ALTER TABLE delivery_providers DROP COLUMN IF EXISTS updated_by;
ALTER TABLE delivery_providers DROP COLUMN IF EXISTS deleted_by;
```

## Environment-Specific Notes

### Development Environment
- Use `npx prisma db push` for rapid iteration
- No migration files needed for development

### Production Environment
- Always use `npx prisma migrate deploy` for production
- Create proper migration files with `npx prisma migrate dev --name descriptive-name`
- Test migrations in staging environment first

### Schema File Location
The enhanced schema is located at:
```
/home/admin/restaurant-platform-remote-v2/backend/prisma/schema.prisma
```

## Success Indicators

✅ All 4 new tables created successfully
✅ All foreign key relationships established
✅ All indexes created for performance optimization
✅ Soft deletion support added to existing models
✅ Prisma client generates without errors
✅ No constraint violations or database errors

---

*These enhancements provide the foundation for enterprise-grade platform synchronization and delivery provider management capabilities.*