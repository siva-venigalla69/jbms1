#!/usr/bin/env python3
import os
"""
Debug specific API endpoints to understand 500 errors
"""

import requests
import json

BASE_URL = "https://jbms1.onrender.com/api"

# Get token first
def get_token():
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "admin",
        "password": os.getenv("TEST_PASSWORD", "change-me")
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to authenticate: {response.status_code}")
        return None

def test_order_creation():
    token = get_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get a customer first
    customers_response = requests.get(f"{BASE_URL}/customers", headers=headers)
    if customers_response.status_code != 200:
        print(f"Failed to get customers: {customers_response.status_code}")
        return
    
    customers = customers_response.json()
    if not customers:
        print("No customers found")
        return
    
    customer_id = customers[0]["id"]
    print(f"Using customer ID: {customer_id}")
    
    # Test simple order creation
    order_data = {
        "customer_id": customer_id,
        "notes": "Test order",
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 100.0,
                "customization_details": "Test item"
            }
        ]
    }
    
    print("Creating order...")
    response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
    print(f"Order creation response: {response.status_code}")
    print(f"Response body: {response.text}")

def test_inventory_creation():
    token = get_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    inventory_data = {
        "item_name": f"Test Item {hash('test') % 1000}",
        "category": "Test",
        "current_stock": 10.0,
        "unit": "pieces",
        "reorder_level": 5.0,
        "cost_per_unit": 25.0,
        "supplier_info": "Test Supplier - 123456789"
    }
    
    print("Creating inventory item...")
    response = requests.post(f"{BASE_URL}/inventory", json=inventory_data, headers=headers)
    print(f"Inventory creation response: {response.status_code}")
    print(f"Response body: {response.text}")

def test_expenses():
    token = get_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing expenses endpoint...")
    response = requests.get(f"{BASE_URL}/expenses", headers=headers)
    print(f"Expenses list response: {response.status_code}")
    print(f"Response body: {response.text}")

if __name__ == "__main__":
    print("=== Testing Order Creation ===")
    test_order_creation()
    
    print("\n=== Testing Inventory Creation ===")
    test_inventory_creation()
    
    print("\n=== Testing Expenses Endpoint ===")
    test_expenses() 