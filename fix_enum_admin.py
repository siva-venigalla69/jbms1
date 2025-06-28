#!/usr/bin/env python3
import os
"""
Fix Admin User Role Enum Issue
This script creates SQL commands to fix the admin user role enum problem.
"""

import uuid
from datetime import datetime
import bcrypt
from passlib.context import CryptContext

# Use the same password context as the backend
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def create_admin_fix_sql():
    """Create SQL commands to fix the admin user role issue"""
    
    # User details
    username = "admin"
    password = os.getenv("TEST_PASSWORD", "change-me")
    email = "siva.data9@outlook.com"
    full_name = "Siva Venigalla"
    
    # Hash password using the same method as backend
    password = os.getenv("TEST_PASSWORD", "change-me")
    
    # Generate UUID for new user (if needed)
    new_user_id = str(uuid.uuid4())
    
    # Current timestamp
    now = datetime.utcnow().isoformat()
    
    print("=== ADMIN USER ROLE FIX ===")
    print("\nThe issue: SQLAlchemy enum expects 'admin' (lowercase) but something is wrong with the current record.")
    print("\nSOLUTION 1: Update existing admin user (RECOMMENDED)")
    print("Run this SQL command in your PostgreSQL database:")
    print(f"""
UPDATE users 
SET 
    password = os.getenv("TEST_PASSWORD", "change-me"),
    email = '{email}',
    full_name = '{full_name}',
    role = 'admin',
    is_active = true,
    updated_at = '{now}'
WHERE username = 'admin';
""")
    
    print("\nSOLUTION 2: Delete and recreate admin user (if UPDATE doesn't work)")
    print("Run these SQL commands in sequence:")
    print(f"""
-- First, delete the problematic admin user
DELETE FROM users WHERE username = 'admin';

-- Then create a new admin user
INSERT INTO users (id, username, email, full_name, password_hash, role, is_active, created_at, updated_at) 
VALUES (
    '{new_user_id}', 
    'admin', 
    '{email}', 
    '{full_name}', 
    '{password_hash}', 
    'admin', 
    true, 
    '{now}', 
    '{now}'
);
""")
    
    print("\nSOLUTION 3: Create admin2 user (safest option)")
    print("Run this SQL command:")
    print(f"""
INSERT INTO users (id, username, email, full_name, password_hash, role, is_active, created_at, updated_at) 
VALUES (
    '{new_user_id}', 
    'admin2', 
    '{email}', 
    '{full_name}', 
    '{password_hash}', 
    'admin', 
    true, 
    '{now}', 
    '{now}'
);
""")
    
    print(f"\n=== LOGIN CREDENTIALS ===")
    print(f"Username: admin (or admin2 for solution 3)")
    print(f"Password: {password}")
    print(f"\n=== VERIFICATION ===")
    print(f"Password hash: {password_hash}")
    print(f"Hash length: {len(password_hash)}")
    print(f"Hash format: {'✅ Valid bcrypt' if password = os.getenv("TEST_PASSWORD", "change-me")

if __name__ == "__main__":
    create_admin_fix_sql() 