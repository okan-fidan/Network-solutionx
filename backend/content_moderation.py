"""
Yapay Zeka Destekli İçerik Moderasyon Sistemi
- Küfür/Hakaret Filtresi
- Spam Tespiti
- Dolandırıcılık Tespiti
"""

import re
from typing import Tuple, List, Dict
from datetime import datetime

# Türkçe küfür ve hakaret kelimeleri (gizlenmiş versiyonlar dahil)
PROFANITY_PATTERNS = [
    # Temel küfürler ve varyasyonları
    r'\b(s[i1!ıİ]k[i1!ıİ]?[şsŞS]?|s[i1!ıİ]kt[i1!ıİ]r|s[i1!ıİ]k[i1!ıİ]m)\b',
    r'\b(am[ıi]n?[aıi]?|am[ck]?[ıi]k)\b',
    r'\b(orospu|or[o0]spu|0r0spu|oruspu)\b',
    r'\b(piç|p[i1!]ç|pic)\b',
    r'\b(yarak|yar+ak|yar+a[kğ])\b',
    r'\b(göt|g[o0ö]t|got)\b',
    r'\b(meme|m[e3]m[e3])\b',
    r'\b(kaltak|kalt[a@]k)\b',
    r'\b(şerefsiz|s[e3]r[e3]fs[i1!]z)\b',
    r'\b(aptal|apt[a@]l|mal|gerizekalı|salak)\b',
    r'\b(dangalak|ahmak|embesil|geri zekalı)\b',
    r'\b(haysiyetsiz|namussuz|ahlaksız)\b',
    r'\b(ibne|[i1!]bn[e3]|top|götveren)\b',
    r'\b(pezevenk|p[e3]z[e3]v[e3]nk)\b',
    r'\b(fahişe|f[a@]h[i1!]ş[e3])\b',
    r'\b(dölü?|d[o0ö]l)\b',
    r'\b(taşak|t[a@]ş[a@]k|taşşak)\b',
    r'\b(yarrak|yarr+ak)\b',
    r'\b(bok|b[o0]k)\b',
    r'\b(siktir|s[i1!]kt[i1!]r)\b',
    r'\b(amk|aq|mk|mq)\b',
    r'\b(ananı|baban[ıi])\b',
]

# Spam kalıpları
SPAM_PATTERNS = [
    r'(https?://[^\s]+){3,}',  # Çok fazla link
    r'(.)\1{5,}',  # Aynı karakterin 5+ tekrarı
    r'(\b\w+\b)(\s+\1){3,}',  # Aynı kelimenin tekrarı
    r'[A-Z\s]{20,}',  # Uzun büyük harf dizileri
    r'[\!\?\.\,]{5,}',  # Çok fazla noktalama
    r'(kazanın|kazan|ücretsiz|bedava|free|bonus|çekiliş|hediye).*(tıklayın|link|url)',
    r'(whatsapp|telegram|instagram).*(numara|dm|yaz)',
]

# Dolandırıcılık kalıpları
FRAUD_PATTERNS = [
    r'(banka|hesap|iban|kart).*(numara|gönder|paylaş)',
    r'(şifre|parola|password).*(ver|gönder|paylaş)',
    r'(tc|kimlik).*(numara|no).*(gönder|ver)',
    r'(ön\s*ödeme|kapora|depozit).*(iste|gönder|yolla)',
    r'(acil|hemen|şimdi).*(para|ödeme|transfer)',
    r'(garantili|kesin|yüzde\s*yüz).*(kazanç|para|gelir)',
    r'(kripto|bitcoin|coin).*(yatırım|kazan|getiri)',
    r'(evden|internetten).*(kazan|gelir|para).*(kolay|basit)',
    r'whatsapp.*(\+90|05|5\d{2})',
]

# Güvenli kelimeler (yanlış pozitif önleme)
SAFE_WORDS = [
    'amatör', 'memur', 'memleket', 'görev', 'götür', 'ambar', 'taşımak',
    'boklu', 'pislik', 'şirket', 'toplantı', 'profesyonel'
]

class ContentModerator:
    def __init__(self):
        self.profanity_regex = [re.compile(p, re.IGNORECASE | re.UNICODE) for p in PROFANITY_PATTERNS]
        self.spam_regex = [re.compile(p, re.IGNORECASE | re.UNICODE) for p in SPAM_PATTERNS]
        self.fraud_regex = [re.compile(p, re.IGNORECASE | re.UNICODE) for p in FRAUD_PATTERNS]
        self.safe_words = set(SAFE_WORDS)
    
    def check_profanity(self, text: str) -> Tuple[bool, List[str]]:
        """Küfür ve hakaret kontrolü"""
        text_lower = text.lower()
        found_words = []
        
        # Güvenli kelimeleri kontrol et
        for safe in self.safe_words:
            if safe in text_lower:
                text_lower = text_lower.replace(safe, '')
        
        for pattern in self.profanity_regex:
            matches = pattern.findall(text_lower)
            if matches:
                found_words.extend(matches)
        
        return len(found_words) > 0, found_words
    
    def check_spam(self, text: str) -> Tuple[bool, str]:
        """Spam kontrolü"""
        for pattern in self.spam_regex:
            if pattern.search(text):
                return True, "Spam içerik tespit edildi"
        return False, ""
    
    def check_fraud(self, text: str) -> Tuple[bool, str]:
        """Dolandırıcılık kontrolü"""
        for pattern in self.fraud_regex:
            if pattern.search(text):
                return True, "Potansiyel dolandırıcılık içeriği tespit edildi"
        return False, ""
    
    def moderate(self, text: str, context: str = "general") -> Dict:
        """
        Ana moderasyon fonksiyonu
        
        Args:
            text: Kontrol edilecek metin
            context: İçerik bağlamı (post, message, comment, profile, service)
        
        Returns:
            {
                "is_safe": bool,
                "should_block": bool,
                "warnings": List[str],
                "reasons": List[str],
                "severity": str (low, medium, high, critical)
            }
        """
        result = {
            "is_safe": True,
            "should_block": False,
            "warnings": [],
            "reasons": [],
            "severity": "low",
            "filtered_text": text
        }
        
        if not text or len(text.strip()) == 0:
            return result
        
        # Küfür kontrolü
        has_profanity, profanity_words = self.check_profanity(text)
        if has_profanity:
            result["is_safe"] = False
            result["should_block"] = True
            result["reasons"].append("Uygunsuz dil kullanımı tespit edildi")
            result["severity"] = "high"
            # Küfürleri sansürle
            filtered = text
            for word in profanity_words:
                if len(word) > 1:
                    censored = word[0] + '*' * (len(word) - 1)
                    filtered = re.sub(re.escape(word), censored, filtered, flags=re.IGNORECASE)
            result["filtered_text"] = filtered
        
        # Spam kontrolü
        is_spam, spam_reason = self.check_spam(text)
        if is_spam:
            result["is_safe"] = False
            result["warnings"].append(spam_reason)
            if result["severity"] != "high":
                result["severity"] = "medium"
        
        # Dolandırıcılık kontrolü (sadece mesaj ve hizmet bağlamında)
        if context in ["message", "service", "comment"]:
            is_fraud, fraud_reason = self.check_fraud(text)
            if is_fraud:
                result["is_safe"] = False
                result["should_block"] = True
                result["reasons"].append(fraud_reason)
                result["severity"] = "critical"
                result["warnings"].append("Bu içerik güvenlik ekibi tarafından incelenecek")
        
        return result
    
    def filter_text(self, text: str) -> str:
        """Metindeki uygunsuz kelimeleri sansürle"""
        result = self.moderate(text)
        return result["filtered_text"]

# Singleton instance
moderator = ContentModerator()

def moderate_content(text: str, context: str = "general") -> Dict:
    """Global moderasyon fonksiyonu"""
    return moderator.moderate(text, context)

def filter_profanity(text: str) -> str:
    """Küfürleri sansürle"""
    return moderator.filter_text(text)

def is_safe_content(text: str, context: str = "general") -> bool:
    """İçeriğin güvenli olup olmadığını kontrol et"""
    result = moderator.moderate(text, context)
    return result["is_safe"]
