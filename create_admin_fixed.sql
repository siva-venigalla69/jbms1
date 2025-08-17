-- Fixed Admin User Profile Creation
-- Run this AFTER creating the user via Supabase Dashboard

-- First, check if user exists in auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'admin@textile-printing.com';

-- Create user profile (only if user exists and profile doesn't exist)
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
AND id NOT IN (SELECT id FROM user_profiles WHERE id IS NOT NULL);

-- Verify the complete setup
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