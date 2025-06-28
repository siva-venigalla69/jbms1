#!/usr/bin/env python3
import os
"""
Comprehensive Remote Database Schema Checker
Analyzes the production database schema by examining API responses
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://jbms1.onrender.com/api"

def get_auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "admin", 
        "password": os.getenv("TEST_PASSWORD", "change-me")
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def check_table_columns_via_list_endpoints():
    """Check table columns by examining list endpoint responses"""
    token = get_auth_token()
    if not token:
        print("❌ Authentication failed")
        return {}
    
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints_to_check = {
        "customers": "/customers",
        "orders": "/orders", 
        "materials_in": "/materials/in",
        "materials_out": "/materials/out",
        "inventory": "/inventory",
        "challans": "/challans",
        "invoices": "/invoices",
        "payments": "/payments",
        "expenses": "/expenses"
    }
    
    found_columns = {}
    
    for table_name, endpoint in endpoints_to_check.items():
        print(f"\n🔍 Checking {table_name} via {endpoint}")
        
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    # Get columns from first record
                    first_record = data[0]
                    columns = list(first_record.keys())
                    found_columns[table_name] = columns
                    print(f"✅ Found {len(columns)} columns: {', '.join(columns)}")
                else:
                    print(f"⚠️  No data in {table_name}")
                    found_columns[table_name] = []
            elif response.status_code == 404:
                print(f"❌ Endpoint not found: {endpoint}")
                found_columns[table_name] = "ENDPOINT_NOT_FOUND"
            else:
                print(f"❌ Error {response.status_code}: {response.text[:100]}")
                found_columns[table_name] = f"ERROR_{response.status_code}"
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            found_columns[table_name] = f"EXCEPTION"
    
    return found_columns

def test_specific_column_requirements():
    """Test for specific missing columns by attempting operations"""
    token = get_auth_token()
    if not token:
        return {}
    
    headers = {"Authorization": f"Bearer {token}"}
    
    tests = {
        "order_number_column": {
            "description": "Testing if orders have order_number column",
            "test": lambda: test_order_creation(headers)
        },
        "customer_id_in_material_in": {
            "description": "Testing if material_in has customer_id column", 
            "test": lambda: test_material_in_customer_id(headers)
        },
        "challan_number_column": {
            "description": "Testing if challans have challan_number column",
            "test": lambda: test_challan_creation(headers)
        },
        "invoice_number_column": {
            "description": "Testing if invoices have invoice_number column",
            "test": lambda: test_invoice_creation(headers)
        },
        "supplier_fields_in_inventory": {
            "description": "Testing inventory supplier field mapping",
            "test": lambda: test_inventory_creation(headers)
        }
    }
    
    results = {}
    print(f"\n{'='*60}")
    print("TESTING SPECIFIC COLUMN REQUIREMENTS")
    print(f"{'='*60}")
    
    for test_name, test_info in tests.items():
        print(f"\n🧪 {test_info['description']}")
        try:
            result = test_info['test']()
            results[test_name] = result
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {status}")
        except Exception as e:
            results[test_name] = False
            print(f"   ❌ EXCEPTION: {str(e)}")
    
    return results

def test_order_creation(headers):
    """Test order creation to check for order_number column"""
    # Get a customer first
    customers_response = requests.get(f"{BASE_URL}/customers", headers=headers)
    if customers_response.status_code != 200:
        print("   ⚠️  Cannot get customers for testing")
        return False
    
    customers = customers_response.json()
    if not customers:
        print("   ⚠️  No customers available")
        return False
    
    customer_id = customers[0]["id"]
    
    test_order = {
        "customer_id": customer_id,
        "order_items": [{
            "material_type": "saree",
            "quantity": 1,
            "unit_price": 100.0
        }]
    }
    
    response = requests.post(f"{BASE_URL}/orders", json=test_order, headers=headers)
    
    if response.status_code == 201:
        order = response.json()
        has_order_number = "order_number" in order and order["order_number"]
        print(f"   Order created with number: {order.get('order_number', 'MISSING')}")
        return has_order_number
    else:
        print(f"   Order creation failed: {response.status_code}")
        return False

def test_material_in_customer_id(headers):
    """Test material_in creation with customer_id"""
    customers_response = requests.get(f"{BASE_URL}/customers", headers=headers)
    if customers_response.status_code != 200:
        return False
    
    customers = customers_response.json()
    if not customers:
        return False
    
    customer_id = customers[0]["id"]
    
    test_material = {
        "customer_id": customer_id,
        "material_type": "saree",
        "quantity": 1,
        "unit": "pieces"
    }
    
    response = requests.post(f"{BASE_URL}/materials/in", json=test_material, headers=headers)
    
    if response.status_code == 201:
        material = response.json()
        has_customer_id = "customer_id" in material and material["customer_id"]
        print(f"   Material created with customer_id: {material.get('customer_id', 'MISSING')}")
        return has_customer_id
    else:
        print(f"   Material creation failed: {response.status_code}")
        return False

def test_challan_creation(headers):
    """Test challan creation for challan_number"""
    # This would require orders with items, so we'll check existing challans instead
    response = requests.get(f"{BASE_URL}/challans", headers=headers)
    if response.status_code == 200:
        challans = response.json()
        if challans:
            first_challan = challans[0]
            has_challan_number = "challan_number" in first_challan and first_challan["challan_number"]
            print(f"   Existing challan number: {first_challan.get('challan_number', 'MISSING')}")
            return has_challan_number
    
    print("   No existing challans to check")
    return False

def test_invoice_creation(headers):
    """Test invoice number in existing invoices"""
    response = requests.get(f"{BASE_URL}/invoices", headers=headers)
    if response.status_code == 200:
        invoices = response.json()
        if invoices:
            first_invoice = invoices[0]
            has_invoice_number = "invoice_number" in first_invoice and first_invoice["invoice_number"]
            print(f"   Existing invoice number: {first_invoice.get('invoice_number', 'MISSING')}")
            return has_invoice_number
    
    print("   No existing invoices to check")
    return False

def test_inventory_creation(headers):
    """Test inventory creation for supplier fields"""
    test_inventory = {
        "item_name": f"Test Item Schema Check {datetime.now().microsecond}",
        "category": "Test",
        "current_stock": 10.0,
        "unit": "pieces",
        "reorder_level": 5.0,
        "cost_per_unit": 25.0,
        "supplier_info": "Test Supplier - Contact123"
    }
    
    response = requests.post(f"{BASE_URL}/inventory", json=test_inventory, headers=headers)
    
    if response.status_code == 201:
        print(f"   Inventory created successfully")
        return True
    else:
        print(f"   Inventory creation failed: {response.status_code}")
        # Check if it's a field mapping issue
        if "supplier" in response.text.lower():
            print(f"   Likely supplier field mapping issue")
        return False

def analyze_required_vs_current_schema():
    """Compare required schema with current schema"""
    
    required_schema = {
        "orders": [
            "id", "order_number", "customer_id", "order_date", "status",
            "total_amount", "notes", "created_at", "updated_at"
        ],
        "material_in": [
            "id", "order_id", "customer_id", "material_type", "quantity",
            "unit", "received_date", "notes", "created_at"
        ],
        "material_out": [
            "id", "challan_id", "customer_id", "material_type", "quantity",
            "dispatch_date", "created_at"
        ],
        "delivery_challans": [
            "id", "challan_number", "customer_id", "challan_date", 
            "total_quantity", "delivery_status", "notes", "created_at"
        ],
        "gst_invoices": [
            "id", "invoice_number", "customer_id", "invoice_date",
            "subtotal", "total_amount", "outstanding_amount", "created_at"
        ],
        "inventory": [
            "id", "item_name", "category", "current_stock", "unit",
            "reorder_level", "cost_per_unit", "supplier_name", "supplier_contact"
        ]
    }
    
    print(f"\n{'='*60}")
    print("REQUIRED vs CURRENT SCHEMA ANALYSIS")
    print(f"{'='*60}")
    
    current_columns = check_table_columns_via_list_endpoints()
    
    for table, required_cols in required_schema.items():
        print(f"\n📋 {table.upper()}")
        print("-" * 40)
        
        if table in current_columns:
            current_cols = current_columns[table]
            
            if isinstance(current_cols, str):
                print(f"❌ Cannot check - {current_cols}")
                continue
            
            missing_cols = [col for col in required_cols if col not in current_cols]
            extra_cols = [col for col in current_cols if col not in required_cols]
            
            if missing_cols:
                print(f"❌ Missing columns: {', '.join(missing_cols)}")
            else:
                print(f"✅ All required columns present")
            
            if extra_cols:
                print(f"ℹ️  Extra columns: {', '.join(extra_cols)}")
        else:
            print(f"❌ Table not found or no data")

def main():
    print("JBMS Comprehensive Database Schema Check")
    print("="*60)
    print("Checking production database schema via API analysis")
    print("="*60)
    
    # 1. Check current columns via API responses
    current_schema = check_table_columns_via_list_endpoints()
    
    # 2. Test specific column requirements
    column_tests = test_specific_column_requirements()
    
    # 3. Analyze required vs current
    analyze_required_vs_current_schema()
    
    # 4. Summary
    print(f"\n{'='*60}")
    print("SUMMARY & RECOMMENDATIONS")
    print("="*60)
    
    critical_issues = []
    
    # Check test results
    if not column_tests.get("order_number_column", False):
        critical_issues.append("❌ Orders missing order_number column")
    
    if not column_tests.get("customer_id_in_material_in", False):
        critical_issues.append("❌ Material_in missing customer_id column")
    
    if not column_tests.get("supplier_fields_in_inventory", False):
        critical_issues.append("❌ Inventory has supplier field mapping issues")
    
    if "expenses" in current_schema and current_schema["expenses"] == "ENDPOINT_NOT_FOUND":
        critical_issues.append("❌ Expenses API not deployed")
    
    if critical_issues:
        print("\n🚨 CRITICAL ISSUES FOUND:")
        for issue in critical_issues:
            print(f"   {issue}")
        
        print(f"\n🔧 IMMEDIATE ACTIONS NEEDED:")
        print(f"   1. Deploy backend code changes (if not done)")
        print(f"   2. Run database migration script from COMPLETE_SCHEMA_FIX.md")
        print(f"   3. Restart application if needed")
        print(f"   4. Re-run this check to verify fixes")
    else:
        print("\n✅ All critical schema checks passed!")
        print("   Database schema appears to be correctly configured.")

if __name__ == "__main__":
    main() 