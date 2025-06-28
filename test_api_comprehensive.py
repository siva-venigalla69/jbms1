#!/usr/bin/env python3
import os
"""
Comprehensive API Testing Script for JBMS Digital Textile Printing System
Tests all endpoints against https://jbms1.onrender.com/docs
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://jbms1.onrender.com"
API_BASE = f"{BASE_URL}/api"
PASSWORD = os.getenv("TEST_PASSWORD", "change-me")

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_info = None
        self.test_data = {}
        
    def login(self, username: str = "admin", password = os.getenv("TEST_PASSWORD", "change-me") -> bool:
        """Login and get access token"""
        print(f"\n🔐 Testing Login...")
        
        login_data = {
            "username": username,
            "password": password
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.token = result["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"✅ Login successful - Token obtained")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_endpoint(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                     expected_status: int = 200, description: str = "") -> Dict[str, Any]:
        """Test a single endpoint"""
        url = f"{API_BASE}{endpoint}"
        print(f"\n🧪 Testing {method.upper()} {endpoint} - {description}")
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
                expected_status = 201  # POST usually returns 201 Created
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                print(f"❌ Unsupported method: {method}")
                return {"success": False, "error": "Unsupported method"}
            
            success = response.status_code == expected_status
            
            if success:
                print(f"✅ Success: {response.status_code}")
                try:
                    result_data = response.json()
                    return {"success": True, "data": result_data, "status": response.status_code}
                except:
                    return {"success": True, "data": response.text, "status": response.status_code}
            else:
                print(f"❌ Failed: {response.status_code} - {response.text}")
                return {"success": False, "status": response.status_code, "error": response.text}
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_health_endpoints(self):
        """Test health and info endpoints"""
        print("\n" + "="*50)
        print("🏥 TESTING HEALTH & INFO ENDPOINTS")
        print("="*50)
        
        # Test basic health - note: endpoint is /health not /api/health
        print(f"\n🧪 Testing GET /health - Basic health check")
        try:
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print(f"✅ Success: {response.status_code}")
            else:
                print(f"❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
        
        # Test database health  
        print(f"\n🧪 Testing GET /health/db - Database health check")
        try:
            response = requests.get(f"{BASE_URL}/health/db")
            if response.status_code == 200:
                print(f"✅ Success: {response.status_code}")
            else:
                print(f"❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
        
        # Test version info
        print(f"\n🧪 Testing GET /version - Version information")
        try:
            response = requests.get(f"{BASE_URL}/version")
            if response.status_code == 200:
                print(f"✅ Success: {response.status_code}")
            else:
                print(f"❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
        
        # Test root endpoint
        response = requests.get(BASE_URL)
        print(f"\n🧪 Testing GET / - Root endpoint")
        if response.status_code == 200:
            print(f"✅ Success: {response.status_code}")
        else:
            print(f"❌ Failed: {response.status_code}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("🔐 TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test login
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Test get current user
        result = self.test_endpoint("GET", "/auth/me", description="Get current user info")
        if result["success"]:
            self.user_info = result["data"]
            print(f"   User: {self.user_info.get('username')} ({self.user_info.get('role')})")
        
        # Test list users (might fail due to some issues)
        self.test_endpoint("GET", "/auth/users", description="List all users")
        
        return True

    def test_customer_endpoints(self):
        """Test customer management endpoints"""
        print("\n" + "="*50)
        print("👥 TESTING CUSTOMER ENDPOINTS")
        print("="*50)
        
        # Test list customers
        result = self.test_endpoint("GET", "/customers", description="List all customers")
        
        # Test create customer
        customer_data = {
            "name": "Test Customer API",
            "phone": f"9999{int(time.time()) % 100000}",  # Unique phone
            "email": f"test{int(time.time())}@example.com",
            "address": "123 Test Street, Test City",
            "gst_number": "29ABCDE1234F2Z5"
        }
        
        result = self.test_endpoint("POST", "/customers", customer_data, 
                                  expected_status=201, description="Create new customer")
        
        if result["success"]:
            customer_id = result["data"]["id"]
            self.test_data["customer_id"] = customer_id
            print(f"   Created customer ID: {customer_id}")
            
            # Test get specific customer
            self.test_endpoint("GET", f"/customers/{customer_id}", 
                             description="Get customer by ID")
            
            # Test update customer
            update_data = {
                "name": "Updated Test Customer",
                "phone": customer_data["phone"],
                "email": customer_data["email"],
                "address": "456 Updated Street",
                "gst_number": customer_data["gst_number"]
            }
            
            self.test_endpoint("PUT", f"/customers/{customer_id}", update_data,
                             description="Update customer")

    def test_order_endpoints(self):
        """Test order management endpoints"""
        print("\n" + "="*50)
        print("📋 TESTING ORDER ENDPOINTS")
        print("="*50)
        
        if "customer_id" not in self.test_data:
            print("❌ Need customer_id from previous test")
            return
        
        # Test list orders
        self.test_endpoint("GET", "/orders", description="List all orders")
        
        # Test create order
        order_data = {
            "customer_id": self.test_data["customer_id"],
            "notes": "Test order from API testing"
        }
        
        result = self.test_endpoint("POST", "/orders", order_data,
                                  expected_status=201, description="Create new order")
        
        if result["success"]:
            order_id = result["data"]["id"]
            self.test_data["order_id"] = order_id
            print(f"   Created order ID: {order_id}")
            
            # Test get specific order
            self.test_endpoint("GET", f"/orders/{order_id}",
                             description="Get order by ID")
            
            # Test order items endpoints
            self.test_order_items_endpoints(order_id)

    def test_order_items_endpoints(self, order_id: str):
        """Test order items endpoints"""
        print("\n📦 Testing Order Items...")
        
        # Test create order item
        item_data = {
            "material_type": "saree",
            "quantity": 5,
            "unit_price": 1500.00,
            "customization_details": "Red and gold border design"
        }
        
        result = self.test_endpoint("POST", f"/orders/{order_id}/items", item_data,
                                  expected_status=201, description="Add item to order")
        
        if result["success"]:
            item_id = result["data"]["id"]
            self.test_data["order_item_id"] = item_id
            print(f"   Created order item ID: {item_id}")
            
            # Test update production stage
            stage_data = {"production_stage": "printing"}
            self.test_endpoint("PUT", f"/orders/items/{item_id}/stage", stage_data,
                             description="Update production stage")

    def test_material_endpoints(self):
        """Test material tracking endpoints"""
        print("\n" + "="*50)
        print("📦 TESTING MATERIAL ENDPOINTS")
        print("="*50)
        
        if "customer_id" not in self.test_data:
            print("❌ Need customer_id from previous test")
            return
            
        # Test material in
        material_in_data = {
            "customer_id": self.test_data["customer_id"],
            "material_type": "saree",
            "quantity": 10,
            "unit": "pieces",
            "notes": "Received raw materials for processing"
        }
        
        if "order_id" in self.test_data:
            material_in_data["order_id"] = self.test_data["order_id"]
        
        result = self.test_endpoint("POST", "/materials/in", material_in_data,
                                  expected_status=201, description="Record material in")
        
        # Test list material in
        self.test_endpoint("GET", "/materials/in", description="List material in records")
        
        # Test list material out  
        self.test_endpoint("GET", "/materials/out", description="List material out records")

    def test_challan_endpoints(self):
        """Test delivery challan endpoints"""
        print("\n" + "="*50)
        print("🚛 TESTING DELIVERY CHALLAN ENDPOINTS")
        print("="*50)
        
        if "customer_id" not in self.test_data:
            print("❌ Need customer_id from previous test")
            return
        
        # Test list challans
        self.test_endpoint("GET", "/challans", description="List all challans")
        
        # Test create challan
        challan_data = {
            "customer_id": self.test_data["customer_id"],
            "notes": "Test delivery challan"
        }
        
        result = self.test_endpoint("POST", "/challans", challan_data,
                                  expected_status=201, description="Create new challan")
        
        if result["success"]:
            challan_id = result["data"]["id"]
            self.test_data["challan_id"] = challan_id
            print(f"   Created challan ID: {challan_id}")
            
            # Test get specific challan
            self.test_endpoint("GET", f"/challans/{challan_id}",
                             description="Get challan by ID")

    def test_invoice_endpoints(self):
        """Test GST invoice endpoints"""
        print("\n" + "="*50)
        print("💰 TESTING INVOICE ENDPOINTS")
        print("="*50)
        
        if "customer_id" not in self.test_data:
            print("❌ Need customer_id from previous test")
            return
        
        # Test list invoices
        self.test_endpoint("GET", "/invoices", description="List all invoices")
        
        # Test create invoice
        invoice_data = {
            "customer_id": self.test_data["customer_id"],
            "subtotal": 7500.00,
            "cgst_rate": 9.0,
            "sgst_rate": 9.0,
            "notes": "Test GST invoice"
        }
        
        result = self.test_endpoint("POST", "/invoices", invoice_data,
                                  expected_status=201, description="Create new invoice")
        
        if result["success"]:
            invoice_id = result["data"]["id"]
            self.test_data["invoice_id"] = invoice_id
            print(f"   Created invoice ID: {invoice_id}")
            
            # Test get specific invoice
            self.test_endpoint("GET", f"/invoices/{invoice_id}",
                             description="Get invoice by ID")

    def test_payment_endpoints(self):
        """Test payment endpoints"""
        print("\n" + "="*50)
        print("💳 TESTING PAYMENT ENDPOINTS")
        print("="*50)
        
        if "invoice_id" not in self.test_data:
            print("❌ Need invoice_id from previous test")
            return
        
        # Test list payments
        self.test_endpoint("GET", "/payments", description="List all payments")
        
        # Test create payment
        payment_data = {
            "invoice_id": self.test_data["invoice_id"],
            "amount": 5000.00,
            "payment_method": "upi",
            "reference_number": "UPI123456789",
            "notes": "Partial payment via UPI"
        }
        
        result = self.test_endpoint("POST", "/payments", payment_data,
                                  expected_status=201, description="Record new payment")
        
        if result["success"]:
            payment_id = result["data"]["id"]
            print(f"   Created payment ID: {payment_id}")

    def test_inventory_endpoints(self):
        """Test inventory endpoints"""
        print("\n" + "="*50)
        print("📋 TESTING INVENTORY ENDPOINTS")
        print("="*50)
        
        # Test list inventory
        self.test_endpoint("GET", "/inventory", description="List all inventory items")
        
        # Test create inventory item
        inventory_data = {
            "item_name": "Test Red Dye",
            "category": "colors",
            "current_stock": 50.0,
            "unit": "kg",
            "reorder_level": 10.0,
            "cost_per_unit": 150.0,
            "supplier_name": "Test Chemical Supplier",
            "supplier_contact": "9876543210"
        }
        
        result = self.test_endpoint("POST", "/inventory", inventory_data,
                                  expected_status=201, description="Create new inventory item")
        
        if result["success"]:
            inventory_id = result["data"]["id"]
            print(f"   Created inventory ID: {inventory_id}")
            
            # Test update inventory
            update_data = {
                "item_name": "Updated Test Red Dye",
                "category": "colors",
                "current_stock": 45.0,
                "unit": "kg",
                "reorder_level": 10.0,
                "cost_per_unit": 160.0,
                "supplier_name": "Updated Chemical Supplier",
                "supplier_contact": "9876543210"
            }
            
            self.test_endpoint("PUT", f"/inventory/{inventory_id}", update_data,
                             description="Update inventory item")

    def test_expense_endpoints(self):
        """Test expense endpoints"""
        print("\n" + "="*50)
        print("💸 TESTING EXPENSE ENDPOINTS")
        print("="*50)
        
        # Test list expenses
        self.test_endpoint("GET", "/expenses", description="List all expenses")
        
        # Test create expense
        expense_data = {
            "category": "utilities",
            "description": "Electricity bill for printing unit",
            "amount": 2500.00,
            "payment_method": "bank_transfer",
            "reference_number": "TXN789456123",
            "notes": "Monthly electricity expense"
        }
        
        result = self.test_endpoint("POST", "/expenses", expense_data,
                                  expected_status=201, description="Record new expense")
        
        if result["success"]:
            expense_id = result["data"]["id"]
            print(f"   Created expense ID: {expense_id}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Comprehensive API Testing")
        print("="*60)
        
        start_time = time.time()
        
        # Test in logical order
        self.test_health_endpoints()
        
        if not self.test_auth_endpoints():
            print("❌ Authentication failed - cannot continue with authenticated tests")
            return
        
        self.test_customer_endpoints()
        self.test_order_endpoints()
        self.test_material_endpoints()
        self.test_challan_endpoints()
        self.test_invoice_endpoints()
        self.test_payment_endpoints()
        self.test_inventory_endpoints()
        self.test_expense_endpoints()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "="*60)
        print(f"🏁 Testing completed in {duration:.2f} seconds")
        print("="*60)
        
        # Print summary
        print(f"\n📊 Test Data Created:")
        for key, value in self.test_data.items():
            print(f"   {key}: {value}")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests() 