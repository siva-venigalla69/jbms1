#!/usr/bin/env python3
"""
Immediate fix for enum issue - generates SQL to run directly
"""

def main():
    print("🔧 IMMEDIATE ENUM FIX")
    print("=" * 50)
    
    # Generate password hash for Siri@2912
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = pwd_context.hash("Siri@2912")
    except ImportError:
        # Use pre-generated hash if passlib not available
        password_hash = "$2b$12$LQv3c1yqBwrf.xVr.2BvGOSvz5fS1NjE4p4K8yLs3AWXG7BKQK9.K"
        print("⚠️ Using pre-generated hash (password: admin123)")
    
    print(f"Password hash generated: {password_hash[:50]}...")
    
    print("\n📋 COPY AND RUN THESE SQL COMMANDS:")
    print("=" * 50)
    
    # SQL commands to fix the issue
    sql_commands = f"""
-- Connect to your Render PostgreSQL database and run these commands:

-- Step 1: Check current enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

-- Step 2: Check if admin user exists
SELECT username, role FROM users WHERE username = 'admin';

-- Step 3: Update admin user with correct uppercase role
UPDATE users 
SET role = 'ADMIN', 
    password_hash = '{password_hash}',
    updated_at = now() 
WHERE username = 'admin';

-- Step 4: If no rows updated, create the admin user
INSERT INTO users (
    id, username, email, full_name, password_hash, 
    role, is_active, created_at, updated_at
) 
SELECT 
    uuid_generate_v4(), 
    'admin', 
    'admin@company.com', 
    'System Administrator',
    '{password_hash}',
    'ADMIN',
    true, 
    now(), 
    now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Step 5: Verify the fix
SELECT username, email, role, is_active FROM users WHERE username = 'admin';
"""
    
    print(sql_commands)
    
    print("\n🧪 TEST COMMANDS (run after SQL):")
    print("=" * 50)
    
    test_commands = """
# Test login
curl -X POST https://jbms1.onrender.com/api/auth/login \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=admin&password=Siri@2912"

# Should return: {"access_token": "...", "token_type": "bearer"}
"""
    
    print(test_commands)
    
    print("\n✅ QUICK STEPS:")
    print("1. Connect to Render PostgreSQL")
    print("2. Copy-paste the SQL commands above")
    print("3. Run the test curl command")
    print("4. If you get access_token, you're DONE! 🎉")

if __name__ == "__main__":
    main() 