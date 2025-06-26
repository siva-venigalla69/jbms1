#!/usr/bin/env python3
"""
Simple API Testing Script for Digital Textile Printing System
Run this after creating your admin user to test core functionality.
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_BASE_URL = "https://jbms1.onrender.com"  # ✅ Update with your Render URL
USERNAME = "admin"
PASSWORD = "Siri@2299"  # ✅ Update with your admin password

class APITester:
    def __init__(self, base_url, username, password):
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        self.token = None
        self.session = requests.Session()
        
    def print_result(self, test_name, response, expected_status=200):
        """Print test results in a formatted way"""
        status = "✅ PASS" if response.status_code == expected_status else "❌ FAIL"
        print(f"\n{status} {test_name}")
        print(f"Status: {response.status_code} (expected: {expected_status})")
        
        if response.status_code != expected_status:
            print(f"Error: {response.text}")
        else:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)[:200]}...")
            except:
                print(f"Response: {response.text[:200]}...")
        print("-" * 50)

    def test_health(self):
        """Test basic health endpoint"""
        print("\n🏥 TESTING HEALTH ENDPOINTS")
        
        # Basic health
        response = self.session.get(f"{self.base_url}/health")
        self.print_result("Health Check", response)
        
        # Database health
        response = self.session.get(f"{self.base_url}/health/db")
        self.print_result("Database Health", response)

    def test_authentication(self):
        """Test authentication flow"""
        print("\n🔐 TESTING AUTHENTICATION")
        
        # Login
        login_data = {
            'username': self.username,
            'password': self.password
        }
        
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            data=login_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        self.print_result("Admin Login", response)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            self.session.headers.update({'Authorization': f'Bearer {self.token}'})
            
            # Test get current user
            response = self.session.get(f"{self.base_url}/api/auth/me")
            self.print_result("Get Current User", response)
            
            return True
        return False

    def test_customers(self):
        """Test customer management"""
        print("\n👥 TESTING CUSTOMER MANAGEMENT")
        
        # Create customer
        customer_data = {
            "name": "Test Customer Ltd",
            "phone": "9876543210",
            "email": "test@customer.com",
            "address": "123 Test Street, Chennai - 600001",
            "gst_number": "33AAAAA0000A1Z5"
        }
        
        response = self.session.post(
            f"{self.base_url}/api/customers/",
            json=customer_data
        )
        self.print_result("Create Customer", response, 201)
        
        customer_id = None
        if response.status_code == 201:
            customer_id = response.json().get('id')
        
        # List customers
        response = self.session.get(f"{self.base_url}/api/customers/")
        self.print_result("List Customers", response)
        
        # Search customers
        response = self.session.get(f"{self.base_url}/api/customers/?search=Test")
        self.print_result("Search Customers", response)
        
        # Test duplicate prevention
        response = self.session.post(
            f"{self.base_url}/api/customers/",
            json=customer_data
        )
        self.print_result("Duplicate Customer (should fail)", response, 400)
        
        return customer_id

    def test_orders(self, customer_id):
        """Test order management"""
        if not customer_id:
            print("\n⚠️ SKIPPING ORDER TESTS - No customer ID")
            return None
            
        print("\n📋 TESTING ORDER MANAGEMENT")
        
        # Create order
        order_data = {
            "customer_id": customer_id,
            "notes": "Test order for API validation",
            "items": [
                {
                    "material_type": "saree",
                    "quantity": 10,
                    "unit_price": 500.00,
                    "customization_details": "Red border design"
                },
                {
                    "material_type": "dupatta", 
                    "quantity": 10,
                    "unit_price": 200.00,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        response = self.session.post(
            f"{self.base_url}/api/orders/",
            json=order_data
        )
        self.print_result("Create Order", response, 201)
        
        order_id = None
        if response.status_code == 201:
            order_id = response.json().get('id')
        
        # List orders
        response = self.session.get(f"{self.base_url}/api/orders/")
        self.print_result("List Orders", response)
        
        return order_id

    def test_materials(self, order_id):
        """Test material management"""
        if not order_id:
            print("\n⚠️ SKIPPING MATERIAL TESTS - No order ID")
            return
            
        print("\n📦 TESTING MATERIAL MANAGEMENT")
        
        # Record material in
        material_data = {
            "order_id": order_id,
            "material_type": "saree",
            "quantity": 25,
            "unit": "pieces",
            "notes": "Raw fabric received for test order"
        }
        
        response = self.session.post(
            f"{self.base_url}/api/materials/in",
            json=material_data
        )
        self.print_result("Record Material In", response, 201)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING API TESTS")
        print(f"API URL: {self.base_url}")
        print(f"Username: {self.username}")
        print("=" * 60)
        
        # Health checks
        self.test_health()
        
        # Authentication
        if not self.test_authentication():
            print("\n❌ AUTHENTICATION FAILED - STOPPING TESTS")
            return
        
        # Customer management
        customer_id = self.test_customers()
        
        # Order management
        order_id = self.test_orders(customer_id)
        
        # Material management
        self.test_materials(order_id)
        
        print("\n🎉 API TESTING COMPLETED!")
        print("=" * 60)

def main():
    """Main function"""
    # Check if API URL is set
    if API_BASE_URL == 'https://YOUR_API_URL_HERE':
        print("❌ ERROR: Please set your API URL in the script or environment variable")
        print("Edit the API_BASE_URL variable in this script with your Render URL")
        return
    
    if PASSWORD == 'your_admin_password':
        print("❌ ERROR: Please set your admin password in the script or environment variable")
        print("Edit the PASSWORD variable in this script")
        return
    
    # Run tests
    tester = APITester(API_BASE_URL, USERNAME, PASSWORD)
    tester.run_all_tests()

if __name__ == "__main__":
    main() 