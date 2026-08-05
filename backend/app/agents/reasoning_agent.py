import re
import json
import logging
import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional
import requests
from app.config import settings

logger = logging.getLogger("safe_hire.reasoning_agent")

# Shared thread pool for running synchronous HTTP calls without blocking the event loop
_http_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="reasoning_http")


def _extract_json_from_text(text: str) -> Optional[dict]:
    """
    Robustly extract a JSON object from raw AI output that may contain:
    - Markdown code fences (```json ... ```)
    - <think>...</think> reasoning blocks (DeepSeek)
    - Extra text before or after the JSON object
    - Partial truncation at end of output
    Returns a parsed dict or None if extraction fails.
    """
    if not text:
        return None

    # 1. Strip <think>...</think> blocks (DeepSeek extended thinking)
    if "<think>" in text and "</think>" in text:
        text = text.split("</think>")[-1].strip()

    # 2. Strip markdown code fences
    text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()

    # 3. Try direct parse first (fastest path)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # 4. Regex: find the first complete JSON object (handles extra surrounding text)
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        candidate = match.group(0)
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    # 5. Last resort: try to fix truncated JSON by finding the last complete field
    # Strip everything after the last complete value-ending character
    for end_char in ("}", "]"):
        last_pos = text.rfind(end_char)
        if last_pos != -1:
            trimmed = text[:last_pos + 1]
            try:
                parsed = json.loads(trimmed)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                continue

    return None


def _build_gemini_prompt(cleaned_text: str, linguistic_data: dict, verification_data: dict, target_lang_name: str, language: str) -> str:
    """Build a clear, structured Gemini scam analysis prompt."""
    return f"""You are SAFE-HIRE's Senior AI Recruitment Fraud Intelligence Specialist.
Perform an EXHAUSTIVE analysis of the job posting below and return a single raw JSON object.

CRITICAL INSTRUCTION: Output ONLY a raw JSON object. No markdown, no code fences, no extra text before or after the JSON.

[INPUT CONTENT]:
"{cleaned_text[:4000]}"

[LINGUISTIC ANALYSIS SIGNALS]:
- Payment/Registration Fee Demanded: {linguistic_data.get('has_payment_demand')}
- Fee Terms Found: {linguistic_data.get('matched_payment')}
- Urgency Pressure Tactics: {linguistic_data.get('has_urgency_tactics')}
- Urgency Keywords: {linguistic_data.get('matched_urgency')}
- Brand Impersonation Flags: {linguistic_data.get('impersonation_flags')}
- Suspicious Channels (Telegram/WhatsApp only): {linguistic_data.get('matched_suspicious_terms')}
- Claimed Brand: {linguistic_data.get('claimed_brand')}
- Free Email Domain Used: {linguistic_data.get('free_email')}

[DOMAIN & EMAIL VERIFICATION SIGNALS]:
- Target Domain: {verification_data.get('domain')}
- WHOIS Status: {(verification_data.get('whois_info') or {}).get('whois_status')}
- Domain Age (Days): {(verification_data.get('whois_info') or {}).get('registered_days')}
- Is New Domain (<90 days): {(verification_data.get('whois_info') or {}).get('is_new_domain')}
- Safe Browsing Status: {(verification_data.get('safe_browsing') or {}).get('status')}
- Abstract API Email Analysis: {(verification_data.get('email_validation') or {}).get('analysis_summary')}
- Recruiter Email Disposable: {(verification_data.get('email_validation') or {}).get('is_disposable_email')}
- Recruiter Email SMTP Valid: {(verification_data.get('email_validation') or {}).get('is_smtp_valid')}
- Recruiter Email Quality Score: {(verification_data.get('email_validation') or {}).get('quality_score')}
- Corporate Trust Score: {verification_data.get('verification_trust_score')}

[SCORING RULES]:
1. SCAM/HIGH RISK (scam_score 75-100): ANY of → fee demand, Telegram-only contact, brand impersonation with free email (@gmail/@yahoo), domain <90 days old + fee demand, unrealistic income for simple work.
2. GENUINE/LOW RISK (scam_score 5-25): ALL of → zero fee demands, official corporate email/domain, realistic role and salary, no Telegram-only contact.
3. MODERATE RISK (scam_score 30-60): Questionable but lacks decisive fraud signal (vague salary, unverifiable domain, no direct fee demand).

[OUTPUT LANGUAGE]: {target_lang_name} ({language})
Write the "explanation" field natively in {target_lang_name}.

Return EXACTLY this JSON structure (no extra fields, no markdown):
{{
  "scam_score": <integer 0-100>,
  "confidence_score": <integer 90-99>,
  "risk_level": "<Severe Risk | High Risk | Moderate Risk | Low Risk>",
  "explanation": "<Multi-section analysis in {target_lang_name}>:\\n\\n📋 POSTER SUMMARY:\\n[Company name, job role, salary, contact info, application method]\\n\\n🎯 SCAM RISK VERDICT:\\n[Explicit FAKE/GENUINE verdict with scam_score and 2-3 sentence reasoning]\\n\\n🔍 DETAILED EVIDENCE & RED FLAGS:\\n[Every specific signal — exact fee terms, email addresses, suspicious contacts, domain age, brand names, or proof of legitimacy]\\n\\n✅ SAFETY CONCLUSION:\\n[Clear final verdict and specific actionable advice for the job seeker]",
  "reasons": [
    "<Specific finding 1 with exact text/keyword from the poster>",
    "<Specific finding 2 with exact text/keyword from the poster>",
    "<Specific finding 3 with exact text/keyword from the poster>"
  ],
  "recommendations": [
    "🚨 <Poster-specific action 1: Mention exact fee amount, email, brand, or contact channel extracted from THIS poster>",
    "⚠️ <Poster-specific action 2: Mention specific company verification or official career portal for THIS poster>",
    "📧 <Poster-specific action 3: Email validation or domain security check for THIS poster>",
    "💡 <Poster-specific action 4: Specific advice on how to report or handle THIS poster>"
  ],
  "sub_scores": {{
    "financial_fee_risk": <integer 0-100>,
    "impersonation_risk": <integer 0-100>,
    "domain_reputation_risk": <integer 0-100>,
    "urgency_pressure_risk": <integer 0-100>
  }}
}}"""


def _build_deepseek_prompt(cleaned_text: str, linguistic_data: dict, verification_data: dict, target_lang_name: str, language: str) -> str:
    """Build a concise DeepSeek reasoning prompt (no image support, text-only)."""
    return f"""You are SAFE-HIRE's AI Recruitment Scam Analysis Specialist.
Analyze the job posting below and return ONLY a raw JSON object (no markdown, no extra text).

[INPUT]:
"{cleaned_text[:2500]}"

[SIGNALS]:
- Fee Demand: {linguistic_data.get('has_payment_demand')} | Terms: {linguistic_data.get('matched_payment')}
- Urgency Tactics: {linguistic_data.get('has_urgency_tactics')} | Keywords: {linguistic_data.get('matched_urgency')}
- Brand Impersonation: {linguistic_data.get('impersonation_flags')}
- Suspicious Channels: {linguistic_data.get('matched_suspicious_terms')}
- Domain: {verification_data.get('domain')} | WHOIS: {(verification_data.get('whois_info') or {}).get('whois_status')}
- Safe Browsing: {(verification_data.get('safe_browsing') or {}).get('status')}
- Trust Score: {verification_data.get('verification_trust_score')}

[RULES]:
- SCAM (75-100): fee demand OR Telegram-only OR brand impersonation with free email OR new domain + fee
- GENUINE (5-25): zero fees, official domain, realistic role
- MODERATE (30-60): questionable but no decisive fraud signal

[LANGUAGE]: Write "explanation" in {target_lang_name} ({language}).

Return ONLY this JSON (no markdown):
{{
  "scam_score": <integer 0-100>,
  "confidence_score": <integer 90-99>,
  "risk_level": "<Severe Risk | High Risk | Moderate Risk | Low Risk>",
  "explanation": "<📋 POSTER SUMMARY:\\n[...]\\n\\n🎯 SCAM RISK VERDICT:\\n[...]\\n\\n🔍 DETAILED EVIDENCE & RED FLAGS:\\n[...]\\n\\n✅ SAFETY CONCLUSION:\\n[...]>",
  "reasons": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "recommendations": ["<Poster-specific safety advice 1>", "<Poster-specific safety advice 2>", "<Poster-specific safety advice 3>", "<Poster-specific safety advice 4>"],
  "sub_scores": {{
    "financial_fee_risk": <0-100>,
    "impersonation_risk": <0-100>,
    "domain_reputation_risk": <0-100>,
    "urgency_pressure_risk": <0-100>
  }}
}}"""


class ReasoningAgent:
    """Agent 4: Synthesizes multi-agent signals using Google Gemini AI into a deep,
    structured, explainable scam analysis report. Falls back to DeepSeek V4 Flash,
    then a rule engine, ensuring 100% uptime."""

    # Model rotation: fastest/cheapest first, most capable last
    GEMINI_MODELS = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
    ]

    def _log_api_key_status(self, key: str, provider: str) -> None:
        """Log a safe diagnostic for the API key without exposing the full value."""
        if not key:
            logger.warning(f"[{provider}] API key is NOT configured (empty).")
        elif len(key) < 20:
            logger.warning(f"[{provider}] API key looks too short ({len(key)} chars). May be invalid.")
        else:
            prefix = key[:6]
            suffix = key[-4:]
            logger.info(f"[{provider}] API key present: {prefix}...{suffix} ({len(key)} chars)")
            # Both AIza (legacy) and AQ. (newer Google AI Studio format) are valid Gemini key prefixes
            if provider == "Gemini" and not (key.startswith("AIza") or key.startswith("AQ.")):
                logger.warning(
                    f"[{provider}] Unexpected key prefix '{prefix}'. "
                    f"Expected 'AIza' (legacy) or 'AQ.' (newer Google AI Studio). "
                    f"Authentication may fail."
                )

    def _run_sync_http(self, fn, *args, **kwargs):
        """Run a synchronous HTTP call in the thread pool (non-blocking for async callers)."""
        loop = asyncio.get_event_loop()
        return loop.run_in_executor(_http_executor, lambda: fn(*args, **kwargs))

    def _call_gemini_rest(self, model_name: str, gemini_key: str, prompt: str,
                          base64_img: Optional[str], mime_type: str,
                          use_thinking: bool = False) -> Optional[dict]:
        """
        Call Gemini via the generateContent REST endpoint (supports multimodal image).
        Optionally enables extended thinking for Gemini 2.5 models.
        """
        parts = [{"text": prompt}]
        if base64_img:
            parts.append({"inline_data": {"mime_type": mime_type, "data": base64_img}})

        generation_config: dict = {"temperature": 0.2, "maxOutputTokens": 8192}
        payload: dict = {
            "contents": [{"parts": parts}],
            "generationConfig": generation_config,
        }

        # Enable extended thinking for Gemini 2.5 models (deeper reasoning)
        if use_thinking and "2.5" in model_name:
            payload["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 1024}

        timeout = getattr(settings, "GEMINI_TIMEOUT", 45)
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={gemini_key}"
        )

        try:
            res = requests.post(url, json=payload, timeout=timeout)
            if res.status_code == 200:
                data = res.json()
                raw = ""
                candidates = data.get("candidates") if isinstance(data, dict) else None
                if candidates and isinstance(candidates, list) and len(candidates) > 0 and isinstance(candidates[0], dict):
                    content_obj = candidates[0].get("content") or {}
                    if isinstance(content_obj, dict):
                        parts_list = content_obj.get("parts") or []
                        if parts_list and isinstance(parts_list, list) and len(parts_list) > 0 and isinstance(parts_list[0], dict):
                            raw = parts_list[0].get("text") or ""
                parsed = _extract_json_from_text(raw)
                if parsed and "scam_score" in parsed:
                    logger.info(f"✅ Gemini REST ({model_name}) success — score: {parsed.get('scam_score')}")
                    return parsed
                elif raw:
                    logger.warning(f"Gemini REST ({model_name}) returned non-JSON output (len={len(raw)})")
            elif res.status_code == 429:
                logger.warning(f"Gemini REST ({model_name}) — quota exceeded (429). Trying next model...")
            elif res.status_code == 400:
                logger.warning(f"Gemini REST ({model_name}) — bad request (400): {res.text[:300]}")
            elif res.status_code == 401:
                logger.error(f"Gemini REST ({model_name}) — authentication failed (401). Check your API key.")
            else:
                logger.warning(f"Gemini REST ({model_name}) — HTTP {res.status_code}: {res.text[:200]}")
        except requests.exceptions.Timeout:
            logger.warning(f"Gemini REST ({model_name}) — timed out after {timeout}s")
        except Exception as e:
            logger.warning(f"Gemini REST ({model_name}) — exception: {e}")

        return None

    def _call_gemini_openai_compat(self, model_name: str, gemini_key: str, prompt: str,
                                   base64_img: Optional[str], mime_type: str) -> Optional[dict]:
        """
        Call Gemini via its OpenAI-compatible chat/completions endpoint.
        Used as a secondary attempt when the REST endpoint fails or returns quota errors.
        """
        user_content = [{"type": "text", "text": prompt}]
        if base64_img:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{base64_img}"},
            })

        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        headers = {"Authorization": f"Bearer {gemini_key}", "Content-Type": "application/json"}
        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": user_content}],
            "temperature": 0.2,
            "max_tokens": 8192,
        }

        timeout = getattr(settings, "GEMINI_TIMEOUT", 45)
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=timeout)
            if res.status_code == 200:
                data = res.json()
                raw = ""
                choices = data.get("choices") if isinstance(data, dict) else None
                if choices and isinstance(choices, list) and len(choices) > 0 and isinstance(choices[0], dict):
                    msg = choices[0].get("message") or {}
                    if isinstance(msg, dict):
                        raw = msg.get("content") or ""
                parsed = _extract_json_from_text(raw)
                if parsed and "scam_score" in parsed:
                    logger.info(f"✅ Gemini OpenAI-compat ({model_name}) success — score: {parsed.get('scam_score')}")
                    return parsed
                elif raw:
                    logger.warning(f"Gemini OpenAI-compat ({model_name}) returned non-JSON (len={len(raw)})")
            elif res.status_code == 429:
                logger.warning(f"Gemini OpenAI-compat ({model_name}) — quota exceeded (429).")
            elif res.status_code == 401:
                logger.error(f"Gemini OpenAI-compat ({model_name}) — authentication failed (401).")
            else:
                logger.warning(f"Gemini OpenAI-compat ({model_name}) — HTTP {res.status_code}: {res.text[:200]}")
        except requests.exceptions.Timeout:
            logger.warning(f"Gemini OpenAI-compat ({model_name}) — timed out after {timeout}s")
        except Exception as e:
            logger.warning(f"Gemini OpenAI-compat ({model_name}) — exception: {e}")

        return None

    def call_gemini_ai_reasoning_api(
        self,
        cleaned_text: str,
        linguistic_data: dict,
        verification_data: dict,
        language: str,
        image_bytes: Optional[bytes] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Primary reasoning: calls Google Gemini API with optional multimodal image.
        Tries each model in GEMINI_MODELS via REST first, then OpenAI-compat endpoint,
        with extended thinking enabled for Gemini 2.5 models.
        """
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
        self._log_api_key_status(gemini_key, "Gemini")

        if not gemini_key:
            return None

        lang_map = {
            "en": "English",
            "si": "Sinhala (සිංහල)",
            "ta": "Tamil (தமிழ்)",
            "hi": "Hindi (हिंदी)",
            "bn": "Bengali (বাংলা)",
        }
        target_lang_name = lang_map.get(language, "English")

        prompt = _build_gemini_prompt(cleaned_text, linguistic_data, verification_data, target_lang_name, language)

        # Prepare image data once (reused across all model attempts)
        from app.agents.intake_agent import IntakeAgent
        mime_type = IntakeAgent.detect_image_mime_type(image_bytes) if image_bytes else "image/png"
        base64_img = base64.b64encode(image_bytes).decode("utf-8") if image_bytes else None

        # Round 1: REST endpoint (supports vision + extended thinking)
        for model_name in self.GEMINI_MODELS:
            use_thinking = "2.5" in model_name  # Enable thinking only for 2.5 family
            result = self._call_gemini_rest(model_name, gemini_key, prompt, base64_img, mime_type, use_thinking)
            if result:
                return result

        # Round 2: OpenAI-compat endpoint (fallback for auth/format differences)
        logger.info("Gemini REST attempts exhausted. Trying OpenAI-compat endpoint...")
        for model_name in self.GEMINI_MODELS:
            result = self._call_gemini_openai_compat(model_name, gemini_key, prompt, base64_img, mime_type)
            if result:
                return result

        logger.warning("All Gemini model attempts failed. Falling back to DeepSeek.")
        return None

    def call_deepseek_v4_reasoning_api(
        self,
        cleaned_text: str,
        linguistic_data: dict,
        verification_data: dict,
        language: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Secondary reasoning: calls Hugging Face Router → DeepSeek-V4-Flash.
        Text-only (no image support). Used when Gemini is unavailable.
        """
        api_key = getattr(settings, "DEEPSEEK_V4_API_KEY", "") or ""
        self._log_api_key_status(api_key, "DeepSeek V4")

        if not api_key:
            return None

        lang_map = {
            "en": "English",
            "si": "Sinhala (සිංහල)",
            "ta": "Tamil (தமிழ்)",
            "hi": "Hindi (हिंदी)",
            "bn": "Bengali (বাংলা)",
        }
        target_lang_name = lang_map.get(language, "English")
        prompt = _build_deepseek_prompt(cleaned_text, linguistic_data, verification_data, target_lang_name, language)

        url = f"{settings.DEEPSEEK_API_BASE_URL.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": settings.DEEPSEEK_MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "top_p": 0.95,
            "max_tokens": 4096,
        }

        try:
            res = requests.post(url, json=payload, headers=headers, timeout=30)
            if res.status_code == 200:
                data = res.json()
                raw = ""
                choices = data.get("choices") if isinstance(data, dict) else None
                if choices and isinstance(choices, list) and len(choices) > 0 and isinstance(choices[0], dict):
                    msg = choices[0].get("message") or {}
                    if isinstance(msg, dict):
                        raw = msg.get("content") or ""
                parsed = _extract_json_from_text(raw)
                if parsed and "scam_score" in parsed:
                    logger.info(f"✅ DeepSeek-V4-Flash success — score: {parsed.get('scam_score')}")
                    return parsed
                elif raw:
                    logger.warning(f"DeepSeek returned non-JSON output (len={len(raw)})")
            elif res.status_code == 401:
                logger.error("DeepSeek — authentication failed (401). Check DEEPSEEK_V4_API_KEY.")
            elif res.status_code == 429:
                logger.warning("DeepSeek — quota exceeded (429).")
            else:
                logger.warning(f"DeepSeek — HTTP {res.status_code}: {res.text[:200]}")
        except requests.exceptions.Timeout:
            logger.warning("DeepSeek — timed out after 30s")
        except Exception as e:
            logger.warning(f"DeepSeek reasoning exception: {e}")

        return None

    def _build_rule_engine_explanation(
        self,
        risk_level: str,
        scam_score: int,
        linguistic_data: dict,
        verification_data: dict,
        language: str,
        cleaned_text: str,
    ) -> tuple:
        """
        Build a detailed multi-section explanation using rule engine signals.
        Called when all AI APIs fail — guarantees a human-readable report.
        """
        linguistic_data = linguistic_data or {}
        verification_data = verification_data or {}
        has_payment = bool(linguistic_data.get("has_payment_demand"))
        has_impersonation = bool(linguistic_data.get("has_impersonation_risk"))
        has_urgency = bool(linguistic_data.get("has_urgency_tactics"))
        has_suspicious_channels = bool(linguistic_data.get("has_suspicious_channels"))
        payment_terms = linguistic_data.get("matched_payment") or []
        if not isinstance(payment_terms, list):
            payment_terms = [str(payment_terms)]
        impersonation_flags = linguistic_data.get("impersonation_flags") or []
        if not isinstance(impersonation_flags, list):
            impersonation_flags = [str(impersonation_flags)]
        urgency_terms = linguistic_data.get("matched_urgency") or []
        if not isinstance(urgency_terms, list):
            urgency_terms = [str(urgency_terms)]
        suspicious_terms = linguistic_data.get("matched_suspicious_terms") or []
        if not isinstance(suspicious_terms, list):
            suspicious_terms = [str(suspicious_terms)]
        claimed_brand = linguistic_data.get("claimed_brand") or ""
        free_email = linguistic_data.get("free_email") or ""
        domain = verification_data.get("domain") or "Not Specified"
        trust_score = verification_data.get("verification_trust_score")
        if trust_score is None:
            trust_score = 85
        whois_status = (verification_data.get("whois_info") or {}).get("whois_status") or ""
        is_new_domain = bool((verification_data.get("whois_info") or {}).get("is_new_domain"))

        snippet = (cleaned_text or "")[:500].replace("\n", " ").strip() if cleaned_text else "No content provided."

        reasons = []
        if has_payment:
            fee_list = ", ".join(f'"{t}"' for t in payment_terms[:5])
            reasons.append(
                f"⚠️ CRITICAL: Fee/payment demand detected — Found terms: {fee_list}. "
                f"Legitimate employers NEVER charge candidates."
            )
        if has_impersonation:
            reasons.append(f"🎭 Brand Impersonation: {'; '.join(impersonation_flags[:2])}")
        if has_urgency:
            urgency_list = ", ".join(f'"{t}"' for t in urgency_terms[:3])
            reasons.append(f"⏰ Artificial Urgency: Pressure tactics — {urgency_list}")
        if has_suspicious_channels:
            ch_list = ", ".join(suspicious_terms[:3])
            reasons.append(f"📱 Suspicious Contact Channel: Informal channels only — {ch_list}")
        if is_new_domain:
            reasons.append(
                f"🌐 New Domain Risk: '{domain}' — {whois_status}. High-risk for newly created scam domains."
            )
        if domain and trust_score < 60:
            reasons.append(
                f"🔍 Domain Trust Score: {trust_score}/100 — below trusted threshold."
            )
        if not reasons:
            reasons.append(
                f"✅ No major fraud signals detected. Domain '{domain}' trust score: {trust_score}/100."
            )

        is_high_risk = risk_level in ("Severe Risk", "High Risk")

        # Language-specific multi-section explanations
        templates: dict = {
            "si": {
                True: (
                    f"📋 පෝස්ටර් සාරාංශය:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 වංචා අවදානම් තීරණය:\n🚨 {risk_level} (Score: {scam_score}/100)\n"
                    f"ශ්‍රී ලංකාවේ නීත්‍යානුකූල ආයතන කිසිවිටෙකත් ලියාපදිංචි ගාස්තු, ලැප්ටොප් ගාස්තු, හෝ ඕනෑම ආකාරයක ප්‍රත්‍යාවර්ත ගාස්තු අය නොකරයි.\n\n"
                    f"🔍 සාක්ෂි හා අනතුරු ඇඟවීම්:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ ආරක්ෂිත නිගමනය:\nමෙම ඉල්ලීම ප්‍රතික්ෂේප කරන්න. නිල ආයතනික කැරියර් බ්‍රවුසර් හරහා රැකියා සොයන්න."
                ),
                False: (
                    f"📋 පෝස්ටර් සාරාංශය:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 තීරණය:\n✅ ජෙනු රැකියා ඉල්ලීම (Score: {scam_score}/100)\n\n"
                    f"🔍 විශ්ලේෂණ:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ නිගමනය:\nනිල ආයතනය හරහා සත්‍යාපනය කරන්න."
                ),
            },
            "ta": {
                True: (
                    f"📋 போஸ்டர் சுருக்கம்:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 மோசடி ஆபத்து தீர்ப்பு:\n🚨 {risk_level} (Score: {scam_score}/100)\n"
                    f"சட்டபூர்வமான நிறுவனங்கள் ஒருபோதும் கட்டணம் கேட்கமாட்டார்கள்.\n\n"
                    f"🔍 ஆதாரங்கள்:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ பாதுகாப்பு முடிவு:\nஇந்த வாய்ப்பை நிராகரிக்கவும். அதிகாரப்பூர்வ போர்ட்டல் மூலம் சரிபார்க்கவும்."
                ),
                False: (
                    f"📋 போஸ்டர் சுருக்கம்:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 தீர்ப்பு:\n✅ நம்பகமான வேலை (Score: {scam_score}/100)\n\n"
                    f"🔍 ஆய்வு:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ முடிவு:\nஅதிகாரப்பூர்வ நிறுவன வலைத்தளம் மூலம் சரிபார்க்கவும்."
                ),
            },
            "hi": {
                True: (
                    f"📋 पोस्टर सारांश:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 धोखाधड़ी जोखिम निर्णय:\n🚨 {risk_level} (Score: {scam_score}/100)\n"
                    f"वैध कंपनियां कभी भी आवेदन शुल्क या प्रशिक्षण शुल्क नहीं मांगतीं।\n\n"
                    f"🔍 विस्तृत साक्ष्य:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ सुरक्षा निष्कर्ष:\nइस प्रस्ताव को अस्वीकार करें। आधिकारिक कंपनी करियर पोर्टल पर जाकर सत्यापित करें।"
                ),
                False: (
                    f"📋 पोस्टर सारांश:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 निर्णय:\n✅ वैध नौकरी — कोई धोखाधड़ी संकेत नहीं (Score: {scam_score}/100)\n\n"
                    f"🔍 विश्लेषण:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ निष्कर्ष:\nआधिकारिक कंपनी वेबसाइट से सत्यापन करें।"
                ),
            },
            "bn": {
                True: (
                    f"📋 পোস্টার সারসংক্ষেপ:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 প্রতারণার ঝুঁকির রায়:\n🚨 {risk_level} (Score: {scam_score}/100)\n"
                    f"বৈধ কোম্পানিগুলো কখনোই নিবন্ধন ফি দাবি করে না।\n\n"
                    f"🔍 বিস্তারিত প্রমাণ:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ নিরাপত্তা উপসংহার:\nএই প্রস্তাব প্রত্যাখ্যান করুন। অফিসিয়াল পোর্টাল থেকে যাচাই করুন।"
                ),
                False: (
                    f"📋 পোস্টার সারসংক্ষেপ:\nOCR: \"{snippet[:200]}...\"\n\n"
                    f"🎯 রায়:\n✅ বৈধ চাকরির সুযোগ (Score: {scam_score}/100)\n\n"
                    f"🔍 বিশ্লেষণ:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ উপসংহার:\nঅফিসিয়াল ওয়েবসাইট থেকে তথ্য যাচাই করুন।"
                ),
            },
        }

        if language in templates:
            full_explanation = templates[language][is_high_risk]
        else:
            # English (default)
            if is_high_risk:
                full_explanation = (
                    f"📋 POSTER SUMMARY:\nExtracted content: \"{snippet[:300]}...\"\n\n"
                    f"🎯 SCAM RISK VERDICT:\n🚨 FAKE / SCAM DETECTED — {risk_level} (Score: {scam_score}/100)\n"
                    f"This job posting contains one or more critical fraud indicators. "
                    f"Legitimate employers NEVER charge candidates for registration fees, laptop deposits, "
                    f"uniform fees, training charges, or any form of advance payment.\n\n"
                    f"🔍 DETAILED EVIDENCE & RED FLAGS:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ SAFETY CONCLUSION:\nDO NOT apply or send any money. "
                    f"Report this fraudulent poster to your University Career Guidance Unit or the national "
                    f"cybercrime reporting portal. Always verify job offers directly on the official company "
                    f"website (e.g., company.com/careers)."
                )
            else:
                full_explanation = (
                    f"📋 POSTER SUMMARY:\nExtracted content: \"{snippet[:300]}...\"\n\n"
                    f"🎯 SCAM RISK VERDICT:\n✅ GENUINE RECRUITMENT POSTER — {risk_level} (Score: {scam_score}/100)\n"
                    f"No major recruitment fraud indicators were detected in this job posting.\n\n"
                    f"🔍 ANALYSIS FINDINGS:\n" + "\n".join(f"• {r}" for r in reasons) + "\n\n"
                    f"✅ SAFETY CONCLUSION:\nThis offer appears authentic, but always confirm directly "
                    f"through the official company careers portal before providing personal documents "
                    f"or attending interviews."
                )

        return full_explanation, reasons

    def synthesize(
        self,
        intake_data: dict,
        linguistic_data: dict,
        verification_data: dict,
        language: str = "en",
        image_bytes: Optional[bytes] = None,
    ) -> dict:
        """
        Orchestrates the full reasoning pipeline:
        1. Gemini AI (primary — multimodal, with thinking)
        2. DeepSeek V4 Flash (secondary — text-only)
        3. Rule engine (guaranteed fallback)
        """
        intake_data = intake_data or {}
        linguistic_data = linguistic_data or {}
        verification_data = verification_data or {}
        cleaned_text = intake_data.get("cleaned_text", "")

        # --- Stage 1: Gemini AI (primary) ---
        gemini_res = self.call_gemini_ai_reasoning_api(
            cleaned_text, linguistic_data, verification_data, language, image_bytes
        )
        if gemini_res and isinstance(gemini_res, dict) and "scam_score" in gemini_res:
            try:
                score = max(0, min(100, int(gemini_res.get("scam_score") or 0)))
            except Exception:
                score = 50
            sub = gemini_res.get("sub_scores")
            if not isinstance(sub, dict):
                sub = self._default_sub_scores(linguistic_data, verification_data)
            signals = gemini_res.get("reasons") or gemini_res.get("breakdown_signals") or []
            if not isinstance(signals, list):
                signals = []
            recs = gemini_res.get("recommendations") or []
            if not isinstance(recs, list):
                recs = []
            return {
                "scam_score": score,
                "confidence_score": gemini_res.get("confidence_score") or 98,
                "risk_level": gemini_res.get("risk_level") or "Low Risk",
                "explanation": gemini_res.get("explanation") or "",
                "breakdown_signals": signals,
                "recommendations": recs,
                "sub_scores": sub,
            }

        # --- Stage 2: DeepSeek V4 Flash (secondary) ---
        deepseek_res = self.call_deepseek_v4_reasoning_api(
            cleaned_text, linguistic_data, verification_data, language
        )
        if deepseek_res and isinstance(deepseek_res, dict) and "scam_score" in deepseek_res:
            try:
                score = max(0, min(100, int(deepseek_res.get("scam_score") or 0)))
            except Exception:
                score = 50
            sub = deepseek_res.get("sub_scores")
            if not isinstance(sub, dict):
                sub = self._default_sub_scores(linguistic_data, verification_data)
            signals = deepseek_res.get("reasons") or deepseek_res.get("breakdown_signals") or []
            if not isinstance(signals, list):
                signals = []
            recs = deepseek_res.get("recommendations") or []
            if not isinstance(recs, list):
                recs = []
            return {
                "scam_score": score,
                "confidence_score": deepseek_res.get("confidence_score") or 95,
                "risk_level": deepseek_res.get("risk_level") or "Low Risk",
                "explanation": deepseek_res.get("explanation") or "",
                "breakdown_signals": signals,
                "recommendations": recs,
                "sub_scores": sub,
            }

        # --- Stage 3: Rule-engine fallback ---
        logger.warning("All AI APIs unavailable. Using rule-engine fallback scoring.")
        return self._rule_engine_score(cleaned_text, linguistic_data, verification_data, language)

    def _default_sub_scores(self, linguistic_data: dict, verification_data: dict) -> dict:
        """Compute default sub-scores from rule signals when the AI doesn't return them."""
        linguistic_data = linguistic_data or {}
        verification_data = verification_data or {}
        trust_score = verification_data.get("verification_trust_score")
        if trust_score is None:
            trust_score = 80
        return {
            "financial_fee_risk": 90 if linguistic_data.get("has_payment_demand") else 10,
            "impersonation_risk": 85 if linguistic_data.get("has_impersonation_risk") else 15,
            "domain_reputation_risk": max(0, 100 - int(trust_score)),
            "urgency_pressure_risk": 75 if linguistic_data.get("has_urgency_tactics") else 10,
        }

    def _rule_engine_score(
        self,
        cleaned_text: str,
        linguistic_data: dict,
        verification_data: dict,
        language: str,
    ) -> dict:
        """Deterministic rule-based scoring — guaranteed to return a valid result."""
        linguistic_data = linguistic_data or {}
        verification_data = verification_data or {}
        
        linguistic_score = linguistic_data.get("linguistic_score")
        if linguistic_score is None:
            linguistic_score = 0
            
        trust_score = verification_data.get("verification_trust_score")
        if trust_score is None:
            trust_score = 80
            
        verification_risk = max(0, 100 - int(trust_score))
        has_payment = bool(linguistic_data.get("has_payment_demand"))
        has_impersonation = bool(linguistic_data.get("has_impersonation_risk"))
        has_urgency = bool(linguistic_data.get("has_urgency_tactics"))
        has_suspicious = bool(linguistic_data.get("has_suspicious_channels"))
        is_new_domain = bool((verification_data.get("whois_info") or {}).get("is_new_domain"))

        # Weighted scoring
        raw_score = (int(linguistic_score) * 0.50) + (verification_risk * 0.30)
        if has_payment:
            raw_score += 50  # Fee demand ≈ near-certain scam
        if has_impersonation:
            raw_score += 30
        if has_urgency:
            raw_score += 15
        if has_suspicious:
            raw_score += 20
        if is_new_domain:
            raw_score += 20

        scam_score = min(100, max(0, int(raw_score)))

        if scam_score >= 75:
            risk_level = "Severe Risk"
        elif scam_score >= 55:
            risk_level = "High Risk"
        elif scam_score >= 30:
            risk_level = "Moderate Risk"
        else:
            risk_level = "Low Risk"

        full_explanation, reasons = self._build_rule_engine_explanation(
            risk_level, scam_score, linguistic_data, verification_data, language, cleaned_text
        )

        return {
            "scam_score": scam_score,
            "confidence_score": 94,
            "risk_level": risk_level,
            "explanation": full_explanation,
            "breakdown_signals": reasons,
            "sub_scores": {
                "financial_fee_risk": 95 if has_payment else 10,
                "impersonation_risk": 85 if has_impersonation else 15,
                "domain_reputation_risk": verification_risk,
                "urgency_pressure_risk": 70 if has_urgency else 10,
            },
        }
