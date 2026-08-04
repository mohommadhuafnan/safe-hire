import sys
import asyncio
import io
from PIL import Image, ImageDraw
from app.agents.pipeline import pipeline_runner

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def test_real_poster_upload():
    # Generate a sample job flyer PNG image with text
    img = Image.new('RGB', (600, 300), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((30, 30), "WE ARE HIRING! FULL STACK DEVELOPER", fill=(0, 0, 0))
    d.text((30, 70), "Company: Virtusa Corporation", fill=(0, 0, 0))
    d.text((30, 110), "Requirements: React, Node.js, Python, MongoDB", fill=(0, 0, 0))
    d.text((30, 150), "Apply officially at: https://careers.virtusa.com/job-id-9982", fill=(0, 0, 0))
    d.text((30, 190), "No registration fees or deposit required.", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    poster_bytes = buf.getvalue()

    res = await pipeline_runner.run(input_text="", image_bytes=poster_bytes, input_url="", target_language="en")
    
    print("==========================================")
    print(" POSTER ANALYSIS RESULT ")
    print("==========================================")
    print("Is Job Poster:", res["intake_data"].get("is_job_poster"))
    print("Scam Score:", res.get("scam_score"))
    print("Risk Level:", res.get("risk_level"))
    print("Explanation:\n", res.get("explanation_text"))

if __name__ == "__main__":
    asyncio.run(test_real_poster_upload())
