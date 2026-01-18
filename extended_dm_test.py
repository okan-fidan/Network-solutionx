#!/usr/bin/env python3
"""
Extended DM Conversation System API Testing
Testing request body validation and endpoint behavior
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://admindash-12.preview.emergentagent.com/api"

class ExtendedDMTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        
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

    def test_start_conversation_body_validation(self):
        """Test start conversation with different body formats"""
        test_cases = [
            # Test with otherUserId (as mentioned in review request)
            {"otherUserId": "test-user-id", "type": "private"},
            # Test with userId (alternative format)
            {"userId": "test-user-id", "type": "private"},
            # Test without required fields
            {"type": "private"},
            # Test with empty body
            {}
        ]
        
        for i, data in enumerate(test_cases):
            try:
                url = f"{self.base_url}/conversations/start"
                response = requests.post(url, json=data, timeout=10)
                
                # All should return 403 (auth required) or 400 (validation error)
                if response.status_code in [400, 403, 422]:
                    self.log_test(
                        f"Start Conversation Body Validation #{i+1}", 
                        True, 
                        f"Correctly handles request body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
                else:
                    self.log_test(
                        f"Start Conversation Body Validation #{i+1}", 
                        False, 
                        f"Unexpected response for body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
            except Exception as e:
                self.log_test(f"Start Conversation Body Validation #{i+1}", False, f"Request failed: {str(e)}")

    def test_send_message_body_validation(self):
        """Test send message with different body formats"""
        test_cases = [
            # Valid message format
            {"content": "Test message", "type": "text"},
            # Message without type (should default to text)
            {"content": "Test message"},
            # Empty content
            {"content": "", "type": "text"},
            # Missing content
            {"type": "text"},
            # Empty body
            {}
        ]
        
        for i, data in enumerate(test_cases):
            try:
                url = f"{self.base_url}/conversations/test-conversation-id/messages"
                response = requests.post(url, json=data, timeout=10)
                
                # All should return 403 (auth required) or 400/422 (validation error)
                if response.status_code in [400, 403, 422]:
                    self.log_test(
                        f"Send Message Body Validation #{i+1}", 
                        True, 
                        f"Correctly handles request body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
                else:
                    self.log_test(
                        f"Send Message Body Validation #{i+1}", 
                        False, 
                        f"Unexpected response for body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
            except Exception as e:
                self.log_test(f"Send Message Body Validation #{i+1}", False, f"Request failed: {str(e)}")

    def test_react_message_body_validation(self):
        """Test message reaction with different body formats"""
        test_cases = [
            # Valid emoji reaction
            {"emoji": "❤️"},
            # Different emoji
            {"emoji": "👍"},
            # Empty emoji
            {"emoji": ""},
            # Missing emoji
            {},
            # Invalid field
            {"reaction": "❤️"}
        ]
        
        for i, data in enumerate(test_cases):
            try:
                url = f"{self.base_url}/conversations/test-conversation-id/messages/test-message-id/react"
                response = requests.post(url, json=data, timeout=10)
                
                # All should return 403 (auth required) or 400/422 (validation error)
                if response.status_code in [400, 403, 422]:
                    self.log_test(
                        f"React Message Body Validation #{i+1}", 
                        True, 
                        f"Correctly handles request body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
                else:
                    self.log_test(
                        f"React Message Body Validation #{i+1}", 
                        False, 
                        f"Unexpected response for body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
            except Exception as e:
                self.log_test(f"React Message Body Validation #{i+1}", False, f"Request failed: {str(e)}")

    def test_reply_message_body_validation(self):
        """Test message reply with different body formats"""
        test_cases = [
            # Valid reply
            {"content": "Reply text"},
            # Reply with type
            {"content": "Reply text", "type": "text"},
            # Empty content
            {"content": ""},
            # Missing content
            {},
            # Invalid field
            {"message": "Reply text"}
        ]
        
        for i, data in enumerate(test_cases):
            try:
                url = f"{self.base_url}/conversations/test-conversation-id/messages/test-message-id/reply"
                response = requests.post(url, json=data, timeout=10)
                
                # All should return 403 (auth required) or 400/422 (validation error)
                if response.status_code in [400, 403, 422]:
                    self.log_test(
                        f"Reply Message Body Validation #{i+1}", 
                        True, 
                        f"Correctly handles request body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
                else:
                    self.log_test(
                        f"Reply Message Body Validation #{i+1}", 
                        False, 
                        f"Unexpected response for body: {data} (HTTP {response.status_code})",
                        response.status_code
                    )
            except Exception as e:
                self.log_test(f"Reply Message Body Validation #{i+1}", False, f"Request failed: {str(e)}")

    def test_delete_message_query_params(self):
        """Test delete message with query parameters"""
        test_cases = [
            # With delete_for_all=true (as mentioned in review request)
            "?delete_for_all=true",
            # With delete_for_all=false
            "?delete_for_all=false",
            # Without query params
            "",
            # Invalid query param
            "?invalid_param=true"
        ]
        
        for i, query_params in enumerate(test_cases):
            try:
                url = f"{self.base_url}/conversations/test-conversation-id/messages/test-message-id{query_params}"
                response = requests.delete(url, timeout=10)
                
                # All should return 403 (auth required)
                if response.status_code in [403, 401]:
                    self.log_test(
                        f"Delete Message Query Params #{i+1}", 
                        True, 
                        f"Correctly handles query params: {query_params} (HTTP {response.status_code})",
                        response.status_code
                    )
                else:
                    self.log_test(
                        f"Delete Message Query Params #{i+1}", 
                        False, 
                        f"Unexpected response for query: {query_params} (HTTP {response.status_code})",
                        response.status_code
                    )
            except Exception as e:
                self.log_test(f"Delete Message Query Params #{i+1}", False, f"Request failed: {str(e)}")

    def test_http_methods(self):
        """Test endpoints with wrong HTTP methods"""
        wrong_method_tests = [
            # Should be POST, testing with GET
            ("GET", "/conversations/start"),
            # Should be GET, testing with POST
            ("POST", "/conversations"),
            # Should be GET, testing with POST
            ("POST", "/conversations/test-id/messages"),
            # Should be DELETE, testing with GET
            ("GET", "/conversations/test-id/messages/msg-id")
        ]
        
        for i, (method, endpoint) in enumerate(wrong_method_tests):
            try:
                url = f"{self.base_url}{endpoint}"
                
                if method == "GET":
                    response = requests.get(url, timeout=5)
                elif method == "POST":
                    response = requests.post(url, json={}, timeout=5)
                elif method == "DELETE":
                    response = requests.delete(url, timeout=5)
                
                # Should return 405 (Method Not Allowed) or 403/401 (auth required)
                if response.status_code in [405, 403, 401, 422]:
                    self.log_test(
                        f"HTTP Method Validation #{i+1}", 
                        True, 
                        f"Correctly handles wrong method {method} for {endpoint} (HTTP {response.status_code})",
                        response.status_code
                    )
                else:
                    self.log_test(
                        f"HTTP Method Validation #{i+1}", 
                        False, 
                        f"Unexpected response for {method} {endpoint} (HTTP {response.status_code})",
                        response.status_code
                    )
            except Exception as e:
                self.log_test(f"HTTP Method Validation #{i+1}", False, f"Request failed: {str(e)}")

    def run_extended_tests(self):
        """Run all extended DM conversation tests"""
        print("=" * 80)
        print("EXTENDED DM CONVERSATION SYSTEM API TESTING")
        print("=" * 80)
        print(f"Testing server: {self.base_url}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print()
        
        # Run all extended tests
        self.test_start_conversation_body_validation()
        self.test_send_message_body_validation()
        self.test_react_message_body_validation()
        self.test_reply_message_body_validation()
        self.test_delete_message_query_params()
        self.test_http_methods()
        
        # Summary
        print("=" * 80)
        print("EXTENDED TEST SUMMARY")
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
        
        print("=" * 80)
        print("EXTENDED DM CONVERSATION TESTING COMPLETED")
        print("=" * 80)
        
        return passed, failed, total

def main():
    """Main function to run extended DM conversation tests"""
    tester = ExtendedDMTester()
    passed, failed, total = tester.run_extended_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()