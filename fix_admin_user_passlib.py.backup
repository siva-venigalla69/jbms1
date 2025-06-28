#!/usr/bin/env python3
"""
Script to fix admin user authentication using passlib (same as backend)
"""
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Use the EXACT same configuration as the backend
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12
)

def hash_password(password: str) -> str:
    """Hash password using passlib (same as backend)"""
    return pwd_context.hash(password)

def verify_password_test(plain_password: str, hashed_password: str) -> bool:
    """Test password verification"""
    return pwd_context.verify(plain_password, hashed_password)

def generate_admin_fix_sql():
    """Generate SQL to fix admin user with correct passlib hash"""
    
    # User details
    username = "admin"
    email = "siva.data9@outlook.com"
    full_name = "Siva Venigalla"
    password = "Siri@2912"
    
    # Hash the password using passlib (same as backend)
    hashed_password = hash_password(password)
    
    # Test the hash
    verify_result = verify_password_test(password, hashed_password)
    
    current_time = datetime.utcnow().isoformat()
    
    print("=== PASSLIB ADMIN USER FIX ===")
    print(f"Password: {password}")
    print(f"Hashed: {hashed_password}")
    print(f"Verification test: {verify_result}")
    
    if not verify_result:
        print("❌ ERROR: Password hash verification failed!")
        return
    
    print("✅ Password hash verification successful!")
    
    print(f"\n=== SQL COMMAND (UPDATE EXISTING ADMIN) ===")
    print(f"""UPDATE users 
SET 
    email = '{email}',
    full_name = '{full_name}',
    password_hash = '{hashed_password}',
    role = 'admin',
    is_active = true,
    updated_at = '{current_time}'
WHERE username = 'admin';""")
    
    print(f"\n=== VERIFICATION SQL ===")
    print("SELECT id, username, email, full_name, role, is_active, password_hash FROM users WHERE username = 'admin';")
    
    return hashed_password

if __name__ == "__main__":
    print("🔐 Generating admin user fix with PASSLIB (backend-compatible)")
    hashed_password = generate_admin_fix_sql()
    
    if hashed_password:
        print(f"\n=== TEST COMMAND ===")
        print(f'curl -X POST https://jbms1.onrender.com/api/auth/login -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin&password=Siri@2912"')
        
        print(f"\n=== DEBUGGING ===")
        print("If login still fails, check:")
        print("1. Database field name is 'password_hash' (not 'hashed_password')")
        print("2. User exists and is active")
        print("3. Backend logs for specific error details") 