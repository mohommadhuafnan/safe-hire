from app.agents.verification_agent import VerificationAgent

agent = VerificationAgent()

print("--- Testing Verification Agent Edge Cases ---")

# 1. Clean Domain Extraction
print("Domain 1:", agent.extract_clean_domain("https://careers.virtusa.com/jobs?id=123#apply"))
print("Domain 2:", agent.extract_clean_domain("www.example.xyz:8080"))
print("Domain 3:", agent.extract_clean_domain("N/A"))

# 2. WHOIS Test
res1 = agent.check_whois("google.com")
print("\nGoogle WHOIS:", res1)

res2 = agent.check_whois("job-scam-offer.xyz")
print("Suspicious TLD WHOIS:", res2)

# 3. Safe Browsing Test
sb1 = agent.check_safe_browsing("http://192.168.1.1/phishing")
print("\nIP Address Safe Browsing:", sb1)

sb2 = agent.check_safe_browsing("http://cheap-jobs.top")
print("Suspicious TLD Safe Browsing:", sb2)

print("\n✅ Verification Agent edge case tests completed successfully!")
