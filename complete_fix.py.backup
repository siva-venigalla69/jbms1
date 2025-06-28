#!/usr/bin/env python3
"""
Complete fix for the admin user enum issue
Generates password hash and provides SQL commands
"""

import os
import sys
from getpass import getpass

def generate_password_hash(password):
    """Generate bcrypt hash for password"""
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    except ImportError:
        print("❌ passlib not installed. Installing...")
        os.system("pip install passlib[bcrypt]")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)

def main():
    print("🔧 COMPLETE ADMIN USER FIX")
    print("=" * 50)
    
    # Get password
    current_password = "Siri@2912"  # Your current password
    print(f"Using password: {current_password}")
    
    # Generate hash
    print("\n📊 Generating password hash...")
    password_hash = generate_password_hash(current_password)
    print(f"Password hash: {password_hash}")
    
    # Create SQL commands
    print("\n🔧 SQL COMMANDS TO RUN:")
    print("=" * 50)
    
    print("\n-- Step 1: Check current admin user")
    print("SELECT username, email, role, is_active FROM users WHERE username = 'admin';")
    
    print("\n-- Step 2: Update existing admin user (if exists)")
    print(f"""UPDATE users 
SET role = 'admin', 
    password_hash = '{password_hash}',
    updated_at = now() 
WHERE username = 'admin';""")
    
    print("\n-- Step 3: Create new admin user (if doesn't exist)")
    print(f"""INSERT INTO users (
    id, username, email, full_name, password_hash, 
    role, is_active, created_at, updated_at
) VALUES (
    uuid_generate_v4(), 
    'admin', 
    'admin@company.com', 
    'System Administrator',
    '{password_hash}',
    'admin',
    true, 
    now(), 
    now()
);""")
    
    print("\n-- Step 4: Verify the fix")
    print("SELECT username, email, role, is_active FROM users WHERE username = 'admin';")
    
    print("\n🧪 TEST COMMANDS:")
    print("=" * 50)
    
    print(f"""
# Test health
curl https://jbms1.onrender.com/health

# Test login
curl -X POST https://jbms1.onrender.com/api/auth/login \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=admin&password={current_password}"

# Test with token (replace TOKEN with actual token from login)
export TOKEN="your_token_here"
curl -X GET https://jbms1.onrender.com/api/auth/me \\
  -H "Authorization: Bearer $TOKEN"
""")

    print("\n✅ INSTRUCTIONS:")
    print("1. Connect to your Render PostgreSQL database")
    print("2. Run the UPDATE command above")
    print("3. Run the test commands to verify")
    print("4. If login works, proceed with full API testing")

if __name__ == "__main__":
    main() 