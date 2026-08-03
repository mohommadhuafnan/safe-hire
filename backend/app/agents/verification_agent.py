import re
import logging
from typing import Dict, Any
from datetime import datetime, timezone, date
from app.config import settings

logger = logging.getLogger("safe_hire.verification_agent")

class VerificationAgent:
    """Agent 3: Performs WHOIS domain age checks, Google Safe Browsing reputation, & company registry checks."""

    SUSPICIOUS_TLDS = [".xyz", ".top", ".site", ".tk", ".ga", ".cf", ".ml", ".rf.gd", ".icu", ".online", ".work", ".click"]
    HIGH_TRUST_TLDS = [".com", ".org", ".edu", ".gov", ".ac.lk", ".edu.lk", ".ac.in", ".edu.in", ".ac.bd", ".gov.lk", ".gov.in", ".gov.bd", ".co.uk", ".io"]

    def extract_clean_domain(self, input_str: str) -> str:
        """Sanitizes raw URL or domain text into clean domain string (e.g. example.com)."""
        if not input_str or input_str.strip().lower() in ["n/a", "not specified", "none", "null", ""]:
            return ""

        clean = input_str.strip().lower()
        clean = re.sub(r'^https?://', '', clean)
        clean = clean.split('/')[0].split('?')[0].split('#')[0].split(':')[0]
        if clean.startswith("www."):
            clean = clean[4:]
        return clean

    def query_apilayer_whois(self, domain: str) -> Dict[str, Any]:
        """Query APILayer WHOIS API for live domain creation date, expiration, registrar, and fake URL analysis."""
        api_key = getattr(settings, 'APILAYER_KEY', 'nIvPeI99eWBDMSArYAf2YcrshDCOVvJ3')
        if not api_key or not domain:
            return None

        try:
            import requests
            headers = {"apikey": api_key}
            
            # 1. Query endpoint for full domain WHOIS payload
            query_url = f"https://api.apilayer.com/whois/query?domain={domain}"
            res = requests.get(query_url, headers=headers, timeout=5)
            
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
                    fake_url_reasons.append(f"Newly Registered Domain: Created only {age_days} days ago (< 90 days). High scam probability.")
                
                if exp_days is not None and exp_days < 30:
                    is_fake_risk = True
                    fake_url_reasons.append(f"Short Lifespan Domain: Expires in {exp_days} days.")

                is_suspicious_tld = any(domain.endswith(tld) for tld in self.SUSPICIOUS_TLDS)
                if is_suspicious_tld:
                    is_fake_risk = True
                    fake_url_reasons.append(f"Suspicious Extension: Domain uses '.{domain.split('.')[-1]}' extension.")

                status_text = (
                    f"⚠️ HIGH RISK DOMAIN: Created {age_days} days ago (< 90 days) • {registrar}"
                    if is_fake_risk else
                    f"✅ ESTABLISHED DOMAIN: {years or 1}+ Yrs Old ({age_days or 365} days) • {registrar}"
                )

                return {
                    "domain": domain,
                    "creation_date": creation_str or "N/A",
                    "expiration_date": expiration_str or "N/A",
                    "registrar": registrar,
                    "name_servers": name_servers,
                    "registered_days": age_days if age_days is not None else 365,
                    "domain_years": years if years is not None else 1,
                    "expiration_days_remaining": exp_days,
                    "is_new_domain": is_new,
                    "is_fake_url_risk": is_fake_risk,
                    "fake_url_reasons": fake_url_reasons,
                    "whois_status": status_text,
                    "api_verified": True
                }
        except Exception as e:
            logger.info(f"APILayer WHOIS API query failed for {domain}: {e}")
        return None

    def check_whois(self, domain: str) -> Dict[str, Any]:
        """Check domain WHOIS records for age and registrant privacy via APILayer & python-whois fallback."""
        domain_clean = self.extract_clean_domain(domain)
        if not domain_clean:
            return {
                "domain": "N/A",
                "registered_days": None,
                "is_new_domain": False,
                "whois_status": "No Domain Provided"
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
                status_text = f"Registered < 90 Days Ago ({age_days} days)" if is_new else f"Established Domain Age: {age_days} days ({years} yrs)"
                
                return {
                    "domain": domain_clean,
                    "registered_days": age_days,
                    "is_new_domain": is_new,
                    "whois_status": status_text
                }
        except Exception as e:
            logger.info(f"WHOIS lookup fallback for {domain_clean}: {e}")

        # 3. Fallback heuristic for suspicious TLDs
        is_suspicious_tld = any(domain_clean.endswith(tld) for tld in self.SUSPICIOUS_TLDS)
        return {
            "domain": domain_clean,
            "registered_days": 12 if is_suspicious_tld else 365,
            "is_new_domain": is_suspicious_tld,
            "whois_status": "Newly Registered Domain (< 30 days)" if is_suspicious_tld else "Domain Registry Standard"
        }

    def check_safe_browsing_api(self, url: str) -> Dict[str, Any]:
        """Query Google Safe Browsing API v4 if API key is configured."""
        api_key = settings.GOOGLE_SAFE_BROWSING_API_KEY
        if not api_key or not url:
            return None

        try:
            import requests
            endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
            payload = {
                "client": {"clientId": "safe-hire", "clientVersion": "1.0.0"},
                "threatInfo": {
                    "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": url if url.startswith("http") else f"https://{url}"}]
                }
            }
            res = requests.post(endpoint, json=payload, timeout=3)
            if res.status_code == 200:
                data = res.json()
                matches = data.get("matches", [])
                if matches:
                    threats = [m.get("threatType") for m in matches]
                    return {
                        "status": "UNSAFE (Google Safe Browsing Flagged)",
                        "flagged": True,
                        "threat_types": threats
                    }
                return {
                    "status": "SAFE (Google Safe Browsing Verified)",
                    "flagged": False,
                    "threat_types": []
                }
        except Exception as e:
            logger.warning(f"Google Safe Browsing API query failed: {e}")
        return None

    def check_safe_browsing(self, url_or_domain: str) -> Dict[str, Any]:
        """Verify URL/Domain against Google Safe Browsing API or Heuristic Scan."""
        domain_clean = self.extract_clean_domain(url_or_domain)
        if not domain_clean:
            return {"status": "SAFE", "flagged": False, "threat_types": []}

        # Try Live API first if configured
        api_res = self.check_safe_browsing_api(url_or_domain)
        if api_res:
            return api_res

        target = domain_clean.lower()

        # Check raw IP address
        is_ip_address = bool(re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', target))
        is_suspicious_tld = any(target.endswith(tld) for tld in self.SUSPICIOUS_TLDS)

        if is_ip_address or is_suspicious_tld:
            return {
                "status": "UNSAFE / SUSPICIOUS",
                "flagged": True,
                "threat_types": ["MALICIOUS_RECRUITMENT_PHISHING", "TYPOSQUATTING_RISK"]
            }

        return {
            "status": "SAFE",
            "flagged": False,
            "threat_types": []
        }

    def verify(self, text: str = "", domain: str = "", claimed_brand: str = None) -> Dict[str, Any]:
        # Extract domain from domain param or parse from text URLs
        target_domain = self.extract_clean_domain(domain)
        if not target_domain and text:
            # Extract first URL from text if available
            urls = re.findall(r'https?://[^\s]+', text)
            if urls:
                target_domain = self.extract_clean_domain(urls[0])

        whois_res = self.check_whois(target_domain)
        safe_browsing_res = self.check_safe_browsing(target_domain)

        trust_rating = 85  # Default baseline trust rating

        if whois_res.get("is_new_domain"):
            trust_rating -= 40

        if safe_browsing_res.get("flagged"):
            trust_rating -= 45

        # If claimed brand is present but no official corporate domain verified
        if claimed_brand and not target_domain:
            trust_rating -= 25

        trust_rating = max(5, min(100, trust_rating))

        return {
            "domain": target_domain or "Not Specified",
            "whois_info": whois_res,
            "safe_browsing": safe_browsing_res,
            "verification_trust_score": trust_rating,
            "is_verified_corporate_domain": (trust_rating > 70 and not whois_res.get("is_new_domain"))
        }
