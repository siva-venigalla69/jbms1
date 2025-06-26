#!/usr/bin/env python3
"""
Quick test script for admin login after enum fix
"""

import requests
import json

def test_admin_login():
    """Test admin login with corrected enum values"""
    
    base_url = "https://jbms1.onrender.com"
    
    print("🔍 Testing Admin Login with CORRECTED Enum Values")
    print("=" * 50)
    
    # Login credentials
    credentials = {
        "username": "admin",
        "password": "Siri@2912"
    }
    
    try:
        # Test login
        print("1. Testing login...")
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            data=credentials,  # Form data for OAuth2
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30
        )
        
        print(f"Status Code: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get("access_token")
            
            print("✅ LOGIN SUCCESSFUL!")
            print(f"Token Type: {login_data.get('token_type')}")
            print(f"Access Token: {access_token[:20]}...")
            
            # Test getting user info
            print("\n2. Testing user info...")
            headers = {"Authorization": f"Bearer {access_token}"}
            
            user_response = requests.get(
                f"{base_url}/api/auth/me",
                headers=headers,
                timeout=30
            )
            
            if user_response.status_code == 200:
                user_data = user_response.json()
                print("✅ USER INFO RETRIEVED!")
                print(f"Username: {user_data.get('username')}")
                print(f"Email: {user_data.get('email')}")
                print(f"Role: {user_data.get('role')} (Should be 'admin' lowercase)")
                print(f"Full Name: {user_data.get('full_name')}")
                
                return True
            else:
                print(f"❌ Failed to get user info: {user_response.status_code}")
                print(user_response.text)
                
        else:
            print(f"❌ LOGIN FAILED: {login_response.status_code}")
            try:
                error_data = login_response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw response: {login_response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    
    return False

if __name__ == "__main__":
    success = test_admin_login()
    
    if success:
        print("\n🎉 ENUM FIX SUCCESSFUL!")
        print("The application now works with lowercase enum values!")
        print("You can proceed with comprehensive API testing.")
    else:
        print("\n❌ Still having issues. Check:")
        print("1. Did you run the SQL commands from create_admin_final.py?")
        print("2. Is the backend deployed with the updated models.py?")
        print("3. Check the backend logs for any errors.") 