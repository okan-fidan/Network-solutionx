#!/usr/bin/env python3
"""
Admin Panel Community and Join Request Management Endpoints Test
Testing specific admin endpoints as per review request
"""

import requests
import json
import sys
from datetime import datetime

# Server configuration
BASE_URL = "https://android-deploy-fix.preview.emergentagent.com/api"

def test_admin_endpoints():
    """Test admin panel community and join request management endpoints"""
    
    print("=" * 80)
    print("ADMIN PANEL COMMUNITY & JOIN REQUEST MANAGEMENT ENDPOINTS TEST")
    print("=" * 80)
    print(f"Server: {BASE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    print()
    
    # Test results tracking
    results = {
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "endpoints_tested": [],
        "issues": []
    }
    
    # Test endpoints from review request
    test_cases = [
        {
            "name": "Get Communities (Admin)",
            "method": "GET",
            "url": f"{BASE_URL}/admin/communities",
            "description": "List all communities"
        },
        {
            "name": "Get Community Subgroups (Admin)",
            "method": "GET", 
            "url": f"{BASE_URL}/admin/communities/test-community-id/subgroups",
            "description": "List subgroups with member count and pending request count"
        },
        {
            "name": "Get Community Members (Admin)",
            "method": "GET",
            "url": f"{BASE_URL}/admin/communities/test-community-id/members", 
            "description": "List community members"
        },
        {
            "name": "Get All Join Requests (Admin)",
            "method": "GET",
            "url": f"{BASE_URL}/admin/join-requests",
            "description": "Get all pending join requests"
        },
        {
            "name": "Get Subgroup Join Requests (Admin)",
            "method": "GET",
            "url": f"{BASE_URL}/admin/subgroup-join-requests?community_id=test-id",
            "description": "Get join requests for specific community"
        },
        {
            "name": "Approve Join Request",
            "method": "POST",
            "url": f"{BASE_URL}/subgroups/test-subgroup-id/approve/test-user-id",
            "description": "Approve join request"
        },
        {
            "name": "Reject Join Request", 
            "method": "POST",
            "url": f"{BASE_URL}/subgroups/test-subgroup-id/reject/test-user-id",
            "description": "Reject join request"
        },
        {
            "name": "Update Subgroup (Admin)",
            "method": "PUT",
            "url": f"{BASE_URL}/admin/subgroups/test-subgroup-id",
            "description": "Update subgroup name/description",
            "body": {"name": "New Name", "description": "New description"}
        },
        {
            "name": "Delete Subgroup (Admin)",
            "method": "DELETE", 
            "url": f"{BASE_URL}/admin/subgroups/test-subgroup-id",
            "description": "Delete subgroup"
        }
    ]
    
    print("TESTING ADMIN ENDPOINTS (WITHOUT AUTHENTICATION)")
    print("Expected: All should return 401/403 (authentication required)")
    print("-" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        results["total_tests"] += 1
        results["endpoints_tested"].append(test_case["url"])
        
        print(f"{i}. {test_case['name']}")
        print(f"   Method: {test_case['method']}")
        print(f"   URL: {test_case['url']}")
        print(f"   Description: {test_case['description']}")
        
        try:
            # Make request without authentication
            if test_case["method"] == "GET":
                response = requests.get(test_case["url"], timeout=10)
            elif test_case["method"] == "POST":
                body = test_case.get("body", {})
                response = requests.post(test_case["url"], json=body, timeout=10)
            elif test_case["method"] == "PUT":
                body = test_case.get("body", {})
                response = requests.put(test_case["url"], json=body, timeout=10)
            elif test_case["method"] == "DELETE":
                response = requests.delete(test_case["url"], timeout=10)
            
            print(f"   Status: {response.status_code}")
            
            # Check if endpoint exists and requires authentication
            if response.status_code in [401, 403]:
                print(f"   Result: ✅ PASS - Properly requires authentication")
                results["passed"] += 1
                
                # Try to parse response
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"   Response: {response.text[:200]}")
                    
            elif response.status_code == 404:
                print(f"   Result: ❌ FAIL - Endpoint not found (404)")
                results["failed"] += 1
                results["issues"].append(f"{test_case['name']}: Endpoint not implemented (404)")
                
            elif response.status_code >= 500:
                print(f"   Result: ❌ FAIL - Server error ({response.status_code})")
                results["failed"] += 1
                results["issues"].append(f"{test_case['name']}: Server error {response.status_code}")
                
            else:
                print(f"   Result: ⚠️  UNEXPECTED - Status {response.status_code}")
                results["failed"] += 1
                results["issues"].append(f"{test_case['name']}: Unexpected status {response.status_code}")
                
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"   Response: {response.text[:200]}")
            
        except requests.exceptions.RequestException as e:
            print(f"   Result: ❌ FAIL - Connection error: {str(e)}")
            results["failed"] += 1
            results["issues"].append(f"{test_case['name']}: Connection error - {str(e)}")
        
        print()
    
    # Additional connectivity test
    print("BASIC CONNECTIVITY TEST")
    print("-" * 30)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"GET {BASE_URL}/ - Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Server is accessible")
            results["passed"] += 1
        else:
            print("❌ Server connectivity issue")
            results["failed"] += 1
        results["total_tests"] += 1
    except Exception as e:
        print(f"❌ Server connection failed: {e}")
        results["failed"] += 1
        results["total_tests"] += 1
    
    print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Success Rate: {(results['passed']/results['total_tests']*100):.1f}%")
    print()
    
    if results["issues"]:
        print("ISSUES FOUND:")
        for issue in results["issues"]:
            print(f"  - {issue}")
        print()
    
    print("ENDPOINTS TESTED:")
    for endpoint in results["endpoints_tested"]:
        print(f"  - {endpoint}")
    
    print()
    print("NOTES:")
    print("- All admin endpoints should require Firebase authentication")
    print("- 401/403 responses indicate proper authentication protection")
    print("- 404 responses indicate missing endpoint implementations")
    print("- Server errors (500+) indicate implementation issues")
    
    return results

if __name__ == "__main__":
    test_admin_endpoints()