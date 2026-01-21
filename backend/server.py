from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request as StarletteRequest
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from firebase_config import verify_firebase_token
import socketio
import base64
import json
import hashlib
import hmac
import re
import html

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'network_solution')]

# Rate Limiter setup
limiter = Limiter(key_func=get_remote_address)

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create the main app without a prefix
app = FastAPI()

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Admin email - Ana yönetici
ADMIN_EMAIL = "metaticaretim@gmail.com"

# Default subgroups for each community
DEFAULT_SUBGROUPS = [
    {"name": "Start", "description": "Yeni başlayanlar için başlangıç grubu", "isPublic": True, "requiresApproval": False},
    {"name": "Gelişim", "description": "Gelişim odaklı girişimciler grubu", "isPublic": False},
    {"name": "Master Mind", "description": "İleri seviye girişimciler için mastermind grubu", "isPublic": False},
    {"name": "Değerlendirme", "description": "Performans ve ilerleme değerlendirme grubu", "isPublic": False},
    {"name": "Duyurular", "description": "Topluluk duyuruları ve önemli bilgiler", "isPublic": True, "requiresApproval": False},
]

# Turkish Cities List
TURKISH_CITIES = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
    'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
    'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
    'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
    'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
    'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
    'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
    'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
    'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Sivas', 'Şırnak',
    'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
]

# Dependency to verify Firebase token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = verify_firebase_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# Check if user is global admin
async def check_global_admin(current_user: dict):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        return False
    return user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()

# Create default subgroups for a community
async def create_default_subgroups(community_id: str, community_name: str, creator_uid: str = "system"):
    subgroup_ids = []
    for sg_data in DEFAULT_SUBGROUPS:
        subgroup_id = str(uuid.uuid4())
        new_subgroup = {
            "id": subgroup_id,
            "communityId": community_id,
            "name": f"{community_name} - {sg_data['name']}",
            "description": sg_data['description'],
            "imageUrl": None,
            "groupAdmins": [],
            "members": [],
            "bannedUsers": [],
            "restrictedUsers": [],
            "pinnedMessages": [],
            "pendingRequests": [],
            "isPublic": sg_data['isPublic'],
            "requiresApproval": True,
            "createdBy": creator_uid,
            "createdByName": "System",
            "createdAt": datetime.utcnow()
        }
        await db.subgroups.insert_one(new_subgroup)
        subgroup_ids.append(subgroup_id)
    return subgroup_ids

# Initialize city communities
async def initialize_city_communities():
    for city in TURKISH_CITIES:
        existing = await db.communities.find_one({"city": city})
        if not existing:
            announcement_id = str(uuid.uuid4())
            community_id = str(uuid.uuid4())
            community = {
                "id": community_id,
                "name": f"{city} Girişimciler",
                "description": f"{city} ilindeki girişimcilerin buluşma noktası",
                "city": city,
                "imageUrl": None,
                "superAdmins": [],
                "members": [],
                "subGroups": [],
                "bannedUsers": [],
                "restrictedUsers": [],
                "announcementChannelId": announcement_id,
                "createdBy": "system",
                "createdByName": "System",
                "createdAt": datetime.utcnow()
            }
            await db.communities.insert_one(community)
            
            # Create default subgroups
            subgroup_ids = await create_default_subgroups(community_id, f"{city} Girişimciler")
            await db.communities.update_one(
                {"id": community_id},
                {"$set": {"subGroups": subgroup_ids}}
            )
        else:
            # Mevcut topluluğun alt gruplarını kontrol et
            existing_subgroups = await db.subgroups.find({"communityId": existing['id']}).to_list(20)
            existing_names = {sg.get('name', '') for sg in existing_subgroups}

            missing_default_subgroups = []
            for sg_data in DEFAULT_SUBGROUPS:
                full_name = f"{existing['name']} - {sg_data['name']}"
                if full_name not in existing_names:
                    missing_default_subgroups.append(sg_data)

            if missing_default_subgroups:
                # Sadece eksik olan default grupları oluştur
                subgroup_ids = []
                for sg_data in missing_default_subgroups:
                    subgroup_id = str(uuid.uuid4())
                    new_subgroup = {
                        "id": subgroup_id,
                        "communityId": existing['id'],
                        "name": f"{existing['name']} - {sg_data['name']}",
                        "description": sg_data['description'],
                        "imageUrl": None,
                        "groupAdmins": [],
                        "members": [],
                        "bannedUsers": [],
                        "restrictedUsers": [],
                        "pinnedMessages": [],
                        "pendingRequests": [],
                        "isPublic": sg_data['isPublic'],
                        "requiresApproval": True,
                        "createdBy": "system",
                        "createdByName": "System",
                        "createdAt": datetime.utcnow()
                    }
                    await db.subgroups.insert_one(new_subgroup)
                    subgroup_ids.append(subgroup_id)

                if subgroup_ids:
                    await db.communities.update_one(
                        {"id": existing['id']},
                        {"$addToSet": {"subGroups": {"$each": subgroup_ids}}}
                    )

# Ensure admin is in all communities
async def ensure_admin_in_all_communities():
    admin_user = await db.users.find_one({"email": {"$regex": f"^{ADMIN_EMAIL}$", "$options": "i"}})
    if admin_user:
        await db.communities.update_many(
            {},
            {"$addToSet": {"superAdmins": admin_user['uid'], "members": admin_user['uid']}}
        )
        await db.users.update_one(
            {"uid": admin_user['uid']},
            {"$set": {"isAdmin": True}}
        )
        # Admin'i tüm alt gruplara da admin ve üye olarak ekle
        await db.subgroups.update_many(
            {},
            {"$addToSet": {"groupAdmins": admin_user['uid'], "members": admin_user['uid']}}
        )

# Routes
@api_router.get("/")
async def root():
    return {"message": "Network Solution API"}

@api_router.get("/cities")
async def get_cities():
    return {"cities": TURKISH_CITIES}

@api_router.post("/user/register")
@api_router.post("/register-profile")  # Alias for backward compatibility
async def register_user(user_data: dict, current_user: dict = Depends(get_current_user)):
    existing_user = await db.users.find_one({"uid": current_user['uid']})
    if existing_user:
        if '_id' in existing_user:
            del existing_user['_id']
        return existing_user

    email = user_data.get('email', '')
    is_admin = email.lower() == ADMIN_EMAIL.lower()
    user_communities = []

    # Şehre göre topluluk ataması
    city = user_data.get('city', '')
    city_community = await db.communities.find_one({"city": city})
    if city_community:
        user_communities.append(city_community['id'])
        await db.communities.update_one(
            {"id": city_community['id']},
            {"$addToSet": {"members": current_user['uid']}}
        )

    # Admin ise tüm topluluklara süper admin olarak ekle
    if is_admin:
        all_communities = await db.communities.find().to_list(100)
        for community in all_communities:
            if community['id'] not in user_communities:
                user_communities.append(community['id'])
            await db.communities.update_one(
                {"id": community['id']},
                {"$addToSet": {"superAdmins": current_user['uid'], "members": current_user['uid']}}
            )

    user_profile = {
        "uid": current_user['uid'],
        "email": email,
        "firstName": user_data.get('firstName', ''),
        "lastName": user_data.get('lastName', ''),
        "phone": user_data.get('phone'),
        "city": city,
        "occupation": user_data.get('occupation'),
        "birthDate": user_data.get('birthDate'),
        "profileImageUrl": None,
        "isAdmin": is_admin,
        "isBanned": False,
        "isRestricted": False,
        "restrictedUntil": None,
        "communities": user_communities,
        "createdAt": datetime.utcnow()
    }

    await db.users.insert_one(user_profile)
    
    if '_id' in user_profile:
        del user_profile['_id']
    return user_profile

@api_router.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        return {
            "uid": current_user['uid'],
            "email": current_user.get('email', ''),
            "firstName": "",
            "lastName": "",
            "phone": None,
            "city": "",
            "profileImageUrl": None,
            "isAdmin": False,
            "communities": [],
            "needsRegistration": True
        }
    if '_id' in user:
        del user['_id']
    return user

@api_router.put("/user/profile")
async def update_user_profile(updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['firstName', 'lastName', 'phone', 'city', 'occupation', 'profileImageUrl']
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$set": filtered_updates}
    )
    return {"message": "Profile updated"}

@api_router.put("/user/profile-image")
async def update_profile_image(request: Request, current_user: dict = Depends(get_current_user)):
    """Kullanıcının profil resmini güncelle"""
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        image_url = data.get('profileImageUrl') or data.get('imageUrl')
        
        if not image_url:
            raise HTTPException(status_code=400, detail="Profil resmi URL'i gerekli")
        
        # Base64 boyutunu kontrol et (max 2MB)
        if len(image_url) > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Fotoğraf çok büyük. Maksimum 2MB")
        
        await db.users.update_one(
            {"uid": current_user['uid']},
            {"$set": {"profileImageUrl": image_url}}
        )
        return {"message": "Profil resmi güncellendi", "profileImageUrl": image_url[:100] + "..."}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Geçersiz JSON formatı")
    except Exception as e:
        logging.error(f"Profile image update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Fotoğraf güncellenemedi")

@api_router.get("/user/is-admin")
async def check_user_admin(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_admin = user.get('isAdmin', False) if user else False
    if user and user.get('email', '').lower() == ADMIN_EMAIL.lower():
        is_admin = True
    return {"isAdmin": is_admin}

@api_router.get("/user/privacy-settings")
async def get_privacy_settings(current_user: dict = Depends(get_current_user)):
    """Kullanıcının gizlilik ayarlarını getir"""
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        return {
            "showOnlineStatus": True,
            "showLastSeen": True,
            "profileVisibility": "public",
            "showPhone": False,
            "showEmail": True
        }
    return {
        "showOnlineStatus": user.get("showOnlineStatus", True),
        "showLastSeen": user.get("showLastSeen", True),
        "profileVisibility": user.get("profileVisibility", "public"),
        "showPhone": user.get("showPhone", False),
        "showEmail": user.get("showEmail", True)
    }

@api_router.put("/user/privacy-settings")
async def update_privacy_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    """Kullanıcının gizlilik ayarlarını güncelle"""
    allowed_fields = ['showOnlineStatus', 'showLastSeen', 'profileVisibility', 'showPhone', 'showEmail']
    filtered_updates = {k: v for k, v in settings.items() if k in allowed_fields}
    
    if filtered_updates:
        await db.users.update_one(
            {"uid": current_user['uid']},
            {"$set": filtered_updates}
        )
    return {"message": "Gizlilik ayarları güncellendi"}

@api_router.put("/user/notification-settings")
async def update_notification_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    """Kullanıcının bildirim ayarlarını güncelle"""
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$set": {"notificationSettings": settings}}
    )
    return {"message": "Bildirim ayarları güncellendi"}

@api_router.post("/feedback")
async def submit_feedback(data: dict, current_user: dict = Depends(get_current_user)):
    """Kullanıcı geri bildirimi kaydet"""
    feedback = {
        "id": str(uuid.uuid4()),
        "userId": current_user['uid'],
        "userEmail": data.get('userEmail'),
        "userName": data.get('userName'),
        "type": data.get('type'),
        "subject": data.get('subject'),
        "message": data.get('message'),
        "rating": data.get('rating'),
        "status": "pending",
        "createdAt": datetime.utcnow()
    }
    await db.feedback.insert_one(feedback)
    return {"message": "Geri bildirim kaydedildi", "id": feedback['id']}

@api_router.get("/feedback")
async def get_feedback(current_user: dict = Depends(get_current_user)):
    """Geri bildirimleri listele (admin)"""
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user.get('isAdmin'):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    
    feedbacks = await db.feedback.find({}).sort("createdAt", -1).limit(100).to_list(100)
    for f in feedbacks:
        if '_id' in f:
            del f['_id']
    return feedbacks

@api_router.post("/user/push-token")
async def save_push_token(data: dict, current_user: dict = Depends(get_current_user)):
    """Push notification token'ını kaydet"""
    token = data.get('token')
    if not token:
        raise HTTPException(status_code=400, detail="Token gerekli")
    
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$set": {"pushToken": token, "pushTokenUpdatedAt": datetime.utcnow()}}
    )
    return {"message": "Push token kaydedildi"}

@api_router.delete("/user/push-token")
async def remove_push_token(current_user: dict = Depends(get_current_user)):
    """Push notification token'ını sil"""
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$unset": {"pushToken": "", "pushTokenUpdatedAt": ""}}
    )
    return {"message": "Push token silindi"}

# ==================== COMMUNITIES ====================

@api_router.get("/communities")
async def get_communities(current_user: dict = Depends(get_current_user)):
    communities = await db.communities.find().sort("name", 1).to_list(100)
    for c in communities:
        if '_id' in c:
            del c['_id']
        c['memberCount'] = len(c.get('members', []))
        c['isMember'] = current_user['uid'] in c.get('members', [])
        c['isSuperAdmin'] = current_user['uid'] in c.get('superAdmins', [])
    return communities

@api_router.get("/communities/{community_id}")
async def get_community(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    if '_id' in community:
        del community['_id']
    
    community['memberCount'] = len(community.get('members', []))
    community['isMember'] = current_user['uid'] in community.get('members', [])
    community['isSuperAdmin'] = current_user['uid'] in community.get('superAdmins', [])
    
    # Check global admin
    user = await db.users.find_one({"uid": current_user['uid']})
    if user and (user.get('isAdmin') or user.get('email', '').lower() == ADMIN_EMAIL.lower()):
        community['isSuperAdmin'] = True
    
    subgroups = await db.subgroups.find({"communityId": community_id}).to_list(100)
    for sg in subgroups:
        if '_id' in sg:
            del sg['_id']
        sg['memberCount'] = len(sg.get('members', []))
        sg['isMember'] = current_user['uid'] in sg.get('members', [])
        sg['hasPendingRequest'] = any(r.get('uid') == current_user['uid'] for r in sg.get('pendingRequests', []))
    
    community['subGroupsList'] = subgroups
    return community

@api_router.post("/communities/{community_id}/join")
async def join_community(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    # Check if banned
    if current_user['uid'] in community.get('bannedUsers', []):
        raise HTTPException(status_code=403, detail="Bu topluluktan yasaklandınız")

    await db.communities.update_one(
        {"id": community_id},
        {"$addToSet": {"members": current_user['uid']}}
    )
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$addToSet": {"communities": community_id}}
    )
    
    # Kullanıcıyı otomatik olarak "Duyurular" grubuna ekle
    announcements_subgroup = await db.subgroups.find_one({
        "communityId": community_id,
        "name": {"$regex": "^Duyurular?$", "$options": "i"}
    })
    
    if announcements_subgroup:
        await db.subgroups.update_one(
            {"id": announcements_subgroup['id']},
            {"$addToSet": {"members": current_user['uid']}}
        )
    
    return {"message": "Topluluğa katıldınız. Duyuru kanalına otomatik eklendiniz."}

@api_router.post("/communities/{community_id}/leave")
async def leave_community(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if is_global_admin:
        raise HTTPException(status_code=400, detail="Global yönetici topluluktan ayrılamaz")

    await db.communities.update_one(
        {"id": community_id},
        {"$pull": {"members": current_user['uid'], "superAdmins": current_user['uid']}}
    )
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$pull": {"communities": community_id}}
    )
    
    # Also remove from all subgroups of this community
    await db.subgroups.update_many(
        {"communityId": community_id},
        {"$pull": {"members": current_user['uid'], "groupAdmins": current_user['uid']}}
    )
    
    return {"message": "Topluluktan ayrıldınız"}

# Topluluk profil resmi güncelle
@api_router.put("/communities/{community_id}/image")
async def update_community_image(community_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Check if user is admin or super admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    
    if not is_global_admin and not is_super_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    body = await request.json()
    image_data = body.get('imageData')
    
    if not image_data:
        raise HTTPException(status_code=400, detail="Resim verisi gerekli")
    
    # Store as data URL
    image_url = f"data:image/jpeg;base64,{image_data}"
    
    await db.communities.update_one(
        {"id": community_id},
        {"$set": {"imageUrl": image_url}}
    )
    
    return {"message": "Topluluk resmi güncellendi", "imageUrl": image_url}

# ==================== SUBGROUPS ====================

# Subgroup katılım istekleri için ayrı koleksiyon şeması (bilgi amaçlı)
# subgroup_join_requests:
#   - id
#   - communityId
#   - subgroupId
#   - subgroupName
#   - userId
#   - status: pending | approved | rejected
#   - createdAt
#   - updatedAt


@api_router.post("/communities/{community_id}/subgroups")
async def create_subgroup(community_id: str, subgroup_data: dict, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()

    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için süper yönetici yetkisi gerekiyor")

    subgroup_id = str(uuid.uuid4())
    new_subgroup = {
        "id": subgroup_id,
        "communityId": community_id,
        "name": subgroup_data['name'],
        "description": subgroup_data.get('description', ''),
        "imageUrl": subgroup_data.get('imageUrl'),
        "groupAdmins": [current_user['uid']],
        "members": [current_user['uid']],
        "bannedUsers": [],
        "restrictedUsers": [],
        "pinnedMessages": [],
        "pendingRequests": [],
        "isPublic": subgroup_data.get('isPublic', True),
        "requiresApproval": subgroup_data.get('requiresApproval', True),
        "createdBy": current_user['uid'],
        "createdByName": f"{user['firstName']} {user['lastName']}",
        "createdAt": datetime.utcnow()
    }

    await db.subgroups.insert_one(new_subgroup)
    await db.communities.update_one(
        {"id": community_id},
        {"$addToSet": {"subGroups": subgroup_id}}
    )

    if '_id' in new_subgroup:
        del new_subgroup['_id']
    return new_subgroup

@api_router.get("/subgroups/{subgroup_id}")
async def get_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    if '_id' in subgroup:
        del subgroup['_id']

    subgroup['memberCount'] = len(subgroup.get('members', []))
    subgroup['isMember'] = current_user['uid'] in subgroup.get('members', [])
    subgroup['isGroupAdmin'] = current_user['uid'] in subgroup.get('groupAdmins', [])
    subgroup['hasPendingRequest'] = any(r.get('uid') == current_user['uid'] for r in subgroup.get('pendingRequests', []))

    community = await db.communities.find_one({"id": subgroup['communityId']})
    if community:
        subgroup['communityName'] = community['name']
        subgroup['isSuperAdmin'] = current_user['uid'] in community.get('superAdmins', [])
        
    # Check global admin
    user = await db.users.find_one({"uid": current_user['uid']})
    if user and (user.get('isAdmin') or user.get('email', '').lower() == ADMIN_EMAIL.lower()):
        subgroup['isSuperAdmin'] = True
        subgroup['isGroupAdmin'] = True

    return subgroup

# Request to join subgroup
@api_router.post("/subgroups/{subgroup_id}/request-join")
async def request_join_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    if current_user['uid'] in subgroup.get('bannedUsers', []):
        raise HTTPException(status_code=403, detail="Bu gruptan yasaklandınız")

    if current_user['uid'] in subgroup.get('members', []):
        raise HTTPException(status_code=400, detail="Zaten bu grubun üyesisiniz")

    # Check if already has pending request
    pending = subgroup.get('pendingRequests', [])
    if any(r.get('uid') == current_user['uid'] for r in pending):
        raise HTTPException(status_code=400, detail="Zaten katılma isteğiniz var")

    # Check if requires approval
    if subgroup.get('requiresApproval', True):
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı. Lütfen profilinizi tamamlayın.")
        request = {
            "uid": current_user['uid'],
            "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or "Kullanıcı",
            "profileImageUrl": user.get('profileImageUrl'),
            "requestedAt": datetime.utcnow()
        }
        await db.subgroups.update_one(
            {"id": subgroup_id},
            {"$push": {"pendingRequests": request}}
        )
        return {"message": "Katılma isteği gönderildi. Yönetici onayı bekleniyor.", "status": "pending"}
    else:
        # Direct join if no approval required
        await db.subgroups.update_one(
            {"id": subgroup_id},
            {"$addToSet": {"members": current_user['uid']}}
        )
        return {"message": "Gruba katıldınız", "status": "joined"}

# Approve join request
@api_router.post("/subgroups/{subgroup_id}/approve/{user_id}")
async def approve_join_request(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    # Check if current user is admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False

    if not is_group_admin and not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor")

    # Remove from pending and add to members
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {
            "$pull": {"pendingRequests": {"uid": user_id}},
            "$addToSet": {"members": user_id}
        }
    )

    return {"message": "Katılma isteği onaylandı"}

# Reject join request
@api_router.post("/subgroups/{subgroup_id}/reject/{user_id}")
async def reject_join_request(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    # Check if current user is admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False

    if not is_group_admin and not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor")

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"pendingRequests": {"uid": user_id}}}
    )

    return {"message": "Katılma isteği reddedildi"}

# Get pending requests
@api_router.get("/subgroups/{subgroup_id}/pending-requests")
async def get_pending_requests(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    # Check if current user is admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False

    if not is_group_admin and not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor")

    return subgroup.get('pendingRequests', [])

@api_router.post("/subgroups/{subgroup_id}/join")
async def join_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    if current_user['uid'] in subgroup.get('bannedUsers', []):
        raise HTTPException(status_code=403, detail="Bu gruptan yasaklandınız")

    if current_user['uid'] in subgroup.get('members', []):
        raise HTTPException(status_code=400, detail="Zaten bu grubun üyesisiniz")

    # If requires approval, redirect to request-join
    if subgroup.get('requiresApproval', True):
        return await request_join_subgroup(subgroup_id, current_user)

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"members": current_user['uid']}}
    )
    return {"message": "Gruba katıldınız", "status": "joined"}

@api_router.post("/subgroups/{subgroup_id}/leave")
async def leave_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": current_user['uid'], "groupAdmins": current_user['uid']}}
    )
    return {"message": "Gruptan ayrıldınız"}

# Subgroup (grup) profil resmi güncelle
@api_router.put("/subgroups/{subgroup_id}/image")
async def update_subgroup_image(subgroup_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    body = await request.json()
    image_data = body.get('imageData')
    
    if not image_data:
        raise HTTPException(status_code=400, detail="Resim verisi gerekli")
    
    # Store as data URL
    image_url = f"data:image/jpeg;base64,{image_data}"
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$set": {"imageUrl": image_url}}
    )
    
    return {"message": "Grup resmi güncellendi", "imageUrl": image_url}

# Update group description
@api_router.put("/subgroups/{subgroup_id}/description")
async def update_subgroup_description(subgroup_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Check if user is admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    new_description = data.get('description', '').strip()
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$set": {"description": new_description, "updatedAt": datetime.utcnow()}}
    )
    
    return {"message": "Açıklama güncellendi"}

# Get group media
@api_router.get("/subgroups/{subgroup_id}/media")
async def get_subgroup_media(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "groupId": subgroup_id,
        "type": {"$in": ["image", "video"]},
        "deletedForEveryone": {"$ne": True}
    }).sort("timestamp", -1).limit(50).to_list(50)
    
    media_items = []
    for msg in messages:
        if msg.get('mediaUrl'):
            media_items.append({
                "id": msg['id'],
                "type": msg.get('type', 'image'),
                "url": msg['mediaUrl'],
                "timestamp": msg['timestamp'].isoformat() if msg.get('timestamp') else None,
                "senderName": msg.get('senderName', 'Bilinmeyen')
            })
    
    return media_items

# Get group links
@api_router.get("/subgroups/{subgroup_id}/links")
async def get_subgroup_links(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    import re
    
    messages = await db.messages.find({
        "groupId": subgroup_id,
        "type": "text",
        "deletedForEveryone": {"$ne": True}
    }).sort("timestamp", -1).limit(200).to_list(200)
    
    url_pattern = re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+')
    links = []
    
    for msg in messages:
        content = msg.get('content', '')
        found_urls = url_pattern.findall(content)
        
        for url in found_urls:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                links.append({
                    "id": f"{msg['id']}_{len(links)}",
                    "url": url,
                    "domain": parsed.netloc,
                    "timestamp": msg['timestamp'].isoformat() if msg.get('timestamp') else None,
                    "senderName": msg.get('senderName', 'Bilinmeyen')
                })
            except:
                pass
    
    return links[:30]

# Get group documents
@api_router.get("/subgroups/{subgroup_id}/docs")
async def get_subgroup_docs(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "groupId": subgroup_id,
        "type": "file",
        "deletedForEveryone": {"$ne": True}
    }).sort("timestamp", -1).limit(50).to_list(50)
    
    docs = []
    for msg in messages:
        if msg.get('mediaUrl'):
            docs.append({
                "id": msg['id'],
                "name": msg.get('fileName', 'document'),
                "url": msg['mediaUrl'],
                "timestamp": msg['timestamp'].isoformat() if msg.get('timestamp') else None,
                "senderName": msg.get('senderName', 'Bilinmeyen')
            })
    
    return docs

# Remove member from group
@api_router.delete("/subgroups/{subgroup_id}/members/{user_id}")
async def remove_member_from_subgroup(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Check if user is admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Can't remove creator
    if user_id == subgroup.get('creatorId'):
        raise HTTPException(status_code=403, detail="Grup kurucusu çıkarılamaz")
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {
            "$pull": {"members": user_id, "groupAdmins": user_id},
            "$inc": {"memberCount": -1}
        }
    )
    
    return {"message": "Üye gruptan çıkarıldı"}

# ==================== MESSAGES ====================

@api_router.get("/subgroups/{subgroup_id}/messages")
async def get_subgroup_messages(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "groupId": subgroup_id,
        "deletedForEveryone": {"$ne": True}
    }).sort("timestamp", -1).limit(100).to_list(100)

    # Gönderenlerin bilgilerini toplu al
    sender_ids = list(set(msg.get('senderId') for msg in messages if msg.get('senderId')))
    senders = {}
    if sender_ids:
        sender_docs = await db.users.find({"uid": {"$in": sender_ids}}).to_list(len(sender_ids))
        for s in sender_docs:
            senders[s['uid']] = s

    for msg in messages:
        if '_id' in msg:
            del msg['_id']
        if current_user['uid'] in msg.get('deletedFor', []):
            msg['isDeleted'] = True
            msg['content'] = 'Bu mesaj silindi'
        
        # Meslek bilgisi ekle
        sender = senders.get(msg.get('senderId'))
        if sender and not msg.get('senderOccupation'):
            msg['senderOccupation'] = sender.get('occupation', '')

    return messages

@api_router.post("/subgroups/{subgroup_id}/messages")
async def send_subgroup_message(subgroup_id: str, message_data: dict, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    # Check if user is restricted
    restricted_users = subgroup.get('restrictedUsers', [])
    for restriction in restricted_users:
        if restriction.get('uid') == current_user['uid']:
            until = restriction.get('until')
            if until and until > datetime.utcnow():
                raise HTTPException(status_code=403, detail=f"Mesaj gönderme yetkiniz kısıtlandı")

    if current_user['uid'] not in subgroup.get('members', []):
        raise HTTPException(status_code=403, detail="Bu grubun üyesi değilsiniz")

    user = await db.users.find_one({"uid": current_user['uid']})
    sender_name = f"{user['firstName']} {user['lastName']}"
    message_type = message_data.get('type', 'text')

    new_message = {
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "senderProfileImage": user.get('profileImageUrl'),
        "senderOccupation": user.get('occupation', ''),
        "content": message_data.get('content', ''),
        "type": message_type,
        "mediaUrl": message_data.get('mediaUrl'),
        "replyTo": message_data.get('replyTo'),
        "reactions": {},
        "isPinned": False,
        "isDeleted": False,
        "deletedForEveryone": False,
        "deletedFor": [],
        "isEdited": False,
        "status": "sent",
        "deliveredTo": [],
        "readBy": [current_user['uid']],
        "timestamp": datetime.utcnow()
    }

    await db.messages.insert_one(new_message)
    
    if '_id' in new_message:
        del new_message['_id']
    
    await sio.emit('new_message', new_message, room=subgroup_id)
    
    # Push bildirimleri gönder (arka planda)
    try:
        await notify_group_message(
            subgroup_id, 
            current_user['uid'], 
            sender_name, 
            message_data.get('content', ''),
            message_type
        )
    except Exception as e:
        logging.error(f"Error sending group notifications: {e}")
    
    return new_message

@api_router.delete("/subgroups/{subgroup_id}/messages/{message_id}")
async def delete_subgroup_message(subgroup_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    """Grup mesajını sil"""
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    # Check if user owns the message
    if message['senderId'] != current_user['uid']:
        # Check if user is admin
        user = await db.users.find_one({"uid": current_user['uid']})
        is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
        
        subgroup = await db.subgroups.find_one({"id": subgroup_id})
        is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', []) if subgroup else False
        
        if not is_global_admin and not is_group_admin:
            raise HTTPException(status_code=403, detail="Bu mesajı silme yetkiniz yok")

    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"deletedForEveryone": True, "content": "Bu mesaj silindi", "isDeleted": True}}
    )
    
    await sio.emit('message_deleted', {"messageId": message_id}, room=subgroup_id)
    return {"message": "Mesaj silindi"}

@api_router.put("/subgroups/{subgroup_id}/messages/{message_id}")
async def edit_subgroup_message(subgroup_id: str, message_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Grup mesajını düzenle"""
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    # Only message owner can edit
    if message['senderId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Sadece kendi mesajınızı düzenleyebilirsiniz")

    new_content = data.get('content', '').strip()
    if not new_content:
        raise HTTPException(status_code=400, detail="Mesaj içeriği boş olamaz")

    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"content": new_content, "isEdited": True, "editedAt": datetime.utcnow()}}
    )
    
    await sio.emit('message_edited', {"messageId": message_id, "content": new_content}, room=subgroup_id)
    return {"message": "Mesaj düzenlendi", "success": True}

@api_router.post("/subgroups/{subgroup_id}/messages/{message_id}/react")
async def react_to_subgroup_message(subgroup_id: str, message_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Grup mesajına emoji reaksiyon ekle"""
    # Kullanıcının grup üyesi olduğunu kontrol et
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    if current_user['uid'] not in subgroup.get('members', []):
        raise HTTPException(status_code=403, detail="Bu grubun üyesi değilsiniz")
    
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    emoji = data.get("emoji")
    if not emoji:
        raise HTTPException(status_code=400, detail="emoji gerekli")
    
    reactions = message.get("reactions", {})
    user_id = current_user['uid']
    
    # Kullanıcının mevcut reaksiyonunu kontrol et
    current_reaction = None
    for em, users in reactions.items():
        if user_id in users:
            current_reaction = em
            break
    
    # Aynı emoji ise kaldır, farklı ise güncelle
    if current_reaction == emoji:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        if current_reaction:
            reactions[current_reaction].remove(user_id)
            if not reactions[current_reaction]:
                del reactions[current_reaction]
        
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append(user_id)
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    # Socket ile bildir
    await sio.emit('message_reaction', {"messageId": message_id, "reactions": reactions}, room=subgroup_id)
    
    return {"reactions": reactions, "success": True}

@api_router.delete("/subgroups/{subgroup_id}/messages/{message_id}")
async def delete_subgroup_message(subgroup_id: str, message_id: str, delete_for_all: bool = False, current_user: dict = Depends(get_current_user)):
    """Grup mesajını sil"""
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', []) if subgroup else False
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower() if user else False
    
    if message['senderId'] != current_user['uid'] and not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu mesajı silme yetkiniz yok")
    
    if delete_for_all or message['senderId'] == current_user['uid']:
        await db.messages.update_one(
            {"id": message_id},
            {"$set": {"deletedForEveryone": True, "content": "Bu mesaj silindi", "isDeleted": True}}
        )
    else:
        deleted_for = message.get("deletedFor", [])
        if current_user['uid'] not in deleted_for:
            deleted_for.append(current_user['uid'])
        await db.messages.update_one(
            {"id": message_id},
            {"$set": {"deletedFor": deleted_for}}
        )
    
    return {"message": "Mesaj silindi", "success": True}

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    # Check group admin
    group_id = message.get('groupId')
    is_group_admin = False
    if group_id:
        subgroup = await db.subgroups.find_one({"id": group_id})
        if subgroup:
            is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])

    if message['senderId'] != current_user['uid'] and not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu mesajı silme yetkiniz yok")

    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"deletedForEveryone": True, "content": "Bu mesaj silindi", "isDeleted": True}}
    )
    return {"message": "Mesaj silindi"}

# Update message status
@api_router.post("/messages/{message_id}/status")
async def update_message_status(message_id: str, status_data: dict, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    status = status_data.get('status')
    
    if status == 'delivered':
        await db.messages.update_one(
            {"id": message_id},
            {"$addToSet": {"deliveredTo": current_user['uid']}}
        )
    elif status == 'read':
        await db.messages.update_one(
            {"id": message_id},
            {"$addToSet": {"readBy": current_user['uid']}}
        )
    
    # Check if all members have read/received
    updated_message = await db.messages.find_one({"id": message_id})
    if '_id' in updated_message:
        del updated_message['_id']
    
    return updated_message

# ==================== PRIVATE MESSAGES / CHATS ====================

# Get chat list
@api_router.get("/chats")
async def get_chat_list(current_user: dict = Depends(get_current_user)):
    # Get all unique chat partners
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"senderId": current_user['uid']},
                    {"receiverId": current_user['uid']}
                ],
                "chatId": {"$exists": True}
            }
        },
        {
            "$sort": {"timestamp": -1}
        },
        {
            "$group": {
                "_id": "$chatId",
                "lastMessage": {"$first": "$$ROOT"},
                "unreadCount": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$ne": ["$senderId", current_user['uid']]},
                                    {"$not": {"$in": [current_user['uid'], {"$ifNull": ["$readBy", []]}]}}
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            "$sort": {"lastMessage.timestamp": -1}
        }
    ]
    
    chats = await db.messages.aggregate(pipeline).to_list(100)
    
    result = []
    for chat in chats:
        chat_id = chat['_id']
        last_message = chat['lastMessage']
        
        # Get the other user
        other_user_id = last_message['receiverId'] if last_message['senderId'] == current_user['uid'] else last_message['senderId']
        other_user = await db.users.find_one({"uid": other_user_id})
        
        if other_user:
            result.append({
                "chatId": chat_id,
                "userId": other_user_id,
                "userName": f"{other_user['firstName']} {other_user['lastName']}",
                "userProfileImage": other_user.get('profileImageUrl'),
                "lastMessage": last_message['content'],
                "lastMessageTime": last_message['timestamp'].isoformat() if last_message.get('timestamp') else None,
                "lastMessageType": last_message.get('type', 'text'),
                "unreadCount": chat['unreadCount'],
                "isOnline": False  # Can be implemented with Socket.IO
            })
    
    return result

@api_router.get("/private-messages/{other_user_id}")
async def get_private_messages(other_user_id: str, current_user: dict = Depends(get_current_user)):
    user_ids = sorted([current_user['uid'], other_user_id])
    chat_id = f"{user_ids[0]}_{user_ids[1]}"

    messages = await db.messages.find({
        "chatId": chat_id,
        "deletedForEveryone": {"$ne": True}
    }).sort("timestamp", -1).limit(100).to_list(100)
    
    # Mark messages as read
    await db.messages.update_many(
        {
            "chatId": chat_id,
            "senderId": other_user_id,
            "readBy": {"$ne": current_user['uid']}
        },
        {"$addToSet": {"readBy": current_user['uid']}}
    )
    
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    return messages

@api_router.post("/private-messages")
async def send_private_message(message: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    receiver_id = message['receiverId']

    user_ids = sorted([current_user['uid'], receiver_id])
    chat_id = f"{user_ids[0]}_{user_ids[1]}"

    new_message = {
        "id": str(uuid.uuid4()),
        "chatId": chat_id,
        "senderId": current_user['uid'],
        "senderName": f"{user['firstName']} {user['lastName']}",
        "senderProfileImage": user.get('profileImageUrl'),
        "receiverId": receiver_id,
        "content": message.get('content', ''),
        "type": message.get('type', 'text'),
        "mediaUrl": message.get('mediaUrl'),
        "reactions": {},
        "isDeleted": False,
        "deletedForEveryone": False,
        "deletedFor": [],
        "status": "sent",
        "deliveredTo": [],
        "readBy": [current_user['uid']],
        "timestamp": datetime.utcnow()
    }

    await db.messages.insert_one(new_message)
    
    if '_id' in new_message:
        del new_message['_id']
    
    await sio.emit('new_private_message', new_message, room=chat_id)
    await sio.emit('new_private_message', new_message, room=f"user_{receiver_id}")
    return new_message

# Upload media
@api_router.post("/upload/media")
async def upload_media(media_data: dict, current_user: dict = Depends(get_current_user)):
    # Media is sent as base64
    base64_data = media_data.get('data')
    media_type = media_data.get('type', 'image')
    
    if not base64_data:
        raise HTTPException(status_code=400, detail="Medya verisi gerekli")
    
    # Store the base64 data directly (for simplicity)
    # In production, you'd upload to cloud storage
    return {
        "url": base64_data,
        "type": media_type
    }

# Typing indicator
@api_router.post("/typing")
async def typing_indicator(data: dict, current_user: dict = Depends(get_current_user)):
    room = data.get('room')  # chatId or groupId
    is_typing = data.get('isTyping', False)
    
    user = await db.users.find_one({"uid": current_user['uid']})
    
    await sio.emit('typing', {
        "userId": current_user['uid'],
        "userName": f"{user['firstName']} {user['lastName']}",
        "isTyping": is_typing
    }, room=room)
    
    return {"message": "OK"}

# ==================== USERS ====================

@api_router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({"uid": {"$ne": current_user['uid']}}).to_list(1000)
    for u in users:
        if '_id' in u:
            del u['_id']
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if '_id' in user:
        del user['_id']
    return user

# ==================== POSTS ====================

@api_router.get("/posts")
async def get_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find().sort("timestamp", -1).limit(50).to_list(50)
    for post in posts:
        if '_id' in post:
            del post['_id']
        post['isLiked'] = current_user['uid'] in post.get('likes', [])
        post['likeCount'] = len(post.get('likes', []))
        post['commentCount'] = len(post.get('comments', []))
    return posts

@api_router.post("/posts")
async def create_post(post: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı. Lütfen profilinizi tamamlayın.")

    new_post = {
        "id": str(uuid.uuid4()),
        "userId": current_user['uid'],
        "userName": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or "Kullanıcı",
        "userProfileImage": user.get('profileImageUrl'),
        "content": post['content'],
        "imageUrl": post.get('imageUrl'),
        "location": post.get('location'),
        "mentions": post.get('mentions', []),
        "likes": [],
        "comments": [],
        "shares": 0,
        "timestamp": datetime.utcnow()
    }

    await db.posts.insert_one(new_post)
    
    # Etiketlenen kullanıcılara bildirim gönder
    from routes.notifications import send_push_notification
    for mentioned_uid in post.get('mentions', []):
        if mentioned_uid != current_user['uid']:
            await send_push_notification(
                db,
                mentioned_uid,
                f"{user['firstName']} sizi etiketledi",
                f"{post['content'][:100]}...",
                {"type": "mention", "postId": new_post['id']}
            )
    
    if '_id' in new_post:
        del new_post['_id']
    return new_post

@api_router.post("/posts/{post_id}/like")
async def toggle_like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")

    likes = post.get('likes', [])
    if current_user['uid'] in likes:
        await db.posts.update_one(
            {"id": post_id},
            {"$pull": {"likes": current_user['uid']}}
        )
        return {"liked": False, "likeCount": len(likes) - 1}
    else:
        await db.posts.update_one(
            {"id": post_id},
            {"$addToSet": {"likes": current_user['uid']}}
        )
        
        # Beğeni bildirimi gönder
        try:
            user = await db.users.find_one({"uid": current_user['uid']})
            liker_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Birisi"
            await notify_post_like(post['userId'], current_user['uid'], liker_name, post_id)
        except Exception as e:
            logging.error(f"Error sending like notification: {e}")
        
        return {"liked": True, "likeCount": len(likes) + 1}

@api_router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str, current_user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"postId": post_id}).sort("timestamp", 1).to_list(100)
    for comment in comments:
        if '_id' in comment:
            del comment['_id']
    return comments

@api_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, comment_data: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})

    new_comment = {
        "id": str(uuid.uuid4()),
        "postId": post_id,
        "userId": current_user['uid'],
        "userName": f"{user['firstName']} {user['lastName']}",
        "userProfileImage": user.get('profileImageUrl'),
        "content": comment_data['content'],
        "likes": [],
        "timestamp": datetime.utcnow()
    }

    await db.comments.insert_one(new_comment)
    await db.posts.update_one(
        {"id": post_id},
        {"$push": {"comments": {"id": new_comment['id'], "userId": current_user['uid']}}}
    )

    if '_id' in new_comment:
        del new_comment['_id']
    return new_comment

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
        
    if post['userId'] != current_user['uid'] and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu gönderiyi silme yetkiniz yok")
        
    await db.posts.delete_one({"id": post_id})
    return {"message": "Gönderi silindi"}

@api_router.get("/my-posts")
async def get_my_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find({"userId": current_user['uid']}).sort("timestamp", -1).to_list(100)
    for post in posts:
        if '_id' in post:
            del post['_id']
    return posts

# ==================== SERVICES ====================

@api_router.get("/services")
async def get_services(current_user: dict = Depends(get_current_user)):
    services = await db.services.find().sort("timestamp", -1).to_list(100)
    for service in services:
        if '_id' in service:
            del service['_id']
    return services

@api_router.post("/services")
async def create_service(service: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})

    new_service = {
        "id": str(uuid.uuid4()),
        "userId": current_user['uid'],
        "userName": f"{user['firstName']} {user['lastName']}",
        "title": service['title'],
        "description": service['description'],
        "category": service['category'],
        "city": user['city'],
        "contactPhone": user.get('phone', ''),
        "timestamp": datetime.utcnow()
    }

    await db.services.insert_one(new_service)
    
    if '_id' in new_service:
        del new_service['_id']
    return new_service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    service = await db.services.find_one({"id": service_id, "userId": current_user['uid']})
    if not service:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    await db.services.delete_one({"id": service_id})
    return {"message": "Hizmet silindi"}

@api_router.get("/my-services")
async def get_my_services(current_user: dict = Depends(get_current_user)):
    """Kullanıcının kendi hizmetlerini döner"""
    services = await db.services.find({"userId": current_user['uid']}).sort("timestamp", -1).to_list(100)
    for service in services:
        if '_id' in service:
            del service['_id']
    return services

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Kullanıcının bildirimlerini döner"""
    notifications = await db.notifications.find({"userId": current_user['uid']}).sort("timestamp", -1).to_list(50)
    for notification in notifications:
        if '_id' in notification:
            del notification['_id']
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Bildirimi okundu olarak işaretler"""
    result = await db.notifications.update_one(
        {"id": notification_id, "userId": current_user['uid']},
        {"$set": {"isRead": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    return {"message": "Bildirim okundu olarak işaretlendi"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Tüm bildirimleri okundu olarak işaretler"""
    await db.notifications.update_many(
        {"userId": current_user['uid'], "isRead": False},
        {"$set": {"isRead": True}}
    )
    return {"message": "Tüm bildirimler okundu olarak işaretlendi"}

# ==================== PINNED MESSAGES ====================

@api_router.post("/subgroups/{subgroup_id}/messages/{message_id}/pin")
async def pin_message(subgroup_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    """Mesajı sabitle"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    # Admin kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Mesaj sabitleme yetkisi yok")
    
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    await db.messages.update_one({"id": message_id}, {"$set": {"isPinned": True, "pinnedAt": datetime.utcnow()}})
    await sio.emit('message_pinned', {"messageId": message_id}, room=subgroup_id)
    return {"message": "Mesaj sabitlendi"}

@api_router.delete("/subgroups/{subgroup_id}/messages/{message_id}/pin")
async def unpin_message(subgroup_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    """Mesaj sabitlemesini kaldır"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Mesaj sabitleme yetkisi yok")
    
    await db.messages.update_one({"id": message_id}, {"$set": {"isPinned": False}})
    await sio.emit('message_unpinned', {"messageId": message_id}, room=subgroup_id)
    return {"message": "Sabitleme kaldırıldı"}

@api_router.get("/subgroups/{subgroup_id}/pinned-messages")
async def get_pinned_messages(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Sabitlenmiş mesajları getir"""
    messages = await db.messages.find({"groupId": subgroup_id, "isPinned": True}).sort("pinnedAt", -1).to_list(20)
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    return messages

# ==================== POLLS ====================

@api_router.post("/subgroups/{subgroup_id}/polls")
async def create_poll(subgroup_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Anket oluştur"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    if current_user['uid'] not in subgroup.get('members', []):
        raise HTTPException(status_code=403, detail="Grup üyesi değilsiniz")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    
    poll = {
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "question": data.get('question', ''),
        "options": [{"id": str(uuid.uuid4()), "text": opt, "votes": []} for opt in data.get('options', [])],
        "creatorId": current_user['uid'],
        "creatorName": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
        "allowMultiple": data.get('allowMultiple', False),
        "isAnonymous": data.get('isAnonymous', False),
        "endsAt": data.get('endsAt'),
        "createdAt": datetime.utcnow().isoformat(),
        "isActive": True
    }
    
    await db.polls.insert_one(poll)
    del poll['_id']
    await sio.emit('new_poll', poll, room=subgroup_id)
    return poll

@api_router.get("/subgroups/{subgroup_id}/polls")
async def get_polls(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Grup anketlerini getir"""
    polls = await db.polls.find({"groupId": subgroup_id, "isActive": True}).sort("createdAt", -1).to_list(20)
    for poll in polls:
        if '_id' in poll:
            del poll['_id']
    return polls

@api_router.post("/subgroups/{subgroup_id}/polls/{poll_id}/vote")
async def vote_poll(subgroup_id: str, poll_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Ankete oy ver"""
    poll = await db.polls.find_one({"id": poll_id, "groupId": subgroup_id})
    if not poll:
        raise HTTPException(status_code=404, detail="Anket bulunamadı")
    
    option_ids = data.get('optionIds', [])
    if not poll.get('allowMultiple') and len(option_ids) > 1:
        raise HTTPException(status_code=400, detail="Bu ankette tek seçim yapılabilir")
    
    # Önceki oyları kaldır
    for opt in poll['options']:
        if current_user['uid'] in opt['votes']:
            opt['votes'].remove(current_user['uid'])
    
    # Yeni oyları ekle
    for opt in poll['options']:
        if opt['id'] in option_ids:
            opt['votes'].append(current_user['uid'])
    
    await db.polls.update_one({"id": poll_id}, {"$set": {"options": poll['options']}})
    await sio.emit('poll_updated', {"pollId": poll_id, "options": poll['options']}, room=subgroup_id)
    return {"message": "Oyunuz kaydedildi"}

@api_router.delete("/subgroups/{subgroup_id}/polls/{poll_id}")
async def delete_poll(subgroup_id: str, poll_id: str, current_user: dict = Depends(get_current_user)):
    """Anketi sil"""
    poll = await db.polls.find_one({"id": poll_id, "groupId": subgroup_id})
    if not poll:
        raise HTTPException(status_code=404, detail="Anket bulunamadı")
    
    if poll['creatorId'] != current_user['uid']:
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user.get('isAdmin'):
            raise HTTPException(status_code=403, detail="Bu anketi silme yetkiniz yok")
    
    await db.polls.delete_one({"id": poll_id})
    await sio.emit('poll_deleted', {"pollId": poll_id}, room=subgroup_id)
    return {"message": "Anket silindi"}

# ==================== MESSAGE SEARCH ====================

@api_router.get("/subgroups/{subgroup_id}/messages/search")
async def search_messages(subgroup_id: str, q: str, current_user: dict = Depends(get_current_user)):
    """Mesajlarda arama yap"""
    if not q or len(q) < 2:
        return []
    
    messages = await db.messages.find({
        "groupId": subgroup_id,
        "content": {"$regex": q, "$options": "i"},
        "isDeleted": {"$ne": True}
    }).sort("timestamp", -1).to_list(50)
    
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    return messages

# ==================== MODERATION ====================

@api_router.post("/subgroups/{subgroup_id}/members/{user_id}/mute")
async def mute_member(subgroup_id: str, user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Üyeyi sustur"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Moderasyon yetkisi yok")
    
    duration_minutes = data.get('duration', 60)  # Default 1 saat
    mute_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    muted_members = subgroup.get('mutedMembers', {})
    muted_members[user_id] = mute_until.isoformat()
    
    await db.subgroups.update_one({"id": subgroup_id}, {"$set": {"mutedMembers": muted_members}})
    return {"message": f"Üye {duration_minutes} dakika susturuldu", "muteUntil": mute_until.isoformat()}

@api_router.delete("/subgroups/{subgroup_id}/members/{user_id}/mute")
async def unmute_member(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Susturmayı kaldır"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Moderasyon yetkisi yok")
    
    await db.subgroups.update_one({"id": subgroup_id}, {"$unset": {f"mutedMembers.{user_id}": ""}})
    return {"message": "Susturma kaldırıldı"}

@api_router.post("/subgroups/{subgroup_id}/members/{user_id}/kick")
async def kick_member(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Üyeyi gruptan çıkar"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Moderasyon yetkisi yok")
    
    # Üyeyi members listesinden çıkar
    await db.subgroups.update_one(
        {"id": subgroup_id}, 
        {"$pull": {"members": user_id, "groupAdmins": user_id}}
    )
    return {"message": "Üye gruptan çıkarıldı"}

# ==================== MODERATOR (ALT YÖNETİCİ) SYSTEM ====================

@api_router.post("/subgroups/{subgroup_id}/moderators/{user_id}")
async def add_moderator(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Alt yönetici ekle (sadece grup admini veya global admin yapabilir)"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor")
    
    # Kullanıcının üye olduğunu kontrol et
    if user_id not in subgroup.get('members', []):
        raise HTTPException(status_code=400, detail="Kullanıcı grubun üyesi değil")
    
    # Moderatör olarak ekle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"moderators": user_id}}
    )
    
    # Bildirim gönder
    target_user = await db.users.find_one({"uid": user_id})
    if target_user:
        await send_notification_to_user(
            user_id,
            "🛡️ Alt Yönetici Oldunuz!",
            f"{subgroup.get('name', 'Grup')} grubunda alt yönetici olarak atandınız.",
            {"type": "moderator_assigned", "groupId": subgroup_id}
        )
    
    return {"message": "Alt yönetici eklendi"}

@api_router.delete("/subgroups/{subgroup_id}/moderators/{user_id}")
async def remove_moderator(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Alt yöneticiyi kaldır"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor")
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"moderators": user_id}}
    )
    
    return {"message": "Alt yönetici kaldırıldı"}

@api_router.get("/subgroups/{subgroup_id}/moderators")
async def get_moderators(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Grup alt yöneticilerini getir"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    moderator_ids = subgroup.get('moderators', [])
    moderators = await db.users.find({"uid": {"$in": moderator_ids}}).to_list(100)
    
    result = []
    for mod in moderators:
        result.append({
            "uid": mod['uid'],
            "firstName": mod.get('firstName', ''),
            "lastName": mod.get('lastName', ''),
            "profileImageUrl": mod.get('profileImageUrl'),
            "occupation": mod.get('occupation', '')
        })
    
    return result

@api_router.post("/subgroups/{subgroup_id}/mod/delete-message/{message_id}")
async def moderator_delete_message(subgroup_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    """Alt yönetici: Mesaj silme"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_moderator = current_user['uid'] in subgroup.get('moderators', [])
    
    if not is_global_admin and not is_group_admin and not is_moderator:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Mesajı sil (soft delete - deletedForEveryone olarak işaretle)
    result = await db.messages.update_one(
        {"id": message_id, "groupId": subgroup_id},
        {"$set": {"deletedForEveryone": True, "deletedBy": current_user['uid'], "deletedAt": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    # Log kaydet
    await db.mod_logs.insert_one({
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "moderatorId": current_user['uid'],
        "action": "delete_message",
        "targetMessageId": message_id,
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Mesaj silindi"}

@api_router.post("/subgroups/{subgroup_id}/mod/ban/{user_id}")
async def moderator_ban_user(subgroup_id: str, user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Alt yönetici: 30 dakika banlama"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_moderator = current_user['uid'] in subgroup.get('moderators', [])
    
    if not is_global_admin and not is_group_admin and not is_moderator:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Yöneticiyi banlayamaz
    if user_id in subgroup.get('groupAdmins', []):
        raise HTTPException(status_code=403, detail="Yöneticileri banlayamazsınız")
    
    reason = data.get('reason', 'Kural ihlali')
    ban_duration = 30  # 30 dakika
    ban_until = datetime.utcnow() + timedelta(minutes=ban_duration)
    
    # Ban kaydı oluştur
    ban_record = {
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "userId": user_id,
        "bannedBy": current_user['uid'],
        "reason": reason,
        "duration": ban_duration,
        "bannedAt": datetime.utcnow(),
        "expiresAt": ban_until
    }
    
    await db.bans.insert_one(ban_record)
    
    # Grupta restricted user olarak işaretle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$push": {"restrictedUsers": {"uid": user_id, "until": ban_until, "reason": reason}}}
    )
    
    # Kullanıcıya bildirim gönder
    await send_notification_to_user(
        user_id,
        "⚠️ Geçici Kısıtlama",
        f"30 dakika boyunca mesaj gönderemezsiniz. Sebep: {reason}",
        {"type": "ban", "groupId": subgroup_id}
    )
    
    # Log kaydet
    await db.mod_logs.insert_one({
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "moderatorId": current_user['uid'],
        "action": "ban_user",
        "targetUserId": user_id,
        "reason": reason,
        "duration": ban_duration,
        "timestamp": datetime.utcnow()
    })
    
    return {"message": f"Kullanıcı 30 dakika banlandı", "expiresAt": ban_until.isoformat()}

@api_router.post("/subgroups/{subgroup_id}/mod/kick/{user_id}")
async def moderator_kick_user(subgroup_id: str, user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Alt yönetici: Üyeyi çıkarma (yöneticiler hariç) + sebep formu"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_moderator = current_user['uid'] in subgroup.get('moderators', [])
    
    if not is_global_admin and not is_group_admin and not is_moderator:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Yöneticiyi çıkaramaz
    if user_id in subgroup.get('groupAdmins', []):
        raise HTTPException(status_code=403, detail="Yöneticileri gruptan çıkaramazsınız")
    
    # Diğer moderatörleri de çıkaramaz (sadece admin çıkarabilir)
    if user_id in subgroup.get('moderators', []) and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Diğer alt yöneticileri çıkaramazsınız")
    
    reason = data.get('reason', '')
    additional_notes = data.get('notes', '')
    
    if not reason:
        raise HTTPException(status_code=400, detail="Çıkarma sebebi zorunludur")
    
    # Üyeyi gruptan çıkar
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": user_id, "moderators": user_id}}
    )
    
    # Çıkarma raporu oluştur (yöneticiye gönderilecek)
    kick_report = {
        "id": str(uuid.uuid4()),
        "type": "member_kick",
        "groupId": subgroup_id,
        "groupName": subgroup.get('name', ''),
        "kickedUserId": user_id,
        "kickedBy": current_user['uid'],
        "kickedByName": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
        "reason": reason,
        "additionalNotes": additional_notes,
        "timestamp": datetime.utcnow(),
        "status": "pending_review"
    }
    
    await db.kick_reports.insert_one(kick_report)
    
    # Grup yöneticilerine bildirim gönder
    for admin_id in subgroup.get('groupAdmins', []):
        if admin_id != current_user['uid']:
            kicked_user = await db.users.find_one({"uid": user_id})
            kicked_name = f"{kicked_user.get('firstName', '')} {kicked_user.get('lastName', '')}".strip() if kicked_user else "Bir üye"
            
            await send_notification_to_user(
                admin_id,
                "📋 Üye Çıkarma Raporu",
                f"{kicked_name} gruptan çıkarıldı. Sebep: {reason}",
                {"type": "kick_report", "reportId": kick_report['id'], "groupId": subgroup_id}
            )
    
    # Çıkarılan kullanıcıya bildirim
    await send_notification_to_user(
        user_id,
        "❌ Gruptan Çıkarıldınız",
        f"{subgroup.get('name', 'Grup')} grubundan çıkarıldınız. Sebep: {reason}",
        {"type": "kicked", "groupId": subgroup_id}
    )
    
    # Log kaydet
    await db.mod_logs.insert_one({
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "moderatorId": current_user['uid'],
        "action": "kick_user",
        "targetUserId": user_id,
        "reason": reason,
        "notes": additional_notes,
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Üye gruptan çıkarıldı ve rapor yöneticiye gönderildi"}

@api_router.get("/subgroups/{subgroup_id}/kick-reports")
async def get_kick_reports(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Çıkarma raporlarını getir (sadece yöneticiler)"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu raporları sadece yöneticiler görebilir")
    
    reports = await db.kick_reports.find({"groupId": subgroup_id}).sort("timestamp", -1).to_list(50)
    
    for report in reports:
        if '_id' in report:
            del report['_id']
        # Çıkarılan kullanıcı bilgisi ekle
        kicked_user = await db.users.find_one({"uid": report['kickedUserId']})
        if kicked_user:
            report['kickedUserName'] = f"{kicked_user.get('firstName', '')} {kicked_user.get('lastName', '')}".strip()
            report['kickedUserImage'] = kicked_user.get('profileImageUrl')
    
    return reports

@api_router.get("/subgroups/{subgroup_id}/mod-logs")
async def get_mod_logs(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Moderasyon loglarını getir (yöneticiler için)"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu logları sadece yöneticiler görebilir")
    
    logs = await db.mod_logs.find({"groupId": subgroup_id}).sort("timestamp", -1).to_list(100)
    
    for log in logs:
        if '_id' in log:
            del log['_id']
        # Moderatör bilgisi ekle
        mod = await db.users.find_one({"uid": log['moderatorId']})
        if mod:
            log['moderatorName'] = f"{mod.get('firstName', '')} {mod.get('lastName', '')}".strip()
    
    return logs

@api_router.get("/subgroups/{subgroup_id}/my-role")
async def get_my_role(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Kullanıcının gruptaki rolünü getir"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    role = "member"
    permissions = {
        "canDeleteMessages": False,
        "canBanUsers": False,
        "canKickUsers": False,
        "canAddModerators": False,
        "canRemoveModerators": False,
        "canManageGroup": False
    }
    
    if is_global_admin or current_user['uid'] in subgroup.get('groupAdmins', []):
        role = "admin"
        permissions = {
            "canDeleteMessages": True,
            "canBanUsers": True,
            "canKickUsers": True,
            "canAddModerators": True,
            "canRemoveModerators": True,
            "canManageGroup": True
        }
    elif current_user['uid'] in subgroup.get('moderators', []):
        role = "moderator"
        permissions = {
            "canDeleteMessages": True,
            "canBanUsers": True,
            "canKickUsers": True,
            "canAddModerators": False,
            "canRemoveModerators": False,
            "canManageGroup": False
        }
    
    return {
        "role": role,
        "roleName": "Yönetici" if role == "admin" else "Alt Yönetici" if role == "moderator" else "Üye",
        "permissions": permissions
    }

@api_router.post("/messages/{message_id}/report")
async def report_message(message_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Mesajı raporla"""
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    report = {
        "id": str(uuid.uuid4()),
        "messageId": message_id,
        "reporterId": current_user['uid'],
        "reason": data.get('reason', 'spam'),
        "description": data.get('description', ''),
        "timestamp": datetime.utcnow().isoformat(),
        "status": "pending"
    }
    
    await db.reports.insert_one(report)
    return {"message": "Rapor gönderildi"}

# ==================== MEMBER PROFILES ====================

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """Kullanıcı profilini getir"""
    user = await db.users.find_one({"uid": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Ortak toplulukları bul
    current_user_communities = await db.communities.find({"members": current_user['uid']}).to_list(100)
    target_user_communities = await db.communities.find({"members": user_id}).to_list(100)
    
    current_ids = {c['id'] for c in current_user_communities}
    common_communities = [c for c in target_user_communities if c['id'] in current_ids]
    
    for c in common_communities:
        if '_id' in c:
            del c['_id']
    
    return {
        "uid": user['uid'],
        "firstName": user.get('firstName', ''),
        "lastName": user.get('lastName', ''),
        "profileImageUrl": user.get('profileImageUrl'),
        "city": user.get('city'),
        "occupation": user.get('occupation'),
        "bio": user.get('bio', ''),
        "commonCommunities": common_communities,
        "commonCommunitiesCount": len(common_communities)
    }

@api_router.get("/subgroups/{subgroup_id}/members")
async def get_group_members(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    """Grup üyelerini getir"""
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    member_ids = subgroup.get('members', [])
    members = await db.users.find({"uid": {"$in": member_ids}}).to_list(100)
    
    result = []
    for member in members:
        result.append({
            "uid": member['uid'],
            "firstName": member.get('firstName', ''),
            "lastName": member.get('lastName', ''),
            "profileImageUrl": member.get('profileImageUrl'),
            "isAdmin": member['uid'] in subgroup.get('groupAdmins', []),
            "isMuted": member['uid'] in subgroup.get('mutedMembers', {})
        })
    
    return result

# ==================== ANNOUNCEMENTS ====================

@api_router.get("/communities/{community_id}/announcements")
async def get_announcements(community_id: str, current_user: dict = Depends(get_current_user)):
    """Topluluk duyurularını döner.

    - Üye olmayanlar: Son X (varsayılan 5) duyuruyu sadece OKUMA modunda görebilir.
    - Üyeler / yöneticiler: Daha fazla sayıda (örn. 50) duyuru görebilir.
    """
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    announcement_channel_id = community.get('announcementChannelId')
    if not announcement_channel_id:
        return []

    # Üyelik ve yetki durumu
    is_member = current_user['uid'] in community.get('members', [])
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = await check_global_admin(current_user)

    # Üye olmayanlar için sadece son X duyuru (örneğin 5 adet)
    if not (is_member or is_super_admin or is_global_admin):
        limit = 5
    else:
        # Üyeler ve yöneticiler daha fazla duyuru görebilir
        limit = 50

    messages = await db.messages.find({"groupId": announcement_channel_id}).sort("timestamp", -1).limit(limit).to_list(limit)
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    return messages

@api_router.post("/communities/{community_id}/announcements")
async def send_announcement(community_id: str, message_data: dict, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()

    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Sadece süper yöneticiler duyuru gönderebilir")

    announcement_channel_id = community.get('announcementChannelId')

    new_message = {
        "id": str(uuid.uuid4()),
        "groupId": announcement_channel_id,
        "senderId": current_user['uid'],
        "senderName": f"{user['firstName']} {user['lastName']}",
        "content": message_data.get('content', ''),
        "type": "announcement",
        "timestamp": datetime.utcnow()
    }

    await db.messages.insert_one(new_message)
    
    if '_id' in new_message:
        del new_message['_id']
    return new_message

@api_router.delete("/communities/{community_id}/announcements/{announcement_id}")
async def delete_announcement(community_id: str, announcement_id: str, current_user: dict = Depends(get_current_user)):
    """Duyuru sil"""
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()

    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler duyuru silebilir")

    result = await db.messages.delete_one({"id": announcement_id, "groupId": community.get('announcementChannelId')})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Duyuru bulunamadı")
    
    return {"message": "Duyuru silindi"}

# ==================== ADMIN PANEL APIs ====================

# Dashboard Stats
@api_router.get("/admin/dashboard")
async def admin_dashboard(current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    total_users = await db.users.count_documents({})
    total_communities = await db.communities.count_documents({})
    total_subgroups = await db.subgroups.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_posts = await db.posts.count_documents({})
    total_services = await db.services.count_documents({})

    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_week = await db.users.count_documents({"createdAt": {"$gte": week_ago}})

    banned_users = await db.users.count_documents({"isBanned": True})
    
    pending_requests = 0
    subgroups = await db.subgroups.find().to_list(1000)
    for sg in subgroups:
        pending_requests += len(sg.get('pendingRequests', []))

    return {
        "stats": {
            "totalUsers": total_users,
            "totalCommunities": total_communities,
            "totalSubgroups": total_subgroups,
            "totalMessages": total_messages,
            "totalPosts": total_posts,
            "totalServices": total_services,
            "newUsersThisWeek": new_users_week,
            "bannedUsers": banned_users,
            "pendingRequests": pending_requests
        }
    }

# List all pending subgroup join requests (admin global view)
@api_router.get("/admin/subgroup-join-requests")
async def admin_subgroup_join_requests(community_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Tüm alt gruplardaki bekleyen katılma isteklerini listeler.

    İsteğe bağlı olarak belirli bir community_id için filtrelenebilir.
    Global admin yetkisi gerektirir.
    """
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    query: dict = {"pendingRequests": {"$exists": True, "$ne": []}}
    if community_id:
        query["communityId"] = community_id

    subgroups = await db.subgroups.find(query).to_list(1000)

    results = []
    for sg in subgroups:
        community = await db.communities.find_one({"id": sg["communityId"]})
        community_name = community["name"] if community else None

        for req in sg.get("pendingRequests", []):
            user_id = req.get("uid")
            user_doc = await db.users.find_one({"uid": user_id}) if user_id else None
            if user_doc and "_id" in user_doc:
                del user_doc["_id"]

            results.append({
                "communityId": sg["communityId"],
                "communityName": community_name,
                "subgroupId": sg["id"],
                "subgroupName": sg.get("name"),
                "userId": user_id,
                "userName": req.get("name"),
                "profileImageUrl": req.get("profileImageUrl"),
                "requestedAt": req.get("requestedAt"),
                "userCity": user_doc.get("city") if user_doc else None,
                "userOccupation": user_doc.get("occupation") if user_doc else None,
                "userEmail": user_doc.get("email") if user_doc else None,
            })

    # requestedAt alanına göre en yeniler önce gelecek şekilde sırala
    def sort_key(item):
        ts = item.get("requestedAt")
        return ts if isinstance(ts, datetime) else datetime.min

    results.sort(key=sort_key, reverse=True)
    return results

# Alias for join-requests (frontend compatibility)
@api_router.get("/admin/join-requests")
async def admin_join_requests(community_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Alias for /admin/subgroup-join-requests for frontend compatibility"""
    return await admin_subgroup_join_requests(community_id, current_user)

# Get all users (admin)
@api_router.get("/admin/users")
async def admin_get_users(current_user: dict = Depends(get_current_user), search: str = None):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    query = {}
    if search:
        query = {
            "$or": [
                {"firstName": {"$regex": search, "$options": "i"}},
                {"lastName": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        }

    users = await db.users.find(query).sort("createdAt", -1).to_list(1000)

    for user in users:
        if '_id' in user:
            del user['_id']

    return users

# Ban user globally
@api_router.post("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    target_user = await db.users.find_one({"uid": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if target_user.get('email', '').lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Ana yönetici yasaklanamaz")

    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isBanned": True}}
    )

    # Remove from all communities
    await db.communities.update_many(
        {},
        {"$pull": {"members": user_id, "superAdmins": user_id}, "$addToSet": {"bannedUsers": user_id}}
    )

    # Remove from all subgroups
    await db.subgroups.update_many(
        {},
        {"$pull": {"members": user_id, "groupAdmins": user_id}, "$addToSet": {"bannedUsers": user_id}}
    )

    return {"message": "Kullanıcı yasaklandı"}

# Unban user
@api_router.post("/admin/users/{user_id}/unban")
async def admin_unban_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isBanned": False}}
    )

    # Remove from ban lists
    await db.communities.update_many(
        {},
        {"$pull": {"bannedUsers": user_id}}
    )

    await db.subgroups.update_many(
        {},
        {"$pull": {"bannedUsers": user_id}}
    )

    return {"message": "Kullanıcının yasağı kaldırıldı"}

# Restrict user (mute)
@api_router.post("/admin/users/{user_id}/restrict")
async def admin_restrict_user(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    hours = data.get('hours', 24)
    reason = data.get('reason', 'Yönetici tarafından kısıtlandı')
    until = datetime.utcnow() + timedelta(hours=hours)

    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isRestricted": True, "restrictedUntil": until}}
    )

    # Add to restricted list in all subgroups
    restriction = {"uid": user_id, "until": until, "reason": reason}
    await db.subgroups.update_many(
        {"members": user_id},
        {"$push": {"restrictedUsers": restriction}}
    )

    return {"message": f"Kullanıcı {hours} saat kısıtlandı", "until": until.isoformat()}

# Unrestrict user
@api_router.post("/admin/users/{user_id}/unrestrict")
async def admin_unrestrict_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isRestricted": False, "restrictedUntil": None}}
    )

    await db.subgroups.update_many(
        {},
        {"$pull": {"restrictedUsers": {"uid": user_id}}}
    )

    return {"message": "Kullanıcının kısıtlaması kaldırıldı"}

# Delete user's recent messages
@api_router.delete("/admin/users/{user_id}/messages")
async def admin_delete_user_messages(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    hours = data.get('hours', 24)
    since = datetime.utcnow() - timedelta(hours=hours)

    result = await db.messages.delete_many({
        "senderId": user_id,
        "timestamp": {"$gte": since}
    })

    return {"message": f"{result.deleted_count} mesaj silindi"}

# Make user admin
@api_router.post("/admin/users/{user_id}/make-admin")
async def admin_make_admin(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isAdmin": True}}
    )

    # Add as super admin to all communities
    await db.communities.update_many(
        {},
        {"$addToSet": {"superAdmins": user_id, "members": user_id}}
    )

    return {"message": "Kullanıcı yönetici yapıldı"}

# Remove admin
@api_router.post("/admin/users/{user_id}/remove-admin")
async def admin_remove_admin(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    target_user = await db.users.find_one({"uid": user_id})
    if target_user and target_user.get('email', '').lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Ana yöneticinin yetkisi kaldırılamaz")

    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isAdmin": False}}
    )

    # Remove from super admins (but keep as member)
    await db.communities.update_many(
        {},
        {"$pull": {"superAdmins": user_id}}
    )

    return {"message": "Yöneticilik kaldırıldı"}

# ==================== BROADCAST (Toplu Duyuru) ====================

# Get all subgroups for broadcast
@api_router.get("/admin/all-subgroups")
async def admin_get_all_subgroups(current_user: dict = Depends(get_current_user)):
    """Tüm alt grupları listele (toplu duyuru için)"""
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    subgroups = await db.subgroups.find().to_list(1000)
    result = []
    
    for sg in subgroups:
        community = await db.communities.find_one({"id": sg.get('communityId')})
        result.append({
            "id": sg.get('id'),
            "name": sg.get('name'),
            "communityId": sg.get('communityId'),
            "communityName": community.get('name') if community else None,
            "memberCount": sg.get('memberCount', 0),
        })
    
    return result

# Send broadcast to multiple groups
@api_router.post("/admin/broadcast")
async def admin_send_broadcast(data: dict, current_user: dict = Depends(get_current_user)):
    """Birden fazla gruba aynı anda duyuru gönder"""
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    target_groups = data.get('targetGroups', [])
    content = data.get('content', '').strip()
    title = data.get('title', '').strip()
    send_as_announcement = data.get('sendAsAnnouncement', True)
    send_as_message = data.get('sendAsMessage', False)
    
    if not content:
        raise HTTPException(status_code=400, detail="Mesaj içeriği gerekli")
    
    if not target_groups:
        raise HTTPException(status_code=400, detail="En az bir grup seçmelisiniz")
    
    sent_count = 0
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or "Yönetici"
    broadcast_id = str(uuid.uuid4())
    
    for group_id in target_groups:
        subgroup = await db.subgroups.find_one({"id": group_id})
        if not subgroup:
            continue
        
        # Send as message to group
        if send_as_message:
            message = {
                "id": str(uuid.uuid4()),
                "groupId": group_id,
                "senderId": current_user['uid'],
                "senderName": f"📢 {sender_name}",
                "content": f"**{title}**\n\n{content}" if title else content,
                "type": "announcement",
                "timestamp": datetime.utcnow(),
                "isBroadcast": True,
                "broadcastId": broadcast_id,
            }
            await db.messages.insert_one(message)
            
            # Emit via socket
            msg_copy = dict(message)
            if '_id' in msg_copy:
                del msg_copy['_id']
            msg_copy['timestamp'] = msg_copy['timestamp'].isoformat()
            await sio.emit('new_message', msg_copy, room=group_id)
        
        # Also send to community announcement channel
        if send_as_announcement:
            community_id = subgroup.get('communityId')
            if community_id:
                community = await db.communities.find_one({"id": community_id})
                if community and community.get('announcementChannelId'):
                    announcement = {
                        "id": str(uuid.uuid4()),
                        "groupId": community['announcementChannelId'],
                        "senderId": current_user['uid'],
                        "senderName": sender_name,
                        "content": f"**{title}**\n\n{content}" if title else content,
                        "type": "announcement",
                        "timestamp": datetime.utcnow(),
                        "isBroadcast": True,
                        "broadcastId": broadcast_id,
                    }
                    # Avoid duplicate announcements for same community
                    existing = await db.messages.find_one({
                        "groupId": community['announcementChannelId'],
                        "broadcastId": broadcast_id
                    })
                    if not existing:
                        await db.messages.insert_one(announcement)
        
        sent_count += 1
    
    # Save broadcast to history
    broadcast_record = {
        "id": broadcast_id,
        "title": title,
        "content": content,
        "targetGroups": target_groups,
        "sentCount": sent_count,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "sentAt": datetime.utcnow().isoformat(),
        "sendAsAnnouncement": send_as_announcement,
        "sendAsMessage": send_as_message,
    }
    await db.broadcasts.insert_one(broadcast_record)
    
    return {"message": "Duyuru gönderildi", "sentCount": sent_count, "broadcastId": broadcast_id}

# Get broadcast history
@api_router.get("/admin/broadcast-history")
async def admin_get_broadcast_history(current_user: dict = Depends(get_current_user)):
    """Gönderilen toplu duyuruların geçmişini getir"""
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    broadcasts = await db.broadcasts.find({"scheduledAt": {"$exists": False}}).sort("sentAt", -1).limit(50).to_list(50)
    
    for b in broadcasts:
        if '_id' in b:
            del b['_id']
    
    return broadcasts

# Schedule broadcast for later
@api_router.post("/admin/schedule-broadcast")
async def admin_schedule_broadcast(data: dict, current_user: dict = Depends(get_current_user)):
    """İleri tarihli duyuru zamanla"""
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    target_groups = data.get('targetGroups', [])
    content = data.get('content', '').strip()
    title = data.get('title', '').strip()
    scheduled_at = data.get('scheduledAt')
    send_as_announcement = data.get('sendAsAnnouncement', True)
    send_as_message = data.get('sendAsMessage', False)
    send_push_notification = data.get('sendPushNotification', False)
    
    if not content:
        raise HTTPException(status_code=400, detail="Mesaj içeriği gerekli")
    
    if not target_groups:
        raise HTTPException(status_code=400, detail="En az bir grup seçmelisiniz")
    
    if not scheduled_at:
        raise HTTPException(status_code=400, detail="Zamanlama tarihi gerekli")
    
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or "Yönetici"
    broadcast_id = str(uuid.uuid4())
    
    scheduled_broadcast = {
        "id": broadcast_id,
        "title": title,
        "content": content,
        "targetGroups": target_groups,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "scheduledAt": scheduled_at,
        "sendAsAnnouncement": send_as_announcement,
        "sendAsMessage": send_as_message,
        "sendPushNotification": send_push_notification,
        "status": "pending",
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    await db.scheduled_broadcasts.insert_one(scheduled_broadcast)
    
    return {"message": "Duyuru zamanlandı", "broadcastId": broadcast_id, "scheduledAt": scheduled_at}

# Get scheduled broadcasts
@api_router.get("/admin/scheduled-broadcasts")
async def admin_get_scheduled_broadcasts(current_user: dict = Depends(get_current_user)):
    """Zamanlanmış duyuruları getir"""
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    broadcasts = await db.scheduled_broadcasts.find({"status": "pending"}).sort("scheduledAt", 1).to_list(50)
    
    for b in broadcasts:
        if '_id' in b:
            del b['_id']
    
    return broadcasts

# Cancel scheduled broadcast
@api_router.delete("/admin/scheduled-broadcasts/{broadcast_id}")
async def admin_cancel_scheduled_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_user)):
    """Zamanlanmış duyuruyu iptal et"""
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    result = await db.scheduled_broadcasts.delete_one({"id": broadcast_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zamanlanmış duyuru bulunamadı")
    
    return {"message": "Zamanlanmış duyuru iptal edildi"}

# Create new community (admin)
@api_router.post("/admin/communities")
async def admin_create_community(data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    name = data.get("name")
    city = data.get("city")
    description = data.get("description", "")

    if not name or not city:
        raise HTTPException(status_code=400, detail="İsim ve şehir zorunludur")

    existing = await db.communities.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde bir topluluk zaten var")

    community_id = str(uuid.uuid4())
    announcement_id = str(uuid.uuid4())

    community = {
        "id": community_id,
        "name": name,
        "description": description,
        "city": city,
        "imageUrl": data.get("imageUrl"),
        "superAdmins": [],
        "members": [],
        "subGroups": [],
        "bannedUsers": [],
        "restrictedUsers": [],
        "announcementChannelId": announcement_id,
        "createdBy": current_user['uid'],
        "createdByName": data.get("createdByName") or "Admin",
        "createdAt": datetime.utcnow()
    }

    await db.communities.insert_one(community)

    # Varsayılan alt grupları oluştur
    subgroup_ids = await create_default_subgroups(community_id, name, current_user['uid'])
    await db.communities.update_one(
        {"id": community_id},
        {"$set": {"subGroups": subgroup_ids}}
    )

    if "_id" in community:
        del community["_id"]
    return community

# Delete community (admin)
@api_router.delete("/admin/communities/{community_id}")
async def admin_delete_community(community_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    # Topluluğa bağlı alt grupları ve mesajlarını da sil
    subgroups = await db.subgroups.find({"communityId": community_id}).to_list(1000)
    subgroup_ids = [sg["id"] for sg in subgroups]

    if subgroup_ids:
        await db.subgroups.delete_many({"communityId": community_id})
        await db.messages.delete_many({"groupId": {"$in": subgroup_ids}})

    # Duyuru kanalındaki mesajlar
    announcement_id = community.get("announcementChannelId")
    if announcement_id:
        await db.messages.delete_many({"groupId": announcement_id})

    await db.communities.delete_one({"id": community_id})

    # Kullanıcı profillerinden bu topluluğu kaldır
    await db.users.update_many(
        {},
        {"$pull": {"communities": community_id}}
    )

    return {"message": "Topluluk ve ilişkili alt gruplar ve mesajlar silindi"}

# Update subgroup (admin)
@api_router.put("/admin/subgroups/{subgroup_id}")
async def admin_update_subgroup(subgroup_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    allowed_fields = ["name", "description", "imageUrl"]
    updates = {k: v for k, v in data.items() if k in allowed_fields}

    if updates:
        await db.subgroups.update_one({"id": subgroup_id}, {"$set": updates})

    return {"message": "Alt grup güncellendi"}

# Delete subgroup (admin)
@api_router.delete("/admin/subgroups/{subgroup_id}")
async def admin_delete_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    community_id = subgroup.get("communityId")

    # Alt grup mesajlarını sil
    await db.messages.delete_many({"groupId": subgroup_id})

    # Alt grubun kendisini sil
    await db.subgroups.delete_one({"id": subgroup_id})

    # Topluluk dokümanından referansı kaldır
    if community_id:
        await db.communities.update_one(
            {"id": community_id},
            {"$pull": {"subGroups": subgroup_id}}
        )

    return {"message": "Alt grup ve mesajları silindi"}

# Get all communities (admin)
@api_router.get("/admin/communities")
async def admin_get_communities(current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    communities = await db.communities.find().sort("name", 1).to_list(100)

    for c in communities:
        if '_id' in c:
            del c['_id']
        c['memberCount'] = len(c.get('members', []))
        c['superAdminCount'] = len(c.get('superAdmins', []))
        c['subGroupCount'] = len(c.get('subGroups', []))
        c['bannedCount'] = len(c.get('bannedUsers', []))

    return communities

# Get community members (admin)
# Get community subgroups (admin)
@api_router.get("/admin/communities/{community_id}/subgroups")
async def admin_get_community_subgroups(community_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    subgroups = await db.subgroups.find({"communityId": community_id}).to_list(100)
    
    result = []
    for sg in subgroups:
        if '_id' in sg:
            del sg['_id']
        sg['memberCount'] = len(sg.get('members', []))
        sg['pendingRequestCount'] = len(sg.get('pendingRequests', []))
        result.append(sg)
    
    return result

@api_router.get("/admin/communities/{community_id}/members")
async def admin_get_community_members(community_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")

    member_ids = community.get('members', [])
    members = await db.users.find({"uid": {"$in": member_ids}}).to_list(1000)

    for member in members:
        if '_id' in member:
            del member['_id']
        member['isSuperAdmin'] = member['uid'] in community.get('superAdmins', [])
        member['isBannedFromCommunity'] = member['uid'] in community.get('bannedUsers', [])

    return members

# Ban user from community
@api_router.post("/admin/communities/{community_id}/ban/{user_id}")
async def admin_ban_from_community(community_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.communities.update_one(
        {"id": community_id},
        {"$pull": {"members": user_id, "superAdmins": user_id}, "$addToSet": {"bannedUsers": user_id}}
    )

    await db.users.update_one(
        {"uid": user_id},
        {"$pull": {"communities": community_id}}
    )

    return {"message": "Kullanıcı topluluktan yasaklandı"}

# Kick user from community
@api_router.post("/admin/communities/{community_id}/kick/{user_id}")
async def admin_kick_from_community(community_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.communities.update_one(
        {"id": community_id},
        {"$pull": {"members": user_id, "superAdmins": user_id}}
    )

    await db.users.update_one(
        {"uid": user_id},
        {"$pull": {"communities": community_id}}
    )

    return {"message": "Kullanıcı topluluktan çıkarıldı"}

# Add super admin to community
@api_router.post("/admin/communities/{community_id}/super-admin/{user_id}")
async def admin_add_super_admin(community_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.communities.update_one(
        {"id": community_id},
        {"$addToSet": {"superAdmins": user_id, "members": user_id}}
    )

    return {"message": "Süper yönetici eklendi"}

# Remove super admin from community
@api_router.delete("/admin/communities/{community_id}/super-admin/{user_id}")
async def admin_remove_super_admin(community_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.communities.update_one(
        {"id": community_id},
        {"$pull": {"superAdmins": user_id}}
    )

    return {"message": "Süper yönetici kaldırıldı"}

# Update community settings
@api_router.put("/admin/communities/{community_id}")
async def admin_update_community(community_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    allowed_fields = ['name', 'description', 'imageUrl']
    updates = {k: v for k, v in data.items() if k in allowed_fields}

    if updates:
        await db.communities.update_one({"id": community_id}, {"$set": updates})

    return {"message": "Topluluk güncellendi"}

# Get subgroup members (admin)
@api_router.get("/admin/subgroups/{subgroup_id}/members")
async def admin_get_subgroup_members(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")

    member_ids = subgroup.get('members', [])
    members = await db.users.find({"uid": {"$in": member_ids}}).to_list(1000)

    restricted_users = {r.get('uid'): r for r in subgroup.get('restrictedUsers', [])}

    for member in members:
        if '_id' in member:
            del member['_id']
        member['isGroupAdmin'] = member['uid'] in subgroup.get('groupAdmins', [])
        member['isBannedFromGroup'] = member['uid'] in subgroup.get('bannedUsers', [])
        restriction = restricted_users.get(member['uid'])
        member['isRestrictedInGroup'] = restriction is not None
        member['restrictedUntil'] = restriction.get('until').isoformat() if restriction else None

    return members

# Ban user from subgroup
@api_router.post("/admin/subgroups/{subgroup_id}/ban/{user_id}")
async def admin_ban_from_subgroup(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": user_id, "groupAdmins": user_id}, "$addToSet": {"bannedUsers": user_id}}
    )

    return {"message": "Kullanıcı gruptan yasaklandı"}

# Kick user from subgroup
@api_router.post("/admin/subgroups/{subgroup_id}/kick/{user_id}")
async def admin_kick_from_subgroup(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": user_id, "groupAdmins": user_id}}
    )

    return {"message": "Kullanıcı gruptan çıkarıldı"}

# Restrict user in subgroup
@api_router.post("/admin/subgroups/{subgroup_id}/restrict/{user_id}")
async def admin_restrict_in_subgroup(subgroup_id: str, user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    hours = data.get('hours', 24)
    reason = data.get('reason', 'Yönetici tarafından kısıtlandı')
    until = datetime.utcnow() + timedelta(hours=hours)

    # Remove existing restriction
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"restrictedUsers": {"uid": user_id}}}
    )

    # Add new restriction
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$push": {"restrictedUsers": {"uid": user_id, "until": until, "reason": reason}}}
    )

    return {"message": f"Kullanıcı {hours} saat kısıtlandı"}

# Unrestrict user in subgroup
@api_router.post("/admin/subgroups/{subgroup_id}/unrestrict/{user_id}")
async def admin_unrestrict_in_subgroup(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"restrictedUsers": {"uid": user_id}}}
    )

    return {"message": "Kullanıcının kısıtlaması kaldırıldı"}

# Add group admin
@api_router.post("/admin/subgroups/{subgroup_id}/admin/{user_id}")
async def admin_add_group_admin(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"groupAdmins": user_id, "members": user_id}}
    )

    return {"message": "Grup yöneticisi eklendi"}

# Remove group admin
@api_router.delete("/admin/subgroups/{subgroup_id}/admin/{user_id}")
async def admin_remove_group_admin(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"groupAdmins": user_id}}
    )

    return {"message": "Grup yöneticisi kaldırıldı"}

# Delete user's messages in subgroup
@api_router.delete("/admin/subgroups/{subgroup_id}/messages/{user_id}")
async def admin_delete_subgroup_messages(subgroup_id: str, user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    hours = data.get('hours', 24)
    since = datetime.utcnow() - timedelta(hours=hours)

    result = await db.messages.delete_many({
        "groupId": subgroup_id,
        "senderId": user_id,
        "timestamp": {"$gte": since}
    })

    return {"message": f"{result.deleted_count} mesaj silindi"}

# Pin message
@api_router.post("/admin/messages/{message_id}/pin")
async def admin_pin_message(message_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    is_pinned = not message.get('isPinned', False)

    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"isPinned": is_pinned}}
    )

    group_id = message.get('groupId')
    if group_id and is_pinned:
        await db.subgroups.update_one(
            {"id": group_id},
            {"$addToSet": {"pinnedMessages": message_id}}
        )
    elif group_id:
        await db.subgroups.update_one(
            {"id": group_id},
            {"$pull": {"pinnedMessages": message_id}}
        )

    return {"message": "Mesaj sabitlendi" if is_pinned else "Sabitleme kaldırıldı", "isPinned": is_pinned}

# Delete any message
@api_router.delete("/admin/messages/{message_id}")
async def admin_delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"deletedForEveryone": True, "content": "Bu mesaj yönetici tarafından silindi", "isDeleted": True}}
    )

    return {"message": "Mesaj silindi"}

# Create poll
@api_router.post("/admin/subgroups/{subgroup_id}/polls")
async def admin_create_poll(subgroup_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_global_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")

    user = await db.users.find_one({"uid": current_user['uid']})

    poll = {
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "question": data['question'],
        "options": [{"text": opt, "votes": []} for opt in data.get('options', [])],
        "createdBy": current_user['uid'],
        "createdByName": f"{user['firstName']} {user['lastName']}",
        "isAnonymous": data.get('isAnonymous', False),
        "multipleChoice": data.get('multipleChoice', False),
        "expiresAt": datetime.utcnow() + timedelta(hours=data.get('expiresInHours', 24)) if data.get('expiresInHours') else None,
        "createdAt": datetime.utcnow()
    }

    await db.polls.insert_one(poll)

    # Also create a message for the poll
    poll_message = {
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "senderId": current_user['uid'],
        "senderName": f"{user['firstName']} {user['lastName']}",
        "content": f"📊 Anket: {data['question']}",
        "type": "poll",
        "pollId": poll['id'],
        "timestamp": datetime.utcnow()
    }

    await db.messages.insert_one(poll_message)

    if '_id' in poll:
        del poll['_id']

    return poll

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room = data.get('room')
    if room:
        sio.enter_room(sid, room)
        logging.info(f"Client {sid} joined room {room}")

@sio.event
async def leave_room(sid, data):
    room = data.get('room')
    if room:
        sio.leave_room(sid, room)

@sio.event
async def typing(sid, data):
    room = data.get('room')
    user_id = data.get('userId')
    user_name = data.get('userName')
    is_typing = data.get('isTyping', False)
    
    if room:
        await sio.emit('typing', {
            'userId': user_id,
            'userName': user_name,
            'isTyping': is_typing
        }, room=room, skip_sid=sid)

# Import and setup additional routes
from routes.badges import setup_badges_routes, badges_router
from routes.reviews import setup_reviews_routes, reviews_router
from routes.events import setup_events_routes, events_router

# Setup badges routes
badges_router = setup_badges_routes(db, get_current_user, check_global_admin)
api_router.include_router(badges_router)

# Setup reviews routes  
reviews_router = setup_reviews_routes(db, get_current_user)
api_router.include_router(reviews_router)

# Setup events routes
events_router = setup_events_routes(db, get_current_user, check_global_admin)
api_router.include_router(events_router)

# Import and setup 2FA routes
from routes.auth_2fa import setup_auth_routes
auth_router = setup_auth_routes(db, get_current_user)
api_router.include_router(auth_router)

# Import and setup notifications routes
from routes.notifications import setup_notifications_routes
notifications_router = setup_notifications_routes(db, get_current_user)
api_router.include_router(notifications_router)

# Import and setup AI routes
from routes.ai_smart_replies import setup_ai_routes
ai_router = setup_ai_routes(db, get_current_user)
api_router.include_router(ai_router)

# Import and setup security routes
from routes.security import setup_security_routes
security_api_router = setup_security_routes(db, get_current_user)
api_router.include_router(security_api_router)

# ==================== APPOINTMENTS API ====================
@api_router.get("/appointments")
async def get_appointments(current_user: dict = Depends(get_current_user)):
    """Kullanıcının randevularını getir"""
    appointments = await db.appointments.find({
        "$or": [
            {"userId": current_user["uid"]},
            {"targetUserId": current_user["uid"]}
        ]
    }).sort("date", -1).to_list(100)
    
    for apt in appointments:
        apt["id"] = apt.pop("_id", apt.get("id"))
    return appointments

@api_router.post("/appointments")
async def create_appointment(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni randevu oluştur"""
    target_user = await db.users.find_one({"uid": data["targetUserId"]})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    appointment = {
        "id": str(uuid.uuid4()),
        "userId": current_user["uid"],
        "userName": f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
        "targetUserId": data["targetUserId"],
        "targetUserName": f"{target_user.get('firstName', '')} {target_user.get('lastName', '')}".strip(),
        "date": data["date"],
        "time": data["time"],
        "status": "pending",
        "note": data.get("note"),
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    await db.appointments.insert_one(appointment)
    appointment["id"] = appointment.pop("_id", appointment.get("id"))
    return appointment

@api_router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Randevu durumunu güncelle"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    if appointment["targetUserId"] != current_user["uid"] and appointment["userId"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Bu randevuyu güncelleme yetkiniz yok")
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": data["status"]}}
    )
    return {"success": True}

# ==================== PROJECTS API ====================
@api_router.get("/projects")
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Kullanıcının projelerini getir"""
    projects = await db.projects.find({
        "$or": [
            {"ownerId": current_user["uid"]},
            {"members.userId": current_user["uid"]}
        ]
    }).sort("createdAt", -1).to_list(100)
    
    for project in projects:
        project["id"] = project.pop("_id", project.get("id"))
        # Progress hesapla
        tasks = project.get("tasks", [])
        if tasks:
            done_count = len([t for t in tasks if t.get("status") == "done"])
            project["progress"] = int((done_count / len(tasks)) * 100)
        else:
            project["progress"] = 0
    
    return projects

@api_router.post("/projects")
async def create_project(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni proje oluştur"""
    project = {
        "id": str(uuid.uuid4()),
        "title": data["title"],
        "description": data.get("description", ""),
        "status": "planning",
        "ownerId": current_user["uid"],
        "ownerName": f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
        "members": [{
            "userId": current_user["uid"],
            "userName": f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            "role": "owner"
        }],
        "tasks": [],
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    await db.projects.insert_one(project)
    project["id"] = project.pop("_id", project.get("id"))
    project["progress"] = 0
    return project

@api_router.post("/projects/{project_id}/tasks")
async def add_project_task(project_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Projeye görev ekle"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    task = {
        "id": str(uuid.uuid4()),
        "title": data["title"],
        "status": "todo",
        "assigneeId": data.get("assigneeId"),
        "assigneeName": data.get("assigneeName"),
        "dueDate": data.get("dueDate"),
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    await db.projects.update_one(
        {"id": project_id},
        {"$push": {"tasks": task}}
    )
    return task

@api_router.put("/projects/{project_id}/tasks/{task_id}")
async def update_project_task(project_id: str, task_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Proje görevini güncelle"""
    result = await db.projects.update_one(
        {"id": project_id, "tasks.id": task_id},
        {"$set": {"tasks.$.status": data["status"]}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    return {"success": True}

@api_router.post("/projects/{project_id}/invite")
async def invite_project_member(project_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Projeye üye davet et"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    if project["ownerId"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Sadece proje sahibi üye davet edebilir")
    
    # Email ile kullanıcı bul
    user = await db.users.find_one({"email": data["email"]})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Zaten üye mi kontrol et
    if any(m["userId"] == user["uid"] for m in project.get("members", [])):
        raise HTTPException(status_code=400, detail="Kullanıcı zaten üye")
    
    member = {
        "userId": user["uid"],
        "userName": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
        "role": "member"
    }
    
    await db.projects.update_one(
        {"id": project_id},
        {"$push": {"members": member}}
    )
    
    return {"success": True}

# ============================================
# DIRECT MESSAGE (DM) / ÖZEL MESAJ SİSTEMİ
# ============================================

# Conversation types
CONVERSATION_TYPE_PRIVATE = "private"  # Özel mesajlar
CONVERSATION_TYPE_SERVICE = "service"  # Hizmet ile ilgili (İşbirliği)

# Get or create conversation between two users
async def get_or_create_conversation(user1_id: str, user2_id: str, conversation_type: str = CONVERSATION_TYPE_PRIVATE, service_id: str = None):
    """İki kullanıcı arasında konuşma bul veya oluştur"""
    participants = sorted([user1_id, user2_id])
    
    query = {
        "participants": participants,
        "type": conversation_type
    }
    if service_id:
        query["serviceId"] = service_id
    
    conversation = await db.conversations.find_one(query)
    
    if not conversation:
        user1 = await db.users.find_one({"uid": user1_id})
        user2 = await db.users.find_one({"uid": user2_id})
        
        conversation = {
            "id": str(uuid.uuid4()),
            "participants": participants,
            "participantDetails": {
                user1_id: {
                    "name": f"{user1.get('firstName', '')} {user1.get('lastName', '')}".strip() if user1 else "Bilinmeyen",
                    "profileImageUrl": user1.get('profileImageUrl') if user1 else None,
                },
                user2_id: {
                    "name": f"{user2.get('firstName', '')} {user2.get('lastName', '')}".strip() if user2 else "Bilinmeyen",
                    "profileImageUrl": user2.get('profileImageUrl') if user2 else None,
                }
            },
            "type": conversation_type,
            "serviceId": service_id,
            "lastMessage": None,
            "lastMessageTime": None,
            "unreadCount": {user1_id: 0, user2_id: 0},
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        await db.conversations.insert_one(conversation)
    
    return conversation

@api_router.get("/conversations")
async def get_conversations(type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Kullanıcının tüm konuşmalarını getir"""
    query = {"participants": current_user['uid']}
    if type:
        query["type"] = type
    
    conversations = await db.conversations.find(query).sort("lastMessageTime", -1).to_list(100)
    
    result = []
    for conv in conversations:
        if "_id" in conv:
            del conv["_id"]
        
        other_user_id = [p for p in conv["participants"] if p != current_user['uid']][0]
        other_user = await db.users.find_one({"uid": other_user_id})
        
        conv["otherUser"] = {
            "uid": other_user_id,
            "name": f"{other_user.get('firstName', '')} {other_user.get('lastName', '')}".strip() if other_user else "Bilinmeyen",
            "profileImageUrl": other_user.get('profileImageUrl') if other_user else None,
            "isOnline": other_user.get('isOnline', False) if other_user else False,
        }
        
        if conv.get("type") == CONVERSATION_TYPE_SERVICE and conv.get("serviceId"):
            service = await db.services.find_one({"id": conv["serviceId"]})
            if service:
                conv["service"] = {
                    "id": service["id"],
                    "title": service.get("title"),
                    "category": service.get("category"),
                }
        
        conv["unreadCount"] = conv.get("unreadCount", {}).get(current_user['uid'], 0)
        result.append(conv)
    
    return result

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Belirli bir konuşmayı getir"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    if "_id" in conversation:
        del conversation["_id"]
    
    other_user_id = [p for p in conversation["participants"] if p != current_user['uid']][0]
    other_user = await db.users.find_one({"uid": other_user_id})
    
    conversation["otherUser"] = {
        "uid": other_user_id,
        "name": f"{other_user.get('firstName', '')} {other_user.get('lastName', '')}".strip() if other_user else "Bilinmeyen",
        "profileImageUrl": other_user.get('profileImageUrl') if other_user else None,
        "isOnline": other_user.get('isOnline', False) if other_user else False,
    }
    
    return conversation

@api_router.post("/conversations/start")
async def start_conversation(data: dict, current_user: dict = Depends(get_current_user)):
    """Bir kullanıcı ile konuşma başlat"""
    # Hem userId hem otherUserId kabul et
    other_user_id = data.get("userId") or data.get("otherUserId")
    conversation_type = data.get("type", CONVERSATION_TYPE_PRIVATE)
    service_id = data.get("serviceId")
    
    if not other_user_id:
        raise HTTPException(status_code=400, detail="userId veya otherUserId gerekli")
    
    if other_user_id == current_user['uid']:
        raise HTTPException(status_code=400, detail="Kendinizle konuşma başlatamazsınız")
    
    other_user = await db.users.find_one({"uid": other_user_id})
    if not other_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    conversation = await get_or_create_conversation(current_user['uid'], other_user_id, conversation_type, service_id)
    
    if "_id" in conversation:
        del conversation["_id"]
    
    conversation["otherUser"] = {
        "uid": other_user_id,
        "name": f"{other_user.get('firstName', '')} {other_user.get('lastName', '')}".strip(),
        "profileImageUrl": other_user.get('profileImageUrl'),
        "isOnline": other_user.get('isOnline', False),
    }
    
    return conversation

@api_router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Konuşmadaki mesajları getir"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    messages = await db.dm_messages.find({"conversationId": conversation_id}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    await db.dm_messages.update_many(
        {"conversationId": conversation_id, "senderId": {"$ne": current_user['uid']}, "read": False},
        {"$set": {"read": True, "readAt": datetime.utcnow()}}
    )
    
    await db.conversations.update_one({"id": conversation_id}, {"$set": {f"unreadCount.{current_user['uid']}": 0}})
    
    result = []
    for msg in messages:
        if "_id" in msg:
            del msg["_id"]
        result.append(msg)
    
    return list(reversed(result))

@api_router.post("/conversations/{conversation_id}/messages")
async def send_conversation_message(conversation_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Konuşmaya mesaj gönder"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Bilinmeyen"
    
    message = {
        "id": str(uuid.uuid4()),
        "conversationId": conversation_id,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "senderImage": user.get('profileImageUrl') if user else None,
        "content": data.get("content", ""),
        "type": data.get("type", "text"),
        "mediaUrl": data.get("mediaUrl"),
        "timestamp": datetime.utcnow(),
        "read": False,
        "readAt": None,
    }
    
    await db.dm_messages.insert_one(message)
    
    other_user_id = [p for p in conversation["participants"] if p != current_user['uid']][0]
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "lastMessage": message["content"][:100] if message["content"] else "[Medya]",
                "lastMessageTime": message["timestamp"],
                "updatedAt": datetime.utcnow(),
            },
            "$inc": {f"unreadCount.{other_user_id}": 1}
        }
    )
    
    # Push bildirim gönder
    await create_dm_notification(
        other_user_id, 
        current_user['uid'], 
        sender_name, 
        message["content"][:100] if message["content"] else "[Medya]", 
        conversation_id
    )
    
    if "_id" in message:
        del message["_id"]
    
    return message

@api_router.post("/services/{service_id}/contact")
async def contact_service_provider(service_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Hizmet sağlayıcısı ile iletişime geç"""
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    
    provider_id = service.get("providerId")
    if not provider_id:
        raise HTTPException(status_code=400, detail="Hizmet sağlayıcı bulunamadı")
    
    if provider_id == current_user['uid']:
        raise HTTPException(status_code=400, detail="Kendi hizmetinizle iletişime geçemezsiniz")
    
    conversation = await get_or_create_conversation(current_user['uid'], provider_id, CONVERSATION_TYPE_SERVICE, service_id)
    
    initial_message = data.get("message", "")
    if initial_message:
        user = await db.users.find_one({"uid": current_user['uid']})
        sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Bilinmeyen"
        
        message = {
            "id": str(uuid.uuid4()),
            "conversationId": conversation["id"],
            "senderId": current_user['uid'],
            "senderName": sender_name,
            "senderImage": user.get('profileImageUrl') if user else None,
            "content": initial_message,
            "type": "text",
            "timestamp": datetime.utcnow(),
            "read": False,
            "isServiceInquiry": True,
        }
        
        await db.dm_messages.insert_one(message)
        
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {
                "$set": {"lastMessage": message["content"][:100], "lastMessageTime": message["timestamp"]},
                "$inc": {f"unreadCount.{provider_id}": 1}
            }
        )
    
    if "_id" in conversation:
        del conversation["_id"]
    
    return {"conversationId": conversation["id"], "message": "Konuşma başlatıldı"}

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Konuşmayı sil"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    deleted_by = conversation.get("deletedBy", [])
    if current_user['uid'] not in deleted_by:
        deleted_by.append(current_user['uid'])
    
    if len(deleted_by) >= 2:
        await db.conversations.delete_one({"id": conversation_id})
        await db.dm_messages.delete_many({"conversationId": conversation_id})
    else:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"deletedBy": deleted_by}})
    
    return {"message": "Konuşma silindi"}

# ============ WhatsApp Benzeri Mesaj Özellikleri ============

@api_router.delete("/conversations/{conversation_id}/messages/{message_id}")
async def delete_message(conversation_id: str, message_id: str, delete_for_all: bool = False, current_user: dict = Depends(get_current_user)):
    """Mesajı sil - sadece kendim için veya herkes için"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    message = await db.dm_messages.find_one({"id": message_id, "conversationId": conversation_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    if delete_for_all:
        # Herkes için sil - sadece gönderen silebilir
        if message["senderId"] != current_user['uid']:
            raise HTTPException(status_code=403, detail="Bu mesajı herkes için silemezsiniz")
        
        await db.dm_messages.update_one(
            {"id": message_id},
            {"$set": {
                "content": "Bu mesaj silindi",
                "deletedForAll": True,
                "deletedAt": datetime.utcnow(),
                "originalContent": message.get("content"),
                "type": "deleted"
            }}
        )
    else:
        # Sadece kendim için sil
        deleted_for = message.get("deletedFor", [])
        if current_user['uid'] not in deleted_for:
            deleted_for.append(current_user['uid'])
        await db.dm_messages.update_one(
            {"id": message_id},
            {"$set": {"deletedFor": deleted_for}}
        )
    
    return {"message": "Mesaj silindi", "deleteForAll": delete_for_all}

@api_router.post("/conversations/{conversation_id}/messages/{message_id}/react")
async def react_to_message(conversation_id: str, message_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Mesaja emoji reaksiyon ekle"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    message = await db.dm_messages.find_one({"id": message_id, "conversationId": conversation_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    emoji = data.get("emoji")
    if not emoji:
        raise HTTPException(status_code=400, detail="emoji gerekli")
    
    reactions = message.get("reactions", {})
    user_id = current_user['uid']
    
    # Kullanıcının mevcut reaksiyonunu kontrol et
    current_reaction = None
    for em, users in reactions.items():
        if user_id in users:
            current_reaction = em
            break
    
    # Aynı emoji ise kaldır, farklı ise güncelle
    if current_reaction == emoji:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        if current_reaction:
            reactions[current_reaction].remove(user_id)
            if not reactions[current_reaction]:
                del reactions[current_reaction]
        
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append(user_id)
    
    await db.dm_messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    return {"reactions": reactions}

@api_router.post("/conversations/{conversation_id}/messages/{message_id}/reply")
async def reply_to_message(conversation_id: str, message_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Mesaja yanıt ver"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    original_message = await db.dm_messages.find_one({"id": message_id, "conversationId": conversation_id})
    if not original_message:
        raise HTTPException(status_code=404, detail="Yanıtlanacak mesaj bulunamadı")
    
    content = data.get("content", "")
    if not content.strip():
        raise HTTPException(status_code=400, detail="Mesaj içeriği gerekli")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Bilinmeyen"
    
    reply_message = {
        "id": str(uuid.uuid4()),
        "conversationId": conversation_id,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "senderImage": user.get('profileImageUrl') if user else None,
        "content": content,
        "type": data.get("type", "text"),
        "mediaUrl": data.get("mediaUrl"),
        "timestamp": datetime.utcnow(),
        "read": False,
        "readAt": None,
        "replyTo": {
            "id": original_message["id"],
            "content": original_message.get("content", "")[:100],
            "senderName": original_message.get("senderName", ""),
            "senderId": original_message.get("senderId"),
        }
    }
    
    await db.dm_messages.insert_one(reply_message)
    
    other_user_id = [p for p in conversation["participants"] if p != current_user['uid']][0]
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "lastMessage": reply_message["content"][:100],
                "lastMessageTime": reply_message["timestamp"],
                "updatedAt": datetime.utcnow(),
            },
            "$inc": {f"unreadCount.{other_user_id}": 1}
        }
    )
    
    if "_id" in reply_message:
        del reply_message["_id"]
    
    return reply_message

@api_router.put("/conversations/{conversation_id}/messages/{message_id}")
async def edit_message(conversation_id: str, message_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Mesajı düzenle"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    message = await db.dm_messages.find_one({"id": message_id, "conversationId": conversation_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    if message["senderId"] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Sadece kendi mesajlarınızı düzenleyebilirsiniz")
    
    new_content = data.get("content", "")
    if not new_content.strip():
        raise HTTPException(status_code=400, detail="Mesaj içeriği gerekli")
    
    await db.dm_messages.update_one(
        {"id": message_id},
        {"$set": {
            "content": new_content,
            "edited": True,
            "editedAt": datetime.utcnow(),
            "originalContent": message.get("originalContent") or message.get("content")
        }}
    )
    
    updated_message = await db.dm_messages.find_one({"id": message_id})
    if "_id" in updated_message:
        del updated_message["_id"]
    
    return updated_message

# ============================================
# USER BLOCKING, REPORTING & MUTING SYSTEM
# ============================================

@api_router.post("/users/{user_id}/block")
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Kullanıcıyı engelle"""
    if user_id == current_user['uid']:
        raise HTTPException(status_code=400, detail="Kendinizi engelleyemezsiniz")
    
    target_user = await db.users.find_one({"uid": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Mevcut engelleme kaydını kontrol et
    existing = await db.blocked_users.find_one({
        "blockerId": current_user['uid'],
        "blockedId": user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı zaten engellenmiş")
    
    block_record = {
        "id": str(uuid.uuid4()),
        "blockerId": current_user['uid'],
        "blockedId": user_id,
        "createdAt": datetime.utcnow()
    }
    
    await db.blocked_users.insert_one(block_record)
    
    # Konuşmayı da sil
    await db.conversations.delete_many({
        "participants": {"$all": [current_user['uid'], user_id]}
    })
    
    return {"message": "Kullanıcı engellendi", "blocked": True}

@api_router.delete("/users/{user_id}/block")
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Kullanıcı engelini kaldır"""
    result = await db.blocked_users.delete_one({
        "blockerId": current_user['uid'],
        "blockedId": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Engelleme kaydı bulunamadı")
    
    return {"message": "Engel kaldırıldı", "blocked": False}

@api_router.get("/users/blocked")
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    """Engellenen kullanıcıları listele"""
    blocked = await db.blocked_users.find({"blockerId": current_user['uid']}).to_list(100)
    
    result = []
    for block in blocked:
        user = await db.users.find_one({"uid": block["blockedId"]})
        if user:
            result.append({
                "id": block["blockedId"],
                "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
                "profileImageUrl": user.get('profileImageUrl'),
                "blockedAt": block["createdAt"]
            })
    
    return result

@api_router.post("/users/{user_id}/report")
async def report_user(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Kullanıcıyı şikayet et"""
    if user_id == current_user['uid']:
        raise HTTPException(status_code=400, detail="Kendinizi şikayet edemezsiniz")
    
    target_user = await db.users.find_one({"uid": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    reason = data.get("reason", "")
    description = data.get("description", "")
    
    if not reason:
        raise HTTPException(status_code=400, detail="Şikayet sebebi gerekli")
    
    report = {
        "id": str(uuid.uuid4()),
        "reporterId": current_user['uid'],
        "reportedId": user_id,
        "reason": reason,
        "description": description,
        "status": "pending",
        "createdAt": datetime.utcnow()
    }
    
    await db.user_reports.insert_one(report)
    
    return {"message": "Şikayet alındı. En kısa sürede incelenecektir.", "reportId": report["id"]}

@api_router.post("/users/{user_id}/mute")
async def mute_user(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Kullanıcıdan gelen bildirimleri sessize al"""
    if user_id == current_user['uid']:
        raise HTTPException(status_code=400, detail="Kendinizi sessize alamazsınız")
    
    target_user = await db.users.find_one({"uid": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    duration = data.get("duration", "forever")  # "8h", "1w", "forever"
    
    mute_until = None
    if duration == "8h":
        mute_until = datetime.utcnow() + timedelta(hours=8)
    elif duration == "1w":
        mute_until = datetime.utcnow() + timedelta(weeks=1)
    
    # Mevcut sessize alma kaydını güncelle veya yeni oluştur
    await db.muted_users.update_one(
        {"muterId": current_user['uid'], "mutedId": user_id},
        {"$set": {
            "muterId": current_user['uid'],
            "mutedId": user_id,
            "muteUntil": mute_until,
            "duration": duration,
            "updatedAt": datetime.utcnow()
        }},
        upsert=True
    )
    
    return {"message": "Bildirimler sessize alındı", "muted": True, "duration": duration}

@api_router.delete("/users/{user_id}/mute")
async def unmute_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Sessize almayı kaldır"""
    result = await db.muted_users.delete_one({
        "muterId": current_user['uid'],
        "mutedId": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sessize alma kaydı bulunamadı")
    
    return {"message": "Sessize alma kaldırıldı", "muted": False}

@api_router.get("/users/{user_id}/status")
async def get_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    """Kullanıcının engelleme ve sessize alma durumunu getir"""
    is_blocked = await db.blocked_users.find_one({
        "blockerId": current_user['uid'],
        "blockedId": user_id
    }) is not None
    
    mute_record = await db.muted_users.find_one({
        "muterId": current_user['uid'],
        "mutedId": user_id
    })
    
    is_muted = False
    mute_duration = None
    if mute_record:
        if mute_record.get("muteUntil") is None:
            is_muted = True
            mute_duration = "forever"
        elif mute_record["muteUntil"] > datetime.utcnow():
            is_muted = True
            mute_duration = mute_record.get("duration")
        else:
            # Süresi dolmuş, kaydı sil
            await db.muted_users.delete_one({"_id": mute_record["_id"]})
    
    return {
        "isBlocked": is_blocked,
        "isMuted": is_muted,
        "muteDuration": mute_duration
    }

# ============================================
# PUSH NOTIFICATIONS
# ============================================

@api_router.post("/users/push-token")
async def save_push_token(data: dict, current_user: dict = Depends(get_current_user)):
    """Expo push notification token'ını kaydet"""
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Push token gerekli")
    
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$set": {"expoPushToken": token, "pushTokenUpdatedAt": datetime.utcnow()}}
    )
    
    return {"message": "Push token kaydedildi"}

@api_router.get("/notifications")
async def get_notifications(skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Kullanıcının bildirimlerini getir"""
    notifications = await db.notifications.find(
        {"userId": current_user['uid']}
    ).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for notif in notifications:
        if "_id" in notif:
            del notif["_id"]
        result.append(notif)
    
    return result

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Bildirimi okundu olarak işaretle"""
    result = await db.notifications.update_one(
        {"id": notification_id, "userId": current_user['uid']},
        {"$set": {"read": True, "readAt": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    return {"message": "Bildirim okundu olarak işaretlendi"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Tüm bildirimleri okundu olarak işaretle"""
    await db.notifications.update_many(
        {"userId": current_user['uid'], "read": False},
        {"$set": {"read": True, "readAt": datetime.utcnow()}}
    )
    
    return {"message": "Tüm bildirimler okundu olarak işaretlendi"}

# ============================================
# MEDIA UPLOAD FOR DM
# ============================================

@api_router.post("/conversations/{conversation_id}/upload")
async def upload_dm_media(
    conversation_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Konuşmaya medya dosyası yükle"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    # Dosya boyutu kontrolü (10MB max)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya boyutu 10MB'ı geçemez")
    
    # Dosya türü kontrolü
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                     'video/mp4', 'video/quicktime', 
                     'application/pdf', 'application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya türü")
    
    # Dosya adı oluştur
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{file_ext}" if file_ext else file_id
    
    # Base64 olarak kaydet
    content_base64 = base64.b64encode(content).decode('utf-8')
    
    media_record = {
        "id": file_id,
        "conversationId": conversation_id,
        "uploaderId": current_user['uid'],
        "filename": file.filename,
        "storedFilename": filename,
        "contentType": file.content_type,
        "size": len(content),
        "content": content_base64,
        "createdAt": datetime.utcnow()
    }
    
    await db.dm_media.insert_one(media_record)
    
    # URL oluştur
    media_url = f"/api/media/{file_id}"
    
    return {
        "id": file_id,
        "url": media_url,
        "filename": file.filename,
        "contentType": file.content_type,
        "size": len(content)
    }

@api_router.get("/media/{media_id}")
async def get_media(media_id: str):
    """Medya dosyasını getir"""
    from fastapi.responses import Response
    
    media = await db.dm_media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Medya bulunamadı")
    
    content = base64.b64decode(media["content"])
    
    return Response(
        content=content,
        media_type=media["contentType"],
        headers={"Content-Disposition": f'inline; filename="{media["filename"]}"'}
    )

# ============================================
# LOCATION SHARING
# ============================================

@api_router.post("/conversations/{conversation_id}/location")
async def send_location(conversation_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Konum gönder"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user['uid']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    address = data.get("address", "")
    
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Konum bilgisi gerekli")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Bilinmeyen"
    
    message = {
        "id": str(uuid.uuid4()),
        "conversationId": conversation_id,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "senderImage": user.get('profileImageUrl') if user else None,
        "content": address or "📍 Konum paylaşıldı",
        "type": "location",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "address": address
        },
        "timestamp": datetime.utcnow(),
        "read": False,
    }
    
    await db.dm_messages.insert_one(message)
    
    other_user_id = [p for p in conversation["participants"] if p != current_user['uid']][0]
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "lastMessage": "📍 Konum",
                "lastMessageTime": message["timestamp"],
            },
            "$inc": {f"unreadCount.{other_user_id}": 1}
        }
    )
    
    # Bildirim oluştur
    await create_dm_notification(other_user_id, current_user['uid'], sender_name, "📍 Konum paylaştı", conversation_id)
    
    if "_id" in message:
        del message["_id"]
    
    return message

async def create_dm_notification(user_id: str, sender_id: str, sender_name: str, content: str, conversation_id: str):
    """DM bildirimi oluştur ve push notification gönder"""
    # Sessize alınmış mı kontrol et
    mute_record = await db.muted_users.find_one({
        "muterId": user_id,
        "mutedId": sender_id
    })
    
    if mute_record:
        if mute_record.get("muteUntil") is None:
            return  # Süresiz sessize alınmış
        elif mute_record["muteUntil"] > datetime.utcnow():
            return  # Hala sessize alınmış
    
    notification = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "type": "dm",
        "title": sender_name,
        "body": content[:100],
        "data": {
            "conversationId": conversation_id,
            "senderId": sender_id
        },
        "read": False,
        "createdAt": datetime.utcnow()
    }
    
    await db.notifications.insert_one(notification)
    
    # Push notification gönder
    recipient = await db.users.find_one({"uid": user_id})
    if recipient and recipient.get("expoPushToken"):
        await send_push_notification(
            recipient["expoPushToken"],
            sender_name,
            content[:100],
            {"conversationId": conversation_id, "type": "dm"}
        )

async def send_push_notification(token: str, title: str, body: str, data: dict = None):
    """Expo push notification gönder"""
    import aiohttp
    
    message = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {}
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Content-Type": "application/json"}
            ) as response:
                result = await response.json()
                logging.info(f"Push notification sent: {result}")
    except Exception as e:
        logging.error(f"Push notification error: {e}")

# ============================================
# END OF DM SYSTEM
# ============================================

# ============================================
# STORIES SYSTEM - Kullanıcı Hikayeleri (24 saat otomatik silme)
# ============================================

@api_router.get("/stories")
async def get_stories(current_user: dict = Depends(get_current_user)):
    """Aktif hikayeleri getir (24 saatten eski olanlar otomatik silinir)"""
    # 24 saat öncesini hesapla
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    # Eski hikayeleri sil
    await db.stories.delete_many({"createdAt": {"$lt": cutoff_time}})
    
    # Aktif hikayeleri getir (sadece kullanıcı hikayeleri)
    stories = await db.stories.find({
        "createdAt": {"$gte": cutoff_time}
    }).sort("createdAt", -1).to_list(100)
    
    # Kullanıcı bazlı grupla
    user_stories = {}
    for story in stories:
        uid = story.get('userId')
        if uid not in user_stories:
            user_stories[uid] = {
                "userId": uid,
                "userName": story.get('userName', ''),
                "userProfileImage": story.get('userProfileImage'),
                "stories": [],
                "hasViewed": current_user['uid'] in story.get('viewedBy', [])
            }
        
        story_item = {
            "id": story['id'],
            "imageUrl": story.get('imageUrl'),
            "videoUrl": story.get('videoUrl'),
            "caption": story.get('caption', ''),
            "createdAt": story['createdAt'].isoformat() if isinstance(story['createdAt'], datetime) else story['createdAt'],
            "viewCount": len(story.get('viewedBy', [])),
            "hasViewed": current_user['uid'] in story.get('viewedBy', [])
        }
        
        if '_id' in story:
            del story['_id']
        
        user_stories[uid]['stories'].append(story_item)
    
    return list(user_stories.values())

@api_router.post("/stories")
async def create_story(data: dict, current_user: dict = Depends(get_current_user)):
    """Yeni hikaye oluştur (24 saat sonra otomatik silinir)"""
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    story = {
        "id": str(uuid.uuid4()),
        "userId": current_user['uid'],
        "userName": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
        "userProfileImage": user.get('profileImageUrl'),
        "imageUrl": data.get('imageUrl'),
        "videoUrl": data.get('videoUrl'),
        "caption": data.get('caption', ''),
        "viewedBy": [],
        "createdAt": datetime.utcnow(),
        "expiresAt": datetime.utcnow() + timedelta(hours=24)
    }
    
    await db.stories.insert_one(story)
    
    if '_id' in story:
        del story['_id']
    
    return story

@api_router.get("/stories/{user_id}")
async def get_user_stories(user_id: str, current_user: dict = Depends(get_current_user)):
    """Belirli kullanıcının hikayelerini getir"""
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    stories = await db.stories.find({
        "userId": user_id,
        "createdAt": {"$gte": cutoff_time}
    }).sort("createdAt", -1).to_list(50)
    
    result = []
    for story in stories:
        if '_id' in story:
            del story['_id']
        story['viewCount'] = len(story.get('viewedBy', []))
        story['hasViewed'] = current_user['uid'] in story.get('viewedBy', [])
        result.append(story)
    
    return result

@api_router.post("/stories/{story_id}/view")
async def view_story(story_id: str, current_user: dict = Depends(get_current_user)):
    """Hikayeyi görüntüle"""
    await db.stories.update_one(
        {"id": story_id},
        {"$addToSet": {"viewedBy": current_user['uid']}}
    )
    return {"message": "Görüntülendi"}

@api_router.delete("/stories/{story_id}")
async def delete_story(story_id: str, current_user: dict = Depends(get_current_user)):
    """Hikaye sil"""
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Hikaye bulunamadı")
    
    if story['userId'] != current_user['uid']:
        user = await db.users.find_one({"uid": current_user['uid']})
        if not user.get('isAdmin'):
            raise HTTPException(status_code=403, detail="Sadece kendi hikayenizi silebilirsiniz")
    
    await db.stories.delete_one({"id": story_id})
    return {"message": "Hikaye silindi"}

@api_router.post("/stories/{story_id}/react")
async def react_to_story(story_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Hikayeye emoji tepkisi ekle"""
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Hikaye bulunamadı")
    
    emoji = data.get('emoji', '❤️')
    user = await db.users.find_one({"uid": current_user['uid']})
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Birisi"
    
    reaction = {
        "id": str(uuid.uuid4()),
        "storyId": story_id,
        "userId": current_user['uid'],
        "userName": sender_name,
        "userProfileImage": user.get('profileImageUrl') if user else None,
        "emoji": emoji,
        "createdAt": datetime.utcnow()
    }
    
    await db.story_reactions.insert_one(reaction)
    
    # Hikaye sahibine bildirim gönder
    if story['userId'] != current_user['uid']:
        await send_notification_to_user(
            story['userId'],
            f"{sender_name} hikayenize tepki verdi {emoji}",
            "Hikayenize yeni bir tepki geldi",
            {"type": "story_reaction", "storyId": story_id}
        )
    
    if '_id' in reaction:
        del reaction['_id']
    
    return reaction

@api_router.post("/stories/{story_id}/reply")
async def reply_to_story(story_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Hikayeye yanıt gönder (DM olarak)"""
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Hikaye bulunamadı")
    
    message = data.get('message', '')
    if not message:
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    sender_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Birisi"
    
    # Hikaye yanıtı olarak DM gönder
    story_owner_id = story['userId']
    
    # Mevcut conversation var mı kontrol et
    participants = sorted([current_user['uid'], story_owner_id])
    existing_conv = await db.conversations.find_one({"participants": participants})
    
    if existing_conv:
        conversation_id = existing_conv['id']
    else:
        # Yeni conversation oluştur
        conversation_id = str(uuid.uuid4())
        story_owner = await db.users.find_one({"uid": story_owner_id})
        
        new_conv = {
            "id": conversation_id,
            "participants": participants,
            "participantDetails": {
                current_user['uid']: {
                    "name": sender_name,
                    "profileImage": user.get('profileImageUrl') if user else None
                },
                story_owner_id: {
                    "name": f"{story_owner.get('firstName', '')} {story_owner.get('lastName', '')}".strip() if story_owner else "Kullanıcı",
                    "profileImage": story_owner.get('profileImageUrl') if story_owner else None
                }
            },
            "lastMessage": message,
            "lastMessageTime": datetime.utcnow(),
            "createdAt": datetime.utcnow()
        }
        await db.conversations.insert_one(new_conv)
    
    # Mesajı kaydet
    dm_message = {
        "id": str(uuid.uuid4()),
        "conversationId": conversation_id,
        "senderId": current_user['uid'],
        "senderName": sender_name,
        "senderProfileImage": user.get('profileImageUrl') if user else None,
        "content": message,
        "type": "story_reply",
        "storyId": story_id,
        "storyImageUrl": story.get('imageUrl'),
        "timestamp": datetime.utcnow(),
        "isRead": False
    }
    
    await db.dm_messages.insert_one(dm_message)
    
    # Conversation'ı güncelle
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"lastMessage": f"Hikayenize yanıt: {message[:50]}...", "lastMessageTime": datetime.utcnow()}}
    )
    
    # Hikaye sahibine bildirim gönder
    if story_owner_id != current_user['uid']:
        await send_notification_to_user(
            story_owner_id,
            f"{sender_name} hikayenize yanıt verdi",
            message[:100],
            {"type": "story_reply", "storyId": story_id, "conversationId": conversation_id}
        )
    
    if '_id' in dm_message:
        del dm_message['_id']
    
    return {"message": "Yanıt gönderildi", "conversationId": conversation_id}

@api_router.post("/stories/{story_id}/report")
async def report_story(story_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Hikayeyi şikayet et"""
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Hikaye bulunamadı")
    
    reason = data.get('reason', 'Uygunsuz içerik')
    
    report = {
        "id": str(uuid.uuid4()),
        "type": "story",
        "targetId": story_id,
        "targetUserId": story['userId'],
        "reporterId": current_user['uid'],
        "reason": reason,
        "status": "pending",
        "createdAt": datetime.utcnow()
    }
    
    await db.reports.insert_one(report)
    
    return {"message": "Şikayet alındı. İnceleme sonucu size bildirilecektir."}

@api_router.get("/stories/{story_id}/reactions")
async def get_story_reactions(story_id: str, current_user: dict = Depends(get_current_user)):
    """Hikaye tepkilerini getir"""
    reactions = await db.story_reactions.find({"storyId": story_id}).sort("createdAt", -1).to_list(100)
    
    for reaction in reactions:
        if '_id' in reaction:
            del reaction['_id']
    
    return reactions

@api_router.get("/stories/{story_id}/viewers")
async def get_story_viewers(story_id: str, current_user: dict = Depends(get_current_user)):
    """Hikayeyi görüntüleyenleri getir (sadece hikaye sahibi görebilir)"""
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Hikaye bulunamadı")
    
    if story['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Sadece kendi hikayenizin görüntüleyenlerini görebilirsiniz")
    
    viewer_ids = story.get('viewedBy', [])
    viewers = await db.users.find({"uid": {"$in": viewer_ids}}).to_list(100)
    
    result = []
    for viewer in viewers:
        result.append({
            "userId": viewer['uid'],
            "userName": f"{viewer.get('firstName', '')} {viewer.get('lastName', '')}".strip(),
            "userProfileImage": viewer.get('profileImageUrl')
        })
    
    return result

# ============================================
# ENHANCED NOTIFICATION SYSTEM
# ============================================

async def send_notification_to_user(user_id: str, title: str, body: str, data: dict = None):
    """Kullanıcıya bildirim gönder (hem DB'ye kaydet hem push notification)"""
    # Bildirimi veritabanına kaydet
    notification = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "title": title,
        "body": body,
        "data": data or {},
        "isRead": False,
        "createdAt": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)
    
    # Push notification gönder
    recipient = await db.users.find_one({"uid": user_id})
    if recipient:
        push_token = recipient.get("expoPushToken") or recipient.get("pushToken")
        if push_token:
            await send_push_notification(push_token, title, body, data)

async def notify_group_message(group_id: str, sender_id: str, sender_name: str, content: str, message_type: str = "text"):
    """Grup mesajı bildirimi gönder"""
    subgroup = await db.subgroups.find_one({"id": group_id})
    if not subgroup:
        return
    
    group_name = subgroup.get('name', 'Grup')
    members = subgroup.get('members', [])
    
    # Gönderen hariç tüm üyelere bildirim gönder
    for member_id in members:
        if member_id != sender_id:
            # Kullanıcının susturulup susturulmadığını kontrol et
            muted_members = subgroup.get('mutedMembers', {})
            if member_id in muted_members:
                continue
            
            # Mesaj tipine göre bildirim içeriği
            if message_type == "image":
                preview = "📷 Fotoğraf gönderdi"
            elif message_type == "video":
                preview = "🎥 Video gönderdi"
            elif message_type == "file":
                preview = "📎 Dosya gönderdi"
            elif message_type == "location":
                preview = "📍 Konum paylaştı"
            elif message_type == "poll":
                preview = "📊 Anket oluşturdu"
            else:
                preview = content[:100] if content else "Yeni mesaj"
            
            await send_notification_to_user(
                member_id,
                f"{sender_name} • {group_name}",
                preview,
                {"type": "group_message", "groupId": group_id}
            )

async def notify_dm_message(sender_id: str, receiver_id: str, sender_name: str, content: str, message_type: str = "text", conversation_id: str = None):
    """DM bildirimi gönder"""
    # Mesaj tipine göre bildirim içeriği
    if message_type == "image":
        preview = "📷 Fotoğraf gönderdi"
    elif message_type == "video":
        preview = "🎥 Video gönderdi"
    elif message_type == "file":
        preview = "📎 Dosya gönderdi"
    elif message_type == "location":
        preview = "📍 Konum paylaştı"
    else:
        preview = content[:100] if content else "Yeni mesaj"
    
    await send_notification_to_user(
        receiver_id,
        sender_name,
        preview,
        {"type": "dm", "conversationId": conversation_id, "senderId": sender_id}
    )

async def notify_post_like(post_owner_id: str, liker_id: str, liker_name: str, post_id: str):
    """Gönderi beğeni bildirimi"""
    if post_owner_id == liker_id:
        return  # Kendi gönderisini beğendi, bildirim gönderme
    
    await send_notification_to_user(
        post_owner_id,
        f"{liker_name} gönderinizi beğendi ❤️",
        "Gönderinize yeni bir beğeni geldi",
        {"type": "post_like", "postId": post_id, "likerId": liker_id}
    )

async def notify_post_comment(post_owner_id: str, commenter_id: str, commenter_name: str, post_id: str, comment_preview: str):
    """Gönderi yorum bildirimi"""
    if post_owner_id == commenter_id:
        return
    
    await send_notification_to_user(
        post_owner_id,
        f"{commenter_name} yorum yaptı 💬",
        comment_preview[:100],
        {"type": "post_comment", "postId": post_id, "commenterId": commenter_id}
    )

async def notify_service_inquiry(service_owner_id: str, inquirer_id: str, inquirer_name: str, service_id: str, service_title: str):
    """Hizmet talebi bildirimi"""
    await send_notification_to_user(
        service_owner_id,
        f"{inquirer_name} hizmetinizle ilgileniyor 💼",
        f'"{service_title}" hizmeti için yeni bir talep',
        {"type": "service_inquiry", "serviceId": service_id, "inquirerId": inquirer_id}
    )

# ============================================
# MEMBERSHIP SYSTEM - Üyelik Sistemi (YAKINDA)
# ============================================

@api_router.get("/membership/status")
async def get_membership_status(current_user: dict = Depends(get_current_user)):
    """Kullanıcının üyelik durumunu getir - Şu an herkes ücretsiz"""
    return {
        "type": "free",
        "isActive": True,
        "isPremium": False,
        "expiresAt": None,
        "showAds": True,
        "comingSoon": True,
        "message": "Premium üyelik yakında geliyor!",
        "features": {
            "noAds": False,
            "prioritySupport": False,
            "unlimitedMessages": True,
        }
    }

@api_router.get("/membership/plans")
async def get_membership_plans():
    """Üyelik planları - Yakında"""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Ücretsiz",
                "price": 0,
                "priceText": "Ücretsiz",
                "duration": "unlimited",
                "features": [
                    "Topluluk erişimi",
                    "Mesajlaşma",
                    "Hizmet paylaşımı",
                    "Reklam destekli"
                ],
                "highlighted": False,
                "available": True
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 0,
                "priceText": "Yakında",
                "duration": "yearly",
                "features": [
                    "Reklamsız deneyim",
                    "Öncelikli destek",
                    "Özel rozetler",
                    "Erken erişim özellikleri"
                ],
                "highlighted": True,
                "available": False,
                "comingSoon": True
            }
        ],
        "comingSoon": True,
        "message": "Premium üyelik yakında kullanıma sunulacak!"
    }

@api_router.post("/membership/purchase")
async def initiate_purchase(data: dict, current_user: dict = Depends(get_current_user)):
    """Satın alma - Yakında"""
    raise HTTPException(
        status_code=400, 
        detail="Premium üyelik yakında kullanıma sunulacak! Şu an tüm özellikler ücretsiz."
    )

@api_router.get("/membership/orders")
async def get_user_orders(current_user: dict = Depends(get_current_user)):
    """Kullanıcının sipariş geçmişi - Yakında"""
    return []

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    try:
        await initialize_city_communities()
        await ensure_admin_in_all_communities()
        logger.info("City communities initialized and admin configured")
    except Exception as e:
        logger.error(f"Error during startup: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Wrap FastAPI app with Socket.IO
app = socketio.ASGIApp(sio, app)
