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

    # DeepSeek V4 AI Settings (Hugging Face Router)
    DEEPSEEK_V4_API_KEY: str = os.getenv("DEEPSEEK_V4_API_KEY", "")
    DEEPSEEK_API_BASE_URL: str = os.getenv("DEEPSEEK_API_BASE_URL", "https://router.huggingface.co/v1")
    DEEPSEEK_MODEL_NAME: str = os.getenv("DEEPSEEK_MODEL_NAME", "deepseek-ai/DeepSeek-V4-Flash")
    GOOGLE_SAFE_BROWSING_API_KEY: str = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "")

    # Firebase Settings
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
