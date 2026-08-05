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
    def analyze_poster_with_gemini_vision(image_bytes: bytes) -> dict:
        """Analyze poster image directly using Gemini Multimodal Vision API (OCR + visual risk intelligence) with DeepSeek V4 fallback."""
        if not image_bytes:
            return {"is_job_poster": True, "extracted_text": "", "claimed_brand": "", "validation_error": None}

        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
        mime_type = IntakeAgent.detect_image_mime_type(image_bytes)
        base64_img = base64.b64encode(image_bytes).decode('utf-8')

        prompt = """
        You are SAFE-HIRE's Senior Multimodal Vision & Recruitment Fraud Intelligence Engine.
        Examine this uploaded image carefully to classify whether it is a Job Recruitment Poster / Career Flyer / Job Ad Screenshot OR a Non-Job Picture (such as an educational event flyer, workshop banner, hackathon poster, product ad, personal photo, generic graphics, etc.).

        CLASSIFICATION RULES:
        1. A JOB POSTER (`is_job_poster: true`) includes ANY hiring banner, recruitment flyer, walk-in interview notice, corporate relations hiring poster, job ad screenshot (LinkedIn, WhatsApp, Email, Facebook, newspaper), training course flyer with job guarantee, or career vacancy offer.
        2. A NON-JOB IMAGE (`is_job_poster: false`) is an image that has NO recruitment vacancy or hiring offer context whatsoever (e.g. event flyer, educational workshop, designathon banner, contest, product ad, personal photo, animal picture, meme, or random graphic).

        Return ONLY a raw JSON object with this exact structure (no markdown code blocks, no ```json formatting):
        {
          "is_job_poster": boolean (true for recruitment/hiring poster/flyer, false for non-hiring/general/event pictures),
          "poster_type": "Specific Classification (e.g. Designathon / Hackathon Event Poster, Educational Workshop Flyer, Corporate Course Banner, Product Advertisement, Personal Photo)",
          "poster_summary": "Clear 2-3 sentence summary of what this poster/image is about, who organized it, dates, location, and key details.",
          "extracted_text": "Full verbatim text extracted from the poster...",
          "claimed_brand": "Extracted company, institution, or brand name if present",
          "job_title": "Position, role, or event title if present",
          "contact_email": "Extracted email if present",
          "phone_number": "Extracted phone number if present",
          "has_fee_demand": false,
          "validation_error": null
        }
        """

        models_to_try = ["gemini-2.0-flash", "gemini-2.0-flash-lite"]

        # 1. Try Gemini Vision REST generateContent Endpoint (most reliable for multimodal base64)
        if gemini_key:
            for model_name in models_to_try:
                try:
                    rest_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
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
                    res = requests.post(rest_url, json=rest_payload, timeout=3.5)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates") if isinstance(data, dict) else None
                        content = ""
                        if candidates and isinstance(candidates, list) and len(candidates) > 0 and isinstance(candidates[0], dict):
                            content_obj = candidates[0].get("content") or {}
                            if isinstance(content_obj, dict):
                                parts = content_obj.get("parts") or []
                                if parts and isinstance(parts, list) and len(parts) > 0 and isinstance(parts[0], dict):
                                    content = parts[0].get("text") or ""
                        clean = (content or "").strip().replace("```json", "").replace("```", "").strip()
                        if "<think>" in clean and "</think>" in clean:
                            clean = clean.split("</think>")[-1].strip()
                        if clean:
                            parsed = json.loads(clean)
                            if isinstance(parsed, dict):
                                logger.info(f"Gemini Vision ({model_name}) REST poster analysis success: is_job_poster={parsed.get('is_job_poster')}")
                                return parsed
                    elif res.status_code == 429:
                        logger.warning(f"Gemini Vision ({model_name}) HTTP 429 quota notice. Trying next model...")
                except Exception as e:
                    logger.warning(f"Gemini Vision REST notice for model {model_name}: {e}")

            # 2. Try Gemini Vision OpenAI Compatibility Endpoint
            for model_name in models_to_try:
                try:
                    url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {gemini_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": model_name,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_img}"}}
                                ]
                            }
                        ],
                        "temperature": 0.1,
                        "max_tokens": 4096
                    }

                    res = requests.post(url, json=payload, headers=headers, timeout=3.5)
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
                                logger.info(f"Gemini Vision ({model_name}) OpenAI endpoint success: is_job_poster={parsed.get('is_job_poster')}")
                                return parsed
                except Exception as e:
                    logger.warning(f"Gemini Vision OpenAI endpoint notice for model {model_name}: {e}")

        # 3. Fallback: High-Accuracy OCR + DeepSeek V4 Flash AI Analysis
        logger.info("Executing Fallback OCR + DeepSeek V4 Flash poster analysis...")
        ocr_text = IntakeAgent.extract_text_from_image(image_bytes)

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
                res = requests.post(deepseek_url, json=payload, headers=headers, timeout=3.5)
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

        # Rule Engine Fallback check — For uploaded images, always default to analyzing as job poster
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

        # 1. Local Tesseract OCR
        if pytesseract is not None:
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

        # 2. High-Accuracy Cloud OCR API Fallback (OCR.space)
        try:
            url = "https://api.ocr.space/parse/image"
            base64_str = "data:image/png;base64," + base64.b64encode(image_bytes).decode('utf-8')
            payload = {
                "apikey": "K88888888888957",
                "base64Image": base64_str,
                "language": "eng",
                "isOverlayRequired": False,
                "OCREngine": 2
            }
            res = requests.post(url, data=payload, timeout=3.5)
            if res.status_code == 200:
                data = res.json()
                parsed_results = data.get("ParsedResults", [])
                if parsed_results:
                    cloud_text = parsed_results[0].get("ParsedText", "").strip()
                    if cloud_text and len(cloud_text) > 5:
                        logger.info("Successfully extracted poster text via Cloud OCR API.")
                        return cloud_text
        except Exception as e:
            logger.warning(f"Cloud OCR API notice: {e}")

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
            response = requests.get(url_clean, headers=headers, timeout=6)
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

    def process(self, input_text: str = "", image_bytes: bytes = None, input_url: str = "", target_language: str = None) -> dict:
        combined_text = ""
        source = "text"
        extracted_domain = ""
        ocr_extracted_text = ""
        claimed_brand = ""
        poster_type = "General Flyer / Image"
        poster_summary = ""
        is_job_poster = True
        validation_error = None

        if input_text and input_text.strip():
            combined_text += input_text.strip() + "\n"

        if image_bytes:
            vision_res = self.analyze_poster_with_gemini_vision(image_bytes) or {}
            if not isinstance(vision_res, dict):
                vision_res = {}
            is_job_poster = vision_res.get("is_job_poster", True)
            poster_type = vision_res.get("poster_type", "General Poster / Flyer")
            poster_summary = vision_res.get("poster_summary", "")
            validation_error = vision_res.get("validation_error")

            ocr_extracted_text = vision_res.get("extracted_text", "")
            if not ocr_extracted_text:
                ocr_extracted_text = self.extract_text_from_image(image_bytes)
            
            claimed_brand = vision_res.get("claimed_brand", "")
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
            "validation_error": validation_error,
            "metadata_extracted": {
                "emails": emails_found,
                "urls": urls_found,
                "telegram_handles": telegram_handles,
                "phone_numbers": phone_numbers[:3]
            }
        }
