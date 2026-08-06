import re
import logging
import requests
import json
import base64
from bs4 import BeautifulSoup
from typing import Dict, Any
from app.config import settings

try:
    import pytesseract
except ImportError:
    pytesseract = None

logger = logging.getLogger("safe_hire.intake_agent")

class IntakeAgent:
    """Agent 1: Ingests text, image OCR, and URL; extracts metadata, contacts, language, and validates job poster image content via Gemini Multimodal Vision & OCR."""

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
        elif image_bytes.startswith(b'RIFF') and image_bytes[8:12] == b'WEBP':
            return "image/webp"
        elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):
            return "image/gif"
        elif image_bytes.startswith(b'\xff\xd8'):
            return "image/jpeg"
        return "image/png"

    @staticmethod
    def optimize_image_bytes(image_bytes: bytes, max_bytes: int = 1024 * 1024) -> bytes:
        """Optimize and compress image bytes if larger than max_bytes for fast & reliable AI OCR processing."""
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
    def analyze_poster_with_huggingface_vision(image_bytes: bytes) -> dict:
        """
        Agent 1: Hugging Face Vision Model (Qwen/Qwen2.5-VL-7B-Instruct:featherless-ai)
        Analyzes uploaded image/poster, extracts structured JSON fields:
        posterType, companyName, jobTitle, salary, website, email, phone, address, posterText, qrCode.
        Determines whether the upload is a job advertisement.
        """
        if not image_bytes:
            return {
                "posterType": "Not a Job Advertisement",
                "companyName": "",
                "jobTitle": "",
                "salary": "",
                "website": "",
                "email": "",
                "phone": "",
                "address": "",
                "posterText": "",
                "qrCode": "",
                "is_job_poster": False,
                "validation_error": "No image provided."
            }

        image_bytes = IntakeAgent.optimize_image_bytes(image_bytes)
        hf_token = getattr(settings, "HF_TOKEN", "") or getattr(settings, "DEEPSEEK_V4_API_KEY", "") or ""
        mime_type = IntakeAgent.detect_image_mime_type(image_bytes)
        base64_img = base64.b64encode(image_bytes).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_img}"

        prompt = """
        You are SAFE-HIRE's Senior Multimodal Vision & Poster Intelligence Agent.
        Analyze the uploaded image or poster carefully and perform full text & entity extraction.

        OBJECTIVES:
        1. Determine whether the upload is a Job Recruitment Advertisement or NOT a job advertisement.
           - Set "posterType" to "Not a Job Advertisement" if it is an event flyer, product ad, personal photo, certificate, meme, landscape, general graphics, portfolio, etc.
           - Set "posterType" to "Job Advertisement" (or specific recruitment type) if it contains job hiring, recruitment vacancies, employment offers, or career announcements.

        2. Extract structured fields cleanly.

        Return ONLY a raw JSON object with this exact structure (no markdown formatting outside the JSON):
        {
          "posterType": "Not a Job Advertisement | Job Advertisement",
          "companyName": "Company name if present, else empty string",
          "jobTitle": "Job title or position if present, else empty string",
          "salary": "Salary or compensation if present, else empty string",
          "website": "Company website or link if present, else empty string",
          "email": "Contact email if present, else empty string",
          "phone": "Contact phone if present, else empty string",
          "address": "Physical location or address if present, else empty string",
          "posterText": "Complete extracted text content from the poster image",
          "qrCode": "QR code URL or content if present, else empty string"
        }
        """

        models_to_try = [
            getattr(settings, "HF_MODEL_NAME", "Qwen/Qwen2.5-VL-7B-Instruct:featherless-ai"),
            "Qwen/Qwen2.5-VL-7B-Instruct",
            "Qwen/Qwen2-VL-7B-Instruct"
        ]

        # 1. Try Hugging Face Router Vision Models via HF_TOKEN
        if hf_token:
            hf_url = getattr(settings, "HF_API_BASE_URL", "https://router.huggingface.co/v1").rstrip("/") + "/chat/completions"
            headers = {
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "application/json"
            }

            for model_name in models_to_try:
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
                        choices = data.get("choices") if isinstance(data, dict) else None
                        content = ""
                        if choices and isinstance(choices, list) and len(choices) > 0 and isinstance(choices[0], dict):
                            msg = choices[0].get("message") or {}
                            if isinstance(msg, dict):
                                content = msg.get("content") or ""
                        clean = (content or "").strip().replace("```json", "").replace("```", "").strip()
                        if "<think>" in clean and "</think>" in clean:
                            clean = clean.split("</think>")[-1].strip()
                        if clean:
                            parsed = json.loads(clean)
                            if isinstance(parsed, dict):
                                logger.info(f"Hugging Face Vision ({model_name}) extraction success: posterType={parsed.get('posterType')}")
                                is_job = str(parsed.get("posterType", "")).strip().lower() != "not a job advertisement"
                                parsed["is_job_poster"] = is_job
                                parsed["extracted_text"] = parsed.get("posterText", "")
                                parsed["claimed_brand"] = parsed.get("companyName", "")
                                parsed["job_title"] = parsed.get("jobTitle", "")
                                parsed["contact_email"] = parsed.get("email", "")
                                parsed["phone_number"] = parsed.get("phone", "")
                                parsed["poster_summary"] = f"Poster Type: {parsed.get('posterType')} | Company: {parsed.get('companyName')} | Job: {parsed.get('jobTitle')}"
                                return parsed
                    else:
                        logger.warning(f"Hugging Face Vision ({model_name}) HTTP {res.status_code}: {res.text[:200]}")
                except Exception as e:
                    logger.warning(f"Hugging Face Vision notice for model {model_name}: {e}")

        # 2. High-Availability Fallback to Gemini Multimodal Vision API if HF Router is overloaded
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
        if gemini_key:
            for g_model in ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]:
                try:
                    rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
                    rest_payload = {
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt},
                                    {"inline_data": {"mime_type": mime_type, "data": base64_img}}
                                ]
                            }
                        ]
                    }
                    res = requests.post(rest_url, json=rest_payload, timeout=25)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates") or []
                        content = ""
                        if candidates and isinstance(candidates[0], dict):
                            parts = (candidates[0].get("content") or {}).get("parts") or []
                            if parts and isinstance(parts[0], dict):
                                content = parts[0].get("text") or ""
                        clean = (content or "").strip().replace("```json", "").replace("```", "").strip()
                        if clean:
                            parsed = json.loads(clean)
                            if isinstance(parsed, dict):
                                logger.info(f"Gemini Vision Fallback ({g_model}) extraction success: posterType={parsed.get('posterType')}")
                                is_job = str(parsed.get("posterType", "")).strip().lower() != "not a job advertisement"
                                parsed["is_job_poster"] = is_job
                                parsed["extracted_text"] = parsed.get("posterText", "")
                                parsed["claimed_brand"] = parsed.get("companyName", "")
                                parsed["job_title"] = parsed.get("jobTitle", "")
                                parsed["contact_email"] = parsed.get("email", "")
                                parsed["phone_number"] = parsed.get("phone", "")
                                parsed["poster_summary"] = f"Poster Type: {parsed.get('posterType')} | Company: {parsed.get('companyName')}"
                                return parsed
                except Exception as e:
                    logger.warning(f"Gemini Vision Fallback notice for {g_model}: {e}")

        # 3. Final Fallback: OCR text extraction
        ocr_text = IntakeAgent.extract_text_from_image(image_bytes)
        ocr_lower = (ocr_text or "").lower()
        
        job_keywords = [
            "hiring", "recruitment", "vacancy", "vacancies", "job offer", "apply now",
            "we are hiring", "wanted", "walk-in interview", "walk in interview",
            "full-time", "part-time", "job position", "open position", "send your cv",
            "send resume", "career opportunity", " Qualificaton", "salary"
        ]
        has_job_kw = any(kw in ocr_lower for kw in job_keywords)

        return {
            "posterType": "Job Advertisement" if has_job_kw else "Not a Job Advertisement",
            "companyName": "",
            "jobTitle": "",
            "salary": "",
            "website": "",
            "email": "",
            "phone": "",
            "address": "",
            "posterText": ocr_text or "",
            "qrCode": "",
            "is_job_poster": has_job_kw,
            "extracted_text": ocr_text or "",
            "claimed_brand": "",
            "job_title": "",
            "contact_email": "",
            "phone_number": "",
            "poster_summary": "Extracted text via OCR." if has_job_kw else "The uploaded image appears to be a graduation announcement, university flyer, event poster, or general image with no recruitment vacancies."
        }

        deepseek_key = getattr(settings, "DEEPSEEK_V4_API_KEY", "") or ""
        deepseek_url = getattr(settings, "DEEPSEEK_API_BASE_URL", "https://router.huggingface.co/v1") + "/chat/completions"

        if deepseek_key and ocr_text:
            try:
                ds_prompt = f"""
                You are SAFE-HIRE's Senior Recruitment Fraud Intelligence Engine.
                Analyze the following OCR text extracted from an uploaded job poster/flyer image:

                [EXTRACTED OCR TEXT]:
                "{ocr_text[:3000]}"

                Determine if this text represents a Job Recruitment Poster / Career Flyer / Hiring Notice OR a Non-Job document (such as an educational event flyer, workshop banner, hackathon poster, product ad, personal photo, generic graphics).
                Return ONLY a raw JSON object (no markdown):
                {{
                  "is_job_poster": boolean,
                  "poster_type": "Specific Classification (e.g. Designathon / Hackathon Event Poster, Educational Workshop Flyer, Corporate Course Banner, Product Advertisement, Personal Photo)",
                  "poster_summary": "Clear 2-3 sentence summary of what this poster/image is about, who organized it, dates, location, and key details.",
                  "extracted_text": "{ocr_text[:2000]}",
                  "claimed_brand": "Extracted company name",
                  "job_title": "Position title",
                  "contact_email": "Extracted email if present",
                  "phone_number": "Extracted phone if present",
                  "validation_error": null
                }}
                """
                headers = {
                    "Authorization": f"Bearer {deepseek_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": getattr(settings, "DEEPSEEK_MODEL_NAME", "deepseek-ai/DeepSeek-V4-Flash"),
                    "messages": [{"role": "user", "content": ds_prompt}],
                    "temperature": 0.1,
                    "max_tokens": 2048
                }
                res = requests.post(deepseek_url, json=payload, headers=headers, timeout=20)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices") if isinstance(data, dict) else None
                    content = ""
                    if choices and isinstance(choices, list) and len(choices) > 0 and isinstance(choices[0], dict):
                        msg = choices[0].get("message") or {}
                        if isinstance(msg, dict):
                            content = msg.get("content") or ""
                    clean = (content or "").strip().replace("```json", "").replace("```", "").strip()
                    if "<think>" in clean and "</think>" in clean:
                        clean = clean.split("</think>")[-1].strip()
                    if clean:
                        parsed = json.loads(clean)
                        if isinstance(parsed, dict):
                            parsed["extracted_text"] = ocr_text
                            logger.info("DeepSeek V4 Flash OCR poster classification success!")
                            return parsed
            except Exception as e:
                logger.warning(f"DeepSeek V4 fallback notice: {e}")

        # Rule Engine Fallback check when AI API is unavailable
        recruitment_keywords = [
            # English explicit recruitment vacancy indicators
            "we are hiring", "is hiring", "hiring for", "job vacancy", "job vacancies",
            "recruitment notice", "career opportunity", "career opportunities", "position available",
            "positions available", "apply now", "urgent vacancy", "urgent hiring", "walk-in interview",
            "salary:", "full-time", "part-time", "work from home job", "data entry job",
            "job requirement", "job requirements", "job description", "qualifications required",
            "responsibilities:", "apply at", "apply officially", "send your cv", "send your resume",
            "vacancy for", "hiring immediate", "looking for candidate", "looking for a",
            # Sinhala (සිංහල)
            "බඳවාගැනීම්", "රැකියා", "ඇබෑර්තු", "ඉල්ලුම්", "වැටුප්", "පුරප්පාඩු", "බඳවා ගනු ලැබේ",
            # Tamil (தமிழ்)
            "வேலை", "நியமனம்", "விண்ணப்பிக்க", "சம்பளம்", "காலியிடம்", "வேலைவாய்ப்பு",
            # Hindi (हिंदी)
            "भर्ती", "नौकरी", "आवेदन", "वेतन", "रिक्तियां", "रोजगार",
            # Bengali (বাংলা)
            "নিয়োগ", "চাকরি", "আবেদন", "বেতন", "কাজের"
        ]
        text_lower = (ocr_text or "").lower()
        has_job_indicators = any(kw in text_lower for kw in recruitment_keywords)
        
        if ocr_text and not has_job_indicators:
            return {
                "is_job_poster": False,
                "poster_type": "Not a Job Advertisement",
                "poster_summary": "Extracted text contains general graphics, non-career announcements, or unrelated content.",
                "extracted_text": ocr_text,
                "claimed_brand": "",
                "validation_error": "This image is not a recruitment or job advertisement. Scam analysis has not been performed because the uploaded image is unrelated to job recruitment."
            }

        return {
            "is_job_poster": True,
            "extracted_text": ocr_text or "Uploaded poster/flyer image.",
            "claimed_brand": "",
            "validation_error": None
        }

    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """Extract text from poster image using local Tesseract OCR with automatic Cloud OCR API fallback."""
        if not image_bytes:
            return ""

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
                if extracted_text and len(extracted_text.strip()) > 8:
                    logger.info("Successfully extracted text via local Tesseract OCR.")
                    return extracted_text.strip()
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
                            return cloud_text
            except Exception as e:
                logger.warning(f"Cloud OCR API key notice ({key}): {e}")

        return ""

    @staticmethod
    def extract_text_from_url(url: str) -> dict:
        """Deep scrape webpage content, domain metadata, and title from URL."""
        if not url:
            return {"text": "", "domain": "", "status": "none"}

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
            logger.warning(f"URL deep scraping fallback for {url_clean}: {e}")

        return {
            "text": f"Recruitment Portal Analyzed: {url_clean}. Target Domain: {domain}",
            "domain": domain,
            "status": "partial",
            "title": domain
        }

    @staticmethod
    def extract_text_from_document(file_bytes: bytes, filename: str) -> str:
        """Extract text from PDF, DOCX, or DOC document bytes."""
        if not file_bytes:
            return ""
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext == ".docx":
            try:
                import zipfile, xml.etree.ElementTree as ET, io
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    texts = [node.text for node in tree.iter() if node.text]
                    return " ".join(texts).strip()
            except Exception as e:
                logger.warning(f"DOCX extraction notice: {e}")
        elif ext == ".pdf":
            # 1. Primary: pypdf library
            try:
                import pypdf, io
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
                if pages_text:
                    return "\n".join(pages_text).strip()
            except Exception as e:
                logger.info(f"pypdf extraction notice ({e}). Trying PyPDF2 / fallback parsing.")

            # 2. Secondary: PyPDF2 fallback
            try:
                import PyPDF2, io
                reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
                if pages_text:
                    return "\n".join(pages_text).strip()
            except Exception:
                pass

            # 3. Tertiary: Regex byte string extraction fallback
            try:
                import re
                text_chunks = re.findall(rb'\((.*?)\)', file_bytes)
                extracted = " ".join([c.decode('utf-8', errors='ignore') for c in text_chunks if len(c) > 2])
                if extracted and len(extracted.strip()) > 5:
                    return extracted.strip()
            except Exception as e:
                logger.warning(f"PDF byte extraction notice: {e}")
        elif ext == ".doc":
            try:
                import re
                readable = re.findall(r'[\x20-\x7E]{4,}', file_bytes.decode('latin-1', errors='ignore'))
                return " ".join(readable).strip()
            except Exception as e:
                logger.warning(f"DOC extraction notice: {e}")
        return ""

    def process(self, input_text: str = "", image_bytes: bytes = None, filename: str = "", input_url: str = "", target_language: str = None) -> dict:
        combined_text = ""
        source = "text"
        extracted_domain = ""
        ocr_extracted_text = ""
        claimed_brand = ""
        poster_type = "General Flyer / Image"
        poster_summary = ""
        is_job_poster = True
        is_unreadable = False
        validation_error = None
        vision_res = {}

        if input_text and input_text.strip():
            combined_text += input_text.strip() + "\n"

        if image_bytes:
            ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
            if ext in [".pdf", ".doc", ".docx"]:
                doc_text = IntakeAgent.extract_text_from_document(image_bytes, filename)
                if doc_text:
                    ocr_extracted_text = doc_text
                    combined_text += f"\n[DOCUMENT EXTRACTED TEXT ({filename})]:\n{doc_text}\n"
                    source = "document"
                else:
                    is_unreadable = True
                    validation_error = "The uploaded document quality is poor or unreadable. Please upload a clearer document or file."
            else:
                vision_res = self.analyze_poster_with_huggingface_vision(image_bytes) or {}
                if not isinstance(vision_res, dict):
                    vision_res = {}
                is_job_poster = vision_res.get("is_job_poster", True)
                is_unreadable = vision_res.get("is_unreadable", False)
                poster_type = vision_res.get("posterType", vision_res.get("poster_type", "General Poster / Flyer"))
                poster_summary = vision_res.get("poster_summary", "")
                validation_error = vision_res.get("validation_error")

                ocr_extracted_text = vision_res.get("posterText") or vision_res.get("extracted_text", "")
                if not ocr_extracted_text:
                    ocr_extracted_text = self.extract_text_from_image(image_bytes)
                
                claimed_brand = vision_res.get("companyName") or vision_res.get("claimed_brand", "")
                combined_text += f"\n[POSTER TEXT & METADATA]:\n{ocr_extracted_text}\n"
                if claimed_brand:
                    combined_text += f"Claimed Brand: {claimed_brand}\n"
                if poster_type:
                    combined_text += f"Poster Type: {poster_type}\n"
                if poster_summary:
                    combined_text += f"Poster Summary: {poster_summary}\n"
                source = "image"

        if input_url and input_url.strip():
            url_res = self.extract_text_from_url(input_url.strip())
            combined_text += f"\n{url_res['text']}\n"
            if url_res.get("domain"):
                extracted_domain = url_res["domain"]
            source = "url" if not input_text else "mixed"

        # Regex Extraction of key metadata entities
        emails_found = list(set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', combined_text)))
        urls_found = list(set(re.findall(r'https?://[^\s]+', combined_text)))
        telegram_handles = list(set(re.findall(r'@[A-Za-z0-9_]{4,}', combined_text)))
        phone_numbers = list(set(re.findall(r'\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}', combined_text)))

        if isinstance(vision_res, dict):
            if vision_res.get("email") and vision_res.get("email") not in emails_found:
                emails_found.append(vision_res.get("email"))
            if vision_res.get("website") and vision_res.get("website") not in urls_found:
                urls_found.append(vision_res.get("website"))
            if vision_res.get("phone") and vision_res.get("phone") not in phone_numbers:
                phone_numbers.append(vision_res.get("phone"))

        # Extract domain from URLs or emails if no domain provided
        if not extracted_domain and urls_found:
            try:
                from urllib.parse import urlparse
                parsed_u = urlparse(urls_found[0])
                u_domain = parsed_u.netloc.split(':')[0] if parsed_u.netloc else parsed_u.path.split('/')[0]
                if u_domain.startswith("www."):
                    u_domain = u_domain[4:]
                if u_domain and "." in u_domain:
                    extracted_domain = u_domain
            except Exception:
                pass

        if not extracted_domain and emails_found:
            extracted_domain = emails_found[0].split('@')[-1]

        detected_lang = self.detect_language(combined_text)
        final_lang = target_language if (target_language and target_language in ["en", "si", "ta", "hi", "bn"]) else detected_lang

        # Check Job Poster Recruitment Indicators across combined text (Image, Document, URL, Text)
        recruitment_keywords = [
            "we are hiring", "is hiring", "hiring for", "job vacancy", "job vacancies",
            "recruitment notice", "career opportunity", "career opportunities", "position available",
            "positions available", "apply now", "urgent vacancy", "urgent hiring", "walk-in interview",
            "salary:", "full-time", "part-time", "work from home job", "data entry job",
            "job requirement", "job requirements", "job description", "qualifications required",
            "responsibilities:", "apply at", "apply officially", "send your cv", "send your resume",
            "vacancy for", "hiring immediate", "looking for candidate", "looking for a",
            "බඳවාගැනීම්", "රැකියා", "ඇබෑර්තු", "ඉල්ලුම්", "වැටුප්", "පුරප්පාඩු", "බඳවා ගනු ලැබේ",
            "வேலை", "நியமனம்", "விண்ணப்பிக்க", "சம்பளம்", "காலியிடம்", "வேலைவாய்ப்பு",
            "भर्ती", "नौकरी", "आवेदन", "वेतन", "रिक्तियां", "रोजगार",
            "নিয়োগ", "চাকরি", "আবেদন", "বেতন", "কাজের"
        ]
        
        combined_lower = (combined_text or "").lower()
        has_recruitment_signals = any(kw in combined_lower for kw in recruitment_keywords)

        # Check non-job indicator keywords in extracted text (e.g. Graduation, University Ceremony, Event Banner)
        non_job_keywords = ["congratulations", "graduates", "graduation", "university", "faculty", "ceremony", "event", "workshop", "hackathon", "portfolio", "banner", "degree"]
        has_non_job_signals = any(kw in combined_lower for kw in non_job_keywords)

        # If vision_res explicitly returns "Not a Job Advertisement" OR non-job classification
        if isinstance(vision_res, dict) and vision_res.get("posterType"):
            p_type = str(vision_res.get("posterType")).strip().lower()
            if "not a job" in p_type or "non-job" in p_type or "graduation" in p_type or "event" in p_type or "ceremony" in p_type:
                is_job_poster = False
                poster_type = "Not a Job Advertisement"

        if combined_text and not has_recruitment_signals and not is_unreadable:
            is_job_poster = False
            poster_type = "Not a Job Advertisement"
            
            if has_non_job_signals:
                poster_summary = "The provided file is an educational graduation poster, university announcement, or event flyer. It contains no job recruitment vacancies or career offers."
            elif source == "url":
                poster_summary = f"The URL '{extracted_domain or input_url}' appears to be a commercial studio, portfolio, or web service. No recruitment vacancies, career opportunities, or hiring announcements were found."
            elif source == "document":
                poster_summary = f"The uploaded document '{filename}' contains general text or documentation, but no job vacancies or recruitment offers."
            else:
                poster_summary = "The provided content contains general text or media, but no job recruitment vacancies or career announcements."

            validation_error = "This URL or content is not a recruitment or job advertisement. Scam analysis has not been performed because the analyzed content is unrelated to job recruitment."

        hf_json = {
            "posterType": poster_type if not is_job_poster else "Job Advertisement",
            "companyName": claimed_brand or (vision_res.get("companyName") if isinstance(vision_res, dict) else ""),
            "jobTitle": vision_res.get("jobTitle", "") if isinstance(vision_res, dict) else "",
            "salary": vision_res.get("salary", "") if isinstance(vision_res, dict) else "",
            "website": vision_res.get("website", "") if isinstance(vision_res, dict) else (urls_found[0] if urls_found else ""),
            "email": vision_res.get("email", "") if isinstance(vision_res, dict) else (emails_found[0] if emails_found else ""),
            "phone": vision_res.get("phone", "") if isinstance(vision_res, dict) else (phone_numbers[0] if phone_numbers else ""),
            "address": vision_res.get("address", "") if isinstance(vision_res, dict) else "",
            "posterText": ocr_extracted_text or combined_text.strip(),
            "qrCode": vision_res.get("qrCode", "") if isinstance(vision_res, dict) else ""
        }

        return {
            "cleaned_text": combined_text.strip(),
            "ocr_text": ocr_extracted_text or "",
            "claimed_brand": claimed_brand or "",
            "poster_type": poster_type or "General Poster / Flyer",
            "poster_summary": poster_summary or "",
            "source": source,
            "domain": extracted_domain or "",
            "detected_language": detected_lang,
            "final_language": final_lang,
            "is_job_poster": is_job_poster,
            "is_unreadable": is_unreadable,
            "validation_error": validation_error,
            "hf_json": hf_json,
            "metadata_extracted": {
                "emails": emails_found,
                "urls": urls_found,
                "telegram_handles": telegram_handles,
                "phone_numbers": phone_numbers[:3]
            }
        }
