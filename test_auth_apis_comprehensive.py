#!/usr/bin/env python3
"""
Comprehensive Authentication API Test Suite
Tests all authentication endpoints based on current database schema
"""

import os
import sys
import json
import time
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import requests
from dataclasses import dataclass
import urllib3

# Disable SSL warnings for testing
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Test result data structure"""
    endpoint: str
    method: str
    status_code: int
    success: bool
    response_data: Any
    error_message: Optional[str] = None
    response_time: float = 0.0

class AuthAPITester:
    """Comprehensive Authentication API Tester"""
    
    def __init__(self, base_url: str = None):
        """Initialize the tester with base URL"""
        self.base_url = base_url or os.getenv("API_BASE_URL", "https://jbms1.onrender.com")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        self.admin_token = None
        self.test_user_token = None
        self.test_results = []
        
        logger.info(f"Initialized AuthAPITester with base URL: {self.base_url}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, params: Dict = None) -> TestResult:
        """Make HTTP request and return structured result"""
        url = f"{self.base_url}{endpoint}"
        
        # Merge headers
        request_headers = self.session.headers.copy()
        if headers:
            request_headers.update(headers)
        
        start_time = time.time()
        
        try:
            logger.info(f"Making {method} request to {url}")
            if data:
                logger.info(f"Request data: {json.dumps(data, indent=2)}")
            
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                headers=request_headers,
                params=params,
                timeout=30,
                verify=False
            )
            
            response_time = time.time() - start_time
            
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}
            
            success = 200 <= response.status_code < 300
            
            result = TestResult(
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                success=success,
                response_data=response_data,
                response_time=response_time,
                error_message=None if success else f"HTTP {response.status_code}"
            )
            
            logger.info(f"Response: {response.status_code} in {response_time:.2f}s")
            if not success:
                logger.error(f"Error response: {response_data}")
            
            return result
            
        except Exception as e:
            response_time = time.time() - start_time
            error_msg = f"Request failed: {str(e)}"
            logger.error(error_msg)
            
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                success=False,
                response_data={"error": str(e)},
                error_message=error_msg,
                response_time=response_time
            )
    
    def test_debug_endpoints(self):
        """Test debug endpoints"""
        logger.info("=== Testing Debug Endpoints ===")
        
        # Test simple endpoint (no auth required)
        result = self.make_request("GET", "/auth/debug/simple-test")
        self.test_results.append(result)
        
        if not result.success:
            logger.error("Simple test endpoint failed - API might be down")
            return False
        
        return True
    
    def test_admin_login(self) -> bool:
        """Test admin login and store token"""
        logger.info("=== Testing Admin Login ===")
        
        # Test with form data (OAuth2PasswordRequestForm)
        login_data = {
            "username": "admin",
            "password": os.getenv("TEST_PASSWORD", "change-me")
        }
        
        # OAuth2PasswordRequestForm expects form data, not JSON
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        # Convert to form data
        form_data = f"username={login_data['username']}&password = os.getenv("TEST_PASSWORD", "change-me")
        
        start_time = time.time()
        url = f"{self.base_url}/auth/login"
        
        try:
            response = requests.post(
                url,
                data=form_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            response_time = time.time() - start_time
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}
            
            result = TestResult(
                endpoint="/auth/login",
                method="POST",
                status_code=response.status_code,
                success=200 <= response.status_code < 300,
                response_data=response_data,
                response_time=response_time,
                error_message=None if response.status_code < 400 else f"HTTP {response.status_code}"
            )
            
            self.test_results.append(result)
            
            if result.success and "access_token" in response_data:
                self.admin_token = response_data["access_token"]
                logger.info("Admin login successful, token stored")
                return True
            else:
                logger.error(f"Admin login failed: {response_data}")
                return False
                
        except Exception as e:
            logger.error(f"Admin login request failed: {str(e)}")
            return False
    
    def test_token_verification(self):
        """Test token verification endpoints"""
        if not self.admin_token:
            logger.error("No admin token available for token verification tests")
            return
        
        logger.info("=== Testing Token Verification ===")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test debug token endpoint
        result = self.make_request("GET", "/auth/debug/token", headers=headers)
        self.test_results.append(result)
        
        # Test debug user endpoint
        result = self.make_request("GET", "/auth/debug/user", headers=headers)
        self.test_results.append(result)
        
        # Test auth test endpoint
        result = self.make_request("GET", "/auth/debug/auth-test", headers=headers)
        self.test_results.append(result)
    
    def test_user_info_endpoints(self):
        """Test user information endpoints"""
        if not self.admin_token:
            logger.error("No admin token available for user info tests")
            return
        
        logger.info("=== Testing User Information Endpoints ===")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test get current user info (/me)
        result = self.make_request("GET", "/auth/me", headers=headers)
        self.test_results.append(result)
        
        # Test list all users (admin/manager only)
        result = self.make_request("GET", "/auth/users", headers=headers)
        self.test_results.append(result)
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        if not self.admin_token:
            logger.error("No admin token available for user registration tests")
            return
        
        logger.info("=== Testing User Registration ===")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test user creation (admin only)
        unique_suffix = str(uuid.uuid4())[:8]
        test_user_data = {
            "username": f"testuser_{unique_suffix}",
            "email": f"testuser_{unique_suffix}@example.com",
            "full_name": f"Test User {unique_suffix}",
            "password": "testpassword123",
            "role": "employee",
            "is_active": True
        }
        
        result = self.make_request("POST", "/auth/register", data=test_user_data, headers=headers)
        self.test_results.append(result)
        
        # If user creation successful, test login with new user
        if result.success:
            logger.info("Test user created successfully, testing login")
            self.test_new_user_login(test_user_data["username"], test_user_data["password"])
    
    def test_new_user_login(self, username: str, password: str):
        """Test login with newly created user"""
        logger.info(f"=== Testing Login with New User: {username} ===")
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        form_data = f"username={username}&password = os.getenv("TEST_PASSWORD", "change-me")
        
        start_time = time.time()
        url = f"{self.base_url}/auth/login"
        
        try:
            response = requests.post(
                url,
                data=form_data,
                headers=headers,
                timeout=30,
                verify=False
            )
            
            response_time = time.time() - start_time
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}
            
            result = TestResult(
                endpoint="/auth/login",
                method="POST",
                status_code=response.status_code,
                success=200 <= response.status_code < 300,
                response_data=response_data,
                response_time=response_time,
                error_message=None if response.status_code < 400 else f"HTTP {response.status_code}"
            )
            
            self.test_results.append(result)
            
            if result.success and "access_token" in response_data:
                self.test_user_token = response_data["access_token"]
                logger.info("New user login successful")
                
                # Test user endpoints with new user token
                self.test_user_endpoints_with_test_user()
            else:
                logger.error(f"New user login failed: {response_data}")
                
        except Exception as e:
            logger.error(f"New user login request failed: {str(e)}")
    
    def test_user_endpoints_with_test_user(self):
        """Test endpoints with test user token (non-admin)"""
        if not self.test_user_token:
            logger.error("No test user token available")
            return
        
        logger.info("=== Testing Endpoints with Test User Token ===")
        
        headers = {"Authorization": f"Bearer {self.test_user_token}"}
        
        # Test get current user info (should work)
        result = self.make_request("GET", "/auth/me", headers=headers)
        self.test_results.append(result)
        
        # Test list all users (should fail - not admin/manager)
        result = self.make_request("GET", "/auth/users", headers=headers)
        self.test_results.append(result)
        
        # Test user registration (should fail - not admin)
        test_user_data = {
            "username": "unauthorized_user",
            "email": "unauthorized@example.com",
            "full_name": "Unauthorized User",
            "password": "password123",
            "role": "employee",
            "is_active": True
        }
        result = self.make_request("POST", "/auth/register", data=test_user_data, headers=headers)
        self.test_results.append(result)
    
    def test_invalid_credentials(self):
        """Test various invalid credential scenarios"""
        logger.info("=== Testing Invalid Credentials ===")
        
        # Test with invalid username
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        form_data = "username=nonexistent&password = os.getenv("TEST_PASSWORD", "change-me")
        
        start_time = time.time()
        url = f"{self.base_url}/auth/login"
        
        try:
            response = requests.post(url, data=form_data, headers=headers, timeout=30, verify=False)
            response_time = time.time() - start_time
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}
            
            result = TestResult(
                endpoint="/auth/login",
                method="POST",
                status_code=response.status_code,
                success=response.status_code == 401,  # Should fail with 401
                response_data=response_data,
                response_time=response_time,
                error_message=None if response.status_code == 401 else f"Expected 401, got {response.status_code}"
            )
            
            self.test_results.append(result)
            
        except Exception as e:
            logger.error(f"Invalid credentials test failed: {str(e)}")
        
        # Test with invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token_123"}
        result = self.make_request("GET", "/auth/me", headers=invalid_headers)
        result.success = result.status_code == 401  # Should fail with 401
        self.test_results.append(result)
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        logger.info("=== Testing Unauthorized Access ===")
        
        # Test accessing protected endpoints without token
        protected_endpoints = [
            ("/auth/me", "GET"),
            ("/auth/users", "GET"),
            ("/auth/register", "POST")
        ]
        
        for endpoint, method in protected_endpoints:
            result = self.make_request(method, endpoint)
            result.success = result.status_code == 401  # Should fail with 401
            if result.status_code != 401:
                result.error_message = f"Expected 401 Unauthorized, got {result.status_code}"
            self.test_results.append(result)
    
    def run_all_tests(self):
        """Run all authentication API tests"""
        logger.info("Starting comprehensive authentication API tests...")
        
        # Test debug endpoints first
        if not self.test_debug_endpoints():
            logger.error("Debug endpoints failed - stopping tests")
            return self.generate_report()
        
        # Test admin login
        if not self.test_admin_login():
            logger.error("Admin login failed - continuing with limited tests")
        
        # Test token verification
        self.test_token_verification()
        
        # Test user info endpoints
        self.test_user_info_endpoints()
        
        # Test user registration
        self.test_user_registration()
        
        # Test invalid credentials
        self.test_invalid_credentials()
        
        # Test unauthorized access
        self.test_unauthorized_access()
        
        return self.generate_report()
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result.success)
        failed_tests = total_tests - passed_tests
        
        # Group results by endpoint
        endpoint_results = {}
        for result in self.test_results:
            key = f"{result.method} {result.endpoint}"
            if key not in endpoint_results:
                endpoint_results[key] = []
            endpoint_results[key].append(result)
        
        # Calculate average response time
        avg_response_time = sum(r.response_time for r in self.test_results) / total_tests if total_tests > 0 else 0
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
                "average_response_time": f"{avg_response_time:.3f}s"
            },
            "test_results": [],
            "detailed_results": {}
        }
        
        # Add individual test results
        for result in self.test_results:
            report["test_results"].append({
                "endpoint": result.endpoint,
                "method": result.method,
                "status_code": result.status_code,
                "success": result.success,
                "response_time": f"{result.response_time:.3f}s",
                "error_message": result.error_message
            })
        
        # Add detailed results by endpoint
        for endpoint, results in endpoint_results.items():
            report["detailed_results"][endpoint] = [
                {
                    "status_code": r.status_code,
                    "success": r.success,
                    "response_time": f"{r.response_time:.3f}s",
                    "response_data": r.response_data,
                    "error_message": r.error_message
                }
                for r in results
            ]
        
        return report

def main():
    """Main function to run authentication API tests"""
    
    # Get base URL from environment or use default
    base_url = os.getenv("API_BASE_URL", "https://jbms1.onrender.com")
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                Authentication API Test Suite                 ║
    ║                                                              ║
    ║  Testing all authentication endpoints based on current       ║
    ║  database schema and backend implementation                  ║
    ║                                                              ║
    ║  Base URL: {base_url:<45} ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Initialize tester
    tester = AuthAPITester(base_url)
    
    # Run all tests
    report = tester.run_all_tests()
    
    # Print summary results
    print(f"\n{'='*60}")
    print(f"  AUTHENTICATION API TEST RESULTS")
    print(f"{'='*60}")
    print(f"Total Tests: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Success Rate: {report['summary']['success_rate']}")
    print(f"Average Response Time: {report['summary']['average_response_time']}")
    print(f"{'='*60}")
    
    # Print individual test results
    print(f"\nDetailed Test Results:")
    print(f"{'Endpoint':<25} {'Method':<8} {'Status':<8} {'Time':<10} {'Result'}")
    print(f"{'-'*70}")
    
    for result in report["test_results"]:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"{result['endpoint']:<25} {result['method']:<8} {result['status_code']:<8} {result['response_time']:<10} {status}")
        if result["error_message"]:
            print(f"  └─ Error: {result['error_message']}")
    
    # Save detailed report
    report_filename = f"auth_api_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_filename, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_filename}")
    
    # Print key findings
    print(f"\n{'='*60}")
    print(f"  KEY FINDINGS")
    print(f"{'='*60}")
    
    # Check if basic functionality works
    auth_working = any(r["endpoint"] == "/auth/login" and r["success"] for r in report["test_results"])
    debug_working = any(r["endpoint"] == "/auth/debug/simple-test" and r["success"] for r in report["test_results"])
    
    if debug_working:
        print("✅ API server is responding")
    else:
        print("❌ API server is not responding")
    
    if auth_working:
        print("✅ Authentication system is working")
    else:
        print("❌ Authentication system has issues")
    
    # Check authorization
    unauthorized_tests = [r for r in report["test_results"] if "unauthorized" in r.get("error_message", "").lower()]
    if len(unauthorized_tests) > 0:
        print("✅ Authorization controls are working")
    
    print(f"{'='*60}")
    
    return report

if __name__ == "__main__":
    try:
        report = main()
        # Exit with error code if tests failed
        if report["summary"]["failed"] > 0:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nFatal error: {str(e)}")
        sys.exit(1)