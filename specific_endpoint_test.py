#!/usr/bin/env python3
"""
Specific Backend API Test for Review Request
Tests the exact endpoints mentioned in the Turkish review request
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from frontend .env
BASE_URL = "https://android-deploy-fix.preview.emergentagent.com/api"

class SpecificEndpointTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, expected_status, actual_status, response_data=None, error=None):
        """Log test results"""
        self.total_tests += 1
        
        if actual_status == expected_status:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        result = {
            "test": test_name,
            "expected": expected_status,
            "actual": actual_status,
            "status": status,
            "response": response_data,
            "error": error
        }
        
        self.test_results.append(result)
        print(f"{status} - {test_name}")
        print(f"   Expected: {expected_status}, Got: {actual_status}")
        
        if error:
            print(f"   Error: {error}")
        if response_data and isinstance(response_data, dict):
            if 'message' in response_data:
                print(f"   Message: {response_data['message']}")
        print()
    
    def test_endpoint(self, method, endpoint, expected_status, headers=None, data=None, test_name=None):
        """Test a single endpoint"""
        if not test_name:
            test_name = f"{method} {endpoint}"
            
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=15)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=15)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=15)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=15)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text[:200]}
                
            self.log_test(test_name, expected_status, response.status_code, response_data)
            return response
            
        except requests.exceptions.Timeout:
            self.log_test(test_name, expected_status, "TIMEOUT", error="Request timed out")
            return None
        except requests.exceptions.ConnectionError:
            self.log_test(test_name, expected_status, "CONNECTION_ERROR", error="Connection failed")
            return None
        except requests.exceptions.RequestException as e:
            self.log_test(test_name, expected_status, "REQUEST_ERROR", error=str(e))
            return None
    
    def test_basic_endpoints(self):
        """Test basic endpoints that should return 200 OK"""
        print("=== TEMEL ENDPOINT'LER ===")
        
        # GET /api/ - API kök (200 OK, "Network Solution API" mesajı bekleniyor)
        response = self.test_endpoint("GET", "/", 200, test_name="GET /api/ - API Kök")
        
        # GET /api/cities - Şehirler listesi (200 OK, 81 şehir bekleniyor)
        response = self.test_endpoint("GET", "/cities", 200, test_name="GET /api/cities - Şehirler Listesi")
        if response and response.status_code == 200:
            try:
                data = response.json()
                cities = data.get("cities", [])
                print(f"   ℹ️  Şehir sayısı: {len(cities)}")
                if len(cities) == 81:
                    print("   ✅ Doğru şehir sayısı (81)")
                else:
                    print(f"   ⚠️  Beklenen 81, alınan {len(cities)}")
            except:
                print("   ⚠️  JSON yanıt alınamadı")
    
    def test_poll_endpoints(self):
        """Test poll endpoints - auth gerekli, 403 bekleniyor"""
        print("=== POLL ENDPOINT'LERİ ===")
        
        test_subgroup_id = "test-subgroup-123"
        test_poll_id = "test-poll-456"
        
        # POST /api/subgroups/{subgroup_id}/polls - Anket oluşturma
        self.test_endpoint(
            "POST", 
            f"/subgroups/{test_subgroup_id}/polls",
            403,
            data={"question": "Test anketi?", "options": ["Evet", "Hayır"]},
            test_name="POST /api/subgroups/{subgroup_id}/polls - Anket Oluşturma"
        )
        
        # GET /api/subgroups/{subgroup_id}/polls - Anketleri getirme
        self.test_endpoint(
            "GET",
            f"/subgroups/{test_subgroup_id}/polls", 
            403,
            test_name="GET /api/subgroups/{subgroup_id}/polls - Anketleri Getirme"
        )
        
        # POST /api/subgroups/{subgroup_id}/polls/{poll_id}/vote - Oy verme
        self.test_endpoint(
            "POST",
            f"/subgroups/{test_subgroup_id}/polls/{test_poll_id}/vote",
            403,
            data={"optionIds": ["option1"]},
            test_name="POST /api/subgroups/{subgroup_id}/polls/{poll_id}/vote - Oy Verme"
        )
    
    def test_admin_endpoints(self):
        """Test admin endpoints - auth gerekli, 403 bekleniyor"""
        print("=== ADMIN ENDPOINT'LERİ ===")
        
        test_community_id = "test-community-123"
        
        # GET /api/admin/join-requests - Katılma istekleri
        self.test_endpoint(
            "GET",
            "/admin/join-requests",
            403,
            test_name="GET /api/admin/join-requests - Katılma İstekleri"
        )
        
        # GET /api/admin/communities - Topluluklar listesi
        self.test_endpoint(
            "GET",
            "/admin/communities",
            403,
            test_name="GET /api/admin/communities - Topluluklar Listesi"
        )
        
        # GET /api/admin/communities/{community_id}/subgroups - Alt gruplar
        self.test_endpoint(
            "GET",
            f"/admin/communities/{test_community_id}/subgroups",
            403,
            test_name="GET /api/admin/communities/{community_id}/subgroups - Alt Gruplar"
        )
        
        # GET /api/admin/communities/{community_id}/members - Üyeler
        self.test_endpoint(
            "GET",
            f"/admin/communities/{test_community_id}/members",
            403,
            test_name="GET /api/admin/communities/{community_id}/members - Üyeler"
        )
    
    def test_group_membership_endpoints(self):
        """Test grup üyelik endpoints - auth gerekli, 403 bekleniyor"""
        print("=== GRUP ÜYELİK ENDPOINT'LERİ ===")
        
        test_subgroup_id = "test-subgroup-123"
        
        # GET /api/subgroups/{subgroup_id}/members - Grup üyelerini getir
        self.test_endpoint(
            "GET",
            f"/subgroups/{test_subgroup_id}/members",
            403,
            test_name="GET /api/subgroups/{subgroup_id}/members - Grup Üyeleri"
        )
        
        # POST /api/subgroups/{subgroup_id}/join - Gruba katıl
        self.test_endpoint(
            "POST",
            f"/subgroups/{test_subgroup_id}/join",
            403,
            test_name="POST /api/subgroups/{subgroup_id}/join - Gruba Katıl"
        )
    
    def check_server_status(self):
        """Check if server is accessible"""
        print("=== SUNUCU DURUMU KONTROLÜ ===")
        
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                print("✅ Sunucu erişilebilir ve çalışıyor")
                return True
            else:
                print(f"⚠️  Sunucu yanıt veriyor ama beklenmeyen durum kodu: {response.status_code}")
                return True  # Still accessible
        except requests.exceptions.RequestException as e:
            print(f"❌ Sunucu erişim hatası: {e}")
            return False
    
    def run_specific_tests(self):
        """Run all specific tests from review request"""
        print("🔍 Backend API Düzeltme Testleri Başlatılıyor")
        print(f"📍 Base URL: {self.base_url}")
        print(f"⏰ Test zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Check server status first
        if not self.check_server_status():
            print("❌ Sunucuya erişilemiyor, testler durduruluyor")
            return
        
        print()
        
        # Run specific test suites
        self.test_basic_endpoints()
        self.test_poll_endpoints()
        self.test_admin_endpoints()
        self.test_group_membership_endpoints()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("="*60)
        print("📊 TEST SONUÇLARI ÖZETİ")
        print("="*60)
        print(f"Toplam Test: {self.total_tests}")
        print(f"✅ Başarılı: {self.passed_tests}")
        print(f"❌ Başarısız: {self.failed_tests}")
        print(f"📈 Başarı Oranı: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        print("\n🔍 TEMEL BULGULAR:")
        
        # Check basic endpoints
        basic_working = any(r["test"] == "GET /api/ - API Kök" and r["actual"] == 200 for r in self.test_results)
        cities_working = any(r["test"] == "GET /api/cities - Şehirler Listesi" and r["actual"] == 200 for r in self.test_results)
        
        if basic_working and cities_working:
            print("✅ Temel endpoint'ler (/, /cities) doğru çalışıyor")
        else:
            print("❌ Temel endpoint'lerde sorun var")
        
        # Check authentication protection
        auth_tests = [r for r in self.test_results if "403" in str(r["expected"])]
        protected_correctly = sum(1 for r in auth_tests if r["actual"] == 403)
        
        if protected_correctly == len(auth_tests):
            print("✅ Tüm korumalı endpoint'ler doğru şekilde auth gerektiriyor")
        elif protected_correctly > 0:
            print(f"⚠️  {protected_correctly}/{len(auth_tests)} korumalı endpoint doğru çalışıyor")
        else:
            print("❌ Auth koruması çalışmıyor olabilir")
        
        # Check for 500 errors
        server_errors = [r for r in self.test_results if isinstance(r["actual"], int) and r["actual"] >= 500]
        if server_errors:
            print(f"🚨 {len(server_errors)} endpoint 500+ hata döndürdü:")
            for error in server_errors:
                print(f"   - {error['test']}: {error['actual']}")
        else:
            print("✅ 500+ sunucu hatası tespit edilmedi")
        
        # Check for connection issues
        connection_errors = [r for r in self.test_results if r["actual"] in ["TIMEOUT", "CONNECTION_ERROR", "REQUEST_ERROR"]]
        if connection_errors:
            print(f"⚠️  {len(connection_errors)} endpoint'te bağlantı sorunu:")
            for error in connection_errors:
                print(f"   - {error['test']}: {error['actual']}")
        
        print(f"\n⏰ Test tamamlandı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if self.failed_tests == 0:
            print("\n🎉 Tüm testler başarılı!")
        else:
            print(f"\n⚠️  {self.failed_tests} test başarısız oldu, detayları yukarıda")

def main():
    """Main function to run tests"""
    tester = SpecificEndpointTester()
    tester.run_specific_tests()
    
    # Return exit code based on results
    if tester.failed_tests > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()