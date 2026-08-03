import sys
import requests
from app.config import settings

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("Testing DeepSeek V4 Key:", settings.DEEPSEEK_V4_API_KEY[:8] + "...")
print("Target Endpoint:", settings.DEEPSEEK_API_BASE_URL)
print("Model Name:", settings.DEEPSEEK_MODEL_NAME)

url = f"{settings.DEEPSEEK_API_BASE_URL.rstrip('/')}/chat/completions"
headers = {
    "Authorization": f"Bearer {settings.DEEPSEEK_V4_API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "model": settings.DEEPSEEK_MODEL_NAME,
    "messages": [{"role": "user", "content": "Ping test. Respond with OK."}],
    "max_tokens": 20
}

try:
    res = requests.post(url, headers=headers, json=payload, timeout=10)
    print("API Response Status Code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        print("Response Content:", content.strip())
    else:
        print("Response Error Body:", res.text[:300])
except Exception as e:
    print("Request exception:", e)
