from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId
from app.models.user import UserRegister, UserLogin, FirebaseLoginRequest, TokenResponse, UserProfile
from app.auth import hash_password, verify_password, create_access_token
from app.firebase_app import verify_firebase_id_token
from app.database import get_db
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister):
    db = get_db()
    existing_user = await db["users"].find_one({"email": user_in.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    now = datetime.now(timezone.utc)
    new_user = {
        "email": user_in.email.lower(),
        "hashed_password": hash_password(user_in.password),
        "full_name": user_in.full_name,
        "institution": user_in.institution or "University Student",
        "preferred_language": user_in.preferred_language or "en",
        "created_at": now,
        "first_login_at": now,
        "last_login_at": now
    }

    res = await db["users"].insert_one(new_user)
    user_id = str(res.inserted_id)

    # Initialize 7-Day Free Trial counting from registration/login timestamp
    try:
        await PaymentService.start_or_refresh_trial(user_id, new_user["email"], is_login=True)
    except Exception as sub_err:
        pass

    access_token = create_access_token(data={"sub": user_id})

    profile = UserProfile(
        id=user_id,
        email=new_user["email"],
        full_name=new_user["full_name"],
        institution=new_user["institution"],
        preferred_language=new_user["preferred_language"],
        created_at=now
    )

    return TokenResponse(access_token=access_token, user=profile)

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin):
    db = get_db()
    email_clean = user_in.email.lower().strip()
    user = await db["users"].find_one({"email": email_clean})
    now = datetime.now(timezone.utc)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please sign up first before logging in."
        )
    
    # If user signed up via Google OAuth and has no local password
    if not user.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was registered using Google. Please click 'Continue with Google' to sign in."
        )

    # Verify user's password
    if not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password for this email address."
        )
        
    user_id = str(user["_id"])
    
    # Update last login timestamp in DB
    try:
        update_fields = {"last_login_at": now}
        if not user.get("first_login_at"):
            update_fields["first_login_at"] = now
        await db["users"].update_one({"_id": user["_id"]}, {"$set": update_fields})
    except Exception as upd_err:
        pass

    # Activate/refresh 7-Day Free Trial counting from login date
    try:
        await PaymentService.start_or_refresh_trial(user_id, user.get("email", ""), is_login=True)
    except Exception as sub_err:
        pass

    access_token = create_access_token(data={"sub": user_id})

    profile = UserProfile(
        id=user_id,
        email=user["email"],
        full_name=user.get("full_name", email_clean.split("@")[0].capitalize()),
        institution=user.get("institution", "University Student"),
        preferred_language=user.get("preferred_language", "en"),
        created_at=user.get("created_at", now)
    )

    return TokenResponse(access_token=access_token, user=profile)

@router.post("/firebase-login", response_model=TokenResponse)
async def firebase_login(req: FirebaseLoginRequest):
    try:
        decoded = None
        if req.id_token and isinstance(req.id_token, str) and req.id_token.count(".") == 2:
            decoded = verify_firebase_id_token(req.id_token)
        
        email = None
        if decoded and isinstance(decoded, dict):
            email = decoded.get("email")
        if not email:
            email = req.email

        if not email or not isinstance(email, str) or "@" not in email or "." not in email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid Google account email is required to sign in."
            )

        email = email.lower().strip()
        full_name = (decoded.get("name") if decoded else req.full_name) or email.split("@")[0].capitalize()
        
        db = get_db()
        now = datetime.now(timezone.utc)
        
        user = await db["users"].find_one({"email": email})
        if not user:
            new_user = {
                "email": email,
                "full_name": full_name,
                "auth_provider": "firebase",
                "firebase_uid": decoded.get("uid") if decoded else None,
                "institution": "University Student",
                "preferred_language": "en",
                "created_at": now,
                "first_login_at": now,
                "last_login_at": now
            }
            res = await db["users"].insert_one(new_user)
            user_id = str(res.inserted_id)
            user = new_user
            user["_id"] = res.inserted_id

            # Initialize 7-Day Free Trial counting from login date
            try:
                await PaymentService.start_or_refresh_trial(user_id, email, is_login=True)
            except Exception as sub_err:
                pass
        else:
            user_id = str(user["_id"])
            try:
                update_fields = {"last_login_at": now}
                if not user.get("first_login_at"):
                    update_fields["first_login_at"] = now
                await db["users"].update_one({"_id": user["_id"]}, {"$set": update_fields})
            except Exception as upd_err:
                pass

            # Refresh 7-Day Free Trial counting from login date
            try:
                await PaymentService.start_or_refresh_trial(user_id, email, is_login=True)
            except Exception as sub_err:
                pass

        access_token = create_access_token(data={"sub": user_id})

        profile = UserProfile(
            id=user_id,
            email=user["email"],
            full_name=user.get("full_name", full_name),
            institution=user.get("institution", "University Student"),
            preferred_language=user.get("preferred_language", "en"),
            created_at=user.get("created_at", now)
        )

        return TokenResponse(access_token=access_token, user=profile)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication error: {str(e)}"
        )
