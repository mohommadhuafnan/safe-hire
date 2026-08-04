import logging
from typing import List, Dict, Any

logger = logging.getLogger("safe_hire.recommendation_agent")

class RecommendationAgent:
    """Agent 5: Generates dynamic, poster-tailored, context-aware safety recommendations."""

    def generate_recommendations(
        self,
        scam_score: int,
        risk_factors: dict,
        verification_data: dict,
        language: str = "en",
        reasoning_data: dict = None,
        intake_data: dict = None
    ) -> List[str]:
        """
        Generate poster-specific safety recommendations analyzing the exact entities,
        emails, domains, fees, and messaging channels of the submitted job posting.
        """
        reasoning_data = reasoning_data or {}
        intake_data = intake_data or {}
        risk_factors = risk_factors or {}
        verification_data = verification_data or {}

        ai_recs = reasoning_data.get("recommendations", [])
        if isinstance(ai_recs, list) and len(ai_recs) >= 3:
            logger.info("Using AI Reasoning Agent's poster-tailored safety recommendations.")
            return [str(r).strip() for r in ai_recs if str(r).strip()]

        dynamic_recs: List[str] = []

        # 1. Extracted Recruiter Email & Abstract API Validation Signal
        email_val = verification_data.get("email_validation") or {}
        extracted_emails = (intake_data.get("metadata_extracted") or {}).get("emails", [])
        contact_email = email_val.get("email") or (extracted_emails[0] if extracted_emails else None)

        if contact_email:
            if email_val.get("is_disposable_email"):
                dynamic_recs.append(
                    f"📧 DISPOSABLE EMAIL ALERT: Recruiter email '{contact_email}' was flagged as a temporary/disposable address. Authentic recruiters use permanent corporate domain emails."
                )
            elif email_val.get("is_smtp_valid") is False:
                dynamic_recs.append(
                    f"📧 FAILED EMAIL SMTP CHECK: Mail server checks for '{contact_email}' failed. Do NOT send identity documents (NIC, Passport, Bank Details) to this address."
                )
            else:
                dynamic_recs.append(
                    f"📧 RECRUITER EMAIL VERIFICATION: Verify '{contact_email}' directly against the official HR directory of the claimed company before sending personal CV details."
                )

        # 2. Claimed Brand & Impersonation Signal
        claimed_brand = risk_factors.get("claimed_brand") or intake_data.get("claimed_brand")
        free_email = risk_factors.get("free_email")
        if claimed_brand:
            if free_email or risk_factors.get("has_impersonation_risk"):
                dynamic_recs.append(
                    f"⚠️ BRAND IMPERSONATION ALERT ({claimed_brand.upper()}): This job flyer claims to represent '{claimed_brand}' but uses a free or unverified email ({contact_email or '@gmail.com'}). Cross-check on {claimed_brand}'s official career portal directly."
                )
            else:
                dynamic_recs.append(
                    f"🏢 BRAND CAREER PORTAL CROSS-CHECK: Look up this vacancy directly on '{claimed_brand}'s official website or official LinkedIn page before responding."
                )

        # 3. Exact Fee Terms & Financial Payment Demand Signal
        matched_payment = risk_factors.get("matched_payment")
        if risk_factors.get("has_payment_demand") or matched_payment:
            payment_term = matched_payment if matched_payment else "advance application/registration fee"
            dynamic_recs.append(
                f"🚨 CRITICAL FEE DEMAND WARNING: This poster explicitly demands '{payment_term}'. Legitimate employers NEVER charge job seekers for applications, laptop deposits, uniforms, or training."
            )

        # 4. Domain & Google Safe Browsing / WHOIS Intelligence Signal
        domain = verification_data.get("domain")
        whois_info = verification_data.get("whois_info") or {}
        safe_browsing = verification_data.get("safe_browsing") or {}

        if domain:
            if safe_browsing.get("flagged"):
                threats = ", ".join(safe_browsing.get("threat_types", ["MALWARE"]))
                dynamic_recs.append(
                    f"🌐 UNSAFE WEBSITE THREAT: Google Safe Browsing flagged '{domain}' for security threats ({threats}). Do NOT visit this link or enter credentials."
                )
            elif whois_info.get("is_new_domain"):
                reg_days = whois_info.get("registered_days", "< 90")
                dynamic_recs.append(
                    f"🌐 NEW UNVERIFIED DOMAIN: The website domain '{domain}' was registered only {reg_days} days ago. Fraudulent recruitment schemes frequently use new domains to evade security filters."
                )

        # 5. Messaging Channel & Contact Medium Signal
        matched_channels = risk_factors.get("matched_suspicious_terms")
        extracted_telegrams = (intake_data.get("metadata_extracted") or {}).get("telegram_handles", [])
        extracted_phones = (intake_data.get("metadata_extracted") or {}).get("phone_numbers", [])

        if risk_factors.get("has_suspicious_channels") or extracted_telegrams or matched_channels:
            contact_handle = extracted_telegrams[0] if extracted_telegrams else (matched_channels if matched_channels else "Telegram/WhatsApp")
            dynamic_recs.append(
                f"📵 INFORMAL MESSAGING CAUTION: This offer directs applicants to informal channels ({contact_handle}). Genuine recruitment takes place via corporate portals, official ATS systems, or verified company emails."
            )

        # 6. Overall Scam Score High Risk Guidance
        if scam_score >= 60:
            dynamic_recs.append(
                "REPORT SUSPICIOUS OFFER: Inform your University Career Guidance Unit or lodge a complaint with national cyber crime reporting portals (e.g., cybercrime.gov.lk / cybercrime.gov.in)."
            )
        else:
            dynamic_recs.append(
                "VERIFY ON LINKEDIN: Look up the recruiter's full name and current employer on LinkedIn to confirm their employment status."
            )

        # Ensure recommendations are non-empty and unique
        seen = set()
        final_recs = []
        for r in dynamic_recs:
            clean_r = r.strip()
            if clean_r and clean_r not in seen:
                seen.add(clean_r)
                final_recs.append(clean_r)

        return final_recs

