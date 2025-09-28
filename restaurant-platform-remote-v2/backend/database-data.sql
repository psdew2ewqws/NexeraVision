pg_dump: warning: there are circular foreign-key constraints on this table:
pg_dump: detail: template_builder_templates
pg_dump: hint: You might not be able to restore the dump without using --disable-triggers or temporarily dropping the constraints.
pg_dump: hint: Consider using a full dump instead of a --data-only dump to avoid this problem.
pg_dump: warning: there are circular foreign-key constraints on this table:
pg_dump: detail: template_builder_components
pg_dump: hint: You might not be able to restore the dump without using --disable-triggers or temporarily dropping the constraints.
pg_dump: hint: Consider using a full dump instead of a --data-only dump to avoid this problem.
--
-- PostgreSQL database dump
--

\restrict BUWboGn9TFSlVM5c6mcdpFfDdV5L3JW3LChoy0ay1AFXEcFehhhamy2UJqmMw0s

-- Dumped from database version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.companies VALUES ('test-company-uuid-123456789', 'Test Restaurant Company', 'test-restaurant', NULL, 'RESTAURANT', 'Asia/Amman', 'JOD', 'active', 'basic', NULL, '2025-09-28 22:09:24.608', '2025-09-28 22:09:24.608', NULL, NULL, NULL);


--
-- Data for Name: delivery_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: jordan_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: _DeliveryProviderToJordanLocation; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.branches VALUES ('test-branch-uuid-123456789', 'test-company-uuid-123456789', 'Main Branch', '+962788888888', NULL, '456 Branch Street, Amman, Jordan', NULL, NULL, NULL, NULL, false, true, true, true, true, 'Asia/Amman', '2025-09-28 22:09:24.617', '2025-09-28 22:09:24.617', NULL, NULL, NULL, 'الفرع الرئيسي', NULL, NULL, NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES ('0a9c293c-4bac-448e-baed-3c1430332fe8', 'Branch Manager', 'manager@test.com', '+962777777777', NULL, '$2a$10$NDyety4cfkgdeOjAXNyDHuTv1qDQml.wnEuAQ0nGWWRRpTgmOvjku', NULL, NULL, 'branch_manager', 'active', 'test-company-uuid-123456789', 'test-branch-uuid-123456789', 'en', 'Asia/Amman', NULL, NULL, 0, NULL, false, '2025-09-28 22:09:24.886', '2025-09-28 22:09:24.886', NULL, NULL, NULL, NULL, NULL, 'manager');
INSERT INTO public.users VALUES ('884627ea-f154-48e3-a756-5f3b84f13594', 'Test Admin', 'admin@test.com', '+962799999999', NULL, '$2a$10$NDyety4cfkgdeOjAXNyDHuTv1qDQml.wnEuAQ0nGWWRRpTgmOvjku', NULL, NULL, 'super_admin', 'active', 'test-company-uuid-123456789', NULL, 'en', 'Asia/Amman', '2025-09-28 22:40:28.942', '::1', 0, NULL, false, '2025-09-28 22:09:24.877', '2025-09-28 22:40:28.946', NULL, NULL, NULL, NULL, NULL, 'admin');


--
-- Data for Name: ai_generation_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: print_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_template_optimization; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: availability_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: branch_availabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: availability_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: availability_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: company_provider_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: branch_provider_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: careem_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: careem_webhook_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: company_logos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: company_tax_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: delivery_error_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: delivery_provider_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: delivery_provider_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: global_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: delivery_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: license_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: license_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.licenses VALUES ('0d0abd95-435c-4274-8bd7-5f0cf899bac1', 'test-company-uuid-123456789', 'active', '2025-09-28 22:09:24.917', '2026-09-28 22:09:24.917', '{"hasDelivery": true, "hasInventory": true, "hasMultiLanguage": true, "hasTemplateBuilder": true, "hasAdvancedPrinting": true}', '2025-09-28 22:09:24.919', '2025-09-28 22:09:24.919', NULL, NULL, 0, NULL, NULL, 30);


--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.menu_categories VALUES ('cc18f7b2-0944-42da-8de9-79ce7cec2d9d', 'test-company-uuid-123456789', '{"ar": "Appetizers", "en": "Appetizers"}', NULL, NULL, 1, true, '2025-09-28 22:09:24.895', '2025-09-28 22:09:24.895', NULL, NULL, NULL);
INSERT INTO public.menu_categories VALUES ('fb859245-3cae-4011-a490-a5c0f566bdf7', 'test-company-uuid-123456789', '{"ar": "Main Courses", "en": "Main Courses"}', NULL, NULL, 2, true, '2025-09-28 22:09:24.901', '2025-09-28 22:09:24.901', NULL, NULL, NULL);
INSERT INTO public.menu_categories VALUES ('587c7fb8-7ef8-4f13-a197-21aa7115bb8e', 'test-company-uuid-123456789', '{"ar": "Desserts", "en": "Desserts"}', NULL, NULL, 3, true, '2025-09-28 22:09:24.907', '2025-09-28 22:09:24.907', NULL, NULL, NULL);
INSERT INTO public.menu_categories VALUES ('58454313-07a7-4445-9f51-4dd1e848fb4d', 'test-company-uuid-123456789', '{"ar": "Beverages", "en": "Beverages"}', NULL, NULL, 4, true, '2025-09-28 22:09:24.913', '2025-09-28 22:09:24.913', NULL, NULL, NULL);


--
-- Data for Name: menu_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.menu_products VALUES ('658748f2-7856-4a93-b675-4118660f2d52', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "سلطة سيزر", "en": "Caesar Salad"}', '{"ar": "خس روماني طازج مع جبنة البارميزان", "en": "Fresh romaine lettuce with parmesan"}', NULL, NULL, 8.99, '{"platforms": {"dineIn": 8.99, "delivery": 9.99, "takeaway": 8.99}, "defaultPrice": 8.99}', 0.00, 1, 0, 15, 1, 1, '{vegetarian,salad}', '2025-09-28 22:41:03.48', '2025-09-28 22:41:03.48', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('48dcc15e-7d1b-4960-9cbc-d811b88e589a', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "أجنحة الدجاج", "en": "Chicken Wings"}', '{"ar": "أجنحة بوفالو حارة", "en": "Spicy buffalo wings"}', NULL, NULL, 12.99, '{"platforms": {"dineIn": 12.99, "delivery": 14.99, "takeaway": 12.99}, "defaultPrice": 12.99}', 0.00, 1, 0, 15, 1, 1, '{spicy,chicken}', '2025-09-28 22:41:03.488', '2025-09-28 22:41:03.488', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('0f16b79f-d237-46fa-8eb1-782de68b2fdd', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "دجاج مشوي", "en": "Grilled Chicken"}', '{"ar": "صدر دجاج مشوي متبل", "en": "Marinated grilled chicken breast"}', NULL, NULL, 18.99, '{"platforms": {"dineIn": 18.99, "delivery": 20.99, "takeaway": 18.99}, "defaultPrice": 18.99}', 0.00, 1, 0, 15, 1, 1, '{grilled,chicken,main}', '2025-09-28 22:41:03.498', '2025-09-28 22:41:03.498', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('028e2cbf-494b-4921-bda3-8c91a1c87cae', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "برجر لحم البقر", "en": "Beef Burger"}', '{"ar": "برجر لحم بقري مع البطاطس", "en": "Juicy beef burger with fries"}', NULL, NULL, 15.99, '{"platforms": {"dineIn": 15.99, "delivery": 17.99, "takeaway": 15.99}, "defaultPrice": 15.99}', 0.00, 1, 0, 15, 1, 1, '{beef,burger}', '2025-09-28 22:41:03.504', '2025-09-28 22:41:03.504', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('8d75b31a-e699-44c7-a775-c01157d47bd8', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "كعكة الشوكولاتة", "en": "Chocolate Cake"}', '{"ar": "كعكة شوكولاتة غنية", "en": "Rich chocolate layer cake"}', NULL, NULL, 6.99, '{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}', 0.00, 1, 0, 15, 1, 1, '{dessert,chocolate}', '2025-09-28 22:41:03.508', '2025-09-28 22:41:03.508', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('e3d5b091-d3c1-49ce-aee0-4f611bcb075a', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "آيس كريم", "en": "Ice Cream"}', '{"ar": "آيس كريم فانيليا", "en": "Vanilla ice cream"}', NULL, NULL, 4.99, '{"platforms": {"dineIn": 4.99, "delivery": 5.99, "takeaway": 4.99}, "defaultPrice": 4.99}', 0.00, 1, 0, 15, 1, 1, '{dessert,ice-cream}', '2025-09-28 22:41:03.513', '2025-09-28 22:41:03.513', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('239f3903-deb5-4cab-bbf6-bd7d742e8b8c', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "عصير البرتقال", "en": "Orange Juice"}', '{"ar": "عصير برتقال طازج", "en": "Fresh squeezed orange juice"}', NULL, NULL, 3.99, '{"platforms": {"dineIn": 3.99, "delivery": 4.99, "takeaway": 3.99}, "defaultPrice": 3.99}', 0.00, 1, 0, 15, 1, 1, '{juice,fresh}', '2025-09-28 22:41:03.516', '2025-09-28 22:41:03.516', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('adbe8b92-865c-4dff-af91-722cbc91e54d', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "كولا", "en": "Cola"}', '{"ar": "مشروب كولا منعش", "en": "Refreshing cola drink"}', NULL, NULL, 2.99, '{"platforms": {"dineIn": 2.99, "delivery": 3.99, "takeaway": 2.99}, "defaultPrice": 2.99}', 0.00, 1, 0, 15, 1, 1, '{soda,cold}', '2025-09-28 22:41:03.521', '2025-09-28 22:41:03.521', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('0f571d1b-7a92-4565-8b44-929c0bbf983c', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "حمص مع خبز البيتا", "en": "Hummus with Pita"}', '{"ar": "غموس الحمص التقليدي مع خبز البيتا الدافئ", "en": "Traditional chickpea dip with warm pita bread"}', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', NULL, 7.99, '{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}', 0.00, 1, 0, 10, 1, 1, '{vegetarian,mediterranean,starter}', '2025-09-28 22:50:32.867', '2025-09-28 22:50:32.867', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('93b2412e-f848-4fdd-8c85-680343f05dc3', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "أصابع الموتزاريلا", "en": "Mozzarella Sticks"}', '{"ar": "جبنة موتزاريلا مقلية مقرمشة مع صلصة المارينارا", "en": "Crispy fried mozzarella with marinara sauce"}', 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400', NULL, 9.99, '{"platforms": {"dineIn": 9.99, "delivery": 10.99, "takeaway": 9.99}, "defaultPrice": 9.99}', 0.00, 1, 0, 12, 1, 1, '{fried,cheese,vegetarian}', '2025-09-28 22:50:32.882', '2025-09-28 22:50:32.882', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('883da52e-8c3f-4530-a0dd-beef367532c5', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "بروشيتا", "en": "Bruschetta"}', '{"ar": "خبز محمص مع الطماطم والريحان", "en": "Toasted bread topped with tomatoes and basil"}', 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400', NULL, 8.49, '{"platforms": {"dineIn": 8.49, "delivery": 9.49, "takeaway": 8.49}, "defaultPrice": 8.49}', 0.00, 1, 0, 8, 1, 1, '{italian,vegetarian,fresh}', '2025-09-28 22:50:32.886', '2025-09-28 22:50:32.886', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('d804c369-8a7a-4375-9919-f761b3ac3814', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "حلقات الكاليماري", "en": "Calamari Rings"}', '{"ar": "حلقات الحبار المقلية الذهبية مع أيولي الليمون", "en": "Golden fried squid rings with lemon aioli"}', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400', NULL, 12.99, '{"platforms": {"dineIn": 12.99, "delivery": 14.99, "takeaway": 12.99}, "defaultPrice": 12.99}', 0.00, 1, 0, 15, 1, 1, '{seafood,fried,crispy}', '2025-09-28 22:50:32.891', '2025-09-28 22:50:32.891', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('41172de7-7b06-40e0-9fa0-87d4cbc879e2', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "ناتشوز سوبريم", "en": "Nachos Supreme"}', '{"ar": "ناتشوز محملة بالجبن والهالابينو والصلصة", "en": "Loaded nachos with cheese, jalapeños, and salsa"}', 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', NULL, 11.99, '{"platforms": {"dineIn": 11.99, "delivery": 13.99, "takeaway": 11.99}, "defaultPrice": 11.99}', 0.00, 1, 0, 10, 1, 1, '{mexican,sharing,spicy}', '2025-09-28 22:50:32.896', '2025-09-28 22:50:32.896', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('b9a1fbd7-3f96-4240-ada0-ec39d9029cd7', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "سبرينغ رول", "en": "Spring Rolls"}', '{"ar": "لفائف الخضار المقرمشة مع صلصة الشيلي الحلوة", "en": "Crispy vegetable spring rolls with sweet chili sauce"}', 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400', NULL, 7.99, '{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}', 0.00, 1, 0, 12, 1, 1, '{asian,vegetarian,crispy}', '2025-09-28 22:50:32.903', '2025-09-28 22:50:32.903', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('45cb6796-8144-4dfd-86e7-8fddec59f203', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "خبز بالثوم", "en": "Garlic Bread"}', '{"ar": "خبز فرنسي دافئ مع زبدة الثوم والأعشاب", "en": "Warm baguette with garlic butter and herbs"}', 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400', NULL, 5.99, '{"platforms": {"dineIn": 5.99, "delivery": 6.99, "takeaway": 5.99}, "defaultPrice": 5.99}', 0.00, 1, 0, 8, 1, 1, '{bread,vegetarian,italian}', '2025-09-28 22:50:32.908', '2025-09-28 22:50:32.908', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('d8fd1f20-d532-4f76-ae49-287f58984539', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "طبق الجبن", "en": "Cheese Platter"}', '{"ar": "مجموعة من الأجبان الفاخرة مع البسكويت", "en": "Assorted premium cheeses with crackers"}', 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400', NULL, 16.99, '{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}', 0.00, 1, 0, 5, 1, 1, '{cheese,sharing,premium}', '2025-09-28 22:50:32.913', '2025-09-28 22:50:32.913', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('9bcca555-1c2f-4da2-9ca3-3d34dc6425d4', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "كوكتيل الروبيان", "en": "Shrimp Cocktail"}', '{"ar": "روبيان جامبو مبرد مع صلصة الكوكتيل", "en": "Chilled jumbo shrimp with cocktail sauce"}', 'https://images.unsplash.com/photo-1599663253423-7cad6e3c73a4?w=400', NULL, 14.99, '{"platforms": {"dineIn": 14.99, "delivery": 16.99, "takeaway": 14.99}, "defaultPrice": 14.99}', 0.00, 1, 0, 5, 1, 1, '{seafood,cold,premium}', '2025-09-28 22:50:32.919', '2025-09-28 22:50:32.919', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('1bb8fe4a-47a9-4066-a0a9-d7edd0b312d8', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "فطر محشو", "en": "Stuffed Mushrooms"}', '{"ar": "فطر مخبوز محشو بالأعشاب والجبن", "en": "Baked mushrooms filled with herbs and cheese"}', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400', NULL, 9.99, '{"platforms": {"dineIn": 9.99, "delivery": 10.99, "takeaway": 9.99}, "defaultPrice": 9.99}', 0.00, 1, 0, 18, 1, 1, '{vegetarian,baked,mushrooms}', '2025-09-28 22:50:32.927', '2025-09-28 22:50:32.927', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('a7848aba-971e-4c94-ad6f-cebd3e720ef4', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "ساتاي الدجاج", "en": "Chicken Satay"}', '{"ar": "أسياخ دجاج مشوية مع صلصة الفول السوداني", "en": "Grilled chicken skewers with peanut sauce"}', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400', NULL, 10.99, '{"platforms": {"dineIn": 10.99, "delivery": 12.99, "takeaway": 10.99}, "defaultPrice": 10.99}', 0.00, 1, 0, 15, 1, 1, '{asian,grilled,chicken}', '2025-09-28 22:50:32.936', '2025-09-28 22:50:32.936', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('14386156-5c75-4076-bdbc-fb3829af7324', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "حلقات البصل", "en": "Onion Rings"}', '{"ar": "حلقات بصل مقرمشة مع صلصة الرانش", "en": "Crispy battered onion rings with ranch dip"}', 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', NULL, 7.49, '{"platforms": {"dineIn": 7.49, "delivery": 8.49, "takeaway": 7.49}, "defaultPrice": 7.49}', 0.00, 1, 0, 10, 1, 1, '{fried,vegetarian,crispy}', '2025-09-28 22:50:32.942', '2025-09-28 22:50:32.942', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('aea1ea1b-7843-4a74-9513-567cacf21411', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "إدامامي", "en": "Edamame"}', '{"ar": "فول الصويا المطهو على البخار مع ملح البحر", "en": "Steamed soybeans with sea salt"}', 'https://images.unsplash.com/photo-1564768048938-b7e7c3e2a2a5?w=400', NULL, 6.99, '{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}', 0.00, 1, 0, 8, 1, 1, '{japanese,healthy,vegan}', '2025-09-28 22:50:32.945', '2025-09-28 22:50:32.945', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('c712e724-c30c-46f8-9ecb-6f5ca1110444', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "قشور البطاطس", "en": "Potato Skins"}', '{"ar": "قشور بطاطس محملة باللحم المقدد والجبن", "en": "Loaded potato skins with bacon and cheese"}', 'https://images.unsplash.com/photo-1552332386-a347e9261e2c?w=400', NULL, 8.99, '{"platforms": {"dineIn": 8.99, "delivery": 9.99, "takeaway": 8.99}, "defaultPrice": 8.99}', 0.00, 1, 0, 15, 1, 1, '{american,baked,bacon}', '2025-09-28 22:50:32.95', '2025-09-28 22:50:32.95', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('294a4be6-eeb9-4afc-aec2-fa61ddfcd51d', 'test-company-uuid-123456789', NULL, 'cc18f7b2-0944-42da-8de9-79ce7cec2d9d', '{"ar": "غموس السبانخ", "en": "Spinach Dip"}', '{"ar": "غموس كريمي بالسبانخ والخرشوف مع الرقائق", "en": "Creamy spinach and artichoke dip with chips"}', 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=400', NULL, 9.49, '{"platforms": {"dineIn": 9.49, "delivery": 10.49, "takeaway": 9.49}, "defaultPrice": 9.49}', 0.00, 1, 0, 12, 1, 1, '{vegetarian,dip,creamy}', '2025-09-28 22:50:32.954', '2025-09-28 22:50:32.954', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('ccf11cca-e480-47de-b137-12ca6ed8d31c', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "ستيك ريب آي", "en": "Ribeye Steak"}', '{"ar": "قطعة لحم ريب آي فاخرة مشوية بإتقان", "en": "Prime cut ribeye grilled to perfection"}', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400', NULL, 32.99, '{"platforms": {"dineIn": 32.99, "delivery": 35.99, "takeaway": 32.99}, "defaultPrice": 32.99}', 0.00, 1, 0, 25, 1, 1, '{steak,premium,beef}', '2025-09-28 22:50:32.958', '2025-09-28 22:50:32.958', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('2e4a9901-a4a8-409f-98ae-1617cb2455db', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "سلمون ترياكي", "en": "Salmon Teriyaki"}', '{"ar": "سلمون مزجج بصلصة الترياكي والخضروات", "en": "Glazed salmon with teriyaki sauce and vegetables"}', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', NULL, 24.99, '{"platforms": {"dineIn": 24.99, "delivery": 26.99, "takeaway": 24.99}, "defaultPrice": 24.99}', 0.00, 1, 0, 20, 1, 1, '{seafood,japanese,healthy}', '2025-09-28 22:50:32.962', '2025-09-28 22:50:32.962', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('94796198-d657-40cd-8058-92132152f8f1', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "دجاج ألفريدو", "en": "Chicken Alfredo"}', '{"ar": "فيتوتشيني كريمي مع الدجاج المشوي", "en": "Creamy fettuccine with grilled chicken"}', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400', NULL, 18.99, '{"platforms": {"dineIn": 18.99, "delivery": 20.99, "takeaway": 18.99}, "defaultPrice": 18.99}', 0.00, 1, 0, 18, 1, 1, '{pasta,italian,creamy}', '2025-09-28 22:50:32.966', '2025-09-28 22:50:32.966', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('b10ec6a9-0304-4d4e-a443-c7ead3b1650e', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "أضلاع الشواء", "en": "BBQ Ribs"}', '{"ar": "أضلاع خنزير مطبوخة ببطء مع صلصة الباربكيو", "en": "Slow-cooked pork ribs with BBQ sauce"}', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', NULL, 26.99, '{"platforms": {"dineIn": 26.99, "delivery": 29.99, "takeaway": 26.99}, "defaultPrice": 26.99}', 0.00, 1, 0, 30, 1, 1, '{bbq,pork,american}', '2025-09-28 22:50:32.969', '2025-09-28 22:50:32.969', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('f86463cf-d22b-47f8-8aee-58673cd89aa8', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "بيتزا نباتية", "en": "Vegetarian Pizza"}', '{"ar": "بيتزا 12 بوصة مع الخضار الطازجة والجبن", "en": "12\" pizza with fresh vegetables and cheese"}', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', NULL, 16.99, '{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}', 0.00, 1, 0, 20, 1, 1, '{pizza,vegetarian,italian}', '2025-09-28 22:50:32.975', '2025-09-28 22:50:32.975', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('b4ab8368-893f-4449-bd8d-5116d6ac3dc5', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "سمك وبطاطس", "en": "Fish and Chips"}', '{"ar": "سمك القد المغطى بالبيرة مع البطاطس المقرمشة", "en": "Beer-battered cod with crispy fries"}', 'https://images.unsplash.com/photo-1580217593608-61931cefc821?w=400', NULL, 17.99, '{"platforms": {"dineIn": 17.99, "delivery": 19.99, "takeaway": 17.99}, "defaultPrice": 17.99}', 0.00, 1, 0, 18, 1, 1, '{seafood,british,fried}', '2025-09-28 22:50:32.979', '2025-09-28 22:50:32.979', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('973a8311-71a0-4afb-a392-4db998905620', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "قطع لحم الضأن", "en": "Lamb Chops"}', '{"ar": "قطع لحم ضأن مغطاة بالأعشاب مع صلصة النعناع", "en": "Herb-crusted lamb chops with mint sauce"}', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400', NULL, 29.99, '{"platforms": {"dineIn": 29.99, "delivery": 32.99, "takeaway": 29.99}, "defaultPrice": 29.99}', 0.00, 1, 0, 25, 1, 1, '{lamb,premium,mediterranean}', '2025-09-28 22:50:32.983', '2025-09-28 22:50:32.983', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('c7055dfa-6390-48cb-90fd-05677c1d101c', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "تاكو الدجاج", "en": "Chicken Tacos"}', '{"ar": "ثلاث تاكو طرية مع الدجاج المتبل", "en": "Three soft tacos with seasoned chicken"}', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', NULL, 14.99, '{"platforms": {"dineIn": 14.99, "delivery": 16.99, "takeaway": 14.99}, "defaultPrice": 14.99}', 0.00, 1, 0, 15, 1, 1, '{mexican,chicken,tacos}', '2025-09-28 22:50:32.986', '2025-09-28 22:50:32.986', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('650f01b6-7569-47b3-a126-67143e707298', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "سباغيتي بولونيز", "en": "Spaghetti Bolognese"}', '{"ar": "باستا كلاسيكية مع صلصة اللحم", "en": "Classic pasta with meat sauce"}', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', NULL, 16.99, '{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}', 0.00, 1, 0, 20, 1, 1, '{pasta,italian,beef}', '2025-09-28 22:50:32.99', '2025-09-28 22:50:32.99', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('1b4d6ee3-927c-4766-9fbc-817bc9646184', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "كاري أخضر تايلاندي", "en": "Thai Green Curry"}', '{"ar": "كاري جوز الهند الحار مع الخضروات", "en": "Spicy coconut curry with vegetables"}', 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', NULL, 15.99, '{"platforms": {"dineIn": 15.99, "delivery": 17.99, "takeaway": 15.99}, "defaultPrice": 15.99}', 0.00, 1, 0, 22, 1, 1, '{thai,spicy,curry}', '2025-09-28 22:50:32.994', '2025-09-28 22:50:32.994', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('67af249e-f25e-4aea-84b5-c36282baeb44', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "برجر مزدوج بالجبن", "en": "Double Cheeseburger"}', '{"ar": "قرصان من اللحم البقري مع الجبن والبطاطس", "en": "Two beef patties with cheese and fries"}', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', NULL, 17.99, '{"platforms": {"dineIn": 17.99, "delivery": 19.99, "takeaway": 17.99}, "defaultPrice": 17.99}', 0.00, 1, 0, 18, 1, 1, '{burger,american,beef}', '2025-09-28 22:50:32.997', '2025-09-28 22:50:32.997', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('0e3e06cd-bc01-41af-a7fd-00dfdfb7604f', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "شاورما دجاج", "en": "Chicken Shawarma"}', '{"ar": "لفة دجاج بالتوابل الشرق أوسطية", "en": "Middle Eastern spiced chicken wrap"}', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400', NULL, 12.99, '{"platforms": {"dineIn": 12.99, "delivery": 14.99, "takeaway": 12.99}, "defaultPrice": 12.99}', 0.00, 1, 0, 15, 1, 1, '{middle-eastern,chicken,wrap}', '2025-09-28 22:50:33', '2025-09-28 22:50:33', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('3712dc28-815f-4612-bc99-2000d96d72eb', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "بايلا المأكولات البحرية", "en": "Seafood Paella"}', '{"ar": "أرز إسباني مع مأكولات بحرية مختلطة", "en": "Spanish rice with mixed seafood"}', 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400', NULL, 28.99, '{"platforms": {"dineIn": 28.99, "delivery": 31.99, "takeaway": 28.99}, "defaultPrice": 28.99}', 0.00, 1, 0, 35, 1, 1, '{spanish,seafood,rice}', '2025-09-28 22:50:33.004', '2025-09-28 22:50:33.004', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('82438d5c-1964-4f4c-9523-bd3c577c8ae1', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "باد تاي بالدجاج", "en": "Chicken Pad Thai"}', '{"ar": "نودلز الأرز المقلية مع الدجاج", "en": "Stir-fried rice noodles with chicken"}', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400', NULL, 15.99, '{"platforms": {"dineIn": 15.99, "delivery": 17.99, "takeaway": 15.99}, "defaultPrice": 15.99}', 0.00, 1, 0, 20, 1, 1, '{thai,noodles,chicken}', '2025-09-28 22:50:33.009', '2025-09-28 22:50:33.009', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('4a6b3ec5-d89a-49a0-81e3-7d95ba9297a4', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "وعاء بوذا النباتي", "en": "Vegan Buddha Bowl"}', '{"ar": "وعاء الكينوا مع الخضار المحمصة", "en": "Quinoa bowl with roasted vegetables"}', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', NULL, 13.99, '{"platforms": {"dineIn": 13.99, "delivery": 15.99, "takeaway": 13.99}, "defaultPrice": 13.99}', 0.00, 1, 0, 15, 1, 1, '{vegan,healthy,bowl}', '2025-09-28 22:50:33.012', '2025-09-28 22:50:33.012', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('2e92c69a-25a5-441c-9600-02717536f003', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "رول الكركند", "en": "Lobster Roll"}', '{"ar": "لحم الكركند الطازج في خبز محمص", "en": "Fresh lobster meat in a toasted bun"}', 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400', NULL, 34.99, '{"platforms": {"dineIn": 34.99, "delivery": 37.99, "takeaway": 34.99}, "defaultPrice": 34.99}', 0.00, 1, 0, 15, 1, 1, '{seafood,premium,sandwich}', '2025-09-28 22:50:33.018', '2025-09-28 22:50:33.018', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('dde37f10-d4ad-4b44-8798-ea152be8eb30', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "برياني الدجاج", "en": "Chicken Biryani"}', '{"ar": "أرز عطري مع الدجاج المتبل", "en": "Fragrant rice with spiced chicken"}', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', NULL, 16.99, '{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}', 0.00, 1, 0, 30, 1, 1, '{indian,rice,chicken}', '2025-09-28 22:50:33.022', '2025-09-28 22:50:33.022', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('ee676480-8f7c-4624-87ee-ee05a0261a03', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "ريزوتو الفطر", "en": "Mushroom Risotto"}', '{"ar": "أرز إيطالي كريمي مع الفطر", "en": "Creamy Italian rice with mushrooms"}', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400', NULL, 18.99, '{"platforms": {"dineIn": 18.99, "delivery": 20.99, "takeaway": 18.99}, "defaultPrice": 18.99}', 0.00, 1, 0, 25, 1, 1, '{italian,vegetarian,rice}', '2025-09-28 22:50:33.026', '2025-09-28 22:50:33.026', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('de9c57ef-c210-49f4-af37-46c1e35bc660', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "فاهيتا اللحم", "en": "Beef Fajitas"}', '{"ar": "لحم بقري متبل مع الفلفل والبصل", "en": "Sizzling beef with peppers and onions"}', 'https://images.unsplash.com/photo-1564767655658-4e6b365884ff?w=400', NULL, 19.99, '{"platforms": {"dineIn": 19.99, "delivery": 21.99, "takeaway": 19.99}, "defaultPrice": 19.99}', 0.00, 1, 0, 20, 1, 1, '{mexican,beef,spicy}', '2025-09-28 22:50:33.029', '2025-09-28 22:50:33.029', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('7dc88cd3-81eb-4bac-a12c-3513f2312674', 'test-company-uuid-123456789', NULL, 'fb859245-3cae-4011-a490-a5c0f566bdf7', '{"ar": "شنيتزل", "en": "Pork Schnitzel"}', '{"ar": "قطعة لحم خنزير مقلية مع الليمون", "en": "Breaded pork cutlet with lemon"}', 'https://images.unsplash.com/photo-1599921841143-819065280869?w=400', NULL, 17.99, '{"platforms": {"dineIn": 17.99, "delivery": 19.99, "takeaway": 17.99}, "defaultPrice": 17.99}', 0.00, 1, 0, 18, 1, 1, '{german,pork,fried}', '2025-09-28 22:50:33.032', '2025-09-28 22:50:33.032', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('ce1ea999-1394-4e6b-b5e2-3562fe00c1ce', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "تيراميسو", "en": "Tiramisu"}', '{"ar": "حلوى إيطالية بنكهة القهوة", "en": "Italian coffee-flavored dessert"}', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', NULL, 7.99, '{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}', 0.00, 1, 0, 5, 1, 1, '{italian,coffee,dessert}', '2025-09-28 22:50:33.037', '2025-09-28 22:50:33.037', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('c2cd7f55-eb10-4cbb-98d0-9685b32e5a2e', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "تشيز كيك", "en": "Cheesecake"}', '{"ar": "تشيز كيك بطريقة نيويورك مع صلصة التوت", "en": "New York style cheesecake with berry sauce"}', 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?w=400', NULL, 8.49, '{"platforms": {"dineIn": 8.49, "delivery": 9.49, "takeaway": 8.49}, "defaultPrice": 8.49}', 0.00, 1, 0, 5, 1, 1, '{american,cheese,sweet}', '2025-09-28 22:50:33.041', '2025-09-28 22:50:33.041', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('fa89afef-a64a-4a95-8a24-e9ee90599400', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "فطيرة التفاح", "en": "Apple Pie"}', '{"ar": "فطيرة التفاح الدافئة مع آيس كريم الفانيليا", "en": "Warm apple pie with vanilla ice cream"}', 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400', NULL, 6.99, '{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}', 0.00, 1, 0, 8, 1, 1, '{american,pie,warm}', '2025-09-28 22:50:33.044', '2025-09-28 22:50:33.044', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('2b1dc290-f4a7-48ba-bcc6-675ee32c6418', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "كريم بروليه", "en": "Crème Brûlée"}', '{"ar": "كاسترد فرنسي مع السكر المكرمل", "en": "French custard with caramelized sugar"}', 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400', NULL, 8.99, '{"platforms": {"dineIn": 8.99, "delivery": 9.99, "takeaway": 8.99}, "defaultPrice": 8.99}', 0.00, 1, 0, 5, 1, 1, '{french,custard,caramel}', '2025-09-28 22:50:33.047', '2025-09-28 22:50:33.047', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('4d495bfe-5f7e-43a0-a72d-fd76c96e1432', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "براوني سانداي", "en": "Brownie Sundae"}', '{"ar": "براوني دافئ مع الآيس كريم وصلصة الشوكولاتة", "en": "Warm brownie with ice cream and chocolate sauce"}', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400', NULL, 9.49, '{"platforms": {"dineIn": 9.49, "delivery": 10.49, "takeaway": 9.49}, "defaultPrice": 9.49}', 0.00, 1, 0, 10, 1, 1, '{chocolate,ice-cream,warm}', '2025-09-28 22:50:33.052', '2025-09-28 22:50:33.052', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('d3e27920-7ab0-4028-beeb-66a88b3d6b92', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "بانا كوتا", "en": "Panna Cotta"}', '{"ar": "بودينغ فانيليا إيطالي مع الفواكه", "en": "Italian vanilla pudding with fruit"}', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', NULL, 7.49, '{"platforms": {"dineIn": 7.49, "delivery": 8.49, "takeaway": 7.49}, "defaultPrice": 7.49}', 0.00, 1, 0, 5, 1, 1, '{italian,pudding,light}', '2025-09-28 22:50:33.055', '2025-09-28 22:50:33.055', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('bde3ae47-a27d-4535-b426-0257f7b17cd4', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "تارت الفواكه", "en": "Fruit Tart"}', '{"ar": "تارت الفواكه الموسمية الطازجة", "en": "Fresh seasonal fruit tart"}', 'https://images.unsplash.com/photo-1525151498231-bc059cfafa2b?w=400', NULL, 7.99, '{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}', 0.00, 1, 0, 5, 1, 1, '{fruit,tart,fresh}', '2025-09-28 22:50:33.059', '2025-09-28 22:50:33.059', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('e422bf17-4b45-4c7a-b9bf-7f08eb368557', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "كعكة اللافا", "en": "Molten Lava Cake"}', '{"ar": "كعكة الشوكولاتة مع مركز ذائب", "en": "Chocolate cake with molten center"}', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400', NULL, 9.99, '{"platforms": {"dineIn": 9.99, "delivery": 10.99, "takeaway": 9.99}, "defaultPrice": 9.99}', 0.00, 1, 0, 15, 1, 1, '{chocolate,warm,decadent}', '2025-09-28 22:50:33.063', '2025-09-28 22:50:33.063', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('4c15e1a2-c9c3-4bad-a362-3b2d06d8361c', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "ثلاثي السوربيه", "en": "Sorbet Trio"}', '{"ar": "ثلاث نكهات من سوربيه الفواكه", "en": "Three flavors of fruit sorbet"}', 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400', NULL, 6.99, '{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}', 0.00, 1, 0, 5, 1, 1, '{sorbet,fruit,refreshing}', '2025-09-28 22:50:33.067', '2025-09-28 22:50:33.067', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('4c248cf8-cf4f-4079-9673-b739f654f768', 'test-company-uuid-123456789', NULL, '587c7fb8-7ef8-4f13-a197-21aa7115bb8e', '{"ar": "بقلاوة", "en": "Baklava"}', '{"ar": "معجنات حلوة مع المكسرات والعسل", "en": "Sweet pastry with nuts and honey"}', 'https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=400', NULL, 5.99, '{"platforms": {"dineIn": 5.99, "delivery": 6.99, "takeaway": 5.99}, "defaultPrice": 5.99}', 0.00, 1, 0, 5, 1, 1, '{middle-eastern,nuts,honey}', '2025-09-28 22:50:33.073', '2025-09-28 22:50:33.073', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('e802d022-6457-4675-b0db-7078d2ac452d', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "عصير الليمون الطازج", "en": "Fresh Lemonade"}', '{"ar": "عصير الليمون الطازج المحضر في المنزل", "en": "House-made fresh lemonade"}', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400', NULL, 4.49, '{"platforms": {"dineIn": 4.49, "delivery": 5.49, "takeaway": 4.49}, "defaultPrice": 4.49}', 0.00, 1, 0, 5, 1, 1, '{fresh,citrus,cold}', '2025-09-28 22:50:33.076', '2025-09-28 22:50:33.076', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('f8fb68f9-7b03-4edc-8289-2c45a36c6c5e', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "قهوة مثلجة", "en": "Iced Coffee"}', '{"ar": "قهوة باردة مع الثلج", "en": "Cold brew coffee with ice"}', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', NULL, 4.99, '{"platforms": {"dineIn": 4.99, "delivery": 5.99, "takeaway": 4.99}, "defaultPrice": 4.99}', 0.00, 1, 0, 5, 1, 1, '{coffee,cold,caffeine}', '2025-09-28 22:50:33.079', '2025-09-28 22:50:33.079', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('e193573b-9638-4083-8cce-977cd5f26e32', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "وعاء السموذي", "en": "Smoothie Bowl"}', '{"ar": "سموذي الفواكه المختلطة مع الإضافات", "en": "Mixed fruit smoothie with toppings"}', 'https://images.unsplash.com/photo-1555375771-14b2a63968a9?w=400', NULL, 7.99, '{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}', 0.00, 1, 0, 8, 1, 1, '{healthy,fruit,smoothie}', '2025-09-28 22:50:33.086', '2025-09-28 22:50:33.086', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('2347f482-6427-419b-8177-1769ec41fa53', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "شوكولاتة ساخنة", "en": "Hot Chocolate"}', '{"ar": "شوكولاتة ساخنة غنية مع المارشميلو", "en": "Rich hot chocolate with marshmallows"}', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400', NULL, 4.49, '{"platforms": {"dineIn": 4.49, "delivery": 5.49, "takeaway": 4.49}, "defaultPrice": 4.49}', 0.00, 1, 0, 5, 1, 1, '{chocolate,hot,sweet}', '2025-09-28 22:50:33.09', '2025-09-28 22:50:33.09', NULL, NULL, NULL, '{}');
INSERT INTO public.menu_products VALUES ('669387ab-2c5c-4790-9a50-980c56d6528a', 'test-company-uuid-123456789', NULL, '58454313-07a7-4445-9f51-4dd1e848fb4d', '{"ar": "بيرة حرفية", "en": "Craft Beer"}', '{"ar": "مجموعة مختارة من البيرة الحرفية المحلية", "en": "Selection of local craft beers"}', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', NULL, 6.99, '{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}', 0.00, 1, 0, 2, 1, 1, '{alcohol,beer,craft}', '2025-09-28 22:50:33.093', '2025-09-28 22:50:33.093', NULL, NULL, NULL, '{}');


--
-- Data for Name: modifier_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: modifiers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: printer_licenses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: printers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: print_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: printer_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: printer_discovery_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: printer_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_modifier_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_modifier_markups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_platform_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_products; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_targets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promotion_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: provider_order_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: taxes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: taxable_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: taxable_modifiers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: taxable_products; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_marketplace; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_print_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_builder_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: template_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_activity_logs VALUES ('aa4eca4c-5a64-4e8f-a1f4-3c406f38749b', '884627ea-f154-48e3-a756-5f3b84f13594', 'login_success', NULL, NULL, 'User logged in successfully', '::1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', true, NULL, '2025-09-28 22:40:29.169');


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_sessions VALUES ('80291b2f-805b-4a37-9465-f9b781b8feb2', '884627ea-f154-48e3-a756-5f3b84f13594', '$2a$10$830l0Bpj7V72f9hpHzqWkuljLkSfT0ODqwsEXIKDPTBBdgmnqvKHC', NULL, '2025-10-28 22:40:29.155', NULL, '::1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'desktop', true, NULL, '2025-09-28 22:40:29.158', '2025-09-28 22:40:29.158');


--
-- Data for Name: webhook_delivery_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: license_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.license_audit_logs_id_seq', 1, false);


--
-- Name: license_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.license_invoices_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict BUWboGn9TFSlVM5c6mcdpFfDdV5L3JW3LChoy0ay1AFXEcFehhhamy2UJqmMw0s

