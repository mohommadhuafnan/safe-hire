import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, date
from app.config import settings

logger = logging.getLogger("safe_hire.verification_agent")

class VerificationAgent:
    """Agent 3: Performs WHOIS domain age checks, Google Safe Browsing reputation, & email delivery checks."""

    SUSPICIOUS_TLDS = [".xyz", ".top", ".site", ".tk", ".ga", ".cf", ".ml", ".rf.gd", ".icu", ".online", ".work", ".click", ".buzz", ".monster", ".fit"]
    HIGH_TRUST_TLDS = [".com", ".org", ".edu", ".gov", ".ac.lk", ".edu.lk", ".ac.in", ".edu.in", ".ac.bd", ".gov.lk", ".gov.in", ".gov.bd", ".co.uk", ".io", ".net"]
    FREE_EMAIL_DOMAINS = {
        "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk",
        "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com",
        "aol.com", "zoho.com", "mail.com", "proton.me", "protonmail.com", "yandex.com"
    }

    def extract_clean_domain(self, input_str: str) -> str:
        """Sanitizes raw URL or domain text into clean domain string (e.g. example.com). Filters out public webmail providers."""
        if not input_str or str(input_str).strip().lower() in ["n/a", "not specified", "none", "null", ""]:
            return ""

        clean = str(input_str).strip().lower()
        clean = re.sub(r'^https?://', '', clean)
        clean = clean.split('/')[0].split('?')[0].split('#')[0].split(':')[0]
        if clean.startswith("www."):
            clean = clean[4:]

        # Free webmail providers are email services, NOT an employer's company website domain!
        if clean in self.FREE_EMAIL_DOMAINS:
            return ""

        return clean

    def query_apilayer_whois(self, domain: str) -> Optional[Dict[str, Any]]:
        """Query APILayer WHOIS API for live domain creation date, expiration, registrar, and fake URL analysis."""
        api_key = getattr(settings, 'APILAYER_KEY', '')
        if not api_key or not domain:
            return None

        try:
            import requests
            headers = {"apikey": api_key}
            query_url = f"https://api.apilayer.com/whois/query?domain={domain}"
            res = requests.get(query_url, headers=headers, timeout=8)
            
            whois_data = None
            if res.status_code == 200:
                data = res.json()
                whois_data = data.get("result")

            if isinstance(whois_data, dict):
                creation_str = whois_data.get("creation_date")
                expiration_str = whois_data.get("expiration_date")
                registrar = whois_data.get("registrar") or "Domain Registrar"
                name_servers = whois_data.get("name_servers") or []

                age_days = None
                years = None
                is_new = False
                exp_days = None

                now = datetime.now(timezone.utc)
                if creation_str:
                    try:
                        from dateutil import parser
                        creation_date = parser.parse(creation_str)
                        if creation_date.tzinfo is None:
                            creation_date = creation_date.replace(tzinfo=timezone.utc)
                        age_days = max(0, (now - creation_date).days)
                        years = age_days // 365
                        is_new = age_days < 90
                    except Exception as e:
                        logger.info(f"Creation date parse notice: {e}")

                if expiration_str:
                    try:
                        from dateutil import parser
                        exp_date = parser.parse(expiration_str)
                        if exp_date.tzinfo is None:
                            exp_date = exp_date.replace(tzinfo=timezone.utc)
                        exp_days = (exp_date - now).days
                    except Exception as e:
                        logger.info(f"Expiration date parse notice: {e}")

                fake_url_reasons = []
                is_fake_risk = False

                if is_new:
                    is_fake_risk = True
                    fake_url_reasons.append(f"Newly Registered Domain: Created only {age_days} days ago (< 90 days).")
                
                if exp_days is not None and exp_days < 30:
                    is_fake_risk = True
                    fake_url_reasons.append(f"Short Lifespan Domain: Expires in {exp_days} days.")

                is_suspicious_tld = any(domain.endswith(tld) for tld in self.SUSPICIOUS_TLDS)
                if is_suspicious_tld:
                    is_fake_risk = True
                    fake_url_reasons.append(f"Suspicious Extension: Domain uses '{domain.split('.')[-1]}' extension.")

                status_text = (
                    f"⚠️ HIGH RISK DOMAIN: Created {age_days} days ago (< 90 days) • {registrar}"
                    if is_fake_risk else
                    f"ESTABLISHED DOMAIN: {years or 1}+ Yrs Old ({age_days or 365} days) • {registrar}"
                )

                return {
                    "status": "suspicious" if is_fake_risk else "verified",
                    "domain": domain,
                    "creation_date": creation_str or "N/A",
                    "expiration_date": expiration_str or "N/A",
                    "registrar": registrar,
                    "name_servers": name_servers,
                    "registered_days": age_days,
                    "domain_years": years,
                    "expiration_days_remaining": exp_days,
                    "is_new_domain": is_new,
                    "is_fake_url_risk": is_fake_risk,
                    "fake_url_reasons": fake_url_reasons,
                    "whois_status": status_text,
                    "api_verified": True
                }
        except Exception as e:
            logger.info(f"APILayer WHOIS API query notice for {domain}: {e}")
        return None

    def check_whois(self, domain: str) -> Dict[str, Any]:
        """Check domain WHOIS records for age and registrant info."""
        domain_clean = self.extract_clean_domain(domain)
        if not domain_clean:
            return {
                "status": "not_applicable",
                "domain": "N/A",
                "registered_days": None,
                "is_new_domain": False,
                "whois_status": "No Domain Provided",
                "api_verified": False
            }

        # 1. Primary: APILayer WHOIS API
        apilayer_res = self.query_apilayer_whois(domain_clean)
        if apilayer_res:
            return apilayer_res

        # 2. Secondary: python-whois library
        try:
            import whois
            w = whois.whois(domain_clean)
            creation_date = w.creation_date
            
            if isinstance(creation_date, list):
                creation_date = creation_date[0] if len(creation_date) > 0 else None
            
            if isinstance(creation_date, str):
                try:
                    from dateutil import parser
                    creation_date = parser.parse(creation_date)
                except Exception:
                    creation_date = None
            elif isinstance(creation_date, date) and not isinstance(creation_date, datetime):
                creation_date = datetime.combine(creation_date, datetime.min.time())

            if isinstance(creation_date, datetime):
                now = datetime.now(timezone.utc)
                if creation_date.tzinfo is None:
                    creation_date = creation_date.replace(tzinfo=timezone.utc)
                age_days = max(0, (now - creation_date).days)
                is_new = age_days < 90
                years = age_days // 365
                status_text = f"Registered < 90 Days Ago ({age_days} days)" if is_new else f"Established Domain: {age_days} days ({years} yrs)"
                
                return {
                    "status": "suspicious" if is_new else "verified",
                    "domain": domain_clean,
                    "registered_days": age_days,
                    "is_new_domain": is_new,
                    "whois_status": status_text,
                    "api_verified": True
                }
        except Exception as e:
            logger.info(f"python-whois lookup notice for {domain_clean}: {e}")

        # 3. Fallback: Suspicious TLD heuristic
        is_suspicious_tld = any(domain_clean.endswith(tld) for tld in self.SUSPICIOUS_TLDS)
        if is_suspicious_tld:
            return {
                "status": "suspicious",
                "domain": domain_clean,
                "registered_days": None,
                "is_new_domain": True,
                "whois_status": "Suspicious TLD Extension (.xyz/.top/.site/etc.) — Live WHOIS unavailable",
                "api_verified": False
            }

        return {
            "status": "unavailable",
            "domain": domain_clean,
            "registered_days": None,
            "is_new_domain": False,
            "whois_status": "WHOIS registry check unavailable",
            "api_verified": False
        }

    def check_safe_browsing(self, url_or_domain: str) -> Dict[str, Any]:
        """Verify URL/Domain against Google Safe Browsing API or heuristic threat check."""
        domain_clean = self.extract_clean_domain(url_or_domain)
        if not domain_clean:
            return {
                "status": "not_applicable",
                "flagged": False,
                "threat_types": [],
                "details": "No URL/Domain provided"
            }

        api_key = getattr(settings, 'GOOGLE_SAFE_BROWSING_API_KEY', '')
        target_url = f"https://{domain_clean}"

        if api_key:
            try:
                import requests
                endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
                payload = {
                    "client": {"clientId": "safe-hire", "clientVersion": "1.0"},
                    "threatInfo": {
                        "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                        "platformTypes": ["ANY_PLATFORM"],
                        "threatEntryTypes": ["URL"],
                        "threatEntries": [{"url": target_url}]
                    }
                }
                res = requests.post(endpoint, json=payload, timeout=6)
                if res.status_code == 200:
                    data = res.json()
                    matches = data.get("matches", [])
                    if matches:
                        threats = [m.get("threatType") for m in matches]
                        return {
                            "status": "malicious",
                            "flagged": True,
                            "threat_types": threats,
                            "raw_matches": matches,
                            "details": f"Flagged by Google Safe Browsing: {', '.join(threats)}",
                            "api_verified": True
                        }
                    else:
                        return {
                            "status": "verified",
                            "flagged": False,
                            "threat_types": [],
                            "details": "Clean / No threats detected by Google Safe Browsing",
                            "api_verified": True
                        }
                else:
                    logger.info(f"Google Safe Browsing HTTP {res.status_code}")
            except Exception as e:
                logger.info(f"Google Safe Browsing notice: {e}")

        # Check raw IP address or suspicious TLDs
        is_ip_address = bool(re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', domain_clean))
        is_suspicious_tld = any(domain_clean.endswith(tld) for tld in self.SUSPICIOUS_TLDS)

        if is_ip_address or is_suspicious_tld:
            return {
                "status": "suspicious",
                "flagged": True,
                "threat_types": ["MALICIOUS_RECRUITMENT_PHISHING", "TYPOSQUATTING_RISK"],
                "details": "Suspicious domain structure / TLD extension",
                "api_verified": False
            }

        return {
            "status": "unavailable",
            "flagged": False,
            "threat_types": [],
            "details": "Safe Browsing live API unavailable — No obvious IP/TLD anomalies",
            "api_verified": False
        }

    def validate_email(self, email: str) -> Dict[str, Any]:
        """Validate recruiter email address deliverability, disposable domains, and SMTP status."""
        if not email or "@" not in email:
            return {
                "status": "not_applicable",
                "email": "",
                "is_disposable_email": False,
                "is_smtp_valid": None,
                "analysis_summary": "No contact email provided",
                "api_verified": False
            }

        email_clean = email.strip().lower()
        domain_part = email_clean.split('@')[-1] if '@' in email_clean else ''
        user_part = email_clean.split('@')[0] if '@' in email_clean else ''

        # 1. Try Abstract API if key configured
        api_key = getattr(settings, 'ABSTRACT_EMAIL_API_KEY', '')
        if api_key:
            try:
                import requests
                url = "https://emailvalidation.abstractapi.com/v1/"
                params = {"api_key": api_key, "email": email_clean}
                res = requests.get(url, params=params, timeout=6)
                if res.status_code == 200:
                    data = res.json()
                    deliverability = data.get("deliverability", "UNKNOWN")
                    is_disposable = data.get("is_disposable_email", {}).get("value") if isinstance(data.get("is_disposable_email"), dict) else data.get("is_disposable_email", False)
                    is_smtp_valid = data.get("is_smtp_valid", {}).get("value") if isinstance(data.get("is_smtp_valid"), dict) else data.get("is_smtp_valid", True)
                    is_free_email = data.get("is_free_email", {}).get("value") if isinstance(data.get("is_free_email"), dict) else data.get("is_free_email", False)
                    quality_score = float(data.get("quality_score", 0.50)) if data.get("quality_score") is not None else 0.50

                    is_high_risk = bool(is_disposable or is_smtp_valid is False or deliverability == "UNDELIVERABLE")
                    return {
                        "status": "suspicious" if is_high_risk else "verified",
                        "email": email_clean,
                        "deliverability": deliverability,
                        "quality_score": quality_score,
                        "is_free_email": is_free_email,
                        "is_disposable_email": is_disposable,
                        "is_smtp_valid": is_smtp_valid,
                        "is_high_risk": is_high_risk,
                        "analysis_summary": f"Email verified via Abstract API: {deliverability} (disposable={is_disposable})",
                        "api_verified": True
                    }
            except Exception as e:
                logger.info(f"Abstract Email API notice: {e}")

        # 2. Local disposable and domain inspection
        disposable_domains = [
            "mailinator.com", "tempmail.com", "10minutemail.com", "trashmail.com",
            "guerrillamail.com", "yopmail.com", "dispostable.com", "temp-mail.org",
            "sharklasers.com", "getairmail.com", "tempmail.net", "fakemailgenerator.com",
            "throwawaymail.com", "maildrop.cc"
        ]
        free_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "zoho.com"]

        is_disposable = domain_part in disposable_domains or any(d in domain_part for d in ["temp", "disposable", "throwaway", "trash", "mailinator"])
        is_free = domain_part in free_domains
        is_valid_fmt = bool(re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$', email_clean))

        if is_disposable:
            return {
                "status": "suspicious",
                "email": email_clean,
                "deliverability": "UNDELIVERABLE",
                "quality_score": 0.1,
                "is_free_email": False,
                "is_disposable_email": True,
                "is_smtp_valid": False,
                "is_high_risk": True,
                "analysis_summary": f"Disposable temporary email address detected (@{domain_part})",
                "api_verified": False
            }

        return {
            "status": "verified" if is_valid_fmt else "suspicious",
            "email": email_clean,
            "deliverability": "DELIVERABLE" if is_valid_fmt else "UNKNOWN",
            "quality_score": 0.6 if is_free else 0.85,
            "is_free_email": is_free,
            "is_disposable_email": False,
            "is_smtp_valid": True if is_valid_fmt else False,
            "is_high_risk": False,
            "analysis_summary": f"Format validated ({email_clean}). Free email provider: {is_free}",
            "api_verified": False
        }

    def verify(
        self, 
        text: str = "", 
        domain: str = "", 
        claimed_brand: str = None, 
        emails: list = None,
        phones: list = None,
        invalid_phones: list = None
    ) -> Dict[str, Any]:
        target_domain = self.extract_clean_domain(domain)
        if not target_domain and text:
            urls = re.findall(r'https?://[^\s]+', text)
            if urls:
                target_domain = self.extract_clean_domain(urls[0])

        whois_res = self.check_whois(target_domain)
        safe_browsing_res = self.check_safe_browsing(target_domain)

        target_emails = emails or re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text or "")
        email_validation_res = self.validate_email(target_emails[0]) if target_emails else None

        evidence_items: List[Dict[str, Any]] = []
        trust_rating = 70  # Baseline neutral trust rating

        # Domain evidence
        if target_domain:
            if whois_res.get("is_new_domain"):
                trust_rating -= 35
                evidence_items.append({
                    "category": "domain_whois",
                    "indicator": "new_domain_registration",
                    "severity": "high",
                    "evidence": f"Domain '{target_domain}' was registered recently (< 90 days) or uses a high-risk TLD"
                })
            elif whois_res.get("status") == "verified":
                trust_rating += 15
                evidence_items.append({
                    "category": "domain_whois",
                    "indicator": "established_domain",
                    "severity": "low",
                    "evidence": f"Domain '{target_domain}' has an established WHOIS history ({whois_res.get('registered_days', 'N/A')} days)"
                })

            if safe_browsing_res.get("flagged"):
                trust_rating -= 40
                evidence_items.append({
                    "category": "web_safety",
                    "indicator": "safe_browsing_flag",
                    "severity": "high",
                    "evidence": f"URL '{target_domain}' flagged for security threats by Safe Browsing"
                })

        # Email evidence
        if email_validation_res:
            if email_validation_res.get("is_disposable_email"):
                trust_rating -= 35
                evidence_items.append({
                    "category": "contact_verification",
                    "indicator": "disposable_email",
                    "severity": "high",
                    "evidence": f"Contact email '{email_validation_res.get('email')}' is a temporary/disposable address"
                })

        # Phone evidence
        phone_val_result = None
        if invalid_phones:
            trust_rating -= 15
            evidence_items.append({
                "category": "contact_verification",
                "indicator": "invalid_phone_number",
                "severity": "medium",
                "evidence": f"Contact telephone number '{invalid_phones[0]}' is malformed, invalid, or an artificial sequence."
            })
            phone_val_result = {
                "has_phone": True,
                "is_valid": False,
                "phone_number": invalid_phones[0],
                "status": "INVALID_FORMAT",
                "summary": f"Suspicious or malformed phone number format ({invalid_phones[0]})"
            }
        elif phones:
            phone_val_result = {
                "has_phone": True,
                "is_valid": True,
                "phone_number": phones[0],
                "status": "VALID_FORMAT",
                "summary": f"Standard phone number format ({phones[0]})"
            }

        # Corporate brand mismatch
        if claimed_brand and not target_domain:
            trust_rating -= 15
            evidence_items.append({
                "category": "brand_verification",
                "indicator": "missing_corporate_domain",
                "severity": "medium",
                "evidence": f"Advertiser claims brand '{claimed_brand}' but no official corporate domain was provided"
            })

        trust_rating = max(5, min(95, trust_rating))

        return {
            "domain": target_domain or "",
            "whois_info": whois_res,
            "safe_browsing": safe_browsing_res,
            "email_validation": email_validation_res,
            "phone_validation": phone_val_result,
            "verification_trust_score": trust_rating,
            "evidence_items": evidence_items,
            "is_verified_corporate_domain": bool(target_domain and trust_rating > 70 and not whois_res.get("is_new_domain"))
        }
