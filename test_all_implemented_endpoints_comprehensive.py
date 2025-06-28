#!/usr/bin/env python3
import os
"""
Comprehensive Test for ALL Implemented API Endpoints
Tests every endpoint found in the backend/app/api/ directory
"""

import requests
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

class AllEndpointsComprehensiveTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "details": [],
            "created_data": {}
        }
        self.session.timeout = 30
        
    def log_test(self, module: str, test_name: str, success: bool, details: str = "", data: Any = None):
        """Log test result with module mapping"""
        result = {
            "module": module,
            "test": test_name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results["details"].append(result)
        self.test_results["total"] += 1
        if success:
            self.test_results["passed"] += 1
            print(f"✅ {module}: {test_name}")
            if details:
                print(f"   📝 {details}")
        else:
            self.test_results["failed"] += 1
            print(f"❌ {module}: {test_name}")
            if details:
                print(f"   💥 {details}")

    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        print("\n🔐 AUTHENTICATING...")
        try:
            auth_data = {
                "username": "admin",
                "password": os.getenv("TEST_PASSWORD", "change-me")
            }
            response = self.session.post(
                f"{API_URL}/auth/login",
                data=auth_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
                print(f"✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def test_health_endpoints(self):
        """Test health and info endpoints"""
        print("\n🏥 TESTING HEALTH & INFO ENDPOINTS")
        print("=" * 60)
        
        # Health check
        try:
            response = self.session.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                self.log_test("HEALTH", "Health Check", True, f"Status: {response.json().get('status')}")
            else:
                self.log_test("HEALTH", "Health Check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("HEALTH", "Health Check", False, str(e))

        # Database health
        try:
            response = self.session.get(f"{BASE_URL}/health/db", timeout=10)
            if response.status_code == 200:
                self.log_test("HEALTH", "Database Health", True, f"DB: {response.json().get('database')}")
            else:
                self.log_test("HEALTH", "Database Health", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("HEALTH", "Database Health", False, str(e))

        # Version info
        try:
            response = self.session.get(f"{BASE_URL}/version", timeout=10)
            if response.status_code == 200:
                self.log_test("INFO", "Version Info", True, f"Version: {response.json().get('version')}")
            else:
                self.log_test("INFO", "Version Info", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("INFO", "Version Info", False, str(e))

        # Debug enum check
        try:
            response = self.session.get(f"{BASE_URL}/debug/enum-check", timeout=10)
            if response.status_code == 200:
                self.log_test("DEBUG", "Enum Check", True, f"App Version: {response.json().get('app_version')}")
            else:
                self.log_test("DEBUG", "Enum Check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("DEBUG", "Enum Check", False, str(e))

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 TESTING AUTH ENDPOINTS")
        print("=" * 60)
        
        # Login (already tested in authenticate, but log it)
        if self.access_token:
            self.log_test("AUTH", "Login", True, "JWT token received")
        else:
            self.log_test("AUTH", "Login", False, "No token received")

        # Test protected endpoint to verify token
        try:
            response = self.session.get(f"{API_URL}/users/me")
            if response.status_code == 200:
                user_data = response.json()
                self.log_test("AUTH", "Token Validation", True, f"User: {user_data.get('username')}")
            else:
                self.log_test("AUTH", "Token Validation", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("AUTH", "Token Validation", False, str(e))

    def test_users_endpoints(self):
        """Test users endpoints"""
        print("\n👥 TESTING USERS ENDPOINTS")
        print("=" * 60)
        
        # List users
        try:
            response = self.session.get(f"{API_URL}/users")
            if response.status_code == 200:
                users = response.json()
                self.log_test("USERS", "List Users", True, f"Found {len(users)} users")
            else:
                self.log_test("USERS", "List Users", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("USERS", "List Users", False, str(e))

        # Get current user
        try:
            response = self.session.get(f"{API_URL}/users/me")
            if response.status_code == 200:
                user = response.json()
                self.log_test("USERS", "Get Current User", True, f"User ID: {user.get('id')}")
                self.test_results["created_data"]["current_user_id"] = user.get("id")
            else:
                self.log_test("USERS", "Get Current User", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("USERS", "Get Current User", False, str(e))

    def test_customers_endpoints(self):
        """Test customers endpoints"""
        print("\n👤 TESTING CUSTOMERS ENDPOINTS")
        print("=" * 60)
        
        # List customers
        try:
            response = self.session.get(f"{API_URL}/customers")
            if response.status_code == 200:
                customers = response.json()
                self.log_test("CUSTOMERS", "List Customers", True, f"Found {len(customers)} customers")
                if customers:
                    self.test_results["created_data"]["existing_customer_id"] = customers[0]["id"]
            else:
                self.log_test("CUSTOMERS", "List Customers", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("CUSTOMERS", "List Customers", False, str(e))

        # Create customer
        unique_id = str(uuid.uuid4())[:8]
        customer_data = {
            "name": f"Test Customer {unique_id}",
            "phone": f"9876543{unique_id[:3]}",
            "email": f"test{unique_id}@example.com",
            "address": f"Test Address {unique_id}",
            "gst_number": f"12ABCDE{unique_id[:4]}F7G8"
        }
        
        try:
            response = self.session.post(f"{API_URL}/customers", json=customer_data)
            if response.status_code == 201:
                customer = response.json()
                self.test_results["created_data"]["customer_id"] = customer["id"]
                self.log_test("CUSTOMERS", "Create Customer", True, f"Created: {customer['id']}")
            else:
                self.log_test("CUSTOMERS", "Create Customer", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("CUSTOMERS", "Create Customer", False, str(e))

        # Search customers
        try:
            response = self.session.get(f"{API_URL}/customers/search?query=Test")
            if response.status_code == 200:
                results = response.json()
                self.log_test("CUSTOMERS", "Search Customers", True, f"Found {len(results)} results")
            else:
                self.log_test("CUSTOMERS", "Search Customers", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("CUSTOMERS", "Search Customers", False, str(e))

    def test_orders_endpoints(self):
        """Test orders endpoints"""
        print("\n📋 TESTING ORDERS ENDPOINTS")
        print("=" * 60)
        
        customer_id = self.test_results["created_data"].get("customer_id") or self.test_results["created_data"].get("existing_customer_id")
        
        # List orders
        try:
            response = self.session.get(f"{API_URL}/orders")
            if response.status_code == 200:
                orders = response.json()
                self.log_test("ORDERS", "List Orders", True, f"Found {len(orders)} orders")
                if orders:
                    self.test_results["created_data"]["existing_order_id"] = orders[0]["id"]
            else:
                self.log_test("ORDERS", "List Orders", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("ORDERS", "List Orders", False, str(e))

        # Create order (if we have customer)
        if customer_id:
            order_data = {
                "customer_id": customer_id,
                "notes": "Comprehensive test order",
                "order_items": [
                    {
                        "material_type": "saree",
                        "quantity": 2,
                        "unit_price": 750.00,
                        "customization_details": "Red with gold border"
                    }
                ]
            }
            
            try:
                response = self.session.post(f"{API_URL}/orders", json=order_data)
                if response.status_code == 201:
                    order = response.json()
                    self.test_results["created_data"]["order_id"] = order["id"]
                    self.log_test("ORDERS", "Create Order", True, f"Created: {order['order_number']}")
                else:
                    self.log_test("ORDERS", "Create Order", False, f"Status: {response.status_code} - {response.text}")
            except Exception as e:
                self.log_test("ORDERS", "Create Order", False, str(e))
        else:
            self.log_test("ORDERS", "Create Order", False, "No customer ID available")

    def test_inventory_endpoints(self):
        """Test inventory endpoints"""
        print("\n📦 TESTING INVENTORY ENDPOINTS")
        print("=" * 60)
        
        # List inventory
        try:
            response = self.session.get(f"{API_URL}/inventory")
            if response.status_code == 200:
                items = response.json()
                self.log_test("INVENTORY", "List Items", True, f"Found {len(items)} items")
                if items:
                    self.test_results["created_data"]["existing_inventory_id"] = items[0]["id"]
            else:
                self.log_test("INVENTORY", "List Items", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("INVENTORY", "List Items", False, str(e))

        # Create inventory item
        unique_id = str(uuid.uuid4())[:8]
        item_data = {
            "item_name": f"Test Item {unique_id}",
            "category": "Test Category",
            "current_stock": 100.0,
            "unit": "pieces",
            "reorder_level": 10.0,
            "cost_per_unit": 25.50,
            "supplier_name": "Test Supplier",
            "supplier_contact": "9876543210"
        }
        
        try:
            response = self.session.post(f"{API_URL}/inventory", json=item_data)
            if response.status_code == 201:
                item = response.json()
                self.test_results["created_data"]["inventory_id"] = item["id"]
                self.log_test("INVENTORY", "Create Item", True, f"Created: {item['item_name']}")
            else:
                self.log_test("INVENTORY", "Create Item", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("INVENTORY", "Create Item", False, str(e))

        # Test inventory adjustment (with fixed approach)
        inventory_id = self.test_results["created_data"].get("inventory_id") or self.test_results["created_data"].get("existing_inventory_id")
        if inventory_id:
            adjustment_data = {
                "adjustment_type": "quantity_change",
                "quantity_change": 5.0,
                "reason": "Test adjustment",
                "notes": "Comprehensive testing"
            }
            
            try:
                response = self.session.post(f"{API_URL}/inventory/{inventory_id}/adjust", json=adjustment_data)
                if response.status_code == 201:
                    result = response.json()
                    self.log_test("INVENTORY", "Adjust Stock", True, f"Adjusted by {adjustment_data['quantity_change']}")
                else:
                    self.log_test("INVENTORY", "Adjust Stock", False, f"Status: {response.status_code} - {response.text}")
            except Exception as e:
                self.log_test("INVENTORY", "Adjust Stock", False, str(e))
        else:
            self.log_test("INVENTORY", "Adjust Stock", False, "No inventory ID available")

        # Low stock items
        try:
            response = self.session.get(f"{API_URL}/inventory/low-stock")
            if response.status_code == 200:
                items = response.json()
                self.log_test("INVENTORY", "Low Stock Items", True, f"Found {len(items)} low stock items")
            else:
                self.log_test("INVENTORY", "Low Stock Items", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("INVENTORY", "Low Stock Items", False, str(e))

    def test_materials_endpoints(self):
        """Test materials endpoints"""
        print("\n🧵 TESTING MATERIALS ENDPOINTS")
        print("=" * 60)
        
        customer_id = self.test_results["created_data"].get("customer_id") or self.test_results["created_data"].get("existing_customer_id")
        
        # List material in
        try:
            response = self.session.get(f"{API_URL}/materials/in")
            if response.status_code == 200:
                materials = response.json()
                self.log_test("MATERIALS", "List Material In", True, f"Found {len(materials)} records")
            else:
                self.log_test("MATERIALS", "List Material In", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("MATERIALS", "List Material In", False, str(e))

        # Record material in (if we have customer)
        if customer_id:
            material_data = {
                "customer_id": customer_id,
                "material_type": "saree",
                "quantity": 3,
                "received_date": datetime.now().isoformat(),
                "notes": "Test material recording"
            }
            
            try:
                response = self.session.post(f"{API_URL}/materials/in", json=material_data)
                if response.status_code == 201:
                    material = response.json()
                    self.test_results["created_data"]["material_in_id"] = material["id"]
                    self.log_test("MATERIALS", "Record Material In", True, f"Recorded: {material['id']}")
                else:
                    self.log_test("MATERIALS", "Record Material In", False, f"Status: {response.status_code} - {response.text}")
            except Exception as e:
                self.log_test("MATERIALS", "Record Material In", False, str(e))
        else:
            self.log_test("MATERIALS", "Record Material In", False, "No customer ID available")

        # List material out
        try:
            response = self.session.get(f"{API_URL}/materials/out")
            if response.status_code == 200:
                materials = response.json()
                self.log_test("MATERIALS", "List Material Out", True, f"Found {len(materials)} records")
            else:
                self.log_test("MATERIALS", "List Material Out", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("MATERIALS", "List Material Out", False, str(e))

    def test_expenses_endpoints(self):
        """Test expenses endpoints"""
        print("\n💸 TESTING EXPENSES ENDPOINTS")
        print("=" * 60)
        
        # List expenses
        try:
            response = self.session.get(f"{API_URL}/expenses")
            if response.status_code == 200:
                expenses = response.json()
                self.log_test("EXPENSES", "List Expenses", True, f"Found {len(expenses)} expenses")
            else:
                self.log_test("EXPENSES", "List Expenses", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("EXPENSES", "List Expenses", False, str(e))

        # Record expense
        expense_data = {
            "expense_type": "material_cost",
            "amount": 1250.75,
            "description": "Test expense recording",
            "expense_date": datetime.now().isoformat(),
            "vendor_name": "Test Vendor"
        }
        
        try:
            response = self.session.post(f"{API_URL}/expenses", json=expense_data)
            if response.status_code == 201:
                expense = response.json()
                self.test_results["created_data"]["expense_id"] = expense["id"]
                self.log_test("EXPENSES", "Record Expense", True, f"Recorded: ₹{expense['amount']}")
            else:
                self.log_test("EXPENSES", "Record Expense", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("EXPENSES", "Record Expense", False, str(e))

    def test_payments_endpoints(self):
        """Test payments endpoints"""
        print("\n💰 TESTING PAYMENTS ENDPOINTS")
        print("=" * 60)
        
        # List payments
        try:
            response = self.session.get(f"{API_URL}/payments")
            if response.status_code == 200:
                payments = response.json()
                self.log_test("PAYMENTS", "List Payments", True, f"Found {len(payments)} payments")
            else:
                self.log_test("PAYMENTS", "List Payments", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("PAYMENTS", "List Payments", False, str(e))

    def test_invoices_endpoints(self):
        """Test invoices endpoints"""
        print("\n🧾 TESTING INVOICES ENDPOINTS")
        print("=" * 60)
        
        # List invoices
        try:
            response = self.session.get(f"{API_URL}/invoices")
            if response.status_code == 200:
                invoices = response.json()
                self.log_test("INVOICES", "List Invoices", True, f"Found {len(invoices)} invoices")
            else:
                self.log_test("INVOICES", "List Invoices", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("INVOICES", "List Invoices", False, str(e))

    def test_challans_endpoints(self):
        """Test challans endpoints"""
        print("\n📄 TESTING CHALLANS ENDPOINTS")
        print("=" * 60)
        
        # List challans
        try:
            response = self.session.get(f"{API_URL}/challans")
            if response.status_code == 200:
                challans = response.json()
                self.log_test("CHALLANS", "List Challans", True, f"Found {len(challans)} challans")
            else:
                self.log_test("CHALLANS", "List Challans", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("CHALLANS", "List Challans", False, str(e))

    def test_returns_endpoints(self):
        """Test returns endpoints"""
        print("\n🔄 TESTING RETURNS ENDPOINTS")
        print("=" * 60)
        
        # List returns
        try:
            response = self.session.get(f"{API_URL}/returns")
            if response.status_code == 200:
                returns = response.json()
                self.log_test("RETURNS", "List Returns", True, f"Found {len(returns)} returns")
            else:
                self.log_test("RETURNS", "List Returns", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("RETURNS", "List Returns", False, str(e))

    def test_reports_endpoints(self):
        """Test reports endpoints"""
        print("\n📊 TESTING REPORTS ENDPOINTS")
        print("=" * 60)
        
        # Pending orders report
        try:
            response = self.session.get(f"{API_URL}/reports/pending-orders")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REPORTS", "Pending Orders", True, f"Found {len(report)} pending orders")
            else:
                self.log_test("REPORTS", "Pending Orders", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("REPORTS", "Pending Orders", False, str(e))

        # Production status report
        try:
            response = self.session.get(f"{API_URL}/reports/production-status")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REPORTS", "Production Status", True, f"Found {len(report)} production items")
            else:
                self.log_test("REPORTS", "Production Status", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("REPORTS", "Production Status", False, str(e))

        # Stock holdings report
        try:
            response = self.session.get(f"{API_URL}/reports/stock-holdings")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REPORTS", "Stock Holdings", True, f"Found {len(report)} stock items")
            else:
                self.log_test("REPORTS", "Stock Holdings", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("REPORTS", "Stock Holdings", False, str(e))

        # Outstanding receivables report
        try:
            response = self.session.get(f"{API_URL}/reports/outstanding-receivables")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REPORTS", "Outstanding Receivables", True, f"Found {len(report)} receivables")
            else:
                self.log_test("REPORTS", "Outstanding Receivables", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("REPORTS", "Outstanding Receivables", False, str(e))

    def generate_summary_report(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE ENDPOINT TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.test_results['total']}")
        print(f"Passed: {self.test_results['passed']}")
        print(f"Failed: {self.test_results['failed']}")
        
        success_rate = (self.test_results['passed'] / self.test_results['total']) * 100 if self.test_results['total'] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Group results by module
        modules = {}
        for result in self.test_results["details"]:
            module = result["module"]
            if module not in modules:
                modules[module] = {"passed": 0, "failed": 0, "total": 0}
            modules[module]["total"] += 1
            if result["status"] == "PASS":
                modules[module]["passed"] += 1
            else:
                modules[module]["failed"] += 1

        print(f"\n📋 MODULE BREAKDOWN:")
        print("-" * 60)
        for module, stats in modules.items():
            module_rate = (stats['passed'] / stats['total']) * 100 if stats['total'] > 0 else 0
            status_icon = "✅" if module_rate == 100 else "⚠️" if module_rate >= 50 else "❌"
            print(f"{status_icon} {module}: {stats['passed']}/{stats['total']} tests passed ({module_rate:.1f}%)")

        # Failed tests
        failed_tests = [r for r in self.test_results["details"] if r["status"] == "FAIL"]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            print("-" * 60)
            for test in failed_tests:
                print(f"  • {test['module']}: {test['test']}")
                if test['details']:
                    print(f"    💥 {test['details']}")

        # Created test data
        if self.test_results["created_data"]:
            print(f"\n📁 Created Test Data:")
            print("-" * 60)
            for key, value in self.test_results["created_data"].items():
                print(f"  • {key}: {value}")

        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_endpoint_test_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        print(f"\n📄 Detailed results saved to: {filename}")

    def run_all_tests(self):
        """Run all endpoint tests"""
        start_time = time.time()
        
        print("🧪 Comprehensive Endpoint Testing for Digital Textile Printing System")
        print("Make sure your local backend is running on http://localhost:8000")
        print("=" * 80)
        print("🚀 TESTING ALL IMPLEMENTED API ENDPOINTS")
        print("=" * 80)
        
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Test all endpoint modules
        self.test_health_endpoints()
        self.test_auth_endpoints()
        self.test_users_endpoints()
        self.test_customers_endpoints()
        self.test_orders_endpoints()
        self.test_inventory_endpoints()
        self.test_materials_endpoints()
        self.test_expenses_endpoints()
        self.test_payments_endpoints()
        self.test_invoices_endpoints()
        self.test_challans_endpoints()
        self.test_returns_endpoints()
        self.test_reports_endpoints()
        
        end_time = time.time()
        print(f"\n⏱️  Total testing time: {end_time - start_time:.2f} seconds")
        
        self.generate_summary_report()
        return True

if __name__ == "__main__":
    tester = AllEndpointsComprehensiveTester()
    tester.run_all_tests() 