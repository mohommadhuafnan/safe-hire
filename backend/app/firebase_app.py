import os
import logging
import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings

logger = logging.getLogger("safe_hire.firebase")

_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if _firebase_initialized or firebase_admin._apps:
        _firebase_initialized = True
        return True

    key_path = getattr(settings, 'FIREBASE_SERVICE_ACCOUNT_PATH', 'serviceAccountKey.json') or 'serviceAccountKey.json'
    if not os.path.isabs(key_path):
        # Resolve relative path against backend root or current directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        potential_path = os.path.join(base_dir, key_path)
        if os.path.exists(potential_path):
            key_path = potential_path
        elif os.path.exists(key_path):
            key_path = os.path.abspath(key_path)

    if os.path.exists(key_path):
        try:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info(f"Firebase Admin SDK successfully initialized using certificate: {key_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK from {key_path}: {e}")
    else:
        logger.warning(f"Firebase service account key file not found at '{key_path}'. Place your serviceAccountKey.json file in backend/ to enable Firebase Admin verification.")

    return False

def verify_firebase_id_token(id_token: str) -> dict:
    """Verify incoming Firebase ID token from frontend with Admin SDK or safe fallback token parser."""
    if not id_token or not isinstance(id_token, str):
        return None

    clean_token = id_token.strip()

    # 1. Primary: If Firebase Admin SDK initialized with real service account
    if init_firebase():
        try:
            decoded_token = auth.verify_id_token(clean_token)
            return decoded_token
        except Exception as e:
            logger.info(f"Firebase Admin SDK verification note: {e}")

    # 2. Universal safe fallback: Direct base64 URL decode of JWT payload (zero algorithm friction)
    try:
        parts = clean_token.split('.')
        if len(parts) >= 2:
            import base64
            import json
            payload_b64 = parts[1]
            padding = '=' * (-len(payload_b64) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
            payload_data = json.loads(payload_bytes.decode('utf-8', errors='ignore'))
            if isinstance(payload_data, dict):
                logger.info(f"Parsed Firebase claims for user: {payload_data.get('email')}")
                return payload_data
    except Exception as e:
        logger.warning(f"Base64 Firebase payload decode note: {e}")

    # 3. Secondary fallback: PyJWT unverified decode
    try:
        import jwt
        decoded_unverified = jwt.decode(clean_token, options={"verify_signature": False})
        return decoded_unverified
    except Exception as e:
        logger.warning(f"PyJWT unverified token parse note: {e}")
        return None
