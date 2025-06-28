#!/usr/bin/env python3
"""
Backend-Only Local Setup
Connect to Render database from local backend for debugging
"""

import os
import sys
import subprocess
from pathlib import Path

def create_render_env():
    """Create .env file to connect to Render database"""
    print("📝 Creating .env file for Render database connection...")
    
    backend_path = Path(__file__).parent / "backend"
    
    # Use the same database URL as production but run backend locally
    env_content = """# Local Backend + Render Database
# This connects your local backend to the production Render database
DATABASE_URL=postgresql://jbms_db_user:UBKwZVJt4t3wOhgN7MQQGZe2A9JCqvYL@dpg-ct7nqllds78s73ek9d6g-a.oregon-postgres.render.com/jbms_db

SECRET_KEY=local-development-secret-key-32-chars-minimum
ENVIRONMENT=development
DEBUG=true

# CORS - allow local frontend and testing
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Rate limiting (disabled for development)
RATE_LIMIT_ENABLED=false

# Upload paths (local)
UPLOAD_PATH=./uploads
REPORTS_EXPORT_PATH=./exports

# Logging
LOG_LEVEL=DEBUG
"""
    
    env_file = backend_path / ".env"
    with open(env_file, "w") as f:
        f.write(env_content)
    
    print(f"✅ Environment file created: {env_file}")
    print("🌐 Backend will connect to Render PostgreSQL database")

def install_backend_deps():
    """Install backend Python dependencies"""
    print("📦 Installing backend dependencies...")
    
    requirements_file = Path(__file__).parent / "backend" / "requirements.txt"
    
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], check=True)
        print("✅ Backend dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Dependency installation failed: {e}")
        return False

def test_db_connection():
    """Test connection to Render database"""
    print("🔗 Testing database connection...")
    
    test_script = """
import os
import sys
sys.path.append('backend')

try:
    from app.core.database import get_db
    from app.core.config import settings
    
    print(f"Database URL: {settings.DATABASE_URL[:50]}...")
    
    # Test database connection
    db = next(get_db())
    result = db.execute("SELECT 1 as test").fetchone()
    
    if result and result[0] == 1:
        print("✅ Database connection successful!")
        
        # Test admin user exists
        admin_check = db.execute("SELECT username FROM users WHERE role = 'admin' LIMIT 1").fetchone()
        if admin_check:
            print(f"✅ Admin user found: {admin_check[0]}")
        else:
            print("⚠️  No admin user found in database")
    else:
        print("❌ Database connection test failed")
        
except Exception as e:
    print(f"❌ Database connection error: {e}")
    print("💡 Make sure the database URL is correct")
"""
    
    try:
        # Write test script to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(test_script)
            temp_file = f.name
        
        # Run the test
        result = subprocess.run([sys.executable, temp_file], 
                              capture_output=True, text=True, cwd=Path(__file__).parent)
        
        print(result.stdout)
        if result.stderr:
            print(f"Errors: {result.stderr}")
            
        # Cleanup
        os.unlink(temp_file)
        
        return "Database connection successful" in result.stdout
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def create_local_test_script():
    """Create a comprehensive local test script"""
    print("🧪 Creating local test script...")
    
    test_script = '''#!/usr/bin/env python3
"""
Local API Testing Script
Tests APIs locally against Render database
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_auth():
    """Test authentication"""
    print("🔐 Testing Authentication...")
    
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
            print("✅ Authentication successful")
            return token_data.get('access_token')
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_order_creation_detailed(token):
    """Test order creation with detailed debugging"""
    print("\\n🔍 Testing Order Creation (Detailed Debug)...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Create a test customer
    print("   Step 1: Creating test customer...")
    customer_data = {
        "name": f"Debug Customer {int(time.time())}",
        "phone": f"99999{int(time.time()) % 100000}",
        "email": f"debug_{int(time.time())}@test.com"
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
            print(f"   ✅ Customer created: {customer_id}")
        else:
            print(f"   ❌ Customer creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Customer creation error: {e}")
        return False
    
    # Step 2: Test minimal order creation
    print("   Step 2: Testing minimal order creation...")
    order_data = {
        "customer_id": customer_id,
        "status": "pending",
        "notes": "Local debug test order",
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 100.00,
                "customization_details": "Debug test saree"
            }
        ]
    }
    
    try:
        print(f"   📤 Sending order data: {json.dumps(order_data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers,
            timeout=15
        )
        
        print(f"   📥 Response status: {response.status_code}")
        print(f"   📥 Response headers: {dict(response.headers)}")
        
        if response.status_code in [200, 201]:
            order = response.json()
            print(f"   ✅ Order created successfully!")
            print(f"      Order Number: {order.get('order_number', 'N/A')}")
            print(f"      Order ID: {order.get('id', 'N/A')}")
            return True
        else:
            print(f"   ❌ Order creation failed: {response.status_code}")
            print(f"   📄 Response body: {response.text}")
            
            # Try to parse error details
            try:
                error_data = response.json()
                print(f"   🔍 Error details: {json.dumps(error_data, indent=2)}")
            except:
                print("   ⚠️  Could not parse error response as JSON")
            
            return False
            
    except Exception as e:
        print(f"   ❌ Order creation error: {e}")
        return False

def test_inventory_adjustment(token):
    """Test inventory adjustment"""
    print("\\n🔍 Testing Inventory Adjustment...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # First get or create inventory item
    print("   Step 1: Getting existing inventory items...")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory", headers=headers, timeout=10)
        
        if response.status_code == 200:
            inventory_items = response.json()
            print(f"   Found {len(inventory_items)} inventory items")
            
            if inventory_items:
                # Use first inventory item
                item_id = inventory_items[0]['id']
                print(f"   ✅ Using inventory item: {item_id}")
                
                # Test adjustment
                adjustment_data = {
                    "adjustment_type": "quantity_change",
                    "quantity_change": -1.0,
                    "reason": "Local test adjustment",
                    "notes": "Debug test from local environment"
                }
                
                response = requests.post(
                    f"{BASE_URL}/api/inventory/{item_id}/adjust",
                    json=adjustment_data,
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code in [200, 201]:
                    print("   ✅ Inventory adjustment successful")
                    return True
                else:
                    print(f"   ❌ Inventory adjustment failed: {response.status_code}")
                    print(f"   📄 Response: {response.text}")
                    return False
            else:
                print("   ⚠️  No inventory items found - skipping adjustment test")
                return None
        else:
            print(f"   ❌ Failed to get inventory: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Inventory adjustment error: {e}")
        return False

def test_pending_receivables(token):
    """Test pending receivables report"""
    print("\\n🔍 Testing Pending Receivables Report...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/reports/pending-receivables",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("   ✅ Pending receivables report successful")
            data = response.json()
            print(f"   📊 Found {data.get('count', 0)} pending receivables")
            return True
        else:
            print(f"   ❌ Pending receivables failed: {response.status_code}")
            print(f"   📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Pending receivables error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 LOCAL API TESTING AGAINST RENDER DATABASE")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Test authentication
    token = test_auth()
    if not token:
        print("❌ Cannot proceed - authentication failed")
        return
    
    print(f"🎫 Token obtained: {token[:20]}...")
    
    # Test each problematic endpoint
    results = {}
    
    results['order_creation'] = test_order_creation_detailed(token)
    results['inventory_adjustment'] = test_inventory_adjustment(token)
    results['pending_receivables'] = test_pending_receivables(token)
    
    # Summary
    print("\\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, result in results.items():
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
        else:
            status = "⚠️  SKIP"
        print(f"{test_name}: {status}")
    
    failed_tests = [name for name, result in results.items() if result is False]
    if failed_tests:
        print(f"\\n❌ {len(failed_tests)} tests failed: {', '.join(failed_tests)}")
        print("💡 Check server logs for detailed error information")
    else:
        print("\\n✅ All tests passed!")

if __name__ == "__main__":
    main()
'''
    
    test_file = Path(__file__).parent / "test_local_debug.py"
    with open(test_file, "w") as f:
        f.write(test_script)
    
    print(f"✅ Local debug test script created: {test_file}")
    return test_file

def main():
    """Main setup function"""
    print("🔧 BACKEND-ONLY LOCAL SETUP")
    print("=" * 50)
    print("🌐 Using Render PostgreSQL Database")
    print("🖥️  Running Backend Locally for Debugging")
    print("=" * 50)
    
    # Create environment file
    create_render_env()
    
    # Install dependencies
    if not install_backend_deps():
        print("❌ Setup failed - could not install dependencies")
        return
    
    # Test database connection
    if not test_db_connection():
        print("⚠️  Database connection test failed, but continuing setup...")
    
    # Create test script
    test_file = create_local_test_script()
    
    print("\n" + "=" * 60)
    print("✅ BACKEND SETUP COMPLETE!")
    print("=" * 60)
    print("📝 Next steps:")
    print("1. Start local server:")
    print("   cd backend")
    print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print()
    print("2. Test APIs locally:")
    print("   python test_local_debug.py")
    print()
    print("3. View API docs:")
    print("   http://localhost:8000/docs")
    print()
    print("4. Debug 500 errors with full stack traces in terminal")
    print("=" * 60)
    
    # Ask if user wants to start server
    start_server = input("\n🚀 Start the backend server now? (y/n): ")
    if start_server.lower().startswith('y'):
        print("\n🚀 Starting backend server...")
        backend_dir = Path(__file__).parent / "backend"
        os.chdir(backend_dir)
        
        try:
            subprocess.run([
                sys.executable, "-m", "uvicorn", 
                "app.main:app", 
                "--reload", 
                "--host", "0.0.0.0", 
                "--port", "8000",
                "--log-level", "debug"
            ])
        except KeyboardInterrupt:
            print("\n⏹️  Server stopped")

if __name__ == "__main__":
    main() 