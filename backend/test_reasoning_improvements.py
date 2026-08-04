"""Quick test for reasoning agent improvements."""
import sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")


from app.agents.reasoning_agent import ReasoningAgent, _extract_json_from_text

# --- Test 1: JSON extractor with clean JSON ---
clean = '{"scam_score": 80, "risk_level": "High Risk", "confidence_score": 95, "explanation": "test", "reasons": [], "sub_scores": {"financial_fee_risk": 90, "impersonation_risk": 10, "domain_reputation_risk": 20, "urgency_pressure_risk": 10}}'
res = _extract_json_from_text(clean)
assert res and res.get("scam_score") == 80, f"Test 1 FAILED: {res}"
print("✅ Test 1 PASS — clean JSON extracted correctly")

# --- Test 2: JSON extractor with markdown code fence ---
fenced = '```json\n{"scam_score": 72, "risk_level": "High Risk", "confidence_score": 96, "explanation": "test", "reasons": [], "sub_scores": {}}\n```'
res = _extract_json_from_text(fenced)
assert res and res.get("scam_score") == 72, f"Test 2 FAILED: {res}"
print("✅ Test 2 PASS — markdown-fenced JSON extracted correctly")

# --- Test 3: JSON extractor with <think> block ---
with_think = '<think>Analyzing the job poster...</think>\n{"scam_score": 55, "risk_level": "Moderate Risk", "confidence_score": 94, "explanation": "test", "reasons": [], "sub_scores": {}}'
res = _extract_json_from_text(with_think)
assert res and res.get("scam_score") == 55, f"Test 3 FAILED: {res}"
print("✅ Test 3 PASS — <think> block stripped, JSON extracted")

# --- Test 4: JSON extractor with surrounding text ---
with_text = 'Here is my analysis:\n{"scam_score": 30, "risk_level": "Moderate Risk", "confidence_score": 92, "explanation": "test", "reasons": [], "sub_scores": {}}\nPlease review this carefully.'
res = _extract_json_from_text(with_text)
assert res and res.get("scam_score") == 30, f"Test 4 FAILED: {res}"
print("✅ Test 4 PASS — JSON extracted from surrounding text")

# --- Test 5: API key diagnostic logging ---
agent = ReasoningAgent()
print("\n--- API Key Diagnostic ---")
agent._log_api_key_status("AIzaSyXXXXXXXXXXXXXXXXXXXX", "Gemini (valid prefix)")
agent._log_api_key_status("AQ.Ab8RN6JDmVY7kP_CJ3r4Gt8zxcb6", "Gemini (unusual prefix)")
agent._log_api_key_status("", "Gemini (empty)")
print("✅ Test 5 PASS — Key diagnostics logged above")

# --- Test 6: Rule-engine fallback scoring ---
print("\n--- Rule Engine Fallback ---")
linguistic_data = {
    "has_payment_demand": True,
    "has_impersonation_risk": True,
    "has_urgency_tactics": False,
    "has_suspicious_channels": True,
    "matched_payment": ["registration fee", "processing charge"],
    "impersonation_flags": ["Google impersonation"],
    "matched_urgency": [],
    "matched_suspicious_terms": ["Telegram"],
    "linguistic_score": 70,
    "claimed_brand": "Google",
    "free_email": "recruiter@gmail.com",
}
verification_data = {
    "domain": "google-jobs-lk.xyz",
    "verification_trust_score": 20,
    "whois_info": {"whois_status": "Domain registered 12 days ago", "is_new_domain": True, "registered_days": 12},
    "safe_browsing": {"status": "SAFE"},
}
result = agent._rule_engine_score("We are hiring! Pay Rs 5000 registration fee. Contact on Telegram.", linguistic_data, verification_data, "en")
assert result["scam_score"] >= 75, f"Test 6 FAILED: score was {result['scam_score']}, expected >=75"
assert result["risk_level"] in ("Severe Risk", "High Risk"), f"Test 6 risk level unexpected: {result['risk_level']}"
print(f"✅ Test 6 PASS — Rule engine score: {result['scam_score']}/100 — {result['risk_level']}")
print(f"   Sub-scores: {result['sub_scores']}")

print("\n🎉 All tests passed!")
