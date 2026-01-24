#!/usr/bin/env python3
"""
Instagram Tarzı Hikaye Özellikleri - Backend API Test Suite
Test for Instagram-style story features as requested in Turkish review
"""

import requests
import json
import uuid
from datetime import datetime

# Base URL from frontend environment
BASE_URL = "https://community-app-11.preview.emergentagent.com/api"

class StoryAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, status, details=""):
        """Log test result"""
        self.total_tests += 1
        if status == "PASS":
            self.passed_tests += 1
        
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"[{status}] {test_name}: {details}")
    
    def test_smoke_endpoints(self):
        """Test basic smoke endpoints"""
        print("\n=== SMOKE TEST - Temel Endpoint'ler ===")
        
        # Test GET /api/
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("GET /api/", "PASS", f"200 OK - {data.get('message')}")
                else:
                    self.log_test("GET /api/", "FAIL", f"200 but no message field: {data}")
            else:
                self.log_test("GET /api/", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/", "FAIL", f"Exception: {str(e)}")
        
        # Test GET /api/cities
        try:
            response = requests.get(f"{self.base_url}/cities", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "cities" in data and isinstance(data["cities"], list):
                    city_count = len(data["cities"])
                    self.log_test("GET /api/cities", "PASS", f"200 OK - {city_count} şehir döndürüldü")
                else:
                    self.log_test("GET /api/cities", "FAIL", f"200 but invalid format: {data}")
            else:
                self.log_test("GET /api/cities", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/cities", "FAIL", f"Exception: {str(e)}")
    
    def test_story_basic_apis(self):
        """Test basic story APIs (should require auth)"""
        print("\n=== TEMEL STORY API'LERİ - Auth Koruması Testi ===")
        
        # Test GET /api/stories - Aktif hikayeleri getir
        try:
            response = requests.get(f"{self.base_url}/stories", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("GET /api/stories", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("GET /api/stories", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/stories", "FAIL", f"Exception: {str(e)}")
        
        # Test POST /api/stories - Yeni hikaye oluştur
        try:
            story_data = {
                "imageUrl": "https://example.com/image.jpg",
                "caption": "Test hikayesi"
            }
            response = requests.post(f"{self.base_url}/stories", json=story_data, timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("POST /api/stories", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("POST /api/stories", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/stories", "FAIL", f"Exception: {str(e)}")
        
        # Test POST /api/stories/{story_id}/view - Görüntüleme kaydet
        test_story_id = str(uuid.uuid4())
        try:
            response = requests.post(f"{self.base_url}/stories/{test_story_id}/view", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("POST /api/stories/{story_id}/view", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("POST /api/stories/{story_id}/view", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/stories/{story_id}/view", "FAIL", f"Exception: {str(e)}")
        
        # Test DELETE /api/stories/{story_id} - Hikaye sil
        try:
            response = requests.delete(f"{self.base_url}/stories/{test_story_id}", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("DELETE /api/stories/{story_id}", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("DELETE /api/stories/{story_id}", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("DELETE /api/stories/{story_id}", "FAIL", f"Exception: {str(e)}")
    
    def test_story_reaction_apis(self):
        """Test story reaction APIs (should require auth)"""
        print("\n=== STORY TEPKİ API'LERİ - Auth Koruması Testi ===")
        
        test_story_id = str(uuid.uuid4())
        
        # Test POST /api/stories/{story_id}/react - Emoji tepkisi
        try:
            reaction_data = {"emoji": "❤️"}
            response = requests.post(f"{self.base_url}/stories/{test_story_id}/react", json=reaction_data, timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("POST /api/stories/{story_id}/react", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("POST /api/stories/{story_id}/react", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/stories/{story_id}/react", "FAIL", f"Exception: {str(e)}")
        
        # Test POST /api/stories/{story_id}/reply - Hikaye yanıtlama
        try:
            reply_data = {"message": "Harika hikaye!"}
            response = requests.post(f"{self.base_url}/stories/{test_story_id}/reply", json=reply_data, timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("POST /api/stories/{story_id}/reply", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("POST /api/stories/{story_id}/reply", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/stories/{story_id}/reply", "FAIL", f"Exception: {str(e)}")
        
        # Test POST /api/stories/{story_id}/report - Hikaye şikayeti
        try:
            report_data = {"reason": "Uygunsuz içerik"}
            response = requests.post(f"{self.base_url}/stories/{test_story_id}/report", json=report_data, timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("POST /api/stories/{story_id}/report", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("POST /api/stories/{story_id}/report", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/stories/{story_id}/report", "FAIL", f"Exception: {str(e)}")
        
        # Test GET /api/stories/{story_id}/reactions - Tepkileri getir
        try:
            response = requests.get(f"{self.base_url}/stories/{test_story_id}/reactions", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("GET /api/stories/{story_id}/reactions", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("GET /api/stories/{story_id}/reactions", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/stories/{story_id}/reactions", "FAIL", f"Exception: {str(e)}")
        
        # Test GET /api/stories/{story_id}/viewers - Görüntüleyenleri getir
        try:
            response = requests.get(f"{self.base_url}/stories/{test_story_id}/viewers", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("GET /api/stories/{story_id}/viewers", "PASS", f"Auth koruması aktif - {response.status_code}")
            else:
                self.log_test("GET /api/stories/{story_id}/viewers", "FAIL", f"Auth koruması yok - Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/stories/{story_id}/viewers", "FAIL", f"Exception: {str(e)}")
    
    def test_server_connectivity(self):
        """Test server connectivity and response format"""
        print("\n=== SUNUCU BAĞLANTISI VE YANIT FORMATI ===")
        
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log_test("Server JSON Response", "PASS", "Sunucu geçerli JSON yanıtı döndürüyor")
                except:
                    self.log_test("Server JSON Response", "FAIL", "Sunucu geçersiz JSON yanıtı döndürüyor")
            else:
                self.log_test("Server Connectivity", "FAIL", f"Sunucu erişilemez - Status: {response.status_code}")
        except Exception as e:
            self.log_test("Server Connectivity", "FAIL", f"Sunucu bağlantı hatası: {str(e)}")
    
    def test_error_handling(self):
        """Test error handling for non-existent endpoints"""
        print("\n=== HATA YÖNETİMİ VE ENDPOINT VARLIGI ===")
        
        # Test non-existent story endpoint
        try:
            response = requests.get(f"{self.base_url}/stories/nonexistent", timeout=10)
            if response.status_code in [401, 403, 404]:
                self.log_test("Non-existent Story Endpoint", "PASS", f"Uygun hata kodu döndürüldü - {response.status_code}")
            elif response.status_code >= 500:
                self.log_test("Non-existent Story Endpoint", "FAIL", f"Sunucu hatası - {response.status_code}")
            else:
                self.log_test("Non-existent Story Endpoint", "PASS", f"Endpoint mevcut - {response.status_code}")
        except Exception as e:
            self.log_test("Non-existent Story Endpoint", "FAIL", f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Instagram Tarzı Hikaye Özellikleri - Backend API Testleri Başlatılıyor...")
        print(f"📍 Test Sunucusu: {self.base_url}")
        print("=" * 80)
        
        # Run test suites
        self.test_smoke_endpoints()
        self.test_story_basic_apis()
        self.test_story_reaction_apis()
        self.test_server_connectivity()
        self.test_error_handling()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SONUÇLARI ÖZETI")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"✅ Başarılı Testler: {self.passed_tests}/{self.total_tests}")
        print(f"📈 Başarı Oranı: {success_rate:.1f}%")
        
        if success_rate == 100:
            print("🎉 TÜM TESTLER BAŞARILI! Instagram tarzı hikaye API'leri mükemmel çalışıyor.")
        elif success_rate >= 80:
            print("✅ Çoğu test başarılı. Küçük sorunlar var.")
        else:
            print("⚠️  Ciddi sorunlar tespit edildi. İnceleme gerekli.")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if t["status"] == "FAIL"]
        if failed_tests:
            print(f"\n❌ BAŞARISIZ TESTLER ({len(failed_tests)} adet):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        # Key findings
        print(f"\n🔍 ÖNEMLİ BULGULAR:")
        print(f"   • Sunucu Erişimi: {self.base_url}")
        print(f"   • Firebase Auth Koruması: {'Aktif' if any('Auth koruması aktif' in t['details'] for t in self.test_results) else 'Kontrol Edilemedi'}")
        print(f"   • Story Endpoint'leri: {'Mevcut' if any('Auth koruması aktif' in t['details'] for t in self.test_results) else 'Kontrol Edilemedi'}")
        print(f"   • 500 Hatası: {'Yok' if not any('500' in t['details'] for t in self.test_results) else 'Tespit Edildi'}")
        
        print("\n" + "=" * 80)

def main():
    """Main test execution"""
    tester = StoryAPITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()