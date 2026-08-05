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
    import logging
    logger = logging.getLogger("safe_hire.analyze")
    
    image_bytes = None
    if image:
        image_bytes = await image.read()
        logger.info(f"Received image upload ({len(image_bytes)} bytes) for user {current_user.get('id')}")

    if not input_text and not image_bytes and not input_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide text, upload an image, or enter a URL to analyze."
        )

    try:
        # 1. Run 5-Agent Pipeline
        logger.info("Starting 5-Agent Pipeline run...")
        pipeline_res = await pipeline_runner.run(
            input_text=input_text or "",
            image_bytes=image_bytes,
            input_url=input_url or "",
            target_language=target_language or current_user.get("preferred_language", "en")
        ) or {}

        scam_score = pipeline_res.get("scam_score")
        if scam_score is None:
            scam_score = 0
        
        risk_level = pipeline_res.get("risk_level") or "Low Risk"
        language = pipeline_res.get("language") or "en"
        linguistic_data = pipeline_res.get("linguistic_data") or {}
        verification_data = pipeline_res.get("verification_data") or {}
        explanation_text = pipeline_res.get("explanation_text") or "Analysis completed."
        recommendations = pipeline_res.get("recommendations") or []
        breakdown_signals = pipeline_res.get("breakdown_signals") or []
        intake_data = pipeline_res.get("intake_data") or {}
        sub_scores = pipeline_res.get("sub_scores") or {}

        db = get_db()
        now = datetime.now(timezone.utc)
        submission_id = str(ObjectId())
        result_id = str(ObjectId())

        try:
            # 2. Save Submission record
            user_obj_id = current_user.get("id")
            if isinstance(user_obj_id, str) and ObjectId.is_valid(user_obj_id):
                user_obj_id = ObjectId(user_obj_id)

            sub_doc = {
                "user_id": user_obj_id,
                "input_type": input_type,
                "input_text": input_text or "",
                "input_image_url": f"uploaded_image_{now.timestamp()}.png" if image_bytes else "",
                "input_url": input_url or "",
                "language_detected": language,
                "created_at": now
            }

            sub_res = await db["submissions"].insert_one(sub_doc)
            submission_id = str(getattr(sub_res, 'inserted_id', submission_id))

            # 3. Save Result record
            sub_obj_id = submission_id
            if isinstance(submission_id, str) and ObjectId.is_valid(submission_id):
                sub_obj_id = ObjectId(submission_id)

            res_doc = {
                "submission_id": sub_obj_id,
                "user_id": user_obj_id,
                "scam_score": scam_score,
                "risk_level": risk_level,
                "language": language,
                "risk_factors": linguistic_data,
                "verification_data": verification_data,
                "explanation_text": explanation_text,
                "recommendations": recommendations,
                "created_at": now
            }

            res_res = await db["results"].insert_one(res_doc)
            result_id = str(getattr(res_res, 'inserted_id', result_id))
        except Exception as db_err:
            logger.warning(f"Database save notice: {db_err}")

        return AnalysisResultResponse(
            id=result_id,
            submission_id=submission_id,
            user_id=str(current_user.get("id", "")),
            scam_score=int(scam_score),
            risk_level=str(risk_level),
            language=str(language),
            risk_factors=linguistic_data if isinstance(linguistic_data, dict) else {},
            verification_data=verification_data if isinstance(verification_data, dict) else {},
            explanation_text=str(explanation_text),
            recommendations=recommendations if isinstance(recommendations, list) else [],
            breakdown_signals=breakdown_signals if isinstance(breakdown_signals, list) else [],
            intake_data=intake_data if isinstance(intake_data, dict) else {},
            sub_scores=sub_scores if isinstance(sub_scores, dict) else {},
            created_at=now
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis pipeline error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline error during processing: {str(e)}"
        )

