# 🔌 API Documentation

> ⚠️ **OUTDATED**: This documentation is for the old FastAPI backend. 
> 
> **For the current Supabase stack**, please use: [API_DOCUMENTATION_SUPABASE.md](API_DOCUMENTATION_SUPABASE.md)
>
> The new API is **auto-generated**, **real-time**, and **easier to use**!

---

## Legacy Documentation: FastAPI Backend

Complete API reference for the Digital Textile Printing Management System with authentication, endpoints, and examples.

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Customer API](#customer-api)
6. [Order Management API](#order-management-api)
7. [Material Management API](#material-management-api)
8. [Invoice & Payment API](#invoice--payment-api)
9. [Reporting API](#reporting-api)
10. [Admin & User Management API](#admin--user-management-api)

## 🌐 API Overview

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://your-service.onrender.com`

### API Version
- **Current Version**: `v1`
- **Base Path**: `/api`

### Content Type
- **Request**: `application/json`
- **Response**: `application/json`

### Response Format
All API responses follow a consistent format:

```json
{
  "data": {}, // Response data
  "status": "success", // success or error
  "message": "Operation completed successfully"
}
```

Error responses:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {},
    "request_id": "req_123456",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

## 🔐 Authentication

### JWT Token Authentication

All protected endpoints require a Bearer token in the Authorization header.

#### Login
```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=your_password
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### Using the Token
```http
GET /api/customers/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "user-uuid",
  "username": "admin",
  "email": "admin@example.com",
  "full_name": "Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Role-Based Access Control

- **admin**: Full system access
- **manager**: All operations except user management
- **employee**: Limited to assigned tasks and basic operations

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "validation_errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "type": "value_error.email"
        }
      ]
    },
    "request_id": "req_123456",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

## 🚦 Rate Limiting

- **Enabled**: Production environments
- **Limit**: 100 requests per hour per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

When rate limit is exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "retry_after": 3600
    }
  }
}
```

## 👥 Customer API

### List Customers
```http
GET /api/customers/
Authorization: Bearer {token}

Query Parameters:
- skip: int = 0 (pagination offset)
- limit: int = 20 (max 100)
- search: string (search by name, phone, email)
```

**Response:**
```json
[
  {
    "id": "customer-uuid",
    "name": "Customer Name",
    "phone": "1234567890",
    "email": "customer@example.com",
    "address": "Customer Address",
    "gst_number": "22AAAAA0000A1Z5",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

### Create Customer
```http
POST /api/customers/
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Customer",
  "phone": "9876543210",
  "email": "new@example.com",
  "address": "New Address",
  "gst_number": "22BBBBB0000B1Z5"
}
```

**Validation Rules:**
- `name`: Required, 2-255 characters
- `phone`: Optional, 10-15 digits, unique
- `email`: Optional, valid email format, unique
- `gst_number`: Optional, valid GST format
- `address`: Optional, max 500 characters

### Get Customer
```http
GET /api/customers/{customer_id}
Authorization: Bearer {token}

Query Parameters:
- include_stats: boolean = false (include order statistics)
```

### Update Customer
```http
PUT /api/customers/{customer_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Customer Name",
  "address": "Updated Address"
}
```

### Delete Customer
```http
DELETE /api/customers/{customer_id}
Authorization: Bearer {token}

Query Parameters:
- force: boolean = false (force delete even with existing orders)
```

### Search Customers
```http
GET /api/customers/search
Authorization: Bearer {token}

Query Parameters:
- q: string (required, search query)
- limit: int = 10 (max 50)
```

**Response:**
```json
{
  "query": "search term",
  "count": 5,
  "results": [
    {
      "id": "customer-uuid",
      "name": "Customer Name",
      "phone": "1234567890",
      "email": "customer@example.com"
    }
  ]
}
```

### Get Customer Orders
```http
GET /api/customers/{customer_id}/orders
Authorization: Bearer {token}

Query Parameters:
- skip: int = 0
- limit: int = 20
```

## 📦 Order Management API

### List Orders
```http
GET /api/orders/
Authorization: Bearer {token}

Query Parameters:
- skip: int = 0
- limit: int = 20
- status: string (pending, in_progress, completed, cancelled)
- customer_id: uuid
- date_from: date (YYYY-MM-DD)
- date_to: date (YYYY-MM-DD)
```

### Create Order
```http
POST /api/orders/
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "customer-uuid",
  "notes": "Special instructions",
  "order_items": [
    {
      "material_type": "saree",
      "quantity": 2,
      "unit_price": 500.00,
      "customization_details": "Red color with golden border"
    }
  ]
}
```

**Material Types:**
- `saree`
- `dupatta` 
- `voni`
- `running_material`
- `blouse_material`

### Get Order
```http
GET /api/orders/{order_id}
Authorization: Bearer {token}
```

### Update Order Status
```http
PATCH /api/orders/{order_id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Started processing"
}
```

### Update Order Item Production Stage
```http
PATCH /api/orders/{order_id}/items/{item_id}/stage
Authorization: Bearer {token}
Content-Type: application/json

{
  "production_stage": "printing",
  "notes": "Moved to printing stage"
}
```

**Production Stages:**
- `pre_treatment`
- `printing`
- `post_process`

## 📦 Material Management API

### Record Material In
```http
POST /api/materials/in
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "customer-uuid",
  "order_id": "order-uuid", // optional
  "material_type": "saree",
  "quantity": 5,
  "unit": "pieces",
  "notes": "Received from customer"
}
```

### Record Material Out
```http
POST /api/materials/out
Authorization: Bearer {token}
Content-Type: application/json

{
  "challan_id": "challan-uuid",
  "customer_id": "customer-uuid",
  "material_type": "saree",
  "quantity": 3,
  "unit": "pieces",
  "notes": "Dispatched to customer"
}
```

### List Material Movements
```http
GET /api/materials/movements
Authorization: Bearer {token}

Query Parameters:
- type: string (in, out)
- customer_id: uuid
- date_from: date
- date_to: date
- material_type: string
```

## 📋 Delivery Challan API

### Create Delivery Challan
```http
POST /api/challans/
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "customer-uuid",
  "notes": "Delivery notes",
  "challan_items": [
    {
      "order_item_id": "item-uuid",
      "quantity": 2
    }
  ]
}
```

### List Challans
```http
GET /api/challans/
Authorization: Bearer {token}

Query Parameters:
- skip: int = 0
- limit: int = 20
- customer_id: uuid
- is_delivered: boolean
- date_from: date
- date_to: date
```

### Mark Challan as Delivered
```http
PATCH /api/challans/{challan_id}/deliver
Authorization: Bearer {token}
Content-Type: application/json

{
  "delivered_at": "2025-01-01T12:00:00Z",
  "notes": "Delivered successfully"
}
```

## 💰 Invoice & Payment API

### Create Invoice
```http
POST /api/invoices/
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "customer-uuid",
  "challan_ids": ["challan-uuid1", "challan-uuid2"],
  "cgst_rate": 9.00,
  "sgst_rate": 9.00,
  "igst_rate": 0.00,
  "notes": "Invoice notes"
}
```

### List Invoices
```http
GET /api/invoices/
Authorization: Bearer {token}

Query Parameters:
- skip: int = 0
- limit: int = 20
- customer_id: uuid
- status: string (paid, partial, outstanding)
- date_from: date
- date_to: date
```

### Record Payment
```http
POST /api/payments/
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoice_id": "invoice-uuid",
  "amount": 1000.00,
  "payment_method": "upi",
  "reference_number": "TXN123456",
  "notes": "Payment received"
}
```

**Payment Methods:**
- `cash`
- `upi`
- `bank_transfer`
- `cheque`

## 📊 Reporting API

### Pending Orders Report
```http
GET /api/reports/pending-orders
Authorization: Bearer {token}

Query Parameters:
- date_from: date
- date_to: date
- customer_id: uuid
```

### Production Status Report
```http
GET /api/reports/production-status
Authorization: Bearer {token}

Query Parameters:
- stage: string (pre_treatment, printing, post_process)
```

### Outstanding Receivables Report
```http
GET /api/reports/outstanding-receivables
Authorization: Bearer {token}

Query Parameters:
- customer_id: uuid
- days_outstanding: int (minimum days)
```

### Material Flow Report
```http
GET /api/reports/material-flow
Authorization: Bearer {token}

Query Parameters:
- date_from: date (required)
- date_to: date (required)
- material_type: string
- customer_id: uuid
```

### Financial Summary Report
```http
GET /api/reports/financial-summary
Authorization: Bearer {token}

Query Parameters:
- date_from: date (required)
- date_to: date (required)
- include_details: boolean = false
```

## 👤 Admin & User Management API

### List Users (Admin Only)
```http
GET /api/users/
Authorization: Bearer {token}
```

### Create User (Admin Only)
```http
POST /api/users/
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "full_name": "New User",
  "password": "SecurePassword123!",
  "role": "employee"
}
```

### Update User Role (Admin Only)
```http
PATCH /api/users/{user_id}/role
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "manager"
}
```

### Deactivate User (Admin Only)
```http
PATCH /api/users/{user_id}/deactivate
Authorization: Bearer {token}
```

## 🏥 Health & Monitoring API

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1640995200.0,
  "environment": "production",
  "version": "2.0.0"
}
```

### Database Health Check
```http
GET /health/db
```

### Version Information
```http
GET /version
```

### Debug Enum Check (Development Only)
```http
GET /debug/enum-check
```

## 📝 Request/Response Examples

### Complete Customer Workflow Example

```bash
# 1. Login
LOGIN_RESPONSE=$(curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r .access_token)

# 2. Create Customer
CUSTOMER_RESPONSE=$(curl -X POST "http://localhost:8000/api/customers/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Example Customer",
    "phone": "9999999999",
    "email": "api@example.com",
    "address": "123 API Street",
    "gst_number": "22AAAAA0000A1Z5"
  }')

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | jq -r .id)

# 3. Create Order
ORDER_RESPONSE=$(curl -X POST "http://localhost:8000/api/orders/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"notes\": \"API test order\",
    \"order_items\": [
      {
        \"material_type\": \"saree\",
        \"quantity\": 2,
        \"unit_price\": 750.00,
        \"customization_details\": \"Blue with silver border\"
      }
    ]
  }")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r .id)

# 4. Record Material In
curl -X POST "http://localhost:8000/api/materials/in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"order_id\": \"$ORDER_ID\",
    \"material_type\": \"saree\",
    \"quantity\": 2,
    \"unit\": \"pieces\",
    \"notes\": \"Material received for API test order\"
  }"

# 5. Update Production Stage
ORDER_ITEM_ID=$(echo $ORDER_RESPONSE | jq -r .order_items[0].id)

curl -X PATCH "http://localhost:8000/api/orders/$ORDER_ID/items/$ORDER_ITEM_ID/stage" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "production_stage": "printing",
    "notes": "Moved to printing stage"
  }'

# 6. Create Delivery Challan
CHALLAN_RESPONSE=$(curl -X POST "http://localhost:8000/api/challans/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"notes\": \"API test delivery\",
    \"challan_items\": [
      {
        \"order_item_id\": \"$ORDER_ITEM_ID\",
        \"quantity\": 2
      }
    ]
  }")

CHALLAN_ID=$(echo $CHALLAN_RESPONSE | jq -r .id)

# 7. Create Invoice
INVOICE_RESPONSE=$(curl -X POST "http://localhost:8000/api/invoices/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"challan_ids\": [\"$CHALLAN_ID\"],
    \"cgst_rate\": 9.00,
    \"sgst_rate\": 9.00,
    \"notes\": \"API test invoice\"
  }")

INVOICE_ID=$(echo $INVOICE_RESPONSE | jq -r .id)

# 8. Record Payment
curl -X POST "http://localhost:8000/api/payments/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"invoice_id\": \"$INVOICE_ID\",
    \"amount\": 1500.00,
    \"payment_method\": \"upi\",
    \"reference_number\": \"API123456\",
    \"notes\": \"API test payment\"
  }"

echo "✅ Complete workflow example completed successfully!"
```

## 📚 SDK Examples

### Python SDK Example
```python
import requests
import json

class TextileAPI:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.token = self._login(username, password)
    
    def _login(self, username, password):
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            data={"username": username, "password": password}
        )
        return response.json()["access_token"]
    
    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"}
    
    def create_customer(self, customer_data):
        response = requests.post(
            f"{self.base_url}/api/customers/",
            json=customer_data,
            headers=self._headers()
        )
        return response.json()
    
    def get_customers(self, search=None, limit=20):
        params = {"limit": limit}
        if search:
            params["search"] = search
        
        response = requests.get(
            f"{self.base_url}/api/customers/",
            params=params,
            headers=self._headers()
        )
        return response.json()

# Usage
api = TextileAPI("http://localhost:8000", "admin", "admin123")

# Create customer
customer = api.create_customer({
    "name": "Python SDK Customer",
    "phone": "8888888888",
    "email": "python@sdk.com"
})

# Get customers
customers = api.get_customers(search="Python")
print(f"Found {len(customers)} customers")
```

### JavaScript SDK Example
```javascript
class TextileAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.token = null;
    }

    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${username}&password=${password}`
        });
        
        const data = await response.json();
        this.token = data.access_token;
        return data;
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    async createCustomer(customerData) {
        const response = await fetch(`${this.baseUrl}/api/customers/`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(customerData)
        });
        
        return await response.json();
    }

    async getCustomers(search = null, limit = 20) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (search) params.append('search', search);

        const response = await fetch(
            `${this.baseUrl}/api/customers/?${params}`,
            { headers: this.getHeaders() }
        );
        
        return await response.json();
    }
}

// Usage
const api = new TextileAPI('http://localhost:8000');

// Login and use
api.login('admin', 'admin123').then(async () => {
    // Create customer
    const customer = await api.createCustomer({
        name: 'JavaScript SDK Customer',
        phone: '7777777777',
        email: 'js@sdk.com'
    });
    
    // Get customers
    const customers = await api.getCustomers('JavaScript');
    console.log(`Found ${customers.length} customers`);
});
```

## 📖 OpenAPI Documentation

The API also provides interactive documentation at:
- **Development**: `http://localhost:8000/docs`
- **Production**: `https://your-service.onrender.com/docs` (if DEBUG=true)

Alternative documentation format:
- **ReDoc**: `http://localhost:8000/redoc`

## 🔧 Testing the API

### Using curl
```bash
# Test script for all major endpoints
bash test_api_endpoints.sh
```

### Using Postman
Import the OpenAPI specification from `/openapi.json` into Postman for a complete collection.

### Using pytest
```bash
cd backend
python -m pytest tests/test_customer_api.py -v
```

---

**📘 This API documentation covers all available endpoints. For implementation examples and testing procedures, refer to the [Testing Guide](TESTING_GUIDE.md).**