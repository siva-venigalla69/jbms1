-- Create Admin User Profile
-- Run this AFTER creating the user in Supabase Auth Dashboard

-- First, get the user ID from auth.users
-- Replace 'admin@textile-printing.com' with your actual admin email
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
WHERE email = 'admin@textile-printing.com';

-- Verify the user was created
SELECT 
    up.id,
    u.email,
    up.username,
    up.full_name,
    up.role,
    up.created_at
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
WHERE up.role = 'admin';