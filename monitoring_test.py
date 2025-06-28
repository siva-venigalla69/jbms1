#!/usr/bin/env python3
import os
"""
System Health Monitoring Script
Run this periodically to monitor your Render deployment
"""

import requests
import time
import json
from datetime import datetime

# Configuration
API_BASE_URL = "https://jbms1.onrender.com"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = os.getenv("TEST_PASSWORD", "change-me")

def health_check():
    """Monitor system health"""
    try:
        print(f"🏥 Health Check at {datetime.now()}")
        
        # 1. API Health
        print("   Testing API health...")
        api_response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        api_healthy = api_response.status_code == 200
        print(f"   API Healthy: {'✅' if api_healthy else '❌'}")
        
        # 2. Database Health
        print("   Testing database connectivity...")
        db_response = requests.get(f"{API_BASE_URL}/health/db", timeout=10)
        db_healthy = db_response.status_code == 200
        print(f"   DB Healthy: {'✅' if db_healthy else '❌'}")
        
        # 3. Authentication Test
        print("   Testing authentication...")
        start_time = time.time()
        auth_response = requests.post(
            f"{API_BASE_URL}/api/auth/login",
            data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10
        )
        auth_time = time.time() - start_time
        auth_working = auth_response.status_code == 200
        print(f"   Auth Working: {'✅' if auth_working else '❌'} ({auth_time:.2f}s)")
        
        # 4. Response Time Check
        if auth_working:
            token = auth_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            print("   Testing API response times...")
            start_time = time.time()
            customers_response = requests.get(f"{API_BASE_URL}/api/customers/", headers=headers, timeout=10)
            response_time = time.time() - start_time
            response_fast = response_time < 5.0
            print(f"   Response Time: {'✅' if response_fast else '❌'} ({response_time:.2f}s)")
            
            # 5. Basic Functionality Test
            if customers_response.status_code == 200:
                customers = customers_response.json()
                print(f"   Customer Count: {len(customers)}")
                
                # Test order listing
                orders_response = requests.get(f"{API_BASE_URL}/api/orders/", headers=headers, timeout=10)
                if orders_response.status_code == 200:
                    orders = orders_response.json()
                    print(f"   Order Count: {len(orders)}")
        
        return {
            "timestamp": datetime.now(),
            "api_healthy": api_healthy,
            "db_healthy": db_healthy,
            "auth_working": auth_working,
            "response_fast": response_fast,
            "response_time": response_time
        }
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        return {
            "timestamp": datetime.now(),
            "error": str(e),
            "api_healthy": False,
            "db_healthy": False,
            "auth_working": False,
            "response_fast": False
        }

def detailed_api_test():
    """Run detailed API functionality test"""
    print("\n🧪 Detailed API Functionality Test")
    
    try:
        # Login
        auth_response = requests.post(
            f"{API_BASE_URL}/api/auth/login",
            data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if auth_response.status_code != 200:
            print("❌ Authentication failed")
            return False
        
        token = auth_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test customer creation
        test_customer = {
            "name": f"Health Check Customer {int(time.time())}",
            "phone": f"health{int(time.time() % 10000)}",
            "email": f"health{int(time.time())}@test.com"
        }
        
        customer_response = requests.post(
            f"{API_BASE_URL}/api/customers/",
            json=test_customer,
            headers=headers
        )
        
        if customer_response.status_code == 201:
            print("✅ Customer creation works")
            customer_id = customer_response.json()["id"]
            
            # Test order creation
            order_data = {
                "customer_id": customer_id,
                "notes": "Health check order",
                "order_items": [{
                    "material_type": "saree",
                    "quantity": 1,
                    "unit_price": 100.00
                }]
            }
            
            order_response = requests.post(
                f"{API_BASE_URL}/api/orders/",
                json=order_data,
                headers=headers
            )
            
            if order_response.status_code == 201:
                print("✅ Order creation works")
                print("✅ Complete workflow functional")
                return True
            else:
                print("❌ Order creation failed")
                return False
        else:
            print("❌ Customer creation failed")
            return False
            
    except Exception as e:
        print(f"❌ Detailed test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🔍 SYSTEM HEALTH MONITORING")
    print("=" * 60)
    
    # Basic health check
    status = health_check()
    
    # Detailed functionality test
    if status.get('api_healthy') and status.get('auth_working'):
        detailed_api_test()
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    overall_healthy = all([
        status.get('api_healthy', False),
        status.get('db_healthy', False),
        status.get('auth_working', False),
        status.get('response_fast', False)
    ])
    
    print(f"Overall System Health: {'✅ HEALTHY' if overall_healthy else '❌ UNHEALTHY'}")
    
    if not overall_healthy:
        print("\n⚠️  Issues detected:")
        if not status.get('api_healthy'):
            print("   - API not responding")
        if not status.get('db_healthy'):
            print("   - Database connectivity issues")
        if not status.get('auth_working'):
            print("   - Authentication not working")
        if not status.get('response_fast'):
            print("   - Slow response times")
    
    print(f"\nNext check recommended in: 1 hour")
    print(f"For continuous monitoring, run: watch -n 3600 python monitoring_test.py") 