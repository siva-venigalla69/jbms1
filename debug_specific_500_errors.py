#!/usr/bin/env python3
import os
"""
Focused Debugging Script for 500 Errors
Systematically test and fix each 500 error with detailed logging
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "https://jbms1.onrender.com"

class FocusedDebugger:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.debug_results = []
        
    def authenticate(self):
        """Authenticate and get admin token"""
        print("🔐 Authenticating...")
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
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def get_auth_headers(self):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def debug_order_creation(self):
        """Debug order creation 500 error with detailed analysis"""
        print("\n🔍 DEBUGGING ORDER CREATION 500 ERROR")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # First, ensure we have a valid customer
        print("   Step 1: Creating test customer...")
        customer_data = {
            "name": f"Debug Customer {int(time.time())}",
            "phone": f"99999{int(time.time()) % 100000}",
            "email": f"debug_{int(time.time())}@example.com"
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
                customer_id = customer.get('id')
                print(f"   ✅ Customer created: {customer_id}")
            else:
                print(f"   ❌ Customer creation failed: {response.status_code} - {response.text}")
                return
                
        except Exception as e:
            print(f"   ❌ Customer creation error: {str(e)}")
            return
        
        # Test different order configurations to isolate the issue
        test_cases = [
            {
                "name": "Minimal Order",
                "data": {
                    "customer_id": customer_id,
                    "status": "pending",
                    "notes": "Minimal test order",
                    "order_items": [
                        {
                            "material_type": "saree",
                            "quantity": 1,
                            "unit_price": 100.00,
                            "customization_details": "Basic saree"
                        }
                    ]
                }
            },
            {
                "name": "Order Without Notes",
                "data": {
                    "customer_id": customer_id,
                    "order_items": [
                        {
                            "material_type": "dupatta",
                            "quantity": 2,
                            "unit_price": 50.00
                        }
                    ]
                }
            },
            {
                "name": "Order With Date",
                "data": {
                    "customer_id": customer_id,
                    "order_date": datetime.now().isoformat(),
                    "status": "pending",
                    "order_items": [
                        {
                            "material_type": "voni",
                            "quantity": 1,
                            "unit_price": 75.50,
                            "customization_details": "Test voni"
                        }
                    ]
                }
            }
        ]
        
        for test_case in test_cases:
            print(f"\n   Testing: {test_case['name']}")
            try:
                response = requests.post(
                    f"{self.base_url}/api/orders",
                    json=test_case['data'],
                    headers=headers,
                    timeout=30,
                    verify=False
                )
                
                print(f"      Status: {response.status_code}")
                if response.status_code in [200, 201]:
                    print(f"      ✅ SUCCESS: Order created")
                    return  # If one works, no need to test others
                else:
                    print(f"      ❌ ERROR: {response.text[:200]}")
                    
                    # Try to extract specific error details
                    if response.headers.get('content-type', '').startswith('application/json'):
                        try:
                            error_data = response.json()
                            print(f"      Error Detail: {error_data}")
                        except:
                            pass
                            
            except Exception as e:
                print(f"      ❌ EXCEPTION: {str(e)}")
    
    def debug_inventory_adjustment(self):
        """Debug inventory adjustment 500 error"""
        print("\n🔍 DEBUGGING INVENTORY ADJUSTMENT 500 ERROR")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # First, create an inventory item to adjust
        print("   Step 1: Creating test inventory item...")
        inventory_data = {
            "item_name": f"Debug Item {int(time.time())}",
            "category": "debug",
            "current_stock": 100.0,
            "unit": "pieces",
            "reorder_level": 10.0,
            "cost_per_unit": 25.0,
            "supplier_name": "Debug Supplier"
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
                inventory_id = inventory.get('id')
                print(f"   ✅ Inventory item created: {inventory_id}")
            else:
                print(f"   ❌ Inventory creation failed: {response.status_code} - {response.text}")
                return
                
        except Exception as e:
            print(f"   ❌ Inventory creation error: {str(e)}")
            return
        
        # Test adjustment with different data formats
        adjustment_tests = [
            {
                "name": "Simple Adjustment",
                "data": {
                    "adjustment_type": "quantity_change",
                    "quantity_change": -5.0,
                    "reason": "Usage",
                    "notes": "Test adjustment"
                }
            },
            {
                "name": "Positive Adjustment",
                "data": {
                    "adjustment_type": "quantity_change",
                    "quantity_change": 10.0,
                    "reason": "Stock replenishment"
                }
            },
            {
                "name": "Minimal Adjustment",
                "data": {
                    "quantity_change": -1.0,
                    "reason": "Test"
                }
            }
        ]
        
        for test in adjustment_tests:
            print(f"\n   Testing: {test['name']}")
            try:
                response = requests.post(
                    f"{self.base_url}/api/inventory/{inventory_id}/adjust",
                    json=test['data'],
                    headers=headers,
                    timeout=30,
                    verify=False
                )
                
                print(f"      Status: {response.status_code}")
                if response.status_code in [200, 201]:
                    print(f"      ✅ SUCCESS: Adjustment recorded")
                    return
                else:
                    print(f"      ❌ ERROR: {response.text[:200]}")
                    
            except Exception as e:
                print(f"      ❌ EXCEPTION: {str(e)}")
    
    def debug_returns_creation(self):
        """Debug returns creation 500 error"""
        print("\n🔍 DEBUGGING RETURNS CREATION 500 ERROR")
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        # Try to get existing order items first
        print("   Step 1: Checking for existing order items...")
        try:
            response = requests.get(
                f"{self.base_url}/api/orders",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            if response.status_code == 200:
                orders = response.json()
                print(f"   Found {len(orders)} orders")
                
                # Look for order items in the orders
                order_item_id = None
                for order in orders:
                    if order.get('order_items') and len(order['order_items']) > 0:
                        order_item_id = order['order_items'][0]['id']
                        print(f"   ✅ Found order item: {order_item_id}")
                        break
                
                if not order_item_id:
                    print("   ⚠️  No order items found - cannot test return creation with real data")
                    return
                    
                # Test return creation with real order item
                return_data = {
                    "order_item_id": order_item_id,
                    "quantity": 1,
                    "reason": "damaged",
                    "refund_amount": 50.00,
                    "is_adjustment": False,
                    "notes": "Debug return test"
                }
                
                print("   Step 2: Testing return creation with real order item...")
                response = requests.post(
                    f"{self.base_url}/api/returns",
                    json=return_data,
                    headers=headers,
                    timeout=30,
                    verify=False
                )
                
                print(f"      Status: {response.status_code}")
                if response.status_code in [200, 201]:
                    print(f"      ✅ SUCCESS: Return created")
                else:
                    print(f"      ❌ ERROR: {response.text[:200]}")
                    
            else:
                print(f"   ❌ Failed to get orders: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    def debug_pending_receivables_report(self):
        """Debug pending receivables report 500 error"""
        print("\n🔍 DEBUGGING PENDING RECEIVABLES REPORT 500 ERROR")  
        print("=" * 60)
        
        headers = self.get_auth_headers()
        
        print("   Testing pending receivables report...")
        try:
            response = requests.get(
                f"{self.base_url}/api/reports/pending-receivables",
                headers=headers,
                timeout=30,
                verify=False
            )
            
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   ✅ SUCCESS: Report generated")
            else:
                print(f"   ❌ ERROR: {response.text[:300]}")
                
                # Check if it's a SQL function issue
                if "UndefinedFunction" in response.text:
                    print("   🔍 ANALYSIS: SQL function missing in database")
                    print("   💡 SOLUTION: Need to create missing database views/functions")
                elif "relation does not exist" in response.text:
                    print("   🔍 ANALYSIS: Database table/view missing")
                    print("   💡 SOLUTION: Need to create missing database objects")
                    
        except Exception as e:
            print(f"   ❌ EXCEPTION: {str(e)}")
    
    def run_focused_debugging(self):
        """Run focused debugging on all 500 errors"""
        print("🔧 FOCUSED 500 ERROR DEBUGGING")
        print("=" * 70)
        print(f"Base URL: {self.base_url}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        if not self.authenticate():
            print("❌ Cannot proceed without authentication")
            return
        
        # Debug each 500 error systematically
        self.debug_order_creation()
        self.debug_inventory_adjustment() 
        self.debug_returns_creation()
        self.debug_pending_receivables_report()
        
        print("\n" + "=" * 70)
        print("🔧 DEBUGGING COMPLETE")
        print("=" * 70)
        print("\n💡 NEXT STEPS BASED ON FINDINGS:")
        print("1. Check database schema for missing constraints/triggers")
        print("2. Verify enum values match between code and database")
        print("3. Check for missing database functions/views")
        print("4. Review transaction handling in problematic endpoints")
        print("5. Consider database connection issues or timeouts")

def main():
    debugger = FocusedDebugger()
    debugger.run_focused_debugging()

if __name__ == "__main__":
    main() 