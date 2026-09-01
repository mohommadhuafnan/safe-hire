import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger("safe_hire.linguistic_agent")

class LinguisticRiskAgent:
    """Agent 2: Detects linguistic risk factors (EMSCAD signals, urgency, fee requests, impersonation, contact anomalies)."""

    URGENCY_KEYWORDS = {
        "en": [
            "offer expires today", "instant selection without interview", "limited seats left apply in 1 hour", 
            "urgent hiring pay now", "guaranteed job in 24 hours", "act fast before slots close",
            "immediate hiring", "apply immediately", "limited vacancy", "urgent requirement", "spot selection",
            "urgent hiring", "hiring immediately", "immediate joining", "limited seats", "apply today"
        ],
        "si": [
            "පැය 24න් ක්ෂණික පත්වීම්", "මුදල් ගෙවා අදම රැකියාව ලබාගන්න", "සීමිත ඇබෑර්තු පැය 2කින් අවසන්",
            "වහාම අයදුම් කරන්න", "ක්ෂණික බඳවාගැනීම්", "ක්ෂණික බඳවා ගැනීම්"
        ],
        "ta": [
            "24 மணி நேரத்தில் வேலை", "உடனடி வேலைக்கு பணம் செலுத்தவும்", "உடனடி ஆட்சேர்ப்பு", "உடனே விண்ணப்பிக்கவும்",
            "அவசர ஆட்சேர்ப்பு", "உடனடி வேலை"
        ],
        "hi": [
            "24 घंटे में तुरंत चयन", "सीमित सीटें आज ही पैसे जमा करें", "तुरंत भर्ती", "सीमित अवसर", "तत्काल भर्ती"
        ],
        "bn": [
            "২৪ ঘণ্টার মধ্যে নিশ্চিত চাকরি", "অবিলম্বে টাকা জমা দিন", "জরুরী নিয়োগ", "সীমিত আসন", "তাৎক্ষণিক নিয়োগ"
        ]
    }

    PAYMENT_KEYWORDS = {
        "en": [
            "registration fee", "processing fee", "refundable deposit", "security fee", "security deposit",
            "buy kit", "training fee", "laptop fee", "pay first", "send money", "id card charge", "interview fee",
            "admission fee", "uniform fee", "medical fee", "application fee", "joining fee", "service charge",
            "pay lkr", "pay rs", "pay inr", "pay $", "pay usd", "registration charge", "advance payment",
            "transfer fee", "fee required", "small deposit", "refundable charge", "gpay", "phonepe", "paytm",
            "easycash", "bkash", "nagad", "bank transfer fee", "refundable registration fee", "starter kit fee"
        ],
        "si": [
            "ලියාපදිංචි ගාස්තුව", "තැන්පතු මුදල", "සැකසුම් ගාස්තුව", "මුදල් ගෙවන්න", "ඇප මුදල",
            "ගාස්තු අය කෙරේ", "ලියාපදිංචි මුදල", "මුදල් තැන්පත් කරන්න", "අත්පිට මුදල්", "ලියාපදිංචි ගාස්තු"
        ],
        "ta": [
            "பதிவு கட்டணம்", "செயலாக்க கட்டணம்", "முன்பணம்", "பணம் செலுத்துங்கள்", "கட்டணம் செலுத்தவும்", "பாதுகாப்பு வைப்பு",
            "விண்ணப்பக் கட்டணம்", "பதிவுக் கட்டணம்"
        ],
        "hi": [
            "पंजीकरण शुल्क", "प्रोसेसिंग फीस", "सुरक्षा जमा", "पैसा भेजें", "रजिस्ट्रेशन चार्ज",
            "फीस जमा करें", "एडवांस पेमेंट", "इंटरव्यू फीस", "आवेदन शुल्क"
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
        evidence_items: List[Dict[str, Any]] = []

        # 1. Urgency Detection
        urgency_matches = []
        for lang_code, kw_list in self.URGENCY_KEYWORDS.items():
            for kw in kw_list:
                if kw in text_lower and kw not in urgency_matches:
                    urgency_matches.append(kw)

        if urgency_matches:
            evidence_items.append({
                "category": "linguistic_pressure",
                "indicator": "artificial_urgency_tactics",
                "severity": "medium",
                "evidence": f"Pressure / urgency terms found: {', '.join(urgency_matches[:3])}"
            })

        # 2. Payment / Upfront Fee Request Detection
        negative_fee_patterns = [
            r'\bno\b[^\.\n]{0,40}\b(fee|fees|deposit|deposits|payment|payments|charge|charges)\b',
            r'\bnever\s+charge[sd]?\b',
            r'\bwithout\s+(any\s+)?(fee|fees|payment|deposit|charge|money)\b',
            r'\bfree\s+(of\s+charge|application|registration|recruitment|joining)\b',
            r'\bzero\s+(cost|fee|fees|charge)\b',
            r'\bnot?\s+charge[sd]?\b',
            r'\bno\s+money\s+required\b',
            r'ගාස්තු\s+(අය\s+නොකෙරේ|නැත|අය\s+නොකරයි)',
            r'கட்டணம்\s+(இல்லை|செலுத்த\s+தேவையில்லை)'
        ]
        has_negative_disclaimer = any(re.search(pat, text_lower) for pat in negative_fee_patterns)

        payment_matches = []
        if not has_negative_disclaimer:
            for lang_code, kw_list in self.PAYMENT_KEYWORDS.items():
                for kw in kw_list:
                    if kw in text_lower and kw not in payment_matches:
                        payment_matches.append(kw)

            # Regex fallback for currency amounts attached to fee/deposit terms
            currency_fee_regex = r'\b(fee|deposit|charge|payment|registration|processing|pay)\b[^\n\.]{0,30}\b(lkr|rs\.?|inr|\$|usd|tk)\.?\s?\d+'
            regex_matches = re.findall(currency_fee_regex, text_lower)
            if regex_matches:
                for m in regex_matches:
                    match_str = " ".join(m) if isinstance(m, tuple) else str(m)
                    if match_str not in payment_matches:
                        payment_matches.append(match_str)

        if payment_matches:
            evidence_items.append({
                "category": "financial",
                "indicator": "upfront_fee_demand",
                "severity": "high",
                "evidence": f"Upfront fee / deposit terms demanded: {', '.join(payment_matches[:3])}"
            })

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
            msg = f"Claimed corporate brand '{claimed_brand_found.upper()}' associated with generic free email (@{free_email_found})"
            impersonation_flags.append(msg)
            evidence_items.append({
                "category": "company_impersonation",
                "indicator": "brand_free_email_mismatch",
                "severity": "high",
                "evidence": msg
            })
        elif free_email_found and ("hiring" in text_lower or "vacancy" in text_lower or "apply" in text_lower):
            msg = f"Recruitment advertisement uses free generic email (@{free_email_found}) instead of official company domain"
            impersonation_flags.append(msg)
            evidence_items.append({
                "category": "contact",
                "indicator": "free_email_domain",
                "severity": "medium",
                "evidence": msg
            })

        # 4. Suspicious Contact Channels
        suspicious_contact_matches = []
        for term in self.SUSPICIOUS_CONTACTS:
            if term in text_lower and term not in suspicious_contact_matches:
                suspicious_contact_matches.append(term)

        if suspicious_contact_matches:
            evidence_items.append({
                "category": "contact",
                "indicator": "informal_contact_channel",
                "severity": "medium",
                "evidence": f"Informal/untraceable channels or unrealistic terms: {', '.join(suspicious_contact_matches[:3])}"
            })

        # Calculate linguistic risk sub-score
        urgency_score = min(len(urgency_matches) * 20, 40)
        payment_score = 75 if len(payment_matches) > 0 else 0
        impersonation_score = 50 if impersonation_flags else 0
        contact_score = min(len(suspicious_contact_matches) * 25, 50)

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
            "free_email": free_email_found or "",
            "evidence_items": evidence_items
        }
