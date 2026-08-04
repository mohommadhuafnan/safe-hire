from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.auth import get_current_user
from app.agents.pipeline import pipeline_runner
from app.database import get_db
from app.models.result import AnalysisResultResponse

router = APIRouter(prefix="/api/analyze", tags=["Scam Analysis"])

@router.post("", response_model=AnalysisResultResponse)
async def analyze_submission(
    input_type: str = Form("text"),
    input_text: Optional[str] = Form(""),
    input_url: Optional[str] = Form(""),
    target_language: Optional[str] = Form("en"),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    image_bytes = None
    if image:
        image_bytes = await image.read()

    if not input_text and not image_bytes and not input_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide text, upload an image, or enter a URL to analyze."
        )

    try:
        # 1. Run 5-Agent Pipeline
        pipeline_res = await pipeline_runner.run(
            input_text=input_text or "",
            image_bytes=image_bytes,
            input_url=input_url or "",
            target_language=target_language or current_user.get("preferred_language", "en")
        )

        db = get_db()
        now = datetime.now(timezone.utc)
        submission_id = str(ObjectId())
        result_id = str(ObjectId())

        try:
            # 2. Save Submission record
            sub_doc = {
                "user_id": ObjectId(current_user["id"]) if (isinstance(current_user.get("id"), str) and ObjectId.is_valid(current_user["id"])) else current_user["id"],
                "input_type": input_type,
                "input_text": input_text,
                "input_image_url": f"uploaded_image_{now.timestamp()}.png" if image_bytes else "",
                "input_url": input_url,
                "language_detected": pipeline_res["language"],
                "created_at": now
            }

            sub_res = await db["submissions"].insert_one(sub_doc)
            submission_id = str(getattr(sub_res, 'inserted_id', submission_id))

            # 3. Save Result record
            res_doc = {
                "submission_id": ObjectId(submission_id) if ObjectId.is_valid(submission_id) else submission_id,
                "user_id": ObjectId(current_user["id"]) if (isinstance(current_user.get("id"), str) and ObjectId.is_valid(current_user["id"])) else current_user["id"],
                "scam_score": pipeline_res["scam_score"],
                "risk_level": pipeline_res["risk_level"],
                "language": pipeline_res["language"],
                "risk_factors": pipeline_res["linguistic_data"],
                "verification_data": pipeline_res["verification_data"],
                "explanation_text": pipeline_res["explanation_text"],
                "recommendations": pipeline_res["recommendations"],
                "created_at": now
            }

            res_res = await db["results"].insert_one(res_doc)
            result_id = str(getattr(res_res, 'inserted_id', result_id))
        except Exception as db_err:
            import logging
            logging.getLogger("safe_hire.analyze").warning(f"Database save notice: {db_err}")

        return AnalysisResultResponse(
            id=result_id,
            submission_id=submission_id,
            user_id=str(current_user["id"]),
            scam_score=pipeline_res["scam_score"],
            risk_level=pipeline_res["risk_level"],
            language=pipeline_res["language"],
            risk_factors=pipeline_res["linguistic_data"],
            verification_data=pipeline_res["verification_data"],
            explanation_text=pipeline_res["explanation_text"],
            recommendations=pipeline_res["recommendations"],
            breakdown_signals=pipeline_res.get("breakdown_signals", []),
            intake_data=pipeline_res.get("intake_data", {}),
            sub_scores=pipeline_res.get("sub_scores", {}),
            created_at=now
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger("safe_hire.analyze").error(f"Analysis pipeline error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline notice: {str(e)}"
        )

