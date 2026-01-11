from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel
import os

ai_router = APIRouter(prefix="/ai", tags=["ai"])

class SmartReplyRequest(BaseModel):
    messageContent: str
    conversationType: str = "private"  # private veya group
    context: Optional[str] = None  # Sohbet bağlamı

def setup_ai_routes(db, get_current_user):
    
    # Önceden tanımlı akıllı yanıt şablonları (AI olmadan fallback)
    SMART_REPLY_TEMPLATES = {
        "greeting": [
            "Merhaba! Nasılsınız?",
            "Selam! İyi günler!",
            "Merhaba, size nasıl yardımcı olabilirim?"
        ],
        "thanks": [
            "Rica ederim! 😊",
            "Ne demek, her zaman!",
            "Yardımcı olabildiysem ne mutlu bana!"
        ],
        "question": [
            "Tabii, size yardımcı olmaktan mutluluk duyarım.",
            "Elbette, biraz daha detay verir misiniz?",
            "Tabii ki, ne öğrenmek istiyorsunuz?"
        ],
        "meeting": [
            "Uygun olduğum zamanları paylaşayım.",
            "Harika! Ne zaman buluşalım?",
            "Toplantı için müsaitim, takvimimi kontrol edeyim."
        ],
        "positive": [
            "Harika haber! 🎉",
            "Bu çok güzel!",
            "Muhteşem! Tebrikler! 👏"
        ],
        "negative": [
            "Anlıyorum, zor bir durum.",
            "Üzgünüm bunu duyduğuma.",
            "Geçmiş olsun, nasıl yardımcı olabilirim?"
        ],
        "agreement": [
            "Katılıyorum!",
            "Kesinlikle doğru!",
            "Aynı fikirdeyim 👍"
        ],
        "default": [
            "Anladım, teşekkürler.",
            "Tamam, not aldım.",
            "👍"
        ]
    }
    
    def detect_intent(message: str) -> str:
        """Mesajın niyetini tespit et"""
        message_lower = message.lower()
        
        greetings = ['merhaba', 'selam', 'hey', 'günaydın', 'iyi akşamlar', 'nasılsın']
        thanks = ['teşekkür', 'sağol', 'eyvallah', 'minnettarım']
        questions = ['?', 'nasıl', 'ne zaman', 'nerede', 'kim', 'neden', 'niye']
        meeting = ['buluşma', 'toplantı', 'görüşme', 'randevu', 'kahve']
        positive = ['harika', 'mükemmel', 'süper', 'başardım', 'kazandım', 'mutlu']
        negative = ['üzgün', 'kötü', 'zor', 'problem', 'sorun', 'başarısız']
        agreement = ['evet', 'doğru', 'haklı', 'katılıyorum', 'tabii', 'tamam']
        
        if any(word in message_lower for word in greetings):
            return "greeting"
        elif any(word in message_lower for word in thanks):
            return "thanks"
        elif any(word in message_lower for word in meeting):
            return "meeting"
        elif any(word in message_lower for word in positive):
            return "positive"
        elif any(word in message_lower for word in negative):
            return "negative"
        elif any(word in message_lower for word in agreement):
            return "agreement"
        elif any(word in message_lower for word in questions):
            return "question"
        else:
            return "default"
    
    @ai_router.post("/smart-replies")
    async def get_smart_replies(request: SmartReplyRequest, current_user: dict = Depends(get_current_user)):
        """Mesaj için akıllı yanıt önerileri döner"""
        
        # Emergent LLM key kontrol et
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        
        if emergent_key:
            # AI destekli yanıtlar (Emergent entegrasyonu)
            try:
                from emergentintegrations.llm import chat_completion
                
                system_prompt = """Sen bir mesajlaşma asistanısın. Kullanıcıya gelen mesaja verilecek kısa, doğal ve uygun yanıt önerileri üret.
Yanıtlar Türkçe olmalı, kısa ve öz olmalı (maksimum 50 karakter).
3 farklı yanıt önerisi ver, her biri farklı bir tonda olsun (resmi, samimi, emoji'li).
JSON formatında dön: {"replies": ["yanıt1", "yanıt2", "yanıt3"]}"""
                
                user_prompt = f"Gelen mesaj: {request.messageContent}\nSohbet tipi: {request.conversationType}"
                if request.context:
                    user_prompt += f"\nBağlam: {request.context}"
                
                response = await chat_completion(
                    api_key=emergent_key,
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=200,
                    temperature=0.7
                )
                
                import json
                result = json.loads(response['content'])
                return {
                    "replies": result.get('replies', []),
                    "source": "ai"
                }
            except Exception as e:
                print(f"AI error: {e}")
                # AI hatasında fallback'e düş
        
        # Template bazlı yanıtlar (fallback)
        intent = detect_intent(request.messageContent)
        replies = SMART_REPLY_TEMPLATES.get(intent, SMART_REPLY_TEMPLATES["default"])
        
        return {
            "replies": replies[:3],
            "source": "template",
            "intent": intent
        }
    
    @ai_router.post("/summarize")
    async def summarize_conversation(data: dict, current_user: dict = Depends(get_current_user)):
        """Sohbeti özetle"""
        messages = data.get('messages', [])
        
        if not messages:
            return {"summary": "Boş sohbet"}
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        
        if emergent_key and len(messages) > 5:
            try:
                from emergentintegrations.llm import chat_completion
                
                conversation_text = "\n".join([f"{m.get('senderName', 'Kullanıcı')}: {m.get('content', '')}" for m in messages[-20:]])
                
                response = await chat_completion(
                    api_key=emergent_key,
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Verilen sohbeti 2-3 cümlede Türkçe özetle. Ana konuları ve önemli noktaları vurgula."},
                        {"role": "user", "content": conversation_text}
                    ],
                    max_tokens=200
                )
                
                return {
                    "summary": response['content'],
                    "messageCount": len(messages),
                    "source": "ai"
                }
            except Exception as e:
                print(f"AI summarize error: {e}")
        
        # Basit özet (fallback)
        return {
            "summary": f"{len(messages)} mesaj içeren sohbet",
            "messageCount": len(messages),
            "source": "basic"
        }
    
    @ai_router.post("/suggest-message")
    async def suggest_message(data: dict, current_user: dict = Depends(get_current_user)):
        """Bağlama göre mesaj önerisi"""
        context = data.get('context', '')  # "yeni üye karşılama", "teşekkür", "davet" vb.
        recipient_name = data.get('recipientName', 'Kullanıcı')
        
        suggestions = {
            "welcome": f"Merhaba {recipient_name}! Topluluğumuza hoş geldiniz! 🎉 Herhangi bir sorunuz olursa çekinmeden sorabilirsiniz.",
            "thanks": f"{recipient_name}, yardımınız için çok teşekkür ederim! 🙏",
            "invite": f"Merhaba {recipient_name}! Sizi topluluğumuza davet etmek istiyorum. İlginizi çekeceğini düşünüyorum!",
            "meeting": f"{recipient_name}, müsait olduğunuz bir zaman diliminde buluşmak ister misiniz?",
            "follow_up": f"Merhaba {recipient_name}, geçen konuşmamızın devamını getirmek istedim.",
            "congratulations": f"Tebrikler {recipient_name}! 🎉🎊 Bu harika bir başarı!"
        }
        
        suggestion = suggestions.get(context, f"Merhaba {recipient_name}!")
        
        return {
            "suggestion": suggestion,
            "context": context
        }
    
    return ai_router
