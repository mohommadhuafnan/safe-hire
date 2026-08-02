import sys
import os

# Add parent directory to sys.path so 'app' can be imported cleanly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

# Export app for Vercel Serverless / ASGI
__all__ = ["app"]
