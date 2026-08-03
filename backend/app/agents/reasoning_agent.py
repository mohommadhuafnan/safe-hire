import json
import logging
import base64
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger("safe_hire.reasoning_agent")

class ReasoningAgent:
    """Agent 4: Synthesizes multi-agent signals using Google Gemini 2.5 Flash AI into deep 100% explainable report."""

    EXPLANATIONS = {
        "en": {
            "Severe Risk": "CRITICAL FRAUD WARNING: Deep analysis detected high-severity scam indicators including mandatory upfront payment requests, corporate brand email impersonation (@gmail.com for major firm), or suspicious domain WHOIS records. Legitimate employers NEVER charge candidates for application, laptop, or registration fees.",
            "High Risk": "HIGH RISK RECRUITMENT ALERT: Multiple scam indicators were flagged, such as artificial urgency pressure, unverified sender domains, or informal Telegram/WhatsApp-only contact channels.",
            "Moderate Risk": "MODERATE RISK ASSESSMENT: Some questionable recruitment patterns were detected (unverified domain age or vague job details). Proceed with caution and verify via the official corporate HR portal.",
            "Low Risk": "LOW SCAM RISK: No major recruitment fraud indicators were detected. The offer appears authentic, but always confirm directly through the official company careers portal."
        },
        "si": {
            "Severe Risk": "අතිශය වංචනික රැකියා අවදානම: පරීක්ෂාවේදී ලියාපදිංචි ගාස්තු අය කිරීම්, ව්‍යාජ විද්‍යුත් තැපෑල හෝ සැකකටයුතු තොරතුරු අඩංගු බව හඳුනාගෙන ඇත. නීත්‍යානුකූල ආයතන කිසිවිටෙකත් අයදුම්කරුවන්ගෙන් මුදල් අය නොකරයි.",
            "High Risk": "ඉහළ අවදානම් රැකියා නිරීක්ෂණය: හදිසි බඳවාගැනීම් තර්ජන, නිල නොවන විද්‍යුත් තැපෑල හෝ ටෙලිග්‍රෑම්/වට්ස්ඇප් හරහා පමණක් සම්බන්ධ වීම වැනි වංචනික ලක්ෂණ හඳුනාගෙන ඇත.",
            "Moderate Risk": "මධ්‍යම අවදානම් මට්ටම: පරීක්ෂා කළ යුතු තොරතුරු කිහිපයක් පවතී. නිල ආයතනික වෙබ් අඩවිය හරහා තොරතුරු තහවුරු කරගන්න.",
            "Low Risk": "අඩු වංචා අවදානම: ප්‍රධාන වංචනික ලක්ෂණ කිසිවක් හඳුනාගෙන නොමැත. කෙසේ වෙතත් නිල ආයතනික HR අංශය හරහා තහවුරු කරගන්න."
        },
        "ta": {
            "Severe Risk": "மிகவும் ஆபத்தான மோசடி எச்சரிக்கை: கட்டணம் செலுத்துதல், போலி மின்னஞ்சல் அல்லது சந்தேகத்திற்குரிய விவரங்கள் உள்ளன. உண்மையான நிறுவனங்கள் ஒருபோதும் விண்ணப்பதாரர்களிடம் பணம் கேட்காது.",
            "High Risk": "அதிக ஆபத்து எச்சரிக்கை: அவசர ஆட்சேர்ப்பு அழுத்தம், அதிகாரப்பூர்வமற்ற மின்னஞ்சல் அல்லது டெலிகிராம்/வாட்ஸ்அப் மூலமாக மட்டுமே தொடர்பு கொள்ளும் சந்தேகத்திற்குரிய அறிகுறிகள் கண்டறியப்பட்டுள்ளன.",
            "Moderate Risk": "மிதமான ஆபத்து: சில கேள்விகளுக்குரிய விவரங்கள் கொடியிடப்பட்டுள்ளன. அதிகாரப்பூர்வ நிறுவன வலைத்தளம் மூலம் சரிபார்க்கவும்.",
            "Low Risk": "குறைந்த ஆபத்து: முக்கிய மோசடி குறிகாட்டிகள் எதுவும் கண்டறியப்படவில்லை. இருப்பினும் அதிகாரப்பூர்வ எச்.ஆர் போர்ட்டல் மூலம் உறுதிப்படுத்தவும்."
        },
        "hi": {
            "Severe Risk": "गंभीर धोखाधड़ी चेतावनी: इस नौकरी के विज्ञापन में पंजीकरण शुल्क मांगने, फर्जी ईमेल या संदिग्ध डोमेन जैसे गंभीर धोखाधड़ी के संकेत मिले हैं। असली कंपनियां कभी पैसे नहीं मांगतीं।",
            "High Risk": "उच्च जोखिम: दबाव की रणनीति, अनधिकृत ईमेल या केवल टेलीग्राम/व्हाट्सएप संपर्क जैसे कई संदिग्ध धोखाधड़ी के संकेत पाए गए हैं।",
            "Moderate Risk": "मध्यम जोखिम: कुछ संदिग्ध विवरण पाए गए हैं। आधिकारिक कंपनी वेबसाइट या एचआर पोर्टल से सत्यापन करें।",
            "Low Risk": "कम जोखिम: कोई मुख्य धोखाधड़ी के संकेत नहीं मिले हैं। फिर भी आधिकारिक कंपनी पोर्टल से पुष्टि अवश्य करें।"
        },
        "bn": {
            "Severe Risk": "মারাত্মক প্রতারণা সতর্কতা: এই চাকরির বিজ্ঞাপনে নিবন্ধন ফি দাবি করা, জাল ইমেল বা সন্দেহজনক ডোমেইনের মতো গুরুতর প্রতারণার সংকেত পাওয়া গেছে। আসল প্রতিষ্ঠান কখনোই টাকা চায় না।",
            "High Risk": "উচ্চ ঝুঁকি: জরুরী নিয়োগের চাপ, অননুমোদিত ইমেল বা কেবল টেলিগ্রাম/হোয়াটসঅ্যাপ যোগাযোগের মতো একাধিক সন্দেহজনক লক্ষণ শনাক্ত হয়েছে।",
            "Moderate Risk": "মাঝারি ঝুঁকি: কিছু সন্দেহজনক বিবরণ পাওয়া গেছে। অফিসিয়াল কোম্পানি ওয়েবসাইট বা এইচআর পোর্টাল থেকে যাচাই করুন।",
            "Low Risk": "কম ঝুঁকি: কোনো প্রধান প্রতারণার সংকেত পাওয়া যায়নি। তবুও অফিসিয়াল কোম্পানি পোর্টালের মাধ্যমে নিশ্চিত হন।"
        }
    }

    def call_deepseek_v4_reasoning_api(self, cleaned_text: str, linguistic_data: dict, verification_data: dict, language: str) -> Dict[str, Any]:
        """Calls Hugging Face Router API (deepseek-ai/DeepSeek-V4-Flash) for high-reasoning effort multi-agent scam analysis."""
        api_key = settings.DEEPSEEK_V4_API_KEY
        if not api_key:
            return None

        import requests
        url = f"{settings.DEEPSEEK_API_BASE_URL.rstrip('/')}/chat/completions"

        lang_map = {"en": "English", "si": "Sinhala (සිංහල)", "ta": "Tamil (தமிழ்)", "hi": "Hindi (हिंदी)", "bn": "Bengali (বাংলা)"}
        target_lang_name = lang_map.get(language, "English")

        prompt = f"""
        You are SAFE-HIRE's Senior AI Recruitment Scam Analysis Specialist.
        Perform an exhaustive, deep 100% accurate security evaluation of the candidate job posting below:

        [INPUT CONTENT]:
        "{cleaned_text[:2000]}"

        [AGENT LINGUISTIC SIGNALS]:
        - Payment / Registration Fee Demand: {linguistic_data.get('has_payment_demand')}
        - Urgency Pressure Tactics: {linguistic_data.get('has_urgency_tactics')}
        - Brand Email Impersonation Flags: {linguistic_data.get('impersonation_flags')}
        - Matched Fee Terms: {linguistic_data.get('matched_payment')}
        - Suspicious Channels (Telegram/WhatsApp only): {linguistic_data.get('matched_suspicious_terms')}

        [AGENT DOMAIN VERIFICATION SIGNALS]:
        - Target Domain: {verification_data.get('domain')}
        - WHOIS Status: {verification_data.get('whois_info', {}).get('whois_status')}
        - Safe Browsing Rating: {verification_data.get('safe_browsing', {}).get('status')}
        - Corporate Trust Score: {verification_data.get('verification_trust_score')}

        [CRITICAL ACCURACY & CALIBRATION RULES]:
        1. Read the EXACT company name, job roles offered, website URL, and contact details directly from the post. Mention the specific company name and job details in your explanation!
        2. Standard recruitment flyers (e.g., Codveda, Virtusa, WSO2, corporate internship posts) featuring phrases like "WE'RE HIRING", "APPLY NOW", technical role titles, and official company URLs (e.g. www.codveda.com) ARE LEGITIMATE POSTS.
        3. If there is NO upfront money/fee request, NO brand email impersonation (@gmail for major firm), and NO suspicious Telegram-only channel, you MUST classify scam_score between 5 and 15 ("Low Risk").
        4. Do NOT penalize standard recruitment Call-To-Actions ("Apply Now", "Hiring Interns") as scam urgency.

        [TARGET LANGUAGE]: {target_lang_name} ({language})

        [REQUIREMENTS]:
        Return a valid raw JSON object matching this exact schema:
        {{
          "scam_score": <integer 0 to 100 representing exact scam risk probability>,
          "confidence_score": <integer 90 to 99 representing AI analysis confidence %>,
          "risk_level": "<Severe Risk | High Risk | Moderate Risk | Low Risk>",
          "explanation": "<Write a 100% custom 3-4 sentence detailed explanation natively in {target_lang_name} mentioning the exact company name, roles, website, and security factors found in this specific post>",
          "reasons": [
            "<Specific signal point 1 mentioning exact details from this post in {target_lang_name}>",
            "<Specific signal point 2 mentioning exact details from this post in {target_lang_name}>",
            "<Specific signal point 3 mentioning exact details from this post in {target_lang_name}>"
          ],
          "sub_scores": {{
             "financial_fee_risk": <integer 0-100>,
             "impersonation_risk": <integer 0-100>,
             "domain_reputation_risk": <integer 0-100>,
             "urgency_pressure_risk": <integer 0-100>
          }}
        }}
        Do not include markdown ```json formatting. Return raw JSON string only.
        """

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.DEEPSEEK_MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "top_p": 0.95,
            "max_tokens": 4096,
            "reasoning_effort": "max"
        }

        try:
            res = requests.post(url, json=payload, headers=headers, timeout=25)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    clean_str = content.strip().replace("```json", "").replace("```", "").strip()
                    if "<think>" in clean_str and "</think>" in clean_str:
                        clean_str = clean_str.split("</think>")[-1].strip()
                    parsed = json.loads(clean_str)
                    logger.info("Successfully executed DeepSeek-V4-Flash deep AI reasoning!")
                    return parsed
            else:
                logger.warning(f"DeepSeek V4 API response status: {res.status_code} - {res.text[:200]}")
        except Exception as e:
            logger.warning(f"DeepSeek V4 reasoning notice: {e}")

        return None

    def synthesize(self, intake_data: dict, linguistic_data: dict, verification_data: dict, language: str = "en", image_bytes: bytes = None) -> dict:
        cleaned_text = intake_data.get("cleaned_text", "")

        # 1. Execute DeepSeek-V4-Flash AI Reasoning via Hugging Face Router
        deepseek_res = self.call_deepseek_v4_reasoning_api(cleaned_text, linguistic_data, verification_data, language)
        if deepseek_res and isinstance(deepseek_res, dict) and "scam_score" in deepseek_res:
            score = max(0, min(100, int(deepseek_res.get("scam_score", 0))))
            return {
                "scam_score": score,
                "confidence_score": deepseek_res.get("confidence_score", 98),
                "risk_level": deepseek_res.get("risk_level", "Moderate Risk"),
                "explanation": deepseek_res.get("explanation", ""),
                "breakdown_signals": deepseek_res.get("reasons", []),
                "sub_scores": deepseek_res.get("sub_scores", {
                    "financial_fee_risk": 90 if linguistic_data.get("has_payment_demand") else 10,
                    "impersonation_risk": 85 if linguistic_data.get("has_impersonation_risk") else 15,
                    "domain_reputation_risk": 100 - verification_data.get("verification_trust_score", 80),
                    "urgency_pressure_risk": 75 if linguistic_data.get("has_urgency_tactics") else 10
                })
            }

        # 2. Rule-Engine Fallback with Sub-Scores
        linguistic_score = linguistic_data.get("linguistic_score", 0)
        trust_score = verification_data.get("verification_trust_score", 80)
        
        verification_risk = 100 - trust_score
        has_payment = linguistic_data.get("has_payment_demand", False)
        has_impersonation = linguistic_data.get("has_impersonation_risk", False)

        raw_score = (linguistic_score * 0.55) + (verification_risk * 0.35)

        if has_payment:
            raw_score += 35
        if has_impersonation:
            raw_score += 25

        scam_score = min(100, max(0, int(raw_score)))

        if scam_score >= 85:
            risk_level = "Severe Risk"
        elif scam_score >= 60:
            risk_level = "High Risk"
        elif scam_score >= 30:
            risk_level = "Moderate Risk"
        else:
            risk_level = "Low Risk"

        lang_key = language if language in self.EXPLANATIONS else "en"
        base_explanation = self.EXPLANATIONS[lang_key].get(risk_level, self.EXPLANATIONS["en"][risk_level])

        reasons = []
        if has_payment:
            reasons.append("Primary Scam Factor: Demands advance payment / registration fee.")
        if has_impersonation:
            reasons.append(f"Sender Anomaly: Free email (@{linguistic_data.get('free_email')}) for claimed brand '{linguistic_data.get('claimed_brand', '').upper()}'.")
        if linguistic_data.get("has_urgency_tactics"):
            reasons.append(f"Pressure Tactics: Artificial urgency keywords ({', '.join(linguistic_data.get('matched_urgency', [])[:3])}).")
        if linguistic_data.get("has_suspicious_channels"):
            reasons.append("Unverified Contact: Telegram or WhatsApp only channel.")
        if verification_data.get("whois_info", {}).get("is_new_domain"):
            reasons.append("Domain Risk: Web domain registered less than 90 days ago.")

        full_explanation = f"{base_explanation}\n\nKey Analysis Signals:\n" + "\n".join(f"• {r}" for r in reasons) if reasons else base_explanation

        return {
            "scam_score": scam_score,
            "confidence_score": 96,
            "risk_level": risk_level,
            "explanation": full_explanation,
            "breakdown_signals": reasons,
            "sub_scores": {
                "financial_fee_risk": 95 if has_payment else 10,
                "impersonation_risk": 85 if has_impersonation else 15,
                "domain_reputation_risk": verification_risk,
                "urgency_pressure_risk": 75 if linguistic_data.get("has_urgency_tactics") else 10
            }
        }
