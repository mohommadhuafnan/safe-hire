import logging
import requests
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.config import settings

logger = logging.getLogger("safe_hire.chat_route")

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    content: str
    model: str = "gemini-2.5-flash"

@router.post("", response_model=ChatResponse)
async def chat_assistant(req: ChatRequest):
    """Provides real-time Gemini AI assistance for Floating Chatbot and AI Analyzer."""
    gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    
    user_prompt = ""
    for m in reversed(req.messages):
        if m.role == "user":
            user_prompt = m.content
            break

    if gemini_key:
        models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.6-flash"]
        for model_name in models:
            try:
                url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
                headers = {
                    "Authorization": f"Bearer {gemini_key}",
                    "Content-Type": "application/json"
                }
                formatted_msgs = [{"role": m.role if m.role in ["system", "user", "assistant"] else "user", "content": m.content} for m in req.messages]
                payload = {
                    "model": model_name,
                    "messages": formatted_msgs,
                    "temperature": 0.7,
                    "max_tokens": 2048
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if reply:
                        return ChatResponse(content=reply, model=model_name)
            except Exception as e:
                logger.warning(f"Backend chat API notice for model {model_name}: {e}")

    # Smart fallback intelligence if API is unreachable
    lower = user_prompt.lower()
    if any(k in lower for k in ["fee", "registration", "money", "pay", "deposit"]):
        reply = "💰 **No, registration fees are NOT normal when applying for a job.** Legitimate employers NEVER charge candidates for job placement, application processing, laptop security deposits, or training modules. Demanding money upfront is the #1 red flag for recruitment fraud."
    elif any(k in lower for k in ["scam", "spot", "fake", "identify"]):
        reply = "🔍 **How to spot a job scam:**\n\n1. **Upfront Fee Demands**: Asking money for registration, software, or uniforms.\n2. **Free Mail Domains**: Recruiter uses @gmail.com or @yahoo.com for claimed major corporate brands.\n3. **Chat-Only Interviews**: Conducting hiring exclusively via Telegram or WhatsApp without video/phone interviews.\n4. **Unrealistic Salary**: Exceptionally high pay for simple part-time/data entry tasks."
    elif any(k in lower for k in ["verify", "email", "domain", "whois"]):
        reply = "📧 **How to verify recruiters and job offers:**\n\n1. Check official corporate careers portals (e.g., company.com/careers).\n2. Audit domain registration age using WHOIS tools (scam sites are often < 90 days old).\n3. Contact official HR directly using phone numbers listed on the company website."
    else:
        reply = f"Hello! 👋 I am your **SAFE-HIRE AI Recruitment Assistant**. I can help you verify job offers, check suspicious recruiter messages, and guide you on staying safe while job hunting. What details would you like me to inspect?"

    return ChatResponse(content=reply, model="safe-hire-security-assistant")
