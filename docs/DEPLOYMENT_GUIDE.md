# 🚀 Production Deployment Guide

Complete step-by-step guide for deploying the Digital Textile Printing Management System to production with enhanced security and monitoring.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Security](#pre-deployment-security)
3. [Environment Setup](#environment-setup)
4. [Database Deployment](#database-deployment)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Accounts
- [Render.com](https://render.com) account (for backend and database)
- [Netlify](https://netlify.com) account (for frontend)
- [GitHub](https://github.com) repository access

### Required Tools
- Git
- Python 3.9+
- Node.js 16+
- PostgreSQL client (psql)

### System Requirements
- **Backend**: Render Starter Plan (minimum for production)
- **Database**: Render PostgreSQL Starter Plan
- **Frontend**: Netlify Pro (for custom domains and enhanced features)

## 🔒 Pre-Deployment Security

### Step 1: Security Cleanup
```bash
# Clone and navigate to project
git clone <your-repository-url>
cd textile-printing-system

# Remove any hardcoded credentials
python3 remove_hardcoded_credentials.py

# Verify no sensitive data remains
grep -r "Siri@2299" . || echo "✅ No hardcoded passwords found"
grep -r "password.*=" --include="*.py" . | grep -v "test" | grep -v ".env" || echo "✅ No hardcoded passwords in code"
```

### Step 2: Secure Environment Setup
```bash
# Run interactive environment setup
python3 setup_secure_environment.py

# Choose "2" for production environment
# Provide:
# - Production database URL (will get from Render)
# - Production frontend URL (will get from Netlify)
# - Admin email address
# - Admin full name
```

### Step 3: Validate Security Configuration
```bash
# Ensure .env file is not in version control
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "secure_setup_summary_*.json" >> .gitignore

# Verify security improvements
cd backend
python -m pytest tests/test_api_security.py -v
```

## 🌍 Environment Setup

### Production Environment Variables

Create these environment variables in your deployment platforms:

#### Database Configuration
```env
DATABASE_URL=<from-render-database>
DB_POOL_SIZE=5
DB_POOL_OVERFLOW=10
DB_POOL_TIMEOUT=30
```

#### Security Configuration
```env
SECRET_KEY=<generate-secure-64-char-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Application Configuration
```env
APP_NAME=Digital Textile Printing Management System
APP_VERSION=2.0.0
ENVIRONMENT=production
DEBUG=false
```

#### CORS and Frontend
```env
CORS_ORIGINS=https://your-domain.netlify.app
FRONTEND_URL=https://your-domain.netlify.app
```

#### Security Features
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600
```

#### Admin Configuration
```env
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<secure-generated-password>
ADMIN_FULL_NAME=System Administrator
```

## 🗄️ Database Deployment

### Step 1: Create Database on Render

1. **Log into Render Dashboard**
   - Go to [render.com](https://render.com)
   - Navigate to Dashboard

2. **Create PostgreSQL Database**
   ```
   - Click "New +" → "PostgreSQL"
   - Name: textile-printing-db
   - Database Name: textile_printing_db
   - User: textile_user
   - Region: Oregon (US West)
   - Plan: Starter ($7/month minimum for production)
   ```

3. **Note Database Connection Details**
   - Save the `Internal Database URL` for backend configuration
   - Save the `External Database URL` for local management

### Step 2: Apply Database Migration

```bash
# Connect to production database
export DATABASE_URL="<your-render-database-external-url>"

# Apply schema migration with improvements
psql $DATABASE_URL -f backend/app/migrations/schema_fix_v2.sql

# Verify migration success
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### Step 3: Create Initial Admin User

```bash
# Create admin user with secure password
psql $DATABASE_URL -c "
INSERT INTO users (id, username, email, full_name, password_hash, role, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin',
    '$ADMIN_EMAIL',
    '$ADMIN_FULL_NAME',
    '<bcrypt-hash-of-secure-password>',
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;
"
```

## 🔧 Backend Deployment

### Step 1: Prepare Backend for Deployment

```bash
# Ensure render.yaml is properly configured
cat backend/render.yaml

# Update requirements if needed
cd backend
pip freeze > requirements.txt
```

### Step 2: Deploy to Render

1. **Create Web Service**
   ```
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: textile-printing-api
     - Environment: Python
     - Region: Oregon (US West)
     - Branch: main
     - Root Directory: backend
     - Build Command: pip install -r requirements.txt
     - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
   ```

2. **Configure Environment Variables**
   Add all environment variables from the [Environment Setup](#environment-setup) section.

3. **Set Advanced Settings**
   ```
   - Plan: Starter ($7/month minimum)
   - Health Check Path: /health
   - Auto-Deploy: Yes
   ```

### Step 3: Verify Backend Deployment

```bash
# Wait for deployment to complete, then test
export BACKEND_URL="https://your-service.onrender.com"

# Test health endpoint
curl $BACKEND_URL/health

# Test API documentation
curl $BACKEND_URL/docs

# Test authentication
curl -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=<your-admin-password>"
```

## 🎨 Frontend Deployment

### Step 1: Prepare Frontend

```bash
cd frontend

# Update API configuration
cat > src/config/api.ts << EOF
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-service.onrender.com';

export { API_BASE_URL };
EOF

# Update environment variables
cat > .env.production << EOF
REACT_APP_API_URL=https://your-service.onrender.com
REACT_APP_APP_NAME=Digital Textile Printing Management System
REACT_APP_VERSION=2.0.0
GENERATE_SOURCEMAP=false
EOF

# Build for production
npm install
npm run build
```

### Step 2: Deploy to Netlify

#### Option A: Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=build

# Configure custom domain (optional)
netlify domains:add your-domain.com
```

#### Option B: GitHub Integration
1. **Connect Repository**
   - Go to Netlify Dashboard
   - Click "New site from Git"
   - Connect GitHub repository
   - Configure:
     - Branch: main
     - Base directory: frontend
     - Build command: npm run build
     - Publish directory: build

2. **Set Environment Variables**
   ```
   REACT_APP_API_URL=https://your-service.onrender.com
   REACT_APP_APP_NAME=Digital Textile Printing Management System
   REACT_APP_VERSION=2.0.0
   GENERATE_SOURCEMAP=false
   ```

### Step 3: Update Backend CORS

```bash
# Update backend environment variables with actual frontend URL
# In Render dashboard, update:
CORS_ORIGINS=https://your-app.netlify.app
FRONTEND_URL=https://your-app.netlify.app

# Redeploy backend to apply changes
```

## ✅ Post-Deployment Verification

### Step 1: Automated Health Checks

```bash
# Run comprehensive deployment verification
python3 deploy.py

# Or manual verification:
export BACKEND_URL="https://your-service.onrender.com"
export FRONTEND_URL="https://your-app.netlify.app"

# Backend health check
curl $BACKEND_URL/health | jq .

# Database health check
curl $BACKEND_URL/health/db | jq .

# Frontend accessibility
curl -I $FRONTEND_URL
```

### Step 2: Functional Testing

```bash
# Test API endpoints
cd backend

# Run production API tests
python -m pytest tests/test_api_security.py -v
python -m pytest tests/test_customer_api.py -v

# Test authentication flow
curl -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=<admin-password>" | jq .
```

### Step 3: Frontend Integration Testing

1. **Open Frontend URL**
   - Navigate to your Netlify URL
   - Verify login page loads
   - Test login with admin credentials
   - Check all main pages load correctly

2. **Test API Integration**
   - Create a test customer
   - View customer list
   - Test search functionality
   - Verify error handling

### Step 4: Security Verification

```bash
# Test security headers
curl -I $BACKEND_URL/health

# Test CORS configuration
curl -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS $BACKEND_URL/api/customers/

# Test rate limiting (if enabled)
for i in {1..10}; do curl $BACKEND_URL/health; done
```

## 📊 Monitoring & Maintenance

### Application Monitoring

1. **Health Monitoring Setup**
   ```bash
   # Create monitoring script
   cat > monitor.sh << 'EOF'
   #!/bin/bash
   BACKEND_URL="https://your-service.onrender.com"
   
   # Check backend health
   if curl -f $BACKEND_URL/health > /dev/null 2>&1; then
       echo "✅ Backend healthy"
   else
       echo "❌ Backend unhealthy"
       # Add notification logic here
   fi
   
   # Check database health
   if curl -f $BACKEND_URL/health/db > /dev/null 2>&1; then
       echo "✅ Database healthy"
   else
       echo "❌ Database unhealthy"
   fi
   EOF
   
   chmod +x monitor.sh
   ```

2. **Log Monitoring**
   - Monitor Render logs for errors
   - Set up log aggregation if needed
   - Configure alerts for critical errors

### Database Maintenance

```bash
# Connect to production database for maintenance
export DATABASE_URL="<your-render-database-external-url>"

# Check database performance
psql $DATABASE_URL -c "
SELECT schemaname, tablename, attname, avg_width, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;
"

# Update table statistics
psql $DATABASE_URL -c "ANALYZE;"

# Check for long-running queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

### Security Maintenance

1. **Regular Security Updates**
   ```bash
   # Update dependencies
   cd backend
   pip list --outdated
   pip install --upgrade pip
   
   cd ../frontend
   npm audit
   npm update
   ```

2. **Password Rotation**
   ```bash
   # Change admin password (quarterly)
   python3 change_admin_password.py
   
   # Rotate JWT secret key (annually)
   # Generate new SECRET_KEY and update in Render environment
   ```

## 🔧 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check Render logs
# Common issues:
# 1. Environment variables not set
# 2. Database connection failed
# 3. Port binding issues

# Debug locally first
cd backend
uvicorn app.main:app --reload --log-level debug
```

#### Database Connection Issues
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool settings
# Ensure DB_POOL_SIZE and related vars are set correctly

# Verify database URL format
echo $DATABASE_URL | grep -E "postgresql://.*"
```

#### Frontend API Connection Issues
```bash
# Check CORS configuration
curl -H "Origin: https://your-app.netlify.app" \
  -X OPTIONS $BACKEND_URL/api/customers/

# Verify environment variables
# Check REACT_APP_API_URL is set correctly
```

#### Authentication Issues
```bash
# Test JWT token generation
curl -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=<password>" -v

# Check admin user exists
psql $DATABASE_URL -c "SELECT username, email, role, is_active FROM users WHERE username = 'admin';"
```

### Performance Issues

```bash
# Database performance
psql $DATABASE_URL -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
"

# Backend performance
curl -w "@curl-format.txt" -s -o /dev/null $BACKEND_URL/api/customers/

# Frontend performance
# Use browser dev tools to check:
# - Network requests
# - Bundle sizes
# - Load times
```

### Rollback Procedures

```bash
# Backend rollback
# 1. Revert to previous deployment in Render dashboard
# 2. Or deploy previous git commit

# Database rollback
# 1. Restore from backup
# 2. Or manually revert schema changes

# Frontend rollback
# 1. Revert to previous deployment in Netlify
# 2. Or deploy previous git commit
```

## 📞 Support Escalation

### Production Issues Priority

1. **Critical (Service Down)**
   - Backend health check failing
   - Database connectivity lost
   - Authentication completely broken

2. **High (Degraded Service)**
   - Slow response times
   - Intermittent errors
   - Partial functionality loss

3. **Medium (Minor Issues)**
   - Non-critical feature bugs
   - UI inconsistencies
   - Performance optimization

### Emergency Contacts

- Database Issues: Check Render status page
- Frontend Issues: Check Netlify status page
- Application Issues: Review application logs
- Security Issues: Immediate password rotation and access review

---

## 🎉 Deployment Checklist

- [ ] ✅ Security cleanup completed
- [ ] ✅ Environment variables configured
- [ ] ✅ Database deployed and migrated
- [ ] ✅ Backend deployed and healthy
- [ ] ✅ Frontend deployed and accessible
- [ ] ✅ API integration working
- [ ] ✅ Authentication functional
- [ ] ✅ CORS properly configured
- [ ] ✅ Admin password changed
- [ ] ✅ Health monitoring set up
- [ ] ✅ Documentation updated
- [ ] ✅ Team trained on new system

**🎯 Your Digital Textile Printing Management System is now production-ready with enhanced security and monitoring!**