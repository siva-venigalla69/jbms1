-- Create Admin User Complete Setup
-- Run this in Supabase SQL Editor

-- First, create the user in auth.users (if not already created via dashboard)
-- This is a workaround for testing - normally use Supabase Auth signup
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@textile-printing.com',
    crypt('Admin@123!', gen_salt('bf')),
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
) ON CONFLICT (email) DO NOTHING;

-- Now create the user profile
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
ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT 
    u.id,
    u.email,
    u.created_at as user_created,
    up.username,
    up.full_name,
    up.role,
    up.created_at as profile_created
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'admin@textile-printing.com';