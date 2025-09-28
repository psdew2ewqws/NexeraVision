-- First, create a test company
INSERT INTO companies (id, name, business_type, tax_number, phone, email, status, created_at, updated_at)
VALUES
  ('comp-001', 'Demo Restaurant Chain', 'restaurant', 'TAX123456', '+962791234567', 'admin@demo.com', 'active', NOW(), NOW()),
  ('comp-002', 'Test Restaurant Group', 'restaurant', 'TAX789012', '+962797654321', 'admin@test.com', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create branches for the companies
INSERT INTO branches (id, company_id, name, address, phone, is_main, status, created_at, updated_at)
VALUES
  ('branch-001', 'comp-001', 'Main Branch', 'Amman, Jordan', '+962791234567', true, 'active', NOW(), NOW()),
  ('branch-002', 'comp-001', 'Second Branch', 'Irbid, Jordan', '+962791234568', false, 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create users with different roles
-- Password for all users is: Admin123! (using bcrypt hash)
INSERT INTO users (id, email, password, name, role, company_id, branch_id, status, created_at, updated_at)
VALUES
  -- Super Admin (no company restriction)
  ('user-001', 'super@admin.com', '$2a$10$YKqXHfAwKLv0HAYs1kqXOuWkNqJPiIVKXl8TmqLhNWXWVhW8QXn0O', 'Super Admin', 'super_admin', NULL, NULL, 'active', NOW(), NOW()),

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
SELECT email, password, name, role, company_id FROM users;