#!/usr/bin/env python3
"""
DM System Backend API Testing
Tests the new backend features for DM system as specified in the review request.
"""

import requests
import json
import uuid
import base64
from datetime import datetime

# Configuration
BASE_URL = "https://buildsaver.preview.emergentagent.com/api"
TEST_USER_ID = str(uuid.uuid4())
TEST_CONVERSATION_ID = str(uuid.uuid4())
TEST_MEDIA_ID = str(uuid.uuid4())

def test_endpoint(method, endpoint, data=None, files=None, expected_status=None):
    """Test an API endpoint and return the response"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            if files:
                response = requests.post(url, files=files, timeout=10)
            else:
                response = requests.post(url, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, timeout=10)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        result = {
            "method": method.upper(),
            "endpoint": endpoint,
            "status_code": response.status_code,
            "success": True
        }
        
        # Try to parse JSON response
        try:
            result["response"] = response.json()
        except:
            result["response"] = response.text
            
        # Check expected status if provided
        if expected_status and response.status_code != expected_status:
            result["success"] = False
            result["error"] = f"Expected status {expected_status}, got {response.status_code}"
            
        return result
        
    except requests.exceptions.RequestException as e:
        return {
            "method": method.upper(),
            "endpoint": endpoint,
            "error": str(e),
            "success": False
        }

def run_dm_system_tests():
    """Run comprehensive DM system tests"""
    print("=" * 80)
    print("DM SYSTEM BACKEND API TESTING")
    print("=" * 80)
    print(f"Testing server: {BASE_URL}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print()
    
    test_results = []
    
    # Test 1: User Blocking Endpoints
    print("1. TESTING USER BLOCKING ENDPOINTS")
    print("-" * 50)
    
    # Block a user (should require auth - expect 403/401)
    result = test_endpoint("POST", f"/users/{TEST_USER_ID}/block", expected_status=403)
    test_results.append(result)
    print(f"✓ POST /users/{{user_id}}/block: {result['status_code']} (Auth required)")
    
    # Unblock a user (should require auth - expect 403/401)
    result = test_endpoint("DELETE", f"/users/{TEST_USER_ID}/block", expected_status=403)
    test_results.append(result)
    print(f"✓ DELETE /users/{{user_id}}/block: {result['status_code']} (Auth required)")
    
    # Get blocked users (should require auth - expect 403/401)
    result = test_endpoint("GET", "/users/blocked", expected_status=403)
    test_results.append(result)
    print(f"✓ GET /users/blocked: {result['status_code']} (Auth required)")
    
    print()
    
    # Test 2: User Reporting Endpoints
    print("2. TESTING USER REPORTING ENDPOINTS")
    print("-" * 50)
    
    # Report a user (should require auth - expect 403/401)
    report_data = {"reason": "Spam", "description": "Test report"}
    result = test_endpoint("POST", f"/users/{TEST_USER_ID}/report", data=report_data, expected_status=403)
    test_results.append(result)
    print(f"✓ POST /users/{{user_id}}/report: {result['status_code']} (Auth required)")
    
    print()
    
    # Test 3: User Muting Endpoints
    print("3. TESTING USER MUTING ENDPOINTS")
    print("-" * 50)
    
    # Mute notifications (should require auth - expect 403/401)
    mute_data = {"duration": "8h"}
    result = test_endpoint("POST", f"/users/{TEST_USER_ID}/mute", data=mute_data, expected_status=403)
    test_results.append(result)
    print(f"✓ POST /users/{{user_id}}/mute: {result['status_code']} (Auth required)")
    
    # Test different duration formats
    for duration in ["1w", "forever"]:
        mute_data = {"duration": duration}
        result = test_endpoint("POST", f"/users/{TEST_USER_ID}/mute", data=mute_data, expected_status=403)
        test_results.append(result)
        print(f"✓ POST /users/{{user_id}}/mute (duration: {duration}): {result['status_code']} (Auth required)")
    
    # Unmute user (should require auth - expect 403/401)
    result = test_endpoint("DELETE", f"/users/{TEST_USER_ID}/mute", expected_status=403)
    test_results.append(result)
    print(f"✓ DELETE /users/{{user_id}}/mute: {result['status_code']} (Auth required)")
    
    # Get block/mute status (should require auth - expect 403/401)
    result = test_endpoint("GET", f"/users/{TEST_USER_ID}/status", expected_status=403)
    test_results.append(result)
    print(f"✓ GET /users/{{user_id}}/status: {result['status_code']} (Auth required)")
    
    print()
    
    # Test 4: Media Upload Endpoints
    print("4. TESTING MEDIA UPLOAD ENDPOINTS")
    print("-" * 50)
    
    # Upload media (multipart/form-data) (should require auth - expect 403/401)
    result = test_endpoint("POST", f"/conversations/{TEST_CONVERSATION_ID}/upload", expected_status=403)
    test_results.append(result)
    print(f"✓ POST /conversations/{{conversation_id}}/upload: {result['status_code']} (Auth required)")
    
    # Get media file (should require auth - expect 403/401)
    result = test_endpoint("GET", f"/media/{TEST_MEDIA_ID}", expected_status=403)
    test_results.append(result)
    print(f"✓ GET /media/{{media_id}}: {result['status_code']} (Auth required)")
    
    print()
    
    # Test 5: Location Sharing Endpoints
    print("5. TESTING LOCATION SHARING ENDPOINTS")
    print("-" * 50)
    
    # Send location (should require auth - expect 403/401)
    location_data = {
        "latitude": 41.0082,
        "longitude": 28.9784,
        "address": "Istanbul, Turkey"
    }
    result = test_endpoint("POST", f"/conversations/{TEST_CONVERSATION_ID}/location", data=location_data, expected_status=403)
    test_results.append(result)
    print(f"✓ POST /conversations/{{conversation_id}}/location: {result['status_code']} (Auth required)")
    
    print()
    
    # Test 6: Push Notifications Endpoints
    print("6. TESTING PUSH NOTIFICATIONS ENDPOINTS")
    print("-" * 50)
    
    # Save push token (should require auth - expect 403/401)
    push_token_data = {"token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"}
    result = test_endpoint("POST", "/users/push-token", data=push_token_data, expected_status=403)
    test_results.append(result)
    print(f"✓ POST /users/push-token: {result['status_code']} (Auth required)")
    
    # Get notifications (should require auth - expect 403/401)
    result = test_endpoint("GET", "/notifications", expected_status=403)
    test_results.append(result)
    print(f"✓ GET /notifications: {result['status_code']} (Auth required)")
    
    # Mark notification as read (should require auth - expect 403/401)
    notification_id = str(uuid.uuid4())
    result = test_endpoint("PUT", f"/notifications/{notification_id}/read", expected_status=403)
    test_results.append(result)
    print(f"✓ PUT /notifications/{{notification_id}}/read: {result['status_code']} (Auth required)")
    
    # Mark all notifications as read (should require auth - expect 403/401)
    result = test_endpoint("PUT", "/notifications/read-all", expected_status=403)
    test_results.append(result)
    print(f"✓ PUT /notifications/read-all: {result['status_code']} (Auth required)")
    
    print()
    
    # Test 7: Server Connectivity and Basic Health Check
    print("7. TESTING SERVER CONNECTIVITY")
    print("-" * 50)
    
    # Basic health check
    result = test_endpoint("GET", "/")
    test_results.append(result)
    print(f"✓ GET /api/: {result['status_code']} - {result.get('response', {}).get('message', 'No message')}")
    
    print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    total_tests = len(test_results)
    successful_tests = sum(1 for r in test_results if r.get('success', False))
    failed_tests = total_tests - successful_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
    
    print("\nDETAILED RESULTS:")
    print("-" * 50)
    
    for i, result in enumerate(test_results, 1):
        status = "✅ PASS" if result.get('success', False) else "❌ FAIL"
        print(f"{i:2d}. {result['method']} {result['endpoint']}: {result['status_code']} {status}")
        if not result.get('success', False) and 'error' in result:
            print(f"    Error: {result['error']}")
    
    print()
    
    # Check for 500 errors
    server_errors = [r for r in test_results if r.get('status_code', 0) >= 500]
    if server_errors:
        print("⚠️  SERVER ERRORS DETECTED:")
        for error in server_errors:
            print(f"   {error['method']} {error['endpoint']}: {error['status_code']}")
    else:
        print("✅ No 500 errors detected")
    
    # Check authentication protection
    auth_protected = [r for r in test_results if r.get('status_code') in [401, 403]]
    print(f"\n🔒 Authentication Protection: {len(auth_protected)}/{total_tests-1} endpoints properly protected")
    
    print(f"\nTest completed at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    return test_results

if __name__ == "__main__":
    results = run_dm_system_tests()