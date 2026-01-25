#!/usr/bin/env python3
"""
Üyelik Sistemi Backend API Testleri
Test edilen endpoint'ler:
1. GET /api/membership/plans - Üyelik planları (public)
2. GET /api/membership/status - Üyelik durumu (auth gerekli)
3. POST /api/membership/purchase - Satın alma (auth gerekli)
4. GET /api/membership/orders - Sipariş geçmişi (auth gerekli)
5. GET /api/ - Ana sayfa (smoke test)
6. GET /api/cities - Şehirler (smoke test)
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL - Production URL from frontend .env
BASE_URL = "https://buildsaver.preview.emergentagent.com/api"

def test_membership_apis():
    """Üyelik sistemi API testleri"""
    print("=" * 60)
    print("ÜYELİK SİSTEMİ BACKEND API TESTLERİ")
    print("=" * 60)
    print(f"Test Zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend URL: {BASE_URL}")
    print()
    
    test_results = []
    
    # Test 1: Smoke Test - Ana sayfa
    print("1. SMOKE TEST - Ana Sayfa")
    print("-" * 30)
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"GET /api/ -> Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            test_results.append(("GET /api/", "✅ BAŞARILI", f"200 OK - {data.get('message', 'OK')}"))
        else:
            print(f"Beklenmeyen status code: {response.status_code}")
            test_results.append(("GET /api/", "❌ BAŞARISIZ", f"Status: {response.status_code}"))
    except Exception as e:
        print(f"Hata: {str(e)}")
        test_results.append(("GET /api/", "❌ HATA", str(e)))
    print()
    
    # Test 2: Smoke Test - Şehirler
    print("2. SMOKE TEST - Şehirler")
    print("-" * 30)
    try:
        response = requests.get(f"{BASE_URL}/cities", timeout=10)
        print(f"GET /api/cities -> Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            city_count = len(data.get('cities', []))
            print(f"Şehir sayısı: {city_count}")
            test_results.append(("GET /api/cities", "✅ BAŞARILI", f"200 OK - {city_count} şehir"))
        else:
            print(f"Beklenmeyen status code: {response.status_code}")
            test_results.append(("GET /api/cities", "❌ BAŞARISIZ", f"Status: {response.status_code}"))
    except Exception as e:
        print(f"Hata: {str(e)}")
        test_results.append(("GET /api/cities", "❌ HATA", str(e)))
    print()
    
    # Test 3: Üyelik Planları (Public endpoint olmalı)
    print("3. ÜYELİK PLANLARI - Public Endpoint")
    print("-" * 40)
    try:
        response = requests.get(f"{BASE_URL}/membership/plans", timeout=10)
        print(f"GET /api/membership/plans -> Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
            test_results.append(("GET /api/membership/plans", "✅ BAŞARILI", "200 OK - Public endpoint çalışıyor"))
        elif response.status_code == 404:
            print("Endpoint bulunamadı - Henüz implement edilmemiş")
            test_results.append(("GET /api/membership/plans", "❌ EKSIK", "404 - Endpoint implement edilmemiş"))
        else:
            print(f"Beklenmeyen status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Response text: {response.text}")
            test_results.append(("GET /api/membership/plans", "❌ BAŞARISIZ", f"Status: {response.status_code}"))
    except Exception as e:
        print(f"Hata: {str(e)}")
        test_results.append(("GET /api/membership/plans", "❌ HATA", str(e)))
    print()
    
    # Test 4: Üyelik Durumu (Auth gerekli - 403 bekleniyor)
    print("4. ÜYELİK DURUMU - Auth Gerekli")
    print("-" * 35)
    try:
        response = requests.get(f"{BASE_URL}/membership/status", timeout=10)
        print(f"GET /api/membership/status -> Status: {response.status_code}")
        
        if response.status_code == 403 or response.status_code == 401:
            print("✅ Doğru! Auth koruması çalışıyor")
            test_results.append(("GET /api/membership/status", "✅ BAŞARILI", f"{response.status_code} - Auth koruması OK"))
        elif response.status_code == 404:
            print("Endpoint bulunamadı - Henüz implement edilmemiş")
            test_results.append(("GET /api/membership/status", "❌ EKSIK", "404 - Endpoint implement edilmemiş"))
        else:
            print(f"Beklenmeyen status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Response text: {response.text}")
            test_results.append(("GET /api/membership/status", "❌ BAŞARISIZ", f"Status: {response.status_code}"))
    except Exception as e:
        print(f"Hata: {str(e)}")
        test_results.append(("GET /api/membership/status", "❌ HATA", str(e)))
    print()
    
    # Test 5: Üyelik Satın Alma (Auth gerekli - 403 bekleniyor)
    print("5. ÜYELİK SATIN ALMA - Auth Gerekli")
    print("-" * 38)
    try:
        purchase_data = {
            "plan": "premium_monthly",
            "paymentMethod": "credit_card"
        }
        response = requests.post(f"{BASE_URL}/membership/purchase", 
                               json=purchase_data, timeout=10)
        print(f"POST /api/membership/purchase -> Status: {response.status_code}")
        
        if response.status_code == 403 or response.status_code == 401:
            print("✅ Doğru! Auth koruması çalışıyor")
            test_results.append(("POST /api/membership/purchase", "✅ BAŞARILI", f"{response.status_code} - Auth koruması OK"))
        elif response.status_code == 404:
            print("Endpoint bulunamadı - Henüz implement edilmemiş")
            test_results.append(("POST /api/membership/purchase", "❌ EKSIK", "404 - Endpoint implement edilmemiş"))
        else:
            print(f"Beklenmeyen status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Response text: {response.text}")
            test_results.append(("POST /api/membership/purchase", "❌ BAŞARISIZ", f"Status: {response.status_code}"))
    except Exception as e:
        print(f"Hata: {str(e)}")
        test_results.append(("POST /api/membership/purchase", "❌ HATA", str(e)))
    print()
    
    # Test 6: Sipariş Geçmişi (Auth gerekli - 403 bekleniyor)
    print("6. SİPARİŞ GEÇMİŞİ - Auth Gerekli")
    print("-" * 35)
    try:
        response = requests.get(f"{BASE_URL}/membership/orders", timeout=10)
        print(f"GET /api/membership/orders -> Status: {response.status_code}")
        
        if response.status_code == 403 or response.status_code == 401:
            print("✅ Doğru! Auth koruması çalışıyor")
            test_results.append(("GET /api/membership/orders", "✅ BAŞARILI", f"{response.status_code} - Auth koruması OK"))
        elif response.status_code == 404:
            print("Endpoint bulunamadı - Henüz implement edilmemiş")
            test_results.append(("GET /api/membership/orders", "❌ EKSIK", "404 - Endpoint implement edilmemiş"))
        else:
            print(f"Beklenmeyen status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {error_data}")
            except:
                print(f"Response text: {response.text}")
            test_results.append(("GET /api/membership/orders", "❌ BAŞARISIZ", f"Status: {response.status_code}"))
    except Exception as e:
        print(f"Hata: {str(e)}")
        test_results.append(("GET /api/membership/orders", "❌ HATA", str(e)))
    print()
    
    # Test Sonuçları Özeti
    print("=" * 60)
    print("TEST SONUÇLARI ÖZETİ")
    print("=" * 60)
    
    success_count = 0
    missing_count = 0
    failed_count = 0
    
    for endpoint, status, detail in test_results:
        print(f"{status} {endpoint}")
        print(f"   └─ {detail}")
        
        if "✅ BAŞARILI" in status:
            success_count += 1
        elif "❌ EKSIK" in status:
            missing_count += 1
        else:
            failed_count += 1
    
    print()
    print(f"📊 TOPLAM: {len(test_results)} test")
    print(f"✅ Başarılı: {success_count}")
    print(f"❌ Eksik Endpoint: {missing_count}")
    print(f"❌ Başarısız: {failed_count}")
    
    if missing_count > 0:
        print()
        print("⚠️  KRİTİK BULGULAR:")
        print("   • Üyelik sistemi endpoint'leri henüz implement edilmemiş")
        print("   • Backend'de membership modülü eksik")
        print("   • PayTR entegrasyonu için gerekli endpoint'ler yok")
    
    return test_results

if __name__ == "__main__":
    test_membership_apis()