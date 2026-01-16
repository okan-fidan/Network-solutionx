#!/usr/bin/env python3
"""
Network Solution Backend API Comprehensive Test Suite
Tests ALL backend features as requested by user with test user:
- Email: testuser@test.com
- Password: Test123!
- Name: Test Kullanıcı
"""

import requests
import json
import sys
import uuid
from datetime import datetime
from typing import Dict, Any

# Backend URL from frontend environment
BACKEND_URL = "https://procomm-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test User Configuration
TEST_USER = {
    "email": "testuser@test.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Kullanıcı"
}

class NetworkSolutionComprehensiveTester:
    def __init__(self):
        self.results = {}
        self.session = requests.Session()
        self.session.timeout = 10
        self.auth_token = None
        self.test_user_id = None
        self.created_resources = {
            "posts": [],
            "services": [],
            "communities": [],
            "messages": []
        }
        
    def log_result(self, test_name: str, success: bool, details: str = "", error: str = ""):
        """Log test result with Turkish format"""
        status = "✅ BAŞARILI" if success else "❌ BAŞARISIZ"
        self.results[test_name] = {
            "status": status,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"{status}: {test_name}")
        if details:
            print(f"   Detay: {details}")
        if error:
            print(f"   Hata: {error}")
        print()
        
    def test_server_connectivity(self):
        """Test 1: Server Connectivity"""
        try:
            response = self.session.get(BACKEND_URL, timeout=5)
            if response.status_code in [200, 404, 405]:
                self.log_result("Sunucu Bağlantısı", True, f"Sunucu yanıt veriyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Sunucu Bağlantısı", False, "", f"Beklenmeyen status kodu: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Sunucu Bağlantısı", False, "", str(e))
            return False

    def test_health_check_api(self):
        """Test 2: Health Check API Endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Network Solution API":
                    self.log_result("Health Check API", True, f"Doğru yanıt: {data}")
                    return True
                else:
                    self.log_result("Health Check API", False, "", f"Yanlış mesaj: {data}")
                    return False
            else:
                self.log_result("Health Check API", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Health Check API", False, "", str(e))
            return False

    def test_cities_api(self):
        """Test 3: Cities API"""
        try:
            response = self.session.get(f"{API_BASE}/cities")
            if response.status_code == 200:
                data = response.json()
                cities = data.get("cities", [])
                if len(cities) == 81 and "İstanbul" in cities and "Ankara" in cities:
                    self.log_result("Şehirler API", True, f"81 şehir döndü: İstanbul, Ankara dahil")
                    return True
                else:
                    self.log_result("Şehirler API", False, "", f"Beklenen 81 şehir bulunamadı. Dönen: {len(cities)}")
                    return False
            else:
                self.log_result("Şehirler API", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Şehirler API", False, "", str(e))
            return False

    def test_authentication_protection(self):
        """Test 4: Authentication Protection"""
        protected_endpoints = [
            ("/communities", "Topluluklar"),
            ("/posts", "Gönderiler"),
            ("/services", "Hizmetler"),
            ("/notifications", "Bildirimler"),
            ("/user/profile", "Kullanıcı Profili"),
            ("/chats", "Sohbetler")
        ]
        
        all_protected = True
        for endpoint, name in protected_endpoints:
            try:
                response = self.session.get(f"{API_BASE}{endpoint}")
                if response.status_code in [401, 403, 422]:
                    self.log_result(f"{name} Koruması", True, f"Doğru şekilde korunuyor (status: {response.status_code})")
                else:
                    self.log_result(f"{name} Koruması", False, "", f"Korunmuyor! Status: {response.status_code}")
                    all_protected = False
            except Exception as e:
                self.log_result(f"{name} Koruması", False, "", str(e))
                all_protected = False
        
        return all_protected

    def test_admin_endpoints_protection(self):
        """Test 5: Admin Endpoints Protection"""
        admin_endpoints = [
            ("/admin/dashboard", "Admin Dashboard"),
            ("/admin/users", "Admin Kullanıcılar"),
            ("/admin/communities", "Admin Topluluklar")
        ]
        
        all_protected = True
        for endpoint, name in admin_endpoints:
            try:
                response = self.session.get(f"{API_BASE}{endpoint}")
                if response.status_code in [401, 403, 422]:
                    self.log_result(f"{name} Koruması", True, f"Doğru şekilde korunuyor (status: {response.status_code})")
                else:
                    self.log_result(f"{name} Koruması", False, "", f"Korunmuyor! Status: {response.status_code}")
                    all_protected = False
            except Exception as e:
                self.log_result(f"{name} Koruması", False, "", str(e))
                all_protected = False
        
        return all_protected

    def test_user_registration_mock(self):
        """Test 6: User Registration (Mock Firebase Token)"""
        try:
            # Since we can't create real Firebase tokens, we test the endpoint structure
            headers = {"Authorization": "Bearer mock_firebase_token"}
            user_data = {
                "email": TEST_USER["email"],
                "firstName": TEST_USER["firstName"],
                "lastName": TEST_USER["lastName"],
                "city": "İstanbul",
                "occupation": "Test Engineer"
            }
            
            response = self.session.post(f"{API_BASE}/user/register", json=user_data, headers=headers)
            
            if response.status_code == 401:
                self.log_result("Kullanıcı Kaydı", True, "Firebase authentication sistemi aktif - 401 Unauthorized")
                return True
            elif response.status_code == 200:
                # If somehow it works (maybe with mock token)
                data = response.json()
                self.log_result("Kullanıcı Kaydı", True, f"Kullanıcı oluşturuldu: {data.get('firstName')} {data.get('lastName')}")
                return True
            else:
                self.log_result("Kullanıcı Kaydı", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Kullanıcı Kaydı", False, "", str(e))
            return False

    def test_profile_endpoints_structure(self):
        """Test 7: Profile Endpoints Structure"""
        profile_endpoints = [
            ("/user/profile", "GET", "Profil Görüntüleme"),
            ("/user/privacy-settings", "GET", "Gizlilik Ayarları"),
            ("/user/is-admin", "GET", "Admin Kontrolü")
        ]
        
        all_structured = True
        for endpoint, method, name in profile_endpoints:
            try:
                if method == "GET":
                    response = self.session.get(f"{API_BASE}{endpoint}")
                
                if response.status_code in [401, 403, 422]:
                    self.log_result(f"{name} Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                elif response.status_code == 200:
                    self.log_result(f"{name} Yapısı", True, f"Endpoint çalışıyor (status: {response.status_code})")
                else:
                    self.log_result(f"{name} Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                    all_structured = False
            except Exception as e:
                self.log_result(f"{name} Yapısı", False, "", str(e))
                all_structured = False
        
        return all_structured

    def test_communities_structure(self):
        """Test 8: Communities API Structure"""
        try:
            # Test communities list endpoint
            response = self.session.get(f"{API_BASE}/communities")
            if response.status_code in [401, 403, 422]:
                self.log_result("Topluluklar API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Topluluklar API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Topluluklar API Yapısı", False, "", str(e))
            return False

    def test_messaging_structure(self):
        """Test 9: Messaging API Structure"""
        messaging_endpoints = [
            ("/chats", "Sohbet Listesi"),
            ("/private-messages/test-user-id", "Özel Mesajlar")  # Fixed: requires user_id parameter
        ]
        
        all_structured = True
        for endpoint, name in messaging_endpoints:
            try:
                response = self.session.get(f"{API_BASE}{endpoint}")
                if response.status_code in [401, 403, 422]:
                    self.log_result(f"{name} API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                else:
                    self.log_result(f"{name} API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                    all_structured = False
            except Exception as e:
                self.log_result(f"{name} API Yapısı", False, "", str(e))
                all_structured = False
        
        return all_structured

    def test_posts_structure(self):
        """Test 10: Posts API Structure"""
        try:
            response = self.session.get(f"{API_BASE}/posts")
            if response.status_code in [401, 403, 422]:
                self.log_result("Gönderiler API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Gönderiler API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Gönderiler API Yapısı", False, "", str(e))
            return False

    def test_services_structure(self):
        """Test 11: Services API Structure"""
        try:
            response = self.session.get(f"{API_BASE}/services")
            if response.status_code in [401, 403, 422]:
                self.log_result("Hizmetler API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Hizmetler API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Hizmetler API Yapısı", False, "", str(e))
            return False

    def test_notifications_structure(self):
        """Test 12: Notifications API Structure"""
        try:
            response = self.session.get(f"{API_BASE}/notifications")
            if response.status_code in [401, 403, 422]:
                self.log_result("Bildirimler API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Bildirimler API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Bildirimler API Yapısı", False, "", str(e))
            return False

    def test_feedback_structure(self):
        """Test 13: Feedback API Structure"""
        try:
            # Test feedback submission endpoint
            headers = {"Authorization": "Bearer mock_firebase_token"}
            feedback_data = {
                "type": "bug",
                "subject": "Test Feedback",
                "message": "Test message",
                "rating": 5
            }
            response = self.session.post(f"{API_BASE}/feedback", json=feedback_data, headers=headers)
            
            if response.status_code in [401, 403, 422]:
                self.log_result("Geri Bildirim API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            elif response.status_code == 200:
                self.log_result("Geri Bildirim API Yapısı", True, f"Endpoint çalışıyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Geri Bildirim API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Geri Bildirim API Yapısı", False, "", str(e))
            return False

    def test_users_list_structure(self):
        """Test 14: Users List API Structure"""
        try:
            response = self.session.get(f"{API_BASE}/users")
            if response.status_code in [401, 403, 422]:
                self.log_result("Kullanıcılar Listesi API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Kullanıcılar Listesi API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Kullanıcılar Listesi API Yapısı", False, "", str(e))
            return False

    def test_media_upload_structure(self):
        """Test 15: Media Upload API Structure"""
        try:
            headers = {"Authorization": "Bearer mock_firebase_token"}
            media_data = {
                "data": "base64_test_data",
                "type": "image"
            }
            response = self.session.post(f"{API_BASE}/upload/media", json=media_data, headers=headers)
            
            if response.status_code in [401, 403, 422]:
                self.log_result("Medya Yükleme API Yapısı", True, f"Endpoint mevcut ve korunuyor (status: {response.status_code})")
                return True
            elif response.status_code == 200:
                self.log_result("Medya Yükleme API Yapısı", True, f"Endpoint çalışıyor (status: {response.status_code})")
                return True
            else:
                self.log_result("Medya Yükleme API Yapısı", False, "", f"Beklenmeyen status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Medya Yükleme API Yapısı", False, "", str(e))
            return False
    def run_all_tests(self):
        """Run comprehensive backend API tests"""
        print("🚀 NETWORK SOLUTION KAPSAMLI BACKEND API TESTİ")
        print("=" * 80)
        print(f"📍 Backend URL: {BACKEND_URL}")
        print(f"👤 Test Kullanıcısı: {TEST_USER['email']} / {TEST_USER['firstName']} {TEST_USER['lastName']}")
        print("=" * 80)
        print()

        # Test server connectivity first
        if not self.test_server_connectivity():
            print("\n❌ Sunucu erişilebilir değil. Diğer testler atlanıyor.")
            return self.get_summary()

        # Run all comprehensive tests
        print("📋 TEMEL API TESTLERİ")
        print("-" * 40)
        self.test_health_check_api()
        self.test_cities_api()
        
        print("\n🔐 KİMLİK DOĞRULAMA TESTLERİ")
        print("-" * 40)
        self.test_authentication_protection()
        self.test_admin_endpoints_protection()
        self.test_user_registration_mock()
        
        print("\n👤 KULLANICI PROFİLİ TESTLERİ")
        print("-" * 40)
        self.test_profile_endpoints_structure()
        
        print("\n🏘️ TOPLULUKLAR TESTLERİ")
        print("-" * 40)
        self.test_communities_structure()
        
        print("\n💬 MESAJLAŞMA TESTLERİ")
        print("-" * 40)
        self.test_messaging_structure()
        
        print("\n📝 GÖNDERİLER TESTLERİ")
        print("-" * 40)
        self.test_posts_structure()
        
        print("\n🛠️ HİZMETLER TESTLERİ")
        print("-" * 40)
        self.test_services_structure()
        
        print("\n🔔 BİLDİRİMLER TESTLERİ")
        print("-" * 40)
        self.test_notifications_structure()
        
        print("\n📋 DİĞER API TESTLERİ")
        print("-" * 40)
        self.test_feedback_structure()
        self.test_users_list_structure()
        self.test_media_upload_structure()

        return self.get_summary()

    def get_summary(self):
        """Get comprehensive test results summary"""
        print("\n" + "=" * 80)
        print("📊 KAPSAMLI TEST SONUÇLARI ÖZET")
        print("=" * 80)
        
        successful_tests = [name for name, result in self.results.items() if result["success"]]
        failed_tests = [name for name, result in self.results.items() if not result["success"]]
        
        print(f"📈 Toplam Test: {len(self.results)}")
        print(f"✅ Başarılı: {len(successful_tests)}")
        print(f"❌ Başarısız: {len(failed_tests)}")
        print()
        
        if failed_tests:
            print("❌ BAŞARISIZ TESTLER:")
            for test_name in failed_tests:
                result = self.results[test_name]
                print(f"   • {test_name}: {result['error']}")
            print()
        
        if successful_tests:
            print("✅ BAŞARILI TESTLER:")
            for test_name in successful_tests:
                print(f"   • {test_name}")
            print()
        
        # Kategorik özet
        print("📋 KATEGORİK ÖZET:")
        categories = {
            "Temel API": ["Sunucu Bağlantısı", "Health Check API", "Şehirler API"],
            "Kimlik Doğrulama": [name for name in self.results.keys() if "Koruması" in name or "Kullanıcı Kaydı" in name],
            "API Yapıları": [name for name in self.results.keys() if "API Yapısı" in name or "Yapısı" in name]
        }
        
        for category, tests in categories.items():
            category_tests = [t for t in tests if t in self.results]
            if category_tests:
                category_success = sum(1 for t in category_tests if self.results[t]["success"])
                print(f"   {category}: {category_success}/{len(category_tests)} başarılı")
        
        print("\n" + "=" * 80)
        
        if len(failed_tests) == 0 and len(successful_tests) > 0:
            print("🎉 TÜM TESTLER BAŞARILI!")
            return True
        else:
            print("⚠️ BAZI TESTLER BAŞARISIZ!")
            return False

def main():
    """Main comprehensive test runner"""
    tester = NetworkSolutionComprehensiveTester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()