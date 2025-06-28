import pytest
import requests
import os
from datetime import datetime
import uuid

# Configuration
API_BASE_URL = os.getenv("RENDER_API_URL", "https://jbms1.onrender.com")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Siri@2299")

class TestConfig:
    def __init__(self):
        self.base_url = API_BASE_URL.rstrip('/')
        self.session = requests.Session()
        self.token = None

    def authenticate(self):
        """Authenticate and get token"""
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.session.headers.update({'Authorization': f'Bearer {self.token}'})
            return True
        return False

@pytest.fixture(scope="session")
def api_client():
    """Create authenticated API client"""
    client = TestConfig()
    assert client.authenticate(), "Failed to authenticate with API"
    return client

@pytest.fixture
def unique_customer_data():
    """Generate unique customer data for each test"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "name": f"Test Customer {unique_id}",
        "phone": f"987654{unique_id[:4]}",
        "email": f"test{unique_id}@customer.com",
        "address": f"{unique_id} Test Street, Chennai - 600001"
    }

class TestHealthEndpoints:
    def test_health_check(self, api_client):
        """Test basic health endpoint"""
        response = api_client.session.get(f"{api_client.base_url}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_database_health(self, api_client):
        """Test database connectivity"""
        response = api_client.session.get(f"{api_client.base_url}/health/db")
        assert response.status_code == 200
        data = response.json()
        assert "database" in data["status"]

class TestAuthentication:
    def test_login_success(self, api_client):
        """Test successful login"""
        # Login is already tested in fixture, test token validity
        response = api_client.session.get(f"{api_client.base_url}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == ADMIN_USERNAME

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        session = requests.Session()
        response = session.post(
            f"{API_BASE_URL}/api/auth/login",
            data={"username": "invalid", "password": "invalid"},
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        assert response.status_code == 401

class TestCustomerManagement:
    def test_create_customer(self, api_client, unique_customer_data):
        """Test customer creation"""
        response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == unique_customer_data["name"]
        assert "id" in data
        return data["id"]

    def test_list_customers(self, api_client):
        """Test customer listing"""
        response = api_client.session.get(f"{api_client.base_url}/api/customers/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_search_customers(self, api_client, unique_customer_data):
        """Test customer search functionality"""
        # First create a customer
        create_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        assert create_response.status_code == 201
        
        # Then search for it
        search_term = unique_customer_data["name"].split()[0]
        response = api_client.session.get(
            f"{api_client.base_url}/api/customers/?search={search_term}"
        )
        assert response.status_code == 200
        customers = response.json()
        assert any(customer["name"] == unique_customer_data["name"] for customer in customers)

    def test_duplicate_customer_prevention(self, api_client, unique_customer_data):
        """Test duplicate customer prevention"""
        # Create customer first time
        response1 = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        assert response1.status_code == 201
        
        # Try to create same customer again
        response2 = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        assert response2.status_code == 400  # Should fail due to duplicate phone

class TestOrderManagement:
    def test_create_order_workflow(self, api_client, unique_customer_data):
        """Test complete order creation workflow"""
        # 1. Create customer first
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        assert customer_response.status_code == 201
        customer_id = customer_response.json()["id"]
        
        # 2. Create order with items
        order_data = {
            "customer_id": customer_id,
            "notes": "Test order workflow",
            "order_items": [
                {
                    "material_type": "saree",
                    "quantity": 5,
                    "unit_price": 500.00,
                    "customization_details": "Red border"
                },
                {
                    "material_type": "dupatta",
                    "quantity": 5,
                    "unit_price": 200.00,
                    "customization_details": "Matching dupatta"
                }
            ]
        }
        
        order_response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert order_response.status_code == 201
        order = order_response.json()
        assert "order_number" in order
        assert order["total_amount"] == 3500.00  # 5*500 + 5*200
        assert len(order["order_items"]) == 2
        
        return order["id"]

    def test_list_orders(self, api_client):
        """Test order listing"""
        response = api_client.session.get(f"{api_client.base_url}/api/orders/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

class TestMaterialManagement:
    def test_material_in_recording(self, api_client, unique_customer_data):
        """Test material in recording"""
        # Create customer and order first
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        order_data = {
            "customer_id": customer_id,
            "notes": "Test material workflow",
            "order_items": [{
                "material_type": "saree",
                "quantity": 10,
                "unit_price": 500.00
            }]
        }
        order_response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        order_id = order_response.json()["id"]
        
        # Record material in
        material_data = {
            "order_id": order_id,
            "material_type": "saree",
            "quantity": 15,
            "unit": "pieces",
            "notes": "Raw fabric received"
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/materials/in",
            json=material_data
        )
        assert response.status_code == 201

class TestBusinessLogicValidation:
    """Test business rules and validation"""
    
    def test_negative_quantity_validation(self, api_client, unique_customer_data):
        """Test that negative quantities are rejected"""
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        order_data = {
            "customer_id": customer_id,
            "order_items": [{
                "material_type": "saree",
                "quantity": -5,  # Invalid negative quantity
                "unit_price": 500.00
            }]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 422  # Validation error

    def test_order_total_calculation(self, api_client, unique_customer_data):
        """Test automatic order total calculation"""
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        order_data = {
            "customer_id": customer_id,
            "order_items": [
                {"material_type": "saree", "quantity": 3, "unit_price": 100.00},
                {"material_type": "dupatta", "quantity": 2, "unit_price": 50.00}
            ]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 201
        order = response.json()
        expected_total = (3 * 100.00) + (2 * 50.00)  # 400.00
        assert float(order["total_amount"]) == expected_total 