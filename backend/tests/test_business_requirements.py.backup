import pytest
import requests
import uuid
import threading
import time
import statistics

# Configuration
API_BASE_URL = "https://jbms1.onrender.com"
ADMIN_USERNAME = "admin" 
ADMIN_PASSWORD = "Siri@2299"

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

class TestFunctionalRequirements:
    """Test specific functional requirements against live API"""
    
    def test_req_002_duplicate_customer_prevention(self, api_client):
        """REQ-002: System shall prevent duplicate customers based on phone number"""
        unique_id = str(uuid.uuid4())[:8]
        customer_data = {
            "name": f"Duplicate Test {unique_id}",
            "phone": f"duplicate{unique_id[:4]}",
            "email": f"dup{unique_id}@test.com"
        }
        
        # Create first customer
        response1 = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=customer_data
        )
        assert response1.status_code == 201
        
        # Try to create duplicate - should fail
        response2 = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=customer_data
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]

    def test_req_003_auto_generated_order_number(self, api_client, unique_customer_data):
        """REQ-003: Auto-generated Order Number (Format: ORD-YYYY-NNNN)"""
        # Create customer
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        # Create order
        order_data = {
            "customer_id": customer_id,
            "order_items": [{
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 100.00
            }]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 201
        order = response.json()
        
        # Verify order number format
        order_number = order["order_number"]
        assert order_number.startswith("ORD-")
        assert len(order_number) == 13  # ORD-YYYY-NNNN format

    def test_req_009_order_total_calculation(self, api_client, unique_customer_data):
        """REQ-009: System shall calculate order total based on item quantities and prices"""
        # Create customer
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        # Create order with multiple items
        order_data = {
            "customer_id": customer_id,
            "order_items": [
                {"material_type": "saree", "quantity": 3, "unit_price": 500.00},
                {"material_type": "dupatta", "quantity": 2, "unit_price": 200.00},
                {"material_type": "voni", "quantity": 1, "unit_price": 150.00}
            ]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 201
        order = response.json()
        
        expected_total = (3 * 500.00) + (2 * 200.00) + (1 * 150.00)  # 2050.00
        assert float(order["total_amount"]) == expected_total

    def test_req_057_negative_quantity_validation(self, api_client, unique_customer_data):
        """REQ-057: System shall prevent negative quantities and amounts"""
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        # Try to create order with negative quantity
        order_data = {
            "customer_id": customer_id,
            "order_items": [{
                "material_type": "saree",
                "quantity": -5,  # Invalid
                "unit_price": 500.00
            }]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 422  # Validation error

    def test_req_056_required_fields_validation(self, api_client):
        """REQ-056: System shall validate all required fields before saving"""
        # Try to create customer without required name
        response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json={"phone": "1234567890"}  # Missing required 'name'
        )
        assert response.status_code == 422

    def test_req_052_concurrent_users_simulation(self, api_client):
        """REQ-052: System shall handle up to 50 concurrent users"""
        results = []
        
        def make_request():
            try:
                response = api_client.session.get(f"{api_client.base_url}/api/customers/")
                results.append(response.status_code)
            except Exception as e:
                results.append(str(e))
        
        # Simulate 10 concurrent requests (scaled down for testing)
        threads = []
        for i in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert all(result == 200 for result in results)

    def test_req_053_report_generation_time(self, api_client):
        """REQ-053: Report generation shall complete within 30 seconds"""
        start_time = time.time()
        
        # Test customer list (acts as a report)
        response = api_client.session.get(f"{api_client.base_url}/api/customers/")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 30.0  # Should complete within 30 seconds

    def test_req_054_page_load_times(self, api_client):
        """REQ-054: Page load times shall be under 3 seconds"""
        response_times = []
        
        # Test multiple endpoints
        endpoints = [
            "/health",
            "/api/customers/",
            "/api/orders/",
            "/api/auth/me"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = api_client.session.get(f"{api_client.base_url}{endpoint}")
            end_time = time.time()
            
            if response.status_code == 200:
                response_times.append(end_time - start_time)
        
        # All response times should be under 3 seconds
        assert all(rt < 3.0 for rt in response_times)
        
        # Average response time should be reasonable
        avg_time = statistics.mean(response_times)
        print(f"Average response time: {avg_time:.2f}s")
        assert avg_time < 2.0  # Average should be under 2 seconds

class TestMaterialTypes:
    """Test material type handling as per requirements"""
    
    def test_valid_material_types(self, api_client, unique_customer_data):
        """Test all valid material types from REQ-007"""
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        # Valid material types from requirements
        valid_types = ["saree", "dupatta", "voni", "running_material", "blouse_material"]
        
        for material_type in valid_types:
            order_data = {
                "customer_id": customer_id,
                "order_items": [{
                    "material_type": material_type,
                    "quantity": 1,
                    "unit_price": 100.00
                }]
            }
            
            response = api_client.session.post(
                f"{api_client.base_url}/api/orders/",
                json=order_data
            )
            assert response.status_code == 201, f"Failed for material type: {material_type}"

    def test_invalid_material_type(self, api_client, unique_customer_data):
        """Test invalid material type rejection"""
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        order_data = {
            "customer_id": customer_id,
            "order_items": [{
                "material_type": "invalid_type",  # Not in enum
                "quantity": 1,
                "unit_price": 100.00
            }]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 422  # Validation error

class TestProductionStages:
    """Test production stage workflow from REQ-012, REQ-013"""
    
    def test_production_stage_enum(self, api_client, unique_customer_data):
        """Test production stages: pre_treatment, printing, post_process"""
        # This would require additional endpoints for production stage updates
        # For now, we test that orders are created with initial stage
        customer_response = api_client.session.post(
            f"{api_client.base_url}/api/customers/",
            json=unique_customer_data
        )
        customer_id = customer_response.json()["id"]
        
        order_data = {
            "customer_id": customer_id,
            "order_items": [{
                "material_type": "saree",
                "quantity": 1,
                "unit_price": 100.00
            }]
        }
        
        response = api_client.session.post(
            f"{api_client.base_url}/api/orders/",
            json=order_data
        )
        assert response.status_code == 201
        order = response.json()
        
        # Check that order items have production stage info
        for item in order["order_items"]:
            assert "current_stage" in item
            # Default stage should be pre_treatment
            assert item["current_stage"] == "pre_treatment" 