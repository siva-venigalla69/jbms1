# 💻 **Complete Command Line API Testing Guide**

**Digital Textile Printing System - CLI Testing Options**

---

## 🚀 **Available Command Line Methods**

### **Method 1: Custom Node.js Script (Recommended)**
```bash
# Test random APIs with formatted output
npm run test:random

# Run comprehensive test suite
npm run test:fixed

# Test specific authentication
npm run test:auth
```

### **Method 2: Custom Bash Script**
```bash
# Test specific endpoint
./cli_api_test.sh customers
./cli_api_test.sh orders
./cli_api_test.sh production
./cli_api_test.sh invoices

# Create test data
./cli_api_test.sh create-customer

# Run random tests
./cli_api_test.sh random

# Get help
./cli_api_test.sh help
```

### **Method 3: Raw cURL Commands**
```bash
# Setup environment
export SUPABASE_URL="https://pvatfzwzfgioypdnqjay.supabase.co"
export SUPABASE_ANON_KEY="your_key_here"

# Get auth token
AUTH_TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"shiva.venigalla@gmail.com","password":"Admin@123!"}' \
  | jq -r '.access_token')

# Test any endpoint
curl -H "apikey: ${SUPABASE_ANON_KEY}" \
     -H "Authorization: Bearer ${AUTH_TOKEN}" \
     "${SUPABASE_URL}/rest/v1/customers?limit=3"
```

---

## 🎯 **Quick Start - Choose Your Preferred Method**

### **🏆 Option 1: Node.js (Best Experience)**
```bash
# One command to test everything
npm run test:random
```
**✅ Pros:** Formatted output, error handling, comprehensive testing
**📊 Output:** Clean, colored, structured results

### **🛠 Option 2: Bash Script (Most Flexible)**
```bash
# Test specific APIs
./cli_api_test.sh customers
./cli_api_test.sh orders
./cli_api_test.sh create-customer
```
**✅ Pros:** Individual endpoint testing, quick iterations
**📊 Output:** HTTP responses with authentication

### **⚡ Option 3: Raw cURL (Maximum Control)**
```bash
# Direct HTTP requests
curl -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $TOKEN" \
     "$URL/rest/v1/customers"
```
**✅ Pros:** Full HTTP control, scriptable, industry standard
**📊 Output:** Raw JSON responses

---

## 📋 **Command Reference**

### **Node.js Commands**
| Command | Purpose | Output |
|---------|---------|---------|
| `npm run test:random` | Test 5 random APIs | Formatted summary |
| `npm run test:fixed` | Full test suite (25 tests) | Complete report |
| `npm run test:auth` | Authentication only | Login verification |
| `npm run test:api` | Basic API tests | Core functionality |

### **Bash Script Commands**
| Command | Purpose | API Endpoint |
|---------|---------|--------------|
| `./cli_api_test.sh customers` | Customer management | GET /customers |
| `./cli_api_test.sh orders` | Order listing | GET /orders |
| `./cli_api_test.sh production` | Production items | GET /order_items |
| `./cli_api_test.sh invoices` | GST invoices | GET /gst_invoices |
| `./cli_api_test.sh payments` | Payment records | GET /payments |
| `./cli_api_test.sh create-customer` | Create customer | POST /customers |
| `./cli_api_test.sh random` | Random selection | Multiple |

### **cURL Examples**
```bash
# Authentication
curl -X POST $URL/auth/v1/token?grant_type=password \
  -H "apikey: $KEY" -d '{"email":"user@example.com","password":"pass"}'

# Get customers
curl -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
  $URL/rest/v1/customers?limit=5

# Create customer
curl -X POST $URL/rest/v1/customers \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"1234567890"}'

# Complex query with joins
curl -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
  "$URL/rest/v1/orders?select=*,customers(name),order_items(*)"
```

---

## 🧪 **Testing Scenarios**

### **🎲 Random API Testing (Quick Validation)**
```bash
# Test 1: Node.js random tester
npm run test:random

# Test 2: Bash random tester  
./cli_api_test.sh random

# Test 3: Manual cURL random
curl -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
  "$URL/rest/v1/customers?limit=3"
```

### **🔍 Specific API Testing**
```bash
# Customer APIs
./cli_api_test.sh customers           # List customers
./cli_api_test.sh create-customer     # Create customer

# Order APIs
./cli_api_test.sh orders              # List orders
./cli_api_test.sh production          # Production status

# Financial APIs
./cli_api_test.sh invoices            # GST invoices
./cli_api_test.sh payments            # Payment records
```

### **🚀 Performance Testing**
```bash
# Comprehensive performance test
npm run test:performance

# Quick performance check
time ./cli_api_test.sh random
```

---

## 📊 **Expected Results**

### **✅ Success Indicators**
- HTTP 200/201 status codes
- JSON responses with data
- No authentication errors
- Proper data relationships

### **🎯 Sample Successful Output**
```bash
$ npm run test:random

🧪 CLI Random API Tester
========================

🔐 Testing Authentication...
✅ Authentication successful

👥 Testing Customer API...
✅ Retrieved 3 customers
   📍 Test Customer 1 - 9876543210
   📍 Test Customer 2 - 9876543211

📦 Testing Order API...
✅ Retrieved 2 orders
   📋 ORD-001 - Customer Name - 2 items

🎉 Random API testing complete!
```

---

## 🛠 **Setup Requirements**

### **Prerequisites**
```bash
# Required for Node.js testing
npm install

# Required for enhanced cURL (optional)
# Ubuntu/Debian: sudo apt install jq
# macOS: brew install jq

# Make bash script executable
chmod +x cli_api_test.sh
```

### **Environment Setup**
```bash
# Option 1: Use existing environment file
cp frontend/.env.template frontend/.env.local
# Edit with your credentials

# Option 2: Export variables directly
export SUPABASE_URL="https://pvatfzwzfgioypdnqjay.supabase.co"
export SUPABASE_ANON_KEY="your_anon_key_here"
```

---

## 🎯 **Recommended Testing Workflow**

### **Phase 1: Quick Validation (2 minutes)**
```bash
# Test random APIs to verify system is working
npm run test:random
```

### **Phase 2: Specific Testing (5 minutes)**
```bash
# Test each major feature area
./cli_api_test.sh customers
./cli_api_test.sh orders
./cli_api_test.sh production
./cli_api_test.sh invoices
```

### **Phase 3: Comprehensive Testing (3 minutes)**
```bash
# Full test suite with performance metrics
npm run test:fixed
```

---

## 💡 **Pro Tips**

### **🚀 Speed Tips**
- Use `npm run test:random` for fastest validation
- Use `./cli_api_test.sh [endpoint]` for specific testing
- Use `npm run test:fixed` for comprehensive validation

### **🔧 Debugging Tips**
- Check authentication first if APIs fail
- Verify environment variables are set
- Use `curl -v` for verbose HTTP debugging
- Check API response for error messages

### **📊 Output Tips**
- Install `jq` for formatted JSON output
- Use `| head -20` to limit large responses
- Pipe output to files: `npm run test:random > results.txt`

---

## 🎉 **All Methods Ready!**

You now have **three powerful ways** to test your APIs from command line:

1. **🏆 `npm run test:random`** - Best overall experience
2. **🛠 `./cli_api_test.sh [endpoint]`** - Most flexible for specific testing  
3. **⚡ `curl` commands** - Maximum control and integration

**Choose the method that fits your workflow and start testing!** 🚀