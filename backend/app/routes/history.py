from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from bson import ObjectId
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/history", tags=["Analysis History"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]

    try:
        q_user_id = ObjectId(user_id)
    except Exception:
        q_user_id = user_id

    # Fetch results for user
    results_cursor = db["results"].find({"user_id": q_user_id}).sort("created_at", -1)
    results_list = await results_cursor.to_list(length=100)

    history_items = []
    for r in results_list:
        sub_id = r.get("submission_id")
        sub_doc = await db["submissions"].find_one({"_id": sub_id}) if sub_id else {}

        history_items.append({
            "id": str(r["_id"]),
            "submission_id": str(sub_id) if sub_id else "",
            "scam_score": r.get("scam_score", 0),
            "risk_level": r.get("risk_level", "Low Risk"),
            "language": r.get("language", "en"),
            "input_type": sub_doc.get("input_type", "text") if sub_doc else "text",
            "snippet": (sub_doc.get("input_text", "") or sub_doc.get("input_url", "") or "Uploaded Image Document")[:100],
            "explanation_text": r.get("explanation_text", ""),
            "created_at": r.get("created_at")
        })

    return history_items

@router.get("/{submission_id}", response_model=Dict[str, Any])
async def get_history_detail(submission_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    try:
        q_sub_id = ObjectId(submission_id)
    except Exception:
        q_sub_id = submission_id

    result_doc = await db["results"].find_one({"submission_id": q_sub_id})
    if not result_doc:
        result_doc = await db["results"].find_one({"_id": q_sub_id})

    if not result_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission history result not found."
        )

    sub_doc = await db["submissions"].find_one({"_id": result_doc.get("submission_id")}) or {}

    return {
        "id": str(result_doc["_id"]),
        "submission_id": str(result_doc.get("submission_id", "")),
        "user_id": current_user["id"],
        "input_type": sub_doc.get("input_type", "text"),
        "input_text": sub_doc.get("input_text", ""),
        "input_url": sub_doc.get("input_url", ""),
        "scam_score": result_doc.get("scam_score", 0),
        "risk_level": result_doc.get("risk_level", "Low Risk"),
        "language": result_doc.get("language", "en"),
        "risk_factors": result_doc.get("risk_factors", {}),
        "verification_data": result_doc.get("verification_data", {}),
        "explanation_text": result_doc.get("explanation_text", ""),
        "recommendations": result_doc.get("recommendations", []),
        "created_at": result_doc.get("created_at")
    }
