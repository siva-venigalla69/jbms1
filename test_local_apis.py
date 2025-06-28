#!/usr/bin/env python3
import requests
import json

import os
BASE_URL = "http://localhost:8000"

def test_local_apis():
    print("🧪 Testing Local APIs")
    print("=" * 40)
    
    # Test health endpoint
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check: OK")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test authentication
    try:
        login_data = "username=admin&password = os.getenv("TEST_PASSWORD", "change-me")
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data=login_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"✅ Authentication: OK")
            print(f"   Token: {token_data.get('access_token', 'N/A')[:20]}...")
            return token_data.get('access_token')
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_order_creation(token):
    '''Test order creation locally'''
    print("\n🔍 Testing Order Creation Locally")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create test customer first
    customer_data = {
        "name": "Local Test Customer",
        "phone": "9999999999",
        "email": "test@localhost.com"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/customers",
            json=customer_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            customer = response.json()
            customer_id = customer.get('id')
            print(f"✅ Test customer created: {customer_id}")
            
            # Test order creation
            order_data = {
                "customer_id": customer_id,
                "status": "pending",
                "notes": "Local test order",
                "order_items": [
                    {
                        "material_type": "saree",
                        "quantity": 1,
                        "unit_price": 100.00,
                        "customization_details": "Test saree"
                    }
                ]
            }
            
            response = requests.post(
                f"{BASE_URL}/api/orders",
                json=order_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                order = response.json()
                print(f"✅ Order created successfully: {order.get('order_number', 'N/A')}")
                return True
            else:
                print(f"❌ Order creation failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
        else:
            print(f"❌ Customer creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Order creation test error: {e}")
        return False

if __name__ == "__main__":
    token = test_local_apis()
    if token:
        test_order_creation(token)
    else:
        print("❌ Cannot proceed with order test - authentication failed")
