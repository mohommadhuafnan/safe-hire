import os
from typing import Optional
from pydantic_settings import BaseSettings

def _clean_env_val(val: Optional[str], default: str = "") -> str:
    """Sanitize environment variables against multiline pastes, quotes, or trailing key definitions."""
    if val is None:
        return default
    val_str = str(val).strip()
    if not val_str:
        return default
    lines = [line.strip() for line in val_str.splitlines() if line.strip()]
    if not lines:
        return default
    first_line = lines[0]
    if "=" in first_line and not first_line.startswith("http://") and not first_line.startswith("https://") and not first_line.startswith("mongodb"):
        first_line = first_line.split("=", 1)[1]
    cleaned = first_line.strip().strip('"').strip("'").strip()
    return cleaned or default

class Settings(BaseSettings):
    APP_NAME: str = "SAFE-HIRE Scam Detector API"
    DEBUG: bool = True
    
    # MongoDB Settings
    MONGO_URI: str = _clean_env_val(os.getenv("MONGO_URI"), "mongodb://localhost:27017")
    MONGO_DB_NAME: str = _clean_env_val(os.getenv("MONGO_DB_NAME"), "safe_hire_db")
    
    # Auth JWT
    JWT_SECRET: str = _clean_env_val(os.getenv("JWT_SECRET"), "safe_hire_super_secret_jwt_key_2026_safe_recruit_secure_token")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Gemini AI Settings
    GEMINI_API_KEY: str = _clean_env_val(os.getenv("GEMINI_API_KEY"))
    GEMINI_MODEL_PRIMARY: str = _clean_env_val(os.getenv("GEMINI_MODEL_PRIMARY"), "gemini-flash-lite-latest")
    GEMINI_TIMEOUT: int = int(_clean_env_val(os.getenv("GEMINI_TIMEOUT"), "15"))

    # Hugging Face AI Settings
    HF_TOKEN: str = _clean_env_val(os.getenv("HF_TOKEN")) or _clean_env_val(os.getenv("DEEPSEEK_V4_API_KEY"))
    HF_MODEL_NAME: str = _clean_env_val(os.getenv("HF_MODEL_NAME"), "Qwen/Qwen2.5-VL-7B-Instruct")
    HF_API_BASE_URL: str = _clean_env_val(os.getenv("HF_API_BASE_URL"), "https://router.huggingface.co/v1")

    # DeepSeek AI Settings (Hugging Face Router)
    DEEPSEEK_V4_API_KEY: str = _clean_env_val(os.getenv("DEEPSEEK_V4_API_KEY")) or _clean_env_val(os.getenv("HF_TOKEN"))
    DEEPSEEK_API_BASE_URL: str = _clean_env_val(os.getenv("DEEPSEEK_API_BASE_URL"), "https://router.huggingface.co/v1")
    DEEPSEEK_MODEL_NAME: str = _clean_env_val(os.getenv("DEEPSEEK_MODEL_NAME"), "deepseek-ai/DeepSeek-V4-Flash")
    GOOGLE_SAFE_BROWSING_API_KEY: str = _clean_env_val(os.getenv("GOOGLE_SAFE_BROWSING_API_KEY"))

    # APILayer & WHOIS API Settings
    APILAYER_KEY: str = _clean_env_val(os.getenv("APILAYER_KEY"), "nIvPeI99eWBDMSArYAf2YcrshDCOVvJ3")
    WHOIS_IS_API_KEY: str = _clean_env_val(os.getenv("WHOIS_IS_API_KEY"), "wis_live_KyVkL7gYMiXFivIQG46K9Xe4sh5THeAPT7rqgbAb")

    # Abstract API Email Validation Settings
    ABSTRACT_EMAIL_API_KEY: str = _clean_env_val(os.getenv("ABSTRACT_EMAIL_API_KEY"), "65b5f7a51dcf4cf4b00176ac9e690531")

    # Valsea AI Translation Settings
    VALSEA_API_KEY: str = _clean_env_val(os.getenv("VALSEA_API_KEY"), "vl_7a5a9f08a2f52681eca39db60314a5bb7ac93bd9e337086d0ce121301d1e04e8.451230e514da410b8f8e2a33346f0ecf")
    VALSEA_API_URL: str = _clean_env_val(os.getenv("VALSEA_API_URL"), "https://api.valsea.ai/v1/translations")
    VALSEA_MODEL_NAME: str = _clean_env_val(os.getenv("VALSEA_MODEL_NAME"), "valsea-translate")

    # Firebase Settings
    FIREBASE_SERVICE_ACCOUNT_PATH: str = _clean_env_val(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"), "serviceAccountKey.json")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
