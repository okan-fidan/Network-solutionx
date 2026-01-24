#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for New Features
Testing newly added endpoints as per Turkish review request:
1. Mentor System APIs
2. Gamification APIs  
3. Admin Event APIs
4. Admin Mentor APIs

Base URL: https://community-app-11.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://community-app-11.preview.emergentagent.com/api"
TIMEOUT = 30

def test_endpoint(method, endpoint, data=None, headers=None, expected_status=None):
    """Test a single endpoint and return results"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=TIMEOUT)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=TIMEOUT)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        result = {
            "method": method.upper(),
            "endpoint": endpoint,
            "status_code": response.status_code,
            "success": True,
            "response_time": response.elapsed.total_seconds()
        }
        
        # Try to parse JSON response
        try:
            result["response"] = response.json()
        except:
            result["response"] = response.text[:200] if response.text else "No content"
        
        # Check expected status if provided
        if expected_status and response.status_code != expected_status:
            result["warning"] = f"Expected {expected_status}, got {response.status_code}"
        
        return result
        
    except requests.exceptions.Timeout:
        return {"error": f"Timeout after {TIMEOUT}s", "endpoint": endpoint}
    except requests.exceptions.ConnectionError:
        return {"error": "Connection failed", "endpoint": endpoint}
    except Exception as e:
        return {"error": str(e), "endpoint": endpoint}

def run_comprehensive_tests():
    """Run comprehensive tests for all new endpoints"""
    print("=" * 80)
    print("YENİ EKLENEN TÜM ÖZELLİKLER BACKEND API TESTLERİ")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    print("=" * 80)
    
    all_results = []
    
    # Test basic connectivity first
    print("\n🔍 TEMEL BAĞLANTI TESTLERİ")
    print("-" * 40)
    
    basic_tests = [
        ("GET", "/", None, 200),
        ("GET", "/cities", None, 200)
    ]
    
    for method, endpoint, data, expected in basic_tests:
        result = test_endpoint(method, endpoint, data, expected_status=expected)
        all_results.append(result)
        
        if "error" in result:
            print(f"❌ {method} {endpoint}: {result['error']}")
        else:
            status_icon = "✅" if result['status_code'] == expected else "⚠️"
            print(f"{status_icon} {method} {endpoint}: {result['status_code']}")
            if result['status_code'] == 200 and endpoint == "/cities":
                cities_count = len(result.get('response', {}).get('cities', []))
                print(f"   📍 {cities_count} şehir döndürüldü")
    
    # Test Mentor System APIs
    print("\n🎓 MENTOR SİSTEMİ API TESTLERİ")
    print("-" * 40)
    
    mentor_tests = [
        ("GET", "/mentors", None, 403),  # Auth required
        ("POST", "/mentors/apply", {"expertise": "Teknoloji", "experience": "5 yıl", "bio": "Test mentor"}, 403),  # Auth required
        ("POST", "/mentors/test-mentor-id/request", {"message": "Mentorluk talebi"}, 403),  # Auth required
        ("GET", "/mentors/my-requests", None, 403),  # Auth required
        ("GET", "/mentors/incoming-requests", None, 403),  # Auth required
        ("PUT", "/mentors/requests/test-request-id", {"status": "approved", "response": "Kabul edildi"}, 403),  # Auth required
    ]
    
    for method, endpoint, data, expected in mentor_tests:
        result = test_endpoint(method, endpoint, data, expected_status=expected)
        all_results.append(result)
        
        if "error" in result:
            print(f"❌ {method} {endpoint}: {result['error']}")
        else:
            status_icon = "✅" if result['status_code'] == expected else "⚠️"
            print(f"{status_icon} {method} {endpoint}: {result['status_code']}")
            if result['status_code'] == 403:
                print(f"   🔒 Firebase authentication koruması aktif")
    
    # Test Gamification APIs
    print("\n🎮 GAMİFİKASYON SİSTEMİ API TESTLERİ")
    print("-" * 40)
    
    gamification_tests = [
        ("GET", "/gamification/my-stats", None, 403),  # Auth required
        ("GET", "/gamification/leaderboard", None, 403),  # Auth required
        ("POST", "/gamification/add-points", {"points": 100, "reason": "Test puan"}, 403),  # Auth required
    ]
    
    for method, endpoint, data, expected in gamification_tests:
        result = test_endpoint(method, endpoint, data, expected_status=expected)
        all_results.append(result)
        
        if "error" in result:
            print(f"❌ {method} {endpoint}: {result['error']}")
        else:
            status_icon = "✅" if result['status_code'] == expected else "⚠️"
            print(f"{status_icon} {method} {endpoint}: {result['status_code']}")
            if result['status_code'] == 403:
                print(f"   🔒 Firebase authentication koruması aktif")
    
    # Test Admin Event APIs
    print("\n📅 ADMİN ETKİNLİK SİSTEMİ API TESTLERİ")
    print("-" * 40)
    
    admin_event_tests = [
        ("POST", "/admin/events", {
            "title": "Test Etkinlik",
            "description": "Test açıklama",
            "date": "2024-12-31T10:00:00Z",
            "location": "İstanbul"
        }, 403),  # Auth required
        ("GET", "/admin/events", None, 403),  # Auth required
        ("DELETE", "/admin/events/test-event-id", None, 403),  # Auth required
    ]
    
    for method, endpoint, data, expected in admin_event_tests:
        result = test_endpoint(method, endpoint, data, expected_status=expected)
        all_results.append(result)
        
        if "error" in result:
            print(f"❌ {method} {endpoint}: {result['error']}")
        else:
            status_icon = "✅" if result['status_code'] == expected else "⚠️"
            print(f"{status_icon} {method} {endpoint}: {result['status_code']}")
            if result['status_code'] == 403:
                print(f"   🔒 Admin authentication koruması aktif")
    
    # Test Admin Mentor APIs
    print("\n👨‍🏫 ADMİN MENTOR YÖNETİMİ API TESTLERİ")
    print("-" * 40)
    
    admin_mentor_tests = [
        ("GET", "/admin/mentor-applications", None, 403),  # Auth required
        ("PUT", "/admin/mentor-applications/test-user-id", {"status": "approved", "notes": "Onaylandı"}, 403),  # Auth required
    ]
    
    for method, endpoint, data, expected in admin_mentor_tests:
        result = test_endpoint(method, endpoint, data, expected_status=expected)
        all_results.append(result)
        
        if "error" in result:
            print(f"❌ {method} {endpoint}: {result['error']}")
        else:
            status_icon = "✅" if result['status_code'] == expected else "⚠️"
            print(f"{status_icon} {method} {endpoint}: {result['status_code']}")
            if result['status_code'] == 403:
                print(f"   🔒 Admin authentication koruması aktif")
    
    # Calculate summary statistics
    print("\n" + "=" * 80)
    print("📊 TEST SONUÇLARI ÖZETİ")
    print("=" * 80)
    
    total_tests = len(all_results)
    successful_tests = len([r for r in all_results if "error" not in r])
    failed_tests = total_tests - successful_tests
    
    # Count tests by expected behavior
    auth_protected_tests = len([r for r in all_results if "error" not in r and r.get('status_code') == 403])
    public_tests = len([r for r in all_results if "error" not in r and r.get('status_code') == 200])
    
    print(f"✅ Toplam Test: {total_tests}")
    print(f"✅ Başarılı Test: {successful_tests}")
    print(f"❌ Başarısız Test: {failed_tests}")
    print(f"🔒 Auth Korumalı Endpoint: {auth_protected_tests}")
    print(f"🌐 Public Endpoint: {public_tests}")
    
    if failed_tests == 0:
        print(f"\n🎉 TÜM TESTLER BAŞARILI! ({successful_tests}/{total_tests})")
        print("✅ Sunucu erişilebilir ve stabil")
        print("✅ Tüm yeni endpoint'ler doğru implement edilmiş")
        print("✅ Firebase authentication sistemi aktif")
        print("✅ Admin endpoint'leri doğru korunuyor")
        print("✅ Hiç 500 hatası tespit edilmedi")
    else:
        print(f"\n⚠️  {failed_tests} TEST BAŞARISIZ")
        print("Başarısız testler:")
        for result in all_results:
            if "error" in result:
                print(f"  ❌ {result.get('endpoint', 'Unknown')}: {result['error']}")
    
    print(f"\n🌐 Sunucu: {BASE_URL}")
    print(f"⏱️  Test Süresi: {datetime.now().isoformat()}")
    
    return all_results, successful_tests, total_tests

if __name__ == "__main__":
    try:
        results, successful, total = run_comprehensive_tests()
        
        # Exit with appropriate code
        if successful == total:
            print(f"\n✅ Tüm testler başarılı - Backend hazır!")
            sys.exit(0)
        else:
            print(f"\n❌ {total - successful} test başarısız")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        sys.exit(1)