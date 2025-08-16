"""
Pytest configuration and fixtures for testing
"""
import pytest
import os
import tempfile
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db, Base
from app.core.security import get_password_hash
from app.models.models import User, Customer
from app.core.config import settings

# Override settings for testing
settings.ENVIRONMENT = "testing"
settings.DEBUG = True

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine"""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    """Create a test database session"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database session override"""
    
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create an admin user for testing"""
    user = User(
        username="admin",
        email="admin@test.com",
        full_name="Test Admin",
        password_hash=get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def manager_user(db_session: Session) -> User:
    """Create a manager user for testing"""
    user = User(
        username="manager",
        email="manager@test.com",
        full_name="Test Manager",
        password_hash=get_password_hash("manager123"),
        role="manager",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def employee_user(db_session: Session) -> User:
    """Create an employee user for testing"""
    user = User(
        username="employee",
        email="employee@test.com",
        full_name="Test Employee",
        password_hash=get_password_hash("employee123"),
        role="employee",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def admin_token(client: TestClient) -> str:
    """Get admin authentication token"""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def manager_token(client: TestClient) -> str:
    """Get manager authentication token"""
    response = client.post(
        "/api/auth/login",
        data={"username": "manager", "password": "manager123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def employee_token(client: TestClient) -> str:
    """Get employee authentication token"""
    response = client.post(
        "/api/auth/login",
        data={"username": "employee", "password": "employee123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def auth_headers_admin(admin_token: str) -> dict:
    """Create authorization headers for admin"""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def auth_headers_manager(manager_token: str) -> dict:
    """Create authorization headers for manager"""
    return {"Authorization": f"Bearer {manager_token}"}

@pytest.fixture
def auth_headers_employee(employee_token: str) -> dict:
    """Create authorization headers for employee"""
    return {"Authorization": f"Bearer {employee_token}"}

@pytest.fixture
def sample_customer(db_session: Session, admin_user: User) -> Customer:
    """Create a sample customer for testing"""
    customer = Customer(
        name="Test Customer",
        phone="1234567890",
        email="customer@test.com",
        address="123 Test Street",
        gst_number="22AAAAA0000A1Z5",
        created_by_user_id=admin_user.id
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer

@pytest.fixture
def customer_data() -> dict:
    """Sample customer data for testing"""
    return {
        "name": "New Test Customer",
        "phone": "9876543210",
        "email": "newcustomer@test.com",
        "address": "456 New Street",
        "gst_number": "22BBBBB0000B1Z5"
    }

# Test data fixtures
@pytest.fixture
def order_data(sample_customer: Customer) -> dict:
    """Sample order data for testing"""
    return {
        "customer_id": str(sample_customer.id),
        "notes": "Test order",
        "order_items": [
            {
                "material_type": "saree",
                "quantity": 2,
                "unit_price": 500.00,
                "customization_details": "Red color with golden border"
            }
        ]
    }

@pytest.fixture
def material_in_data(sample_customer: Customer) -> dict:
    """Sample material in data for testing"""
    return {
        "customer_id": str(sample_customer.id),
        "material_type": "saree",
        "quantity": 5,
        "unit": "pieces",
        "notes": "Received from customer"
    }

@pytest.fixture
def inventory_data() -> dict:
    """Sample inventory data for testing"""
    return {
        "item_name": "Red Dye",
        "category": "Colors",
        "current_stock": 100.0,
        "unit": "kg",
        "reorder_level": 20.0,
        "cost_per_unit": 50.0,
        "supplier_name": "Color Supplier Co.",
        "supplier_contact": "supplier@colors.com"
    }

@pytest.fixture
def expense_data() -> dict:
    """Sample expense data for testing"""
    return {
        "category": "Electricity",
        "description": "Monthly electricity bill",
        "amount": 5000.00,
        "payment_method": "bank_transfer",
        "reference_number": "TXN123456"
    }

# Mock data for complex testing scenarios
@pytest.fixture
def bulk_customers_data() -> list:
    """Multiple customers for bulk testing"""
    return [
        {
            "name": f"Customer {i}",
            "phone": f"123456789{i}",
            "email": f"customer{i}@test.com",
            "address": f"{i} Test Street"
        }
        for i in range(1, 6)
    ]

# Performance testing fixtures
@pytest.fixture
def large_dataset(db_session: Session, admin_user: User):
    """Create a large dataset for performance testing"""
    customers = []
    for i in range(100):
        customer = Customer(
            name=f"Performance Customer {i}",
            phone=f"555000{i:04d}",
            email=f"perf{i}@test.com",
            created_by_user_id=admin_user.id
        )
        customers.append(customer)
    
    db_session.add_all(customers)
    db_session.commit()
    return customers

# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_files():
    """Cleanup any test files created during testing"""
    yield
    # Clean up any temporary files created during tests
    for file_pattern in ["test_*.json", "test_*.csv", "test_*.pdf"]:
        import glob
        for file_path in glob.glob(file_pattern):
            try:
                os.remove(file_path)
            except OSError:
                pass