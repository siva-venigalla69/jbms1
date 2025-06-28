#!/usr/bin/env python3
import os
"""
Debug script to test individual API calls and get detailed error messages
"""

import requests
import json
from datetime import datetime, timezone

BASE_URL = "https://jbms1.onrender.com"
API_URL = f"{BASE_URL}/api"

def authenticate():
    """Get auth token"""
    response = requests.post(
        f"{API_URL}/auth/login",
        data={"username": "admin", "password": os.getenv("TEST_PASSWORD", "change-me")},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Auth failed: {response.status_code} - {response.text}")
        return None

def test_order_creation(token):
    """Test order creation to see detailed error"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # First create a customer
    customer_data = {
        "name": "Debug Customer",
        "phone": "9876543210",
        "email": "debug@test.com"
    }
    
    customer_response = requests.post(f"{API_URL}/customers/", json=customer_data, headers=headers)
    if customer_response.status_code != 201:
        print(f"Customer creation failed: {customer_response.status_code} - {customer_response.text}")
        return
        
    customer = customer_response.json()
    customer_id = customer["id"]
    print(f"Created customer: {customer_id}")
    
    # Now try order creation
    order_data = {
        "customer_id": customer_id,
        "status": "pending",
        "total_amount": 1000.00,
        "notes": "Debug order",
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 1000.00,
                "customization_details": "Debug saree"
            }
        ]
    }
    
    print("Attempting order creation...")
    order_response = requests.post(f"{API_URL}/orders/", json=order_data, headers=headers)
    print(f"Order creation response: {order_response.status_code}")
    print(f"Response body: {order_response.text}")

def test_material_in(token):
    """Test material in creation"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create customer first
    customer_data = {
        "name": "Material Debug Customer",
        "phone": "9876543211",
        "email": "material@test.com"
    }
    
    customer_response = requests.post(f"{API_URL}/customers/", json=customer_data, headers=headers)
    if customer_response.status_code != 201:
        print(f"Customer creation failed: {customer_response.status_code}")
        return
        
    customer = customer_response.json()
    customer_id = customer["id"]
    
    # Try material in
    material_data = {
        "customer_id": customer_id,
        "material_type": "saree", 
        "quantity": 2,
        "unit": "pieces",
        "notes": "Debug material"
    }
    
    print("Attempting material in creation...")
    material_response = requests.post(f"{API_URL}/materials/in", json=material_data, headers=headers)
    print(f"Material in response: {material_response.status_code}")
    print(f"Response body: {material_response.text}")

def test_inventory_creation(token):
    """Test inventory creation"""
    headers = {"Authorization": f"Bearer {token}"}
    
    inventory_data = {
        "item_name": "Debug Color",
        "category": "Colors",
        "current_stock": 50.0,
        "unit": "kg",
        "reorder_level": 10.0,
        "cost_per_unit": 150.00,
        "supplier_name": "Debug Supplier",
        "supplier_contact": "9876543212"
    }
    
    print("Attempting inventory creation...")
    inventory_response = requests.post(f"{API_URL}/inventory/", json=inventory_data, headers=headers)
    print(f"Inventory response: {inventory_response.status_code}")
    print(f"Response body: {inventory_response.text}")

if __name__ == "__main__":
    print("🔍 Debugging API Errors")
    print("=" * 50)
    
    token = authenticate()
    if not token:
        print("Failed to authenticate")
        exit(1)
    
    print("✅ Authentication successful")
    print()
    
    print("Testing Order Creation:")
    test_order_creation(token)
    print()
    
    print("Testing Material In:")
    test_material_in(token)
    print()
    
    print("Testing Inventory Creation:")
    test_inventory_creation(token) 