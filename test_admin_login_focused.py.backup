#!/usr/bin/env python3
"""
Focused Admin Login Test with Provided Password
"""

import requests
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://jbms1.onrender.com"

def test_admin_login():
    """Test admin login with provided password and various usernames"""
    
    password = "Siri@2299"  # Provided password
    
    # Usernames to try
    usernames = [
        "admin",
        "siva.data9@outlook.com", 
        "Siva Venigalla",
        "siva",
        "administrator",
        "root",
        "user"
    ]
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    
    print(f"🔐 Testing Admin Login with Password: {password}")
    print("=" * 60)
    
    for username in usernames:
        print(f"\n🔑 Trying username: {username}")
        
        login_data = f"username={username}&password={password}"
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                data=login_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                print(f"   ✅ SUCCESS! Login successful")
                print(f"   Token received: {token_data.get('access_token')[:50]}...")
                
                # Test the token
                test_token(token_data.get('access_token'))
                return username, password, token_data.get('access_token')
                
            else:
                try:
                    error_data = response.json()
                    print(f"   ❌ Failed: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   ❌ Failed: HTTP {response.status_code}")
                    
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    print(f"\n❌ No successful login found with password: {password}")
    return None, None, None

def test_token(token):
    """Test the received token"""
    if not token:
        return
    
    print(f"\n🎯 Testing Token...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=30, verify=False)
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✅ Token valid! User info:")
            print(f"   - Username: {user_data.get('username')}")
            print(f"   - Email: {user_data.get('email')}")
            print(f"   - Full Name: {user_data.get('full_name')}")
            print(f"   - Role: {user_data.get('role')}")
            print(f"   - Active: {user_data.get('is_active')}")
        else:
            print(f"   ❌ Token test failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Token test error: {str(e)}")

if __name__ == "__main__":
    username, password, token = test_admin_login()
    
    if username and token:
        print(f"\n🎉 SUCCESSFUL CREDENTIALS FOUND:")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Token: {token[:50]}...")
        print(f"\n✅ Ready to run full authentication test suite!")
    else:
        print(f"\n❌ No working credentials found. May need to check database or create admin user.") 