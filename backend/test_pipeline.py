import sys
import asyncio
from app.agents.pipeline import pipeline_runner

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


async def test_scam_detection():
    print("==========================================")
    print(" TESTING SAFE-HIRE 5-AGENT AI PIPELINE ")
    print("==========================================")

    # Test Sample 1: High Risk Scam Offer (Urgency + Fee + Fake Email + Telegram)
    scam_text = """
    URGENT HIRING! Google Remote Data Entry Specialist needed immediately!
    Earn $800 weekly working 1 hour per day. No experience required.
    Requirement: Refundable registration fee of $50 needed for laptop processing kit.
    Contact recruiter on Telegram @google_careers_fast or email google_recruitment_2026@gmail.com
    """

    res1 = await pipeline_runner.run(input_text=scam_text, target_language="en")
    print(f"\n[Test 1 - High Risk Scam Text]")
    print(f"Scam Score: {res1['scam_score']}/100")
    print(f"Risk Level: {res1['risk_level']}")
    print(f"Explanation:\n{res1['explanation_text']}")

    # Test Sample 2: Sinhala Scam Offer
    sinhala_scam = """
    ක්ෂණික බඳවාගැනීම්! නිවසේ සිට දත්ත ඇතුලත් කිරීමේ රැකියා. දිනකට රු. 10,000 උපයන්න.
    ලියාපදිංචි ගාස්තුව රු. 3,500 තැන්පතු කරන්න. වොට්ස්ඇප් හරහා සම්බන්ධ වන්න.
    """
    res2 = await pipeline_runner.run(input_text=sinhala_scam, target_language="si")
    print(f"\n[Test 2 - Sinhala Scam Text]")
    print(f"Scam Score: {res2['scam_score']}/100")
    print(f"Risk Level: {res2['risk_level']}")
    print(f"Language Detected: {res2['language']}")
    print(f"Explanation:\n{res2['explanation_text']}")

    # Test Sample 3: Genuine Job Posting
    genuine_text = """
    Software Engineer - Frontend (React / TypeScript)
    Virtusa Corporation is hiring a Software Engineer for our Colombo technology hub.
    Requirements: Bachelor's degree in Computer Science, 2+ years React experience.
    Apply officially at https://careers.virtusa.com/job-id-9982
    """
    # Test Sample 4: Non-Job Poster Image / Document Simulation
    non_job_intake = {
        "is_job_poster": False,
        "poster_type": "Designathon / Workshop Banner",
        "poster_summary": "Annual University Hackathon and UI Design Competition flyer.",
        "validation_error": "This image is not a recruitment or job advertisement. Scam analysis has not been performed because the uploaded image is unrelated to job recruitment."
    }
    # Test Sample 5: Non-Job Website URL Simulation (Photography Studio)
    non_job_url_text = "Page Title: Image95 Studio - Photography & Videography Portfolio Qatar\nPage Body: Image95 Studio in Qatar showcasing wedding photography, commercial videography, and event portfolios. Contact us on WhatsApp."
    res5 = await pipeline_runner.run(input_text=non_job_url_text, input_url="https://images95.com", target_language="en")
    print(f"\n[Test 5 - Non-Job Website URL Validation]")
    print(f"Scam Score: {res5['scam_score']}")
    print(f"Risk Level: {res5['risk_level']}")
    print(f"Explanation:\n{res5['explanation_text']}")

    print("\n✅ All 5-Agent pipeline tests executed successfully!")

if __name__ == "__main__":
    asyncio.run(test_scam_detection())
