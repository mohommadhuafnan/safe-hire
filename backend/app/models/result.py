from pydantic import BaseModel
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

class AnalysisResultResponse(BaseModel):
    id: str
    submission_id: str
    user_id: str
    scam_score: Optional[Union[int, str]] = "N/A"  # 0 to 100 or "N/A"
    risk_level: str  # "Low Risk", "Moderate Risk", "High Risk", "Severe Risk", "Not a Job Advertisement", "Unreadable Image"
    language: str
    risk_factors: Dict[str, Any]
    verification_data: Dict[str, Any]
    explanation_text: str
    recommendations: List[str]
    breakdown_signals: Optional[List[str]] = []
    intake_data: Optional[Dict[str, Any]] = {}
    sub_scores: Optional[Dict[str, Any]] = {}
    created_at: datetime

