import re
import logging
import requests
from bs4 import BeautifulSoup
from typing import Dict, Any

logger = logging.getLogger("safe_hire.intake_agent")

from app.config import settings

class IntakeAgent:
    """Agent 1: Ingests text, image OCR, and URL; extracts metadata, contacts, language, and validates job poster image content via Gemini 2.5 Flash Vision."""

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
    def analyze_image_with_deepseek_v4(image_bytes: bytes) -> dict:
        """Analyze image text OCR using DeepSeek-V4-Flash to validate if it's a job poster or non-job photo (human, animal, crops, etc.)."""
        if not image_bytes:
            return {"is_job_poster": True, "extracted_text": "", "validation_error": None}

        # 1. Extract text via OCR
        extracted_text = IntakeAgent.extract_text_from_image(image_bytes)
        clean_text = extracted_text.strip() if extracted_text else ""

        # 2. If NO text or very short non-text image (e.g. millet crop field, nature, selfie, animal picture)
        if len(clean_text) < 15:
            logger.info("Image contains no readable job text (non-job image detected).")
            return {
                "is_job_poster": False,
                "image_category": "non_job_photo",
                "validation_error": "⚠️ NON-JOB POSTER DETECTED: The uploaded picture contains no job advertisement text or career vacancy details. Please upload a valid job offer flyer, recruitment ad screenshot, or offer letter.",
                "extracted_text": clean_text
            }

        # 3. Analyze extracted text using DeepSeek-V4-Flash
        api_key = settings.DEEPSEEK_V4_API_KEY
        if api_key:
            import json

            try:
                url = f"{settings.DEEPSEEK_API_BASE_URL.rstrip('/')}/chat/completions"
                prompt = f"""
                You are SAFE-HIRE's Senior Image & Document Verification Specialist.
                Examine the extracted OCR text from an uploaded image below to classify its content type.

                [EXTRACTED OCR TEXT FROM IMAGE]:
                "{clean_text[:2000]}"

                CLASSIFICATION GUIDELINES:
                1. A JOB POSTER (`is_job_poster: true`) includes ANY recruitment flyer, hiring banner, job advertisement screenshot (from LinkedIn, WhatsApp, Email, Facebook, newspaper, job site), or career vacancy announcement.
                
                2. A NON-JOB IMAGE (`is_job_poster: false`) is an image that has NO job recruitment text or career context whatsoever, such as a casual personal selfie, a pet/animal photo, nature/crop landscape, meme, document receipt, or random object picture.

                Return a raw JSON object with this exact structure:
                {{
                  "is_job_poster": boolean (true for any job ad/recruitment poster/screenshot/hiring banner, false for non-job photos/documents),
                  "image_category": "job_advertisement" or "human_photo" or "animal_photo" or "nature_crop_photo" or "other_non_job",
                  "validation_error": "⚠️ NON-JOB POSTER DETECTED: This image does not contain a job recruitment ad or career offer." (Provide this message ONLY if is_job_poster is false, else null)
                }}
                Do not include markdown code block formatting. Return raw JSON string only.
                """

                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": settings.DEEPSEEK_MODEL_NAME,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 512
                }

                res = requests.post(url, json=payload, headers=headers, timeout=12)
                if res.status_code == 200:
                    content = res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    clean = content.strip().replace("```json", "").replace("```", "").strip()
                    if "<think>" in clean and "</think>" in clean:
                        clean = clean.split("</think>")[-1].strip()
                    parsed = json.loads(clean)
                    parsed["extracted_text"] = clean_text
                    logger.info(f"DeepSeek V4 image classification result: is_job_poster={parsed.get('is_job_poster')}")
                    return parsed
            except Exception as e:
                logger.warning(f"DeepSeek V4 image classification notice: {e}")

        # 4. Fallback Keyword Rule Engine
        job_keywords = ["hiring", "job", "career", "vacancy", "intern", "salary", "apply", "recruiter", "work from home", "full time", "part time", "walk-in", "position", "urgently", "bpo", "developer", "designer", "manager", "staff", "opportunity", "earn"]
        has_job_keyword = any(kw in clean_text.lower() for kw in job_keywords)

        if not has_job_keyword:
            return {
                "is_job_poster": False,
                "image_category": "non_job_photo",
                "validation_error": "⚠️ NON-JOB POSTER DETECTED: The text in this uploaded image does not contain any job vacancy or recruitment details.",
                "extracted_text": clean_text
            }

        return {
            "is_job_poster": True,
            "image_category": "job_advertisement",
            "validation_error": None,
            "extracted_text": clean_text
        }

    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """Extract text from poster image using local Tesseract OCR with automatic Cloud OCR API fallback."""
        if not image_bytes:
            return ""

        # 1. Attempt Tesseract OCR locally if binary/pytesseract is available
        try:
            from PIL import Image, ImageEnhance
            import io
            import pytesseract

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
            import base64
            url = "https://api.ocr.space/parse/image"
            base64_str = "data:image/png;base64," + base64.b64encode(image_bytes).decode('utf-8')
            payload = {
                "apikey": "K88888888888957",
                "base64Image": base64_str,
                "language": "eng",
                "isOverlayRequired": False,
                "OCREngine": 2
            }
            res = requests.post(url, data=payload, timeout=12)
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
                
                # Extract meta description
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
        is_job_poster = True
        validation_error = None

        if input_text and input_text.strip():
            combined_text += input_text.strip() + "\n"

        if image_bytes:
            img_eval = self.analyze_image_with_deepseek_v4(image_bytes)
            if img_eval.get("is_job_poster") is False:
                is_job_poster = False
                validation_error = img_eval.get("validation_error", "This is not a job poster image. Please provide a suitable job advertisement application or screenshot.")
            
            ocr_extracted_text = img_eval.get("extracted_text") or self.extract_text_from_image(image_bytes)
            combined_text += f"\n{ocr_extracted_text}\n"
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

        # Extract domain from emails if no domain provided
        if not extracted_domain and emails_found:
            extracted_domain = emails_found[0].split('@')[-1]

        detected_lang = self.detect_language(combined_text)
        final_lang = target_language if (target_language and target_language in ["en", "si", "ta", "hi", "bn"]) else detected_lang

        return {
            "cleaned_text": combined_text.strip(),
            "ocr_text": ocr_extracted_text,
            "source": source,
            "domain": extracted_domain,
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
