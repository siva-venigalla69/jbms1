# 🧪 Comprehensive Testing Guide

## 📋 Overview

This guide covers all testing procedures for the **Digital Textile Printing System**, including unit tests, integration tests, and end-to-end testing for both backend (FastAPI/Python) and frontend (React/TypeScript).

## 🏗️ Testing Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Jest/RTL)    │    │   (Pytest)       │    │   (Test DB)     │
│   E2E (Playwright)    │   Integration    │    │   Fixtures      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🐍 Backend Testing (Python/FastAPI)

### Setup Test Environment

```bash
# Install test dependencies
cd backend
pip install pytest pytest-asyncio httpx faker

# Create test database
createdb textile_printing_test

# Set test environment
export ENVIRONMENT=testing
export DATABASE_URL=postgresql://user:password@localhost:5432/textile_printing_test
```

### Test Configuration

```python
# backend/app/tests/conftest.py
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Test database URL
TEST_DATABASE_URL = "postgresql://user:password@localhost:5432/textile_printing_test"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def db():
    """Create test database session"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    """Create test client with database override"""
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db):
    """Create test user"""
    from app.models.models import User
    from app.core.security import get_password_hash
    
    user = User(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("testpassword"),
        role="employee"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def admin_user(db):
    """Create admin user"""
    from app.models.models import User
    from app.core.security import get_password_hash
    
    user = User(
        username="admin",
        email="admin@example.com", 
        full_name="Admin User",
        hashed_password=get_password_hash("adminpassword"),
        role="admin"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

### Unit Tests

#### Security Tests
```python
# backend/app/tests/test_security.py
import pytest
from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    verify_token,
    validate_password_strength
)

class TestPasswordSecurity:
    def test_password_hashing(self):
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("wrongpassword", hashed)
    
    def test_password_validation(self):
        # Test weak password
        weak = validate_password_strength("123")
        assert not weak["is_valid"]
        assert not weak["min_length"]
        
        # Test strong password
        strong = validate_password_strength("SecurePass123!")
        assert strong["is_valid"]
        assert strong["min_length"]
        assert strong["has_uppercase"]
        assert strong["has_lowercase"]
        assert strong["has_digit"]
        assert strong["has_special"]
    
    def test_jwt_token_creation_and_verification(self):
        data = {"sub": "testuser"}
        token = create_access_token(data)
        
        assert token is not None
        decoded = verify_token(token)
        assert decoded["sub"] == "testuser"
        assert decoded["type"] == "access_token"
        assert decoded["iss"] == "textile-printing-system"
    
    def test_invalid_token_verification(self):
        assert verify_token("invalid_token") is None
        assert verify_token("") is None
```

#### Model Tests
```python
# backend/app/tests/test_models.py
import pytest
from app.models.models import User, Customer, Order

class TestUserModel:
    def test_user_creation(self, db):
        user = User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password="hashed_password",
            role="employee"
        )
        db.add(user)
        db.commit()
        
        assert user.id is not None
        assert user.username == "testuser"
        assert user.is_active == True
        assert user.created_at is not None

class TestCustomerModel:
    def test_customer_creation(self, db, test_user):
        customer = Customer(
            name="Test Customer",
            phone="1234567890",
            email="customer@example.com",
            created_by=test_user.id
        )
        db.add(customer)
        db.commit()
        
        assert customer.id is not None
        assert customer.name == "Test Customer"
        assert customer.is_deleted == False
```

### API Integration Tests

#### Authentication Tests
```python
# backend/app/tests/test_auth_api.py
import pytest
from fastapi.testclient import TestClient

class TestAuthAPI:
    def test_login_success(self, client, test_user):
        response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpassword"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, client, test_user):
        response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_get_current_user(self, client, test_user):
        # Login first
        login_response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpassword"}
        )
        token = login_response.json()["access_token"]
        
        # Get user info
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
```

#### Customer API Tests
```python
# backend/app/tests/test_customer_api.py
import pytest

class TestCustomerAPI:
    def get_auth_header(self, client, user):
        login_response = client.post(
            "/api/auth/login",
            data={"username": user.username, "password": "testpassword"}
        )
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_customer(self, client, test_user):
        headers = self.get_auth_header(client, test_user)
        customer_data = {
            "name": "New Customer",
            "phone": "9876543210",
            "email": "newcustomer@example.com",
            "address": "123 Test Street"
        }
        
        response = client.post(
            "/api/customers/",
            json=customer_data,
            headers=headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Customer"
        assert data["phone"] == "9876543210"
    
    def test_list_customers(self, client, test_user):
        # Create test customer first
        headers = self.get_auth_header(client, test_user)
        client.post(
            "/api/customers/",
            json={"name": "Test Customer", "phone": "1111111111"},
            headers=headers
        )
        
        # List customers
        response = client.get("/api/customers/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(customer["name"] == "Test Customer" for customer in data)
    
    def test_search_customers(self, client, test_user):
        headers = self.get_auth_header(client, test_user)
        
        # Create customers
        client.post("/api/customers/", json={"name": "John Doe", "phone": "1111111111"}, headers=headers)
        client.post("/api/customers/", json={"name": "Jane Smith", "phone": "2222222222"}, headers=headers)
        
        # Search by name
        response = client.get("/api/customers/?search=John", headers=headers)
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "John Doe"
        
        # Search by phone
        response = client.get("/api/customers/?search=2222", headers=headers)
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Jane Smith"
```

### Running Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest app/tests/test_auth_api.py

# Run specific test
pytest app/tests/test_auth_api.py::TestAuthAPI::test_login_success

# Run tests in verbose mode
pytest -v

# Run tests with output
pytest -s
```

---

## ⚛️ Frontend Testing (React/TypeScript)

### Setup Test Environment

```bash
# Install additional testing dependencies
cd frontend
npm install --save-dev @testing-library/jest-dom @testing-library/user-event msw
```

### Test Configuration

```typescript
// frontend/src/setupTests.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Mock API calls
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
```

```typescript
// frontend/src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'fake-jwt-token',
        token_type: 'bearer'
      })
    );
  }),
  
  rest.get('/api/auth/me', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'employee'
      })
    );
  }),
  
  // Customer endpoints
  rest.get('/api/customers', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          name: 'Test Customer',
          phone: '1234567890',
          email: 'test@customer.com',
          created_at: '2024-01-01T00:00:00Z'
        }
      ])
    );
  }),
  
  rest.post('/api/customers', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 2,
        name: 'New Customer',
        phone: '9876543210',
        created_at: '2024-01-01T00:00:00Z'
      })
    );
  })
];
```

### Unit Tests

#### Component Tests
```typescript
// frontend/src/components/common/Layout.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from '../../context/AuthContext';
import Layout from './Layout';
import theme from '../../theme';

const MockWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Layout Component', () => {
  it('renders navigation menu', () => {
    render(
      <MockWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MockWrapper>
    );
    
    expect(screen.getByText('Digital Textile Printing System')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });
  
  it('renders children content', () => {
    render(
      <MockWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MockWrapper>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
```

#### Hook Tests
```typescript
// frontend/src/context/AuthContext.test.tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('initializes with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.isAuthenticated).toBe(false);
  });
  
  it('handles login successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login({
        username: 'testuser',
        password: 'password'
      });
    });
    
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.user).toBeTruthy();
  });
  
  it('handles logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Login first
    await act(async () => {
      await result.current.login({
        username: 'testuser',
        password: 'password'
      });
    });
    
    // Then logout
    act(() => {
      result.current.logout();
    });
    
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBeNull();
  });
});
```

### Integration Tests

#### Page Tests
```typescript
// frontend/src/pages/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';
import theme from '../theme';

const MockWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Login Page', () => {
  it('renders login form', () => {
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  it('submits login form', async () => {
    const user = userEvent.setup();
    
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'fake-jwt-token');
    });
  });
  
  it('shows validation errors', async () => {
    const user = userEvent.setup();
    
    render(
      <MockWrapper>
        <Login />
      </MockWrapper>
    );
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });
});
```

### Running Frontend Tests

```bash
# Run all tests
cd frontend
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test Login.test.tsx

# Update snapshots
npm test -- --updateSnapshot
```

---

## 🎭 End-to-End Testing (Playwright)

### Setup E2E Testing

```bash
# Install Playwright
cd frontend
npm install --save-dev @playwright/test

# Install browsers
npx playwright install
```

### E2E Test Configuration

```typescript
// frontend/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Tests

```typescript
// frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Check login page elements
    await expect(page.getByText('Digital Textile Printing')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    
    // Fill login form
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'adminpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Good Morning')).toBeVisible();
  });
  
  test('login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="username"]', 'invalid');
    await page.fill('[name="password"]', 'invalid');
    await page.click('button[type="submit"]');
    
    // Verify error message
    await expect(page.getByText('Incorrect username or password')).toBeVisible();
  });
});
```

```typescript
// frontend/e2e/customers.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('create new customer', async ({ page }) => {
    await page.goto('/customers');
    
    // Click add customer button
    await page.click('text=Add Customer');
    
    // Fill customer form
    await page.fill('[name="name"]', 'Test Customer E2E');
    await page.fill('[name="phone"]', '9999999999');
    await page.fill('[name="email"]', 'teste2e@customer.com');
    await page.fill('[name="address"]', '123 Test Street');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.getByText('Customer created successfully')).toBeVisible();
    
    // Verify customer appears in list
    await expect(page.getByText('Test Customer E2E')).toBeVisible();
  });
  
  test('search customers', async ({ page }) => {
    await page.goto('/customers');
    
    // Search for customer
    await page.fill('[placeholder*="Search customers"]', 'Test');
    
    // Verify search results
    await expect(page.getByText('Test Customer')).toBeVisible();
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
cd frontend
npx playwright test

# Run tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Show test report
npx playwright show-report
```

---

## 🔍 Performance Testing

### Frontend Performance Tests

```typescript
// frontend/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });
  
  test('API response times', async ({ page }) => {
    await page.goto('/login');
    
    // Start monitoring network
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.status() === 200
    );
    
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'adminpassword');
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    const response = await responsePromise;
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(2000); // API should respond within 2 seconds
  });
});
```

### Backend Performance Tests

```python
# backend/app/tests/test_performance.py
import pytest
import time
from fastapi.testclient import TestClient

class TestPerformance:
    def test_login_response_time(self, client, test_user):
        start_time = time.time()
        
        response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpassword"}
        )
        
        response_time = time.time() - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0  # Should respond within 1 second
    
    def test_customer_list_performance(self, client, test_user):
        # Create test data
        headers = self.get_auth_header(client, test_user)
        for i in range(100):
            client.post(
                "/api/customers/",
                json={"name": f"Customer {i}", "phone": f"123456789{i}"},
                headers=headers
            )
        
        start_time = time.time()
        response = client.get("/api/customers/", headers=headers)
        response_time = time.time() - start_time
        
        assert response.status_code == 200
        assert response_time < 2.0  # Should handle 100 customers within 2 seconds
```

---

## 📊 Test Reports and Coverage

### Generate Test Reports

```bash
# Backend coverage report
cd backend
pytest --cov=app --cov-report=html --cov-report=term
# Open htmlcov/index.html

# Frontend coverage report
cd frontend
npm test -- --coverage --watchAll=false
# Open coverage/lcov-report/index.html

# E2E test report
cd frontend
npx playwright test
npx playwright show-report
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: textile_printing_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=app --cov-report=xml
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/textile_printing_test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: frontend/coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
        npx playwright install --with-deps
    
    - name: Run E2E tests
      run: |
        cd frontend
        npx playwright test
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: frontend/playwright-report/
```

---

## ✅ Testing Checklist

### Before Deployment
- [ ] All unit tests pass (backend & frontend)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance tests meet requirements
- [ ] Security tests pass
- [ ] Code coverage > 80%

### Manual Testing
- [ ] Login/logout functionality
- [ ] Customer CRUD operations
- [ ] Navigation between pages
- [ ] Form validation
- [ ] Error handling
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### Production Testing
- [ ] Smoke tests on live environment
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] User acceptance testing

**Your testing strategy ensures a robust, reliable application! 🧪** 