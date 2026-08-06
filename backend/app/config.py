import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "SAFE-HIRE Scam Detector API"
    DEBUG: bool = True
    
    # MongoDB Settings
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "safe_hire_db")
    
    # Auth JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "safe_hire_super_secret_jwt_key_2026_safe_recruit_secure_token")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Gemini AI Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL_PRIMARY: str = os.getenv("GEMINI_MODEL_PRIMARY", "gemini-2.5-flash")
    GEMINI_TIMEOUT: int = int(os.getenv("GEMINI_TIMEOUT", "60"))

    # DeepSeek V4 AI Settings (Hugging Face Router)
    DEEPSEEK_V4_API_KEY: str = os.getenv("DEEPSEEK_V4_API_KEY", "")
    DEEPSEEK_API_BASE_URL: str = os.getenv("DEEPSEEK_API_BASE_URL", "https://router.huggingface.co/v1")
    DEEPSEEK_MODEL_NAME: str = os.getenv("DEEPSEEK_MODEL_NAME", "deepseek-ai/DeepSeek-V4-Flash")
    GOOGLE_SAFE_BROWSING_API_KEY: str = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "AIzaSyC6BIN5Bl3vIsLZVb7_5EiJqwQc6oik2x4")

    # APILayer & WHOIS API Settings
    APILAYER_KEY: str = os.getenv("APILAYER_KEY", "nIvPeI99eWBDMSArYAf2YcrshDCOVvJ3")
    WHOIS_IS_API_KEY: str = os.getenv("WHOIS_IS_API_KEY", "wis_live_KyVkL7gYMiXFivIQG46K9Xe4sh5THeAPT7rqgbAb")

    # Abstract API Email Validation Settings
    ABSTRACT_EMAIL_API_KEY: str = os.getenv("ABSTRACT_EMAIL_API_KEY", "65b5f7a51dcf4cf4b00176ac9e690531")

    # Firebase Settings
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
