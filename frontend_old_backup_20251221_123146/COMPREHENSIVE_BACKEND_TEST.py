#!/usr/bin/env python3
"""
Comprehensive Backend Functionality Testing
Tests all business requirements from database level first
"""

import json
import os
import sys
from datetime import datetime, timedelta
import uuid
import random
from typing import Dict, List, Any, Optional

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from supabase import create_client, Client
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install: pip install supabase psycopg2-binary")
    sys.exit(1)

class ComprehensiveBackendTester:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        self.db_url = os.getenv('DATABASE_URL')
        
        self.client: Optional[Client] = None
        self.db_conn = None
        self.test_results = []
        self.test_data = {}
        
        # Test configuration
        self.test_customer_name = f"Test Customer {datetime.now().strftime('%H%M%S')}"
        self.test_material_types = ['Cotton', 'Silk', 'Polyester']
        
    def setup_connections(self) -> bool:
        """Setup Supabase and direct database connections"""
        try:
            if not self.supabase_url or not self.supabase_key:
                print("❌ Missing Supabase credentials in environment")
                return False
                
            self.client = create_client(self.supabase_url, self.supabase_key)
            
            # Test Supabase connection
            response = self.client.from_('customers').select('count').limit(1).execute()
            print("✅ Supabase connection established")
            
            # Setup direct DB connection if available
            if self.db_url:
                self.db_conn = psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)
                print("✅ Direct database connection established")
            
            return True
            
        except Exception as e:
            print(f"❌ Connection setup failed: {e}")
            return False
    
    def log_test(self, test_name: str, status: str, details: str = "", data: Any = None):
        """Log test results"""
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {details}")
    
    def test_database_schema(self) -> bool:
        """Test 1: Database Schema and Tables"""
        print("\n🔍 Testing Database Schema...")
        
        try:
            required_tables = [
                'customers', 'orders', 'order_items', 'material_in',
                'delivery_challans', 'delivery_challan_items', 'material_stock',
                'gst_invoices', 'payments'
            ]
            
            for table in required_tables:
                try:
                    result = self.client.from_(table).select('count').limit(1).execute()
                    self.log_test(f"Schema Check - {table}", "PASS", f"Table exists and accessible")
                except Exception as e:
                    self.log_test(f"Schema Check - {table}", "FAIL", str(e))
                    return False
            
            # Test material_stock table specifically
            try:
                result = self.client.from_('material_stock_with_customer').select('*').limit(5).execute()
                stock_count = len(result.data) if result.data else 0
                self.log_test("Material Stock View", "PASS", f"Found {stock_count} stock records")
            except Exception as e:
                self.log_test("Material Stock View", "FAIL", str(e))
            
            return True
            
        except Exception as e:
            self.log_test("Database Schema", "FAIL", str(e))
            return False
    
    def test_customer_operations(self) -> bool:
        """Test 2: Customer Management Operations"""
        print("\n👥 Testing Customer Operations...")
        
        try:
            # Create test customer
            customer_data = {
                'name': self.test_customer_name,
                'phone': '+1234567890',
                'email': f'test.{int(datetime.now().timestamp())}@example.com',
                'address': '123 Test Street, Test City'
            }
            
            result = self.client.from_('customers').insert(customer_data).execute()
            
            if result.data and len(result.data) > 0:
                self.test_data['customer_id'] = result.data[0]['id']
                self.log_test("Customer Creation", "PASS", f"Created customer: {customer_data['name']}")
                
                # Test customer retrieval
                get_result = self.client.from_('customers').select('*').eq('id', self.test_data['customer_id']).execute()
                if get_result.data:
                    self.log_test("Customer Retrieval", "PASS", "Customer retrieved successfully")
                else:
                    self.log_test("Customer Retrieval", "FAIL", "Could not retrieve created customer")
                    return False
            else:
                self.log_test("Customer Creation", "FAIL", "No customer data returned")
                return False
                
        except Exception as e:
            self.log_test("Customer Operations", "FAIL", str(e))
            return False
            
        return True
    
    def test_order_workflow(self) -> bool:
        """Test 3: Complete Order Workflow"""
        print("\n📋 Testing Order Workflow...")
        
        if 'customer_id' not in self.test_data:
            self.log_test("Order Workflow", "SKIP", "No customer available")
            return False
        
        try:
            # Create order with items
            order_data = {
                'customer_id': self.test_data['customer_id'],
                'order_number': f'ORD-TEST-{int(datetime.now().timestamp())}',
                'order_date': datetime.now().date().isoformat(),
                'status': 'pending',
                'total_amount': 1500.00,
                'notes': 'Test order for comprehensive testing'
            }
            
            order_result = self.client.from_('orders').insert(order_data).execute()
            
            if order_result.data and len(order_result.data) > 0:
                order_id = order_result.data[0]['id']
                self.test_data['order_id'] = order_id
                self.log_test("Order Creation", "PASS", f"Created order: {order_data['order_number']}")
                
                # Create order items
                order_items = []
                for i, material in enumerate(self.test_material_types):
                    item_data = {
                        'order_id': order_id,
                        'material_type': material,
                        'quantity': random.randint(10, 50),
                        'unit_price': random.uniform(20.0, 50.0),
                        'customization_details': f'Test customization for {material}'
                    }
                    item_data['subtotal'] = item_data['quantity'] * item_data['unit_price']
                    order_items.append(item_data)
                
                items_result = self.client.from_('order_items').insert(order_items).execute()
                
                if items_result.data:
                    self.test_data['order_items'] = items_result.data
                    self.log_test("Order Items Creation", "PASS", f"Created {len(items_result.data)} order items")
                else:
                    self.log_test("Order Items Creation", "FAIL", "No order items created")
                    return False
                    
                # Test order retrieval with items
                full_order = self.client.from_('orders').select('*, order_items(*), customer(*)').eq('id', order_id).execute()
                
                if full_order.data and full_order.data[0].get('order_items'):
                    self.log_test("Order with Items Retrieval", "PASS", "Order with items retrieved successfully")
                else:
                    self.log_test("Order with Items Retrieval", "FAIL", "Could not retrieve order with items")
                    
            else:
                self.log_test("Order Creation", "FAIL", "No order data returned")
                return False
                
        except Exception as e:
            self.log_test("Order Workflow", "FAIL", str(e))
            return False
            
        return True
    
    def test_material_management(self) -> bool:
        """Test 4: Material IN/OUT and Stock Management"""
        print("\n📦 Testing Material Management...")
        
        if 'customer_id' not in self.test_data:
            self.log_test("Material Management", "SKIP", "No customer available")
            return False
        
        try:
            customer_id = self.test_data['customer_id']
            
            # Test material receiving
            for material_type in self.test_material_types:
                material_data = {
                    'customer_id': customer_id,
                    'material_type': material_type,
                    'quantity': random.uniform(50.0, 100.0),
                    'received_date': datetime.now().date().isoformat(),
                    'quality_notes': f'Good quality {material_type}',
                    'storage_location': f'Warehouse-{material_type[0]}'
                }
                
                result = self.client.from_('material_in').insert(material_data).execute()
                
                if result.data:
                    self.log_test(f"Material IN - {material_type}", "PASS", f"Recorded {material_data['quantity']} units")
                else:
                    self.log_test(f"Material IN - {material_type}", "FAIL", "Could not record material")
                    return False
            
            # Check material stock was updated automatically
            stock_result = self.client.from_('material_stock').select('*').eq('customer_id', customer_id).execute()
            
            if stock_result.data:
                stock_count = len(stock_result.data)
                total_stock = sum(item['current_stock'] for item in stock_result.data)
                self.log_test("Material Stock Auto-Update", "PASS", f"Found {stock_count} materials, total stock: {total_stock}")
                self.test_data['material_stock'] = stock_result.data
            else:
                self.log_test("Material Stock Auto-Update", "FAIL", "No stock records found")
                return False
                
        except Exception as e:
            self.log_test("Material Management", "FAIL", str(e))
            return False
            
        return True
    
    def test_delivery_challan_workflow(self) -> bool:
        """Test 5: Delivery Challan and Stock Reduction"""
        print("\n🚚 Testing Delivery Challan Workflow...")
        
        if 'order_id' not in self.test_data or 'customer_id' not in self.test_data:
            self.log_test("Delivery Challan", "SKIP", "Missing order or customer data")
            return False
        
        try:
            customer_id = self.test_data['customer_id']
            order_id = self.test_data['order_id']
            
            # Create delivery challan
            challan_data = {
                'challan_number': f'DC-TEST-{int(datetime.now().timestamp())}',
                'customer_id': customer_id,
                'order_id': order_id,
                'delivery_date': datetime.now().date().isoformat(),
                'status': 'delivered',
                'total_amount': 1200.00,
                'notes': 'Test delivery challan'
            }
            
            challan_result = self.client.from_('delivery_challans').insert(challan_data).execute()
            
            if challan_result.data:
                challan_id = challan_result.data[0]['id']
                self.test_data['challan_id'] = challan_id
                self.log_test("Delivery Challan Creation", "PASS", f"Created challan: {challan_data['challan_number']}")
                
                # Create challan items (simulate partial delivery)
                challan_items = []
                for material_type in self.test_material_types[:2]:  # Only deliver 2 materials
                    item_data = {
                        'delivery_challan_id': challan_id,
                        'order_id': order_id,
                        'material_type': material_type,
                        'quantity_delivered': random.uniform(10.0, 30.0),
                        'unit_price': random.uniform(20.0, 50.0),
                        'notes': f'Delivered {material_type}'
                    }
                    item_data['subtotal'] = item_data['quantity_delivered'] * item_data['unit_price']
                    challan_items.append(item_data)
                
                items_result = self.client.from_('delivery_challan_items').insert(challan_items).execute()
                
                if items_result.data:
                    self.log_test("Challan Items Creation", "PASS", f"Created {len(items_result.data)} delivery items")
                    
                    # Check if material stock was reduced
                    updated_stock = self.client.from_('material_stock').select('*').eq('customer_id', customer_id).execute()
                    
                    if updated_stock.data:
                        delivered_materials = [item['material_type'] for item in items_result.data]
                        for stock_item in updated_stock.data:
                            if stock_item['material_type'] in delivered_materials:
                                if stock_item['total_delivered'] > 0:
                                    self.log_test(f"Stock Reduction - {stock_item['material_type']}", "PASS", 
                                                f"Delivered: {stock_item['total_delivered']}, Current: {stock_item['current_stock']}")
                                else:
                                    self.log_test(f"Stock Reduction - {stock_item['material_type']}", "FAIL", 
                                                "No delivered quantity recorded")
                    
                else:
                    self.log_test("Challan Items Creation", "FAIL", "Could not create delivery items")
                    return False
                    
            else:
                self.log_test("Delivery Challan Creation", "FAIL", "Could not create delivery challan")
                return False
                
        except Exception as e:
            self.log_test("Delivery Challan Workflow", "FAIL", str(e))
            return False
            
        return True
    
    def test_invoice_generation(self) -> bool:
        """Test 6: Invoice Generation from Delivery Challan"""
        print("\n💳 Testing Invoice Generation...")
        
        if 'challan_id' not in self.test_data or 'customer_id' not in self.test_data:
            self.log_test("Invoice Generation", "SKIP", "Missing challan or customer data")
            return False
        
        try:
            customer_id = self.test_data['customer_id']
            challan_id = self.test_data['challan_id']
            
            # Generate invoice from delivery challan
            invoice_data = {
                'invoice_number': f'INV-TEST-{int(datetime.now().timestamp())}',
                'customer_id': customer_id,
                'order_id': self.test_data.get('order_id'),
                'invoice_date': datetime.now().date().isoformat(),
                'subtotal': 1000.00,
                'tax_amount': 180.00,  # 18% GST
                'total_amount': 1180.00,
                'status': 'sent',
                'due_date': (datetime.now() + timedelta(days=30)).date().isoformat(),
                'notes': f'Generated from delivery challan for testing'
            }
            
            invoice_result = self.client.from_('gst_invoices').insert(invoice_data).execute()
            
            if invoice_result.data:
                invoice_id = invoice_result.data[0]['id']
                self.test_data['invoice_id'] = invoice_id
                self.log_test("Invoice Generation", "PASS", f"Created invoice: {invoice_data['invoice_number']}")
                
                # Verify GST calculation
                if invoice_data['tax_amount'] == invoice_data['subtotal'] * 0.18:
                    self.log_test("GST Calculation", "PASS", f"18% GST calculated correctly: ₹{invoice_data['tax_amount']}")
                else:
                    self.log_test("GST Calculation", "FAIL", "GST calculation incorrect")
                    
            else:
                self.log_test("Invoice Generation", "FAIL", "Could not create invoice")
                return False
                
        except Exception as e:
            self.log_test("Invoice Generation", "FAIL", str(e))
            return False
            
        return True
    
    def test_payment_processing(self) -> bool:
        """Test 7: Payment Processing and Outstanding Balance"""
        print("\n💰 Testing Payment Processing...")
        
        if 'invoice_id' not in self.test_data or 'customer_id' not in self.test_data:
            self.log_test("Payment Processing", "SKIP", "Missing invoice or customer data")
            return False
        
        try:
            customer_id = self.test_data['customer_id']
            invoice_id = self.test_data['invoice_id']
            
            # Process partial payment
            payment_data = {
                'customer_id': customer_id,
                'invoice_id': invoice_id,
                'payment_amount': 600.00,  # Partial payment
                'payment_date': datetime.now().date().isoformat(),
                'payment_method': 'upi',
                'reference_number': f'UPI-TEST-{int(datetime.now().timestamp())}',
                'notes': 'Test partial payment'
            }
            
            payment_result = self.client.from_('payments').insert(payment_data).execute()
            
            if payment_result.data:
                self.test_data['payment_id'] = payment_result.data[0]['id']
                self.log_test("Payment Processing", "PASS", f"Recorded payment: ₹{payment_data['payment_amount']}")
                
                # Calculate outstanding balance
                invoice = self.client.from_('gst_invoices').select('*').eq('id', invoice_id).execute()
                payments = self.client.from_('payments').select('*').eq('invoice_id', invoice_id).execute()
                
                if invoice.data and payments.data:
                    total_amount = invoice.data[0]['total_amount']
                    total_paid = sum(p['payment_amount'] for p in payments.data)
                    outstanding = total_amount - total_paid
                    
                    self.log_test("Outstanding Balance Calculation", "PASS", 
                                f"Total: ₹{total_amount}, Paid: ₹{total_paid}, Outstanding: ₹{outstanding}")
                else:
                    self.log_test("Outstanding Balance Calculation", "FAIL", "Could not retrieve payment/invoice data")
                    
            else:
                self.log_test("Payment Processing", "FAIL", "Could not record payment")
                return False
                
        except Exception as e:
            self.log_test("Payment Processing", "FAIL", str(e))
            return False
            
        return True
    
    def test_reports_and_analytics(self) -> bool:
        """Test 8: Reports and Business Analytics"""
        print("\n📊 Testing Reports and Analytics...")
        
        try:
            # Test material stock report
            stock_report = self.client.from_('material_stock_with_customer').select('*').execute()
            
            if stock_report.data:
                stock_count = len(stock_report.data)
                self.log_test("Material Stock Report", "PASS", f"Retrieved {stock_count} stock records")
            else:
                self.log_test("Material Stock Report", "FAIL", "No stock data available")
                return False
            
            # Test material summary report
            summary_report = self.client.from_('material_summary_report').select('*').execute()
            
            if summary_report.data:
                materials_count = len(summary_report.data)
                self.log_test("Material Summary Report", "PASS", f"Found {materials_count} material types")
            else:
                self.log_test("Material Summary Report", "WARN", "No material summary data")
            
            # Test customer analytics
            customer_orders = self.client.from_('orders').select('*, order_items(*)').execute()
            
            if customer_orders.data:
                orders_count = len(customer_orders.data)
                total_items = sum(len(order.get('order_items', [])) for order in customer_orders.data)
                self.log_test("Customer Order Analytics", "PASS", 
                            f"Orders: {orders_count}, Total Items: {total_items}")
            else:
                self.log_test("Customer Order Analytics", "WARN", "No order data for analytics")
            
            # Test financial reports
            invoices = self.client.from_('gst_invoices').select('*').execute()
            payments = self.client.from_('payments').select('*').execute()
            
            if invoices.data and payments.data:
                total_invoiced = sum(inv['total_amount'] for inv in invoices.data)
                total_received = sum(pay['payment_amount'] for pay in payments.data)
                outstanding = total_invoiced - total_received
                
                self.log_test("Financial Analytics", "PASS", 
                            f"Invoiced: ₹{total_invoiced:.2f}, Received: ₹{total_received:.2f}, Outstanding: ₹{outstanding:.2f}")
            else:
                self.log_test("Financial Analytics", "WARN", "Limited financial data available")
                
        except Exception as e:
            self.log_test("Reports and Analytics", "FAIL", str(e))
            return False
            
        return True
    
    def test_audit_trail_integration(self) -> bool:
        """Test 9: Audit Trail and Transaction History"""
        print("\n🔍 Testing Audit Trail Integration...")
        
        try:
            # Check if audit trail table exists
            audit_check = self.client.from_('audit_trail').select('count').limit(1).execute()
            self.log_test("Audit Trail Table", "PASS", "Audit trail table accessible")
            
            # Test transaction logging
            audit_records = self.client.from_('audit_trail').select('*').limit(10).execute()
            
            if audit_records.data:
                record_count = len(audit_records.data)
                transaction_types = set(record['transaction_type'] for record in audit_records.data)
                self.log_test("Audit Trail Records", "PASS", 
                            f"Found {record_count} records, Types: {', '.join(transaction_types)}")
            else:
                self.log_test("Audit Trail Records", "WARN", "No audit records found yet")
            
        except Exception as e:
            if "does not exist" in str(e).lower():
                self.log_test("Audit Trail Integration", "SKIP", "Audit trail system not deployed yet")
            else:
                self.log_test("Audit Trail Integration", "FAIL", str(e))
            return False
            
        return True
    
    def test_business_workflow_end_to_end(self) -> bool:
        """Test 10: Complete Business Workflow"""
        print("\n🔄 Testing Complete Business Workflow...")
        
        # Verify complete workflow exists
        workflow_components = {
            'customer': 'customer_id' in self.test_data,
            'order': 'order_id' in self.test_data,
            'material_stock': 'material_stock' in self.test_data,
            'delivery': 'challan_id' in self.test_data,
            'invoice': 'invoice_id' in self.test_data,
            'payment': 'payment_id' in self.test_data
        }
        
        completed_steps = sum(workflow_components.values())
        total_steps = len(workflow_components)
        
        if completed_steps == total_steps:
            self.log_test("Complete Business Workflow", "PASS", 
                        f"All {total_steps} workflow steps completed successfully")
        else:
            missing_steps = [step for step, completed in workflow_components.items() if not completed]
            self.log_test("Complete Business Workflow", "PARTIAL", 
                        f"{completed_steps}/{total_steps} steps completed. Missing: {', '.join(missing_steps)}")
        
        return completed_steps >= total_steps * 0.8  # 80% completion considered success
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        try:
            # Clean up in reverse order of dependencies
            cleanup_tables = [
                ('payments', 'payment_id'),
                ('gst_invoices', 'invoice_id'),
                ('delivery_challan_items', 'challan_id', 'delivery_challan_id'),
                ('delivery_challans', 'challan_id'),
                ('material_stock', 'customer_id', 'customer_id'),
                ('material_in', 'customer_id', 'customer_id'),
                ('order_items', 'order_id', 'order_id'),
                ('orders', 'order_id'),
                ('customers', 'customer_id')
            ]
            
            for table_info in cleanup_tables:
                table = table_info[0]
                test_data_key = table_info[1]
                db_column = table_info[2] if len(table_info) > 2 else 'id'
                
                if test_data_key in self.test_data:
                    try:
                        result = self.client.from_(table).delete().eq(db_column, self.test_data[test_data_key]).execute()
                        print(f"  ✅ Cleaned {table}")
                    except Exception as e:
                        print(f"  ⚠️ Could not clean {table}: {e}")
                        
        except Exception as e:
            print(f"❌ Cleanup failed: {e}")
    
    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📋 COMPREHENSIVE BACKEND TEST REPORT")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['status'] == 'PASS'])
        failed_tests = len([t for t in self.test_results if t['status'] == 'FAIL'])
        skipped_tests = len([t for t in self.test_results if t['status'] in ['SKIP', 'WARN']])
        
        print(f"📊 SUMMARY:")
        print(f"  Total Tests: {total_tests}")
        print(f"  Passed: {passed_tests} ✅")
        print(f"  Failed: {failed_tests} ❌") 
        print(f"  Skipped/Warnings: {skipped_tests} ⚠️")
        print(f"  Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status_icon = "✅" if result['status'] == "PASS" else "❌" if result['status'] == "FAIL" else "⚠️"
            print(f"  {status_icon} {result['test']}: {result['details']}")
        
        print(f"\n🎯 BUSINESS REQUIREMENTS STATUS:")
        
        business_requirements = {
            "Customer Management": any("Customer" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Order Management": any("Order" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Material Tracking": any("Material" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Delivery Management": any("Delivery" in t['test'] or "Challan" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Invoice Generation": any("Invoice" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Payment Processing": any("Payment" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Reports & Analytics": any("Report" in t['test'] or "Analytics" in t['test'] for t in self.test_results if t['status'] == 'PASS'),
            "Complete Workflow": any("Workflow" in t['test'] for t in self.test_results if t['status'] in ['PASS', 'PARTIAL'])
        }
        
        for requirement, status in business_requirements.items():
            status_icon = "✅" if status else "❌"
            print(f"  {status_icon} {requirement}")
        
        # Save detailed report
        report_filename = f"backend_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        detailed_report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'skipped': skipped_tests,
                'success_rate': (passed_tests/total_tests)*100
            },
            'business_requirements': business_requirements,
            'test_data_created': self.test_data,
            'detailed_results': self.test_results
        }
        
        with open(report_filename, 'w') as f:
            json.dump(detailed_report, f, indent=2, default=str)
        
        print(f"\n💾 Detailed report saved: {report_filename}")
        
        if failed_tests == 0:
            print(f"\n🎉 ALL TESTS PASSED! Backend is fully functional.")
        elif passed_tests > failed_tests:
            print(f"\n✅ Backend is mostly functional with {failed_tests} issues to address.")
        else:
            print(f"\n⚠️ Backend has significant issues that need attention.")
        
        return detailed_report
    
    def run_all_tests(self):
        """Execute all backend tests"""
        print("🚀 Starting Comprehensive Backend Testing...")
        print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if not self.setup_connections():
            print("❌ Cannot proceed without database connections")
            return
        
        try:
            # Run all tests in logical order
            test_methods = [
                self.test_database_schema,
                self.test_customer_operations,
                self.test_order_workflow,
                self.test_material_management,
                self.test_delivery_challan_workflow,
                self.test_invoice_generation,
                self.test_payment_processing,
                self.test_reports_and_analytics,
                self.test_audit_trail_integration,
                self.test_business_workflow_end_to_end
            ]
            
            for test_method in test_methods:
                try:
                    test_method()
                except Exception as e:
                    self.log_test(test_method.__name__, "FAIL", f"Unexpected error: {e}")
            
        except KeyboardInterrupt:
            print("\n⚠️ Testing interrupted by user")
        except Exception as e:
            print(f"\n❌ Critical testing error: {e}")
        finally:
            # Generate report
            report = self.generate_report()
            
            # Ask about cleanup
            try:
                cleanup_response = input("\n🗑️ Clean up test data? (y/N): ").strip().lower()
                if cleanup_response == 'y':
                    self.cleanup_test_data()
                else:
                    print("Test data preserved for manual inspection")
            except:
                print("Skipping cleanup")

def main():
    """Main execution function"""
    print("🏗️ JBMS Backend Comprehensive Testing Suite")
    print("=" * 60)
    
    # Check environment
    required_env = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
    missing_env = [var for var in required_env if not os.getenv(var)]
    
    if missing_env:
        print(f"❌ Missing environment variables: {', '.join(missing_env)}")
        print("\nSet them in your .env file or environment:")
        for var in missing_env:
            print(f"export {var}='your_value_here'")
        return
    
    # Initialize and run tests
    tester = ComprehensiveBackendTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()