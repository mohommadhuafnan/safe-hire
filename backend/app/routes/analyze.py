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
    filename = ""
    if image:
        filename = image.filename or ""
        allowed_extensions = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"}
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext and ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. The system only accepts PDF (.pdf), Microsoft Word (.doc, .docx), and Images (.png, .jpg, .jpeg, .webp)."
            )

        image_bytes = await image.read()
        logger.info(f"Received file upload '{filename}' ({len(image_bytes)} bytes) for user {current_user.get('id')}")

    if not input_text and not image_bytes and not input_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide text, upload a file (PDF, Word, Image), or enter a URL to analyze."
        )

    try:
        # 1. Run 5-Agent Pipeline
        logger.info("Starting 5-Agent Pipeline run...")
        pipeline_res = await pipeline_runner.run(
            input_text=input_text or "",
            image_bytes=image_bytes,
            filename=filename,
            input_url=input_url or "",
            target_language=target_language or current_user.get("preferred_language", "en")
        ) or {}

        scam_score = pipeline_res.get("scam_score")
        if scam_score is None:
            scam_score = "N/A"
        
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
                "input_image_url": filename or (f"uploaded_image_{now.timestamp()}.png" if image_bytes else ""),
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

        final_scam_score = scam_score if (scam_score == "N/A" or isinstance(scam_score, str)) else int(scam_score)

        return AnalysisResultResponse(
            id=result_id,
            submission_id=submission_id,
            user_id=str(current_user.get("id", "")),
            scam_score=final_scam_score,
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


from pydantic import BaseModel, Field

class TranslateReportRequest(BaseModel):
    explanation_text: str = ""
    recommendations: list[str] = Field(default_factory=list)
    breakdown_signals: list[str] = Field(default_factory=list)
    target_language: str = "en"

@router.post("/translate-report")
async def translate_report_endpoint(
    req: TranslateReportRequest,
    current_user: dict = Depends(get_current_user)
):
    import json, requests
    from app.config import settings
    from app.agents.valsea_agent import valsea_translator
    import logging
    logger = logging.getLogger("safe_hire.translate")

    # --- Stage 1: Primary Valsea AI Translation ---
    try:
        valsea_res = valsea_translator.translate_report_components(
            req.explanation_text,
            req.recommendations,
            req.breakdown_signals,
            req.target_language
        )
        if valsea_res and valsea_res.get("explanation_text"):
            logger.info(f"✅ Valsea AI Translation Endpoint Success for '{req.target_language}'")
            return valsea_res
    except Exception as valsea_err:
        logger.warning(f"Valsea AI translation attempt notice: {valsea_err}")

    # --- Stage 2: Secondary Gemini AI Translation ---
    lang_map = {
        "ta": "Tamil (தமிழ்)",
        "si": "Sinhala (සිංහල)",
        "hi": "Hindi (हिंदी)",
        "bn": "Bengali (বাংলা)",
        "en": "English"
    }
    target_lang_name = lang_map.get(req.target_language, "English")
    gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""

    if not gemini_key or not req.explanation_text:
        return {
            "explanation_text": req.explanation_text,
            "recommendations": req.recommendations,
            "breakdown_signals": req.breakdown_signals,
            "target_language": req.target_language
        }

    prompt = f"""You are a professional security audit report translator.
Translate the following security audit report components natively into {target_lang_name} ({req.target_language}).
Keep all markdown symbols, emojis (📋, 🎯, 🔍, 💡, ✅, 🌐), headers, numbers, bullet points, and formatting structure intact.

Input Data to Translate:
1. explanation_text:
{req.explanation_text}

2. recommendations:
{json.dumps(req.recommendations, ensure_ascii=False)}

3. breakdown_signals:
{json.dumps(req.breakdown_signals, ensure_ascii=False)}

Return ONLY a valid raw JSON object matching this structure (no markdown fences outside JSON):
{{
  "explanation_text": "<translated explanation text>",
  "recommendations": ["<translated rec 1>", "<translated rec 2>", ...],
  "breakdown_signals": ["<translated signal 1>", "<translated signal 2>", ...]
}}"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
        res = requests.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=20)
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates") or []
            if candidates and isinstance(candidates[0], dict):
                parts = (candidates[0].get("content") or {}).get("parts") or []
                if parts and isinstance(parts[0], dict):
                    raw = parts[0].get("text") or ""
                    cleaned = raw.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict):
                        return {
                            "explanation_text": parsed.get("explanation_text") or req.explanation_text,
                            "recommendations": parsed.get("recommendations") or req.recommendations,
                            "breakdown_signals": parsed.get("breakdown_signals") or req.breakdown_signals,
                            "target_language": req.target_language
                        }
    except Exception as err:
        logger.warning(f"Gemini translation endpoint notice: {err}")

    return {
        "explanation_text": req.explanation_text,
        "recommendations": req.recommendations,
        "breakdown_signals": req.breakdown_signals,
        "target_language": req.target_language
    }

