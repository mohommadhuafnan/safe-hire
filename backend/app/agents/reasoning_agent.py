import re
import json
import logging
import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, List, Union
import requests
from app.config import settings

logger = logging.getLogger("safe_hire.reasoning_agent")

_http_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="reasoning_http")


def _extract_json_from_text(text: str) -> Optional[dict]:
    """Robustly extract a JSON object from raw AI output."""
    if not text:
        return None

    if "<think>" in text and "</think>" in text:
        text = text.split("</think>")[-1].strip()

    text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    for end_char in ("}", "]"):
        last_pos = text.rfind(end_char)
        if last_pos != -1:
            try:
                parsed = json.loads(text[:last_pos + 1])
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                continue

    return None


class ReasoningAgent:
    """Agent 4: Synthesizes multi-agent signals using Google Gemini AI / DeepSeek AI into a structured, evidence-based scam analysis report."""

    GEMINI_MODELS = [
        "gemini-flash-latest",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
    ]

    DEEPSEEK_MODELS = [
        "deepseek-ai/DeepSeek-V4-Flash",
        "deepseek-ai/DeepSeek-V3",
    ]

    def _call_gemini_ai(
        self,
        prompt: str,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/png"
    ) -> Optional[dict]:
        """Call active Google Gemini AI models."""
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
        if not gemini_key:
            return None

        base64_img = base64.b64encode(image_bytes).decode("utf-8") if image_bytes else None

        for model_name in self.GEMINI_MODELS:
            parts = [{"text": prompt}]
            if base64_img:
                parts.append({"inline_data": {"mime_type": mime_type, "data": base64_img}})

            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {"temperature": 0.15, "maxOutputTokens": 4096}
            }

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json", "X-goog-api-key": gemini_key}
            try:
                res = requests.post(url, json=payload, headers=headers, timeout=15)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates") or []
                    raw = ""
                    if candidates and isinstance(candidates[0], dict):
                        parts_list = (candidates[0].get("content") or {}).get("parts") or []
                        if parts_list and isinstance(parts_list[0], dict):
                            raw = parts_list[0].get("text") or ""
                    parsed = _extract_json_from_text(raw)
                    if parsed and isinstance(parsed, dict):
                        logger.info(f"Gemini AI ({model_name}) reasoning success")
                        return parsed
                elif res.status_code == 429:
                    logger.warning(f"Gemini AI ({model_name}) rate limited (429). Trying next...")
                else:
                    logger.warning(f"Gemini AI ({model_name}) HTTP {res.status_code}: {res.text[:150]}")
            except Exception as e:
                logger.warning(f"Gemini AI reasoning notice for {model_name}: {e}")

        return None

    def _call_deepseek_ai(self, prompt: str) -> Optional[dict]:
        """Call DeepSeek AI via Hugging Face Router as secondary reasoning provider."""
        api_key = getattr(settings, "DEEPSEEK_V4_API_KEY", "") or getattr(settings, "HF_TOKEN", "") or ""
        if not api_key:
            return None

        url = f"{settings.DEEPSEEK_API_BASE_URL.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        for model_name in self.DEEPSEEK_MODELS:
            payload = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.15,
                "max_tokens": 4096,
            }
            try:
                res = requests.post(url, json=payload, headers=headers, timeout=30)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices") or []
                    raw = choices[0].get("message", {}).get("content", "") if choices else ""
                    parsed = _extract_json_from_text(raw)
                    if parsed and isinstance(parsed, dict):
                        logger.info(f"DeepSeek AI ({model_name}) reasoning success")
                        return parsed
            except Exception as e:
                logger.warning(f"DeepSeek AI reasoning notice for {model_name}: {e}")

        return None

    def _build_prompt(
        self,
        intake_data: dict,
        linguistic_data: dict,
        verification_data: dict,
        target_lang_name: str,
        language: str
    ) -> str:
        """Build structured reasoning prompt."""
        content_type = intake_data.get("content_type", "job_poster")
        is_job_poster = intake_data.get("is_job_poster", True)
        specific_category = intake_data.get("specific_category") or intake_data.get("poster_type") or "Document"
        poster_summary = intake_data.get("poster_summary", "")
        cleaned_text = intake_data.get("cleaned_text", "")
        ocr_status = intake_data.get("ocr_status", "NOT_APPLICABLE")

        whois_info = verification_data.get("whois_info") or {}
        email_val = verification_data.get("email_validation") or {}
        safe_browsing = verification_data.get("safe_browsing") or {}

        evidence_list = []
        evidence_list.extend(linguistic_data.get("evidence_items") or [])
        evidence_list.extend(verification_data.get("evidence_items") or [])

        return f"""You are SAFE-HIRE's Senior Recruitment Fraud & Poster Intelligence Reasoning Agent.
Analyze the structured intelligence below and produce a rigorous, evidence-based security audit report.

[SUBMISSION INTEL & CLASSIFICATION]:
- Input Source: {intake_data.get('source', 'text')}
- Content Type Classification: {content_type} (Is Job Recruitment Content: {is_job_poster})
- Identified Specific Category: {specific_category}
- Visual / Content Summary: {poster_summary}
- OCR Processing Status: {ocr_status}
- Claimed Brand / Institution: {intake_data.get('claimed_brand') or 'Not Specified'}
- Target Domain: {verification_data.get('domain', 'N/A')}
- Extracted Contacts: {json.dumps(intake_data.get('metadata_extracted') or {})}
- Verified Facts: {json.dumps(intake_data.get('verified_facts') or [])}

[EXTERNAL VERIFICATION RESULTS]:
- WHOIS Domain Registry Status: {whois_info.get('whois_status', 'Check unavailable')} (Status: {whois_info.get('status', 'unavailable')})
- Safe Browsing Status: {safe_browsing.get('status', 'unavailable')} (Flagged: {safe_browsing.get('flagged', False)})
- Email Deliverability & Verification: {email_val.get('analysis_summary', 'Check unavailable')}
- Contact Phone Verification: {(verification_data.get('phone_validation') or {}).get('summary', 'No phone provided')}
- Corporate Trust Rating: {verification_data.get('verification_trust_score', 70)}/100

[DETECTED EVIDENCE & RED FLAGS]:
{json.dumps(evidence_list, indent=2)}

[RAW EXTRACTED TEXT / OCR]:
\"\"\"{cleaned_text[:3000]}\"\"\"

[LANGUAGE REQUIREMENT]: Write the entire explanation, reasons, and recommendations in {target_lang_name} ({language}).

CRITICAL INSTRUCTIONS & RULES:
1. NON-JOB CONTENT (e.g. food/restaurant posters, graduation flyers, event banners, product ads, memes, personal photos):
   - Set "content_type": "not_job_poster", "is_job_poster": false, "scam_score": "N/A", "risk_level": "Not a Job Advertisement".
   - The explanation MUST dynamically describe what this specific non-job poster depicts, what organization/restaurant/event it represents, and explain that recruitment scam scoring is not applicable to non-recruitment media.
   - Do NOT give 0% or any percentage score to non-job content.

2. UNREADABLE / POOR QUALITY CONTENT:
   - If text is unreadable or OCR failed, set "content_type": "unclear", "scam_score": "N/A", "risk_level": "Unable to Determine".

3. JOB RECRUITMENT CONTENT:
   - Compute an evidence-based scam probability score (0 to 100).
   - A score of 0-20 represents "Low Apparent Risk" (no major red flags found). NEVER claim "100% Guaranteed Safe" or "0% Scam Guaranteed".
   - If there are fee demands, set scam_score >= 75 ("Severe Risk").
   - If there is brand impersonation with generic free email, set scam_score >= 65 ("High Risk").
   - If evidence is missing (e.g. unverified company), explicitly state "Not verified" and assign moderate uncertainty.

4. SEPARATE OBSERVED FACTS FROM AI INFERENCES & STRICT ACCURACY ON CONTACTS:
   - "verified_facts": Things directly observable in the submission or confirmed by verification services.
   - "ai_inferences": Deductions or risk interpretations made by the model.
   - NEVER state that an email, website domain, or phone number is "verified" or "authentic" if none was provided in the input, or if it failed formatting checks.
   - Free email providers (@gmail.com, @yahoo.com) are NEVER company website domains. Emphasize that reputable large corporations use corporate domain email addresses.
   - If a phone number is malformed, too short, or a fake/dummy sequence, explicitly cite it as a warning or scam red flag.

5. FORMAT THE "explanation" FIELD AS A RICH MULTI-SECTION AUDIT IN {target_lang_name}:
📋 POSTER SUMMARY:
[2-3 sentence overview of the submission and entities]

🎯 SCAM RISK VERDICT:
[Clear verdict explaining the risk level, why it was assigned, and the conclusion]

🔍 DETAILED EVIDENCE & RED FLAGS:
[Bullet points analyzing upfront fees, domain trust, emails, urgency, and channels]

✅ SAFETY CONCLUSION & ADVICE:
[Actionable guidance for the job seeker]

Return ONLY a raw JSON object with this exact structure (no markdown fences outside JSON):
{{
  "content_type": "job_poster | not_job_poster | unclear",
  "is_job_poster": true or false,
  "scam_score": <integer 0-100 or "N/A">,
  "risk_level": "Severe Risk | High Risk | Moderate Risk | Low Apparent Risk | Not a Job Advertisement | Unable to Determine",
  "confidence_score": <integer 80-99>,
  "verified_facts": ["fact 1", "fact 2"],
  "ai_inferences": ["inference 1", "inference 2"],
  "reasons": ["finding 1", "finding 2", "finding 3"],
  "explanation": "<Full rich explanation in target language>",
  "sub_scores": {{
    "financial_fee_risk": <integer 0-100>,
    "impersonation_risk": <integer 0-100>,
    "domain_reputation_risk": <integer 0-100>,
    "urgency_pressure_risk": <integer 0-100>
  }},
  "recommendations": [
    "Actionable safety recommendation 1",
    "Actionable safety recommendation 2",
    "Actionable safety recommendation 3"
  ]
}}"""

    def synthesize(
        self,
        intake_data: dict,
        linguistic_data: dict,
        verification_data: dict,
        language: str = "en",
        image_bytes: Optional[bytes] = None,
    ) -> dict:
        intake_data = intake_data or {}
        linguistic_data = linguistic_data or {}
        verification_data = verification_data or {}

        lang_map = {
            "en": "English",
            "si": "Sinhala (සිංහල)",
            "ta": "Tamil (தமிழ்)",
            "hi": "Hindi (हिंदी)",
            "bn": "Bengali (বাংলা)",
        }
        target_lang_name = lang_map.get(language, "English")
        mime_type = intake_data.get("mime_type") or "image/png"

        # Check if intake already decisively determined it's unreadable
        if intake_data.get("is_unreadable") is True:
            return self._build_unreadable_result(intake_data, language, target_lang_name)

        # Build prompt
        prompt = self._build_prompt(intake_data, linguistic_data, verification_data, target_lang_name, language)

        # 1. Primary Reasoning: Google Gemini AI
        ai_res = self._call_gemini_ai(prompt, image_bytes, mime_type)

        # 2. Secondary Reasoning: DeepSeek AI (text-only)
        if not ai_res:
            logger.info("Gemini reasoning unavailable. Trying DeepSeek AI...")
            ai_res = self._call_deepseek_ai(prompt)

        # If AI generated response, validate and normalize
        if ai_res and isinstance(ai_res, dict) and ("scam_score" in ai_res or "risk_level" in ai_res or "explanation" in ai_res):
            return self._normalize_ai_response(ai_res, intake_data, linguistic_data, verification_data, language)

        # 3. Dynamic Rule Engine Fallback (guaranteed uptime when all AI APIs are offline)
        logger.warning("All AI reasoning APIs unavailable. Using dynamic evidence synthesis engine.")
        return self._dynamic_evidence_synthesis(intake_data, linguistic_data, verification_data, language, target_lang_name)

    def _normalize_ai_response(
        self,
        ai_res: dict,
        intake_data: dict,
        linguistic_data: dict,
        verification_data: dict,
        language: str
    ) -> dict:
        """Validates, sanitizes, and normalizes AI reasoning response."""
        content_type = ai_res.get("content_type") or intake_data.get("content_type", "job_poster")
        is_job = ai_res.get("is_job_poster")
        if is_job is None:
            is_job = (content_type == "job_poster")

        raw_score = ai_res.get("scam_score")
        if not is_job or content_type == "not_job_poster" or str(raw_score).upper() == "N/A":
            final_score = "N/A"
            final_risk = "Not a Job Advertisement" if not is_job else (ai_res.get("risk_level") or "Not a Job Advertisement")
        else:
            try:
                final_score = max(0, min(100, int(raw_score)))
                final_risk = ai_res.get("risk_level") or self._score_to_risk_level(final_score)
            except Exception:
                final_score = 25
                final_risk = "Low Apparent Risk"

        sub_scores = ai_res.get("sub_scores")
        if not isinstance(sub_scores, dict):
            sub_scores = self._compute_sub_scores(linguistic_data, verification_data, is_job)

        reasons = ai_res.get("reasons") or ai_res.get("breakdown_signals") or []
        if not isinstance(reasons, list):
            reasons = [str(reasons)]

        recs = ai_res.get("recommendations") or []
        if not isinstance(recs, list) or len(recs) == 0:
            recs = [
                "Verify vacancy details directly on the company's official corporate career portal.",
                "Never pay upfront fees, registration charges, or laptop deposits for any job."
            ]

        explanation = ai_res.get("explanation") or ai_res.get("explanation_text") or ""
        if not explanation:
            explanation = f"📋 POSTER SUMMARY:\n{intake_data.get('poster_summary', 'Analyzed content.')}\n\n🎯 SCAM RISK VERDICT:\n{final_risk} (Score: {final_score})\n\n✅ SAFETY CONCLUSION:\nVerify all details via official channels."

        return {
            "content_type": content_type,
            "is_job_poster": is_job,
            "scam_score": final_score,
            "confidence_score": ai_res.get("confidence_score", 95),
            "risk_level": final_risk,
            "explanation": explanation,
            "breakdown_signals": reasons,
            "recommendations": recs,
            "sub_scores": sub_scores,
            "verified_facts": ai_res.get("verified_facts") or intake_data.get("verified_facts") or [],
            "ai_inferences": ai_res.get("ai_inferences") or []
        }

    def _build_unreadable_result(self, intake_data: dict, language: str, target_lang_name: str) -> dict:
        """Handles poor quality or unreadable images honestly without fabricating text."""
        msg = intake_data.get("validation_error") or "The uploaded image or document is unreadable. Please upload a clear image for analysis."
        explanation = f"""📋 POSTER SUMMARY:
Unreadable Media / Low Quality Document.

🎯 SCAM RISK VERDICT:
Unable to Determine (Scam Score: N/A)
SAFE-HIRE AI could not extract clear text or identify recruitment details from this upload.

🔍 DETAILED EVIDENCE & RED FLAGS:
• Text readability: Failed (OCR unreadable or image resolution too low)
• Recruitment analysis paused to prevent false results.

✅ SAFETY CONCLUSION & ADVICE:
Please upload a higher-resolution, clearer image or document of the job vacancy."""

        return {
            "content_type": "unclear",
            "is_job_poster": False,
            "scam_score": "N/A",
            "confidence_score": 0,
            "risk_level": "Unable to Determine",
            "explanation": explanation,
            "breakdown_signals": ["Image unreadable or poor resolution", "Scam analysis paused"],
            "recommendations": ["Please upload a clearer image of the advertisement."],
            "sub_scores": {"financial_fee_risk": 0, "impersonation_risk": 0, "domain_reputation_risk": 0, "urgency_pressure_risk": 0},
            "verified_facts": [],
            "ai_inferences": ["Image quality insufficient for automated fraud analysis"]
        }

    def _score_to_risk_level(self, score: int) -> str:
        if score >= 81:
            return "Severe Risk"
        elif score >= 61:
            return "High Risk"
        elif score >= 41:
            return "Moderate Risk"
        elif score >= 21:
            return "Low / Moderate Risk"
        else:
            return "Low Apparent Risk"

    def _compute_sub_scores(self, linguistic_data: dict, verification_data: dict, is_job: bool) -> dict:
        if not is_job:
            return {"financial_fee_risk": 0, "impersonation_risk": 0, "domain_reputation_risk": 0, "urgency_pressure_risk": 0}

        has_payment = bool(linguistic_data.get("has_payment_demand"))
        has_impersonation = bool(linguistic_data.get("has_impersonation_risk"))
        has_urgency = bool(linguistic_data.get("has_urgency_tactics"))
        trust_score = verification_data.get("verification_trust_score", 75)
        domain_risk = max(0, 100 - int(trust_score)) if (verification_data.get("domain") and verification_data.get("domain") != "Not Specified") else 15

        return {
            "financial_fee_risk": 95 if has_payment else 5,
            "impersonation_risk": 85 if has_impersonation else 10,
            "domain_reputation_risk": domain_risk,
            "urgency_pressure_risk": 75 if has_urgency else 5,
        }

    def _dynamic_evidence_synthesis(
        self,
        intake_data: dict,
        linguistic_data: dict,
        verification_data: dict,
        language: str,
        target_lang_name: str
    ) -> dict:
        """Dynamic rule-based evidence synthesis engine (input-dependent, no static templates)."""
        content_type = intake_data.get("content_type", "job_poster")
        is_job = intake_data.get("is_job_poster", True)
        specific_category = intake_data.get("specific_category") or intake_data.get("poster_type") or "Document"
        poster_summary = intake_data.get("poster_summary") or "Content analyzed."
        cleaned_snippet = (intake_data.get("cleaned_text") or "").replace("\n", " ").strip()[:300]

        # 1. Non-Job Content Case
        if not is_job or content_type == "not_job_poster":
            domain = verification_data.get("domain")
            explanation = f"""📋 POSTER SUMMARY:
• Classification: {specific_category}
• Analyzed Content: {poster_summary}

🎯 SCAM RISK VERDICT:
Status: Not a Job Advertisement (Scam Score: N/A)
This content has been analyzed by SAFE-HIRE. It contains general media, business portfolio, or event advertising without job recruitment vacancies or salary offers. Recruitment scam scoring is not applicable to non-recruitment media.

🔍 DETAILED EVIDENCE & AUDIT:
• Identified Category: {specific_category}
• Content Details: {poster_summary}
{f'• Associated Web Domain: {domain}' if domain and domain != 'Not Specified' else ''}

✅ SAFETY CONCLUSION & ADVICE:
Please submit a genuine recruitment flyer or job vacancy URL if you wish to verify an employment opportunity."""

            return {
                "content_type": "not_job_poster",
                "is_job_poster": False,
                "scam_score": "N/A",
                "confidence_score": 95,
                "risk_level": "Not a Job Advertisement",
                "explanation": explanation,
                "breakdown_signals": [
                    f"Category: {specific_category}",
                    "Scam Probability: N/A (Non-Recruitment Content)",
                    f"Summary: {poster_summary[:150]}"
                ],
                "recommendations": [
                    "Please upload a recruitment or job vacancy advertisement for employment fraud analysis.",
                    "Verify commercial services or events directly with the organizers."
                ],
                "sub_scores": {"financial_fee_risk": 0, "impersonation_risk": 0, "domain_reputation_risk": 0, "urgency_pressure_risk": 0},
                "verified_facts": intake_data.get("verified_facts") or [],
                "ai_inferences": [f"Content matches {specific_category}"]
            }

        # 2. Job Recruitment Case — Evidence-Based Scoring Calculation
        has_payment = bool(linguistic_data.get("has_payment_demand"))
        payment_terms = linguistic_data.get("matched_payment") or []
        has_impersonation = bool(linguistic_data.get("has_impersonation_risk"))
        impersonation_flags = linguistic_data.get("impersonation_flags") or []
        has_urgency = bool(linguistic_data.get("has_urgency_tactics"))
        urgency_terms = linguistic_data.get("matched_urgency") or []
        has_suspicious_channels = bool(linguistic_data.get("has_suspicious_channels"))
        suspicious_terms = linguistic_data.get("matched_suspicious_terms") or []
        claimed_brand = linguistic_data.get("claimed_brand") or intake_data.get("claimed_brand") or ""
        free_email = linguistic_data.get("free_email") or ""
        domain = verification_data.get("domain") or "Not Specified"
        trust_score = verification_data.get("verification_trust_score", 75)
        is_new_domain = bool((verification_data.get("whois_info") or {}).get("is_new_domain"))
        safe_browsing_flag = bool((verification_data.get("safe_browsing") or {}).get("flagged"))

        # Base evidence score calculation
        score = 10  # Baseline low risk
        reasons = []

        if has_payment:
            score += 55
            reasons.append(f"⚠️ Upfront fee / deposit demanded: {', '.join(payment_terms[:3])}. Legitimate employers never charge candidates.")

        if has_impersonation:
            score += 30
            reasons.append(f"🎭 Brand impersonation detected: {'; '.join(impersonation_flags[:2])}")

        if safe_browsing_flag:
            score += 45
            reasons.append(f"🌐 Threat detected on URL: Safe Browsing flagged the destination link.")

        if is_new_domain:
            score += 20
            reasons.append(f"🌐 Newly registered domain (< 90 days): '{domain}'. High frequency in ephemeral scam campaigns.")

        if has_suspicious_channels:
            score += 15
            reasons.append(f"📱 Informal recruitment channel: {', '.join(suspicious_terms[:2])} without corporate domain presence.")

        if has_urgency:
            score += 10
            reasons.append(f"⏰ Artificial urgency / pressure tactics detected: {', '.join(urgency_terms[:2])}.")

        # If brand claimed but domain missing
        if claimed_brand and domain == "Not Specified" and free_email:
            score += 15
            reasons.append(f"🏢 Recruiter claims '{claimed_brand}' but uses free email without verifiable company domain.")

        # If clean verified posting
        if score <= 15:
            reasons.append("✅ No upfront fee demands, disposable domains, or impersonation flags detected.")
            if domain and domain != "Not Specified":
                reasons.append(f"✅ Established domain reference: {domain}")

        score = max(5, min(98, score))
        risk_level = self._score_to_risk_level(score)

        explanation = f"""📋 POSTER SUMMARY:
• Extracted Snippet: \"{cleaned_snippet}\"
• Claimed Entity: {claimed_brand or 'Not Specified'}
• Web Link / Domain: {domain}

🎯 SCAM RISK VERDICT:
Risk Level: {risk_level} (Estimated Risk Score: {score}/100)
{('Critical fraud indicators detected in this posting.' if score >= 60 else 'No decisive scam indicators found based on available evidence.')}

🔍 DETAILED EVIDENCE & RED FLAGS:
""" + "\n".join(f"• {r}" for r in reasons) + f"""

✅ SAFETY CONCLUSION & ADVICE:
Verify the offer directly on the official career portal of {claimed_brand or 'the claimed company'} before sharing personal documents or identity proofs."""

        return {
            "content_type": "job_poster",
            "is_job_poster": True,
            "scam_score": score,
            "confidence_score": 90,
            "risk_level": risk_level,
            "explanation": explanation,
            "breakdown_signals": reasons,
            "recommendations": [
                f"Verify the recruiter identity on the official career portal of {claimed_brand or 'the company'}.",
                "Never pay registration fees, security deposits, or uniform charges for any job."
            ],
            "sub_scores": {
                "financial_fee_risk": 95 if has_payment else 5,
                "impersonation_risk": 85 if has_impersonation else 10,
                "domain_reputation_risk": max(0, 100 - int(trust_score)),
                "urgency_pressure_risk": 75 if has_urgency else 5
            },
            "verified_facts": intake_data.get("verified_facts") or [],
            "ai_inferences": reasons
        }
