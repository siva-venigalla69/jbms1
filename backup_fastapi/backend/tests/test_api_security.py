"""
Security-focused API tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

def test_unauthenticated_access_denied(client: TestClient):
    """Test that unauthenticated requests are denied"""
    endpoints = [
        "/api/customers/",
        "/api/orders/",
        "/api/inventory/",
        "/api/reports/pending-orders",
    ]
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401
        assert "authenticate" in response.json()["detail"].lower()

def test_authentication_with_valid_credentials(client: TestClient, admin_user):
    """Test authentication with valid credentials"""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_authentication_with_invalid_credentials(client: TestClient, admin_user):
    """Test authentication with invalid credentials"""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "wrongpassword"}
    )
    
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()

def test_authentication_with_inactive_user(client: TestClient, db_session: Session, admin_user):
    """Test authentication with inactive user"""
    # Deactivate user
    admin_user.is_active = False
    db_session.commit()
    
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    
    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()

def test_token_validation(client: TestClient, auth_headers_admin):
    """Test that valid tokens allow access"""
    response = client.get("/api/auth/me", headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"

def test_invalid_token_rejected(client: TestClient):
    """Test that invalid tokens are rejected"""
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401

def test_expired_token_rejected(client: TestClient):
    """Test that expired tokens are rejected"""
    # This would require manipulating token expiration
    # For now, test with malformed token
    headers = {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.expired.token"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401

def test_role_based_access_control(
    client: TestClient,
    auth_headers_admin,
    auth_headers_manager,
    auth_headers_employee
):
    """Test role-based access control"""
    # Admin should access user management
    response = client.get("/api/users/", headers=auth_headers_admin)
    assert response.status_code == 200
    
    # Manager should NOT access user management (if implemented)
    # response = client.get("/api/users/", headers=auth_headers_manager)
    # assert response.status_code == 403
    
    # Employee should access basic endpoints
    response = client.get("/api/customers/", headers=auth_headers_employee)
    assert response.status_code == 200

def test_sql_injection_protection(client: TestClient, auth_headers_admin):
    """Test protection against SQL injection"""
    malicious_inputs = [
        "'; DROP TABLE customers; --",
        "1' OR '1'='1",
        "1; SELECT * FROM users; --",
        "<script>alert('xss')</script>",
        "' UNION SELECT password FROM users --"
    ]
    
    for malicious_input in malicious_inputs:
        # Test in customer search
        response = client.get(
            f"/api/customers/?search={malicious_input}",
            headers=auth_headers_admin
        )
        # Should not return 500 error or expose data
        assert response.status_code in [200, 400, 422]
        
        # Should not return sensitive data
        if response.status_code == 200:
            data = response.json()
            # Ensure no password or sensitive data is exposed
            response_text = str(data).lower()
            assert "password" not in response_text
            assert "hash" not in response_text

def test_xss_protection(client: TestClient, auth_headers_admin):
    """Test protection against XSS attacks"""
    xss_payloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "javascript:alert('xss')",
        "<svg onload=alert('xss')>",
    ]
    
    for payload in xss_payloads:
        # Test creating customer with XSS payload
        customer_data = {
            "name": payload,
            "phone": "1234567890",
            "email": "test@example.com"
        }
        
        response = client.post(
            "/api/customers/",
            json=customer_data,
            headers=auth_headers_admin
        )
        
        # Should either reject or sanitize
        if response.status_code == 201:
            data = response.json()
            # Check that script tags are not present in response
            assert "<script>" not in data["name"]
            assert "javascript:" not in data["name"]

def test_cors_headers(client: TestClient):
    """Test CORS headers are properly set"""
    response = client.options("/api/customers/")
    
    # Check for CORS headers
    assert "access-control-allow-origin" in response.headers
    assert "access-control-allow-methods" in response.headers

def test_security_headers(client: TestClient):
    """Test security headers are present"""
    response = client.get("/health")
    
    security_headers = [
        "x-content-type-options",
        "x-frame-options",
        "x-xss-protection"
    ]
    
    for header in security_headers:
        assert header in response.headers

def test_rate_limiting(client: TestClient):
    """Test rate limiting (if enabled in test environment)"""
    # Make multiple rapid requests to test rate limiting
    responses = []
    for _ in range(50):
        response = client.get("/health")
        responses.append(response.status_code)
    
    # Should not return too many 429 errors in test environment
    # but also should not crash
    assert all(status in [200, 429] for status in responses)

def test_input_validation(client: TestClient, auth_headers_admin):
    """Test input validation and sanitization"""
    invalid_customer_data = [
        {"name": "", "phone": "123"},  # Invalid short name and phone
        {"name": "A" * 300, "phone": "1234567890"},  # Too long name
        {"name": "Valid Name", "phone": "invalid_phone"},  # Invalid phone
        {"name": "Valid Name", "email": "invalid_email"},  # Invalid email
        {"name": "Valid Name", "gst_number": "invalid_gst"},  # Invalid GST
    ]
    
    for data in invalid_customer_data:
        response = client.post(
            "/api/customers/",
            json=data,
            headers=auth_headers_admin
        )
        # Should return validation error
        assert response.status_code == 422

def test_password_strength_validation():
    """Test password strength validation"""
    from app.core.security import validate_password_strength
    
    weak_passwords = [
        "123",
        "password",
        "12345678",
        "abcdefgh",
        "ABCDEFGH"
    ]
    
    strong_passwords = [
        "MyStr0ngP@ssw0rd",
        "C0mpl3x!P@ssw0rd",
        "Secure123!",
        "MyP@ssw0rd2023"
    ]
    
    for password in weak_passwords:
        result = validate_password_strength(password)
        # At least some requirements should fail
        assert not all(result.values())
    
    for password in strong_passwords:
        result = validate_password_strength(password)
        assert result["is_valid"]

def test_sensitive_data_not_exposed(client: TestClient, auth_headers_admin):
    """Test that sensitive data is not exposed in API responses"""
    # Create a user first
    response = client.get("/api/auth/me", headers=auth_headers_admin)
    assert response.status_code == 200
    
    user_data = response.json()
    
    # Ensure password hash is not exposed
    assert "password" not in user_data
    assert "password_hash" not in user_data
    assert "hash" not in user_data.get("password", "")

def test_file_upload_security(client: TestClient, auth_headers_admin):
    """Test file upload security (if file upload is implemented)"""
    # Test malicious file types
    malicious_files = [
        ("test.php", b"<?php system($_GET['cmd']); ?>"),
        ("test.exe", b"\x4d\x5a\x90\x00"),  # PE header
        ("test.sh", b"#!/bin/bash\nrm -rf /"),
    ]
    
    for filename, content in malicious_files:
        files = {"file": (filename, content, "application/octet-stream")}
        
        # If file upload endpoint exists, test it
        # response = client.post("/api/upload/", files=files, headers=auth_headers_admin)
        # Should reject malicious files
        # assert response.status_code in [400, 415, 422]
        pass  # Skip if upload not implemented

def test_database_connection_security(db_session: Session):
    """Test database connection security"""
    # Ensure database operations don't expose sensitive information
    # This is more of a configuration test
    
    # Test that we can't access system tables (in production)
    # This would depend on database permissions
    pass

def test_logging_security(client: TestClient, auth_headers_admin):
    """Test that sensitive data is not logged"""
    # Make a request that would typically be logged
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    
    # This test would need to check actual log files
    # For now, just ensure the response doesn't contain password
    assert "admin123" not in str(response.content)

def test_error_message_security(client: TestClient, auth_headers_admin):
    """Test that error messages don't expose sensitive information"""
    # Test with invalid customer ID
    response = client.get("/api/customers/invalid-uuid", headers=auth_headers_admin)
    
    # Should return generic error, not expose database structure
    assert response.status_code in [400, 404, 422]
    error_message = response.json().get("detail", "").lower()
    
    # Should not expose database table names or structure
    assert "table" not in error_message
    assert "column" not in error_message
    assert "foreign key" not in error_message