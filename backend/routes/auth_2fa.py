from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
import uuid
import random
import string
from typing import Optional
from pydantic import BaseModel

auth_router = APIRouter(prefix="/auth", tags=["auth"])

class TwoFactorSetup(BaseModel):
    method: str = "email"  # email veya sms

class TwoFactorVerify(BaseModel):
    code: str

def setup_auth_routes(db, get_current_user):
    
    # 2FA kodlarını geçici saklamak için
    _pending_codes = {}
    
    def generate_code() -> str:
        """6 haneli rastgele kod üret"""
        return ''.join(random.choices(string.digits, k=6))
    
    @auth_router.get("/2fa/status")
    async def get_2fa_status(current_user: dict = Depends(get_current_user)):
        """Kullanıcının 2FA durumunu döner"""
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        return {
            "enabled": user.get('twoFactorEnabled', False),
            "method": user.get('twoFactorMethod', 'email'),
            "verified": user.get('twoFactorVerified', False)
        }
    
    @auth_router.post("/2fa/enable")
    async def enable_2fa(setup: TwoFactorSetup, current_user: dict = Depends(get_current_user)):
        """2FA etkinleştirme başlat"""
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Kod üret
        code = generate_code()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Kodu sakla
        _pending_codes[current_user['uid']] = {
            "code": code,
            "expires_at": expires_at,
            "method": setup.method
        }
        
        # Bildirim oluştur (gerçek uygulamada e-posta/SMS gönderilir)
        notification = {
            "id": str(uuid.uuid4()),
            "userId": current_user['uid'],
            "type": "2fa_code",
            "title": "İki Faktörlü Doğrulama Kodu",
            "message": f"Doğrulama kodunuz: {code} (10 dakika geçerli)",
            "data": {"code": code},
            "isRead": False,
            "timestamp": datetime.utcnow()
        }
        await db.notifications.insert_one(notification)
        
        return {
            "message": "Doğrulama kodu gönderildi",
            "method": setup.method,
            "expiresAt": expires_at.isoformat(),
            # Demo için kodu da döner (production'da kaldırılmalı)
            "demo_code": code
        }
    
    @auth_router.post("/2fa/verify")
    async def verify_2fa(verify: TwoFactorVerify, current_user: dict = Depends(get_current_user)):
        """2FA kodunu doğrula ve etkinleştir"""
        pending = _pending_codes.get(current_user['uid'])
        
        if not pending:
            raise HTTPException(status_code=400, detail="Önce doğrulama kodu isteyin")
        
        if datetime.utcnow() > pending['expires_at']:
            del _pending_codes[current_user['uid']]
            raise HTTPException(status_code=400, detail="Kodun süresi dolmuş")
        
        if pending['code'] != verify.code:
            raise HTTPException(status_code=400, detail="Geçersiz kod")
        
        # Kodu temizle
        del _pending_codes[current_user['uid']]
        
        # 2FA'yı etkinleştir
        await db.users.update_one(
            {"uid": current_user['uid']},
            {"$set": {
                "twoFactorEnabled": True,
                "twoFactorMethod": pending['method'],
                "twoFactorVerified": True,
                "twoFactorEnabledAt": datetime.utcnow()
            }}
        )
        
        return {"message": "İki faktörlü doğrulama etkinleştirildi", "enabled": True}
    
    @auth_router.post("/2fa/disable")
    async def disable_2fa(verify: TwoFactorVerify, current_user: dict = Depends(get_current_user)):
        """2FA devre dışı bırak"""
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        if not user.get('twoFactorEnabled'):
            raise HTTPException(status_code=400, detail="2FA zaten devre dışı")
        
        # Kod doğrulaması (geçici olarak basitleştirilmiş)
        pending = _pending_codes.get(current_user['uid'])
        if pending and pending['code'] == verify.code:
            del _pending_codes[current_user['uid']]
        elif verify.code != "000000":  # Demo için bypass
            raise HTTPException(status_code=400, detail="Geçersiz kod")
        
        await db.users.update_one(
            {"uid": current_user['uid']},
            {"$set": {
                "twoFactorEnabled": False,
                "twoFactorVerified": False
            }}
        )
        
        return {"message": "İki faktörlü doğrulama devre dışı bırakıldı", "enabled": False}
    
    @auth_router.post("/2fa/send-code")
    async def send_2fa_code(current_user: dict = Depends(get_current_user)):
        """Giriş için 2FA kodu gönder"""
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        if not user.get('twoFactorEnabled'):
            return {"message": "2FA etkin değil", "required": False}
        
        # Kod üret
        code = generate_code()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        _pending_codes[current_user['uid']] = {
            "code": code,
            "expires_at": expires_at,
            "method": user.get('twoFactorMethod', 'email')
        }
        
        # Bildirim
        notification = {
            "id": str(uuid.uuid4()),
            "userId": current_user['uid'],
            "type": "2fa_login_code",
            "title": "Giriş Doğrulama Kodu",
            "message": f"Giriş doğrulama kodunuz: {code}",
            "data": {"code": code},
            "isRead": False,
            "timestamp": datetime.utcnow()
        }
        await db.notifications.insert_one(notification)
        
        return {
            "message": "Doğrulama kodu gönderildi",
            "required": True,
            "method": user.get('twoFactorMethod', 'email'),
            "demo_code": code  # Demo için
        }
    
    return auth_router
