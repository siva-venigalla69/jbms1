-- Simple Admin User Creation for Supabase
-- This approach uses Supabase's built-in auth system

-- Step 1: First create the user manually via Supabase Dashboard
-- Go to Authentication > Users > Add User
-- Email: admin@textile-printing.com
-- Password: Admin@123!
-- Check "Email Confirmed"

-- Step 2: Then run this SQL to create the profile
-- This will work after you create the user via dashboard

INSERT INTO user_profiles (
    id,
    username,
    full_name,
    role,
    phone,
    is_active
) 
SELECT 
    id,
    'admin',
    'System Administrator',
    'admin',
    '+1234567890',
    true
FROM auth.users 
WHERE email = 'admin@textile-printing.com'
AND id NOT IN (SELECT id FROM user_profiles);

-- Verify the setup
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at as user_created,
    up.username,
    up.full_name,
    up.role,
    up.created_at as profile_created
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'admin@textile-printing.com';