from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CheckoutRequest(BaseModel):
    plan_id: str  # "basic", "pro"
    billing_cycle: Optional[str] = "monthly"  # "monthly", "annual"

class PlanFeatureItem(BaseModel):
    id: str
    name: str
    tagline: str
    price_monthly_lkr: int
    price_annual_lkr: int
    currency: str
    scans_limit: Optional[int] = None
    scans_per_month: Optional[int] = None
    allowed_languages: List[str]
    badge: Optional[str] = None
    popular: Optional[bool] = False
    is_contact_sales: Optional[bool] = False
    features: List[str]
    restrictions: Optional[List[str]] = []

class SubscriptionResponse(BaseModel):
    id: Optional[str] = None
    plan: str
    status: str
    billing_cycle: str
    scans_limit: int
    scans_used: int
    days_remaining: int
    cancel_at_period_end: Optional[bool] = False
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    plan_details: Optional[Dict[str, Any]] = None

class PaymentHistoryItem(BaseModel):
    order_id: str
    payment_id: Optional[str] = None
    plan_id: str
    billing_cycle: str
    amount: float
    currency: str
    status: str
    created_at: Optional[datetime] = None
