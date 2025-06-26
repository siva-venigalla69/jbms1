#!/usr/bin/env python3
"""
Final admin user creation script with correct lowercase enum values
Updated for deployment v1.0.1
"""

import uuid
from passlib.context import CryptContext
from datetime import datetime

# Password context (matches backend configuration)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_sql():
    """Generate SQL to create admin user with correct enum value"""
    
    # Admin credentials
    username = "admin"
    email = "admin@company.com"
    full_name = "System Administrator"
    password = "Siri@2912"  # Use the password from conversation
    
    # Generate UUID and password hash
    user_id = str(uuid.uuid4())
    password_hash = pwd_context.hash(password)
    current_time = datetime.now().isoformat()
    
    # Generate SQL with lowercase enum value 'admin'
    sql_commands = f"""
-- Delete existing admin user if any
DELETE FROM users WHERE username = 'admin' OR role = 'admin';

-- Create admin user with LOWERCASE enum value
INSERT INTO users (
    id, username, email, full_name, password_hash, role, is_active, created_at, updated_at
) VALUES (
    '{user_id}',
    '{username}',
    '{email}',
    '{full_name}',
    '{password_hash}',
    'admin',  -- LOWERCASE enum value matching database
    true,
    '{current_time}',
    '{current_time}'
);

-- Verify the user was created
SELECT username, email, role, is_active FROM users WHERE username = 'admin';
"""
    
    print("🔧 SQL Commands for Creating Admin User (v1.0.1)")
    print("=" * 60)
    print(sql_commands)
    print("=" * 60)
    print(f"✅ Admin Username: {username}")
    print(f"✅ Admin Password: {password}")
    print(f"✅ Admin Role: admin (lowercase)")
    print(f"✅ Password Hash: {password_hash[:50]}...")
    print(f"✅ User ID: {user_id}")
    print("\n📝 Instructions:")
    print("1. Copy the SQL commands above")
    print("2. Go to your Render PostgreSQL dashboard")
    print("3. Open the Query tab and paste the SQL")
    print("4. Execute the commands")
    print("5. Test login with curl command")
    print("\n🧪 Test Command:")
    print(f'curl -X POST https://jbms1.onrender.com/api/auth/login \\')
    print(f'  -H "Content-Type: application/x-www-form-urlencoded" \\')
    print(f'  -d "username={username}&password={password}"')

if __name__ == "__main__":
    create_admin_sql() 