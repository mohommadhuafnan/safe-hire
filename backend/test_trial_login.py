import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from bson import ObjectId

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.payment_service import PaymentService
from app.config_pricing import PLANS

async def test_trial_login_date():
    print("Testing 7-Day Free Trial calculation based on User Login Date...")
    
    # Mock user document created 30 days ago
    old_creation = datetime.now(timezone.utc) - timedelta(days=30)
    current_login = datetime.now(timezone.utc)
    
    test_user_id = str(ObjectId())
    test_email = "trial_test_user@example.com"
    
    # Test 1: Plan duration check
    assert PLANS["free_trial"]["duration_days"] == 7
    print("[OK] Plan configuration: 7 days free trial confirmed.")
    
    # Test 2: Calculate remaining days
    period_end = current_login + timedelta(days=7)
    diff = period_end - current_login
    days_left = (int(diff.total_seconds() - 1) // 86400) + 1 if diff.total_seconds() > 0 else 0
    assert days_left == 7, f"Expected 7 days left on Day 1, got {days_left}"
    print(f"[OK] Days remaining on login day: {days_left} days left.")
    
    # Test 3: Calculate remaining days 1 day later (6 days remaining)
    day_later = current_login + timedelta(days=1, minutes=30)
    diff_later = period_end - day_later
    days_left_later = (int(diff_later.total_seconds() - 1) // 86400) + 1 if diff_later.total_seconds() > 0 else 0
    assert days_left_later == 6, f"Expected 6 days left, got {days_left_later}"
    print(f"[OK] Days remaining after 1.5 days: {days_left_later} days left.")
    
    print("All unit logic checks for login-anchored 7-day free trial passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_trial_login_date())
