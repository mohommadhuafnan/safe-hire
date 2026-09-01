import requests
import json
from app.config import settings

gemini_key = settings.GEMINI_API_KEY
print("Testing active Gemini models...")

models = ["gemini-2.5-flash-lite", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash"]

for m in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
    try:
        payload = {
            "contents": [{"parts": [{"text": "You are a test assistant. Reply with JSON: {\"status\": \"ok\", \"model\": \"" + m + "\"}"}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 200}
        }
        res = requests.post(url, json=payload, timeout=15)
        print(f"[{m}] Status: {res.status_code}")
        if res.status_code == 200:
            text = res.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            print(f"[{m}] Output: {text.strip()}")
        else:
            print(f"[{m}] Error: {res.text[:150]}")
    except Exception as e:
        print(f"[{m}] Exception: {e}")
