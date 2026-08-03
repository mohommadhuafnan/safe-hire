import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.agents.verification_agent import VerificationAgent

def test_apilayer():
    agent = VerificationAgent()
    
    print("Testing APILayer WHOIS API integration...")
    res = agent.verify(domain="apilayer.com")
    print("Result for apilayer.com:")
    print(res)
    
    print("\nTesting google.com:")
    res_google = agent.verify(domain="https://www.google.com/careers/job1029")
    print("Result for google.com:")
    print(res_google)

if __name__ == "__main__":
    test_apilayer()
