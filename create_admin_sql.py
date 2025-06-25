#!/usr/bin/env python3
"""
Generate SQL commands to create an admin user with properly hashed password.
This script generates the SQL that you can run directly in your PostgreSQL database.
"""

import uuid
from datetime import datetime
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def generate_admin_sql():
    """Generate SQL commands to create an admin user"""
    
    print("=== JBMS1 Admin User Creation ===")
    print()
    
    # Get admin details
    username = input("Enter admin username: ").strip()
    email = input("Enter admin email: ").strip()
    full_name = input("Enter admin full name: ").strip()
    password = input("Enter admin password: ").strip()
    
    if not all([username, email, full_name, password]):
        print("❌ All fields are required!")
        return
    
    # Generate UUID and hash password
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(password)
    current_time = datetime.utcnow().isoformat()
    
    print("\n" + "="*60)
    print("📋 COPY AND RUN THESE SQL COMMANDS IN YOUR DATABASE:")
    print("="*60)
    print()
    
    # Generate SQL
    sql_commands = f"""-- Create admin user for JBMS1 Textile Printing System
INSERT INTO users (
    id, 
    username, 
    email, 
    full_name, 
    hashed_password, 
    role, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '{user_id}',
    '{username}',
    '{email}',
    '{full_name}',
    '{hashed_password}',
    'admin',
    true,
    '{current_time}',
    '{current_time}'
);

-- Verify the user was created
SELECT id, username, email, full_name, role, is_active, created_at 
FROM users 
WHERE username = '{username}';"""
    
    print(sql_commands)
    print()
    print("="*60)
    print("✅ SQL commands generated successfully!")
    print("🔑 Admin credentials:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Email: {email}")
    print()
    print("📝 Next steps:")
    print("1. Copy the SQL commands above")
    print("2. Connect to your PostgreSQL database using psql")
    print("3. Paste and execute the SQL commands")
    print("4. Test login with the credentials above")

if __name__ == "__main__":
    try:
        generate_admin_sql()
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
    except Exception as e:
        print(f"❌ Error: {e}") 