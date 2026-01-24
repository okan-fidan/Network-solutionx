#!/usr/bin/env python3
"""
Backend API Test Suite - Turkish Review Request
Testing Story APIs, Notification APIs, and existing endpoints
Base URL: https://community-app-11.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://community-app-11.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, status, details=""):
        """Log test result"""
        self.total_tests += 1
        if status == "PASS":
            self.passed_tests += 1
            print(f"✅ {test_name}: {status}")
        else:
            print(f"❌ {test_name}: {status} - {details}")
        
        self.test_results.append({
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    def test_endpoint(self, method, endpoint, expected_status, test_name, headers=None, data=None):
        """Generic endpoint tester"""
        try:
            url = f"{BASE_URL}{endpoint}"
            
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                self.log_test(test_name, "FAIL", f"Unsupported method: {method}")
                return False
            
            if response.status_code == expected_status:
                self.log_test(test_name, "PASS", f"Status: {response.status_code}")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Expected {expected_status}, got {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test(test_name, "FAIL", f"Request error: {str(e)}")
            return False
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Unexpected error: {str(e)}")
            return False
    
    def test_story_apis(self):
        """Test Story (Hikaye) API endpoints"""
        print("\n🔍 Testing Story (Hikaye) APIs...")
        
        # Test GET /api/stories - Should require auth (403)
        self.test_endpoint("GET", "/stories", 403, "GET /api/stories (auth required)")
        
        # Test POST /api/stories - Should require auth (403)
        story_data = {
            "content": "Test story content",
            "mediaUrl": "https://example.com/image.jpg",
            "type": "image"
        }
        self.test_endpoint("POST", "/stories", 403, "POST /api/stories (auth required)", data=story_data)
        
        # Test GET /api/stories/{user_id} - Should require auth (403)
        test_user_id = "test_user_123"
        self.test_endpoint("GET", f"/stories/{test_user_id}", 403, "GET /api/stories/{user_id} (auth required)")
        
        # Test POST /api/stories/{story_id}/view - Should require auth (403)
        test_story_id = "test_story_123"
        self.test_endpoint("POST", f"/stories/{test_story_id}/view", 403, "POST /api/stories/{story_id}/view (auth required)")
        
        # Test DELETE /api/stories/{story_id} - Should require auth (403)
        self.test_endpoint("DELETE", f"/stories/{test_story_id}", 403, "DELETE /api/stories/{story_id} (auth required)")
    
    def test_notification_apis(self):
        """Test Notification APIs"""
        print("\n🔔 Testing Notification APIs...")
        
        # Test GET /api/notifications - Should require auth (403)
        self.test_endpoint("GET", "/notifications", 403, "GET /api/notifications (auth required)")
    
    def test_existing_apis(self):
        """Test existing APIs (smoke test)"""
        print("\n🚀 Testing Existing APIs (Smoke Test)...")
        
        # Test GET /api/ - Should return 200 OK
        self.test_endpoint("GET", "/", 200, "GET /api/ (health check)")
        
        # Test GET /api/cities - Should return 200 OK with 81 Turkish cities
        try:
            response = self.session.get(f"{BASE_URL}/cities")
            if response.status_code == 200:
                data = response.json()
                if "cities" in data and len(data["cities"]) == 81:
                    self.log_test("GET /api/cities (81 Turkish cities)", "PASS", f"Found {len(data['cities'])} cities")
                else:
                    self.log_test("GET /api/cities (81 Turkish cities)", "FAIL", f"Expected 81 cities, got {len(data.get('cities', []))}")
            else:
                self.log_test("GET /api/cities (81 Turkish cities)", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/cities (81 Turkish cities)", "FAIL", f"Error: {str(e)}")
        
        # Test POST /api/posts/{post_id}/like - Should require auth (403)
        test_post_id = "test_post_123"
        self.test_endpoint("POST", f"/posts/{test_post_id}/like", 403, "POST /api/posts/{post_id}/like (auth required)")
    
    def test_server_connectivity(self):
        """Test basic server connectivity"""
        print("\n🌐 Testing Server Connectivity...")
        
        try:
            response = self.session.get(BASE_URL, timeout=10)
            if response.status_code in [200, 404, 405]:  # Any response means server is up
                self.log_test("Server Connectivity", "PASS", f"Server responding (Status: {response.status_code})")
                return True
            else:
                self.log_test("Server Connectivity", "FAIL", f"Unexpected status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Server Connectivity", "FAIL", f"Cannot reach server: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🧪 BACKEND API TESTLERİ BAŞLATIYOR...")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Test server connectivity first
        if not self.test_server_connectivity():
            print("\n❌ Server connectivity failed. Aborting tests.")
            return False
        
        # Run all test suites
        self.test_existing_apis()
        self.test_story_apis()
        self.test_notification_apis()
        
        # Print summary
        self.print_summary()
        
        return self.passed_tests == self.total_tests
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SONUÇLARI ÖZET")
        print("=" * 60)
        print(f"✅ Başarılı Testler: {self.passed_tests}")
        print(f"❌ Başarısız Testler: {self.total_tests - self.passed_tests}")
        print(f"📈 Toplam Testler: {self.total_tests}")
        print(f"🎯 Başarı Oranı: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 TÜM TESTLER BAŞARILI!")
            print("✅ Story endpoint'leri doğru korunuyor (403 Forbidden)")
            print("✅ Notification endpoint'leri doğru korunuyor (403 Forbidden)")
            print("✅ Temel endpoint'ler çalışıyor (200 OK)")
            print("✅ Firebase authentication sistemi aktif")
            print("✅ Hiç 500 hatası tespit edilmedi")
        else:
            print("\n⚠️  BAZI TESTLER BAŞARISIZ!")
            print("Başarısız testleri kontrol edin.")
        
        print(f"\n🕒 Test Zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Test Edilen Sunucu: {BASE_URL}")

def main():
    """Main test runner"""
    tester = BackendTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Testler kullanıcı tarafından durduruldu.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Beklenmeyen hata: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()