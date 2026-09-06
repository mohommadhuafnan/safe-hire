import re
import logging
import requests
import json
import base64
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
from app.config import settings

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
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
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

        # 2. High-Accuracy Cloud OCR API Fallback (OCR.space multi-key rotation)
        ocr_keys = ["K88888888888957", "helloworld", "K83677843888957"]
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
                res = requests.post(url, data=payload, timeout=8.0)
                if res.status_code == 200:
                    data = res.json()
                    parsed_results = data.get("ParsedResults", [])
                    if parsed_results:
                        cloud_text = parsed_results[0].get("ParsedText", "").strip()
                        if cloud_text and len(cloud_text) > 5:
                            logger.info("Successfully extracted poster text via Cloud OCR API.")
                            return cloud_text, "SUCCESS"
            except Exception as e:
                logger.warning(f"Cloud OCR API key notice ({key}): {e}")

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
   - CLASS A (job_poster): Job vacancy flyer, internship poster, hiring announcement, career opening, recruitment WhatsApp screenshot, appointment document, employment offer.
   - CLASS B (not_job_poster): Food/restaurant advertisement, menu, discount promo, university graduation poster, university course/workshop flyer, hackathon banner, photography portfolio, birthday poster, political flyer, product promotion, personal photograph, meme, certificate, generic artwork/landscape, non-recruitment document.
   - UNCLEAR (unclear): Extremely blurry, completely unreadable, or ambiguous media.

2. Identify the specific category ("specificCategory") in {target_lang_name} (e.g. "Italian Restaurant Menu & Discount Flyer", "University Graduation Announcement", "Software Engineer Job Vacancy", "Consumer Electronics Promotion", "Personal Photo / Portrait").

3. Provide a DETAILED 2-4 sentence dynamic summary ("posterSummary") in {target_lang_name} analyzing what this specific image depicts, organizations/institutions/brands visible, dates, offers, contacts, and explicitly explain why it is or is not a job recruitment offer. DO NOT use a generic or canned template.

4. Extract any structured details present in the image (or empty string if not present).

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
  "qrCode": "QR code URL or content if visible, else empty string"
}}"""

        # 1. Primary: Google Gemini Multimodal Vision API (active models)
        if gemini_key:
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
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1500}
                    }
                    res = requests.post(url, json=payload, timeout=25)
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
                    res = requests.post(hf_url, headers=headers, json=payload, timeout=25)
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
                            parsed["specific_category"] = parsed.get("specificCategory") or "Image Media"
                            parsed["poster_summary"] = parsed.get("posterSummary") or "Analyzed media."
                            return parsed
                except Exception as e:
                    logger.warning(f"Hugging Face Vision notice for {model_name}: {e}")

        # 3. Vision API Fallback: Run OCR and use text reasoning
        ocr_text, ocr_status = IntakeAgent.extract_text_from_image(image_bytes)
        ocr_lower = (ocr_text or "").lower()

        recruitment_keywords = [
            "we are hiring", "is hiring", "hiring for", "job vacancy", "job vacancies",
            "recruitment notice", "career opportunity", "career opportunities", "position available",
            "positions available", "apply now", "urgent vacancy", "urgent hiring", "walk-in interview",
            "full-time", "part-time", "job position", "open position", "send your cv",
            "send resume", "qualifications required", "salary:", "experience required",
            "බඳවාගැනීම්", "රැකියා", "ඇබෑර්තු", "ඉල්ලුම්", "වැටුප්", "පුරප්පාඩු", "බඳවා ගනු ලැබේ",
            "வேலை", "நியமனம்", "விண்ணப்பிக்க", "சம்பளம்", "காலியிடம்", "வேலைவாய்ப்பு",
            "भर्ती", "नौकरी", "आवेदन", "वेतन", "रिक्तियां", "रोजगार",
            "নিয়োগ", "চাকরি", "আবেদন", "বেতন", "কাজের"
        ]
        non_job_keywords = [
            "pizza", "burger", "restaurant", "menu", "discount", "sale", "food", "cafe",
            "graduation", "congratulations", "graduates", "university ceremony", "degree",
            "birthday", "party", "invitation", "concert", "music festival", "festival 202",
            "conference", "seminar", "workshop banner", "hackathon", "designathon",
            "product promotion", "laptop discount", "car for sale", "vehicle", "real estate"
        ]

        has_recruitment = any(kw in ocr_lower for kw in recruitment_keywords)
        has_non_job = any(kw in ocr_lower for kw in non_job_keywords)

        if has_recruitment and not has_non_job:
            return {
                "content_type": "job_poster",
                "is_job_poster": True,
                "posterType": "Job Advertisement",
                "specificCategory": "Job Recruitment Poster",
                "posterSummary": f"The image text contains recruitment vacancy terms: {ocr_text[:200]}",
                "posterText": ocr_text,
                "ocr_status": ocr_status
            }
        elif has_non_job or (ocr_text and not has_recruitment):
            return {
                "content_type": "not_job_poster",
                "is_job_poster": False,
                "posterType": "Not a Job Advertisement",
                "specificCategory": "Non-Recruitment Media / Event Poster",
                "posterSummary": f"The image text contains general non-recruitment content: {ocr_text[:200]}",
                "posterText": ocr_text,
                "ocr_status": ocr_status
            }
        else:
            return {
                "content_type": "unclear",
                "is_job_poster": False,
                "posterType": "Unclear / Unreadable Media",
                "specificCategory": "Unreadable Image",
                "posterSummary": "No readable text or decisive visual recruitment features could be detected.",
                "posterText": "",
                "ocr_status": ocr_status
            }

    @staticmethod
    def extract_text_from_url(url: str) -> dict:
        """Deep scrape webpage content, domain metadata, and title from URL."""
        if not url:
            return {"text": "", "domain": "", "status": "none", "title": ""}

        url_clean = url.strip()
        if not url_clean.startswith("http://") and not url_clean.startswith("https://"):
            url_clean = "https://" + url_clean

        domain = ""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url_clean)
            domain = parsed.netloc.split(":")[0]
            if domain.startswith("www."):
                domain = domain[4:]
        except Exception:
            pass

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SAFE-HIRE/1.0 AI Scam Verification Engine"
            }
            response = requests.get(url_clean, headers=headers, timeout=12)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                    element.extract()
                text = soup.get_text(separator=" ", strip=True)
                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                
                meta_desc = ""
                meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
                if meta_tag and meta_tag.get("content"):
                    meta_desc = meta_tag["content"].strip()

                combined_content = f"Page Title: {title}\nMeta Description: {meta_desc}\nPage Body: {text[:2500]}"
                return {
                    "text": combined_content,
                    "domain": domain,
                    "status": "success",
                    "title": title
                }
        except Exception as e:
            logger.warning(f"URL deep scraping notice for {url_clean}: {e}")

        return {
            "text": f"Target Web Portal: {url_clean}. Domain: {domain}",
            "domain": domain,
            "status": "partial",
            "title": domain
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
        extracted_domain = ""
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
                
                # Step 2: OCR Text Extraction
                ocr_text, o_status = IntakeAgent.extract_text_from_image(image_bytes)
                ocr_status = o_status
                ocr_extracted_text = vision_res.get("posterText") or ocr_text or ""
                if not ocr_extracted_text and ocr_status == "FAILED":
                    if content_type == "unclear":
                        is_unreadable = True
                        validation_error = "The uploaded image quality is poor or text is unreadable. Please upload a clear image."

                claimed_brand = vision_res.get("companyName") or vision_res.get("claimed_brand", "")
                combined_text += f"\n[POSTER TEXT & METADATA]:\n{ocr_extracted_text}\n"
                if claimed_brand:
                    combined_text += f"Claimed Brand: {claimed_brand}\n"
                if specific_category:
                    combined_text += f"Category: {specific_category}\n"
                if poster_summary:
                    combined_text += f"Visual Summary: {poster_summary}\n"

        if input_url and input_url.strip():
            url_res = self.extract_text_from_url(input_url.strip())
            combined_text += f"\n{url_res['text']}\n"
            if url_res.get("domain"):
                extracted_domain = url_res["domain"]
            source = "url" if not input_text and not image_bytes else "mixed"

        # Regex Extraction of metadata entities
        emails_found = list(set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', combined_text)))
        urls_found = list(set(re.findall(r'https?://[^\s]+', combined_text)))
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

        # Domain extraction (strictly from genuine website URLs, excluding free webmail services)
        if not extracted_domain and urls_found:
            try:
                from urllib.parse import urlparse
                parsed_u = urlparse(urls_found[0])
                u_domain = parsed_u.netloc.split(':')[0] if parsed_u.netloc else parsed_u.path.split('/')[0]
                if u_domain.startswith("www."):
                    u_domain = u_domain[4:]
                if u_domain and "." in u_domain and u_domain.lower() not in self.FREE_EMAIL_SERVICES:
                    extracted_domain = u_domain
            except Exception:
                pass

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
            verified_facts.append(f"Associated company domain: {extracted_domain}")
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
