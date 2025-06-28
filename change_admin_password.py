#!/usr/bin/env python3
"""
Admin Password Change Script
Securely updates admin password in production database
"""
import os
import sys
import getpass
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """Validate password strength"""
    errors = []
    
    if len(password) < 12:
        errors.append("Password must be at least 12 characters long")
    
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number")
    
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Password must contain at least one special character")
    
    return len(errors) == 0, errors

def change_admin_password():
    """Change admin password securely"""
    print("🔒 Admin Password Change")
    print("=" * 50)
    
    # Get database URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        database_url = input("Enter DATABASE_URL: ").strip()
        if not database_url:
            print("❌ Database URL is required")
            return False
    
    # Get new password
    print("\n📝 Enter new admin password:")
    new_password = getpass.getpass("New Password: ")
    confirm_password = getpass.getpass("Confirm Password: ")
    
    if new_password != confirm_password:
        print("❌ Passwords do not match")
        return False
    
    # Validate password strength
    is_strong, errors = validate_password_strength(new_password)
    if not is_strong:
        print("❌ Password does not meet security requirements:")
        for error in errors:
            print(f"   • {error}")
        return False
    
    # Hash the password
    hashed_password = hash_password(new_password)
    
    try:
        # Connect to database
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Check if admin user exists
            result = connection.execute(
                text("SELECT id, username FROM users WHERE username = 'admin'")
            )
            admin_user = result.fetchone()
            
            if not admin_user:
                print("❌ Admin user not found")
                return False
            
            # Update password
            connection.execute(
                text("UPDATE users SET password_hash = :password_hash WHERE username = 'admin'"),
                {"password_hash": hashed_password}
            )
            connection.commit()
            
            print("✅ Admin password updated successfully")
            print(f"👤 Admin user ID: {admin_user[0]}")
            print("\n⚠️  IMPORTANT:")
            print("   • Store the new password securely")
            print("   • Test login immediately")
            print("   • Update any automation scripts")
            
            return True
            
    except Exception as e:
        print(f"❌ Error updating password: {str(e)}")
        return False

def test_new_password():
    """Test the new password"""
    print("\n🧪 Testing new password...")
    
    username = input("Username (admin): ").strip() or "admin"
    password = getpass.getpass("Password: ")
    
    try:
        import requests
        
        # Try different base URLs
        base_urls = [
            "https://jbms1.onrender.com",
            "http://localhost:8000",
            input("Enter API base URL: ").strip()
        ]
        
        for base_url in base_urls:
            if not base_url:
                continue
                
            print(f"🔍 Testing against: {base_url}")
            
            response = requests.post(
                f"{base_url}/api/auth/login",
                data={"username": username, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                print("✅ Login successful!")
                data = response.json()
                print(f"   Token received: {data.get('access_token', 'N/A')[:20]}...")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                print(f"   Response: {response.text}")
        
        return False
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔐 Secure Admin Password Change Script")
    print("=" * 50)
    
    if "--test" in sys.argv:
        test_new_password()
    else:
        success = change_admin_password()
        
        if success:
            test_choice = input("\n🧪 Test new password now? (y/N): ").strip().lower()
            if test_choice == 'y':
                test_new_password()
        
        print("\n📋 Next steps:")
        print("1. Test login with new password")
        print("2. Update environment variables if needed")
        print("3. Update documentation")
        print("4. Notify team members if applicable") 