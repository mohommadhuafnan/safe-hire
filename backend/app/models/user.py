from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    institution: Optional[str] = "University Student"
    preferred_language: Optional[str] = "en"  # en, si, ta, hi, bn

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class FirebaseLoginRequest(BaseModel):
    id_token: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    institution: Optional[str]
    preferred_language: str
    created_at: Optional[datetime]

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
