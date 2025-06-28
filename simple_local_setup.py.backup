#!/usr/bin/env python3
"""
Simple Local Setup Script
For when you already have PostgreSQL running
"""

import os
import sys
import subprocess
import psycopg2
from pathlib import Path

def create_local_env():
    """Create .env file for local development"""
    print("📝 Creating .env file...")
    
    backend_path = Path(__file__).parent / "backend"
    env_content = """# Local Development Environment
DATABASE_URL=postgresql://postgres:password@localhost:5432/textile_printing_local
SECRET_KEY=local-development-secret-key-32-chars-minimum
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Rate limiting (disabled for development)
RATE_LIMIT_ENABLED=false

# Upload paths
UPLOAD_PATH=./uploads
REPORTS_EXPORT_PATH=./exports

# Logging
LOG_LEVEL=DEBUG
"""
    
    env_file = backend_path / ".env"
    with open(env_file, "w") as f:
        f.write(env_content)
    
    print(f"✅ Environment file created: {env_file}")
    print("⚠️  Please update DATABASE_URL in .env with your PostgreSQL credentials")

def install_requirements():
    """Install Python requirements"""
    print("📦 Installing requirements...")
    requirements_file = Path(__file__).parent / "backend" / "requirements.txt"
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], check=True)
        print("✅ Requirements installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Requirements installation failed: {e}")
        print("💡 Try: pip install -r backend/requirements.txt")

def test_local_apis():
    """Create a simple test script for local APIs"""
    test_script = """#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"

def test_local_apis():
    print("🧪 Testing Local APIs")
    print("=" * 40)
    
    # Test health endpoint
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check: OK")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test authentication
    try:
        login_data = "username=admin&password=Siri@2299"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data=login_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"✅ Authentication: OK")
            print(f"   Token: {token_data.get('access_token', 'N/A')[:20]}...")
            return token_data.get('access_token')
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_order_creation(token):
    '''Test order creation locally'''
    print("\\n🔍 Testing Order Creation Locally")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create test customer first
    customer_data = {
        "name": "Local Test Customer",
        "phone": "9999999999",
        "email": "test@localhost.com"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/customers",
            json=customer_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            customer = response.json()
            customer_id = customer.get('id')
            print(f"✅ Test customer created: {customer_id}")
            
            # Test order creation
            order_data = {
                "customer_id": customer_id,
                "status": "pending",
                "notes": "Local test order",
                "order_items": [
                    {
                        "material_type": "saree",
                        "quantity": 1,
                        "unit_price": 100.00,
                        "customization_details": "Test saree"
                    }
                ]
            }
            
            response = requests.post(
                f"{BASE_URL}/api/orders",
                json=order_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                order = response.json()
                print(f"✅ Order created successfully: {order.get('order_number', 'N/A')}")
                return True
            else:
                print(f"❌ Order creation failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
        else:
            print(f"❌ Customer creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Order creation test error: {e}")
        return False

if __name__ == "__main__":
    token = test_local_apis()
    if token:
        test_order_creation(token)
    else:
        print("❌ Cannot proceed with order test - authentication failed")
"""
    
    test_file = Path(__file__).parent / "test_local_apis.py"
    with open(test_file, "w") as f:
        f.write(test_script)
    
    print(f"✅ Local test script created: {test_file}")
    return test_file

def main():
    """Main setup function"""
    print("🔧 SIMPLE LOCAL SETUP")
    print("=" * 40)
    print("This setup assumes you have PostgreSQL running locally")
    print("Default connection: postgresql://postgres:password@localhost:5432/textile_printing_local")
    print()
    
    # Create .env file
    create_local_env()
    
    # Install requirements
    install_requirements()
    
    # Create test script
    test_file = test_local_apis()
    
    print("\n" + "=" * 60)
    print("✅ SIMPLE SETUP COMPLETE!")
    print("=" * 60)
    print("📝 Next steps:")
    print("1. Update backend/.env with your PostgreSQL credentials")
    print("2. Create database: CREATE DATABASE textile_printing_local;")
    print("3. Run schema: psql -d textile_printing_local -f fix_database_issues.sql")
    print("4. Start server: cd backend && python -m uvicorn app.main:app --reload")
    print("5. Test APIs: python test_local_apis.py")
    print("=" * 60)

if __name__ == "__main__":
    main() 