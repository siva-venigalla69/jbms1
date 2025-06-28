#!/usr/bin/env python3
"""
Secure Test Configuration
Uses environment variables for sensitive data
"""
import os
from typing import Dict, Any

# Test credentials from environment variables
TEST_USERNAME = os.getenv("TEST_USERNAME", "admin")
TEST_PASSWORD = os.getenv("TEST_PASSWORD")
TEST_BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
PRODUCTION_BASE_URL = os.getenv("PRODUCTION_BASE_URL", "https://jbms1.onrender.com")

def get_test_credentials() -> Dict[str, Any]:
    """Get secure test credentials"""
    if not TEST_PASSWORD:
        raise ValueError(
            "❌ TEST_PASSWORD environment variable not set!\n"
            "Run: export TEST_PASSWORD='your-secure-password'"
        )
    
    return {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "base_url": TEST_BASE_URL
    }

def get_production_credentials() -> Dict[str, Any]:
    """Get production credentials"""
    prod_password = os.getenv("PRODUCTION_PASSWORD")
    if not prod_password:
        raise ValueError(
            "❌ PRODUCTION_PASSWORD environment variable not set!\n"
            "Run: export PRODUCTION_PASSWORD='your-production-password'"
        )
    
    return {
        "username": TEST_USERNAME,
        "password": prod_password,
        "base_url": PRODUCTION_BASE_URL
    }

# Security check
if __name__ == "__main__":
    try:
        creds = get_test_credentials()
        print("✅ Test credentials configured securely")
        print(f"   Username: {creds['username']}")
        print(f"   Base URL: {creds['base_url']}")
        print("   Password: *** (hidden)")
    except ValueError as e:
        print(e) 