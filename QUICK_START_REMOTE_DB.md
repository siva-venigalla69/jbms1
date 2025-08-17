# 🚀 Quick Start Guide - Using Render Database

This guide helps you set up the Digital Textile Printing System using **Render's database** without installing PostgreSQL locally.

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- Render account with PostgreSQL database
- Git

## 🗄️ Step 1: Set Up Database on Render

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Create account if you don't have one

2. **Create PostgreSQL Database**
   ```
   - Click "New +" → "PostgreSQL"
   - Name: textile-printing-db
   - Database Name: textile_printing_db
   - User: textile_user
   - Region: Choose your preferred region
   - Plan: Free (for testing) or Starter (for production)
   ```

3. **Get Database URL**
   - After creation, click on your database
   - Copy the **"External Database URL"** (important: use External, not Internal)
   - It looks like: `postgresql://user:password@hostname:port/database`

## 🔧 Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone <your-repository-url>
cd textile-printing-system

# Remove any hardcoded credentials (security cleanup)
python3 remove_hardcoded_credentials.py
```

## 🌍 Step 3: Environment Setup (Remote Database)

**Use our special remote setup script:**

```bash
# Run the remote environment setup
python3 setup_remote_environment.py
```

**The script will:**
1. ✅ Check if you have required packages (installs psycopg2-binary if needed)
2. ✅ Ask for your Render database URL
3. ✅ Test the database connection
4. ✅ Generate secure environment variables
5. ✅ Apply database migration automatically
6. ✅ Create admin user in your Render database
7. ✅ Verify everything works

**Follow the prompts:**
- Choose "1" for Development (local development with remote database)
- Paste your Render External Database URL
- Provide admin details (email, name)
- Let it apply database migration
- Let it create admin user

## 🎯 Step 4: Start the Application

### Backend
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
python -m uvicorn app.main:app --reload
```

**Backend will be running at:** http://localhost:8000

### Frontend
```bash
# In a new terminal
cd frontend

# Install and start frontend
npm install
npm start
```

**Frontend will be running at:** http://localhost:3000

## 🔑 Step 5: Login and Test

1. **Open your browser:** http://localhost:3000
2. **Login with:**
   - Username: `admin`
   - Password: Check `backend/.env` file for `ADMIN_PASSWORD=`

3. **Test the system:**
   - Create a customer
   - View customer list
   - Test search functionality

## 🧪 Step 6: Run Tests (Optional)

```bash
# Test the API endpoints
cd backend
python -m pytest tests/test_customer_api.py -v

# Test security
python -m pytest tests/test_api_security.py -v
```

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Test your database connection manually
python3 -c "
import psycopg2
conn = psycopg2.connect('YOUR_DATABASE_URL_HERE')
print('✅ Database connection successful!')
conn.close()
"
```

### Backend Won't Start
```bash
# Check if .env file exists
ls -la backend/.env

# Check environment variables
cd backend
python -c "
from app.core.config import settings
print(f'Environment: {settings.ENVIRONMENT}')
print(f'Database configured: {bool(settings.DATABASE_URL)}')
"
```

### Frontend Can't Connect to Backend
```bash
# Make sure backend is running on port 8000
curl http://localhost:8000/health

# Check frontend API configuration
cat frontend/src/config/api.ts
```

## 📱 API Testing

Test your API with curl:
```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=YOUR_ADMIN_PASSWORD"

# Create customer (use token from login)
curl -X POST "http://localhost:8000/api/customers/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "1234567890",
    "email": "test@example.com"
  }'
```

## 🎉 What You Have Now

- ✅ **Remote Database**: Using Render PostgreSQL (no local setup needed)
- ✅ **Secure Configuration**: Generated secure passwords and keys
- ✅ **Backend API**: Running on localhost:8000
- ✅ **Frontend App**: Running on localhost:3000
- ✅ **Admin Access**: Ready to use with generated credentials
- ✅ **Database Schema**: Applied with all improvements
- ✅ **Security**: All hardcoded credentials removed

## 🔄 Next Steps

### For Development
- Start building your features
- Run tests as you develop
- Use the comprehensive [API Documentation](docs/API_DOCUMENTATION.md)

### For Production Deployment
1. Use the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
2. Run `python3 deploy.py` for automated deployment
3. Update environment variables in Render dashboard

## 📞 Need Help?

- **API Issues**: Check [API Documentation](docs/API_DOCUMENTATION.md)
- **Testing**: See [Testing Guide](docs/TESTING_GUIDE.md)
- **Deployment**: Follow [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- **Database Issues**: Verify your Render database URL and connectivity

---

**🎯 You're now ready to develop with your Digital Textile Printing System using a remote database!**