from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime

class AnalysisResultResponse(BaseModel):
    id: str
    submission_id: str
    user_id: str
    scam_score: int  # 0 to 100
    risk_level: str  # "Low Risk", "Moderate Risk", "High Risk", "Severe Risk"
    language: str
    risk_factors: Dict[str, Any]
    verification_data: Dict[str, Any]
    explanation_text: str
    recommendations: List[str]
    created_at: datetime
