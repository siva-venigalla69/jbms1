#!/usr/bin/env python3
"""
Generate bcrypt password hash for new admin user
Usage: python3 generate_password_hash.py
"""

try:
    import bcrypt
except ImportError:
    print("bcrypt not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "bcrypt"])
    import bcrypt

def generate_password_hash(password):
    """Generate bcrypt hash for password"""
    # Generate salt and hash
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, hash_value):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hash_value.encode('utf-8'))

if __name__ == "__main__":
    print("=" * 60)
    print("PASSWORD HASH GENERATOR FOR SUPABASE")
    print("=" * 60)

    # Get password from user
    print("\nEnter new password for admin user:")
    print("(Requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character)")
    password = input("Password: ").strip()

    if len(password) < 8:
        print("\n❌ Password too short! Must be at least 8 characters.")
        exit(1)

    # Generate hash
    print("\nGenerating secure hash...")
    password_hash = generate_password_hash(password)

    # Verify it works
    is_valid = verify_password(password, password_hash)

    print("\n" + "=" * 60)
    print("✅ PASSWORD HASH GENERATED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\nPassword: {password}")
    print(f"Hash: {password_hash}")
    print(f"Verification: {'✅ PASSED' if is_valid else '❌ FAILED'}")

    print("\n" + "=" * 60)
    print("SQL TO CREATE USER:")
    print("=" * 60)
    print(f"""
INSERT INTO users (username, email, full_name, password_hash, role, is_active)
VALUES (
    'your_username',           -- Change this
    'your_email@example.com',  -- Change this
    'Your Full Name',          -- Change this
    '{password_hash}',
    'admin',
    true
);
""")

    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print("1. Copy the SQL above")
    print("2. Go to: https://supabase.com/dashboard/project/pvatfzwzfgioypdnqjay/editor")
    print("3. Click 'New Query'")
    print("4. Paste the SQL and customize username, email, full_name")
    print("5. Click 'Run'")
    print("6. Login with your new credentials!")
    print("=" * 60)
