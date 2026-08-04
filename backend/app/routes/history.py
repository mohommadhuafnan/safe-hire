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
    results_cursor = db["results"].find({
        "$or": [{"user_id": q_user_id}, {"user_id": str(user_id)}]
    }).sort("created_at", -1)
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

@router.delete("", response_model=Dict[str, Any])
async def clear_all_history(current_user: dict = Depends(get_current_user)):
    """Deletes all scan history records for the current user."""
    db = get_db()
    user_id = current_user["id"]

    try:
        q_user_id = ObjectId(user_id)
    except Exception:
        q_user_id = user_id

    await db["results"].delete_many({"$or": [{"user_id": q_user_id}, {"user_id": str(user_id)}]})
    await db["submissions"].delete_many({"$or": [{"user_id": q_user_id}, {"user_id": str(user_id)}]})

    return {"status": "success", "message": "All history records cleared successfully."}

@router.delete("/{history_id}", response_model=Dict[str, Any])
async def delete_history_item(history_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a specific scan history record."""
    db = get_db()
    user_id = current_user["id"]

    try:
        q_user_id = ObjectId(user_id)
    except Exception:
        q_user_id = user_id

    try:
        q_id = ObjectId(history_id)
    except Exception:
        q_id = history_id

    res_doc = await db["results"].find_one({
        "$or": [{"_id": q_id}, {"submission_id": q_id}]
    })

    if res_doc:
        sub_id = res_doc.get("submission_id")
        await db["results"].delete_one({"_id": res_doc["_id"]})
        if sub_id:
            try:
                sub_q = ObjectId(sub_id) if ObjectId.is_valid(sub_id) else sub_id
                await db["submissions"].delete_one({"_id": sub_q})
            except Exception:
                pass
        return {"status": "success", "message": "History record deleted successfully."}

    return {"status": "success", "message": "Record removed."}

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
