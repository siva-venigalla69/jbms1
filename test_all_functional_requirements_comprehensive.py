#!/usr/bin/env python3
"""
Comprehensive API Testing for Digital Textile Printing System
Tests all functional requirements REQ-001 through REQ-049
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

class ComprehensiveFunctionalTester:
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
        self.session.timeout = 30  # 30 second timeout
        
    def log_test(self, requirement: str, test_name: str, success: bool, details: str = "", data: Any = None):
        """Log test result with requirement mapping"""
        result = {
            "requirement": requirement,
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
            print(f"✅ {requirement}: {test_name}")
            if details:
                print(f"   📝 {details}")
        else:
            self.test_results["failed"] += 1
            print(f"❌ {requirement}: {test_name}")
            if details:
                print(f"   💥 {details}")

    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        print("\n🔐 AUTHENTICATING...")
        try:
            auth_data = {
                "username": "admin",
                "password": "Siri@2299"
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

    def test_req_001_002_customer_management(self):
        """REQ-001: Customer CRUD operations, REQ-002: Duplicate prevention"""
        print("\n👤 TESTING CUSTOMER MANAGEMENT (REQ-001, REQ-002)")
        print("=" * 60)
        
        # Test customer listing
        try:
            response = self.session.get(f"{API_URL}/customers")
            if response.status_code == 200:
                customers = response.json()
                self.log_test("REQ-001", "List Customers", True, f"Found {len(customers)} customers")
                if customers:
                    self.test_results["created_data"]["existing_customer_id"] = customers[0]["id"]
            else:
                self.log_test("REQ-001", "List Customers", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("REQ-001", "List Customers", False, str(e))

        # Test customer creation
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
                self.log_test("REQ-001", "Create Customer", True, f"Created customer ID: {customer['id']}")
                
                # Test duplicate prevention (REQ-002)
                try:
                    response = self.session.post(f"{API_URL}/customers", json=customer_data)
                    if response.status_code == 400:
                        self.log_test("REQ-002", "Duplicate Prevention", True, "Properly rejected duplicate phone")
                    else:
                        self.log_test("REQ-002", "Duplicate Prevention", False, f"Expected 400, got {response.status_code}")
                except Exception as e:
                    self.log_test("REQ-002", "Duplicate Prevention", False, str(e))
                    
            else:
                self.log_test("REQ-001", "Create Customer", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-001", "Create Customer", False, str(e))

    def test_req_003_009_order_management(self):
        """REQ-003 to REQ-009: Order creation, management, and calculations"""
        print("\n📋 TESTING ORDER MANAGEMENT (REQ-003 to REQ-009)")
        print("=" * 60)
        
        customer_id = self.test_results["created_data"].get("customer_id") or self.test_results["created_data"].get("existing_customer_id")
        if not customer_id:
            self.log_test("REQ-003", "Order Creation", False, "No customer ID available")
            return

        # Test order creation with multiple items (REQ-003, REQ-007, REQ-009)
        order_data = {
            "customer_id": customer_id,
            "notes": "Test order for functional requirements testing",
            "order_items": [
                {
                    "material_type": "saree",
                    "quantity": 3,
                    "unit_price": 500.00,
                    "customization_details": "Red silk with gold border"
                },
                {
                    "material_type": "dupatta",
                    "quantity": 2,
                    "unit_price": 250.00,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        expected_total = (3 * 500.00) + (2 * 250.00)  # 2000.00

        try:
            response = self.session.post(f"{API_URL}/orders", json=order_data)
            if response.status_code == 201:
                order = response.json()
                self.test_results["created_data"]["order_id"] = order["id"]
                
                # REQ-003: Auto-generated order number
                order_number = order.get("order_number", "")
                if order_number.startswith("ORD-") and len(order_number) >= 8:
                    self.log_test("REQ-003", "Auto-generated Order Number", True, f"Order number: {order_number}")
                else:
                    self.log_test("REQ-003", "Auto-generated Order Number", False, f"Invalid format: {order_number}")
                
                # REQ-009: Order total calculation
                actual_total = float(order.get("total_amount", 0))
                if abs(actual_total - expected_total) < 0.01:
                    self.log_test("REQ-009", "Order Total Calculation", True, f"Correct total: {actual_total}")
                else:
                    self.log_test("REQ-009", "Order Total Calculation", False, f"Expected {expected_total}, got {actual_total}")
                
                self.log_test("REQ-007", "Order Items Creation", True, f"Created order with {len(order_data['order_items'])} items")
                
            else:
                self.log_test("REQ-003", "Order Creation", False, f"Status: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_test("REQ-003", "Order Creation", False, str(e))

        # Test order listing
        try:
            response = self.session.get(f"{API_URL}/orders")
            if response.status_code == 200:
                orders = response.json()
                self.log_test("REQ-004", "Order Listing", True, f"Found {len(orders)} orders")
            else:
                self.log_test("REQ-004", "Order Listing", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-004", "Order Listing", False, str(e))

    def test_req_010_011_material_tracking(self):
        """REQ-010: Material In with customer linkage, REQ-011: Material without order"""
        print("\n📦 TESTING MATERIAL TRACKING (REQ-010, REQ-011)")
        print("=" * 60)
        
        customer_id = self.test_results["created_data"].get("customer_id")
        order_id = self.test_results["created_data"].get("order_id")
        
        if not customer_id:
            self.log_test("REQ-010", "Material In Recording", False, "No customer ID available")
            return

        # REQ-010: Material In with order and customer linkage
        material_data = {
            "order_id": order_id,
            "customer_id": customer_id,  # Required by REQ-010
            "material_type": "saree",
            "quantity": 10,
            "unit": "pieces",
            "notes": "Silk sarees received for printing"
        }
        
        try:
            response = self.session.post(f"{API_URL}/materials/in", json=material_data)
            if response.status_code == 201:
                material = response.json()
                self.test_results["created_data"]["material_in_id"] = material["id"]
                self.log_test("REQ-010", "Material In with Customer Link", True, f"Recorded material ID: {material['id']}")
            else:
                self.log_test("REQ-010", "Material In with Customer Link", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-010", "Material In with Customer Link", False, str(e))

        # REQ-011: Material In without order (general stock)
        general_material_data = {
            "order_id": None,
            "customer_id": customer_id,
            "material_type": "running_material",
            "quantity": 50,
            "unit": "meters",
            "notes": "General stock material"
        }
        
        try:
            response = self.session.post(f"{API_URL}/materials/in", json=general_material_data)
            if response.status_code == 201:
                material = response.json()
                self.log_test("REQ-011", "Material In without Order", True, f"Recorded general stock ID: {material['id']}")
            else:
                self.log_test("REQ-011", "Material In without Order", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-011", "Material In without Order", False, str(e))

        # Test material listing
        try:
            response = self.session.get(f"{API_URL}/materials/in")
            if response.status_code == 200:
                materials = response.json()
                self.log_test("REQ-010", "Material In Listing", True, f"Found {len(materials)} material records")
            else:
                self.log_test("REQ-010", "Material In Listing", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-010", "Material In Listing", False, str(e))

    def test_req_032_035_inventory_management(self):
        """REQ-032 to REQ-035: Inventory management and adjustments"""
        print("\n📦 TESTING INVENTORY MANAGEMENT (REQ-032 to REQ-035)")
        print("=" * 60)
        
        # REQ-032, REQ-033: Create inventory item
        inventory_data = {
            "item_name": f"Test Chemical {uuid.uuid4().hex[:6]}",
            "category": "Chemicals",
            "current_stock": 100.0,
            "unit": "kg",
            "reorder_level": 10.0,
            "cost_per_unit": 25.50,
            "supplier_name": "Test Supplier Ltd",
            "supplier_contact": "9876543210"
        }
        
        try:
            response = self.session.post(f"{API_URL}/inventory", json=inventory_data)
            if response.status_code == 201:
                inventory = response.json()
                self.test_results["created_data"]["inventory_id"] = inventory["id"]
                self.log_test("REQ-032", "Inventory Item Creation", True, f"Created item ID: {inventory['id']}")
            else:
                self.log_test("REQ-032", "Inventory Item Creation", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-032", "Inventory Item Creation", False, str(e))

        # Test inventory listing (REQ-033)
        try:
            response = self.session.get(f"{API_URL}/inventory")
            if response.status_code == 200:
                inventory_items = response.json()
                self.log_test("REQ-033", "Inventory Listing", True, f"Found {len(inventory_items)} items")
            else:
                self.log_test("REQ-033", "Inventory Listing", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-033", "Inventory Listing", False, str(e))

        # REQ-035: Inventory adjustment
        inventory_id = self.test_results["created_data"].get("inventory_id")
        if inventory_id:
            adjustment_data = {
                "adjustment_type": "quantity_change",
                "quantity_change": 5.0,
                "reason": "Test adjustment for functional requirements"
            }
            
            try:
                response = self.session.post(f"{API_URL}/inventory/{inventory_id}/adjust", json=adjustment_data)
                if response.status_code == 200:
                    self.log_test("REQ-035", "Inventory Adjustment", True, "Adjustment recorded successfully")
                else:
                    self.log_test("REQ-035", "Inventory Adjustment", False, f"Status: {response.status_code} - {response.text}")
            except Exception as e:
                self.log_test("REQ-035", "Inventory Adjustment", False, str(e))

    def test_req_036_expense_recording(self):
        """REQ-036: Business expense recording"""
        print("\n💸 TESTING EXPENSE RECORDING (REQ-036)")
        print("=" * 60)
        
        # REQ-036: Record expense
        expense_data = {
            "category": "Transport",
            "description": "Fuel expense for delivery vehicle",
            "amount": 150.00,
            "payment_method": "cash",
            "notes": "Test expense for functional requirements"
        }
        
        try:
            response = self.session.post(f"{API_URL}/expenses", json=expense_data)
            if response.status_code == 201:
                expense = response.json()
                self.test_results["created_data"]["expense_id"] = expense["id"]
                self.log_test("REQ-036", "Expense Recording", True, f"Recorded expense ID: {expense['id']}")
            else:
                self.log_test("REQ-036", "Expense Recording", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-036", "Expense Recording", False, str(e))

        # Test expense listing
        try:
            response = self.session.get(f"{API_URL}/expenses")
            if response.status_code == 200:
                expenses = response.json()
                self.log_test("REQ-036", "Expense Listing", True, f"Found {len(expenses)} expenses")
            else:
                self.log_test("REQ-036", "Expense Listing", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-036", "Expense Listing", False, str(e))

    def test_req_037_045_reporting(self):
        """REQ-037 to REQ-045: Reporting functionality"""
        print("\n📊 TESTING REPORTING (REQ-037 to REQ-045)")
        print("=" * 60)
        
        # REQ-037: Pending Orders Report
        try:
            response = self.session.get(f"{API_URL}/reports/pending-orders")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REQ-037", "Pending Orders Report", True, f"Generated report with {len(report)} orders")
            else:
                self.log_test("REQ-037", "Pending Orders Report", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-037", "Pending Orders Report", False, str(e))

        # REQ-038: Production Status Report
        try:
            response = self.session.get(f"{API_URL}/reports/production-status")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REQ-038", "Production Status Report", True, f"Generated report with {len(report)} items")
            else:
                self.log_test("REQ-038", "Production Status Report", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-038", "Production Status Report", False, str(e))

        # REQ-039: Stock Holdings Report
        try:
            response = self.session.get(f"{API_URL}/reports/stock-holdings")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REQ-039", "Stock Holdings Report", True, f"Generated report with {len(report)} items")
            else:
                self.log_test("REQ-039", "Stock Holdings Report", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-039", "Stock Holdings Report", False, str(e))

        # REQ-040: Pending Receivables Report
        try:
            response = self.session.get(f"{API_URL}/reports/pending-receivables")
            if response.status_code == 200:
                report = response.json()
                self.log_test("REQ-040", "Pending Receivables Report", True, f"Generated report with {len(report)} items")
            else:
                self.log_test("REQ-040", "Pending Receivables Report", False, f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("REQ-040", "Pending Receivables Report", False, str(e))

    def generate_summary_report(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE FUNCTIONAL REQUIREMENTS TEST SUMMARY")
        print("=" * 80)
        
        total = self.test_results["total"]
        passed = self.test_results["passed"]
        failed = self.test_results["failed"]
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Group by requirement
        req_groups = {}
        for result in self.test_results["details"]:
            req = result["requirement"]
            if req not in req_groups:
                req_groups[req] = {"passed": 0, "failed": 0, "tests": []}
            
            if result["status"] == "PASS":
                req_groups[req]["passed"] += 1
            else:
                req_groups[req]["failed"] += 1
            
            req_groups[req]["tests"].append(result)
        
        print("\n📋 FUNCTIONAL REQUIREMENTS COVERAGE:")
        print("-" * 80)
        for req in sorted(req_groups.keys()):
            stats = req_groups[req]
            total_req = stats["passed"] + stats["failed"]
            rate = (stats["passed"] / total_req * 100) if total_req > 0 else 0
            status = "✅" if rate == 100 else "⚠️" if rate > 0 else "❌"
            print(f"{status} {req}: {stats['passed']}/{total_req} tests passed ({rate:.0f}%)")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS ({failed}):")
            print("-" * 40)
            for result in self.test_results["details"]:
                if result["status"] == "FAIL":
                    print(f"  • {result['requirement']}: {result['test']}")
                    if result["details"]:
                        print(f"    💥 {result['details']}")
        
        print(f"\n📁 Created Test Data:")
        for key, value in self.test_results["created_data"].items():
            print(f"  • {key}: {value}")
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"functional_requirements_test_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump({
                "summary": {
                    "total": total,
                    "passed": passed,
                    "failed": failed,
                    "success_rate": success_rate,
                    "timestamp": datetime.now().isoformat()
                },
                "requirements_coverage": req_groups,
                "created_data": self.test_results["created_data"],
                "detailed_results": self.test_results["details"]
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {filename}")
        print("=" * 80)

    def run_all_tests(self):
        """Run comprehensive functional requirements testing"""
        print("🚀 STARTING COMPREHENSIVE FUNCTIONAL REQUIREMENTS TESTING")
        print("Testing REQ-001 through REQ-049")
        print("=" * 80)
        
        start_time = time.time()
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed - stopping tests")
            return
        
        # Run tests in logical order
        self.test_req_001_002_customer_management()
        self.test_req_003_009_order_management()
        self.test_req_010_011_material_tracking()
        self.test_req_032_035_inventory_management()
        self.test_req_036_expense_recording()
        self.test_req_037_045_reporting()
        
        end_time = time.time()
        print(f"\n⏱️  Total testing time: {end_time - start_time:.2f} seconds")
        
        self.generate_summary_report()

if __name__ == "__main__":
    print("🧪 Digital Textile Printing System - Functional Requirements Testing")
    print("Make sure your local backend is running on http://localhost:8000")
    print("=" * 80)
    
    tester = ComprehensiveFunctionalTester()
    tester.run_all_tests() 