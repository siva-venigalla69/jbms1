#!/usr/bin/env python3
import os
"""
Simplified API Testing Script to identify specific issues
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://jbms1.onrender.com"
API_BASE = f"{BASE_URL}/api"
PASSWORD = os.getenv("TEST_PASSWORD", "change-me")

def login():
    """Login and get token"""
    response = requests.post(
        f"{API_BASE}/auth/login",
        data={"username": "admin", "password": PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    else:
        print(f"Login failed: {response.status_code}")
        return None

def test_simple_order_creation():
    """Test minimal order creation"""
    headers = login()
    if not headers:
        return
        
    print("\n🧪 Testing Simple Order Creation...")
    
    # First, create a customer
    customer_data = {
        "name": f"Simple Test Customer {int(time.time())}",
        "phone": f"9999{int(time.time()) % 100000}",
    }
    
    customer_response = requests.post(f"{API_BASE}/customers", json=customer_data, headers=headers)
    if customer_response.status_code != 201:
        print(f"❌ Customer creation failed: {customer_response.status_code}")
        return
    
    customer_id = customer_response.json()["id"]
    print(f"✅ Customer created: {customer_id}")
    
    # Try minimal order data
    order_data = {
        "customer_id": customer_id,
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 1000.00
            }
        ]
    }
    
    print("📋 Attempting order creation...")
    order_response = requests.post(f"{API_BASE}/orders", json=order_data, headers=headers)
    
    print(f"Status: {order_response.status_code}")
    print(f"Response: {order_response.text[:500]}")
    
    if order_response.status_code == 201:
        order = order_response.json()
        print(f"✅ Order created successfully: {order['id']}")
        return order["id"]
    else:
        print("❌ Order creation failed")
        return None

def test_material_in():
    """Test material in endpoint"""
    headers = login()
    if not headers:
        return
        
    print("\n🧪 Testing Material In...")
    
    # Create customer first
    customer_data = {"name": f"Material Test {int(time.time())}", "phone": f"8888{int(time.time()) % 100000}"}
    customer_response = requests.post(f"{API_BASE}/customers", json=customer_data, headers=headers)
    customer_id = customer_response.json()["id"]
    
    material_data = {
        "customer_id": customer_id,
        "material_type": "saree",
        "quantity": 5,
        "unit": "pieces",
        "notes": "Test material in"
    }
    
    response = requests.post(f"{API_BASE}/materials/in", json=material_data, headers=headers)
    print(f"Material In Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")

def test_expense_creation():
    """Test expense creation"""
    headers = login()
    if not headers:
        return
        
    print("\n🧪 Testing Expense Creation...")
    
    expense_data = {
        "category": "test",
        "description": "Test expense", 
        "amount": 100.00,
        "payment_method": "cash"
    }
    
    response = requests.post(f"{API_BASE}/expenses", json=expense_data, headers=headers)
    print(f"Expense Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")

def test_invoice_listing():
    """Test invoice listing"""
    headers = login()
    if not headers:
        return
        
    print("\n🧪 Testing Invoice Listing...")
    
    response = requests.get(f"{API_BASE}/invoices", headers=headers)
    print(f"Invoice List Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")

def test_user_listing():
    """Test user listing that's failing"""
    headers = login()
    if not headers:
        return
        
    print("\n🧪 Testing User Listing...")
    
    response = requests.get(f"{API_BASE}/auth/users", headers=headers)
    print(f"User List Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")

def main():
    print("🔬 Running Simplified API Tests")
    print("="*40)
    
    test_simple_order_creation()
    test_material_in()
    test_expense_creation()
    test_invoice_listing()
    test_user_listing()
    
    print("\n✅ Simplified testing complete")

if __name__ == "__main__":
    main() 