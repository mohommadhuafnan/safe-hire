"""
URL Resolution and Domain Classification Engine for SAFE-HIRE.
Handles safe shortener expansion, HTTP redirect chain tracking,
domain classification (Employer vs Social Platform vs Shortener vs Webmail),
and 4-tier domain extraction priority.
"""

import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

logger = logging.getLogger("safe_hire.url_resolver")

class URLResolver:
    # Known URL Shorteners
    SHORTENER_DOMAINS = {
        "lnkd.in", "bit.ly", "tinyurl.com", "t.co", "ow.ly", "buff.ly",
        "is.gd", "cutt.ly", "goo.gl", "qr.ae", "rb.gy", "rebrand.ly",
        "shorte.st", "tiny.cc", "bit.do", "bl.ink", "hyperurl.co"
    }

    # Known Social Platforms & Messaging Portals (Not employer application domains)
    SOCIAL_PLATFORMS = {
        "linkedin.com": "LinkedIn",
        "lnkd.in": "LinkedIn",
        "facebook.com": "Facebook",
        "fb.com": "Facebook",
        "fb.me": "Facebook",
        "instagram.com": "Instagram",
        "instagr.am": "Instagram",
        "twitter.com": "X (Twitter)",
        "x.com": "X (Twitter)",
        "t.co": "X (Twitter)",
        "tiktok.com": "TikTok",
        "telegram.org": "Telegram",
        "telegram.me": "Telegram",
        "t.me": "Telegram",
        "whatsapp.com": "WhatsApp",
        "wa.me": "WhatsApp",
        "api.whatsapp.com": "WhatsApp",
        "youtube.com": "YouTube",
        "youtu.be": "YouTube",
        "reddit.com": "Reddit",
        "pinterest.com": "Pinterest",
        "threads.net": "Threads",
        "snapchat.com": "Snapchat"
    }

    # Free Public Consumer Email Services
    FREE_EMAIL_DOMAINS = {
        "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk",
        "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com",
        "aol.com", "zoho.com", "mail.com", "proton.me", "protonmail.com", "yandex.com"
    }

    # Tracking / CDN / Ad Domains
    TRACKING_DOMAINS = {
        "google-analytics.com", "googletagmanager.com", "doubleclick.net",
        "cloudfront.net", "akamaihd.net", "cloudflare.com", "s3.amazonaws.com"
    }

    # Two-part country code TLDs
    TWO_PART_TLDS = {
        'co.uk', 'gov.uk', 'ac.uk', 'org.uk', 'co.in', 'gov.in', 'ac.in', 'edu.in',
        'ac.lk', 'edu.lk', 'gov.lk', 'com.lk', 'org.lk', 'co.nz', 'com.au', 'com.bd', 'ac.bd'
    }

    @staticmethod
    def extract_root_domain(domain: str) -> str:
        """
        Extract the registered apex/root domain.
        e.g. 'careers.dialog.lk' -> 'dialog.lk', 'jobs.virtusa.com' -> 'virtusa.com', 'https://dialog.lk/careers' -> 'dialog.lk'
        """
        if not domain:
            return ""

        clean_dom = URLResolver.clean_domain_string(domain)
        if not clean_dom or '.' not in clean_dom:
            return clean_dom

        parts = clean_dom.split('.')
        if len(parts) >= 3:
            last_two = f"{parts[-2]}.{parts[-1]}"
            if last_two in URLResolver.TWO_PART_TLDS:
                return '.'.join(parts[-3:])
            return '.'.join(parts[-2:])
        return clean_dom

    @staticmethod
    def clean_domain_string(input_val: str) -> str:
        """Sanitize raw URL or domain text into clean domain name."""
        if not input_val:
            return ""
        clean = str(input_val).strip().lower()
        clean = re.sub(r'^https?://', '', clean)
        clean = clean.split('/')[0].split('?')[0].split('#')[0].split(':')[0]
        if clean.startswith("www."):
            clean = clean[4:]
        if '@' in clean:
            clean = clean.split('@')[-1]
        clean = clean.strip(".,;:()[]{}'\" \t\r\n")
        return clean if ('.' in clean and len(clean) >= 4) else ""

    @staticmethod
    def classify_domain(domain: str) -> str:
        """
        Classifies domain into functional category:
        'EMPLOYER_DOMAIN' | 'SOCIAL_PLATFORM' | 'URL_SHORTENER' | 'FREE_EMAIL_SERVICE' | 'TRACKING' | 'UNKNOWN'
        """
        if not domain:
            return "UNKNOWN"
        root = URLResolver.extract_root_domain(domain)
        clean = URLResolver.clean_domain_string(domain)

        if root in URLResolver.SHORTENER_DOMAINS or clean in URLResolver.SHORTENER_DOMAINS:
            return "URL_SHORTENER"
        if root in URLResolver.SOCIAL_PLATFORMS or clean in URLResolver.SOCIAL_PLATFORMS:
            return "SOCIAL_PLATFORM"
        if root in URLResolver.FREE_EMAIL_DOMAINS or clean in URLResolver.FREE_EMAIL_DOMAINS:
            return "FREE_EMAIL_SERVICE"
        if root in URLResolver.TRACKING_DOMAINS or clean in URLResolver.TRACKING_DOMAINS:
            return "TRACKING"
        if "." in root and len(root) >= 4:
            return "EMPLOYER_DOMAIN"
        return "UNKNOWN"

    @staticmethod
    def strip_tracking_params(url_str: str) -> str:
        """Remove marketing & tracking parameters (utm_*, trk, ref, fbclid, etc.)."""
        if not url_str or "?" not in url_str:
            return url_str
        try:
            parsed = urlparse(url_str)
            params = parse_qs(parsed.query, keep_blank_values=False)
            tracking_keys = {
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'trk', 'trackingid', 'ref', 'fbclid', 'gclid', 'mc_eid', '_hsenc',
                'tracking_id', 'share_id', 'midToken', 'trkInfo'
            }
            cleaned_params = {k: v for k, v in params.items() if k.lower() not in tracking_keys}
            new_query = urlencode(cleaned_params, doseq=True)
            return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
        except Exception:
            return url_str

    @staticmethod
    def resolve_url(input_url: str, max_redirects: int = 6) -> Dict[str, Any]:
        """
        Safely resolves shorteners & follows HTTP redirects to identify the destination domain.
        Returns full redirect chain, final URL, final registered domain, and social platform tags.
        """
        if not input_url or not str(input_url).strip():
            return {
                "original_url": "",
                "final_url": "",
                "final_domain": "",
                "root_domain": "",
                "redirect_chain": [],
                "is_shortened": False,
                "social_platform": None,
                "domain_category": "UNKNOWN"
            }

        raw_url = str(input_url).strip()
        if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
            raw_url = "https://" + raw_url

        original_domain = URLResolver.clean_domain_string(raw_url)
        is_shortener = original_domain in URLResolver.SHORTENER_DOMAINS or URLResolver.extract_root_domain(original_domain) in URLResolver.SHORTENER_DOMAINS
        social_name = URLResolver.SOCIAL_PLATFORMS.get(URLResolver.extract_root_domain(original_domain)) or URLResolver.SOCIAL_PLATFORMS.get(original_domain)

        redirect_chain = [raw_url]
        current_url = raw_url

        # Follow redirects safely with custom User-Agent
        import requests
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SAFE-HIRE/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

        try:
            with requests.Session() as session:
                session.headers.update(headers)
                
                # Use GET with stream=True so large payloads are not downloaded
                for step in range(max_redirects):
                    res = session.get(current_url, allow_redirects=False, timeout=5, stream=True)
                    
                    # Capture HTTP redirect headers
                    if res.status_code in (301, 302, 303, 307, 308) and "Location" in res.headers:
                        next_url = res.headers["Location"].strip()
                        if not next_url.startswith("http"):
                            from urllib.parse import urljoin
                            next_url = urljoin(current_url, next_url)
                        
                        if next_url in redirect_chain:
                            logger.info(f"Redirect loop detected at {next_url}. Stopping.")
                            break
                        
                        redirect_chain.append(next_url)
                        current_url = next_url
                    else:
                        # Reached terminal endpoint
                        current_url = res.url or current_url
                        break
        except Exception as e:
            logger.info(f"URL resolution network notice for {raw_url}: {e}")

        clean_final_url = URLResolver.strip_tracking_params(current_url)
        final_domain = URLResolver.clean_domain_string(clean_final_url)
        root_domain = URLResolver.extract_root_domain(final_domain)

        # Check social name on final domain if changed
        final_social = URLResolver.SOCIAL_PLATFORMS.get(root_domain) or URLResolver.SOCIAL_PLATFORMS.get(final_domain)
        category = URLResolver.classify_domain(root_domain)

        return {
            "original_url": raw_url,
            "final_url": clean_final_url,
            "final_domain": final_domain,
            "root_domain": root_domain,
            "redirect_chain": redirect_chain,
            "is_shortened": is_shortener or len(redirect_chain) > 1,
            "social_platform": final_social or social_name,
            "domain_category": category
        }

    @staticmethod
    def select_primary_employer_domain(
        poster_domains: List[str] = None,
        text_domains: List[str] = None,
        resolved_domain: str = "",
        email_domain: str = "",
        submitted_domain: str = "",
        claimed_brand: str = ""
    ) -> Dict[str, Any]:
        """
        Applies the authoritative 4-Tier Domain Selection Priority:
        Priority 1: Explicit Employer Domain on Job Poster (Vision AI / OCR)
        Priority 2: Explicit Employer URL in Page / Post Text
        Priority 3: Final Resolved Redirect Destination
        Priority 4: Wrapper / Social Platform Domain (Fallback, clearly tagged)
        """
        poster_domains = poster_domains or []
        text_domains = text_domains or []

        all_candidates = []

        # 1. Inspect Poster Domains (Priority 1)
        for d in poster_domains:
            c = URLResolver.clean_domain_string(d)
            if c:
                cat = URLResolver.classify_domain(c)
                if cat == "EMPLOYER_DOMAIN":
                    root = URLResolver.extract_root_domain(c)
                    return {
                        "primary_domain": root,
                        "full_hostname": c,
                        "domain_source": "poster_ocr",
                        "domain_source_label": "Job Poster / Flyer",
                        "domain_source_priority": 1,
                        "domain_category": "EMPLOYER_DOMAIN",
                        "is_social_wrapper": False
                    }
                else:
                    all_candidates.append((c, cat, "poster_ocr", 1))

        # 2. Inspect Text Domains (Priority 2)
        for d in text_domains:
            c = URLResolver.clean_domain_string(d)
            if c:
                cat = URLResolver.classify_domain(c)
                if cat == "EMPLOYER_DOMAIN":
                    root = URLResolver.extract_root_domain(c)
                    return {
                        "primary_domain": root,
                        "full_hostname": c,
                        "domain_source": "page_text",
                        "domain_source_label": "Job Description Text",
                        "domain_source_priority": 2,
                        "domain_category": "EMPLOYER_DOMAIN",
                        "is_social_wrapper": False
                    }
                else:
                    all_candidates.append((c, cat, "page_text", 2))

        # 3. Inspect Resolved Redirect Destination (Priority 3)
        if resolved_domain:
            c = URLResolver.clean_domain_string(resolved_domain)
            if c:
                cat = URLResolver.classify_domain(c)
                if cat == "EMPLOYER_DOMAIN":
                    root = URLResolver.extract_root_domain(c)
                    return {
                        "primary_domain": root,
                        "full_hostname": c,
                        "domain_source": "redirect_destination",
                        "domain_source_label": "Resolved Link Destination",
                        "domain_source_priority": 3,
                        "domain_category": "EMPLOYER_DOMAIN",
                        "is_social_wrapper": False
                    }
                else:
                    all_candidates.append((c, cat, "redirect_destination", 3))

        # 3b. Check Contact Corporate Email Domain
        if email_domain:
            c = URLResolver.clean_domain_string(email_domain)
            if c:
                cat = URLResolver.classify_domain(c)
                if cat == "EMPLOYER_DOMAIN":
                    root = URLResolver.extract_root_domain(c)
                    return {
                        "primary_domain": root,
                        "full_hostname": c,
                        "domain_source": "email_domain",
                        "domain_source_label": "Contact Email Domain",
                        "domain_source_priority": 3,
                        "domain_category": "EMPLOYER_DOMAIN",
                        "is_social_wrapper": False
                    }

        # 4. Fallback: Wrapper / Social Platform Domain
        fallback_dom = URLResolver.clean_domain_string(submitted_domain or resolved_domain or (poster_domains[0] if poster_domains else ""))
        if fallback_dom:
            root = URLResolver.extract_root_domain(fallback_dom)
            cat = URLResolver.classify_domain(root)
            social_name = URLResolver.SOCIAL_PLATFORMS.get(root)
            label = f"Social Platform ({social_name})" if social_name else ("URL Shortener" if cat == "URL_SHORTENER" else "Submitted Platform")

            return {
                "primary_domain": root,
                "full_hostname": fallback_dom,
                "domain_source": "social_platform" if social_name else "submitted_url",
                "domain_source_label": label,
                "domain_source_priority": 4,
                "domain_category": cat,
                "is_social_wrapper": True,
                "social_platform": social_name
            }

        # None found
        return {
            "primary_domain": "",
            "full_hostname": "",
            "domain_source": "none",
            "domain_source_label": "No Domain Found",
            "domain_source_priority": 5,
            "domain_category": "UNKNOWN",
            "is_social_wrapper": False
        }

    @staticmethod
    def format_domain_age(age_days: Optional[int]) -> str:
        """Formats domain age into human-readable representation: e.g. '2 years 8 months' or 'Unavailable'."""
        if age_days is None:
            return "Unavailable"
        if age_days < 0:
            return "Unavailable"
        if age_days == 0:
            return "Less than 1 day"
        if age_days < 30:
            return f"{age_days} {'day' if age_days == 1 else 'days'}"
        if age_days < 365:
            months = age_days // 30
            days = age_days % 30
            if days > 0:
                return f"{months} {'month' if months == 1 else 'months'} {days} {'day' if days == 1 else 'days'}"
            return f"{months} {'month' if months == 1 else 'months'}"
        years = age_days // 365
        rem_days = age_days % 365
        months = rem_days // 30
        if months > 0:
            return f"{years} {'year' if years == 1 else 'years'} {months} {'month' if months == 1 else 'months'}"
        return f"{years} {'year' if years == 1 else 'years'}"

    @staticmethod
    def compare_domains(domain1: str, domain2: str) -> Dict[str, Any]:
        """Compares two domains (e.g. application domain vs email domain) for alignment."""
        if not domain1 or not domain2:
            return {"match": None, "details": "Insufficient domain data for comparison"}
        r1 = URLResolver.extract_root_domain(domain1)
        r2 = URLResolver.extract_root_domain(domain2)
        if not r1 or not r2:
            return {"match": None, "details": "Insufficient domain data"}
        if r1 == r2:
            return {"match": True, "details": f"Direct domain match ({r1})"}
        if r2 in URLResolver.FREE_EMAIL_DOMAINS:
            return {"match": False, "details": f"Recruiter contact email uses a free public email service (@{r2}) rather than the official registered corporate domain ({r1})."}
        return {"match": False, "details": f"Mismatch detected: application domain '{r1}' differs from contact email domain '{r2}'."}
