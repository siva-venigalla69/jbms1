#!/usr/bin/env python3
"""
Functional API Testing Script for JBMS Digital Textile Printing System
Tests APIs with correct schema requirements
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://jbms1.onrender.com"
API_BASE = f"{BASE_URL}/api"
PASSWORD = "Siri@2299"

class FunctionalAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_data = {}
        
    def login(self, username: str = "admin", password: str = PASSWORD) -> bool:
        """Login and get access token"""
        print(f"\n🔐 Testing Login...")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                data={"username": username, "password": password},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.token = result["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_workflow(self):
        """Test complete business workflow"""
        print("🚀 Testing Complete Business Workflow")
        print("="*60)
        
        if not self.login():
            return
            
        # Step 1: Create Customer
        print("\n📝 Step 1: Create Customer")
        customer_data = {
            "name": f"Workflow Customer {int(time.time())}",
            "phone": f"9876{int(time.time()) % 100000}",
            "email": f"workflow{int(time.time())}@test.com",
            "address": "123 Test Street, Test City",
            "gst_number": "29ABCDE1234F2Z5"
        }
        
        customer_result = self.session.post(f"{API_BASE}/customers", json=customer_data)
        if customer_result.status_code == 201:
            customer = customer_result.json()
            customer_id = customer["id"]
            self.test_data["customer_id"] = customer_id
            print(f"✅ Customer created: {customer_id}")
        else:
            print(f"❌ Customer creation failed: {customer_result.status_code}")
            return
            
        # Step 2: Create Order with Items
        print("\n📋 Step 2: Create Order with Items")
        order_data = {
            "customer_id": customer_id,
            "notes": "Test workflow order",
            "order_items": [
                {
                    "material_type": "saree",
                    "quantity": 3,
                    "unit_price": 1500.00,
                    "customization_details": "Red and gold border"
                },
                {
                    "material_type": "dupatta", 
                    "quantity": 2,
                    "unit_price": 800.00,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        order_result = self.session.post(f"{API_BASE}/orders", json=order_data)
        if order_result.status_code == 201:
            order = order_result.json()
            order_id = order["id"]
            self.test_data["order_id"] = order_id
            print(f"✅ Order created: {order_id}")
            print(f"   Order Number: {order['order_number']}")
            print(f"   Total Amount: ₹{order['total_amount']}")
        else:
            print(f"❌ Order creation failed: {order_result.status_code}")
            print(f"   Error: {order_result.text}")
            return
            
        # Step 3: Record Material In
        print("\n📦 Step 3: Record Material In")
        material_in_data = {
            "customer_id": customer_id,
            "order_id": order_id,
            "material_type": "saree",
            "quantity": 5,
            "unit": "pieces",
            "notes": "Received raw sarees for printing"
        }
        
        material_in_result = self.session.post(f"{API_BASE}/materials/in", json=material_in_data)
        if material_in_result.status_code == 201:
            material_in = material_in_result.json()
            print(f"✅ Material In recorded: {material_in['id']}")
        else:
            print(f"❌ Material In failed: {material_in_result.status_code}")
            print(f"   Error: {material_in_result.text}")
            
        # Step 4: Update Production Stages
        print("\n🏭 Step 4: Update Production Stages")
        # Get order items first
        order_detail = self.session.get(f"{API_BASE}/orders/{order_id}")
        if order_detail.status_code == 200:
            order = order_detail.json()
            if order["order_items"]:
                item_id = order["order_items"][0]["id"]
                
                # Update to printing stage
                stage_data = {"production_stage": "printing"}
                stage_result = self.session.put(f"{API_BASE}/orders/items/{item_id}/stage", json=stage_data)
                if stage_result.status_code == 200:
                    print(f"✅ Production stage updated to printing")
                else:
                    print(f"❌ Stage update failed: {stage_result.status_code}")
        
        # Step 5: Create Delivery Challan (if items are ready)
        print("\n🚛 Step 5: Create Delivery Challan")
        challan_data = {
            "customer_id": customer_id,
            "notes": "Test delivery",
            "challan_items": [
                {
                    "order_item_id": order["order_items"][0]["id"],
                    "quantity": 2
                }
            ]
        }
        
        challan_result = self.session.post(f"{API_BASE}/challans", json=challan_data)
        if challan_result.status_code == 201:
            challan = challan_result.json()
            challan_id = challan["id"]
            self.test_data["challan_id"] = challan_id
            print(f"✅ Delivery Challan created: {challan_id}")
            print(f"   Challan Number: {challan['challan_number']}")
        else:
            print(f"❌ Challan creation failed: {challan_result.status_code}")
            print(f"   Error: {challan_result.text}")
            return
            
        # Step 6: Create GST Invoice
        print("\n💰 Step 6: Create GST Invoice")
        invoice_data = {
            "customer_id": customer_id,
            "subtotal": 5900.00,
            "cgst_rate": 9.0,
            "sgst_rate": 9.0,
            "notes": "Test invoice",
            "challan_ids": [challan_id]
        }
        
        invoice_result = self.session.post(f"{API_BASE}/invoices", json=invoice_data)
        if invoice_result.status_code == 201:
            invoice = invoice_result.json()
            invoice_id = invoice["id"]
            self.test_data["invoice_id"] = invoice_id
            print(f"✅ GST Invoice created: {invoice_id}")
            print(f"   Invoice Number: {invoice['invoice_number']}")
            print(f"   Total Amount: ₹{invoice['total_amount']}")
        else:
            print(f"❌ Invoice creation failed: {invoice_result.status_code}")
            print(f"   Error: {invoice_result.text}")
            return
            
        # Step 7: Record Payment
        print("\n💳 Step 7: Record Payment")
        payment_data = {
            "invoice_id": invoice_id,
            "amount": 3000.00,
            "payment_method": "upi",
            "reference_number": f"UPI{int(time.time())}",
            "notes": "Partial payment via UPI"
        }
        
        payment_result = self.session.post(f"{API_BASE}/payments", json=payment_data)
        if payment_result.status_code == 201:
            payment = payment_result.json()
            print(f"✅ Payment recorded: {payment['id']}")
            print(f"   Amount: ₹{payment['amount']}")
        else:
            print(f"❌ Payment failed: {payment_result.status_code}")
            print(f"   Error: {payment_result.text}")
            
        # Step 8: Add Inventory Item
        print("\n📋 Step 8: Add Inventory Item")
        inventory_data = {
            "item_name": f"Test Dye {int(time.time())}",
            "category": "colors",
            "current_stock": 25.0,
            "unit": "kg",
            "reorder_level": 5.0,
            "cost_per_unit": 200.0,
            "supplier_name": "Test Supplier",
            "supplier_contact": "9876543210"
        }
        
        inventory_result = self.session.post(f"{API_BASE}/inventory", json=inventory_data)
        if inventory_result.status_code == 201:
            inventory = inventory_result.json()
            print(f"✅ Inventory item added: {inventory['id']}")
        else:
            print(f"❌ Inventory failed: {inventory_result.status_code}")
            print(f"   Error: {inventory_result.text}")
            
        print("\n" + "="*60)
        print("🎉 Workflow Testing Complete!")
        print("="*60)
        
        # Print summary
        print("\n📊 Created Resources:")
        for key, value in self.test_data.items():
            print(f"   {key}: {value}")
            
    def test_reports_and_lists(self):
        """Test all list and report endpoints"""
        print("\n📊 Testing Reports & Lists")
        print("="*40)
        
        endpoints = [
            ("GET", "/customers", "List Customers"),
            ("GET", "/orders", "List Orders"),
            ("GET", "/materials/in", "List Material In"),
            ("GET", "/materials/out", "List Material Out"),
            ("GET", "/challans", "List Challans"),
            ("GET", "/payments", "List Payments"),
            ("GET", "/inventory", "List Inventory"),
        ]
        
        for method, endpoint, desc in endpoints:
            try:
                response = self.session.get(f"{API_BASE}{endpoint}")
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else "N/A"
                    print(f"✅ {desc}: {count} records")
                else:
                    print(f"❌ {desc}: {response.status_code}")
            except Exception as e:
                print(f"❌ {desc}: Error - {str(e)[:50]}")
                
    def run_tests(self):
        """Run all functional tests"""
        self.test_workflow()
        self.test_reports_and_lists()

if __name__ == "__main__":
    tester = FunctionalAPITester()
    tester.run_tests() 