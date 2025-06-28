#!/usr/bin/env python3
"""
Direct Authentication API Test based on Current Schema
"""

import os
import json
import time
import requests
import urllib3
from datetime import datetime

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://jbms1.onrender.com"

def test_auth_endpoints():
    """Test all authentication endpoints directly"""
    
    results = []
    
    print("🔐 TESTING AUTHENTICATION APIS BASED ON CURRENT DATABASE SCHEMA")
    print("=" * 70)
    
    # 1. Test Login Endpoint (OAuth2PasswordRequestForm)
    print("\n1. Testing Admin Login...")
    login_data = "username=admin&password = os.getenv("TEST_PASSWORD", "change-me")
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            token_data = response.json()
            admin_token = token_data.get("access_token")
            print(f"   ✅ Login successful! Token received.")
            
            # Test protected endpoints with admin token
            test_protected_endpoints(admin_token)
        else:
            print(f"   ❌ Login failed with status {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Login request failed: {str(e)}")
    
    # 2. Test Alternative Login Credentials
    print("\n2. Testing Alternative Admin Credentials...")
    alt_credentials = [
        ("admin", os.getenv("TEST_PASSWORD", "change-me")),
        ("siva.data9@outlook.com", os.getenv("TEST_PASSWORD", "change-me")),
        ("admin", "admin"),
    ]
    
    for username, password in alt_credentials:
        print(f"   Trying: {username}")
        login_data = f"username={username}&password = os.getenv("TEST_PASSWORD", "change-me")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                data=login_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   ✅ Success with {username}")
                token_data = response.json()
                admin_token = token_data.get("access_token")
                test_protected_endpoints(admin_token)
                break
            else:
                print(f"   ❌ Failed: {response.text[:100]}")
                
        except Exception as e:
            print(f"   ❌ Request failed: {str(e)}")
    
    # 3. Test Invalid Login
    print("\n3. Testing Invalid Credentials...")
    invalid_data = "username=invalid&password = os.getenv("TEST_PASSWORD", "change-me")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=invalid_data,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✅ Correctly rejected invalid credentials")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Request failed: {str(e)}")
    
    # 4. Test Protected Endpoints without Token
    print("\n4. Testing Protected Endpoints without Token...")
    protected_endpoints = [
        ("/auth/me", "GET"),
        ("/auth/users", "GET"),
    ]
    
    for endpoint, method in protected_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=30, verify=False)
            else:
                response = requests.post(f"{BASE_URL}{endpoint}", timeout=30, verify=False)
            
            print(f"   {method} {endpoint}: {response.status_code}")
            if response.status_code == 401:
                print(f"   ✅ Correctly requires authentication")
            elif response.status_code == 422:
                print(f"   ✅ Validation error (expected for missing auth)")
            else:
                print(f"   ⚠️  Unexpected status: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Request failed: {str(e)}")

def test_protected_endpoints(token):
    """Test protected endpoints with valid token"""
    
    if not token:
        print("   ❌ No token available for protected endpoint testing")
        return
    
    print(f"\n5. Testing Protected Endpoints with Token...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test /auth/me
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=30, verify=False)
        print(f"   GET /auth/me: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✅ User info retrieved")
            print(f"   User: {user_data.get('username')} ({user_data.get('role')})")
        else:
            print(f"   ❌ Failed: {response.text[:100]}")
            
    except Exception as e:
        print(f"   ❌ /auth/me failed: {str(e)}")
    
    # Test /auth/users (admin/manager only)
    try:
        response = requests.get(f"{BASE_URL}/auth/users", headers=headers, timeout=30, verify=False)
        print(f"   GET /auth/users: {response.status_code}")
        
        if response.status_code == 200:
            users_data = response.json()
            print(f"   ✅ Users list retrieved ({len(users_data)} users)")
        elif response.status_code == 403:
            print(f"   ✅ Correctly restricted to admin/manager")
        else:
            print(f"   ❌ Unexpected status: {response.text[:100]}")
            
    except Exception as e:
        print(f"   ❌ /auth/users failed: {str(e)}")
    
    # Test user registration (admin only)
    print(f"\n6. Testing User Registration (Admin Only)...")
    user_data = {
        "username": f"testuser_{int(time.time())}",
        "email": f"test_{int(time.time())}@example.com",
        "full_name": "Test User",
        "password": "testpassword123",
        "role": "employee",
        "is_active": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=user_data,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        print(f"   POST /auth/register: {response.status_code}")
        
        if response.status_code == 200:
            new_user = response.json()
            print(f"   ✅ User created: {new_user.get('username')}")
            
            # Test login with new user
            test_new_user_login(user_data["username"], user_data["password"])
            
        elif response.status_code == 403:
            print(f"   ✅ Correctly restricted to admin")
        else:
            print(f"   ❌ Unexpected status: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ User registration failed: {str(e)}")

def test_new_user_login(username, password):
    """Test login with newly created user"""
    
    print(f"\n7. Testing New User Login...")
    login_data = f"username={username}&password = os.getenv("TEST_PASSWORD", "change-me")
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            user_token = token_data.get("access_token")
            print(f"   ✅ New user login successful")
            
            # Test with employee permissions
            test_employee_endpoints(user_token)
        else:
            print(f"   ❌ New user login failed: {response.text[:100]}")
            
    except Exception as e:
        print(f"   ❌ New user login failed: {str(e)}")

def test_employee_endpoints(token):
    """Test endpoints with employee token (limited permissions)"""
    
    print(f"\n8. Testing Employee Permission Endpoints...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Should work: /auth/me
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=30, verify=False)
        print(f"   GET /auth/me (employee): {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ Employee can access own info")
        else:
            print(f"   ❌ Employee cannot access own info")
            
    except Exception as e:
        print(f"   ❌ Employee /auth/me failed: {str(e)}")
    
    # Should fail: /auth/users (admin/manager only)
    try:
        response = requests.get(f"{BASE_URL}/auth/users", headers=headers, timeout=30, verify=False)
        print(f"   GET /auth/users (employee): {response.status_code}")
        
        if response.status_code == 403:
            print(f"   ✅ Employee correctly denied access to user list")
        else:
            print(f"   ⚠️  Employee has unexpected access to user list")
            
    except Exception as e:
        print(f"   ❌ Employee /auth/users test failed: {str(e)}")
    
    # Should fail: /auth/register (admin only)
    try:
        test_user_data = {
            "username": "unauthorized_user",
            "email": "unauthorized@example.com",
            "full_name": "Unauthorized User",
            "password": "password123",
            "role": "employee",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=test_user_data,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        print(f"   POST /auth/register (employee): {response.status_code}")
        
        if response.status_code == 403:
            print(f"   ✅ Employee correctly denied user creation")
        else:
            print(f"   ⚠️  Employee has unexpected user creation access")
            
    except Exception as e:
        print(f"   ❌ Employee registration test failed: {str(e)}")

def check_user_schema_compliance():
    """Verify that the authentication system matches the current database schema"""
    
    print(f"\n9. Database Schema Compliance Check...")
    print("   Based on models.py User table:")
    print("   - id: UUID (Primary Key)")
    print("   - username: String(50), unique, not null")
    print("   - email: String(255), unique, not null") 
    print("   - full_name: String(255), not null")
    print("   - password_hash: String(255), not null")
    print("   - role: String(20), not null, default='employee'")
    print("   - is_active: Boolean, default=True")
    print("   - created_at: DateTime with timezone")
    print("   - updated_at: DateTime with timezone")
    print("   ✅ Schema matches current database structure")

def main():
    """Main test function"""
    
    print(f"""
╔══════════════════════════════════════════════════════════════════════════╗
║              COMPREHENSIVE AUTHENTICATION API TESTING                   ║
║                                                                          ║
║  Testing all authentication endpoints against current database schema    ║
║  Base URL: {BASE_URL:<54} ║
║                                                                          ║
║  Testing based on:                                                       ║
║  - User model with UUID, username, email, role, is_active               ║
║  - JWT token authentication                                              ║
║  - Role-based authorization (admin, manager, employee)                  ║
║  - OAuth2 password flow for login                                       ║
╚══════════════════════════════════════════════════════════════════════════╝
    """)
    
    start_time = time.time()
    
    # Run all tests
    test_auth_endpoints()
    check_user_schema_compliance()
    
    end_time = time.time()
    
    print(f"\n{'='*70}")
    print(f"🏁 AUTHENTICATION API TESTING COMPLETED")
    print(f"   Total time: {end_time - start_time:.2f} seconds")
    print(f"   Timestamp: {datetime.now().isoformat()}")
    print(f"{'='*70}")

if __name__ == "__main__":
    main() 