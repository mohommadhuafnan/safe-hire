import re
import logging

logger = logging.getLogger("safe_hire.linguistic_agent")

class LinguisticRiskAgent:
    """Agent 2: Detects linguistic risk factors (EMSCAD signals, urgency, fee requests, impersonation)."""

    URGENCY_KEYWORDS = {
        "en": ["offer expires today", "instant selection without interview", "limited seats left apply in 1 hour", "urgent hiring pay now", "guaranteed job in 24 hours", "act fast before slots close"],
        "si": ["පැය 24න් ක්ෂණික පත්වීම්", "මුදල් ගෙවා අදම රැකියාව ලබාගන්න", "සීමිත ඇබෑර්තු පැය 2කින් අවසන්"],
        "ta": ["24 மணி நேரத்தில் வேலை", "உடனடி வேலைக்கு பணம் செலுத்தவும்"],
        "hi": ["24 घंटे में तुरंत चयन", "सीमित सीटें आज ही पैसे जमा करें"],
        "bn": ["২৪ ঘণ্টার মধ্যে নিশ্চিত চাকরি", "অবিলম্বে টাকা জমা দিন"]
    }

    PAYMENT_KEYWORDS = {
        "en": ["registration fee", "processing fee", "refundable deposit", "security fee", "buy kit", "training fee", "laptop fee", "pay first", "send money", "id card charge"],
        "si": ["ලියාපදිංචි ගාස්තුව", "තැන්පතු මුදල", "සැකසුම් ගාස්තුව", "මුදල් ගෙවන්න", "ඇප මුදල"],
        "ta": ["பதிவு கட்டணம்", "செயலாக்க கட்டணம்", "முன்பணம்", "பணம் செலுத்துங்கள்"],
        "hi": ["पंजीकरण शुल्क", "प्रोसेसिंग फीस", "सुरक्षा जमा", "पैसा भेजें", "रजिस्ट्रेशन चार्ज"],
        "bn": ["নিবন্ধন ফি", "প্রসেসিং ফি", "জামানত", "টাকা দিন", "রেজিস্ট্রেশন ফি"]
    }

    IMPERSONATION_FREE_EMAILS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "yandex.com"]
    CLAIMED_BRANDS = ["google", "amazon", "microsoft", "dialog", "virtusa", "wso2", "tcs", "infosys", "unilever", "hayleys", "john keells", "sbi", "boc", "sampath bank"]

    SUSPICIOUS_CONTACTS = [
        "telegram", "t.me", "whatsapp only", "dm on telegram", "inbox me", "contact on whatsapp", "no interview", "copy paste job", "typing job", "data entry $", "earn 1000 daily"
    ]

    def analyze(self, text: str, language: str = "en") -> dict:
        text_lower = text.lower()

        # 1. Urgency Detection
        urgency_matches = []
        for lang_code, kw_list in self.URGENCY_KEYWORDS.items():
            for kw in kw_list:
                if kw in text_lower:
                    urgency_matches.append(kw)

        # 2. Payment/Fee Request Detection
        payment_matches = []
        for lang_code, kw_list in self.PAYMENT_KEYWORDS.items():
            for kw in kw_list:
                if kw in text_lower:
                    payment_matches.append(kw)

        # 3. Impersonation & Free Email Domain Risk
        impersonation_flags = []
        claimed_brand_found = None
        for brand in self.CLAIMED_BRANDS:
            if brand in text_lower:
                claimed_brand_found = brand
                break

        free_email_found = None
        for free_email in self.IMPERSONATION_FREE_EMAILS:
            if f"@{free_email}" in text_lower or free_email in text_lower:
                free_email_found = free_email
                break

        if claimed_brand_found and free_email_found:
            impersonation_flags.append(f"Claimed corporate brand '{claimed_brand_found.upper()}' associated with generic free email domain (@{free_email_found}).")

        # 4. Suspicious Contact Channels & Unreal Pay
        suspicious_contact_matches = []
        for term in self.SUSPICIOUS_CONTACTS:
            if term in text_lower:
                suspicious_contact_matches.append(term)

        # Calculate score (0-100)
        urgency_score = min(len(urgency_matches) * 20, 40)
        payment_score = min(len(payment_matches) * 35, 70)
        impersonation_score = 40 if impersonation_flags else 0
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
            "claimed_brand": claimed_brand_found,
            "free_email": free_email_found
        }
