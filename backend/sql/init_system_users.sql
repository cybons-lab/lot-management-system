-- Initialize system users and test user
-- This script creates essential users for the system:
--   1. guest - Guest user with read-only access
--   2. admin - Administrator with full access
--   3. testuser - Test regular user for development

-- =============================================================================
-- Step 1: Ensure roles exist
-- =============================================================================

INSERT INTO roles (role_code, role_name, description, created_at, updated_at)
VALUES
    ('guest', 'Guest', 'Guest user with read-only access', NOW(), NOW()),
    ('user', 'User', 'Regular user with standard permissions', NOW(), NOW()),
    ('admin', 'Admin', 'Administrator with full system access', NOW(), NOW())
ON CONFLICT (role_code) DO NOTHING;

-- =============================================================================
-- Step 2: Create system users (guest, admin)
-- =============================================================================

INSERT INTO users (username, email, display_name, is_active, is_system_user, created_at, updated_at)
VALUES
    ('guest', 'guest@example.com', 'ゲストユーザー', true, true, NOW(), NOW()),
    ('admin', 'admin@example.com', 'Admin User', true, true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- =============================================================================
-- Step 3: Create test regular user
-- =============================================================================

INSERT INTO users (username, email, display_name, is_active, is_system_user, created_at, updated_at)
VALUES
    ('testuser', 'testuser@example.com', 'テストユーザー', true, false, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- =============================================================================
-- Step 4: Assign roles to users
-- =============================================================================

-- Guest user -> guest role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'guest' AND r.role_code = 'guest'
ON CONFLICT DO NOTHING;

-- Admin user -> admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.role_code = 'admin'
ON CONFLICT DO NOTHING;

-- Test user -> user role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'testuser' AND r.role_code = 'user'
ON CONFLICT DO NOTHING;
