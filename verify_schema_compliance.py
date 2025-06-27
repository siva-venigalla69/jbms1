#!/usr/bin/env python3
"""
Schema verification script to check if database matches Python models
"""

import requests
import json
import traceback

BASE_URL = "https://jbms1.onrender.com"

def check_database_schema():
    """Check database schema via API debug endpoint"""
    try:
        # Check basic health
        health_response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {health_response.status_code}")
        
        # Check database health
        db_health_response = requests.get(f"{BASE_URL}/health/db")
        print(f"Database health: {db_health_response.status_code}")
        
        # Check enum status
        enum_response = requests.get(f"{BASE_URL}/debug/enum-check")
        if enum_response.status_code == 200:
            enum_data = enum_response.json()
            print(f"Enum check: {json.dumps(enum_data, indent=2)}")
        else:
            print(f"Enum check failed: {enum_response.status_code}")
            
    except Exception as e:
        print(f"Error checking schema: {e}")
        traceback.print_exc()

def test_minimal_database_operations():
    """Test minimal database operations"""
    try:
        # Authenticate first
        auth_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin", "password": "Siri@2299"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if auth_response.status_code != 200:
            print(f"Auth failed: {auth_response.status_code}")
            return
            
        token = auth_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test simple customer list (should work)
        customers_response = requests.get(f"{BASE_URL}/api/customers/", headers=headers)
        print(f"Customer list: {customers_response.status_code}")
        
        # Test specific failing operations with unique phone numbers
        import uuid
        unique_phone = f"98765{str(uuid.uuid4().hex)[:5]}"
        
        # Test customer creation with unique phone
        customer_data = {
            "name": f"Schema Test Customer {uuid.uuid4().hex[:8]}",
            "phone": unique_phone,
            "email": f"schema_test_{uuid.uuid4().hex[:8]}@test.com"
        }
        
        customer_response = requests.post(f"{BASE_URL}/api/customers/", json=customer_data, headers=headers)
        print(f"Customer creation: {customer_response.status_code}")
        
        if customer_response.status_code == 201:
            customer = customer_response.json()
            customer_id = customer["id"]
            print(f"Customer created: {customer_id}")
            
            # Test minimal order creation with simplified data
            order_data = {
                "customer_id": customer_id,
                "status": "pending",
                "order_items": [
                    {
                        "material_type": "saree",
                        "quantity": 1,
                        "unit_price": 100.00
                    }
                ]
            }
            
            print("Testing order creation...")
            order_response = requests.post(f"{BASE_URL}/api/orders/", json=order_data, headers=headers)
            print(f"Order creation: {order_response.status_code}")
            
            if order_response.status_code != 201:
                print(f"Order error: {order_response.text}")
                
            # Test minimal material in
            material_data = {
                "customer_id": customer_id,
                "material_type": "saree",
                "quantity": 1,
                "unit": "pieces"
            }
            
            print("Testing material in...")
            material_response = requests.post(f"{BASE_URL}/api/materials/in", json=material_data, headers=headers)
            print(f"Material in: {material_response.status_code}")
            
            if material_response.status_code != 201:
                print(f"Material error: {material_response.text}")
                
            # Test inventory creation
            inventory_data = {
                "item_name": f"Test Item {uuid.uuid4().hex[:8]}",
                "category": "Colors", 
                "current_stock": 10.0,
                "unit": "kg",
                "reorder_level": 5.0,
                "cost_per_unit": 100.00
            }
            
            print("Testing inventory...")
            inventory_response = requests.post(f"{BASE_URL}/api/inventory/", json=inventory_data, headers=headers)
            print(f"Inventory creation: {inventory_response.status_code}")
            
            if inventory_response.status_code != 201:
                print(f"Inventory error: {inventory_response.text}")
        
    except Exception as e:
        print(f"Error in minimal test: {e}")
        traceback.print_exc()

def check_schema_endpoints():
    """Check if our schema migration worked"""
    print("=" * 60)
    print("SCHEMA VERIFICATION REPORT")
    print("=" * 60)
    
    print("\n1. Basic Health Checks:")
    check_database_schema()
    
    print("\n2. Database Operations Test:")
    test_minimal_database_operations()
    
    print("\n3. Summary:")
    print("   - If customer operations work: Database connection OK")
    print("   - If order creation fails: Schema migration incomplete")
    print("   - If material/inventory fail: New fields missing or enum issues")

if __name__ == "__main__":
    check_schema_endpoints() 