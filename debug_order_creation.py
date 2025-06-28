#!/usr/bin/env python3
import os
"""
Debug script to test order creation step by step
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def main():
    print("🔍 Debugging Order Creation")
    
    # 1. Get authentication token
    print("\n1. Getting authentication token...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data="username=admin&password = os.getenv("TEST_PASSWORD", "change-me"),
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"✅ Token: {token[:20]}...")
    
    # 2. Get existing customer
    print("\n2. Getting customers...")
    customers_response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
    if customers_response.status_code != 200:
        print(f"❌ Failed to get customers: {customers_response.status_code}")
        return
    
    customers = customers_response.json()
    if not customers:
        print("❌ No customers found")
        return
    
    customer_id = customers[0]["id"]
    print(f"✅ Using customer: {customers[0]['name']} ({customer_id})")
    
    # 3. Test simple order creation
    print("\n3. Testing simple order creation...")
    order_data = {
        "customer_id": customer_id,
        "order_date": datetime.now().isoformat(),
        "status": "pending",
        "notes": "Debug test order - step by step",
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 100.00,
                "customization_details": "Simple test"
            }
        ]
    }
    
    print(f"Order data: {json.dumps(order_data, indent=2)}")
    
    # Test order creation
    order_response = requests.post(
        f"{BASE_URL}/api/orders/",
        json=order_data,
        headers=headers
    )
    
    print(f"\n📊 Response Status: {order_response.status_code}")
    print(f"📊 Response Headers: {dict(order_response.headers)}")
    
    if order_response.status_code >= 400:
        print(f"❌ Order creation failed")
        print(f"Response: {order_response.text}")
        
        # Try to get detailed error
        try:
            error_data = order_response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            print("Could not parse error response as JSON")
    else:
        print(f"✅ Order created successfully!")
        try:
            order_result = order_response.json()
            print(f"Order ID: {order_result.get('id', 'N/A')}")
            print(f"Order Number: {order_result.get('order_number', 'N/A')}")
        except:
            print("Could not parse success response as JSON")
            print(f"Raw response: {order_response.text}")
    
    # 4. Test order number generation separately
    print("\n4. Testing order number generation...")
    try:
        import sys
        sys.path.append('backend')
        from backend.app.core.database import get_db
        from backend.app.services.numbering import generate_order_number
        
        db = next(get_db())
        order_number = generate_order_number(db)
        print(f"✅ Generated order number: {order_number}")
        
    except Exception as e:
        print(f"❌ Order number generation failed: {str(e)}")
    
    print("\n🔍 Debug complete")

if __name__ == "__main__":
    main() 