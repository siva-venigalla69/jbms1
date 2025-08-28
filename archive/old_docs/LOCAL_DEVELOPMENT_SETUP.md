# 🚀 Local Development Setup Guide

## Digital Textile Printing System - Local Backend + Render Database

This guide provides complete steps to set up your local development environment where the backend runs locally but connects to the production database on Render.

---

## 📋 Prerequisites

Before starting, ensure you have:
- **Python 3.8+** installed
- **Git** installed
- **Render database** deployed and accessible
- **Terminal/Command Line** access

---

## 🔧 Step-by-Step Setup

### Step 1: Navigate to Project Directory
```bash
cd /home/siva-u/jbms1
```

### Step 2: Set Up Python Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Verify activation (you should see (venv) in your prompt)
which python
```

### Step 3: Install Backend Dependencies
```bash
# Navigate to backend directory
cd backend

# Install all required packages
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

You have two options for setting up the database connection:

#### Option A: Use Automated Setup Script (Recommended)
```bash
# Navigate back to root directory
cd ..

# Run the automated setup script
python3 setup_backend_only.py
```

#### Option B: Manual .env File Creation
```bash
# Create .env file in backend directory
cd backend
cat > .env << 'EOF'
# Local Backend + Render Database Configuration
DATABASE_URL=postgresql://jbms_db_user:fJF5lnjVGKFVH37RV3JVgcz7IFYq5rTs@dpg-d1dujh6mcj7s73bh6rtg-a.singapore-postgres.render.com/jbms_db?sslmode=require

# Security
SECRET_KEY=local-development-secret-key-32-chars-minimum-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
DEBUG=true

# CORS - allow local frontend and testing
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Rate limiting (disabled for development)
RATE_LIMIT_ENABLED=false

# File paths (local)
UPLOAD_PATH=./uploads
REPORTS_EXPORT_PATH=./exports

# Logging
LOG_LEVEL=DEBUG
LOG_FILE=./app.log
EOF
```

### Step 5: Test Database Connection
```bash
# Navigate back to root directory
cd ..

# Test the database connection
python3 -c "
import sys
sys.path.append('backend')
from backend.app.core.database import get_db
from backend.app.core.config import settings

print(f'Testing connection to: {settings.DATABASE_URL[:50]}...')

try:
    db = next(get_db())
    result = db.execute('SELECT 1 as test').fetchone()
    if result and result[0] == 1:
        print('✅ Database connection successful!')
        
        # Check admin user
        admin_check = db.execute(\"SELECT username FROM users WHERE role = 'admin' LIMIT 1\").fetchone()
        if admin_check:
            print(f'✅ Admin user found: {admin_check[0]}')
        else:
            print('⚠️  No admin user found in database')
    else:
        print('❌ Database connection failed')
except Exception as e:
    print(f'❌ Connection error: {e}')
"
```

### Step 6: Start the Backend Server
```bash
# Navigate to backend directory
cd backend

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 7: Verify the Setup

Open another terminal and test the API endpoints:

#### Test Health Check:
```bash
curl http://localhost:8000/health
```

#### Test Database Health:
```bash
curl http://localhost:8000/health/db
```

#### Test Authentication:
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin&password=Siri@2299"
```

### Step 8: Access API Documentation

Once the server is running, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health
- **Database Health**: http://localhost:8000/health/db

---

## 🚨 Troubleshooting Common Issues

### 1. SSL Connection Issues
If you get SSL errors, ensure your DATABASE_URL includes SSL parameters:
```bash
# Edit backend/.env and ensure DATABASE_URL has:
DATABASE_URL=postgresql://jbms_db_user:fJF5lnjVGKFVH37RV3JVgcz7IFYq5rTs@dpg-d1dujh6mcj7s73bh6rtg-a.singapore-postgres.render.com/jbms_db?sslmode=require
```

### 2. Port Already in Use
If port 8000 is busy, use a different port:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Module Import Errors
Make sure you're in the backend directory when starting the server:
```bash
cd backend
uvicorn app.main:app --reload
```

### 4. Database Connection Timeout
If connection times out, check your network:
```bash
# Test basic connectivity
ping dpg-d1dujh6mcj7s73bh6rtg-a.singapore-postgres.render.com
```

### 5. Virtual Environment Issues
If you encounter Python path issues:
```bash
# Deactivate and reactivate virtual environment
deactivate
source venv/bin/activate

# Verify Python path
which python
which pip
```

### 6. Permission Issues
If you get permission errors:
```bash
# Make sure you have write permissions
chmod +w backend/.env
```

---

## 🔄 Development Workflow

### Daily Development Process:

1. **Start Development Session:**
```bash
cd /home/siva-u/jbms1
source venv/bin/activate
cd backend
uvicorn app.main:app --reload
```

2. **Make Changes:**
   - Backend changes auto-reload with `--reload` flag
   - No need to restart server for Python file changes

3. **Test Changes:**
```bash
# Run comprehensive API tests
python3 ../test_all_apis_comprehensive.py

# Or test specific endpoints
curl http://localhost:8000/api/customers
```

4. **Check Logs:**
```bash
# View application logs
tail -f backend/app.log

# Or check console output from uvicorn
```

5. **Stop Development:**
```bash
# Press Ctrl+C to stop server
# Deactivate virtual environment
deactivate
```

---

## 📁 Project Structure

```
jbms1/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Configuration & database
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── main.py       # FastAPI application
│   ├── requirements.txt  # Python dependencies
│   └── .env             # Environment variables
├── frontend/            # Frontend application (if any)
├── database/           # Database scripts
└── setup_backend_only.py # Automated setup script
```

---

## 🔐 Environment Variables Reference

### Required Variables (.env file):
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

# Security
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
DEBUG=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Features
RATE_LIMIT_ENABLED=false

# Paths
UPLOAD_PATH=./uploads
REPORTS_EXPORT_PATH=./exports

# Logging
LOG_LEVEL=DEBUG
LOG_FILE=./app.log
```

---

## 🧪 Testing Your Setup

### Quick API Test Script:
```bash
# Create a quick test script
cat > test_local_setup.py << 'EOF'
import requests
import json

BASE_URL = "http://localhost:8000"

def test_setup():
    print("🧪 Testing Local Setup...")
    
    # Test health
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.status_code}")
        
        response = requests.get(f"{BASE_URL}/health/db")
        print(f"Database Health: {response.status_code}")
        
        # Test auth
        login_data = "username=admin&password=Siri@2299"
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Authentication: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Setup successful!")
        else:
            print("⚠️  Authentication issue")
            
    except Exception as e:
        print(f"❌ Setup test failed: {e}")

if __name__ == "__main__":
    test_setup()
EOF

# Run the test
python3 test_local_setup.py
```

---

## 📊 Current System Status

Based on the latest API testing (2025-06-27):
- **Overall Success Rate**: 43.5% (10/23 tests passed)
- **Working Modules**: Authentication, Customer Management, Basic Data Retrieval
- **Issues**: Order creation, Material tracking, Invoice management, Expense recording

### Key Working Endpoints:
- ✅ `POST /api/auth/login` - Authentication
- ✅ `GET /api/customers` - List customers
- ✅ `POST /api/customers` - Create customer
- ✅ `GET /api/inventory` - List inventory

### Known Issues:
- ❌ Order creation (500 errors)
- ❌ Material recording (500 errors)
- ❌ Invoice management (validation issues)
- ❌ Returns module (not implemented)

---

## 💡 Development Tips

1. **Always use virtual environment** to avoid dependency conflicts
2. **Check logs regularly** for debugging information
3. **Test API changes** using curl or Postman
4. **Monitor database connections** to avoid timeout issues
5. **Use --reload flag** for automatic server restarts during development

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: `tail -f backend/app.log`
2. **Verify environment**: Check `backend/.env` file
3. **Test database**: Run connection test script
4. **Check API documentation**: Visit http://localhost:8000/docs
5. **Review error messages**: Look for specific error details

---

## 📅 Setup Checklist

- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed from requirements.txt
- [ ] .env file created with correct database URL
- [ ] Database connection tested successfully
- [ ] Backend server starts without errors
- [ ] Health endpoints respond correctly
- [ ] Authentication works with admin credentials
- [ ] API documentation accessible

---

*This setup guide was created for the Digital Textile Printing System local development environment. Last updated: 2025-06-27* 