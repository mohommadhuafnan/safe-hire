from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubmissionCreate(BaseModel):
    input_type: str = "text"  # "text", "image", "url"
    input_text: Optional[str] = ""
    input_url: Optional[str] = ""
    target_language: Optional[str] = "en"  # "en", "si", "ta", "hi", "bn"

class SubmissionResponse(BaseModel):
    id: str
    user_id: str
    input_type: str
    input_text: Optional[str]
    input_url: Optional[str]
    language_detected: str
    created_at: datetime
