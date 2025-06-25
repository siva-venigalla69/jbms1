# ⚡ Quick Start Guide - Cloud Development

## 🎯 For Low-Configuration Systems (WSL + Cursor AI)

This guide will get you up and running in the cloud within **15 minutes** with minimal local resource usage.

---

## 🚀 STEP 1: Initial Setup (2 minutes)

### 1.1 Git Repository Setup
```bash
# In your WSL terminal (should be in /home/siva-u/jbms1)
git init
git add .
git commit -m "Initial project setup"

# Create GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/jbms1-textile-printing.git
git push -u origin main
```

### 1.2 Account Creation (if not done already)
- **Render.com**: Sign up with GitHub
- **Netlify**: Sign up with GitHub

---

## 🗄️ STEP 2: Database Deployment (3 minutes)

### 2.1 Create PostgreSQL on Render
1. Go to [render.com](https://render.com) → Dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   ```
   Name: textile-printing-db
   Database: textile_printing_db
   User: textile_user
   Plan: Free
   Region: Oregon (US West)
   ```
4. Click **"Create Database"**
5. **SAVE** the connection details shown

### 2.2 Initialize Database Schema
```bash
# Install PostgreSQL client (one-time setup)
sudo apt update && sudo apt install postgresql-client -y

# Connect to your Render database (replace with your connection string)
psql "YOUR_RENDER_DATABASE_URL_HERE"

# In the psql prompt, run:
\i database/schema.sql

# Verify tables were created
\dt

# Exit
\q
```

---

## 🐍 STEP 3: Backend Deployment (5 minutes)

### 3.1 Deploy to Render
1. **Render Dashboard** → **"New +"** → **"Web Service"**
2. **Connect GitHub repository**
3. Configure:
   ```
   Name: textile-printing-api
   Region: Oregon (same as database)
   Branch: main
   Root Directory: backend
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   Plan: Free
   ```

4. **Environment Variables**:
   ```
   DATABASE_URL = [Link from database]
   SECRET_KEY = [Generate random 32-character string]
   ENVIRONMENT = production
   ```

5. Click **"Create Web Service"**

### 3.2 Verify Deployment
```bash
# Test your API (replace with your Render URL)
curl https://your-api-name.onrender.com/health
# Should return: {"status":"healthy","version":"1.0.0","environment":"production"}
```

---

## 🎨 STEP 4: Frontend Setup (5 minutes)

### 4.1 Create React App
```bash
# From project root
npx create-react-app frontend --template typescript
cd frontend

# Install Material-UI components
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install axios react-router-dom @types/react-router-dom
```

### 4.2 Deploy to Netlify

Create `netlify.toml` in project root:
```toml
[build]
  base = "frontend"
  publish = "frontend/build"
  command = "npm run build"

[build.environment]
  REACT_APP_API_URL = "https://your-api-name.onrender.com"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Deploy:
```bash
# From project root
git add .
git commit -m "Add frontend"
git push origin main
```

1. **Netlify Dashboard** → **"New site from Git"**
2. **Connect GitHub repo**
3. **Build settings**: Auto-detected
4. **Deploy site**

---

## ✅ STEP 5: Test Everything (2 minutes)

### 5.1 Test Backend API
```bash
# Health check
curl https://your-api.onrender.com/health

# API Documentation
# Visit: https://your-api.onrender.com/docs
```

### 5.2 Test Frontend
- Visit your Netlify URL: `https://your-site.netlify.app`
- Should see React app homepage

### 5.3 Test Database Connection
```bash
# Quick database test
psql "YOUR_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## 🔧 STEP 6: Development Workflow

### Daily Development Process:
1. **Edit code in Cursor AI** (no local servers needed!)
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **Wait 2-3 minutes** for auto-deployment
4. **Test on live URLs** immediately

### Environment URLs:
- **Backend API**: `https://your-api.onrender.com`
- **API Docs**: `https://your-api.onrender.com/docs`
- **Frontend**: `https://your-site.netlify.app`
- **Database**: Use connection string for direct access

---

## 🎯 Next Steps

Now you can start building features:

1. **Authentication System** ✅ (Already created)
2. **Customer Management** ✅ (Already created)
3. **Order Management** (Next to build)
4. **Production Tracking** (Next to build)
5. **Invoicing System** (Next to build)

### Key Commands for Cloud Development:
```bash
# Test API endpoint
curl -X GET https://your-api.onrender.com/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN"

# Database operations
psql "YOUR_DATABASE_URL" -c "SELECT * FROM customers LIMIT 5;"

# Deploy changes
git add . && git commit -m "Update" && git push origin main
```

---

## 🆘 Troubleshooting

### Backend Issues:
- **Logs**: Check Render dashboard → Your service → Logs
- **Cold starts**: First request may take 10-15 seconds
- **Environment vars**: Check in Render dashboard → Settings

### Frontend Issues:
- **Build logs**: Check Netlify dashboard → Your site → Deploys
- **API connection**: Check browser console for CORS errors

### Database Issues:
- **Connection**: Verify URL format in environment variables
- **Tables**: Run `\dt` to list tables

---

## 🎉 Congratulations!

You now have a **production-ready, cloud-hosted application** running for free! 

**Total Cost**: $0/month  
**Development Speed**: Code → Deploy → Test in < 3 minutes  
**Local Resources**: Minimal (just Cursor AI for editing) 