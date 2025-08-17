-- Manual Admin Profile Creation
-- Step 1: First find the user ID
SELECT id, email FROM auth.users WHERE email = 'admin@textile-printing.com';

-- Step 2: Copy the ID from above and replace 'USER_ID_HERE' below
-- INSERT INTO user_profiles (
--     id,
--     username,
--     full_name,
--     role,
--     phone,
--     is_active
-- ) VALUES (
--     'USER_ID_HERE',  -- Replace with actual UUID from step 1
--     'admin',
--     'System Administrator',
--     'admin',
--     '+1234567890',
--     true
-- );

-- Step 3: Verify the setup
-- SELECT 
--     u.id,
--     u.email,
--     up.username,
--     up.role
-- FROM auth.users u
-- JOIN user_profiles up ON u.id = up.id
-- WHERE u.email = 'admin@textile-printing.com';