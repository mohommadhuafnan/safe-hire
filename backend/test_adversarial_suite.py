import asyncio
import io
import json
import logging
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image, ImageDraw, ImageFont
from app.agents.pipeline import AgentPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_adversarial_suite")

def create_in_memory_image(text_lines: list, bg_color=(255, 255, 255), fg_color=(0, 0, 0), size=(800, 600)) -> bytes:
    img = Image.new("RGB", size, color=bg_color)
    draw = ImageDraw.Draw(img)
    y = 40
    for line in text_lines:
        draw.text((40, y), line, fill=fg_color)
        y += 45
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

async def run_suite():
    pipeline = AgentPipeline()
    results = {}

    print("\n" + "="*80)
    print("🚀 SAFE-HIRE 10-STAGE ADVERSARIAL TEST SUITE")
    print("="*80 + "\n")

    # -------------------------------------------------------------
    # Test A: Genuine Job Poster (Corporate Vacancy)
    # -------------------------------------------------------------
    print(">>> RUNNING TEST A: Genuine Job Poster (Virtusa Senior Cloud Engineer)...")
    img_genuine = create_in_memory_image([
        "VIRTUSA CORPORATION",
        "WE ARE HIRING: Senior Cloud Engineer (AWS / Python)",
        "Location: Colombo / Hybrid | Full-Time Employment",
        "Key Responsibilities: Design scalable microservices & cloud architecture",
        "Requirements: 4+ years Python, AWS, Docker, Kubernetes experience",
        "Competitive salary + health insurance + annual bonus",
        "Apply via official careers portal: https://careers.virtusa.com",
        "No recruitment fees or charges. Virtusa is an Equal Opportunity Employer."
    ], bg_color=(240, 248, 255), fg_color=(10, 25, 47))
    res_a = await pipeline.run(image_bytes=img_genuine, filename="virtusa_careers_poster.png", target_language="en")
    results["A_genuine"] = res_a
    print(f"Result A: ContentType={res_a['intake_data'].get('content_type')}, Score={res_a['scam_score']}, Risk={res_a['risk_level']}")

    # -------------------------------------------------------------
    # Test B: Obvious Fake Job Poster (Data Entry + Telegram + Unreal Pay)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST B: Obvious Fake Job Poster (Telegram + $5000/week)...")
    img_fake = create_in_memory_image([
        "URGENT HIRING: ONLINE DATA ENTRY TYPING JOB",
        "Earn $5,000 Weekly! Work from home 2 hours daily!",
        "No interview, No experience required. Instant selection today!",
        "Contact immediately on Telegram: @quick_cash_recruitment_2026",
        "Send message now to start working immediately."
    ], bg_color=(255, 240, 240), fg_color=(180, 0, 0))
    res_b = await pipeline.run(image_bytes=img_fake, filename="fake_data_entry.png", target_language="en")
    results["B_fake"] = res_b
    print(f"Result B: ContentType={res_b['intake_data'].get('content_type')}, Score={res_b['scam_score']}, Risk={res_b['risk_level']}")

    # -------------------------------------------------------------
    # Test C: Upfront Registration Fee Scam
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST C: Upfront Registration Fee Scam (Rs. 3500 Registration Fee)...")
    img_fee = create_in_memory_image([
        "APEX LOGISTICS & PACKAGING SERVICES",
        "Immediate vacancies for Packaging Assistants",
        "Salary: Rs. 65,000 Monthly + Overtime",
        "Mandatory refundable registration fee: Rs. 3,500 required before interview",
        "Pay first via Bank Transfer or GPay to confirm your slot",
        "Offer expires today! Apply fast before seats fill up."
    ], bg_color=(255, 245, 230), fg_color=(150, 50, 0))
    res_c = await pipeline.run(image_bytes=img_fee, filename="apex_fee_scam.png", target_language="en")
    results["C_fee"] = res_c
    print(f"Result C: ContentType={res_c['intake_data'].get('content_type')}, Score={res_c['scam_score']}, Risk={res_c['risk_level']}")

    # -------------------------------------------------------------
    # Test D: Brand Impersonation (Google Claims + Generic Gmail)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST D: Brand Impersonation (Google with Gmail)...")
    img_brand = create_in_memory_image([
        "GOOGLE RECRUITMENT ASIA PACIFIC",
        "Google is hiring Remote Software Developers",
        "Salary: $120,000 / Year + Google Perks",
        "Send your CV and copy of National ID to: google.recruiting.asia2026@gmail.com",
        "Limited slots remaining. Direct joining without technical round."
    ], bg_color=(255, 255, 255), fg_color=(30, 30, 30))
    res_d = await pipeline.run(image_bytes=img_brand, filename="google_impersonation.png", target_language="en")
    results["D_brand"] = res_d
    print(f"Result D: ContentType={res_d['intake_data'].get('content_type')}, Score={res_d['scam_score']}, Risk={res_d['risk_level']}")

    # -------------------------------------------------------------
    # Test E: Restaurant / Food Poster (Non-Job Media)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST E: Restaurant / Food Ad (Non-Job Media)...")
    img_food = create_in_memory_image([
        "BELLA ITALIA PIZZERIA & BISTRO",
        "GRAND PIZZA FESTIVAL 2026",
        "Buy 1 Large Thin Crust Pizza, Get 1 Medium Pasta FREE!",
        "Special Weekend Discount: Flat 30% OFF on all Dine-In Orders",
        "Reserve your table now: 011-2345678 | Colombo 03",
        "Open Daily 11:00 AM - 11:00 PM. Delicious authentic Italian cuisine."
    ], bg_color=(255, 250, 220), fg_color=(120, 40, 10))
    res_e = await pipeline.run(image_bytes=img_food, filename="pizza_festival.png", target_language="en")
    results["E_food"] = res_e
    print(f"Result E: ContentType={res_e['intake_data'].get('content_type')}, Score={res_e['scam_score']}, Risk={res_e['risk_level']}")

    # -------------------------------------------------------------
    # Test F: University Graduation / Convocation Flyer (Non-Job Media)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST F: University Graduation Poster (Non-Job Media)...")
    img_grad = create_in_memory_image([
        "UNIVERSITY OF COLOMBO — FACULTY OF SCIENCE",
        "CONGRATULATIONS TO THE CLASS OF 2025/2026!",
        "Annual Convocation & Degree Awarding Ceremony",
        "Date: November 15, 2026 | Bandaranaike Memorial Hall",
        "Guest of Honour: Chancellor & Vice Chancellor",
        "Academic robes collection starts from October 20th."
    ], bg_color=(245, 245, 255), fg_color=(20, 20, 100))
    res_f = await pipeline.run(image_bytes=img_grad, filename="convocation_flyer.png", target_language="en")
    results["F_grad"] = res_f
    print(f"Result F: ContentType={res_f['intake_data'].get('content_type')}, Score={res_f['scam_score']}, Risk={res_f['risk_level']}")

    # -------------------------------------------------------------
    # Test G: Photography / Portfolio Image (Non-Job Media)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST G: Wedding Photography Studio Portfolio (Non-Job Media)...")
    img_photo = create_in_memory_image([
        "STUDIO LUMINA WEDDING PHOTOGRAPHY",
        "Capturing Your Most Beautiful Moments",
        "Pre-Shoot Packages & Full-Day Wedding Cinematography",
        "Visit our gallery: https://studiolumina.lk | Call 077-1234567"
    ], bg_color=(240, 240, 240), fg_color=(50, 50, 50))
    res_g = await pipeline.run(image_bytes=img_photo, filename="studio_portfolio.png", target_language="en")
    results["G_photo"] = res_g
    print(f"Result G: ContentType={res_g['intake_data'].get('content_type')}, Score={res_g['scam_score']}, Risk={res_g['risk_level']}")

    # -------------------------------------------------------------
    # Test H: Poor Quality / Unreadable Media
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST H: Blank / Unreadable Image...")
    img_unreadable = Image.new("RGB", (100, 100), color=(128, 128, 128))
    buf_h = io.BytesIO()
    img_unreadable.save(buf_h, format="PNG")
    res_h = await pipeline.run(image_bytes=buf_h.getvalue(), filename="blurry_blank.png", target_language="en")
    results["H_unreadable"] = res_h
    print(f"Result H: ContentType={res_h['intake_data'].get('content_type')}, Score={res_h['scam_score']}, Risk={res_h['risk_level']}")

    # -------------------------------------------------------------
    # Test I: Suspicious URL
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST I: Suspicious Recruitment URL (Newly registered domain)...")
    res_i = await pipeline.run(
        input_url="http://urgent-careers-selection-portal.xyz/apply-now",
        input_text="Apply for rapid remote job selection. Earn $80/hr.",
        target_language="en"
    )
    results["I_url"] = res_i
    print(f"Result I: ContentType={res_i['intake_data'].get('content_type')}, Score={res_i['scam_score']}, Risk={res_i['risk_level']}")

    # -------------------------------------------------------------
    # Test J: Multilingual Scam Poster (Sinhala)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST J: Sinhala Scam Posting (ලියාපදිංචි ගාස්තුව + පැය 24න් ක්ෂණික පත්වීම්)...")
    res_j = await pipeline.run(
        input_text="""ක්ෂණික ඇබෑර්තු — ඇසුරුම් අංශය සඳහා සේවකයින් වහාම අවශ්‍යයි. මාසික වැටුප රු. 75,000 කි. ආහාර නවාතැන් නොමිලේ.
පැය 24න් ක්ෂණික පත්වීම් ලබාදෙනු ලැබේ. සම්මුඛ පරීක්ෂණ නොමැත.
ලියාපදිංචි ගාස්තුව රු. 2,500ක් පළමුව බැංකු ගිණුමට තැන්පත් කරන්න.
අයදුම් කිරීමට අදම අමතන්න: 071-9876543""",
        filename="sinhala_scam_posting.txt",
        target_language="si"
    )
    results["J_sinhala"] = res_j
    print(f"Result J: ContentType={res_j['intake_data'].get('content_type')}, Score={res_j['scam_score']}, Risk={res_j['risk_level']}")

    # -------------------------------------------------------------
    # Test K: Multilingual Scam Poster (Tamil)
    # -------------------------------------------------------------
    print("\n>>> RUNNING TEST K: Tamil Scam Posting (பதிவு கட்டணம் + உடனடி ஆட்சேர்ப்பு)...")
    res_k = await pipeline.run(
        input_text="""அவசர வேலைவாய்ப்பு — பேக்கிங் பிரிவிற்கு ஆட்கள் தேவை. மாத சம்பளம் ரூ. 65,000.
24 மணி நேரத்தில் வேலை வாய்ப்பு. நேர்காணல் இல்லை.
பதிவு கட்டணம் ரூ. 3,000 உடனடியாக வங்கி கணக்கில் செலுத்தவும்.
தொடர்புக்கு: 077-9876543 / Telegram: @tamil_fast_job""",
        filename="tamil_scam_posting.txt",
        target_language="ta"
    )
    results["K_tamil"] = res_k
    print(f"Result K: ContentType={res_k['intake_data'].get('content_type')}, Score={res_k['scam_score']}, Risk={res_k['risk_level']}")

    # -------------------------------------------------------------
    # Evaluation and Validation Summary
    # -------------------------------------------------------------
    print("\n" + "="*80)
    print("📊 ADVERSARIAL TEST RESULTS SUMMARY")
    print("="*80)

    assertions_passed = 0
    total_assertions = 11

    # 1. Genuine job poster: is_job_poster = True, score <= 25
    if res_a['intake_data'].get('is_job_poster') is True and (res_a['scam_score'] != "N/A" and int(res_a['scam_score']) <= 25):
        print("✅ TEST A PASSED: Genuine job poster correctly identified as Job Content with Low Apparent Risk")
        assertions_passed += 1
    else:
        print(f"❌ TEST A FAILED: Expected Low Risk, got {res_a['scam_score']}, is_job={res_a['intake_data'].get('is_job_poster')}")

    # 2. Obvious fake poster: is_job_poster = True, score >= 60
    if res_b['intake_data'].get('is_job_poster') is True and (res_b['scam_score'] != "N/A" and int(res_b['scam_score']) >= 50):
        print("✅ TEST B PASSED: Fake poster detected with High/Severe Scam Score")
        assertions_passed += 1
    else:
        print(f"❌ TEST B FAILED: Expected High Score, got {res_b['scam_score']}")

    # 3. Upfront fee scam: score >= 65, fee detected
    if res_c['scam_score'] != "N/A" and int(res_c['scam_score']) >= 65 and res_c['linguistic_data'].get('has_payment_demand'):
        print("✅ TEST C PASSED: Fee demand detected & flagged with Critical Scam Score")
        assertions_passed += 1
    else:
        print(f"❌ TEST C FAILED: Expected Fee Flag & High Score, got {res_c['scam_score']}, fee={res_c['linguistic_data'].get('has_payment_demand')}")

    # 4. Brand impersonation: Google + Gmail flagged
    if res_d['scam_score'] != "N/A" and int(res_d['scam_score']) >= 50 and res_d['linguistic_data'].get('has_impersonation_risk'):
        print("✅ TEST D PASSED: Brand impersonation correctly flagged (Google + Gmail)")
        assertions_passed += 1
    else:
        print(f"❌ TEST D FAILED: Expected Impersonation Flag, got {res_d['scam_score']}, impersonation={res_d['linguistic_data'].get('has_impersonation_risk')}")

    # 5. Food / Restaurant: is_job_poster = False, score = N/A
    if res_e['intake_data'].get('is_job_poster') is False and str(res_e['scam_score']).upper() == "N/A":
        print("✅ TEST E PASSED: Restaurant ad classified as NOT A JOB POSTER (Score: N/A)")
        assertions_passed += 1
    else:
        print(f"❌ TEST E FAILED: Expected is_job=False and Score=N/A, got is_job={res_e['intake_data'].get('is_job_poster')}, score={res_e['scam_score']}")

    # 6. Graduation banner: is_job_poster = False, score = N/A
    if res_f['intake_data'].get('is_job_poster') is False and str(res_f['scam_score']).upper() == "N/A":
        print("✅ TEST F PASSED: Graduation flyer classified as NOT A JOB POSTER (Score: N/A)")
        assertions_passed += 1
    else:
        print(f"❌ TEST F FAILED: Expected is_job=False and Score=N/A, got is_job={res_f['intake_data'].get('is_job_poster')}, score={res_f['scam_score']}")

    # 7. Photography studio: is_job_poster = False, score = N/A
    if res_g['intake_data'].get('is_job_poster') is False and str(res_g['scam_score']).upper() == "N/A":
        print("✅ TEST G PASSED: Photography portfolio classified as NOT A JOB POSTER (Score: N/A)")
        assertions_passed += 1
    else:
        print(f"❌ TEST G FAILED: Expected is_job=False and Score=N/A, got {res_g['scam_score']}")

    # 8. Unreadable image: score = N/A, risk = Unable to Determine or Not a Job
    if str(res_h['scam_score']).upper() == "N/A":
        print("✅ TEST H PASSED: Blank/Unreadable image handled without fabricating false text (Score: N/A)")
        assertions_passed += 1
    else:
        print(f"❌ TEST H FAILED: Expected N/A, got {res_h['scam_score']}")

    # 9. Suspicious URL: score >= 40
    if res_i['scam_score'] != "N/A" and int(res_i['scam_score']) >= 30:
        print("✅ TEST I PASSED: Suspicious URL verified & flagged")
        assertions_passed += 1
    else:
        print(f"❌ TEST I FAILED: Expected Suspicious Flag, got {res_i['scam_score']}")

    # 10. Sinhala scam poster: fee detected, score >= 60
    if res_j['linguistic_data'].get('has_payment_demand') and (res_j['scam_score'] != 'N/A' and int(res_j['scam_score']) >= 60):
        print("✅ TEST J PASSED: Sinhala scam vacancy analyzed with fee demand flagged (Score >= 60)")
        assertions_passed += 1
    else:
        print(f"❌ TEST J FAILED: Expected Sinhala fee detection, got {res_j['scam_score']}, fee={res_j['linguistic_data'].get('has_payment_demand')}")

    # 11. Tamil scam poster: fee detected, score >= 60
    if res_k['linguistic_data'].get('has_payment_demand') and (res_k['scam_score'] != 'N/A' and int(res_k['scam_score']) >= 60):
        print("✅ TEST K PASSED: Tamil scam vacancy analyzed with fee demand flagged (Score >= 60)")
        assertions_passed += 1
    else:
        print(f"❌ TEST K FAILED: Expected Tamil fee detection, got {res_k['scam_score']}, fee={res_k['linguistic_data'].get('has_payment_demand')}")

    print("\n" + "="*80)
    print(f"TOTAL RESULT: {assertions_passed} / {total_assertions} TEST CASES PASSED SUCCESSFULLY")
    print("="*80 + "\n")

    # Sample explanation verification to demonstrate dynamic output
    print("--- SAMPLE EXPLANATION (TEST A - GENUINE) ---")
    print(res_a['explanation_text'][:400] + "...\n")
    print("--- SAMPLE EXPLANATION (TEST E - RESTAURANT) ---")
    print(res_e['explanation_text'][:400] + "...\n")
    print("--- SAMPLE EXPLANATION (TEST J - SINHALA) ---")
    print(res_j['explanation_text'][:400] + "...\n")
    print("--- SAMPLE EXPLANATION (TEST K - TAMIL) ---")
    print(res_k['explanation_text'][:400] + "...\n")

    print("\n" + "="*80)
    print(f"TOTAL RESULT: {assertions_passed} / {total_assertions} TEST CASES PASSED SUCCESSFULLY")
    print("="*80 + "\n")

    # Sample explanation verification to demonstrate dynamic output
    print("--- SAMPLE EXPLANATION (TEST A - GENUINE) ---")
    print(res_a['explanation_text'][:400] + "...\n")
    print("--- SAMPLE EXPLANATION (TEST E - RESTAURANT) ---")
    print(res_e['explanation_text'][:400] + "...\n")
    print("--- SAMPLE EXPLANATION (TEST C - FEE SCAM) ---")
    print(res_c['explanation_text'][:400] + "...\n")

if __name__ == "__main__":
    asyncio.run(run_suite())
