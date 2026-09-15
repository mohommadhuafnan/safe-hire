import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.agents.pipeline import AgentPipeline
from app.services.url_resolver import URLResolver
from app.agents.verification_agent import VerificationAgent

async def run_tests():
    print("=== Testing Non-Job Early Termination & Poster Domain Logic ===")
    
    pipeline = AgentPipeline()
    resolver = URLResolver()
    verification = VerificationAgent()

    # Test 1: Non-Job Poster text input (e.g. Italian Restaurant Menu with discounts)
    print("\n--- Test 1: Non-Job Content Early Termination ---")
    non_job_text = "Luigi's Italian Pizza & Pasta Menu. Buy 1 Large Pepperoni Pizza, Get 1 Garlic Bread Free! Call 0771234567 for free home delivery."
    res1 = await pipeline.run(input_text=non_job_text)
    
    assert res1.get("is_job_poster") is False, "Expected is_job_poster to be False"
    assert res1.get("risk_level") == "Not a Job Advertisement", f"Expected 'Not a Job Advertisement', got {res1.get('risk_level')}"
    assert res1.get("scam_score") == "N/A", f"Expected 'N/A' scam score, got {res1.get('scam_score')}"
    assert res1.get("pipeline_stopped_stage") == 1, "Expected pipeline to stop at Stage 1"
    assert res1.get("linguistic_data", {}).get("status") == "skipped", "Expected Stage 2 to be skipped"
    assert res1.get("verification_data", {}).get("status") == "skipped", "Expected Stage 3 to be skipped"
    print("[OK] Test 1 Passed: Pipeline cleanly halted at Stage 1 for non-job content with accurate explanation.")

    # Test 2: Social Media Link (e.g. LinkedIn wrapper URL without a domain in the poster)
    print("\n--- Test 2: Social Media URL Without Employer Domain in Poster ---")
    social_url = "https://www.linkedin.com/posts/fake-recruiter-post-12345"
    selection = URLResolver.select_primary_employer_domain(
        poster_domains=[],
        text_domains=[],
        resolved_domain="linkedin.com",
        submitted_domain=social_url
    )
    assert selection["primary_domain"] == "", f"Expected empty primary_domain for social wrapper, got {selection['primary_domain']}"
    assert selection["domain_source"] == "none", f"Expected domain_source 'none', got {selection['domain_source']}"
    
    v_res = verification.verify(
        domain=selection["primary_domain"],
        domain_source=selection["domain_source"],
        is_social_wrapper=selection.get("is_social_wrapper", True),
        social_platform=selection.get("social_platform", "LinkedIn")
    )
    assert v_res["primary_domain"] == "", f"Expected empty verification primary_domain, got {v_res['primary_domain']}"
    assert v_res["whois_info"]["status"] == "not_applicable", f"Expected WHOIS status 'not_applicable', got {v_res['whois_info']['status']}"
    assert "No Domain in Poster" in v_res["whois_info"]["domain_age_formatted"] or "N/A" in v_res["whois_info"]["domain_age_formatted"]
    print("[OK] Test 2 Passed: Social media wrapper is NOT treated as employer domain, WHOIS on linkedin.com suppressed.")

    # Test 3: URL with Employer Domain Extracted From Job Poster/Text
    print("\n--- Test 3: URL With Employer Domain Printed on Job Poster ---")
    selection_with_poster = URLResolver.select_primary_employer_domain(
        poster_domains=["https://careers.virtusa.com/apply"],
        text_domains=[],
        resolved_domain="linkedin.com",
        submitted_domain=social_url
    )
    assert selection_with_poster["primary_domain"] == "virtusa.com", f"Expected 'virtusa.com', got {selection_with_poster['primary_domain']}"
    assert selection_with_poster["domain_source"] == "poster_ocr", f"Expected 'poster_ocr', got {selection_with_poster['domain_source']}"
    
    v_res3 = verification.verify(
        domain=selection_with_poster["primary_domain"],
        domain_source=selection_with_poster["domain_source"],
        is_social_wrapper=False
    )
    assert v_res3["primary_domain"] == "virtusa.com"
    assert v_res3["whois_info"]["status"] == "verified"
    print(f"[OK] Test 3 Passed: Employer domain '{v_res3['primary_domain']}' from poster accurately extracted and WHOIS verified ({v_res3['whois_info'].get('domain_age_formatted')}).")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
