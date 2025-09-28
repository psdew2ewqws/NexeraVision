-- Restaurant Platform Seed Data: Companies
-- This file contains sample companies that are pre-loaded in the database

-- Note: This data is already included in restaurant_platform_complete_with_data.sql
-- This file is for reference and future seeding operations

-- Sample companies (already in database):
-- 1. Pizza Palace (dc3c6a10-96c6-4467-9778-313af66956af)
-- 2. Burger Hub  
-- 3. Sushi Express
-- 4. Coffee Corner
-- 5. Healthy Bites
-- 6. Dessert Dreams  
-- 7. Mediterranean Delight
-- 8. Fast Food Central
-- 9. Gourmet Kitchen
-- 10. Local Favorite

-- To add new companies, use the format:
-- INSERT INTO companies (id, name, slug, business_type, timezone, default_currency, status, created_at)
-- VALUES (
--   gen_random_uuid(),
--   'Restaurant Name',
--   'restaurant-name',
--   'restaurant',
--   'Asia/Amman',
--   'JOD',
--   'active',
--   NOW()
-- );

-- Then add branches, users, and menu items as needed.