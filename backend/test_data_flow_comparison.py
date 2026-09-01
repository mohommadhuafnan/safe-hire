import asyncio
import io
import json
import logging
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from app.agents.pipeline import AgentPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

async def run_data_flow_comparison():
    pipeline = AgentPipeline()
    print("\n" + "="*80)
    print("🔬 SAFE-HIRE DATA FLOW & CONSISTENCY TEST")
    print("="*80 + "\n")

    # Case 1: Input A (Official Google Careers)
    poster_a = """GOOGLE CLOUD ARCHITECT
Official application via Google Careers Portal: https://careers.google.com
Requirements: BS/MS in Computer Science, 5+ years distributed systems experience.
Location: Singapore / Hybrid. Competitive salary & stock options.
No recruitment or application fees are ever charged."""

    # Case 2: Input B (Google Impersonation + Fee + Telegram)
    poster_b = """GOOGLE RECRUITMENT DRIVE
Earn $4,500/week typing documents from home!
Apply directly on Telegram: @google_fast_hiring_2026
Pay Rs. 3,500 registration deposit via GPay/PhonePe to secure your spot today!
Send email to google.hr.recruiters@gmail.com"""

    print(">>> 1. Executing Poster A (Official Google Careers)...")
    res_a = await pipeline.run(input_text=poster_a, target_language="en")

    print("\n>>> 2. Executing Poster B (Google Impersonation Scam)...")
    res_b = await pipeline.run(input_text=poster_b, target_language="en")

    print("\n>>> 3. Executing Poster A a second time (Consistency Check)...")
    res_a_repeat = await pipeline.run(input_text=poster_a, target_language="en")

    print("\n" + "="*80)
    print("📋 DATA FLOW & DIFFERENTIATION COMPARISON RESULTS")
    print("="*80)

    # 1. Differentiation Check
    print(f"Poster A (Official) Score: {res_a['scam_score']} | Risk: {res_a['risk_level']}")
    print(f"Poster B (Scam)     Score: {res_b['scam_score']} | Risk: {res_b['risk_level']}")

    differs_in_score = (res_a['scam_score'] != res_b['scam_score'])
    differs_in_payment = (res_a['linguistic_data'].get('has_payment_demand') != res_b['linguistic_data'].get('has_payment_demand'))
    differs_in_impersonation = (res_a['linguistic_data'].get('has_impersonation_risk') != res_b['linguistic_data'].get('has_impersonation_risk'))

    print(f"\n• Different Risk Scores: {differs_in_score} ({res_a['scam_score']} vs {res_b['scam_score']})")
    print(f"• Fee Demand Flag Differentiated: {differs_in_payment} (A={res_a['linguistic_data'].get('has_payment_demand')}, B={res_b['linguistic_data'].get('has_payment_demand')})")
    print(f"• Impersonation Flag Differentiated: {differs_in_impersonation} (A={res_a['linguistic_data'].get('has_impersonation_risk')}, B={res_b['linguistic_data'].get('has_impersonation_risk')})")

    # 2. Consistency Check (Poster A run 1 vs run 2)
    same_risk_level = (res_a['risk_level'] == res_a_repeat['risk_level'])
    score_delta = abs(int(res_a['scam_score']) - int(res_a_repeat['scam_score']))
    is_consistent = same_risk_level and (score_delta <= 10)

    print(f"\n• Same Input Consistency Check: {is_consistent} (Run 1: {res_a['scam_score']}, Run 2: {res_a_repeat['scam_score']}, Risk: {res_a['risk_level']})")

    if differs_in_score and differs_in_payment and is_consistent:
        print("\n🎉 DATA FLOW & CONSISTENCY TESTS PASSED SUCCESSFULLY!")
    else:
        print("\n⚠️ Data flow or consistency test needs review.")

if __name__ == "__main__":
    asyncio.run(run_data_flow_comparison())
