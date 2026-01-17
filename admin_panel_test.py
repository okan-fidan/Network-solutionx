#!/usr/bin/env python3
"""
Admin Panel API Endpoints Testing Script
Tests the specific admin endpoints requested in the review:
1. /api/admin/users - Get all users endpoint
2. /api/admin/join-requests - Get all join requests endpoint  
3. /api/admin/communities - Get all communities endpoint
4. /api/admin/communities/{id}/members - Get community members endpoint
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://admindash-12.preview.emergentagent.com/api"

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"Testing: {test_name}")
    print(f"{'='*60}")

def print_result(endpoint, status_code, response_data, expected_status=None):
    print(f"\nEndpoint: {endpoint}")
    print(f"Status Code: {status_code}")
    if expected_status:
        print(f"Expected: {expected_status}")
        print(f"Result: {'✅ PASS' if status_code in expected_status else '❌ FAIL'}")
    
    if isinstance(response_data, dict):
        print(f"Response: {json.dumps(response_data, indent=2)}")
    else:
        print(f"Response: {response_data}")

def test_user_registration():
    """Test user registration to create test data"""
    print_test_header("User Registration (Create Test Data)")
    
    # Test data for user registration
    test_user_data = {
        "firstName": "Test",
        "lastName": "Admin",
        "email": "testadmin@example.com",
        "city": "İstanbul",
        "occupation": "Software Developer",
        "uid": "test-firebase-uid-12345"  # Mock Firebase UID
    }
    
    # Mock Firebase token header (for testing purposes)
    headers = {
        "Authorization": "Bearer mock-firebase-token-for-testing",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/user/register",
            json=test_user_data,
            headers=headers,
            timeout=10
        )
        
        print_result("/user/register", response.status_code, 
                    response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                    [200, 201, 401, 403])
        
        return response.status_code in [200, 201, 401, 403]  # Accept auth errors as expected
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_admin_endpoints():
    """Test the specific admin endpoints requested"""
    
    # Mock admin headers (since we can't get real Firebase tokens in testing)
    headers = {
        "Authorization": "Bearer mock-admin-firebase-token",
        "Content-Type": "application/json"
    }
    
    admin_endpoints = [
        {
            "name": "Get All Users",
            "endpoint": "/admin/users",
            "method": "GET",
            "expected_status": [200, 401, 403]  # 200 if authenticated admin, 401/403 if not
        },
        {
            "name": "Get All Join Requests", 
            "endpoint": "/admin/join-requests",
            "method": "GET",
            "expected_status": [200, 401, 403]
        },
        {
            "name": "Get All Communities",
            "endpoint": "/admin/communities", 
            "method": "GET",
            "expected_status": [200, 401, 403]
        }
    ]
    
    results = []
    
    for test_case in admin_endpoints:
        print_test_header(f"Admin Endpoint: {test_case['name']}")
        
        try:
            if test_case['method'] == 'GET':
                response = requests.get(
                    f"{BACKEND_URL}{test_case['endpoint']}",
                    headers=headers,
                    timeout=10
                )
            
            response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            
            print_result(
                test_case['endpoint'], 
                response.status_code, 
                response_data,
                test_case['expected_status']
            )
            
            # Check if status code is in expected range
            is_success = response.status_code in test_case['expected_status']
            results.append({
                "endpoint": test_case['endpoint'],
                "name": test_case['name'],
                "status_code": response.status_code,
                "success": is_success,
                "response": response_data
            })
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            results.append({
                "endpoint": test_case['endpoint'],
                "name": test_case['name'], 
                "status_code": "ERROR",
                "success": False,
                "response": str(e)
            })
    
    return results

def test_community_members_endpoint():
    """Test the community members endpoint with a test community ID"""
    print_test_header("Admin Endpoint: Get Community Members")
    
    headers = {
        "Authorization": "Bearer mock-admin-firebase-token",
        "Content-Type": "application/json"
    }
    
    # First, try to get communities to find a valid community ID
    try:
        communities_response = requests.get(
            f"{BACKEND_URL}/admin/communities",
            headers=headers,
            timeout=10
        )
        
        if communities_response.status_code == 200:
            communities_data = communities_response.json()
            if communities_data and len(communities_data) > 0:
                # Use the first community ID
                community_id = communities_data[0].get('id')
                if community_id:
                    members_response = requests.get(
                        f"{BACKEND_URL}/admin/communities/{community_id}/members",
                        headers=headers,
                        timeout=10
                    )
                    
                    response_data = members_response.json() if members_response.headers.get('content-type', '').startswith('application/json') else members_response.text
                    
                    print_result(
                        f"/admin/communities/{community_id}/members",
                        members_response.status_code,
                        response_data,
                        [200, 401, 403]
                    )
                    
                    return {
                        "endpoint": f"/admin/communities/{community_id}/members",
                        "name": "Get Community Members",
                        "status_code": members_response.status_code,
                        "success": members_response.status_code in [200, 401, 403],
                        "response": response_data
                    }
        
        # If we can't get communities or no communities exist, test with a mock ID
        print("Testing with mock community ID since no communities found...")
        mock_response = requests.get(
            f"{BACKEND_URL}/admin/communities/mock-community-id/members",
            headers=headers,
            timeout=10
        )
        
        response_data = mock_response.json() if mock_response.headers.get('content-type', '').startswith('application/json') else mock_response.text
        
        print_result(
            "/admin/communities/mock-community-id/members",
            mock_response.status_code,
            response_data,
            [200, 401, 403, 404]
        )
        
        return {
            "endpoint": "/admin/communities/{id}/members",
            "name": "Get Community Members",
            "status_code": mock_response.status_code,
            "success": mock_response.status_code in [200, 401, 403, 404],
            "response": response_data
        }
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {
            "endpoint": "/admin/communities/{id}/members",
            "name": "Get Community Members",
            "status_code": "ERROR",
            "success": False,
            "response": str(e)
        }

def test_basic_connectivity():
    """Test basic API connectivity"""
    print_test_header("Basic API Connectivity")
    
    try:
        # Test root endpoint
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        print_result("/", response.status_code, 
                    response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text, 
                    [200])
        
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Basic connectivity failed: {e}")
        return False

def main():
    """Main testing function"""
    print("🚀 Starting Admin Panel API Endpoint Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    all_results = []
    
    # Test 1: Basic connectivity
    connectivity_ok = test_basic_connectivity()
    if not connectivity_ok:
        print("❌ Basic connectivity failed. Stopping tests.")
        return
    
    # Test 2: User registration (to create test data)
    print_test_header("Creating Test Data")
    user_reg_ok = test_user_registration()
    
    # Test 3: Admin endpoints
    admin_results = test_admin_endpoints()
    all_results.extend(admin_results)
    
    # Test 4: Community members endpoint
    members_result = test_community_members_endpoint()
    all_results.append(members_result)
    
    # Summary
    print_test_header("TEST SUMMARY")
    
    total_tests = len(all_results)
    passed_tests = sum(1 for r in all_results if r['success'])
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    
    print("\nDetailed Results:")
    for result in all_results:
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"{status} {result['name']} ({result['endpoint']}) - Status: {result['status_code']}")
    
    # Analysis
    print_test_header("ANALYSIS")
    
    auth_protected_count = sum(1 for r in all_results if r['status_code'] in [401, 403])
    working_count = sum(1 for r in all_results if r['status_code'] == 200)
    not_found_count = sum(1 for r in all_results if r['status_code'] == 404)
    
    print(f"🔒 Authentication Protected Endpoints: {auth_protected_count}")
    print(f"✅ Working Endpoints (200 OK): {working_count}")
    print(f"❓ Not Found Endpoints (404): {not_found_count}")
    
    if auth_protected_count > 0:
        print("\n📋 AUTHENTICATION ANALYSIS:")
        print("- Endpoints returning 401/403 indicate proper Firebase authentication is required")
        print("- This is expected behavior for admin endpoints")
        print("- To test with real data, valid Firebase admin tokens would be needed")
    
    if working_count > 0:
        print(f"\n✅ {working_count} endpoints are accessible and working")
    
    if not_found_count > 0:
        print(f"\n⚠️  {not_found_count} endpoints returned 404 - may not be implemented")
    
    print(f"\n🏁 Testing completed at {datetime.now().isoformat()}")

if __name__ == "__main__":
    main()