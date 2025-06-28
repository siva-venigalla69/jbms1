#!/usr/bin/env python3
"""
Script to fix admin user authentication in the database
"""
import bcrypt
import uuid
from datetime import datetime

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    # Generate salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def generate_admin_fix_sql():
    """Generate SQL to fix admin user"""
    
    # User details
    username = "admin"
    email = "siva.data9@outlook.com"
    full_name = "Siva Venigalla"
    password = "Siri@2912"
    
    # Hash the password properly
    hashed_password = hash_password(password)
    
    current_time = datetime.utcnow().isoformat()
    
    print("=== ADMIN USER FIX SQL (UPDATE APPROACH) ===")
    print("\n1. Update the existing admin user (avoids foreign key issues):")
    print(f"""UPDATE users 
SET 
    email = '{email}',
    full_name = '{full_name}',
    password_hash = '{hashed_password}',
    role = 'admin',
    is_active = true,
    updated_at = '{current_time}'
WHERE username = 'admin';""")
    
    print("\n2. If no admin user exists, insert a new one:")
    admin_id = str(uuid.uuid4())
    print(f"""INSERT INTO users (
    id, 
    username, 
    email, 
    full_name, 
    password_hash, 
    role, 
    is_active, 
    created_at, 
    updated_at
) 
SELECT 
    '{admin_id}',
    '{username}',
    '{email}',
    '{full_name}',
    '{hashed_password}',
    'admin',
    true,
    '{current_time}',
    '{current_time}'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');""")
    
    print("\n3. Verify the user was updated/created:")
    print("SELECT id, username, email, full_name, role, is_active FROM users WHERE username = 'admin';")
    
    print(f"\n=== LOGIN CREDENTIALS ===")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Hashed Password: {hashed_password}")
    
    return hashed_password

if __name__ == "__main__":
    hashed_password = generate_admin_fix_sql()
    
    print(f"\n=== ALTERNATIVE: SINGLE UPSERT COMMAND ===")
    print("If you prefer a single command, use this PostgreSQL UPSERT:")
    
    current_time = datetime.utcnow().isoformat()
    admin_id = str(uuid.uuid4())
    
    print(f"""INSERT INTO users (
    id, username, email, full_name, password_hash, role, is_active, created_at, updated_at
) VALUES (
    '{admin_id}', 'admin', 'siva.data9@outlook.com', 'Siva Venigalla', 
    '{hashed_password}', 'admin', true, '{current_time}', '{current_time}'
)
ON CONFLICT (username) 
DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;""")
    
    print(f"\n=== TEST COMMANDS ===")
    print(f"After running the SQL, test login with:")
    print(f'curl -X POST https://jbms1.onrender.com/api/auth/login -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin&password=Siri@2912"') 