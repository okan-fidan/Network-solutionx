from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid
from typing import List, Optional
from pydantic import BaseModel
import json

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])

class PushNotification(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None

def setup_notifications_routes(db, get_current_user):
    
    @notifications_router.get("/")
    async def get_notifications(current_user: dict = Depends(get_current_user), limit: int = 50):
        """Kullanıcının bildirimlerini listele"""
        notifications = await db.notifications.find(
            {"userId": current_user['uid']}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        for n in notifications:
            if '_id' in n:
                del n['_id']
        
        unread_count = await db.notifications.count_documents({
            "userId": current_user['uid'],
            "isRead": False
        })
        
        return {
            "notifications": notifications,
            "unreadCount": unread_count
        }
    
    @notifications_router.post("/mark-read/{notification_id}")
    async def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
        """Bildirimi okundu işaretle"""
        result = await db.notifications.update_one(
            {"id": notification_id, "userId": current_user['uid']},
            {"$set": {"isRead": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
        
        return {"message": "Bildirim okundu işaretlendi"}
    
    @notifications_router.post("/mark-all-read")
    async def mark_all_as_read(current_user: dict = Depends(get_current_user)):
        """Tüm bildirimleri okundu işaretle"""
        await db.notifications.update_many(
            {"userId": current_user['uid'], "isRead": False},
            {"$set": {"isRead": True}}
        )
        
        return {"message": "Tüm bildirimler okundu işaretlendi"}
    
    @notifications_router.delete("/{notification_id}")
    async def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
        """Bildirimi sil"""
        result = await db.notifications.delete_one({
            "id": notification_id,
            "userId": current_user['uid']
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
        
        return {"message": "Bildirim silindi"}
    
    @notifications_router.delete("/")
    async def clear_all_notifications(current_user: dict = Depends(get_current_user)):
        """Tüm bildirimleri temizle"""
        await db.notifications.delete_many({"userId": current_user['uid']})
        return {"message": "Tüm bildirimler silindi"}
    
    return notifications_router


async def send_push_notification(db, user_id: str, title: str, body: str, data: dict = None):
    """
    Push bildirimi gönder
    - Veritabanına bildirim kaydı oluşturur
    - Kullanıcının push token'i varsa Expo Push API'ye gönderir
    """
    import httpx
    
    # Veritabanına kaydet
    notification = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "type": data.get('type', 'general') if data else 'general',
        "title": title,
        "message": body,
        "data": data or {},
        "isRead": False,
        "timestamp": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)
    
    # Push token kontrol et
    user = await db.users.find_one({"uid": user_id})
    push_token = user.get('pushToken') if user else None
    
    if push_token and push_token.startswith('ExponentPushToken'):
        # Expo Push API'ye gönder
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'https://exp.host/--/api/v2/push/send',
                    json={
                        "to": push_token,
                        "title": title,
                        "body": body,
                        "data": data or {},
                        "sound": "default",
                        "badge": 1
                    },
                    headers={"Content-Type": "application/json"}
                )
                return response.json()
        except Exception as e:
            print(f"Push notification error: {e}")
    
    return notification


async def send_notification_to_group(db, group_id: str, title: str, body: str, data: dict = None, exclude_user: str = None):
    """Gruptaki tüm üyelere bildirim gönder"""
    group = await db.subgroups.find_one({"id": group_id})
    if not group:
        return
    
    members = group.get('members', [])
    for member_id in members:
        if member_id != exclude_user:
            await send_push_notification(db, member_id, title, body, data)


async def send_notification_to_community(db, community_id: str, title: str, body: str, data: dict = None, exclude_user: str = None):
    """Topluluk üyelerine bildirim gönder"""
    community = await db.communities.find_one({"id": community_id})
    if not community:
        return
    
    members = community.get('members', [])
    for member_id in members:
        if member_id != exclude_user:
            await send_push_notification(db, member_id, title, body, data)
