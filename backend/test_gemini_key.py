import sys
import requests
from app.config import settings

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("Testing Gemini API Key:", settings.GEMINI_API_KEY[:8] + "...")

# Test endpoint model list / generation
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.GEMINI_API_KEY}"

try:
    res = requests.get(url, timeout=5)
    print("API Response Status Code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        models = [m.get("name") for m in data.get("models", [])]
        print("Available Models:", models[:5])
    else:
        print("Response Error Body:", res.text[:300])
except Exception as e:
    print("Request exception:", e)
