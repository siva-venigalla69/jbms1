#!/usr/bin/env python3
"""
Final admin user creation script with correct lowercase enum values
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
    
    # Generate SQL with lowercase enum value
    sql_commands = f"""
-- Create admin user with correct lowercase enum value
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
    '{user_id}',
    '{username}',
    '{email}', 
    '{full_name}',
    '{password_hash}',
    'admin',  -- LOWERCASE to match database enum
    true,
    '{current_time}',
    '{current_time}'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = '{password_hash}',
    role = 'admin',
    updated_at = '{current_time}';

-- Verify the user was created
SELECT id, username, email, full_name, role, is_active, created_at 
FROM users 
WHERE username = 'admin';
"""
    
    print("=== FINAL ADMIN CREATION SQL ===")
    print(sql_commands)
    print("\n=== INSTRUCTIONS ===")
    print("1. Copy the SQL commands above")
    print("2. Connect to your Render PostgreSQL database")
    print("3. Execute the SQL commands")
    print("4. Test login with:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print("5. The enum value 'admin' (lowercase) matches your database!")

if __name__ == "__main__":
    create_admin_sql() 