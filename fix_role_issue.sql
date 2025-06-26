-- Fix the user role enum issue
-- The database enum uses lowercase values: 'admin', 'manager', 'employee'
-- But some code expects uppercase. Let's fix the database to match.

-- Step 1: Check current user
SELECT username, email, role, is_active, created_at FROM users WHERE username = 'admin';

-- Step 2: Update the admin user role to use correct lowercase enum value
UPDATE users 
SET role = 'admin', updated_at = now() 
WHERE username = 'admin';

-- Step 3: Update password if needed (optional)
-- Uncomment one of these if you want to change the password:

-- Option A: Set password to "admin123" 
-- UPDATE users 
-- SET password_hash = '$2b$12$LQv3c1yqBwrf.xVr.2BvGOSvz5fS1NjE4p4K8yLs3AWXG7BKQK9.K',
--     updated_at = now()
-- WHERE username = 'admin';

-- Option B: Set password to "Siri@2912" (generate hash first)
-- You need to generate the hash for "Siri@2912" using Python:
-- python -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt']); print(ctx.hash('Siri@2912'))"

-- Step 4: Verify the fix
SELECT username, email, role, is_active, created_at FROM users WHERE username = 'admin';

-- Step 5: If user doesn't exist, create it with correct enum value
-- Uncomment this if no admin user exists:
-- INSERT INTO users (
--     id, username, email, full_name, password_hash, 
--     role, is_active, created_at, updated_at
-- ) VALUES (
--     uuid_generate_v4(), 
--     'admin', 
--     'admin@company.com', 
--     'System Administrator',
--     '$2b$12$LQv3c1yqBwrf.xVr.2BvGOSvz5fS1NjE4p4K8yLs3AWXG7BKQK9.K', -- password: admin123
--     'admin', -- lowercase as per database enum
--     true, 
--     now(), 
--     now()
-- );

-- Step 6: Check all enum values to confirm they're lowercase
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role'); 