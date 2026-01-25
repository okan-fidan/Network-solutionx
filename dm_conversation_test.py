#!/usr/bin/env python3
"""
DM (Direct Message) Conversation System API Testing
Testing all conversation endpoints as requested in the review.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://mobil-market-pro.preview.emergentagent.com/api"

class DMConversationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.conversation_id = None
        self.message_id = None
        
    def log_test(self, test_name, success, details, response_code=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "response_code": response_code,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {details}")
        if response_code:
            print(f"    Response Code: {response_code}")
        print()

    def test_start_conversation_no_auth(self):
        """Test 1: Start Conversation without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations/start"
            data = {"otherUserId": "test-user-id", "type": "private"}
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "Start Conversation - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "Start Conversation - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Start Conversation - No Auth", False, f"Request failed: {str(e)}")

    def test_get_conversations_no_auth(self):
        """Test 2: Get Conversations without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "Get Conversations - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "Get Conversations - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Get Conversations - No Auth", False, f"Request failed: {str(e)}")

    def test_get_messages_no_auth(self):
        """Test 3: Get Messages without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations/test-conversation-id/messages"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "Get Messages - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "Get Messages - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Get Messages - No Auth", False, f"Request failed: {str(e)}")

    def test_send_message_no_auth(self):
        """Test 4: Send Message without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations/test-conversation-id/messages"
            data = {"content": "Test message", "type": "text"}
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "Send Message - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "Send Message - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Send Message - No Auth", False, f"Request failed: {str(e)}")

    def test_react_to_message_no_auth(self):
        """Test 5: React to Message without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations/test-conversation-id/messages/test-message-id/react"
            data = {"emoji": "❤️"}
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "React to Message - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "React to Message - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("React to Message - No Auth", False, f"Request failed: {str(e)}")

    def test_reply_to_message_no_auth(self):
        """Test 6: Reply to Message without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations/test-conversation-id/messages/test-message-id/reply"
            data = {"content": "Reply text"}
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "Reply to Message - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "Reply to Message - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Reply to Message - No Auth", False, f"Request failed: {str(e)}")

    def test_delete_message_no_auth(self):
        """Test 7: Delete Message without authentication - should return 403/401"""
        try:
            url = f"{self.base_url}/conversations/test-conversation-id/messages/test-message-id?delete_for_all=true"
            
            response = requests.delete(url, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test(
                    "Delete Message - No Auth", 
                    True, 
                    f"Correctly requires authentication (HTTP {response.status_code})",
                    response.status_code
                )
            else:
                self.log_test(
                    "Delete Message - No Auth", 
                    False, 
                    f"Should require auth but got HTTP {response.status_code}",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Delete Message - No Auth", False, f"Request failed: {str(e)}")

    def test_server_connectivity(self):
        """Test 8: Basic server connectivity"""
        try:
            url = f"{self.base_url}/"
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "message" in data:
                        self.log_test(
                            "Server Connectivity", 
                            True, 
                            f"Server is accessible and responding correctly: {data.get('message')}",
                            response.status_code
                        )
                    else:
                        self.log_test(
                            "Server Connectivity", 
                            True, 
                            "Server is accessible but response format unexpected",
                            response.status_code
                        )
                except:
                    self.log_test(
                        "Server Connectivity", 
                        True, 
                        "Server is accessible but response is not JSON",
                        response.status_code
                    )
            else:
                self.log_test(
                    "Server Connectivity", 
                    False, 
                    f"Server returned unexpected status code",
                    response.status_code
                )
        except Exception as e:
            self.log_test("Server Connectivity", False, f"Cannot connect to server: {str(e)}")

    def test_endpoint_existence(self):
        """Test 9: Check if conversation endpoints exist (should return auth errors, not 404)"""
        endpoints = [
            ("POST", "/conversations/start"),
            ("GET", "/conversations"),
            ("GET", "/conversations/test-id/messages"),
            ("POST", "/conversations/test-id/messages"),
            ("POST", "/conversations/test-id/messages/msg-id/react"),
            ("POST", "/conversations/test-id/messages/msg-id/reply"),
            ("DELETE", "/conversations/test-id/messages/msg-id")
        ]
        
        existing_endpoints = 0
        total_endpoints = len(endpoints)
        
        for method, endpoint in endpoints:
            try:
                url = f"{self.base_url}{endpoint}"
                
                if method == "GET":
                    response = requests.get(url, timeout=5)
                elif method == "POST":
                    response = requests.post(url, json={}, timeout=5)
                elif method == "DELETE":
                    response = requests.delete(url, timeout=5)
                
                # If we get 401/403, endpoint exists but requires auth (good)
                # If we get 404, endpoint doesn't exist (bad)
                # If we get 422, endpoint exists but validation failed (good)
                if response.status_code in [401, 403, 422, 400]:
                    existing_endpoints += 1
                elif response.status_code == 404:
                    print(f"    ⚠️  Endpoint not found: {method} {endpoint}")
                else:
                    existing_endpoints += 1  # Other codes suggest endpoint exists
                    
            except Exception as e:
                print(f"    ⚠️  Error testing {method} {endpoint}: {str(e)}")
        
        if existing_endpoints == total_endpoints:
            self.log_test(
                "Endpoint Existence", 
                True, 
                f"All {total_endpoints} conversation endpoints exist and are properly routed"
            )
        else:
            self.log_test(
                "Endpoint Existence", 
                False, 
                f"Only {existing_endpoints}/{total_endpoints} endpoints found or accessible"
            )

    def run_all_tests(self):
        """Run all DM conversation system tests"""
        print("=" * 80)
        print("DM CONVERSATION SYSTEM API TESTING")
        print("=" * 80)
        print(f"Testing server: {self.base_url}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print()
        
        # Run all tests
        self.test_server_connectivity()
        self.test_endpoint_existence()
        self.test_start_conversation_no_auth()
        self.test_get_conversations_no_auth()
        self.test_get_messages_no_auth()
        self.test_send_message_no_auth()
        self.test_react_to_message_no_auth()
        self.test_reply_to_message_no_auth()
        self.test_delete_message_no_auth()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result["status"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        print()
        
        if failed > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        print("DETAILED RESULTS:")
        for result in self.test_results:
            print(f"  {result['status']} {result['test']}")
        
        print()
        print("=" * 80)
        print("DM CONVERSATION TESTING COMPLETED")
        print("=" * 80)
        
        return passed, failed, total

def main():
    """Main function to run DM conversation tests"""
    tester = DMConversationTester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()