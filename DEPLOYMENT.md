# 🚀 Production Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying the **Digital Textile Printing System** to production using:

- **Backend**: Render.com (PostgreSQL + FastAPI)
- **Frontend**: Netlify (React TypeScript)
- **Total Cost**: $0/month (Free tiers)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │────│   FastAPI API    │────│   PostgreSQL    │
│   (Netlify)     │    │   (Render.com)   │    │   (Render.com)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🛠️ Prerequisites

### Required Accounts
- [ ] **GitHub Account** (free)
- [ ] **Render.com Account** (free)
- [ ] **Netlify Account** (free)

### Required Tools
```bash
# Install Git
sudo apt-get install git  # Ubuntu/Debian
brew install git          # macOS

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
git --version
node --version
npm --version
```

### Local Environment Setup
```bash
# Clone repository
git clone https://github.com/your-username/textile-printing-system.git
cd textile-printing-system

# Install dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

---

## 🗄️ Phase 1: Database Deployment

### Step 1: Create PostgreSQL Database on Render.com

1. **Login to Render.com**
   - Go to [render.com](https://render.com)
   - Sign up/login with GitHub

2. **Create Database**
   ```
   Dashboard → New → PostgreSQL
   ```

3. **Configure Database**
   ```
   Name: textile-printing-db
   Database: textile_printing_db
   User: admin
   Region: Choose closest to your users
   Plan: Free (0GB - 1GB)
   ```

4. **Get Connection Details**
   ```
   External Database URL: postgres://admin:password@host:port/textile_printing_db
   Internal Database URL: postgresql://admin:password@host:port/textile_printing_db
   ```

5. **Save Connection String**
   ```bash
   # Copy the External Database URL for backend configuration
   DATABASE_URL=postgresql://admin:password@host:port/textile_printing_db
   ```

### Step 2: Initialize Database Schema

```bash
# Install psql client
sudo apt-get install postgresql-client  # Ubuntu
brew install postgresql                 # macOS

# Connect and create schema
psql "postgresql://admin:password@host:port/textile_printing_db"

# Run schema creation
\i database/schema.sql

# Verify tables
\dt

# Exit
\q
```

---

## ⚙️ Phase 2: Backend API Deployment

### Step 1: Prepare Backend for Production

1. **Update Environment Variables**
   ```bash
   # Create backend/.env for production
   cd backend
   cat > .env << EOF
   # Database
   DATABASE_URL=postgresql://admin:password@host:port/textile_printing_db
   
   # Security
   SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
   ENVIRONMENT=production
   DEBUG=false
   
   # CORS
   FRONTEND_URL=https://your-app.netlify.app
   EOF
   ```

2. **Update CORS Configuration**
   ```python
   # backend/app/core/config.py
   ALLOWED_ORIGINS: List[str] = [
       "https://your-app.netlify.app",  # Update this
       # Remove localhost URLs for production
   ]
   ```

3. **Test Locally with Production Config**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   # Verify http://localhost:8000/docs works
   ```

### Step 2: Deploy Backend to Render.com

1. **Create Web Service**
   ```
   Render Dashboard → New → Web Service
   ```

2. **Connect Repository**
   ```
   Connect your GitHub repository
   Repository: your-username/textile-printing-system
   Branch: main
   ```

3. **Configure Service**
   ```
   Name: textile-printing-api
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. **Set Environment Variables**
   ```
   DATABASE_URL = postgresql://admin:password@host:port/textile_printing_db
   SECRET_KEY = your-generated-secret-key
   ENVIRONMENT = production
   DEBUG = false
   FRONTEND_URL = https://your-app.netlify.app
   ```

5. **Advanced Settings**
   ```
   Root Directory: backend
   Auto Deploy: Yes
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your API URL: `https://your-service.onrender.com`

### Step 3: Verify Backend Deployment

```bash
# Test API health
curl https://your-service.onrender.com/health

# Test API documentation
# Visit: https://your-service.onrender.com/docs

# Create admin user
python backend/init_admin.py
```

---

## 🎨 Phase 3: Frontend Deployment

### Step 1: Configure Frontend

1. **Update Environment Variables**
   ```bash
   # frontend/.env
   REACT_APP_API_URL=https://your-service.onrender.com
   REACT_APP_ENVIRONMENT=production
   ```

2. **Update Netlify Configuration**
   ```toml
   # netlify.toml
   [build]
     base = "frontend"
     publish = "frontend/build"
     command = "npm ci && npm run build"

   [build.environment]
     REACT_APP_API_URL = "https://your-service.onrender.com"
     REACT_APP_ENVIRONMENT = "production"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Test Local Build**
   ```bash
   cd frontend
   npm run build
   # Verify build/static contains optimized files
   ```

### Step 2: Deploy to Netlify

#### Option A: Git-based Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production deployment configuration"
   git push origin main
   ```

2. **Create Netlify Site**
   ```
   Netlify Dashboard → New site from Git
   ```

3. **Configure Build**
   ```
   Repository: your-username/textile-printing-system
   Branch: main
   Base directory: frontend
   Build command: npm ci && npm run build
   Publish directory: frontend/build
   ```

4. **Set Environment Variables**
   ```
   REACT_APP_API_URL = https://your-service.onrender.com
   REACT_APP_ENVIRONMENT = production
   ```

5. **Deploy**
   - Click "Deploy site"
   - Wait for build (3-5 minutes)
   - Note your URL: `https://your-site.netlify.app`

#### Option B: Manual Deployment

```bash
# Build locally
cd frontend
npm ci && npm run build

# Deploy via Netlify CLI
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

### Step 3: Update CORS Configuration

```bash
# Update backend environment variable
# Render Dashboard → your-service → Environment
FRONTEND_URL = https://your-site.netlify.app

# Trigger redeploy
# Render Dashboard → your-service → Manual Deploy
```

---

## ✅ Phase 4: Post-Deployment Verification

### Backend Health Checks

```bash
# API Health
curl https://your-service.onrender.com/health
# Expected: {"status": "healthy", "timestamp": "..."}

# API Documentation
curl https://your-service.onrender.com/docs
# Should return HTML

# Database Connection
curl https://your-service.onrender.com/api/auth/users
# Should return 401 (authentication required)
```

### Frontend Verification

```bash
# Site Accessibility
curl -I https://your-site.netlify.app
# Expected: HTTP/2 200

# API Integration Test
# Visit: https://your-site.netlify.app
# Try login with admin credentials
```

### Full Integration Test

1. **Login Test**
   - Visit `https://your-site.netlify.app`
   - Login with admin credentials
   - Verify dashboard loads

2. **Customer Management Test**
   - Navigate to Customers
   - Create a test customer
   - Verify API calls succeed

3. **Cross-Origin Test**
   - Open browser DevTools
   - Check Network tab for CORS errors
   - Verify all API calls return 200

---

## 🔄 Phase 5: Rollback Procedures

### Backend Rollback

1. **Via Git**
   ```bash
   # Revert to previous commit
   git log --oneline -10
   git revert <commit-hash>
   git push origin main
   # Render auto-deploys
   ```

2. **Manual Rollback**
   ```
   Render Dashboard → your-service → Settings
   → Previous Deploys → Restore
   ```

### Frontend Rollback

1. **Via Netlify**
   ```
   Netlify Dashboard → your-site → Deploys
   → Click previous deploy → Publish deploy
   ```

2. **Via Git**
   ```bash
   git revert <commit-hash>
   git push origin main
   # Netlify auto-deploys
   ```

### Database Rollback

```bash
# Connect to database
psql "postgresql://admin:password@host:port/textile_printing_db"

# Restore from backup
\i backup_file.sql

# Or manual data restore
DELETE FROM table_name WHERE condition;
INSERT INTO table_name (...) VALUES (...);
```

---

## 📊 Monitoring & Maintenance

### Application Monitoring

1. **Render.com Monitoring**
   ```
   Dashboard → Service → Metrics
   - CPU Usage
   - Memory Usage
   - Response Times
   - Error Rates
   ```

2. **Netlify Monitoring**
   ```
   Dashboard → Site → Analytics
   - Page Views
   - Unique Visitors
   - Build Performance
   ```

### Health Check Endpoints

```bash
# Backend Health
curl https://your-service.onrender.com/health

# Database Health
curl https://your-service.onrender.com/api/health/db

# Frontend Health
curl -I https://your-site.netlify.app
```

### Log Monitoring

```bash
# Render Logs
# Dashboard → Service → Logs (real-time)

# Download logs
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/$SERVICE_ID/logs
```

### Backup Procedures

```bash
# Database Backup
pg_dump "postgresql://admin:password@host:port/textile_printing_db" > backup.sql

# Schedule weekly backups
# Render Dashboard → Service → Cron Jobs
0 2 * * 0 pg_dump $DATABASE_URL > /tmp/backup_$(date +%Y%m%d).sql
```

---

## 🔧 Troubleshooting

### Common Issues

1. **Backend Won't Start**
   ```bash
   # Check environment variables
   # Render Dashboard → Service → Environment
   
   # Check build logs
   # Dashboard → Service → Logs
   
   # Common fixes:
   # - Verify DATABASE_URL format
   # - Check SECRET_KEY length
   # - Verify requirements.txt
   ```

2. **CORS Errors**
   ```bash
   # Update CORS origins
   FRONTEND_URL=https://your-site.netlify.app
   
   # Check browser console
   # Look for "blocked by CORS policy"
   
   # Verify preflight requests
   curl -X OPTIONS https://your-service.onrender.com/api/auth/login
   ```

3. **Frontend Build Fails**
   ```bash
   # Check build logs
   # Netlify Dashboard → Site → Deploys
   
   # Common fixes:
   # - Update Node.js version
   # - Clear npm cache: npm ci
   # - Check environment variables
   ```

4. **Database Connection Issues**
   ```bash
   # Test connection
   psql "postgresql://admin:password@host:port/textile_printing_db"
   
   # Common fixes:
   # - Check connection limits
   # - Verify SSL requirements
   # - Update connection string format
   ```

### Performance Optimization

1. **Backend Optimization**
   ```python
   # Enable connection pooling
   # backend/app/core/database.py
   engine = create_engine(
       DATABASE_URL,
       pool_size=5,
       max_overflow=10,
       pool_timeout=30
   )
   ```

2. **Frontend Optimization**
   ```bash
   # Analyze bundle size
   cd frontend
   npm run build
   npx webpack-bundle-analyzer build/static/js/*.js
   
   # Enable compression
   # Netlify automatically enables gzip
   ```

---

## 🎯 Success Checklist

- [ ] **Database deployed** and accessible
- [ ] **Backend API deployed** and responding
- [ ] **Frontend deployed** and loading
- [ ] **Authentication working** end-to-end
- [ ] **CORS configured** correctly
- [ ] **Environment variables** set properly
- [ ] **SSL certificates** active (automatic)
- [ ] **Custom domains** configured (optional)
- [ ] **Monitoring** enabled
- [ ] **Backup strategy** implemented

---

## 🚀 Go Live

### Final Steps

1. **Domain Configuration** (Optional)
   ```
   # Netlify: Site settings → Domain management
   # Add custom domain: yourdomain.com
   
   # DNS Configuration:
   CNAME @ your-site.netlify.app
   ```

2. **SSL Certificate**
   ```
   # Automatic via Let's Encrypt
   # Netlify: Site settings → HTTPS
   # Force HTTPS: Enabled
   ```

3. **Performance Testing**
   ```bash
   # Load testing
   curl -w "@curl-format.txt" -s -o /dev/null https://your-site.netlify.app
   
   # Lighthouse audit
   npx lighthouse https://your-site.netlify.app --view
   ```

### Post-Launch Monitoring

- **Week 1**: Daily monitoring for errors
- **Week 2-4**: Weekly performance reviews
- **Monthly**: Security updates and dependency reviews

---

## 📞 Support Resources

- **Render.com Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **React Docs**: https://react.dev

### Emergency Contacts

- **Backend Issues**: Check Render status page
- **Frontend Issues**: Check Netlify status page
- **Database Issues**: Monitor Render database metrics

---

## 🎉 Congratulations!

Your **Digital Textile Printing System** is now live in production!

**Live URLs:**
- Frontend: `https://your-site.netlify.app`
- Backend API: `https://your-service.onrender.com`
- API Docs: `https://your-service.onrender.com/docs`

**Next Steps:**
1. Train your employees on the new system
2. Start recording daily transactions
3. Monitor performance and user feedback
4. Plan feature enhancements

**Your business is now digitally transformed! 🚀** 