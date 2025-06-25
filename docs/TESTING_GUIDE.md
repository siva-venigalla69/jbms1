# Testing Guide - Digital Textile Printing System

This guide provides comprehensive testing strategies, test cases, and validation procedures for the Digital Textile Printing System.

## 📋 Testing Overview

### Testing Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                         │
├─────────────────────────────────────────────────────────────┤
│  E2E Tests (10%)     │  Business Workflow Testing         │
│  Integration (20%)   │  API + Database Testing            │
│  Unit Tests (70%)    │  Service Layer Testing             │
└─────────────────────────────────────────────────────────────┘
```

### Testing Types
1. **Unit Tests**: Individual function/service testing
2. **Integration Tests**: API endpoint and database testing
3. **End-to-End Tests**: Complete workflow testing
4. **Performance Tests**: Load and stress testing
5. **Security Tests**: Authentication and authorization testing
6. **User Acceptance Tests**: Business scenario validation

---

## 🧪 UNIT TESTING

### Backend Unit Tests

#### Test Setup
```bash
cd backend
pip install pytest pytest-asyncio httpx faker
pytest --version
```

#### Test Structure
```
backend/tests/
├── conftest.py                 # Test configuration
├── unit/
│   ├── test_customer_service.py
│   ├── test_order_service.py
│   ├── test_invoice_service.py
│   ├── test_payment_service.py
│   ├── test_inventory_service.py
│   ├── test_report_service.py
│   └── test_auth_service.py
├── integration/
│   ├── test_customer_api.py
│   ├── test_order_api.py
│   ├── test_invoice_api.py
│   └── test_reports_api.py
└── e2e/
    ├── test_order_workflow.py
    ├── test_invoice_workflow.py
    └── test_complete_business_flow.py
```

#### Sample Unit Test - Customer Service
```python
# tests/unit/test_customer_service.py
import pytest
from unittest.mock import Mock, patch
from app.services.customer_service import CustomerService
from app.schemas.customer import CustomerCreate, CustomerUpdate

class TestCustomerService:
    
    @pytest.fixture
    def customer_service(self):
        return CustomerService()
    
    @pytest.fixture
    def sample_customer_data(self):
        return {
            "name": "Test Customer",
            "phone": "9876543210",
            "email": "test@example.com",
            "address": "Test Address",
            "gst_number": "22AAAAA0000A1Z5"
        }
    
    def test_create_customer_success(self, customer_service, sample_customer_data):
        """Test successful customer creation"""
        with patch('app.services.customer_service.get_db') as mock_db:
            mock_session = Mock()
            mock_db.return_value = mock_session
            
            customer = customer_service.create_customer(
                CustomerCreate(**sample_customer_data),
                user_id="test-user-id"
            )
            
            assert customer.name == sample_customer_data["name"]
            assert customer.phone == sample_customer_data["phone"]
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()
    
    def test_create_customer_duplicate_phone(self, customer_service, sample_customer_data):
        """Test duplicate phone number prevention"""
        with patch('app.services.customer_service.get_db') as mock_db:
            mock_session = Mock()
            mock_db.return_value = mock_session
            mock_session.query.return_value.filter.return_value.first.return_value = Mock()
            
            with pytest.raises(ValueError, match="Phone number already exists"):
                customer_service.create_customer(
                    CustomerCreate(**sample_customer_data),
                    user_id="test-user-id"
                )
    
    def test_validate_gst_number_valid(self, customer_service):
        """Test GST number validation - valid format"""
        valid_gst = "22AAAAA0000A1Z5"
        assert customer_service.validate_gst_number(valid_gst) == True
    
    def test_validate_gst_number_invalid(self, customer_service):
        """Test GST number validation - invalid format"""
        invalid_gst = "INVALID_GST"
        assert customer_service.validate_gst_number(invalid_gst) == False
```

#### Sample Unit Test - Order Service
```python
# tests/unit/test_order_service.py
import pytest
from decimal import Decimal
from unittest.mock import Mock, patch
from app.services.order_service import OrderService
from app.schemas.order import OrderCreate, OrderItemCreate

class TestOrderService:
    
    @pytest.fixture
    def order_service(self):
        return OrderService()
    
    def test_calculate_order_total(self, order_service):
        """Test order total calculation"""
        order_items = [
            Mock(quantity=2, unit_price=Decimal('1500.00')),
            Mock(quantity=1, unit_price=Decimal('2000.00')),
            Mock(quantity=3, unit_price=Decimal('1200.00'))
        ]
        
        total = order_service.calculate_order_total(order_items)
        expected_total = Decimal('8600.00')  # (2*1500) + (1*2000) + (3*1200)
        
        assert total == expected_total
    
    def test_generate_order_number(self, order_service):
        """Test order number generation"""
        with patch('app.services.order_service.get_db') as mock_db:
            mock_session = Mock()
            mock_session.query.return_value.filter.return_value.count.return_value = 5
            mock_db.return_value = mock_session
            
            order_number = order_service.generate_order_number()
            
            assert order_number.startswith('ORD-2024-')
            assert order_number.endswith('0006')  # 5 + 1 = 6
    
    def test_update_production_stage_valid_transition(self, order_service):
        """Test valid production stage transition"""
        transitions = [
            ('pre_treatment', 'printing'),
            ('printing', 'post_process')
        ]
        
        for current, next_stage in transitions:
            assert order_service.is_valid_stage_transition(current, next_stage) == True
    
    def test_update_production_stage_invalid_transition(self, order_service):
        """Test invalid production stage transition"""
        invalid_transitions = [
            ('printing', 'pre_treatment'),  # Backward transition
            ('post_process', 'printing'),   # Backward transition
            ('pre_treatment', 'post_process')  # Skip stage
        ]
        
        for current, next_stage in invalid_transitions:
            assert order_service.is_valid_stage_transition(current, next_stage) == False
```

#### Running Unit Tests
```bash
# Run all unit tests
pytest tests/unit/ -v

# Run specific test file
pytest tests/unit/test_customer_service.py -v

# Run with coverage
pytest tests/unit/ --cov=app/services --cov-report=html

# Run tests matching pattern
pytest tests/unit/ -k "customer" -v
```

### Frontend Unit Tests

#### Test Setup
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm test
```

#### Sample Frontend Test
```javascript
// src/components/__tests__/CustomerForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomerForm from '../customers/CustomerForm';
import { AuthProvider } from '../../context/AuthContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}  
    </AuthProvider>
  );
};

describe('CustomerForm', () => {
  test('renders customer form fields', () => {
    renderWithProvider(<CustomerForm onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
  });
  
  test('validates required fields', async () => {
    const mockSubmit = jest.fn();
    renderWithProvider(<CustomerForm onSubmit={mockSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/customer name is required/i)).toBeInTheDocument();
    });
    
    expect(mockSubmit).not.toHaveBeenCalled();
  });
  
  test('submits form with valid data', async () => {
    const mockSubmit = jest.fn();
    renderWithProvider(<CustomerForm onSubmit={mockSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/customer name/i), 'Test Customer');
    await userEvent.type(screen.getByLabelText(/phone number/i), '9876543210');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Test Customer',
        phone: '9876543210',
        email: 'test@example.com',
        address: '',
        gst_number: ''
      });
    });
  });
});
```

---

## 🔗 INTEGRATION TESTING

### API Integration Tests

#### Database Test Setup
```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app
from fastapi.testclient import TestClient

# Test database URL
TEST_DATABASE_URL = "postgresql://test_user:test_pass@localhost:5432/test_textile_db"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(client):
    # Create test user and get auth token
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

#### Sample Integration Test
```python
# tests/integration/test_customer_api.py
import pytest
from fastapi.testclient import TestClient

class TestCustomerAPI:
    
    def test_create_customer_success(self, client: TestClient, auth_headers):
        """Test successful customer creation via API"""
        customer_data = {
            "name": "Integration Test Customer",
            "phone": "9876543210",
            "email": "integration@test.com",
            "address": "Test Address",
            "gst_number": "22AAAAA0000A1Z5"
        }
        
        response = client.post(
            "/api/v1/customers/", 
            json=customer_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == customer_data["name"]
        assert data["phone"] == customer_data["phone"]
        assert "id" in data
        assert "created_at" in data
    
    def test_get_customers_list(self, client: TestClient, auth_headers):
        """Test retrieving customers list"""
        # Create test customer first
        customer_data = {
            "name": "List Test Customer",
            "phone": "9876543211",
            "email": "list@test.com"
        }
        client.post("/api/v1/customers/", json=customer_data, headers=auth_headers)
        
        # Get customers list
        response = client.get("/api/v1/customers/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(customer["name"] == "List Test Customer" for customer in data)
    
    def test_create_customer_duplicate_phone(self, client: TestClient, auth_headers):
        """Test duplicate phone number prevention"""
        customer_data = {
            "name": "First Customer",
            "phone": "9876543212",
            "email": "first@test.com"
        }
        
        # Create first customer
        response1 = client.post("/api/v1/customers/", json=customer_data, headers=auth_headers)
        assert response1.status_code == 201
        
        # Try to create second customer with same phone
        duplicate_data = customer_data.copy()
        duplicate_data["name"] = "Second Customer"
        duplicate_data["email"] = "second@test.com"
        
        response2 = client.post("/api/v1/customers/", json=duplicate_data, headers=auth_headers)
        assert response2.status_code == 400
        assert "Phone number already exists" in str(response2.json()["detail"])
    
    def test_update_customer(self, client: TestClient, auth_headers):
        """Test customer update"""
        # Create customer
        customer_data = {
            "name": "Update Test Customer",
            "phone": "9876543213",
            "email": "update@test.com"
        }
        response = client.post("/api/v1/customers/", json=customer_data, headers=auth_headers)
        customer_id = response.json()["id"]
        
        # Update customer
        update_data = {
            "name": "Updated Customer Name",
            "phone": "9876543213",
            "email": "updated@test.com"
        }
        response = client.put(
            f"/api/v1/customers/{customer_id}", 
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Customer Name"
        assert data["email"] == "updated@test.com"
```

#### Order Workflow Integration Test
```python
# tests/integration/test_order_workflow.py
import pytest
from fastapi.testclient import TestClient

class TestOrderWorkflow:
    
    def test_complete_order_workflow(self, client: TestClient, auth_headers):
        """Test complete order creation to completion workflow"""
        
        # Step 1: Create customer
        customer_data = {
            "name": "Workflow Test Customer",
            "phone": "9876543220",
            "email": "workflow@test.com"
        }
        customer_response = client.post(
            "/api/v1/customers/", 
            json=customer_data,
            headers=auth_headers
        )
        customer_id = customer_response.json()["id"]
        
        # Step 2: Create order
        order_data = {
            "customer_id": customer_id,
            "notes": "Test order for workflow"
        }
        order_response = client.post(
            "/api/v1/orders/",
            json=order_data,
            headers=auth_headers
        )
        assert order_response.status_code == 201
        order_id = order_response.json()["id"]
        
        # Step 3: Add order items
        item_data = {
            "material_type": "saree",
            "quantity": 2,
            "unit_price": 1500.00,
            "customization_details": "Red color with gold border"
        }
        item_response = client.post(
            f"/api/v1/orders/{order_id}/items",
            json=item_data,
            headers=auth_headers
        )
        assert item_response.status_code == 201
        item_id = item_response.json()["id"]
        
        # Step 4: Update production stage
        stage_response = client.patch(
            f"/api/v1/order-items/{item_id}/stage",
            json={"production_stage": "printing"},
            headers=auth_headers
        )
        assert stage_response.status_code == 200
        
        # Step 5: Complete production
        complete_response = client.patch(
            f"/api/v1/order-items/{item_id}/stage",
            json={"production_stage": "post_process"},
            headers=auth_headers
        )
        assert complete_response.status_code == 200
        
        # Step 6: Verify order total
        order_check = client.get(f"/api/v1/orders/{order_id}", headers=auth_headers)
        assert order_check.json()["total_amount"] == 3000.00  # 2 * 1500
```

---

## 🌐 END-TO-END TESTING

### Complete Business Flow Tests

```python
# tests/e2e/test_complete_business_flow.py
import pytest
from fastapi.testclient import TestClient

class TestCompleteBusinessFlow:
    
    def test_order_to_payment_flow(self, client: TestClient, auth_headers):
        """Test complete business flow from order creation to payment"""
        
        # 1. Create customer
        customer_data = {
            "name": "E2E Test Customer",
            "phone": "9876543230",
            "email": "e2e@test.com",
            "gst_number": "22AAAAA0000A1Z5"
        }
        customer_response = client.post("/api/v1/customers/", json=customer_data, headers=auth_headers)
        customer_id = customer_response.json()["id"]
        
        # 2. Create order with items
        order_data = {"customer_id": customer_id}
        order_response = client.post("/api/v1/orders/", json=order_data, headers=auth_headers)
        order_id = order_response.json()["id"]
        
        # Add multiple items
        items = [
            {"material_type": "saree", "quantity": 3, "unit_price": 1500.00},
            {"material_type": "dupatta", "quantity": 2, "unit_price": 800.00}
        ]
        
        item_ids = []
        for item in items:
            item_response = client.post(f"/api/v1/orders/{order_id}/items", json=item, headers=auth_headers)
            item_ids.append(item_response.json()["id"])
        
        # 3. Complete production for all items
        for item_id in item_ids:
            # Pre-treatment to printing
            client.patch(f"/api/v1/order-items/{item_id}/stage", json={"production_stage": "printing"}, headers=auth_headers)
            # Printing to post-process
            client.patch(f"/api/v1/order-items/{item_id}/stage", json={"production_stage": "post_process"}, headers=auth_headers)
        
        # 4. Create delivery challan
        challan_data = {
            "customer_id": customer_id,
            "order_item_ids": item_ids
        }
        challan_response = client.post("/api/v1/challans/", json=challan_data, headers=auth_headers)
        challan_id = challan_response.json()["id"]
        
        # 5. Mark challan as delivered
        client.patch(f"/api/v1/challans/{challan_id}/deliver", headers=auth_headers)
        
        # 6. Generate GST invoice
        invoice_data = {
            "customer_id": customer_id,
            "challan_ids": [challan_id]
        }
        invoice_response = client.post("/api/v1/invoices/", json=invoice_data, headers=auth_headers)
        invoice_id = invoice_response.json()["id"]
        invoice_amount = invoice_response.json()["final_amount"]
        
        # 7. Record payment
        payment_data = {
            "invoice_id": invoice_id,
            "amount": invoice_amount,
            "payment_method": "upi",
            "reference_number": "UPI123456789"
        }
        payment_response = client.post("/api/v1/payments/", json=payment_data, headers=auth_headers)
        assert payment_response.status_code == 201
        
        # 8. Verify final state
        final_invoice = client.get(f"/api/v1/invoices/{invoice_id}", headers=auth_headers)
        assert final_invoice.json()["outstanding_amount"] == 0.0
        
        # 9. Generate reports to verify data consistency
        reports_to_check = [
            "/api/v1/reports/pending-orders",
            "/api/v1/reports/material-flow",
            "/api/v1/reports/payments-received"
        ]
        
        for report_url in reports_to_check:
            report_response = client.get(report_url, headers=auth_headers)
            assert report_response.status_code == 200
```

---

## ⚡ PERFORMANCE TESTING

### Load Testing Setup
```python
# tests/performance/test_load.py
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

class LoadTestRunner:
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.auth_token = None
    
    async def authenticate(self):
        """Get authentication token"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/api/v1/auth/login",
                json={"username": "admin", "password": "admin123"}
            ) as response:
                data = await response.json()
                self.auth_token = data["access_token"]
    
    async def create_customer(self, session, customer_num):
        """Create a single customer"""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        customer_data = {
            "name": f"Load Test Customer {customer_num}",
            "phone": f"987654{customer_num:04d}",
            "email": f"loadtest{customer_num}@example.com"
        }
        
        start_time = time.time()
        async with session.post(
            f"{self.base_url}/api/v1/customers/",
            json=customer_data,
            headers=headers
        ) as response:
            end_time = time.time()
            return {
                "status": response.status,
                "response_time": end_time - start_time,
                "customer_num": customer_num
            }
    
    async def load_test_customer_creation(self, concurrent_users=10, requests_per_user=5):
        """Load test customer creation endpoint"""
        await self.authenticate()
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for user in range(concurrent_users):
                for request in range(requests_per_user):
                    customer_num = user * requests_per_user + request
                    task = self.create_customer(session, customer_num)
                    tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # Analyze results
            success_count = sum(1 for r in results if r["status"] == 201)
            total_requests = len(results)
            avg_response_time = sum(r["response_time"] for r in results) / total_requests
            
            print(f"Load Test Results:")
            print(f"Total Requests: {total_requests}")
            print(f"Successful Requests: {success_count}")
            print(f"Success Rate: {success_count/total_requests*100:.2f}%")
            print(f"Average Response Time: {avg_response_time:.3f}s")
            
            # Assert performance requirements
            assert success_count/total_requests >= 0.95  # 95% success rate
            assert avg_response_time <= 3.0  # Under 3 seconds average

# Run load test
async def test_load_performance():
    runner = LoadTestRunner()
    await runner.load_test_customer_creation(concurrent_users=20, requests_per_user=10)

if __name__ == "__main__":
    asyncio.run(test_load_performance())
```

### Report Generation Performance Test
```python
# tests/performance/test_reports_performance.py
import pytest
import time
from fastapi.testclient import TestClient

class TestReportsPerformance:
    
    def test_large_dataset_reports(self, client: TestClient, auth_headers, large_dataset):
        """Test report generation with large dataset"""
        
        # Test each report type
        report_endpoints = [
            "/api/v1/reports/pending-orders",
            "/api/v1/reports/production-status", 
            "/api/v1/reports/stock-holding",
            "/api/v1/reports/pending-receivables",
            "/api/v1/reports/material-flow?start_date=2024-01-01&end_date=2024-12-31"
        ]
        
        for endpoint in report_endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=auth_headers)
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time <= 30.0  # REQ-053: Under 30 seconds
            
            print(f"Report {endpoint}: {response_time:.2f}s")

@pytest.fixture
def large_dataset(client: TestClient, auth_headers):
    """Create large dataset for performance testing"""
    # Create 1000 customers, 5000 orders, etc.
    # This fixture would populate the test database with large amounts of data
    pass
```

---

## 🔐 SECURITY TESTING

### Authentication & Authorization Tests
```python
# tests/security/test_auth_security.py
import pytest
from fastapi.testclient import TestClient

class TestAuthSecurity:
    
    def test_access_without_token(self, client: TestClient):
        """Test that protected endpoints require authentication"""
        protected_endpoints = [
            "/api/v1/customers/",
            "/api/v1/orders/",
            "/api/v1/reports/pending-orders"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
    
    def test_access_with_invalid_token(self, client: TestClient):
        """Test invalid token rejection"""
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.get("/api/v1/customers/", headers=invalid_headers)
        assert response.status_code == 401
    
    def test_role_based_access_control(self, client: TestClient):
        """Test role-based access restrictions"""
        # Create employee user token
        employee_token = self.get_employee_token(client)
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Employee should not access admin endpoints
        admin_endpoints = [
            "/api/v1/users/",
            "/api/v1/users/create"
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=employee_headers)
            assert response.status_code == 403
    
    def test_sql_injection_prevention(self, client: TestClient, auth_headers):
        """Test SQL injection prevention"""
        malicious_inputs = [
            "'; DROP TABLE customers; --",
            "1' OR '1'='1",
            "admin'; UPDATE users SET role='admin' WHERE username='employee'; --"
        ]
        
        for malicious_input in malicious_inputs:
            # Try to inject in customer name field
            response = client.post(
                "/api/v1/customers/",
                json={"name": malicious_input, "phone": "1234567890"},
                headers=auth_headers
            )
            
            # Should either succeed with escaped input or fail validation
            # But should not cause SQL injection
            assert response.status_code in [201, 400, 422]
            
            # Verify database integrity
            customers_response = client.get("/api/v1/customers/", headers=auth_headers)
            assert customers_response.status_code == 200
```

---

## 📊 TEST DATA MANAGEMENT

### Test Data Factory
```python
# tests/factories.py
from faker import Faker
import random
from decimal import Decimal

fake = Faker()

class TestDataFactory:
    
    @staticmethod
    def create_customer_data():
        return {
            "name": fake.company(),
            "phone": fake.phone_number()[:10],
            "email": fake.email(),
            "address": fake.address(),
            "gst_number": f"22{fake.random_uppercase_letter()}{fake.random_uppercase_letter()}{fake.random_uppercase_letter()}{fake.random_uppercase_letter()}{fake.random_uppercase_letter()}0000{fake.random_uppercase_letter()}1Z5"
        }
    
    @staticmethod
    def create_order_data(customer_id):
        return {
            "customer_id": customer_id,
            "notes": fake.text(max_nb_chars=200)
        }
    
    @staticmethod
    def create_order_item_data():
        material_types = ["saree", "dupatta", "voni", "running_material", "blouse_material"]
        return {
            "material_type": random.choice(material_types),
            "quantity": random.randint(1, 10),
            "unit_price": float(Decimal(random.uniform(500, 3000)).quantize(Decimal('0.01'))),
            "customization_details": fake.text(max_nb_chars=100)
        }
    
    @staticmethod
    def create_inventory_item_data():
        categories = ["colors", "chemicals", "materials"]
        units = ["kg", "liters", "pieces"]
        
        return {
            "item_name": fake.word().title(),
            "category": random.choice(categories),
            "current_stock": float(Decimal(random.uniform(10, 100)).quantize(Decimal('0.01'))),
            "unit": random.choice(units),
            "reorder_level": float(Decimal(random.uniform(5, 20)).quantize(Decimal('0.01'))),
            "cost_per_unit": float(Decimal(random.uniform(50, 500)).quantize(Decimal('0.01'))),
            "supplier_name": fake.company()
        }
```

### Database Fixtures
```python
# tests/fixtures.py
import pytest
from tests.factories import TestDataFactory

@pytest.fixture
def sample_customers(client, auth_headers):
    """Create sample customers for testing"""
    customers = []
    for _ in range(5):
        customer_data = TestDataFactory.create_customer_data()
        response = client.post("/api/v1/customers/", json=customer_data, headers=auth_headers)
        customers.append(response.json())
    return customers

@pytest.fixture
def sample_orders_with_items(client, auth_headers, sample_customers):
    """Create sample orders with items"""
    orders = []
    for customer in sample_customers[:3]:  # Create orders for first 3 customers
        order_data = TestDataFactory.create_order_data(customer["id"])
        order_response = client.post("/api/v1/orders/", json=order_data, headers=auth_headers)
        order = order_response.json()
        
        # Add items to order
        for _ in range(random.randint(1, 3)):
            item_data = TestDataFactory.create_order_item_data()
            client.post(f"/api/v1/orders/{order['id']}/items", json=item_data, headers=auth_headers)
        
        orders.append(order)
    return orders
```

---

## 🎯 TEST EXECUTION STRATEGY

### Continuous Integration Testing
```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_USER: test_user
          POSTGRES_DB: test_textile_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run unit tests
      run: |
        cd backend
        pytest tests/unit/ --cov=app --cov-report=xml
    
    - name: Run integration tests
      run: |
        cd backend
        pytest tests/integration/ -v
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
```

### Test Execution Commands
```bash
# Run all tests
pytest tests/ -v

# Run specific test categories
pytest tests/unit/ -v                    # Unit tests only
pytest tests/integration/ -v             # Integration tests only
pytest tests/e2e/ -v                     # End-to-end tests only

# Run tests with coverage
pytest tests/ --cov=app --cov-report=html --cov-report=term

# Run performance tests
pytest tests/performance/ -v -s

# Run security tests
pytest tests/security/ -v

# Run tests in parallel
pytest tests/ -n auto

# Run tests matching pattern
pytest tests/ -k "customer" -v

# Run tests with specific markers
pytest tests/ -m "slow" -v              # Run only slow tests
pytest tests/ -m "not slow" -v          # Skip slow tests
```

---

## 📋 TEST CHECKLISTS

### Pre-Release Testing Checklist

#### Functional Testing ✅
- [ ] All CRUD operations for each entity working
- [ ] Business workflow end-to-end testing completed
- [ ] All reports generating correctly
- [ ] PDF generation and export functionality working
- [ ] Data validation rules enforced
- [ ] Error handling working properly

#### Security Testing ✅
- [ ] Authentication system secure
- [ ] Role-based access control working
- [ ] SQL injection prevention verified
- [ ] Input validation preventing malicious inputs
- [ ] Session management secure

#### Performance Testing ✅
- [ ] Page load times under 3 seconds
- [ ] Report generation under 30 seconds
- [ ] System handles 50 concurrent users
- [ ] Database queries optimized
- [ ] API response times acceptable

#### Integration Testing ✅
- [ ] Frontend-backend communication working
- [ ] Database transactions working correctly
- [ ] Third-party integrations functioning
- [ ] Error propagation working properly

#### User Acceptance Testing ✅
- [ ] Business workflows match requirements
- [ ] User interface intuitive for non-technical users
- [ ] All user roles can perform assigned tasks
- [ ] Reports provide required business insights

### Production Readiness Checklist

#### Deployment Testing ✅
- [ ] Application deploys successfully to staging
- [ ] Environment variables configured correctly
- [ ] Database migrations run successfully
- [ ] SSL certificates working
- [ ] Monitoring and logging configured

#### Data Migration Testing ✅
- [ ] Test data import/export functionality
- [ ] Backup and restore procedures tested
- [ ] Data integrity maintained during migration
- [ ] Historical data preserved correctly

#### Disaster Recovery Testing ✅
- [ ] Database backup and restore tested
- [ ] Application recovery procedures documented
- [ ] Data loss prevention measures in place
- [ ] Recovery time objectives met

---

## 📈 TEST METRICS & REPORTING

### Key Test Metrics
1. **Test Coverage**: Minimum 80% code coverage
2. **Test Pass Rate**: Minimum 95% pass rate
3. **Performance Benchmarks**: All requirements met
4. **Security Scan Results**: Zero critical vulnerabilities
5. **User Acceptance**: 100% critical business flows working

### Test Reporting
```bash
# Generate comprehensive test report
pytest tests/ --html=reports/test_report.html --self-contained-html

# Generate coverage report
pytest tests/ --cov=app --cov-report=html --cov-report=xml

# Generate performance report
pytest tests/performance/ --benchmark-json=reports/performance.json
```

This comprehensive testing guide ensures all aspects of the Digital Textile Printing System are thoroughly validated before deployment, maintaining high quality and reliability standards. 