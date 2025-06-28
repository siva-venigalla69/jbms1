#!/usr/bin/env python3
"""
Comprehensive API Test Suite for Digital Textile Printing System
Tests all APIs based on current database schema and functional requirements
"""

import os
import json
import time
import uuid
import requests
import urllib3
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://jbms1.onrender.com"

class ComprehensiveAPITester:
    """Complete API Test Suite for all endpoints based on DB schema and functional requirements"""
    
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.test_results = []
        self.test_data = {
            'customers': [],
            'orders': [],
            'order_items': [],
            'challans': [],
            'invoices': [],
            'payments': [],
            'materials_in': [],
            'materials_out': [],
            'inventory': [],
            'expenses': [],
            'returns': []
        }
        
    def log_test_result(self, module: str, test_name: str, endpoint: str, method: str, 
                       status_code: int, success: bool, details: str = ""):
        """Log test result"""
        result = {
            "module": module,
            "test_name": test_name,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"   {status_icon} {test_name}: {status_code} - {details}")
        
    def authenticate(self):
        """Authenticate and get admin token"""
        print("\n🔐 AUTHENTICATION")
        print("=" * 60)
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        login_data = "username=admin&password = os.getenv("TEST_PASSWORD", "change-me")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                data=login_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.admin_token = token_data.get("access_token")
                self.log_test_result(
                    "AUTH", "Admin Login", "/api/auth/login", "POST",
                    response.status_code, True, "Login successful"
                )
                return True
            else:
                self.log_test_result(
                    "AUTH", "Admin Login", "/api/auth/login", "POST",
                    response.status_code, False, "Login failed"
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "AUTH", "Admin Login", "/api/auth/login", "POST",
                0, False, f"Login error: {str(e)}"
            )
            return False
    
    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_customers_api(self):
        """Test Customer Management APIs (REQ-001, REQ-002)"""
        print("\n👥 TESTING CUSTOMER MANAGEMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # 1. Create Customer (REQ-001)
        customer_data = {
            "name": f"Test Customer {int(time.time())}",
            "phone": f"98765{int(time.time()) % 100000}",
            "email": f"customer_{int(time.time())}@example.com",
            "address": "Test Address, Test City",
            "gst_number": "22AAAAA0000A1Z5"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/customers",
                json=customer_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                customer = response.json()
                self.test_data['customers'].append(customer)
                self.log_test_result(
                    "CUSTOMERS", "Create Customer", "/api/customers", "POST",
                    response.status_code, True, f"Customer created: {customer.get('name')}"
                )
            else:
                self.log_test_result(
                    "CUSTOMERS", "Create Customer", "/api/customers", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "CUSTOMERS", "Create Customer", "/api/customers", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Customers
        try:
            response = requests.get(
                f"{self.base_url}/api/customers",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            if success:
                customers = response.json()
                details = f"Retrieved {len(customers) if isinstance(customers, list) else 'unknown'} customers"
            else:
                details = f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "CUSTOMERS", "List Customers", "/api/customers", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "CUSTOMERS", "List Customers", "/api/customers", "GET",
                0, False, f"Error: {str(e)}"
            )
        
        # 3. Customer Search
        try:
            response = requests.get(
                f"{self.base_url}/api/customers/search?q=Test",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Search executed" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "CUSTOMERS", "Search Customers", "/api/customers/search", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "CUSTOMERS", "Search Customers", "/api/customers/search", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_orders_api(self):
        """Test Order Management APIs (REQ-003 to REQ-009)"""
        print("\n📋 TESTING ORDER MANAGEMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        if not self.test_data['customers']:
            print("   ⚠️  No customers available for order testing")
            return
        
        customer_id = self.test_data['customers'][0].get('id')
        
        # 1. Create Order (REQ-003)
        order_data = {
            "customer_id": customer_id,
            "status": "pending",
            "notes": "Test order for API testing",
            "order_items": [
                {
                    "material_type": "saree",
                    "quantity": 5,
                    "unit_price": 100.50,
                    "customization_details": "Red color with gold border"
                },
                {
                    "material_type": "dupatta",
                    "quantity": 3,
                    "unit_price": 75.25,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/orders",
                json=order_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                order = response.json()
                self.test_data['orders'].append(order)
                self.log_test_result(
                    "ORDERS", "Create Order", "/api/orders", "POST",
                    response.status_code, True, f"Order created: {order.get('order_number', 'Unknown')}"
                )
            else:
                self.log_test_result(
                    "ORDERS", "Create Order", "/api/orders", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "ORDERS", "Create Order", "/api/orders", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Orders
        try:
            response = requests.get(
                f"{self.base_url}/api/orders",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            if success:
                orders = response.json()
                details = f"Retrieved {len(orders) if isinstance(orders, list) else 'unknown'} orders"
            else:
                details = f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "ORDERS", "List Orders", "/api/orders", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "ORDERS", "List Orders", "/api/orders", "GET",
                0, False, f"Error: {str(e)}"
            )
        
        # 3. Update Order Status (REQ-005)
        if self.test_data['orders']:
            order_id = self.test_data['orders'][0].get('id')
            update_data = {"status": "in_progress"}
            
            try:
                response = requests.put(
                    f"{self.base_url}/api/orders/{order_id}",
                    json=update_data,
                    headers=headers,
                    timeout=30,
                    verify=False
                )
                
                success = response.status_code == 200
                details = f"Status updated" if success else f"Failed: {response.text[:100]}"
                    
                self.log_test_result(
                    "ORDERS", "Update Order Status", f"/api/orders/{order_id}", "PUT",
                    response.status_code, success, details
                )
                
            except Exception as e:
                self.log_test_result(
                    "ORDERS", "Update Order Status", f"/api/orders/{order_id}", "PUT",
                    0, False, f"Error: {str(e)}"
                )
    
    def test_materials_api(self):
        """Test Material Management APIs (REQ-010, REQ-011, REQ-019, REQ-020)"""
        print("\n📦 TESTING MATERIAL MANAGEMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        if not self.test_data['customers']:
            print("   ⚠️  No customers available for material testing")
            return
            
        customer_id = self.test_data['customers'][0].get('id')
        order_id = self.test_data['orders'][0].get('id') if self.test_data['orders'] else None
        
        # 1. Record Material In (REQ-010)
        material_in_data = {
            "order_id": order_id,
            "customer_id": customer_id,  # REQ-010 requirement
            "material_type": "saree",
            "quantity": 10,
            "unit": "pieces",
            "notes": "Received silk sarees for printing"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/materials/in",
                json=material_in_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                material_in = response.json()
                self.test_data['materials_in'].append(material_in)
                self.log_test_result(
                    "MATERIALS", "Record Material In", "/api/materials/in", "POST",
                    response.status_code, True, f"Material recorded: {material_in_data['quantity']} {material_in_data['material_type']}"
                )
            else:
                self.log_test_result(
                    "MATERIALS", "Record Material In", "/api/materials/in", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "MATERIALS", "Record Material In", "/api/materials/in", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Material In
        try:
            response = requests.get(
                f"{self.base_url}/api/materials/in",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved material in records" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "MATERIALS", "List Material In", "/api/materials/in", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "MATERIALS", "List Material In", "/api/materials/in", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_challans_api(self):
        """Test Delivery Challan APIs (REQ-015 to REQ-018)"""
        print("\n📄 TESTING DELIVERY CHALLAN APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        if not self.test_data['customers']:
            print("   ⚠️  No customers available for challan testing")
            return
            
        customer_id = self.test_data['customers'][0].get('id')
        
        # 1. Create Delivery Challan (REQ-015)
        challan_data = {
            "customer_id": customer_id,
            "notes": "Test delivery challan",
            "challan_items": []  # Would need order items
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/challans",
                json=challan_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                challan = response.json()
                self.test_data['challans'].append(challan)
                self.log_test_result(
                    "CHALLANS", "Create Challan", "/api/challans", "POST",
                    response.status_code, True, f"Challan created: {challan.get('challan_number', 'Unknown')}"
                )
            else:
                self.log_test_result(
                    "CHALLANS", "Create Challan", "/api/challans", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "CHALLANS", "Create Challan", "/api/challans", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Challans
        try:
            response = requests.get(
                f"{self.base_url}/api/challans",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved challans" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "CHALLANS", "List Challans", "/api/challans", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "CHALLANS", "List Challans", "/api/challans", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_invoices_api(self):
        """Test GST Invoice APIs (REQ-021 to REQ-024)"""
        print("\n🧾 TESTING GST INVOICE APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        if not self.test_data['customers']:
            print("   ⚠️  No customers available for invoice testing")
            return
            
        customer_id = self.test_data['customers'][0].get('id')
        
        # 1. Create GST Invoice (REQ-021)
        invoice_data = {
            "customer_id": customer_id,
            "cgst_rate": 9.0,
            "sgst_rate": 9.0,
            "igst_rate": 0.0,
            "challan_ids": []  # Would need actual challan IDs
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/invoices",
                json=invoice_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                invoice = response.json()
                self.test_data['invoices'].append(invoice)
                self.log_test_result(
                    "INVOICES", "Create Invoice", "/api/invoices", "POST",
                    response.status_code, True, f"Invoice created: {invoice.get('invoice_number', 'Unknown')}"
                )
            else:
                self.log_test_result(
                    "INVOICES", "Create Invoice", "/api/invoices", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "INVOICES", "Create Invoice", "/api/invoices", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Invoices
        try:
            response = requests.get(
                f"{self.base_url}/api/invoices",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved invoices" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "INVOICES", "List Invoices", "/api/invoices", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "INVOICES", "List Invoices", "/api/invoices", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_payments_api(self):
        """Test Payment APIs (REQ-025 to REQ-028)"""
        print("\n💰 TESTING PAYMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        if not self.test_data['invoices']:
            print("   ⚠️  No invoices available for payment testing")
            return
            
        invoice_id = self.test_data['invoices'][0].get('id')
        
        # 1. Record Payment (REQ-025)
        payment_data = {
            "invoice_id": invoice_id,
            "amount": 1000.00,
            "payment_method": "upi",
            "reference_number": f"UPI{int(time.time())}",
            "notes": "Test payment"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/payments",
                json=payment_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                payment = response.json()
                self.test_data['payments'].append(payment)
                self.log_test_result(
                    "PAYMENTS", "Record Payment", "/api/payments", "POST",
                    response.status_code, True, f"Payment recorded: ₹{payment_data['amount']}"
                )
            else:
                self.log_test_result(
                    "PAYMENTS", "Record Payment", "/api/payments", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "PAYMENTS", "Record Payment", "/api/payments", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Payments
        try:
            response = requests.get(
                f"{self.base_url}/api/payments",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved payments" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "PAYMENTS", "List Payments", "/api/payments", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "PAYMENTS", "List Payments", "/api/payments", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_inventory_api(self):
        """Test Inventory Management APIs (REQ-032 to REQ-035)"""
        print("\n📦 TESTING INVENTORY MANAGEMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # 1. Create Inventory Item (REQ-033)
        inventory_data = {
            "item_name": f"Test Chemical {int(time.time())}",
            "category": "chemicals",
            "current_stock": 100.5,
            "unit": "kg",
            "reorder_level": 20.0,
            "cost_per_unit": 50.75,
            "supplier_name": "Test Supplier",
            "supplier_contact": "9876543210"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/inventory",
                json=inventory_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                inventory = response.json()
                self.test_data['inventory'].append(inventory)
                self.log_test_result(
                    "INVENTORY", "Create Inventory Item", "/api/inventory", "POST",
                    response.status_code, True, f"Item created: {inventory_data['item_name']}"
                )
            else:
                self.log_test_result(
                    "INVENTORY", "Create Inventory Item", "/api/inventory", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "INVENTORY", "Create Inventory Item", "/api/inventory", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Inventory
        try:
            response = requests.get(
                f"{self.base_url}/api/inventory",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved inventory items" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "INVENTORY", "List Inventory", "/api/inventory", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "INVENTORY", "List Inventory", "/api/inventory", "GET",
                0, False, f"Error: {str(e)}"
            )
        
        # 3. Inventory Adjustment (REQ-035)
        if self.test_data['inventory']:
            inventory_id = self.test_data['inventory'][0].get('id')
            adjustment_data = {
                "adjustment_type": "quantity_change",
                "quantity_change": -5.0,
                "reason": "Usage in production",
                "notes": "Test adjustment"
            }
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/inventory/{inventory_id}/adjust",
                    json=adjustment_data,
                    headers=headers,
                    timeout=30,
                    verify=False
                )
                
                success = response.status_code in [200, 201]
                details = f"Adjustment recorded" if success else f"Failed: {response.text[:100]}"
                    
                self.log_test_result(
                    "INVENTORY", "Inventory Adjustment", f"/api/inventory/{inventory_id}/adjust", "POST",
                    response.status_code, success, details
                )
                
            except Exception as e:
                self.log_test_result(
                    "INVENTORY", "Inventory Adjustment", f"/api/inventory/{inventory_id}/adjust", "POST",
                    0, False, f"Error: {str(e)}"
                )
    
    def test_expenses_api(self):
        """Test Expense Management APIs (REQ-036)"""
        print("\n💸 TESTING EXPENSE MANAGEMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # 1. Record Expense (REQ-036)
        expense_data = {
            "category": "electricity",
            "description": "Monthly electricity bill",
            "amount": 2500.75,
            "payment_method": "bank_transfer",
            "reference_number": f"TXN{int(time.time())}",
            "notes": "Test expense record"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/expenses",
                json=expense_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                expense = response.json()
                self.test_data['expenses'].append(expense)
                self.log_test_result(
                    "EXPENSES", "Record Expense", "/api/expenses", "POST",
                    response.status_code, True, f"Expense recorded: ₹{expense_data['amount']}"
                )
            else:
                self.log_test_result(
                    "EXPENSES", "Record Expense", "/api/expenses", "POST",
                    response.status_code, False, f"Failed: {response.text[:100]}"
                )
                
        except Exception as e:
            self.log_test_result(
                "EXPENSES", "Record Expense", "/api/expenses", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Expenses
        try:
            response = requests.get(
                f"{self.base_url}/api/expenses",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved expenses" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "EXPENSES", "List Expenses", "/api/expenses", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "EXPENSES", "List Expenses", "/api/expenses", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_reports_api(self):
        """Test Reporting APIs (REQ-037 to REQ-045)"""
        print("\n📊 TESTING REPORTING APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # 1. Pending Orders Report (REQ-037)
        try:
            response = requests.get(
                f"{self.base_url}/api/reports/pending-orders",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Pending orders report generated" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "REPORTS", "Pending Orders Report", "/api/reports/pending-orders", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "REPORTS", "Pending Orders Report", "/api/reports/pending-orders", "GET",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. Production Status Report (REQ-038)
        try:
            response = requests.get(
                f"{self.base_url}/api/reports/production-status",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Production status report generated" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "REPORTS", "Production Status Report", "/api/reports/production-status", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "REPORTS", "Production Status Report", "/api/reports/production-status", "GET",
                0, False, f"Error: {str(e)}"
            )
        
        # 3. Stock Holdings Report (REQ-039)
        try:
            response = requests.get(
                f"{self.base_url}/api/reports/stock-holdings",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Stock holdings report generated" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "REPORTS", "Stock Holdings Report", "/api/reports/stock-holdings", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "REPORTS", "Stock Holdings Report", "/api/reports/stock-holdings", "GET",
                0, False, f"Error: {str(e)}"
            )
        
        # 4. Pending Receivables Report (REQ-040)
        try:
            response = requests.get(
                f"{self.base_url}/api/reports/pending-receivables",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Pending receivables report generated" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "REPORTS", "Pending Receivables Report", "/api/reports/pending-receivables", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "REPORTS", "Pending Receivables Report", "/api/reports/pending-receivables", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def test_returns_api(self):
        """Test Returns Management APIs (REQ-029 to REQ-031)"""
        print("\n🔄 TESTING RETURNS MANAGEMENT APIs")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # Note: returns.py is empty (0 bytes), so these tests will likely fail
        # but we should test the expected endpoints
        
        # 1. Record Return (REQ-029)
        return_data = {
            "order_item_id": "dummy-order-item-id",  # Would need actual order item
            "quantity": 1,
            "reason": "damaged",
            "refund_amount": 100.00,
            "is_adjustment": False,
            "notes": "Test return record"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/returns",
                json=return_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code in [200, 201]
            details = f"Return recorded" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "RETURNS", "Record Return", "/api/returns", "POST",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "RETURNS", "Record Return", "/api/returns", "POST",
                0, False, f"Error: {str(e)}"
            )
        
        # 2. List Returns
        try:
            response = requests.get(
                f"{self.base_url}/api/returns",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            success = response.status_code == 200
            details = f"Retrieved returns" if success else f"Failed: {response.text[:100]}"
                
            self.log_test_result(
                "RETURNS", "List Returns", "/api/returns", "GET",
                response.status_code, success, details
            )
            
        except Exception as e:
            self.log_test_result(
                "RETURNS", "List Returns", "/api/returns", "GET",
                0, False, f"Error: {str(e)}"
            )
    
    def generate_comprehensive_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 80)
        print("🏁 COMPREHENSIVE API TEST REPORT")
        print("=" * 80)
        
        # Group results by module
        modules = {}
        for result in self.test_results:
            module = result["module"]
            if module not in modules:
                modules[module] = {"total": 0, "passed": 0, "failed": 0, "tests": []}
            
            modules[module]["total"] += 1
            if result["success"]:
                modules[module]["passed"] += 1
            else:
                modules[module]["failed"] += 1
            modules[module]["tests"].append(result)
        
        # Overall summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 OVERALL SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%")
        
        # Module-wise summary
        print(f"\n🔍 MODULE-WISE RESULTS:")
        print(f"{'Module':<15} {'Total':<8} {'Passed':<8} {'Failed':<8} {'Rate':<10}")
        print("-" * 55)
        
        for module, stats in modules.items():
            rate = f"{(stats['passed']/stats['total']*100):.1f}%" if stats['total'] > 0 else "0%"
            print(f"{module:<15} {stats['total']:<8} {stats['passed']:<8} {stats['failed']:<8} {rate:<10}")
        
        # Functional requirements coverage
        print(f"\n📋 FUNCTIONAL REQUIREMENTS COVERAGE:")
        req_coverage = {
            "REQ-001/002": "Customer Management" + (" ✅" if modules.get("CUSTOMERS", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-003-009": "Order Management" + (" ✅" if modules.get("ORDERS", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-010/011": "Material In" + (" ✅" if modules.get("MATERIALS", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-015-018": "Delivery Challans" + (" ✅" if modules.get("CHALLANS", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-021-024": "GST Invoices" + (" ✅" if modules.get("INVOICES", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-025-028": "Payment Recording" + (" ✅" if modules.get("PAYMENTS", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-029-031": "Returns Management" + (" ✅" if modules.get("RETURNS", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-032-035": "Inventory Management" + (" ✅" if modules.get("INVENTORY", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-036": "Expense Recording" + (" ✅" if modules.get("EXPENSES", {}).get("passed", 0) > 0 else " ❌"),
            "REQ-037-045": "Reporting" + (" ✅" if modules.get("REPORTS", {}).get("passed", 0) > 0 else " ❌"),
        }
        
        for req, status in req_coverage.items():
            print(f"   {req}: {status}")
        
        # Save detailed report
        report_filename = f"comprehensive_api_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "success_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
                },
                "modules": modules,
                "requirements_coverage": req_coverage,
                "detailed_results": self.test_results
            }, f, indent=2)
        
        print(f"\n💾 Detailed report saved to: {report_filename}")
        print("=" * 80)
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
        }
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"""
╔══════════════════════════════════════════════════════════════════════════╗
║                     COMPREHENSIVE API TESTING SUITE                     ║
║                                                                          ║
║  Testing all APIs based on:                                              ║
║  • Current Database Schema (PostgreSQL)                                 ║
║  • Python Models (SQLAlchemy)                                           ║
║  • Functional Requirements (REQ-001 to REQ-064)                         ║
║  • API Endpoints (/api/...)                                             ║
║                                                                          ║
║  Base URL: {self.base_url:<54} ║
╚══════════════════════════════════════════════════════════════════════════╝
        """)
        
        start_time = time.time()
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed - stopping tests")
            return self.generate_comprehensive_report()
        
        # Run all module tests
        self.test_customers_api()      # REQ-001, REQ-002
        self.test_orders_api()         # REQ-003 to REQ-009
        self.test_materials_api()      # REQ-010, REQ-011, REQ-019, REQ-020
        self.test_challans_api()       # REQ-015 to REQ-018
        self.test_invoices_api()       # REQ-021 to REQ-024
        self.test_payments_api()       # REQ-025 to REQ-028
        self.test_returns_api()        # REQ-029 to REQ-031
        self.test_inventory_api()      # REQ-032 to REQ-035
        self.test_expenses_api()       # REQ-036
        self.test_reports_api()        # REQ-037 to REQ-045
        
        end_time = time.time()
        print(f"\n⏱️  Total testing time: {end_time - start_time:.2f} seconds")
        
        return self.generate_comprehensive_report()

def main():
    """Main function"""
    tester = ComprehensiveAPITester()
    report = tester.run_all_tests()
    return report

if __name__ == "__main__":
    try:
        report = main()
        # Exit with error code if significant failures
        if report and report["failed"] > report["passed"] // 2:
            exit(1)
    except KeyboardInterrupt:
        print("\n\n⏸️  Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        exit(1)