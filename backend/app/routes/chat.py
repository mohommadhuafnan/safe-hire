import logging
import requests
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.config import settings

logger = logging.getLogger("safe_hire.chat_route")

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

# System prompt for SAFE-HIRE AI chatbot — loads once, sent with every request
_SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "You are SAFE-HIRE's AI Recruitment Safety Assistant — a specialist in detecting fake job offers, "
        "recruitment scams, and career fraud targeting students and fresh graduates in South Asia. "
        "Your role is to:\n"
        "1. Help users identify red flags in job postings (upfront fees, free email domains, Telegram-only contact, unrealistic salaries).\n"
        "2. Explain how SAFE-HIRE's 5-Agent AI Pipeline works (Intake → Linguistic Risk → Verification → Reasoning → Recommendation).\n"
        "3. Guide users on reporting scams to their University Career Guidance Unit or national cybercrime portals.\n"
        "4. Provide concise, clear, friendly answers in the language the user writes in (English, Sinhala, Tamil, Hindi, or Bengali).\n\n"
        "CRITICAL RULES:\n"
        "- Legitimate employers NEVER charge candidates registration fees, laptop deposits, training fees, or any advance payment.\n"
        "- A job offer from a Gmail/Yahoo/Hotmail address claiming to be a Fortune 500 company is almost always a scam.\n"
        "- Always recommend verifying on the official company careers portal.\n"
        "- Keep responses short (3-5 sentences max) unless the user asks for a detailed explanation."
    ),
}

# Model rotation: try fastest/cheapest first
_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
]

# Smart fallback answers for common questions (used when all APIs fail)
_FALLBACK_INTENTS = [
    (
        ["fee", "registration", "money", "pay", "deposit", "charge", "cost"],
        "💰 **No, registration fees are NOT normal.** Legitimate employers NEVER charge candidates for job placement, "
        "application processing, laptop security deposits, or training modules. Demanding money upfront is the #1 red flag for recruitment fraud.",
    ),
    (
        ["scam", "spot", "fake", "identify", "recognize", "detect"],
        "🔍 **How to spot a job scam:**\n\n"
        "1. **Upfront Fee Demands** — Asking money for registration, software, or uniforms.\n"
        "2. **Free Mail Domains** — Recruiter uses @gmail.com or @yahoo.com claiming to be a major brand.\n"
        "3. **Chat-Only Interviews** — Hiring exclusively via Telegram or WhatsApp with no official video call.\n"
        "4. **Unrealistic Salary** — Exceptionally high pay for simple part-time/data-entry tasks with no interview.",
    ),
    (
        ["verify", "email", "domain", "whois", "check", "authentic"],
        "📧 **How to verify a job offer:**\n\n"
        "1. Check the official company careers portal (e.g., company.com/careers).\n"
        "2. Verify domain registration age using WHOIS — scam sites are often <90 days old.\n"
        "3. Call the official company HR number listed on their website — NOT the number in the ad.\n"
        "4. Paste the URL into SAFE-HIRE's analyzer for an instant AI-powered report.",
    ),
    (
        ["safe-hire", "how", "work", "pipeline", "agent", "analyze"],
        "🤖 **SAFE-HIRE uses a 5-Agent AI Pipeline:**\n\n"
        "1. **Intake Agent** — OCR, URL scraping, language detection.\n"
        "2. **Linguistic Risk Agent** — Detects fee demands, urgency tactics, brand impersonation.\n"
        "3. **Verification Agent** — WHOIS domain age, Google Safe Browsing check.\n"
        "4. **Reasoning Agent** — Gemini AI synthesizes all signals into a 0–100 Scam Score.\n"
        "5. **Recommendation Agent** — Generates actionable safety steps.",
    ),
]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    content: str
    model: str = "gemini-2.5-flash"


def clean_stop_tokens(text: str) -> str:
    if not text:
        return ""
    import re
    clean = re.sub(r'<\|\s*end_of_sentence\s*\|>', '', text, flags=re.I)
    clean = re.sub(r'<\|\s*im_end\s*\|>', '', clean, flags=re.I)
    clean = re.sub(r'<\|\s*endoftext\s*\|>', '', clean, flags=re.I)
    clean = re.sub(r'<\|\s*[a-z_0-9]+\s*\|>', '', clean, flags=re.I)
    clean = re.sub(r'\[DONE\]', '', clean, flags=re.I)
    return clean.strip()


@router.post("", response_model=ChatResponse)
async def chat_assistant(req: ChatRequest):
    """Provides real-time Gemini AI assistance for the Floating Chatbot and AI Analyzer."""
    gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""

    # Build message history with system prompt prepended
    formatted_msgs = [_SYSTEM_PROMPT]
    for m in req.messages:
        role = m.role if m.role in ("system", "user", "assistant") else "user"
        formatted_msgs.append({"role": role, "content": m.content})

    if gemini_key:
        for model_name in _GEMINI_MODELS:
            try:
                url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
                headers = {
                    "Authorization": f"Bearer {gemini_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": model_name,
                    "messages": formatted_msgs,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                }
                res = requests.post(url, json=payload, headers=headers, timeout=15)
                if res.status_code == 200:
                    data = res.json()
                    reply = (
                        data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", "")
                    )
                    reply = clean_stop_tokens(reply)
                    if reply:
                        logger.info(f"✅ Chatbot ({model_name}) responded successfully.")
                        return ChatResponse(content=reply, model=model_name)
                elif res.status_code == 429:
                    logger.warning(f"Chatbot ({model_name}) quota exceeded. Trying next model...")
                elif res.status_code == 401:
                    logger.error(f"Chatbot Gemini auth failed (401) for {model_name}. Check GEMINI_API_KEY.")
                    break  # No point trying more models if auth fails
                else:
                    logger.warning(f"Chatbot ({model_name}) HTTP {res.status_code}: {res.text[:150]}")
            except requests.exceptions.Timeout:
                logger.warning(f"Chatbot ({model_name}) timed out after 15s.")
            except Exception as e:
                logger.warning(f"Chatbot ({model_name}) exception: {e}")

    # --- Fallback: DeepSeek V4 Flash ---
    deepseek_key = getattr(settings, "DEEPSEEK_V4_API_KEY", "") or ""
    if deepseek_key:
        try:
            url = f"{settings.DEEPSEEK_API_BASE_URL.rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {deepseek_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": getattr(settings, "DEEPSEEK_MODEL_NAME", "deepseek-ai/DeepSeek-V4-Flash"),
                "messages": formatted_msgs,
                "temperature": 0.7,
                "max_tokens": 2048,
            }
            res = requests.post(url, json=payload, headers=headers, timeout=20)
            if res.status_code == 200:
                data = res.json()
                reply = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                reply = clean_stop_tokens(reply)
                if reply:
                    logger.info("✅ Chatbot DeepSeek-V4-Flash responded successfully.")
                    return ChatResponse(content=reply, model="DeepSeek-V4-Flash")
        except requests.exceptions.Timeout:
            logger.warning("Chatbot DeepSeek timed out after 20s.")
        except Exception as e:
            logger.warning(f"Chatbot DeepSeek exception: {e}")

    # --- Offline fallback: keyword-matched smart replies ---
    user_prompt = ""
    for m in reversed(req.messages):
        if m.role == "user":
            user_prompt = m.content.lower()
            break

    for keywords, reply_text in _FALLBACK_INTENTS:
        if any(kw in user_prompt for kw in keywords):
            return ChatResponse(content=reply_text, model="safe-hire-offline-assistant")

    # Generic fallback greeting
    return ChatResponse(
        content=(
            "Hello! 👋 I'm your **SAFE-HIRE AI Recruitment Safety Assistant**. "
            "I can help you identify job scams, verify recruiter messages, and understand red flags "
            "like upfront fees, suspicious email domains, or Telegram-only contact. "
            "What would you like to check today?"
        ),
        model="safe-hire-offline-assistant",
    )
