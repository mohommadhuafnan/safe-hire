import re
import logging

logger = logging.getLogger("safe_hire.linguistic_agent")

class LinguisticRiskAgent:
    """Agent 2: Detects linguistic risk factors (EMSCAD signals, urgency, fee requests, impersonation)."""

    URGENCY_KEYWORDS = {
        "en": [
            "offer expires today", "instant selection without interview", "limited seats left apply in 1 hour", 
            "urgent hiring pay now", "guaranteed job in 24 hours", "act fast before slots close",
            "immediate hiring", "apply immediately", "limited vacancy", "urgent requirement", "spot selection"
        ],
        "si": [
            "පැය 24න් ක්ෂණික පත්වීම්", "මුදල් ගෙවා අදම රැකියාව ලබාගන්න", "සීමිත ඇබෑර්තු පැය 2කින් අවසන්",
            "වහාම අයදුම් කරන්න", "ක්ෂණික බඳවාගැනීම්"
        ],
        "ta": [
            "24 மணி நேரத்தில் வேலை", "உடனடி வேலைக்கு பணம் செலுத்தவும்", "உடனடி ஆட்சேர்ப்பு", "உடனே விண்ணப்பிக்கவும்"
        ],
        "hi": [
            "24 घंटे में तुरंत चयन", "सीमित सीटें आज ही पैसे जमा करें", "तुरंत भर्ती", "सीमित अवसर"
        ],
        "bn": [
            "২৪ ঘণ্টার মধ্যে নিশ্চিত চাকরি", "অবিলম্বে টাকা জমা দিন", "জরুরী নিয়োগ", "সীমিত আসন"
        ]
    }

    # Expanded payment keywords across currencies (LKR, Rs, INR, USD, $, TK)
    PAYMENT_KEYWORDS = {
        "en": [
            "registration fee", "processing fee", "refundable deposit", "security fee", "security deposit",
            "buy kit", "training fee", "laptop fee", "pay first", "send money", "id card charge", "interview fee",
            "admission fee", "uniform fee", "medical fee", "application fee", "joining fee", "service charge",
            "pay lkr", "pay rs", "pay inr", "pay $", "pay usd", "registration charge", "advance payment",
            "transfer fee", "fee required", "small deposit", "refundable charge", "gpay", "phonepe", "paytm",
            "easycash", "bkash", "nagad", "bank transfer fee"
        ],
        "si": [
            "ලියාපදිංචි ගාස්තුව", "තැන්පතු මුදල", "සැකසුම් ගාස්තුව", "මුදල් ගෙවන්න", "ඇප මුදල",
            "ගාස්තු අය කෙරේ", "ලියාපදිංචි මුදල", "මුදල් තැන්පත් කරන්න", "අත්පිට මුදල්"
        ],
        "ta": [
            "பதிவு கட்டணம்", "செயலாக்க கட்டணம்", "முன்பணம்", "பணம் செலுத்துங்கள்", "கட்டணம் செலுத்தவும்", "பாதுகாப்பு வைப்பு"
        ],
        "hi": [
            "पंजीकरण शुल्क", "प्रोसेसिंग फीस", "सुरक्षा जमा", "पैसा भेजें", "रजिस्ट्रेशन चार्ज",
            "फीस जमा करें", "एडवांस पेमेंट", "इंटरव्यू फीस"
        ],
        "bn": [
            "নিবন্ধন ফি", "প্রসেসিং ফি", "জামানত", "টাকা দিন", "রেজিস্ট্রেশন ফি", "আবেদন ফি", "অগ্রিম টাকা"
        ]
    }

    IMPERSONATION_FREE_EMAILS = [
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "yandex.com", "protonmail.com", "icloud.com", "gmx.com"
    ]
    
    CLAIMED_BRANDS = [
        "google", "amazon", "microsoft", "dialog", "virtusa", "wso2", "tcs", "infosys", "unilever", 
        "hayleys", "john keells", "sbi", "boc", "sampath bank", "hcl", "wipro", "accenture", "ibm",
        "nestle", "mas holdings", "brandix", "keells", "peoples bank", "commercial bank"
    ]

    SUSPICIOUS_CONTACTS = [
        "telegram", "t.me", "whatsapp only", "dm on telegram", "inbox me", "contact on whatsapp", 
        "no interview", "copy paste job", "typing job", "data entry $", "earn 1000 daily", 
        "work 2 hours earn", "guaranteed income", "no qualification required", "direct joining", "no experience required earn"
    ]

    def analyze(self, text: str = "", language: str = "en") -> dict:
        text_lower = (text or "").lower()

        # 1. Urgency Detection
        urgency_matches = []
        for lang_code, kw_list in self.URGENCY_KEYWORDS.items():
            for kw in kw_list:
                if kw in text_lower:
                    urgency_matches.append(kw)

        # 2. Payment/Fee Request Detection (ignoring explicit negative disclaimer phrases)
        negative_fee_phrases = [
            "no registration fee", "no fee", "no deposit", "no payment", "free application", 
            "never charge", "no upfront", "zero cost", "without any fee", "without payment", "no money required"
        ]
        has_negative_disclaimer = any(neg in text_lower for neg in negative_fee_phrases)

        payment_matches = []
        if not has_negative_disclaimer:
            for lang_code, kw_list in self.PAYMENT_KEYWORDS.items():
                for kw in kw_list:
                    if kw in text_lower:
                        payment_matches.append(kw)

            # Regex fallback for currency amounts attached to fee/deposit terms
            currency_fee_regex = r'\b(fee|deposit|charge|payment|registration|processing|pay)\b[^\n\.]{0,30}\b(lkr|rs\.?|inr|\$|usd|tk)\.?\s?\d+'
            regex_matches = re.findall(currency_fee_regex, text_lower)
            if regex_matches:
                for m in regex_matches:
                    match_str = " ".join(m) if isinstance(m, tuple) else str(m)
                    payment_matches.append(match_str)

        # 3. Impersonation & Free Email Domain Risk
        impersonation_flags = []
        claimed_brand_found = ""
        for brand in self.CLAIMED_BRANDS:
            if brand in text_lower:
                claimed_brand_found = brand
                break

        free_email_found = ""
        for free_email in self.IMPERSONATION_FREE_EMAILS:
            if f"@{free_email}" in text_lower or free_email in text_lower:
                free_email_found = free_email
                break

        if claimed_brand_found and free_email_found:
            impersonation_flags.append(f"Claimed corporate brand '{claimed_brand_found.upper()}' associated with generic free email domain (@{free_email_found}).")
        elif free_email_found and ("hiring" in text_lower or "vacancy" in text_lower or "apply" in text_lower):
            impersonation_flags.append(f"Recruitment offer uses informal free email address (@{free_email_found}) instead of an official company domain.")

        # 4. Suspicious Contact Channels & Unreal Pay
        suspicious_contact_matches = []
        for term in self.SUSPICIOUS_CONTACTS:
            if term in text_lower:
                suspicious_contact_matches.append(term)

        # Calculate score (0-100)
        urgency_score = min(len(urgency_matches) * 20, 40)
        payment_score = 75 if len(payment_matches) > 0 else 0
        impersonation_score = 50 if impersonation_flags else 0
        contact_score = min(len(suspicious_contact_matches) * 25, 50)

        # Total linguistic risk calculation
        raw_risk_score = urgency_score + payment_score + impersonation_score + contact_score
        linguistic_risk_score = min(raw_risk_score, 100)

        return {
            "linguistic_score": linguistic_risk_score,
            "has_payment_demand": len(payment_matches) > 0,
            "has_urgency_tactics": len(urgency_matches) > 0,
            "has_impersonation_risk": len(impersonation_flags) > 0,
            "has_suspicious_channels": len(suspicious_contact_matches) > 0,
            "matched_urgency": list(set(urgency_matches)),
            "matched_payment": list(set(payment_matches)),
            "impersonation_flags": impersonation_flags,
            "matched_suspicious_terms": list(set(suspicious_contact_matches)),
            "claimed_brand": claimed_brand_found or "",
            "free_email": free_email_found or ""
        }

