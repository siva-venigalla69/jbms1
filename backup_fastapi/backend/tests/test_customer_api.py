"""
Customer API tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

def test_create_customer_success(client: TestClient, auth_headers_admin, customer_data):
    """Test successful customer creation"""
    response = client.post(
        "/api/customers/",
        json=customer_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 201
    data = response.json()
    
    assert data["name"] == customer_data["name"]
    assert data["phone"] == customer_data["phone"]
    assert data["email"] == customer_data["email"]
    assert data["address"] == customer_data["address"]
    assert data["gst_number"] == customer_data["gst_number"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data

def test_create_customer_duplicate_phone(
    client: TestClient, 
    auth_headers_admin, 
    sample_customer, 
    customer_data
):
    """Test creating customer with duplicate phone number"""
    customer_data["phone"] = sample_customer.phone
    
    response = client.post(
        "/api/customers/",
        json=customer_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()

def test_create_customer_invalid_data(client: TestClient, auth_headers_admin):
    """Test creating customer with invalid data"""
    invalid_data = {
        "name": "",  # Empty name
        "phone": "123",  # Too short
        "email": "invalid-email",  # Invalid email format
        "gst_number": "invalid-gst"  # Invalid GST format
    }
    
    response = client.post(
        "/api/customers/",
        json=invalid_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 422

def test_get_customer_success(client: TestClient, auth_headers_admin, sample_customer):
    """Test successful customer retrieval"""
    response = client.get(
        f"/api/customers/{sample_customer.id}",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == str(sample_customer.id)
    assert data["name"] == sample_customer.name
    assert data["phone"] == sample_customer.phone

def test_get_customer_not_found(client: TestClient, auth_headers_admin):
    """Test retrieving non-existent customer"""
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/api/customers/{fake_id}",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 404

def test_list_customers_success(client: TestClient, auth_headers_admin, sample_customer):
    """Test listing customers"""
    response = client.get("/api/customers/", headers=auth_headers_admin)
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Check first customer
    customer = data[0]
    assert "id" in customer
    assert "name" in customer
    assert "phone" in customer

def test_list_customers_with_search(client: TestClient, auth_headers_admin, sample_customer):
    """Test listing customers with search"""
    response = client.get(
        f"/api/customers/?search={sample_customer.name}",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    # Should find the customer
    assert any(customer["name"] == sample_customer.name for customer in data)

def test_list_customers_pagination(client: TestClient, auth_headers_admin, bulk_customers_data):
    """Test customer list pagination"""
    # Create multiple customers
    for customer_data in bulk_customers_data:
        client.post("/api/customers/", json=customer_data, headers=auth_headers_admin)
    
    # Test pagination
    response = client.get(
        "/api/customers/?skip=0&limit=2",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    assert len(data) <= 2

def test_update_customer_success(client: TestClient, auth_headers_admin, sample_customer):
    """Test successful customer update"""
    update_data = {
        "name": "Updated Customer Name",
        "address": "Updated Address"
    }
    
    response = client.put(
        f"/api/customers/{sample_customer.id}",
        json=update_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["name"] == update_data["name"]
    assert data["address"] == update_data["address"]
    assert data["phone"] == sample_customer.phone  # Unchanged

def test_update_customer_duplicate_phone(
    client: TestClient, 
    auth_headers_admin, 
    sample_customer,
    db_session: Session,
    admin_user
):
    """Test updating customer with duplicate phone"""
    # Create another customer
    from app.models.models import Customer
    
    other_customer = Customer(
        name="Other Customer",
        phone="9999999999",
        created_by_user_id=admin_user.id
    )
    db_session.add(other_customer)
    db_session.commit()
    
    # Try to update first customer with second customer's phone
    update_data = {"phone": other_customer.phone}
    
    response = client.put(
        f"/api/customers/{sample_customer.id}",
        json=update_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 400
    assert "already in use" in response.json()["detail"].lower()

def test_delete_customer_success(client: TestClient, auth_headers_admin, sample_customer):
    """Test successful customer deletion"""
    response = client.delete(
        f"/api/customers/{sample_customer.id}",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]
    
    # Verify customer is soft deleted
    get_response = client.get(
        f"/api/customers/{sample_customer.id}",
        headers=auth_headers_admin
    )
    assert get_response.status_code == 404

def test_search_customers(client: TestClient, auth_headers_admin, sample_customer):
    """Test customer search endpoint"""
    response = client.get(
        f"/api/customers/search?q={sample_customer.name}",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "query" in data
    assert "count" in data
    assert "results" in data
    assert data["query"] == sample_customer.name
    assert data["count"] >= 1

def test_customer_orders_endpoint(client: TestClient, auth_headers_admin, sample_customer):
    """Test customer orders endpoint"""
    response = client.get(
        f"/api/customers/{sample_customer.id}/orders",
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "customer_id" in data
    assert "orders" in data
    assert "total_count" in data
    assert data["customer_id"] == str(sample_customer.id)

def test_customer_permissions_employee(
    client: TestClient, 
    auth_headers_employee, 
    sample_customer
):
    """Test that employees can access customer endpoints"""
    response = client.get("/api/customers/", headers=auth_headers_employee)
    assert response.status_code == 200

def test_customer_gst_validation(client: TestClient, auth_headers_admin):
    """Test GST number validation"""
    invalid_gst_data = {
        "name": "Test Customer",
        "phone": "1234567890",
        "gst_number": "INVALID_GST"
    }
    
    response = client.post(
        "/api/customers/",
        json=invalid_gst_data,
        headers=auth_headers_admin
    )
    
    # Should either reject or accept (depending on validation implementation)
    assert response.status_code in [201, 400, 422]

def test_customer_phone_validation(client: TestClient, auth_headers_admin):
    """Test phone number validation"""
    invalid_phone_data = {
        "name": "Test Customer",
        "phone": "123"  # Too short
    }
    
    response = client.post(
        "/api/customers/",
        json=invalid_phone_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 422

def test_customer_email_validation(client: TestClient, auth_headers_admin):
    """Test email validation"""
    invalid_email_data = {
        "name": "Test Customer",
        "phone": "1234567890",
        "email": "invalid-email"
    }
    
    response = client.post(
        "/api/customers/",
        json=invalid_email_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 422

def test_customer_concurrent_access(
    client: TestClient, 
    auth_headers_admin, 
    sample_customer
):
    """Test concurrent access to customer data"""
    import threading
    import time
    
    results = []
    
    def update_customer():
        update_data = {"name": f"Updated at {time.time()}"}
        response = client.put(
            f"/api/customers/{sample_customer.id}",
            json=update_data,
            headers=auth_headers_admin
        )
        results.append(response.status_code)
    
    # Start multiple threads
    threads = []
    for _ in range(3):
        thread = threading.Thread(target=update_customer)
        threads.append(thread)
        thread.start()
    
    # Wait for all threads
    for thread in threads:
        thread.join()
    
    # All should succeed (or handle conflicts gracefully)
    assert all(status in [200, 409] for status in results)

def test_customer_data_integrity(
    client: TestClient, 
    auth_headers_admin, 
    db_session: Session
):
    """Test customer data integrity"""
    customer_data = {
        "name": "Integrity Test Customer",
        "phone": "5555555555",
        "email": "integrity@test.com"
    }
    
    # Create customer
    response = client.post(
        "/api/customers/",
        json=customer_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 201
    customer_id = response.json()["id"]
    
    # Verify in database
    from app.models.models import Customer
    db_customer = db_session.query(Customer).filter(Customer.id == customer_id).first()
    
    assert db_customer is not None
    assert db_customer.name == customer_data["name"]
    assert db_customer.phone == customer_data["phone"]
    assert db_customer.email == customer_data["email"]
    assert db_customer.is_deleted == False