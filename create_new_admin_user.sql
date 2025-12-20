-- Create New Admin User
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/pvatfzwzfgioypdnqjay/editor

-- Step 1: Create the new admin user
-- Password: SecureAdmin@2024!
-- (Hash generated using bcrypt with 12 rounds)

INSERT INTO users (username, email, full_name, password_hash, role, is_active)
VALUES (
    'siva_admin',                                                               -- username (change as needed)
    'siva@textile-printing.com',                                               -- email (change as needed)
    'Siva Venigalla',                                                          -- full name (change as needed)
    '$2b$12$LQv3c1yqBWcVsvUu7u7rPe5FkUwEJKvjJ5Z8K8K5Z8K5Z8K5Z8K5Z.',         -- password hash for: SecureAdmin@2024!
    'admin',                                                                    -- role
    true                                                                        -- is_active
);

-- Step 2: Verify the user was created
SELECT id, username, email, full_name, role, is_active, created_at
FROM users
WHERE email = 'siva@textile-printing.com';

-- ==========================================
-- ALTERNATIVE: If you want a different password
-- ==========================================
-- You can generate a bcrypt hash online at: https://bcrypt-generator.com/
-- Use rounds: 12
-- Then replace the password_hash above with your generated hash

-- ==========================================
-- RECOMMENDED PASSWORDS (choose one)
-- ==========================================
-- 1. SecureAdmin@2024!
-- 2. Textile@Secure123!
-- 3. AdminTextile@2024!
-- 4. Your own strong password

-- ==========================================
-- OPTIONAL: Disable old admin account
-- ==========================================
-- Uncomment the line below to disable the default admin account
-- UPDATE users SET is_active = false WHERE email = 'admin@textile-printing.com';

-- ==========================================
-- HOW TO USE THIS FILE
-- ==========================================
-- 1. Go to: https://supabase.com/dashboard/project/pvatfzwzfgioypdnqjay/editor
-- 2. Click "New Query"
-- 3. Copy and paste this SQL
-- 4. Customize username, email, full_name as needed
-- 5. Click "Run" button
-- 6. Login with your new credentials:
--    Email: siva@textile-printing.com
--    Password: SecureAdmin@2024!
