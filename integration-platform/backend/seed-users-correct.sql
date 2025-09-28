-- First, create test companies
INSERT INTO companies (id, name, business_type, phone, email, status, created_at, updated_at)
VALUES
  ('comp-001', 'Demo Restaurant Chain', 'restaurant', '+962791234567', 'admin@demo.com', 'active', NOW(), NOW()),
  ('comp-002', 'Test Restaurant Group', 'restaurant', '+962797654321', 'admin@test.com', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create branches for the companies
INSERT INTO branches (id, company_id, name, address, phone, status, created_at, updated_at)
VALUES
  ('branch-001', 'comp-001', 'Main Branch', 'Amman, Jordan', '+962791234567', 'active', NOW(), NOW()),
  ('branch-002', 'comp-001', 'Second Branch', 'Irbid, Jordan', '+962791234568', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create users with different roles
-- Password for all users is: Admin123! (using bcrypt hash)
-- The password_hash is for "Admin123!"
INSERT INTO users (id, email, password_hash, name, role, company_id, branch_id, status, created_at, updated_at)
VALUES
  -- Super Admin (needs company_id even though they can access all)
  ('user-001', 'super@admin.com', '$2a$10$YKqXHfAwKLv0HAYs1kqXOuWkNqJPiIVKXl8TmqLhNWXWVhW8QXn0O', 'Super Admin', 'super_admin', 'comp-001', NULL, 'active', NOW(), NOW()),

  -- Company Owner for Demo Restaurant Chain
  ('user-002', 'owner@demo.com', '$2a$10$YKqXHfAwKLv0HAYs1kqXOuWkNqJPiIVKXl8TmqLhNWXWVhW8QXn0O', 'Demo Owner', 'company_owner', 'comp-001', NULL, 'active', NOW(), NOW()),

  -- Branch Manager for Main Branch
  ('user-003', 'manager@demo.com', '$2a$10$YKqXHfAwKLv0HAYs1kqXOuWkNqJPiIVKXl8TmqLhNWXWVhW8QXn0O', 'Branch Manager', 'branch_manager', 'comp-001', 'branch-001', 'active', NOW(), NOW()),

  -- Cashier for Main Branch
  ('user-004', 'cashier@demo.com', '$2a$10$YKqXHfAwKLv0HAYs1kqXOuWkNqJPiIVKXl8TmqLhNWXWVhW8QXn0O', 'Cashier User', 'cashier', 'comp-001', 'branch-001', 'active', NOW(), NOW()),

  -- Call Center for Demo Restaurant
  ('user-005', 'callcenter@demo.com', '$2a$10$YKqXHfAwKLv0HAYs1kqXOuWkNqJPiIVKXl8TmqLhNWXWVhW8QXn0O', 'Call Center Agent', 'call_center', 'comp-001', NULL, 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Display created users
SELECT
  email,
  name,
  role,
  CASE
    WHEN company_id IS NOT NULL THEN (SELECT name FROM companies WHERE id = company_id)
    ELSE 'All Companies'
  END as company,
  'Admin123!' as password_to_use
FROM users
ORDER BY
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'company_owner' THEN 2
    WHEN 'branch_manager' THEN 3
    WHEN 'call_center' THEN 4
    WHEN 'cashier' THEN 5
  END;