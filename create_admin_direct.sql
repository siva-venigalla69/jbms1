-- Direct SQL to create admin user with correct enum values
-- Run this in your Render PostgreSQL database if the Python script fails

-- Option 1: Create admin user with password "admin123"
INSERT INTO users (
    id, 
    username, 
    email, 
    full_name, 
    password_hash, 
    role, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(), 
    'admin', 
    'admin@company.com', 
    'System Administrator',
    '$2b$12$LQv3c1yqBwrf.xVr.2BvGOSvz5fS1NjE4p4K8yLs3AWXG7BKQK9.K', -- Password: admin123
    'ADMIN', -- Use uppercase enum value
    true, 
    now(), 
    now()
);

-- Option 2: If you want a different password, generate a new hash
-- Use this Python command to generate a hash for your password:
-- python -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(ctx.hash('your_password_here'))"

-- Verify the user was created
SELECT id, username, email, full_name, role, is_active, created_at 
FROM users 
WHERE role = 'ADMIN';

-- If you need to update an existing user's role:
-- UPDATE users SET role = 'ADMIN' WHERE username = 'admin'; 