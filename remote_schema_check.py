#!/usr/bin/env python3
import os
"""
Remote schema checker - examines API responses to identify schema issues
"""

import requests
import json

BASE_URL = "https://jbms1.onrender.com/api"

def get_auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "admin", 
        "password": os.getenv("TEST_PASSWORD", "change-me")
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def check_orders_schema():
    """Check if orders table has required columns by testing creation"""
    token = get_auth_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get a customer
    customers = requests.get(f"{BASE_URL}/customers", headers=headers).json()
    if not customers:
        print("❌ No customers available for testing")
        return False
    
    customer_id = customers[0]["id"]
    
    # Test minimal order creation
    test_order = {
        "customer_id": customer_id,
        "order_items": [{
            "material_type": "saree",
            "quantity": 1,
            "unit_price": 100.0
        }]
    }
    
    print("🔍 Testing order creation to check schema...")
    response = requests.post(f"{BASE_URL}/orders", json=test_order, headers=headers)
    
    if response.status_code == 500:
        print("❌ Order creation failed with 500 - likely missing order_number column")
        return False
    elif response.status_code == 201:
        print("✅ Order creation works - schema is correct")
        order = response.json()
        print(f"   Created order: {order.get('order_number', 'No order number')}")
        return True
    else:
        print(f"⚠️  Unexpected response: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        return False

def check_materials_schema():
    """Check material_in/out schema"""
    token = get_auth_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get existing data for testing
    customers = requests.get(f"{BASE_URL}/customers", headers=headers).json()
    if not customers:
        return False
    
    customer_id = customers[0]["id"]
    
    # Test material_in creation
    test_material = {
        "customer_id": customer_id,
        "material_type": "saree",
        "quantity": 1,
        "unit": "pieces"
    }
    
    print("🔍 Testing material_in creation...")
    response = requests.post(f"{BASE_URL}/materials/in", json=test_material, headers=headers)
    
    if response.status_code == 500:
        print("❌ Material_in creation failed - likely missing customer_id column")
        return False
    elif response.status_code == 201:
        print("✅ Material_in creation works")
        return True
    else:
        print(f"⚠️  Material_in response: {response.status_code} - {response.text[:100]}")
        return False

def check_inventory_schema():
    """Check inventory schema"""
    token = get_auth_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test inventory creation
    test_inventory = {
        "item_name": f"Test Item {hash('test123') % 1000}",
        "category": "Test",
        "current_stock": 10.0,
        "unit": "pieces",
        "reorder_level": 5.0,
        "cost_per_unit": 25.0,
        "supplier_info": "Test Supplier"
    }
    
    print("🔍 Testing inventory creation...")
    response = requests.post(f"{BASE_URL}/inventory", json=test_inventory, headers=headers)
    
    if response.status_code == 500:
        print("❌ Inventory creation failed - likely supplier field mapping issue")
        return False
    elif response.status_code == 201:
        print("✅ Inventory creation works")
        return True
    else:
        print(f"⚠️  Inventory response: {response.status_code} - {response.text[:100]}")
        return False

def check_expenses_endpoint():
    """Check if expenses endpoint exists"""
    token = get_auth_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🔍 Testing expenses endpoint...")
    response = requests.get(f"{BASE_URL}/expenses", headers=headers)
    
    if response.status_code == 404:
        print("❌ Expenses endpoint not found - needs deployment")
        return False
    elif response.status_code == 200:
        print("✅ Expenses endpoint exists and works")
        return True
    else:
        print(f"⚠️  Expenses response: {response.status_code}")
        return False

def identify_schema_issues():
    """Comprehensive schema analysis"""
    print("JBMS Remote Schema Analysis")
    print("="*50)
    
    issues = []
    
    # Check each component
    if not check_orders_schema():
        issues.append("Orders table missing order_number column or auto-generation")
    
    if not check_materials_schema():
        issues.append("Material_in/out tables missing customer_id column")
    
    if not check_inventory_schema():
        issues.append("Inventory table has supplier field mapping issues")
    
    if not check_expenses_endpoint():
        issues.append("Expenses API endpoint not deployed")
    
    print(f"\n{'='*50}")
    print("SCHEMA ANALYSIS RESULTS")
    print("="*50)
    
    if issues:
        print("❌ Schema Issues Found:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
        
        print(f"\n🔧 Required Actions:")
        print(f"   1. Deploy all backend changes (code is ready)")
        print(f"   2. Run database migrations:")
        print(f"      - Add customer_id to material_in, material_out")
        print(f"      - Ensure order_number, challan_number, invoice_number columns exist")
        print(f"   3. Restart application to pick up new endpoints")
        
    else:
        print("✅ All schema checks passed!")
    
    return len(issues) == 0

if __name__ == "__main__":
    identify_schema_issues() 