#!/usr/bin/env python3
"""
Local API Testing Script
Tests APIs locally against Render database
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_auth():
    """Test authentication"""
    print("🔐 Testing Authentication...")
    
    try:
        login_data = "username=admin&password=Siri@2299"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data=login_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            print("✅ Authentication successful")
            return token_data.get('access_token')
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_order_creation_detailed(token):
    """Test order creation with detailed debugging"""
    print("\n🔍 Testing Order Creation (Detailed Debug)...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Create a test customer
    print("   Step 1: Creating test customer...")
    customer_data = {
        "name": f"Debug Customer {int(time.time())}",
        "phone": f"99999{int(time.time()) % 100000}",
        "email": f"debug_{int(time.time())}@test.com"
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
            print(f"   ✅ Customer created: {customer_id}")
        else:
            print(f"   ❌ Customer creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Customer creation error: {e}")
        return False
    
    # Step 2: Test minimal order creation
    print("   Step 2: Testing minimal order creation...")
    order_data = {
        "customer_id": customer_id,
        "status": "pending",
        "notes": "Local debug test order",
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 100.00,
                "customization_details": "Debug test saree"
            }
        ]
    }
    
    try:
        print(f"   📤 Sending order data: {json.dumps(order_data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers,
            timeout=15
        )
        
        print(f"   📥 Response status: {response.status_code}")
        print(f"   📥 Response headers: {dict(response.headers)}")
        
        if response.status_code in [200, 201]:
            order = response.json()
            print(f"   ✅ Order created successfully!")
            print(f"      Order Number: {order.get('order_number', 'N/A')}")
            print(f"      Order ID: {order.get('id', 'N/A')}")
            return True
        else:
            print(f"   ❌ Order creation failed: {response.status_code}")
            print(f"   📄 Response body: {response.text}")
            
            # Try to parse error details
            try:
                error_data = response.json()
                print(f"   🔍 Error details: {json.dumps(error_data, indent=2)}")
            except:
                print("   ⚠️  Could not parse error response as JSON")
            
            return False
            
    except Exception as e:
        print(f"   ❌ Order creation error: {e}")
        return False

def test_inventory_adjustment(token):
    """Test inventory adjustment"""
    print("\n🔍 Testing Inventory Adjustment...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # First get or create inventory item
    print("   Step 1: Getting existing inventory items...")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory", headers=headers, timeout=10)
        
        if response.status_code == 200:
            inventory_items = response.json()
            print(f"   Found {len(inventory_items)} inventory items")
            
            if inventory_items:
                # Use first inventory item
                item_id = inventory_items[0]['id']
                print(f"   ✅ Using inventory item: {item_id}")
                
                # Test adjustment
                adjustment_data = {
                    "adjustment_type": "quantity_change",
                    "quantity_change": -1.0,
                    "reason": "Local test adjustment",
                    "notes": "Debug test from local environment"
                }
                
                response = requests.post(
                    f"{BASE_URL}/api/inventory/{item_id}/adjust",
                    json=adjustment_data,
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code in [200, 201]:
                    print("   ✅ Inventory adjustment successful")
                    return True
                else:
                    print(f"   ❌ Inventory adjustment failed: {response.status_code}")
                    print(f"   📄 Response: {response.text}")
                    return False
            else:
                print("   ⚠️  No inventory items found - skipping adjustment test")
                return None
        else:
            print(f"   ❌ Failed to get inventory: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Inventory adjustment error: {e}")
        return False

def test_pending_receivables(token):
    """Test pending receivables report"""
    print("\n🔍 Testing Pending Receivables Report...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/reports/pending-receivables",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("   ✅ Pending receivables report successful")
            data = response.json()
            print(f"   📊 Found {data.get('count', 0)} pending receivables")
            return True
        else:
            print(f"   ❌ Pending receivables failed: {response.status_code}")
            print(f"   📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Pending receivables error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 LOCAL API TESTING AGAINST RENDER DATABASE")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Test authentication
    token = test_auth()
    if not token:
        print("❌ Cannot proceed - authentication failed")
        return
    
    print(f"🎫 Token obtained: {token[:20]}...")
    
    # Test each problematic endpoint
    results = {}
    
    results['order_creation'] = test_order_creation_detailed(token)
    results['inventory_adjustment'] = test_inventory_adjustment(token)
    results['pending_receivables'] = test_pending_receivables(token)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, result in results.items():
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
        else:
            status = "⚠️  SKIP"
        print(f"{test_name}: {status}")
    
    failed_tests = [name for name, result in results.items() if result is False]
    if failed_tests:
        print(f"\n❌ {len(failed_tests)} tests failed: {', '.join(failed_tests)}")
        print("💡 Check server logs for detailed error information")
    else:
        print("\n✅ All tests passed!")

if __name__ == "__main__":
    main()
