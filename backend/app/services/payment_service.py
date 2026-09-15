"""
Payment and Subscription Service for SAFE-HIRE.
Handles PayHere MD5 checkout generation, webhook checksum verification,
subscription lifecycle management, and scan quota / language enforcement.
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from bson import ObjectId
from app.config import settings
from app.config_pricing import PLANS, get_plan_details
from app.database import get_db

logger = logging.getLogger("safe_hire.payment_service")

class PaymentService:
    @staticmethod
    def get_checkout_url() -> str:
        """Returns the PayHere checkout endpoint based on sandbox/production setting."""
        if settings.PAYHERE_SANDBOX:
            return "https://sandbox.payhere.lk/pay/checkout"
        return "https://www.payhere.lk/pay/checkout"

    @staticmethod
    def generate_checkout_hash(order_id: str, amount: float, currency: str = "LKR") -> str:
        """
        Generate PayHere MD5 Checkout Hash.
        Formula: strtoupper(md5(merchant_id + order_id + number_format(amount, 2, '.', '') + currency + strtoupper(md5(merchant_secret))))
        """
        merchant_id = str(settings.PAYHERE_MERCHANT_ID).strip()
        merchant_secret = str(settings.PAYHERE_MERCHANT_SECRET).strip()
        
        # 1. Secret hash in uppercase
        secret_hash = hashlib.md5(merchant_secret.encode("utf-8")).hexdigest().upper()
        
        # 2. Number formatted with exactly 2 decimals
        formatted_amount = f"{float(amount):.2f}"
        
        # 3. Concatenate and compute final MD5
        raw_string = f"{merchant_id}{order_id}{formatted_amount}{currency}{secret_hash}"
        checkout_hash = hashlib.md5(raw_string.encode("utf-8")).hexdigest().upper()
        return checkout_hash

    @staticmethod
    def verify_webhook_checksum(
        merchant_id: str,
        order_id: str,
        payhere_amount: str,
        payhere_currency: str,
        status_code: str,
        md5sig: str
    ) -> bool:
        """
        Verify the PayHere Webhook MD5 checksum.
        Formula: strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
        """
        merchant_secret = str(settings.PAYHERE_MERCHANT_SECRET).strip()
        secret_hash = hashlib.md5(merchant_secret.encode("utf-8")).hexdigest().upper()
        
        # Format payload elements
        raw_string = f"{str(merchant_id).strip()}{str(order_id).strip()}{str(payhere_amount).strip()}{str(payhere_currency).strip()}{str(status_code).strip()}{secret_hash}"
        generated_signature = hashlib.md5(raw_string.encode("utf-8")).hexdigest().upper()
        
        is_valid = generated_signature == str(md5sig).strip().upper()
        if not is_valid:
            logger.warning(
                f"PayHere webhook checksum mismatch! Expected: {generated_signature}, Received: {md5sig}"
            )
        return is_valid

    @staticmethod
    async def get_or_create_subscription(user_id: str, user_email: str = "") -> Dict[str, Any]:
        """
        Fetch the current user subscription from MongoDB or provision a 7-Day Free Trial.
        """
        db = get_db()
        now = datetime.now(timezone.utc)
        
        user_query_id = ObjectId(user_id) if (isinstance(user_id, str) and ObjectId.is_valid(user_id)) else user_id

        sub = await db["subscriptions"].find_one({"user_id": user_query_id})
        if not sub and isinstance(user_id, str):
            sub = await db["subscriptions"].find_one({"user_id": str(user_id)})

        if not sub:
            # Check user doc created_at for accurate trial calculation
            user_doc = await db["users"].find_one({"_id": user_query_id}) if ObjectId.is_valid(str(user_id)) else None
            user_created_at = (user_doc.get("created_at") if user_doc else None) or now
            if user_created_at.tzinfo is None:
                user_created_at = user_created_at.replace(tzinfo=timezone.utc)

            trial_days = PLANS["free_trial"]["duration_days"]
            trial_end = user_created_at + timedelta(days=trial_days)

            sub = {
                "user_id": user_query_id,
                "user_email": user_email or (user_doc.get("email") if user_doc else ""),
                "plan": "free_trial",
                "status": "active" if now <= trial_end else "expired",
                "billing_cycle": "trial",
                "scans_limit": PLANS["free_trial"]["scans_limit"],
                "scans_used": 0,
                "trial_start": user_created_at,
                "trial_end": trial_end,
                "current_period_start": user_created_at,
                "current_period_end": trial_end,
                "cancel_at_period_end": False,
                "created_at": now,
                "updated_at": now
            }
            try:
                res = await db["subscriptions"].insert_one(sub)
                sub["_id"] = res.inserted_id
            except Exception as e:
                logger.error(f"Error provisioning trial subscription: {e}")

        # Check for expiry on trial or recurring periods
        plan_id = sub.get("plan", "free_trial")
        period_end = sub.get("current_period_end") or sub.get("trial_end")
        if period_end and isinstance(period_end, datetime):
            if period_end.tzinfo is None:
                period_end = period_end.replace(tzinfo=timezone.utc)
            if now > period_end and sub.get("status") == "active":
                sub["status"] = "expired"
                try:
                    await db["subscriptions"].update_one(
                        {"_id": sub["_id"]},
                        {"$set": {"status": "expired", "updated_at": now}}
                    )
                except Exception as update_err:
                    logger.warning(f"Failed updating expired status: {update_err}")

        # Merge with authoritative plan metadata
        plan_meta = get_plan_details(plan_id)
        sub["plan_details"] = plan_meta
        sub["id"] = str(sub.get("_id", ""))
        
        # Calculate days remaining
        days_left = 0
        if period_end and isinstance(period_end, datetime):
            if period_end.tzinfo is None:
                period_end = period_end.replace(tzinfo=timezone.utc)
            diff = period_end - now
            days_left = max(0, diff.days + (1 if diff.seconds > 0 else 0))
        sub["days_remaining"] = days_left

        return sub

    @staticmethod
    async def check_user_access(user: dict, target_language: str = "en") -> Dict[str, Any]:
        """
        Gatekeeper for scam analysis.
        Enforces plan scan limits, trial expiration, and language permissions.
        """
        user_id = str(user.get("id") or user.get("_id") or "")
        user_email = user.get("email", "")
        
        sub = await PaymentService.get_or_create_subscription(user_id, user_email)
        plan_id = sub.get("plan", "free_trial")
        status = sub.get("status", "active")
        scans_used = int(sub.get("scans_used", 0))
        scans_limit = int(sub.get("scans_limit", 25))
        days_remaining = sub.get("days_remaining", 0)

        lang_code = (target_language or "en").strip().lower()

        # 1. Trial Expiration Check
        if plan_id == "free_trial" and (status == "expired" or days_remaining <= 0):
            return {
                "allowed": False,
                "error_code": "TRIAL_EXPIRED",
                "reason": "Your 7-day free trial has expired. Please upgrade to a paid plan to continue scanning jobs.",
                "plan": plan_id,
                "scans_used": scans_used,
                "scans_limit": scans_limit,
                "days_remaining": 0
            }

        # 2. General Subscription Inactive Check
        if status not in ("active", "trial"):
            return {
                "allowed": False,
                "error_code": "SUBSCRIPTION_INACTIVE",
                "reason": "Your subscription is currently inactive. Please renew or upgrade your plan.",
                "plan": plan_id,
                "scans_used": scans_used,
                "scans_limit": scans_limit,
                "days_remaining": days_remaining
            }

        # 3. Quota Exceeded Check
        if scans_used >= scans_limit:
            return {
                "allowed": False,
                "error_code": "QUOTA_EXCEEDED",
                "reason": f"You have reached your scan limit ({scans_used}/{scans_limit} scans used). Please upgrade to Pro or wait for your next billing cycle.",
                "plan": plan_id,
                "scans_used": scans_used,
                "scans_limit": scans_limit,
                "days_remaining": days_remaining
            }

        # 4. Language Restriction Check (Basic Plan is English Only)
        if plan_id == "basic" and lang_code in ["si", "ta", "hi", "bn"]:
            return {
                "allowed": False,
                "error_code": "LANGUAGE_NOT_SUPPORTED",
                "reason": "Sinhala, Tamil, Hindi, and Bengali scam detection require the Pro Plan. Please upgrade to Pro for full multilingual AI scam detection.",
                "plan": plan_id,
                "scans_used": scans_used,
                "scans_limit": scans_limit,
                "days_remaining": days_remaining
            }

        return {
            "allowed": True,
            "error_code": None,
            "reason": "Access granted.",
            "plan": plan_id,
            "scans_used": scans_used,
            "scans_limit": scans_limit,
            "days_remaining": days_remaining
        }

    @staticmethod
    async def increment_scan_count(user_id: str) -> bool:
        """Atomically increment scans_used for the given user."""
        db = get_db()
        user_query_id = ObjectId(user_id) if (isinstance(user_id, str) and ObjectId.is_valid(user_id)) else user_id
        
        try:
            res = await db["subscriptions"].update_one(
                {"$or": [{"user_id": user_query_id}, {"user_id": str(user_id)}]},
                {"$inc": {"scans_used": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
            return res.modified_count > 0
        except Exception as e:
            logger.error(f"Error incrementing scan count for user {user_id}: {e}")
            return False

    @staticmethod
    async def create_checkout_session(
        user: dict,
        plan_id: str,
        billing_cycle: str = "monthly"
    ) -> Dict[str, Any]:
        """
        Prepares a verified PayHere checkout payload including the MD5 signature.
        """
        if plan_id not in PLANS or plan_id == "free_trial":
            raise ValueError(f"Invalid plan '{plan_id}' for checkout.")

        plan = PLANS[plan_id]
        if billing_cycle == "annual":
            amount = float(plan["price_annual_lkr"])
            duration_days = 365
        else:
            amount = float(plan["price_monthly_lkr"])
            duration_days = 30

        user_id = str(user.get("id") or user.get("_id") or "")
        now = datetime.now(timezone.utc)
        order_id = f"SH_{user_id[:6]}_{int(now.timestamp())}"
        currency = "LKR"
        
        # PayHere Checkout Hash
        hash_val = PaymentService.generate_checkout_hash(order_id, amount, currency)
        
        # URLs
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        backend_base = settings.BACKEND_PUBLIC_URL.rstrip("/")
        
        return_url = f"{frontend_base}/payment/success?order_id={order_id}"
        cancel_url = f"{frontend_base}/payment/cancel?order_id={order_id}"
        notify_url = f"{backend_base}/api/payments/payhere/notify"

        # Split user full name for PayHere
        full_name = user.get("full_name", "Valued Customer")
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else "User"

        checkout_data = {
            "sandbox": settings.PAYHERE_SANDBOX,
            "action_url": PaymentService.get_checkout_url(),
            "merchant_id": settings.PAYHERE_MERCHANT_ID,
            "return_url": return_url,
            "cancel_url": cancel_url,
            "notify_url": notify_url,
            "order_id": order_id,
            "items": f"SAFE-HIRE {plan['name']} ({billing_cycle.capitalize()})",
            "currency": currency,
            "amount": f"{amount:.2f}",
            "first_name": first_name,
            "last_name": last_name,
            "email": user.get("email", ""),
            "phone": user.get("phone", "0771234567"),
            "address": user.get("address", "Colombo, Sri Lanka"),
            "city": "Colombo",
            "country": "Sri Lanka",
            "hash": hash_val,
            "custom_1": user_id,
            "custom_2": f"{plan_id}:{billing_cycle}"
        }

        # Record pending payment intent in DB
        db = get_db()
        try:
            await db["payments"].insert_one({
                "order_id": order_id,
                "user_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id,
                "user_email": user.get("email", ""),
                "plan_id": plan_id,
                "billing_cycle": billing_cycle,
                "amount": amount,
                "currency": currency,
                "status": "pending",
                "created_at": now,
                "updated_at": now
            })
        except Exception as e:
            logger.warning(f"Notice saving pending payment intent: {e}")

        return checkout_data

    @staticmethod
    async def process_payhere_webhook(form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the incoming PayHere payment notification webhook.
        Validates signature, updates subscription, records payment record idempotently.
        """
        merchant_id = form_data.get("merchant_id", "")
        order_id = form_data.get("order_id", "")
        payment_id = form_data.get("payment_id", "")
        payhere_amount = form_data.get("payhere_amount", "")
        payhere_currency = form_data.get("payhere_currency", "")
        status_code = str(form_data.get("status_code", ""))
        md5sig = form_data.get("md5sig", "")
        
        custom_1 = form_data.get("custom_1", "")  # user_id
        custom_2 = form_data.get("custom_2", "")  # plan_id:billing_cycle

        # 1. Verify Checksum Signature
        is_valid = PaymentService.verify_webhook_checksum(
            merchant_id=merchant_id,
            order_id=order_id,
            payhere_amount=payhere_amount,
            payhere_currency=payhere_currency,
            status_code=status_code,
            md5sig=md5sig
        )

        if not is_valid:
            logger.error(f"PayHere webhook verification failed for order {order_id}!")
            return {"status": "error", "message": "Invalid MD5 signature"}

        db = get_db()
        now = datetime.now(timezone.utc)

        # 2. Check if already processed (Idempotency)
        existing_payment = await db["payments"].find_one({
            "$or": [
                {"order_id": order_id, "status": "completed"},
                {"payment_id": payment_id, "status": "completed"}
            ]
        })
        if existing_payment:
            logger.info(f"Payment {order_id} / {payment_id} already marked completed. Skipping.")
            return {"status": "ok", "message": "Already processed"}

        # PayHere Status Codes: 2 = Success, 0 = Pending, -1 = Canceled, -2 = Failed, -3 = Chargedback
        if status_code == "2":
            # Extract plan and cycle
            plan_id = "pro"
            billing_cycle = "monthly"
            if custom_2 and ":" in custom_2:
                plan_parts = custom_2.split(":")
                plan_id = plan_parts[0]
                billing_cycle = plan_parts[1] if len(plan_parts) > 1 else "monthly"

            plan_meta = get_plan_details(plan_id)
            scans_limit = plan_meta.get("scans_per_month", 3000)
            duration_days = 365 if billing_cycle == "annual" else 30
            period_end = now + timedelta(days=duration_days)

            user_query_id = ObjectId(custom_1) if (custom_1 and ObjectId.is_valid(custom_1)) else custom_1

            # 3. Update or Insert Active Subscription
            await db["subscriptions"].update_one(
                {"$or": [{"user_id": user_query_id}, {"user_id": str(custom_1)}]},
                {
                    "$set": {
                        "user_id": user_query_id,
                        "plan": plan_id,
                        "billing_cycle": billing_cycle,
                        "status": "active",
                        "scans_limit": scans_limit,
                        "scans_used": 0,  # Reset scans on successful payment
                        "current_period_start": now,
                        "current_period_end": period_end,
                        "cancel_at_period_end": False,
                        "last_payment_id": payment_id,
                        "last_order_id": order_id,
                        "updated_at": now
                    }
                },
                upsert=True
            )

            # 4. Record Completed Payment
            await db["payments"].update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "payment_id": payment_id,
                        "user_id": user_query_id,
                        "plan_id": plan_id,
                        "billing_cycle": billing_cycle,
                        "amount": float(payhere_amount) if payhere_amount else 0.0,
                        "currency": payhere_currency or "LKR",
                        "status": "completed",
                        "payhere_data": form_data,
                        "updated_at": now
                    }
                },
                upsert=True
            )

            logger.info(f"Successfully activated {plan_id} subscription for user {custom_1} via order {order_id}")
            return {"status": "ok", "message": "Subscription activated successfully"}

        else:
            # Payment Failed or Canceled
            await db["payments"].update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "payment_id": payment_id,
                        "status": "failed" if status_code in ["-2", "-3"] else "canceled",
                        "payhere_data": form_data,
                        "updated_at": now
                    }
                },
                upsert=True
            )
            logger.info(f"Payment for order {order_id} recorded with status code {status_code}")
            return {"status": "ok", "message": f"Payment status {status_code} recorded"}

    @staticmethod
    async def cancel_subscription(user_id: str) -> Dict[str, Any]:
        """
        Marks the subscription as scheduled for cancellation at the end of the current period.
        """
        db = get_db()
        user_query_id = ObjectId(user_id) if (isinstance(user_id, str) and ObjectId.is_valid(user_id)) else user_id
        now = datetime.now(timezone.utc)

        res = await db["subscriptions"].update_one(
            {"$or": [{"user_id": user_query_id}, {"user_id": str(user_id)}]},
            {"$set": {"cancel_at_period_end": True, "updated_at": now}}
        )

        return {
            "success": res.modified_count > 0,
            "message": "Subscription will not renew at the end of the current billing period."
        }
