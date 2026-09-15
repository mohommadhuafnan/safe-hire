import logging
from fastapi import APIRouter, Request, Depends, HTTPException, status
from typing import List, Dict, Any
from bson import ObjectId
from app.auth import get_current_user
from app.database import get_db
from app.services.payment_service import PaymentService
from app.models.subscription import PaymentHistoryItem

logger = logging.getLogger("safe_hire.payments")
router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.post("/payhere/notify")
async def payhere_webhook_notification(request: Request):
    """
    Public Instant Payment Notification (IPN) webhook listener for PayHere.
    Receives x-www-form-urlencoded POST parameters, verifies MD5 checksum,
    and idempotently activates subscription.
    """
    try:
        # Extract form data
        form_data = {}
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            form_data = await request.json()
        else:
            raw_form = await request.form()
            form_data = {k: v for k, v in raw_form.items()}

        logger.info(f"Received PayHere Webhook notification: order_id={form_data.get('order_id')}, status_code={form_data.get('status_code')}")
        
        result = await PaymentService.process_payhere_webhook(form_data)
        
        # PayHere expects a 200 OK response
        return result
    except Exception as e:
        logger.error(f"Error handling PayHere webhook: {e}", exc_info=True)
        # Always return 200 with error description to avoid continuous webhook retry storms if bad payload
        return {"status": "error", "message": str(e)}

@router.get("/status/{order_id}")
async def get_payment_status(order_id: str):
    """
    Check the status of a specific order_id. Used by the success page for polling confirmation.
    """
    db = get_db()
    payment = await db["payments"].find_one({"order_id": order_id})
    if not payment:
        # Check if subscription was already activated with this order
        sub = await db["subscriptions"].find_one({"last_order_id": order_id})
        if sub:
            return {
                "order_id": order_id,
                "status": "completed",
                "plan": sub.get("plan"),
                "billing_cycle": sub.get("billing_cycle")
            }
        return {
            "order_id": order_id,
            "status": "pending"
        }

    return {
        "order_id": order_id,
        "payment_id": payment.get("payment_id"),
        "status": payment.get("status", "pending"),
        "plan": payment.get("plan_id"),
        "billing_cycle": payment.get("billing_cycle"),
        "amount": payment.get("amount"),
        "currency": payment.get("currency", "LKR"),
        "created_at": payment.get("created_at")
    }

@router.get("/history", response_model=List[PaymentHistoryItem])
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    """
    Retrieve past payments and invoices for the authenticated user.
    """
    db = get_db()
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    user_query_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    cursor = db["payments"].find({
        "$or": [{"user_id": user_query_id}, {"user_id": str(user_id)}]
    }).sort("created_at", -1).limit(50)

    payments = await cursor.to_list(length=50)
    
    result = []
    for p in payments:
        result.append(PaymentHistoryItem(
            order_id=p.get("order_id", ""),
            payment_id=p.get("payment_id"),
            plan_id=p.get("plan_id", "unknown"),
            billing_cycle=p.get("billing_cycle", "monthly"),
            amount=float(p.get("amount", 0.0)),
            currency=p.get("currency", "LKR"),
            status=p.get("status", "pending"),
            created_at=p.get("created_at")
        ))
    return result
