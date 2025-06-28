#!/usr/bin/env python3
import os
"""
Comprehensive Local API Testing Suite
Tests all APIs against current database schema in local environment
Based on the provided database schema diagram
"""

import requests
import json
import time
from datetime import datetime, date
from typing import Dict, List, Optional
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 30

class LocalAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = []
        self.test_data = {}
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: dict = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: dict = None, json_data: dict = None, headers: dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        
        request_headers = {
            "Content-Type": "application/json" if json_data else "application/x-www-form-urlencoded"
        }
        
        if self.token:
            request_headers["Authorization"] = f"Bearer {self.token}"
            
        if headers:
            request_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                return self.session.get(url, headers=request_headers, timeout=TIMEOUT)
            elif method.upper() == "POST":
                if json_data:
                    return self.session.post(url, json=json_data, headers=request_headers, timeout=TIMEOUT)
                else:
                    return self.session.post(url, data=data, headers=request_headers, timeout=TIMEOUT)
            elif method.upper() == "PUT":
                return self.session.put(url, json=json_data, headers=request_headers, timeout=TIMEOUT)
            elif method.upper() == "DELETE":
                return self.session.delete(url, headers=request_headers, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise

    # ==================== HEALTH & SYSTEM TESTS ====================
    
    def test_health_endpoints(self):
        """Test system health endpoints"""
        print("\n🏥 TESTING HEALTH ENDPOINTS")
        
        # Basic health check
        try:
            response = self.make_request("GET", "/health")
            self.log_test("Health Check", 
                         response.status_code == 200,
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            
        # Database health check
        try:
            response = self.make_request("GET", "/health/db")
            self.log_test("Database Health", 
                         response.status_code == 200,
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Database Health", False, f"Error: {str(e)}")

    # ==================== AUTHENTICATION TESTS ====================
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 TESTING AUTHENTICATION")
        
        # Test admin login
        login_data = "username=admin&password = os.getenv("TEST_PASSWORD", "change-me")
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            response = self.make_request("POST", "/api/auth/login", data=login_data, headers=headers)
            
            if response.status_code == 200:
                token_data = response.json()
                self.token = token_data.get('access_token')
                self.log_test("Admin Login", True, 
                             f"Token received: {self.token[:20]}..." if self.token else "No token")
                return True
            else:
                self.log_test("Admin Login", False, 
                             f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Error: {str(e)}")
            return False

    # ==================== USER MANAGEMENT TESTS ====================
    
    def test_user_endpoints(self):
        """Test user management endpoints"""
        print("\n👥 TESTING USER MANAGEMENT")
        
        if not self.token:
            self.log_test("User Tests", False, "No authentication token available")
            return
            
        # List users
        try:
            response = self.make_request("GET", "/api/users")
            success = response.status_code == 200
            self.log_test("List Users", success, 
                         f"Status: {response.status_code}, Count: {len(response.json()) if success else 0}")
        except Exception as e:
            self.log_test("List Users", False, f"Error: {str(e)}")

    # ==================== CUSTOMER MANAGEMENT TESTS ====================
    
    def test_customer_endpoints(self):
        """Test customer management endpoints"""
        print("\n👤 TESTING CUSTOMER MANAGEMENT")
        
        if not self.token:
            self.log_test("Customer Tests", False, "No authentication token available")
            return
            
        # List customers
        try:
            response = self.make_request("GET", "/api/customers")
            success = response.status_code == 200
            customer_count = len(response.json()) if success else 0
            self.log_test("List Customers", success, 
                         f"Status: {response.status_code}, Count: {customer_count}")
        except Exception as e:
            self.log_test("List Customers", False, f"Error: {str(e)}")
            
        # Create customer
        customer_data = {
            "name": f"Test Customer {int(time.time())}",
            "phone": f"9999{int(time.time()) % 1000000}",
            "email": f"test_{int(time.time())}@example.com",
            "address": "Test Address",
            "gst_number": f"GST{int(time.time()) % 1000000}"
        }
        
        try:
            response = self.make_request("POST", "/api/customers", json_data=customer_data)
            success = response.status_code in [200, 201]
            if success:
                customer = response.json()
                self.test_data['customer_id'] = customer.get('id')
            self.log_test("Create Customer", success, 
                         f"Status: {response.status_code}, ID: {self.test_data.get('customer_id', 'N/A')}")
        except Exception as e:
            self.log_test("Create Customer", False, f"Error: {str(e)}")
            
        # Search customers
        try:
            response = self.make_request("GET", "/api/customers/search?q=Test")
            success = response.status_code == 200
            self.log_test("Search Customers", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Search Customers", False, f"Error: {str(e)}")

    # ==================== ORDER MANAGEMENT TESTS ====================
    
    def test_order_endpoints(self):
        """Test order management endpoints"""
        print("\n📋 TESTING ORDER MANAGEMENT")
        
        if not self.token:
            self.log_test("Order Tests", False, "No authentication token available")
            return
            
        # List orders
        try:
            response = self.make_request("GET", "/api/orders")
            success = response.status_code == 200
            order_count = len(response.json()) if success else 0
            self.log_test("List Orders", success, 
                         f"Status: {response.status_code}, Count: {order_count}")
        except Exception as e:
            self.log_test("List Orders", False, f"Error: {str(e)}")
            
        # Create order
        if self.test_data.get('customer_id'):
            order_data = {
                "customer_id": self.test_data['customer_id'],
                "order_date": date.today().isoformat(),
                "status": "pending",
                "total_amount": 1000.00,
                "notes": "Test order from API testing"
            }
            
            try:
                response = self.make_request("POST", "/api/orders", json_data=order_data)
                success = response.status_code in [200, 201]
                if success:
                    order = response.json()
                    self.test_data['order_id'] = order.get('id')
                self.log_test("Create Order", success, 
                             f"Status: {response.status_code}, ID: {self.test_data.get('order_id', 'N/A')}")
            except Exception as e:
                self.log_test("Create Order", False, f"Error: {str(e)}")
        else:
            self.log_test("Create Order", False, "No customer ID available")

    # ==================== ORDER ITEMS TESTS ====================
    
    def test_order_items(self):
        """Test order items endpoints"""
        print("\n📦 TESTING ORDER ITEMS")
        
        if not self.token or not self.test_data.get('order_id'):
            self.log_test("Order Items Tests", False, "No order ID available")
            return
            
        # Create order item
        item_data = {
            "order_id": self.test_data['order_id'],
            "material_type": "Cotton",
            "quantity": 10,
            "unit_price": 100.00,
            "customization_details": "Test customization",
            "production_stage": "design"
        }
        
        try:
            response = self.make_request("POST", "/api/order-items", json_data=item_data)
            success = response.status_code in [200, 201]
            if success:
                item = response.json()
                self.test_data['order_item_id'] = item.get('id')
            self.log_test("Create Order Item", success, 
                         f"Status: {response.status_code}, ID: {self.test_data.get('order_item_id', 'N/A')}")
        except Exception as e:
            self.log_test("Create Order Item", False, f"Error: {str(e)}")

    # ==================== MATERIAL TRACKING TESTS ====================
    
    def test_material_endpoints(self):
        """Test material tracking endpoints"""
        print("\n🧵 TESTING MATERIAL TRACKING")
        
        if not self.token:
            self.log_test("Material Tests", False, "No authentication token available")
            return
            
        # List material in
        try:
            response = self.make_request("GET", "/api/materials/in")
            success = response.status_code == 200
            material_count = len(response.json()) if success else 0
            self.log_test("List Material In", success, 
                         f"Status: {response.status_code}, Count: {material_count}")
        except Exception as e:
            self.log_test("List Material In", False, f"Error: {str(e)}")
            
        # Record material in
        material_data = {
            "material_type": "Cotton Fabric",
            "quantity": 50,
            "unit": "meters",
            "received_date": date.today().isoformat(),
            "notes": "Test material from API testing"
        }
        
        try:
            response = self.make_request("POST", "/api/materials/in", json_data=material_data)
            success = response.status_code in [200, 201]
            if success:
                material = response.json()
                self.test_data['material_in_id'] = material.get('id')
            self.log_test("Record Material In", success, 
                         f"Status: {response.status_code}, ID: {self.test_data.get('material_in_id', 'N/A')}")
        except Exception as e:
            self.log_test("Record Material In", False, f"Error: {str(e)}")
            
        # List material out
        try:
            response = self.make_request("GET", "/api/materials/out")
            success = response.status_code == 200
            self.log_test("List Material Out", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("List Material Out", False, f"Error: {str(e)}")

    # ==================== INVENTORY TESTS ====================
    
    def test_inventory_endpoints(self):
        """Test inventory management endpoints"""
        print("\n📦 TESTING INVENTORY MANAGEMENT")
        
        if not self.token:
            self.log_test("Inventory Tests", False, "No authentication token available")
            return
            
        # List inventory
        try:
            response = self.make_request("GET", "/api/inventory")
            success = response.status_code == 200
            inventory_count = len(response.json()) if success else 0
            self.log_test("List Inventory", success, 
                         f"Status: {response.status_code}, Count: {inventory_count}")
        except Exception as e:
            self.log_test("List Inventory", False, f"Error: {str(e)}")
            
        # Create inventory item
        inventory_data = {
            "item_name": f"Test Item {int(time.time())}",
            "category": "Fabric",
            "current_stock": 100,
            "unit": "meters",
            "reorder_level": 20,
            "cost_per_unit": 50.00,
            "supplier_name": "Test Supplier"
        }
        
        try:
            response = self.make_request("POST", "/api/inventory", json_data=inventory_data)
            success = response.status_code in [200, 201]
            if success:
                item = response.json()
                self.test_data['inventory_id'] = item.get('id')
            self.log_test("Create Inventory Item", success, 
                         f"Status: {response.status_code}, ID: {self.test_data.get('inventory_id', 'N/A')}")
        except Exception as e:
            self.log_test("Create Inventory Item", False, f"Error: {str(e)}")
            
        # Test inventory adjustments
        if self.test_data.get('inventory_id'):
            adjustment_data = {
                "adjustment_type": "adjustment",
                "quantity_change": 10,
                "reason": "Test adjustment",
                "notes": "API testing adjustment"
            }
            
            try:
                response = self.make_request("POST", f"/api/inventory/{self.test_data['inventory_id']}/adjust", 
                                           json_data=adjustment_data)
                success = response.status_code in [200, 201]
                self.log_test("Inventory Adjustment", success, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Inventory Adjustment", False, f"Error: {str(e)}")

    # ==================== CHALLAN TESTS ====================
    
    def test_challan_endpoints(self):
        """Test delivery challan endpoints"""
        print("\n📄 TESTING DELIVERY CHALLANS")
        
        if not self.token:
            self.log_test("Challan Tests", False, "No authentication token available")
            return
            
        # List challans
        try:
            response = self.make_request("GET", "/api/challans")
            success = response.status_code == 200
            challan_count = len(response.json()) if success else 0
            self.log_test("List Challans", success, 
                         f"Status: {response.status_code}, Count: {challan_count}")
        except Exception as e:
            self.log_test("List Challans", False, f"Error: {str(e)}")
            
        # Create challan
        if self.test_data.get('customer_id'):
            challan_data = {
                "customer_id": self.test_data['customer_id'],
                "challan_date": date.today().isoformat(),
                "total_quantity": 10,
                "notes": "Test challan from API testing",
                "items": [
                    {
                        "order_item_id": self.test_data.get('order_item_id', 1),
                        "quantity": 10
                    }
                ] if self.test_data.get('order_item_id') else []
            }
            
            try:
                response = self.make_request("POST", "/api/challans", json_data=challan_data)
                success = response.status_code in [200, 201]
                if success:
                    challan = response.json()
                    self.test_data['challan_id'] = challan.get('id')
                self.log_test("Create Challan", success, 
                             f"Status: {response.status_code}, ID: {self.test_data.get('challan_id', 'N/A')}")
            except Exception as e:
                self.log_test("Create Challan", False, f"Error: {str(e)}")

    # ==================== INVOICE TESTS ====================
    
    def test_invoice_endpoints(self):
        """Test GST invoice endpoints"""
        print("\n🧾 TESTING GST INVOICES")
        
        if not self.token:
            self.log_test("Invoice Tests", False, "No authentication token available")
            return
            
        # List invoices
        try:
            response = self.make_request("GET", "/api/invoices")
            success = response.status_code == 200
            invoice_count = len(response.json()) if success else 0
            self.log_test("List Invoices", success, 
                         f"Status: {response.status_code}, Count: {invoice_count}")
        except Exception as e:
            self.log_test("List Invoices", False, f"Error: {str(e)}")
            
        # Create invoice
        if self.test_data.get('customer_id') and self.test_data.get('challan_id'):
            invoice_data = {
                "customer_id": self.test_data['customer_id'],
                "invoice_date": date.today().isoformat(),
                "gst_rate": 18.0,
                "final_amount": 1180.00,
                "challans": [self.test_data['challan_id']]
            }
            
            try:
                response = self.make_request("POST", "/api/invoices", json_data=invoice_data)
                success = response.status_code in [200, 201]
                if success:
                    invoice = response.json()
                    self.test_data['invoice_id'] = invoice.get('id')
                self.log_test("Create Invoice", success, 
                             f"Status: {response.status_code}, ID: {self.test_data.get('invoice_id', 'N/A')}")
            except Exception as e:
                self.log_test("Create Invoice", False, f"Error: {str(e)}")

    # ==================== PAYMENT TESTS ====================
    
    def test_payment_endpoints(self):
        """Test payment recording endpoints"""
        print("\n💰 TESTING PAYMENT RECORDING")
        
        if not self.token:
            self.log_test("Payment Tests", False, "No authentication token available")
            return
            
        # List payments
        try:
            response = self.make_request("GET", "/api/payments")
            success = response.status_code == 200
            payment_count = len(response.json()) if success else 0
            self.log_test("List Payments", success, 
                         f"Status: {response.status_code}, Count: {payment_count}")
        except Exception as e:
            self.log_test("List Payments", False, f"Error: {str(e)}")
            
        # Record payment
        if self.test_data.get('invoice_id'):
            payment_data = {
                "invoice_id": self.test_data['invoice_id'],
                "amount": 1180.00,
                "payment_method": "cash",
                "reference_number": f"PAY{int(time.time())}",
                "notes": "Test payment from API testing"
            }
            
            try:
                response = self.make_request("POST", "/api/payments", json_data=payment_data)
                success = response.status_code in [200, 201]
                if success:
                    payment = response.json()
                    self.test_data['payment_id'] = payment.get('id')
                self.log_test("Record Payment", success, 
                             f"Status: {response.status_code}, ID: {self.test_data.get('payment_id', 'N/A')}")
            except Exception as e:
                self.log_test("Record Payment", False, f"Error: {str(e)}")

    # ==================== RETURNS TESTS ====================
    
    def test_returns_endpoints(self):
        """Test returns management endpoints"""
        print("\n🔄 TESTING RETURNS MANAGEMENT")
        
        if not self.token:
            self.log_test("Returns Tests", False, "No authentication token available")
            return
            
        # List returns
        try:
            response = self.make_request("GET", "/api/returns")
            success = response.status_code == 200
            returns_count = len(response.json()) if success else 0
            self.log_test("List Returns", success, 
                         f"Status: {response.status_code}, Count: {returns_count}")
        except Exception as e:
            self.log_test("List Returns", False, f"Error: {str(e)}")
            
        # Record return
        if self.test_data.get('order_item_id'):
            return_data = {
                "order_item_id": self.test_data['order_item_id'],
                "return_date": date.today().isoformat(),
                "quantity": 2,
                "reason": "damaged",
                "refund_amount": 200.00,
                "notes": "Test return from API testing"
            }
            
            try:
                response = self.make_request("POST", "/api/returns", json_data=return_data)
                success = response.status_code in [200, 201]
                if success:
                    return_record = response.json()
                    self.test_data['return_id'] = return_record.get('id')
                self.log_test("Record Return", success, 
                             f"Status: {response.status_code}, ID: {self.test_data.get('return_id', 'N/A')}")
            except Exception as e:
                self.log_test("Record Return", False, f"Error: {str(e)}")

    # ==================== EXPENSE TESTS ====================
    
    def test_expense_endpoints(self):
        """Test expense recording endpoints"""
        print("\n💸 TESTING EXPENSE RECORDING")
        
        if not self.token:
            self.log_test("Expense Tests", False, "No authentication token available")
            return
            
        # List expenses
        try:
            response = self.make_request("GET", "/api/expenses")
            success = response.status_code == 200
            expense_count = len(response.json()) if success else 0
            self.log_test("List Expenses", success, 
                         f"Status: {response.status_code}, Count: {expense_count}")
        except Exception as e:
            self.log_test("List Expenses", False, f"Error: {str(e)}")
            
        # Record expense
        expense_data = {
            "expense_date": date.today().isoformat(),
            "category": "materials",
            "description": "Test expense from API testing",
            "amount": 500.00,
            "payment_method": "cash",
            "receipt_number": f"REC{int(time.time())}",
            "notes": "API testing expense"
        }
        
        try:
            response = self.make_request("POST", "/api/expenses", json_data=expense_data)
            success = response.status_code in [200, 201]
            if success:
                expense = response.json()
                self.test_data['expense_id'] = expense.get('id')
            self.log_test("Record Expense", success, 
                         f"Status: {response.status_code}, ID: {self.test_data.get('expense_id', 'N/A')}")
        except Exception as e:
            self.log_test("Record Expense", False, f"Error: {str(e)}")

    # ==================== REPORTING TESTS ====================
    
    def test_report_endpoints(self):
        """Test reporting endpoints"""
        print("\n📊 TESTING REPORTS")
        
        if not self.token:
            self.log_test("Report Tests", False, "No authentication token available")
            return
            
        # Test various reports
        reports = [
            ("Pending Orders", "/api/reports/pending-orders"),
            ("Production Status", "/api/reports/production-status"),
            ("Stock Holdings", "/api/reports/stock-holdings"),
            ("Outstanding Receivables", "/api/reports/outstanding-receivables"),
            ("Stock Items View", "/api/reports/stock-items"),
            ("Audit Log", "/api/reports/audit-log")
        ]
        
        for report_name, endpoint in reports:
            try:
                response = self.make_request("GET", endpoint)
                success = response.status_code == 200
                count = len(response.json()) if success and isinstance(response.json(), list) else 0
                self.log_test(f"Report: {report_name}", success, 
                             f"Status: {response.status_code}, Records: {count}")
            except Exception as e:
                self.log_test(f"Report: {report_name}", False, f"Error: {str(e)}")

    # ==================== COMPREHENSIVE TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 80)
        print("🚀 COMPREHENSIVE LOCAL API TESTING SUITE")
        print("=" * 80)
        print(f"Base URL: {BASE_URL}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Run tests in logical order
        test_methods = [
            self.test_health_endpoints,
            self.test_authentication,
            self.test_user_endpoints,
            self.test_customer_endpoints,
            self.test_order_endpoints,
            self.test_order_items,
            self.test_material_endpoints,
            self.test_inventory_endpoints,
            self.test_challan_endpoints,
            self.test_invoice_endpoints,
            self.test_payment_endpoints,
            self.test_returns_endpoints,
            self.test_expense_endpoints,
            self.test_report_endpoints
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test method {test_method.__name__} failed: {str(e)}")
        
        # Generate summary
        self.generate_summary()
        
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Show failed tests
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        # Show created test data
        if self.test_data:
            print(f"\n📋 CREATED TEST DATA:")
            for key, value in self.test_data.items():
                print(f"  - {key}: {value}")
        
        print("=" * 80)
        
        # Save results to file
        self.save_results()
        
    def save_results(self):
        """Save test results to JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"local_api_test_results_{timestamp}.json"
        
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "summary": {
                "total_tests": len(self.test_results),
                "passed": sum(1 for r in self.test_results if r['success']),
                "failed": sum(1 for r in self.test_results if not r['success']),
                "success_rate": sum(1 for r in self.test_results if r['success']) / len(self.test_results) * 100 if self.test_results else 0
            },
            "test_data": self.test_data,
            "results": self.test_results
        }
        
        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"📁 Results saved to: {filename}")


def main():
    """Main function to run tests"""
    print("🧪 Starting Local API Testing...")
    print("Make sure your local backend is running on http://localhost:8000")
    
    tester = LocalAPITester()
    tester.run_all_tests()


if __name__ == "__main__":
    main() 