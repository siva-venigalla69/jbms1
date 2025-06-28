# 🚀 Production Deployment Guide

## ⚠️ CRITICAL SECURITY FIXES REQUIRED

**Before deploying, you MUST fix these security issues:**

### 1. Remove Hardcoded Passwords
**Found in these files:**
- `test_all_functional_requirements_comprehensive.py` (line 59)
- `test_api_comprehensive.py` (line 15)
- `test_local_environment_complete.py` (line 101)
- Multiple other test files

**Action Required:** Remove all hardcoded passwords from code.

### 2. Secure Database Credentials
**Found exposed in:**
- `update_env_correct_db.py`
- `create_env.py` 
- `fix_ssl_connection.py`
- `setup_backend_only.py`

**Action Required:** Use environment variables only.

## 🔧 DEPLOYMENT STEPS

### Step 1: Secure Environment Setup

1. **Generate secure credentials:**
   ```bash
   python create_secure_env.py
   ```

2. **Update Render environment variables:**
   - Go to Render Dashboard → Your Service → Environment
   - Add these variables:
   ```
   SECRET_KEY=<GENERATED_SECURE_KEY>
   ENVIRONMENT=production
   DEBUG=false
   CORS_ORIGINS=https://your-frontend-domain.com
   FRONTEND_URL=https://your-frontend-domain.com
   ADMIN_PASSWORD=<GENERATED_SECURE_PASSWORD>
   ```

### Step 2: Update Render Configuration

**Update `backend/render.yaml`:**
```yaml
services:
  - type: web
    name: textile-printing-api
    env: python
    region: oregon
    plan: starter  # Consider upgrading from free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: textile-printing-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: ENVIRONMENT
        value: production
      - key: DEBUG
        value: false
      - key: CORS_ORIGINS
        value: "https://your-frontend-domain.com"
      - key: FRONTEND_URL
        value: "https://your-frontend-domain.com"
      - key: ACCESS_TOKEN_EXPIRE_MINUTES
        value: 30
      - key: RATE_LIMIT_ENABLED
        value: true
```

### Step 3: Database Migration

**Apply the latest schema fixes:**
```sql
-- Run this in your production database
-- File: FIXED_ENUM_MIGRATION.sql
```

### Step 4: Deploy to Render

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Security fixes and production deployment"
   git push origin main
   ```

2. **Trigger deployment in Render Dashboard**

3. **Monitor deployment logs**

### Step 5: Post-Deployment Verification

**Run production API tests:**
```bash
# Update test files to use production URL
python test_production_apis.py
```

## 🔒 PASSWORD CHANGE PROCEDURES

### Admin Password Change
```bash
# After deployment, immediately change admin password
python change_admin_password.py
```

### User Password Reset
```bash
# For user password resets
python reset_user_password.py <username>
```

## 🧪 PRODUCTION TESTING

### Backend API Testing
```bash
# Test production APIs
curl -X POST "https://your-app.onrender.com/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=NEW_SECURE_PASSWORD"
```

### Frontend Testing
1. Open: `https://your-frontend-domain.com`
2. Test login with new credentials
3. Verify all major functions work

## 📊 MONITORING SETUP

### Health Checks
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity

### Logging
- Check Render logs for errors
- Monitor response times
- Set up alerts for failures

## 🔒 SECURITY CHECKLIST

- [ ] All hardcoded passwords removed
- [ ] Environment variables properly set
- [ ] Database credentials secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Admin password changed
- [ ] Security headers enabled
- [ ] Error messages don't expose sensitive data

## 🚨 IMMEDIATE ACTIONS REQUIRED

1. **Remove hardcoded password `"Siri@2299"` from all files**
2. **Generate new secure admin password**
3. **Update CORS_ORIGINS with actual frontend domain**
4. **Test all critical endpoints**
5. **Set up monitoring and alerts**

## 📞 ROLLBACK PLAN

If deployment fails:
1. Revert to previous Git commit
2. Redeploy previous version
3. Check database integrity
4. Restore from backup if needed 