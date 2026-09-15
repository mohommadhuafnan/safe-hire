from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from app.auth import get_current_user
from app.config_pricing import get_all_plans, get_plan_details
from app.services.payment_service import PaymentService
from app.models.subscription import CheckoutRequest, SubscriptionResponse

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])

@router.get("/plans")
async def get_plans():
    """Retrieve all available subscription plans."""
    return {"plans": get_all_plans()}

@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Retrieve the current user's active subscription status and scan quota."""
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    user_email = current_user.get("email", "")
    
    sub = await PaymentService.get_or_create_subscription(user_id, user_email)
    
    return SubscriptionResponse(
        id=str(sub.get("_id", "")),
        plan=sub.get("plan", "free_trial"),
        status=sub.get("status", "active"),
        billing_cycle=sub.get("billing_cycle", "trial"),
        scans_limit=int(sub.get("scans_limit", 25)),
        scans_used=int(sub.get("scans_used", 0)),
        days_remaining=int(sub.get("days_remaining", 0)),
        cancel_at_period_end=sub.get("cancel_at_period_end", False),
        current_period_end=sub.get("current_period_end"),
        trial_end=sub.get("trial_end"),
        plan_details=sub.get("plan_details")
    )

@router.post("/checkout")
async def create_checkout(
    req: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a real, cryptographically signed PayHere checkout session.
    """
    if req.plan_id not in ["basic", "pro"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan selected for checkout. Please select Basic or Pro."
        )

    try:
        checkout_payload = await PaymentService.create_checkout_session(
            user=current_user,
            plan_id=req.plan_id,
            billing_cycle=req.billing_cycle or "monthly"
        )
        return {
            "success": True,
            "checkout_data": checkout_payload
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate checkout session: {str(e)}"
        )

@router.post("/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Schedule the user's active paid subscription to cancel at the end of the billing period."""
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    result = await PaymentService.cancel_subscription(user_id)
    return result

@router.post("/start-trial", response_model=SubscriptionResponse)
async def start_or_refresh_free_trial(current_user: dict = Depends(get_current_user)):
    """Start or refresh the 7-Day Free Trial counting from the user's active login date."""
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    user_email = current_user.get("email", "")
    
    sub = await PaymentService.start_or_refresh_trial(user_id, user_email, is_login=True)
    
    return SubscriptionResponse(
        id=str(sub.get("_id", "")),
        plan=sub.get("plan", "free_trial"),
        status=sub.get("status", "active"),
        billing_cycle=sub.get("billing_cycle", "trial"),
        scans_limit=int(sub.get("scans_limit", 25)),
        scans_used=int(sub.get("scans_used", 0)),
        days_remaining=int(sub.get("days_remaining", 7)),
        cancel_at_period_end=sub.get("cancel_at_period_end", False),
        current_period_end=sub.get("current_period_end"),
        trial_end=sub.get("trial_end"),
        plan_details=sub.get("plan_details")
    )

@router.get("/check-access")
async def check_access(
    target_language: Optional[str] = Query("en"),
    current_user: dict = Depends(get_current_user)
):
    """Check if the user is authorized to perform a scan in the requested language."""
    access_status = await PaymentService.check_user_access(current_user, target_language or "en")
    return access_status

