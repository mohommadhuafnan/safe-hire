"""
Authoritative SAFE-HIRE Pricing Plans Configuration.
All prices, scan limits, language permissions, and plan features are defined server-side.
"""

from typing import Dict, Any, List

PLANS: Dict[str, Dict[str, Any]] = {
    "free_trial": {
        "id": "free_trial",
        "name": "7-Day Free Trial",
        "tagline": "Full-featured trial for job seekers and students",
        "price_monthly_lkr": 0,
        "price_annual_lkr": 0,
        "currency": "LKR",
        "duration_days": 7,
        "scans_limit": 25,
        "is_recurring": False,
        "allowed_languages": ["en", "si", "ta", "hi", "bn"],
        "badge": "Free Trial",
        "features": [
            "25 Total AI Scam Scans (7 Days)",
            "Full Multilingual Support (English, Sinhala, Tamil, etc.)",
            "Valsea AI Translation Engine",
            "5-Agent Multi-Dimensional Threat Detection",
            "Domain WHOIS & Google Safe Browsing Verification",
            "Instant Security PDF Audit Report Downloads"
        ],
        "restrictions": [
            "Expires after 7 days or 25 scans"
        ]
    },
    "basic": {
        "id": "basic",
        "name": "Basic Plan",
        "tagline": "Essential protection for regular job applicants",
        "price_monthly_lkr": 990,
        "price_annual_lkr": 9990,
        "currency": "LKR",
        "scans_per_month": 100,
        "is_recurring": True,
        "allowed_languages": ["en"],
        "badge": "Budget Friendly",
        "features": [
            "100 Job Scam Scans / month",
            "English Language Threat Detection",
            "5-Agent Core Security Analysis Pipeline",
            "WHOIS Domain Age & Blacklist Verification",
            "Abstract API Email Legitimacy Audit",
            "Standard Security Audit Reports",
            "Audit History & Threat Archive"
        ],
        "restrictions": [
            "English language only (Sinhala & Tamil require Pro)"
        ]
    },
    "pro": {
        "id": "pro",
        "name": "Pro Plan",
        "tagline": "Comprehensive protection for power job seekers & freelancers",
        "price_monthly_lkr": 3490,
        "price_annual_lkr": 34990,
        "currency": "LKR",
        "scans_per_month": 3000,
        "is_recurring": True,
        "popular": True,
        "allowed_languages": ["en", "si", "ta", "hi", "bn"],
        "badge": "Most Popular",
        "features": [
            "3,000 Job Scam Scans / month",
            "Full Multilingual Engine (Sinhala, Tamil, English, Hindi, Bengali)",
            "Valsea AI Translation Integration",
            "Priority 5-Agent Processing & Deep AI OCR",
            "Instant Security PDF Audit Downloads",
            "Full Threat History & Advanced Analytics",
            "Priority Security Escalation & Support"
        ],
        "restrictions": []
    },
    "organization": {
        "id": "organization",
        "name": "Organization / Campus",
        "tagline": "Enterprise-grade protection for universities & career centers",
        "price_monthly_lkr": 45000,
        "price_annual_lkr": 450000,
        "currency": "LKR",
        "scans_per_month": 50000,
        "is_recurring": True,
        "is_contact_sales": True,
        "allowed_languages": ["en", "si", "ta", "hi", "bn"],
        "badge": "Enterprise & Campus",
        "features": [
            "50,000+ Scans / month",
            "Dedicated Multi-Tenant Campus API",
            "Full Multilingual Engine with Valsea AI",
            "Custom Whitelist / Blacklist Rule Engine",
            "Bulk File & Poster Batch Auditing",
            "Admin Dashboard & Team Usage Analytics",
            "Dedicated Account Manager & 24/7 SLA"
        ],
        "restrictions": []
    }
}

def get_plan_details(plan_id: str) -> Dict[str, Any]:
    """Retrieve details for a specific plan or fallback to free_trial."""
    return PLANS.get(plan_id, PLANS["free_trial"])

def get_all_plans() -> List[Dict[str, Any]]:
    """Return all public pricing plans."""
    return list(PLANS.values())
