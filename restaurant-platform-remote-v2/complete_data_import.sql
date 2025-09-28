-- Complete Safe Data Import Script - INSERT ONLY with UPSERT operations
-- NO DELETION ALLOWED - Preserves all existing data
-- Uses ON CONFLICT DO UPDATE to handle duplicates
-- Matches EXACT database schema

BEGIN;

-- Set statement timeout to prevent long-running operations
SET statement_timeout = '30min';

-- ================================
-- 1. COMPANIES - UPSERT (exact schema match)
-- ================================
INSERT INTO public.companies (id, name, slug, logo, business_type, timezone, default_currency, status, subscription_plan, subscription_expires_at, created_at, updated_at, deleted_at, created_by, updated_by) VALUES
('a13343e5-3109-4dc7-8f75-77982f0cfc7a', 'Main Officewqdascdscwsdcsc', 'main-officewqdascdscwsdcsc', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'trial', 'basic', NULL, '2025-08-30 18:41:53.167', '2025-08-30 18:41:56.151', '2025-08-30 18:41:56.151', NULL, NULL),
('bef6f0cf-40b3-491e-915c-40e4b0d9fed7', 'edsa', 'edsa', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'active', 'basic', NULL, '2025-08-30 18:50:18.368', '2025-08-30 19:50:14.738', NULL, NULL, NULL),
('82b4039a-f9f3-4648-b3e1-23397d83af61', 'Test Company B', 'test-company-b', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'active', 'basic', NULL, '2025-08-29 08:32:09.73', '2025-08-29 19:06:57.417', '2025-08-29 19:06:57.417', NULL, NULL),
('ee1b200f-bd2b-4d23-a3ff-1ce80ef90a0a', 'Main Office', 'main-office-bk1', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'trial', 'basic', NULL, '2025-08-29 19:07:13.194', '2025-08-29 19:07:20.805', '2025-08-29 19:07:20.805', NULL, NULL),
('5b7c4bdc-5649-49bd-9f6e-3a87a583d750', 'Main Office', '2s', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'active', 'basic', NULL, '2025-08-29 19:25:04.682', '2025-08-30 19:50:20.221', '2025-08-30 19:50:20.221', NULL, NULL),
('dc3c6a10-96c6-4467-9778-313af66956af', 'Default Restaurant', 'default-restaurant-bk', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'trial', 'basic', NULL, '2025-08-28 13:41:43.688', '2025-08-29 19:12:22.896', NULL, NULL, NULL),
('c382fdd5-1a60-4481-ad5f-65b575729b2c', 'Main Office', 'main-office1', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'active', 'basic', NULL, '2025-08-29 19:08:57.1', '2025-08-29 19:24:07.381', NULL, NULL, NULL),
('b4830b4e-be20-4bba-8b3e-a0f0d2213749', '112', '112-bk', NULL, 'restaurant', 'Asia/Amman', 'JOD', 'trial', 'basic', NULL, '2025-08-30 18:41:30.02', '2025-08-30 18:41:34.449', '2025-08-30 18:41:34.449', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  logo = EXCLUDED.logo,
  business_type = EXCLUDED.business_type,
  timezone = EXCLUDED.timezone,
  default_currency = EXCLUDED.default_currency,
  status = EXCLUDED.status,
  subscription_plan = EXCLUDED.subscription_plan,
  subscription_expires_at = EXCLUDED.subscription_expires_at,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by;

-- ================================
-- 2. BRANCHES - UPSERT (exact schema match)
-- ================================
INSERT INTO public.branches (id, company_id, name, phone, email, address, city, country, latitude, longitude, is_default, is_active, allows_online_orders, allows_pickup, allows_delivery, timezone, created_at, updated_at, deleted_at, created_by, updated_by, name_ar, open_time, close_time) VALUES
('40f863e7-b719-4142-8e94-724572002d9b', 'dc3c6a10-96c6-4467-9778-313af66956af', 'Main Office', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, true, true, true, true, 'Asia/Amman', '2025-08-27 09:04:10.179', '2025-08-27 09:04:10.179', NULL, NULL, NULL, 'Main Office', NULL, NULL),
('b558e6c0-0866-4acd-9693-7c0a502e9df7', 'dc3c6a10-96c6-4467-9778-313af66956af', 'test', '+962666666666', NULL, 'wqejnwkp39', 'amma', 'Jordan', 31.93055735, 36.00758411, false, true, false, true, true, 'Asia/Amman', '2025-08-28 21:15:30.596', '2025-08-29 08:29:36.491', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', '1ec02dec-9a81-473a-9cdf-31454e2e959a', 'test', '22:00', '22:09'),
('f97ceb38-c797-4d1c-9ff4-89d9f8da5235', '82b4039a-f9f3-4648-b3e1-23397d83af61', 'Company B Main Branch', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, true, true, true, true, 'Asia/Amman', '2025-08-29 08:32:37.531', '2025-08-29 08:32:37.531', NULL, NULL, NULL, 'الفرع الرئيسي ب', NULL, NULL),
('f3d4114a-0e39-43fd-aa98-01b57df7efd0', '82b4039a-f9f3-4648-b3e1-23397d83af61', 'Company B Secondary', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, true, true, true, true, 'Asia/Amman', '2025-08-29 08:32:37.531', '2025-08-29 08:32:37.531', NULL, NULL, NULL, 'الفرع الثانوي ب', NULL, NULL),
('eb4d5daa-c58c-4369-a454-047db8ac3f50', 'dc3c6a10-96c6-4467-9778-313af66956af', 'Default Restaurant', '+962444444441', NULL, '21313', 'amma', 'Jordan', 31.94333322, 35.91626025, false, true, true, true, true, 'Asia/Amman', '2025-08-29 19:48:09.722', '2025-08-29 19:48:09.722', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, 'الفرع الرئيسي', '19:49', '23:48'),
('c91db38e-ef89-44c6-8f7d-57de5e91d903', 'dc3c6a10-96c6-4467-9778-313af66956af', 'ss', '+962444444444', NULL, 'wqejnwkp39', 'amma', 'Jordan', 32.01672005, 35.85926868, false, true, true, true, true, 'Asia/Amman', '2025-08-30 18:24:57.476', '2025-08-30 18:24:57.476', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, 'ss', '20:24', '12:24')
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  allows_online_orders = EXCLUDED.allows_online_orders,
  allows_pickup = EXCLUDED.allows_pickup,
  allows_delivery = EXCLUDED.allows_delivery,
  timezone = EXCLUDED.timezone,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by,
  name_ar = EXCLUDED.name_ar,
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time;

-- ================================
-- 3. LICENSES - UPSERT (exact schema match)
-- ================================
INSERT INTO public.licenses (id, company_id, status, start_date, expires_at, features, created_at, updated_at, created_by, updated_by, total_days, last_checked, renewed_at, days_remaining) VALUES
('b037f11f-b98e-4dd2-a5e6-b8cc37cf58b7', '5b7c4bdc-5649-49bd-9f6e-3a87a583d750', 'active', '2025-08-29 19:25:04.684', '2026-12-27 19:25:04.684', '["analytics", "multi_location"]', '2025-08-29 19:25:04.687', '2025-08-29 19:25:23.167', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', 485, '2025-08-29 19:25:23.164', '2025-08-29 19:25:23.164', 485),
('d6a803ce-c7a3-496c-b460-c26fcd8e59be', 'b4830b4e-be20-4bba-8b3e-a0f0d2213749', 'active', '2025-08-30 18:41:30.02', '2025-09-29 18:41:30.02', '["basic"]', '2025-08-30 18:41:30.022', '2025-08-30 18:41:30.022', NULL, NULL, 30, '2025-08-30 18:41:30.02', NULL, 30),
('eef7b459-8a50-41b9-85f9-824b7c276ea6', 'a13343e5-3109-4dc7-8f75-77982f0cfc7a', 'active', '2025-08-30 18:41:53.167', '2025-09-29 18:41:53.167', '["basic"]', '2025-08-30 18:41:53.168', '2025-08-30 18:41:53.168', NULL, NULL, 30, '2025-08-30 18:41:53.167', NULL, 30),
('lic_sample_001', 'dc3c6a10-96c6-4467-9778-313af66956af', 'active', '2024-09-13 17:15:55.124', '2026-10-23 17:15:55.124', '["pos_integration", "analytics", "multi_branch"]', '2024-09-13 17:15:55.124', '2025-08-29 18:24:23.817', '1ec02dec-9a81-473a-9cdf-31454e2e959a', '1ec02dec-9a81-473a-9cdf-31454e2e959a', 420, '2025-08-29 18:24:23.816', '2025-08-29 18:24:23.816', 770),
('adaaf5c8-28f7-402f-843a-029e1e297f45', 'ee1b200f-bd2b-4d23-a3ff-1ce80ef90a0a', 'active', '2025-08-29 19:07:13.198', '2025-09-28 19:07:13.198', '["basic"]', '2025-08-29 19:07:13.199', '2025-08-29 19:07:13.199', NULL, NULL, 30, '2025-08-29 19:07:13.198', NULL, 30),
('a91c9849-509f-4213-aef4-907bd1b2d050', 'bef6f0cf-40b3-491e-915c-40e4b0d9fed7', 'active', '2025-08-30 18:50:18.37', '2027-01-27 18:50:18.37', '["analytics", "multi_location"]', '2025-08-30 18:50:18.372', '2025-08-30 21:25:38.805', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', 515, '2025-08-30 21:25:38.802', '2025-08-30 21:25:38.802', 515),
('38da34d2-3e21-4e14-a8c5-6b39c4cdde31', 'c382fdd5-1a60-4481-ad5f-65b575729b2c', 'active', '2025-08-29 19:08:57.106', '2026-03-27 19:08:57.106', '["analytics", "multi_location"]', '2025-08-29 19:08:57.109', '2025-08-30 21:25:42.666', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', 209, '2025-08-30 21:25:42.664', '2025-08-30 21:25:42.664', 210),
('4452ed54-28a6-446e-9281-651e6b5b0ec2', 'dc3c6a10-96c6-4467-9778-313af66956af', 'active', '2025-08-09 13:54:01.426', '2026-02-05 13:54:01.426', '["analytics", "multi_location"]', '2025-08-09 13:54:01.426', '2025-08-30 21:25:46.163', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', 159, '2025-08-30 21:25:46.155', '2025-08-30 21:25:46.155', 180)
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  expires_at = EXCLUDED.expires_at,
  features = EXCLUDED.features,
  updated_at = EXCLUDED.updated_at,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by,
  total_days = EXCLUDED.total_days,
  last_checked = EXCLUDED.last_checked,
  renewed_at = EXCLUDED.renewed_at,
  days_remaining = EXCLUDED.days_remaining;

-- ================================
-- 4. MENU CATEGORIES - UPSERT (exact schema: image instead of image_url, display_number instead of sort_order)
-- ================================
INSERT INTO public.menu_categories (id, company_id, name, description, image, display_number, is_active, created_at, updated_at, deleted_at, created_by, updated_by) VALUES
('0d819024-b6c2-47ac-aa0f-177f020665cc', 'dc3c6a10-96c6-4467-9778-313af66956af', '{"ar": "المقبلات", "en": "Appetizers"}', '{"ar": "مقبلات لذيذة", "en": "Delicious starters"}', NULL, 1, true, '2025-08-30 05:24:22.847', '2025-08-30 18:21:41.575', NULL, NULL, NULL),
('f11f4a8e-1797-40c7-8a97-86e2da02b15d', 'dc3c6a10-96c6-4467-9778-313af66956af', '{"ar": "3", "en": "3"}', NULL, NULL, 4, false, '2025-08-30 09:58:39.315', '2025-08-30 14:26:39.41', NULL, NULL, NULL),
('44444444-4444-4444-4444-444444444444', '82b4039a-f9f3-4648-b3e1-23397d83af61', '{"ar": "حلويات", "en": "Desserts"}', '{"ar": "حلويات لذيذة", "en": "Sweet desserts"}', NULL, 4, false, '2025-08-29 23:21:26.675', '2025-08-30 12:08:39.254', NULL, NULL, NULL),
('33333333-3333-3333-3333-333333333333', '82b4039a-f9f3-4648-b3e1-23397d83af61', '{"ar": "مشروبات", "en": "Beverages"}', '{"ar": "مشروبات باردة وساخنة", "en": "Cold and hot drinks"}', NULL, 3, false, '2025-08-29 23:21:26.675', '2025-08-30 12:08:40.136', NULL, NULL, NULL),
('22222222-2222-2222-2222-222222222222', '82b4039a-f9f3-4648-b3e1-23397d83af61', '{"ar": "بيتزا", "en": "Pizza"}', '{"ar": "بيتزا طازجة", "en": "Fresh pizza"}', NULL, 2, false, '2025-08-29 23:21:26.675', '2025-08-30 12:08:40.844', NULL, NULL, NULL),
('11111111-1111-1111-1111-111111111111', '82b4039a-f9f3-4648-b3e1-23397d83af61', '{"ar": "برجر", "en": "Burgers"}', '{"ar": "برجر لذيذ", "en": "Delicious burgers"}', NULL, 1, false, '2025-08-29 23:21:26.675', '2025-08-30 12:08:41.358', NULL, NULL, NULL),
('c6baef0a-278d-4eef-881e-48ab68911dfe', 'dc3c6a10-96c6-4467-9778-313af66956af', '{"ar": "الأطباق الرئيسية", "en": "Main Dishes"}', '{"ar": "أطباقنا الرئيسية المميزة", "en": "Our signature main courses"}', NULL, 2, false, '2025-08-30 05:24:22.847', '2025-08-30 14:26:43.489', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  display_number = EXCLUDED.display_number,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by;

-- ================================
-- 5. MENU PRODUCTS - UPSERT (exact schema match)
-- Column mappings:
-- platform_pricing → pricing (jsonb)
-- cost_price → cost (numeric)
-- preparation_time_minutes → preparation_time (integer)
-- is_featured → pricing_method (integer)
-- availability_status → selling_method (integer)
-- barcode → slug (text)
-- metadata dropped as it doesn't exist
-- ================================
INSERT INTO public.menu_products (id, company_id, branch_id, category_id, name, description, image, slug, base_price, pricing, cost, status, priority, preparation_time, pricing_method, selling_method, tags, created_at, updated_at, deleted_at, created_by, updated_by, images) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '22222222-2222-2222-2222-222222222222', '{"ar": "بيبروني سوبريم", "en": "Pepperoni Supreme"}', '{"ar": "بيبروني، فطر، فلفل حلو", "en": "Pepperoni, mushrooms, bell peppers"}', NULL, NULL, 21.99, '{"talabat": 22.99, "website": 21.99, "uber_eats": 23.99}', 0.00, 1, 2, 22, 1, 1, '{pepperoni,meat}', '2025-08-29 23:22:08.065', '2025-08-29 23:22:08.065', NULL, NULL, NULL, '{}'),
('32f76b50-5ed6-4e4f-bc57-b3038ec24ddc', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '11111111-1111-1111-1111-111111111111', '{"ar": "حمص", "en": "Hummus"}', '{"ar": "غموس الحمص التقليدي بالطحينة", "en": "Classic chickpea dip with tahini"}', NULL, NULL, 8.50, '{"dine_in": 8.50, "takeout": 7.50, "delivery": 9.50}', 3.20, 1, 10, 5, 1, 1, '{vegetarian,healthy,popular}', '2025-08-30 05:22:23.665', '2025-08-30 05:22:23.665', NULL, NULL, NULL, '{}'),
('bae9d88e-16d8-4c92-b3f9-a0e94ece63f5', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '11111111-1111-1111-1111-111111111111', '{"ar": "أجنحة الدجاج", "en": "Buffalo Wings"}', '{"ar": "أجنحة دجاج حارة مع الجبنة الزرقاء", "en": "Spicy chicken wings with blue cheese"}', NULL, NULL, 12.99, '{"dine_in": 12.99, "takeout": 11.99, "delivery": 13.99}', 5.50, 1, 15, 12, 1, 1, '{spicy,popular,chicken}', '2025-08-30 05:22:23.665', '2025-08-30 05:22:23.665', NULL, NULL, NULL, '{}'),
('5dc9dad0-ae58-4831-b73c-252cd62ca888', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '22222222-2222-2222-2222-222222222222', '{"ar": "صدر دجاج مشوي", "en": "Grilled Chicken Breast"}', '{"ar": "صدر دجاج مشوي بالأعشاب", "en": "Juicy grilled chicken with herbs"}', NULL, NULL, 18.50, '{"dine_in": 18.50, "takeout": 17.50, "delivery": 19.50}', 8.75, 1, 20, 18, 1, 1, '{healthy,protein,grilled}', '2025-08-30 05:22:23.665', '2025-08-30 05:22:23.665', NULL, NULL, NULL, '{}'),
('89f57d6c-2efe-4ddc-84e4-919cbcf94470', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '22222222-2222-2222-2222-222222222222', '{"ar": "برغر لحم", "en": "Beef Burger"}', '{"ar": "برغر لحم أنجوس مع البطاطس", "en": "Angus beef burger with fries"}', NULL, NULL, 16.75, '{"dine_in": 16.75, "takeout": 15.75, "delivery": 17.75}', 7.25, 1, 25, 15, 1, 1, '{beef,popular,burger}', '2025-08-30 05:22:23.665', '2025-08-30 05:22:23.665', NULL, NULL, NULL, '{}'),
('2c9a1a8c-c145-46f2-a8ed-c307ea6643f5', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '33333333-3333-3333-3333-333333333333', '{"ar": "كيك الشوكولاتة", "en": "Chocolate Cake"}', '{"ar": "كيك الشوكولاتة الغني بالطبقات", "en": "Rich chocolate layer cake"}', NULL, NULL, 7.99, '{"dine_in": 7.99, "takeout": 6.99, "delivery": 8.99}', 2.50, 1, 5, 3, 1, 1, '{dessert,chocolate,sweet}', '2025-08-30 05:22:23.665', '2025-08-30 05:22:23.665', NULL, NULL, NULL, '{}'),
('ddfd67af-3b93-4033-b8e3-a7ab1e4faf4d', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, '0d819024-b6c2-47ac-aa0f-177f020665cc', '{"ar": "wqe", "en": "wqw"}', '{"ar": "qw", "en": "wqe"}', NULL, NULL, 5.00, '{"careem": 1, "talabat": 1, "website": 1, "callcenter": 1}', 0.00, 1, 999, 12, 1, 1, '{2}', '2025-08-30 13:16:41.085', '2025-08-30 13:16:41.085', NULL, NULL, NULL, '{}'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '11111111-1111-1111-1111-111111111111', '{"ar": "دجاج ديلوكس", "en": "Chicken Deluxe"}', '{"ar": "صدر دجاج مشوي مع صوص خاص", "en": "Grilled chicken breast with special sauce"}', NULL, NULL, 13.99, '{"website": 13.99, "uber_eats": 15.99}', 0.00, 0, 2, 10, 1, 1, '{chicken,grilled}', '2025-08-29 23:22:08.065', '2025-08-30 15:10:24.687', NULL, NULL, NULL, '{}'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '11111111-1111-1111-1111-111111111111', '{"ar": "برجر لحم كلاسيكي", "en": "Classic Beef Burger"}', '{"ar": "شريحة لحم عصارة مع خس وطماطم وبصل", "en": "Juicy beef patty with lettuce, tomato, onion"}', NULL, NULL, 15.99, '{"website": 15.99, "doordash": 16.99, "uber_eats": 17.99}', 0.00, 0, 1, 12, 1, 1, '{popular,beef}', '2025-08-29 23:22:08.065', '2025-08-30 15:10:24.687', NULL, NULL, NULL, '{}'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '22222222-2222-2222-2222-222222222222', '{"ar": "بيتزا مارجريتا", "en": "Margherita Pizza"}', '{"ar": "طماطم طازجة، موتزاريلا، ريحان", "en": "Fresh tomato, mozzarella, basil"}', NULL, NULL, 18.99, '{"website": 18.99, "doordash": 20.99}', 0.00, 0, 1, 20, 1, 1, '{vegetarian,popular}', '2025-08-29 23:22:08.065', '2025-08-30 15:10:24.687', NULL, NULL, NULL, '{}'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, '33333333-3333-3333-3333-333333333333', '{"ar": "عصير برتقال طازج", "en": "Fresh Orange Juice"}', '{"ar": "عصير برتقال معصور طازجاً", "en": "Freshly squeezed orange juice"}', NULL, NULL, 4.99, '{"website": 4.99, "uber_eats": 5.99}', 0.00, 0, 1, 2, 1, 1, '{fresh,vitamin-c}', '2025-08-29 23:22:08.065', '2025-08-30 15:10:24.687', NULL, NULL, NULL, '{}'),
('3d687360-7de7-4bc9-95bf-e3a3861a64a9', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, '0d819024-b6c2-47ac-aa0f-177f020665cc', '{"ar": "ss", "en": "ss"}', '{"ar": "ss", "en": "ss"}', NULL, NULL, 1.00, '{"careem": 1, "talabat": 1, "website": 1, "callcenter": 1, "customChannels": []}', 0.00, 1, 1, 15, 1, 1, '{}', '2025-08-30 21:29:09.926', '2025-08-30 21:29:09.926', NULL, NULL, NULL, '{}')
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  branch_id = EXCLUDED.branch_id,
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug,
  base_price = EXCLUDED.base_price,
  pricing = EXCLUDED.pricing,
  cost = EXCLUDED.cost,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  preparation_time = EXCLUDED.preparation_time,
  pricing_method = EXCLUDED.pricing_method,
  selling_method = EXCLUDED.selling_method,
  tags = EXCLUDED.tags,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by,
  images = EXCLUDED.images;

-- ================================
-- 6. USERS - UPSERT (exact schema match)
-- ================================
INSERT INTO public.users (id, name, email, phone, avatar_url, password_hash, pin, email_verified_at, role, status, company_id, branch_id, language, timezone, last_login_at, last_login_ip, failed_login_attempts, locked_until, must_change_password, created_at, updated_at, deleted_at, created_by, updated_by, first_name, last_name, username) VALUES
('9caee1f8-547d-435c-9c66-885a52ac373a', 'Issa Dalu Shawerma 3a saj', '962795943016_1756456703665@placeholder.local', '+962795943016', NULL, '$2a$10$Zrz1NmogqnMzv9IMXVuCHOepv8lNWYlSPgKlT6YoTFmtOwInfRPCS', NULL, NULL, 'company_owner', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-29 08:38:23.666', '2025-08-29 08:56:37.471', '2025-08-29 08:56:37.471', '1ec02dec-9a81-473a-9cdf-31454e2e959a', '1ec02dec-9a81-473a-9cdf-31454e2e959a', 'Issa Dalu', 'Shawerma 3a saj', NULL),
('d9136bdc-392e-445e-8ed8-60d8b0c979b6', 'Company B Owner', 'owner@companyb.com', NULL, NULL, '$2a$12$vkPBZ/RKiS6xY/fwj/QiU.ixOJN4sxpbg7QjKAtu5Bz2K83GIBDQm', NULL, NULL, 'company_owner', 'active', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-29 08:32:29.076', '2025-08-29 08:59:42.945', '2025-08-29 08:59:42.945', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, NULL, NULL),
('dfed55fa-5890-426d-9960-8ee49318d18a', 'test2', 'step2@criptext.com', '+962795943016', NULL, '$2a$10$GB9FEmwSzH9ToXVbeZc06uK3klhyZgKIy3HipHI2nW/puLDYoGRHC', NULL, NULL, 'company_owner', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-29 09:34:55.462', '2025-08-29 09:34:55.462', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, NULL, NULL, 'issadalu2'),
('ded34072-ae63-4a84-8f11-3a5dcd4bcb9a', 'test2', 'step3@criptext.com', '+962795943016', NULL, '$2a$10$tpT7qI93474TQSH7PzYFlu7RJE6iah4g2tjXQCS0n8Dsv5F6ltuX2', NULL, NULL, 'call_center', 'active', 'c382fdd5-1a60-4481-ad5f-65b575729b2c', NULL, 'en', 'Asia/Amman', '2025-08-29 19:28:07.428', NULL, 0, NULL, false, '2025-08-29 19:27:53.731', '2025-08-29 19:28:07.429', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, NULL, NULL, 'issa2'),
('3131d1ef-ca70-4385-b142-770727c8d5a7', 'Main Office', 'step1@criptext.com', '+962795943016', NULL, '$2a$10$nk8iFUSE2RLFP2EleGaAN.JtouhEgBwiBXcA2w0I0OsNgg753zj4O', NULL, NULL, 'company_owner', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, 'en', 'Asia/Amman', '2025-08-29 20:35:58.252', NULL, 0, NULL, false, '2025-08-29 09:00:09.037', '2025-08-29 20:35:58.253', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, NULL, NULL, 'jess'),
('ff25b5d8-036a-4ed9-b909-e001addf1141', 'ejewp owie', '962694358332_1756417011721@placeholder.local', '+962694358332', NULL, '$2a$10$DqPdz8ZyZSxsi4iV.jtLfOvFTJEAr3LlVXVRWpA1xkxE4k4Dgltlq', NULL, NULL, 'call_center', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-28 21:36:51.723', '2025-08-29 20:36:33.549', '2025-08-29 20:36:33.549', '1ec02dec-9a81-473a-9cdf-31454e2e959a', '3131d1ef-ca70-4385-b142-770727c8d5a7', 'ejewp', 'owie', NULL),
('4fcb92e6-d1c2-4583-8ce7-172227a2a4e8', 'Super Admin', 'admin@platform.com', NULL, NULL, '$2b$12$4vT0Z4.ZXgpKxqn1O4b3Ve5jCO/i5lSbExDsOxT7Iz6J1Jx2E/UOS', NULL, NULL, 'super_admin', 'active', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-30 05:07:35.457', '2025-08-30 05:07:35.457', NULL, NULL, NULL, NULL, NULL, NULL),
('e4282c30-b3b9-4168-bdb1-cb2a7bfcd20b', 'Main Office', 'a1dmin@restau1rantplatform.com', '+962444444444', NULL, '$2a$10$ijLhRFTauQToagV08ArQHe4EeGQus2w7AQzQrXdie4lq0ai8LfEhK', NULL, NULL, 'branch_manager', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-30 12:04:22.129', '2025-08-30 12:04:37.007', '2025-08-30 12:04:37.007', '1ec02dec-9a81-473a-9cdf-31454e2e959a', '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, NULL, 'addas'),
('test-menu-user-001', 'Test Menu User', 'test@menu.com', NULL, NULL, '$2a$12$UYp5LE7.oSp9E83LWcxBCuBwmP8SSwuv0VbTPJeMBGJqihgyMKrMC', NULL, NULL, 'company_owner', 'active', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, 'en', 'Asia/Amman', '2025-08-30 12:07:54.682', NULL, 0, NULL, false, '2025-08-29 23:32:49.478', '2025-08-30 12:07:54.683', NULL, NULL, NULL, 'Test', 'User', 'testuser'),
('86cf1cd3-0213-4671-bfa5-917c781d7871', 'reziq', 'riz@gmail.com', '+962566666666', NULL, '$2a$10$IMCgZu/ccda/ZgdjfdRQeOx6Y9Y2H6ttCc2tlC1pFpzRrHUrK/RDq', NULL, NULL, 'call_center', 'active', '82b4039a-f9f3-4648-b3e1-23397d83af61', NULL, 'en', 'Asia/Amman', '2025-08-30 12:11:33.119', NULL, 0, NULL, false, '2025-08-30 12:11:01.201', '2025-08-30 12:11:33.12', NULL, 'test-menu-user-001', NULL, NULL, NULL, 'reziq'),
('1ec02dec-9a81-473a-9cdf-31454e2e959a', 'System Administrator', 'admin@restaurantplatform.com', NULL, NULL, '$2a$12$vkPBZ/RKiS6xY/fwj/QiU.ixOJN4sxpbg7QjKAtu5Bz2K83GIBDQm', NULL, '2025-08-27 09:04:10.179', 'super_admin', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', '40f863e7-b719-4142-8e94-724572002d9b', 'en', 'Asia/Amman', '2025-08-30 12:12:06.608', NULL, 0, NULL, true, '2025-08-27 09:04:10.179', '2025-08-30 12:12:06.609', NULL, NULL, NULL, 'System', 'Administrator', NULL),
('3ff50f61-1d76-4660-b390-fd8dc12cf0ed', 'test', 'a213dmin@restaurantplatform.com', '+962444444443', NULL, '$2a$10$W2rfYoozJ/B.69IOsaSqGu4mH63PichU.cER.F3nuHJzzSnvPOpTC', NULL, NULL, 'super_admin', 'active', 'dc3c6a10-96c6-4467-9778-313af66956af', NULL, 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-08-30 18:26:31.855', '2025-08-30 18:26:31.855', NULL, '1ec02dec-9a81-473a-9cdf-31454e2e959a', NULL, NULL, NULL, '5325rewf')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  avatar_url = EXCLUDED.avatar_url,
  password_hash = EXCLUDED.password_hash,
  pin = EXCLUDED.pin,
  email_verified_at = EXCLUDED.email_verified_at,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  company_id = EXCLUDED.company_id,
  branch_id = EXCLUDED.branch_id,
  language = EXCLUDED.language,
  timezone = EXCLUDED.timezone,
  last_login_at = EXCLUDED.last_login_at,
  last_login_ip = EXCLUDED.last_login_ip,
  failed_login_attempts = EXCLUDED.failed_login_attempts,
  locked_until = EXCLUDED.locked_until,
  must_change_password = EXCLUDED.must_change_password,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  username = EXCLUDED.username;

-- ================================
-- COMMIT TRANSACTION
-- ================================
COMMIT;

-- ================================
-- VERIFICATION REPORT
-- ================================
SELECT 'IMPORT COMPLETE - VERIFICATION SUMMARY' as status;
SELECT 'Companies:', COUNT(*) FROM public.companies;
SELECT 'Branches:', COUNT(*) FROM public.branches;
SELECT 'Users:', COUNT(*) FROM public.users;
SELECT 'Licenses:', COUNT(*) FROM public.licenses;
SELECT 'Menu Categories:', COUNT(*) FROM public.menu_categories;
SELECT 'Menu Products:', COUNT(*) FROM public.menu_products;