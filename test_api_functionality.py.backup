#!/usr/bin/env python3
"""
Comprehensive API testing script for JBMS Digital Textile Printing Workflow System
Tests each functional requirement systematically
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://jbms1.onrender.com/api"
TEST_DATA = {
    "admin_user": {
        "username": "admin",
        "password": "Siri@2299"
    }
}

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None
        self.headers = {}
        self.test_results = []
        
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message
        })
    
    def authenticate(self):
        """Authenticate and get token"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                data=TEST_DATA["admin_user"]
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_test("Authentication", True, "Successfully logged in")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Authentication", False, str(e))
            return False
    
    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test basic health
        try:
            response = requests.get(f"{self.base_url}/../health")
            self.log_test("Health Check", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, str(e))
        
        # Test database health
        try:
            response = requests.get(f"{self.base_url}/../health/db")
            self.log_test("Database Health", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Database Health", False, str(e))
    
    def test_customer_management(self):
        """Test REQ-001, REQ-002: Customer Management"""
        print("\n=== Testing Customer Management ===")
        
        # First get existing customers to use for testing
        try:
            response = requests.get(f"{self.base_url}/customers", headers=self.headers)
            if response.status_code == 200:
                customers = response.json()
                if customers:
                    # Use the first existing customer for testing
                    self.test_customer_id = customers[0]["id"]
                    self.log_test("Get Existing Customer", True, 
                                 f"Using customer ID: {customers[0]['id']}, Name: {customers[0]['name']}")
                else:
                    self.log_test("Get Existing Customer", False, "No customers found")
            else:
                self.log_test("List Customers", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Customers", False, str(e))
        
        # Test create new customer with unique phone
        import random
        unique_phone = f"987654{random.randint(1000, 9999)}"
        customer_data = {
            "name": f"Test Customer {random.randint(100, 999)}",
            "phone": unique_phone,
            "email": f"test{random.randint(100, 999)}@example.com",
            "address": "Test Address 123",
            "gst_number": "12ABCDE3456F7G8"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/customers",
                json=customer_data,
                headers=self.headers
            )
            if response.status_code == 201:
                customer = response.json()
                self.log_test("Create New Customer", True, f"Created customer ID: {customer['id']}")
                
                # Test duplicate prevention
                duplicate_response = requests.post(
                    f"{self.base_url}/customers",
                    json=customer_data,
                    headers=self.headers
                )
                self.log_test("Duplicate Prevention", 
                             duplicate_response.status_code == 400, 
                             f"Status: {duplicate_response.status_code}")
            else:
                self.log_test("Create New Customer", False, 
                             f"Status: {response.status_code}, Error: {response.text}")
        except Exception as e:
            self.log_test("Create New Customer", False, str(e))
    
    def test_order_management(self):
        """Test REQ-003 to REQ-006: Order Management"""
        print("\n=== Testing Order Management ===")
        
        if not hasattr(self, 'test_customer_id'):
            self.log_test("Order Management", False, "No customer ID available")
            return
        
        # Test create order
        order_data = {
            "customer_id": self.test_customer_id,
            "notes": "Test order for API testing",
            "order_items": [
                {
                    "material_type": "saree",
                    "quantity": 5,
                    "unit_price": 250.00,
                    "customization_details": "Red color with gold border"
                },
                {
                    "material_type": "dupatta",
                    "quantity": 3,
                    "unit_price": 150.00,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/orders",
                json=order_data,
                headers=self.headers
            )
            if response.status_code == 201:
                order = response.json()
                self.test_order_id = order["id"]
                order_number = order.get("order_number", "")
                self.log_test("Create Order", True, 
                             f"Created order: {order_number}, Total: {order.get('total_amount', 0)}")
                
                # Verify order number format (ORD-YYYY-NNNN)
                import re
                pattern = r"ORD-\d{4}-\d{4}"
                number_valid = bool(re.match(pattern, order_number))
                self.log_test("Order Number Format", number_valid, 
                             f"Format: {order_number}")
            else:
                self.log_test("Create Order", False, 
                             f"Status: {response.status_code}, Error: {response.text}")
        except Exception as e:
            self.log_test("Create Order", False, str(e))
        
        # Test list orders
        try:
            response = requests.get(f"{self.base_url}/orders", headers=self.headers)
            self.log_test("List Orders", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Orders", False, str(e))
        
        # Test pending orders summary
        try:
            response = requests.get(f"{self.base_url}/orders/pending/summary", headers=self.headers)
            self.log_test("Pending Orders Summary", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Pending Orders Summary", False, str(e))
    
    def test_material_tracking(self):
        """Test REQ-010, REQ-011: Material In Tracking"""
        print("\n=== Testing Material Tracking ===")
        
        if not hasattr(self, 'test_order_id') or not hasattr(self, 'test_customer_id'):
            self.log_test("Material Tracking", False, "No order/customer ID available")
            return
        
        # Test material in with order link
        material_in_data = {
            "order_id": self.test_order_id,
            "customer_id": self.test_customer_id,
            "material_type": "saree",
            "quantity": 5,
            "unit": "pieces",
            "notes": "High quality silk material received"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/materials/in",
                json=material_in_data,
                headers=self.headers
            )
            self.log_test("Material In (with order)", response.status_code == 201, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Material In (with order)", False, str(e))
        
        # Test material in without order (general stock)
        general_material_data = {
            "customer_id": self.test_customer_id,
            "material_type": "dupatta",
            "quantity": 10,
            "unit": "pieces",
            "notes": "General stock material"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/materials/in",
                json=general_material_data,
                headers=self.headers
            )
            self.log_test("Material In (general stock)", response.status_code == 201, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Material In (general stock)", False, str(e))
        
        # Test list material in
        try:
            response = requests.get(f"{self.base_url}/materials/in", headers=self.headers)
            self.log_test("List Material In", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Material In", False, str(e))
    
    def test_inventory_management(self):
        """Test REQ-032 to REQ-035: Inventory Management"""
        print("\n=== Testing Inventory Management ===")
        
        # Test create inventory item
        inventory_data = {
            "item_name": "Red Dye Ink",
            "category": "Colors",
            "current_stock": 50.0,
            "unit": "liters",
            "reorder_level": 10.0,
            "cost_per_unit": 25.50,
            "supplier_info": "Chemical Supplies Ltd"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/inventory",
                json=inventory_data,
                headers=self.headers
            )
            if response.status_code == 201:
                inventory = response.json()
                self.test_inventory_id = inventory["id"]
                self.log_test("Create Inventory Item", True, 
                             f"Created item: {inventory['item_name']}")
            else:
                self.log_test("Create Inventory Item", False, 
                             f"Status: {response.status_code}, Error: {response.text}")
        except Exception as e:
            self.log_test("Create Inventory Item", False, str(e))
        
        # Test list inventory
        try:
            response = requests.get(f"{self.base_url}/inventory", headers=self.headers)
            self.log_test("List Inventory", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Inventory", False, str(e))
    
    def test_expense_recording(self):
        """Test REQ-036: Expense Recording"""
        print("\n=== Testing Expense Recording ===")
        
        expense_data = {
            "category": "Electricity",
            "description": "Monthly electricity bill",
            "amount": 2500.00,
            "payment_method": "bank_transfer",
            "reference_number": "TXN123456789",
            "notes": "High usage due to increased production"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/expenses",
                json=expense_data,
                headers=self.headers
            )
            self.log_test("Create Expense", response.status_code == 201, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Create Expense", False, str(e))
        
        # Test list expenses
        try:
            response = requests.get(f"{self.base_url}/expenses", headers=self.headers)
            self.log_test("List Expenses", response.status_code == 200, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Expenses", False, str(e))
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["passed"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['test']}: {result['message']}")

def main():
    print("JBMS API Functionality Test Suite")
    print("Testing against:", BASE_URL)
    print("="*50)
    
    tester = APITester(BASE_URL)
    
    # Run tests systematically
    if not tester.authenticate():
        print("❌ Authentication failed. Cannot proceed with tests.")
        return
    
    tester.test_health_endpoints()
    tester.test_customer_management()
    tester.test_order_management()
    tester.test_material_tracking()
    tester.test_inventory_management()
    tester.test_expense_recording()
    
    tester.print_summary()

if __name__ == "__main__":
    main() 