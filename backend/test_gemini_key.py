"""Test Gemini API key validity after rate limit cooldown."""
import sys, os, requests, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Key is loaded from environment — never hardcode secrets in source files
KEY = os.environ.get("GEMINI_API_KEY", "")
if not KEY:
    print("ERROR: GEMINI_API_KEY environment variable not set. Run: set GEMINI_API_KEY=your_key")
    sys.exit(1)
MODELS = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]

print("Waiting 15s for rate limit cooldown...")
time.sleep(15)

for model in MODELS:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}"
    payload = {
        "contents": [{"parts": [{"text": "Reply with the single word: OK"}]}],
        "generationConfig": {"maxOutputTokens": 10, "temperature": 0.0}
    }
    try:
        r = requests.post(url, json=payload, timeout=20)
        if r.status_code == 200:
            text = (
                r.json()
                .get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            print(f"[{model}] SUCCESS - Response: {text.strip()[:60]}")
            break
        elif r.status_code == 429:
            quota_msg = r.json().get("error", {}).get("message", "quota exceeded")
            print(f"[{model}] 429 QUOTA LIMIT - Key is VALID but rate-limited: {quota_msg[:100]}")
        elif r.status_code == 401:
            print(f"[{model}] 401 UNAUTHORIZED - Key is INVALID")
            break
        else:
            print(f"[{model}] HTTP {r.status_code}: {r.text[:150]}")
    except Exception as e:
        print(f"[{model}] ERROR: {e}")

print("\nDone.")
