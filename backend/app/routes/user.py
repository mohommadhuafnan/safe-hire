from fastapi import APIRouter, Depends
from app.models.user import UserProfile
from app.auth import get_current_user

router = APIRouter(prefix="/api/user", tags=["User Profile"])

@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        institution=current_user.get("institution", "University Student"),
        preferred_language=current_user.get("preferred_language", "en"),
        created_at=current_user.get("created_at")
    )
