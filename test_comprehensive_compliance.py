#!/usr/bin/env python3
import os
"""
Comprehensive API Testing - Functional Requirements Compliance
Tests all APIs against the updated database schema and functional requirements
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import sys
from typing import Dict, Any, List

# Configuration
BASE_URL = "https://jbms1.onrender.com"
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": os.getenv("TEST_PASSWORD", "change-me")
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "details": []
        }
        
    def log_result(self, test_name: str, requirement: str, success: bool, details: str = ""):
        """Log test result with requirement mapping"""
        result = {
            "test": test_name,
            "requirement": requirement,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results["details"].append(result)
        if success:
            self.test_results["passed"] += 1
            print(f"✅ {test_name} ({requirement})")
        else:
            self.test_results["failed"] += 1
            print(f"❌ {test_name} ({requirement}): {details}")
            
    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        try:
            # Use form data for OAuth2PasswordRequestForm
            response = self.session.post(
                f"{API_URL}/auth/login",
                data=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.log_result("Authentication", "REQ-050,051", True, "Admin login successful")
                return True
            else:
                self.log_result("Authentication", "REQ-050,051", False, f"Login failed: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Authentication", "REQ-050,051", False, f"Auth error: {str(e)}")
            return False
    
    def test_health_check(self):
        """Test basic health endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            success = response.status_code == 200
            self.log_result("Health Check", "SYSTEM", success, 
                          f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            self.log_result("Health Check", "SYSTEM", False, str(e))

    def test_customer_management(self):
        """Test REQ-001, REQ-002: Customer CRUD operations"""
        
        # Test Create Customer (REQ-001)
        customer_data = {
            "name": f"Test Customer {uuid.uuid4().hex[:8]}",
            "phone": f"98765{uuid.uuid4().hex[:5]}",
            "email": f"test{uuid.uuid4().hex[:8]}@example.com",
            "address": "123 Test Street, Test City",
            "gst_number": "22AAAAA0000A1Z5"
        }
        
        try:
            response = self.session.post(f"{API_URL}/customers/", json=customer_data)
            if response.status_code == 201:
                customer = response.json()
                customer_id = customer["id"]
                self.log_result("Create Customer", "REQ-001", True)
                
                # Test Get Customer
                get_response = self.session.get(f"{API_URL}/customers/{customer_id}")
                if get_response.status_code == 200:
                    self.log_result("Get Customer", "REQ-001", True)
                else:
                    self.log_result("Get Customer", "REQ-001", False, f"Status: {get_response.status_code}")
                
                # Test Update Customer
                update_data = {"name": customer_data["name"] + " Updated"}
                update_response = self.session.put(f"{API_URL}/customers/{customer_id}", json=update_data)
                if update_response.status_code == 200:
                    self.log_result("Update Customer", "REQ-001", True)
                else:
                    self.log_result("Update Customer", "REQ-001", False, f"Status: {update_response.status_code}")
                
                # Test List Customers
                list_response = self.session.get(f"{API_URL}/customers/")
                if list_response.status_code == 200:
                    self.log_result("List Customers", "REQ-001", True)
                else:
                    self.log_result("List Customers", "REQ-001", False, f"Status: {list_response.status_code}")
                
                # Test Duplicate Prevention (REQ-002)
                duplicate_data = customer_data.copy()
                duplicate_response = self.session.post(f"{API_URL}/customers/", json=duplicate_data)
                if duplicate_response.status_code in [400, 409]:
                    self.log_result("Prevent Duplicate Customer", "REQ-002", True)
                else:
                    self.log_result("Prevent Duplicate Customer", "REQ-002", False, 
                                  f"Should reject duplicate, got: {duplicate_response.status_code}")
                
                return customer_id
                
            else:
                self.log_result("Create Customer", "REQ-001", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Customer Management", "REQ-001,002", False, str(e))
            return None

    def test_order_management(self, customer_id: str):
        """Test REQ-003 to REQ-009: Order and Order Items management"""
        
        if not customer_id:
            self.log_result("Order Management", "REQ-003", False, "No customer ID available")
            return None
            
        # Test Create Order (REQ-003)
        order_data = {
            "customer_id": customer_id,
            "status": "pending",
            "total_amount": 1500.00,
            "notes": "Test order for API validation",
            "order_items": [
                {
                    "material_type": "saree",
                    "quantity": 2,
                    "unit_price": 500.00,
                    "customization_details": "Blue with gold border"
                },
                {
                    "material_type": "dupatta",
                    "quantity": 1,
                    "unit_price": 500.00,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        try:
            response = self.session.post(f"{API_URL}/orders/", json=order_data)
            if response.status_code == 201:
                order = response.json()
                order_id = order["id"]
                order_number = order.get("order_number")
                
                self.log_result("Create Order", "REQ-003", True, f"Order: {order_number}")
                
                # Verify auto-generated order number format (should be ORD-YYYY-NNNN)
                if order_number and order_number.startswith("ORD-"):
                    self.log_result("Order Number Format", "REQ-003", True)
                else:
                    self.log_result("Order Number Format", "REQ-003", False, f"Invalid format: {order_number}")
                
                # Test Get Order (REQ-004)
                get_response = self.session.get(f"{API_URL}/orders/{order_id}")
                if get_response.status_code == 200:
                    order_details = get_response.json()
                    self.log_result("Get Order", "REQ-004", True)
                    
                    # Verify order items are included (REQ-007)
                    if "order_items" in order_details and len(order_details["order_items"]) == 2:
                        self.log_result("Order Items Included", "REQ-007", True)
                        
                        # Test Order Total Calculation (REQ-009)
                        expected_total = 1500.00
                        actual_total = float(order_details.get("total_amount", 0))
                        if abs(actual_total - expected_total) < 0.01:
                            self.log_result("Order Total Calculation", "REQ-009", True)
                        else:
                            self.log_result("Order Total Calculation", "REQ-009", False, 
                                          f"Expected: {expected_total}, Got: {actual_total}")
                    else:
                        self.log_result("Order Items Included", "REQ-007", False, 
                                      f"Expected 2 items, got: {len(order_details.get('order_items', []))}")
                else:
                    self.log_result("Get Order", "REQ-004", False, f"Status: {get_response.status_code}")
                
                # Test Update Order Status (REQ-005)
                update_data = {"status": "in_progress"}
                update_response = self.session.put(f"{API_URL}/orders/{order_id}", json=update_data)
                if update_response.status_code == 200:
                    self.log_result("Update Order Status", "REQ-005", True)
                else:
                    self.log_result("Update Order Status", "REQ-005", False, f"Status: {update_response.status_code}")
                
                # Test List Orders
                list_response = self.session.get(f"{API_URL}/orders/")
                if list_response.status_code == 200:
                    self.log_result("List Orders", "REQ-004", True)
                else:
                    self.log_result("List Orders", "REQ-004", False, f"Status: {list_response.status_code}")
                
                return order_id
                
            else:
                self.log_result("Create Order", "REQ-003", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Order Management", "REQ-003", False, str(e))
            return None

    def test_material_in_tracking(self, customer_id: str, order_id: str):
        """Test REQ-010, REQ-011: Material In tracking with customer linkage"""
        
        if not customer_id:
            self.log_result("Material In Tracking", "REQ-010", False, "No customer ID available")
            return
            
        # Test Material In with order linkage (REQ-010)
        material_data = {
            "customer_id": customer_id,
            "order_id": order_id,
            "material_type": "saree",
            "quantity": 2,
            "unit": "pieces",
            "notes": "Test material received from customer"
        }
        
        try:
            response = self.session.post(f"{API_URL}/materials/in", json=material_data)
            if response.status_code == 201:
                self.log_result("Material In with Order", "REQ-010", True)
                
                # Test Material In without order (general stock) - REQ-011
                general_material_data = {
                    "customer_id": customer_id,
                    "material_type": "dupatta",
                    "quantity": 5,
                    "unit": "pieces",
                    "notes": "General stock material"
                }
                
                general_response = self.session.post(f"{API_URL}/materials/in", json=general_material_data)
                if general_response.status_code == 201:
                    self.log_result("Material In without Order", "REQ-011", True)
                else:
                    self.log_result("Material In without Order", "REQ-011", False, 
                                  f"Status: {general_response.status_code}")
                
                # Test List Material In
                list_response = self.session.get(f"{API_URL}/materials/in")
                if list_response.status_code == 200:
                    self.log_result("List Material In", "REQ-010", True)
                else:
                    self.log_result("List Material In", "REQ-010", False, f"Status: {list_response.status_code}")
                    
            else:
                self.log_result("Material In with Order", "REQ-010", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Material In Tracking", "REQ-010", False, str(e))

    def test_production_stage_tracking(self, order_id: str):
        """Test REQ-012, REQ-013: Production workflow tracking"""
        
        if not order_id:
            self.log_result("Production Stage Tracking", "REQ-012", False, "No order ID available")
            return
            
        try:
            # Get order items to update production stages
            order_response = self.session.get(f"{API_URL}/orders/{order_id}")
            if order_response.status_code != 200:
                self.log_result("Production Stage Tracking", "REQ-012", False, "Cannot get order items")
                return
                
            order_data = order_response.json()
            order_items = order_data.get("order_items", [])
            
            if not order_items:
                self.log_result("Production Stage Tracking", "REQ-012", False, "No order items found")
                return
                
            # Test updating production stage for first item (REQ-008, REQ-013)
            item_id = order_items[0]["id"]
            stage_update = {
                "production_stage": "printing",
                "stage_completed_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Note: This might need an order-items specific endpoint
            update_response = self.session.put(f"{API_URL}/order-items/{item_id}", json=stage_update)
            if update_response.status_code == 200:
                self.log_result("Update Production Stage", "REQ-008,013", True)
            else:
                self.log_result("Update Production Stage", "REQ-008,013", False, 
                              f"Status: {update_response.status_code}")
                
        except Exception as e:
            self.log_result("Production Stage Tracking", "REQ-012", False, str(e))

    def test_challan_management(self, customer_id: str, order_id: str):
        """Test REQ-015 to REQ-018: Delivery Challan management"""
        
        if not customer_id or not order_id:
            self.log_result("Challan Management", "REQ-015", False, "No customer or order ID available")
            return None
        
        # First get order items to create challan items
        try:
            order_response = self.session.get(f"{API_URL}/orders/{order_id}")
            if order_response.status_code != 200:
                self.log_result("Challan Management", "REQ-015", False, "Cannot get order items for challan")
                return None
                
            order_data = order_response.json()
            order_items = order_data.get("order_items", [])
            
            if not order_items:
                self.log_result("Challan Management", "REQ-015", False, "No order items found for challan")
                return None
        except:
            self.log_result("Challan Management", "REQ-015", False, "Error getting order items")
            return None
            
        # Test Create Challan (REQ-015)
        challan_data = {
            "customer_id": customer_id,
            "challan_date": datetime.now(timezone.utc).isoformat(),
            "notes": "Test delivery challan",
            "challan_items": [
                {
                    "order_item_id": order_items[0]["id"],
                    "quantity": 1
                }
            ]
        }
        
        try:
            response = self.session.post(f"{API_URL}/challans/", json=challan_data)
            if response.status_code == 201:
                challan = response.json()
                challan_id = challan["id"]
                challan_number = challan.get("challan_number")
                
                self.log_result("Create Challan", "REQ-015", True, f"Challan: {challan_number}")
                
                # Verify auto-generated challan number format (should be CH-YYYY-NNNN)
                if challan_number and challan_number.startswith("CH-"):
                    self.log_result("Challan Number Format", "REQ-015", True)
                else:
                    self.log_result("Challan Number Format", "REQ-015", False, f"Invalid format: {challan_number}")
                
                # Test Get Challan
                get_response = self.session.get(f"{API_URL}/challans/{challan_id}")
                if get_response.status_code == 200:
                    self.log_result("Get Challan", "REQ-016", True)
                else:
                    self.log_result("Get Challan", "REQ-016", False, f"Status: {get_response.status_code}")
                
                # Test List Challans
                list_response = self.session.get(f"{API_URL}/challans/")
                if list_response.status_code == 200:
                    self.log_result("List Challans", "REQ-016", True)
                else:
                    self.log_result("List Challans", "REQ-016", False, f"Status: {list_response.status_code}")
                
                # Test Update Delivery Status (REQ-018)
                update_response = self.session.put(f"{API_URL}/challans/{challan_id}/deliver")
                if update_response.status_code == 200:
                    self.log_result("Update Delivery Status", "REQ-018", True)
                else:
                    self.log_result("Update Delivery Status", "REQ-018", False, f"Status: {update_response.status_code}")
                
                return challan_id
                
            else:
                self.log_result("Create Challan", "REQ-015", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Challan Management", "REQ-015", False, str(e))
            return None

    def test_material_out_tracking(self, challan_id: str, customer_id: str):
        """Test REQ-019, REQ-020: Material Out recording"""
        
        if not challan_id or not customer_id:
            self.log_result("Material Out Tracking", "REQ-019", False, "Missing challan or customer ID")
            return
            
        # Test Material Out (REQ-019)
        material_out_data = {
            "challan_id": challan_id,
            "customer_id": customer_id,
            "material_type": "saree",
            "quantity": 1,
            "unit": "pieces",
            "notes": "Test material dispatch"
        }
        
        try:
            response = self.session.post(f"{API_URL}/materials/out", json=material_out_data)
            if response.status_code == 201:
                self.log_result("Create Material Out", "REQ-019", True)
                
                # Test List Material Out
                list_response = self.session.get(f"{API_URL}/materials/out")
                if list_response.status_code == 200:
                    self.log_result("List Material Out", "REQ-019", True)
                else:
                    self.log_result("List Material Out", "REQ-019", False, f"Status: {list_response.status_code}")
                    
            else:
                self.log_result("Create Material Out", "REQ-019", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
            # Test Material Out without valid challan (REQ-020)
            invalid_data = material_out_data.copy()
            invalid_data["challan_id"] = str(uuid.uuid4())
            
            invalid_response = self.session.post(f"{API_URL}/materials/out", json=invalid_data)
            if invalid_response.status_code in [400, 404]:
                self.log_result("Prevent Material Out without Challan", "REQ-020", True)
            else:
                self.log_result("Prevent Material Out without Challan", "REQ-020", False, 
                              f"Should reject invalid challan, got: {invalid_response.status_code}")
                
        except Exception as e:
            self.log_result("Material Out Tracking", "REQ-019", False, str(e))

    def test_invoice_management(self, customer_id: str, challan_id: str):
        """Test REQ-021 to REQ-024: GST Invoice generation"""
        
        if not customer_id or not challan_id:
            self.log_result("Invoice Management", "REQ-021", False, "Missing customer or challan ID")
            return None
            
        # Test Create Invoice (REQ-021)
        invoice_data = {
            "customer_id": customer_id,
            "invoice_date": datetime.now(timezone.utc).isoformat(),
            "subtotal": 1000.00,
            "cgst_rate": 9.00,
            "sgst_rate": 9.00,
            "igst_rate": 0.00,
            "notes": "Test GST invoice"
        }
        
        try:
            response = self.session.post(f"{API_URL}/invoices/", json=invoice_data)
            if response.status_code == 201:
                invoice = response.json()
                invoice_id = invoice["id"]
                invoice_number = invoice.get("invoice_number")
                
                self.log_result("Create Invoice", "REQ-021", True, f"Invoice: {invoice_number}")
                
                # Verify auto-generated invoice number format (should be INV-YYYY-NNNN)
                if invoice_number and invoice_number.startswith("INV-"):
                    self.log_result("Invoice Number Format", "REQ-021", True)
                else:
                    self.log_result("Invoice Number Format", "REQ-021", False, f"Invalid format: {invoice_number}")
                
                # Test GST Calculations (REQ-021)
                cgst_amount = float(invoice.get("cgst_amount", 0))
                sgst_amount = float(invoice.get("sgst_amount", 0))
                total_amount = float(invoice.get("total_amount", 0))
                
                expected_cgst = 1000.00 * 0.09  # 9% of 1000
                expected_sgst = 1000.00 * 0.09  # 9% of 1000
                expected_total = 1000.00 + expected_cgst + expected_sgst
                
                if (abs(cgst_amount - expected_cgst) < 0.01 and 
                    abs(sgst_amount - expected_sgst) < 0.01 and 
                    abs(total_amount - expected_total) < 0.01):
                    self.log_result("GST Calculations", "REQ-021", True)
                else:
                    self.log_result("GST Calculations", "REQ-021", False, 
                                  f"CGST: {cgst_amount}, SGST: {sgst_amount}, Total: {total_amount}")
                
                # Test Get Invoice
                get_response = self.session.get(f"{API_URL}/invoices/{invoice_id}")
                if get_response.status_code == 200:
                    self.log_result("Get Invoice", "REQ-022", True)
                else:
                    self.log_result("Get Invoice", "REQ-022", False, f"Status: {get_response.status_code}")
                
                # Test List Invoices
                list_response = self.session.get(f"{API_URL}/invoices/")
                if list_response.status_code == 200:
                    self.log_result("List Invoices", "REQ-022", True)
                else:
                    self.log_result("List Invoices", "REQ-022", False, f"Status: {list_response.status_code}")
                
                return invoice_id
                
            else:
                self.log_result("Create Invoice", "REQ-021", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Invoice Management", "REQ-021", False, str(e))
            return None

    def test_payment_recording(self, invoice_id: str):
        """Test REQ-025 to REQ-028: Payment recording"""
        
        if not invoice_id:
            self.log_result("Payment Recording", "REQ-025", False, "No invoice ID available")
            return
            
        # Test Create Payment (REQ-025)
        payment_data = {
            "invoice_id": invoice_id,
            "amount": 500.00,  # Partial payment
            "payment_method": "upi",
            "reference_number": "UPI123456789",
            "notes": "Test partial payment"
        }
        
        try:
            response = self.session.post(f"{API_URL}/payments/", json=payment_data)
            if response.status_code == 201:
                self.log_result("Create Payment", "REQ-025", True)
                
                # Test Partial Payment (REQ-027)
                self.log_result("Partial Payment Support", "REQ-027", True)
                
                # Test List Payments
                list_response = self.session.get(f"{API_URL}/payments/")
                if list_response.status_code == 200:
                    self.log_result("List Payments", "REQ-026", True)
                else:
                    self.log_result("List Payments", "REQ-026", False, f"Status: {list_response.status_code}")
                
                # Test Overpayment Prevention (REQ-028)
                overpayment_data = payment_data.copy()
                overpayment_data["amount"] = 10000.00  # Much more than invoice total
                
                overpay_response = self.session.post(f"{API_URL}/payments/", json=overpayment_data)
                if overpay_response.status_code in [400, 422]:
                    self.log_result("Prevent Overpayment", "REQ-028", True)
                else:
                    self.log_result("Prevent Overpayment", "REQ-028", False, 
                                  f"Should reject overpayment, got: {overpay_response.status_code}")
                    
            else:
                self.log_result("Create Payment", "REQ-025", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Payment Recording", "REQ-025", False, str(e))

    def test_inventory_management(self):
        """Test REQ-032 to REQ-035: Inventory management"""
        
        # Test Create Inventory Item (REQ-032, REQ-033)
        inventory_data = {
            "item_name": f"Test Color {uuid.uuid4().hex[:8]}",
            "category": "Colors",
            "current_stock": 50.0,
            "unit": "kg",
            "reorder_level": 10.0,
            "cost_per_unit": 150.00,
            "supplier_name": "Test Supplier",
            "supplier_contact": "9876543210"
        }
        
        try:
            response = self.session.post(f"{API_URL}/inventory/", json=inventory_data)
            if response.status_code == 201:
                inventory = response.json()
                inventory_id = inventory["id"]
                
                self.log_result("Create Inventory Item", "REQ-032,033", True)
                
                # Test Get Inventory Item
                get_response = self.session.get(f"{API_URL}/inventory/{inventory_id}")
                if get_response.status_code == 200:
                    self.log_result("Get Inventory Item", "REQ-033", True)
                else:
                    self.log_result("Get Inventory Item", "REQ-033", False, f"Status: {get_response.status_code}")
                
                # Test List Inventory
                list_response = self.session.get(f"{API_URL}/inventory/")
                if list_response.status_code == 200:
                    self.log_result("List Inventory", "REQ-033", True)
                else:
                    self.log_result("List Inventory", "REQ-033", False, f"Status: {list_response.status_code}")
                
                # Test Inventory Adjustment (REQ-035)
                adjustment_data = {
                    "inventory_id": inventory_id,
                    "adjustment_type": "quantity_change",
                    "quantity_change": -5.0,
                    "reason": "Testing inventory adjustment functionality"
                }
                
                adjust_response = self.session.post(f"{API_URL}/inventory/adjustments", json=adjustment_data)
                if adjust_response.status_code == 201:
                    self.log_result("Inventory Adjustment", "REQ-035", True)
                else:
                    self.log_result("Inventory Adjustment", "REQ-035", False, 
                                  f"Status: {adjust_response.status_code}")
                
            else:
                self.log_result("Create Inventory Item", "REQ-032", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Management", "REQ-032", False, str(e))

    def test_expense_recording(self):
        """Test REQ-036: Expense recording"""
        
        # Test Create Expense (REQ-036)
        expense_data = {
            "category": "Transport",
            "description": "Test expense for delivery charges",
            "amount": 250.00,
            "payment_method": "cash",
            "reference_number": "EXP-TEST-001",
            "notes": "Test expense entry"
        }
        
        try:
            response = self.session.post(f"{API_URL}/expenses/", json=expense_data)
            if response.status_code == 201:
                self.log_result("Create Expense", "REQ-036", True)
                
                # Test List Expenses
                list_response = self.session.get(f"{API_URL}/expenses/")
                if list_response.status_code == 200:
                    self.log_result("List Expenses", "REQ-036", True)
                else:
                    self.log_result("List Expenses", "REQ-036", False, f"Status: {list_response.status_code}")
                    
            else:
                self.log_result("Create Expense", "REQ-036", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Expense Recording", "REQ-036", False, str(e))

    def test_reporting_endpoints(self):
        """Test REQ-037 and other reporting requirements"""
        
        # Test Pending Orders Report (REQ-037)
        try:
            response = self.session.get(f"{API_URL}/reports/pending-orders")
            if response.status_code == 200:
                self.log_result("Pending Orders Report", "REQ-037", True)
            else:
                self.log_result("Pending Orders Report", "REQ-037", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Pending Orders Report", "REQ-037", False, str(e))
        
        # Test other reports
        report_endpoints = [
            ("dashboard", "Dashboard Data"),
            ("inventory/low-stock", "Low Stock Report"),
            ("financial/outstanding", "Outstanding Receivables")
        ]
        
        for endpoint, name in report_endpoints:
            try:
                response = self.session.get(f"{API_URL}/reports/{endpoint}")
                if response.status_code == 200:
                    self.log_result(f"{name} Report", "REQ-037+", True)
                else:
                    self.log_result(f"{name} Report", "REQ-037+", False, 
                                  f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"{name} Report", "REQ-037+", False, str(e))

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Comprehensive API Testing - Functional Requirements Compliance")
        print("=" * 80)
        
        # Health check
        self.test_health_check()
        
        # Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with API tests")
            return
        
        # Core functionality tests
        customer_id = self.test_customer_management()
        order_id = self.test_order_management(customer_id)
        
        # Material tracking
        self.test_material_in_tracking(customer_id, order_id)
        self.test_production_stage_tracking(order_id)
        
        # Challan and dispatch
        challan_id = self.test_challan_management(customer_id, order_id)
        self.test_material_out_tracking(challan_id, customer_id)
        
        # Financial operations
        invoice_id = self.test_invoice_management(customer_id, challan_id)
        self.test_payment_recording(invoice_id)
        
        # Operations
        self.test_inventory_management()
        self.test_expense_recording()
        
        # Reporting
        self.test_reporting_endpoints()
        
        # Final summary
        self.print_summary()

    def print_summary(self):
        """Print detailed test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = self.test_results["passed"] + self.test_results["failed"]
        pass_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.test_results['passed']} ✅")
        print(f"Failed: {self.test_results['failed']} ❌")
        print(f"Pass Rate: {pass_rate:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        print("-" * 80)
        
        # Group by requirement
        req_groups = {}
        for result in self.test_results["details"]:
            req = result["requirement"]
            if req not in req_groups:
                req_groups[req] = []
            req_groups[req].append(result)
        
        for req, tests in sorted(req_groups.items()):
            passed = sum(1 for t in tests if t["status"] == "PASS")
            total = len(tests)
            print(f"\n{req}: {passed}/{total} passed")
            
            for test in tests:
                status_icon = "✅" if test["status"] == "PASS" else "❌"
                print(f"  {status_icon} {test['test']}")
                if test["details"] and test["status"] == "FAIL":
                    print(f"    → {test['details']}")
        
        print("\n" + "=" * 80)
        
        # Save detailed results
        with open("api_compliance_test_results.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"📄 Detailed results saved to: api_compliance_test_results.json")
        
        if pass_rate >= 80:
            print("🎉 OVERALL STATUS: GOOD - Most functional requirements are working!")
        elif pass_rate >= 60:
            print("⚠️  OVERALL STATUS: PARTIAL - Some issues need attention")
        else:
            print("🚨 OVERALL STATUS: CRITICAL - Major functionality issues detected")

if __name__ == "__main__":
    tester = APITester()
    tester.run_comprehensive_test() 