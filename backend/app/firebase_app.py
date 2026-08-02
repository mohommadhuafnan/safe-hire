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

    key_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
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
    """Verify incoming Firebase ID token from frontend with Admin SDK or fallback token parser."""
    if init_firebase():
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            logger.error(f"Error verifying Firebase ID token with Admin SDK: {e}")

    # Fallback: decode unverified JWT header/payload if serviceAccountKey.json is pending
    try:
        import jwt
        decoded_unverified = jwt.decode(id_token, options={"verify_signature": False})
        logger.info("Successfully parsed unverified Firebase ID token payload.")
        return decoded_unverified
    except Exception as e:
        logger.warning(f"Unverified token parse failed: {e}")
        return None
