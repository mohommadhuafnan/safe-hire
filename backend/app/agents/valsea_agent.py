import logging
import requests
from typing import Optional, Dict, Any, List
from app.config import settings

logger = logging.getLogger("safe_hire.valsea")

# Supported Valsea target language codes mapped to Valsea target names
VALSEA_LANG_MAP = {
    "ta": "tamil",
    "tamil": "tamil",
    "en": "english",
    "english": "english",
    "zh": "chinese",
    "chinese": "chinese",
    "fr": "french",
    "french": "french",
    "de": "german",
    "german": "german",
    "vi": "vietnamese",
    "vietnamese": "vietnamese",
    "th": "thai",
    "thai": "thai",
    "id": "indonesian",
    "indonesian": "indonesian",
    "ja": "japanese",
    "japanese": "japanese",
    "ko": "korean",
    "korean": "korean",
    "ms": "malay",
    "malay": "malay",
    "ru": "russian",
    "russian": "russian",
    "es": "spanish",
    "spanish": "spanish",
    "fil": "filipino",
    "tl": "filipino",
    "filipino": "filipino",
    "km": "khmer",
    "khmer": "khmer",
    "lo": "lao",
    "lao": "lao",
}

class ValseaTranslationAgent:
    """
    Dedicated Valsea AI Translation Agent.
    Interfaces directly with https://api.valsea.ai/v1/translations using official Bearer authentication.
    """

    def __init__(self):
        self.api_key = getattr(settings, "VALSEA_API_KEY", "") or ""
        self.api_url = getattr(settings, "VALSEA_API_URL", "https://api.valsea.ai/v1/translations")
        self.model = getattr(settings, "VALSEA_MODEL_NAME", "valsea-translate")

    def translate_text(self, text: str, target_lang: str) -> Optional[str]:
        """
        Translates a single text string into target language using Valsea AI.
        """
        if not text or not text.strip():
            return text

        if not self.api_key:
            logger.warning("Valsea API key missing.")
            return None

        valsea_target = VALSEA_LANG_MAP.get(target_lang.lower().strip())
        if not valsea_target:
            logger.info(f"Target language '{target_lang}' not supported by Valsea API directly.")
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "text": text,
            "target": valsea_target
        }

        try:
            res = requests.post(self.api_url, json=payload, headers=headers, timeout=3.5)
            if res.status_code == 200:
                data = res.json()
                translated = data.get("translated_text") or data.get("translation")
                if translated:
                    logger.info(f"✅ Valsea AI translation success for target '{valsea_target}'")
                    return str(translated).strip()
            else:
                logger.warning(f"Valsea API HTTP {res.status_code}: {res.text[:200]}")
        except Exception as e:
            logger.warning(f"Valsea API Exception: {e}")

        return None

    def translate_report_components(
        self,
        explanation_text: str,
        recommendations: List[str],
        breakdown_signals: List[str],
        target_lang: str
    ) -> Optional[Dict[str, Any]]:
        """
        Translates all report components concurrently using Valsea AI translation endpoint.
        """
        valsea_target = VALSEA_LANG_MAP.get(target_lang.lower().strip())
        if not valsea_target:
            return None

        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=6) as executor:
            fut_exp = executor.submit(self.translate_text, explanation_text, target_lang) if explanation_text else None
            fut_recs = [executor.submit(self.translate_text, rec, target_lang) for rec in (recommendations or [])]
            fut_sigs = [executor.submit(self.translate_text, sig, target_lang) for sig in (breakdown_signals or [])]

            translated_exp = fut_exp.result() if fut_exp else explanation_text
            translated_recs = [f.result() or r for f, r in zip(fut_recs, recommendations or [])]
            translated_sigs = [f.result() or s for f, s in zip(fut_sigs, breakdown_signals or [])]

        return {
            "explanation_text": translated_exp or explanation_text,
            "recommendations": translated_recs,
            "breakdown_signals": translated_sigs,
            "target_language": target_lang
        }

valsea_translator = ValseaTranslationAgent()
