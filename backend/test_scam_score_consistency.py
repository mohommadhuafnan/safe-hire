import asyncio
import logging
from app.agents.pipeline import pipeline_runner

logging.basicConfig(level=logging.ERROR)

async def test_consistency():
    print("==================================================")
    print("STARTING SCAM PROBABILITY SCORE CONSISTENCY SUITE")
    print("==================================================")

    # Test Case 1: Job posting with Upfront Fee Demand (Must be high risk & 100% identical across 5 runs)
    fee_job_text = """
    URGENT HIRING: Data Entry Operator & Typist Needed
    Company: Virtusa Technologies Ltd
    Work from home. Earn Rs. 65,000 per month.
    Registration fee of Rs. 2,500 required for security deposit and software kit.
    Contact HR on Telegram @virtusa_hr_jobs or send email to virtusa.careers@gmail.com
    Apply immediately today!
    """

    print("\n--- Test 1: Scam Job with Fee Demand (5 Consecutive Runs) ---")
    scores_fee = []
    for i in range(1, 6):
        res = await pipeline_runner.run(input_text=fee_job_text, filename="fee_poster.png", target_language="en")
        score = res.get("scam_score")
        risk = res.get("risk_level")
        scores_fee.append(score)
        print(f"Run {i}: Score = {score}/100 | Risk Level = {risk}")

    # Assert 100% identical scores
    assert len(set(scores_fee)) == 1, f"ERROR: Scores fluctuated for fee test: {scores_fee}"
    assert scores_fee[0] >= 75, f"ERROR: Score {scores_fee[0]} is below 75 for fee demand"
    print(f"[PASS] Test 1: 100% Consistent Score ({scores_fee[0]}/100 across all 5 runs) with 0 variance!")

    # Test Case 2: Clean Genuine Job Posting (Must be Low Risk & 100% identical across 5 runs)
    clean_job_text = """
    Software Engineer - Backend (Python / FastAPI)
    WSO2 LLC is hiring a full-time Software Engineer for our Colombo HQ.
    Requirements: 2+ years experience with Python, Docker, and REST APIs.
    Competitive salary based on industry standards with health insurance.
    Apply directly via our official corporate career portal at https://wso2.com/careers
    Contact: careers@wso2.com
    No fees or charges apply at any stage of our recruitment process.
    """

    print("\n--- Test 2: Clean Official Corporate Vacancy (5 Consecutive Runs) ---")
    scores_clean = []
    for i in range(1, 6):
        res = await pipeline_runner.run(input_text=clean_job_text, filename="wso2_vacancy.png", target_language="en")
        score = res.get("scam_score")
        risk = res.get("risk_level")
        scores_clean.append(score)
        print(f"Run {i}: Score = {score}/100 | Risk Level = {risk}")

    assert len(set(scores_clean)) == 1, f"ERROR: Scores fluctuated for clean test: {scores_clean}"
    assert scores_clean[0] <= 20, f"ERROR: Score {scores_clean[0]} is above 20 for clean job"
    print(f"[PASS] Test 2: 100% Consistent Score ({scores_clean[0]}/100 across all 5 runs) with 0 variance!")

    # Test Case 3: Non-Job Content (Must be 'N/A' & 100% identical across 3 runs)
    non_job_text = """
    Fresh Italian Pizza Special - 20% OFF all Large Pepperoni Pizzas this Friday!
    Visit Mama Mia Trattoria on Galle Road.
    Call 011-2345678 to reserve your table.
    """

    print("\n--- Test 3: Non-Job Poster Content (3 Consecutive Runs) ---")
    scores_non_job = []
    for i in range(1, 4):
        res = await pipeline_runner.run(input_text=non_job_text, filename="pizza_menu.png", target_language="en")
        score = res.get("scam_score")
        risk = res.get("risk_level")
        scores_non_job.append(score)
        print(f"Run {i}: Score = {score} | Risk Level = {risk}")

    assert all(s == "N/A" for s in scores_non_job), f"ERROR: Non-job scores were not N/A: {scores_non_job}"
    print(f"[PASS] Test 3: Non-job content returned strictly 'N/A' across all runs!")

    print("\n==================================================")
    print("ALL CONSISTENCY & DETERMINISTIC SCORING TESTS PASSED (0 VARIANCE)!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_consistency())
