#!/usr/bin/env python3
"""
Debug script to test authentication step by step
"""
import requests
import json

def test_basic_endpoints():
    """Test basic API endpoints"""
    base_url = "https://jbms1.onrender.com"
    
    print("=== TESTING BASIC ENDPOINTS ===")
    
    # Test health
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health error: {e}")
    
    # Test database health
    try:
        response = requests.get(f"{base_url}/health/db")
        print(f"DB Health: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"DB Health error: {e}")
    
    # Test root endpoint
    try:
        response = requests.get(f"{base_url}/")
        print(f"Root: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Root error: {e}")

def test_auth_endpoint():
    """Test authentication endpoint with detailed error info"""
    base_url = "https://jbms1.onrender.com"
    
    print("\n=== TESTING AUTH ENDPOINT ===")
    
    login_data = {
        "username": "admin",
        "password": "Siri@2912"
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            data=login_data,
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            json_response = response.json()
            print(f"Response: {json.dumps(json_response, indent=2)}")
        except:
            print(f"Raw Response: {response.text}")
            
    except Exception as e:
        print(f"Auth test error: {e}")

def test_other_auth_endpoints():
    """Test other auth-related endpoints"""
    base_url = "https://jbms1.onrender.com"
    
    print("\n=== TESTING OTHER AUTH ENDPOINTS ===")
    
    # Test with wrong credentials
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            data={"username": "wrong", "password": "wrong"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Wrong creds: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Wrong creds error: {e}")

if __name__ == "__main__":
    print("🔍 Debugging authentication issues...")
    test_basic_endpoints()
    test_auth_endpoint()
    test_other_auth_endpoints()
    print("\n✅ Debug tests completed!") 