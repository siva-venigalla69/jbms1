# Deployment Guide - Digital Textile Printing System

This guide provides step-by-step instructions for deploying the complete system to production using free tier services.

## 📋 Deployment Overview

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION DEPLOYMENT                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)     Backend (FastAPI)     Database (PostgreSQL) │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   Netlify.com   │  │  Render.com     │  │  Render.com     │   │
│  │   - Free Tier   │  │  - Free Tier    │  │  - Free Tier    │   │
│  │   - CDN         │  │  - 750hrs/month │  │  - 1GB Storage  │   │
│  │   - 100GB/month │  │  - Auto-scale   │  │  - 90day retention  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Order
1. **Database** (PostgreSQL on Render.com) - Foundation
2. **Backend** (FastAPI on Render.com) - API Services
3. **Frontend** (React on Netlify) - User Interface

### Prerequisites
- GitHub account (for source code)
- Render.com account (for backend and database)
- Netlify account (for frontend)
- Domain name (optional)

---

## 🗄️ PHASE 1: Database Deployment (Render.com PostgreSQL)

### Step 1.1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Verify email address

### Step 1.2: Create PostgreSQL Database
1. **Login to Render Dashboard**
2. **Click "New +" → "PostgreSQL"**
3. **Configure Database Settings:**
   ```
   Name: textile-printing-db
   Database: textile_printing_db
   User: textile_user
   Region: Oregon (US West) or closest region
   PostgreSQL Version: 14
   Plan: Free
   ```
4. **Click "Create Database"**
5. **Wait for deployment** (2-3 minutes)

### Step 1.3: Note Database Connection Details
```bash
# Save these details - you'll need them later
External Database URL: postgresql://textile_user:password@hostname:port/textile_printing_db
Internal Database URL: postgresql://textile_user:password@hostname:port/textile_printing_db
Host: dpg-xxxxx-a.oregon-postgres.render.com
Port: 5432
Database: textile_printing_db
Username: textile_user
Password: [generated-password]
```

### Step 1.4: Initialize Database Schema
1. **Connect to database using psql or any PostgreSQL client:**
   ```bash
   psql "postgresql://textile_user:password@hostname:port/textile_printing_db"
   ```

2. **Execute schema creation script:**
   ```sql
   -- Copy and paste the complete schema from database/schema.sql
   -- This includes all tables, indexes, triggers, and initial data
   ```

3. **Verify tables creation:**
   ```sql
   \dt
   -- Should show all tables: users, customers, orders, etc.
   ```

---

## 🐍 PHASE 2: Backend Deployment (Render.com Web Service)

### Step 2.1: Prepare Backend for Deployment

1. **Create `render.yaml` in backend root:**
   ```yaml
   services:
     - type: web
       name: textile-printing-api
       env: python
       region: oregon
       plan: free
       buildCommand: pip install -r requirements.txt
       startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
       envVars:
         - key: DATABASE_URL
           fromDatabase:
             name: textile-printing-db
             property: connectionString
         - key: SECRET_KEY
           generateValue: true
         - key: ALGORITHM
           value: HS256
         - key: ACCESS_TOKEN_EXPIRE_MINUTES
           value: 30
         - key: ENVIRONMENT
           value: production
   ```

2. **Update `requirements.txt`:**
   ```txt
   fastapi==0.104.1
   uvicorn[standard]==0.24.0
   sqlalchemy==2.0.23
   psycopg2-binary==2.9.9
   python-jose[cryptography]==3.3.0
   python-multipart==0.0.6
   passlib[bcrypt]==1.7.4
   python-dotenv==1.0.0
   alembic==1.12.1
   reportlab==4.0.4
   pandas==2.1.3
   openpyxl==3.1.2
   ```

3. **Create `app/core/config.py`:**
   ```python
   import os
   from pydantic_settings import BaseSettings

   class Settings(BaseSettings):
       DATABASE_URL: str = os.getenv("DATABASE_URL", "")
       SECRET_KEY: str = os.getenv("SECRET_KEY", "")
       ALGORITHM: str = "HS256"
       ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
       ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
       
       class Config:
           env_file = ".env"

   settings = Settings()
   ```

### Step 2.2: Deploy Backend to Render

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create Web Service on Render:**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the backend directory (if monorepo)

3. **Configure Web Service:**
   ```
   Name: textile-printing-api
   Region: Oregon (same as database)
   Branch: main
   Root Directory: backend (if applicable)
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   Plan: Free
   ```

4. **Set Environment Variables:**
   ```
   DATABASE_URL: [Auto-linked from database]
   SECRET_KEY: [Generate random 32-character string]
   ALGORITHM: HS256
   ACCESS_TOKEN_EXPIRE_MINUTES: 30
   ENVIRONMENT: production
   ```

5. **Deploy and Monitor:**
   - Click "Create Web Service"
   - Monitor build logs
   - Wait for "Deploy successful" message
   - Note the service URL: `https://textile-printing-api.onrender.com`

### Step 2.3: Verify Backend Deployment

1. **Test API Health:**
   ```bash
   curl https://textile-printing-api.onrender.com/health
   # Should return: {"status": "healthy"}
   ```

2. **Test Database Connection:**
   ```bash
   curl https://textile-printing-api.onrender.com/api/v1/users/
   # Should return empty array or user list
   ```

3. **Access API Documentation:**
   - Open: `https://textile-printing-api.onrender.com/docs`
   - Verify all endpoints are listed

---

## ⚛️ PHASE 3: Frontend Deployment (Netlify)

### Step 3.1: Prepare Frontend for Deployment

1. **Create `.env.production` in frontend root:**
   ```env
   REACT_APP_API_URL=https://textile-printing-api.onrender.com
   REACT_APP_ENVIRONMENT=production
   ```

2. **Update `src/config/api.js`:**
   ```javascript
   const config = {
     API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
     ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development'
   };

   export default config;
   ```

3. **Create `netlify.toml` in frontend root:**
   ```toml
   [build]
     publish = "build"
     command = "npm run build"

   [build.environment]
     REACT_APP_API_URL = "https://textile-printing-api.onrender.com"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [[headers]]
     for = "/static/*"
     [headers.values]
       Cache-Control = "public, max-age=31536000, immutable"
   ```

### Step 3.2: Deploy Frontend to Netlify

1. **Build and Test Locally:**
   ```bash
   cd frontend
   npm install
   npm run build
   # Verify build success
   ```

2. **Deploy to Netlify:**

   **Option A: GitHub Integration (Recommended)**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/Login with GitHub
   - Click "New site from Git"
   - Choose GitHub and authorize
   - Select your repository
   - Configure build settings:
     ```
     Branch: main
     Base directory: frontend (if monorepo)
     Build command: npm run build
     Publish directory: build
     ```
   - Set environment variables:
     ```
     REACT_APP_API_URL: https://textile-printing-api.onrender.com
     ```
   - Click "Deploy site"

   **Option B: Manual Deployment**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Deploy
   cd frontend
   npm run build
   netlify deploy --prod --dir=build
   ```

3. **Configure Custom Domain (Optional):**
   - Go to Site Settings → Domain management
   - Add custom domain
   - Configure DNS records

### Step 3.3: Verify Frontend Deployment

1. **Test Application Load:**
   - Open Netlify-provided URL
   - Verify login page loads
   - Check browser console for errors

2. **Test API Integration:**
   - Try logging in with test credentials
   - Verify data loads from backend
   - Test form submissions

3. **Performance Check:**
   - Use browser DevTools → Network tab
   - Verify assets load quickly
   - Check for 404 errors

---

## 🔧 PHASE 4: Post-Deployment Configuration

### Step 4.1: SSL/HTTPS Configuration
- **Render.com**: SSL automatically provided
- **Netlify**: SSL automatically provided
- **Custom Domain**: Configure SSL certificate

### Step 4.2: CORS Configuration Update
Update backend CORS settings with production frontend URL:

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://your-app.netlify.app",  # Production Netlify URL
        "https://yourdomain.com",  # Custom domain if applicable
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 4.3: Environment Variables Final Check

**Backend Environment Variables:**
```
DATABASE_URL=postgresql://user:pass@host:port/db
SECRET_KEY=your-32-character-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
```

**Frontend Environment Variables:**
```
REACT_APP_API_URL=https://textile-printing-api.onrender.com
REACT_APP_ENVIRONMENT=production
```

---

## 🧪 PHASE 5: Deployment Testing

### Step 5.1: System Integration Test
```bash
# Test complete workflow:
# 1. Login → 2. Create Customer → 3. Create Order → 4. Generate Report

# Frontend Tests
curl https://your-app.netlify.app
# Should return HTML page

# Backend API Tests
curl https://textile-printing-api.onrender.com/health
curl https://textile-printing-api.onrender.com/api/v1/customers/

# Database Tests
# Login to Render dashboard → Database → Connections tab → Test connection
```

### Step 5.2: Performance Testing
1. **Load Time Test:**
   - First load should be under 3 seconds
   - Subsequent loads under 1 second

2. **API Response Time:**
   - Simple queries under 1 second
   - Report generation under 30 seconds

3. **Concurrent User Test:**
   - Open multiple browser tabs
   - Test simultaneous operations

### Step 5.3: Security Testing
1. **HTTPS Verification:**
   - All URLs should use HTTPS
   - No mixed content warnings

2. **Authentication Test:**
   - Verify JWT tokens work
   - Test session expiration
   - Test unauthorized access protection

---

## 📊 PHASE 6: Monitoring and Maintenance

### Step 6.1: Monitoring Setup
1. **Render.com Monitoring:**
   - Check service metrics in dashboard
   - Set up email alerts for downtime
   - Monitor database storage usage

2. **Netlify Monitoring:**
   - Check bandwidth usage
   - Monitor build deployments
   - Review access logs

### Step 6.2: Regular Maintenance Tasks

**Weekly:**
- Check service status in both Render and Netlify dashboards
- Review error logs
- Monitor database storage usage

**Monthly:**
- Review performance metrics
- Check for security updates
- Backup critical data

**Quarterly:**
- Performance optimization review
- Security audit
- Plan for scaling if needed

---

## 🚨 Troubleshooting Common Issues

### Database Connection Issues
```bash
# Check database status in Render dashboard
# Verify environment variables are set
# Test connection string manually
```

### Backend Build Failures
```bash
# Common fixes:
# 1. Check requirements.txt file
# 2. Verify Python version compatibility
# 3. Check for missing environment variables
# 4. Review build logs in Render dashboard
```

### Frontend Build Failures
```bash
# Common fixes:
# 1. Check package.json dependencies
# 2. Verify Node.js version
# 3. Check for missing environment variables
# 4. Review build logs in Netlify dashboard
```

### CORS Errors
```python
# Update backend CORS configuration
# Verify frontend URL is in allowed origins
# Check for typos in domain names
```

---

## 💰 Free Tier Limitations and Monitoring

### Render.com Limits
- **Web Service**: 750 hours/month (31 days continuous)
- **Database**: 1GB storage, expires after 90 days if inactive
- **Automatic Sleep**: Services sleep after 15 minutes of inactivity

### Netlify Limits
- **Bandwidth**: 100GB/month
- **Sites**: Unlimited
- **Build Minutes**: 300 minutes/month

### Monitoring Usage
1. **Render Dashboard**: Check hours used and storage consumption
2. **Netlify Dashboard**: Monitor bandwidth and build minutes
3. **Set Alerts**: Configure email notifications for approaching limits

---

## 📈 Scaling Considerations

### When to Upgrade from Free Tier
- Render Web Service: When you need >750 hours/month or faster performance
- Render Database: When you need >1GB storage or backups
- Netlify: When you exceed 100GB bandwidth/month

### Upgrade Path
1. **Backend**: Render Starter plan ($7/month) - No hour limits, faster CPU
2. **Database**: Render PostgreSQL Starter ($7/month) - 10GB storage, daily backups
3. **Frontend**: Netlify Pro ($19/month) - 1TB bandwidth, more build minutes

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Database schema ready
- [ ] Backend tested locally
- [ ] Frontend tested locally
- [ ] Environment variables prepared
- [ ] GitHub repository ready

### Database Deployment
- [ ] Render account created
- [ ] PostgreSQL database created
- [ ] Schema deployed
- [ ] Test data loaded
- [ ] Connection string saved

### Backend Deployment
- [ ] Render web service created
- [ ] GitHub connected
- [ ] Environment variables set
- [ ] Service deployed successfully
- [ ] API endpoints tested
- [ ] Health check passed

### Frontend Deployment
- [ ] Netlify account created
- [ ] Site connected to GitHub
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Site deployed successfully
- [ ] Application tested end-to-end

### Post-Deployment
- [ ] CORS configured
- [ ] SSL certificates active
- [ ] Monitoring set up
- [ ] Performance tested
- [ ] Security verified
- [ ] Documentation updated

---

## 📞 Support and Resources

### Official Documentation
- [Render.com Documentation](https://render.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)

### Community Support
- [Render Community](https://community.render.com)
- [Netlify Community](https://community.netlify.com)
- [FastAPI GitHub Issues](https://github.com/tiangolo/fastapi/issues)

### Emergency Contacts
- System Administrator: [your-email@domain.com]
- Technical Support: [support@domain.com]

This deployment guide ensures a smooth transition from development to production environment with all components properly configured and tested. 