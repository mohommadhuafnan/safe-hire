import re
import logging
import requests
import json
import base64
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, List
from app.config import settings
from app.services.url_resolver import URLResolver

try:
    import pytesseract
except ImportError:
    pytesseract = None

logger = logging.getLogger("safe_hire.intake_agent")


def _clean_json_str(text: str) -> Optional[dict]:
    """Robustly parse JSON object from text output with code fences or think tags."""
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
    return None


class IntakeAgent:
    """Agent 1 & Agent 2: Ingests text, image OCR, and URL; extracts metadata, contacts, language, and performs multimodal vision content classification."""

    GEMINI_VISION_MODELS = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-latest",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
    ]

    FREE_EMAIL_SERVICES = {
        "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk",
        "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com",
        "aol.com", "zoho.com", "mail.com", "proton.me", "protonmail.com", "yandex.com"
    }

    def validate_phone_candidate(self, phone_str: str) -> Dict[str, Any]:
        """Validates standard E.164 phone length (7-15 digits) and filters dummy/repetitive numbers."""
        if not phone_str:
            return {"is_valid": False, "reason": "empty"}
        clean = phone_str.strip()
        digits = re.sub(r'\D', '', clean)
        # 4-digit years like 2024, 2025, 2026 are not phone numbers
        if len(digits) == 4 and (digits.startswith("19") or digits.startswith("20")):
            return {"is_valid": False, "reason": "year", "digits": digits}
        if len(digits) < 7:
            return {"is_valid": False, "reason": "too_short", "digits": digits}
        if len(digits) > 15:
            return {"is_valid": False, "reason": "too_long", "digits": digits}
        # Check repetitive / dummy numbers like 0000000, 1111111, 9999999999
        if len(set(digits)) <= 2:
            return {"is_valid": False, "reason": "repetitive_digits", "digits": digits}
        if digits in "01234567890123456789" or digits in "98765432109876543210":
            return {"is_valid": False, "reason": "sequential_digits", "digits": digits}
        return {"is_valid": True, "reason": "valid", "digits": digits}

    @staticmethod
    def detect_language(text: str) -> str:
        """Detect language based on Unicode script block character ranges."""
        if not text:
            return "en"

        sinhala_count = len(re.findall(r'[\u0D80-\u0DFF]', text))
        tamil_count = len(re.findall(r'[\u0B80-\u0BFF]', text))
        hindi_count = len(re.findall(r'[\u0900-\u097F]', text))
        bengali_count = len(re.findall(r'[\u0980-\u09FF]', text))

        total_char = max(len(text), 1)

        counts = {
            "si": sinhala_count,
            "ta": tamil_count,
            "hi": hindi_count,
            "bn": bengali_count
        }

        max_lang, max_val = max(counts.items(), key=lambda x: x[1])
        if max_val > 4 or (max_val / total_char) > 0.08:
            return max_lang

        return "en"

    @staticmethod
    def detect_image_mime_type(image_bytes: bytes) -> str:
        """Detect MIME type from image bytes header."""
        if not image_bytes:
            return "image/jpeg"
        if image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            return "image/png"
        elif image_bytes.startswith(b'RIFF') and len(image_bytes) >= 12 and image_bytes[8:12] == b'WEBP':
            return "image/webp"
        elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):
            return "image/gif"
        elif image_bytes.startswith(b'\xff\xd8'):
            return "image/jpeg"
        return "image/png"

    @staticmethod
    def optimize_image_bytes(image_bytes: bytes, max_bytes: int = 1024 * 1024) -> bytes:
        """Optimize and compress image bytes if larger than max_bytes for fast & reliable AI processing."""
        if not image_bytes or len(image_bytes) <= max_bytes:
            return image_bytes
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes))
            img.thumbnail((1600, 1600))
            buf = io.BytesIO()
            img.convert('RGB').save(buf, format='JPEG', quality=85)
            return buf.getvalue()
        except Exception:
            return image_bytes

    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> tuple[str, str]:
        """
        Extract text from image using local Tesseract OCR with Cloud OCR fallback.
        Returns: (extracted_text, ocr_status: "SUCCESS" | "FAILED" | "NOT_APPLICABLE")
        """
        if not image_bytes:
            return "", "NOT_APPLICABLE"

        image_bytes = IntakeAgent.optimize_image_bytes(image_bytes)

        # 1. Local Tesseract OCR
        if pytesseract is not None:
            import os
            for path in [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                os.path.expanduser(r'~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe')
            ]:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    break

            try:
                from PIL import Image, ImageEnhance
                import io

                image = Image.open(io.BytesIO(image_bytes))
                image_gray = image.convert('L')
                image_contrast = ImageEnhance.Contrast(image_gray).enhance(2.0)
                
                extracted_text = pytesseract.image_to_string(image_contrast)
                if extracted_text and len(extracted_text.strip()) > 5:
                    logger.info("Successfully extracted text via local Tesseract OCR.")
                    return extracted_text.strip(), "SUCCESS"
            except Exception as e:
                logger.info(f"Local Tesseract OCR notice ({e}). Switching to Cloud OCR fallback.")

        # 2. Fast Cloud OCR API Fallback (OCR.space)
        ocr_keys = ["helloworld", "K88888888888957"]
        base64_str = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode('utf-8')
        for key in ocr_keys:
            try:
                url = "https://api.ocr.space/parse/image"
                payload = {
                    "apikey": key,
                    "base64Image": base64_str,
                    "language": "eng",
                    "isOverlayRequired": False,
                    "OCREngine": 2
                }
                res = requests.post(url, data=payload, timeout=4.0)
                if res.status_code == 200:
                    data = res.json()
                    parsed_results = data.get("ParsedResults", [])
                    if parsed_results:
                        cloud_text = parsed_results[0].get("ParsedText", "").strip()
                        if cloud_text and len(cloud_text) > 5:
                            logger.info("Successfully extracted poster text via Cloud OCR API.")
                            return cloud_text, "SUCCESS"
            except Exception as e:
                logger.warning(f"Cloud OCR API notice: {e}")
                break

        # If OCR returned empty or failed, report FAILED honestly
        return "", "FAILED"

    @staticmethod
    def analyze_poster_with_vision_ai(image_bytes: bytes, target_language: str = None) -> dict:
        """
        Multimodal Vision AI Analysis:
        Inspects the actual uploaded image.
        Determines:
        1. content_type: "job_poster" | "not_job_poster" | "unclear"
        2. is_job_poster: boolean
        3. specificCategory: specific human-readable description of what this image actually is
        4. posterSummary: dynamic 2-4 sentence explanation of the specific image content and why it is/is not recruitment
        5. Extracted entities: company, jobTitle, salary, website, email, phone, address, telegram, etc.
        """
        if not image_bytes:
            return {
                "content_type": "not_job_poster",
                "is_job_poster": False,
                "posterType": "No Image Provided",
                "specificCategory": "No Image",
                "posterSummary": "No image was provided for visual analysis.",
                "companyName": "",
                "jobTitle": "",
                "salary": "",
                "website": "",
                "email": "",
                "phone": "",
                "address": "",
                "posterText": "",
                "qrCode": ""
            }

        image_bytes = IntakeAgent.optimize_image_bytes(image_bytes)
        mime_type = IntakeAgent.detect_image_mime_type(image_bytes)
        base64_img = base64.b64encode(image_bytes).decode('utf-8')
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""

        target_lang_name = {
            "ta": "Tamil (தமிழ்)",
            "si": "Sinhala (සිංහල)",
            "hi": "Hindi (हिंदी)",
            "bn": "Bengali (বাংলা)"
        }.get(target_language, "English")

        prompt = f"""You are SAFE-HIRE's Senior Multimodal Vision & Poster Intelligence Agent.
Carefully inspect the visual content, layout, design, logos, graphics, and text in the uploaded image.

CRITICAL INSTRUCTIONS:
1. Determine whether this image is a genuine Recruitment / Employment / Job Advertisement (CLASS A) or NOT a job advertisement (CLASS B).
   - CLASS A (job_poster): Any job vacancy flyer, hiring announcement, part-time or full-time position opening, career opening, recruitment flyer for retail stores/bookshops/cafes (e.g. Sales Assistant, Cashier, Trainee, School Leavers, Clerk), internship poster, recruitment WhatsApp screenshot, appointment document, employment offer. If the image advertises ANY hiring position, it MUST be classified as CLASS A (job_poster).
   - CLASS B (not_job_poster): Food/restaurant menu, commercial discount coupon, university graduation ceremony photo, photography portfolio, birthday invitation, music festival banner, car for sale, house for rent, meme, non-recruitment document with ZERO employment offers.
   - UNCLEAR (unclear): Extremely blurry, completely unreadable, or ambiguous media.

2. Identify the specific category ("specificCategory") in {target_lang_name} (e.g. "Italian Restaurant Menu & Discount Flyer", "University Graduation Announcement", "Software Engineer Job Vacancy", "Consumer Electronics Promotion", "Personal Photo / Portrait").

3. Provide a DETAILED 2-4 sentence dynamic summary ("posterSummary") in {target_lang_name} analyzing what this specific image depicts, organizations/institutions/brands visible, dates, offers, contacts, and explicitly explain why it is or is not a job recruitment offer. DO NOT use a generic or canned template.

4. Extract any structured details present in the image (or empty string / false if not present).

Return ONLY a raw JSON object with this exact structure (no markdown formatting outside JSON):
{{
  "content_type": "job_poster | not_job_poster | unclear",
  "is_job_poster": true or false,
  "posterType": "Job Advertisement | Not a Job Advertisement | Unclear Media",
  "specificCategory": "Exact classification in {target_lang_name}",
  "posterSummary": "Detailed 2-4 sentence dynamic explanation in {target_lang_name} of what this specific image depicts",
  "companyName": "Company or Institution name if visible, else empty string",
  "jobTitle": "Job title or position if visible, else empty string",
  "salary": "Salary or compensation if visible, else empty string",
  "website": "Website or URL if visible, else empty string",
  "email": "Contact email if visible, else empty string",
  "phone": "Contact phone if visible, else empty string",
  "address": "Physical location or address if visible, else empty string",
  "posterText": "All visible text transcribed from the image",
  "qrCode": "QR code URL or content if visible, else empty string",
  "hasFeeDemand": true or false,
  "feeDetails": "Specific registration fee or deposit amount mentioned if any",
  "hasInformalChannel": true or false,
  "hasUnrealisticPromise": true or false,
  "hasUrgency": true or false
}}"""

        # 1. Primary: Google Gemini Multimodal Vision API (active models)
        if gemini_key:
            gemini_headers = {"Content-Type": "application/json", "X-goog-api-key": gemini_key}
            for model_name in IntakeAgent.GEMINI_VISION_MODELS:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                    payload = {
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt},
                                    {"inline_data": {"mime_type": mime_type, "data": base64_img}}
                                ]
                            }
                        ],
                        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 1200}
                    }
                    gemini_timeout = getattr(settings, "GEMINI_TIMEOUT", 8) or 8
                    res = requests.post(url, json=payload, headers=gemini_headers, timeout=gemini_timeout)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates") or []
                        raw_text = ""
                        if candidates and isinstance(candidates[0], dict):
                            parts = (candidates[0].get("content") or {}).get("parts") or []
                            if parts and isinstance(parts[0], dict):
                                raw_text = parts[0].get("text") or ""
                        parsed = _clean_json_str(raw_text)
                        if parsed and isinstance(parsed, dict) and ("is_job_poster" in parsed or "content_type" in parsed):
                            logger.info(f"Gemini Vision ({model_name}) classification success: content_type={parsed.get('content_type')}, is_job={parsed.get('is_job_poster')}")
                            is_job = parsed.get("is_job_poster")
                            if is_job is None:
                                is_job = (str(parsed.get("content_type", "")).lower() == "job_poster")
                            c_type = parsed.get("content_type") or ("job_poster" if is_job else "not_job_poster")
                            parsed["is_job_poster"] = bool(is_job)
                            parsed["content_type"] = c_type
                            parsed["extracted_text"] = parsed.get("posterText", "")
                            parsed["claimed_brand"] = parsed.get("companyName", "")
                            parsed["job_title"] = parsed.get("jobTitle", "")
                            parsed["contact_email"] = parsed.get("email", "")
                            parsed["phone_number"] = parsed.get("phone", "")
                            parsed["website"] = parsed.get("website", "")
                            parsed["domain"] = parsed.get("website") or parsed.get("company_website") or ""
                            parsed["specific_category"] = parsed.get("specificCategory") or parsed.get("posterType") or "Image Media"
                            parsed["poster_summary"] = parsed.get("posterSummary") or f"Analyzed image depicting {parsed.get('specificCategory', 'Media')}."
                            return parsed
                    else:
                        logger.warning(f"Gemini Vision ({model_name}) HTTP {res.status_code}: {res.text[:150]}")
                except Exception as e:
                    logger.warning(f"Gemini Vision notice for {model_name}: {e}")

        # 2. Secondary: Hugging Face Router Vision Models
        hf_token = getattr(settings, "HF_TOKEN", "") or getattr(settings, "DEEPSEEK_V4_API_KEY", "") or ""
        if hf_token:
            hf_url = getattr(settings, "HF_API_BASE_URL", "https://router.huggingface.co/v1").rstrip("/") + "/chat/completions"
            data_url = f"data:{mime_type};base64,{base64_img}"
            headers = {"Authorization": f"Bearer {hf_token}", "Content-Type": "application/json"}
            for model_name in ["Qwen/Qwen2.5-VL-7B-Instruct", "Qwen/Qwen2-VL-7B-Instruct"]:
                try:
                    payload = {
                        "model": model_name,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": data_url}}
                                ]
                            }
                        ],
                        "temperature": 0.1,
                        "max_tokens": 1500
                    }
                    res = requests.post(hf_url, headers=headers, json=payload, timeout=6)
                    if res.status_code == 200:
                        data = res.json()
                        raw_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        parsed = _clean_json_str(raw_text)
                        if parsed and isinstance(parsed, dict):
                            is_job = parsed.get("is_job_poster")
                            if is_job is None:
                                is_job = (str(parsed.get("content_type", "")).lower() == "job_poster")
                            c_type = parsed.get("content_type") or ("job_poster" if is_job else "not_job_poster")
                            parsed["is_job_poster"] = bool(is_job)
                            parsed["content_type"] = c_type
                            parsed["extracted_text"] = parsed.get("posterText", "")
                            parsed["claimed_brand"] = parsed.get("companyName", "")
                            parsed["job_title"] = parsed.get("jobTitle", "")
                            parsed["contact_email"] = parsed.get("email", "")
                            parsed["phone_number"] = parsed.get("phone", "")
                            parsed["website"] = parsed.get("website", "")
                            parsed["domain"] = parsed.get("website") or parsed.get("company_website") or ""
                            parsed["specific_category"] = parsed.get("specificCategory") or "Image Media"
                            parsed["poster_summary"] = parsed.get("posterSummary") or "Analyzed media."
                            return parsed
                except Exception as e:
                    logger.warning(f"Hugging Face Vision notice for {model_name}: {e}")

        # 3. Vision API Fallback: Run OCR and use text reasoning
        ocr_text, ocr_status = IntakeAgent.extract_text_from_image(image_bytes)
        ocr_lower = (ocr_text or "").lower()

        recruitment_keywords = [
            "we are hiring", "is hiring", "hiring for", "now hiring", "we're hiring", "hiring",
            "job vacancy", "job vacancies", "vacancy", "vacancies",
            "recruitment notice", "recruitment", "career opportunity", "career opportunities", "position available",
            "positions available", "apply now", "apply today", "apply here", "urgent vacancy", "urgent hiring", "walk-in interview",
            "full-time", "full time", "part-time", "part time", "job position", "open position",
            "sales assistant", "sales representative", "sales executive", "assistant", "cashier", "clerk", "trainee", "intern", "internship",
            "school leavers", "school leaver", "undergraduate", "freshers",
            "send your cv", "send cv", "forward cv", "forward your cv", "submit cv", "submit your cv", "email your cv", "cv to",
            "send resume", "qualifications required", "qualifications:", "qualifications", "responsibilities:", "requirements:",
            "salary:", "salary", "experience required", "employment offer", "job ad",
            "බඳවාගැනීම්", "රැකියා", "ඇබෑර්තු", "ඉල්ලුම්", "වැටුප්", "පුරප්පාඩු", "බඳවා ගනු ලැබේ",
            "வேலை", "நியமனம்", "விண்ணப்பிக்க", "சம்பளம்", "காலியிடம்", "வேலைவாய்ப்பு",
            "भर्ती", "नौकरी", "आवेदन", "वेतन", "रिक्तियां", "रोजगार",
            "নিয়োগ", "চাকরি", "আবেদন", "বেতন", "কাজের"
        ]
        non_job_keywords = [
            "restaurant menu", "food menu", "lunch menu", "dinner menu", "pizza menu", "pizzeria", "bistro",
            "pizza festival", "thin crust", "pasta", "dine-in", "takeaway", "authentic cuisine", "delicious",
            "reserve your table", "happy hour", "buy 1 get 1", "combo deal", "flat 30% off", "flat 20% off",
            "happy birthday", "wedding ceremony", "wedding invitation", "wedding photography",
            "graduation ceremony", "congratulations graduates", "convocation ceremony", "degree conferment",
            "music festival", "music concert", "movie poster", "film festival",
            "car for sale", "vehicle for sale", "house for rent", "property for lease",
            "50% off", "discount coupon", "clearance promo", "special discount", "sale offer"
        ]

        has_recruitment = any(kw in ocr_lower for kw in recruitment_keywords)
        has_non_job = any(kw in ocr_lower for kw in non_job_keywords)

        if has_recruitment:
            # Recruitment terms strictly take precedence so no real job flyer is falsely marked as non-job
            return {
                "content_type": "job_poster",
                "is_job_poster": True,
                "posterType": "Job Advertisement",
                "specificCategory": "Job Recruitment Poster",
                "posterSummary": f"The image text contains recruitment vacancy terms: {ocr_text[:200]}",
                "posterText": ocr_text,
                "ocr_status": ocr_status
            }
        elif has_non_job:
            return {
                "content_type": "not_job_poster",
                "is_job_poster": False,
                "posterType": "Not a Job Advertisement",
                "specificCategory": "Non-Recruitment Media / Event Poster",
                "posterSummary": f"The image text contains non-recruitment or commercial content: {ocr_text[:200]}",
                "posterText": ocr_text,
                "ocr_status": ocr_status
            }
        else:
            # Default to evaluating as a job poster so the user gets a comprehensive recruitment scam audit
            return {
                "content_type": "job_poster",
                "is_job_poster": True,
                "posterType": "Job Advertisement",
                "specificCategory": "Recruitment Advertisement Poster",
                "posterSummary": f"Uploaded advertisement analyzed for recruitment legitimacy and fraud signals: {ocr_text[:200] if ocr_text else 'Visual recruitment poster submitted for scam risk audit.'}",
                "posterText": ocr_text,
                "ocr_status": ocr_status
            }

    @staticmethod
    def extract_text_from_url(url: str) -> dict:
        """Deep scrape webpage content, domain metadata, title, and follow shorteners/redirects from URL."""
        if not url:
            return {
                "text": "",
                "domain": "",
                "root_domain": "",
                "status": "none",
                "title": "",
                "resolved_url": "",
                "redirect_chain": [],
                "social_platform": None,
                "domain_category": "UNKNOWN",
                "embedded_employer_links": []
            }

        # Safe shortener expansion & redirect resolution
        resolution = URLResolver.resolve_url(url)
        target_url = resolution.get("final_url") or url.strip()
        if not target_url.startswith("http://") and not target_url.startswith("https://"):
            target_url = "https://" + target_url

        domain = resolution.get("final_domain") or URLResolver.clean_domain_string(target_url)
        root_domain = resolution.get("root_domain") or URLResolver.extract_root_domain(domain)
        embedded_links = []

        poster_domains_from_url = []
        image_text_from_url = ""

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SAFE-HIRE/1.0 AI Scam Verification Engine"
            }
            response = requests.get(target_url, headers=headers, timeout=4.5)
            content_type_header = response.headers.get("Content-Type", "").lower()

            # Case A: URL directly points to an Image (e.g. flyer/poster image link)
            if any(ext in target_url.lower() for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]) or "image/" in content_type_header:
                img_bytes = response.content
                if img_bytes and len(img_bytes) > 100:
                    ocr_t, ocr_s = IntakeAgent.extract_text_from_image(img_bytes)
                    if ocr_t:
                        image_text_from_url = ocr_t
                        urls_in_img = re.findall(r'https?://[^\s"\'<>]+', ocr_t)
                        www_in_img = re.findall(r'\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', ocr_t, re.IGNORECASE)
                        dom_in_img = re.findall(r'\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev)\b', ocr_t, re.IGNORECASE)
                        for d in urls_in_img + www_in_img + dom_in_img:
                            c = URLResolver.clean_domain_string(d)
                            if c and URLResolver.classify_domain(c) == "EMPLOYER_DOMAIN":
                                poster_domains_from_url.append(c)

                    return {
                        "text": f"Direct Poster Image URL: {target_url}\nExtracted Poster Text: {image_text_from_url}",
                        "domain": domain,
                        "root_domain": root_domain,
                        "status": "success",
                        "title": "Direct Job Poster Image",
                        "resolved_url": target_url,
                        "redirect_chain": resolution.get("redirect_chain", [url]),
                        "social_platform": resolution.get("social_platform"),
                        "domain_category": resolution.get("domain_category"),
                        "embedded_employer_links": embedded_links[:5],
                        "poster_domains": list(set(poster_domains_from_url)),
                        "poster_text": image_text_from_url
                    }

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")

                # Extract potential employer application domains linked from the page
                for a_tag in soup.find_all("a", href=True):
                    href = a_tag["href"].strip()
                    if href.startswith("http") and not any(s in href.lower() for s in ["linkedin.com", "facebook.com", "twitter.com", "instagram.com", "t.me", "whatsapp.com", "youtube.com"]):
                        clean_href_dom = URLResolver.clean_domain_string(href)
                        if clean_href_dom and URLResolver.classify_domain(clean_href_dom) == "EMPLOYER_DOMAIN":
                            if clean_href_dom not in embedded_links:
                                embedded_links.append(clean_href_dom)

                # Look for embedded poster/banner image on the webpage (og:image or twitter:image)
                candidate_img_url = ""
                og_img = soup.find("meta", attrs={"property": "og:image"}) or soup.find("meta", attrs={"name": "twitter:image"})
                if og_img and og_img.get("content"):
                    candidate_img_url = og_img["content"].strip()
                if not candidate_img_url:
                    first_img = soup.find("img", src=True)
                    if first_img and first_img.get("src", "").startswith("http"):
                        candidate_img_url = first_img["src"].strip()

                if candidate_img_url and candidate_img_url.startswith("http") and not any(s in candidate_img_url.lower() for s in ["logo", "icon", "avatar", "favicon", "pixel"]):
                    try:
                        img_res = requests.get(candidate_img_url, headers=headers, timeout=4.0)
                        if img_res.status_code == 200 and len(img_res.content) > 5000:
                            img_text, _ = IntakeAgent.extract_text_from_image(img_res.content)
                            if img_text:
                                image_text_from_url = img_text
                                urls_in_img = re.findall(r'https?://[^\s"\'<>]+', img_text)
                                www_in_img = re.findall(r'\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', img_text, re.IGNORECASE)
                                dom_in_img = re.findall(r'\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev)\b', img_text, re.IGNORECASE)
                                for d in urls_in_img + www_in_img + dom_in_img:
                                    c = URLResolver.clean_domain_string(d)
                                    if c and URLResolver.classify_domain(c) == "EMPLOYER_DOMAIN":
                                        poster_domains_from_url.append(c)
                    except Exception as img_fetch_err:
                        logger.info(f"Page poster image fetch notice: {img_fetch_err}")

                for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                    element.extract()
                text = soup.get_text(separator=" ", strip=True)
                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                
                meta_desc = ""
                meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
                if meta_tag and meta_tag.get("content"):
                    meta_desc = meta_tag["content"].strip()

                combined_content = f"Page Title: {title}\nMeta Description: {meta_desc}\nPage Body: {text[:2500]}"
                if image_text_from_url:
                    combined_content += f"\n[IMAGE / POSTER TEXT FROM PAGE]:\n{image_text_from_url}"

                return {
                    "text": combined_content,
                    "domain": domain,
                    "root_domain": root_domain,
                    "status": "success",
                    "title": title,
                    "resolved_url": target_url,
                    "redirect_chain": resolution.get("redirect_chain", [url]),
                    "social_platform": resolution.get("social_platform"),
                    "domain_category": resolution.get("domain_category"),
                    "embedded_employer_links": embedded_links[:5],
                    "poster_domains": list(set(poster_domains_from_url)),
                    "poster_text": image_text_from_url
                }
        except Exception as e:
            logger.warning(f"URL deep scraping notice for {target_url}: {e}")

        return {
            "text": f"Target Web Portal: {target_url}. Domain: {domain}",
            "domain": domain,
            "root_domain": root_domain,
            "status": "partial",
            "title": domain,
            "resolved_url": target_url,
            "redirect_chain": resolution.get("redirect_chain", [url]),
            "social_platform": resolution.get("social_platform"),
            "domain_category": resolution.get("domain_category"),
            "embedded_employer_links": [],
            "poster_domains": list(set(poster_domains_from_url)),
            "poster_text": image_text_from_url
        }

    @staticmethod
    def extract_text_from_document(file_bytes: bytes, filename: str) -> tuple[str, str]:
        """Extract text from PDF, DOCX, or DOC document bytes. Returns: (text, status: "SUCCESS" | "FAILED")."""
        if not file_bytes:
            return "", "FAILED"
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext == ".docx":
            try:
                import zipfile, xml.etree.ElementTree as ET, io
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    texts = [node.text for node in tree.iter() if node.text]
                    joined = " ".join(texts).strip()
                    return (joined, "SUCCESS") if joined else ("", "FAILED")
            except Exception as e:
                logger.warning(f"DOCX extraction notice: {e}")
        elif ext == ".pdf":
            try:
                import pypdf, io
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
                if pages_text:
                    return "\n".join(pages_text).strip(), "SUCCESS"
            except Exception as e:
                logger.info(f"pypdf extraction notice ({e}). Trying fallback parsing.")
            try:
                import PyPDF2, io
                reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
                if pages_text:
                    return "\n".join(pages_text).strip(), "SUCCESS"
            except Exception:
                pass
        return "", "FAILED"

    def process(self, input_text: str = "", image_bytes: bytes = None, filename: str = "", input_url: str = "", target_language: str = None) -> dict:
        combined_text = ""
        source = "text"
        ocr_extracted_text = ""
        ocr_status = "NOT_APPLICABLE"
        claimed_brand = ""
        poster_type = "Job Advertisement"
        specific_category = "General Recruitment"
        poster_summary = ""
        content_type = "job_poster"
        is_job_poster = True
        is_unreadable = False
        validation_error = None
        vision_res = {}

        if input_text and input_text.strip():
            combined_text += input_text.strip() + "\n"

        if image_bytes:
            ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
            if ext in [".pdf", ".doc", ".docx"]:
                doc_text, doc_status = IntakeAgent.extract_text_from_document(image_bytes, filename)
                ocr_status = doc_status
                if doc_text:
                    ocr_extracted_text = doc_text
                    combined_text += f"\n[DOCUMENT TEXT ({filename})]:\n{doc_text}\n"
                    source = "document"
                else:
                    is_unreadable = True
                    content_type = "unclear"
                    validation_error = "The uploaded document is unreadable or empty. Please upload a clear PDF or Word document."
            else:
                source = "image"
                # Step 1: Multimodal Vision AI Analysis
                vision_res = IntakeAgent.analyze_poster_with_vision_ai(image_bytes, target_language=target_language) or {}
                content_type = vision_res.get("content_type", "job_poster")
                is_job_poster = vision_res.get("is_job_poster", True)
                poster_type = vision_res.get("posterType") or ("Job Advertisement" if is_job_poster else "Not a Job Advertisement")
                specific_category = vision_res.get("specificCategory") or vision_res.get("specific_category") or poster_type
                poster_summary = vision_res.get("posterSummary") or vision_res.get("poster_summary") or ""
                
                # Step 2: OCR Text Extraction (only if Vision AI did not already extract text)
                if vision_res and vision_res.get("posterText") and len(vision_res["posterText"].strip()) > 5:
                    ocr_extracted_text = vision_res.get("posterText").strip()
                    ocr_status = "SUCCESS"
                else:
                    ocr_text, o_status = IntakeAgent.extract_text_from_image(image_bytes)
                    ocr_status = o_status
                    ocr_extracted_text = ocr_text or ""
                if not ocr_extracted_text and ocr_status == "FAILED":
                    if content_type == "unclear":
                        is_unreadable = True
                        validation_error = "The uploaded image quality is poor or text is unreadable. Please upload a clear image."

                # Safeguard: If the extracted poster text contains recruitment terms, strictly classify as job poster
                rec_check_terms = [
                    "job vacancy", "job vacancies", "vacancy", "vacancies", "part-time", "part time",
                    "full-time", "full time", "hiring", "we are hiring", "sales assistant", "assistant",
                    "sales executive", "cashier", "clerk", "trainee", "intern", "internship",
                    "school leavers", "school leaver", "apply now", "apply today", "send your cv",
                    "cv to", "qualifications", "walk-in interview", "walk in"
                ]
                ocr_check_lower = (ocr_extracted_text or "").lower()
                if any(term in ocr_check_lower for term in rec_check_terms):
                    is_job_poster = True
                    content_type = "job_poster"
                    poster_type = "Job Advertisement"
                    if not specific_category or "Not a Job" in specific_category:
                        specific_category = "Job Recruitment Poster"

                claimed_brand = vision_res.get("companyName") or vision_res.get("claimed_brand", "")
                combined_text += f"\n[POSTER TEXT & METADATA]:\n{ocr_extracted_text}\n"
                if claimed_brand:
                    combined_text += f"Claimed Brand: {claimed_brand}\n"
                if specific_category:
                    combined_text += f"Category: {specific_category}\n"
                if poster_summary:
                    combined_text += f"Visual Summary: {poster_summary}\n"
                if vision_res.get("hasFeeDemand") or vision_res.get("feeDetails"):
                    combined_text += f"Fee Demand: {vision_res.get('feeDetails') or 'Registration Fee / Deposit'}\n"
                if vision_res.get("hasInformalChannel"):
                    combined_text += "Contact Channel: Telegram / WhatsApp application\n"
                if vision_res.get("hasUnrealisticPromise"):
                    combined_text += "Work Offer: High compensation / minimal qualifications / data entry typing\n"
                if vision_res.get("hasUrgency"):
                    combined_text += "Urgency: Immediate hiring / apply today\n"

        # Candidate domain lists for 4-tier selection
        poster_domains = []
        text_domains = []
        url_resolved_domain = ""
        resolved_url = ""
        redirect_chain = []
        url_social_platform = None
        url_embedded_domains = []

        if input_url and input_url.strip():
            url_res = self.extract_text_from_url(input_url.strip())
            combined_text += f"\n{url_res['text']}\n"
            url_resolved_domain = url_res.get("root_domain") or url_res.get("domain") or ""
            resolved_url = url_res.get("resolved_url") or input_url.strip()
            redirect_chain = url_res.get("redirect_chain") or [input_url.strip()]
            url_social_platform = url_res.get("social_platform")
            url_embedded_domains = url_res.get("embedded_employer_links") or []
            if url_res.get("poster_domains"):
                poster_domains.extend(url_res["poster_domains"])
            source = "url" if not input_text and not image_bytes else "mixed"

        # Collect Priority 1: Poster Domains (from Vision AI website/QR and OCR)
        if isinstance(vision_res, dict):
            if vision_res.get("website"):
                poster_domains.append(vision_res["website"])
            if vision_res.get("qrCode"):
                poster_domains.append(vision_res["qrCode"])
            if vision_res.get("company_website"):
                poster_domains.append(vision_res["company_website"])
        if ocr_extracted_text:
            ocr_urls = re.findall(r'https?://[^\s"\'<>]+', ocr_extracted_text)
            ocr_wwws = re.findall(r'\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', ocr_extracted_text, re.IGNORECASE)
            poster_domains.extend(ocr_urls)
            poster_domains.extend(ocr_wwws)

        # Regex Extraction of metadata entities
        emails_found = list(set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', combined_text)))
        urls_found = list(set(re.findall(r'https?://[^\s"\'<>]+', combined_text)))
        www_found = list(set(re.findall(r'\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', combined_text, re.IGNORECASE)))
        urls_found.extend(www_found)
        telegram_handles = list(set(re.findall(r'@[A-Za-z0-9_]{4,}', combined_text)))
        
        # Phone extraction and validation (filtering dummy/repetitive numbers & short fragments)
        raw_phone_candidates = list(set(re.findall(r'(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,5}', combined_text)))
        if isinstance(vision_res, dict) and vision_res.get("phone"):
            raw_phone_candidates.append(vision_res.get("phone"))

        valid_phones = []
        invalid_phones = []
        for cand in raw_phone_candidates:
            v_res = self.validate_phone_candidate(cand)
            if v_res["is_valid"]:
                if cand not in valid_phones:
                    valid_phones.append(cand)
            elif v_res["reason"] in ["too_short", "repetitive_digits", "sequential_digits", "too_long"] and len(v_res.get("digits", "")) >= 4:
                if cand not in invalid_phones:
                    invalid_phones.append(cand)

        phone_numbers = valid_phones

        if isinstance(vision_res, dict):
            if vision_res.get("email") and vision_res.get("email") not in emails_found:
                emails_found.append(vision_res.get("email"))
            if vision_res.get("website") and vision_res.get("website") not in urls_found:
                urls_found.append(vision_res.get("website"))

        # Collect Priority 2: Text Domains
        text_domains.extend(urls_found)
        text_domains.extend(url_embedded_domains)
        dom_matches = re.findall(r'\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev|info|co\.uk|ac\.lk|gov\.lk|com\.lk)\b', combined_text, re.IGNORECASE)
        ignored_exts = {'.png', '.jpg', '.jpeg', '.pdf', '.doc', '.docx', '.webp', '.gif', '.mp4'}
        for dm in dom_matches:
            if not any(dm.lower().endswith(ext) for ext in ignored_exts):
                text_domains.append(dm)

        # Corporate email domain (Priority 3b)
        corporate_email_domain = ""
        for em in emails_found:
            if "@" in em:
                e_dom = em.split('@')[-1].lower().strip()
                if URLResolver.classify_domain(e_dom) == "EMPLOYER_DOMAIN":
                    corporate_email_domain = e_dom
                    break

        # Select Primary Employer Domain via 4-Tier Hierarchy
        domain_selection = URLResolver.select_primary_employer_domain(
            poster_domains=poster_domains,
            text_domains=text_domains,
            resolved_domain=url_resolved_domain,
            email_domain=corporate_email_domain,
            submitted_domain=input_url,
            claimed_brand=claimed_brand
        )

        extracted_domain = domain_selection["primary_domain"]
        domain_source = domain_selection["domain_source"]
        domain_source_label = domain_selection["domain_source_label"]
        domain_source_priority = domain_selection["domain_source_priority"]
        is_social_wrapper = domain_selection.get("is_social_wrapper", False)
        social_platform = domain_selection.get("social_platform") or url_social_platform

        detected_lang = self.detect_language(combined_text)
        final_lang = target_language if (target_language and target_language in ["en", "si", "ta", "hi", "bn"]) else detected_lang

        # Final Content Classification check for Text/URL inputs
        if source in ["text", "url", "mixed"] and not image_bytes:
            combined_lower = combined_text.lower()
            recruitment_keywords = [
                "job", "jobs", "vacancy", "vacancies", "hiring", "now hiring", "we're hiring", "we are hiring",
                "recruitment", "recruit", "career", "careers", "employment", "opportunity", "job opportunity",
                "hiring now", "immediate hiring", "walk-in interview", "interview", "join our team", "apply now",
                "apply today", "position", "open position", "available position", "full time", "part time",
                "internship", "intern", "salary", "qualifications", "submit cv", "send cv", "resume",
                "බඳවාගැනීම්", "රැකියා", "ඇබෑර්තු", "ඉල්ලුම්", "වැටුප්", "පුරප්පාඩු", "බඳවා ගනු ලැබේ",
                "வேலை", "நியமனம்", "விண்ணப்பிக்க", "சம்பளம்", "காலியிடம்", "வேலைவாய்ப்பு",
                "भर्ती", "नौकरी", "आवेदन", "वेतन", "रिक्तियां", "रोजगार",
                "নিয়োগ", "চাকরি", "আবেদন", "বেতন", "কাজের"
            ]
            non_job_signals = [
                "pizza", "burger", "restaurant", "menu", "discount", "sale", "food", "cafe", "studio",
                "photography portfolio", "videography portfolio", "wedding photography",
                "congratulations", "graduation", "university faculty", "birthday", "party"
            ]
            has_rec = any(kw in combined_lower for kw in recruitment_keywords)
            has_non = any(kw in combined_lower for kw in non_job_signals)

            if not has_rec and has_non:
                content_type = "not_job_poster"
                is_job_poster = False
                poster_type = "Not a Job Advertisement"
                specific_category = "General Website / Portfolio / Media"
                poster_summary = f"The content at '{extracted_domain or input_url or 'the provided text'}' contains general business, portfolio, or event material with no job recruitment vacancies."
            elif not has_rec and len(combined_text.strip()) > 30:
                content_type = "not_job_poster"
                is_job_poster = False
                poster_type = "Not a Job Advertisement"
                specific_category = "Non-Recruitment Content"
                poster_summary = "The submitted text contains general information with no open recruitment vacancies or career offers."
            else:
                content_type = "job_poster"
                is_job_poster = True
                poster_type = "Job Advertisement"

        # Structured observed facts vs raw fields (strictly factual observation, never false claim of verification)
        verified_facts = []
        if emails_found:
            verified_facts.append(f"Observed contact email: {emails_found[0]}")
        if urls_found:
            verified_facts.append(f"Observed web link: {urls_found[0]}")
        
        if extracted_domain:
            if is_social_wrapper:
                verified_facts.append(f"Submitted link platform: {extracted_domain} ({social_platform or 'Social Platform'}) — Note: Job post wrapper, not employer domain.")
            else:
                verified_facts.append(f"Identified Employer Domain: {extracted_domain} (Source: {domain_source_label})")

        if redirect_chain and len(redirect_chain) > 1:
            verified_facts.append(f"Resolved redirect destination: {resolved_url} (Expanded from {input_url})")

        if valid_phones:
            verified_facts.append(f"Observed contact telephone: {valid_phones[0]}")
        elif invalid_phones:
            verified_facts.append(f"Detected invalid/suspicious contact number: {invalid_phones[0]}")

        return {
            "content_type": content_type,
            "is_job_poster": is_job_poster,
            "is_unreadable": is_unreadable,
            "poster_type": poster_type,
            "specific_category": specific_category,
            "poster_summary": poster_summary,
            "cleaned_text": combined_text.strip(),
            "ocr_text": ocr_extracted_text,
            "ocr_status": ocr_status,
            "claimed_brand": claimed_brand,
            "source": source,
            "domain": extracted_domain,
            "primary_domain": extracted_domain,
            "full_hostname": domain_selection.get("full_hostname") or extracted_domain,
            "domain_source": domain_source,
            "domain_source_label": domain_source_label,
            "domain_source_priority": domain_source_priority,
            "domain_category": domain_selection.get("domain_category", "UNKNOWN"),
            "is_social_wrapper": is_social_wrapper,
            "social_platform": social_platform,
            "submitted_url": input_url,
            "resolved_url": resolved_url or input_url,
            "redirect_chain": redirect_chain,
            "detected_language": detected_lang,
            "final_language": final_lang,
            "validation_error": validation_error,
            "vision_res": vision_res,
            "verified_facts": verified_facts,
            "metadata_extracted": {
                "emails": emails_found,
                "urls": urls_found,
                "telegram_handles": telegram_handles,
                "phone_numbers": valid_phones[:3],
                "invalid_phones": invalid_phones[:3]
            }
        }
