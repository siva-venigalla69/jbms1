#!/usr/bin/env python3
"""
Secure API Testing Script
Tests all APIs using environment variables for credentials
"""
import os
import sys
import json
import requests
from datetime import datetime
from secure_test_config import get_test_credentials, get_production_credentials

class SecureAPITester:
    def __init__(self, use_production=False):
        try:
            if use_production:
                self.config = get_production_credentials()
                print("🌐 Using PRODUCTION configuration")
            else:
                self.config = get_test_credentials()
                print("🏠 Using LOCAL configuration")
        except ValueError as e:
            print(e)
            sys.exit(1)
        
        self.base_url = self.config["base_url"]
        self.token = None
        self.results = {"passed": 0, "failed": 0, "total": 0, "details": []}
    
    def authenticate(self):
        """Login and get JWT token"""
        print(f"🔐 Authenticating as {self.config['username']}...")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data=f"username={self.config['username']}&password={self.config['password']}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    print("✅ Authentication successful")
                    return True
                else:
                    print("❌ No token in response")
                    return False
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def test_endpoint(self, module, test_name, method, endpoint, data=None, expected_status=200):
        """Test a single endpoint"""
        self.results["total"] += 1
        
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        if data and method.upper() in ["POST", "PUT", "PATCH"]:
            headers["Content-Type"] = "application/json"
        
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            status = "PASS" if response.status_code == expected_status else "FAIL"
            
            if status == "PASS":
                self.results["passed"] += 1
                details = f"Status: {response.status_code}"
                if response.content:
                    try:
                        response_data = response.json()
                        if isinstance(response_data, list):
                            details = f"Found {len(response_data)} items"
                        elif isinstance(response_data, dict):
                            if "detail" in response_data:
                                details = response_data["detail"]
                            elif "id" in response_data:
                                details = f"ID: {response_data['id']}"
                            else:
                                details = "Success"
                    except:
                        details = f"Status: {response.status_code}"
            else:
                self.results["failed"] += 1
                details = f"Status: {response.status_code}"
                if response.content:
                    details += f" - {response.text[:200]}"
            
            self.results["details"].append({
                "module": module,
                "test": test_name,
                "status": status,
                "details": details,
                "timestamp": datetime.now().isoformat()
            })
            
            print(f"{'✅' if status == 'PASS' else '❌'} {module}: {test_name} - {details}")
            return status == "PASS"
            
        except requests.exceptions.RequestException as e:
            self.results["failed"] += 1
            details = f"Error: {str(e)}"
            self.results["details"].append({
                "module": module,
                "test": test_name,
                "status": "FAIL",
                "details": details,
                "timestamp": datetime.now().isoformat()
            })
            print(f"❌ {module}: {test_name} - {details}")
            return False
    
    def run_comprehensive_tests(self):
        """Run all API tests"""
        print(f"\n🧪 Testing API at: {self.base_url}")
        print("=" * 60)
        
        # Health checks
        self.test_endpoint("HEALTH", "Health Check", "GET", "/health")
        self.test_endpoint("HEALTH", "Database Health", "GET", "/health/db")
        self.test_endpoint("INFO", "Version Info", "GET", "/version")
        
        # Authentication (already done)
        if not self.token:
            print("❌ Cannot proceed without authentication")
            return
        
        # User endpoints
        self.test_endpoint("AUTH", "Token Validation", "GET", "/api/auth/me")
        self.test_endpoint("USERS", "List Users", "GET", "/api/users")
        
        # Customer endpoints
        self.test_endpoint("CUSTOMERS", "List Customers", "GET", "/api/customers")
        customer_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "1234567890",
            "address": "Test Address"
        }
        self.test_endpoint("CUSTOMERS", "Create Customer", "POST", "/api/customers", customer_data, 201)
        
        # Order endpoints
        self.test_endpoint("ORDERS", "List Orders", "GET", "/api/orders")
        
        # Inventory endpoints
        self.test_endpoint("INVENTORY", "List Items", "GET", "/api/inventory")
        
        # Materials endpoints
        self.test_endpoint("MATERIALS", "List Material In", "GET", "/api/materials/in")
        self.test_endpoint("MATERIALS", "List Material Out", "GET", "/api/materials/out")
        
        # Expense endpoints
        self.test_endpoint("EXPENSES", "List Expenses", "GET", "/api/expenses")
        
        # Payment endpoints
        self.test_endpoint("PAYMENTS", "List Payments", "GET", "/api/payments")
        
        # Invoice endpoints
        self.test_endpoint("INVOICES", "List Invoices", "GET", "/api/invoices")
        
        # Challan endpoints
        self.test_endpoint("CHALLANS", "List Challans", "GET", "/api/challans")
        
        # Report endpoints
        self.test_endpoint("REPORTS", "Pending Orders", "GET", "/api/reports/pending-orders")
        self.test_endpoint("REPORTS", "Stock Holdings", "GET", "/api/reports/stock-holdings")
        
    def save_results(self, filename=None):
        """Save test results to file"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"secure_api_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Results saved to: {filename}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Total:  {self.results['total']}")
        print(f"🎯 Success Rate: {(self.results['passed'] / self.results['total'] * 100):.1f}%")
        
        if self.results['failed'] > 0:
            print("\n❌ FAILED TESTS:")
            for detail in self.results['details']:
                if detail['status'] == 'FAIL':
                    print(f"   • {detail['module']}: {detail['test']} - {detail['details']}")

def main():
    """Main function"""
    print("🔒 Secure API Testing Tool")
    print("=" * 60)
    
    # Check for production flag
    use_production = "--production" in sys.argv
    
    if use_production:
        print("⚠️  PRODUCTION MODE: Testing production APIs")
        print("   Make sure PRODUCTION_PASSWORD is set!")
    else:
        print("🏠 LOCAL MODE: Testing local APIs")
        print("   Make sure TEST_PASSWORD is set and backend is running!")
    
    # Create tester
    tester = SecureAPITester(use_production=use_production)
    
    # Authenticate
    if not tester.authenticate():
        print("❌ Authentication failed. Check credentials and server status.")
        sys.exit(1)
    
    # Run tests
    tester.run_comprehensive_tests()
    
    # Save and display results
    tester.save_results()
    tester.print_summary()

if __name__ == "__main__":
    main() 