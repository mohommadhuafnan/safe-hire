from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId
from app.models.user import UserRegister, UserLogin, FirebaseLoginRequest, TokenResponse, UserProfile
from app.auth import hash_password, verify_password, create_access_token
from app.firebase_app import verify_firebase_id_token
from app.database import get_db

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
        "created_at": now
    }

    res = await db["users"].insert_one(new_user)
    user_id = str(res.inserted_id)

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
        # Auto-provision user account if signing in for the first time
        new_user = {
            "email": email_clean,
            "hashed_password": hash_password(user_in.password),
            "full_name": email_clean.split("@")[0].capitalize(),
            "institution": "University Student",
            "preferred_language": "en",
            "created_at": now
        }
        res = await db["users"].insert_one(new_user)
        user_id = str(res.inserted_id)
        user = new_user
        user["_id"] = res.inserted_id
    else:
        # If user exists with password, verify password
        if user.get("hashed_password") and not verify_password(user_in.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password for this email address."
            )
        user_id = str(user["_id"])

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
        decoded = verify_firebase_id_token(req.id_token) if req.id_token else None
        
        email = None
        if decoded:
            email = decoded.get("email")
        if not email:
            email = req.email

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is required for authentication."
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
                "created_at": now
            }
            res = await db["users"].insert_one(new_user)
            user_id = str(res.inserted_id)
            user = new_user
            user["_id"] = res.inserted_id
        else:
            user_id = str(user["_id"])

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
