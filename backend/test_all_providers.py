import sys
import io
import json
import base64
import requests
from PIL import Image, ImageDraw
from app.config import settings

sys.stdout.reconfigure(encoding='utf-8')

# Create 3 test images:
# 1. Obvious fake recruitment flyer (high risk, fee, telegram)
img1 = Image.new('RGB', (600, 300), color=(255, 255, 255))
d1 = ImageDraw.Draw(img1)
d1.text((20, 20), "URGENT HIRING - GOOGLE REMOTE DATA ENTRY", fill=(0, 0, 0))
d1.text((20, 60), "Salary: $5,000 / week! No experience needed!", fill=(0, 0, 0))
d1.text((20, 100), "Pay $50 refundable registration fee to get laptop kit.", fill=(0, 0, 0))
d1.text((20, 140), "Contact recruiter on Telegram: @google_fast_hire", fill=(0, 0, 0))
d1.text((20, 180), "Email: google_recruiter_2026@gmail.com", fill=(0, 0, 0))
buf1 = io.BytesIO()
img1.save(buf1, format='PNG')
fake_poster_bytes = buf1.getvalue()

# 2. Food / Restaurant Poster (Non-job poster)
img2 = Image.new('RGB', (600, 300), color=(255, 240, 220))
d2 = ImageDraw.Draw(img2)
d2.text((20, 20), "DELICIOUS PIZZA FESTIVAL 2026", fill=(180, 0, 0))
d2.text((20, 60), "50% OFF ALL LARGE PIZZAS & BURGERS THIS WEEKEND!", fill=(0, 0, 0))
d2.text((20, 100), "Italian Crust, Cheesy Pepperoni, Garlic Bread Combo", fill=(0, 0, 0))
d2.text((20, 140), "Visit Bella Italian Bistro, 45 Main Street", fill=(0, 0, 0))
d2.text((20, 180), "Order online at www.bellapizzabistro.com", fill=(0, 0, 0))
buf2 = io.BytesIO()
img2.save(buf2, format='PNG')
food_poster_bytes = buf2.getvalue()

# 3. Genuine Recruitment Poster
img3 = Image.new('RGB', (600, 300), color=(240, 245, 255))
d3 = ImageDraw.Draw(img3)
d3.text((20, 20), "CAREER OPPORTUNITY: SENIOR BACKEND ENGINEER", fill=(0, 50, 150))
d3.text((20, 60), "Company: Virtusa Corporation (Colombo Tech Campus)", fill=(0, 0, 0))
d3.text((20, 100), "Requirements: 4+ years Python, FastAPI, Microservices", fill=(0, 0, 0))
d3.text((20, 140), "Competitive salary based on experience. Equal opportunity employer.", fill=(0, 0, 0))
d3.text((20, 180), "Apply officially via career portal: https://careers.virtusa.com", fill=(0, 0, 0))
buf3 = io.BytesIO()
img3.save(buf3, format='PNG')
genuine_poster_bytes = buf3.getvalue()

print("Created 3 in-memory test images successfully.")

# Test Vision with Gemini models
gemini_key = settings.GEMINI_API_KEY
b64_food = base64.b64encode(food_poster_bytes).decode('utf-8')
b64_fake = base64.b64encode(fake_poster_bytes).decode('utf-8')

print("\n--- Testing Gemini Vision with Food Poster ---")
for m in ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"]:
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": "Analyze this image. Is it a job advertisement or not? Return JSON: {\"is_job_poster\": boolean, \"poster_type\": string, \"summary\": string}"},
                    {"inline_data": {"mime_type": "image/png", "data": b64_food}}
                ]
            }],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300}
        }
        res = requests.post(url, json=payload, timeout=20)
        print(f"[{m}] Status: {res.status_code}")
        if res.status_code == 200:
            text = res.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            print(f"[{m}] Result: {text.strip()}")
            break
    except Exception as e:
        print(f"[{m}] Error: {e}")

print("\n--- Testing Gemini Vision with Fake Job Poster ---")
for m in ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"]:
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": "Analyze this image. Is it a job advertisement or not? If yes, what are the red flags? Return JSON: {\"is_job_poster\": boolean, \"poster_type\": string, \"red_flags\": list, \"scam_score\": int}"},
                    {"inline_data": {"mime_type": "image/png", "data": b64_fake}}
                ]
            }],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 500}
        }
        res = requests.post(url, json=payload, timeout=20)
        print(f"[{m}] Status: {res.status_code}")
        if res.status_code == 200:
            text = res.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            print(f"[{m}] Result: {text.strip()}")
            break
    except Exception as e:
        print(f"[{m}] Error: {e}")
