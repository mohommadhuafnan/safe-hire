import requests
import json
from app.config import settings

print("=== 1. TEST GEMINI API ===")
gemini_key = settings.GEMINI_API_KEY
print("Gemini Key:", gemini_key[:10] + "..." if gemini_key else "None")

# Test listing models or querying models
for m in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
    try:
        res = requests.post(url, json={"contents": [{"parts": [{"text": "Say test"}]}]}, timeout=10)
        print(f"Model {m}: status={res.status_code}, response={res.text[:150]}")
    except Exception as e:
        print(f"Model {m}: error={e}")

# Also query list of available models for this key
try:
    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}"
    l_res = requests.get(list_url, timeout=10)
    print(f"List models status: {l_res.status_code}")
    if l_res.status_code == 200:
        models_data = l_res.json().get("models", [])
        print("Available models:", [m.get("name") for m in models_data if "flash" in m.get("name", "") or "pro" in m.get("name", "")])
    else:
        print("List models error:", l_res.text[:200])
except Exception as e:
    print("List models exception:", e)

print("\n=== 2. TEST HUGGINGFACE / DEEPSEEK ROUTER ===")
hf_token = settings.HF_TOKEN
hf_url = f"{settings.HF_API_BASE_URL.rstrip('/')}/chat/completions"
print("HF Token:", hf_token[:10] + "..." if hf_token else "None")
print("HF URL:", hf_url)

for model in [settings.DEEPSEEK_MODEL_NAME, "deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct"]:
    try:
        headers = {"Authorization": f"Bearer {hf_token}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Respond with OK"}],
            "max_tokens": 20
        }
        res = requests.post(hf_url, headers=headers, json=payload, timeout=15)
        print(f"HF Model {model}: status={res.status_code}, response={res.text[:200]}")
    except Exception as e:
        print(f"HF Model {model}: error={e}")
