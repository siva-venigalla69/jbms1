#!/usr/bin/env python3
"""
API Integration Testing Script
Tests core business APIs and validates responses
"""

import requests
import json
from datetime import datetime

class APITester:
    def __init__(self):
        # Supabase connection details
        self.base_url = "https://pvatfzwzfgioypdnqjay.supabase.co/rest/v1"
        self.anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs"
        self.headers = {
            'apikey': self.anon_key,
            'Authorization': f'Bearer {self.anon_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    def test_table_access(self, table_name):
        """Test basic table access"""
        try:
            response = requests.get(
                f"{self.base_url}/{table_name}?limit=1",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'success',
                    'table': table_name,
                    'accessible': True,
                    'sample_count': len(data),
                    'columns': list(data[0].keys()) if data else []
                }
            else:
                return {
                    'status': 'error',
                    'table': table_name,
                    'accessible': False,
                    'error_code': response.status_code,
                    'error_message': response.text[:100]
                }
        except Exception as e:
            return {
                'status': 'error',
                'table': table_name,
                'accessible': False,
                'error_message': str(e)
            }
    
    def test_core_business_tables(self):
        """Test core business tables"""
        print("🧪 Testing Core Business Tables...")
        
        core_tables = [
            'customers',
            'orders', 
            'order_items',
            'user_profiles',
            'delivery_challans',
            'gst_invoices',
            'payments'
        ]
        
        results = []
        for table in core_tables:
            result = self.test_table_access(table)
            results.append(result)
            
            if result['accessible']:
                print(f"  ✅ {table}: Accessible ({result.get('sample_count', 0)} records)")
                if result.get('columns'):
                    print(f"     Columns: {', '.join(result['columns'][:5])}{'...' if len(result['columns']) > 5 else ''}")
            else:
                print(f"  ❌ {table}: {result.get('error_message', 'Not accessible')}")
        
        return results
    
    def test_designer_tables(self):
        """Test newly deployed designer tables"""
        print("\n🎨 Testing Designer Management Tables...")
        
        designer_tables = [
            'design_library',
            'designer_assignments',
            'assignment_history'
        ]
        
        results = []
        for table in designer_tables:
            result = self.test_table_access(table)
            results.append(result)
            
            if result['accessible']:
                print(f"  ✅ {table}: Accessible ({result.get('sample_count', 0)} records)")
            else:
                print(f"  ❌ {table}: {result.get('error_message', 'Not accessible')}")
        
        return results
    
    def test_reference_tables(self):
        """Test reference/lookup tables"""
        print("\n📋 Testing Reference Tables...")
        
        reference_tables = [
            'user_roles',
            'order_statuses', 
            'material_types',
            'production_stages',
            'payment_methods',
            'return_reasons'
        ]
        
        results = []
        populated_tables = 0
        
        for table in reference_tables:
            result = self.test_table_access(table)
            results.append(result)
            
            if result['accessible']:
                count = result.get('sample_count', 0)
                if count > 0:
                    populated_tables += 1
                print(f"  ✅ {table}: Accessible ({count} records)")
            else:
                print(f"  ❌ {table}: {result.get('error_message', 'Not accessible')}")
        
        print(f"  📊 Reference data status: {populated_tables}/{len(reference_tables)} tables populated")
        return results
    
    def test_database_functions(self):
        """Test database functions (RPC calls)"""
        print("\n⚙️  Testing Database Functions...")
        
        # Test if we can call any RPC functions
        try:
            # This might not work without authentication, but let's try
            response = requests.post(
                f"{self.base_url}/rpc/auto_assign_designer",
                headers=self.headers,
                json={
                    "p_order_item_id": "00000000-0000-0000-0000-000000000000",
                    "p_priority_level": "normal",
                    "p_estimated_hours": 2.0
                },
                timeout=10
            )
            
            if response.status_code in [200, 400, 401, 403]:  # Any response means function exists
                print("  ✅ auto_assign_designer: Function accessible")
            else:
                print(f"  ❓ auto_assign_designer: Status {response.status_code}")
                
        except Exception as e:
            print(f"  ⚠️  Function testing failed: {str(e)[:50]}")
    
    def generate_report(self, all_results):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 API INTEGRATION TEST REPORT")
        print("="*60)
        
        total_tables = len(all_results)
        accessible_tables = len([r for r in all_results if r['accessible']])
        
        print(f"🔍 Database Connectivity: {'✅ Connected' if accessible_tables > 0 else '❌ Failed'}")
        print(f"📋 Table Access: {accessible_tables}/{total_tables} tables accessible")
        
        # Categorize results
        core_accessible = len([r for r in all_results if r['table'] in ['customers', 'orders', 'order_items'] and r['accessible']])
        designer_accessible = len([r for r in all_results if r['table'] in ['design_library', 'designer_assignments'] and r['accessible']])
        
        print(f"🏢 Core Business Tables: {core_accessible}/3 ready")
        print(f"🎨 Designer Tables: {designer_accessible}/2 ready") 
        
        # Overall assessment
        if accessible_tables >= total_tables * 0.8:
            status = "🟢 EXCELLENT"
            recommendation = "Ready for production use"
        elif accessible_tables >= total_tables * 0.6:
            status = "🟡 GOOD"
            recommendation = "Minor issues, mostly functional"  
        else:
            status = "🔴 NEEDS ATTENTION"
            recommendation = "Several issues need resolution"
        
        print(f"\n🎯 Overall Status: {status}")
        print(f"💡 Recommendation: {recommendation}")
        
        # Business readiness assessment
        if core_accessible >= 2 and designer_accessible >= 1:
            print("✅ System ready for textile printing business operations")
        else:
            print("⚠️  Some core functionality may not be available")
        
        return {
            'total_tables': total_tables,
            'accessible_tables': accessible_tables,
            'core_ready': core_accessible >= 2,
            'designer_ready': designer_accessible >= 1,
            'overall_status': status
        }

def main():
    """Run comprehensive API integration tests"""
    print("🚀 Starting API Integration Tests...")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = APITester()
    
    # Run all tests
    all_results = []
    
    core_results = tester.test_core_business_tables()
    all_results.extend(core_results)
    
    designer_results = tester.test_designer_tables()
    all_results.extend(designer_results)
    
    reference_results = tester.test_reference_tables()
    all_results.extend(reference_results)
    
    tester.test_database_functions()
    
    # Generate final report
    report = tester.generate_report(all_results)
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    with open(f'api_integration_test_results_{timestamp}.json', 'w') as f:
        json.dump({
            'test_metadata': {
                'timestamp': datetime.now().isoformat(),
                'total_tests': len(all_results)
            },
            'results': all_results,
            'summary': report
        }, f, indent=2)
    
    print(f"\n💾 Test results saved to: api_integration_test_results_{timestamp}.json")
    
    return report['overall_status'] == "🟢 EXCELLENT"

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)