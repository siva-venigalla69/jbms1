# 🌐 Frontend Testing Guide

## 🚀 Quick Start Testing

### Method 1: Using the Test Login Page

**Open the test file:**
```bash
# Navigate to frontend directory
cd frontend
# Open test-login.html in browser
open test-login.html
# OR serve it locally
python -m http.server 8080
# Then visit: http://localhost:8080/test-login.html
```

**What it tests:**
- ✅ Login functionality
- ✅ JWT token handling
- ✅ `/api/auth/me` endpoint
- ✅ CORS configuration

### Method 2: Full React Application

**Start the frontend application:**
```bash
cd frontend
npm install
npm start
```

**Visit:** `http://localhost:3000`

## 📋 FRONTEND TESTING CHECKLIST

### 🔐 Authentication Tests

**Login Page (`/login`):**
- [ ] **Valid Login:**
  - Username: `admin`
  - Password: `<YOUR_SECURE_PASSWORD>`
  - Expected: Redirect to dashboard

- [ ] **Invalid Login:**
  - Try wrong password
  - Expected: Error message displayed

- [ ] **Form Validation:**
  - Empty username/password
  - Expected: Validation errors

- [ ] **Token Persistence:**
  - Login → Refresh page
  - Expected: Stay logged in

**Logout:**
- [ ] Click logout
- [ ] Expected: Redirect to login, token cleared

### 📊 Dashboard Tests

**Dashboard Page (`/dashboard`):**
- [ ] **Data Loading:**
  - Check if widgets load data
  - Expected: No "loading" states stuck

- [ ] **API Calls:**
  - Open DevTools → Network tab
  - Expected: Successful API calls (200 status)

- [ ] **Error Handling:**
  - Expected: Graceful error messages if APIs fail

### 👥 Customer Management Tests

**Customer List (`/customers`):**
- [ ] **List Customers:**
  - Expected: Display customer list
  - Check pagination works

- [ ] **Search Customers:**
  - Try searching by name
  - Expected: Filtered results

- [ ] **Add Customer:**
  - Click "Add Customer"
  - Fill form and submit
  - Expected: New customer appears in list

- [ ] **Edit Customer:**
  - Click edit on existing customer
  - Modify data and save
  - Expected: Changes reflected

### 📦 Inventory Tests

**Inventory Page (`/inventory`):**
- [ ] **List Items:**
  - Expected: Display inventory items
  - Check sorting/filtering

- [ ] **Add Item:**
  - Create new inventory item
  - Expected: Item appears in list

- [ ] **Stock Adjustment:**
  - Adjust stock quantities
  - Expected: Stock levels update

### 📋 Orders Tests

**Orders Page (`/orders`):**
- [ ] **List Orders:**
  - Expected: Display orders with status

- [ ] **Create Order:**
  - Add new order
  - Expected: Order created successfully

- [ ] **Order Details:**
  - View order details
  - Expected: Complete order information

### 🧵 Materials Tests

**Materials Page (`/materials`):**
- [ ] **Material In:**
  - Record material receipt
  - Expected: Material added to inventory

- [ ] **Material Out:**
  - Record material usage
  - Expected: Material deducted from inventory

### 📊 Reports Tests

**Reports Page (`/reports`):**
- [ ] **Pending Orders:**
  - Expected: Display pending orders

- [ ] **Stock Holdings:**
  - Expected: Current stock status

- [ ] **Production Status:**
  - Expected: Production progress

## 🛠️ Development Testing Tools

### Browser DevTools Testing

**Console Tab:**
```javascript
// Test API connectivity
fetch('/api/health')
  .then(r => r.json())
  .then(d => console.log('Health:', d))

// Test authentication
localStorage.getItem('access_token')

// Test API with token
fetch('/api/customers', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(d => console.log('Customers:', d))
```

**Network Tab:**
- Monitor API calls
- Check response times
- Verify correct status codes
- Check CORS headers

**Application Tab:**
- Check localStorage for tokens
- Verify session persistence

### React DevTools

**Install Extension:**
- Chrome: React Developer Tools
- Firefox: React Developer Tools

**What to check:**
- Component state
- Props passing
- Context values
- Performance profiling

## 🐛 TROUBLESHOOTING

### Common Issues

**CORS Errors:**
```
Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Solution:** Check backend CORS configuration

**Authentication Errors:**
```
401 Unauthorized
```
**Solution:** Check token in localStorage, try re-login

**Network Errors:**
```
Failed to fetch
```
**Solution:** Check if backend is running

### Debug Commands

**Check backend status:**
```bash
curl http://localhost:8000/health
```

**Check authentication:**
```bash
curl -POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=YOUR_PASSWORD"
```

**Test API with token:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/customers
```

## 📱 MOBILE TESTING

**Responsive Design:**
- [ ] Test on mobile devices
- [ ] Check tablet view
- [ ] Verify touch interactions

**Tools:**
- Chrome DevTools Device Mode
- Real devices
- BrowserStack/Sauce Labs

## ⚡ PERFORMANCE TESTING

**Metrics to check:**
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] No memory leaks
- [ ] Smooth scrolling/animations

**Tools:**
- Chrome Lighthouse
- WebPageTest
- React Profiler

## 🧪 AUTOMATED TESTING

**Run test suite:**
```bash
cd frontend
npm test
```

**E2E Testing:**
```bash
# If Cypress is configured
npm run cypress:open
```

## 📊 PRODUCTION TESTING

**Before deploying:**
- [ ] All manual tests pass
- [ ] Automated tests pass
- [ ] Performance is acceptable
- [ ] Mobile experience is good
- [ ] Error handling works properly

**After deploying:**
- [ ] Test on actual production URL
- [ ] Verify with real data
- [ ] Check all major user flows
- [ ] Monitor for errors in production logs 