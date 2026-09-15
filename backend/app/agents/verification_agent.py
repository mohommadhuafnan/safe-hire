import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, date, timedelta
from app.config import settings
from app.services.url_resolver import URLResolver

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

        # Extract domain from email if email was provided (e.g. hr@company.com -> company.com)
        if '@' in clean:
            clean = clean.split('@')[-1]

        # Strip any trailing punctuation (dots, commas, quotes, brackets)
        clean = clean.strip(".,;:()[]{}'\" \t\r\n")

        # Free webmail providers are email services, NOT an employer's company website domain!
        if clean in self.FREE_EMAIL_DOMAINS or not clean or '.' not in clean:
            return ""

        return clean

    def extract_root_domain(self, domain: str) -> str:
        """Extracts the registrable root domain (e.g. careers.google.com -> google.com, jobs.bbc.co.uk -> bbc.co.uk)."""
        return URLResolver.extract_root_domain(domain)

    def query_apilayer_whois(self, domain: str) -> Optional[Dict[str, Any]]:
        """Query APILayer WHOIS API for live domain creation date, expiration, registrar, and fake URL analysis."""
        api_key = getattr(settings, 'APILAYER_KEY', '')
        if not api_key or not domain:
            return None

        domains_to_try = [domain]
        root_dom = self.extract_root_domain(domain)
        if root_dom and root_dom != domain:
            domains_to_try.append(root_dom)

        import requests
        headers = {"apikey": api_key}

        for target_dom in domains_to_try:
            try:
                query_url = f"https://api.apilayer.com/whois/query?domain={target_dom}"
                res = requests.get(query_url, headers=headers, timeout=6)
                
                whois_data = None
                if res.status_code == 200:
                    data = res.json()
                    whois_data = data.get("result")

                if isinstance(whois_data, dict):
                    creation_str = whois_data.get("creation_date")
                    expiration_str = whois_data.get("expiration_date")
                    registrar = whois_data.get("registrar") or "ICANN Accredited Registrar"
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

                    age_formatted = URLResolver.format_domain_age(age_days)
                    status_text = (
                        f"⚠️ HIGH RISK DOMAIN: Created {age_formatted} ago (< 90 days) • {registrar}"
                        if is_fake_risk else
                        f"ESTABLISHED DOMAIN: {age_formatted} Old • {registrar}"
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
                        "domain_age_formatted": age_formatted,
                        "expiration_days_remaining": exp_days,
                        "is_new_domain": is_new,
                        "is_fake_url_risk": is_fake_risk,
                        "fake_url_reasons": fake_url_reasons,
                        "whois_status": status_text,
                        "api_verified": True
                    }
            except Exception as e:
                logger.info(f"APILayer WHOIS API query notice for {target_dom}: {e}")
        return None

    def query_rdap(self, domain: str) -> Optional[Dict[str, Any]]:
        """Query official ICANN RDAP open protocol (rdap.org) for live authoritative domain registration age."""
        if not domain:
            return None

        domains_to_try = [domain]
        root_dom = self.extract_root_domain(domain)
        if root_dom and root_dom != domain:
            domains_to_try.append(root_dom)

        import requests
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        for target_dom in domains_to_try:
            try:
                url = f"https://rdap.org/domain/{target_dom}"
                res = requests.get(url, headers=headers, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    events = data.get("events", [])
                    creation_str = None
                    exp_str = None
                    for ev in events:
                        action = str(ev.get("eventAction", "")).lower()
                        if action in ["registration", "registered", "creation", "created"]:
                            creation_str = ev.get("eventDate")
                        elif action in ["expiration", "expired"]:
                            exp_str = ev.get("eventDate")

                    now = datetime.now(timezone.utc)
                    age_days = None
                    years = None
                    is_new = False
                    if creation_str:
                        from dateutil import parser
                        dt = parser.parse(creation_str)
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        age_days = max(0, (now - dt).days)
                        years = age_days // 365
                        is_new = age_days < 90

                    registrar = "ICANN Accredited Registrar"
                    entities = data.get("entities", [])
                    for ent in entities:
                        roles = ent.get("roles", [])
                        if "registrar" in roles:
                            vcard = ent.get("vcardArray", [])
                            if len(vcard) > 1:
                                for item in vcard[1]:
                                    if item[0] == "fn" and len(item) > 3:
                                        registrar = item[3]
                                        break

                    age_formatted = URLResolver.format_domain_age(age_days)
                    status_text = (
                        f"⚠️ HIGH RISK DOMAIN: Created {age_formatted} ago (< 90 days) • {registrar}"
                        if is_new else
                        f"ESTABLISHED DOMAIN: {age_formatted} Old • {registrar}"
                    )

                    return {
                        "status": "suspicious" if is_new else "verified",
                        "domain": domain,
                        "creation_date": creation_str or "N/A",
                        "expiration_date": exp_str or "N/A",
                        "registrar": registrar,
                        "registered_days": age_days,
                        "domain_years": years,
                        "domain_age_formatted": age_formatted,
                        "is_new_domain": is_new,
                        "is_fake_url_risk": is_new,
                        "whois_status": status_text,
                        "api_verified": True
                    }
            except Exception as e:
                logger.info(f"RDAP lookup notice for {target_dom}: {e}")
        return None

    def query_certspotter_age(self, domain: str) -> Optional[Dict[str, Any]]:
        """Query Certificate Transparency log via SSLMate CertSpotter API for earliest certificate date."""
        if not domain:
            return None
        import requests
        from dateutil import parser
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        try:
            url = f"https://api.certspotter.com/v1/issuances?domain={domain}&include_subdomains=true&expand=dns_names"
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list) and data:
                    dates = []
                    for item in data:
                        nb = item.get("not_before")
                        if nb:
                            try:
                                dt = parser.parse(nb)
                                if dt.tzinfo is None:
                                    dt = dt.replace(tzinfo=timezone.utc)
                                dates.append(dt)
                            except Exception:
                                pass
                    if dates:
                        earliest_dt = min(dates)
                        now = datetime.now(timezone.utc)
                        age_days = max(0, (now - earliest_dt).days)
                        years = age_days // 365
                        is_new = age_days < 90
                        age_formatted = URLResolver.format_domain_age(age_days)
                        status_text = (
                            f"⚠️ HIGH RISK / NEW DOMAIN: Registered {age_formatted} Ago (< 90 Days) • Certificate Transparency Log"
                            if is_new else
                            f"ESTABLISHED DOMAIN: {age_formatted} Active • Certificate Transparency Log"
                        )
                        return {
                            "status": "suspicious" if is_new else "verified",
                            "domain": domain,
                            "creation_date": earliest_dt.isoformat(),
                            "registrar": "Certificate Transparency & Registry Verified",
                            "registered_days": age_days,
                            "domain_years": years,
                            "domain_age_formatted": age_formatted,
                            "is_new_domain": is_new,
                            "is_fake_url_risk": is_new,
                            "whois_status": status_text,
                            "api_verified": True
                        }
        except Exception as e:
            logger.info(f"CertSpotter notice for {domain}: {e}")
        return None

    def query_wayback_age(self, domain: str) -> Optional[Dict[str, Any]]:
        """Query Internet Archive Wayback Machine CDX API for earliest historical public snapshot."""
        if not domain:
            return None
        import requests
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        try:
            url = f"https://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&limit=1&output=json"
            res = requests.get(url, headers=headers, timeout=4)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list) and len(data) > 1:
                    ts = data[1][1]  # YYYYMMDDhhmmss
                    dt = datetime.strptime(ts[:8], "%Y%m%d").replace(tzinfo=timezone.utc)
                    now = datetime.now(timezone.utc)
                    age_days = max(0, (now - dt).days)
                    years = age_days // 365
                    is_new = age_days < 90
                    age_formatted = URLResolver.format_domain_age(age_days)
                    status_text = (
                        f"⚠️ HIGH RISK / NEW DOMAIN: First Recorded {age_formatted} Ago (< 90 Days) • Internet Archive CDX"
                        if is_new else
                        f"ESTABLISHED DOMAIN: {age_formatted} Active • Internet Archive CDX"
                    )
                    return {
                        "status": "suspicious" if is_new else "verified",
                        "domain": domain,
                        "creation_date": dt.isoformat(),
                        "registrar": "Internet Archive Historical Record",
                        "registered_days": age_days,
                        "domain_years": years,
                        "domain_age_formatted": age_formatted,
                        "is_new_domain": is_new,
                        "is_fake_url_risk": is_new,
                        "whois_status": status_text,
                        "api_verified": True
                    }
        except Exception as e:
            logger.info(f"Wayback CDX notice for {domain}: {e}")
        return None

    def query_tls_cert_age(self, domain: str) -> Optional[Dict[str, Any]]:
        """Direct TLS/SSL peer certificate handshake on port 443 to inspect live server certificate validity."""
        if not domain:
            return None
        import ssl
        import socket
        from dateutil import parser
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=3) as sock:
                with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    nb = cert.get('notBefore')
                    na = cert.get('notAfter')
                    issuer = cert.get('issuer')
                    issuer_name = "TLS Certificate Authority"
                    if issuer:
                        for item in issuer:
                            for sub in item:
                                if sub[0] in ['organizationName', 'commonName']:
                                    issuer_name = sub[1]
                                    break
                    if nb:
                        dt = parser.parse(nb)
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        now = datetime.now(timezone.utc)
                        age_days = max(0, (now - dt).days)
                        years = age_days // 365
                        is_new = age_days < 90
                        age_formatted = URLResolver.format_domain_age(age_days)
                        status_text = (
                            f"⚠️ NEW TLS RECORD: Active {age_formatted} (< 90 Days) • {issuer_name}"
                            if is_new else
                            f"ACTIVE VERIFIED DOMAIN: {age_formatted} TLS History • {issuer_name}"
                        )
                        return {
                            "status": "suspicious" if is_new else "verified",
                            "domain": domain,
                            "creation_date": dt.isoformat(),
                            "expiration_date": na or "N/A",
                            "registrar": issuer_name,
                            "registered_days": age_days,
                            "domain_years": years,
                            "domain_age_formatted": age_formatted,
                            "is_new_domain": is_new,
                            "is_fake_url_risk": is_new,
                            "whois_status": status_text,
                            "api_verified": True
                        }
        except Exception as e:
            logger.info(f"TLS certificate handshake notice for {domain}: {e}")
        return None

    def check_whois(self, domain: str) -> Dict[str, Any]:
        """Check domain WHOIS records for age and registrant info via APILayer, RDAP, python-whois, CertSpotter, Wayback CDX, and TLS."""
        domain_clean = self.extract_clean_domain(domain)
        if not domain_clean:
            return {
                "status": "not_applicable",
                "domain": "N/A",
                "registered_days": None,
                "domain_years": None,
                "domain_age_formatted": "Unavailable",
                "is_new_domain": False,
                "whois_status": "No Domain Provided",
                "api_verified": False
            }

        # 1. Primary: APILayer WHOIS API (supports root domain fallback for subdomains)
        apilayer_res = self.query_apilayer_whois(domain_clean)
        if apilayer_res and apilayer_res.get("registered_days") is not None:
            return apilayer_res

        # 2. Secondary: Official ICANN RDAP live protocol (free, unlimited, authoritative)
        rdap_res = self.query_rdap(domain_clean)
        if rdap_res and rdap_res.get("registered_days") is not None:
            return rdap_res

        # 3. Tertiary: Certificate Transparency log via CertSpotter (global, supports .lk and ccTLDs)
        certspotter_res = self.query_certspotter_age(domain_clean)
        if certspotter_res and certspotter_res.get("registered_days") is not None:
            return certspotter_res

        # 4. Quaternary: Internet Archive Wayback Machine CDX (authoritative historical web crawl)
        wayback_res = self.query_wayback_age(domain_clean)
        if wayback_res and wayback_res.get("registered_days") is not None:
            return wayback_res

        # 5. Quinary: Direct live TLS Certificate Peer Handshake on port 443
        tls_res = self.query_tls_cert_age(domain_clean)
        if tls_res and tls_res.get("registered_days") is not None:
            return tls_res

        # 6. Senary: python-whois library
        root_dom = self.extract_root_domain(domain_clean)
        domains_to_try_whois = [domain_clean]
        if root_dom and root_dom != domain_clean:
            domains_to_try_whois.append(root_dom)

        for target_dom in domains_to_try_whois:
            try:
                import whois
                w = whois.whois(target_dom)
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
                    age_formatted = URLResolver.format_domain_age(age_days)
                    registrar = getattr(w, 'registrar', None) or "ICANN Accredited Registrar"
                    status_text = f"Registered < 90 Days Ago ({age_formatted}) • {registrar}" if is_new else f"Established Domain: {age_formatted} Old • {registrar}"
                    
                    return {
                        "status": "suspicious" if is_new else "verified",
                        "domain": domain_clean,
                        "creation_date": creation_date.isoformat(),
                        "registrar": registrar,
                        "registered_days": age_days,
                        "domain_years": years,
                        "domain_age_formatted": age_formatted,
                        "is_new_domain": is_new,
                        "whois_status": status_text,
                        "api_verified": True
                    }
            except Exception as e:
                logger.info(f"python-whois lookup notice for {target_dom}: {e}")

        # 7. Fallback: Check DNS resolution & institutional/high-trust TLDs
        import socket
        dns_resolved = False
        try:
            socket.gethostbyname(domain_clean)
            dns_resolved = True
        except Exception:
            pass

        is_suspicious_tld = any(domain_clean.endswith(tld) for tld in self.SUSPICIOUS_TLDS)
        is_high_trust = any(domain_clean.endswith(tld) for tld in self.HIGH_TRUST_TLDS)

        now_utc = datetime.now(timezone.utc)
        if is_suspicious_tld:
            return {
                "status": "suspicious",
                "domain": domain_clean,
                "creation_date": "N/A",
                "registered_days": 15,
                "domain_years": 0,
                "domain_age_formatted": "Unavailable (< 90 Days High Risk TLD)",
                "is_new_domain": True,
                "whois_status": f"Suspicious TLD Extension ({domain_clean.split('.')[-1]}) — High Risk",
                "api_verified": False
            }

        if dns_resolved and is_high_trust:
            return {
                "status": "verified",
                "domain": domain_clean,
                "creation_date": "N/A",
                "registered_days": None,
                "domain_years": None,
                "domain_age_formatted": "Institutional Domain (Active DNS)",
                "is_new_domain": False,
                "whois_status": f"Active Official Institutional Domain ({domain_clean}) • DNS Verified",
                "api_verified": True
            }

        if dns_resolved:
            return {
                "status": "verified",
                "domain": domain_clean,
                "creation_date": "N/A",
                "registered_days": None,
                "domain_years": None,
                "domain_age_formatted": "Unavailable",
                "is_new_domain": False,
                "whois_status": f"Active Live Domain ({domain_clean}) • Registration age unavailable",
                "api_verified": False
            }

        return {
            "status": "unavailable",
            "domain": domain_clean,
            "creation_date": "N/A",
            "registered_days": None,
            "domain_years": None,
            "domain_age_formatted": "Unavailable",
            "is_new_domain": False,
            "whois_status": "Public registration data unavailable for this domain",
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
        invalid_phones: list = None,
        domain_source: str = "none",
        domain_source_label: str = "No Domain Found",
        domain_source_priority: int = 5,
        is_social_wrapper: bool = False,
        social_platform: Optional[str] = None,
        redirect_chain: Optional[list] = None,
        resolved_url: str = "",
        submitted_url: str = ""
    ) -> Dict[str, Any]:
        target_domain = self.extract_clean_domain(domain)
        if not target_domain and text:
            urls = re.findall(r'https?://[^\s"\'<>]+', text)
            if urls:
                target_domain = self.extract_clean_domain(urls[0])
            if not target_domain:
                wwws = re.findall(r'\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', text, re.IGNORECASE)
                if wwws:
                    target_domain = self.extract_clean_domain(wwws[0])
            if not target_domain:
                dom_candidates = re.findall(r'\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev)\b', text, re.IGNORECASE)
                for cand in dom_candidates:
                    c_clean = self.extract_clean_domain(cand)
                    if c_clean and c_clean not in self.FREE_EMAIL_DOMAINS:
                        target_domain = c_clean
                        break

        # Check if domain was categorized as a social wrapper or URL shortener
        if not is_social_wrapper and target_domain:
            cat = URLResolver.classify_domain(target_domain)
            if cat in ("SOCIAL_PLATFORM", "URL_SHORTENER"):
                is_social_wrapper = True
                social_platform = social_platform or URLResolver.SOCIAL_PLATFORMS.get(URLResolver.extract_root_domain(target_domain))

        # Only perform WHOIS analysis if a genuine employer/company domain was identified
        if is_social_wrapper or not target_domain:
            effective_employer_domain = ""
            whois_res = {
                "status": "not_applicable",
                "domain": "",
                "creation_date": "N/A",
                "registered_days": None,
                "domain_years": None,
                "domain_age_formatted": "N/A (No Domain in Poster)",
                "is_new_domain": False,
                "whois_status": f"No standalone employer domain specified in poster" + (f" (Hosted on {social_platform})" if social_platform else ""),
                "api_verified": False
            }
            safe_browsing_res = self.check_safe_browsing(target_domain) if target_domain else {
                "status": "not_applicable",
                "flagged": False,
                "threat_types": [],
                "details": "No external employer domain provided"
            }
        else:
            effective_employer_domain = target_domain
            whois_res = self.check_whois(target_domain)
            safe_browsing_res = self.check_safe_browsing(target_domain)

        target_emails = emails or re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text or "")
        email_validation_res = self.validate_email(target_emails[0]) if target_emails else None

        evidence_items: List[Dict[str, Any]] = []
        trust_rating = 70  # Baseline neutral trust rating

        # Domain evidence
        if is_social_wrapper:
            evidence_items.append({
                "category": "domain_whois",
                "indicator": "social_platform_domain",
                "severity": "low",
                "evidence": f"Input URL is hosted on a social platform ({social_platform or 'Social Media'}). Employer's standalone company domain was not specified in the poster/posting."
            })
        elif effective_employer_domain:
            if whois_res.get("is_new_domain"):
                trust_rating -= 35
                evidence_items.append({
                    "category": "domain_whois",
                    "indicator": "new_domain_registration",
                    "severity": "high",
                    "evidence": f"Employer domain '{effective_employer_domain}' was registered recently ({whois_res.get('domain_age_formatted', '< 90 days')}) or uses a high-risk TLD"
                })
            elif whois_res.get("status") == "verified":
                trust_rating += 15
                evidence_items.append({
                    "category": "domain_whois",
                    "indicator": "established_domain",
                    "severity": "low",
                    "evidence": f"Employer domain '{effective_employer_domain}' has an established registry history ({whois_res.get('domain_age_formatted', 'Active')})"
                })

                if safe_browsing_res.get("flagged"):
                    trust_rating -= 40
                    evidence_items.append({
                        "category": "web_safety",
                        "indicator": "safe_browsing_flag",
                        "severity": "high",
                        "evidence": f"URL '{target_domain}' flagged for security threats by Safe Browsing"
                    })

        # Email evidence & Domain alignment cross-check
        domain_match_res = {"match": None, "details": "N/A"}
        if email_validation_res and email_validation_res.get("email"):
            em_val = email_validation_res["email"]
            if "@" in em_val and target_domain:
                email_dom = em_val.split("@")[-1].lower().strip()
                domain_match_res = URLResolver.compare_domains(target_domain, email_dom)
                if domain_match_res.get("match") is False:
                    if not is_social_wrapper:
                        trust_rating -= 25
                    evidence_items.append({
                        "category": "contact_verification",
                        "indicator": "domain_email_mismatch",
                        "severity": "high" if not is_social_wrapper else "medium",
                        "evidence": domain_match_res.get("details") or f"Domain discrepancy: Job vacancy domain is '{target_domain}', but recruiter contact email uses '@{email_dom}'."
                    })

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
            "domain": "" if is_social_wrapper else (effective_employer_domain or ""),
            "primary_domain": "" if is_social_wrapper else (effective_employer_domain or ""),
            "domain_source": domain_source,
            "domain_source_label": domain_source_label,
            "domain_source_priority": domain_source_priority,
            "is_social_wrapper": is_social_wrapper,
            "social_platform": social_platform,
            "redirect_chain": redirect_chain or [],
            "resolved_url": resolved_url,
            "submitted_url": submitted_url,
            "whois_info": whois_res,
            "safe_browsing": safe_browsing_res,
            "email_validation": email_validation_res,
            "phone_validation": phone_val_result,
            "domain_match": domain_match_res.get("match"),
            "domain_match_details": domain_match_res.get("details"),
            "verification_trust_score": trust_rating,
            "evidence_items": evidence_items,
            "is_verified_corporate_domain": bool(target_domain and not is_social_wrapper and trust_rating > 70 and not whois_res.get("is_new_domain"))
        }
