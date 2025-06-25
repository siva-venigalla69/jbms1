#!/usr/bin/env python3
"""
Final admin user fix - comprehensive approach
"""
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Exact same configuration as backend
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12
)

def test_hash_approaches():
    """Test different password hashing approaches"""
    password = "Siri@2912"
    
    print("=== TESTING MULTIPLE HASH APPROACHES ===")
    
    # Approach 1: Current backend method
    hash1 = pwd_context.hash(password)
    verify1 = pwd_context.verify(password, hash1)
    print(f"Approach 1 (passlib): {hash1}")
    print(f"Verification 1: {verify1}")
    
    # Approach 2: Manual bcrypt (for comparison)
    import bcrypt
    salt = bcrypt.gensalt()
    hash2 = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    verify2 = bcrypt.checkpw(password.encode('utf-8'), hash2.encode('utf-8'))
    print(f"Approach 2 (bcrypt): {hash2}")
    print(f"Verification 2: {verify2}")
    
    # Cross-verification
    try:
        cross_verify = pwd_context.verify(password, hash2)
        print(f"Cross verification (passlib vs bcrypt): {cross_verify}")
    except Exception as e:
        print(f"Cross verification failed: {e}")
    
    return hash1, hash2

def generate_comprehensive_fix():
    """Generate comprehensive SQL fix"""
    hash1, hash2 = test_hash_approaches()
    
    current_time = datetime.utcnow().isoformat()
    
    print(f"\n=== COMPREHENSIVE FIX OPTIONS ===")
    
    print(f"\n--- OPTION 1: UPDATE with passlib hash ---")
    print(f"""UPDATE users 
SET 
    email = 'siva.data9@outlook.com',
    full_name = 'Siva Venigalla',
    password_hash = '{hash1}',
    role = 'admin',
    is_active = true,
    updated_at = '{current_time}'
WHERE username = 'admin';""")
    
    print(f"\n--- OPTION 2: DELETE and INSERT (if foreign keys allow) ---")
    admin_id = str(uuid.uuid4())
    print(f"""DELETE FROM users WHERE username = 'admin';
INSERT INTO users (
    id, username, email, full_name, password_hash, role, is_active, created_at, updated_at
) VALUES (
    '{admin_id}', 'admin', 'siva.data9@outlook.com', 'Siva Venigalla', 
    '{hash1}', 'admin', true, '{current_time}', '{current_time}'
);""")
    
    print(f"\n--- OPTION 3: Create new admin user (different username) ---")
    admin_id2 = str(uuid.uuid4())
    print(f"""INSERT INTO users (
    id, username, email, full_name, password_hash, role, is_active, created_at, updated_at
) VALUES (
    '{admin_id2}', 'admin2', 'siva.data9@outlook.com', 'Siva Venigalla', 
    '{hash1}', 'admin', true, '{current_time}', '{current_time}'
);""")
    
    print(f"\n=== VERIFICATION QUERIES ===")
    print("-- Check current admin user:")
    print("SELECT id, username, email, full_name, role, is_active, password_hash FROM users WHERE username = 'admin';")
    print("\n-- Check all admin users:")
    print("SELECT id, username, email, full_name, role, is_active FROM users WHERE role = 'admin';")
    
    print(f"\n=== TEST COMMANDS ===")
    print("-- Test with admin:")
    print('curl -X POST https://jbms1.onrender.com/api/auth/login -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin&password=Siri@2912"')
    print("\n-- Test with admin2 (if you create new user):")
    print('curl -X POST https://jbms1.onrender.com/api/auth/login -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin2&password=Siri@2912"')
    
    return hash1

if __name__ == "__main__":
    print("🔧 Generating comprehensive admin user fix...")
    hash1 = generate_comprehensive_fix()
    
    print(f"\n=== DEBUGGING NOTES ===")
    print("1. The 500 error suggests user exists but password verification fails")
    print("2. The 401 error with wrong creds shows auth endpoint works")
    print("3. Try Option 1 first (UPDATE), then Option 3 if needed")
    print("4. After SQL update, wait 30 seconds for any caching to clear")
    print(f"5. Password hash length: {len(hash1)} characters") 